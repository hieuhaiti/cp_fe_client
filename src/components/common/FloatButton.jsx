import { useMemo, useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import FeedbackForm from "@/components/feedback/FeedbackForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMapStore } from "@/stores/Map/useMapStore";

function getMapCenter(mapRefObj) {
  const map = mapRefObj?.current?.single || mapRefObj?.current;
  if (!map?.getCenter) return null;
  const center = map.getCenter();
  return { lng: center.lng, lat: center.lat };
}

export default function FloatButton() {
  const [open, setOpen] = useState(false);
  const clickedPoint = useMapStore((state) => state.clickedPoint);
  const mapRefObj = useMapStore((state) => state.mapRefObj);

  const initialCoordinates = useMemo(
    () => clickedPoint || getMapCenter(mapRefObj),
    [clickedPoint, mapRefObj],
  );

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="gradient-primary"
            size="icon-lg"
            className="fixed right-10 bottom-6 z-40 rounded-full shadow-lg"
            onClick={() => setOpen(true)}
            aria-label="Gửi phản ánh hiện trường"
          >
            <MessageSquarePlus className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">Gửi phản ánh hiện trường</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b border-border px-4 pb-4 pt-5 pr-12 text-left sm:px-6 sm:pt-6">
            <DialogTitle>Gửi phản ánh hiện trường</DialogTitle>
            <DialogDescription>
              Gửi thông tin kèm tọa độ và hình ảnh để cơ quan chức năng tiếp
              nhận xử lý.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-6 sm:pb-6">
            <FeedbackForm
              initialCoordinates={initialCoordinates}
              onSuccess={() => setOpen(false)}
              onCancel={() => setOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
