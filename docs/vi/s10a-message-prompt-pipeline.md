# s10a: Pipeline Message & Prompt

> **Deep Dive** -- Đọc tốt nhất cùng với s10. Nó cho thấy tại sao system prompt chỉ là một phần của đầu vào đầy đủ cho model.

### Khi Nào Đọc

Khi bạn đang làm việc trên lắp ráp prompt và muốn thấy pipeline đầu vào đầy đủ.

---

> Tài liệu cầu nối này mở rộng `s10`.
>
> Nó tồn tại để làm rõ ràng một ý tưởng quan trọng:
>
> **system prompt quan trọng, nhưng nó không phải toàn bộ đầu vào model.**

## Tại Sao Tài Liệu Này Tồn Tại

`s10` đã nâng cấp system prompt từ một chuỗi khổng lồ thành tiến trình lắp ráp có thể bảo trì.

Điều đó quan trọng.

Nhưng hệ thống có tỷ lệ hoàn thành cao hơn đi thêm một bước và coi toàn bộ đầu vào model như pipeline được tạo từ nhiều nguồn:

- block system prompt
- messages đã chuẩn hóa
- đính kèm bộ nhớ
- tiêm nhắc nhở
- ngữ cảnh runtime động

Nên cấu trúc thực sự là:

**pipeline prompt, không chỉ prompt builder.**

## Thuật Ngữ Trước

### Block prompt

Một phần có cấu trúc bên trong system prompt, như:

- danh tính cốt lõi
- hướng dẫn công cụ
- phần bộ nhớ
- phần CLAUDE.md

### Message đã chuẩn hóa

Message đã được chuyển đổi thành hình dạng ổn định phù hợp cho API model.

Điều này cần thiết vì hệ thống thô có thể chứa:

- tin nhắn người dùng
- phản hồi trợ lý
- kết quả công cụ
- tiêm nhắc nhở
- nội dung dạng đính kèm

Chuẩn hóa đảm bảo tất cả đều phù hợp cùng hợp đồng cấu trúc trước khi đến API.

### System reminder

Hướng dẫn tạm thời nhỏ được tiêm cho lượt hiện tại hoặc chế độ hiện tại.

Khác với block prompt tồn tại lâu, reminder thường ngắn hạn và theo tình huống -- ví dụ, nói cho model biết nó hiện đang trong "chế độ kế hoạch" hoặc rằng một công cụ nhất định tạm thời không khả dụng.

## Mô Hình Tinh Thần Hữu Ích Nhỏ Nhất

Hãy nghĩ đầu vào đầy đủ như pipeline:

```text
nhiều nguồn
  |
  +-- block system prompt
  +-- messages
  +-- đính kèm
  +-- nhắc nhở
  |
  v
chuẩn hóa
  |
  v
payload API cuối cùng
```

Điểm giảng dạy then chốt:

**tách các nguồn trước, sau đó chuẩn hóa chúng thành một đầu vào ổn định.**

## Tại Sao System Prompt Không Phải Tất Cả

System prompt là nơi đúng cho:

- danh tính
- quy tắc ổn định
- ràng buộc tồn tại lâu
- mô tả khả năng công cụ

Nhưng thường là nơi sai cho:

- `tool_result` mới nhất
- tiêm hook một lượt
- nhắc nhở tạm thời
- đính kèm bộ nhớ động

Đó thuộc luồng message hoặc các bề mặt đầu vào liền kề.

## Cấu Trúc Cốt Lõi

### `SystemPromptBlock`

```python
block = {
    "text": "...",
    "cache_scope": None,
}
```

### `PromptParts`

```python
parts = {
    "core": "...",
    "tools": "...",
    "skills": "...",
    "memory": "...",
    "claude_md": "...",
    "dynamic": "...",
}
```

### `NormalizedMessage`

```python
message = {
    "role": "user" | "assistant",
    "content": [...],
}
```

Coi `content` như danh sách block, không chỉ một chuỗi.

### `ReminderMessage`

```python
reminder = {
    "role": "system",
    "content": "Current mode: plan",
}
```

Ngay cả khi triển khai giảng dạy của bạn không sử dụng `role="system"` ở đây theo nghĩa đen, bạn vẫn nên giữ phân chia tinh thần:

- block prompt tồn tại lâu
- reminder ngắn hạn

## Đường Dẫn Triển Khai Tối Thiểu

### 1. Giữ `SystemPromptBuilder`

Đừng vứt bỏ bước prompt-builder.

### 2. Làm messages thành pipeline riêng

```python
def build_messages(raw_messages, attachments, reminders):
    messages = normalize_messages(raw_messages)
    messages = attach_memory(messages, attachments)
    messages = append_reminders(messages, reminders)
    return messages
```

### 3. Lắp ráp payload cuối cùng chỉ ở cuối

```python
payload = {
    "system": build_system_prompt(),
    "messages": build_messages(...),
    "tools": build_tools(...),
}
```

Đây là nâng cấp tinh thần quan trọng:

**system prompt, messages, và tools là bề mặt đầu vào song song, không phải thay thế lẫn nhau.**

## Bài Học Chính

**Đầu vào model là pipeline các nguồn được chuẩn hóa muộn, không phải một blob prompt huyền bí. System prompt, messages, và tools là bề mặt song song hội tụ chỉ tại thời điểm gửi.**
