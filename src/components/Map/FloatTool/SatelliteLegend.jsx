import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Map, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LAYER_CONFIG } from "@/components/Map/Sidebar/elements/SatelliteControll/shared/layerConfig";
import { formatDateRange } from "@/components/Map/Sidebar/elements/SatelliteControll/shared/utils";
import { fmtKm2 } from "@/lib/utils";
import { useSatelliteStore } from "@/stores/Map/Sidebar/useSatelliteStore";
import { useMapStore } from "@/stores/Map/useMapStore";

/** Giới hạn độ dài tên hiển thị, dùng kèm CSS line-clamp-2 */
const MAX_TITLE_LENGTH = 70;

function formatDisplayName(name, maxLength = MAX_TITLE_LENGTH) {
  if (!name || typeof name !== "string") return "";
  const trimmed = name.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trim()}…`;
}

/** Nhận diện chuỗi dạng mã kỹ thuật (workspace:layer, snake_case) để không hiển thị ra UI */
function isCodeLike(value) {
  if (!value) return true;
  const trimmed = value.trim();
  // Chỉ coi là mã khi không có khoảng trắng VÀ chứa ký tự phân tách kiểu định danh
  return /^[a-z0-9]+[:_-][a-z0-9:_-]*$/i.test(trimmed);
}

const FALLBACK_LEGENDS = {
  ndvi: [
    { label: "< 0", color: "#8B0000" },
    { label: "0–0.1", color: "#FF0000" },
    { label: "0.1–0.2", color: "#FFA500" },
    { label: "0.2–0.3", color: "#FFFF00" },
    { label: "0.3–0.45", color: "#ADFF2F" },
    { label: "0.45–0.6", color: "#00FF00" },
    { label: "> 0.6", color: "#006400" },
  ],
  heatmap: [
    { label: "Rất mát (nước, rừng dày)", color: "#313695" },
    { label: "Mát (20–25°C)", color: "#74add1" },
    { label: "Trung bình (25–30°C)", color: "#e0f3f8" },
    { label: "Ấm (thực vật thưa)", color: "#fee090" },
    { label: "Nóng (đất trống, đô thị)", color: "#f46d43" },
    { label: "Rất nóng (mặt đường, mái tôn)", color: "#a50026" },
  ],
  classified: [
    { label: "Đất khác", color: "#FFBEE8" },
    { label: "Cây công nghiệp", color: "#FFEBB0" },
    { label: "Đất nông nghiệp", color: "#F0E442" },
    { label: "Rừng hỗn giao lá rộng, lá kim", color: "#FEFF73" },
    { label: "Rừng lá rộng thường xanh", color: "#AAFF03" },
    { label: "Rừng lá kim", color: "#D0FF73" },
    { label: "Rừng lá rộng rụng lá", color: "#E7E600" },
    { label: "Rừng tre nứa", color: "#4DE600" },
    { label: "Rừng trồng", color: "#FFAA01" },
    { label: "Sông, suối, hồ", color: "#73B2FF" },
    { label: "Trảng cỏ, cây bụi", color: "#55FF00" },
  ],
  change: [
    { label: "Không đổi", color: "#808080" },
    { label: "ALERT: Giảm thảm thực vật", color: "#FF0000" },
    { label: "ALERT: Tăng thảm thực vật", color: "#00FF00" },
    { label: "ALERT: Mở đường / Xây dựng", color: "#00FFFF" },
    { label: "ALERT: Giảm thực vật + Mở đường", color: "#FF00FF" },
  ],
};

function localizedText(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    return value.vi || value.en || value.label || value.name || "";
  }
  return String(value);
}

function normalizeLegendItem(item, index) {
  if (typeof item === "string") {
    return { color: "#94a3b8", label: item };
  }

  const range = localizedText(item?.range);
  const value = item?.value ?? item?.classId ?? item?.class_id;
  const label =
    localizedText(item?.label) ||
    localizedText(item?.name) ||
    item?.nameVi ||
    item?.nameEn ||
    (value != null ? String(value) : `Mức ${index + 1}`);

  return {
    color: item?.color || item?.fill || item?.hex || "#94a3b8",
    label,
    sublabel:
      localizedText(item?.sublabel) || (range && range !== label ? range : ""),
    areaKm2: item?.areaKm2 ?? item?.area_km2 ?? null,
    areaHa: item?.areaHa ?? item?.area_ha ?? item?.ha ?? null,
    percent: item?.percent ?? item?.pct ?? null,
  };
}

function legendEntries(legend) {
  if (Array.isArray(legend)) return legend;
  if (!legend || typeof legend !== "object") return [];

  const entries =
    legend.entries ||
    legend.items ||
    legend.classes ||
    legend.categories ||
    legend.values;
  return Array.isArray(entries) ? entries : [];
}

function satelliteLegendItems(layer) {
  if (layer.areaStats?.classes?.length) {
    return layer.areaStats.classes.map((item, index) =>
      normalizeLegendItem(
        {
          ...item,
          areaKm2: item.areaKm2,
          percent: item.pct,
        },
        index,
      ),
    );
  }

  if (Array.isArray(layer.legend) && layer.legend.length > 0) {
    return layer.legend.map((item, index) =>
      normalizeLegendItem(
        {
          ...item,
          areaHa: item.areaHa,
          sublabel: item.range,
        },
        index,
      ),
    );
  }

  return (FALLBACK_LEGENDS[layer.layerType] || []).map(normalizeLegendItem);
}

function toSatelliteLegendGroup(layer) {
  const config = LAYER_CONFIG[layer.layerType];
  const period =
    layer.layerType === "change"
      ? ""
      : layer.splitSide === "left"
        ? "Kỳ hiện tại · "
        : layer.splitSide === "right"
          ? "Kỳ tham chiếu · "
          : "";

  return {
    id: `satellite-${layer.id}`,
    title: `${period}${config?.label || layer.layerType}`,
    subtitle: formatDateRange(layer.date),
    markerClass: config?.color || "bg-gray-400",
    items: satelliteLegendItems(layer),
  };
}

function toMapLegendGroup(id, layer) {
  const legend = layer?.legend ?? layer;
  const entries = legendEntries(legend);
  if (entries.length === 0) return null;

  const items = entries.map(normalizeLegendItem);

  // Bỏ layer.code: không hiển thị mã kỹ thuật ra giao diện người dùng
  const rawTitle =
    layer?.title ||
    localizedText(legend?.label) ||
    layer?.name_vi ||
    layer?.name ||
    layer?.name_en ||
    "";

  const rawSubtitle = layer?.subtitle || layer?.category_name || "";

  return {
    id,
    title: isCodeLike(rawTitle) ? rawSubtitle || "Lớp bản đồ" : rawTitle,
    subtitle: isCodeLike(rawSubtitle) ? "" : rawSubtitle,
    markerColor: items[0]?.color,
    items,
  };
}

function formatArea(item) {
  if (item.areaKm2 != null) return fmtKm2(Number(item.areaKm2));
  if (item.areaHa == null) return "";
  return `${Number(item.areaHa).toLocaleString("vi-VN", {
    maximumFractionDigits: 2,
  })} ha`;
}

function LegendGroup({ group, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!group.items.length) return null;

  return (
    <section className="space-y-1.5">
      <Button
        type="button"
        variant={open ? "soft-primary" : "outline"}
        onClick={() => setOpen((value) => !value)}
        className="group h-auto w-full items-start justify-between gap-2 whitespace-normal px-2.5 py-1.5 text-left transition-colors"
        aria-expanded={open}
      >
        <span className="flex min-w-0 flex-1 items-start gap-2 overflow-hidden">
          <span
            className={`mt-1 size-2.5 shrink-0 rounded-full ${group.markerClass || ""}`}
            style={
              group.markerClass
                ? undefined
                : { backgroundColor: group.markerColor || "#94a3b8" }
            }
          />
          <span className="flex min-w-0 flex-1 flex-col items-start overflow-hidden">
            <span
              className="line-clamp-2 break-words text-xs font-semibold leading-tight text-foreground/90"
              title={group.title}
            >
              {formatDisplayName(group.title)}
            </span>
            {group.subtitle ? (
              <span className="mt-0.5 max-w-full truncate text-[10px] leading-tight text-foreground/50">
                {group.subtitle}
              </span>
            ) : null}
          </span>
        </span>
        <span className="mt-0.5 shrink-0 text-foreground/40 transition-colors group-hover:text-foreground">
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
      </Button>

      {open ? (
        <div className="space-y-1.5 pl-1.5 pr-0.5">
          {group.items.map((item, index) => {
            const area = formatArea(item);
            return (
              <div
                key={`${item.color}-${item.label}-${index}`}
                className="space-y-0.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-3 shrink-0 rounded-xs border border-border/60 shadow-xs"
                    style={{ backgroundColor: item.color }}
                  />
                  <span
                    className="min-w-0 flex-1 truncate text-xs text-foreground/80"
                    title={item.label}
                  >
                    {item.label}
                  </span>
                </div>
                {item.sublabel || area || item.percent != null ? (
                  <div className="flex min-w-0 items-center gap-1.5 pl-5 text-[10px] text-muted-foreground">
                    {item.sublabel ? (
                      <span className="truncate">{item.sublabel}</span>
                    ) : null}
                    {area ? <span className="shrink-0">{area}</span> : null}
                    {item.percent != null ? (
                      <span className="shrink-0">
                        · {Number(item.percent).toLocaleString("vi-VN")} %
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export function MapLegend() {
  const [collapsed, setCollapsed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const satelliteLayers = useSatelliteStore((state) => state.satelliteLayers);
  const isCompareMode = useSatelliteStore((state) => state.isCompareMode);
  const comparisonImages = useSatelliteStore(
    (state) => state.images.comparison,
  );
  const ogcLayersData = useMapStore((state) => state.ogcLayersData);
  const timeSeriesLayersData = useMapStore(
    (state) => state.timeSeriesLayersData,
  );
  const mapLegends = useMapStore((state) => state.mapLegends);

  const groups = useMemo(() => {
    const sourceLayers = isCompareMode ? comparisonImages : satelliteLayers;
    const satelliteGroups = (sourceLayers || [])
      .filter((layer) => layer && layer.visible !== false)
      .filter((layer, index, layers) => {
        if (layer.layerType !== "change") return true;
        return (
          layers.findIndex((item) => item.layerType === "change") === index
        );
      })
      .map(toSatelliteLegendGroup)
      .filter((group) => group.items.length > 0);

    const registeredGroups = Object.entries(mapLegends || {})
      .map(([id, legend]) => toMapLegendGroup(`registered-${id}`, legend))
      .filter(Boolean);

    const ogcGroups = Object.entries(ogcLayersData || {})
      .map(([sourceId, layer]) => toMapLegendGroup(`ogc-${sourceId}`, layer))
      .filter(Boolean);

    const timeSeriesGroups = Object.entries(timeSeriesLayersData || {})
      .map(([groupCode, data]) => {
        if (!data) return null;
        return toMapLegendGroup(`ts-${groupCode}`, {
          ...data,
          title: data.group?.name_vi || data.group?.name_en || data.layer?.name_vi || data.layer?.name || groupCode,
          subtitle: data.step?.label ? `Ảnh năm ${data.step.label}` : data.time ? `Ảnh thời điểm ${data.time}` : "Ảnh theo chuỗi thời gian",
          legend: data.legend || data.group?.legend || data.step?.legend || data.layer?.legend_config || data.layer?.legend || null,
        });
      })
      .filter(Boolean);

    return [...timeSeriesGroups, ...registeredGroups, ...ogcGroups, ...satelliteGroups];
  }, [
    comparisonImages,
    isCompareMode,
    mapLegends,
    ogcLayersData,
    timeSeriesLayersData,
    satelliteLayers,
  ]);

  if (groups.length === 0) return null;

  // Khi đã ẩn: hiển thị pill nhỏ gọn để mở lại chú giải
  if (hidden) {
    return (
      <Button
        type="button"
        variant="soft-primary"
        size="sm"
        onClick={() => setHidden(false)}
        className="h-8 gap-1.5 rounded-lg border border-border bg-card/95 px-3 text-xs shadow-md backdrop-blur-md"
        title="Hiện chú giải bản đồ"
      >
        <Map className="shrink-0 text-primary" size={13} />
        <span className="max-w-30 truncate">Chú giải bản đồ</span>
        <span className="shrink-0 rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
          {groups.length}
        </span>
      </Button>
    );
  }

  return (
    <div className="w-64 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-border/80 bg-card/95 shadow-xl backdrop-blur-md transition-all duration-200 sm:w-72">
      <div className="flex select-none items-center justify-between gap-1.5 border-b border-border/40 bg-muted/30 px-3 py-2">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left transition-opacity hover:opacity-80"
          aria-expanded={!collapsed}
          title={collapsed ? "Mở rộng chú giải" : "Thu gọn chú giải"}
        >
          <Map className="shrink-0 text-primary" size={13} />
          <span className="truncate text-xs font-semibold text-foreground">
            Chú giải bản đồ
          </span>
          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            {groups.length}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="cursor-pointer rounded-md p-1 text-foreground/50 transition-colors hover:bg-accent hover:text-foreground"
            title={collapsed ? "Mở rộng" : "Thu gọn"}
            aria-label={collapsed ? "Mở rộng chú giải" : "Thu gọn chú giải"}
          >
            {collapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <button
            type="button"
            onClick={() => setHidden(true)}
            className="cursor-pointer rounded-md p-1 text-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Ẩn chú giải"
            aria-label="Ẩn chú giải"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {!collapsed ? (
        <div className="max-h-[min(60vh,24rem)] space-y-2.5 overflow-y-auto overscroll-contain border-t border-border/40 px-3 pb-3 pt-2">
          {groups.map((group) => (
            <LegendGroup
              key={group.id}
              group={group}
              defaultOpen={groups.length <= 2}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const SatelliteLegend = MapLegend;
export default MapLegend;
