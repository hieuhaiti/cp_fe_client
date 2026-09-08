import { fetcher } from "@/services/apiClient/fetcher";
import { useApiQuery } from "@/services/apiClient/useApi";
import { withQuery } from "@/services/apiClient/request";

const MAP_PATH = "/web-map";
const LAYERS_PATH = `${MAP_PATH}/layers`;
const TIME_SERIES_LAYERS_PATH = `${MAP_PATH}/time-series-layers`;
const BASEMAPS_PATH = `${MAP_PATH}/basemaps`;

/**
 * Web Map endpoints have used both `data: []` and `data: { items: [] }`
 * response shapes. Keep that compatibility at the service boundary so map UI
 * components never need to know about the transport shape.
 */
export function extractWebMapItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.layers)) return payload.data.layers;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.layers)) return payload.layers;
  return [];
}

const read = (item, snakeCase, camelCase = undefined) =>
  item?.[snakeCase] ?? (camelCase ? item?.[camelCase] : undefined);

/** Normalizes the public `/web-map/layers` DTO to the map rendering DTO. */
export function normalizeWebMapLayer(layer, index = 0) {
  const code = read(layer, "code") || String(read(layer, "id") ?? index);

  return {
    ...layer,
    id: String(read(layer, "id") ?? code),
    code,
    name_vi: read(layer, "name_vi", "nameVi"),
    name_en: read(layer, "name_en", "nameEn"),
    description_vi: read(layer, "description_vi", "descriptionVi"),
    description_en: read(layer, "description_en", "descriptionEn"),
    category: read(layer, "category") || "",
    category_name: read(layer, "category_name", "categoryName") || "",
    geometry_type: read(layer, "geometry_type", "geometryType"),
    storage_kind: read(layer, "storage_kind", "storageKind"),
    geoserver_layer: read(layer, "geoserver_layer", "geoserverLayer"),
    geoserver_store: read(layer, "geoserver_store", "geoserverStore"),
    min_zoom: read(layer, "min_zoom", "minZoom"),
    max_zoom: read(layer, "max_zoom", "maxZoom"),
    is_public: read(layer, "is_public", "isPublic"),
    is_enable_default: read(layer, "is_enable_default", "isEnableDefault"),
    is_active: read(layer, "is_active", "isActive"),
    is_editable: read(layer, "is_editable", "isEditable"),
    layer_kind: read(layer, "layer_kind", "layerKind") || "overlay",
    default_style:
      read(layer, "default_style", "defaultStyle") ||
      layer?.metadata?.defaultStyle ||
      {},
    legend: read(layer, "legend") ?? null,
    // Preserve the server's camelCase Time Series DTO, including members.
    timeSeries: read(layer, "time_series", "timeSeries") ?? null,
  };
}

/**
 * Phân biệt lớp GeoTIFF Time Series với raster thường.
 *
 * Không được phân nhánh theo `storageKind`: cả hai loại đều là
 * `geotiff_minio`. Sự hiện diện của `timeSeries` là tín hiệu duy nhất, và nó
 * biến mất khi toàn bộ ảnh bị xoá — lúc đó layer phải được vẽ như raster
 * thường và không được gửi query `time`.
 */
export function isTimeSeriesLayer(layer) {
  const series = layer?.timeSeries;
  return series?.enabled === true && (series.values?.length ?? 0) > 0;
}

/** Đọc danh sách mốc thời gian đã được server sort tăng dần. */
export function getTimeSeriesValues(layer) {
  return isTimeSeriesLayer(layer) ? layer.timeSeries.values : [];
}

/** Mốc mặc định; server đặt bằng phần tử cuối của `values`. */
export function getTimeSeriesDefault(layer) {
  const values = getTimeSeriesValues(layer);
  if (!values.length) return null;
  const preferred = layer.timeSeries.defaultTime;
  return values.includes(preferred) ? preferred : values[values.length - 1];
}

/** Normalizes the public `/web-map/basemaps` catalog DTO. */
export function normalizeWebMapBasemap(basemap, index = 0) {
  const code = read(basemap, "code") || String(read(basemap, "id") ?? index);
  return {
    ...basemap,
    id: String(read(basemap, "id") ?? code),
    code,
    name_vi: read(basemap, "name_vi", "nameVi") || code,
    url_template: read(basemap, "url_template", "urlTemplate"),
    min_zoom: read(basemap, "min_zoom", "minZoom"),
    max_zoom: read(basemap, "max_zoom", "maxZoom"),
  };
}

/** GET /web-map/layers */
export function getMapLayers() {
  return fetcher(LAYERS_PATH);
}

export function useGetMapLayersQuery(params = {}, options = {}) {
  // Preserve the legacy two-argument call signature, while the collection
  // defines this endpoint without filter query parameters.
  void params;
  return useApiQuery(["map", "layers"], LAYERS_PATH, options);
}

/** GET /web-map/time-series-layers */
export function getTimeSeriesLayers() {
  return fetcher(TIME_SERIES_LAYERS_PATH);
}

export function useGetTimeSeriesLayersQuery(options = {}) {
  return useApiQuery(["map", "time-series-layers"], TIME_SERIES_LAYERS_PATH, {
    ...options,
    select: (payload) =>
      extractWebMapItems(payload)
        .map(normalizeWebMapLayer)
        .filter((layer) => isTimeSeriesLayer(layer) && layer.geoserver_layer),
  });
}

/** GET /web-map/basemaps */
export function getMapBasemaps() {
  return fetcher(BASEMAPS_PATH);
}

export function useGetMapBasemapsQuery(options = {}) {
  return useApiQuery(["map", "basemaps"], BASEMAPS_PATH, options);
}

/** GET /web-map/features/search?q=&limit= */
export function searchMapFeatures(q, limit = 20) {
  return fetcher(withQuery(`${MAP_PATH}/features/search`, { q, limit }));
}

export function useSearchMapFeaturesQuery(q, options = {}) {
  const normalizedQuery = String(q || "").trim();
  return useApiQuery(
    ["map", "features", "search", normalizedQuery],
    withQuery(`${MAP_PATH}/features/search`, { q: normalizedQuery, limit: 20 }),
    {
      ...options,
      enabled:
        normalizedQuery.length >= 2 &&
        (options.enabled === undefined ? true : options.enabled),
    },
  );
}

/** GET /web-map/layers/:layerId/features/:featureId?includeGeometry= */
export function getMapFeature(layerId, featureId, includeGeometry = true) {
  return fetcher(
    withQuery(
      `${LAYERS_PATH}/${encodeURIComponent(layerId)}/features/${encodeURIComponent(featureId)}`,
      { includeGeometry },
    ),
  );
}

/** GET /web-map/layers/:layerId/legend */
export function getMapLayerLegend(layerId) {
  return fetcher(`${LAYERS_PATH}/${encodeURIComponent(layerId)}/legend`);
}

const FLOOD_PATH = "/flood";

/** GET /flood/scenarios?activeOnly=true */
export function getFloodScenarios(params = {}) {
  return fetcher(withQuery(`${FLOOD_PATH}/scenarios`, { activeOnly: true, limit: 100, ...params }));
}

export function useGetFloodScenariosQuery(options = {}) {
  return useApiQuery(
    ["flood", "scenarios", "public"],
    withQuery(`${FLOOD_PATH}/scenarios`, { activeOnly: true, limit: 100 }),
    { staleTime: 5 * 60 * 1000, ...options },
  );
}

/** GET /web-map/terrain */
export function getMapTerrain() {
  return fetcher(`${MAP_PATH}/terrain`);
}

/** GET /web-map/terrain/:layerId/url?expireSeconds= */
export function getMapTerrainUrl(layerId, expireSeconds = 300) {
  return fetcher(
    withQuery(`${MAP_PATH}/terrain/${encodeURIComponent(layerId)}/url`, {
      expireSeconds,
    }),
  );
}
