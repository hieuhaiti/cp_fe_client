import { fetcher } from "@/services/apiClient/fetcher";
import { mutater } from "@/services/apiClient/mutater";
import { withQuery } from "@/services/apiClient/request";
import { useApiQuery } from "@/services/apiClient/useApi";

const NEWS_PATH = "/cms/news";
const ADMIN_NEWS_PATH = "/admin/cms/news";
const ADMIN_NEWS_COMMENTS_PATH = "/admin/cms/news/comments";

export function getNewsComments(newsId, params = {}) {
  return fetcher(
    withQuery(`${NEWS_PATH}/${encodeURIComponent(newsId)}/comments`, {
      page: 1,
      limit: 20,
      status: "approved",
      ...params,
    }),
  );
}

export function useGetNewsCommentsQuery(newsId, params = {}, options = {}) {
  return useApiQuery(
    ["news", newsId, "comments", params],
    withQuery(`${NEWS_PATH}/${encodeURIComponent(newsId)}/comments`, {
      page: 1,
      limit: 20,
      status: "approved",
      ...params,
    }),
    {
      ...options,
      enabled:
        Boolean(newsId) &&
        (options.enabled === undefined ? true : options.enabled),
    },
  );
}

export function getAllComments(params = {}) {
  const { newsId, targetId, ...query } = params;
  const resolvedNewsId = newsId || targetId;
  return fetcher(
    withQuery(`${ADMIN_NEWS_PATH}/${encodeURIComponent(resolvedNewsId)}/comments`, {
      page: 1,
      limit: 20,
      ...query,
    }),
  );
}

export function useGetAllCommentsQuery(params = {}, options = {}) {
  const { newsId, targetId, ...query } = params;
  const resolvedNewsId = newsId || targetId;
  return useApiQuery(
    ["comments", "list", params],
    withQuery(`${ADMIN_NEWS_PATH}/${encodeURIComponent(resolvedNewsId)}/comments`, {
      page: 1,
      limit: 20,
      ...query,
    }),
    options,
  );
}

export function createNewsComment(newsId, content, lang = "vi") {
  return mutater(
    withQuery(`${NEWS_PATH}/${encodeURIComponent(newsId)}/comments`, {
      lang,
    }),
    "POST",
    { content },
  );
}

export function approveComment(commentId, isApproved, lang = "vi") {
  return mutater(
    withQuery(`${ADMIN_NEWS_COMMENTS_PATH}/${commentId}`, { lang }),
    "PATCH",
    { status: isApproved ? "approved" : "rejected" },
  );
}

export function deleteComment(commentId, lang = "vi") {
  return mutater(
    withQuery(`${ADMIN_NEWS_COMMENTS_PATH}/${commentId}`, { lang }),
    "DELETE",
  );
}
