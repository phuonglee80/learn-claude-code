# Bản Đồ Thực Thể

> **Tài liệu tham chiếu** -- Sử dụng khi các khái niệm bắt đầu mờ nhạt với nhau. Nó cho bạn biết lớp nào mỗi thứ thuộc về.

Khi bạn tiến vào nửa sau của repo, bạn sẽ nhận thấy rằng nguồn nhầm lẫn chính thường không phải là code. Đó là thực tế là nhiều thực thể trông tương tự trong khi sống trên các lớp khác nhau. Bản đồ này giúp bạn giữ chúng thẳng hàng.

## Bản Đồ Này Khác Với Các Tài Liệu Khác Như Thế Nào

- bản đồ này trả lời: **thứ này thuộc lớp nào?**
- [`glossary.md`](./glossary.md) trả lời: **từ này có nghĩa là gì?**
- [`data-structures.md`](./data-structures.md) trả lời: **hình dạng trạng thái trông như thế nào?**

## Hình Ảnh Phân Lớp Nhanh

```text
lớp hội thoại
  - tin nhắn (message)
  - block prompt
  - nhắc nhở (reminder)

lớp hành động
  - tool call
  - tool result
  - hook event

lớp công việc
  - tác vụ đồ thị công việc
  - tác vụ runtime
  - yêu cầu giao thức

lớp thực thi
  - subagent
  - đồng đội (teammate)
  - làn worktree

lớp nền tảng
  - MCP server
  - bản ghi bộ nhớ
  - bộ định tuyến năng lực
```

## Các Cặp Thường Bị Nhầm Lẫn Nhất

### `Message` vs `PromptBlock`

| Thực thể | Nó Là Gì | Nó Không Phải Là |
|---|---|---|
| `Message` | nội dung hội thoại trong lịch sử | không phải quy tắc hệ thống ổn định |
| `PromptBlock` | fragment hướng dẫn prompt ổn định | không phải sự kiện mới nhất của một lượt |

### `Todo / Plan` vs `Task`

| Thực thể | Nó Là Gì | Nó Không Phải Là |
|---|---|---|
| `todo / plan` | hướng dẫn phiên tạm thời | không phải đồ thị công việc lâu dài |
| `task` | node công việc lâu dài | không phải suy nghĩ cục bộ của một lượt |

### `Work-Graph Task` vs `RuntimeTaskState`

| Thực thể | Nó Là Gì | Nó Không Phải Là |
|---|---|---|
| work-graph task | node mục tiêu lâu dài và phụ thuộc | không phải executor trực tiếp |
| runtime task | khe thực thi đang chạy hiện tại | không phải node phụ thuộc lâu dài |

### `Subagent` vs `Teammate`

| Thực thể | Nó Là Gì | Nó Không Phải Là |
|---|---|---|
| subagent | worker ủy thác một lần | không phải thành viên nhóm tồn tại lâu dài |
| teammate | cộng tác viên liên tục với danh tính và inbox | không phải công cụ tóm tắt có thể vứt bỏ |

### `ProtocolRequest` vs tin nhắn thông thường

| Thực thể | Nó Là Gì | Nó Không Phải Là |
|---|---|---|
| tin nhắn thông thường | giao tiếp tự do | không phải quy trình phê duyệt có thể theo dõi |
| protocol request | yêu cầu có cấu trúc với `request_id` | không phải text chat thông thường |

### `Task` vs `Worktree`

| Thực thể | Nó Là Gì | Nó Không Phải Là |
|---|---|---|
| task | điều gì nên được làm | không phải thư mục |
| worktree | nơi thực thi riêng biệt xảy ra | không phải mục tiêu bản thân |

### `Memory` vs `CLAUDE.md`

| Thực thể | Nó Là Gì | Nó Không Phải Là |
|---|---|---|
| memory | sự kiện lâu dài xuyên phiên | không phải file quy tắc dự án |
| `CLAUDE.md` | bề mặt quy tắc / hướng dẫn cục bộ ổn định | không phải lưu trữ sự kiện dài hạn đặc thù người dùng |

### `MCPServer` vs `MCPTool`

| Thực thể | Nó Là Gì | Nó Không Phải Là |
|---|---|---|
| MCP server | nhà cung cấp năng lực ngoài | không phải một công cụ cụ thể |
| MCP tool | một năng lực được hiển thị | không phải toàn bộ bề mặt kết nối |

## Bảng "Cái Gì / Ở Đâu" Nhanh

| Thực thể | Công việc chính | Nơi điển hình |
|---|---|---|
| `Message` | ngữ cảnh hội thoại hiển thị | `messages[]` |
| `PromptParts` | fragment lắp ráp đầu vào | prompt builder |
| `PermissionRule` | quy tắc quyết định thực thi | settings / session state |
| `HookEvent` | điểm mở rộng vòng đời | hook system |
| `MemoryEntry` | sự kiện lâu dài | memory store |
| `TaskRecord` | node mục tiêu công việc | task board |
| `RuntimeTaskState` | khe thực thi trực tiếp | runtime manager |
| `TeamMember` | danh tính worker liên tục | team config |
| `MessageEnvelope` | tin nhắn đồng đội có cấu trúc | inbox |
| `RequestRecord` | trạng thái quy trình giao thức | request tracker |
| `WorktreeRecord` | làn thực thi riêng biệt | worktree index |
| `MCPServerConfig` | cấu hình nhà cung cấp năng lực ngoài | plugin / settings |

## Bài Học Chính

**Hệ thống càng có năng lực, ranh giới thực thể rõ ràng càng quan trọng.**
