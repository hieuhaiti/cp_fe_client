import { useEffect, useMemo } from "react";
import { AlertTriangle, Globe2, Palette } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import LoadingInline from "@/components/common/LoadingInline";
import { useDebounceStore } from "@/stores/common/useDebounceStore";
import { useMapStyleStore } from "@/stores/Map/Sidebar/useMapStyleStore";
import { mapStyles } from "@/constant/styleChangeData";
import {
  extractWebMapItems,
  normalizeWebMapBasemap,
  useGetMapBasemapsQuery,
} from "@/services/mapLayersService";

function createRasterStyle(basemap) {
  const sourceId = `web-map-basemap-${basemap.code}`;
  const layerId = `${sourceId}-raster`;

  return {
    version: 8,
    sources: {
      [sourceId]: {
        type: "raster",
        tiles: [basemap.url_template],
        tileSize: 256,
        minzoom: basemap.min_zoom ?? 0,
        maxzoom: basemap.max_zoom ?? 22,
        attribution: basemap.attribution || "",
      },
    },
    layers: [
      {
        id: layerId,
        type: "raster",
        source: sourceId,
        minzoom: basemap.min_zoom ?? 0,
        maxzoom: basemap.max_zoom ?? 22,
      },
    ],
  };
}

export function StyleChange() {
  // Style state
  const selectedStyle = useMapStyleStore((s) => s.mapStyle);
  const setMapStyle = useMapStyleStore((s) => s.setMapStyle);

  const terrainState = useMapStyleStore((s) => s.terrainState);
  const terrainSupported = useMapStyleStore((s) => s.terrainSupported);
  const terrainLoading = useMapStyleStore((s) => s.terrainLoading);
  const setTerrainState = useMapStyleStore((s) => s.setTerrainState);

  const clickedPointMode = useMapStyleStore((s) => s.clickedPointMode);

  const basemapQuery = useGetMapBasemapsQuery({ staleTime: 2 * 60 * 1000 });
  const basemaps = useMemo(
    () =>
      extractWebMapItems(basemapQuery.data)
        .map(normalizeWebMapBasemap)
        .filter((basemap) => basemap.url_template)
        .map((basemap) => ({ ...basemap, style: createRasterStyle(basemap) })),
    [basemapQuery.data],
  );

  const { debounce, isDebouncing, clearAllDebounce } = useDebounceStore();
  const isTerrainDisabled = terrainLoading || !terrainSupported;

  useEffect(() => {
    return () => {
      clearAllDebounce();
    };
  }, [clearAllDebounce]);

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <Palette className="w-5 h-5" />
        Kiểu bản đồ
      </h2>

      {/* Map Style Selection */}
      {clickedPointMode && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-(--warning-subtle) p-3 text-(--warning-subtle-foreground)">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="text-sm font-medium">Chế độ xem AQI đang bật.</p>
            <p className="mt-0.5 text-xs opacity-80">
              Tắt chế độ để thay đổi kiểu bản đồ.
            </p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {mapStyles.map((mapStyle) => {
          const isStyleChanging = isDebouncing("mapStyleChange");
          const isDisabled = isStyleChanging || clickedPointMode;

          return (
            <Tooltip key={mapStyle.name}>
              <TooltipTrigger asChild>
                <Button
                  variant={
                    !isDisabled && selectedStyle === mapStyle.style
                      ? "soft-primary"
                      : "outline"
                  }
                  size="sm"
                  disabled={isDisabled}
                  className={`flex flex-col items-center w-full h-auto gap-1 p-2 rounded-lg ${
                    isDisabled
                      ? "opacity-50 cursor-not-allowed"
                      : selectedStyle === mapStyle.style
                        ? "cursor-not-allowed"
                        : "cursor-pointer"
                  }`}
                  onClick={() => {
                    if (isDisabled || selectedStyle === mapStyle.style) return;
                    setMapStyle(mapStyle.style);
                    debounce("mapStyleChange", () => {}, 1500);
                  }}
                >
                  <mapStyle.icon className="w-5 h-5" />
                  <span className="text-xs leading-tight text-center">
                    {mapStyle.name}
                  </span>
                </Button>
              </TooltipTrigger>

              <TooltipContent>
                {clickedPointMode
                  ? "Tắt chế độ AQI để thay đổi"
                  : mapStyle.description}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {basemaps.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Bản đồ nền</p>
          <div className="grid grid-cols-2 gap-2">
            {basemaps.map((basemap) => {
              const isStyleChanging = isDebouncing("mapStyleChange");
              const isDisabled = isStyleChanging || clickedPointMode;
              const isSelected = selectedStyle === basemap.style;

              return (
                <Tooltip key={basemap.code}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={!isDisabled && isSelected ? "soft-primary" : "outline"}
                      size="sm"
                      disabled={isDisabled}
                      className="flex h-auto w-full flex-col items-center gap-1 rounded-lg p-2"
                      onClick={() => {
                        if (isDisabled || isSelected) return;
                        setMapStyle(basemap.style, { terrainSupported: false });
                        debounce("mapStyleChange", () => {}, 1500);
                      }}
                    >
                      <Globe2 className="h-5 w-5" />
                      <span className="text-center text-xs leading-tight">{basemap.name_vi}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{basemap.attribution || basemap.provider || basemap.name_vi}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Display Options */}
      <div className="space-y-2">
        {/* 3D Terrain Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Label
              htmlFor="terrain"
              aria-disabled={isTerrainDisabled}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                isTerrainDisabled
                  ? "cursor-not-allowed border-border/60 bg-muted/80"
                  : "cursor-pointer border-border bg-card hover:bg-accent/10"
              }`}
            >
              <Checkbox
                id="terrain"
                checked={terrainSupported && terrainState}
                disabled={isTerrainDisabled}
                onCheckedChange={(checked) => {
                  if (!terrainSupported) return;
                  const nextTerrainState = checked === true;
                  setTerrainState(nextTerrainState);
                }}
              />
              <div className="flex flex-1 flex-col">
                <span
                  className={`text-sm font-medium ${
                    isTerrainDisabled ? "text-muted-foreground" : "text-foreground"
                  }`}
                >
                  Hiển thị địa hình 3D
                </span>
                <span className="text-xs text-muted-foreground">
                  Bật/tắt hiển thị địa hình 3D
                </span>
              </div>
              {terrainLoading && <LoadingInline size="small" />}
            </Label>
          </TooltipTrigger>
          {!terrainSupported && (
            <TooltipContent>Bản đồ nền dùng tile không hỗ trợ địa hình 3D.</TooltipContent>
          )}
        </Tooltip>
      </div>
    </div>
  );
}
