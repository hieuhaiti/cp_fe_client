import { apiRequest, getApiBaseUrl } from "@/services/apiClient/request";

const ticketCache = new Map();

const getLayerId = (layer) => {
  const value = Number(layer?.layer_id ?? layer?.layerId ?? layer?.id);
  return Number.isInteger(value) && value > 0 ? value : null;
};

const getTicket = async (layerId, access) => {
  const key = `${layerId}:${access}`;
  const cached = ticketCache.get(key);
  if (cached && cached.expiresAt > Date.now() + 5_000) return cached.ticket;

  const response = await apiRequest(
    `/maps/layers/${encodeURIComponent(String(layerId))}/tile-ticket?access=${access}`,
  );
  const data = response?.data ?? response;
  const ticket = data?.ticket;
  if (!ticket) throw new Error("Máy chủ chưa cấp vé truy cập lớp bản đồ.");

  const expiresAt = data?.expiresAt ? Date.parse(data.expiresAt) : Date.now() + 4 * 60_000;
  ticketCache.set(key, {
    ticket,
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : Date.now() + 4 * 60_000,
  });
  return ticket;
};

const buildEndpoint = (layerId, service, params) => {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl || !layerId) return "";
  return `${apiBaseUrl}/maps/layers/${layerId}/${service}?${params.toString()}`;
};

/**
 * Builds a Mapbox raster tile URL through the server-side WMS proxy.
 *
 * @param {object} layer Layer DTO from `/web-map/layers`.
 * @param {object} [options]
 * @param {string} [options.time] ISO-8601 UTC millisecond timestamp taken from
 *   `layer.timeSeries.values`. Only pass this for GeoTIFF Time Series layers:
 *   the proxy answers 422 TIME_NOT_SUPPORTED when a plain raster receives it,
 *   and 422 TIME_REQUIRED when a Time Series layer does not.
 */
export const buildMapProxyWmsTileUrl = async (layer, { time } = {}) => {
  const layerId = getLayerId(layer);
  if (!layerId) return "";

  const params = new URLSearchParams({
    request: "GetMap",
    width: "256",
    height: "256",
    crs: "EPSG:3857",
    format: "image/png",
    transparent: "true",
    version: "1.3.0",
  });
  if (time) {
    params.set("time", time);
  }
  if (!(layer?.is_public ?? layer?.isPublic)) {
    params.set("ticket", await getTicket(layerId, "view"));
  }
  // Keep the Mapbox bbox token literal. URLSearchParams would encode the
  // braces, preventing Mapbox GL from replacing it with the tile bounds.
  const endpoint = buildEndpoint(layerId, "wms", params);
  if (!endpoint) return "";
  return `${endpoint}&bbox={bbox-epsg-3857}`;
};

/** The server only exposes GetMap over WMS. Feature inspection is WFS-only. */
export const buildMapProxyWmsFeatureInfoUrl = () => "";

export const buildMapProxyWfsUrl = async (
  layer,
  { count = 5000, srsName = "EPSG:4326", bbox } = {},
) => {
  const layerId = getLayerId(layer);
  if (!layerId) return "";

  const params = new URLSearchParams({
    request: "GetFeature",
    count: String(Math.min(10000, Math.max(1, Number(count) || 1000))),
    srsName,
    outputFormat: "application/json",
  });
  if (!(layer?.is_public ?? layer?.isPublic)) {
    params.set("ticket", await getTicket(layerId, "export"));
  }
  if (bbox) params.set("bbox", bbox);
  return buildEndpoint(layerId, "wfs", params);
};

export const buildMapProxyWcsUrl = async (layer) => {
  const layerId = getLayerId(layer);
  if (!layerId) return "";

  const params = new URLSearchParams({
    request: "GetCoverage",
    format: "image/tiff",
    ticket: await getTicket(layerId, "export"),
  });
  return buildEndpoint(layerId, "wcs", params);
};
