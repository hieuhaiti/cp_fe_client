import React, { useState, useCallback, useEffect } from "react";
import {
  Play,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Settings,
  Calendar,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import { useSatelliteStore } from "@/stores/Map/Sidebar/useSatelliteStore";
import { useMapStore } from "@/stores/Map/useMapStore";
import { useLoadingStore } from "@/stores/common/useLoadingStore";
import { COMPARE_LAYER_ENTRIES, LAYER_CONFIG } from "../shared/layerConfig";
import {
  formatDateForInput,
  isValidDateObject,
  parseDateInputValue,
} from "../shared/utils";
import { WarningBanner } from "../shared/WarningBanner";
import {
  LABELS,
  COLLECTION_OPTIONS,
  CLOUD_COVER_MIN,
  CLOUD_COVER_MAX,
} from "../shared/constants";
import { Slider } from "@/components/ui/slider";

/**
 * Configuration panel for CompareMode.
 * Includes two stacked date-range cards (Period 1 / Period 2),
 * layer checkboxes, collection selector, and cloud-cover slider.
 */
function ConfigPanel() {
  const {
    startDate1,
    endDate1,
    startDate2,
    endDate2,
    collection,
    cloudCover,
    activeLayerTypes,
    isLoading,
    setStartDate1,
    setEndDate1,
    setStartDate2,
    setEndDate2,
    setCollection,
    setCloudCover,
    toggleLayerType,
    setIsLoading,
    setError,
    setPeriod1Data,
    setPeriod2Data,
    setIsCompareMode,
    clearPeriodData,
    clearData,
    resetCompareSettings,
  } = useSatelliteStore();
  const setSplitMode = useMapStore((s) => s.setSplitMode);

  const [open, setOpen] = useState(true);
  const [comparisonNoteOpen, setComparisonNoteOpen] = useState(false);

  const { setLoading } = useLoadingStore();

  useEffect(() => {
    setIsCompareMode(true);
    setSplitMode(true);
    return () => setSplitMode(false);
  }, [setIsCompareMode, setSplitMode]);

  const handlePeriodDateChange = useCallback(
    ({ value, pairDate, isStart, applyDate }) => {
      const parsedDate = parseDateInputValue(value);
      if (!parsedDate) {
        setError(LABELS.errorInvalidDate);
        return;
      }

      const isOrderValid = isStart
        ? parsedDate < pairDate
        : parsedDate > pairDate;
      if (!isOrderValid) {
        setError(LABELS.errorDateOrder);
        return;
      }

      applyDate(parsedDate);
      setError(null);
    },
    [setError],
  );

  const handleAnalyze = useCallback(async () => {
    if (activeLayerTypes.size === 0) {
      setError(LABELS.errorNoLayer);
      return;
    }
    const hasInvalidDates =
      !isValidDateObject(startDate1) ||
      !isValidDateObject(endDate1) ||
      !isValidDateObject(startDate2) ||
      !isValidDateObject(endDate2);
    if (hasInvalidDates) {
      setError(LABELS.errorInvalidDate);
      return;
    }

    if (startDate1 >= endDate1 || startDate2 >= endDate2) {
      setError(LABELS.errorDateOrder);
      return;
    }

    setIsLoading(true);
    setLoading(true);
    setError(null);
    clearPeriodData();

    try {
      const params1 = {
        startDate: startDate1.toISOString().split("T")[0],
        endDate: endDate1.toISOString().split("T")[0],
        collection,
        cloudCover,
      };
      const params2 = {
        startDate: startDate2.toISOString().split("T")[0],
        endDate: endDate2.toISOString().split("T")[0],
        collection,
        cloudCover,
      };

      // Each period is independent. Fetch pairs in parallel so a failed layer
      // does not hide its counterpart or the other selected layer types.
      await Promise.all(
        [...activeLayerTypes].map(async (layerType) => {
          const service = LAYER_CONFIG[layerType].service;
          const [first, second] = await Promise.allSettled([
            service(params1),
            service(params2),
          ]);

          if (first.status === "fulfilled") {
            setPeriod1Data(layerType, first.value?.data || first.value);
          } else {
            console.error(`[${layerType}:left]`, first.reason);
            setPeriod1Data(layerType, { error: first.reason?.message });
          }

          if (second.status === "fulfilled") {
            setPeriod2Data(layerType, second.value?.data || second.value);
          } else {
            console.error(`[${layerType}:right]`, second.reason);
            setPeriod2Data(layerType, { error: second.reason?.message });
          }
        }),
      );
    } catch (err) {
      setError(err.message || LABELS.errorGeneric);
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  }, [
    activeLayerTypes,
    startDate1,
    endDate1,
    startDate2,
    endDate2,
    collection,
    cloudCover,
    setIsLoading,
    setError,
    setPeriod1Data,
    setPeriod2Data,
    setLoading,
    clearPeriodData,
  ]);

  const applySamePeriodLastYear = () => {
    const previousStart = new Date(startDate1);
    previousStart.setFullYear(previousStart.getFullYear() - 1);
    const previousEnd = new Date(endDate1);
    previousEnd.setFullYear(previousEnd.getFullYear() - 1);
    setStartDate2(previousStart);
    setEndDate2(previousEnd);
    setError(null);
  };
  const period1Days = Math.round((endDate1 - startDate1) / 86_400_000);
  const period2Days = Math.round((endDate2 - startDate2) / 86_400_000);
  const sameSeason =
    startDate1.getMonth() === startDate2.getMonth() &&
    endDate1.getMonth() === endDate2.getMonth();

  return (
    <Card className="gap-0 overflow-hidden py-0">
      {/* Header - always visible */}
      <Button
        type="button"
        variant={open ? "soft-primary" : "outline"}
        onClick={() => setOpen(!open)}
        className="h-auto w-full justify-between rounded-none px-3 py-2"
        aria-expanded={open}
      >
        <div className="flex flex-1 items-center gap-2">
          <Settings size={16} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">
            {LABELS.configCompareTitle}
          </span>
        </div>
        {open ? (
          <ChevronUp size={16} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={16} className="text-muted-foreground" />
        )}
      </Button>

      {/* Warning banner - always visible */}
      <WarningBanner />

      {/* Collapsible content */}
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? "1000px" : "0px" }}
      >
        <div className="border-t border-border px-3 py-3 space-y-3">
          {/* Date Range */}
          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Calendar size={13} />
              {LABELS.timeRangeCompare}
            </h4>

            {/* Period 1 */}
            <div className="space-y-2 rounded-lg border border-info/25 bg-(--info-subtle) p-2.5">
              <p className="text-xs font-semibold text-(--info-subtle-foreground)">
                {LABELS.period1}
              </p>
              <div className="space-y-1.5">
                <div>
                  <Label htmlFor="satellite-compare-start-1" className="mb-1 text-xs text-muted-foreground">
                    {LABELS.from}
                  </Label>
                  <Input
                    id="satellite-compare-start-1"
                    type="date"
                    variant="filled"
                    value={formatDateForInput(startDate1)}
                    onChange={(e) =>
                      handlePeriodDateChange({
                        value: e.target.value,
                        pairDate: endDate1,
                        isStart: true,
                        applyDate: setStartDate1,
                      })
                    }
                    disabled={isLoading}
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <Label htmlFor="satellite-compare-end-1" className="mb-1 text-xs text-muted-foreground">
                    {LABELS.to}
                  </Label>
                  <Input
                    id="satellite-compare-end-1"
                    type="date"
                    variant="filled"
                    value={formatDateForInput(endDate1)}
                    onChange={(e) =>
                      handlePeriodDateChange({
                        value: e.target.value,
                        pairDate: startDate1,
                        isStart: false,
                        applyDate: setEndDate1,
                      })
                    }
                    disabled={isLoading}
                    className="text-xs h-8"
                  />
                </div>
              </div>
            </div>

            {/* Period 2 */}
            <div className="space-y-2 rounded-lg border border-warning/25 bg-(--warning-subtle) p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="shrink-0 text-xs font-semibold text-(--warning-subtle-foreground)">
                  {LABELS.period2}
                </p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={applySamePeriodLastYear}
                      disabled={isLoading}
                      className="h-auto max-w-[65%] whitespace-normal px-2 py-1 text-right text-[10px] leading-tight"
                    >
                      Đặt kỳ đối chiếu nhanh
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Đặt kỳ đối chiếu nhanh</TooltipContent>
                </Tooltip>
              </div>
              <div className="space-y-1.5">
                <div>
                  <Label htmlFor="satellite-compare-start-2" className="mb-1 text-xs text-muted-foreground">
                    {LABELS.from}
                  </Label>
                  <Input
                    id="satellite-compare-start-2"
                    type="date"
                    variant="filled"
                    value={formatDateForInput(startDate2)}
                    onChange={(e) =>
                      handlePeriodDateChange({
                        value: e.target.value,
                        pairDate: endDate2,
                        isStart: true,
                        applyDate: setStartDate2,
                      })
                    }
                    disabled={isLoading}
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <Label htmlFor="satellite-compare-end-2" className="mb-1 text-xs text-muted-foreground">
                    {LABELS.to}
                  </Label>
                  <Input
                    id="satellite-compare-end-2"
                    type="date"
                    variant="filled"
                    value={formatDateForInput(endDate2)}
                    onChange={(e) =>
                      handlePeriodDateChange({
                        value: e.target.value,
                        pairDate: startDate2,
                        isStart: false,
                        applyDate: setEndDate2,
                      })
                    }
                    disabled={isLoading}
                    className="text-xs h-8"
                  />
                </div>
              </div>
            </div>

            <aside
              role="note"
              className={`rounded-lg border p-2.5 text-[11px] leading-relaxed ${
                sameSeason && period1Days === period2Days
                  ? "border-success/30 bg-(--success-subtle) text-(--success-subtle-foreground)"
                  : "border-warning/30 bg-(--warning-subtle) text-(--warning-subtle-foreground)"
              }`}
            >
              <Button
                type="button"
                variant="ghost-transparent"
                size="sm"
                onClick={() => setComparisonNoteOpen((value) => !value)}
                className="h-auto w-full justify-start gap-1.5 whitespace-normal p-0 text-left text-[11px] text-current"
                aria-expanded={comparisonNoteOpen}
                aria-controls="comparison-period-note"
              >
                <Info className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1">
                  {sameSeason && period1Days === period2Days
                    ? "Hai khoảng thời gian tương đồng"
                    : "Nên chọn cùng mùa và cùng số ngày"}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                    comparisonNoteOpen ? "rotate-180" : ""
                  }`}
                />
              </Button>
              <div
                id="comparison-period-note"
                aria-hidden={!comparisonNoteOpen}
                className={`grid transition-all duration-200 ${
                  comparisonNoteOpen
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="mt-1 text-current">
                    So sánh cùng thời gian giữa hai năm giúp giảm chênh lệch tự
                    nhiên do mùa. Mây và số lượng ảnh khác nhau vẫn có thể làm
                    màu sắc hoặc chỉ số thay đổi.
                  </p>
                </div>
              </div>
            </aside>
          </div>

          {/* Layer Types */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {LABELS.layerTypes}
            </h4>
            <div className="space-y-2">
              {COMPARE_LAYER_ENTRIES.map(([layerId, config]) => (
                <Tooltip key={layerId} delayDuration={200}>
                  <TooltipTrigger asChild>
                    <Label
                      htmlFor={`satellite-compare-layer-${layerId}`}
                      className={`flex items-center gap-2 rounded border p-2 transition-colors ${
                        isLoading
                          ? "cursor-not-allowed bg-muted/50 opacity-50"
                          : "cursor-pointer border-border/50 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <Checkbox
                          id={`satellite-compare-layer-${layerId}`}
                          checked={activeLayerTypes.has(layerId)}
                          onCheckedChange={() => toggleLayerType(layerId)}
                          disabled={isLoading}
                          className="h-4 w-4"
                        />
                        <div
                          className={`w-3 h-3 rounded-full ${config.color}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground">
                            {config.label}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {config.description}
                          </p>
                        </div>
                      </div>
                    </Label>
                  </TooltipTrigger>
                  {isLoading && (
                    <TooltipContent className="text-xs">
                      {LABELS.loadingTooltip}
                    </TooltipContent>
                  )}
                </Tooltip>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {LABELS.settings}
            </h4>
            <div className="space-y-1.5">
              <Label htmlFor="satellite-compare-collection" className="text-xs text-muted-foreground">
                {LABELS.collection}
              </Label>
              <Select
                value={collection}
                onValueChange={setCollection}
                disabled={isLoading}
              >
                <SelectTrigger
                  id="satellite-compare-collection"
                  size="sm"
                  variant="filled"
                  className="w-full text-xs"
                >
                  <SelectValue placeholder="Chọn nguồn dữ liệu" />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  {COLLECTION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground">
                  {LABELS.cloudCover}
                </Label>
                <Badge variant="soft-primary" className="text-[10px]">
                  {cloudCover}%
                </Badge>
              </div>
              <Slider
                min={CLOUD_COVER_MIN}
                max={CLOUD_COVER_MAX}
                step={5}
                value={[cloudCover]}
                onValueChange={(vals) => setCloudCover(vals[0])}
                disabled={isLoading}
                className="w-full"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="gradient-info"
              onClick={handleAnalyze}
              disabled={isLoading || activeLayerTypes.size === 0}
              isLoading={isLoading}
              className="flex-1 gap-2 h-8"
            >
              {!isLoading && <Play size={14} />}
              <span className="text-xs">
                {isLoading ? LABELS.loading : LABELS.loadImage}
              </span>
            </Button>
            <Button
              onClick={() => {
                clearData();
                resetCompareSettings();
              }}
              variant="outline"
              disabled={isLoading}
              className="flex-1 gap-2 h-8"
            >
              <RotateCcw size={14} />
              <span className="text-xs">{LABELS.reset}</span>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default ConfigPanel;
