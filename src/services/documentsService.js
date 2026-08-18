import { fetcher } from "@/services/apiClient/fetcher";
import { withQuery } from "@/services/apiClient/request";
import { useApiQuery } from "@/services/apiClient/useApi";

const DOCUMENTS_PATH = "/cms/documents";

export function normalizeDocument(item = {}) {
  return {
    ...item,
    documentCode: item.documentCode ?? item.document_code,
    issuingAgency: item.issuingAgency ?? item.issuing_agency,
    issuedAt: item.issuedAt ?? item.issued_at,
    originalName: item.originalName ?? item.original_name,
    sizeBytes: item.sizeBytes ?? item.size_bytes,
    isPublic: item.isPublic ?? item.visibility === "public",
    createdAt: item.createdAt ?? item.created_at,
    updatedAt: item.updatedAt ?? item.updated_at,
  };
}

export function getDocuments(params = {}) {
  return fetcher(withQuery(DOCUMENTS_PATH, { page: 1, limit: 20, sortBy: "issued_at", sortOrder: "DESC", ...params }));
}

export function useGetDocumentsQuery(params = {}, options = {}) {
  const query = { page: 1, limit: 20, sortBy: "issued_at", sortOrder: "DESC", ...params };
  return useApiQuery(["documents", "list", query], withQuery(DOCUMENTS_PATH, query), options);
}

export function getDocumentDetail(id) {
  return fetcher(`${DOCUMENTS_PATH}/${encodeURIComponent(id)}`);
}

export function useGetDocumentDetailQuery(id, options = {}) {
  return useApiQuery(
    ["documents", "detail", id],
    `${DOCUMENTS_PATH}/${encodeURIComponent(id)}`,
    { enabled: Boolean(id), ...options },
  );
}

/**
 * GET /cms/documents/:id/download-url
 * Returns { url, expiresAt?, fileName? }.
 * The url is a short-lived ticket URL served by the backend's storage proxy
 * (/api/v1/storage/objects/:id/file?ticket=...) — never construct it manually.
 */
export function getDocumentDownloadUrl(id, expireSeconds = 300) {
  return fetcher(
    withQuery(`${DOCUMENTS_PATH}/${encodeURIComponent(id)}/download-url`, { expireSeconds }),
  );
}
