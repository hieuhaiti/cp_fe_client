import { useState, useMemo } from "react";
import {
  ChevronDown,
  Folder,
  FolderOpen,
  Calendar,
  Users,
  Clock,
  Search,
  X,
  Sparkles,
  GitCompare,
  CheckCircle2,
  AlertCircle,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  groupRunsByYearMonth,
  getFloodAreaHa,
  getFloodSeverity,
  formatRunLabel,
  runMetadata,
  normalizeId,
} from "./periodUtils";

export default function HierarchicalPeriodAccordion({
  runs = [],
  selectedRunId,
  onSelectRun,
}) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter runs based on search query
  const filteredRuns = useMemo(() => {
    if (!searchQuery.trim()) return runs;
    const q = searchQuery.toLowerCase().trim();
    return runs.filter((run) => {
      const meta = runMetadata(run);
      const label = formatRunLabel(run, { includeTime: true, includeArea: true }).toLowerCase();
      const runId = normalizeId(run.id).toLowerCase();
      const status = (run.status || "").toLowerCase();
      const start = (meta.monitorStart || "").toLowerCase();
      const end = (meta.monitorEnd || "").toLowerCase();
      const year = String(meta.analysisYear || "").toLowerCase();

      return (
        label.includes(q) ||
        runId.includes(q) ||
        status.includes(q) ||
        start.includes(q) ||
        end.includes(q) ||
        year.includes(q)
      );
    });
  }, [runs, searchQuery]);

  // Group filtered runs by Year > Month
  const groupedData = useMemo(() => {
    return groupRunsByYearMonth(filteredRuns);
  }, [filteredRuns]);

  // Open years and months state (default open latest year & month)
  const [openYears, setOpenYears] = useState(() => {
    const set = new Set();
    if (groupedData[0]) set.add(groupedData[0].year);
    return set;
  });

  const [openMonths, setOpenMonths] = useState(() => {
    const set = new Set();
    if (groupedData[0]?.months[0]) {
      set.add(`${groupedData[0].year}-${groupedData[0].months[0].month}`);
    }
    return set;
  });

  // Compare mode state
  const [compareMode, setCompareMode] = useState(false);
  const [compareRunId, setCompareRunId] = useState(null);

  const toggleYear = (year) => {
    setOpenYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const toggleMonth = (key) => {
    setOpenMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => {
    const allYears = new Set(groupedData.map((y) => y.year));
    const allMonths = new Set();
    groupedData.forEach((y) => {
      y.months.forEach((m) => {
        allMonths.add(`${y.year}-${m.month}`);
      });
    });
    setOpenYears(allYears);
    setOpenMonths(allMonths);
  };

  const collapseAll = () => {
    setOpenYears(new Set());
    setOpenMonths(new Set());
  };

  const selectedRun = useMemo(
    () => runs.find((r) => normalizeId(r.id) === normalizeId(selectedRunId)),
    [runs, selectedRunId]
  );

  const compareRun = useMemo(
    () => runs.find((r) => normalizeId(r.id) === normalizeId(compareRunId)),
    [runs, compareRunId]
  );

  const handleCardClick = (runId) => {
    if (compareMode) {
      if (!selectedRunId) {
        onSelectRun(runId);
      } else if (runId !== selectedRunId) {
        setCompareRunId(runId);
      }
    } else {
      onSelectRun(runId);
    }
  };

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden box-border rounded-xl border border-border/80 bg-background/95 p-2.5 shadow-xs text-xs space-y-2">
      {/* Search Input Box */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative w-full min-w-0">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kỳ theo ngày, tháng, năm..."
              className="w-full min-w-0 box-border rounded-lg border border-border/70 bg-muted/30 py-1.5 pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-info focus:bg-background focus:outline-hidden focus:ring-1 focus:ring-info transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                title="Xóa tìm kiếm"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Tìm kỳ giám sát theo ngày, tháng, năm hoặc trạng thái
        </TooltipContent>
      </Tooltip>

      {/* Control Bar: Counter & Fast Actions */}
      <div className="flex items-center justify-between gap-1 text-[11px] px-0.5">
        <span className="truncate font-medium text-muted-foreground flex items-center gap-1">
          <Folder className="size-3 text-info shrink-0" />
          {searchQuery ? (
            <span>
              Kết quả: <strong className="text-foreground">{filteredRuns.length}</strong>/{runs.length}
            </span>
          ) : (
            <span>
              Tổng cộng: <strong className="text-foreground">{runs.length}</strong> kỳ
            </span>
          )}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={openYears.size > 0 ? collapseAll : expandAll}
                className="text-[10px] font-medium text-info hover:underline px-1 py-0.5 rounded hover:bg-info/10 transition-colors"
              >
                {openYears.size > 0 ? "Thu gọn" : "Mở tất cả"}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {openYears.size > 0
                ? "Thu gọn toàn bộ cây Năm/Tháng"
                : "Mở toàn bộ cây Năm/Tháng để xem tất cả các kỳ"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={compareMode ? "default" : "outline"}
                size="xs"
                onClick={() => {
                  setCompareMode(!compareMode);
                  if (compareMode) setCompareRunId(null);
                }}
                className={`h-5.5 gap-1 px-1.5 text-[9px] ${
                  compareMode
                    ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
                    : "border-border/70 text-muted-foreground hover:text-foreground"
                }`}
              >
                <GitCompare className="size-2.5" />
                {compareMode ? "Đang so sánh" : "So sánh"}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {compareMode
                ? "Đang bật chế độ so sánh — bấm để tắt"
                : "Bật chế độ so sánh: chọn thêm 1 kỳ để đối chiếu chênh lệch diện tích ngập"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Diff comparison box if 2 runs are selected */}
      {compareMode && selectedRun && compareRun && (
        <div className="w-full min-w-0 box-border rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 space-y-1.5 text-xs animate-in fade-in-50">
          <div className="flex items-center justify-between text-[11px] font-semibold text-amber-800 dark:text-amber-300">
            <span>Đối chiếu 2 kỳ:</span>
            <span className="text-[10px] font-normal">
              Chênh lệch:{" "}
              <strong className="font-bold">
                {((getFloodAreaHa(compareRun) || 0) - (getFloodAreaHa(selectedRun) || 0)).toFixed(1)} ha
              </strong>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="min-w-0 rounded border border-info/30 bg-info/10 p-1.5 space-y-0.5">
              <span className="font-medium text-info block">Kỳ gốc:</span>
              <p className="truncate font-semibold text-foreground">{formatRunLabel(selectedRun, { includeTime: false })}</p>
              <p className="text-muted-foreground font-medium">{getFloodAreaHa(selectedRun)?.toFixed(1) || 0} ha</p>
            </div>
            <div className="min-w-0 rounded border border-amber-500/30 bg-amber-500/15 p-1.5 space-y-0.5">
              <span className="font-medium text-amber-600 dark:text-amber-400 block">Kỳ đối chiếu:</span>
              <p className="truncate font-semibold text-foreground">{formatRunLabel(compareRun, { includeTime: false })}</p>
              <p className="text-muted-foreground font-medium">{getFloodAreaHa(compareRun)?.toFixed(1) || 0} ha</p>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable Tree Accordion (Contained & Non-overflowing) */}
      <div className="w-full min-w-0 max-h-64 overflow-y-auto overscroll-contain box-border rounded-lg space-y-1.5 focus:outline-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filteredRuns.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Không tìm thấy kỳ nào khớp với "{searchQuery}"
          </div>
        ) : (
          groupedData.map((yearGroup) => {
            const isYearOpen = openYears.has(yearGroup.year) || Boolean(searchQuery.trim());

            return (
              <div
                key={yearGroup.year}
                className="w-full min-w-0 box-border rounded-lg border border-border/70 bg-muted/15 overflow-hidden"
              >
                {/* Year Header */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => toggleYear(yearGroup.year)}
                      className="flex w-full items-center justify-between bg-muted/40 px-2 py-1.5 text-left hover:bg-muted/70 transition-colors focus:outline-hidden"
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-foreground text-[11px] truncate">
                        {isYearOpen ? (
                          <FolderOpen className="size-3.5 text-info shrink-0" />
                        ) : (
                          <Folder className="size-3.5 text-info shrink-0" />
                        )}
                        <span>Năm {yearGroup.year}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-border/60">
                          {yearGroup.totalRuns} kỳ
                        </Badge>
                        <ChevronDown
                          className={`size-3 text-muted-foreground transition-transform duration-200 ${
                            isYearOpen ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {isYearOpen ? "Thu gọn" : "Mở rộng"} năm {yearGroup.year} ({yearGroup.totalRuns} kỳ)
                  </TooltipContent>
                </Tooltip>

                {/* Months inside Year */}
                {isYearOpen && (
                  <div className="p-1 space-y-1 bg-background/50">
                    {yearGroup.months.map((monthGroup) => {
                      const monthKey = `${yearGroup.year}-${monthGroup.month}`;
                      const isMonthOpen = openMonths.has(monthKey) || Boolean(searchQuery.trim());

                      return (
                        <div
                          key={monthKey}
                          className="w-full min-w-0 box-border rounded-md border border-border/50 bg-background/90 overflow-hidden"
                        >
                          {/* Month Header */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => toggleMonth(monthKey)}
                                className="flex w-full items-center justify-between px-2 py-1 text-left hover:bg-muted/40 transition-colors focus:outline-hidden"
                              >
                                <span className="flex items-center gap-1 font-medium text-[11px] text-foreground/90 truncate">
                                  <Calendar className="size-3 text-muted-foreground shrink-0" />
                                  <span className="truncate">{monthGroup.label}</span>
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[10px] text-muted-foreground">
                                    {monthGroup.runs.length} đợt
                                  </span>
                                  <ChevronDown
                                    className={`size-3 text-muted-foreground transition-transform duration-200 ${
                                      isMonthOpen ? "rotate-180" : ""
                                    }`}
                                  />
                                </div>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              {isMonthOpen ? "Thu gọn" : "Mở rộng"} {monthGroup.label} ({monthGroup.runs.length} đợt giám sát)
                            </TooltipContent>
                          </Tooltip>

                          {/* Period Cards inside Month */}
                          {isMonthOpen && (
                            <div className="p-1 space-y-1 border-t border-border/40 bg-muted/10">
                              {monthGroup.runs.map((run, idx) => {
                                const isSelected =
                                  normalizeId(run.id) === normalizeId(selectedRunId);
                                const isCompared =
                                  normalizeId(run.id) === normalizeId(compareRunId);
                                const severity = getFloodSeverity(run);
                                const area = getFloodAreaHa(run);
                                const meta = runMetadata(run);
                                const pop = meta.areaStats?.populationAffected;
                                const isLatest =
                                  yearGroup.year === groupedData[0]?.year &&
                                  monthGroup.month === yearGroup.months[0]?.month &&
                                  idx === 0;

                                const tooltipText = compareMode
                                  ? isSelected
                                    ? "Đây là kỳ gốc đang được chọn"
                                    : isCompared
                                    ? "Đang đối chiếu với kỳ này"
                                    : "Bấm để chọn làm kỳ đối chiếu"
                                  : isSelected
                                  ? "Đang xem kỳ này trên bản đồ"
                                  : `Chọn kỳ ${formatRunLabel(run, { includeTime: false, includeArea: false })} để hiển thị lớp bản đồ tương ứng`;

                                return (
                                  <Tooltip key={run.id}>
                                    <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => handleCardClick(normalizeId(run.id))}
                                    className={`w-full min-w-0 box-border flex flex-col gap-1 rounded-lg p-2 text-left transition-all focus:outline-hidden ${
                                      isSelected
                                        ? "border border-info bg-info/15 text-info shadow-xs ring-1 ring-info/30"
                                        : isCompared
                                        ? "border border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30"
                                        : "border border-border/60 bg-background hover:bg-muted/70 text-foreground hover:border-info/40"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-1 w-full min-w-0">
                                      <div className="flex items-center gap-1 min-w-0 flex-1">
                                        <span className="font-semibold text-xs truncate text-foreground">
                                          {formatRunLabel(run, { includeTime: false, includeArea: false })}
                                        </span>
                                        {isLatest && !searchQuery && (
                                          <Badge
                                            variant="default"
                                            className="h-3.5 px-1 text-[8px] bg-info text-info-foreground shrink-0"
                                          >
                                            Mới nhất
                                          </Badge>
                                        )}
                                      </div>

                                      <Badge
                                        variant="outline"
                                        className={`text-[9px] h-4 shrink-0 font-medium ${severity.badgeClass}`}
                                      >
                                        {area != null ? `${area.toFixed(1)} ha` : run.status}
                                      </Badge>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground w-full min-w-0">
                                      {run.finishedAt && (
                                        <span className="flex items-center gap-0.5 shrink-0">
                                          <Clock className="size-2.5" />
                                          {new Date(run.finishedAt).toLocaleTimeString("vi-VN", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </span>
                                      )}
                                      {pop != null && (
                                        <span className="flex items-center gap-0.5 shrink-0">
                                          <Users className="size-2.5" />
                                          {pop.toLocaleString("vi-VN")} người
                                        </span>
                                      )}
                                      {isSelected && (
                                        <span className="font-semibold text-info shrink-0 ml-auto">
                                          ✓ Đang chọn
                                        </span>
                                      )}
                                      {isCompared && (
                                        <span className="font-semibold text-amber-600 dark:text-amber-400 shrink-0 ml-auto">
                                          ✓ Đang đối chiếu
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">{tooltipText}</TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
