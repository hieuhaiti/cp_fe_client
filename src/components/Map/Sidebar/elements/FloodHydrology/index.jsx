import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  ChevronDown,
  Clock3,
  Eye,
  EyeOff,
  Info,
  Loader2,
  RefreshCw,
  Waves,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { buildOgcSourceId } from "@/helper/Map/MapHelper";
import { formatDateTime } from "@/lib/utils";
import { useMapStore } from "@/stores/Map/useMapStore";
import {
  getFloodLayers,
  getFloodLegends,
  getFloodOverview,
  getFloodRuns,
} from "@/features/flood/api/floodApi";
import HierarchicalPeriodAccordion from "./period-selectors/HierarchicalPeriodAccordion";

/**
 * Diễn giải ngắn gọn, dễ hiểu cho từng loại lớp raster.
 */
const ARTIFACT_GLOSSARY = {
  // M1 — Hiện trạng ngập
  main_flood_non_tidal:
    "Vùng ngập đã xác nhận, loại bỏ khu vực dao động triều ven biển. Đây là lớp báo cáo chính.",
  open_water:
    "Mặt nước mở (ao, hồ, sông, biển) phát hiện từ ảnh vệ tinh radar.",
  shallow_flood:
    "Vùng nghi ngập nông, có độ tin cậy thấp hơn và cần đối chiếu hiện trường.",
  tidal_candidate:
    "Vùng nghi do triều lên hoặc xuống, không tính vào tổng diện tích ngập.",
  mining_candidate:
    "Vùng nghi khai trường mỏ, nơi bề mặt trơ có thể bị nhận nhầm là ngập.",
  urban_double_bounce:
    "Vùng nghi phản xạ đôi ở đô thị, thường không phải là vùng ngập.",
  // M2 — HAND
  hand_scenario:
    "Vùng có thể ngập theo ngưỡng cao độ HAND đã chọn. Đây là mô phỏng, không phải quan sát thực tế.",
  hand_depth: "Độ sâu ngập ước tính theo kịch bản HAND, tính bằng mét.",
  // M4 — Tác động
  affected_population:
    "Ước tính dân cư nằm trong vùng chịu ảnh hưởng bởi ngập.",
  affected_cropland: "Đất trồng trọt giao với vùng chịu ảnh hưởng bởi ngập.",
  affected_built: "Khu vực xây dựng giao với vùng chịu ảnh hưởng bởi ngập.",
  // M5 V1 — Xu thế (cũ)
  trend_frequency:
    "Tỷ lệ số kỳ một vị trí được nhận diện là ngập trong chuỗi nhiều năm.",
  trend_frequent_flood: "Vùng ngập tái diễn nhiều lần theo thời gian.",
  trend_new_flood: "Vùng mới xuất hiện ngập trong giai đoạn gần đây.",
  pond_to_built: "Ao hoặc mặt nước đã chuyển đổi sang khu vực xây dựng.",
  drainage_sensitive:
    "Vùng nhạy cảm với tiêu thoát nước, dễ đọng nước khi mưa.",
  encroachment_alert:
    "Cảnh báo dấu hiệu lấn chiếm mặt nước hoặc hành lang thoát lũ.",
  trend_tidal_candidate:
    "Vùng triều cần đối soát chất lượng trong phân tích xu thế.",
  trend_mining_candidate:
    "Vùng khai trường mỏ cần đối soát chất lượng trong phân tích xu thế.",
  // M5 MONITORING — Giám sát theo kỳ
  flood_extent:
    "Các khu vực được hệ thống phát hiện có dấu hiệu ngập trong kỳ giám sát. Đây là lớp báo cáo chính của phân tích kỳ.",
  flood_frequency:
    "Số lần một vị trí được ghi nhận ngập trong kỳ giám sát (0 hoặc 1 đối với mô hình kỳ đơn). Lớp kiểm định kỹ thuật.",
  frequent_flood:
    "Vùng vượt ngưỡng xác nhận ngập trong kỳ giám sát. Trong mô hình kỳ đơn, lớp này tương đương flood_extent. Lớp kiểm định kỹ thuật.",
  pop_affected:
    "Ước tính số người sinh sống trong vùng được phát hiện có dấu hiệu ngập. Dữ liệu dân số từ WorldPop năm 2020.",
  crop_affected:
    "Đất nông nghiệp (theo WorldCover) nằm trong vùng được phát hiện có dấu hiệu ngập. Dùng để đánh giá ảnh hưởng đến sản xuất nông nghiệp.",
  built_affected:
    "Khu vực xây dựng (theo WorldCover) nằm trong vùng được phát hiện có dấu hiệu ngập. Thông tin tham khảo về ảnh hưởng đến cơ sở hạ tầng.",
  stratum:
    "Lớp phân tầng dùng trong quá trình phát hiện ngập: (1) vùng phi đô thị — (2) vùng đô thị — (3) khu vực có đặc điểm bề mặt mỏ. Lớp kiểm định kỹ thuật, không dùng trực tiếp cho đánh giá.",
};

const STATUS_META = {
  SUCCEEDED: { label: "Hoàn thành", variant: "soft-success" },
  RUNNING: { label: "Đang xử lý", variant: "soft-warning" },
  QUEUED: { label: "Đang chờ", variant: "soft-warning" },
  COMPUTING: { label: "Đang tính toán", variant: "soft-warning" },
  EXPORTING: { label: "Đang xuất", variant: "soft-warning" },
  HARVESTING: { label: "Đang thu nhận", variant: "soft-warning" },
  INGESTING: { label: "Đang nạp", variant: "soft-warning" },
  VALIDATING: { label: "Đang kiểm định", variant: "soft-warning" },
  ARCHIVING: { label: "Đang lưu trữ", variant: "soft-warning" },
  PUBLISHING: { label: "Đang công bố", variant: "soft-warning" },
  FAILED: { label: "Thất bại", variant: "destructive" },
  DLQ: { label: "Cần xử lý", variant: "destructive" },
  CANCELLED: { label: "Đã hủy", variant: "outline" },
};

const WARNING_LABELS = {
  NON_COMMERCIAL_DTM_FABDEM:
    "Dữ liệu địa hình FABDEM có điều kiện giới hạn khi sử dụng thương mại.",
  TERRAIN_FELL_BACK_TO_DSM:
    "Hệ thống đã dùng dữ liệu địa hình dự phòng; độ chính xác có thể giảm.",
  NO_DRY_SEASON_IMAGES:
    "Không có ảnh Sentinel-1 trong kỳ tham chiếu khô — kết quả cần xem xét thêm.",
};

const ARTIFACT_PRIORITY = {
  // M1
  main_flood_non_tidal: 1,
  open_water: 2,
  // M2
  hand_scenario: 1,
  hand_depth: 2,
  // M3
  rain_risk_class: 1,
  rain_risk_score: 2,
  // M5 V1
  trend_frequency: 1,
  trend_frequent_flood: 2,
  trend_new_flood: 3,
  // M5 MONITORING — nhóm A: Ngập lụt
  flood_extent: 1,
  // M5 MONITORING — nhóm B: Ảnh hưởng
  pop_affected: 5,
  crop_affected: 6,
  built_affected: 7,
  // M5 MONITORING — nhóm C: Tiêu thoát
  pond_to_built: 8,
  drainage_sensitive: 9,
  encroachment_alert: 10,
  // M5 MONITORING — nhóm D: Kỹ thuật (QA)
  frequent_flood: 20,
  flood_frequency: 21,
  stratum: 22,
};

// Layer grouping for trend MONITORING artifacts.
const TREND_LAYER_GROUPS = [
  {
    key: "flood",
    label: "Ngập lụt",
    codes: new Set(["flood_extent"]),
  },
  {
    key: "impact",
    label: "Ảnh hưởng",
    codes: new Set(["pop_affected", "crop_affected", "built_affected"]),
  },
  {
    key: "drainage",
    label: "Tiêu thoát nước",
    codes: new Set([
      "pond_to_built",
      "drainage_sensitive",
      "encroachment_alert",
    ]),
  },
  {
    key: "qa",
    label: "Kiểm tra chất lượng",
    codes: new Set(["frequent_flood", "flood_frequency", "stratum"]),
  },
];

function unwrap(payload) {
  return payload?.data ?? payload ?? {};
}

function normalizeId(value) {
  return value == null ? "" : String(value);
}

function describeArtifact(artifact) {
  return (
    ARTIFACT_GLOSSARY[artifact?.code] ||
    artifact?.metadata?.description ||
    "Lớp bản đồ chuyên đề dùng để chồng ghép và đối chiếu."
  );
}

function formatNumber(value, options = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return number.toLocaleString("vi-VN", {
    maximumFractionDigits: 2,
    ...options,
  });
}

function formatMetric(value, unit, options) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return `${formatNumber(value, options)}${unit ? ` ${unit}` : ""}`;
}

function runMetadata(run) {
  return run?.resultMetadata || run?.metadata || {};
}

function formatDateShort(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function getAnalysisPeriods(run) {
  const metadata = runMetadata(run);

  const isMonitoring = metadata.monitorStart != null;
  const monitorStart = metadata.monitorStart;
  const monitorEnd = metadata.monitorEnd;
  const dryWindow = metadata.dryWindow;

  const periods = [];

  if (isMonitoring && monitorStart) {
    periods.push({
      label: "Kỳ giám sát",
      value: monitorEnd
        ? `${formatDateShort(monitorStart)} – ${formatDateShort(monitorEnd)}`
        : formatDateShort(monitorStart),
    });
    if (dryWindow?.start) {
      periods.push({
        label: "Kỳ tham chiếu khô",
        value: `${formatDateShort(dryWindow.start)} – ${formatDateShort(dryWindow.end)}`,
      });
    }
  } else if (metadata.analysisYear != null) {
    periods.push({
      label: "Năm phân tích",
      value: String(metadata.analysisYear),
    });
  }

  const analysisPeriods = metadata.analysisPeriods || [];
  if (analysisPeriods.length > 0) {
    const validCount = metadata.validPeriodCount;
    const total = metadata.totalPeriods ?? analysisPeriods.length;
    periods.push({
      label: isMonitoring ? "Kỳ dữ liệu" : "Chất lượng từng mùa",
      type: "season_quality",
      seasons: analysisPeriods.map((p) => ({
        name: p.label || p.start?.slice(0, 7),
        imageCount: p.imageCount ?? null,
        valid: p.valid !== false && (p.imageCount == null || p.imageCount > 0),
      })),
      countSuffix:
        validCount != null && validCount < total
          ? `${validCount}/${total} kỳ có dữ liệu`
          : null,
    });
  }
  if (metadata.orbitSelected || metadata.orbitRequested) {
    const selected = metadata.orbitSelected || metadata.orbitPass;
    const requested = metadata.orbitRequested;
    const orbitText =
      requested === "AUTO" && selected
        ? `${selected} (hệ thống tự chọn)`
        : selected || requested;
    if (orbitText)
      periods.push({ label: "Quỹ đạo Sentinel-1", value: orbitText });
  }
  return periods;
}

function getModuleMetrics(run) {
  const metadata = runMetadata(run);

  return [
    {
      label: "Diện tích ngập",
      value: formatMetric(metadata.areaStats?.floodExtentAreaHa, "ha"),
    },
    {
      label: "Cảnh báo tiêu thoát",
      value: formatMetric(metadata.areaStats?.drainageAlertAreaHa, "ha"),
    },
    {
      label: "Dân số ảnh hưởng",
      value:
        metadata.areaStats?.populationAffected != null
          ? formatMetric(metadata.areaStats.populationAffected, "người", {
              maximumFractionDigits: 0,
            })
          : null,
    },
    {
      label: "Đất nông nghiệp",
      value: formatMetric(metadata.areaStats?.cropAffectedAreaHa, "ha"),
    },
  ].filter(({ value }) => value != null);
}

function buildAvailableRuns(runs, layers, overview) {
  const byId = new Map();
  const module = "trend";

  const addRun = (run) => {
    const id = normalizeId(run?.id);
    if (!id) return;
    const current = byId.get(id) || {};
    byId.set(id, {
      ...current,
      ...run,
      id,
      module,
      resultMetadata:
        run?.resultMetadata ||
        run?.metadata ||
        current.resultMetadata ||
        current.metadata ||
        {},
      warnings: run?.warnings || current.warnings || [],
    });
  };

  runs.filter((run) => run.module === module).forEach(addRun);

  const latest = overview?.modules?.[module];
  if (latest) addRun({ ...latest, module });

  layers
    .filter((layer) => layer.module === module && layer.analysisRunId != null)
    .forEach((layer) => {
      const id = normalizeId(layer.analysisRunId);
      if (byId.has(id)) return;
      addRun({
        id,
        module,
        status: "SUCCEEDED",
        finishedAt: layer.publishedAt,
        resultMetadata: {},
      });
    });

  return [...byId.values()].sort((left, right) => {
    const leftTime = new Date(
      left.finishedAt || left.publishedAt || 0,
    ).getTime();
    const rightTime = new Date(
      right.finishedAt || right.publishedAt || 0,
    ).getTime();
    return rightTime - leftTime;
  });
}

function toFloodMapLayer(artifact, legend = null) {
  const workspace = artifact.workspace || "campha";
  const qualifiedName = artifact.layerName
    ? `${workspace}:${artifact.layerName}`
    : "";
  return {
    id: `flood-${artifact.id}`,
    layer_id: artifact.registryLayerId,
    code: `flood-${artifact.id}-${artifact.code}`,
    name: artifact.metadata?.label?.vi || legend?.label?.vi || artifact.code,
    title: artifact.metadata?.label?.vi || legend?.label?.vi || artifact.code,
    subtitle: artifact.publishedAt
      ? `Công bố ${formatDateTime(artifact.publishedAt)}`
      : "Ngập lụt và thủy văn",
    category: "flood",
    geometry_type: "RASTER",
    geoserver_layer: qualifiedName,
    is_public: artifact.isPublic === true,
    workspace,
    style_name: artifact.styleName || artifact.metadata?.style || undefined,
    legend,
    enabled: true,
    artifact,
  };
}

function removeFloodArtifacts(artifacts) {
  const { removeOgcLayerData } = useMapStore.getState();
  artifacts.forEach((artifact) => {
    removeOgcLayerData(buildOgcSourceId(toFloodMapLayer(artifact)));
  });
}

function StatusBadge({ status }) {
  const meta = STATUS_META[String(status || "").toUpperCase()] || {
    label: "Chưa có dữ liệu",
    variant: "outline",
  };
  return (
    <Badge variant={meta.variant} className="px-1.5 text-[10px]">
      {meta.label}
    </Badge>
  );
}

function StepLabel({ step, children, htmlFor }) {
  return (
    <Label htmlFor={htmlFor} className="gap-2 text-xs font-medium">
      <span className="flex size-5 items-center justify-center rounded-full bg-info text-[10px] font-bold text-info-foreground">
        {step}
      </span>
      <span>{children}</span>
    </Label>
  );
}

function MetricGrid({ metrics }) {
  if (!metrics.length) return null;
  return (
    <div className="grid grid-cols-2 gap-2" aria-label="Số liệu tóm tắt">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className={`min-w-0 rounded-lg border border-info/20 bg-(--info-subtle) p-2.5${metric.colSpan === 2 ? " col-span-2" : ""}`}
        >
          <p className="text-[10px] leading-4 text-muted-foreground">
            {metric.label}
          </p>
          <p
            className="mt-0.5 truncate text-sm font-semibold text-(--info-subtle-foreground)"
            title={metric.value}
          >
            {metric.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function LegendPreview({ legend }) {
  const entries = Array.isArray(legend?.entries) ? legend.entries : [];
  if (!entries.length) return null;
  return (
    <span className="mt-1.5 flex items-center gap-1" aria-label="Màu chú giải">
      {entries.slice(0, 6).map((entry, index) => (
        <span
          key={`${entry.color}-${entry.value ?? index}`}
          className="size-2.5 rounded-sm border border-border/70"
          style={{ backgroundColor: entry.color || "transparent" }}
          title={
            entry.label?.vi ||
            entry.label?.en ||
            (entry.value != null ? String(entry.value) : undefined)
          }
        />
      ))}
      <span className="ml-1 text-[10px] text-muted-foreground">
        Chú giải hiển thị trên bản đồ
      </span>
    </span>
  );
}

function LayerRow({ artifact, legend, checked, onToggle }) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const label =
    artifact.metadata?.label?.vi || legend?.label?.vi || artifact.code;
  const resolution = artifact.resolutionM
    ? `${formatNumber(artifact.resolutionM)} m`
    : null;
  const checkboxId = `flood-layer-${artifact.id}`;

  return (
    <div
      className={`rounded-lg border p-2.5 transition-colors ${
        checked
          ? "border-info/40 bg-(--info-subtle)"
          : "border-border/70 bg-card hover:bg-muted/25"
      }`}
    >
      <Label
        htmlFor={checkboxId}
        className="flex cursor-pointer items-start gap-2.5"
      >
        <Checkbox
          id={checkboxId}
          checked={checked}
          onCheckedChange={onToggle}
          variant="info"
          className="mt-0.5"
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground">
              {label}
            </span>
            {resolution ? (
              <span className="text-[10px] text-muted-foreground">
                {resolution}
              </span>
            ) : null}
          </span>
          {descriptionExpanded ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setDescriptionExpanded(false);
              }}
              className="mt-1 flex items-start gap-1 text-[11px] leading-4 text-muted-foreground hover:text-foreground w-full"
            >
              <Info className="mt-0.5 size-3 shrink-0 text-info" />
              <span className="text-left">{describeArtifact(artifact)}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setDescriptionExpanded(true);
              }}
              className="mt-1 flex items-center gap-1 text-[11px] leading-4 text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className="size-3 shrink-0 text-info -rotate-90" />
              <span>Hiển thị mô tả</span>
            </button>
          )}
          {/* <LegendPreview legend={legend} /> */}
        </span>
        {checked ? (
          <Eye className="size-3.5 text-info" />
        ) : (
          <EyeOff className="size-3.5 text-muted-foreground" />
        )}
      </Label>
    </div>
  );
}

function FloodHydrologySkeleton() {
  return (
    <div className="space-y-3" aria-label="Đang tải dữ liệu ngập lụt">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-16 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-24 rounded-lg" />
    </div>
  );
}

export function FloodHydrology() {
  const [overview, setOverview] = useState(null);
  const [layers, setLayers] = useState([]);
  const [legends, setLegends] = useState([]);
  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [visibleIds, setVisibleIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const abortControllerRef = useRef(null);
  const runsAbortRef = useRef(null);
  const layersRef = useRef([]);

  const load = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);
    setError("");

    try {
      const [overviewResponse, layerResponse, legendResponse] =
        await Promise.all([
          getFloodOverview({ signal: controller.signal }),
          getFloodLayers(
            { page: 1, limit: 100 },
            { signal: controller.signal },
          ),
          getFloodLegends({ signal: controller.signal }),
        ]);

      if (controller.signal.aborted) return;
      setOverview(unwrap(overviewResponse));
      setLayers(unwrap(layerResponse)?.items || []);
      setLegends(
        Array.isArray(unwrap(legendResponse)) ? unwrap(legendResponse) : [],
      );
    } catch (requestError) {
      if (!controller.signal.aborted && requestError?.name !== "AbortError") {
        setError(
          requestError?.message ||
            "Không thể tải dữ liệu ngập lụt và thủy văn.",
        );
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setLoading(false);
      }
    }
  }, []);

  // Fetch runs for trend module once on mount.
  const loadRuns = useCallback(async () => {
    runsAbortRef.current?.abort();
    const controller = new AbortController();
    runsAbortRef.current = controller;
    try {
      const runResponse = await getFloodRuns(
        { module: "trend", mode: "product", page: 1, limit: 50 },
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      setRuns(unwrap(runResponse)?.items || []);
    } catch (err) {
      if (!controller.signal.aborted && err?.name !== "AbortError") {
        setRuns([]);
      }
    } finally {
      if (runsAbortRef.current === controller) {
        runsAbortRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    load();
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, [load]);

  useEffect(() => {
    loadRuns();
    return () => {
      runsAbortRef.current?.abort();
      runsAbortRef.current = null;
    };
  }, [loadRuns]);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    return () => removeFloodArtifacts(layersRef.current);
  }, []);

  const legendsByCode = useMemo(
    () => new Map(legends.map((legend) => [legend.code, legend])),
    [legends],
  );

  const availableRuns = useMemo(
    () => buildAvailableRuns(runs, layers, overview),
    [layers, overview, runs],
  );

  const effectiveRunId = availableRuns.some(
    (run) => normalizeId(run.id) === selectedRunId,
  )
    ? selectedRunId
    : normalizeId(availableRuns[0]?.id);

  const selectedRun =
    availableRuns.find((run) => normalizeId(run.id) === effectiveRunId) || null;

  const selectedLayers = useMemo(
    () =>
      layers
        .filter(
          (layer) =>
            layer.module === "trend" &&
            normalizeId(layer.analysisRunId) === effectiveRunId &&
            layer.layerName &&
            layer.workspace,
        )
        .sort((left, right) => {
          if (left.role === "QA" && right.role !== "QA") return 1;
          if (left.role !== "QA" && right.role === "QA") return -1;
          return (
            (ARTIFACT_PRIORITY[left.code] || 99) -
            (ARTIFACT_PRIORITY[right.code] || 99)
          );
        }),
    [effectiveRunId, layers],
  );

  const selectedMetrics = useMemo(
    () => getModuleMetrics(selectedRun),
    [selectedRun],
  );

  const selectedPeriods = useMemo(
    () => (selectedRun ? getAnalysisPeriods(selectedRun) : []),
    [selectedRun],
  );

  const visibleSelectedCount = selectedLayers.filter((layer) =>
    visibleIds.has(layer.id),
  ).length;
  const allSelectedLayersVisible =
    selectedLayers.length > 0 && visibleSelectedCount === selectedLayers.length;

  const hideAllFloodLayers = useCallback(() => {
    const visibleArtifacts = layers.filter((layer) => visibleIds.has(layer.id));
    removeFloodArtifacts(visibleArtifacts);
    setVisibleIds(new Set());
  }, [layers, visibleIds]);

  const handleRunChange = useCallback(
    (value) => {
      hideAllFloodLayers();
      setSelectedRunId(value);
    },
    [hideAllFloodLayers],
  );

  const toggleLayer = useCallback(
    (artifact) => {
      const mapLayer = toFloodMapLayer(
        artifact,
        legendsByCode.get(artifact.code) || null,
      );
      const sourceId = buildOgcSourceId(mapLayer);
      setVisibleIds((current) => {
        const next = new Set(current);
        if (next.has(artifact.id)) {
          next.delete(artifact.id);
          useMapStore.getState().removeOgcLayerData(sourceId);
        } else {
          next.add(artifact.id);
          useMapStore.getState().setOgcLayerData(sourceId, mapLayer);
        }
        return next;
      });
    },
    [legendsByCode],
  );

  const toggleAllSelectedLayers = useCallback(() => {
    const { removeOgcLayerData, setOgcLayerData } = useMapStore.getState();
    setVisibleIds((current) => {
      const next = new Set(current);
      selectedLayers.forEach((artifact) => {
        const mapLayer = toFloodMapLayer(
          artifact,
          legendsByCode.get(artifact.code) || null,
        );
        const sourceId = buildOgcSourceId(mapLayer);
        if (allSelectedLayersVisible) {
          next.delete(artifact.id);
          removeOgcLayerData(sourceId);
        } else if (!next.has(artifact.id)) {
          next.add(artifact.id);
          setOgcLayerData(sourceId, mapLayer);
        }
      });
      return next;
    });
  }, [allSelectedLayersVisible, legendsByCode, selectedLayers]);

  const initialLoading =
    loading && !overview && layers.length === 0 && runs.length === 0;

  return (
    <div className="flex min-w-0 flex-col gap-3 pb-3">
      <Card variant="gradient-panel" className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b border-(--gradient-surface-panel-border) px-3 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-(--gradient-surface-panel-wash-strong)">
              <Waves className="size-5" />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-sm">Ngập lụt và thủy văn</CardTitle>
              <CardDescription className="mt-1 whitespace-normal text-[11px] text-(--gradient-surface-panel-muted)">
                Giám sát ngập · Cẩm Phả
              </CardDescription>
            </div>
          </div>
          <CardAction>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="text-(--gradient-surface-panel-foreground) hover:bg-(--gradient-surface-panel-wash-strong) hover:text-(--gradient-surface-panel-foreground)"
                  onClick={load}
                  disabled={loading}
                  aria-label="Tải lại dữ liệu ngập lụt"
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Tải lại dữ liệu</TooltipContent>
            </Tooltip>
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-4 bg-card px-3 py-3 text-card-foreground">
          {error ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive"
            >
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span className="leading-4">{error}</span>
            </div>
          ) : null}

          {initialLoading ? (
            <FloodHydrologySkeleton />
          ) : (
            <>
              {/* Step 1 — always visible */}
              <section className="space-y-2" aria-label="Chọn dữ liệu ngập lụt">
                <div className="flex items-center justify-between gap-2">
                  <StepLabel step="1" htmlFor="flood-period-select">
                    Chọn kỳ giám sát
                  </StepLabel>
                  <Badge variant="outline" className="text-[10px]">
                    {availableRuns.length} kỳ
                  </Badge>
                </div>
                
                <HierarchicalPeriodAccordion
                  runs={availableRuns}
                  selectedRunId={effectiveRunId}
                  onSelectRun={handleRunChange}
                  disabled={!availableRuns.length || loading}
                />
              </section>

              <div className="space-y-3">
                {selectedRun ? (
                  <section
                    className="space-y-3"
                    aria-label="Kết quả kỳ đã chọn"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/20 p-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <Clock3 className="size-3.5 shrink-0 text-info" />
                        <span className="truncate text-[10px] text-muted-foreground">
                          Cập nhật {formatDateTime(selectedRun.finishedAt)}
                        </span>
                      </div>
                      <StatusBadge status={selectedRun.status} />
                    </div>

                    {selectedPeriods.length ? (
                      <div
                        className="space-y-1.5 rounded-lg border border-info/20 bg-(--info-subtle) p-2.5"
                        aria-label="Kỳ phân tích"
                      >
                        {selectedPeriods.map((period) =>
                          period.type === "season_quality" ? (
                            <div key={period.label} className="space-y-1">
                              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <CalendarDays className="size-3 shrink-0 text-info" />
                                {period.label}
                              </span>
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1 pl-4">
                                {period.seasons.map((s) => (
                                  <div
                                    key={s.name}
                                    className="flex items-center gap-1 text-[11px]"
                                  >
                                    <span
                                      className={`font-medium ${s.valid ? "text-(--info-subtle-foreground)" : "text-amber-600"}`}
                                    >
                                      {s.name}
                                    </span>
                                    {s.imageCount != null ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="cursor-default rounded bg-info/10 px-1 text-[10px] font-medium text-info tabular-nums">
                                            {s.imageCount}
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {s.imageCount} ảnh vệ tinh thu nhận
                                          được
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : null}
                                    <span
                                      className={
                                        s.valid
                                          ? "text-emerald-600"
                                          : "text-amber-500"
                                      }
                                    >
                                      {s.valid ? "✓" : "⚠"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              {period.countSuffix ? (
                                <p className="pl-4 text-[10px] text-muted-foreground">
                                  {period.countSuffix}
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <div
                              key={period.label}
                              className="flex flex-col gap-0.5 text-[11px]"
                            >
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <CalendarDays className="size-3 shrink-0 text-info" />
                                {period.label}
                              </span>
                              <span className="pl-4 font-medium text-(--info-subtle-foreground)">
                                {period.value}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    ) : null}

                    <MetricGrid metrics={selectedMetrics} />
                  </section>
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-5 text-center text-muted-foreground">
                    <CalendarDays className="mx-auto size-7 opacity-30" />
                    <p className="mt-2 text-xs">Chưa có kỳ giám sát.</p>
                  </div>
                )}
              </div>

              {/* Step 2 — always visible */}
              {selectedRun ? (
                <section
                  className="space-y-2"
                  aria-label="Lớp bản đồ của kỳ đã chọn"
                >
                  <div className="flex items-center justify-between gap-2">
                    <StepLabel step="2">Chọn lớp bản đồ</StepLabel>
                    {selectedLayers.length ? (
                      <Button
                        type="button"
                        size="xs"
                        variant={
                          allSelectedLayersVisible ? "soft-info" : "outline"
                        }
                        onClick={toggleAllSelectedLayers}
                      >
                        {allSelectedLayersVisible ? (
                          <EyeOff className="size-3" />
                        ) : (
                          <Eye className="size-3" />
                        )}
                        {allSelectedLayersVisible ? "Ẩn tất cả" : "Hiện tất cả"}
                      </Button>
                    ) : null}
                  </div>

                  {selectedLayers.length ? (
                    <TrendLayerGroups
                      layers={selectedLayers}
                      legendsByCode={legendsByCode}
                      visibleIds={visibleIds}
                      onToggle={toggleLayer}
                    />
                  ) : (
                    <div className="rounded-lg border border-dashed border-border py-6 text-center text-muted-foreground">
                      <BarChart3 className="mx-auto size-8 opacity-30" />
                      <p className="mt-2 px-3 text-xs">
                        Chưa có lớp bản đồ được công bố cho kỳ này.
                      </p>
                    </div>
                  )}
                </section>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TrendLayerGroups({ layers, legendsByCode, visibleIds, onToggle }) {
  const ungrouped = [];
  const grouped = TREND_LAYER_GROUPS.map((group) => ({
    ...group,
    items: layers.filter((a) => group.codes.has(a.code)),
  })).filter((group) => group.items.length > 0);

  // Catch any artifacts not in any group
  const allGroupedCodes = new Set(
    TREND_LAYER_GROUPS.flatMap((g) => [...g.codes]),
  );
  layers.forEach((a) => {
    if (!allGroupedCodes.has(a.code)) ungrouped.push(a);
  });

  return (
    <div className="space-y-3">
      {grouped.map((group) => (
        <div key={group.key}>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </p>
          <div className="space-y-1.5">
            {group.items.map((artifact) => (
              <LayerRow
                key={artifact.id}
                artifact={artifact}
                legend={legendsByCode.get(artifact.code)}
                checked={visibleIds.has(artifact.id)}
                onToggle={() => onToggle(artifact)}
              />
            ))}
          </div>
        </div>
      ))}
      {ungrouped.map((artifact) => (
        <LayerRow
          key={artifact.id}
          artifact={artifact}
          legend={legendsByCode.get(artifact.code)}
          checked={visibleIds.has(artifact.id)}
          onToggle={() => onToggle(artifact)}
        />
      ))}
    </div>
  );
}

export default FloodHydrology;
