import { memo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Download,
  FileText,
  Map,
  Monitor,
  Newspaper,
  Smartphone,
  Tablet,
} from "lucide-react";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { parseLink } from "@/lib/utils";

function AppleIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.05 12.54c-.03-3.19 2.61-4.74 2.73-4.81a5.87 5.87 0 0 0-4.63-2.5c-1.95-.2-3.84 1.17-4.83 1.17-1.01 0-2.54-1.15-4.18-1.12a6.14 6.14 0 0 0-5.16 3.15c-2.25 3.89-.57 9.61 1.58 12.76 1.08 1.54 2.33 3.26 3.97 3.2 1.6-.07 2.2-1.03 4.13-1.03 1.91 0 2.48 1.03 4.15.99 1.72-.03 2.8-1.55 3.84-3.11a12.74 12.74 0 0 0 1.76-3.59 5.54 5.54 0 0 1-3.36-5.11ZM13.88 3.16A5.56 5.56 0 0 0 15.15-.83a5.67 5.67 0 0 0-3.67 1.9 5.3 5.3 0 0 0-1.3 3.84 4.68 4.68 0 0 0 3.7-1.75Z" />
    </svg>
  );
}

function AndroidIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="m17.6 9.48 1.84-3.18a.75.75 0 0 0-1.3-.75l-1.87 3.24A11.1 11.1 0 0 0 12 7.95c-1.5 0-2.94.3-4.27.84L5.86 5.55a.75.75 0 1 0-1.3.75L6.4 9.48A8.92 8.92 0 0 0 3 16.5h18a8.92 8.92 0 0 0-3.4-7.02ZM8 13.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm8 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2ZM3 17.5h18V21a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-3.5Z" />
    </svg>
  );
}

function UnSupported() {
  const navigate = useNavigate();

  const handleDownloadAndroid = () => {
    const url = parseLink("/uploads/campha.apk");
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownloadIos = () => {
    window.open(
      "https://testflight.apple.com/join/pxJSd11D",
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleOpenMobileGuide = () => {
    window.open(
      "https://apicampha.tourismpj.pro.vn/uploads/HDSD_MOBILE_CAMPHA.pdf",
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-background text-foreground">
      {/* Fixed/sticky Header on top */}
      <Header />

      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 size-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 size-80 rounded-full bg-(--brand-lime)/10 blur-3xl" />
      </div>

      {/* Main centered unsupported container */}
      <main className="relative z-10 flex min-h-[calc(100dvh-4rem)] flex-1 items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-xl space-y-6 rounded-2xl border border-border/80 bg-card/95 p-6 text-center shadow-xl backdrop-blur-md sm:p-8">
          {/* Device Icon Cluster & Badge */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative flex items-center justify-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner ring-1 ring-primary/20 sm:size-20">
                <Monitor className="size-8 sm:size-10" />
              </div>
              <div className="absolute -bottom-1 -right-2 flex size-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30 dark:text-amber-400">
                <Smartphone className="size-4" />
              </div>
              <div className="absolute -bottom-1 -left-2 flex size-8 items-center justify-center rounded-lg bg-teal-500/15 text-teal-600 ring-1 ring-teal-500/30 dark:text-teal-400">
                <Tablet className="size-4" />
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
              Bản đồ tương tác chỉ hỗ trợ máy tính (từ 1024px trở lên)
            </span>
          </div>

          {/* Heading & description */}
          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Giao diện Bản đồ chưa hỗ trợ trên Mobile &amp; iPad
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Hệ thống Bản đồ số WebGIS Cẩm Phả với các công cụ không gian chuyên
              sâu (viễn thám vệ tinh, mô phỏng ngập lụt, đo đạc 3D) được tối ưu
              tốt nhất trên máy tính để bàn và laptop.
            </p>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Để sử dụng bản đồ trên điện thoại hoặc máy tính bảng (iPad), quý
              khách vui lòng tải ứng dụng di động chuyên dụng bên dưới:
            </p>
          </div>

          {/* Centered Download Links */}
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                id="unsupported-download-android"
                type="button"
                variant="outline"
                onClick={handleDownloadAndroid}
                className="group h-auto justify-start gap-3 border-border p-4 text-left shadow-xs transition-all hover:border-primary hover:bg-(--primary-subtle)"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <AndroidIcon className="size-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs text-muted-foreground">
                    Tải file APK cho
                  </span>
                  <span className="block truncate font-semibold text-foreground">
                    Android
                  </span>
                </div>
                <Download className="size-4 text-muted-foreground transition-transform group-hover:translate-y-0.5 group-hover:text-primary" />
              </Button>

              <Button
                id="unsupported-download-ios"
                type="button"
                variant="outline"
                onClick={handleDownloadIos}
                className="group h-auto justify-start gap-3 border-border p-4 text-left shadow-xs transition-all hover:border-primary hover:bg-(--primary-subtle)"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground/10 text-foreground transition-transform group-hover:scale-110">
                  <AppleIcon className="size-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs text-muted-foreground">
                    Cài đặt qua TestFlight
                  </span>
                  <span className="block truncate font-semibold text-foreground">
                    iOS / iPadOS
                  </span>
                </div>
                <Download className="size-4 text-muted-foreground transition-transform group-hover:translate-y-0.5 group-hover:text-primary" />
              </Button>
            </div>

            <Button
              id="unsupported-mobile-guide"
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleOpenMobileGuide}
              className="gap-2 text-xs text-muted-foreground hover:text-primary"
            >
              <BookOpen className="size-3.5" />
              Xem hướng dẫn sử dụng ứng dụng di động (PDF)
            </Button>
          </div>

          {/* Quick links to other supported tabs */}
          <div className="border-t border-border/80 pt-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              Các chuyên mục khác vẫn được hỗ trợ đầy đủ trên thiết bị này:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate("/news")}
                className="gap-1.5 text-xs"
              >
                <Newspaper className="size-3.5 text-primary" />
                Tin tức
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate("/pdf-maps")}
                className="gap-1.5 text-xs"
              >
                <Map className="size-3.5 text-(--brand-lime)" />
                Bản đồ PDF
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate("/documents")}
                className="gap-1.5 text-xs"
              >
                <FileText className="size-3.5 text-sky-500" />
                Tài liệu
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default memo(UnSupported);
