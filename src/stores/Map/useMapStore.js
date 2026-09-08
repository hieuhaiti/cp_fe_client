import { create } from "zustand";

export const useMapStore = create((set, get) => ({
  mapInstance: null,
  mapRefObj: null, // full ref: { single, split, compare }
  highlightedFeature: null, // GeoJSON Feature (Point/Line/Polygon) để highlight trên map
  clickedPoint: null, // { lat, lng }
  category: null,
  // Dữ liệu category layers đang hiển thị trên map: { [sourceId]: geojson }
  categoryLayersData: {},
  ogcLayersData: {},
  // GeoTIFF Time Series đang hiển thị trên map:
  // { [layerId]: { layer, time, tileUrl, opacity } }
  timeSeriesLayersData: {},
  // Trạng thái điều khiển của panel Time Series:
  // { [layerId]: { timeIndex, isPlaying, intervalMs } }
  //
  // Cố ý tách khỏi timeSeriesLayersData: panel bị unmount khi người dùng đổi tab
  // sidebar, nhưng raster phải tiếp tục hiển thị và autoplay phải nhớ vị trí.
  timeSeriesPanelState: {},
  // Kịch bản ngập đang active: { id, sourceId, layer } | null
  activeFloodScenario: null,
  mapLegends: {},
  // Cache WFS GeoJSON dùng chung cho single/split map. Promise đang chạy được
  // dedupe ở helper WFS; store chỉ giữ dữ liệu đã tải để có thể tái sử dụng.
  wfsGeoJsonCache: {},
  // compare map
  isSplitMode: false,
  // Sidebar - panel đang active (chia sẻ giữa floating icon bar và content panel)
  activePanel: null,
  setActivePanel: (activePanel) => set({ activePanel }),

  setMapRef: (mapInstance) => {
    set({ mapInstance });
  },

  // Lưu full mapRef (useRef object) để stores truy cập single/split maps
  setMapRefObj: (ref) => {
    set({ mapRefObj: ref });
  },

  getMap: () => {
    const { mapInstance } = get();
    return mapInstance;
  },

  clearMapRef: () => {
    set({ mapInstance: null });
  },

  setCategory: (category) => {
    set({ category });
  },

  // Highlight feature (Point/Line/Polygon)
  setHighlightedFeature: (feature) => {
    set({ highlightedFeature: feature });
  },

  clearHighlightedFeature: () => {
    set({ highlightedFeature: null });
  },

  setClickedPoint: (point) => {
    set({ clickedPoint: point });
  },

  clearClickedPoint: () => {
    set({ clickedPoint: null });
  },

  // Category layer data management
  setCategoryLayerData: (sourceId, geojson, geometryType, color, icon) => {
    set((state) => ({
      categoryLayersData: {
        ...state.categoryLayersData,
        [sourceId]: { geojson, geometryType, color, icon },
      },
    }));
  },

  removeCategoryLayerData: (sourceId) => {
    set((state) => {
      const next = { ...state.categoryLayersData };
      delete next[sourceId];
      return { categoryLayersData: next };
    });
  },

  clearAllCategoryLayersData: () => {
    set({ categoryLayersData: {} });
  },

  setOgcLayerData: (sourceId, layer) => {
    set((state) => ({
      ogcLayersData: {
        ...state.ogcLayersData,
        [sourceId]: layer,
      },
    }));
  },

  removeOgcLayerData: (sourceId) => {
    set((state) => {
      const next = { ...state.ogcLayersData };
      delete next[sourceId];
      return { ogcLayersData: next };
    });
  },

  clearAllOgcLayersData: () => {
    set({ ogcLayersData: {} });
  },

  setTimeSeriesLayer: (layerId, entry) => {
    set((state) => ({
      timeSeriesLayersData: {
        ...state.timeSeriesLayersData,
        [layerId]: { ...state.timeSeriesLayersData[layerId], ...entry },
      },
    }));
  },

  setTimeSeriesPanelState: (layerId, patch) => {
    set((state) => ({
      timeSeriesPanelState: {
        ...state.timeSeriesPanelState,
        [layerId]: { ...state.timeSeriesPanelState[layerId], ...patch },
      },
    }));
  },

  // Xóa cả hai object cùng lúc để trạng thái điều khiển không rò lại khi người
  // dùng bật lại lớp.
  removeTimeSeriesLayer: (layerId) => {
    set((state) => {
      const nextData = { ...state.timeSeriesLayersData };
      const nextPanel = { ...state.timeSeriesPanelState };
      delete nextData[layerId];
      delete nextPanel[layerId];
      return {
        timeSeriesLayersData: nextData,
        timeSeriesPanelState: nextPanel,
      };
    });
  },

  clearAllTimeSeriesLayers: () => {
    set({ timeSeriesLayersData: {}, timeSeriesPanelState: {} });
  },

  setActiveFloodScenario: (scenario) => set({ activeFloodScenario: scenario }),
  clearActiveFloodScenario: () => set({ activeFloodScenario: null }),

  setSplitMode: (isSplitMode) => {
    set({ isSplitMode });
  },

  setMapLegend: (legendId, legend) => {
    set((state) => ({
      mapLegends: {
        ...state.mapLegends,
        [legendId]: legend,
      },
    }));
  },

  removeMapLegend: (legendId) => {
    set((state) => {
      const next = { ...state.mapLegends };
      delete next[legendId];
      return { mapLegends: next };
    });
  },

  clearAllMapLegends: () => {
    set({ mapLegends: {} });
  },

  getWfsGeoJsonCacheEntry: (cacheKey) =>
    get().wfsGeoJsonCache[cacheKey] ?? null,

  setWfsGeoJsonCacheEntry: (cacheKey, data, expiresAt) => {
    set((state) => {
      const now = Date.now();
      const activeEntries = Object.fromEntries(
        Object.entries(state.wfsGeoJsonCache).filter(
          ([, entry]) => entry?.expiresAt > now,
        ),
      );

      return {
        wfsGeoJsonCache: {
          ...activeEntries,
          [cacheKey]: { data, expiresAt },
        },
      };
    });
  },

  clearWfsGeoJsonCache: () => {
    set({ wfsGeoJsonCache: {} });
  },

}));
