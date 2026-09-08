import { buildMapProxyWmsTileUrl } from "./mapProxy";

/**
 * GeoTIFF Time Series raster helpers.
 *
 * These layers are ImageMosaic stores published as a single GeoServer layer; a
 * given acquisition is selected through the `time` query of the WMS proxy
 * (`/maps/layers/:layerId/wms`), which the backend forwards as the WMS `TIME`
 * dimension. Changing the step therefore only changes the tile URL, never the
 * layer name.
 *
 * They are deliberately kept apart from `addOrUpdateGeoServerLayer` in
 * MapHelper: that function never refreshes `tiles` once the source exists, so
 * reusing it would leave the raster frozen on the first requested step.
 */

export const buildTimeSeriesSourceId = (layerId) => `ts-src-${layerId}`;
export const buildTimeSeriesLayerId = (sourceId) => `${sourceId}-raster`;

const DEFAULT_OPACITY = 0.9;

/**
 * Formats an ISO-8601 timestamp for the timeline UI.
 *
 * Production data is stored as January 1st of each year, so the year alone is
 * unambiguous. `allValues` is used to detect datasets that carry several steps
 * within the same year, which then fall back to a full date.
 */
export const formatTimeLabel = (value, allValues) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value ?? "");

  const year = date.getUTCFullYear();
  const yearIsAmbiguous =
    Array.isArray(allValues) &&
    allValues.filter((item) => new Date(item).getUTCFullYear() === year)
      .length > 1;

  if (!yearIsAmbiguous) return String(year);

  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** Resolves the tile URL for a single step of a Time Series layer. */
export const buildTimeSeriesTileUrl = (layer, time) =>
  buildMapProxyWmsTileUrl(layer, { time });

const waitForStyle = (map) => {
  if (!map || map._removed) return Promise.resolve(false);
  if (map.isStyleLoaded()) return Promise.resolve(true);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ready) => {
      if (settled) return;
      settled = true;
      map.off("style.load", onReady);
      map.off("idle", onReady);
      map.off("remove", onRemove);
      resolve(ready);
    };
    const onReady = () => {
      if (map._removed) finish(false);
      else if (map.isStyleLoaded()) finish(true);
    };
    const onRemove = () => finish(false);

    map.on("style.load", onReady);
    map.on("idle", onReady);
    map.on("remove", onRemove);
    onReady();
  });
};

/**
 * Picks the first non Time Series overlay so the raster is inserted underneath
 * every vector overlay instead of covering them.
 */
const getBeforeId = (map, selfLayerId) => {
  const layers = map.getStyle()?.layers || [];
  const target = layers.find(
    (layer) =>
      layer.id !== selfLayerId &&
      layer.type !== "raster" &&
      layer.type !== "background" &&
      (layer.metadata?.ktManagedOverlay === true ||
        layer.metadata?.ktGeometryPriority != null),
  );
  return target?.id;
};

/**
 * Adds or refreshes the raster source/layer for one Time Series layer.
 *
 * `entry.tileUrl` already encodes the selected step, so a changed URL means the
 * user moved the slider. The source is torn down and recreated rather than
 * patched through `source.setTiles()`, which does not reliably force a refetch
 * across Mapbox GL versions.
 */
export const addOrUpdateTimeSeriesLayer = async (map, layerId, entry) => {
  const tileUrl = entry?.tileUrl;
  if (!map || !layerId || !tileUrl) return;

  const sourceId = buildTimeSeriesSourceId(layerId);
  const mapLayerId = buildTimeSeriesLayerId(sourceId);
  const opacity = Math.max(0, Math.min(1, entry?.opacity ?? DEFAULT_OPACITY));

  try {
    if (!(await waitForStyle(map))) return;

    const existingSource = map.getSource(sourceId);
    if (existingSource && existingSource.tiles?.[0] !== tileUrl) {
      if (map.getLayer(mapLayerId)) map.removeLayer(mapLayerId);
      map.removeSource(sourceId);
    }

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: "raster",
        tiles: [tileUrl],
        tileSize: 256,
        minzoom: entry?.layer?.minZoom ?? entry?.layer?.min_zoom ?? 0,
        maxzoom: entry?.layer?.maxZoom ?? entry?.layer?.max_zoom ?? 22,
        attribution: "Cẩm Phả GIS",
      });
    }

    if (map.getLayer(mapLayerId)) {
      map.setPaintProperty(mapLayerId, "raster-opacity", opacity);
      return;
    }

    map.addLayer(
      {
        id: mapLayerId,
        type: "raster",
        source: sourceId,
        metadata: {
          ktGeometryType: "raster",
          ktLayerCode: entry?.layer?.code || null,
          ktManagedOverlay: true,
          ktTimeSeries: true,
        },
        paint: {
          "raster-opacity": opacity,
          "raster-fade-duration": 250,
        },
      },
      getBeforeId(map, mapLayerId),
    );
  } catch (error) {
    console.warn(
      "[TimeSeries] Không thể cập nhật lớp raster %s: %s",
      layerId,
      error.message,
    );
  }
};

/** Removes the raster source and layer created for a Time Series layer. */
export const removeTimeSeriesLayerFromMap = (map, layerId) => {
  if (!map || !layerId) return;

  try {
    const sourceId = buildTimeSeriesSourceId(layerId);
    const mapLayerId = buildTimeSeriesLayerId(sourceId);

    if (map.getLayer(mapLayerId)) map.removeLayer(mapLayerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  } catch (error) {
    console.warn(
      "[TimeSeries] Không thể xóa lớp raster %s: %s",
      layerId,
      error.message,
    );
  }
};
