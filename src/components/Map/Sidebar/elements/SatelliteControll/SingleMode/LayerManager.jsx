import React, { useState } from "react";
import { ChevronDown, ChevronUp, Layers } from "lucide-react";
import { useSatelliteStore } from "@/stores/Map/Sidebar/useSatelliteStore";
import { LAYER_CONFIG } from "../shared/layerConfig";
import LayerControl from "../shared/LayerControl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Manages all loaded satellite layers in SingleMode.
 * Displays a collapsible list of LayerControl cards.
 */
function LayerManager() {
  const [open, setOpen] = useState(true);
  const [layerOpacity, setLayerOpacity] = useState({});
  const [layerVisibility, setLayerVisibility] = useState({});

  const satelliteLayers = useSatelliteStore((s) => s.satelliteLayers);
  const updateLayerOpacity = useSatelliteStore((s) => s.updateLayerOpacity);
  const updateLayerVisibility = useSatelliteStore(
    (s) => s.updateLayerVisibility,
  );

  if (!satelliteLayers || satelliteLayers.length === 0) return null;

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
            {satelliteLayers.length}
          </Badge>
        </div>
        {open ? (
          <ChevronUp size={16} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={16} className="text-muted-foreground" />
        )}
      </Button>

      {open && (
        <div className="border-t border-border px-3 py-3 space-y-2 max-h-96 overflow-y-auto">
          {satelliteLayers.map((layer, idx) => (
            <LayerControl
              key={layer.id}
              layer={layer}
              index={idx}
              config={LAYER_CONFIG[layer.layerType]}
              opacity={layerOpacity[layer.id] ?? layer.layerOpacity ?? 1}
              onOpacityChange={(newOpacity) => {
                setLayerOpacity((prev) => ({
                  ...prev,
                  [layer.id]: newOpacity,
                }));
                updateLayerOpacity(layer.id, newOpacity);
              }}
              visible={layerVisibility[layer.id] ?? layer.visible ?? true}
              onVisibilityChange={(vis) => {
                setLayerVisibility((prev) => ({ ...prev, [layer.id]: vis }));
                updateLayerVisibility(layer.id, vis);
              }}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

export default LayerManager;
