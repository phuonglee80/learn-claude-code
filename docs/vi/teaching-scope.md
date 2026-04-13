# Phạm Vi Giảng Dạy

Tài liệu này giải thích bạn sẽ học gì trong repo này, những gì bị cố ý bỏ qua, và cách mỗi chương giữ nguyên sự liên kết với mô hình tư duy của bạn khi nó phát triển.

## Mục Tiêu Của Repo Này

Đây không phải là bình luận dòng theo dòng về một số codebase production upstream.

Mục tiêu thực sự là:

**dạy bạn cách xây dựng một harness agent code hoàn chỉnh từ đầu.**

Điều đó ngụ ý ba nghĩa vụ:

1. bạn thực sự có thể xây dựng lại nó
2. bạn giữ luồng chính rõ ràng thay vì chìm đắm trong chi tiết phụ
3. bạn không hấp thụ các cơ chế thực sự không tồn tại

## Mỗi Chương Nên Bao Gồm Gì

Mỗi chương luồng chính nên làm rõ những điều này:

- vấn đề gì mà cơ chế giải quyết
- nó thuộc module hoặc lớp nào
- trạng thái nào nó sở hữu
- cấu trúc dữ liệu nào nó giới thiệu
- nó kết nối trở lại vòng lặp như thế nào
- điều gì thay đổi trong luồng runtime sau khi nó xuất hiện

Nếu bạn kết thúc một chương và vẫn không thể nói cơ chế sống ở đâu hoặc trạng thái nào nó sở hữu, chương đó chưa xong.

## Những Gì Chúng Tôi Cố Ý Giữ Đơn Giản

Những chủ đề này không bị cấm, nhưng chúng không nên chiếm đạo con đường học tập của bạn:

- đóng gói, xây dựng và luồng phát hành
- keo dính tương thích đa nền tảng
- kết nối telemetry và chính sách doanh nghiệp
- nhánh tương thích lịch sử
- tai nạn đặt tên đặc thù sản phẩm
- khớp code upstream dòng theo dòng

Những thứ đó thuộc về phụ lục, ghi chú bảo trì hoặc ghi chú sản phẩm hóa sau này, không phải ở trung tâm của con đường người mới bắt đầu.

## "Độ Trung Thực Cao" Thực Sự Có Nghĩa Là Gì Ở Đây

Độ trung thực cao trong một repo giảng dạy không có nghĩa là tái tạo mọi chi tiết biên 1:1.

Có nghĩa là bám sát xương sống hệ thống thực sự:

- mô hình runtime cốt lõi
- ranh giới module
- bản ghi chính
- chuyển đổi trạng thái
- sự hợp tác giữa các hệ thống con lớn

Tóm lại:

**hãy rất trung thành với thân cây, và có chủ ý về đơn giản hóa giảng dạy ở các cạnh.**

## Đây Là Tài Liệu Dành Cho Ai

Bạn không cần phải là chuyên gia về nền tảng agent.

Giả định tốt hơn về bạn:

- Python cơ bản quen thuộc
- hàm, lớp, danh sách và từ điển quen thuộc
- hệ thống agent có thể hoàn toàn mới

Điều đó có nghĩa là các chương nên:

- giải thích các khái niệm mới trước khi sử dụng chúng
- giữ một khái niệm hoàn chỉnh ở một nơi chính
- chuyển từ "nó là gì" sang "tại sao nó tồn tại" sang "cách xây dựng nó"

## Cấu Trúc Chương Được Đề Xuất

Các chương luồng chính nên xấp xỉ theo thứ tự này:

1. vấn đề gì xuất hiện mà không có cơ chế này
2. giải thích các thuật ngữ mới trước
3. đưa ra mô hình tư duy nhỏ nhất hữu ích
4. hiển thị các bản ghi / cấu trúc dữ liệu cốt lõi
5. hiển thị triển khai đúng nhỏ nhất
6. hiển thị cách nó kết nối vào vòng lặp chính
7. hiển thị các lỗi mới bắt đầu thông thường
8. hiển thị những gì một phiên bản hoàn chỉnh hơn sẽ thêm sau này

## Hướng Dẫn Thuật Ngữ

Nếu một chương giới thiệu một thuật ngữ từ các danh mục này, nó nên giải thích nó:

- design pattern (mẫu thiết kế)
- cấu trúc dữ liệu
- thuật ngữ đồng thời
- thuật ngữ giao thức / mạng
- từ vựng kỹ thuật ít phổ biến

Ví dụ:

- state machine (máy trạng thái)
- scheduler (lịch biểu)
- queue (hàng đợi)
- worktree
- DAG
- protocol envelope (phong bì giao thức)

Đừng thả tên mà không có giải thích.

## Nguyên Tắc Phiên Bản Đúng Tối Thiểu

Các cơ chế thực tế thường phức tạp, nhưng giảng dạy hoạt động tốt nhất khi không bắt đầu với mọi nhánh cùng một lúc.

Ưu tiên trình tự này:

1. hiển thị phiên bản đúng nhỏ nhất
2. giải thích vấn đề cốt lõi nào nó đã giải quyết
3. hiển thị những gì các lần lặp sau sẽ thêm

Ví dụ:

- hệ thống quyền hạn: đầu tiên `từ chối -> chế độ -> cho phép -> hỏi`
- phục hồi lỗi: đầu tiên ba nhánh phục hồi chính
- hệ thống tác vụ: đầu tiên bản ghi tác vụ, phụ thuộc và mở khóa
- giao thức nhóm: đầu tiên yêu cầu / phản hồi cộng với `request_id`

## Checklist Cho Việc Viết Lại Một Chương

- Màn hình đầu tiên có giải thích tại sao cơ chế tồn tại không?
- Các thuật ngữ mới có được giải thích trước khi sử dụng không?
- Có mô hình tư duy nhỏ hoặc hình ảnh luồng không?
- Các bản ghi chính có được liệt kê rõ ràng không?
- Điểm kết nối trở lại vào vòng lặp có được giải thích không?
- Các cơ chế cốt lõi có được tách biệt khỏi chi tiết sản phẩm ngoại vi không?
- Các điểm nhầm lẫn dễ nhất có được chỉ ra không?
- Chương có tránh phát minh các cơ chế không được hỗ trợ bởi repo không?

## Cách Sử Dụng Tài Liệu Nguồn Được Đảo Ngược Kỹ Thuật

Nguồn đảo ngược kỹ thuật nên được sử dụng như:

**tài liệu hiệu chỉnh bảo trì**

Sử dụng nó để:

- xác minh cơ chế luồng chính được mô tả đúng
- xác minh các ranh giới và bản ghi quan trọng không bị thiếu
- xác minh triển khai giảng dạy không bị lạc thành hư cấu

Nó không bao giờ nên trở thành điều kiện tiên quyết để hiểu tài liệu giảng dạy.

## Bài Học Chính

**Chất lượng của một repo giảng dạy được quyết định ít hơn bởi số lượng chi tiết nó đề cập và nhiều hơn bởi liệu các chi tiết quan trọng có được giải thích đầy đủ và các chi tiết không quan trọng có được bỏ qua an toàn không.**
