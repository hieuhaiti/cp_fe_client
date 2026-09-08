import {
  GEOSERVER_POINT_PAINT,
  GEOSERVER_VECTOR_PAINT,
} from "@/constant/geoserverData";

const HEX_COLOR_PATTERN = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

/**
 * Returns default opacity for raster layer based on category.
 * Flood layers use higher opacity for visibility; others use 0.72.
 */
export function getDefaultRasterOpacity(layer) {
  if (layer?.category === "flood") return 0.88;
  return 0.72;
}

/**
 * Normalizes any raw style object (camelCase, snake_case or nested) into a clean format.
 */
export function normalizeDefaultStyle(rawStyle) {
  if (!rawStyle || typeof rawStyle !== "object") return {};
  const s = rawStyle;

  const result = {};
  // Colors
  if (s.fillColor || s.fill_color) result.fillColor = s.fillColor || s.fill_color;
  if (s.strokeColor || s.stroke_color || s.color) result.strokeColor = s.strokeColor || s.stroke_color || s.color;
  if (s.circleColor || s.circle_color) result.circleColor = s.circleColor || s.circle_color;
  if (s.circleStrokeColor || s.circle_stroke_color) result.circleStrokeColor = s.circleStrokeColor || s.circle_stroke_color;

  // Opacity
  if (s.fillOpacity !== undefined || s.fill_opacity !== undefined) result.fillOpacity = Number(s.fillOpacity ?? s.fill_opacity);
  if (s.strokeOpacity !== undefined || s.stroke_opacity !== undefined) result.strokeOpacity = Number(s.strokeOpacity ?? s.stroke_opacity);
  if (s.circleOpacity !== undefined || s.circle_opacity !== undefined) result.circleOpacity = Number(s.circleOpacity ?? s.circle_opacity);
  if (s.circleStrokeOpacity !== undefined || s.circle_stroke_opacity !== undefined) result.circleStrokeOpacity = Number(s.circleStrokeOpacity ?? s.circle_stroke_opacity);
  if (s.rasterOpacity !== undefined || s.raster_opacity !== undefined) result.rasterOpacity = Number(s.rasterOpacity ?? s.raster_opacity);
  if (s.opacity !== undefined) result.opacity = Number(s.opacity);

  // Dimensions & numbers
  if (s.strokeWidth !== undefined || s.stroke_width !== undefined) result.strokeWidth = Number(s.strokeWidth ?? s.stroke_width);
  if (s.strokeBlur !== undefined || s.stroke_blur !== undefined) result.strokeBlur = Number(s.strokeBlur ?? s.stroke_blur);
  if (s.strokeOffset !== undefined || s.stroke_offset !== undefined) result.strokeOffset = Number(s.strokeOffset ?? s.stroke_offset);
  if (s.circleRadius !== undefined || s.circle_radius !== undefined) result.circleRadius = Number(s.circleRadius ?? s.circle_radius);
  if (s.circleBlur !== undefined || s.circle_blur !== undefined) result.circleBlur = Number(s.circleBlur ?? s.circle_blur);
  if (s.circleStrokeWidth !== undefined || s.circle_stroke_width !== undefined) result.circleStrokeWidth = Number(s.circleStrokeWidth ?? s.circle_stroke_width);

  // Raster params
  if (s.brightnessMin !== undefined || s.brightness_min !== undefined) result.brightnessMin = Number(s.brightnessMin ?? s.brightness_min);
  if (s.brightnessMax !== undefined || s.brightness_max !== undefined) result.brightnessMax = Number(s.brightnessMax ?? s.brightness_max);
  if (s.contrast !== undefined) result.contrast = Number(s.contrast);
  if (s.saturation !== undefined) result.saturation = Number(s.saturation);
  if (s.hueRotate !== undefined || s.hue_rotate !== undefined) result.hueRotate = Number(s.hueRotate ?? s.hue_rotate);
  if (s.fadeDuration !== undefined || s.fade_duration !== undefined) result.fadeDuration = Number(s.fadeDuration ?? s.fade_duration);
  if (s.resampling) result.resampling = s.resampling;

  // Enums & arrays
  if (s.lineCap || s.line_cap) result.lineCap = s.lineCap || s.line_cap;
  if (s.lineJoin || s.line_join) result.lineJoin = s.lineJoin || s.line_join;
  if (s.strokeDasharray || s.stroke_dasharray) {
    const arr = s.strokeDasharray || s.stroke_dasharray;
    if (Array.isArray(arr)) result.strokeDasharray = arr.map(Number).filter((n) => !isNaN(n));
  }
  if (s.fillAntialias !== undefined || s.fill_antialias !== undefined) {
    result.fillAntialias = Boolean(s.fillAntialias ?? s.fill_antialias);
  }
  if (s.visible_by_default !== undefined) result.visible_by_default = Boolean(s.visible_by_default);

  return result;
}

/**
 * Determines whether a layer has meaningful custom style properties configured.
 */
export function hasCustomVectorStyle(rawStyle) {
  if (!rawStyle || typeof rawStyle !== "object") return false;
  const s = rawStyle;
  return Boolean(
    s.fillColor || s.fill_color ||
    s.strokeColor || s.stroke_color || s.color ||
    s.circleColor || s.circle_color ||
    s.circleStrokeColor || s.circle_stroke_color ||
    s.fillOpacity !== undefined || s.fill_opacity !== undefined ||
    s.strokeOpacity !== undefined || s.stroke_opacity !== undefined ||
    s.circleOpacity !== undefined || s.circle_opacity !== undefined ||
    s.strokeWidth !== undefined || s.stroke_width !== undefined ||
    s.circleRadius !== undefined || s.circle_radius !== undefined ||
    s.strokeDasharray || s.stroke_dasharray ||
    s.lineCap || s.line_cap ||
    s.lineJoin || s.line_join
  );
}

/**
 * Builds Mapbox paint and layout configurations for polygon, line, point, or raster.
 */
export function toMapboxStyle(rawStyle, geometryKind = "polygon", layer = null) {
  const style = normalizeDefaultStyle(rawStyle);
  const kind = String(geometryKind).toLowerCase();

  if (kind.includes("poly")) {
    const fillColor = style.fillColor || GEOSERVER_VECTOR_PAINT?.polygonFill?.["fill-color"] || "#3388ff";
    const fillOpacity = style.fillOpacity ?? style.opacity ?? GEOSERVER_VECTOR_PAINT?.polygonFill?.["fill-opacity"] ?? 0.35;
    const strokeColor = style.strokeColor || GEOSERVER_VECTOR_PAINT?.polygonOutline?.["line-color"] || "#0055aa";
    const strokeOpacity = style.strokeOpacity ?? style.opacity ?? GEOSERVER_VECTOR_PAINT?.polygonOutline?.["line-opacity"] ?? 0.9;
    const strokeWidth = style.strokeWidth ?? GEOSERVER_VECTOR_PAINT?.polygonOutline?.["line-width"] ?? 1.5;
    const strokeBlur = style.strokeBlur ?? 0;

    const fillPaint = {
      "fill-color": fillColor,
      "fill-opacity": fillOpacity,
      "fill-antialias": style.fillAntialias ?? true,
    };

    const outlinePaint = {
      "line-color": strokeColor,
      "line-opacity": strokeOpacity,
      "line-width": strokeWidth,
      ...(strokeBlur > 0 ? { "line-blur": strokeBlur } : {}),
      ...(Array.isArray(style.strokeDasharray) && style.strokeDasharray.length >= 2
        ? { "line-dasharray": style.strokeDasharray }
        : {}),
    };

    return {
      fillPaint,
      outlinePaint,
    };
  }

  if (kind.includes("line")) {
    const strokeColor = style.strokeColor || GEOSERVER_VECTOR_PAINT?.line?.["line-color"] || "#ff3300";
    const strokeOpacity = style.strokeOpacity ?? style.opacity ?? GEOSERVER_VECTOR_PAINT?.line?.["line-opacity"] ?? 0.95;
    const strokeWidth = style.strokeWidth ?? GEOSERVER_VECTOR_PAINT?.line?.["line-width"] ?? 2.5;
    const strokeBlur = style.strokeBlur ?? 0;
    const strokeOffset = style.strokeOffset ?? 0;

    const linePaint = {
      "line-color": strokeColor,
      "line-opacity": strokeOpacity,
      "line-width": strokeWidth,
      ...(strokeBlur > 0 ? { "line-blur": strokeBlur } : {}),
      ...(strokeOffset !== 0 ? { "line-offset": strokeOffset } : {}),
      ...(Array.isArray(style.strokeDasharray) && style.strokeDasharray.length >= 2
        ? { "line-dasharray": style.strokeDasharray }
        : {}),
    };

    const lineLayout = {
      "line-cap": style.lineCap || "round",
      "line-join": style.lineJoin || "round",
    };

    return {
      linePaint,
      lineLayout,
    };
  }

  if (kind.includes("point")) {
    const circleColor = style.circleColor || GEOSERVER_POINT_PAINT?.point?.["circle-color"] || "#0f766e";
    const circleOpacity = style.circleOpacity ?? style.opacity ?? GEOSERVER_POINT_PAINT?.point?.["circle-opacity"] ?? 0.95;
    const circleRadius = style.circleRadius ?? GEOSERVER_POINT_PAINT?.point?.["circle-radius"] ?? 5.5;
    const circleBlur = style.circleBlur ?? 0;
    const circleStrokeColor = style.circleStrokeColor || GEOSERVER_POINT_PAINT?.point?.["circle-stroke-color"] || "#ffffff";
    const circleStrokeOpacity = style.circleStrokeOpacity ?? 1;
    const circleStrokeWidth = style.circleStrokeWidth ?? style.strokeWidth ?? GEOSERVER_POINT_PAINT?.point?.["circle-stroke-width"] ?? 1.5;

    const pointPaint = {
      "circle-color": circleColor,
      "circle-opacity": circleOpacity,
      "circle-radius": circleRadius,
      "circle-stroke-color": circleStrokeColor,
      "circle-stroke-opacity": circleStrokeOpacity,
      "circle-stroke-width": circleStrokeWidth,
      ...(circleBlur > 0 ? { "circle-blur": circleBlur } : {}),
    };

    return {
      pointPaint,
    };
  }

  // Raster
  const rasterOpacity = style.rasterOpacity ?? style.opacity ?? getDefaultRasterOpacity(layer);
  const rasterPaint = {
    "raster-opacity": rasterOpacity,
    ...(style.brightnessMin !== undefined ? { "raster-brightness-min": style.brightnessMin } : {}),
    ...(style.brightnessMax !== undefined ? { "raster-brightness-max": style.brightnessMax } : {}),
    ...(style.contrast !== undefined ? { "raster-contrast": style.contrast } : {}),
    ...(style.saturation !== undefined ? { "raster-saturation": style.saturation } : {}),
    ...(style.hueRotate !== undefined ? { "raster-hue-rotate": style.hueRotate } : {}),
    ...(style.fadeDuration !== undefined ? { "raster-fade-duration": style.fadeDuration } : {}),
    ...(style.resampling ? { "raster-resampling": style.resampling } : {}),
  };

  return {
    rasterPaint,
  };
}
