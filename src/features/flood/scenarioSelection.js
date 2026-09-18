// @ts-check
import { useMapStore } from '@/stores/Map/useMapStore';
import { normalizeWebMapLayer } from '@/services/mapLayersService';

/**
 * Tạo source ID chuẩn cho layer kịch bản ngập
 * @param {string | number} scenarioId
 * @returns {string}
 */
export function makeFloodSourceId(scenarioId) {
  return `flood-scenario-${scenarioId}`;
}

/**
 * Kích hoạt một kịch bản ngập duy nhất trên bản đồ
 * Đảm bảo gỡ bỏ sạch sẽ kịch bản trước đó nếu đang có
 * @param {any} scenario
 * @returns {{ id: string | number; sourceId: string; layer: any; scenarioData: any } | null}
 */
export function activateSingleFloodScenario(scenario) {
  if (!scenario) return null;

  const inlineLayer = scenario.layer;
  if (!inlineLayer) return null;

  // 1. Dọn dẹp sạch sẽ kịch bản cũ (cả store lẫn layer trên Mapbox)
  deactivateFloodScenario();

  const store = useMapStore.getState();

  // 2. Chuẩn hóa layer
  const normalizedLayer = normalizeWebMapLayer({
    id: inlineLayer.id,
    code: inlineLayer.code,
    name_vi: inlineLayer.nameVi || inlineLayer.name_vi,
    category: inlineLayer.category || 'flood',
    category_name: inlineLayer.categoryName || inlineLayer.category_name || 'Ngập lụt',
    geometry_type: inlineLayer.geometryType || inlineLayer.geometry_type || 'Polygon',
    storage_kind: inlineLayer.storageKind || inlineLayer.storage_kind || 'postgis',
    geoserver_layer: inlineLayer.geoserverLayer || inlineLayer.geoserver_layer,
    style_name: inlineLayer.styleName || inlineLayer.style_name,
    min_zoom: inlineLayer.minZoom ?? inlineLayer.min_zoom ?? 0,
    max_zoom: inlineLayer.maxZoom ?? inlineLayer.max_zoom ?? 22,
    legend: inlineLayer.legend ?? null,
    is_public: inlineLayer.isPublic ?? inlineLayer.is_public ?? true,
    is_enable_default: inlineLayer.isEnableDefault ?? inlineLayer.is_enable_default ?? true,
    layer_kind: 'overlay',
    default_style: {},
  });

  const sourceId = makeFloodSourceId(scenario.id);

  // 3. Ghi layer duy nhất vào store
  store.setOgcLayerData(sourceId, normalizedLayer);
  const activeObj = {
    id: scenario.id,
    sourceId,
    layer: normalizedLayer,
    scenarioData: scenario,
  };
  store.setActiveFloodScenario(activeObj);

  return activeObj;
}

/**
 * Hủy kích hoạt kịch bản ngập đang hiển thị
 * Xóa sạch cả state trong Zustand store lẫn dữ liệu lớp và source trực tiếp trên Mapbox Map
 */
export function deactivateFloodScenario() {
  const store = useMapStore.getState();

  // 1. Dọn dẹp tất cả các source flood trong ogcLayersData và clear activeFloodScenario
  const currentOgc = store.ogcLayersData || {};
  Object.keys(currentOgc).forEach((key) => {
    if (key.startsWith('flood-scenario-')) {
      store.removeOgcLayerData(key);
    }
  });
  store.clearActiveFloodScenario();

  // 2. Trực tiếp dỡ bỏ tất cả layer và source của flood-scenario trên Mapbox instance
  const mapObj = store.mapRefObj?.current;
  const maps = [mapObj?.single, mapObj?.split, store.mapInstance].filter(Boolean);
  maps.forEach((map) => {
    try {
      if (typeof map.getStyle !== 'function') return;
      const style = map.getStyle();
      if (!style) return;

      // Xóa tất cả các layer liên quan đến flood scenario
      (style.layers || []).forEach((l) => {
        if (l.id.includes('flood-scenario-') || l.source?.includes('flood-scenario-')) {
          if (map.getLayer(l.id)) {
            map.removeLayer(l.id);
          }
        }
      });

      // Xóa tất cả các source liên quan đến flood scenario
      Object.keys(style.sources || {}).forEach((sId) => {
        if (sId.includes('flood-scenario-')) {
          if (map.getSource(sId)) {
            map.removeSource(sId);
          }
        }
      });
    } catch (error) {
      console.warn('Lỗi khi xóa lớp kịch bản ngập trên bản đồ:', error?.message);
    }
  });
}
