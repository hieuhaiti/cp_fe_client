import { useEffect } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import NewsLayout from "@/layout/NewsLayout";

export default function Policy() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);
  return (
    <NewsLayout>
      <div className="min-h-full bg-muted/40">
        <header className="border-b border-border bg-card">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mb-5"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft />
              Quay lại
            </Button>
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
              Chính sách quyền riêng tư
            </h1>
            <p className="mt-2 text-base text-muted-foreground sm:text-lg">
              Cổng WebGIS thành phố Cẩm Phả
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
          <main className="space-y-8 rounded-lg border border-border bg-card p-5 shadow-md sm:p-8">
          {/* 1. Giới thiệu */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b-2 border-primary">
              1. Giới thiệu
            </h2>
            <div className="space-y-4 text-foreground/85 leading-relaxed">
              <p>
                Chào mừng bạn đến với <strong>Cổng WebGIS thành phố Cẩm Phả</strong>.
              </p>
              <p>
                Chúng tôi tôn trọng quyền riêng tư của người dùng và cam kết bảo
                vệ thông tin cá nhân của bạn.
              </p>
              <p>
                Chính sách này giải thích cách chúng tôi thu thập, sử dụng và
                bảo vệ thông tin khi bạn sử dụng ứng dụng.
              </p>
            </div>
          </section>

          {/* 2. Thông tin chúng tôi thu thập */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b-2 border-primary">
              2. Thông tin chúng tôi thu thập
            </h2>

            <div className="space-y-6">
              {/* 2.1 */}
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  2.1 Thông tin cá nhân
                </h3>
                <p className="text-foreground/85 mb-3">
                  Chúng tôi có thể thu thập các thông tin sau khi người dùng
                  đăng nhập hoặc cung cấp tự nguyện:
                </p>
                <ul className="list-disc list-inside space-y-2 text-foreground/85 ml-2">
                  <li>Tên</li>
                  <li>Số điện thoại</li>
                  <li>Email</li>
                </ul>
              </div>

              {/* 2.2 */}
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  2.2 Thông tin không cá nhân
                </h3>
                <p className="text-foreground/85">
                  Chúng tôi không thu thập bất kỳ thông tin không cá nhân nào từ
                  người dùng.
                </p>
              </div>
            </div>
          </section>

          {/* 3. Mục đích sử dụng thông tin */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b-2 border-primary">
              3. Mục đích sử dụng thông tin
            </h2>
            <div className="text-foreground/85 leading-relaxed space-y-4">
              <p>Chúng tôi có thể sử dụng thông tin người dùng cung cấp để:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  Liên hệ trong trường hợp cần xác minh các vấn đề, phản ánh
                  hoặc nội dung do người dùng đăng tải
                </li>
                <li>Hỗ trợ xử lý sự việc</li>
                <li>Đảm bảo tính chính xác của thông tin</li>
                <li>Nâng cao chất lượng vận hành của ứng dụng</li>
              </ul>
            </div>
          </section>

          {/* 4. Chia sẻ thông tin */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b-2 border-primary">
              4. Chia sẻ thông tin
            </h2>
            <div className="space-y-4 text-foreground/85 leading-relaxed">
              <p>
                <strong>
                  Chúng tôi không bán, trao đổi hoặc chia sẻ thông tin cá nhân
                  của người dùng cho bên thứ ba.
                </strong>
              </p>
              <p>
                Chúng tôi chỉ có thể cung cấp thông tin khi có yêu cầu từ cơ
                quan pháp luật.
              </p>
            </div>
          </section>

          {/* 5. Bảo mật dữ liệu */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b-2 border-primary">
              5. Bảo mật dữ liệu
            </h2>
            <div className="space-y-4 text-foreground/85 leading-relaxed">
              <p>
                Chúng tôi áp dụng các biện pháp bảo mật hợp lý để bảo vệ thông
                tin của bạn.
              </p>
              <p className="italic text-muted-foreground">
                Tuy nhiên, không có phương thức truyền tải nào trên Internet là
                an toàn tuyệt đối.
              </p>
            </div>
          </section>

          {/* 6. Dịch vụ bên thứ ba */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b-2 border-primary">
              6. Dịch vụ bên thứ ba
            </h2>
            <div className="space-y-4 text-foreground/85 leading-relaxed">
              <p>Ứng dụng có thể sử dụng các dịch vụ bên thứ ba như:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Mapbox</li>
              </ul>
              <p>
                Các dịch vụ này có thể thu thập dữ liệu theo chính sách riêng
                của họ.
              </p>
            </div>
          </section>

          {/* 7. Quyền riêng tư của trẻ em */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b-2 border-primary">
              7. Quyền riêng tư của trẻ em
            </h2>
            <div className="space-y-4 text-foreground/85 leading-relaxed">
              <p>Ứng dụng không dành cho trẻ em dưới 13 tuổi.</p>
              <p>Chúng tôi không cố ý thu thập thông tin từ trẻ em.</p>
            </div>
          </section>

          {/* 8. Thay đổi chính sách */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b-2 border-primary">
              8. Thay đổi chính sách
            </h2>
            <div className="space-y-4 text-foreground/85 leading-relaxed">
              <p>Chúng tôi có thể cập nhật chính sách này theo thời gian.</p>
              <p>Mọi thay đổi sẽ được đăng tại trang này.</p>
            </div>
          </section>

          {/* 9. Liên hệ */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b-2 border-primary">
              9. Liên hệ
            </h2>
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-5 sm:p-6">
              <p className="mb-3 text-foreground/85">
                Nếu bạn có câu hỏi, vui lòng liên hệ:
              </p>
              <div className="flex items-center gap-3 text-foreground">
                <Mail className="size-6 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-semibold">Email:</p>
                  <a
                    href="mailto:dinhbaongoc1612@gmail.com"
                    className="break-all text-primary hover:underline"
                  >
                    dinhbaongoc1612@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </section>

            <div className="mt-12 border-t border-border pt-6 text-center text-sm text-muted-foreground">
              <p>Cập nhật lần cuối: {new Date().toLocaleDateString("vi-VN")}</p>
            </div>
          </main>
        </div>
      </div>
    </NewsLayout>
  );
}
