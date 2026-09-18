/**
 * Quản lý chuẩn hóa ngôn ngữ giao diện WebGIS Client.
 * Chuyển đổi các thuật ngữ hạ tầng kỹ thuật, tên trường DB nội bộ và mã lỗi
 * sang tiếng Việt nghiệp vụ chuẩn hóa cho người dân và người dùng cuối.
 */

const INFRASTRUCTURE_TERM_REPLACEMENTS = [
  [/Google\s+Earth\s+Engine/gi, "hệ thống xử lý viễn thám"],
  [/\bGEE\b/g, "hệ thống xử lý viễn thám"],
  [/\bGeoServer\b/gi, "hệ thống bản đồ"],
  [/\bMapProxy\b/gi, "dịch vụ bản đồ"],
  [/\bMapServer\b/gi, "dịch vụ bản đồ"],
  [/\bMinIO\b/gi, "kho dữ liệu"],
  [/\bcoverage_key\b/gi, "nhóm chuỗi thời gian"],
  [/\bcoverageKey\b/g, "nhóm chuỗi thời gian"],
  [/\bWMS\b/g, "dịch vụ bản đồ"],
  [/\bWFS\b/g, "dịch vụ dữ liệu"],
  [/\bWCS\b/g, "dịch vụ tải dữ liệu"],
  [/\bCOG\b/g, "dữ liệu bản đồ"],
  [/\bGeoTIFF\b/g, "ảnh viễn thám"],
];

const ERROR_CODE_TRANSLATIONS = {
  RASTER_LAYER_CONFLICT: "Mã lớp bản đồ bị trùng lặp",
  LAYER_CODE_RETIRED: "Mã lớp đã từng được sử dụng trước đây, vui lòng dùng mã mới",
  LAYER_CODE_IN_USE_BY_OTHER_IMAGE: "Mã lớp đang được sử dụng bởi ảnh viễn thám khác",
  GEE_DOWNLOAD_URL_STALE: "Liên kết tải ảnh đã hết hiệu lực, vui lòng thử lại",
};

/**
 * Làm sạch chuỗi thông báo từ API / toast, thay thế các danh từ kỹ thuật nội bộ
 * bằng câu từ nghiệp vụ dễ hiểu.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function neutralizeUiMessage(value) {
  if (typeof value !== "string") return "";
  let text = value.trim();
  if (!text) return "";

  if (ERROR_CODE_TRANSLATIONS[text]) {
    return ERROR_CODE_TRANSLATIONS[text];
  }

  for (const [code, translation] of Object.entries(ERROR_CODE_TRANSLATIONS)) {
    if (text.includes(code)) {
      text = text.replace(new RegExp(`\\b${code}\\b`, "g"), translation);
    }
  }

  for (const [pattern, replacement] of INFRASTRUCTURE_TERM_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  return text;
}
