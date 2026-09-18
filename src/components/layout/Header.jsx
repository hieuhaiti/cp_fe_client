import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Book,
  ChevronDown,
  LogIn,
  LogOut,
  MessageSquare,
  Shield,
  ShieldUser,
  Smartphone,
  User,
} from "lucide-react";
import { toast } from "react-toastify";
import NotificationMenu from "@/components/common/NotificationMenu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { parseLink } from "@/lib/utils";
import { useMapStore } from "@/stores/Map/useMapStore";
import useAuthStore from "@/stores/useAuthStore.jsx";

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

const categories = [
  {
    id: 1,
    name: "Bản đồ",
    shortname: "Bản đồ",
    fullname: "Bản đồ",
    slug: ["map", ""],
  },
  {
    id: 2,
    name: "Tin tức",
    shortname: "Tin tức",
    fullname: "Tin tức",
    slug: "news",
  },
  {
    id: 3,
    name: "Tài liệu",
    shortname: "Tài liệu",
    fullname: "Tài liệu",
    slug: "documents",
  },
  {
    id: 4,
    name: "Bản đồ PDF",
    shortname: "Bản đồ PDF",
    fullname: "Bản đồ PDF",
    slug: "pdf-maps",
  },
  {
    id: 5,
    name: "Thực địa",
    shortname: "Thực địa",
    fullname: "Thực địa",
    slug: "real-terrain",
    externalUrl: "https://campha.tourismpj.pro.vn/thucdia/",
  },
];

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isGuideDialogOpen, setIsGuideDialogOpen] = useState(false);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const isLaptopL = useMediaQuery("(min-width: 1440px)");
  const isLargeDesktop = useMediaQuery(
    "(min-width: 1025px) and (max-width: 1208px)",
  );
  const setCategory = useMapStore((state) => state.setCategory);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);

  const activeItem = useMemo(() => {
    const [firstSegment = ""] = location.pathname.replace(/^\//, "").split("/");
    return firstSegment;
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Đăng xuất thành công!");
      navigate("/login");
      setIsUserMenuOpen(false);
    } catch {
      toast.error("Không thể đăng xuất. Vui lòng thử lại.");
    }
  };

  const openExternalLink = (path) => {
    const url = parseLink(path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const openGuideDialog = () => {
    setIsUserMenuOpen(false);
    setIsGuideDialogOpen(true);
  };

  const openDownloadDialog = () => {
    setIsUserMenuOpen(false);
    setIsDownloadDialogOpen(true);
  };

  const navigateCategory = (category) => {
    if (category.externalUrl) {
      window.open(category.externalUrl, "_blank", "noopener,noreferrer");
      return;
    }
    const slugs = Array.isArray(category.slug)
      ? category.slug
      : [category.slug];
    const navigateSlug = slugs[0] || "";
    navigate(`/${navigateSlug}`);
    setCategory(category.id);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Button
            type="button"
            variant="ghost-transparent"
            onClick={() => navigate("/")}
            className="group h-auto gap-2 px-1"
          >
            <ShieldUser className="size-8 text-(--brand-lime) transition-transform group-hover:scale-110" />
            {!isLargeDesktop && (
              <span className="text-xl font-bold text-foreground transition-colors group-hover:text-(--brand-lime)">
                WebGIS Cẩm Phả
              </span>
            )}
          </Button>

          <nav
            className="hidden flex-1 justify-center gap-2 lg:flex"
            aria-label="Điều hướng chính"
          >
            {categories.map((category) => {
              const slugs = Array.isArray(category.slug)
                ? category.slug
                : [category.slug];
              const isActive = slugs.includes(activeItem);

              return (
                <Tooltip key={category.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isActive ? "gradient-primary" : "ghost"}
                      className="h-auto w-auto px-3 py-2 whitespace-nowrap"
                      onClick={() => navigateCategory(category)}
                    >
                      {isLaptopL ? category.name : category.shortname}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{category.fullname}</TooltipContent>
                </Tooltip>
              );
            })}
          </nav>

          <div className="relative flex flex-1 justify-center lg:hidden">
            <Button
              type="button"
              onClick={() => setIsOpen((value) => !value)}
              aria-expanded={isOpen}
              aria-label="Mở menu điều hướng"
            >
              Menu
              <ChevronDown
                className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </Button>

            {isOpen && (
              <div className="absolute top-full z-20 mt-2 min-w-44 rounded-lg border border-border bg-background p-1 shadow-lg">
                <ul className="grid gap-1">
                  {categories.map((category) => {
                    const slugs = Array.isArray(category.slug)
                      ? category.slug
                      : [category.slug];
                    const isActive = slugs.includes(activeItem);

                    return (
                      <li key={category.id}>
                        <Button
                          variant={isActive ? "gradient-primary" : "ghost"}
                          className="h-auto w-full justify-center p-2"
                          onClick={() => {
                            navigateCategory(category);
                            setIsOpen(false);
                          }}
                        >
                          {category.shortname}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className="relative ml-auto flex items-center gap-2">
            {isAuthenticated ? (
              loading ? (
                <div className="flex items-center gap-2">
                  <span className="hidden h-4 w-24 animate-pulse rounded bg-muted sm:block" />
                  <span className="size-10 animate-pulse rounded-full bg-muted" />
                </div>
              ) : user ? (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="hidden max-w-40 truncate text-sm font-medium text-foreground sm:block">
                        {user.full_name || user.email}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{user.email}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant={isUserMenuOpen ? "soft-primary" : "outline"}
                        size="icon-lg"
                        onClick={() => setIsUserMenuOpen((value) => !value)}
                        className="rounded-full"
                        aria-expanded={isUserMenuOpen}
                        aria-label="Mở menu người dùng"
                      >
                        <User />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Menu người dùng</TooltipContent>
                  </Tooltip>

                  <NotificationMenu enabled />

                  {isUserMenuOpen && (
                    <div className="absolute top-12 right-0 z-50 w-60 overflow-hidden rounded-lg border border-border bg-background shadow-lg">
                      <div className="border-b border-border bg-primary/10 p-4">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {user.full_name || user.email}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </p>
                        <span className="mt-2 inline-block rounded bg-primary px-2 py-1 text-xs text-primary-foreground">
                          {user?.role?.name || "Người dùng"}
                        </span>
                      </div>

                      <ul className="grid gap-1 p-1">
                        <li>
                          <Button
                            variant="ghost"
                            className="h-auto w-full justify-start px-4 py-2"
                            onClick={() => {
                              navigate("/profile");
                              setIsUserMenuOpen(false);
                            }}
                          >
                            <User />
                            Hồ sơ
                          </Button>
                        </li>
                        <li>
                          <Button
                            variant="ghost"
                            className="h-auto w-full justify-start px-4 py-2"
                            onClick={() => {
                              navigate("/feedback/mine");
                              setIsUserMenuOpen(false);
                            }}
                          >
                            <MessageSquare />
                            Phản ánh của tôi
                          </Button>
                        </li>
                        <li className="my-1 border-t border-border" />
                        <li>
                          <Button
                            variant="ghost"
                            className="h-auto w-full justify-start px-4 py-2"
                            id="usage-guide-auth-button"
                            onClick={openGuideDialog}
                          >
                            <Book />
                            Hướng dẫn sử dụng
                          </Button>
                        </li>
                        <li>
                          <Button
                            variant="soft-primary"
                            className="h-auto w-full justify-start px-4 py-2"
                            id="download-app-auth-button"
                            onClick={openDownloadDialog}
                          >
                            <Smartphone />
                            Tải ứng dụng
                          </Button>
                        </li>
                        <li>
                          <Button
                            variant="ghost"
                            className="h-auto w-full justify-start px-4 py-2"
                            onClick={() => {
                              navigate("/policy");
                              setIsUserMenuOpen(false);
                            }}
                          >
                            <Shield />
                            Chính sách riêng tư
                          </Button>
                        </li>
                        <li className="my-1 border-t border-border" />
                        <li>
                          <Button
                            variant="soft-destructive"
                            className="h-auto w-full justify-start px-4 py-2"
                            onClick={handleLogout}
                          >
                            <LogOut />
                            Đăng xuất
                          </Button>
                        </li>
                      </ul>
                    </div>
                  )}
                </>
              ) : null
            ) : (
              <>
                <div className="hidden items-center gap-2 sm:flex">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        className="rounded-full"
                        id="usage-guide-guest-button"
                        onClick={openGuideDialog}
                        aria-label="Hướng dẫn sử dụng"
                      >
                        <Book />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Hướng dẫn sử dụng</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="soft-primary"
                        size="icon-sm"
                        className="rounded-full"
                        id="download-app-guest-button"
                        onClick={openDownloadDialog}
                        aria-label="Tải ứng dụng"
                      >
                        <Smartphone />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Tải ứng dụng</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        className="rounded-full"
                        onClick={() => navigate("/policy")}
                        aria-label="Chính sách quyền riêng tư"
                      >
                        <Shield />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Chính sách quyền riêng tư</TooltipContent>
                  </Tooltip>
                </div>
                <Button
                  variant="gradient-primary"
                  size="sm"
                  onClick={() => navigate("/login")}
                >
                  <LogIn />
                  Đăng nhập
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isGuideDialogOpen} onOpenChange={setIsGuideDialogOpen}>
        <DialogContent variant="default" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hướng dẫn sử dụng</DialogTitle>
            <DialogDescription>
              Chọn hướng dẫn phù hợp với nền tảng bạn đang sử dụng.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              id="open-webgis-guide-button"
              type="button"
              variant="outline"
              onClick={() => {
                openExternalLink("/uploads/HDSD_WEBGIS_CAMPHA.pdf");
                setIsGuideDialogOpen(false);
              }}
              className="group h-auto justify-start gap-3 p-4 text-left whitespace-normal hover:border-primary hover:bg-(--primary-subtle)"
            >
              <Book className="size-8 text-primary transition-transform group-hover:scale-110" />
              <span>
                <span className="block text-sm font-normal text-muted-foreground">
                  Hướng dẫn sử dụng
                </span>
                <span className="block font-semibold text-foreground">
                  WebGIS
                </span>
              </span>
            </Button>

            <Button
              id="open-mobile-guide-button"
              type="button"
              variant="outline"
              onClick={() => {
                openExternalLink(
                  "https://apicampha.tourismpj.pro.vn/uploads/HDSD_MOBILE_CAMPHA.pdf",
                );
                setIsGuideDialogOpen(false);
              }}
              className="group h-auto justify-start gap-3 p-4 text-left whitespace-normal hover:border-primary hover:bg-(--primary-subtle)"
            >
              <Smartphone className="size-8 text-primary transition-transform group-hover:scale-110" />
              <span>
                <span className="block text-sm font-normal text-muted-foreground">
                  Hướng dẫn sử dụng
                </span>
                <span className="block font-semibold text-foreground">
                  Ứng dụng di động
                </span>
              </span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDownloadDialogOpen}
        onOpenChange={setIsDownloadDialogOpen}
      >
        <DialogContent variant="default" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tải ứng dụng WebGIS Cẩm Phả</DialogTitle>
            <DialogDescription>
              Chọn nền tảng phù hợp với thiết bị của bạn.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              id="download-android-button"
              type="button"
              variant="outline"
              onClick={() => {
                openExternalLink("/uploads/campha.apk");
                setIsDownloadDialogOpen(false);
              }}
              className="group h-auto justify-start gap-3 p-4 text-left whitespace-normal hover:border-primary hover:bg-(--primary-subtle)"
            >
              <AndroidIcon className="size-8 text-primary transition-transform group-hover:scale-110" />
              <span>
                <span className="block text-sm font-normal text-muted-foreground">
                  Tải xuống cho
                </span>
                <span className="block font-semibold text-foreground">
                  Android
                </span>
              </span>
            </Button>

            <Button
              id="download-ios-testflight-button"
              type="button"
              variant="outline"
              onClick={() => {
                openExternalLink("https://testflight.apple.com/join/pxJSd11D");
                setIsDownloadDialogOpen(false);
              }}
              className="group h-auto justify-start gap-3 p-4 text-left whitespace-normal hover:border-primary hover:bg-(--primary-subtle)"
            >
              <AppleIcon className="size-8 text-foreground transition-transform group-hover:scale-110" />
              <span>
                <span className="block text-sm font-normal text-muted-foreground">
                  Cài đặt qua
                </span>
                <span className="block font-semibold text-foreground">
                  Apple TestFlight
                </span>
              </span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
