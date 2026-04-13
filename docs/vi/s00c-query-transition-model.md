# s00c: Mô Hình Chuyển Đổi Truy Vấn (Query Transition Model)

> **Deep Dive** -- Đọc tốt nhất cùng với s11 (Phục Hồi Lỗi). Nó đào sâu mô hình chuyển đổi được giới thiệu trong s00a.

### Khi Nào Đọc

Khi bạn đang làm việc trên phục hồi lỗi và muốn hiểu tại sao mỗi tiếp tục cần lý do rõ ràng.

---

> Ghi chú cầu nối này trả lời một câu hỏi hẹp nhưng quan trọng:
>
> **Tại sao agent có tỷ lệ hoàn thành cao cần biết _tại sao_ truy vấn tiếp tục vào lượt tiếp theo, thay vì coi mọi `continue` như nhau?**

## Tại Sao Ghi Chú Này Tồn Tại

Dòng chính đã dạy:

- `s01`: vòng lặp nhỏ nhất
- `s06`: nén và kiểm soát ngữ cảnh
- `s11`: phục hồi lỗi

Trình tự đó đúng.

Vấn đề là những gì bạn thường giữ trong đầu sau khi đọc các chương đó riêng lẻ:

> "Vòng lặp tiếp tục vì nó tiếp tục."

Điều đó đủ cho demo đồ chơi, nhưng hỏng nhanh trong hệ thống lớn hơn.

Truy vấn có thể tiếp tục vì lý do rất khác nhau:

- công cụ vừa hoàn thành và model cần kết quả
- đầu ra chạm giới hạn token và model nên tiếp tục
- nén đã thay đổi ngữ cảnh hoạt động và hệ thống nên retry
- lớp transport thất bại và backoff nói "thử lại"
- hook dừng nói lượt không nên kết thúc hoàn toàn
- chính sách ngân sách vẫn cho phép hệ thống tiếp tục

Nếu tất cả sụp đổ thành một `continue` mơ hồ, ba thứ tệ đi nhanh:

- log ngừng đọc được
- test ngừng chính xác
- mô hình tinh thần giảng dạy trở nên mờ nhạt

## Thuật Ngữ Trước

### Chuyển đổi (transition) là gì

Ở đây, chuyển đổi nghĩa là:

> lý do lượt trước trở thành lượt tiếp theo

Nó không phải nội dung tin nhắn. Nó là nguyên nhân luồng kiểm soát.

### Tiếp tục (continuation) là gì

Tiếp tục có nghĩa:

> truy vấn này vẫn sống và nên tiếp tục đẩy tiến

Nhưng tiếp tục không phải một thứ. Đó là một họ các lý do.

### Ranh giới truy vấn (query boundary) là gì

Ranh giới truy vấn là cạnh giữa lượt này và lượt tiếp theo.

Mỗi khi hệ thống vượt qua ranh giới đó, nó nên biết:

- tại sao nó đang vượt qua
- trạng thái nào đã thay đổi trước khi vượt qua
- cách lượt tiếp theo nên diễn giải sự thay đổi đó

## Mô Hình Tinh Thần Tối Thiểu

Đừng hình dung truy vấn như một đường thẳng duy nhất.

Mô hình tinh thần tốt hơn là:

```text
một truy vấn
  = chuỗi chuyển đổi trạng thái
    với lý do tiếp tục rõ ràng
```

Ví dụ:

```text
đầu vào người dùng
  ->
model phát tool_use
  ->
công cụ hoàn thành
  ->
tool_result_continuation
  ->
đầu ra model bị cắt ngắn
  ->
max_tokens_recovery
  ->
nén xảy ra
  ->
compact_retry
  ->
hoàn thành cuối cùng
```

Đó là lý do bài học thực sự không phải:

> "vòng lặp tiếp tục quay"

Bài học thực sự là:

> "hệ thống đang đẩy tiến qua các lý do chuyển đổi có kiểu"

## Bản Ghi Cốt Lõi

### 1. `transition` bên trong trạng thái truy vấn

Ngay cả triển khai giảng dạy cũng nên mang trường transition rõ ràng:

```python
state = {
    "messages": [...],
    "turn_count": 3,
    "continuation_count": 1,
    "has_attempted_compact": False,
    "transition": None,
}
```

Trường này không phải trang trí.

Nó cho bạn biết:

- tại sao lượt này tồn tại
- cách log nên giải thích nó
- đường dẫn nào test nên xác nhận

### 2. `TransitionReason`

Bộ giảng dạy tối thiểu có thể trông như thế này:

```python
TRANSITIONS = (
    "tool_result_continuation",
    "max_tokens_recovery",
    "compact_retry",
    "transport_retry",
    "stop_hook_continuation",
    "budget_continuation",
)
```

Các lý do này không tương đương:

- `tool_result_continuation`
  là tiến bộ vòng lặp bình thường
- `max_tokens_recovery`
  là tiếp tục sau đầu ra bị cắt ngắn
- `compact_retry`
  là tiếp tục sau tái cấu trúc ngữ cảnh
- `transport_retry`
  là tiếp tục sau lỗi hạ tầng
- `stop_hook_continuation`
  là tiếp tục bị ép buộc bởi logic kiểm soát bên ngoài
- `budget_continuation`
  là tiếp tục được cho phép bởi chính sách và ngân sách còn lại

### 3. Ngân sách tiếp tục

Hệ thống có tỷ lệ hoàn thành cao không chỉ tiếp tục. Chúng giới hạn tiếp tục.

Các trường điển hình trông như:

```python
state = {
    "max_output_tokens_recovery_count": 2,
    "has_attempted_reactive_compact": True,
}
```

Nguyên tắc là:

> tiếp tục là tài nguyên có kiểm soát, không phải cửa thoát vô hạn

## Các Bước Triển Khai Tối Thiểu

### Bước 1: làm rõ ràng mọi vị trí continue

Nhiều vòng lặp người mới bắt đầu vẫn trông thế này:

```python
continue
```

Tiến một bước:

```python
state["transition"] = "tool_result_continuation"
continue
```

### Bước 2: ghép mỗi tiếp tục với vá trạng thái

```python
if response.stop_reason == "tool_use":
    state["messages"] = append_tool_results(...)
    state["turn_count"] += 1
    state["transition"] = "tool_result_continuation"
    continue

if response.stop_reason == "max_tokens":
    state["messages"].append({
        "role": "user",
        "content": CONTINUE_MESSAGE,
    })
    state["max_output_tokens_recovery_count"] += 1
    state["transition"] = "max_tokens_recovery"
    continue
```

Phần quan trọng không phải "một dòng code thêm."

Phần quan trọng là:

> trước mỗi tiếp tục, hệ thống biết cả lý do và sự thay đổi trạng thái

### Bước 3: tách tiến bộ bình thường khỏi phục hồi

```python
if should_retry_transport(error):
    time.sleep(backoff(...))
    state["transition"] = "transport_retry"
    continue

if should_recompact(error):
    state["messages"] = compact_messages(state["messages"])
    state["transition"] = "compact_retry"
    continue
```

Khi bạn làm điều này, "continue" ngừng là hành động mơ hồ và trở thành chuyển đổi kiểm soát có kiểu.

## Cần Test Gì

Repository giảng dạy của bạn nên làm các xác nhận này đơn giản:

- kết quả công cụ ghi `tool_result_continuation`
- đầu ra model bị cắt ghi `max_tokens_recovery`
- retry nén không âm thầm dùng lại lý do cũ
- retry transport tăng trạng thái retry và không trông giống lượt bình thường

Nếu các đường dẫn đó không dễ test, mô hình có lẽ vẫn quá ngầm định.

## Không Nên Dạy Quá Mức

Bạn không cần chôn mình trong chi tiết transport dành riêng cho nhà cung cấp hay mọi enum trường hợp góc.

Cho repository giảng dạy, bài học cốt lõi hẹp hơn:

> một truy vấn là chuỗi chuyển đổi rõ ràng, và mỗi chuyển đổi nên mang lý do, vá trạng thái, và quy tắc ngân sách

Đó là phần bạn thực sự cần nếu muốn xây dựng lại agent có tỷ lệ hoàn thành cao từ zero.

## Bài Học Chính

**Mỗi tiếp tục cần lý do có kiểu. Không có nó, log mờ, test yếu, và mô hình tinh thần sụp đổ thành "vòng lặp tiếp tục quay."**
