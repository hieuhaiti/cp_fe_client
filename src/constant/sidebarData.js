import {
  GitCompareArrows,
  Layers,
  Waves,
  Satellite,
  TreePine,
} from "lucide-react";
import { DataLayers } from "@/components/Map/Sidebar/elements/Datalyer";
import { FloodHydrology } from "@/components/Map/Sidebar/elements/FloodHydrology";
import {
  CompareMode,
  SingleMode,
} from "@/components/Map/Sidebar/elements/SatelliteControll";
import { ForestClassification } from "@/components/Map/Sidebar/elements/ForestClassification";

export const trackMapping = [
  {
    id: "layers",
    icon: Layers,
    label: "Lớp dữ liệu bản đồ",
    description: "Tìm kiếm, bật tắt lớp dữ liệu và chọn bản đồ nền",
    color: "text-primary",
    component: DataLayers,
    default: true,
  },
  {
    id: "flood-hydrology",
    icon: Waves,
    label: "Ngập lụt và thủy văn",
    description: "Theo dõi hiện trạng, nguy cơ và tác động ngập lụt",
    component: FloodHydrology,
    color: "text-info",
  },

  {
    id: "forestClassification",
    icon: TreePine,
    label: "Phân loại đối tượng",
    description: "Xem kết quả phân loại lớp phủ rừng theo kỳ công bố",
    component: ForestClassification,
    color: "text-success",
  },
  {
    id: "spatial-analysis",
    icon: Satellite,
    label: "Phân tích ảnh vệ tinh",
    description: "Phân tích ảnh vệ tinh trong một khoảng thời gian",
    component: SingleMode,
    color: "text-primary",
  },
  {
    id: "compare-mode",
    icon: GitCompareArrows,
    label: "So sánh ảnh vệ tinh",
    description: "So sánh hai kỳ ảnh bằng bản đồ chia đôi",
    component: CompareMode,
    color: "text-primary",
  },
];
