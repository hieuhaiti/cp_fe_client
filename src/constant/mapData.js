// Tọa độ fallback không chính thức lấy từ kết quả tìm kiếm Cẩm Phả đã kiểm chứng.
// Khi backend trả extent/bbox của lớp, MapComponent luôn ưu tiên extent đó.
export const mapDelta = 0.45;

export const defaultLatLong = { lat: 21.10361, lng: 107.283749 };
export const defaultZoom = 11;
export const defaultStyle = import.meta.env.VITE_MAPBOX_STYLE_Outdoor;

export const stateBuildingRender = false;
export const stateTerrainRender = false;
