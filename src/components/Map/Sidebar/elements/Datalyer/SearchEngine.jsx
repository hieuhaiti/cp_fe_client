import { useState, useRef, useCallback, useEffect } from "react";
import { Search, X, MapPin, ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import LoadingInline from "@/components/common/LoadingInline";
import { useSearchMapFeaturesQuery } from "@/services/mapLayersService";
import { useMapStore } from "@/stores/Map/useMapStore";
import { useDataLayerStore } from "@/stores/Map/Sidebar/useDataLayerStore";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function resultIdOf(result) {
  return result?.id ?? result?.featureId ?? result?.properties?.id ?? null;
}

function resultLabelOf(result) {
  return (
    result?.properties?.name ||
    result?.name ||
    result?.properties?.label ||
    (resultIdOf(result) ? `Đối tượng #${resultIdOf(result)}` : "Đối tượng")
  );
}

export function SearchEngine() {
  const [searchValue, setSearchValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const inputRef = useRef(null);
  const suggestionListRef = useRef(null);

  const debouncedKeyword = useDebounce(searchValue, 400);
  const searchText = debouncedKeyword?.trim();
  const { data, isLoading } = useSearchMapFeaturesQuery(searchText, {
    enabled: Boolean(searchText),
  });

  useEffect(() => {
    setSearchResults(
      data?.data?.items ??
        data?.data?.features ??
        data?.items ??
        data?.features ??
        [],
    );
  }, [data]);

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchValue(value);
    setShowSuggestions(value.length > 0);
  };

  const handleInputFocus = () => {
    setInputFocused(true);
    if (searchValue) setShowSuggestions(true);
  };

  const handleInputBlur = () => {
    setTimeout(() => setInputFocused(false), 200);
  };

  const handleSelectResult = useCallback((result) => {
    const feature = result?.feature || result;
    const featureId = resultIdOf(feature);
    const layerId = feature?.layerId || feature?.layer_id || feature?.properties?.layerId;
    setLoadingId(featureId);

    try {
      const layerStore = useDataLayerStore.getState();
      const ogcLayer = layerStore.ogcLayers.find(
        (layer) =>
          String(layer.id) === String(layerId) ||
          String(layer.code) === String(layerId),
      );
      if (ogcLayer && !ogcLayer.enabled) {
        layerStore.toggleOgcLayerEnabled(ogcLayer.id, true);
      }

      if (feature?.geometry) {
        useMapStore.getState().setHighlightedFeature({
          type: feature.type || "Feature",
          properties: {
            ...feature.properties,
            name: resultLabelOf(feature),
            layerId,
          },
          geometry: feature.geometry,
        });
      }

      setSearchValue("");
      setShowSuggestions(false);
    } catch (error) {
      console.warn("Không thể chọn kết quả tìm kiếm bản đồ:", error.message);
    } finally {
      setLoadingId(null);
    }
  }, []);

  const handleClearSearch = () => {
    setSearchValue("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <Search className="h-5 w-5" />
        Tìm kiếm
      </h2>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Tìm kiếm đối tượng bản đồ..."
          value={searchValue}
          onChange={handleSearchChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="pl-9 pr-9"
        />
        {searchValue && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={handleClearSearch}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full"
                aria-label="Xóa nội dung tìm kiếm"
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Xóa nội dung tìm kiếm</TooltipContent>
          </Tooltip>
        )}

        {showSuggestions && (inputFocused || searchResults.length > 0) && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-lg border border-border bg-background shadow-lg">
            {isLoading ? (
              <div className="flex items-center justify-center px-3 py-6">
                <LoadingInline size="small" />
              </div>
            ) : searchResults.length === 0 && debouncedKeyword ? (
              <div className="px-3 py-4 text-center text-muted-foreground">
                <MapPin className="mx-auto mb-2 h-6 w-6 opacity-50" />
                <p className="text-sm">Không tìm thấy kết quả phù hợp</p>
              </div>
            ) : (
              <div ref={suggestionListRef} className="py-1.5">
                {searchResults.map((result) => {
                  const resultId = resultIdOf(result);
                  return (
                    <Button
                      type="button"
                      variant="outline"
                      key={resultId}
                      onClick={() => handleSelectResult(result)}
                      disabled={loadingId === resultId}
                      className="h-auto w-full justify-start gap-3 rounded-sm px-3 py-2 text-left"
                    >
                      <MapPin className="h-5 w-5 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-foreground">
                          {resultLabelOf(result)}
                        </div>
                      </div>
                      {loadingId === resultId ? (
                        <LoadingInline size="small" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
