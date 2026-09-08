import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import mapboxgl from "mapbox-gl";
import MapboxCompare from "mapbox-gl-compare";
import {
  defaultLatLong,
  defaultStyle,
  defaultZoom,
  mapDelta,
} from "@/constant/mapData";
import { useMapStore } from "@/stores/Map/useMapStore";
import { useMapStyleStore } from "@/stores/Map/Sidebar/useMapStyleStore";
import { useSatelliteStore } from "@/stores/Map/Sidebar/useSatelliteStore";

import {
  resetViewPort,
  initializeDraw,
  update3DTerrain,
  update3DBuildings,
  addSatelliteLayerToMap,
  updateSatelliteLayerOpacity,
  toggleSatelliteLayerVisibility,
  removeSatelliteLayerFromMap,
  addOrUpdateCategoryLayer,
  addOrUpdateGeoServerLayer,
  addOrUpdateTimeSeriesLayer,
  removeTimeSeriesLayerFromMap,
  buildOgcFeatureInfoUrl,
  buildOgcPointLayerIds,
  buildOgcVectorLayerIds,
  buildOgcSourceId,
  isOgcPointGeometry,
  isOgcPolygonGeometry,
  isOgcLineGeometry,
  hasCustomVectorStyle,
  removeCategoryLayer,
  removeGeoServerLayer,
  highlightFeatureOnMap,
  clearHighlightFromMap,
} from "@/helper/Map/MapHelper";
import {
  MapToolbar,
  MapStatusBar,
  AQIPopup,
  MapLegend,
} from "@/components/Map/FloatTool";
import { useMeasurementOverlay } from "@/helper/Map/useMeasurementOverlay";
import { useModalMapLayerStore } from "@/stores/Map/useModalMapLayerStore";
import MapLayerDetailModal from "@/components/Map/MapLayerDetailModal";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const getOgcIdentifyPriority = (geometryType) => {
  const type = String(geometryType || "").toLowerCase();
  if (type.includes("point")) return 2;
  if (type.includes("line")) return 1;
  return 0;
};

const getFeatureDisplayName = (feature, layer) => {
  const props = feature?.properties || {};
  return (
    props.name ||
    props.name_vi ||
    props.ten ||
    props.ten_vung ||
    props.label ||
    layer?.name ||
    layer?.name_vi ||
    layer?.code ||
    "Đối tượng bản đồ"
  );
};

const mapOgcFeatureToModalData = (feature, layer) => ({
  id: feature?.id || feature?.properties?.id || feature?.properties?.objectid,
  code: layer?.code,
  name: getFeatureDisplayName(feature, layer),
  description: layer?.description,
  category: layer?.category,
  geometry_type: layer?.geometry_type || feature?.geometry?.type,
  geometry_data: feature?.geometry,
  default_style: layer?.default_style || {},
  properties: {
    ...(feature?.properties || {}),
    layer_code: layer?.code,
    geoserver_layer: layer?.geoserver_layer,
  },
});

export default function MapComponent() {
  // Map state for status bar
  const mapContainer = useRef(null);
  const singleMapContainerRef = useRef(null);
  const splitMapContainerRef = useRef(null);
  const compareInitTimerRef = useRef(null);
  const setMapRef = useMapStore((state) => state.setMapRef);
  const setClickedPoint = useMapStore((state) => state.setClickedPoint);
  const mapRef = useRef({
    single: null, // map đơn
    split: null, // map phải
    compare: null, // instance compare
  });
  const mapStyleRef = {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "100%",
  };

  const [mapState, setMapState] = useState({
    lat: defaultLatLong.lat,
    lng: defaultLatLong.lng,
    zoom: defaultZoom,
  });

  // Map style
  const mapStyle = useMapStyleStore((s) => s.mapStyle);
  const appliedMapStyleRef = useRef(mapStyle || defaultStyle);
  const terrainState = useMapStyleStore((s) => s.terrainState);
  const setTerrainLoading = useMapStyleStore((s) => s.setTerrainLoading);
  const terrainStateRef = useRef(terrainState);
  const [mapsReady, setMapsReady] = useState({
    single: false,
    split: false,
  });
  // setStyle removes custom sources/layers. Increment after every style load so
  // both maps re-apply the latest satellite, category, and OGC layer state.
  const [mapLayerRevision, setMapLayerRevision] = useState(0);
  const pending3DApplyRef = useRef({
    single: false,
    split: false,
  });
  const pitchReconcileTimerRef = useRef({
    single: null,
    split: null,
  });

  useEffect(() => {
    terrainStateRef.current = terrainState;
  }, [terrainState]);

  const finalizeTerrainLoading = useCallback(() => {
    const singleMap = mapRef.current.single;
    const splitMap = mapRef.current.split;

    const singlePending =
      !!singleMap &&
      pending3DApplyRef.current.single &&
      !singleMap.isStyleLoaded();
    const splitPending =
      !!splitMap &&
      pending3DApplyRef.current.split &&
      !splitMap.isStyleLoaded();

    if (!singlePending && !splitPending) {
      setTerrainLoading(false);
    }
  }, [setTerrainLoading]);

  const clickedPointMode = useMapStyleStore((s) => s.clickedPointMode);
  const isSplitMode = useMapStore((s) => s.isSplitMode);
  const isSplitModeRef = useRef(isSplitMode);

  useEffect(() => {
    isSplitModeRef.current = isSplitMode;
  }, [isSplitMode]);

  // satellite state
  const satelliteLayers = useSatelliteStore((s) => s.satelliteLayers);

  // Category layers, OGC & Time Series layers - MUST declare before used in effects
  const categoryLayersData = useMapStore((s) => s.categoryLayersData);
  const ogcLayersData = useMapStore((s) => s.ogcLayersData);
  const timeSeriesLayersData = useMapStore((s) => s.timeSeriesLayersData);
  const categoryLayersDataRef = useRef(categoryLayersData);
  const ogcLayersDataRef = useRef(ogcLayersData);
  const timeSeriesLayersDataRef = useRef(timeSeriesLayersData);
  useEffect(() => {
    categoryLayersDataRef.current = categoryLayersData;
  }, [categoryLayersData]);
  useEffect(() => {
    ogcLayersDataRef.current = ogcLayersData;
  }, [ogcLayersData]);
  useEffect(() => {
    timeSeriesLayersDataRef.current = timeSeriesLayersData;
  }, [timeSeriesLayersData]);
  const highlightedFeature = useMapStore((s) => s.highlightedFeature);

  // draw state
  const drawRef = useRef(null);
  const { updateMeasurements } = useMeasurementOverlay(mapRef);
  const handleDrawCreate = useCallback(() => {
    const draw = drawRef.current;
    if (!draw) return;

    const data = draw.getAll();
    if (data.features.length > 0) {
      updateMeasurements(data.features);
    }
  }, [updateMeasurements]);

  const handleDrawUpdate = useCallback(() => {
    const draw = drawRef.current;
    if (!draw) return;

    const data = draw.getAll();
    updateMeasurements(data.features);
  }, [updateMeasurements]);

  const handleDrawDelete = useCallback(() => {
    const draw = drawRef.current;
    if (!draw) return;

    const data = draw.getAll();
    updateMeasurements(data.features);
  }, [updateMeasurements]);

  // Weather UI/service is temporarily disabled. Keep implementation files
  // available without importing or invoking them from the map UI.

  // Initialize map
  useEffect(() => {
    if (mapRef.current.single || !singleMapContainerRef.current) return;

    // Lấy terrainState hiện tại để khởi tạo pitch đúng
    const initialTerrain = useMapStyleStore.getState().terrainState;

    mapRef.current.single = new mapboxgl.Map({
      container: singleMapContainerRef.current,
      style: mapStyle || defaultStyle,
      center: [defaultLatLong.lng, defaultLatLong.lat],
      zoom: defaultZoom,
      pitch: initialTerrain ? 75 : 0,
      bearing: 0,
      antialias: true,
      preserveDrawingBuffer: true,
    });

    mapRef.current.split = new mapboxgl.Map({
      container: splitMapContainerRef.current,
      style: mapStyle || defaultStyle,
      center: [defaultLatLong.lng, defaultLatLong.lat],
      zoom: defaultZoom,
      pitch: initialTerrain ? 75 : 0,
      bearing: 0,
      antialias: true,
      preserveDrawingBuffer: true,
    });

    // Ẩn split map ban đầu.
    mapRef.current.split.getContainer().style.display = "none";

    const map = mapRef.current.single;
    const mapBounds = [
      [defaultLatLong.lng - mapDelta, defaultLatLong.lat - mapDelta],
      [defaultLatLong.lng + mapDelta, defaultLatLong.lat + mapDelta],
    ];

    const handleSingleLoad = () => {
      setMapRef(map);
      // Store full mapRef so satellite store can access single/split maps.
      useMapStore.getState().setMapRefObj(mapRef);

      drawRef.current = initializeDraw(
        map,
        handleDrawCreate,
        handleDrawUpdate,
        handleDrawDelete,
      );

      map.setMaxBounds(mapBounds);

      // Add Map Controls (only to single map).
      map.addControl(new mapboxgl.FullscreenControl(), "bottom-right");
      map.addControl(
        new ResetControl(() => useMapStyleStore.getState().terrainState),
        "bottom-right",
      );

      setMapsReady((prev) => ({ ...prev, single: true }));
    };

    const handleSplitLoad = () => {
      mapRef.current.split?.setMaxBounds(mapBounds);
      setMapsReady((prev) => ({ ...prev, split: true }));
    };

    map.on("load", handleSingleLoad);
    mapRef.current.split.on("load", handleSplitLoad);

    const handleSingleMove = () => {
      const center = map.getCenter();
      setMapState({
        lat: center.lat,
        lng: center.lng,
        zoom: map.getZoom(),
      });
    };
    const markMapLayersStale = () =>
      setMapLayerRevision((value) => value + 1);

    map.on("move", handleSingleMove);
    map.on("style.load", markMapLayersStale);
    mapRef.current.split.on("style.load", markMapLayersStale);

    return () => {
      const mapStore = useMapStore.getState();
      if (mapStore.mapInstance === map) {
        mapStore.clearMapRef();
      }
      if (mapStore.mapRefObj === mapRef) {
        mapStore.setMapRefObj(null);
      }

      map.off("move", handleSingleMove);
      map.off("style.load", markMapLayersStale);
      mapRef.current.split?.off("style.load", markMapLayersStale);
      if (compareInitTimerRef.current) {
        window.clearTimeout(compareInitTimerRef.current);
        compareInitTimerRef.current = null;
      }
      if (mapRef.current.compare) {
        mapRef.current.compare.remove();
        mapRef.current.compare = null;
      }
      if (mapRef.current.single) {
        mapRef.current.single.remove();
        mapRef.current.single = null;
      }
      if (mapRef.current.split) {
        mapRef.current.split.remove();
        mapRef.current.split = null;
      }
      mapRef.current.compare = null;
      setMapsReady({ single: false, split: false });
    };
  }, []);

  // Handle MapboxCompare toggle for Compare Mode.
  useEffect(() => {
    if (!mapsReady.single || !mapsReady.split) return;

    const { single, split } = mapRef.current;
    if (!single || !split) return;

    if (isSplitMode) {
      let disposed = false;

      const activateCompare = () => {
        if (
          disposed ||
          !useMapStore.getState().isSplitMode ||
          !split.isStyleLoaded()
        ) {
          return;
        }

        split.getContainer().style.display = "block";
        if (compareInitTimerRef.current) {
          window.clearTimeout(compareInitTimerRef.current);
        }

        // Chờ container trở lại layout trước khi resize và khởi tạo slider.
        compareInitTimerRef.current = window.setTimeout(() => {
          compareInitTimerRef.current = null;
          if (disposed || !useMapStore.getState().isSplitMode) return;

          split.resize();
          split.jumpTo({
            center: single.getCenter(),
            zoom: single.getZoom(),
            pitch: single.getPitch(),
            bearing: single.getBearing(),
          });

          if (!mapRef.current.compare) {
            try {
              mapRef.current.compare = new MapboxCompare(
                single,
                split,
                mapContainer.current,
              );
            } catch (error) {
              console.error(
                "[MapComponent] Failed to initialize map compare:",
                error,
              );
            }
          }
        }, 100);
      };

      if (split.isStyleLoaded()) {
        activateCompare();
      } else {
        split.once("style.load", activateCompare);
      }

      return () => {
        disposed = true;
        split.off("style.load", activateCompare);
        if (compareInitTimerRef.current) {
          window.clearTimeout(compareInitTimerRef.current);
          compareInitTimerRef.current = null;
        }
      };
    }

    if (mapRef.current.compare) {
      try {
        mapRef.current.compare.remove();
      } catch (error) {
        console.error("[MapComponent] Failed to remove map compare:", error);
      }
      mapRef.current.compare = null;
    }
    split.getContainer().style.display = "none";
  }, [isSplitMode, mapsReady.single, mapsReady.split]);

  // Handle satellite layers
  useEffect(() => {
    if (!mapsReady.single || !mapsReady.split) return;

    const { single, split } = mapRef.current;
    if (!single || !split) return;

    const removeStaleLayers = (targetMap, wantedLayers) => {
      const wantedIds = new Set(wantedLayers.map((layer) => layer.id));
      (targetMap.getStyle()?.layers || [])
        .filter((layer) => layer.id.startsWith("satellite-") && !wantedIds.has(layer.id))
        .forEach((layer) =>
          removeSatelliteLayerFromMap(targetMap, layer.id, layer.source),
        );
    };
    const cleanupCallbacks = [];
    const syncMapLayers = (targetMap, wantedLayers) => {
      const applyLayers = () => {
        if (!targetMap || targetMap._removed || !targetMap.getStyle()) return;

        removeStaleLayers(targetMap, wantedLayers);
        wantedLayers.forEach((layer) => {
          if (targetMap.getLayer(layer.id) || !layer.layerData?.tileUrl) return;

          addSatelliteLayerToMap(
            targetMap,
            layer.layerData,
            layer.id,
            layer.layerOpacity ?? 1,
            layer.sourceId,
            layer.visible !== false,
          );
        });
        targetMap.triggerRepaint();
      };

      if (targetMap.isStyleLoaded()) {
        applyLayers();
        return;
      }

      // GEE có thể hoàn tất đúng lúc Mapbox đang tải/thay style. Chờ bản đồ
      // sẵn sàng thay vì bỏ luôn response đã tải thành công.
      const handleReady = () => {
        if (!targetMap.isStyleLoaded()) return;
        targetMap.off("style.load", handleReady);
        targetMap.off("idle", handleReady);
        applyLayers();
      };
      targetMap.on("style.load", handleReady);
      targetMap.on("idle", handleReady);
      cleanupCallbacks.push(() => {
        targetMap.off("style.load", handleReady);
        targetMap.off("idle", handleReady);
      });
    };

    const leftLayers = satelliteLayers.filter(
      (layer) => layer.splitSide !== "right" && layer.splitSide !== "change",
    );
    const rightLayers = satelliteLayers.filter(
      (layer) => layer.splitSide === "right",
    );
    const changeLayers = satelliteLayers.filter(
      (layer) => layer.splitSide === "change",
    );

    syncMapLayers(single, [...leftLayers, ...changeLayers]);
    syncMapLayers(
      split,
      isSplitMode ? [...rightLayers, ...changeLayers] : [],
    );

    return () => cleanupCallbacks.forEach((cleanup) => cleanup());
  }, [
    satelliteLayers,
    mapsReady.single,
    mapsReady.split,
    mapLayerRevision,
    isSplitMode,
  ]);

  // Handle satellite layer opacity & visibility updates
  useEffect(() => {
    if (!mapRef.current.single || !mapsReady.single) return;
    if (!satelliteLayers || satelliteLayers.length === 0) return;

    const { single, split } = mapRef.current;

    // Update each layer's opacity and visibility
    satelliteLayers.forEach((layer) => {
      const layerId = layer.id; // layer.id is already in format 'satellite-{id}'
      const opacity = layer.layerOpacity ?? 1;
      const visible = layer.visible !== false; // Default to visible

      // Update based on splitSide
      if (layer.splitSide === "right") {
        if (split && split.getLayer(layerId)) {
          updateSatelliteLayerOpacity(split, layerId, opacity);
          toggleSatelliteLayerVisibility(split, layerId, visible);
        }
      } else if (layer.splitSide === "change") {
        [single, split].forEach((targetMap) => {
          if (!targetMap?.getLayer(layerId)) return;
          updateSatelliteLayerOpacity(targetMap, layerId, opacity);
          toggleSatelliteLayerVisibility(targetMap, layerId, visible);
        });
      } else if (layer.splitSide === "left") {
        if (single && single.getLayer(layerId)) {
          updateSatelliteLayerOpacity(single, layerId, opacity);
          toggleSatelliteLayerVisibility(single, layerId, visible);
        }
      } else {
        if (single && single.getLayer(layerId)) {
          updateSatelliteLayerOpacity(single, layerId, opacity);
          toggleSatelliteLayerVisibility(single, layerId, visible);
        }
        if (split && split.getLayer(layerId)) {
          updateSatelliteLayerOpacity(split, layerId, opacity);
          toggleSatelliteLayerVisibility(split, layerId, visible);
        }
      }
    });
  }, [
    satelliteLayers
      .map((l) => `${l.id}-${l.layerOpacity}-${l.visible}`)
      .join("|"),
    mapsReady.single,
  ]);

  // Handle click on map for AQI mode
  useEffect(() => {
    if (!mapRef.current.single) return;

    const handleClick = (e) => {
      if (clickedPointMode) {
        setClickedPoint({
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
        });
      }
    };

    mapRef.current.single.on("click", handleClick);

    // Update cursor based on mode
    if (clickedPointMode) {
      mapRef.current.single.getCanvas().style.cursor = "crosshair";
    } else {
      mapRef.current.single.getCanvas().style.cursor = "";
    }

    return () => {
      if (mapRef.current.single) {
        mapRef.current.single.off("click", handleClick);
      }
    };
  }, [clickedPointMode, setClickedPoint]);

  // Update map style - dùng transformStyle để giữ lại custom sources & layers
  useEffect(() => {
    if (!mapRef.current.single) return;

    const nextMapStyle = mapStyle || defaultStyle;
    if (appliedMapStyleRef.current === nextMapStyle) return;
    appliedMapStyleRef.current = nextMapStyle;

    const transformStyle = (previousStyle, nextStyle) => {
      if (!previousStyle) return nextStyle;

      // Lọc custom sources (không phải built-in của style)
      const builtinSourceIds = new Set(Object.keys(nextStyle.sources || {}));
      const customSources = Object.entries(previousStyle.sources || {}).reduce(
        (acc, [id, source]) => {
          if (!builtinSourceIds.has(id)) acc[id] = source;
          return acc;
        },
        {},
      );

      // Lọc custom layers (có source là custom hoặc id bắt đầu bằng cat-/satellite-/highlight-/buffer-)
      const builtinLayerIds = new Set(
        (nextStyle.layers || []).map((l) => l.id),
      );
      const customLayers = (previousStyle.layers || []).filter((l) => {
        const isBuiltin = builtinLayerIds.has(l.id);
        const hasCustomSource = customSources[l.source];
        const isCustomPrefix =
          /^(cat-|ogc-|satellite-|highlight-|buffer-)/.test(l.id);
        const isSpecial = ["mapbox-dem", "sky", "3d-buildings"].includes(l.id);
        return !isBuiltin && (hasCustomSource || isCustomPrefix || isSpecial);
      });

      return {
        ...nextStyle,
        sources: { ...nextStyle.sources, ...customSources },
        layers: [...(nextStyle.layers || []), ...customLayers],
      };
    };

    // Restore category layers sau khi style load xong
    // Dùng ref để không re-run effect khi categoryLayersData thay đổi
    const onStyleLoad = () => {
      const latestData = categoryLayersDataRef.current;
      const map = mapRef.current.single;
      Object.entries(latestData || {}).forEach(
        ([sourceId, { geojson, geometryType, color, icon }]) => {
          addOrUpdateCategoryLayer(
            map,
            sourceId,
            geojson,
            geometryType,
            color,
            true,
            icon,
          );
        },
      );

      Object.entries(ogcLayersDataRef.current || {}).forEach(
        ([sourceId, layer]) => {
          addOrUpdateGeoServerLayer(map, sourceId, layer, true);
        },
      );

    };

    // SETUP LISTENER BEFORE calling setStyle!
    mapRef.current.single.once("style.load", onStyleLoad);
    mapRef.current.single.setStyle(nextMapStyle, {
      diff: false,
      transformStyle,
    });

    if (mapRef.current.split) {
      const onSplitStyleLoad = () => {
        const latestData = categoryLayersDataRef.current;
        const splitMap = mapRef.current.split;
        const latestOgcData = ogcLayersDataRef.current || {};

        // Keep the split map warm, but remove business-data sources while it
        // is hidden so they cannot continue requesting WMS tiles or WFS data.
        if (!useMapStore.getState().isSplitMode) {
          Object.keys(latestData || {}).forEach((sourceId) => {
            removeCategoryLayer(splitMap, sourceId);
          });
          Object.keys(latestOgcData).forEach((sourceId) => {
            removeGeoServerLayer(splitMap, sourceId);
          });
          return;
        }

        Object.entries(latestData || {}).forEach(
          ([sourceId, { geojson, geometryType, color, icon }]) => {
            const addLayer = addOrUpdateCategoryLayer(
              splitMap,
              sourceId,
              geojson,
              geometryType,
              color,
              true,
              icon,
            );
            void Promise.resolve(addLayer).then(() => {
              const latestState = useMapStore.getState();
              if (
                !latestState.isSplitMode ||
                !latestState.categoryLayersData[sourceId]
              ) {
                removeCategoryLayer(splitMap, sourceId);
              }
            });
          },
        );

        Object.entries(latestOgcData).forEach(([sourceId, layer]) => {
          const addLayer = addOrUpdateGeoServerLayer(
            splitMap,
            sourceId,
            layer,
            true,
          );
          void Promise.resolve(addLayer).then(() => {
            const latestState = useMapStore.getState();
            if (
              !latestState.isSplitMode ||
              !latestState.ogcLayersData[sourceId]
            ) {
              removeGeoServerLayer(splitMap, sourceId);
            }
          });
        });
      };

      mapRef.current.split.once("style.load", onSplitStyleLoad);
      mapRef.current.split.setStyle(nextMapStyle, {
        diff: false,
        transformStyle,
      });
    }
  }, [mapStyle]); // ONLY re-run when mapStyle changes, NOT on categoryLayersData changes

  // 3D Buildings & Terrain Effect
  const apply3DToMap = useCallback(
    (target) => {
      const map = mapRef.current[target];
      const nextTerrainState = terrainStateRef.current;

      if (!map) {
        pending3DApplyRef.current[target] = false;
        return false;
      }

      if (target === "split" && !isSplitModeRef.current) {
        pending3DApplyRef.current.split = false;
        return true;
      }

      if (!map.isStyleLoaded()) {
        pending3DApplyRef.current[target] = true;
        setTerrainLoading(true);
        return false;
      }

      pending3DApplyRef.current[target] = false;

      update3DTerrain(map, nextTerrainState);
      update3DBuildings(map, nextTerrainState);

      const targetPitch = nextTerrainState ? 75 : 0;

      if (pitchReconcileTimerRef.current[target]) {
        window.clearTimeout(pitchReconcileTimerRef.current[target]);
      }

      pitchReconcileTimerRef.current[target] = window.setTimeout(() => {
        const currentMap = mapRef.current[target];
        if (!currentMap || !currentMap.isStyleLoaded()) return;

        const currentPitch = currentMap.getPitch();
        const pitchDiff = Math.abs(currentPitch - targetPitch);

        if (pitchDiff > 1) {
          currentMap.stop();
          currentMap.easeTo({
            pitch: targetPitch,
            bearing: currentMap.getBearing(),
            duration: 350,
            essential: true,
          });
        }

        finalizeTerrainLoading();
      }, 1400);

      finalizeTerrainLoading();

      return true;
    },
    [finalizeTerrainLoading, setTerrainLoading],
  );

  useEffect(() => {
    const single = mapRef.current.single;
    const split = mapRef.current.split;

    if (!single && !split) return;

    const handleSingleStyleLoad = () => {
      apply3DToMap("single", "style.load");
      finalizeTerrainLoading();
    };

    const handleSplitStyleLoad = () => {
      apply3DToMap("split", "style.load");
      finalizeTerrainLoading();
    };

    if (single) {
      single.on("style.load", handleSingleStyleLoad);
    }
    if (split) {
      split.on("style.load", handleSplitStyleLoad);
    }

    return () => {
      if (single) {
        single.off("style.load", handleSingleStyleLoad);
      }
      if (split) {
        split.off("style.load", handleSplitStyleLoad);
      }
    };
  }, [apply3DToMap, finalizeTerrainLoading, mapsReady.single, mapsReady.split]);

  useEffect(() => {
    return () => {
      if (pitchReconcileTimerRef.current.single) {
        window.clearTimeout(pitchReconcileTimerRef.current.single);
      }
      if (pitchReconcileTimerRef.current.split) {
        window.clearTimeout(pitchReconcileTimerRef.current.split);
      }
      setTerrainLoading(false);
    };
  }, [setTerrainLoading]);

  useEffect(() => {
    const single = mapRef.current.single;
    const split = mapRef.current.split;

    if (!single && !split) return;

    const flushPending = (target, sourceEvent) => {
      const map = mapRef.current[target];
      if (!map) return;

      if (!pending3DApplyRef.current[target]) return;
      if (!map.isStyleLoaded()) return;

      apply3DToMap(target, `pending-flush:${sourceEvent}`);
      finalizeTerrainLoading();
    };

    const handleSingleStyleData = () => flushPending("single", "styledata");
    const handleSplitStyleData = () => flushPending("split", "styledata");
    const handleSingleIdle = () => flushPending("single", "idle");
    const handleSplitIdle = () => flushPending("split", "idle");

    if (single) {
      single.on("styledata", handleSingleStyleData);
      single.on("idle", handleSingleIdle);
    }
    if (split) {
      split.on("styledata", handleSplitStyleData);
      split.on("idle", handleSplitIdle);
    }

    return () => {
      if (single) {
        single.off("styledata", handleSingleStyleData);
        single.off("idle", handleSingleIdle);
      }
      if (split) {
        split.off("styledata", handleSplitStyleData);
        split.off("idle", handleSplitIdle);
      }
    };
  }, [apply3DToMap, finalizeTerrainLoading, mapsReady.single, mapsReady.split]);

  useEffect(() => {
    setTerrainLoading(true);
    apply3DToMap("single", "terrain-change");
    apply3DToMap("split", "terrain-change");
    finalizeTerrainLoading();
  }, [terrainState, apply3DToMap, finalizeTerrainLoading, setTerrainLoading]);

  // ─── Category Layers Effect ─────────────────────────────────────────
  // Đồng bộ categoryLayersData từ useMapStore lên map
  const prevCategoryKeysRef = useRef({
    single: new Set(),
    split: new Set(),
  });

  useEffect(() => {
    const map = mapRef.current.single;
    if (!map || !mapsReady.single) return;

    const currentKeys = new Set(Object.keys(categoryLayersData));
    const prevKeys = prevCategoryKeysRef.current.single;

    // Thêm/cập nhật các layers mới hoặc thay đổi trên single map
    currentKeys.forEach((sourceId) => {
      const { geojson, geometryType, color, icon } =
        categoryLayersData[sourceId];
      addOrUpdateCategoryLayer(
        map,
        sourceId,
        geojson,
        geometryType,
        color,
        true,
        icon,
      );
    });

    // Xóa các layers đã bị remove khỏi store trên single map
    prevKeys.forEach((sourceId) => {
      if (!currentKeys.has(sourceId)) removeCategoryLayer(map, sourceId);
    });

    const splitMap = mapRef.current.split;
    if (!splitMap || !mapsReady.split) {
      prevCategoryKeysRef.current.single = currentKeys;
      return;
    }

    const syncSplitLayers = () => {
      const latestState = useMapStore.getState();
      const latestData = latestState.categoryLayersData || {};
      const latestKeys = new Set(Object.keys(latestData));
      const prevSplitKeys = prevCategoryKeysRef.current.split;

      if (!latestState.isSplitMode) {
        new Set([...prevSplitKeys, ...latestKeys]).forEach((sourceId) => {
          removeCategoryLayer(splitMap, sourceId);
        });
        prevCategoryKeysRef.current.split = new Set();
        return;
      }

      latestKeys.forEach((sourceId) => {
        const { geojson, geometryType, color, icon } = latestData[sourceId];
        const addLayer = addOrUpdateCategoryLayer(
          splitMap,
          sourceId,
          geojson,
          geometryType,
          color,
          true,
          icon,
        );
        void Promise.resolve(addLayer).then(() => {
          const stateAfterAdd = useMapStore.getState();
          if (
            !stateAfterAdd.isSplitMode ||
            !stateAfterAdd.categoryLayersData[sourceId]
          ) {
            removeCategoryLayer(splitMap, sourceId);
          }
        });
      });
      prevSplitKeys.forEach((sourceId) => {
        if (!latestKeys.has(sourceId)) {
          removeCategoryLayer(splitMap, sourceId);
        }
      });
      prevCategoryKeysRef.current.split = latestKeys;
    };

    if (splitMap.isStyleLoaded()) {
      syncSplitLayers();
    } else {
      splitMap.once("style.load", syncSplitLayers);
    }

    prevCategoryKeysRef.current.single = currentKeys;
    return () => splitMap.off("style.load", syncSplitLayers);
  }, [
    categoryLayersData,
    isSplitMode,
    mapsReady.single,
    mapsReady.split,
    mapLayerRevision,
  ]);

  const prevOgcKeysRef = useRef({
    single: new Set(),
    split: new Set(),
  });

  useEffect(() => {
    const map = mapRef.current.single;
    if (!map || !mapsReady.single) return;

    const currentKeys = new Set(Object.keys(ogcLayersData));
    const prevKeys = prevOgcKeysRef.current.single;

    currentKeys.forEach((sourceId) => {
      addOrUpdateGeoServerLayer(map, sourceId, ogcLayersData[sourceId], true);
    });

    prevKeys.forEach((sourceId) => {
      if (!currentKeys.has(sourceId)) {
        removeGeoServerLayer(map, sourceId);
      }
    });

    const splitMap = mapRef.current.split;
    if (!splitMap || !mapsReady.split) {
      prevOgcKeysRef.current.single = currentKeys;
      return;
    }

    const syncSplitLayers = () => {
      const latestState = useMapStore.getState();
      const latestData = latestState.ogcLayersData || {};
      const latestKeys = new Set(Object.keys(latestData));
      const prevSplitKeys = prevOgcKeysRef.current.split;

      if (!latestState.isSplitMode) {
        new Set([...prevSplitKeys, ...latestKeys]).forEach((sourceId) => {
          removeGeoServerLayer(splitMap, sourceId);
        });
        prevOgcKeysRef.current.split = new Set();
        return;
      }

      latestKeys.forEach((sourceId) => {
        const addLayer = addOrUpdateGeoServerLayer(
          splitMap,
          sourceId,
          latestData[sourceId],
          true,
        );
        void Promise.resolve(addLayer).then(() => {
          const stateAfterAdd = useMapStore.getState();
          if (
            !stateAfterAdd.isSplitMode ||
            !stateAfterAdd.ogcLayersData[sourceId]
          ) {
            removeGeoServerLayer(splitMap, sourceId);
          }
        });
      });
      prevSplitKeys.forEach((sourceId) => {
        if (!latestKeys.has(sourceId)) {
          removeGeoServerLayer(splitMap, sourceId);
        }
      });
      prevOgcKeysRef.current.split = latestKeys;
    };

    if (splitMap.isStyleLoaded()) {
      syncSplitLayers();
    } else {
      splitMap.once("style.load", syncSplitLayers);
    }

    prevOgcKeysRef.current.single = currentKeys;
    return () => splitMap.off("style.load", syncSplitLayers);
  }, [
    ogcLayersData,
    isSplitMode,
    mapsReady.single,
    mapsReady.split,
    mapLayerRevision,
  ]);

  // ── Đồng bộ GeoTIFF Time Series lên Single & Split map ────────────────────
  const prevTimeSeriesKeysRef = useRef({
    single: new Set(),
    split: new Set(),
  });

  useEffect(() => {
    const map = mapRef.current.single;
    if (!map || !mapsReady.single) return;

    const currentEntries = Object.entries(timeSeriesLayersData || {});
    const currentKeys = new Set(
      currentEntries
        .filter(([, entry]) => Boolean(entry?.tileUrl))
        .map(([layerId]) => String(layerId)),
    );
    const prevKeys = prevTimeSeriesKeysRef.current.single;

    currentEntries.forEach(([layerId, entry]) => {
      if (entry?.tileUrl) {
        addOrUpdateTimeSeriesLayer(map, layerId, entry);
      }
    });

    prevKeys.forEach((layerId) => {
      if (!currentKeys.has(layerId)) {
        removeTimeSeriesLayerFromMap(map, layerId);
      }
    });

    const splitMap = mapRef.current.split;
    if (!splitMap || !mapsReady.split) {
      prevTimeSeriesKeysRef.current.single = currentKeys;
      return;
    }

    const syncSplitTimeSeries = () => {
      const latestState = useMapStore.getState();
      const latestData = latestState.timeSeriesLayersData || {};
      const latestEntries = Object.entries(latestData);
      const latestKeys = new Set(
        latestEntries
          .filter(([, entry]) => Boolean(entry?.tileUrl))
          .map(([layerId]) => String(layerId)),
      );
      const prevSplitKeys = prevTimeSeriesKeysRef.current.split;

      if (!latestState.isSplitMode) {
        new Set([...prevSplitKeys, ...latestKeys]).forEach((layerId) => {
          removeTimeSeriesLayerFromMap(splitMap, layerId);
        });
        prevTimeSeriesKeysRef.current.split = new Set();
        return;
      }

      latestEntries.forEach(([layerId, entry]) => {
        if (entry?.tileUrl) {
          addOrUpdateTimeSeriesLayer(splitMap, layerId, entry);
        }
      });

      prevSplitKeys.forEach((layerId) => {
        if (!latestKeys.has(layerId)) {
          removeTimeSeriesLayerFromMap(splitMap, layerId);
        }
      });
      prevTimeSeriesKeysRef.current.split = latestKeys;
    };

    if (splitMap.isStyleLoaded()) {
      syncSplitTimeSeries();
    } else {
      splitMap.once("style.load", syncSplitTimeSeries);
    }

    prevTimeSeriesKeysRef.current.single = currentKeys;
    return () => splitMap.off("style.load", syncSplitTimeSeries);
  }, [
    timeSeriesLayersData,
    isSplitMode,
    mapsReady.single,
    mapsReady.split,
    mapLayerRevision,
  ]);

  useEffect(() => {
    const map = mapRef.current.single;
    if (!map || !mapsReady.single) return;

    let disposed = false;

    const handleOgcLayerClick = async (event) => {
      if (clickedPointMode) return;

      const styleLayers = map.getStyle()?.layers || [];
      const categoryLayerIds = styleLayers
        .map((layer) => layer.id)
        .filter((id) => id.startsWith("cat-"));
      const categoryFeatures = categoryLayerIds.length
        ? map.queryRenderedFeatures(event.point, { layers: categoryLayerIds })
        : [];

      if (categoryFeatures.length > 0) return;

      const vectorLayerEntries = Object.values(ogcLayersData || {})
        .filter(
          (layer) =>
            layer?.geoserver_layer &&
            (isOgcPointGeometry(layer.geometry_type) ||
              ((isOgcPolygonGeometry(layer.geometry_type) ||
                isOgcLineGeometry(layer.geometry_type)) &&
                hasCustomVectorStyle(layer.default_style))),
        )
        .map((layer) => {
          const sourceId = buildOgcSourceId(layer);
          return {
            sourceId,
            layer,
            pointIds: isOgcPointGeometry(layer.geometry_type)
              ? buildOgcPointLayerIds(sourceId)
              : null,
            vectorIds:
              isOgcPolygonGeometry(layer.geometry_type) ||
              isOgcLineGeometry(layer.geometry_type)
                ? buildOgcVectorLayerIds(sourceId)
                : null,
          };
        });

      const vectorRenderedLayerIds = vectorLayerEntries
        .flatMap(({ pointIds, vectorIds }) => [
          pointIds?.cluster,
          pointIds?.point,
          vectorIds?.fill,
          vectorIds?.outline,
          vectorIds?.line,
        ])
        .filter((layerId) => layerId && map.getLayer(layerId));

      const vectorFeatures = vectorRenderedLayerIds.length
        ? map.queryRenderedFeatures(event.point, {
            layers: vectorRenderedLayerIds,
          })
        : [];
      const topVectorFeature = vectorFeatures[0];

      if (topVectorFeature) {
        const entry = vectorLayerEntries.find(
          ({ sourceId }) => sourceId === topVectorFeature.source,
        );
        if (entry) {
          if (topVectorFeature.properties?.cluster) {
            const clusterId = topVectorFeature.properties.cluster_id;
            const source = map.getSource(entry.sourceId);
            source?.getClusterExpansionZoom(clusterId, (error, zoom) => {
              if (error || disposed) return;
              map.easeTo({
                center: topVectorFeature.geometry.coordinates,
                zoom,
                duration: 350,
              });
            });
            return;
          }

          console.info(`typeNames=${entry.layer.geoserver_layer}`, {
            id: topVectorFeature.id,
            geometry: topVectorFeature.geometry,
            properties: topVectorFeature.properties,
          });

          useModalMapLayerStore
            .getState()
            .openModal(mapOgcFeatureToModalData(topVectorFeature, entry.layer));
          return;
        }
      }

      const activeLayers = Object.values(ogcLayersData || {})
        .filter(
          (layer) =>
            layer?.geoserver_layer &&
            !isOgcPointGeometry(layer.geometry_type) &&
            !((isOgcPolygonGeometry(layer.geometry_type) ||
              isOgcLineGeometry(layer.geometry_type)) &&
              hasCustomVectorStyle(layer.default_style)),
        )
        .sort((a, b) => {
          const priorityDiff =
            getOgcIdentifyPriority(b.geometry_type) -
            getOgcIdentifyPriority(a.geometry_type);
          if (priorityDiff !== 0) return priorityDiff;
          return (b.sort_order || 0) - (a.sort_order || 0);
        });

      if (!activeLayers.length) return;

      for (const layer of activeLayers) {
        const url = buildOgcFeatureInfoUrl(map, layer, event.point);
        if (!url) continue;

        try {
          const response = await fetch(url);
          if (!response.ok) {
            continue;
          }

          const data = await response.json();
          const feature = data?.features?.[0];
          if (!feature) continue;

          if (disposed) return;

          useModalMapLayerStore
            .getState()
            .openModal(mapOgcFeatureToModalData(feature, layer));
          return;
        } catch {
          // Ignore a failed identify request and continue with lower layers.
        }
      }
    };

    map.on("click", handleOgcLayerClick);

    return () => {
      disposed = true;
      map.off("click", handleOgcLayerClick);
    };
  }, [clickedPointMode, ogcLayersData, mapsReady.single]);

  // ─── Click on Category Point Layers → Open Modal ────────────────────
  useEffect(() => {
    const map = mapRef.current.single;
    if (!map || !mapsReady.single) return;

    const handlePointClick = (e) => {
      const feature = e.features?.[0];
      if (!feature?.properties) return;

      // Reconstruct mapLayer data từ GeoJSON feature properties
      const props = { ...feature.properties };

      // Parse lại các property là JSON string (Mapbox flatten nested objects)
      Object.keys(props).forEach((key) => {
        if (
          typeof props[key] === "string" &&
          (props[key].startsWith("{") || props[key].startsWith("["))
        ) {
          try {
            props[key] = JSON.parse(props[key]);
          } catch {
            // giữ nguyên string
          }
        }
      });

      const mapLayerData = {
        id: props.id,
        category: props.category,
        name: props.name || "Không có tên",
        geometry_type: "point",
        geometry_data: feature.geometry,
        properties: props,
      };

      useModalMapLayerStore.getState().openModal(mapLayerData);
    };

    // Track exact handler references so delegated Mapbox listeners can be removed.
    const registeredLayers = new Map();

    const registerClickHandlers = () => {
      if (map._removed || !map.isStyleLoaded()) return;

      // Tìm tất cả category point layers hiện tại
      let style;
      try {
        style = map.getStyle();
      } catch {
        // A style replacement may start between isStyleLoaded() and getStyle().
        return;
      }
      if (!style?.layers) return;

      style.layers.forEach((layer) => {
        if (
          layer.id.startsWith("cat-") &&
          layer.id.endsWith("-point") &&
          !registeredLayers.has(layer.id)
        ) {
          const handleMouseEnter = () => {
            map.getCanvas().style.cursor = "pointer";
          };
          const handleMouseLeave = () => {
            map.getCanvas().style.cursor = "";
          };

          map.on("click", layer.id, handlePointClick);
          map.on("mouseenter", layer.id, handleMouseEnter);
          map.on("mouseleave", layer.id, handleMouseLeave);
          registeredLayers.set(layer.id, {
            handleMouseEnter,
            handleMouseLeave,
          });
        }
      });
    };

    // style.load handles a rebuilt base style; idle catches category layers
    // that finish loading asynchronously (for example SVG point icons).
    registerClickHandlers();
    map.on("style.load", registerClickHandlers);
    map.on("idle", registerClickHandlers);

    return () => {
      try {
        registeredLayers.forEach(
          ({ handleMouseEnter, handleMouseLeave }, layerId) => {
            map.off("click", layerId, handlePointClick);
            map.off("mouseenter", layerId, handleMouseEnter);
            map.off("mouseleave", layerId, handleMouseLeave);
          },
        );
        map.off("style.load", registerClickHandlers);
        map.off("idle", registerClickHandlers);
      } catch {
        // Map may already be removed during navigation — safe to ignore
      }
    };
  }, [categoryLayersData, mapLayerRevision, mapsReady.single]);

  // ─── Highlight Feature Effect ───────────────────────────────────────
  // Highlight đối tượng từ search hoặc click

  useEffect(() => {
    const map = mapRef.current.single;
    if (!map || !mapsReady.single) return;

    if (highlightedFeature) {
      highlightFeatureOnMap(map, highlightedFeature);
    } else {
      clearHighlightFromMap(map);
    }
  }, [highlightedFeature, mapsReady.single]);

  return (
    <div className="relative size-full">
      <div ref={mapContainer} className="relative size-full">
        <div ref={splitMapContainerRef} style={mapStyleRef} />
        <div ref={singleMapContainerRef} style={mapStyleRef} />
      </div>

      {/* Canvas streamlines gió */}
      {/* Weather canvas is disabled while the weather service is retired.
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 2,
        }}
      /> */}
      {/* Float UI controls – ẩn khi có lớp thời tiết đang hiển thị */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 10,
        }}
      >
        <MapToolbar mapRef={mapRef} />
        <MapStatusBar
          lat={mapState.lat}
          lng={mapState.lng}
          zoom={mapState.zoom}
        />
        {/* Legend stack – bottom-left corner */}
        <div className="absolute bottom-2 left-2 flex flex-col-reverse gap-2 items-start pointer-events-none">
          <div className="pointer-events-auto">
            <MapLegend />
          </div>
        </div>
        <AQIPopup />
        <MapLayerDetailModal />
      </div>
    </div>
  );
}

class ResetControl {
  constructor(getTerrainState) {
    this._getTerrainState = getTerrainState;
  }

  onAdd(map) {
    this._map = map;

    // Create container control
    this._container = document.createElement("div");
    this._container.className = "mapboxgl-ctrl-group mapboxgl-ctrl";
    this._reactRoot = createRoot(this._container);
    this._reactRoot.render(
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="mapboxgl-ctrl-icon"
            aria-label="Reset về vị trí mặc định"
            style={{
              width: "29px",
              height: "29px",
              background: "white",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => {
              const currentTerrainState =
                typeof this._getTerrainState === "function"
                  ? this._getTerrainState()
                  : this._getTerrainState;

              resetViewPort(this._map, currentTerrainState);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#000"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 9-9c2.5 0 4.8 1 6.5 2.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-9 9c-2.5 0 4.8-1-6.5-2.7L3 16" />
            </svg>
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">Reset về vị trí mặc định</TooltipContent>
      </Tooltip>,
    );
    return this._container;
  }

  onRemove() {
    const reactRoot = this._reactRoot;
    this._reactRoot = undefined;
    if (reactRoot) {
      window.setTimeout(() => reactRoot.unmount(), 0);
    }
    if (this._container && this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
    this._map = undefined;
    this._container = undefined;
    this._getTerrainState = undefined;
  }
}
