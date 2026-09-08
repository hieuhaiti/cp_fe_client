import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Download,
  FileText,
  Globe,
  Share2,
} from "lucide-react";
import { toast } from "react-toastify";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import NewsLayout from "@/layout/NewsLayout";
import {
  getDocumentDownloadUrl,
  normalizeDocument,
  useGetDocumentDetailQuery,
} from "@/services/documentsService";
import { DocumentDetailSkeleton } from "@/pages/Documents/Skeleton";

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

function InfoRow({ icon: IconComponent, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      {IconComponent ? (
        <IconComponent className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      ) : null}
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="font-medium text-card-foreground break-words">{value}</p>
      </div>
    </div>
  );
}

export default function DocumentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fallbackDoc = location.state?.document
    ? normalizeDocument(location.state.document)
    : null;

  const { data, isLoading, isError } = useGetDocumentDetailQuery(id);
  const rawDoc = data?.data?.document ?? data?.data ?? fallbackDoc;
  const doc = rawDoc ? normalizeDocument(rawDoc) : null;

  const isPublic = doc?.isPublic ?? doc?.visibility === "public";

  useEffect(() => {
    if (doc?.title) {
      document.title = `${doc.title} - Văn bản Cẩm Phả`;
    }
  }, [doc]);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = doc?.title || "Văn bản WebGIS Cẩm Phả";

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url: shareUrl });
      } catch {
        // User cancelled sharing.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Đã sao chép liên kết văn bản.");
    } catch {
      toast.error("Không thể sao chép liên kết.");
    }
  };

  const handleOpenFile = async () => {
    try {
      const response = await getDocumentDownloadUrl(id);
      const url = response?.data?.url ?? response?.url;
      if (!url) throw new Error("Máy chủ chưa trả về liên kết tải tệp.");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error?.message || "Không thể mở văn bản.");
    }
  };

  if (isLoading && !doc) {
    return (
      <NewsLayout>
        <DocumentDetailSkeleton />
      </NewsLayout>
    );
  }

  if (isError || !doc) {
    return (
      <NewsLayout>
        <main className="container mx-auto px-4 py-8 text-center">
          <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
          <h1 className="mb-4 text-2xl font-bold text-foreground">
            Không tìm thấy văn bản
          </h1>
          <Button onClick={() => navigate("/documents")}>
            <ArrowLeft />
            Quay lại danh sách
          </Button>
        </main>
      </NewsLayout>
    );
  }

  return (
    <NewsLayout>
      <main className="container mx-auto max-w-5xl px-4 py-6 md:py-10">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/documents")}
          className="mb-6 bg-card/80 shadow-sm"
        >
          <ArrowLeft />
          Quay lại danh sách
        </Button>

        <article>
          <header className="relative mb-6 overflow-hidden rounded-[2rem] border border-(--gradient-surface-panel-border) bg-(image:--gradient-surface-panel) p-6 text-(--gradient-surface-panel-foreground) shadow-xl sm:p-10">
            <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full border border-white/15" />
            <div className="relative">
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge variant="secondary" className="font-mono">
                  {doc.documentCode || doc.document_code}
                </Badge>
                {isPublic && (
                  <Badge variant="soft-info">
                    <Globe className="mr-1 h-3 w-3" />
                    Công khai
                  </Badge>
                )}
              </div>

              <h1 className="mb-5 max-w-4xl text-2xl font-bold leading-snug text-white md:text-4xl">
                {doc.title || `Văn bản #${doc.id}`}
              </h1>

              <div className="flex flex-col gap-4 border-t border-white/20 pt-6 md:flex-row md:items-center">
                <div className="flex flex-wrap gap-4 text-sm text-white/75">
                  {(doc.issuedAt || doc.issued_at) && (
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Ban hành: {formatDate(doc.issuedAt || doc.issued_at)}
                    </span>
                  )}
                  {(doc.issuingAgency || doc.issuing_agency) && (
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {doc.issuingAgency || doc.issuing_agency}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 md:ml-auto">
                  <Button variant="soft-info" size="sm" onClick={handleShare}>
                    <Share2 />
                    Chia sẻ
                  </Button>
                  <Button
                    variant="soft-primary"
                    size="sm"
                    disabled={!doc.id}
                    onClick={handleOpenFile}
                  >
                    <Download />
                    Mở / Tải tệp
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="overflow-hidden rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileText className="text-primary h-4 w-4" />
                  Thông tin văn bản
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <InfoRow
                  icon={Building2}
                  label="Cơ quan ban hành"
                  value={doc.issuingAgency || doc.issuing_agency}
                />
                <InfoRow
                  icon={Calendar}
                  label="Ngày ban hành"
                  value={
                    (doc.issuedAt || doc.issued_at)
                      ? formatDate(doc.issuedAt || doc.issued_at)
                      : null
                  }
                />
                <InfoRow
                  icon={Globe}
                  label="Trạng thái"
                  value={isPublic ? "Công khai" : "Nội bộ"}
                />
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Download className="text-primary h-4 w-4" />
                  Tệp văn bản
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <InfoRow
                  icon={FileText}
                  label="Tên tệp"
                  value={doc.originalName || doc.original_name}
                />
                <InfoRow
                  icon={Download}
                  label="Dung lượng"
                  value={formatFileSize(doc.sizeBytes ?? doc.size_bytes)}
                />
                <div className="pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!doc.id}
                    onClick={handleOpenFile}
                    className="w-full"
                  >
                    <Download className="h-4 w-4" />
                    Mở / Tải tệp
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {doc.description && (
            <div className="mt-4 rounded-r-2xl border-l-4 border-primary bg-card/70 px-5 py-4 text-base text-muted-foreground shadow-sm">
              {doc.description}
            </div>
          )}

          <Card className="mt-4 overflow-hidden rounded-2xl">
            <CardContent className="grid gap-4 p-5 text-sm sm:grid-cols-2">
              <InfoRow
                icon={Calendar}
                label="Ngày tạo"
                value={
                  (doc.createdAt || doc.created_at)
                    ? formatDate(doc.createdAt || doc.created_at)
                    : null
                }
              />
              <InfoRow
                icon={Calendar}
                label="Cập nhật gần nhất"
                value={
                  (doc.updatedAt || doc.updated_at)
                    ? formatDate(doc.updatedAt || doc.updated_at)
                    : null
                }
              />
            </CardContent>
          </Card>
        </article>
      </main>
    </NewsLayout>
  );
}
