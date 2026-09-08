import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LAYER_CONFIG } from "@/components/Map/Sidebar/elements/SatelliteControll/shared/layerConfig";
import { formatDateRange } from "@/components/Map/Sidebar/elements/SatelliteControll/shared/utils";
import { fmtKm2 } from "@/lib/utils";
import { useSatelliteStore } from "@/stores/Map/Sidebar/useSatelliteStore";
import { useMapStore } from "@/stores/Map/useMapStore";

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
  return {
    id,
    title:
      layer?.title ||
      localizedText(legend?.label) ||
      layer?.name ||
      layer?.name_vi ||
      layer?.name_en ||
      layer?.code ||
      "Lớp bản đồ",
    subtitle: layer?.subtitle || layer?.category_name || "",
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
        className="group h-auto w-full justify-between gap-2 px-2 py-1"
        aria-expanded={open}
      >
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <span
            className={`size-2.5 shrink-0 rounded-full ${group.markerClass || ""}`}
            style={
              group.markerClass
                ? undefined
                : { backgroundColor: group.markerColor || "#94a3b8" }
            }
          />
          <span className="flex min-w-0 flex-col items-start">
            <span className="max-w-full truncate text-xs font-semibold leading-tight text-foreground/90">
              {group.title}
            </span>
            {group.subtitle ? (
              <span className="max-w-full truncate text-[10px] leading-tight text-foreground/50">
                {group.subtitle}
              </span>
            ) : null}
          </span>
        </span>
        {open ? (
          <ChevronUp className="shrink-0 text-foreground/40" size={12} />
        ) : (
          <ChevronDown className="shrink-0 text-foreground/40" size={12} />
        )}
      </Button>

      {open ? (
        <div className="space-y-1.5 pl-1">
          {group.items.map((item, index) => {
            const area = formatArea(item);
            return (
              <div
                key={`${item.color}-${item.label}-${index}`}
                className="space-y-0.5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-3 shrink-0 rounded-sm border border-border/60"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground/80">
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

  return (
    <div className="min-w-52 max-w-[min(18rem,calc(100vw-1rem))] rounded-lg border border-border bg-card/95 shadow-lg backdrop-blur-sm">
      <Button
        type="button"
        variant={collapsed ? "outline" : "soft-primary"}
        onClick={() => setCollapsed((value) => !value)}
        className="h-auto w-full justify-between rounded-t-lg px-3 py-2"
        aria-expanded={!collapsed}
      >
        <span className="flex items-center gap-2">
          <Map className="text-primary" size={13} />
          <span className="text-xs font-semibold text-foreground">
            Chú giải bản đồ
          </span>
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
            {groups.length}
          </span>
        </span>
        {collapsed ? (
          <ChevronUp className="shrink-0 text-foreground/50" size={13} />
        ) : (
          <ChevronDown className="shrink-0 text-foreground/50" size={13} />
        )}
      </Button>

      {!collapsed ? (
        <div className="max-h-[min(50vh,24rem)] space-y-3 overflow-y-auto overscroll-contain border-t border-border/60 px-3 pb-3 pt-2">
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
