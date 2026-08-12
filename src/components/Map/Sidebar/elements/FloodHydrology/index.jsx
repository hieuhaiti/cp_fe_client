import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Clock3,
  Eye,
  EyeOff,
  Layers3,
  Loader2,
  RefreshCw,
  Waves,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildOgcSourceId } from "@/helper/Map/MapHelper";
import { formatDateTime } from "@/lib/utils";
import { useMapStore } from "@/stores/Map/useMapStore";
import {
  getFloodLayers,
  getFloodLegends,
  getFloodOverview,
  getFloodRuns,
} from "@/features/flood/api/floodApi";

const MODULES = [
  { code: "event", short: "M1", label: "Hiện trạng ngập", description: "Sentinel-1 trước và sau sự kiện" },
  { code: "hand", short: "M2", label: "Nhạy cảm địa hình", description: "HAND và độ dốc địa hình" },
  { code: "rain", short: "M3", label: "Chỉ số nguy cơ", description: "Chỉ số tương đối, không phải xác suất" },
  { code: "impact", short: "M4", label: "Tác động", description: "Dân cư, công trình và hạ tầng" },
  { code: "trend", short: "M5", label: "Xu thế nhiều năm", description: "Tần suất, ngập mới và biến động sử dụng đất" },
];

const STATUS_META = {
  SUCCEEDED: { label: "Hoàn thành", variant: "soft-success" },
  RUNNING: { label: "Đang xử lý", variant: "soft-warning" },
  QUEUED: { label: "Đang chờ", variant: "soft-warning" },
  EXPORTING: { label: "Đang xuất", variant: "soft-warning" },
  INGESTING: { label: "Đang nạp", variant: "soft-warning" },
  PUBLISHING: { label: "Đang công bố", variant: "soft-warning" },
  FAILED: { label: "Thất bại", variant: "destructive" },
  CANCELLED: { label: "Đã hủy", variant: "outline" },
};

function unwrap(payload) {
  return payload?.data ?? payload ?? {};
}

function toFloodMapLayer(artifact) {
  const workspace = artifact.workspace || "campha";
  const qualifiedName = artifact.layerName
    ? `${workspace}:${artifact.layerName}`
    : "";
  return {
    id: `flood-${artifact.id}`,
    code: `flood-${artifact.id}-${artifact.code}`,
    name: artifact.metadata?.label?.vi || artifact.code,
    category: "flood",
    geometry_type: "RASTER",
    geoserver_layer: qualifiedName,
    workspace,
    style_name: artifact.styleName || undefined,
    enabled: true,
    artifact,
  };
}

function StatusBadge({ status }) {
  const meta = STATUS_META[String(status || "").toUpperCase()] || {
    label: "Chưa có dữ liệu",
    variant: "outline",
  };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

function ModuleCard({ module, latest, layerCount, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg border p-2.5 text-left transition-colors ${
        active ? "border-sky-500 bg-sky-50 dark:bg-sky-950/30" : "border-border bg-card hover:bg-muted/30"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">
            {module.short} · {module.label}
          </p>
          <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
            {module.description}
          </p>
        </div>
        <StatusBadge status={latest?.status} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{layerCount} lớp đã công bố</span>
        {latest?.finishedAt ? <span>{formatDateTime(latest.finishedAt)}</span> : null}
      </div>
    </button>
  );
}

function Legend({ legend }) {
  if (!legend) return null;
  return (
    <div className="mt-2 rounded-md bg-muted/25 p-2">
      <p className="mb-1 text-[10px] font-medium text-muted-foreground">Chú giải</p>
      <div className="flex flex-wrap gap-x-2 gap-y-1">
        {(legend.entries || []).map((entry, index) => (
          <span key={`${entry.color}-${index}`} className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-sm border border-border" style={{ backgroundColor: entry.color }} />
            <span>{entry.label?.vi || entry.label?.en || (entry.value ?? "Có")}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function LayerRow({ artifact, legend, checked, onToggle }) {
  const label = artifact.metadata?.label?.vi || legend?.label?.vi || artifact.code;
  const isQa = artifact.role === "QA";
  return (
    <div className="rounded-lg border border-border bg-card p-2.5">
      <label className="flex cursor-pointer items-start gap-2.5">
        <Checkbox checked={checked} onCheckedChange={onToggle} className="mt-0.5" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-foreground">{label}</span>
            {isQa ? <Badge variant="soft-warning">QA</Badge> : <Badge variant="soft-info">Sản phẩm</Badge>}
          </span>
          <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
            {artifact.workspace}:{artifact.layerName} · {artifact.resolutionM ? `${artifact.resolutionM} m` : artifact.crs || "Raster"}
          </span>
        </span>
        {checked ? <Eye className="h-3.5 w-3.5 text-sky-600" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
      </label>
      <Legend legend={legend} />
    </div>
  );
}

export function FloodHydrology() {
  const [overview, setOverview] = useState(null);
  const [layers, setLayers] = useState([]);
  const [legends, setLegends] = useState([]);
  const [runs, setRuns] = useState([]);
  const [selectedModule, setSelectedModule] = useState("event");
  const [visibleIds, setVisibleIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    try {
      const [overviewResponse, layerResponse, legendResponse, runResponse] = await Promise.all([
        getFloodOverview({ signal: controller.signal }),
        getFloodLayers({ page: 1, limit: 100 }, { signal: controller.signal }),
        getFloodLegends({ signal: controller.signal }),
        getFloodRuns({ page: 1, limit: 50 }, { signal: controller.signal }),
      ]);
      setOverview(unwrap(overviewResponse));
      setLayers(unwrap(layerResponse)?.items || []);
      setLegends(Array.isArray(unwrap(legendResponse)) ? unwrap(legendResponse) : []);
      setRuns(unwrap(runResponse)?.items || []);
    } catch (requestError) {
      if (requestError?.name !== "AbortError") {
        setError(requestError?.message || "Không thể tải dữ liệu ngập lụt và thủy văn.");
      }
    } finally {
      setLoading(false);
    }
    return () => controller.abort();
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      const { removeOgcLayerData } = useMapStore.getState();
      for (const artifact of layers) {
        removeOgcLayerData(buildOgcSourceId(toFloodMapLayer(artifact)));
      }
    };
  }, [layers]);

  const legendsByCode = useMemo(
    () => new Map(legends.map((legend) => [legend.code, legend])),
    [legends],
  );
  const layerCounts = useMemo(() => {
    const result = Object.fromEntries(MODULES.map(({ code }) => [code, 0]));
    layers.forEach((layer) => { result[layer.module] = (result[layer.module] || 0) + 1; });
    return result;
  }, [layers]);
  const selectedLayers = useMemo(
    () => layers.filter((layer) => layer.module === selectedModule && layer.layerName && layer.workspace),
    [layers, selectedModule],
  );
  const selectedModuleInfo = MODULES.find(({ code }) => code === selectedModule);
  const latestRun = overview?.modules?.[selectedModule] || runs.find((run) => run.module === selectedModule);

  const toggleLayer = useCallback((artifact) => {
    const mapLayer = toFloodMapLayer(artifact);
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
  }, []);

  return (
    <div className="@container/flood flex min-h-full min-w-0 flex-col gap-3 px-1 pb-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground @[360px]/flood:text-lg">
            <Waves className="h-5 w-5 shrink-0 text-sky-600" />
            Ngập lụt và thủy văn
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Cẩm Phả · Sentinel-1, HAND, mưa, tác động và xu thế
          </p>
        </div>
        <Button type="button" variant="ghost" size="xs" onClick={load} disabled={loading} aria-label="Cập nhật dữ liệu ngập lụt">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] leading-5 text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
        <b>M3 là chỉ số nguy cơ tương đối, không phải xác suất ngập.</b> Các lớp QA chỉ dùng để kiểm tra chất lượng; cần đối chiếu hiện trường trước khi ra quyết định.
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {loading && !overview ? (
        <div className="flex flex-1 items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {MODULES.map((module) => (
              <ModuleCard
                key={module.code}
                module={module}
                latest={overview?.modules?.[module.code]}
                layerCount={layerCounts[module.code] || 0}
                active={selectedModule === module.code}
                onClick={() => setSelectedModule(module.code)}
              />
            ))}
          </div>

          <Card className="gap-3 py-3">
            <CardHeader className="px-3">
              <CardTitle className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-1.5">
                  <Layers3 className="h-4 w-4 shrink-0 text-sky-600" />
                  <span className="truncate">{selectedModuleInfo?.short} · {selectedModuleInfo?.label}</span>
                </span>
                <StatusBadge status={latestRun?.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-3">
              {latestRun?.finishedAt ? (
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock3 className="h-3 w-3" /> Cập nhật {formatDateTime(latestRun.finishedAt)}
                </p>
              ) : null}
              {(latestRun?.warnings || []).map((warning, index) => (
                <p key={index} className="text-[10px] leading-4 text-warning-foreground">• {String(warning)}</p>
              ))}
              {selectedLayers.length ? selectedLayers.map((artifact) => (
                <LayerRow
                  key={artifact.id}
                  artifact={artifact}
                  legend={legendsByCode.get(artifact.code)}
                  checked={visibleIds.has(artifact.id)}
                  onToggle={() => toggleLayer(artifact)}
                />
              )) : (
                <div className="py-6 text-center text-muted-foreground">
                  <BarChart3 className="mx-auto h-8 w-8 opacity-30" />
                  <p className="mt-2 text-xs">Chưa có lớp sản phẩm đã công bố cho mô-đun này.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default FloodHydrology;
