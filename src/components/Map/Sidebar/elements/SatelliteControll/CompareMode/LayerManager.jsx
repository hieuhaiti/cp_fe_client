import React, { useState } from "react";
import { ChevronDown, ChevronUp, Layers } from "lucide-react";
import { useSatelliteStore } from "@/stores/Map/Sidebar/useSatelliteStore";
import { LAYER_CONFIG } from "../shared/layerConfig";
import LayerControl from "../shared/LayerControl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * 2-column layer manager for CompareMode.
 * Left column = Period 1 (splitSide "left"), Right = Period 2 (splitSide "right").
 */
function LayerManager() {
  const [open, setOpen] = useState(true);
  const [layerOpacity, setLayerOpacity] = useState({});
  const [layerVisibility, setLayerVisibility] = useState({});

  const images = useSatelliteStore((s) => s.images);
  const updateLayerOpacity = useSatelliteStore((s) => s.updateLayerOpacity);
  const updateLayerVisibility = useSatelliteStore(
    (s) => s.updateLayerVisibility,
  );

  const comparisonImages = images?.comparison || [];
  const leftLayers = comparisonImages.filter((l) => l.splitSide === "left");
  const rightLayers = comparisonImages.filter((l) => l.splitSide === "right");

  if (comparisonImages.length === 0) return null;

  const makeOpacityHandler = (layerId) => (newOpacity) => {
    setLayerOpacity((prev) => ({ ...prev, [layerId]: newOpacity }));
    updateLayerOpacity(layerId, newOpacity);
  };

  const makeVisibilityHandler = (layerId) => (vis) => {
    setLayerVisibility((prev) => ({ ...prev, [layerId]: vis }));
    updateLayerVisibility(layerId, vis);
  };

  const renderLayerList = (layers, accentClass) =>
    layers.length === 0 ? (
      <p className="text-xs italic text-muted-foreground">Chưa có dữ liệu</p>
    ) : (
      layers.map((layer) => (
        <LayerControl
          key={layer.id}
          layer={layer}
          config={LAYER_CONFIG[layer.layerType]}
          opacity={layerOpacity[layer.id] ?? layer.layerOpacity ?? 1}
          onOpacityChange={makeOpacityHandler(layer.id)}
          visible={layerVisibility[layer.id] ?? layer.visible ?? true}
          onVisibilityChange={makeVisibilityHandler(layer.id)}
          accentClass={accentClass}
          compact
          opacityLabel="Độ mờ"
        />
      ))
    );

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <Button
        type="button"
        variant={open ? "soft-primary" : "outline"}
        onClick={() => setOpen(!open)}
        className="h-auto w-full justify-between rounded-none px-3 py-2"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">
            Quản lý Layer
          </span>
          <Badge variant="soft-primary" className="text-[10px]">
            {comparisonImages.length}
          </Badge>
        </div>
        {open ? (
          <ChevronUp size={16} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={16} className="text-muted-foreground" />
        )}
      </Button>

      {open && (
        <div className="border-t border-border px-3 py-3">
          <div className="space-y-3">
            {/* Current period */}
            <div className="space-y-1.5">
              <p className="flex items-center gap-1 text-xs font-semibold text-info">
                <span className="inline-block size-2 rounded-full bg-info" />
                Kỳ hiện tại
              </p>
              {renderLayerList(leftLayers, "text-(--info-subtle-foreground) bg-(--info-subtle)")}
            </div>

            {/* Reference period */}
            <div className="space-y-1.5">
              <p className="flex items-center gap-1 text-xs font-semibold text-warning">
                <span className="inline-block size-2 rounded-full bg-warning" />
                Kỳ tham chiếu
              </p>
              {renderLayerList(rightLayers, "text-(--warning-subtle-foreground) bg-(--warning-subtle)")}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default LayerManager;
