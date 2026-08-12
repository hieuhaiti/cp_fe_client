import { fetcher } from "@/services/apiClient/fetcher";
import { mutater } from "@/services/apiClient/mutater";
import { withQuery } from "@/services/apiClient/request";
import { useApiQuery } from "@/services/apiClient/useApi";

const DOCUMENTS_PATH = "/cms/documents";
const ADMIN_DOCUMENTS_PATH = "/admin/cms/documents";

export const DOCUMENT_TYPE_LABELS = {
  bao_cao: "Báo cáo",
  van_ban: "Văn bản",
  pdf_map: "Bản đồ PDF",
};

export function normalizeDocument(item = {}) {
  return {
    ...item,
    fileUrl: item.fileUrl ?? item.file_url,
    fileName: item.fileName ?? item.file_name,
    mimeType: item.mimeType ?? item.mime_type,
    fileSize: item.fileSize ?? item.file_size,
    isPublic: item.isPublic ?? item.is_public,
    createdAt: item.createdAt ?? item.created_at,
    updatedAt: item.updatedAt ?? item.updated_at,
  };
}

export function useGetAllDocumentsQuery(params = {}, options = {}) {
  const query = { page: 1, limit: 20, ...params };
  return useApiQuery(
    ["documents", "list", query],
    withQuery(DOCUMENTS_PATH, query),
    options,
  );
}

export function getAllDocuments(params = {}) {
  return fetcher(withQuery(DOCUMENTS_PATH, { page: 1, limit: 20, ...params }));
}

export function useGetDocumentDetailQuery(documentId, options = {}) {
  return useApiQuery(
    ["documents", "detail", documentId],
    `${DOCUMENTS_PATH}/${encodeURIComponent(documentId)}`,
    { enabled: Boolean(documentId), ...options },
  );
}

export function getDocumentDetail(documentId) {
  return fetcher(`${DOCUMENTS_PATH}/${encodeURIComponent(documentId)}`);
}

export function getDocumentDownloadUrl(documentId, expireSeconds = 300) {
  return fetcher(
    withQuery(`${DOCUMENTS_PATH}/${encodeURIComponent(documentId)}/download-url`, {
      expireSeconds,
    }),
  );
}

export function getAdminDocumentDetail(documentId) {
  return fetcher(`${ADMIN_DOCUMENTS_PATH}/${encodeURIComponent(documentId)}`);
}

/** POST /admin/cms/documents with a committed storage fileObjectId. */
export function createDocument(body) {
  return mutater(ADMIN_DOCUMENTS_PATH, "POST", body);
}

export function deleteDocument(documentId, expectedUpdatedAt) {
  return mutater(
    withQuery(`${ADMIN_DOCUMENTS_PATH}/${encodeURIComponent(documentId)}`, { expectedUpdatedAt }),
    "DELETE",
  );
}
