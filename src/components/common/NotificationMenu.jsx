import { useCallback, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteNotification,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
} from "@/services/notificationService";
import { useNotificationWebSocket } from "@/hooks/useNotificationWebSocket";
import { cn, formatDateTime } from "@/lib/utils";

const params = { page: 1, limit: 10, unreadOnly: false };

function isNotificationRead(notification) {
  return Boolean(
    notification?.isRead ??
      notification?.is_read ??
      notification?.readAt ??
      notification?.read_at,
  );
}

function notificationCreatedAt(notification) {
  return notification?.createdAt ?? notification?.created_at ?? "";
}

function getNotificationPath(notification) {
  const data = notification?.data || notification?.payload;
  const channel = notification?.channel ?? data?.channel;
  const newsId = data?.newsId ?? data?.news_id;
  if (
    typeof data?.path === "string" &&
    data.path.startsWith("/") &&
    !data.path.startsWith("//")
  ) {
    return data.path;
  }
  if (channel === "feedback" || notification?.type?.startsWith("field_report_")) {
    return "/feedback/mine";
  }
  if (channel === "comment") {
    return newsId ? `/news/${newsId}` : "/news";
  }
  if (channel === "news") {
    return newsId ? `/news/${newsId}` : "/news";
  }
  if (channel === "forest" || channel === "flood") {
    return "/map";
  }
  return null;
}

export default function NotificationMenu({ enabled = true }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useGetNotificationsQuery(params, {
    enabled,
    refetchOnWindowFocus: false,
    refetchInterval: enabled ? 30_000 : false,
  });
  const unreadQuery = useGetUnreadCountQuery({
    enabled,
    refetchOnWindowFocus: false,
    refetchInterval: enabled ? 30_000 : false,
  });

  const notifications = useMemo(
    () =>
      Array.isArray(query.data?.data?.items) ? query.data.data.items : [],
    [query.data],
  );
  const unreadCount = Number(
    unreadQuery.data?.data?.count ??
      unreadQuery.data?.data?.unread ??
      notifications.filter((item) => !isNotificationRead(item)).length,
  );

  const refreshNotifications = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);

  const handleSocketMessage = useCallback(
    (message) => {
      if (message?.event !== "notification") return;
      refreshNotifications();
      if (!open) {
        toast.info(
          message.data?.title || message.data?.body || "Bạn có thông báo mới",
          { toastId: `notification-${message.data?.id || "new"}` },
        );
      }
    },
    [open, refreshNotifications],
  );

  useNotificationWebSocket({ enabled, onMessage: handleSocketMessage });

  const markOneMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: refreshNotifications,
  });
  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: refreshNotifications,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      refreshNotifications();
      toast.success("Đã xoá thông báo");
    },
    onError: () => toast.error("Không thể xoá thông báo."),
  });

  if (!enabled) return null;

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) refreshNotifications();
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant={unreadCount > 0 ? "soft-primary" : "outline"}
          size="icon"
          className="relative rounded-xl"
          aria-label={
            unreadCount
              ? `${unreadCount} thông báo chưa đọc`
              : "Mở thông báo"
          }
        >
          <Bell />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1.5 -top-1.5 h-5 min-w-5 justify-center px-1 text-[10px]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[min(24rem,calc(100vw-1rem))] rounded-2xl p-2"
      >
        <div className="flex items-center justify-between gap-3 px-2 py-1">
          <DropdownMenuLabel className="px-0 text-base">
            Thông báo
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              isLoading={markAllMutation.isPending}
              onClick={() => markAllMutation.mutate()}
              className="text-xs"
            >
              <CheckCheck />
              Đọc tất cả
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        {query.isFetching && notifications.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            Đang tải thông báo...
          </p>
        )}

        {!query.isFetching && query.isError && (
          <p className="px-3 py-8 text-center text-sm text-destructive">
            Không thể tải thông báo.
          </p>
        )}

        {!query.isFetching && !query.isError && notifications.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            Bạn chưa có thông báo nào.
          </p>
        )}

        <div className="max-h-96 overflow-y-auto">
          {notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={cn(
                "mb-1 cursor-pointer flex-col items-start gap-1 rounded-xl p-3 whitespace-normal",
                !isNotificationRead(notification) && "bg-(--primary-subtle)",
              )}
              onSelect={() => {
                if (!isNotificationRead(notification)) {
                  markOneMutation.mutate(notification.id);
                }
                const path = getNotificationPath(notification);
                if (path) navigate(path);
              }}
            >
              <div className="flex w-full items-start gap-2">
                <p className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                  {notification.title || "Thông báo"}
                </p>
                {!isNotificationRead(notification) && (
                  <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="-mr-1 -mt-1 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label="Xoá thông báo"
                  disabled={
                    deleteMutation.isPending &&
                    String(deleteMutation.variables) === String(notification.id)
                  }
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    deleteMutation.mutate(notification.id);
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
              {notification.body && (
                <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {notification.body}
                </p>
              )}
              <time className="text-[11px] text-muted-foreground">
                {formatDateTime(notificationCreatedAt(notification))}
              </time>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
