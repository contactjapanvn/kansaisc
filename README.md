# KSC Work Schedule — 株式会社関西SCシステム

Website quản lý lịch làm việc cho công ty KSC: đăng ký ca, xem lịch ngày mai, xác nhận đi làm, và trang quản lý.

Hỗ trợ **tiếng Việt / tiếng Nhật**, ưu tiên giao diện điện thoại.

## Chạy nhanh (Demo)

Mở trực tiếp:

- `index.html` — Trang chủ
- `register.html` — Đăng ký lịch làm
- `schedule.html` — Lịch ngày mai
- `confirm.html` — Xác nhận đi làm
- `admin.html` — Quản lý

Hoặc:

```bash
npx serve .
```

Site production hiện tại: https://kansaisc.vercel.app

### Tài khoản Demo

| Vai trò | Thông tin |
|--------|-----------|
| Admin | `admin` / `ksc-demo` |
| Xác nhận đi làm | `KSC001` PIN `1234`, `KSC002`→`2345`, `KSC003`→`3456` |

Dữ liệu Demo lưu trong `localStorage` trình duyệt (không phải dữ liệu nhân viên thật).

## Cấu trúc

```
css/app.css          Giao diện
js/config.js         mode: demo | live + GAS URL
js/i18n.js           VI / JA
js/demo-data.js      Seed Demo
js/api.js            API Demo / Live
gas/Code.gs          Google Apps Script backend
```

## Phân biệt Demo / Live

Trong `js/config.js`:

```js
mode: "demo",          // mặc định
GAS_WEB_APP_URL: "",   // để trống khi demo
```

- **Demo:** dữ liệu giả, badge vàng “Chế độ Demo”. Không báo đã lưu Google Sheets.
- **Live:** chỉ bật khi đã có URL Apps Script hoạt động (`mode: "live"` + URL). Khi đó mới lưu Sheets thật.

## Kết nối Google Sheets

1. Tạo Google Spreadsheet mới (riêng tư, không public).
2. Tạo 5 sheet (hoặc để script tự tạo):  
   `Employees` · `Registrations` · `ApprovedSchedules` · `Confirmations` · `Settings`
3. **Extensions → Apps Script**, dán nội dung `gas/Code.gs`.
4. **Project Settings → Script properties** thêm:
   - `ADMIN_USER` = tài khoản quản lý
   - `ADMIN_PASS` = mật khẩu mạnh
5. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy URL Web App vào `js/config.js`:

```js
mode: "live",
GAS_WEB_APP_URL: "https://script.google.com/macros/s/XXXX/exec",
```

7. Deploy lại website (Vercel / GitHub).

### Bảo mật

- PIN xác nhận chỉ kiểm tra ở backend (Apps Script), không trả PIN về client.
- Chức năng Admin yêu cầu đăng nhập + token.
- Không commit dữ liệu nhân viên thật lên GitHub.
- Spreadsheet giữ quyền riêng tư; chỉ Web App được gọi từ frontend.

## Deploy (Vercel)

Repo: https://github.com/contactjapanvn/kansaisc

```bash
npx vercel deploy --prod
```

Hoặc push lên `main` (đã nối Vercel GitHub) để auto-deploy.

## Luồng nghiệp vụ

1. Nhân viên **đăng ký** nhiều ngày + ca → trạng thái chờ duyệt.
2. Admin **duyệt / từ chối** và **xếp lịch chính thức**.
3. Nhân viên **xem lịch ngày mai** theo ca.
4. Nhân viên **xác nhận đi làm** bằng PIN cá nhân (không trùng, ghi thời gian).
