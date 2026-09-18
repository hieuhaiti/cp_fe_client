/**
 * FloodScenarioPanel — Quản lý và hiển thị 3 loại kịch bản ngập:
 * 1. Hiện trạng ngập lụt
 * 2. Cải tạo thoát nước
 * 3. Quy hoạch 2050
 *
 * Nguyên tắc:
 * - Dropdown chọn 1 trong 3 loại kịch bản.
 * - Chỉ cho phép kích hoạt và hiển thị tối đa 1 kịch bản ngập duy nhất tại một thời điểm.
 * - Khi đổi loại hoặc chọn kịch bản mới, kịch bản cũ được dọn dẹp sạch sẽ khỏi bản đồ.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  Waves,
  EyeOff,
  AlertCircle,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import LoadingInline from "@/components/common/LoadingInline";
import { useGetFloodScenariosQuery } from "@/services/mapLayersService";
import {
  SCENARIO_TYPE_OPTIONS,
  RCP_OPTION_LIST,
} from "@/features/flood/constants";
import {
  filterScenariosByType,
  formatRainfallRange,
  formatTideRange,
} from "@/features/flood/helpers";
import {
  activateSingleFloodScenario,
  deactivateFloodScenario,
} from "@/features/flood/scenarioSelection";

import { useMapStore } from "@/stores/Map/useMapStore";

function fmt(val, unit) {
  if (val == null) return null;
  return `${parseFloat(val)} ${unit}`;
}

const SOURCE_LABEL = {
  MANUAL: "Thủ công",
  AUTO: "Tự động từ trạm",
};

function CurrentConditionsBar({ scenario }) {
  const rainfall = fmt(scenario.current_rainfall, "mm");
  const tide = fmt(scenario.current_tide, "m");
  if (!rainfall && !tide) return null;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs dark:border-blue-800 dark:bg-blue-950/30">
      {rainfall && <span><span className="text-muted-foreground">Lượng mưa: </span><span className="font-semibold text-foreground">{rainfall}</span><span className="ml-1 text-muted-foreground">({SOURCE_LABEL[scenario.rainfall_source] ?? scenario.rainfall_source})</span></span>}
      {tide && <span><span className="text-muted-foreground">Mực triều: </span><span className="font-semibold text-foreground">{tide}</span><span className="ml-1 text-muted-foreground">({SOURCE_LABEL[scenario.tide_source] ?? scenario.tide_source})</span></span>}
    </div>
  );
}

function RadioIndicator({ selected, disabled }) {
  return (
    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${disabled ? "border-muted-foreground/30 bg-muted/20" : selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50"}`}>
      {selected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
    </div>
  );
}

function ScenarioItem({ scenario, selected, onSelect }) {
  const hasLayer = scenario.layer != null;
  const rainfallLabel = formatRainfallRange(scenario.min_rainfall, scenario.max_rainfall);
  const tideLabel = formatTideRange(scenario.min_tide, scenario.max_tide);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div role="radio" aria-checked={selected} onClick={() => hasLayer && onSelect(scenario)} className={`flex items-center gap-3 rounded-lg border p-3 shadow-xs transition-all ${!hasLayer ? "cursor-not-allowed border-border bg-card opacity-60" : selected ? "cursor-pointer border-primary/50 bg-primary/10 shadow-sm" : "cursor-pointer border-border bg-card hover:border-primary/30 hover:bg-accent/10 hover:shadow-xs"}`}>
          <RadioIndicator selected={selected} disabled={!hasLayer} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-1">
              <span className="truncate text-sm font-semibold text-foreground">{scenario.name_vi}</span>
              {scenario.frequency && <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{scenario.frequency}</Badge>}
            </span>
            <span className="block truncate text-xs text-muted-foreground mt-0.5">
              <span>Mưa {rainfallLabel}</span>{tideLabel && ` · Triều ${tideLabel}`}
              {!hasLayer && <span className="ml-1 inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400"><AlertCircle className="h-3 w-3" />Chưa có lớp bản đồ</span>}
            </span>
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={6} className="max-w-xs p-2.5">
        {!hasLayer ? (
          <span className="text-amber-600 dark:text-amber-400 font-medium leading-relaxed">
            Lớp "{scenario.layer_code}" chưa sẵn sàng trên bản đồ.
          </span>
        ) : (
          <div className="space-y-1 text-xs">
            <div className="font-semibold text-popover-foreground">{scenario.name_vi}</div>
            {scenario.layer?.nameVi && (
              <div className="text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{scenario.layer.nameVi}</span>
              </div>
            )}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export default function FloodScenarioPanel() {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("hien_trang");
  const [selectedRcp, setSelectedRcp] = useState("rcp45");
  const activeScenario = useMapStore((s) => s.activeFloodScenario);
  const isActive = activeScenario != null;
  const scenariosQuery = useGetFloodScenariosQuery();

  const allScenarios = useMemo(() => {
    const raw = scenariosQuery.data;
    return Array.isArray(raw?.data?.items) ? raw.data.items : [];
  }, [scenariosQuery.data]);

  // Lọc kịch bản theo loại đã chọn trong dropdown
  const filteredScenarios = useMemo(() => {
    return filterScenariosByType(
      allScenarios,
      // @ts-ignore
      selectedType,
      selectedType === "quy_hoach" ? selectedRcp : null,
    );
  }, [allScenarios, selectedType, selectedRcp]);

  // Xử lý chọn/bỏ chọn kịch bản (chỉ xem được 1 kịch bản 1 lúc)
  const handleSelectScenario = useCallback(
    (scenario) => {
      // Nếu click lại kịch bản đang active -> Tắt kịch bản hoàn toàn
      if (activeScenario?.id === scenario.id) {
        deactivateFloodScenario();
        return;
      }

      // Kích hoạt kịch bản mới (tự động dọn dẹp sạch sẽ kịch bản cũ)
      activateSingleFloodScenario(scenario);
    },
    [activeScenario],
  );

  // Khi người dùng đổi loại kịch bản qua dropdown -> Dọn dẹp layer cũ và kích hoạt kịch bản đầu tiên của loại mới
  const handleTypeChange = useCallback(
    (newType) => {
      setSelectedType(newType);
      // Tắt hoàn toàn kịch bản cũ (cả state lẫn layer trên map)
      deactivateFloodScenario();

      // Tự động kích hoạt kịch bản đầu tiên của loại kịch bản mới nếu có
      const nextCandidates = filterScenariosByType(
        allScenarios,
        newType,
        newType === "quy_hoach" ? selectedRcp : null,
      ).filter((s) => s.is_active && s.layer != null);

      if (nextCandidates.length > 0) {
        activateSingleFloodScenario(nextCandidates[0]);
      }
    },
    [allScenarios, selectedRcp],
  );

  const handleRcpChange = useCallback(
    (newRcp) => {
      setSelectedRcp(newRcp);
      // Tắt hoàn toàn kịch bản cũ (cả state lẫn layer trên map)
      deactivateFloodScenario();

      // Tự động kích hoạt kịch bản đầu tiên của nhánh RCP mới nếu có
      const nextCandidates = filterScenariosByType(
        allScenarios,
        "quy_hoach",
        newRcp,
      ).filter((s) => s.is_active && s.layer != null);

      if (nextCandidates.length > 0) {
        activateSingleFloodScenario(nextCandidates[0]);
      }
    },
    [allScenarios],
  );

  const handleDeactivate = useCallback(() => {
    deactivateFloodScenario();
  }, []);

  // Tự động kích hoạt kịch bản đầu tiên khi vừa tải dữ liệu lần đầu
  const initialActivatedRef = useRef(false);
  useEffect(() => {
    if (
      initialActivatedRef.current ||
      activeScenario ||
      filteredScenarios.length === 0
    ) {
      return;
    }
    const candidates = filteredScenarios.filter(
      (s) => s.is_active && s.layer != null,
    );
    if (candidates.length === 0) return;

    initialActivatedRef.current = true;
    activateSingleFloodScenario(candidates[0]);
  }, [filteredScenarios, activeScenario]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Waves className="h-4 w-4 text-primary" />
          Kịch bản ngập
        </h2>
      </div>

      {/* Thông số quan trắc hiện tại khi kịch bản đang bật */}
      {isActive && activeScenario.scenarioData && (
        <CurrentConditionsBar scenario={activeScenario.scenarioData} />
      )}

      {/* Dropdown chọn 1 trong 3 loại kịch bản */}
      <div className="space-y-2 rounded-xl border bg-card p-3 shadow-xs">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Loại kịch bản
          </label>
          <Select value={selectedType} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-full h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCENARIO_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Nếu là Quy hoạch 2050: hiển thị thêm lựa chọn nhánh RCP */}
        {selectedType === "quy_hoach" && (
          <div className="space-y-1.5 border-t border-border/50 pt-2">
            <label className="text-xs font-medium text-muted-foreground">
              Nhánh kịch bản
            </label>
            <Select value={selectedRcp} onValueChange={handleRcpChange}>
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RCP_OPTION_LIST.map((rcp) => (
                  <SelectItem key={rcp.id} value={rcp.id}>
                    {rcp.label} - {rcp.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        {/* Header danh sách */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="group flex min-w-0 flex-1 items-center gap-2.5 px-3 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
            aria-expanded={open}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
              <ChevronRight
                className={`h-4 w-4 transition-transform duration-200 ${
                  open ? "rotate-90" : ""
                }`}
              />
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate">
              <Waves className="h-3.5 w-3.5 shrink-0 text-primary" />
              Kịch bản ngập
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground font-mono">
              {isActive ? 1 : 0}/{filteredScenarios.length}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeactivate();
                      }}
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
          <div className="border-t border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
            Đang hiển thị: {activeScenario.scenarioData.name_vi}
          </div>
        )}

        {/* Danh sách kịch bản theo loại */}
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
            ) : filteredScenarios.length === 0 ? (
              <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                Chưa có kịch bản ngập nào.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredScenarios.map((scenario) => (
                  <ScenarioItem
                    key={scenario.id}
                    scenario={scenario}
                    selected={activeScenario?.id === scenario.id}
                    onSelect={handleSelectScenario}
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
