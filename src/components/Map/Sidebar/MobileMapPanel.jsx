import { ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trackMapping } from "@/constant/sidebarData";
import { useMapStore } from "@/stores/Map/useMapStore";
import HighlightHandle from "./elements/Datalyer/HighlightHandle";

export default function MobileMapPanel() {
  const activePanel = useMapStore((state) => state.activePanel);
  const setActivePanel = useMapStore((state) => state.setActivePanel);
  const highlightedFeature = useMapStore((state) => state.highlightedFeature);
  const activeItem =
    trackMapping.find((item) => item.id === activePanel) || trackMapping[0];
  const ActivePanel = activeItem?.component;

  if (!activeItem) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          id="mobile-map-functions-button"
          type="button"
          variant="default"
          className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full px-5 shadow-lg"
          aria-label="Mở chức năng bản đồ"
        >
          <activeItem.icon className="size-4" />
          Chức năng bản đồ
          <ChevronUp className="size-4" />
        </Button>
      </DialogTrigger>

      <DialogContent
        showCloseButton
        className="top-auto bottom-0 left-0 max-h-[min(78dvh,44rem)] w-full max-w-none translate-x-0 translate-y-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-0 rounded-t-2xl rounded-b-none p-0 sm:max-w-none"
      >
        <DialogHeader className="border-b border-border px-4 py-3 pr-12 text-left">
          <DialogTitle>Chức năng bản đồ</DialogTitle>
          <DialogDescription>
            Chọn công cụ, sau đó thao tác trong nội dung bên dưới.
          </DialogDescription>
        </DialogHeader>

        <div
          className="flex gap-2 overflow-x-auto border-b border-border px-3 py-2 [overscroll-behavior-x:contain]"
          role="tablist"
          aria-label="Danh sách chức năng bản đồ"
        >
          {trackMapping.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeItem.id;

            return (
              <Button
                key={item.id}
                id={`mobile-map-panel-${item.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                variant={isActive ? "soft-primary" : "ghost"}
                size="sm"
                className="h-auto min-w-24 shrink-0 flex-col gap-1 px-3 py-2 whitespace-normal"
                onClick={() => setActivePanel(item.id)}
              >
                <Icon className={`size-4 ${item.color || ""}`} />
                <span className="line-clamp-2 text-center text-xs leading-tight">
                  {item.label}
                </span>
              </Button>
            );
          })}
        </div>

        <div className="min-h-0 overflow-y-auto p-3 [overscroll-behavior:contain]">
          <div className="mb-3 flex items-center gap-2 border-b border-border pb-2">
            <activeItem.icon
              className={`size-4 shrink-0 ${activeItem.color || ""}`}
            />
            <h2 className="text-sm font-semibold text-foreground">
              {activeItem.label}
            </h2>
          </div>
          {ActivePanel && <ActivePanel />}
          {highlightedFeature && (
            <div className="mt-3 border-t border-border pt-3">
              <HighlightHandle />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
