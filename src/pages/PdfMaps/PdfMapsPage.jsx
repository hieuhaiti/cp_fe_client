import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Calendar,
  Download,
  Eye,
  FileText,
  Map,
  RefreshCw,
  Ruler,
  Search,
} from "lucide-react";
import LoadingInline from "@/components/common/LoadingInline";
import PaginationCustom from "@/components/common/PaginationCustom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDate } from "@/lib/utils";
import { toast } from "react-toastify";
import NewsLayout from "@/layout/NewsLayout";
import {
  getPdfMapDownloadUrl,
  normalizePdfMap,
  useGetPdfMapsQuery,
} from "@/services/pdfMapsService";
import { DocumentSkeletonCard } from "@/pages/PdfMaps/Skeleton";

const ANY_YEAR = "all";
const ANY_SCALE = "all";
const PDF_MAP_SCALE_OPTIONS = ["1:10.000", "1:25.000"];
const YEAR_SELECT_CONTENT_CLASS = "max-h-64 overflow-y-auto sm:max-h-80";

function buildYearOptions() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: currentYear - 1990 }, (_, index) =>
    String(currentYear - index),
  );
}

function formatFileSize(value) {
  const bytes = Number(value || 0);
  if (!bytes) return "Không rõ dung lượng";

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export default function PdfMapsPage() {
  const navigate = useNavigate();
  const yearOptions = useMemo(() => buildYearOptions(), []);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 6,
    yearFrom: ANY_YEAR,
    yearTo: ANY_YEAR,
    scaleLabel: ANY_SCALE,
    sortBy: "year",
    sortOrder: "DESC",
    lang: "vi",
  });
  const [search, setSearch] = useState("");
  const [previewItem, setPreviewItem] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const debouncedSearch = useDebounce(search, 400);

  const queryParams = useMemo(
    () => ({
      page: filters.page,
      limit: filters.limit,
      lang: filters.lang,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      q: debouncedSearch,
      yearFrom:
        filters.yearFrom === ANY_YEAR ? undefined : Number(filters.yearFrom),
      yearTo: filters.yearTo === ANY_YEAR ? undefined : Number(filters.yearTo),
      scaleLabel:
        filters.scaleLabel === ANY_SCALE ? undefined : filters.scaleLabel,
    }),
    [debouncedSearch, filters],
  );

  const { data, isLoading, isError, isFetching, refetch } =
    useGetPdfMapsQuery(queryParams);

  const pdfMaps = Array.isArray(data?.data?.items)
    ? data.data.items.map(normalizePdfMap)
    : [];

  const pagination = data?.metadata || {};
  const total = Number(pagination.total || pdfMaps.length);
  const totalPages =
    Number(pagination.totalPages) ||
    Math.max(1, Math.ceil(total / filters.limit));

  const updateFilter = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSortChange = (value) => {
    const [sortBy, sortOrder] = value.split("-");
    setFilters((prev) => ({ ...prev, sortBy, sortOrder, page: 1 }));
  };

  const handleYearChange = (field, value) => {
    setFilters((prev) => {
      const next = { ...prev, [field]: value, page: 1 };
      if (
        field === "yearFrom" &&
        value !== ANY_YEAR &&
        next.yearTo !== ANY_YEAR &&
        Number(value) > Number(next.yearTo)
      ) {
        next.yearTo = value;
      }
      if (
        field === "yearTo" &&
        value !== ANY_YEAR &&
        next.yearFrom !== ANY_YEAR &&
        Number(value) < Number(next.yearFrom)
      ) {
        next.yearFrom = value;
      }
      return next;
    });
  };

  const resetFilters = () => {
    setSearch("");
    setFilters({
      page: 1,
      limit: 6,
      yearFrom: ANY_YEAR,
      yearTo: ANY_YEAR,
      scaleLabel: ANY_SCALE,
      sortBy: "year",
      sortOrder: "DESC",
      lang: "vi",
    });
  };

  const hasActiveFilters =
    Boolean(search.trim()) ||
    filters.yearFrom !== ANY_YEAR ||
    filters.yearTo !== ANY_YEAR ||
    filters.scaleLabel !== ANY_SCALE ||
    filters.sortBy !== "year" ||
    filters.sortOrder !== "DESC";

  const handleOpenDetail = (item) => {
    navigate(`/pdf-maps/${item.id}`, { state: { pdfMap: item } });
  };

  const handleDownload = async (item) => {
    try {
      const response = await getPdfMapDownloadUrl(item.id);
      const url = response?.data?.url ?? response?.url;
      if (!url) throw new Error("Máy chủ chưa trả về liên kết tải tệp.");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error?.message || "Không thể mở bản đồ PDF.");
    }
  };

  const handlePreview = async (item) => {
    if (!item?.id) return;

    setPreviewItem(item);
    setPreviewUrl("");
    setIsPreviewLoading(true);
    try {
      const response = await getPdfMapDownloadUrl(item.id);
      const url = response?.data?.url ?? response?.url;
      if (!url) throw new Error("Máy chủ chưa trả về liên kết tải tệp.");
      setPreviewUrl(url);
    } catch (error) {
      toast.error(error?.message || "Không thể xem trước bản đồ PDF.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <NewsLayout>
      <div className="min-h-screen bg-(image:--gradient-surface-page) py-6 sm:py-10">
        <main className="container mx-auto max-w-6xl px-4">
        <section className="relative mb-6 overflow-hidden rounded-[2rem] border border-(--gradient-surface-panel-border) bg-(image:--gradient-surface-panel) px-6 py-8 text-(--gradient-surface-panel-foreground) shadow-xl md:mb-8 md:px-10 md:py-10">
          <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border border-white/20" />
          <div className="absolute bottom-0 right-16 h-24 w-24 rounded-t-full bg-(--gradient-surface-panel-wash-strong)" />
          <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/70">Bản đồ chuyên đề</p>
              <h1 className="text-3xl font-bold leading-tight text-white md:text-4xl">
                Bản đồ PDF
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                Tra cứu các sản phẩm bản đồ PDF công khai theo tên, nội dung,
                năm phát hành và tỷ lệ bản đồ.
              </p>
            </div>
          </div>
        </section>

        <section
          className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-card/90 p-3 shadow-sm backdrop-blur lg:flex-row lg:items-center lg:p-4"
          aria-label="Bộ lọc bản đồ PDF"
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm theo tên hoặc nội dung bản đồ"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setFilters((prev) => ({ ...prev, page: 1 }));
              }}
              className="h-11 border-transparent bg-muted/70 pl-10 shadow-none focus-visible:bg-background"
            />
          </div>

          <div className="w-full lg:w-[130px]">
            <Select
              value={filters.yearFrom}
              onValueChange={(value) => handleYearChange("yearFrom", value)}
            >
              <SelectTrigger className="h-11 w-full border-transparent bg-muted/70 shadow-none">
                <SelectValue placeholder="Từ năm" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                className={YEAR_SELECT_CONTENT_CLASS}
              >
                <SelectItem value={ANY_YEAR}>Từ năm</SelectItem>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full lg:w-[130px]">
            <Select
              value={filters.yearTo}
              onValueChange={(value) => handleYearChange("yearTo", value)}
            >
              <SelectTrigger className="h-11 w-full border-transparent bg-muted/70 shadow-none">
                <SelectValue placeholder="Đến năm" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                className={YEAR_SELECT_CONTENT_CLASS}
              >
                <SelectItem value={ANY_YEAR}>Đến năm</SelectItem>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full lg:w-[150px]">
            <Select
              value={filters.scaleLabel}
              onValueChange={(value) => updateFilter("scaleLabel", value)}
            >
              <SelectTrigger className="h-11 w-full border-transparent bg-muted/70 shadow-none">
                <SelectValue placeholder="Tỷ lệ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_SCALE}>Mọi tỷ lệ</SelectItem>
                {PDF_MAP_SCALE_OPTIONS.map((scale) => (
                  <SelectItem key={scale} value={scale}>
                    {scale}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full lg:w-[170px]">
            <Select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onValueChange={handleSortChange}
            >
              <SelectTrigger className="h-11 w-full border-transparent bg-muted/70 shadow-none">
                <SelectValue placeholder="Sắp xếp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="year-DESC">Năm mới nhất</SelectItem>
                <SelectItem value="year-ASC">Năm cũ nhất</SelectItem>
                <SelectItem value="created_at-DESC">Mới cập nhật</SelectItem>
                <SelectItem value="title-ASC">Tiêu đề A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full lg:w-[120px]">
            <Select
              value={String(filters.limit)}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  limit: Number(value),
                  page: 1,
                }))
              }
            >
              <SelectTrigger className="h-11 w-full border-transparent bg-muted/70 shadow-none">
                <SelectValue placeholder="Hiển thị" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 mục</SelectItem>
                <SelectItem value="12">12 mục</SelectItem>
                <SelectItem value="24">24 mục</SelectItem>
                <SelectItem value="50">50 mục</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button type="button" variant="ghost" onClick={resetFilters}>
              Xóa lọc
            </Button>
          )}
        </section>

        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: filters.limit }).map((_, index) => (
              <DocumentSkeletonCard key={index} />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-card-foreground">
            <Map className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
            <p className="mb-4 font-medium">
              Không thể tải danh sách bản đồ PDF.
            </p>
            <Button variant="soft-warning" onClick={() => refetch()}>
              Thử lại
            </Button>
          </div>
        )}

        {!isLoading && !isError && (
          <>
            {pdfMaps.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center text-card-foreground">
                <Map className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                <p className="font-medium">Không tìm thấy bản đồ phù hợp.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Thử thay đổi từ khóa, khoảng năm hoặc tỷ lệ bản đồ.
                </p>
              </div>
            ) : (
              <>
                <div className="relative space-y-4">
                  {isFetching && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-sm">
                      <LoadingInline size="large" />
                    </div>
                  )}

                  {pdfMaps.map((item) => {
                    return (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>
                          <div>
                            <Card
                              variant="interactive"
                              role="button"
                              tabIndex={0}
                              className="group cursor-pointer overflow-hidden py-0 sm:flex sm:flex-row"
                              aria-label={`Xem trước ${item.title || "bản đồ PDF"}`}
                              onClick={() => void handlePreview(item)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  void handlePreview(item);
                                }
                              }}
                            >
                              <div className="relative h-44 shrink-0 overflow-hidden border-b border-border bg-muted sm:h-auto sm:min-h-56 sm:w-64 sm:border-b-0 sm:border-r">
                          <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
                            {item.year && (
                              <Badge variant="secondary">{item.year}</Badge>
                            )}
                          </div>

                          <div className="flex h-full items-center justify-center bg-(image:--gradient-surface-map)">
                            <div className="rounded-lg border border-border bg-card/90 p-4 text-center shadow-sm">
                              <Map className="mx-auto mb-2 h-10 w-10 text-primary" />
                              <p className="text-xs font-medium text-card-foreground">
                                Bản đồ PDF
                              </p>
                            </div>
                          </div>
                              </div>

                              <CardContent className="flex min-h-56 flex-1 flex-col p-5 sm:p-6">
                          <h2 className="line-clamp-2 text-xl font-semibold leading-7 text-card-foreground transition-colors group-hover:text-primary">
                            {item.title || `Bản đồ PDF #${item.id}`}
                          </h2>
                          <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                            {item.description || "Chưa có mô tả."}
                          </p>

                          <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Ruler className="h-3.5 w-3.5" />
                              <span>{item.scale || "Chưa cập nhật tỷ lệ"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5" />
                              <span className="truncate">
                                {item.region || "Chưa cập nhật cơ quan lập"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDate(item.createdAt)}
                              </span>
                              <span className="flex min-w-0 items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">
                                  {formatFileSize(item.fileSize)}
                                </span>
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 flex gap-2">
                            <Button
                              type="button"
                              variant="soft-primary"
                              size="sm"
                              className="flex-1"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleOpenDetail(item);
                              }}
                            >
                              <Eye />
                              Chi tiết
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!item.id}
                              aria-label="Mở bản đồ PDF"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleDownload(item);
                              }}
                            >
                              <Download />
                            </Button>
                          </div>
                              </CardContent>
                            </Card>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" sideOffset={8}>
                          Nhấp để xem trước PDF
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <PaginationCustom
                      currentPage={filters.page}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
        </main>
      </div>

      <Dialog
        open={Boolean(previewItem)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewItem(null);
            setPreviewUrl("");
          }
        }}
      >
        <DialogContent className="flex h-[90vh] max-w-6xl flex-col overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-6 py-4 pr-12">
            <DialogTitle>
              {previewItem?.title || "Xem trước bản đồ PDF"}
            </DialogTitle>
            <DialogDescription>
              Bản xem trước PDF. Chọn “Chi tiết” để xem thông tin đầy đủ.
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-muted p-4">
            {isPreviewLoading ? (
              <div className="flex h-full items-center justify-center">
                <LoadingInline size="large" />
              </div>
            ) : previewUrl ? (
              <iframe
                src={previewUrl}
                title={`Xem trước ${previewItem?.title || "bản đồ PDF"}`}
                className="aspect-[210/297] h-full w-auto max-w-full rounded-md bg-white shadow-lg"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="mb-4 text-sm font-medium text-foreground">
                  Không thể tải bản xem trước PDF.
                </p>
                <Button onClick={() => void handlePreview(previewItem)}>
                  <RefreshCw />
                  Thử lại
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </NewsLayout>
  );
}
