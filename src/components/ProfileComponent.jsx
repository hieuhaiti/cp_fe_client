import { createElement, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  BadgeCheck,
  Calendar,
  CheckCircle2,
  KeyRound,
  LogOut,
  Mail,
  Pencil,
  Phone,
  Save,
  Shield,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LoadingOverlay from "@/components/common/LoadingOverlay";
import { formatDateTime, praseLink } from "@/lib/utils";
import {
  changePassword,
  setPassword,
  updateProfile,
} from "@/services/authService";
import useAuthStore from "@/stores/useAuthStore";

const getInitials = (name) =>
  String(name || "Người dùng")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const getUserValue = (user, camelCase, snakeCase) =>
  user?.[camelCase] ?? user?.[snakeCase];

function AccountField({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-border/80 bg-muted/45 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {createElement(Icon, { className: "h-4 w-4" })}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 break-words text-sm font-semibold text-foreground sm:text-base">
            {value || "Chưa cập nhật"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ProfileComponent() {
  const navigate = useNavigate();
  const { fetchProfile, logout, user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [editMode, setEditMode] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [formData, setFormData] = useState({ full_name: "", phone: "" });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const profile = useMemo(() => {
    if (!user) return null;

    return {
      avatarUrl: getUserValue(user, "avatarUrl", "avatar_url"),
      createdAt: getUserValue(user, "createdAt", "created_at"),
      email: user.email || "",
      emailVerified: getUserValue(user, "emailVerified", "email_verified"),
      fullName:
        getUserValue(user, "fullName", "full_name") ||
        user.username ||
        "Người dùng",
      hasPassword: getUserValue(user, "hasPassword", "has_password") !== false,
      isActive: getUserValue(user, "isActive", "is_active") !== false,
      lastLogin: getUserValue(user, "lastLogin", "last_login"),
      phone: user.phone || "",
      roleName: user.role?.name || "Người dùng",
    };
  }, [user]);

  useEffect(() => {
    setFormData({
      full_name: profile?.fullName || "",
      phone: profile?.phone || "",
    });
    setAvatarFailed(false);
  }, [profile?.avatarUrl, profile?.fullName, profile?.phone]);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
      toast.success("Đăng xuất thành công!");
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Không thể đăng xuất. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const cancelEditing = () => {
    setFormData({
      full_name: profile?.fullName || "",
      phone: profile?.phone || "",
    });
    setEditMode(false);
  };

  const handleUpdateProfile = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      await updateProfile({
        fullName: formData.full_name.trim(),
        phone: formData.phone.trim(),
      });
      await fetchProfile();
      setEditMode(false);
      toast.success("Cập nhật thông tin thành công.");
    } catch (error) {
      toast.error(error?.message || "Cập nhật thất bại. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Mật khẩu xác nhận chưa khớp.");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }

    if (
      profile?.hasPassword &&
      passwordForm.newPassword === passwordForm.currentPassword
    ) {
      toast.error("Mật khẩu mới phải khác mật khẩu hiện tại.");
      return;
    }

    setIsLoading(true);
    try {
      if (profile?.hasPassword) {
        await changePassword({
          oldPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        });
      } else {
        await setPassword(passwordForm.newPassword);
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast.success(
        profile?.hasPassword
          ? "Đổi mật khẩu thành công. Vui lòng đăng nhập lại."
          : "Thiết lập mật khẩu thành công. Vui lòng đăng nhập lại.",
      );
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(
        error?.message || "Không thể cập nhật mật khẩu. Vui lòng thử lại.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-sm rounded-2xl border border-border bg-card p-7 text-center shadow-sm">
          <UserRound className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 text-xl font-semibold text-foreground">
            Bạn chưa đăng nhập
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Đăng nhập để xem và quản lý thông tin tài khoản.
          </p>
          <Button
            variant="gradient-primary"
            className="mt-6 w-full"
            onClick={() => navigate("/login")}
          >
            Đăng nhập
          </Button>
        </div>
      </div>
    );
  }

  const passwordTabLabel = profile.hasPassword
    ? "Đổi mật khẩu"
    : "Thiết lập mật khẩu";

  return (
    <div className="min-h-screen bg-(image:--gradient-surface-page)">
      {isLoading && <LoadingOverlay />}

      <div className="container mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <section className="relative overflow-hidden rounded-[2rem] border border-(--gradient-surface-panel-border) bg-(image:--gradient-surface-panel) px-6 py-8 text-(--gradient-surface-panel-foreground) shadow-xl sm:px-10 sm:py-10">
          <div className="absolute -right-14 -top-20 h-64 w-64 rounded-full border border-white/20" />
          <div className="absolute bottom-0 right-16 h-24 w-24 rounded-t-full bg-(--gradient-surface-panel-wash-strong)" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4 sm:gap-5">
              <div className="flex h-18 w-18 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/25 bg-white/15 text-xl font-bold text-white shadow-lg sm:h-22 sm:w-22 sm:text-2xl">
                {profile.avatarUrl && !avatarFailed ? (
                  <img
                    src={praseLink(profile.avatarUrl)}
                    alt={`Ảnh đại diện ${profile.fullName}`}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  getInitials(profile.fullName)
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                  Tài khoản của bạn
                </p>
                <h1 className="mt-2 truncate text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {profile.fullName}
                </h1>
                <p className="mt-1 truncate text-sm text-white/75">
                  {profile.email}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium text-white">
                    <Shield className="h-3.5 w-3.5" />
                    {profile.roleName}
                  </span>
                  {profile.emailVerified && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium text-white">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Email đã xác thực
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              className="shrink-0 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              onClick={() => {
                setActiveTab("info");
                setEditMode(true);
              }}
            >
              <Pencil className="h-4 w-4" />
              Chỉnh sửa hồ sơ
            </Button>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <main className="min-w-0 rounded-[1.5rem] border border-border bg-card p-5 shadow-sm sm:p-8">
            <div className="mb-7 grid grid-cols-1 gap-2 rounded-xl border border-border bg-muted/50 p-1.5 sm:grid-cols-2">
              <Button
                type="button"
                variant={activeTab === "info" ? "soft-primary" : "ghost"}
                onClick={() => {
                  setActiveTab("info");
                  setEditMode(false);
                }}
                className="justify-start"
              >
                <UserRound className="h-4 w-4" />
                Thông tin cá nhân
              </Button>
              <Button
                type="button"
                variant={activeTab === "password" ? "soft-primary" : "ghost"}
                onClick={() => {
                  setActiveTab("password");
                  setEditMode(false);
                }}
                className="justify-start"
              >
                <KeyRound className="h-4 w-4" />
                {passwordTabLabel}
              </Button>
            </div>

            {activeTab === "info" && (
              <section aria-labelledby="profile-info-title">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2
                      id="profile-info-title"
                      className="text-xl font-bold text-foreground"
                    >
                      {editMode ? "Cập nhật thông tin" : "Thông tin cá nhân"}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {editMode
                        ? "Các thay đổi sẽ được lưu vào tài khoản của bạn."
                        : "Thông tin liên hệ và trạng thái tài khoản."}
                    </p>
                  </div>
                  {!editMode && (
                    <Button
                      variant="soft-info"
                      size="sm"
                      onClick={() => setEditMode(true)}
                    >
                      <Pencil className="h-4 w-4" />
                      Chỉnh sửa
                    </Button>
                  )}
                </div>

                {editMode ? (
                  <form
                    onSubmit={handleUpdateProfile}
                    className="max-w-xl space-y-5"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="profile-full-name">Họ và tên</Label>
                      <Input
                        id="profile-full-name"
                        value={formData.full_name}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            full_name: event.target.value,
                          }))
                        }
                        variant="filled"
                        autoComplete="name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-phone">Số điện thoại</Label>
                      <Input
                        id="profile-phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            phone: event.target.value,
                          }))
                        }
                        variant="filled"
                        autoComplete="tel"
                      />
                    </div>
                    <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={cancelEditing}
                      >
                        Hủy
                      </Button>
                      <Button type="submit" variant="gradient-primary">
                        <Save className="h-4 w-4" />
                        Lưu thay đổi
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <AccountField
                      icon={UserRound}
                      label="Họ và tên"
                      value={profile.fullName}
                    />
                    <AccountField
                      icon={Mail}
                      label="Email"
                      value={profile.email}
                    />
                    <AccountField
                      icon={Phone}
                      label="Số điện thoại"
                      value={profile.phone}
                    />
                    <AccountField
                      icon={Shield}
                      label="Vai trò"
                      value={profile.roleName}
                    />
                    {profile.createdAt && (
                      <AccountField
                        icon={Calendar}
                        label="Ngày tạo tài khoản"
                        value={formatDateTime(profile.createdAt)}
                      />
                    )}
                    {profile.lastLogin && (
                      <AccountField
                        icon={Calendar}
                        label="Lần đăng nhập cuối"
                        value={formatDateTime(profile.lastLogin)}
                      />
                    )}
                  </div>
                )}
              </section>
            )}

            {activeTab === "password" && (
              <section
                aria-labelledby="profile-password-title"
                className="max-w-xl"
              >
                <div className="mb-6">
                  <h2
                    id="profile-password-title"
                    className="text-xl font-bold text-foreground"
                  >
                    {passwordTabLabel}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {profile.hasPassword
                      ? "Dùng mật khẩu mạnh và không chia sẻ mật khẩu với người khác."
                      : "Tài khoản của bạn chưa có mật khẩu. Thiết lập một mật khẩu để chủ động đăng nhập."}
                  </p>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-5">
                  {profile.hasPassword && (
                    <div className="space-y-2">
                      <Label htmlFor="current-password">
                        Mật khẩu hiện tại
                      </Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(event) =>
                          setPasswordForm((current) => ({
                            ...current,
                            currentPassword: event.target.value,
                          }))
                        }
                        variant="filled"
                        autoComplete="current-password"
                        required
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Mật khẩu mới</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(event) =>
                        setPasswordForm((current) => ({
                          ...current,
                          newPassword: event.target.value,
                        }))
                      }
                      variant="filled"
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">
                      Xác nhận mật khẩu mới
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(event) =>
                        setPasswordForm((current) => ({
                          ...current,
                          confirmPassword: event.target.value,
                        }))
                      }
                      variant="filled"
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                  </div>
                  <div className="rounded-xl border border-info/20 bg-info/10 px-4 py-3 text-sm leading-6 text-info">
                    Mật khẩu cần có ít nhất 6 ký tự. Nên kết hợp chữ hoa, chữ
                    thường, số và ký tự đặc biệt.
                  </div>
                  <Button
                    type="submit"
                    variant="gradient-info"
                    className="w-full sm:w-auto"
                  >
                    <KeyRound className="h-4 w-4" />
                    {passwordTabLabel}
                  </Button>
                </form>
              </section>
            )}
          </main>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <section className="rounded-[1.25rem] border border-border bg-card/90 p-5 shadow-sm backdrop-blur">
              <h2 className="text-sm font-semibold text-foreground">
                Trạng thái tài khoản
              </h2>
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle2
                    className={`h-5 w-5 ${profile.isActive ? "text-success" : "text-muted-foreground"}`}
                  />
                  <div>
                    <p className="font-medium text-foreground">
                      {profile.isActive
                        ? "Tài khoản hoạt động"
                        : "Tài khoản tạm khóa"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Trạng thái truy cập hệ thống
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <BadgeCheck
                    className={`h-5 w-5 ${profile.emailVerified ? "text-success" : "text-warning"}`}
                  />
                  <div>
                    <p className="font-medium text-foreground">
                      {profile.emailVerified
                        ? "Email đã xác thực"
                        : "Email chưa xác thực"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {profile.email || "Chưa có email"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <Button
              variant="soft-destructive"
              onClick={handleLogout}
              className="w-full justify-start"
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất khỏi tài khoản
            </Button>
          </aside>
        </div>
      </div>
    </div>
  );
}
