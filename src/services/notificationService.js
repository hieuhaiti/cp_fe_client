import { fetcher } from "@/services/apiClient/fetcher";
import { mutater } from "@/services/apiClient/mutater";
import { withQuery } from "@/services/apiClient/request";
import { useApiQuery } from "@/services/apiClient/useApi";

const NOTIFICATIONS_PATH = "/notifications";
const MY_NOTIFICATIONS_PATH = `${NOTIFICATIONS_PATH}/mine`;
const PUSH_TOKEN_PATH = "/devices/push-token";

function normalizeListParams(params = {}) {
  const {
    onlyUnread,
    unread_only: unreadOnlyLegacy,
    isRead,
    user_id: _userId,
    ...supportedParams
  } = params;
  void _userId;
  const unreadOnly =
    supportedParams.unreadOnly ??
    onlyUnread ??
    unreadOnlyLegacy ??
    (typeof isRead === "boolean" ? !isRead : undefined);

  return {
    page: 1,
    limit: 20,
    ...supportedParams,
    ...(unreadOnly !== undefined && { unreadOnly }),
  };
}

export function useGetNotificationsQuery(params = {}, options = {}) {
  return useApiQuery(
    ["notifications", params],
    withQuery(MY_NOTIFICATIONS_PATH, normalizeListParams(params)),
    options,
  );
}

export const useGetMyNotificationsQuery = useGetNotificationsQuery;

export function getNotifications(params = {}) {
  return fetcher(
    withQuery(MY_NOTIFICATIONS_PATH, normalizeListParams(params)),
  );
}

export const getMyNotifications = getNotifications;

export function getUnreadCount(lang = "vi") {
  return fetcher(withQuery(`${NOTIFICATIONS_PATH}/unread-count`, { lang }));
}

export function useGetUnreadCountQuery(options = {}) {
  return useApiQuery(
    ["notifications", "unread-count"],
    withQuery(`${NOTIFICATIONS_PATH}/unread-count`, { lang: "vi" }),
    options,
  );
}

export function markAllNotificationsAsRead(lang = "vi") {
  return mutater(
    withQuery(`${NOTIFICATIONS_PATH}/read-all`, { lang }),
    "PATCH",
  );
}

export function markNotificationAsRead(notificationId, lang = "vi") {
  return mutater(
    withQuery(`${NOTIFICATIONS_PATH}/${notificationId}/read`, { lang }),
    "PATCH",
  );
}

export function deleteNotification(notificationId, lang = "vi") {
  return mutater(
    withQuery(`${NOTIFICATIONS_PATH}/${notificationId}`, { lang }),
    "DELETE",
  );
}

export function registerNotificationDevice(payload, lang = "vi") {
  return mutater(
    withQuery(PUSH_TOKEN_PATH, { lang }),
    "PUT",
    payload,
  );
}

export function unregisterNotificationDevice(token, lang = "vi") {
  return mutater(
    withQuery(PUSH_TOKEN_PATH, { lang }),
    "DELETE",
    { token },
  );
}
