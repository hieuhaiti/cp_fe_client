import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Calendar,
  Download,
  Eye,
  FileText,
  Search,
} from "lucide-react";
import LoadingInline from "@/components/common/LoadingInline";
import PaginationCustom from "@/components/common/PaginationCustom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  getDocumentDownloadUrl,
  normalizeDocument,
  useGetDocumentsQuery,
} from "@/services/documentsService";
import { DocumentListSkeletonCard } from "@/pages/Documents/Skeleton";

export default function DocumentsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    page: 1,
    limit: 12,
    sortBy: "issued_at",
    sortOrder: "DESC",
  });
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  const queryParams = useMemo(
    () => ({
      page: filters.page,
      limit: filters.limit,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      q: debouncedSearch || undefined,
    }),
    [debouncedSearch, filters],
  );

  const { data, isLoading, isError, isFetching, refetch } =
    useGetDocumentsQuery(queryParams);

  const documents = Array.isArray(data?.data?.items)
    ? data.data.items.map(normalizeDocument)
    : [];

  const pagination = data?.metadata || {};
  const total = Number(pagination.total ?? documents.length);
  const totalPages =
    Number(pagination.totalPages) ||
    Math.max(1, Math.ceil(total / filters.limit));

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSortChange = (value) => {
    const [sortBy, sortOrder] = value.split("-");
    setFilters((prev) => ({ ...prev, sortBy, sortOrder, page: 1 }));
  };

  const hasActiveFilters =
    Boolean(search.trim()) ||
    filters.sortBy !== "issued_at" ||
    filters.sortOrder !== "DESC";

  const resetFilters = () => {
    setSearch("");
    setFilters({ page: 1, limit: 12, sortBy: "issued_at", sortOrder: "DESC" });
  };

  const handleOpenDetail = (doc) => {
    navigate(`/documents/${doc.id}`, { state: { document: doc } });
  };

  const handleDownload = async (doc) => {
    try {
      const response = await getDocumentDownloadUrl(doc.id);
      const url = response?.data?.url ?? response?.url;
      if (!url) throw new Error("Máy chủ chưa trả về liên kết tải tệp.");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error?.message || "Không thể mở văn bản.");
    }
  };

  return (
    <NewsLayout>
      <div className="min-h-screen bg-(image:--gradient-surface-page) py-6 sm:py-10">
        <main className="container mx-auto max-w-6xl px-4">
          <section className="relative mb-6 overflow-hidden rounded-[2rem] border border-(--gradient-surface-panel-border) bg-(image:--gradient-surface-panel) px-6 py-8 text-(--gradient-surface-panel-foreground) shadow-xl md:mb-8 md:px-10 md:py-10">
            <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border border-white/20" />
            <div className="absolute bottom-0 right-16 h-24 w-24 rounded-t-full bg-(--gradient-surface-panel-wash-strong)" />
            <div className="relative">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/70">
                Cổng thông tin
              </p>
              <h1 className="text-3xl font-bold leading-tight text-white md:text-4xl">
                Văn bản tài liệu
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                Tra cứu các văn bản, quyết định, quy hoạch và tài liệu công khai
                của thành phố Cẩm Phả.
              </p>
            </div>
          </section>

          <section
            className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-card/90 p-3 shadow-sm backdrop-blur lg:flex-row lg:items-center lg:p-4"
            aria-label="Bộ lọc văn bản"
          >
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Tìm theo tiêu đề, mã văn bản hoặc cơ quan ban hành"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setFilters((prev) => ({ ...prev, page: 1 }));
                }}
                className="h-11 border-transparent bg-muted/70 pl-10 shadow-none focus-visible:bg-background"
              />
            </div>

            <div className="w-full lg:w-[200px]">
              <Select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onValueChange={handleSortChange}
              >
                <SelectTrigger className="h-11 w-full border-transparent bg-muted/70 shadow-none">
                  <SelectValue placeholder="Sắp xếp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="issued_at-DESC">Ngày ban hành mới nhất</SelectItem>
                  <SelectItem value="issued_at-ASC">Ngày ban hành cũ nhất</SelectItem>
                  <SelectItem value="created_at-DESC">Mới cập nhật</SelectItem>
                  <SelectItem value="title-ASC">Tiêu đề A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full lg:w-[130px]">
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
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: filters.limit > 12 ? 12 : filters.limit }).map((_, index) => (
                <DocumentListSkeletonCard key={index} />
              ))}
            </div>
          )}

          {isError && (
            <div className="rounded-lg border border-border bg-card p-8 text-center text-card-foreground">
              <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <p className="mb-4 font-medium">Không thể tải danh sách văn bản.</p>
              <Button variant="soft-warning" onClick={() => refetch()}>
                Thử lại
              </Button>
            </div>
          )}

          {!isLoading && !isError && (
            <>
              {documents.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-8 text-center text-card-foreground">
                  <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                  <p className="font-medium">Không tìm thấy văn bản phù hợp.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Thử thay đổi từ khóa hoặc bộ lọc.
                  </p>
                </div>
              ) : (
                <>
                  <div className="relative grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {isFetching && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-sm">
                        <LoadingInline size="large" />
                      </div>
                    )}

                    {documents.map((doc) => (
                      <Card
                        key={doc.id}
                        variant="interactive"
                        role="button"
                        tabIndex={0}
                        className="group flex cursor-pointer flex-col overflow-hidden"
                        aria-label={`Xem chi tiết ${doc.title || "văn bản"}`}
                        onClick={() => handleOpenDetail(doc)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleOpenDetail(doc);
                          }
                        }}
                      >
                        <CardContent className="flex flex-1 flex-col p-5">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="font-mono text-xs">
                              {doc.documentCode || doc.document_code || "—"}
                            </Badge>
                            {(doc.isPublic ?? doc.visibility === "public") && (
                              <Badge variant="soft-info" className="text-xs">
                                Công khai
                              </Badge>
                            )}
                          </div>

                          <h2 className="mb-2 line-clamp-2 text-base font-semibold leading-6 text-card-foreground transition-colors group-hover:text-primary">
                            {doc.title || `Văn bản #${doc.id}`}
                          </h2>

                          {(doc.issuingAgency || doc.issuing_agency) && (
                            <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Building2 className="h-3.5 w-3.5 shrink-0" />
                              <span className="line-clamp-1">
                                {doc.issuingAgency || doc.issuing_agency}
                              </span>
                            </p>
                          )}

                          {(doc.issuedAt || doc.issued_at) && (
                            <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5 shrink-0" />
                              {formatDate(doc.issuedAt || doc.issued_at)}
                            </p>
                          )}

                          {doc.description && (
                            <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                              {doc.description}
                            </p>
                          )}

                          <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-4">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(doc.createdAt || doc.created_at)}
                            </span>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="soft-primary"
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleOpenDetail(doc);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                                Chi tiết
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!doc.id}
                                aria-label="Tải văn bản"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleDownload(doc);
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
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
    </NewsLayout>
  );
}
