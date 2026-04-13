# s00: Tổng Quan Kiến Trúc

Chào mừng đến với bản đồ. Trước khi đi sâu vào xây dựng từng phần, sẽ rất hữu ích khi nhìn toàn bộ bức tranh từ trên cao. Tài liệu này cho bạn thấy hệ thống đầy đủ chứa gì, tại sao các chương được sắp xếp theo thứ tự này, và bạn sẽ thực sự học gì.

## Bức Tranh Toàn Cảnh

Luồng chính của repo này có lý vì nó phát triển hệ thống theo bốn giai đoạn phụ thuộc:

1. xây dựng một vòng lặp agent đơn thực sự
2. củng cố vòng lặp đó với an toàn, bộ nhớ và phục hồi
3. biến công việc phiên tạm thời thành công việc runtime lâu dài
4. phát triển executor đơn thành nền tảng đa agent với các làn riêng biệt và định tuyến năng lực ngoài

Thứ tự này theo **phụ thuộc cơ chế**, không phải thứ tự tệp và không phải sức hấp dẫn sản phẩm.

Nếu người học chưa hiểu:

`đầu vào người dùng -> model -> công cụ -> ghi trở lại -> lượt tiếp theo`

thì permissions, hooks, memory, tasks, teams, worktrees và MCP đều trở thành từ vựng rời rạc.

## Repo Này Đang Cố Gắng Tái Tạo Gì

Repository này không cố gắng phản chiếu một codebase production dòng theo dòng.

Nó đang cố gắng tái tạo những phần xác định liệu một hệ thống agent có thực sự hoạt động hay không:

- các module chính là gì
- các module đó hợp tác như thế nào
- mỗi module chịu trách nhiệm gì
- trạng thái quan trọng sống ở đâu
- một yêu cầu chạy qua hệ thống như thế nào

Điều đó có nghĩa là mục tiêu là:

**độ trung thực cao với kiến trúc thiết kế cốt lõi, không phải độ trung thực 1:1 với mọi chi tiết triển khai bên ngoài.**

## Ba Mẹo Trước Khi Bạn Bắt Đầu

### Mẹo 1: Học phiên bản đúng nhỏ nhất trước

Ví dụ, một subagent không cần mọi khả năng nâng cao ngay từ đầu.

Phiên bản đúng nhỏ nhất đã dạy bài học cốt lõi:

- cha mẹ xác định subtask
- con nhận một `messages[]` riêng biệt
- con trả về một bản tóm tắt

Chỉ sau khi điều đó ổn định mới thêm:

- ngữ cảnh kế thừa
- quyền riêng biệt
- runtime nền
- phân lập worktree

### Mẹo 2: Các thuật ngữ mới nên được giải thích trước khi sử dụng

Repo này sử dụng các thuật ngữ như:

- state machine (máy trạng thái)
- dispatch map (bảng định tuyến)
- dependency graph (đồ thị phụ thuộc)
- worktree
- protocol envelope (phong bì giao thức)
- MCP

Nếu một thuật ngữ không quen thuộc, hãy dừng lại và kiểm tra tài liệu tham chiếu thay vì tiến lên mù quáng.

Các tài liệu đồng hành được đề xuất:

- [`glossary.md`](./glossary.md)
- [`entity-map.md`](./entity-map.md)
- [`data-structures.md`](./data-structures.md)
- [`teaching-scope.md`](./teaching-scope.md)

### Mẹo 3: Đừng để độ phức tạp ngoại vi giả vờ là cơ chế cốt lõi

Giảng dạy tốt không cố gắng bao gồm mọi thứ.

Nó giải thích đầy đủ các phần quan trọng và giữ độ phức tạp ít giá trị ra khỏi tầm mắt bạn:

- đóng gói và luồng phát hành
- keo dính tích hợp doanh nghiệp
- telemetry
- nhánh tương thích đặc thù sản phẩm
- chi tiết đảo ngược kỹ thuật tên tệp / số dòng

## Tài Liệu Cầu Nối Quan Trọng

Coi chúng như các bản đồ xuyên chương:

| Tài liệu | Làm rõ điều gì |
|---|---|
| [`s00d-chapter-order-rationale.md`](./s00d-chapter-order-rationale.md) (Đào sâu) | tại sao thứ tự chương là như vậy |
| [`s00e-reference-module-map.md`](./s00e-reference-module-map.md) (Đào sâu) | cách các cluster module thực tế của repo tham chiếu ánh xạ lên chương trình giảng dạy hiện tại |
| [`s00a-query-control-plane.md`](./s00a-query-control-plane.md) (Đào sâu) | tại sao một agent hoàn chỉnh cần nhiều hơn `messages[] + while True` |
| [`s00b-one-request-lifecycle.md`](./s00b-one-request-lifecycle.md) (Đào sâu) | cách một yêu cầu di chuyển qua toàn bộ hệ thống |
| [`s02a-tool-control-plane.md`](./s02a-tool-control-plane.md) (Đào sâu) | tại sao công cụ trở thành một control plane, không chỉ là bảng hàm |
| [`s10a-message-prompt-pipeline.md`](./s10a-message-prompt-pipeline.md) (Đào sâu) | tại sao system prompt chỉ là một bề mặt đầu vào |
| [`s13a-runtime-task-model.md`](./s13a-runtime-task-model.md) (Đào sâu) | tại sao các tác vụ lâu dài và khe runtime trực tiếp phải tách biệt |
| [`s19a-mcp-capability-layers.md`](./s19a-mcp-capability-layers.md) (Đào sâu) | tại sao MCP nhiều hơn chỉ là danh sách công cụ từ xa |

## Bốn Giai Đoạn Học

### Giai Đoạn 1: Lõi Agent Đơn (`s01-s06`)

Mục tiêu: xây dựng một agent đơn thực sự có thể làm việc.

| Chương | Lớp Mới |
|---|---|
| `s01` | vòng lặp và ghi trở lại |
| `s02` | công cụ và dispatch |
| `s03` | lập kế hoạch phiên |
| `s04` | phân lập subtask được ủy thác |
| `s05` | khám phá và tải skill |
| `s06` | nén ngữ cảnh |

### Giai Đoạn 2: Củng Cố (`s07-s11`)

Mục tiêu: làm cho vòng lặp an toàn hơn, ổn định hơn và dễ mở rộng hơn.

| Chương | Lớp Mới |
|---|---|
| `s07` | cổng quyền hạn |
| `s08` | hooks và side effect |
| `s09` | bộ nhớ lâu dài |
| `s10` | lắp ráp prompt |
| `s11` | phục hồi và tiếp tục |

### Giai Đoạn 3: Công Việc Runtime (`s12-s14`)

Mục tiêu: nâng cấp công việc phiên thành công việc runtime lâu dài, nền và theo lịch.

| Chương | Lớp Mới |
|---|---|
| `s12` | đồ thị tác vụ liên tục |
| `s13` | khe thực thi runtime |
| `s14` | trigger dựa trên thời gian |

### Giai Đoạn 4: Nền Tảng (`s15-s19`)

Mục tiêu: phát triển từ một executor thành một nền tảng lớn hơn.

| Chương | Lớp Mới |
|---|---|
| `s15` | đồng đội liên tục |
| `s16` | giao thức nhóm có cấu trúc |
| `s17` | tự nhận và tự tiếp tục |
| `s18` | làn thực thi riêng biệt |
| `s19` | định tuyến năng lực ngoài |

## Tham Chiếu Nhanh: Mỗi Chương Thêm Gì

| Chương | Cấu Trúc Cốt Lõi | Bạn Có Thể Xây Được Gì |
|---|---|---|
| `s01` | `LoopState`, ghi trở lại `tool_result` | một vòng lặp agent hoạt động tối thiểu |
| `s02` | `ToolSpec`, dispatch map | định tuyến công cụ ổn định |
| `s03` | `TodoItem`, `PlanState` | lập kế hoạch phiên có thể nhìn thấy |
| `s04` | ngữ cảnh con riêng biệt | các subtask được ủy thác không làm ô nhiễm cha |
| `s05` | `SkillRegistry` | khám phá rẻ và tải sâu theo yêu cầu |
| `s06` | bản ghi nén | các phiên dài vẫn sử dụng được |
| `s07` | quyết định quyền hạn | thực thi phía sau cổng |
| `s08` | sự kiện vòng đời | mở rộng mà không cần viết lại vòng lặp |
| `s09` | bản ghi bộ nhớ | bộ nhớ dài hạn có chọn lọc |
| `s10` | các phần prompt | lắp ráp đầu vào theo giai đoạn |
| `s11` | lý do tiếp tục | nhánh phục hồi vẫn dễ đọc |
| `s12` | `TaskRecord` | đồ thị công việc lâu dài |
| `s13` | `RuntimeTaskState` | thực thi nền với ghi trở lại sau |
| `s14` | `ScheduleRecord` | công việc kích hoạt theo thời gian |
| `s15` | `TeamMember`, inbox | đồng đội liên tục |
| `s16` | phong bì giao thức | phối hợp yêu cầu / phản hồi có cấu trúc |
| `s17` | chính sách nhận | tự nhận và tự tiếp tục |
| `s18` | `WorktreeRecord` | làn thực thi riêng biệt |
| `s19` | định tuyến năng lực | định tuyến native + plugin + MCP thống nhất |

## Bài Học Chính

**Một thứ tự chương tốt không phải là danh sách các tính năng. Đó là con đường mà mỗi cơ chế phát triển tự nhiên từ cơ chế trước.**
