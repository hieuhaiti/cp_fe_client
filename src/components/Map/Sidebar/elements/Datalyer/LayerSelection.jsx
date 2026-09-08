import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  ChevronRight,
  Eye,
  EyeOff,
  Layers,
  Search,
  X,
  RotateCcw,
  CheckCheck,
  ChevronsUpDown,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import TruncatedTextWithTooltip from "@/components/common/TruncatedTextWithTooltip";
import { useDataLayerStore } from "@/stores/Map/Sidebar/useDataLayerStore";
import { useMapStore } from "@/stores/Map/useMapStore";
import {
  extractWebMapItems,
  normalizeWebMapLayer,
  useGetMapLayersQuery,
  isTimeSeriesLayer,
} from "@/services/mapLayersService";
import { buildOgcSourceId } from "@/helper/Map/MapHelper";
import { useDebounce } from "@/hooks/useDebounce";

// ── Constants & Helpers ────────────────────────────────────────────────────

const BLOCKED_CATEGORIES = new Set(["flood", "forest"]);
const INITIAL_VISIBLE_COUNT = 10;
const BATCH_INCREMENT = 10;
const LARGE_GROUP_THRESHOLD = 30;
const BULK_ENABLE_GUARD_THRESHOLD = 30;

function formatCategoryName(category) {
  if (!category) return "Khác";
  return String(category)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeForSearch(str) {
  if (!str) return "";
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function HighlightText({ text, query }) {
  if (!text || !query) return text;
  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedQuery) return text;

  const normalizedText = normalizeForSearch(text);
  const matchIndex = normalizedText.indexOf(normalizedQuery);
  if (matchIndex === -1) return text;

  const start = matchIndex;
  const end = Math.min(text.length, matchIndex + query.trim().length);
  const before = text.slice(0, start);
  const match = text.slice(start, end);
  const after = text.slice(end);

  return (
    <>
      {before}
      <mark className="rounded-xs bg-primary/20 px-0.5 font-semibold text-foreground">
        {match}
      </mark>
      {after}
    </>
  );
}

// ── LayerItem ──────────────────────────────────────────────────────────────

function LayerItem({ layer, onToggle, searchQuery }) {
  return (
    <label
      htmlFor={`ogc-layer-${layer.id}`}
      className="group flex h-auto cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-3 shadow-xs transition-all hover:border-primary/40 hover:bg-accent/10 hover:shadow-sm"
    >
      <Checkbox
        id={`ogc-layer-${layer.id}`}
        checked={layer.enabled}
        onCheckedChange={() => onToggle(layer.id)}
        aria-label={`${layer.enabled ? "Tắt" : "Bật"} lớp ${layer.name}`}
        className="mt-1 shrink-0 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
      />
      <TruncatedTextWithTooltip
        text={layer.name}
        className="min-w-0 flex-1 line-clamp-2 wrap-break-word text-sm font-medium leading-5 text-foreground transition-colors group-hover:text-primary"
      >
        <HighlightText text={layer.name} query={searchQuery} />
      </TruncatedTextWithTooltip>
    </label>
  );
}

// ── CollapsibleSection ─────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  activeCount,
  count,
  isLargeGroup,
  isOpen,
  onToggleOpen,
  onEnableAll,
  onDisableAll,
  children,
  isFiltered,
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs transition-all">
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={onToggleOpen}
          className="group flex min-w-0 flex-1 items-center gap-2.5 px-3 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
          aria-expanded={isOpen}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
            <ChevronRight
              className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
            />
          </span>
          <span className="min-w-0 flex-1 line-clamp-2 wrap-break-word leading-5">
            {title}
          </span>
          {isLargeGroup && (
            <span className="shrink-0 rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
              {count} lớp
            </span>
          )}
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onEnableAll();
                  }}
                  disabled={activeCount === count}
                  aria-label={
                    isFiltered
                      ? "Bật tất cả lớp đang hiển thị"
                      : "Bật tất cả lớp trong nhóm"
                  }
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {isFiltered
                ? "Bật tất cả lớp đang hiển thị"
                : "Bật tất cả lớp trong nhóm"}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDisableAll();
                  }}
                  disabled={activeCount === 0}
                  aria-label={
                    isFiltered
                      ? "Tắt tất cả lớp đang hiển thị"
                      : "Tắt tất cả lớp trong nhóm"
                  }
                >
                  <EyeOff className="h-4 w-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {isFiltered
                ? "Tắt tất cả lớp đang hiển thị"
                : "Tắt tất cả lớp trong nhóm"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-border/60 bg-muted/15 p-2">
          {children}
        </div>
      )}
    </section>
  );
}

// ── CategoryGroup ──────────────────────────────────────────────────────────

function CategoryGroup({
  name,
  layers,
  isOpen,
  onToggleOpen,
  onToggleLayer,
  onSetEnabled,
  searchQuery,
  isFiltered,
}) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const statusFilter = "all"; // 'all' | 'active' | 'inactive'
  const inGroupSearch = "";

  const activeCount = layers.filter((l) => l.enabled).length;
  const totalCount = layers.length;
  const isLarge = totalCount >= LARGE_GROUP_THRESHOLD;

  // Lọc theo trạng thái và tìm kiếm nội bộ trong nhóm
  const processedLayers = useMemo(() => {
    let result = layers;

    // Lọc theo tab trạng thái
    if (statusFilter === "active") {
      result = result.filter((l) => l.enabled);
    } else if (statusFilter === "inactive") {
      result = result.filter((l) => !l.enabled);
    }

    // Tìm kiếm nội bộ nhóm (nếu có)
    const localQuery = normalizeForSearch(inGroupSearch);
    if (localQuery) {
      result = result.filter(
        (l) =>
          normalizeForSearch(l.name).includes(localQuery) ||
          normalizeForSearch(l.description).includes(localQuery),
      );
    }

    // Giữ thứ tự ổn định khi bật/tắt lớp để item không nhảy lên đầu nhóm.
    // Trạng thái `enabled` chỉ ảnh hưởng hiển thị checkbox, không ảnh hưởng thứ tự.
    return [...result].sort((a, b) => {
      const orderA = a.sort_order ?? 0;
      const orderB = b.sort_order ?? 0;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return (a.name || "").localeCompare(b.name || "", "vi");
    });
  }, [layers, statusFilter, inGroupSearch]);

  const filteredCount = processedLayers.length;
  const displayedLayers = processedLayers.slice(0, visibleCount);
  const remainingCount = filteredCount - visibleCount;

  const handleShowMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + BATCH_INCREMENT, filteredCount));
  }, [filteredCount]);

  const handleShowAll = useCallback(() => {
    setVisibleCount(filteredCount);
  }, [filteredCount]);

  const handleCollapse = useCallback(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, []);

  const visibleLayerIds = useMemo(
    () => processedLayers.map((l) => l.id),
    [processedLayers],
  );

  const effectiveSearchQuery = inGroupSearch.trim() || searchQuery;

  return (
    <CollapsibleSection
      title={name}
      count={totalCount}
      activeCount={activeCount}
      isLargeGroup={isLarge}
      isOpen={isOpen}
      onToggleOpen={onToggleOpen}
      onEnableAll={() => onSetEnabled(visibleLayerIds, true)}
      onDisableAll={() => onSetEnabled(visibleLayerIds, false)}
      isFiltered={isFiltered || statusFilter !== "all" || Boolean(inGroupSearch)}
    >
    

      {/* Danh sách các layer trong nhóm */}
      <div
        className={
          totalCount > INITIAL_VISIBLE_COUNT
            ? "flex max-h-72 flex-col gap-2 overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "flex flex-col gap-2"
        }
      >
        {displayedLayers.length === 0 ? (
          <div className="py-4 text-center text-xs text-muted-foreground">
            Không có lớp dữ liệu phù hợp với bộ lọc.
          </div>
        ) : (
          displayedLayers.map((layer) => (
            <LayerItem
              key={layer.id}
              layer={layer}
              onToggle={onToggleLayer}
              searchQuery={effectiveSearchQuery}
            />
          ))
        )}
      </div>

      {/* Điều khiển phân trang / mở rộng khi nhóm có nhiều lớp */}
      {filteredCount > INITIAL_VISIBLE_COUNT && (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-border/40 px-1 pt-2 text-xs">
          <span className="text-muted-foreground">
            Hiển thị {Math.min(visibleCount, filteredCount)}/{filteredCount} lớp
          </span>
          <div className="flex flex-wrap items-center gap-1">
            {remainingCount > 0 && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={handleShowMore}
                  className="h-6 font-medium text-primary hover:text-primary"
                >
                  +{Math.min(BATCH_INCREMENT, remainingCount)} lớp
                </Button>
                {remainingCount > BATCH_INCREMENT && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={handleShowAll}
                    className="h-6 font-medium text-primary hover:text-primary"
                  >
                    Xem tất cả ({filteredCount})
                  </Button>
                )}
              </>
            )}
            {visibleCount > INITIAL_VISIBLE_COUNT && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={handleCollapse}
                className="h-6 text-muted-foreground hover:text-foreground"
              >
                Thu gọn về {INITIAL_VISIBLE_COUNT}
              </Button>
            )}
          </div>
        </div>
      )}
    </CollapsibleSection>
  );
}

// ── PanelHeader ────────────────────────────────────────────────────────────

function PanelHeader({
  totalActiveCount,
  totalLayerCount,
  onEnableAll,
  onDisableAll,
  confirmBulkEnable,
  allGroupsOpen,
  onToggleAllGroups,
  hasCategories,
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <Layers className="h-5 w-5" />
        Lớp dữ liệu
      </h2>
      {totalLayerCount > 0 && (
        <div className="flex items-center gap-1">
          {hasCategories && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={onToggleAllGroups}
                  aria-label={
                    allGroupsOpen ? "Thu gọn tất cả nhóm" : "Mở tất cả nhóm"
                  }
                >
                  <ChevronsUpDown className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {allGroupsOpen ? "Thu gọn tất cả nhóm" : "Mở tất cả nhóm"}
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={confirmBulkEnable ? "warning" : "soft-primary"}
                size={confirmBulkEnable ? "sm" : "icon-sm"}
                onClick={onEnableAll}
                aria-label="Bật tất cả lớp dữ liệu"
                className="transition-all"
              >
                {confirmBulkEnable ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold">
                    <CheckCheck className="h-3.5 w-3.5" />
                    Bật {totalLayerCount} lớp?
                  </span>
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {confirmBulkEnable
                ? "Nhấn lần nữa để xác nhận bật toàn bộ lớp"
                : "Bật tất cả"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={onDisableAll}
                disabled={totalActiveCount === 0}
                aria-label="Tắt tất cả lớp dữ liệu"
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tắt tất cả</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
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

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState("all");
  const [confirmBulkEnable, setConfirmBulkEnable] = useState(false);
  const confirmTimeoutRef = useRef(null);

  const layersQuery = useGetMapLayersQuery({}, { staleTime: 2 * 60 * 1000 });
  const mapLayers = useMemo(
    () =>
      extractWebMapItems(layersQuery.data)
        .map(normalizeWebMapLayer)
        .filter((l) => l.geoserver_layer && !isTimeSeriesLayer(l)),
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

  const handleDisableAll = useCallback(
    () => resetOgcLayers(),
    [resetOgcLayers],
  );

  // Gom nhóm category từ ogcLayers
  const allCategoryGroups = useMemo(() => {
    const groups = new Map();
    ogcLayers.forEach((layer) => {
      const key = layer.category || "uncategorized";
      if (BLOCKED_CATEGORIES.has(key)) return;
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

  // Lọc theo từ khóa tìm kiếm (bỏ dấu tiếng Việt) & lọc theo tab category được chọn
  const filteredCategoryGroups = useMemo(() => {
    let result = allCategoryGroups;

    // Lọc theo chip Category (khi người dùng chọn 1 category cụ thể)
    if (selectedCategoryKey !== "all") {
      result = result.filter((g) => g.key === selectedCategoryKey);
    }

    const query = normalizeForSearch(debouncedSearch);
    if (!query) return result;

    return result
      .map((group) => {
        const groupNameMatched = normalizeForSearch(group.name).includes(query);
        const matchingLayers = group.layers.filter(
          (layer) =>
            groupNameMatched ||
            normalizeForSearch(layer.name).includes(query) ||
            normalizeForSearch(layer.description).includes(query),
        );

        if (matchingLayers.length === 0) return null;
        return {
          ...group,
          layers: matchingLayers,
        };
      })
      .filter(Boolean);
  }, [allCategoryGroups, selectedCategoryKey, debouncedSearch]);

  const [openOverrides, setOpenOverrides] = useState(() => ({}));
  const isSearchActive = Boolean(debouncedSearch.trim());

  const handleToggleGroupOpen = useCallback((key, currentIsOpen) => {
    setOpenOverrides((prev) => ({
      ...prev,
      [key]: !currentIsOpen,
    }));
  }, []);

  // Kiểm tra xem tất cả các nhóm hiện tại có đang mở không
  const allGroupsOpen = useMemo(() => {
    if (filteredCategoryGroups.length === 0) return false;
    return filteredCategoryGroups.every((g) => {
      const isOpen = isSearchActive
        ? (openOverrides[g.key] ?? true)
        : (openOverrides[g.key] ?? false);
      return isOpen;
    });
  }, [filteredCategoryGroups, isSearchActive, openOverrides]);

  const handleToggleAllGroups = useCallback(() => {
    const nextState = !allGroupsOpen;
    const newOverrides = {};
    filteredCategoryGroups.forEach((g) => {
      newOverrides[g.key] = nextState;
    });
    setOpenOverrides(newOverrides);
  }, [allGroupsOpen, filteredCategoryGroups]);

  const totalLayerCount = useMemo(
    () => allCategoryGroups.reduce((acc, g) => acc + g.layers.length, 0),
    [allCategoryGroups],
  );

  const totalActiveCount = useMemo(
    () => ogcLayers.filter((l) => l.enabled).length,
    [ogcLayers],
  );

  // Bảo vệ xác nhận khi bật tất cả số lượng lớn
  const handleEnableAllWithGuard = useCallback(() => {
    if (totalLayerCount > BULK_ENABLE_GUARD_THRESHOLD && !confirmBulkEnable) {
      setConfirmBulkEnable(true);
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
      confirmTimeoutRef.current = setTimeout(() => {
        setConfirmBulkEnable(false);
      }, 3500);
      return;
    }

    if (confirmTimeoutRef.current) {
      clearTimeout(confirmTimeoutRef.current);
    }
    setConfirmBulkEnable(false);
    enableAllOgcLayers();
  }, [totalLayerCount, confirmBulkEnable, enableAllOgcLayers]);

  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
    };
  }, []);

  if (layersQuery.isLoading) {
    return (
      <div className="space-y-4">
        <PanelHeader
          totalActiveCount={0}
          totalLayerCount={0}
          onEnableAll={() => {}}
          onDisableAll={() => {}}
          confirmBulkEnable={false}
          allGroupsOpen={false}
          onToggleAllGroups={() => {}}
          hasCategories={false}
        />
        <div className="space-y-3">
          <div className="h-9 w-full animate-pulse rounded-lg bg-muted/60" />
          <div className="h-14 w-full animate-pulse rounded-xl bg-muted/40" />
          <div className="h-14 w-full animate-pulse rounded-xl bg-muted/40" />
          <div className="h-14 w-full animate-pulse rounded-xl bg-muted/40" />
        </div>
      </div>
    );
  }

  if (layersQuery.isError) {
    return (
      <div className="space-y-4">
        <PanelHeader
          totalActiveCount={0}
          totalLayerCount={0}
          onEnableAll={() => {}}
          onDisableAll={() => {}}
          confirmBulkEnable={false}
          allGroupsOpen={false}
          onToggleAllGroups={() => {}}
          hasCategories={false}
        />
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-4 text-sm text-destructive">
          Không thể tải danh sách lớp dữ liệu.
        </div>
      </div>
    );
  }

  if (!ogcLayers.length) {
    return (
      <div className="space-y-4">
        <PanelHeader
          totalActiveCount={0}
          totalLayerCount={0}
          onEnableAll={() => {}}
          onDisableAll={() => {}}
          confirmBulkEnable={false}
          allGroupsOpen={false}
          onToggleAllGroups={() => {}}
          hasCategories={false}
        />
        <div className="rounded-lg border border-border bg-card px-3 py-4 text-sm text-muted-foreground">
          Chưa có lớp dữ liệu công khai.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      <PanelHeader
        totalActiveCount={totalActiveCount}
        totalLayerCount={totalLayerCount}
        onEnableAll={handleEnableAllWithGuard}
        onDisableAll={handleDisableAll}
        confirmBulkEnable={confirmBulkEnable}
        allGroupsOpen={allGroupsOpen}
        onToggleAllGroups={handleToggleAllGroups}
        hasCategories={allCategoryGroups.length > 0}
      />

      {/* Ô tìm kiếm & lọc nhanh lớp dữ liệu */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Lọc lớp dữ liệu..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 pl-9 pr-8 text-sm"
          aria-label="Tìm kiếm lớp dữ liệu"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Xóa nội dung lọc"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>



      {/* Danh sách nhóm lớp */}
      <div
        className="max-h-[52vh] space-y-3 overflow-y-auto overscroll-contain rounded-lg border border-border p-2 [scrollbar-color:hsl(var(--border))_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
        aria-label="Danh sách nhóm lớp dữ liệu"
      >
        {filteredCategoryGroups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            <p>
              {isSearchActive
                ? `Không tìm thấy lớp nào khớp với "${searchQuery}"`
                : "Không có lớp dữ liệu trong nhóm này"}
            </p>
            {(isSearchActive || selectedCategoryKey !== "all") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategoryKey("all");
                }}
                className="mt-3"
              >
                Xóa bộ lọc
              </Button>
            )}
          </div>
        ) : (
          filteredCategoryGroups.map((group) => {
            const isGroupOpen = isSearchActive
              ? (openOverrides[group.key] ?? true)
              : (openOverrides[group.key] ?? false);

            return (
              <CategoryGroup
                key={group.key}
                name={group.name}
                layers={group.layers}
                isOpen={isGroupOpen}
                onToggleOpen={() =>
                  handleToggleGroupOpen(group.key, isGroupOpen)
                }
                onToggleLayer={handleToggleLayer}
                onSetEnabled={handleSetGroupEnabled}
                searchQuery={debouncedSearch}
                isFiltered={isSearchActive}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
