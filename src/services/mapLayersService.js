import { fetcher } from "@/services/apiClient/fetcher";
import { useApiQuery } from "@/services/apiClient/useApi";
import { withQuery } from "@/services/apiClient/request";

const MAP_PATH = "/web-map";
const LAYERS_PATH = `${MAP_PATH}/layers`;
const BASEMAPS_PATH = `${MAP_PATH}/basemaps`;

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
