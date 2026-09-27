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

/**
 * Danh sách nhãn trạng thái phản ánh hiện trường chuẩn hóa tiếng Việt.
 */
export const FEEDBACK_STATUS_LABELS = {
  pending: "Chờ tiếp nhận",
  under_review: "Đang xem xét",
  approved: "Đã phê duyệt",
  resolved: "Đã xử lý",
  rejected: "Đã từ chối",
  new: "Chờ tiếp nhận",
  in_progress: "Đang xem xét",
};

/**
 * Danh sách nhãn loại thông báo chuẩn hóa tiếng Việt.
 */
export const NOTIFICATION_TYPE_TITLES = {
  field_report_status_changed: "Cập nhật phản ánh",
  field_report_created: "Phản ánh hiện trường mới",
  feedback_status_changed: "Cập nhật phản ánh",
  feedback_created: "Phản ánh mới",
  feedback_resolved: "Phản ánh đã xử lý",
  feedback_flood_report: "Phản ánh ngập lụt",
  forest_snapshot_completed: "Phân loại rừng hoàn tất",
  forest_snapshot_failed: "Phân loại rừng thất bại",
  flood_run_succeeded: "Cảnh báo ngập lụt",
  flood_run_failed: "Phân tích ngập lụt thất bại",
  hydro_scenario_triggered: "Cảnh báo kịch bản thủy văn",
  news_published: "Tin tức mới xuất bản",
  comment_created: "Bình luận mới",
  comment_approved: "Bình luận đã duyệt",
  comment_rejected: "Bình luận bị từ chối",
  comment_removed: "Bình luận bị gỡ",
  announcement: "Thông báo hệ thống",
  general: "Thông báo",
};

/**
 * Chuyển đổi mã trạng thái phản ánh hiện trường sang tiếng Việt.
 *
 * @param {string | null | undefined} status
 * @returns {string}
 */
export function formatFeedbackStatus(status) {
  if (!status || typeof status !== "string") return "";
  const key = status.trim().toLowerCase();
  return FEEDBACK_STATUS_LABELS[key] || status;
}

/**
 * Chuẩn hóa tiêu đề thông báo hiển thị cho người dùng.
 *
 * @param {unknown} notification
 * @returns {string}
 */
export function formatNotificationTitle(notification) {
  const rawTitle = typeof notification === "string" ? notification : notification?.title;
  const type = typeof notification === "object" ? notification?.type : "";

  if (rawTitle && typeof rawTitle === "string" && rawTitle.trim()) {
    const trimmed = rawTitle.trim();
    if (NOTIFICATION_TYPE_TITLES[trimmed]) {
      return NOTIFICATION_TYPE_TITLES[trimmed];
    }
    return neutralizeUiMessage(trimmed);
  }

  if (type && NOTIFICATION_TYPE_TITLES[type]) {
    return NOTIFICATION_TYPE_TITLES[type];
  }

  return "Thông báo";
}

/**
 * Chuẩn hóa nội dung thông báo hiển thị cho người dùng:
 * Dịch các mã trạng thái phản ánh hiện trường từ tiếng Anh sang tiếng Việt
 * và làm sạch thuật ngữ hạ tầng kỹ thuật nội bộ.
 *
 * @param {unknown} notification
 * @returns {string}
 */
export function formatNotificationBody(notification) {
  const rawBody = typeof notification === "string" ? notification : notification?.body;
  if (!rawBody || typeof rawBody !== "string") return "";

  let body = rawBody.trim();

  // Chuẩn hóa lỗi chính tả nếu có (ví dụ "phan ánh" -> "phản ánh")
  body = body.replace(/trạng thái phan ánh/gi, "Trạng thái phản ánh");

  // Dịch các từ khóa trạng thái phản ánh tiếng Anh xuất hiện trong body:
  // Ví dụ:
  // - "Trạng thái phản ánh CP-2026-00000028: resolved" -> "Trạng thái phản ánh CP-2026-00000028: Đã xử lý"
  // - "Trạng thái phản ánh CP-2026-00000028: approved" -> "Trạng thái phản ánh CP-2026-00000028: Đã phê duyệt"
  // - "Phản ánh CP-2026-00000028: resolved" -> "Phản ánh CP-2026-00000028: Đã xử lý"
  for (const [statusKey, statusLabel] of Object.entries(FEEDBACK_STATUS_LABELS)) {
    // 1. Sau dấu hai chấm ": status" (với khoảng trắng tùy chọn)
    const colonRegex = new RegExp(`(:\\s*)${statusKey}\\b`, "gi");
    body = body.replace(colonRegex, `$1${statusLabel}`);

    // 2. Trạng thái đứng ở cuối chuỗi hoặc ranh giới từ độc lập
    const boundaryRegex = new RegExp(`\\b${statusKey}$`, "i");
    if (boundaryRegex.test(body) && !body.includes(statusLabel)) {
      body = body.replace(boundaryRegex, statusLabel);
    }
  }

  // Nếu notification có data.status tường minh mà body vẫn còn chứa mã tiếng Anh
  const explicitStatus = notification?.data?.status;
  if (explicitStatus && typeof explicitStatus === "string" && FEEDBACK_STATUS_LABELS[explicitStatus]) {
    const label = FEEDBACK_STATUS_LABELS[explicitStatus];
    const regex = new RegExp(`\\b${explicitStatus}\\b`, "gi");
    body = body.replace(regex, label);
  }

  return neutralizeUiMessage(body);
}
