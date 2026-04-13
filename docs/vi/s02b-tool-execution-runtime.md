# s02b: Tool Execution Runtime (Runtime Thực Thi Công Cụ)

> **Deep Dive** -- Đọc tốt nhất sau s02, khi bạn muốn hiểu thực thi công cụ đồng thời.

### Khi Nào Đọc

Khi bạn bắt đầu thắc mắc cách nhiều lần gọi công cụ trong một lượt được thực thi an toàn.

---

> Ghi chú cầu nối này không về cách công cụ được đăng ký.
>
> Nó về câu hỏi sâu hơn:
>
> **Khi model phát nhiều lần gọi công cụ, quy tắc nào quyết định đồng thời, cập nhật tiến độ, sắp xếp kết quả, và hợp nhất ngữ cảnh?**

## Tại Sao Ghi Chú Này Tồn Tại

`s02` dạy đúng:

- schema công cụ
- dispatch map
- `tool_result` chảy ngược vào vòng lặp

Đó là điểm khởi đầu đúng.

Nhưng khi hệ thống phát triển, các câu hỏi khó di chuyển sâu hơn một lớp:

- công cụ nào có thể chạy song song
- công cụ nào nên giữ tuần tự
- liệu công cụ chạy lâu nên phát tiến độ trước
- liệu kết quả đồng thời nên ghi lại theo thứ tự hoàn thành hay thứ tự gốc
- liệu thực thi công cụ có biến đổi ngữ cảnh chung
- cách biến đổi đồng thời nên hợp nhất an toàn

Những câu hỏi đó không về đăng ký nữa.

Chúng thuộc về **tool execution runtime** -- bộ quy tắc hệ thống tuân theo khi lần gọi công cụ thực sự bắt đầu thực thi, bao gồm lập lịch, theo dõi, phát tiến độ, và hợp nhất kết quả.

## Thuật Ngữ Trước

### "Tool execution runtime" nghĩa là gì ở đây

Đây không phải runtime ngôn ngữ lập trình.

Ở đây nó nghĩa:

> các quy tắc hệ thống sử dụng khi lần gọi công cụ thực sự bắt đầu thực thi

Các quy tắc đó bao gồm lập lịch, theo dõi, phát tiến độ, và hợp nhất kết quả.

### "Concurrency safe" nghĩa là gì

Công cụ an toàn đồng thời khi:

> nó có thể chạy bên cạnh công việc tương tự mà không làm hỏng trạng thái chung

Công cụ chỉ-đọc điển hình thường an toàn:

- `read_file`
- một số công cụ tìm kiếm
- công cụ MCP chỉ-truy-vấn

Nhiều công cụ ghi thì không:

- `write_file`
- `edit_file`
- công cụ sửa đổi trạng thái ứng dụng chung

### Tin nhắn tiến độ là gì

Tin nhắn tiến độ nghĩa:

> công cụ chưa xong, nhưng hệ thống đã hiển thị những gì nó đang làm

Điều này giữ người dùng được thông tin trong thao tác chạy lâu thay vì để họ nhìn chằm chằm vào im lặng.

### Context modifier là gì

Một số công cụ làm nhiều hơn trả về văn bản.

Chúng cũng sửa đổi ngữ cảnh runtime chung, ví dụ:

- cập nhật hàng đợi thông báo
- ghi lại công cụ đang hoạt động
- biến đổi trạng thái ứng dụng

Biến đổi trạng thái chung đó được gọi là context modifier.

## Mô Hình Tinh Thần Tối Thiểu

Đừng san phẳng thực thi công cụ thành:

```text
tool_use -> handler -> kết quả
```

Mô hình tinh thần tốt hơn là:

```text
block tool_use
  ->
phân vùng theo an toàn đồng thời
  ->
chọn thực thi đồng thời hoặc tuần tự
  ->
phát tiến độ nếu cần
  ->
ghi kết quả lại theo thứ tự ổn định
  ->
hợp nhất context modifier đã xếp hàng
```

Hai nâng cấp quan trọng nhất:

- đồng thời không phải "tất cả công cụ chạy cùng nhau"
- ngữ cảnh chung không nên bị biến đổi theo thứ tự hoàn thành ngẫu nhiên

## Bản Ghi Cốt Lõi

### 1. `ToolExecutionBatch`

Batch giảng dạy tối thiểu có thể trông như:

```python
batch = {
    "is_concurrency_safe": True,
    "blocks": [tool_use_1, tool_use_2, tool_use_3],
}
```

Điểm đơn giản:

- công cụ không luôn được xử lý từng cái
- runtime nhóm chúng vào batch thực thi trước

### 2. `TrackedTool`

Nếu bạn muốn lớp thực thi hoàn thành cao hơn, theo dõi mỗi công cụ rõ ràng:

```python
tracked_tool = {
    "id": "toolu_01",
    "name": "read_file",
    "status": "queued",   # queued / executing / completed / yielded
    "is_concurrency_safe": True,
    "pending_progress": [],
    "results": [],
    "context_modifiers": [],
}
```

Điều này làm runtime có thể trả lời:

- gì vẫn đang chờ
- gì đã đang chạy
- gì đã hoàn thành
- gì đã phát tiến độ

### 3. `MessageUpdate`

Thực thi công cụ có thể tạo ra nhiều hơn một kết quả cuối cùng.

Update tối thiểu có thể được coi như:

```python
update = {
    "message": maybe_message,
    "new_context": current_context,
}
```

Trong runtime lớn hơn, update thường chia thành hai kênh:

- tin nhắn nên hiển thị upstream ngay lập tức
- thay đổi ngữ cảnh nên giữ nội bộ cho đến thời gian hợp nhất

### 4. Context modifier đã xếp hàng

Dễ bỏ qua, nhưng là một trong những ý tưởng quan trọng nhất.

Trong batch đồng thời, chiến lược an toàn hơn không phải:

> "công cụ nào hoàn thành trước biến đổi ngữ cảnh chung trước"

Chiến lược an toàn hơn là:

> xếp hàng context modifier trước, sau đó hợp nhất chúng theo thứ tự công cụ gốc

Ví dụ:

```python
queued_context_modifiers = {
    "toolu_01": [modify_ctx_a],
    "toolu_02": [modify_ctx_b],
}
```

## Các Bước Triển Khai Tối Thiểu

### Bước 1: phân loại an toàn đồng thời

```python
def is_concurrency_safe(tool_name: str, tool_input: dict) -> bool:
    return tool_name in {"read_file", "search_files"}
```

### Bước 2: phân vùng trước thực thi

```python
batches = partition_tool_calls(tool_uses)

for batch in batches:
    if batch["is_concurrency_safe"]:
        run_concurrently(batch["blocks"])
    else:
        run_serially(batch["blocks"])
```

### Bước 3: để batch đồng thời phát tiến độ

```python
for update in run_concurrently(...):
    if update.get("message"):
        yield update["message"]
```

### Bước 4: hợp nhất ngữ cảnh theo thứ tự ổn định

```python
queued_modifiers = {}

for update in concurrent_updates:
    if update.get("context_modifier"):
        queued_modifiers[update["tool_id"]].append(update["context_modifier"])

for tool in original_batch_order:
    for modifier in queued_modifiers.get(tool["id"], []):
        context = modifier(context)
```

Đây là một trong những nơi repo giảng dạy có thể vẫn giữ đơn giản mà vẫn trung thực về hình dạng hệ thống thực.

## Hình Ảnh Bạn Nên Giữ

```text
block tool_use
  |
  v
phân vùng theo an toàn đồng thời
  |
  +-- batch an toàn ---------> thực thi đồng thời
  |                            |
  |                            +-- cập nhật tiến độ
  |                            +-- kết quả cuối
  |                            +-- context modifier đã xếp hàng
  |
  +-- batch độc quyền -------> thực thi tuần tự
                                |
                                +-- kết quả trực tiếp
                                +-- cập nhật ngữ cảnh trực tiếp
```

## Tại Sao Điều Này Quan Trọng Hơn Dispatch Map

Trong demo nhỏ:

```python
handlers[tool_name](tool_input)
```

là đủ.

Nhưng trong agent có tỷ lệ hoàn thành cao hơn, phần khó không còn là gọi handler đúng.

Phần khó là:

- lập lịch nhiều công cụ an toàn
- giữ tiến độ nhìn thấy được
- làm sắp xếp kết quả ổn định
- ngăn ngữ cảnh chung trở nên không xác định

Đó là lý do tool execution runtime xứng đáng có deep dive riêng.

## Bài Học Chính

**Khi model phát nhiều lần gọi công cụ mỗi lượt, vấn đề khó chuyển từ dispatch sang thực thi đồng thời an toàn với sắp xếp kết quả ổn định.**
