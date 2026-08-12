import { Layers, Waves, Satellite, TreePine, History } from "lucide-react";
import { DataLayers } from "@/components/Map/Sidebar/elements/Datalyer";
import { FloodHydrology } from "@/components/Map/Sidebar/elements/FloodHydrology";
import { SingleMode } from "@/components/Map/Sidebar/elements/SatelliteControll";
import { ForestClassification } from "@/components/Map/Sidebar/elements/ForestClassification";
import { TimeSeries } from "@/components/Map/Sidebar/elements/TimeSeries";

export const trackMapping = [
  {
    id: "layers",
    icon: Layers,
    label: "Lớp dữ liệu bản đồ",
    color: "text-blue-500",
    component: DataLayers,
    default: true,
  },
  {
    id: "flood-hydrology",
    icon: Waves,
    label: "Ngập lụt và thủy văn",
    component: FloodHydrology,
    color: "text-sky-600",
  },

  {
    id: "forestClassification",
    icon: TreePine,
    label: "Phân loại rừng",
    component: ForestClassification,
    color: "text-green-600",
  },
  {
    id: "timeSeries",
    icon: History,
    label: "Ảnh theo thời gian",
    component: TimeSeries,
    color: "text-purple-500",
  },
  {
    id: "spatial-analysis",
    icon: Satellite,
    label: "Phân tích ảnh vệ tinh",
    component: SingleMode,
    color: "text-indigo-500",
  },
];
