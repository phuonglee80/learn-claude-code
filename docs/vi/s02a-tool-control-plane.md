# s02a: Tool Control Plane (Mặt Phẳng Kiểm Soát Công Cụ)

> **Deep Dive** -- Đọc tốt nhất sau s02 và trước s07. Nó cho thấy tại sao công cụ trở thành nhiều hơn bảng tra cứu đơn giản.

### Khi Nào Đọc

Sau khi bạn hiểu điều phối công cụ cơ bản và trước khi thêm quyền hạn.

---

> Tài liệu cầu nối này trả lời một câu hỏi then chốt khác:
>
> **Tại sao hệ thống công cụ nhiều hơn bảng `tool_name -> handler`?**

## Tại Sao Tài Liệu Này Tồn Tại

`s02` dạy đúng đăng ký và điều phối công cụ trước.

Đó là bước giảng dạy đúng vì bạn nên trước tiên hiểu cách model biến ý định thành hành động.

Nhưng sau đó lớp công cụ bắt đầu mang nhiều trách nhiệm hơn:

- kiểm tra quyền hạn
- định tuyến MCP
- thông báo
- trạng thái runtime chung
- truy cập message
- trạng thái ứng dụng
- hạn chế dành riêng cho khả năng

Tại thời điểm đó, lớp công cụ không còn chỉ là bảng hàm.

Nó trở thành control plane (lớp phối hợp quyết định *cách* mỗi lần gọi công cụ được định tuyến và thực thi, thay vì thực hiện công việc công cụ bản thân).

## Thuật Ngữ Trước

### Tool control plane

Phần của hệ thống quyết định **cách** lần gọi công cụ thực thi:

- nó chạy ở đâu
- nó có được phép không
- trạng thái nào nó có thể truy cập
- nó native hay bên ngoài

### Ngữ cảnh thực thi

Môi trường runtime nhìn thấy bởi công cụ:

- thư mục làm việc hiện tại
- chế độ quyền hạn hiện tại
- messages hiện tại
- MCP client khả dụng
- trạng thái ứng dụng và kênh thông báo

### Nguồn khả năng

Không phải mọi công cụ đến từ cùng nơi. Nguồn phổ biến:

- công cụ cục bộ native
- công cụ MCP
- công cụ nền tảng agent/nhóm/tác vụ/worktree

## Mô Hình Tinh Thần Hữu Ích Nhỏ Nhất

Nghĩ về hệ thống công cụ như bốn lớp:

```text
1. ToolSpec
   những gì model thấy

2. Tool Router
   nơi yêu cầu được gửi đi

3. ToolUseContext
   môi trường nào công cụ có thể truy cập

4. Tool Result Envelope
   đầu ra trả về vòng lặp chính như thế nào
```

Bước nâng cấp lớn nhất là lớp 3:

**hệ thống có tỷ lệ hoàn thành cao được định nghĩa ít bởi bảng điều phối và nhiều hơn bởi ngữ cảnh thực thi chung.**

## Cấu Trúc Cốt Lõi

### `ToolSpec`

```python
tool = {
    "name": "read_file",
    "description": "Read file contents.",
    "input_schema": {...},
}
```

### `ToolDispatchMap`

```python
handlers = {
    "read_file": read_file,
    "write_file": write_file,
    "bash": run_bash,
}
```

Cần thiết, nhưng không đủ.

### `ToolUseContext`

```python
tool_use_context = {
    "tools": handlers,
    "permission_context": {...},
    "mcp_clients": {},
    "messages": [...],
    "app_state": {...},
    "notifications": [],
    "cwd": "...",
}
```

Điểm then chốt:

Công cụ ngừng chỉ nhận tham số đầu vào.
Chúng bắt đầu nhận môi trường runtime chung.

### `ToolResultEnvelope`

```python
result = {
    "ok": True,
    "content": "...",
    "is_error": False,
    "attachments": [],
}
```

Điều này làm dễ hỗ trợ:

- đầu ra văn bản thuần
- đầu ra có cấu trúc
- đầu ra lỗi
- kết quả dạng đính kèm

## Tại Sao `ToolUseContext` Cuối Cùng Trở Nên Cần Thiết

So sánh hai hệ thống.

### Hệ thống A: chỉ dispatch map

```python
output = handlers[tool_name](**tool_input)
```

Ổn cho demo.

### Hệ thống B: dispatch map cộng ngữ cảnh thực thi

```python
output = handlers[tool_name](tool_input, tool_use_context)
```

Gần hơn với nền tảng thực.

Tại sao?

Vì bây giờ:

- `bash` cần quyền hạn
- `mcp__...` cần client
- công cụ `agent` cần thiết lập môi trường thực thi
- `task_output` có thể cần ghi tệp cộng ghi lại thông báo

## Đường Dẫn Triển Khai Tối Thiểu

### 1. Giữ `ToolSpec` và handler

Đừng vứt bỏ mô hình đơn giản.

### 2. Giới thiệu một đối tượng ngữ cảnh chung

```python
class ToolUseContext:
    def __init__(self):
        self.handlers = {}
        self.permission_context = {}
        self.mcp_clients = {}
        self.messages = []
        self.app_state = {}
        self.notifications = []
```

### 3. Để tất cả handler nhận ngữ cảnh

```python
def run_tool(tool_name: str, tool_input: dict, ctx: ToolUseContext):
    handler = ctx.handlers[tool_name]
    return handler(tool_input, ctx)
```

### 4. Định tuyến theo nguồn khả năng

```python
def route_tool(tool_name: str, tool_input: dict, ctx: ToolUseContext):
    if tool_name.startswith("mcp__"):
        return run_mcp_tool(tool_name, tool_input, ctx)
    return run_native_tool(tool_name, tool_input, ctx)
```

## Bài Học Chính

**Hệ thống công cụ trưởng thành không chỉ là bản đồ tên-sang-hàm. Đó là mặt phẳng thực thi chung quyết định cách ý định hành động của model trở thành công việc thực sự.**
