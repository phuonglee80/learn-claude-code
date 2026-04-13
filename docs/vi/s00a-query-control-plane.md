# s00a: Query Control Plane (Mặt Phẳng Kiểm Soát Truy Vấn)

> **Deep Dive** -- Đọc tốt nhất sau khi hoàn thành Giai đoạn 1 (s01-s06). Nó giải thích tại sao vòng lặp đơn giản cần một lớp phối hợp khi hệ thống phát triển.

### Khi Nào Đọc

Sau khi bạn đã xây dựng vòng lặp cơ bản và công cụ, và trước khi bạn bắt đầu các chương củng cố của Giai đoạn 2.

---

> Tài liệu cầu nối này trả lời một câu hỏi nền tảng:
>
> **Tại sao `messages[] + while True` không đủ cho agent có tỷ lệ hoàn thành cao?**

## Tại Sao Tài Liệu Này Tồn Tại

`s01` dạy đúng vòng lặp hoạt động nhỏ nhất:

```text
đầu vào người dùng
  ->
phản hồi model
  ->
nếu tool_use thì thực thi
  ->
thêm kết quả
  ->
tiếp tục
```

Đó là điểm khởi đầu đúng.

Nhưng khi hệ thống phát triển, harness cần một lớp riêng quản lý **bản thân tiến trình truy vấn**. "Control plane" (phần của hệ thống phối hợp hành vi thay vì thực hiện công việc trực tiếp) nằm trên đường dẫn dữ liệu và quyết định khi nào, tại sao, và cách vòng lặp nên tiếp tục chạy:

- lượt hiện tại
- lý do tiếp tục
- trạng thái phục hồi
- trạng thái nén
- thay đổi ngân sách
- tiếp tục do hook điều khiển

Lớp đó là **query control plane**.

## Thuật Ngữ Trước

### Truy vấn (query) là gì?

Ở đây, truy vấn không phải là lookup cơ sở dữ liệu.

Nó có nghĩa:

> toàn bộ tiến trình đa lượt mà hệ thống chạy để hoàn thành một yêu cầu người dùng

### Control plane là gì?

Control plane không thực hiện hành động nghiệp vụ bản thân.

Nó phối hợp:

- khi nào thực thi tiếp tục
- tại sao nó tiếp tục
- trạng thái nào được vá trước lượt tiếp theo

Nếu bạn đã làm việc với networking hoặc hạ tầng, thuật ngữ này quen thuộc -- control plane quyết định traffic đi đâu, trong khi data plane mang các gói tin thực sự. Cùng ý tưởng áp dụng ở đây: control plane quyết định liệu vòng lặp nên tiếp tục chạy và tại sao, trong khi lớp thực thi làm các lần gọi model và công việc công cụ thực sự.

### Chuyển đổi (transition) là gì?

Chuyển đổi giải thích:

> tại sao lượt trước không kết thúc và tại sao lượt tiếp theo tồn tại

Các lý do phổ biến:

- ghi lại kết quả công cụ
- phục hồi đầu ra bị cắt ngắn
- retry sau nén
- retry sau lỗi transport

## Mô Hình Tinh Thần Hữu Ích Nhỏ Nhất

Hãy nghĩ về đường dẫn truy vấn theo ba lớp:

```text
1. Lớp đầu vào
   - messages
   - system prompt
   - ngữ cảnh user/system

2. Lớp kiểm soát
   - trạng thái truy vấn
   - đếm lượt
   - lý do chuyển đổi
   - cờ phục hồi / nén / ngân sách

3. Lớp thực thi
   - gọi model
   - thực thi công cụ
   - ghi lại
```

Control plane không thay thế vòng lặp.

Nó làm cho vòng lặp có khả năng xử lý nhiều hơn một nhánh happy-path.

## Tại Sao Riêng `messages[]` Không Còn Đủ

Ở quy mô demo, nhiều người học đặt mọi thứ vào `messages[]`.

Điều đó hỏng khi hệ thống cần biết:

- liệu nén phản ứng đã chạy chưa
- bao nhiêu lần tiếp tục đã xảy ra
- liệu lượt này là retry hay ghi lại bình thường
- liệu ngân sách đầu ra tạm thời có đang hoạt động

Đó không phải là nội dung hội thoại.

Đó là **trạng thái kiểm soát tiến trình**.

## Cấu Trúc Cốt Lõi

### `QueryParams`

Đầu vào bên ngoài truyền vào query engine:

```python
params = {
    "messages": [...],
    "system_prompt": "...",
    "tool_use_context": {...},
    "max_output_tokens_override": None,
    "max_turns": None,
}
```

### `QueryState`

Trạng thái thay đổi qua các lượt:

```python
state = {
    "messages": [...],
    "tool_use_context": {...},
    "turn_count": 1,
    "continuation_count": 0,
    "has_attempted_compact": False,
    "max_output_tokens_override": None,
    "transition": None,
}
```

### `TransitionReason`

Lý do rõ ràng cho việc tiếp tục:

```python
TRANSITIONS = (
    "tool_result_continuation",
    "max_tokens_recovery",
    "compact_retry",
    "transport_retry",
)
```

Đây không phải nghi lễ. Nó làm log, testing, debugging và giảng dạy rõ ràng hơn nhiều.

## Pattern Triển Khai Tối Thiểu

### 1. Tách params đầu vào khỏi trạng thái trực tiếp

```python
def query(params):
    state = {
        "messages": params["messages"],
        "tool_use_context": params["tool_use_context"],
        "turn_count": 1,
        "transition": None,
    }
```

### 2. Để mọi vị trí continue vá trạng thái rõ ràng

```python
state["transition"] = "tool_result_continuation"
state["turn_count"] += 1
```

### 3. Để lượt tiếp theo vào với lý do

Vòng lặp tiếp theo nên biết liệu nó tồn tại vì:

- ghi lại bình thường
- retry
- nén
- tiếp tục sau đầu ra bị cắt ngắn

## Điều Này Thay Đổi Gì Cho Bạn

Khi bạn thấy query control plane rõ ràng, các chương sau ngừng cảm thấy như tính năng ngẫu nhiên.

- Nén `s06` trở thành vá trạng thái, không phải nhảy ma thuật
- Phục hồi `s11` trở thành tiếp tục có cấu trúc, không chỉ `try/except`
- Tự chủ `s17` trở thành một đường dẫn tiếp tục có kiểm soát khác, không phải vòng lặp bí ẩn riêng biệt

## Bài Học Chính

**Truy vấn không chỉ là messages chảy qua vòng lặp. Đó là tiến trình có kiểm soát với trạng thái tiếp tục rõ ràng.**
