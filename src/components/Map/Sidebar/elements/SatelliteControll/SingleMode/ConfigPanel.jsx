import React, { useState, useCallback, useEffect } from "react";
import {
  Play,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Settings,
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
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSatelliteStore } from "@/stores/Map/Sidebar/useSatelliteStore";
import { useLoadingStore } from "@/stores/common/useLoadingStore";
import { SINGLE_LAYER_ENTRIES, LAYER_CONFIG } from "../shared/layerConfig";
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
/**
 * Configuration panel for SingleMode: date range, layer selection, settings, and actions.
 */
function ConfigPanel() {
  const [open, setOpen] = useState(true);
  const [selectedLayers, setSelectedLayers] = useState(["rgb"]);

  const {
    startDate,
    endDate,
    collection,
    cloudCover,
    isLoading,
    setStartDate,
    setEndDate,
    setCollection,
    setCloudCover,
    setIsLoading,
    setError,
    setAnalysisData,
    syncSingleImagesFromResults,
    setIsCompareMode,
    clearData,
    reset,
  } = useSatelliteStore();

  const { setLoading } = useLoadingStore();

  // Khi vào SingleMode, chuyển mode về single (xóa ảnh compare nếu đang ở compare)
  useEffect(() => {
    setIsCompareMode(false);
  }, [setIsCompareMode]);

  const handleLayerToggle = (layerId) => {
    setSelectedLayers((prev) =>
      prev.includes(layerId)
        ? prev.filter((l) => l !== layerId)
        : [...prev, layerId],
    );
  };

  const handleStartDateChange = (e) => {
    const newDate = parseDateInputValue(e.target.value);
    if (!newDate) {
      setError(LABELS.errorInvalidDate);
      return;
    }

    if (newDate < endDate) {
      setStartDate(newDate);
      setError(null);
    } else {
      setError(LABELS.errorDateOrder);
    }
  };

  const handleEndDateChange = (e) => {
    const newDate = parseDateInputValue(e.target.value);
    if (!newDate) {
      setError(LABELS.errorInvalidDate);
      return;
    }

    if (newDate > startDate) {
      setEndDate(newDate);
      setError(null);
    } else {
      setError(LABELS.errorDateOrder);
    }
  };

  const handleAnalyze = useCallback(async () => {
    if (selectedLayers.length === 0) {
      setError(LABELS.errorNoLayer);
      return;
    }
    if (!isValidDateObject(startDate) || !isValidDateObject(endDate)) {
      setError(LABELS.errorInvalidDate);
      return;
    }

    if (startDate >= endDate) {
      setError(LABELS.errorDateOrder);
      return;
    }

    setIsLoading(true);
    setLoading(true);
    setError(null);

    try {
      const params = {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        collection,
        cloudCover,
      };

      // Load selected regular layers
      const results = {};
      for (const layerId of selectedLayers) {
        try {
          const result = await LAYER_CONFIG[layerId].service(params);
          results[layerId] = result?.data || result;
        } catch (err) {
          console.error(`[${layerId}]`, err);
          results[layerId] = { error: err.message };
        }
      }

      if (selectedLayers.length > 0) {
        setAnalysisData(results);
        syncSingleImagesFromResults(results, {
          startDate,
          endDate,
          collection,
          cloudCover,
        });
      }
    } catch (err) {
      console.error("Analysis Error:", err);
      setError(err.message || LABELS.errorGeneric);
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  }, [
    selectedLayers,
    startDate,
    endDate,
    collection,
    cloudCover,
    setIsLoading,
    setError,
    setAnalysisData,
    syncSingleImagesFromResults,
    setLoading,
  ]);

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
            {LABELS.configTitle}
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
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {LABELS.timeRange}
            </h4>
            <div className="space-y-2">
              <div>
                <Label htmlFor="satellite-single-start" className="mb-1 text-xs text-muted-foreground">
                  {LABELS.from}
                </Label>
                <Input
                  id="satellite-single-start"
                  type="date"
                  variant="filled"
                  value={formatDateForInput(startDate)}
                  onChange={handleStartDateChange}
                  disabled={isLoading}
                  className="text-xs h-8"
                />
              </div>
              <div>
                <Label htmlFor="satellite-single-end" className="mb-1 text-xs text-muted-foreground">
                  {LABELS.to}
                </Label>
                <Input
                  id="satellite-single-end"
                  type="date"
                  variant="filled"
                  value={formatDateForInput(endDate)}
                  onChange={handleEndDateChange}
                  disabled={isLoading}
                  className="text-xs h-8"
                />
              </div>
            </div>
          </div>

          {/* Layer Types */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {LABELS.layerTypes}
            </h4>
            <div className="space-y-2">
              {SINGLE_LAYER_ENTRIES.map(([layerId, config]) => (
                <Tooltip key={layerId} delayDuration={200}>
                  <TooltipTrigger asChild>
                    <Label
                      htmlFor={`satellite-single-layer-${layerId}`}
                      className={`flex items-center gap-2 rounded border p-2 transition-colors ${
                        isLoading
                          ? "cursor-not-allowed bg-muted/50 opacity-50"
                          : "cursor-pointer border-border/50 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <Checkbox
                          id={`satellite-single-layer-${layerId}`}
                          checked={selectedLayers.includes(layerId)}
                          onCheckedChange={() => handleLayerToggle(layerId)}
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
              <Label htmlFor="satellite-single-collection" className="text-xs text-muted-foreground">
                {LABELS.collection}
              </Label>
              <Select
                value={collection}
                onValueChange={setCollection}
                disabled={isLoading}
              >
                <SelectTrigger
                  id="satellite-single-collection"
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
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Nguồn dữ liệu và tỷ lệ mây chỉ áp dụng cho Ảnh Màu, Chỉ số thực
              vật và Ảnh Nhiệt.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="gradient-primary"
              onClick={handleAnalyze}
              disabled={isLoading || selectedLayers.length === 0}
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
                reset();
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
