import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, Eye, EyeOff, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import LoadingInline from "@/components/common/LoadingInline";
import { useDataLayerStore } from "@/stores/Map/Sidebar/useDataLayerStore";
import { useMapStore } from "@/stores/Map/useMapStore";
import {
  extractWebMapItems,
  normalizeWebMapLayer,
  useGetMapLayersQuery,
} from "@/services/mapLayersService";
import { buildOgcSourceId } from "@/helper/Map/MapHelper";

// ── LayerItem ──────────────────────────────────────────────────────────────

function LayerItem({ layer, onToggle }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          onClick={() => onToggle(layer.id)}
          className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:bg-accent/10 hover:shadow-md"
        >
          <Checkbox
            id={`ogc-layer-${layer.id}`}
            checked={layer.enabled}
            onCheckedChange={() => onToggle(layer.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`${layer.enabled ? "Tắt" : "Bật"} lớp ${layer.name}`}
            className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {layer.name}
            </span>
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs">
        <div className="font-semibold text-sm">{layer.name}</div>
      </TooltipContent>
    </Tooltip>
  );
}

function formatCategoryName(category) {
  if (!category) return "Khác";
  return String(category)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── CollapsibleSection ─────────────────────────────────────────────────────

function CollapsibleSection({ title, activeCount, count, children, onEnableAll, onDisableAll }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="group flex min-w-0 flex-1 items-center gap-2.5 px-3 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
          aria-expanded={open}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
            <ChevronRight
              className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
            />
          </span>
          <span className="min-w-0 flex-1 truncate">{title}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {activeCount}/{count}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1 pr-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e) => { e.stopPropagation(); onEnableAll(); }}
                  disabled={activeCount === count}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Bật tất cả lớp trong nhóm</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e) => { e.stopPropagation(); onDisableAll(); }}
                  disabled={activeCount === 0}
                >
                  <EyeOff className="h-4 w-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Tắt tất cả lớp trong nhóm</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-muted/15 p-2">
          {children}
        </div>
      )}
    </section>
  );
}

function CategoryGroup({ name, layers, onToggle, onSetEnabled }) {
  const activeCount = layers.filter((l) => l.enabled).length;
  const layerIds = layers.map((l) => l.id);

  return (
    <CollapsibleSection
      title={name}
      count={layers.length}
      activeCount={activeCount}
      onEnableAll={() => onSetEnabled(layerIds, true)}
      onDisableAll={() => onSetEnabled(layerIds, false)}
    >
      <div className="flex flex-col gap-2">
        {layers.map((layer) => (
          <LayerItem key={layer.id} layer={layer} onToggle={onToggle} />
        ))}
      </div>
    </CollapsibleSection>
  );
}

// ── LayerSelection ────────────────────────────────────────────────────────────

export function LayerSelection() {
  const {
    ogcLayers,
    setOgcLayerState,
    toggleOgcLayerEnabled,
    setOgcLayersEnabled,
    resetOgcLayers,
    enableAllOgcLayers,
  } = useDataLayerStore();

  const layersQuery = useGetMapLayersQuery({}, { staleTime: 2 * 60 * 1000 });
  const mapLayers = useMemo(
    () =>
      extractWebMapItems(layersQuery.data)
        .map(normalizeWebMapLayer)
        .filter((l) => l.geoserver_layer),
    [layersQuery.data],
  );

  useEffect(() => {
    setOgcLayerState(mapLayers);
  }, [mapLayers, setOgcLayerState]);

  // Sync regular layers vào ogcLayersData — giữ nguyên các flood key riêng biệt
  useEffect(() => {
    const regularData = Object.fromEntries(
      ogcLayers.filter((l) => l.enabled).map((l) => [buildOgcSourceId(l), l]),
    );
    useMapStore.setState((state) => {
      const floodEntries = Object.fromEntries(
        Object.entries(state.ogcLayersData).filter(([k]) =>
          k.startsWith("flood-scenario-"),
        ),
      );
      return { ogcLayersData: { ...regularData, ...floodEntries } };
    });
  }, [ogcLayers]);

  const handleToggleLayer = useCallback(
    (layerId) => toggleOgcLayerEnabled(layerId),
    [toggleOgcLayerEnabled],
  );

  const handleSetGroupEnabled = useCallback(
    (layerIds, enabled) => setOgcLayersEnabled(layerIds, enabled),
    [setOgcLayersEnabled],
  );

  const handleEnableAll = useCallback(() => enableAllOgcLayers(), [enableAllOgcLayers]);

  const handleDisableAll = useCallback(() => resetOgcLayers(), [resetOgcLayers]);

  const BLOCKED_CATEGORIES = ["flood", "forest"];

  const layersByCategory = useMemo(() => {
    const groups = new Map();
    ogcLayers.forEach((layer) => {
      const key = layer.category || "uncategorized";
      if (BLOCKED_CATEGORIES.includes(key)) return;
      const group = groups.get(key) || {
        key,
        name:
          layer.category_name && layer.category_name !== layer.category
            ? layer.category_name
            : formatCategoryName(layer.category),
        layers: [],
      };
      group.layers.push(layer);
      groups.set(key, group);
    });
    return Array.from(groups.values());
  }, [ogcLayers]);

  if (layersQuery.isLoading) {
    return (
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Layers className="h-5 w-5" />
          Lớp dữ liệu
        </h2>
        <div className="flex items-center justify-center py-6">
          <LoadingInline size="small" />
        </div>
      </div>
    );
  }

  if (layersQuery.isError) {
    return (
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Layers className="h-5 w-5" />
          Lớp dữ liệu
        </h2>
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-4 text-sm text-destructive">
          Không thể tải danh sách lớp dữ liệu.
        </div>
      </div>
    );
  }

  if (!ogcLayers.length) {
    return (
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Layers className="h-5 w-5" />
          Lớp dữ liệu
        </h2>
        <div className="rounded-lg border border-border bg-card px-3 py-4 text-sm text-muted-foreground">
          Chưa có lớp dữ liệu công khai.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Layers className="h-5 w-5" />
          Lớp dữ liệu
        </h2>
        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="soft-primary"
                size="icon-sm"
                onClick={handleEnableAll}
                aria-label="Bật tất cả lớp dữ liệu"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bật tất cả</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={handleDisableAll}
                aria-label="Tắt tất cả lớp dữ liệu"
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tắt tất cả</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div
        className="max-h-[50vh] space-y-4 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]"
        aria-label="Danh sách nhóm lớp dữ liệu"
      >
        {layersByCategory.map((group) => (
          <CategoryGroup
            key={group.key}
            name={group.name}
            layers={group.layers}
            onToggle={handleToggleLayer}
            onSetEnabled={handleSetGroupEnabled}
          />
        ))}
      </div>
    </div>
  );
}
