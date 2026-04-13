# Thuật Ngữ

> **Tài liệu tham chiếu** -- Đánh dấu trang này. Quay lại bất cứ khi nào bạn gặp một thuật ngữ xa lạ.

Thuật ngữ này tập hợp các từ quan trọng nhất đối với luồng giảng dạy chính -- những từ thường làm người mới bị vấp. Nếu bạn đang nhìn chằm chằm vào một từ giữa chừng và nghĩ "ồ, từ đó có nghĩa là gì nhỉ?", đây là trang để bạn quay lại.

## Tài Liệu Đồng Hành Được Đề Xuất

- [`entity-map.md`](./entity-map.md) để biết ranh giới lớp
- [`data-structures.md`](./data-structures.md) để biết hình dạng bản ghi
- [`s13a-runtime-task-model.md`](./s13a-runtime-task-model.md) nếu bạn liên tục nhầm lẫn các loại "task" khác nhau

## Agent

Một model có thể suy luận dựa trên đầu vào và gọi các công cụ để hoàn thành công việc. (Hãy nghĩ về nó như "não" quyết định phải làm gì tiếp theo.)

## Harness

Môi trường làm việc được chuẩn bị xung quanh model -- mọi thứ model cần nhưng không thể tự cung cấp:

- công cụ (tools)
- hệ thống tệp (filesystem)
- quyền hạn (permissions)
- lắp ráp prompt (prompt assembly)
- bộ nhớ (memory)
- runtime tác vụ (task runtime)

## Agent Loop (Vòng Lặp Agent)

Chu kỳ lặp lại cốt lõi thúc đẩy mọi phiên agent. Mỗi lần lặp trông như thế này:

1. gửi đầu vào hiện tại đến model
2. kiểm tra xem nó đã trả lời hay yêu cầu công cụ
3. thực thi công cụ nếu cần
4. ghi kết quả trở lại
5. tiếp tục hoặc dừng

## Message / `messages[]` (Tin Nhắn)

Lịch sử hội thoại và kết quả công cụ hiển thị được sử dụng làm ngữ cảnh làm việc. (Đây là bản ghi cuộn mà model thấy trong mỗi lượt.)

## Tool (Công Cụ)

Một hành động mà model có thể yêu cầu, chẳng hạn như đọc tệp, ghi tệp, chỉnh sửa nội dung hoặc chạy lệnh shell.

## Tool Schema (Lược Đồ Công Cụ)

Mô tả hiển thị với model:

- tên
- mục đích
- tham số đầu vào
- kiểu đầu vào

## Dispatch Map (Bảng Định Tuyến)

Bảng định tuyến từ tên công cụ đến các handler. (Như tổng đài điện thoại: tên đến, và bản đồ kết nối nó với đúng hàm.)

## Stop Reason (Lý Do Dừng)

Tại sao lượt model hiện tại kết thúc. Các giá trị phổ biến:

- `end_turn`
- `tool_use`
- `max_tokens`

## Context (Ngữ Cảnh)

Tổng thông tin hiện tại hiển thị với model. (Mọi thứ bên trong "cửa sổ" của model trong một lượt nhất định.)

## Compaction (Nén)

Quá trình thu nhỏ ngữ cảnh đang hoạt động trong khi bảo toàn cốt truyện quan trọng và thông tin bước tiếp theo. (Như tóm tắt ghi chú cuộc họp để bạn giữ lại các mục hành động nhưng bỏ đi những chuyện nhỏ.)

## Subagent

Một worker ủy thác một lần chạy trong một ngữ cảnh riêng biệt và thường trả về một bản tóm tắt. (Một trợ lý tạm thời được tạo ra cho một công việc, sau đó bị loại bỏ.)

## Permission (Quyền Hạn)

Lớp quyết định xác định xem một hành động được yêu cầu có thể thực thi không.

## Hook

Một điểm mở rộng cho phép hệ thống quan sát hoặc thêm side effect xung quanh vòng lặp mà không cần viết lại chính vòng lặp. (Như event listener -- vòng lặp phát ra tín hiệu, và các hook phản hồi.)

## Memory (Bộ Nhớ)

Thông tin xuyên phiên đáng giữ lại vì nó vẫn có giá trị sau này và không dễ tái tạo.

## System Prompt (Prompt Hệ Thống)

Bề mặt hướng dẫn cấp hệ thống ổn định xác định danh tính, quy tắc và ràng buộc lâu dài.

## Query (Truy Vấn)

Quá trình đa lượt đầy đủ được sử dụng để hoàn thành một yêu cầu người dùng. (Một truy vấn có thể kéo dài nhiều lượt vòng lặp trước khi câu trả lời sẵn sàng.)

## Transition Reason (Lý Do Chuyển Đổi)

Lý do hệ thống tiếp tục vào lượt khác.

## Task (Tác Vụ)

Một node mục tiêu công việc bền vững trong đồ thị công việc. (Khác với một todo item biến mất khi phiên kết thúc, một tác vụ tồn tại lâu dài.)

## Runtime Task / Runtime Slot (Tác Vụ Runtime / Khe Runtime)

Một khe thực thi trực tiếp đại diện cho thứ gì đó đang chạy hiện tại. (Tác vụ nói "điều gì nên xảy ra"; khe runtime nói "nó đang xảy ra ngay bây giờ.")

## Teammate (Đồng Đội)

Một cộng tác viên liên tục trong hệ thống đa agent. (Khác với subagent là fire-and-forget, một teammate tồn tại lâu dài.)

## Protocol Request (Yêu Cầu Giao Thức)

Một yêu cầu có cấu trúc với danh tính, trạng thái và theo dõi rõ ràng, thường được hỗ trợ bởi `request_id`. (Một phong bì chính thức thay vì một tin nhắn thông thường.)

## Worktree

Một làn thư mục thực thi riêng biệt được sử dụng để công việc song song không xung đột. (Mỗi làn nhận bản sao riêng của workspace, như các bàn làm việc riêng biệt cho các tác vụ khác nhau.)

## MCP

Model Context Protocol. Trong repo này nó đại diện cho một bề mặt tích hợp năng lực ngoài, không chỉ là danh sách công cụ. (Cầu nối cho phép agent của bạn nói chuyện với các dịch vụ bên ngoài.)

## DAG

Directed Acyclic Graph (Đồ thị có hướng không chu trình). Một tập hợp các node được kết nối bởi các cạnh một chiều không có chu trình. (Nếu bạn vẽ mũi tên giữa các tác vụ thể hiện "A phải hoàn thành trước B", và không có đường mũi tên nào quay lại điểm bắt đầu, bạn có một DAG.) Được sử dụng trong repo này cho đồ thị phụ thuộc tác vụ.

## FSM / State Machine (Máy Trạng Thái)

Finite State Machine. Một hệ thống luôn ở chính xác một trạng thái trong một tập hợp đã biết, và chuyển đổi giữa các trạng thái dựa trên các sự kiện đã xác định. (Hãy nghĩ về đèn giao thông chạy qua đỏ, xanh và vàng.) Logic lượt của vòng lặp agent được mô hình hóa như một máy trạng thái.

## Control Plane (Mặt Phẳng Điều Khiển)

Lớp quyết định điều gì nên xảy ra tiếp theo, thay vì lớp thực sự thực hiện công việc. (Kiểm soát không lưu so với máy bay.) Trong repo này, query engine và tool dispatch hoạt động như các control plane.

## Tokens

Các đơn vị nguyên tử mà một language model đọc và viết. Một token xấp xỉ 3/4 một từ tiếng Anh. Giới hạn ngữ cảnh và ngưỡng nén được đo bằng token.
