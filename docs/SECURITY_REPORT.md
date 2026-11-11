# Báo cáo ngắn: Security Rules — Mây TH5+

**Mô hình:** Người dùng xác thực bằng Firebase Auth. Tư cách thành viên nằm ở `conversations/{convId}/members/{uid}`. Mặc định toàn bộ database cấm đọc/ghi; từng nhánh mở quyền tối thiểu.

**Tin nhắn:** Chỉ thành viên được đọc `messages/{convId}`. Tạo tin bắt buộc `senderId = auth.uid`, đủ trường, đúng loại và giới hạn văn bản/tọa độ/HTTPS Cloudinary URL. Không cấp quyền ghi rộng cho tin đã tồn tại: sender, text, type, thời gian và ảnh không thể bị sửa hay xóa. Chỉ nhánh `recalled` cho sender chuyển sang `true`; không xóa node. Cảm xúc chỉ được ghi/xóa tại UID của chính người thao tác, giá trị thuộc năm emoji được hỗ trợ. Không cho tương tác lên tin đã thu hồi.

**Thành viên:** Metadata bất biến sau tạo. `initialPeers` chứng minh nhóm có ba UID khác nhau và đều thuộc members; mỗi UID phải có hồ sơ. Direct bắt buộc ID tiền tố `d_` theo hai UID đã sắp xếp, nhóm chỉ dùng tiền tố `g_` và mỗi member chỉ có thể là creator hoặc peer. Cách này chặn kẻ tạo sẵn direct có người thứ ba nghe lén. Chủ tài khoản chỉ sửa hồ sơ/presence của mình; typing và activeChats cũng giới hạn UID, mỗi thiết bị có connection riêng và `onDisconnect` dọn trạng thái.

**Index và đã đọc:** Index chỉ truy cập trong phạm vi thành viên; người dùng chỉ đọc danh sách `userChats` của mình. Rules kiểm tra preview mới khớp message/sender trong kết quả root multi-path write. Người gửi khác chỉ tăng unread đúng một khi có ID tin mới, không được reset bộ đếm của người nhận; chủ tài khoản được reset phần của mình. Read receipt của ai chỉ người đó ghi, phải trỏ đến tin tồn tại, watermark không lùi.

**Thông báo:** Chỉ thành viên được tạo thông báo cho thành viên khác và `fromUid` phải là chính mình. Chỉ người nhận được đọc danh sách và chuyển `read` sang true; nội dung thông báo không được sửa. Cấu trúc và trường lạ bị kiểm tra. Đây là mô hình client cho bài thực hành; hệ thống sản xuất nên đưa nghiệp vụ phát thông báo vào backend để hạn chế spam từ thành viên hợp lệ.

**Chứng minh thao tác bị từ chối:** Chạy `npm run test:firebase` trên Java 21. Kiểm thử tạo bốn tài khoản: An, Bình, Chi trong nhóm và Eve ngoài nhóm. Eve đọc/ghi messages bị từ chối; Bình đặt `recalled: true` lên tin An, ghi typing/cảm xúc dưới UID An, sửa/xóa tin An hoặc reset unread An đều nhận `PERMISSION_DENIED`. Một root update chứa thông báo giả mạo bị từ chối toàn bộ; message trong cùng update không tồn tại sau thất bại. Mã kiểm thử nằm trong `tests/firebase.integration.cjs` và chạy trên Firebase Emulator riêng.
