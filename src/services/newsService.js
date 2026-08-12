import { fetcher } from "@/services/apiClient/fetcher";
import { mutater } from "@/services/apiClient/mutater";
import { withQuery } from "@/services/apiClient/request";
import { useApiQuery } from "@/services/apiClient/useApi";

const NEWS_PATH = "/cms/news";
const ADMIN_NEWS_PATH = "/admin/cms/news";

const publicNewsQuery = ({ page = 1, limit = 20 } = {}) => ({ page, limit });

export function useGetAllNewsQuery(params = {}, options = {}) {
  return useApiQuery(
    ["news", "list", params],
    withQuery(NEWS_PATH, publicNewsQuery(params)),
    options,
  );
}

export function getAllNews(params = {}) {
  return fetcher(withQuery(NEWS_PATH, publicNewsQuery(params)));
}

export function useGetNewsDetailBySlugQuery(id, options = {}) {
  const normalizedId = String(id || "").trim();
  return useApiQuery(
    ["news", "detail", normalizedId],
    `${NEWS_PATH}/${encodeURIComponent(normalizedId)}`,
    {
      ...options,
      enabled:
        Boolean(normalizedId) &&
        (options.enabled === undefined ? true : options.enabled),
    },
  );
}

export const useGetNewsDetailQuery = useGetNewsDetailBySlugQuery;

export function getNewsDetailBySlug(id) {
  return fetcher(`${NEWS_PATH}/${encodeURIComponent(id)}`);
}

export const getNewsDetail = getNewsDetailBySlug;

export function getAdminNewsDetail(newsId) {
  return fetcher(`${ADMIN_NEWS_PATH}/${encodeURIComponent(newsId)}`);
}

/** POST /admin/cms/news */
export function createNews(body) {
  return mutater(ADMIN_NEWS_PATH, "POST", body);
}

/** PATCH /admin/cms/news/:newsId; body includes expectedUpdatedAt. */
export function updateNews(newsId, body) {
  return mutater(`${ADMIN_NEWS_PATH}/${encodeURIComponent(newsId)}`, "PATCH", body);
}

/** DELETE /admin/cms/news/:newsId?expectedUpdatedAt= */
export function deleteNews(newsId, expectedUpdatedAt) {
  return mutater(
    withQuery(`${ADMIN_NEWS_PATH}/${encodeURIComponent(newsId)}`, { expectedUpdatedAt }),
    "DELETE",
  );
}
