import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  ChevronDown,
  Clock3,
  Eye,
  EyeOff,
  Info,
  Layers,
  Loader2,
  Mountain,
  RefreshCw,
  TreePine,
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDateTime } from "@/lib/utils";
import {
  getForestClassificationLatest,
  getForestClassificationPublishedHistory,
  getForestClassificationSnapshot,
} from "@/features/map/api/forestClassificationApi";
import { GEOSERVER_LAYER_ORDER_PRIORITY } from "@/constant/geoserverData";
import { getRasterLayerBeforeId } from "@/helper/Map/MapHelper";
import { buildWmsTileUrl } from "@/helper/Map/geoserver/wms";
import { useMapStore } from "@/stores/Map/useMapStore";

/**
 * Forest Classification — client sidebar.
 *
 * Toàn TP Cẩm Phả tính chung một polygon (không còn tách theo huyện). Sidebar
 * chỉ toggle 1 overlay raster WMS, hiển thị KPI diện tích rừng/mỏ + bảng chú
 * giải 12 lớp từ `provinceSummary.legend` do server trả về.
 */

const FOREST_SOURCE_PREFIX = "forest-class-source-";
const FOREST_LAYER_PREFIX = "forest-class-layer-";

const KPI_TONE_CLASSES = {
  success: "border-success/25 bg-(--success-subtle)",
  warning: "border-warning/25 bg-(--warning-subtle)",
  primary: "border-primary/25 bg-(--primary-subtle)",
  info: "border-info/25 bg-(--info-subtle)",
};

const percentFmt = (value) =>
  value == null || Number.isNaN(Number(value))
    ? "—"
    : `${Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} %`;
const haFmt = (value) =>
  value == null || Number.isNaN(Number(value))
    ? "—"
    : `${Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} ha`;
const periodLabel = (item) =>
  item?.year != null && item?.month != null
    ? `${String(item.month).padStart(2, "0")}/${item.year}`
    : "—";

function ensureForestLayer(map, { id, tileUrl, visible, opacity }) {
  if (!map || !tileUrl) return;
  const sourceId = `${FOREST_SOURCE_PREFIX}${id}`;
  const layerId = `${FOREST_LAYER_PREFIX}${id}`;
  const source = map.getSource(sourceId);
  if (!source) {
    map.addSource(sourceId, {
      type: "raster",
      tiles: [tileUrl],
      tileSize: 256,
      attribution: "Dữ liệu phân loại lớp phủ rừng",
    });
  } else if (typeof source.setTiles === "function") {
    source.setTiles([tileUrl]);
  }
  if (!map.getLayer(layerId)) {
    map.addLayer(
      {
        id: layerId,
        type: "raster",
        source: sourceId,
        metadata: {
          ktGeometryPriority: GEOSERVER_LAYER_ORDER_PRIORITY.RASTER,
          ktGeometryType: "raster",
          ktManagedOverlay: true,
        },
        paint: { "raster-opacity": opacity },
        layout: { visibility: visible ? "visible" : "none" },
      },
      getRasterLayerBeforeId(map, layerId),
    );
  } else {
    map.setPaintProperty(layerId, "raster-opacity", opacity);
    map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
  }
}

function removeForestLayer(map, id) {
  if (!map) return;
  const sourceId = `${FOREST_SOURCE_PREFIX}${id}`;
  const layerId = `${FOREST_LAYER_PREFIX}${id}`;
  if (map.getLayer(layerId)) map.removeLayer(layerId);
  if (map.getSource(sourceId)) map.removeSource(sourceId);
}

function resolveTileUrl(snapshot) {
  if (!snapshot) return null;
  const geoserverTileUrl = snapshot.geoserverLayer
    ? buildWmsTileUrl({ geoserver_layer: snapshot.geoserverLayer })
    : "";
  return geoserverTileUrl || snapshot.geeTileUrl || null;
}

export function ForestClassification() {
  const mapInstance = useMapStore((state) => state.mapInstance);
  const [snapshot, setSnapshot] = useState(null);
  const [publishedHistory, setPublishedHistory] = useState([]);
  const [selectedPublishedId, setSelectedPublishedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visible, setVisible] = useState(true);
  const [opacity, setOpacity] = useState(0.85);

  const fetchLatest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [latestRes, historyRes] = await Promise.all([
        getForestClassificationLatest(),
        getForestClassificationPublishedHistory(1, 24).catch(() => null),
      ]);
      const latestSnapshot = latestRes?.data?.snapshot || null;
      const historyItems = historyRes?.data?.items || [];
      setSnapshot(latestSnapshot);
      setPublishedHistory(historyItems);
      setSelectedPublishedId(
        latestSnapshot?.id != null ? String(latestSnapshot.id) : "",
      );
    } catch (err) {
      setError(err?.message || "Không tải được kết quả phân loại rừng.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  const onSelectPublished = useCallback(async (value) => {
    if (!value) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getForestClassificationSnapshot(value);
      const nextSnapshot = res?.data?.snapshot || null;
      setSnapshot(nextSnapshot);
      setSelectedPublishedId(value);
    } catch (err) {
      setError(err?.message || "Không tải được kỳ đã chọn.");
    } finally {
      setLoading(false);
    }
  }, []);

  const tileUrl = useMemo(() => resolveTileUrl(snapshot), [snapshot]);
  const layerKey = snapshot?.id ?? null;

  // Layer lifecycle
  useEffect(() => {
    if (!mapInstance || !layerKey) return undefined;
    if (!tileUrl) {
      removeForestLayer(mapInstance, layerKey);
      return undefined;
    }
    const setup = () =>
      ensureForestLayer(mapInstance, {
        id: layerKey,
        tileUrl,
        visible,
        opacity,
      });
    if (mapInstance.isStyleLoaded()) setup();
    else mapInstance.once("load", setup);
    return () => {
      removeForestLayer(mapInstance, layerKey);
    };
  }, [mapInstance, layerKey, tileUrl, opacity, visible]);

  const summary = snapshot?.provinceSummary || {};
  const legend = useMemo(() => {
    const entries = snapshot?.provinceSummary?.legend;
    return Array.isArray(entries) ? entries : [];
  }, [snapshot]);
  const mapLegendId = layerKey ? `forest-classification-${layerKey}` : null;

  useEffect(() => {
    if (!mapLegendId) return undefined;

    const { setMapLegend, removeMapLegend } = useMapStore.getState();
    if (!visible || !tileUrl || legend.length === 0) {
      removeMapLegend(mapLegendId);
      return undefined;
    }

    setMapLegend(mapLegendId, {
      title: `Phân loại rừng · ${periodLabel(snapshot)}`,
      subtitle: "TP Cẩm Phả",
      items: legend.map((entry) => ({
        color: entry.color,
        label: entry.nameVi || entry.nameEn || `Lớp ${entry.classId}`,
        sublabel: entry.nameEn || null,
        areaHa: entry.ha,
        percent: entry.percent,
      })),
    });

    return () => removeMapLegend(mapLegendId);
  }, [legend, mapLegendId, snapshot, tileUrl, visible]);

  return (
    <div className="flex flex-col gap-3">
      <Card variant="gradient-panel" className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b border-(--gradient-surface-panel-border) px-3 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-(--gradient-surface-panel-wash-strong) text-(--gradient-surface-panel-foreground)">
              <TreePine className="size-5" />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-sm">Phân loại rừng</CardTitle>
              <CardDescription className="mt-1 whitespace-normal break-words text-[11px] text-(--gradient-surface-panel-muted)">
                TP Cẩm Phả · Phân tích ảnh vệ tinh Sentinel-2
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
                  onClick={fetchLatest}
                  disabled={loading}
                  aria-label="Tải lại dữ liệu phân loại rừng"
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
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive"
            >
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span className="leading-4">{error}</span>
            </div>
          )}

          <div
            role="note"
            aria-label="Lưu ý về độ chính xác"
            className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-(--warning-subtle) p-2.5 text-(--warning-subtle-foreground)"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-warning/20 text-warning">
              <AlertTriangle className="size-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-semibold text-warning">
                Lưu ý về độ chính xác
              </p>
              <p className="text-[11px] leading-relaxed">
                Kết quả được phân loại tự động và có thể chịu ảnh hưởng bởi mây,
                thời điểm chụp hoặc độ phân giải ảnh. Chỉ sử dụng để tham khảo;
                cần đối chiếu dữ liệu chuyên ngành hoặc kiểm tra thực địa trước
                khi ra quyết định.
              </p>
            </div>
          </div>

          {loading && !snapshot && <ForestClassificationSkeleton />}

          {publishedHistory.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label
                  htmlFor="forest-published-period"
                  className="text-xs text-foreground"
                >
                  <CalendarDays className="size-3.5 text-primary" />
                  Kỳ dữ liệu
                </Label>
                <Badge variant="outline" className="text-[10px]">
                  {publishedHistory.length} kỳ
                </Badge>
              </div>
              <Select
                value={selectedPublishedId}
                onValueChange={onSelectPublished}
                disabled={loading}
              >
                <SelectTrigger
                  id="forest-published-period"
                  size="sm"
                  variant="filled"
                  isLoading={loading}
                  className="w-full text-xs"
                  aria-label="Chọn kỳ dữ liệu phân loại rừng"
                >
                  <SelectValue placeholder="Chọn kỳ đã công bố" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  align="start"
                  className="max-h-64"
                >
                  {publishedHistory.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {periodLabel(item)}
                      {item.status === "published" ? " · đã công bố" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {snapshot && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/70 p-2">
                <Badge variant="soft-success">
                  <CalendarDays />
                  Kỳ {periodLabel(snapshot)}
                </Badge>
                {snapshot.computedAt && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock3 className="size-3" />
                    {formatDateTime(snapshot.computedAt)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8.5rem),1fr))] gap-2">
                <KpiTile
                  icon={<TreePine className="size-3.5 text-success" />}
                  label="Rừng"
                  value={haFmt(summary.forestHa)}
                  hint={percentFmt(summary.forestPercent)}
                  tone="success"
                />
                <KpiTile
                  icon={<Mountain className="size-3.5 text-warning" />}
                  label="Khu mỏ"
                  value={haFmt(summary.mineHa)}
                  hint={percentFmt(summary.minePercent)}
                  tone="warning"
                />
                <div className="col-span-full">
                  <KpiTile
                    icon={<Layers className="size-3.5 text-primary" />}
                    label="Tổng phân loại"
                    value={haFmt(summary.totalHa)}
                    hint="Toàn TP Cẩm Phả"
                    tone="primary"
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Label className="block truncate text-xs">
                      Phân loại lớp phủ rừng
                    </Label>
                    <p
                      className="mt-0.5 truncate text-[10px] text-muted-foreground"
                      title={snapshot.geoserverLayer || undefined}
                    >
                      Kỳ {periodLabel(snapshot)} · Hiển thị trên bản đồ
                    </p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant={visible ? "soft-success" : "outline"}
                          onClick={() => setVisible((prev) => !prev)}
                          disabled={!tileUrl}
                          aria-label={
                            visible
                              ? "Ẩn lớp phân loại rừng"
                              : "Hiện lớp phân loại rừng"
                          }
                          aria-pressed={visible}
                        >
                          {visible ? (
                            <Eye className="size-4" />
                          ) : (
                            <EyeOff className="size-4" />
                          )}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      {visible ? "Ẩn lớp bản đồ" : "Hiện lớp bản đồ"}
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="forest-layer-opacity" className="text-xs">
                      Độ hiển thị
                    </Label>
                    <Badge variant="outline" className="min-w-12 text-[10px]">
                      {Math.round(opacity * 100)}%
                    </Badge>
                  </div>
                  <Slider
                    id="forest-layer-opacity"
                    value={[opacity]}
                    min={0}
                    max={1}
                    step={0.05}
                    onValueChange={([value]) => setOpacity(value)}
                    disabled={!tileUrl || !visible}
                    aria-label="Độ hiển thị lớp phân loại rừng"
                  />
                </div>
              </div>
            </>
          )}

          {!snapshot && !loading && !error && (
            <div className="text-muted-foreground p-2 text-center text-xs">
              Chưa có kết quả phân loại.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ForestClassificationSkeleton() {
  return (
    <div className="space-y-3" aria-label="Đang tải dữ liệu phân loại rừng">
      <Skeleton className="h-8 w-full" />
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  );
}

function LegendItem({ entry }) {
  const label = entry.nameVi || entry.nameEn || `Lớp ${entry.classId}`;

  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-card p-2">
      <span
        className="size-3.5 shrink-0 rounded-sm border border-border shadow-xs"
        style={{ backgroundColor: entry.color || "transparent" }}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-medium" title={label}>
          {label}
        </span>
        {entry.nameEn && entry.nameEn !== label && (
          <span className="block truncate text-[10px] text-muted-foreground">
            {entry.nameEn}
          </span>
        )}
      </span>
      <span className="shrink-0 text-right text-[10px] text-muted-foreground">
        {percentFmt(entry.percent)}
      </span>
    </div>
  );
}

function KpiTile({ icon, label, value, hint, tone = "primary" }) {
  return (
    <div
      className={`min-w-0 rounded-lg border p-2.5 ${KPI_TONE_CLASSES[tone]}`}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1.5 truncate text-sm font-semibold" title={value}>
        {value}
      </div>
      {hint && (
        <div
          className="mt-0.5 truncate text-[10px] text-muted-foreground"
          title={hint}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

export default ForestClassification;
