import { buildMapProxyWfsUrl } from "./mapProxy";
import { useMapStore } from "@/stores/Map/useMapStore";

const WFS_CACHE_TTL_MS = 5 * 60_000;
const pendingWfsRequests = new Map();

const normalizeWfsOptions = ({
  count = 5000,
  srsName = "EPSG:4326",
  bbox,
} = {}) => ({ count, srsName, bbox });

const buildWfsCacheKey = (layer, options) =>
  JSON.stringify([
    layer?.layer_id ?? layer?.layerId ?? layer?.id ?? layer?.code,
    layer?.geoserver_layer ?? layer?.geoserverLayer ?? "",
    layer?.updated_at ?? layer?.updatedAt ?? "",
    options.count,
    options.srsName,
    options.bbox ?? "",
  ]);

export const buildWfsFeatureUrl = async (
  layer,
  { count = 5000, srsName = "EPSG:4326", bbox } = {},
) => buildMapProxyWfsUrl(layer, { count, srsName, bbox });

// Mapbox GL supercluster (cluster: true) chỉ hoạt động với Point.
// Nếu backend WFS trả Multi* (do bảng PostGIS dùng type Multi*), tách thành
// các feature đơn để cluster + render đúng. Áp dụng cho cả Line/Polygon để
// dự phòng nếu sau này có branch WFS cho geometry non-point.
const MULTI_TO_SINGLE = {
  MultiPoint: "Point",
  MultiLineString: "LineString",
  MultiPolygon: "Polygon",
};

const explodeMultiFeatures = (features) => {
  const out = [];
  for (const f of features) {
    const g = f?.geometry;
    if (!g || !g.type) continue;
    const singleType = MULTI_TO_SINGLE[g.type];
    if (singleType && Array.isArray(g.coordinates) && g.coordinates.length > 0) {
      g.coordinates.forEach((coord, i) => {
        out.push({
          ...f,
          id: f.id != null ? `${f.id}__${i}` : undefined,
          geometry: { type: singleType, coordinates: coord },
        });
      });
    } else {
      out.push(f);
    }
  }
  return out;
};

export const fetchWfsGeoJson = async (layer, options) => {
  const normalizedOptions = normalizeWfsOptions(options);
  const cacheKey = buildWfsCacheKey(layer, normalizedOptions);
  const mapStore = useMapStore.getState();
  const cached = mapStore.getWfsGeoJsonCacheEntry(cacheKey);

  if (cached?.expiresAt > Date.now()) {
    return cached.data;
  }

  const pendingRequest = pendingWfsRequests.get(cacheKey);
  if (pendingRequest) return pendingRequest;

  const request = (async () => {
    const url = await buildWfsFeatureUrl(layer, normalizedOptions);
    if (!url) {
      return { type: "FeatureCollection", features: [] };
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GeoServer WFS ${response.status}`);
    }

    const data = await response.json();
    const rawFeatures = Array.isArray(data?.features) ? data.features : [];
    const geojson = {
      type: "FeatureCollection",
      features: explodeMultiFeatures(rawFeatures),
    };

    useMapStore
      .getState()
      .setWfsGeoJsonCacheEntry(
        cacheKey,
        geojson,
        Date.now() + WFS_CACHE_TTL_MS,
      );
    return geojson;
  })();

  pendingWfsRequests.set(cacheKey, request);
  try {
    return await request;
  } finally {
    pendingWfsRequests.delete(cacheKey);
  }
};
