import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/services/apiClient/fetcher";
import { mutater } from "@/services/apiClient/mutater";
import { withQuery } from "@/services/apiClient/request";
import { uploadFile } from "@/services/storageService";

const FEEDBACK_PATH = "/field-reports";
const ADMIN_FEEDBACK_PATH = "/admin/field-reports";
const DEFAULT_LANG = "vi";
const ANONYMOUS_ID_KEY = "kt_feedback_anonymous_id";

function createUuid() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getFeedbackAnonymousId() {
  const existing = window.localStorage.getItem(ANONYMOUS_ID_KEY);
  if (existing) return existing;

  const anonymousId = createUuid();
  window.localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);
  return anonymousId;
}

function getAnonymousHeaders(anonymousId = getFeedbackAnonymousId()) {
  return anonymousId ? { "x-anonymous-id": anonymousId } : {};
}

export async function createFeedback(payload, options = {}) {
  const { anonymousId, lang = DEFAULT_LANG } = options;
  const media = Array.isArray(payload?.media) ? payload.media : [];
  const uploadedPhotoIds = await Promise.all(
    media.map((file) => uploadFile(file, "field-photos")),
  );

  return mutater(
    withQuery(FEEDBACK_PATH, { lang }),
    "POST",
    {
      description: payload?.description?.trim() || "",
      longitude: Number(payload?.longitude ?? payload?.lng),
      latitude: Number(payload?.latitude ?? payload?.lat),
      photoIds: payload?.photoIds || uploadedPhotoIds,
    },
    { headers: getAnonymousHeaders(anonymousId) },
  );
}

export function getMyFeedback(params = {}, options = {}) {
  const { anonymousId, lang = DEFAULT_LANG } = options;

  return fetcher(
    withQuery(`${FEEDBACK_PATH}/mine`, {
      page: 1,
      limit: 20,
      lang,
      ...params,
    }),
    { headers: getAnonymousHeaders(anonymousId) },
  );
}

export function useGetMyFeedbackQuery(params = {}, options = {}) {
  const { anonymousId, lang = DEFAULT_LANG, ...queryOptions } = options;

  return useQuery({
    queryKey: ["feedback", "mine", params, anonymousId || "local"],
    queryFn: () => getMyFeedback(params, { anonymousId, lang }),
    ...queryOptions,
  });
}

export function getFeedbackDetail(feedbackId, options = {}) {
  const { anonymousId, lang = DEFAULT_LANG } = options;

  return fetcher(
    withQuery(`${FEEDBACK_PATH}/${encodeURIComponent(feedbackId)}`, { lang }),
    { headers: getAnonymousHeaders(anonymousId) },
  );
}

export function useGetFeedbackDetailQuery(feedbackId, options = {}) {
  const { anonymousId, lang = DEFAULT_LANG, ...queryOptions } = options;

  return useQuery({
    queryKey: ["feedback", "detail", feedbackId, anonymousId || "local"],
    queryFn: () => getFeedbackDetail(feedbackId, { anonymousId, lang }),
    enabled:
      Boolean(feedbackId) &&
      (queryOptions.enabled === undefined ? true : queryOptions.enabled),
    ...queryOptions,
  });
}

export function getAdminFeedback(params = {}) {
  return fetcher(
    withQuery(ADMIN_FEEDBACK_PATH, {
      page: 1,
      limit: 20,
      lang: DEFAULT_LANG,
      ...params,
    }),
  );
}

export function useGetAdminFeedbackQuery(params = {}, options = {}) {
  return useQuery({
    queryKey: ["feedback", "admin", params],
    queryFn: () => getAdminFeedback(params),
    ...options,
  });
}

export function getAdminFeedbackDetail(feedbackId, lang = DEFAULT_LANG) {
  // The authenticated detail endpoint selects the admin data scope from the
  // caller's `field_report.read` permission. It is available on deployments
  // that predate the optional `/admin/field-reports/:id` route.
  return fetcher(
    withQuery(`${FEEDBACK_PATH}/${encodeURIComponent(feedbackId)}`, {
      lang,
    }),
  );
}

export function useGetAdminFeedbackDetailQuery(feedbackId, options = {}) {
  const { lang = DEFAULT_LANG, ...queryOptions } = options;

  return useQuery({
    queryKey: ["feedback", "admin", "detail", feedbackId],
    queryFn: () => getAdminFeedbackDetail(feedbackId, lang),
    enabled:
      Boolean(feedbackId) &&
      (queryOptions.enabled === undefined ? true : queryOptions.enabled),
    ...queryOptions,
  });
}

export function getAdminFeedbackMap(params = {}) {
  return fetcher(
    withQuery(`${ADMIN_FEEDBACK_PATH}/clusters`, {
      lang: DEFAULT_LANG,
      ...params,
    }),
  );
}

export function updateFeedbackStatus(feedbackId, payload, lang = DEFAULT_LANG) {
  return mutater(
    withQuery(`${ADMIN_FEEDBACK_PATH}/${feedbackId}/review`, { lang }),
    "PATCH",
    payload,
  );
}
