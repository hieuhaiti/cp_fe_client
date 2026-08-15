import { useMemo, useState } from "react";
import {
  ArrowRight,
  Calendar,
  CircleDot,
  Clock3,
  ExternalLink,
  FileImage,
  MapPin,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import LoadingInline from "@/components/common/LoadingInline";
import PaginationCustom from "@/components/common/PaginationCustom";
import FeedbackForm from "@/components/feedback/FeedbackForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/useDebounce";
import NewsLayout from "@/layout/NewsLayout";
import { formatDateTime, praseLink } from "@/lib/utils";
import { toast } from "react-toastify";
import {
  updateFeedbackStatus,
  useGetAdminFeedbackDetailQuery,
  useGetAdminFeedbackQuery,
  useGetFeedbackDetailQuery,
  useGetMyFeedbackQuery,
} from "@/services/feedbackService";
import useAuthStore from "@/stores/useAuthStore.jsx";

const ALL_VALUE = "all";
const REVIEW_STATUS_PLACEHOLDER = "select";

const STATUS_META = {
  pending: { label: "Đã tiếp nhận", variant: "soft-info" },
  under_review: { label: "Đang xử lý", variant: "soft-warning" },
  approved: { label: "Đã phê duyệt", variant: "soft-primary" },
  resolved: { label: "Đã hoàn tất", variant: "soft-success" },
  rejected: { label: "Từ chối", variant: "soft-destructive" },
};

const REVIEW_STATUS_OPTIONS = {
  pending: ["under_review", "approved", "rejected"],
  under_review: ["approved", "rejected"],
  approved: ["resolved"],
};

function getStatusMeta(status) {
  return STATUS_META[status] || { label: "Chưa rõ", variant: "outline" };
}

function formatCoordinate(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return number.toLocaleString("vi-VN", { maximumFractionDigits: 6 });
}

function getMediaUrls(item) {
  if (Array.isArray(item?.mediaUrls)) return item.mediaUrls.filter(Boolean);
  if (!Array.isArray(item?.photos)) return [];
  return item.photos
    .map((photo) => (typeof photo === "string" ? photo : photo?.url))
    .filter(Boolean);
}

function normalizeFeedback(item = {}) {
  return {
    ...item,
    referenceCode: item.referenceCode ?? item.reference_code,
    createdAt: item.createdAt ?? item.created_at,
    updatedAt: item.updatedAt ?? item.updated_at,
    lat: item.lat ?? item.latitude ?? item.longitude_lat,
    lng: item.lng ?? item.longitude ?? item.latitude_lng,
    photoCount: item.photoCount ?? item.photo_count,
    senderName: item.senderName ?? item.sender_name,
    senderEmail: item.senderEmail ?? item.sender_email,
    statusLogs: (item.statusLogs ?? item.history ?? []).map((log) => ({
      ...log,
      fromStatus: log.fromStatus ?? log.previous_status,
      toStatus: log.toStatus ?? log.new_status,
      note: log.note ?? log.reason,
      changedAt: log.changedAt ?? log.created_at,
      changedByName: log.changedByName ?? log.actor_name,
    })),
  };
}

function isImageUrl(url) {
  return /\.(png|jpe?g|webp|gif|avif)$/i.test(String(url).split("?")[0]);
}

function FeedbackResponseHistory({ logs, isLoading }) {
  return (
    <section aria-labelledby="feedback-response-heading">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h3
          id="feedback-response-heading"
          className="text-sm font-semibold text-foreground"
        >
          Phản hồi từ cơ quan xử lý
        </h3>
        {!isLoading && logs.length > 0 && (
          <Badge variant="outline">{logs.length}</Badge>
        )}
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-border bg-muted/30 py-6">
          <LoadingInline position="center" />
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          Chưa có phản hồi từ cơ quan xử lý.
        </div>
      ) : (
        <ol className="space-y-3">
          {logs.map((log) => {
            const fromStatus = getStatusMeta(log.fromStatus);
            const toStatus = getStatusMeta(log.toStatus);

            return (
              <li
                key={log.id}
                className="relative rounded-lg border border-border bg-card p-4 pl-11"
              >
                <span className="absolute left-4 top-4 flex size-5 items-center justify-center rounded-full bg-(--info-subtle) text-(--info-subtle-foreground)">
                  <CircleDot className="size-3.5" aria-hidden="true" />
                </span>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {log.fromStatus && (
                    <>
                      <Badge variant={fromStatus.variant}>
                        {fromStatus.label}
                      </Badge>
                      <ArrowRight
                        className="size-3.5 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </>
                  )}
                  <Badge variant={toStatus.variant}>{toStatus.label}</Badge>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-card-foreground">
                  {log.note || "Cơ quan xử lý đã cập nhật trạng thái phản ánh."}
                </p>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{log.changedByName || "Cơ quan xử lý"}</span>
                  <time dateTime={log.changedAt}>
                    {formatDateTime(log.changedAt)}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function EmptyState({ onCreate, isAdminReviewMode }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <MessageSquare className="mb-3 h-12 w-12 text-muted-foreground" />
      <p className="font-medium text-foreground">
        {isAdminReviewMode
          ? "Chưa có phản ánh phù hợp để xử lý."
          : "Chưa có phản ánh phù hợp."}
      </p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {isAdminReviewMode
          ? "Thử thay đổi bộ lọc để xem các phản ánh người dân đã gửi."
          : "Thử thay đổi bộ lọc hoặc gửi phản ánh mới khi phát hiện vấn đề hiện trường."}
      </p>
      {!isAdminReviewMode && (
        <Button className="mt-4" onClick={onCreate}>
          <Plus />
          Gửi phản ánh
        </Button>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const meta = getStatusMeta(status);
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export default function MyFeedbackPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const isAdminReviewMode = user?.role?.code === "system_admin";
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    status: ALL_VALUE,
  });
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [reviewStatus, setReviewStatus] = useState(REVIEW_STATUS_PLACEHOLDER);
  const [reviewReason, setReviewReason] = useState("");
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const debouncedSearch = useDebounce(search, 400);

  const queryParams = useMemo(
    () => ({
      page: filters.page,
      limit: filters.limit,
      q: debouncedSearch,
      status: filters.status === ALL_VALUE ? undefined : filters.status,
    }),
    [debouncedSearch, filters],
  );

  const myFeedbackQuery = useGetMyFeedbackQuery(queryParams, {
    enabled: !isAdminReviewMode,
  });
  const adminFeedbackQuery = useGetAdminFeedbackQuery(queryParams, {
    enabled: isAdminReviewMode,
  });
  const { data, isLoading, isError, isFetching, refetch } =
    isAdminReviewMode ? adminFeedbackQuery : myFeedbackQuery;

  const selectedFeedbackId = selectedFeedback?.id;
  const myFeedbackDetailQuery = useGetFeedbackDetailQuery(selectedFeedbackId, {
    enabled: Boolean(selectedFeedbackId) && !isAdminReviewMode,
  });
  const adminFeedbackDetailQuery = useGetAdminFeedbackDetailQuery(selectedFeedbackId, {
    enabled: Boolean(selectedFeedbackId) && isAdminReviewMode,
  });
  const {
    data: detailData,
    isFetching: isFetchingDetail,
    refetch: refetchDetail,
  } = isAdminReviewMode ? adminFeedbackDetailQuery : myFeedbackDetailQuery;

  const feedbackItems = Array.isArray(data?.data?.items)
    ? data.data.items.map(normalizeFeedback)
    : [];
  const pagination = data?.metadata || {};
  const total = Number(pagination.total || feedbackItems.length);
  const totalPages =
    Number(pagination.totalPages) ||
    Math.max(1, Math.ceil(total / filters.limit));
  const detail = normalizeFeedback(detailData?.data || selectedFeedback || {});
  const detailMedia = getMediaUrls(detail);
  const detailStatusLogs = Array.isArray(detail?.statusLogs) ? detail.statusLogs : [];

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleOpenFeedback = (item) => {
    setSelectedFeedback(item);
    setReviewStatus(REVIEW_STATUS_PLACEHOLDER);
    setReviewReason("");
  };

  const handleReview = async () => {
    if (!selectedFeedbackId || reviewStatus === REVIEW_STATUS_PLACEHOLDER) return;

    const expectedUpdatedAt = detail.updatedAt || selectedFeedback?.updatedAt;
    if (!expectedUpdatedAt) {
      toast.error("Thiếu thời điểm cập nhật để duyệt phản ánh. Vui lòng tải lại.");
      return;
    }

    const reason = reviewReason.trim();
    if (reviewStatus === "rejected" && reason.length < 5) {
      toast.warning("Cần nêu lý do từ chối ít nhất 5 ký tự.");
      return;
    }

    setIsReviewSubmitting(true);
    try {
      await updateFeedbackStatus(selectedFeedbackId, {
        status: reviewStatus,
        reason: reason || undefined,
        expectedUpdatedAt,
      });
      toast.success("Đã cập nhật trạng thái phản ánh.");
      setReviewStatus(REVIEW_STATUS_PLACEHOLDER);
      setReviewReason("");
      await Promise.all([refetch(), refetchDetail()]);
    } catch (error) {
      toast.error(error?.message || "Không thể cập nhật trạng thái phản ánh.");
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <NewsLayout>
      <div className="min-h-screen bg-(image:--gradient-surface-page) py-6 sm:py-10">
        <main className="container mx-auto max-w-6xl px-4">
        <section className="relative mb-6 overflow-hidden rounded-[2rem] border border-(--gradient-surface-panel-border) bg-(image:--gradient-surface-panel) px-6 py-8 text-(--gradient-surface-panel-foreground) shadow-xl md:mb-8 md:px-10 md:py-10">
          <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border border-white/20" />
          <div className="absolute bottom-0 right-16 h-24 w-24 rounded-t-full bg-(--gradient-surface-panel-wash-strong)" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/70">
              Dịch vụ công / hiện trường
            </p>
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl">
              {isAdminReviewMode ? "Duyệt phản ánh người dân" : "Phản ánh của tôi"}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/80 md:text-base">
              {isAdminReviewMode
                ? "Tiếp nhận, xem thông tin và cập nhật trạng thái các phản ánh hiện trường từ người dân."
                : "Theo dõi phản ánh hiện trường đã gửi, trạng thái xử lý và vị trí liên quan."}
            </p>
            {!isAdminReviewMode && !isAuthenticated && (
              <div className="mt-4 rounded-xl border border-white/20 bg-white/10 p-3 text-sm text-white/85 backdrop-blur-sm">
                Bạn đang xem phản ánh gắn với trình duyệt hiện tại. Đăng nhập để
                đồng bộ phản ánh theo tài khoản.
              </div>
            )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-white backdrop-blur-sm">
                <p className="text-3xl font-bold">{total.toLocaleString("vi-VN")}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-white/70">
                  phản ánh
                </p>
              </div>
              {!isAdminReviewMode && (
                <Button
                  onClick={() => setFormOpen(true)}
                  className="bg-white text-primary hover:bg-white/90"
                >
                  <Plus />
                  Gửi phản ánh
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-card/90 p-3 shadow-sm backdrop-blur md:flex-row md:items-center md:p-4">
          <section
            className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1fr)_180px]"
            aria-label="Bộ lọc phản ánh"
          >
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Tìm theo tiêu đề hoặc nội dung"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setFilters((prev) => ({ ...prev, page: 1 }));
                }}
                className="h-11 border-transparent bg-muted/70 pl-10 shadow-none focus-visible:bg-background"
              />
            </div>

            <Select
              value={filters.status}
              onValueChange={(value) => updateFilter("status", value)}
            >
              <SelectTrigger className="h-11 w-full border-transparent bg-muted/70 shadow-none">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Tất cả trạng thái</SelectItem>
                <SelectItem value="pending">Đã tiếp nhận</SelectItem>
                <SelectItem value="under_review">Đang xử lý</SelectItem>
                <SelectItem value="approved">Đã phê duyệt</SelectItem>
                <SelectItem value="resolved">Đã hoàn tất</SelectItem>
                <SelectItem value="rejected">Từ chối</SelectItem>
              </SelectContent>
            </Select>
          </section>
        </section>

        <Card className="overflow-hidden border-border/80 bg-card/95 p-0 shadow-sm">
          {isLoading && (
            <div className="py-20">
              <LoadingInline position="center" size="large" />
            </div>
          )}

          {isError && (
            <div className="p-8 text-center text-card-foreground">
              <MessageSquare className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <p className="mb-4 font-medium">
                {isAdminReviewMode
                  ? "Không thể tải danh sách phản ánh của người dân."
                  : "Không thể tải danh sách phản ánh của bạn."}
              </p>
              <Button variant="soft-warning" onClick={() => refetch()}>
                <RefreshCw />
                Thử lại
              </Button>
            </div>
          )}

          {!isLoading && !isError && feedbackItems.length === 0 && (
            <EmptyState
              onCreate={() => setFormOpen(true)}
              isAdminReviewMode={isAdminReviewMode}
            />
          )}

          {!isLoading && !isError && feedbackItems.length > 0 && (
            <div className="relative">
              {isFetching && (
                <div className="absolute inset-0 z-10 flex items-start justify-center bg-background/70 pt-16 backdrop-blur-sm">
                  <LoadingInline size="large" />
                </div>
              )}

              <div className="divide-y divide-border">
                {feedbackItems.map((item) => {
                  const mediaCount = Number(item.photoCount ?? getMediaUrls(item).length);
                  const reference = item.referenceCode || `#${item.id}`;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="group grid w-full gap-4 p-5 text-left transition-colors hover:bg-muted/45 focus-visible:bg-muted/45 focus-visible:outline-none sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6"
                      onClick={() => handleOpenFeedback(item)}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={item.status} />
                          <span className="text-xs font-medium text-muted-foreground">{reference}</span>
                        </div>
                        <h2 className="mt-3 line-clamp-1 text-base font-semibold text-foreground transition-colors group-hover:text-primary sm:text-lg">
                          Phản ánh hiện trường {reference}
                        </h2>
                        <p className="mt-1.5 line-clamp-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                          {item.description || "Chưa có mô tả chi tiết."}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatDateTime(item.createdAt)}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {formatCoordinate(item.lat)}, {formatCoordinate(item.lng)}
                          </span>
                          {mediaCount > 0 && (
                            <span className="inline-flex items-center gap-1.5">
                              <FileImage className="h-3.5 w-3.5" />
                              {mediaCount} tệp đính kèm
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="inline-flex items-center justify-center gap-2 text-sm font-medium text-primary sm:justify-self-end">
                        Xem chi tiết
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {!isLoading && !isError && feedbackItems.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              Tổng <span className="font-medium text-foreground">{total}</span>{" "}
              phản ánh
            </span>
            <PaginationCustom
              currentPage={filters.page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
        </main>
      </div>

      {!isAdminReviewMode && (
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Gửi phản ánh hiện trường</DialogTitle>
              <DialogDescription>
                Gửi phản ánh kèm tọa độ và ảnh/video hiện trường nếu có.
              </DialogDescription>
            </DialogHeader>
            <FeedbackForm
              onSuccess={() => setFormOpen(false)}
              onCancel={() => setFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      <Dialog
        open={Boolean(selectedFeedback)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedFeedback(null);
            setReviewStatus(REVIEW_STATUS_PLACEHOLDER);
            setReviewReason("");
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {detail?.title || `Phản ánh #${detail?.id || ""}`}
            </DialogTitle>
            <DialogDescription>
              {isFetchingDetail
                ? "Đang tải chi tiết..."
                : "Thông tin phản ánh và trạng thái xử lý hiện tại."}
            </DialogDescription>
          </DialogHeader>

          {detail && (
            <div className="grid gap-4">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={detail.status} />
                {detail.referenceCode && (
                  <Badge variant="outline">{detail.referenceCode}</Badge>
                )}
              </div>

              <div className="grid gap-3 rounded-lg border border-border bg-card p-4 text-sm">
                <p className="leading-6 text-card-foreground">
                  {detail.description || "Chưa có mô tả chi tiết."}
                </p>
                <div className="grid gap-2 text-muted-foreground sm:grid-cols-2">
                  <span className="inline-flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDateTime(detail.createdAt)}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {formatCoordinate(detail.lat)}, {formatCoordinate(detail.lng)}
                  </span>
                </div>
                {isAdminReviewMode && (detail.senderName || detail.senderEmail) && (
                  <div className="flex items-center gap-2 border-t border-border pt-3 text-muted-foreground">
                    <UserRound className="h-4 w-4" />
                    <span>
                      {detail.senderName || "Người gửi"}
                      {detail.senderEmail ? ` · ${detail.senderEmail}` : ""}
                    </span>
                  </div>
                )}
              </div>

              {detailMedia.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">
                    Tệp đính kèm
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {detailMedia.map((url) => {
                      const fullUrl = praseLink(url);
                      return (
                        <a
                          key={url}
                          href={fullUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="group overflow-hidden rounded-lg border border-border bg-card text-card-foreground outline-none transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {isImageUrl(url) ? (
                            <img
                              src={fullUrl}
                              alt="Tệp phản ánh"
                              loading="lazy"
                              className="h-36 w-full object-cover transition-transform group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                            />
                          ) : (
                            <div className="flex h-24 items-center justify-center bg-muted">
                              <FileImage className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <span className="flex items-center gap-2 p-3 text-sm font-medium">
                            <ExternalLink className="h-4 w-4" />
                            Mở tệp
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              <FeedbackResponseHistory
                logs={detailStatusLogs}
                isLoading={isFetchingDetail}
              />

              {isAdminReviewMode &&
                (REVIEW_STATUS_OPTIONS[detail.status] || []).length > 0 && (
                  <section className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-foreground">Duyệt phản ánh</h3>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Chọn trạng thái tiếp theo và ghi chú xử lý để người dân theo dõi.
                    </p>
                    <div className="mt-4 grid gap-3">
                      <Select value={reviewStatus} onValueChange={setReviewStatus}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Chọn trạng thái mới" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={REVIEW_STATUS_PLACEHOLDER} disabled>
                            Chọn trạng thái mới
                          </SelectItem>
                          {(REVIEW_STATUS_OPTIONS[detail.status] || []).map((status) => (
                            <SelectItem key={status} value={status}>
                              {getStatusMeta(status).label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Textarea
                        value={reviewReason}
                        onChange={(event) => setReviewReason(event.target.value)}
                        maxLength={1000}
                        rows={3}
                        placeholder="Ghi chú xử lý (bắt buộc khi từ chối)"
                        disabled={isReviewSubmitting}
                      />
                      <Button
                        onClick={handleReview}
                        disabled={
                          isReviewSubmitting || reviewStatus === REVIEW_STATUS_PLACEHOLDER
                        }
                      >
                        <ShieldCheck />
                        {isReviewSubmitting ? "Đang cập nhật..." : "Cập nhật trạng thái"}
                      </Button>
                    </div>
                  </section>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </NewsLayout>
  );
}
