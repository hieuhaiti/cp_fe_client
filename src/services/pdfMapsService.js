import { fetcher } from "@/services/apiClient/fetcher";
import { mutater } from "@/services/apiClient/mutater";
import { withQuery } from "@/services/apiClient/request";
import { useApiQuery } from "@/services/apiClient/useApi";

const PDF_MAPS_PATH = "/cms/pdf-maps";
const ADMIN_PDF_MAPS_PATH = "/admin/cms/pdf-maps";

export const PDF_MAP_THEME_LABELS = {
  lop_phu_nhiet: "Lớp phủ nhiệt",
  ngap_lut: "Ngập lụt và thủy văn",
  lop_phu_rung: "Lớp phủ rừng",
  khac: "Khác",
};

export function normalizePdfMap(item = {}) {
  return {
    ...item,
    fileUrl: item.fileUrl ?? item.file_url,
    fileName: item.fileName ?? item.file_name,
    thumbnailUrl: item.thumbnailUrl ?? item.thumbnail_url,
    isPublic: item.isPublic ?? item.is_public,
    createdAt: item.createdAt ?? item.created_at,
    updatedAt: item.updatedAt ?? item.updated_at,
  };
}

export function getPdfMaps(params = {}) {
  return fetcher(withQuery(PDF_MAPS_PATH, { page: 1, limit: 20, ...params }));
}

export function useGetPdfMapsQuery(params = {}, options = {}) {
  const query = { page: 1, limit: 20, ...params };
  return useApiQuery(["pdf-maps", "list", query], withQuery(PDF_MAPS_PATH, query), options);
}

export function getPdfMapDetail(pdfMapId) {
  return fetcher(`${PDF_MAPS_PATH}/${encodeURIComponent(pdfMapId)}`);
}

export function useGetPdfMapDetailQuery(pdfMapId, options = {}) {
  return useApiQuery(
    ["pdf-maps", "detail", pdfMapId],
    `${PDF_MAPS_PATH}/${encodeURIComponent(pdfMapId)}`,
    { enabled: Boolean(pdfMapId), ...options },
  );
}

export function getPdfMapDownloadUrl(pdfMapId, expireSeconds = 300) {
  return fetcher(
    withQuery(`${PDF_MAPS_PATH}/${encodeURIComponent(pdfMapId)}/download-url`, { expireSeconds }),
  );
}

export function getAdminPdfMaps(params = {}) {
  return fetcher(withQuery(ADMIN_PDF_MAPS_PATH, { page: 1, limit: 20, ...params }));
}

export function getAdminPdfMapDetail(pdfMapId) {
  return fetcher(`${ADMIN_PDF_MAPS_PATH}/${encodeURIComponent(pdfMapId)}`);
}

/** POST /admin/cms/pdf-maps with a committed storage fileObjectId. */
export function createPdfMap(body) {
  return mutater(ADMIN_PDF_MAPS_PATH, "POST", body);
}

/** PATCH /admin/cms/pdf-maps/:pdfMapId; expectedUpdatedAt is required. */
export function updatePdfMap(pdfMapId, body) {
  return mutater(`${ADMIN_PDF_MAPS_PATH}/${encodeURIComponent(pdfMapId)}`, "PATCH", body);
}

export function deletePdfMap(pdfMapId, expectedUpdatedAt) {
  return mutater(
    withQuery(`${ADMIN_PDF_MAPS_PATH}/${encodeURIComponent(pdfMapId)}`, { expectedUpdatedAt }),
    "DELETE",
  );
}
