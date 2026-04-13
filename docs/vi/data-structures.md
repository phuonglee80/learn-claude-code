# Cấu Trúc Dữ Liệu Cốt Lõi

> **Tài liệu tham chiếu** -- Sử dụng khi bạn mất theo dõi trạng thái sống ở đâu. Mỗi bản ghi có một công việc rõ ràng.

Cách dễ nhất để bị lạc trong một hệ thống agent không phải là số lượng tính năng -- mà là mất theo dõi trạng thái thực sự sống ở đâu. Tài liệu này tập hợp các bản ghi cốt lõi xuất hiện lại và lại trong các tài liệu luồng chính và cầu nối để bạn luôn có một nơi để tra cứu chúng.

## Đọc Cùng Nhau Được Đề Xuất

- [`glossary.md`](./glossary.md) để biết ý nghĩa thuật ngữ
- [`entity-map.md`](./entity-map.md) để biết ranh giới lớp
- [`s13a-runtime-task-model.md`](./s13a-runtime-task-model.md) để biết sự tách biệt tác vụ và khe runtime
- [`s19a-mcp-capability-layers.md`](./s19a-mcp-capability-layers.md) để biết MCP ngoài công cụ

## Hai Nguyên Tắc Cần Nhớ

### Nguyên Tắc 1: tách biệt trạng thái nội dung khỏi trạng thái kiểm soát quy trình

- `messages`, `tool_result` và text bộ nhớ là trạng thái nội dung
- `turn_count`, `transition` và flag thử lại là trạng thái kiểm soát quy trình

### Nguyên Tắc 2: tách biệt trạng thái lâu dài khỏi trạng thái chỉ runtime

- tác vụ, bộ nhớ và lịch thường lâu dài
- khe runtime, quyết định quyền hạn và kết nối MCP trực tiếp thường là trạng thái runtime

## Trạng Thái Truy Vấn và Hội Thoại

### `Message`

Lưu trữ lịch sử hội thoại và vòng đi về công cụ.

### `NormalizedMessage`

Hình thức tin nhắn ổn định sẵn sàng cho API model.

### `QueryParams`

Đầu vào ngoài được sử dụng để bắt đầu một quá trình truy vấn.

### `QueryState`

Trạng thái có thể thay đổi thay đổi qua các lượt.

### `TransitionReason`

Giải thích tại sao lượt tiếp theo tồn tại.

### `CompactSummary`

Tóm tắt mang theo nén khi ngữ cảnh cũ rời khỏi cửa sổ nóng.

## Trạng Thái Prompt và Đầu Vào

### `SystemPromptBlock`

Một fragment prompt ổn định.

### `PromptParts`

Các fragment prompt được tách biệt trước khi lắp ráp cuối cùng.

### `ReminderMessage`

Tiêm tạm thời một lượt hoặc một chế độ.

## Trạng Thái Công Cụ và Control-Plane

### `ToolSpec`

Những gì model biết về một công cụ.

### `ToolDispatchMap`

Bảng định tuyến tên-đến-handler.

### `ToolUseContext`

Môi trường thực thi chung hiển thị với công cụ.

### `ToolResultEnvelope`

Kết quả chuẩn hóa được trả về vào vòng lặp chính.

### `PermissionRule`

Chính sách quyết định cho phép / từ chối / hỏi.

### `PermissionDecision`

Đầu ra có cấu trúc của cổng quyền hạn.

### `HookEvent`

Sự kiện vòng đời chuẩn hóa được phát ra xung quanh vòng lặp.

## Trạng Thái Công Việc Lâu Dài

### `TaskRecord`

Node đồ thị công việc lâu dài với mục tiêu, trạng thái và cạnh phụ thuộc.

### `ScheduleRecord`

Quy tắc mô tả khi nào công việc nên kích hoạt.

### `MemoryEntry`

Sự kiện xuyên phiên đáng giữ lại.

## Trạng Thái Thực Thi Runtime

### `RuntimeTaskState`

Bản ghi khe thực thi trực tiếp cho công việc nền hoặc dài hạn.

### `Notification`

Cầu nối kết quả nhỏ mang kết quả runtime trở lại vào vòng lặp chính.

### `RecoveryState`

Trạng thái được sử dụng để tiếp tục mạch lạc sau thất bại.

## Trạng Thái Nhóm và Nền Tảng

### `TeamMember`

Danh tính đồng đội liên tục.

### `MessageEnvelope`

Tin nhắn có cấu trúc giữa các đồng đội.

### `RequestRecord`

Bản ghi lâu dài cho phê duyệt, tắt máy, bàn giao hoặc các quy trình giao thức khác.

### `WorktreeRecord`

Bản ghi cho một làn thực thi riêng biệt.

### `MCPServerConfig`

Cấu hình cho một nhà cung cấp năng lực ngoài.

### `CapabilityRoute`

Quyết định định tuyến cho năng lực được hỗ trợ bởi native, plugin hoặc MCP.

## Bản Đồ Nhanh Hữu Ích

| Bản ghi | Công việc chính | Thường sống trong |
|---|---|---|
| `Message` | lịch sử hội thoại | `messages[]` |
| `QueryState` | kiểm soát lượt theo lượt | query engine |
| `ToolUseContext` | môi trường thực thi công cụ | tool control plane |
| `PermissionDecision` | kết quả cổng thực thi | lớp quyền hạn |
| `TaskRecord` | mục tiêu công việc lâu dài | task board |
| `RuntimeTaskState` | khe thực thi trực tiếp | runtime manager |
| `TeamMember` | đồng đội liên tục | team config |
| `RequestRecord` | trạng thái giao thức | request tracker |
| `WorktreeRecord` | làn thực thi riêng biệt | worktree index |
| `MCPServerConfig` | cấu hình năng lực ngoài | settings / plugin config |

## Bài Học Chính

**Các hệ thống hoàn chỉnh cao trở nên dễ hiểu hơn nhiều khi mỗi bản ghi quan trọng có một công việc rõ ràng và một lớp rõ ràng.**
