import { useCallback, useEffect, useMemo, useRef } from "react";
import { Clock, EyeOff, Gauge, Layers, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import LoadingInline from "@/components/common/LoadingInline";
import { useMapStore } from "@/stores/Map/useMapStore";
import {
  useGetTimeSeriesLayersQuery,
  getTimeSeriesValues,
  getTimeSeriesDefault,
} from "@/services/mapLayersService";
import {
  buildTimeSeriesTileUrl,
  formatTimeLabel,
} from "@/helper/Map/geoserver/timeSeries";

const DEFAULT_AUTOPLAY_MS = 1400;
const SPEED_PRESETS = [
  { value: 500, label: "0.5s" },
  { value: 800, label: "0.8s" },
  { value: 1400, label: "1.4s" },
  { value: 2500, label: "2.5s" },
  { value: 4000, label: "4.0s" },
];

function LayerCard({ layer, isEnabled, onToggle }) {
  const values = getTimeSeriesValues(layer);
  const first = values[0];
  const last = values[values.length - 1];

  return (
    <label
      htmlFor={`ts-layer-${layer.id}`}
      className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:bg-accent/10 hover:shadow-md"
    >
      <Checkbox
        id={`ts-layer-${layer.id}`}
        checked={isEnabled}
        onCheckedChange={() => onToggle(layer)}
        className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">
          {layer.name_vi}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {values.length} ảnh · {formatTimeLabel(first, values)}–
          {formatTimeLabel(last, values)}
        </span>
      </span>
    </label>
  );
}

function TimelinePanel({ layer, onClose }) {
  const setTimeSeriesLayer = useMapStore((s) => s.setTimeSeriesLayer);
  const removeTimeSeriesLayer = useMapStore((s) => s.removeTimeSeriesLayer);
  const panelState = useMapStore((s) => s.timeSeriesPanelState[layer.id]);
  const setPanelState = useMapStore((s) => s.setTimeSeriesPanelState);

  const values = useMemo(() => getTimeSeriesValues(layer), [layer]);
  const defaultIndex = useMemo(() => {
    const preferred = getTimeSeriesDefault(layer);
    const index = values.indexOf(preferred);
    return index >= 0 ? index : Math.max(0, values.length - 1);
  }, [layer, values]);

  const rawIndex = panelState?.timeIndex;
  const isPlaying = !!panelState?.isPlaying;
  const intervalMs = panelState?.intervalMs || DEFAULT_AUTOPLAY_MS;
  // Danh sách mốc có thể ngắn lại khi quản trị viên xoá ảnh; kẹp chỉ số về
  // khoảng hợp lệ để không gửi mốc cũ và nhận 422 TIME_NOT_FOUND.
  const timeIndex =
    rawIndex != null && rawIndex >= 0 && rawIndex < values.length
      ? rawIndex
      : defaultIndex;

  const patchPanel = useCallback(
    (patch) => setPanelState(layer.id, patch),
    [layer.id, setPanelState],
  );

  // Tile URL được dựng bất đồng bộ (layer riêng tư cần tile ticket), nên phải
  // bỏ qua kết quả cũ khi người dùng kéo slider nhanh hơn thời gian phản hồi.
  useEffect(() => {
    const time = values[timeIndex];
    if (!time) return undefined;

    let ignore = false;
    void buildTimeSeriesTileUrl(layer, time).then((tileUrl) => {
      if (ignore || !tileUrl) return;
      setTimeSeriesLayer(layer.id, { layer, time, tileUrl, opacity: 0.9 });
    });
    return () => {
      ignore = true;
    };
  }, [layer, values, timeIndex, setTimeSeriesLayer]);

  const defaultIndexRef = useRef(defaultIndex);
  useEffect(() => {
    defaultIndexRef.current = defaultIndex;
  }, [defaultIndex]);

  useEffect(() => {
    if (!isPlaying || values.length < 2) return undefined;
    const id = window.setInterval(() => {
      // Đọc chỉ số qua getState() thay vì closure, nếu không index sẽ đóng băng
      // ở giá trị tại thời điểm tạo timer.
      const previous = useMapStore.getState().timeSeriesPanelState[layer.id]
        ?.timeIndex;
      const base = previous == null ? defaultIndexRef.current : previous;
      patchPanel({ timeIndex: (base + 1) % values.length });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [isPlaying, values.length, intervalMs, layer.id, patchPanel]);

  const handleHide = () => {
    removeTimeSeriesLayer(layer.id);
    onClose?.();
  };

  if (!values.length) {
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
        Chưa có ảnh nào cho lớp này.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-primary/30 bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="truncate">{layer.name_vi}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Mốc {timeIndex + 1}/{values.length} ·{" "}
            <span className="font-medium text-foreground">
              {formatTimeLabel(values[timeIndex], values)}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isPlaying ? "soft-primary" : "outline"}
                size="icon-sm"
                onClick={() => patchPanel({ isPlaying: !isPlaying })}
                disabled={values.length < 2}
                aria-label={isPlaying ? "Tạm dừng" : "Chạy tự động"}
              >
                {isPlaying ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isPlaying ? "Tạm dừng phát" : "Phát tự động"}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={handleHide}
                aria-label="Ẩn lớp ảnh theo thời gian"
              >
                <EyeOff className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ẩn khỏi bản đồ</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <Slider
        min={0}
        max={Math.max(0, values.length - 1)}
        step={1}
        value={[timeIndex]}
        onValueChange={([next]) => {
          if (typeof next !== "number") return;
          patchPanel({ timeIndex: next, isPlaying: false });
        }}
        variant="gradient-primary"
        aria-label={`Mốc thời gian: ${formatTimeLabel(values[timeIndex], values)}`}
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 justify-between text-[10px] text-muted-foreground">
          <span>{formatTimeLabel(values[0], values)}</span>
          <span>{formatTimeLabel(values[values.length - 1], values)}</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <Gauge className="h-3 w-3 text-muted-foreground" />
              <Select
                value={String(intervalMs)}
                onValueChange={(v) =>
                  patchPanel({ intervalMs: Number(v) || DEFAULT_AUTOPLAY_MS })
                }
              >
                <SelectTrigger
                  size="sm"
                  className="h-6 gap-1 px-1.5 text-[10px]"
                  aria-label="Tốc độ phát tự động"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {SPEED_PRESETS.map((preset) => (
                    <SelectItem
                      key={preset.value}
                      value={String(preset.value)}
                      className="text-xs"
                    >
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TooltipTrigger>
          <TooltipContent>Tốc độ phát tự động</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export function TimeSeries() {
  const timeSeriesLayersData = useMapStore((s) => s.timeSeriesLayersData);
  const setTimeSeriesLayer = useMapStore((s) => s.setTimeSeriesLayer);
  const removeTimeSeriesLayer = useMapStore((s) => s.removeTimeSeriesLayer);

  const { data, isLoading, isError } = useGetTimeSeriesLayersQuery({
    staleTime: 5 * 60 * 1000,
  });

  const layers = useMemo(() => data || [], [data]);

  const enabledLayers = useMemo(
    () => layers.filter((layer) => Boolean(timeSeriesLayersData?.[layer.id])),
    [layers, timeSeriesLayersData],
  );

  const handleToggle = useCallback(
    (layer) => {
      if (timeSeriesLayersData?.[layer.id]) {
        removeTimeSeriesLayer(layer.id);
        return;
      }
      // Ghi entry rỗng để checkbox phản hồi tức thì và TimelinePanel được render;
      // chính panel đó mới dựng tileUrl. Effect đồng bộ map bỏ qua entry không
      // có tileUrl nên chưa vẽ gì.
      setTimeSeriesLayer(layer.id, { layer, time: null, tileUrl: null });
    },
    [timeSeriesLayersData, setTimeSeriesLayer, removeTimeSeriesLayer],
  );

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <Layers className="h-5 w-5" />
        Ảnh theo thời gian
      </h2>

      <p className="text-xs text-muted-foreground">
        Chọn lớp dữ liệu và kéo thanh trượt để xem biến động theo năm.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <LoadingInline size="small" />
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-4 text-sm text-destructive">
          Không thể tải danh sách lớp thời gian.
        </div>
      ) : layers.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-3 py-4 text-sm text-muted-foreground">
          Chưa có lớp dữ liệu chuỗi thời gian nào.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {layers.map((layer) => (
            <LayerCard
              key={layer.id}
              layer={layer}
              isEnabled={Boolean(timeSeriesLayersData?.[layer.id])}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {enabledLayers.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Thanh thời gian
          </p>
          {enabledLayers.map((layer) => (
            <TimelinePanel
              key={layer.id}
              layer={layer}
              onClose={() => removeTimeSeriesLayer(layer.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TimeSeries;
