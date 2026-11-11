# Mây TH5+ — Ứng dụng chat React Native

Mã nguồn ứng dụng chat cho Android và iOS, sử dụng Firebase Authentication, Firebase Realtime Database và Cloudinary. Android có applicationId `com.duongstark.th5chatplus`, tên hiển thị **Mây TH5+**.

## Chức năng

- Đăng ký, đăng nhập và lưu phiên đăng nhập.
- Nhắn tin trực tiếp và tạo nhóm với ít nhất hai người khác.
- Hiển thị tên người gửi, số thành viên online và trạng thái đang soạn tin.
- Xác nhận đã xem kèm thời gian; nhóm có số người đã xem.
- Nhấn giữ tin nhắn để sao chép, trả lời, thả cảm xúc hoặc thu hồi tin của mình.
- Chọn ảnh từ thư viện hoặc camera, thu nhỏ tối đa 1024 pixel rồi tải lên Cloudinary; hỗ trợ thử lại và xem ảnh toàn màn hình.
- Gửi vị trí hiện tại.
- Hiển thị tin cuối và số chưa đọc của từng cuộc trò chuyện.
- Danh sách thông báo, badge chưa đọc, mở cuộc trò chuyện từ thông báo và đánh dấu tất cả đã đọc.
- Phân trang lịch sử theo 20 tin; tìm kiếm trong các tin đã tải.

## Cài đặt và chạy

Cần Node.js theo `engines` trong `package.json`, npm, Android SDK và JDK phù hợp với Gradle. Firebase CLI cần Java 21 trở lên. Chạy iOS cần macOS, Xcode và CocoaPods.

```sh
npm ci
npm start
```

Mở terminal khác, kết nối điện thoại hoặc khởi động Android Emulator:

```sh
npm run android
```

Trên macOS, cài Pods trước khi chạy iOS:

```sh
cd ios
bundle install
bundle exec pod install
cd ..
npm run ios
```

## Firebase

Cấu hình nằm trong `src/services/firebase.config.json`. Project mặc định là `may-th5-plus-duongstark`. Có thể đăng ký tài khoản trực tiếp trong ứng dụng.

Khi dùng project khác:

1. Bật Authentication với Email/Password và tạo Realtime Database.
2. Điền cấu hình Firebase vào `src/services/firebase.live.config.json`, gồm `apiKey`, `authDomain`, `projectId`, `appId` và `databaseURL`. Đặt `useEmulators: false` và `emulatorHost: ""`.
3. Chạy `npm run firebase:live` để áp dụng cấu hình.
4. Triển khai `database.rules.json` vào đúng project của mình:

```sh
npx firebase deploy --only database --project YOUR_PROJECT_ID
```

Thông tin cấu hình client Firebase không thay thế việc kiểm soát truy cập. Quyền đọc/ghi được kiểm tra bằng Authentication và Security Rules. Không đưa service-account private key vào ứng dụng.

Để chạy dữ liệu và kiểm thử cục bộ:

```sh
npm run firebase:emulator
npm run emulators
```

Mở terminal khác:

```sh
npm run demo:seed
npm run demo:scene
npm start
```

Android Emulator truy cập dịch vụ trên máy tính qua `10.0.2.2`; iOS Simulator dùng `127.0.0.1`. Với điện thoại thật, đặt `emulatorHost` trong cấu hình bằng IP LAN của máy chạy Firebase Emulator. Chuyển lại dịch vụ thật bằng `npm run firebase:live`.

## Cloudinary và quyền thiết bị

Điền cloud name và unsigned preset vào `src/services/cloudinary.config.json`:

```json
{ "cloudName": "YOUR_CLOUD_NAME", "unsignedPreset": "YOUR_UNSIGNED_PRESET" }
```

Preset cần cho phép unsigned upload ảnh. Không đưa Cloudinary API secret vào ứng dụng. Khi tải ảnh lỗi, bong bóng hiển thị nút **Thử lại**. Ảnh tạm chỉ tồn tại trong phiên hiện tại.

Android khai báo quyền camera và vị trí; ứng dụng xin quyền khi dùng chức năng tương ứng. iOS có mô tả quyền camera, thư viện ảnh và vị trí trong `Info.plist`.

## Cấu trúc mã nguồn

- `src/screens/`: các màn hình đăng nhập, danh sách chat, cuộc trò chuyện, tạo nhóm, thông báo và cài đặt.
- `src/components/`: thành phần giao diện dùng chung.
- `src/context/ChatContext.tsx`: theo dõi dữ liệu người dùng, cuộc trò chuyện và thông báo.
- `src/services/`: xác thực, nhắn tin, nhóm, trạng thái online, tải ảnh và vị trí.
- `src/theme.ts`: màu sắc và kiểu giao diện dùng chung.
- `src/types.ts`: kiểu dữ liệu.
- `database.rules.json`: quyền truy cập và kiểm tra dữ liệu.
- `tests/firebase.integration.cjs`: kiểm thử tích hợp Firebase Emulator.

Tin nhắn được lưu ở `messages/{convId}`; thông tin cuộc trò chuyện ở `conversations/{convId}`; preview và số chưa đọc ở `userChats/{uid}/{convId}`. Các nhánh `readStatus`, `typing`, `activeChats`, `presence` và `notifications` lưu trạng thái tương ứng. Cloudinary lưu ảnh; database lưu URL HTTPS của ảnh.

Người gửi tạo tin nhắn, cập nhật preview, tăng số chưa đọc và tạo thông báo trong cùng một lần cập nhật. Người nhận đánh dấu đã đọc theo mốc tin thực sự đã nhìn thấy. Thu hồi giữ node tin nhắn và cập nhật nội dung hiển thị. Listener được hủy khi màn hình ngừng hoạt động.

## Kiểm tra và build

```sh
npm run typecheck
npm run lint
npm test -- --runInBand
npm run test:firebase
```

Build Android:

```sh
cd android
./gradlew assembleDebug
```

Bản debug cần Metro. Có thể dùng `assembleRelease` để tạo bản chạy độc lập; cấu hình ký hiện tại dùng debug keystore cho mục đích thực hành.

Thông báo hiện tại được lưu trong Firebase và cập nhật trong ứng dụng; chưa tích hợp dịch vụ push nền. Tìm kiếm chỉ áp dụng cho các tin đã tải. Bản iOS cần được kiểm tra bằng Xcode trên macOS.

Chi tiết quyền truy cập: [Báo cáo Security Rules](docs/SECURITY_REPORT.md).
