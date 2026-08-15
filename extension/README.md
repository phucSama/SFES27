# PHẢN ỨNG. — Extension Chrome (v1.2.0)

Bôi đen (chọn) một **tên nguyên tố** ("Sắt", "Natri", "Fe"...), một **công thức phản ứng**
("Zn + HCl"...), một **thuật ngữ Vật lý/Sinh học** ("mặt phẳng nghiêng", "tế bào thực vật"...),
hoặc một **phương trình mặt phẳng / mặt cầu / đường thẳng trong Oxyz** ("x + y + z = 6",
"x² + y² + z² = 9", "(x-1)/2 = (y+2)/-1 = (z-3)/1"...) trên bất kỳ trang web nào — một biểu tượng
⚗ nhỏ sẽ hiện lên cạnh vùng chọn, giống cách Google Dịch hiện icon khi bạn bôi đen văn bản. Bấm vào
icon để mở ngay phòng thí nghiệm ảo 3D tương ứng, nổi ngay trên trang đang xem.

## Phòng Toán học (mới)

Phòng Toán học vẽ hình dạng hình học của phương trình trong hệ trục toạ độ Oxyz 3D:

- **Mặt phẳng**: dạng `ax + by + cz + d = 0` (hoặc `ax+by+cz=d`).
- **Mặt cầu**: dạng tâm–bán kính `(x-a)² + (y-b)² + (z-c)² = R²` hoặc dạng khai triển
  `x² + y² + z² - 2ax - 2by - 2cz + d = 0`.
- **Đường thẳng**: dạng chính tắc `(x-x₀)/a = (y-y₀)/b = (z-z₀)/c` hoặc dạng tham số
  `x = x₀+at; y = y₀+bt; z = z₀+ct`.

Việc nhận dạng khi bôi đen (trong `content.js`) chỉ là một bước lọc nhanh (heuristic); việc phân
tích chính xác phương trình và vẽ hình luôn do trang Netlify (`sfes-lab.html`) đảm nhiệm sau khi
mở deep link, nên nếu phương trình không đúng cú pháp hỗ trợ, phòng Toán học sẽ báo lỗi rõ ràng
thay vì vẽ sai.

Bấm vào icon extension trên thanh công cụ Chrome để mở toàn bộ ứng dụng trong một tab mới.

## ⚠️ Thay đổi quan trọng so với bản trước

Extension **không còn đóng gói `lab.html` + `lib/three.min.js` cục bộ nữa**. Thay vào đó,
`background.js` và `content.js` luôn trỏ thẳng về bản đã deploy trên Netlify:

```
https://sfes-lab.netlify.app/
```

Lý do: bản cũ yêu cầu tự tải `three.min.js` và đặt đúng vào `lib/three.min.js`; chỉ cần đặt sai
tên file hoặc sai thư mục là toàn bộ giao diện sẽ đứng im ở màn hình cảnh báo tĩnh — đây chính
là nguyên nhân "extension hiện UI nhưng không thao tác được" mà nhiều người gặp phải. Trỏ thẳng
về Netlify giúp:

- Không phụ thuộc file `three.min.js` cục bộ nữa → không còn lỗi thiếu/sai tên file.
- Extension luôn hiển thị đúng bản mới nhất bạn đã deploy — sửa trên Netlify là extension tự
  động cập nhật theo, không cần đóng gói lại extension.
- Icon toolbar và panel bôi-đen giờ mở đúng domain Netlify, không phải file cục bộ trong extension.

**Nếu bạn đổi domain Netlify**, chỉ cần sửa lại hằng số `APP_URL` ở đầu 2 file:
- `background.js` → biến `APP_URL`
- `content.js` → biến `APP_URL`

## Cài đặt (chế độ nhà phát triển — chưa đăng lên Chrome Web Store)

1. Mở Chrome → gõ `chrome://extensions` ở thanh địa chỉ.
2. Bật **"Chế độ nhà phát triển"** (Developer mode) ở góc trên bên phải.
3. Nếu extension đã được load trước đó, bấm nút **tải lại (⟳)** để lấy code mới; nếu chưa, bấm
   **"Tải tiện ích đã giải nén"** (Load unpacked) và chọn thư mục `extension/` này.
4. Xong — icon ⚗ sẽ xuất hiện trên thanh công cụ, và tính năng bôi đen sẽ hoạt động trên mọi trang
   (cần có kết nối internet vì nội dung được tải từ Netlify).

## Cấu trúc thư mục

```
extension/
├── manifest.json      Khai báo Manifest V3
├── background.js      Bấm icon → mở https://sfes-lab.netlify.app/ trong tab mới
├── content.js          Chạy nền trên mọi trang: phát hiện vùng bôi đen, hiện icon/panel nổi
│                        (panel là <iframe> trỏ về https://sfes-lab.netlify.app/?embed=1&...)
└── icons/              Icon toolbar
```

## Giới hạn hiện tại

- **Cần internet**: vì extension không còn đóng gói lab.html cục bộ, tính năng bôi-đen và mở
  phòng thí nghiệm đều cần tải nội dung từ Netlify — sẽ không hoạt động offline.
- **Một số trang web có thể chặn iframe từ domain khác** (qua header `Content-Security-Policy:
  frame-ancestors` hoặc `X-Frame-Options`) — khi đó panel nổi sẽ không hiện được nội dung. Đây là
  giới hạn từ phía trang web đó, không sửa được từ extension. Trong trường hợp này, bấm icon
  extension trên toolbar để mở toàn bộ ứng dụng trong tab riêng vẫn hoạt động bình thường.
- **Trợ lý AI (chat)** trong phòng thí nghiệm hoạt động theo cấu hình sẵn có của trang Netlify
  (xem hướng dẫn/giới hạn tương ứng trên trang đó).
- **Nhận diện bôi đen** hiện dựa trên từ điển từ khoá/công thức có sẵn (các nguyên tố phổ thông,
  12 tổ hợp kim loại + axit/bazơ, một số cụm từ Vật lý/Sinh học) và một bộ lọc heuristic cho
  phương trình Toán (`isLikelyMathEquation`). Có thể mở rộng thêm trong `content.js` (mảng
  `ELEMENT_LOOKUP`, `REACTION_COMBOS`, `PHYS_KEYWORDS`, `BIO_KEYWORDS`, hàm `isLikelyMathEquation`).
- **Phòng Toán học** hiện chỉ hỗ trợ mặt phẳng, mặt cầu và đường thẳng trong Oxyz — các mặt bậc
  hai khác (mặt trụ, paraboloid...) sẽ báo "chưa hỗ trợ" thay vì vẽ sai.
