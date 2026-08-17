/**
 * FloodScenarioPanel — component độc lập quản lý kịch bản ngập.
 *
 * - Không nằm trong LayerSelection, không chịu sự điều khiển của bật/tắt tất cả.
 * - Lưu activeFloodScenario vào useMapStore để LayerSelection có thể đọc.
 * - Tự ghi flood layer vào ogcLayersData (source key riêng "flood-scenario-<id>").
 * - Khi bỏ chọn: xóa flood source khỏi ogcLayersData, không đụng đến regular layers.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Waves, EyeOff, AlertCircle, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import LoadingInline from "@/components/common/LoadingInline";
import { useMapStore } from "@/stores/Map/useMapStore";
import {
  normalizeWebMapLayer,
  useGetFloodScenariosQuery,
} from "@/services/mapLayersService";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(val, unit) {
  if (val == null) return null;
  return `${parseFloat(val)} ${unit}`;
}

function rainfallRange(min, max) {
  if (max == null) return `≥ ${parseFloat(min)} mm`;
  return `${parseFloat(min)} – ${parseFloat(max)} mm`;
}

function tideRange(min, max) {
  if (min == null && max == null) return null;
  if (min == null) return `≤ ${parseFloat(max)} m`;
  if (max == null) return `≥ ${parseFloat(min)} m`;
  return `${parseFloat(min)} – ${parseFloat(max)} m`;
}

const SOURCE_LABEL = {
  MANUAL: "Thủ công",
  AUTO: "Tự động từ trạm",
};

function makeSourceId(scenarioId) {
  return `flood-scenario-${scenarioId}`;
}

// ── CurrentConditionsBar ──────────────────────────────────────────────────────

function CurrentConditionsBar({ scenario }) {
  const rainfall = fmt(scenario.current_rainfall, "mm");
  const tide = fmt(scenario.current_tide, "m");
  if (!rainfall && !tide) return null;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs dark:border-blue-800 dark:bg-blue-950/30">
      {rainfall && (
        <span>
          <span className="text-muted-foreground">Lượng mưa: </span>
          <span className="font-semibold text-foreground">{rainfall}</span>
          <span className="ml-1 text-muted-foreground">
            ({SOURCE_LABEL[scenario.rainfall_source] ?? scenario.rainfall_source})
          </span>
        </span>
      )}
      {tide && (
        <span>
          <span className="text-muted-foreground">Mực triều: </span>
          <span className="font-semibold text-foreground">{tide}</span>
          <span className="ml-1 text-muted-foreground">
            ({SOURCE_LABEL[scenario.tide_source] ?? scenario.tide_source})
          </span>
        </span>
      )}
    </div>
  );
}

// ── ScenarioItem ──────────────────────────────────────────────────────────────

function ScenarioItem({ scenario, selected, onToggle }) {
  const hasLayer = scenario.layer != null;
  const tideLabel = tideRange(scenario.min_tide, scenario.max_tide);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          onClick={() => hasLayer && onToggle(scenario)}
          className={`flex items-center gap-3 rounded-lg border p-3 shadow-sm transition-all ${
            !hasLayer
              ? "cursor-not-allowed border-border bg-card opacity-60"
              : selected
                ? "cursor-pointer border-primary/50 bg-primary/5 hover:bg-primary/10 hover:shadow-md"
                : "cursor-pointer border-border bg-card hover:bg-accent/10 hover:shadow-md"
          }`}
        >
          <Checkbox
            id={`flood-${scenario.id}`}
            checked={selected}
            onCheckedChange={() => hasLayer && onToggle(scenario)}
            onClick={(e) => e.stopPropagation()}
            disabled={!hasLayer}
            className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {scenario.name_vi}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {rainfallRange(scenario.min_rainfall, scenario.max_rainfall)}
              {tideLabel && ` · Triều ${tideLabel}`}
              {!hasLayer && (
                <span className="ml-1 inline-flex items-center gap-0.5 text-orange-500">
                  <AlertCircle className="h-3 w-3" />
                  Chưa có lớp bản đồ
                </span>
              )}
            </span>
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs">
        {!hasLayer ? (
          <span className="text-orange-400">
            Lớp "{scenario.layer_code}" chưa sẵn sàng.
          </span>
        ) : (
          <div className="space-y-0.5 text-xs">
            <div className="font-semibold">{scenario.name_vi}</div>
            {scenario.layer?.nameVi && (
              <div className="text-muted-foreground">{scenario.layer.nameVi}</div>
            )}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// ── FloodScenarioPanel ────────────────────────────────────────────────────────

export default function FloodScenarioPanel() {
  const [open, setOpen] = useState(false);

  // State riêng — không share qua props, dùng store để broadcast ra ngoài
  const [activeScenario, setActiveScenarioLocal] = useState(null);
  const isActive = activeScenario != null;

  const {
    setActiveFloodScenario,
    clearActiveFloodScenario,
    setOgcLayerData,
    removeOgcLayerData,
  } = useMapStore.getState();

  const scenariosQuery = useGetFloodScenariosQuery();
  const scenarios = useMemo(() => {
    const raw = scenariosQuery.data;
    if (!raw) return [];
    return Array.isArray(raw?.data?.items) ? raw.data.items : [];
  }, [scenariosQuery.data]);

  // Ghi / xóa flood layer khỏi ogcLayersData khi activeScenario thay đổi
  useEffect(() => {
    const store = useMapStore.getState();
    if (activeScenario) {
      store.setOgcLayerData(activeScenario.sourceId, activeScenario.layer);
      store.setActiveFloodScenario({
        id: activeScenario.id,
        sourceId: activeScenario.sourceId,
        layer: activeScenario.layer,
      });
    } else {
      // Xóa tất cả key flood cũ (chỉ xóa key của chính mình, không đụng regular)
      if (activeScenario === null) {
        // Dọn sạch mọi flood source key còn sót
        const ogc = useMapStore.getState().ogcLayersData;
        Object.keys(ogc).forEach((k) => {
          if (k.startsWith("flood-scenario-")) store.removeOgcLayerData(k);
        });
      }
      store.clearActiveFloodScenario();
    }
  }, [activeScenario]);

  const handleToggle = useCallback(
    (scenario) => {
      // Bỏ chọn nếu click lại
      if (activeScenario?.id === scenario.id) {
        // Xóa flood key khỏi ogcLayersData
        useMapStore.getState().removeOgcLayerData(makeSourceId(scenario.id));
        useMapStore.getState().clearActiveFloodScenario();
        setActiveScenarioLocal(null);
        return;
      }

      // Xóa flood layer cũ (nếu đang có)
      if (activeScenario) {
        useMapStore.getState().removeOgcLayerData(activeScenario.sourceId);
      }

      const inlineLayer = scenario.layer;
      if (!inlineLayer) return;

      const normalizedLayer = normalizeWebMapLayer({
        id: inlineLayer.id,
        code: inlineLayer.code,
        name_vi: inlineLayer.nameVi,
        category: inlineLayer.category,
        category_name: inlineLayer.categoryName,
        geometry_type: inlineLayer.geometryType,
        storage_kind: inlineLayer.storageKind,
        geoserver_layer: inlineLayer.geoserverLayer,
        style_name: inlineLayer.styleName,
        min_zoom: inlineLayer.minZoom,
        max_zoom: inlineLayer.maxZoom,
        legend: inlineLayer.legend,
        is_public: inlineLayer.isPublic,
        is_enable_default: inlineLayer.isEnableDefault,
        layer_kind: "overlay",
        default_style: {},
      });

      const sourceId = makeSourceId(scenario.id);
      // Ghi ngay vào store (useEffect sẽ sync lại)
      useMapStore.getState().setOgcLayerData(sourceId, normalizedLayer);
      useMapStore.getState().setActiveFloodScenario({ id: scenario.id, sourceId, layer: normalizedLayer });

      setActiveScenarioLocal({
        id: scenario.id,
        sourceId,
        layer: normalizedLayer,
        scenarioData: scenario,
      });
    },
    [activeScenario],
  );

  // Auto-activate: find is_active scenarios with a layer, pick the one with highest min_rainfall
  const autoActivatedRef = useRef(false);
  useEffect(() => {
    if (autoActivatedRef.current || activeScenario || scenarios.length === 0) return;
    const candidates = scenarios.filter((s) => s.is_active && s.layer != null);
    if (candidates.length === 0) return;
    const best = candidates.reduce((prev, cur) =>
      parseFloat(cur.min_rainfall ?? 0) > parseFloat(prev.min_rainfall ?? 0) ? cur : prev,
    );
    autoActivatedRef.current = true;
    handleToggle(best);
    setOpen(true);
  }, [scenarios, activeScenario, handleToggle]);

  const handleDeactivate = useCallback(() => {
    if (activeScenario) {
      useMapStore.getState().removeOgcLayerData(activeScenario.sourceId);
    }
    useMapStore.getState().clearActiveFloodScenario();
    setActiveScenarioLocal(null);
  }, [activeScenario]);

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <Layers className="h-5 w-5" />
        Kịch bản ngập
      </h2>

      {/* Thông số quan trắc hiện tại khi scenario đang bật */}
      {isActive && activeScenario.scenarioData && (
        <CurrentConditionsBar scenario={activeScenario.scenarioData} />
      )}

      <section className="overflow-hidden rounded-xl border border-blue-200/70 bg-card shadow-sm dark:border-blue-800/50">
        {/* Header */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="group flex min-w-0 flex-1 items-center gap-2.5 px-3 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
            aria-expanded={open}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 transition-colors group-hover:bg-blue-500/15">
              <ChevronRight
                className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
              />
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate">
              <Waves className="h-3.5 w-3.5 shrink-0 text-blue-600" />
              Kịch bản ngập
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {isActive ? 1 : 0}/{scenarios.length}
            </span>
          </button>

          {isActive && (
            <div className="flex shrink-0 items-center gap-1 pr-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => { e.stopPropagation(); handleDeactivate(); }}
                      aria-label="Tắt kịch bản ngập"
                    >
                      <EyeOff className="h-4 w-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Tắt kịch bản ngập</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Tên kịch bản khi collapsed */}
        {!open && isActive && activeScenario.scenarioData && (
          <div className="border-t border-blue-100 bg-blue-50/50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-300">
            {activeScenario.scenarioData.name_vi}
          </div>
        )}

        {/* Danh sách kịch bản */}
        {open && (
          <div className="border-t border-border/60 bg-muted/15 p-2 space-y-2">
            {scenariosQuery.isLoading ? (
              <div className="flex items-center justify-center py-4">
                <LoadingInline size="small" />
              </div>
            ) : scenariosQuery.isError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-xs text-destructive">
                Không thể tải danh sách kịch bản ngập.
              </div>
            ) : scenarios.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground">
                Chưa có kịch bản ngập nào.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {scenarios.map((scenario) => (
                  <ScenarioItem
                    key={scenario.id}
                    scenario={scenario}
                    selected={activeScenario?.id === scenario.id}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
