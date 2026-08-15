import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Download,
  Eye,
  FileText,
  Languages,
  Layers,
  Map,
  Ruler,
  Share2,
} from "lucide-react";
import { toast } from "react-toastify";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDate } from "@/lib/utils";
import NewsLayout from "@/layout/NewsLayout";
import { DocumentDetailSkeleton } from "@/pages/PdfMaps/Skeleton";
import {
  PDF_MAP_THEME_LABELS,
  getPdfMapDownloadUrl,
  normalizePdfMap,
  useGetPdfMapDetailQuery,
} from "@/services/pdfMapsService";

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

function getThemeLabel(themeCode) {
  return PDF_MAP_THEME_LABELS[themeCode] || "Bản đồ khác";
}

export default function PdfMapDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fallbackPdfMap = location.state?.pdfMap || null;
  const [previewUrl, setPreviewUrl] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const previewedMapIdRef = useRef(null);

  const { data, isLoading, isError } = useGetPdfMapDetailQuery(id);
  const rawPdfMap = data?.data || fallbackPdfMap;
  const pdfMap = rawPdfMap ? normalizePdfMap(rawPdfMap) : null;

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = pdfMap?.title || "Bản đồ PDF WebGIS Cẩm Phả";

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url: shareUrl });
      } catch {
        // User cancelled native sharing.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Đã sao chép liên kết bản đồ.");
    } catch {
      toast.error("Không thể sao chép liên kết.");
    }
  };

  const getFileUrl = useCallback(
    async (pdfMapId = pdfMap?.id ?? id) => {
      const response = await getPdfMapDownloadUrl(pdfMapId);
      const url = response?.data?.url ?? response?.url;
      if (!url) throw new Error("Máy chủ chưa trả về liên kết tải tệp.");
      return url;
    },
    [id, pdfMap?.id],
  );

  const handleOpenFile = async () => {
    try {
      window.open(await getFileUrl(), "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error?.message || "Không thể mở bản đồ PDF.");
    }
  };

  const handlePreview = async () => {
    setIsPreviewLoading(true);
    try {
      setPreviewUrl(await getFileUrl());
    } catch (error) {
      toast.error(error?.message || "Không thể xem trước bản đồ PDF.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (pdfMap?.title) {
      document.title = `${pdfMap.title} - Bản đồ PDF Cẩm Phả`;
    }
  }, [pdfMap]);

  useEffect(() => {
    setPreviewUrl("");
    previewedMapIdRef.current = null;
  }, [id]);

  useEffect(() => {
    const pdfMapId = pdfMap?.id;
    if (!pdfMapId || previewedMapIdRef.current === pdfMapId) return undefined;

    let isCancelled = false;
    previewedMapIdRef.current = pdfMapId;
    setIsPreviewLoading(true);

    const loadPreview = async () => {
      try {
        const url = await getFileUrl(pdfMapId);
        if (!isCancelled) setPreviewUrl(url);
      } catch (error) {
        if (!isCancelled) {
          toast.error(error?.message || "Không thể xem trước bản đồ PDF.");
        }
      } finally {
        if (!isCancelled) setIsPreviewLoading(false);
      }
    };

    void loadPreview();
    return () => {
      isCancelled = true;
      if (previewedMapIdRef.current === pdfMapId) {
        previewedMapIdRef.current = null;
      }
    };
  }, [getFileUrl, pdfMap?.id]);

  if (isLoading && !pdfMap) {
    return (
      <NewsLayout>
        <DocumentDetailSkeleton />
      </NewsLayout>
    );
  }

  if (isError || !pdfMap) {
    return (
      <NewsLayout>
        <main className="container mx-auto px-4 py-8 text-center">
          <Map className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
          <h1 className="mb-4 text-2xl font-bold text-foreground">
            Không tìm thấy bản đồ PDF
          </h1>
          <Button onClick={() => navigate("/pdf-maps")}>
            <ArrowLeft />
            Quay lại danh sách
          </Button>
        </main>
      </NewsLayout>
    );
  }

  return (
    <NewsLayout>
      <main className="container mx-auto max-w-6xl px-4 py-6 md:py-10">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/pdf-maps")}
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
                <Badge variant="soft-info">
                  <Layers />
                  {getThemeLabel(pdfMap.themeCode)}
                </Badge>
                {pdfMap.year && (
                  <Badge variant="secondary">{pdfMap.year}</Badge>
                )}
                {pdfMap.fallbackUsed && (
                  <Badge variant="soft-warning">
                    <Languages />
                    Đang hiển thị bản dịch dự phòng
                  </Badge>
                )}
              </div>

              <h1 className="mb-5 max-w-4xl text-3xl font-bold leading-tight text-white md:text-5xl">
                {pdfMap.title || `Bản đồ PDF #${pdfMap.id}`}
              </h1>

              <div className="flex flex-col gap-4 border-t border-white/20 pt-6 md:flex-row md:items-center">
                <div className="flex flex-wrap gap-4 text-sm text-white/75">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(pdfMap.createdAt)}
                  </span>
                  <span className="flex items-center gap-2">
                    <Map className="h-4 w-4" />
                    {pdfMap.region || "Thành phố Cẩm Phả"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 md:ml-auto">
                  <Button variant="soft-info" size="sm" onClick={handleShare}>
                    <Share2 />
                    Chia sẻ
                  </Button>
                  <Button
                    variant="soft-primary"
                    size="sm"
                    disabled={!pdfMap?.id}
                    onClick={handleOpenFile}
                  >
                    <Download />
                    Mở bản đồ PDF
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <Card className="mb-6 overflow-hidden rounded-2xl border-border bg-card shadow-sm">
            <CardContent className="grid gap-4 p-4 text-sm md:grid-cols-2 md:p-5">
              <div className="flex items-start gap-3">
                <Ruler className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Tỷ lệ</p>
                  <p className="font-medium text-card-foreground">
                    {pdfMap.scale || "Chưa cập nhật"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-muted-foreground">Tên tệp</p>
                  <p className="truncate font-medium text-card-foreground">
                    {pdfMap.fileName ||
                      pdfMap.original_name ||
                      "Chưa có tên tệp"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Download className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Dung lượng</p>
                  <p className="font-medium text-card-foreground">
                    {formatFileSize(pdfMap.fileSize ?? pdfMap.size_bytes)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Languages className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Ngôn ngữ dữ liệu</p>
                  <p className="font-medium text-card-foreground">
                    {(pdfMap.lang || "vi").toUpperCase()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {pdfMap.description && (
            <div className="mb-6 rounded-r-2xl border-l-4 border-primary bg-card/70 px-5 py-4 text-base font-medium text-muted-foreground shadow-sm md:text-lg">
              {pdfMap.description}
            </div>
          )}

          <Card className="overflow-hidden rounded-2xl border-border bg-card shadow-lg">
            <CardContent className="p-2">
              {previewUrl ? (
                <div className="overflow-hidden rounded-lg bg-muted">
                  <div className="flex items-center justify-end border-b border-border bg-card px-4 py-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleOpenFile}
                        >
                          <Download />
                          Mở trong tab mới
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={8}>
                        Mở PDF trong tab mới
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="overflow-x-auto bg-muted p-3 sm:p-6">
                    <iframe
                      src={previewUrl}
                      title={`Xem trước ${pdfMap.title || "bản đồ PDF"}`}
                      className="mx-auto aspect-[210/297] w-full min-w-80 max-w-[52.5rem] rounded-sm bg-white shadow-lg"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex min-h-80 flex-col items-center justify-center rounded-lg bg-muted p-6 text-center">
                  <FileText className="mb-3 h-12 w-12 text-muted-foreground" />
                  <p className="mb-4 max-w-md font-medium text-foreground">
                    {isPreviewLoading
                      ? "Đang tải bản xem trước PDF..."
                      : "Không thể tự động tải bản xem trước. Bạn có thể thử lại."}
                  </p>
                  <Button
                    disabled={!pdfMap?.id || isPreviewLoading}
                    onClick={handlePreview}
                  >
                    <Eye />
                    {isPreviewLoading ? "Đang chuẩn bị..." : "Xem trước PDF"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </article>
      </main>
    </NewsLayout>
  );
}
