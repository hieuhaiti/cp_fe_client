import { create } from "zustand";
import isEqual from "react-fast-compare";

/**
 * Store quản lý trạng thái bật/tắt của các nhóm lớp dữ liệu.
 * - Dữ liệu lấy từ /web-map/layers rồi chuẩn hóa theo nhóm lớp.
 * - Store thêm trường `enabled` để quản lý toggle UI.
 */
export const useDataLayerStore = create((set, get) => ({
  layers: [],
  ogcLayers: [],

  /**
   * Cập nhật danh sách nhóm lớp từ API.
   * Giữ nguyên trạng thái enabled nếu nhóm lớp đã tồn tại.
   */
  setLayerState: (newGroups) => {
    const currentLayers = get().layers;

    const mappedLayers = newGroups.map((group) => {
      const existing = currentLayers.find((layer) => layer.id === group.id);
      return {
        id: group.id,
        name: group.name,
        description: group.description || "",
        icon_url: group.icon_url || null,
        color: group.color || null,
        is_active: group.is_active,
        is_landmark: !!group.is_landmark,
        is_border_guard_station: !!group.is_border_guard_station,
        is_enable_default: !!group.is_enable_default,
        is_monitoring_feature: group.is_monitoring_feature || "none",
        enabled: existing ? existing.enabled : !!group.is_enable_default,
      };
    });

    if (isEqual(currentLayers, mappedLayers)) return;
    set({ layers: mappedLayers });
  },

  setOgcLayerState: (newLayers) => {
    set((state) => {
      const currentLayers = state.ogcLayers;
      const mappedLayers = newLayers.map((layer, index) => {
        // The map proxy routes require the numeric catalog layer ID.
        // Keep `code` separately for stable Mapbox source/layer names.
        const id = String(layer.id ?? layer.code);
        const existing = currentLayers.find((item) => item.id === id);
        const layerKind = layer.layer_kind === "basemap" ? "basemap" : "overlay";
        const isDefaultEnabled =
          !!layer.is_enable_default || !!layer.default_style?.visible_by_default;
        const initialEnabled = isDefaultEnabled;

        return {
          id,
          code: layer.code,
          name: layer.name_vi || layer.name_en || layer.name || layer.code,
          description: layer.description_vi || layer.description_en || "",
          category: layer.category || "",
          category_name: layer.category_name || layer.categoryName || "",
          layer_kind: layerKind,
          geometry_type: layer.geometry_type,
          geoserver_layer: layer.geoserver_layer,
          geoserver_store: layer.geoserver_store,
          geoserver_url: layer.geoserver_url,
          workspace: layer.workspace,
          table_name: layer.table_name,
          source_url: layer.source_url,
          min_zoom: layer.min_zoom,
          max_zoom: layer.max_zoom,
          feature_count: layer.feature_count,
          default_style: layer.default_style || {},
          legend: layer.legend || null,
          is_active: layer.is_active,
          is_public: layer.is_public,
          sort_order: layer.sort_order ?? index,
          is_enable_default: isDefaultEnabled,
          enabled: existing ? existing.enabled : initialEnabled,
        };
      });

      if (isEqual(currentLayers, mappedLayers)) return state;
      return { ogcLayers: mappedLayers };
    });
  },

  toggleOgcLayerEnabled: (id, defaultState = undefined) => {
    set((state) => ({
      ogcLayers: state.ogcLayers.map((layer) =>
        layer.id === id
          ? {
              ...layer,
              enabled:
                defaultState !== undefined ? defaultState : !layer.enabled,
            }
          : layer,
      ),
    }));
  },

  setOgcLayersEnabled: (ids, enabled) => {
    const layerIds = new Set(ids.map(String));

    set((state) => {
      let hasChanges = false;
      const ogcLayers = state.ogcLayers.map((layer) => {
        if (!layerIds.has(layer.id) || layer.enabled === enabled) return layer;

        hasChanges = true;
        return { ...layer, enabled };
      });

      return hasChanges ? { ogcLayers } : state;
    });
  },

  resetOgcLayers: () => {
    set((state) => ({
      ogcLayers: state.ogcLayers.map((layer) => ({
        ...layer,
        enabled: false,
      })),
    }));
  },

  enableAllOgcLayers: () => {
    set((state) => ({
      ogcLayers: state.ogcLayers.map((layer) => ({
        ...layer,
        enabled: true,
      })),
    }));
  },

  toggleLayerEnabled: (id, defaultState = undefined) => {
    return set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === id
          ? {
              ...layer,
              enabled:
                defaultState !== undefined ? defaultState : !layer.enabled,
            }
          : layer,
      ),
    }));
  },

  resetLayers: () => {
    const { layers } = get();
    set({ layers: layers.map((layer) => ({ ...layer, enabled: false })) });
  },

  enableAllLayers: () => {
    const { layers } = get();
    set({ layers: layers.map((layer) => ({ ...layer, enabled: true })) });
  },

  getEnabledLayers: () => {
    const { layers } = get();
    return layers.filter((layer) => layer.enabled);
  },
}));
