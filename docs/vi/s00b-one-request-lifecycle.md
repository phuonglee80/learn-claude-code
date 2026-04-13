# s00b: Vòng Đời Một Yêu Cầu (One Request Lifecycle)

> **Deep Dive** -- Đọc tốt nhất sau Giai đoạn 2 (s07-s11) khi bạn muốn thấy cách tất cả các mảnh kết nối đầu-cuối.

### Khi Nào Đọc

Khi bạn đã học nhiều hệ thống con và muốn thấy luồng dọc đầy đủ của một yêu cầu duy nhất.

---

> Tài liệu cầu nối này kết nối toàn bộ hệ thống thành một chuỗi thực thi liên tục.
>
> Nó trả lời:
>
> **Thực sự điều gì xảy ra sau khi một tin nhắn người dùng vào hệ thống?**

## Tại Sao Tài Liệu Này Tồn Tại

Khi bạn đọc chương-by-chương, bạn có thể hiểu mỗi cơ chế cô lập:

- `s01` vòng lặp
- `s02` công cụ
- `s07` quyền hạn
- `s09` bộ nhớ
- `s12-s19` tác vụ, nhóm, worktree, MCP

Nhưng triển khai trở nên khó khi bạn không thể trả lời:

- cái nào đến trước?
- khi nào bộ nhớ và lắp ráp prompt xảy ra?
- quyền hạn nằm ở đâu so với công cụ?
- khi nào tác vụ, khe runtime, đồng đội, worktree và MCP vào?

Tài liệu này cho bạn luồng dọc.

## Bức Tranh Toàn Cảnh Quan Trọng Nhất

```text
yêu cầu người dùng
  |
  v
khởi tạo trạng thái truy vấn
  |
  v
lắp ráp system prompt / messages / nhắc nhở
  |
  v
gọi model
  |
  +-- câu trả lời bình thường ----------------------> kết thúc yêu cầu
  |
  +-- tool_use
        |
        v
    tool router
        |
        +-- cổng quyền hạn
        +-- hook
        +-- công cụ native / MCP / agent / tác vụ / nhóm
        |
        v
    kết quả thực thi
        |
        +-- có thể cập nhật tác vụ / runtime / bộ nhớ / trạng thái worktree
        |
        v
    ghi tool_result trở lại messages
        |
        v
    vá trạng thái truy vấn
        |
        v
    tiếp tục lượt tiếp theo
```

## Phân Đoạn 1: Yêu Cầu Người Dùng Trở Thành Trạng Thái Truy Vấn

Hệ thống không coi một yêu cầu người dùng như một lần gọi API.

Nó trước tiên tạo trạng thái truy vấn cho tiến trình có thể kéo dài nhiều lượt:

```python
query_state = {
    "messages": [{"role": "user", "content": user_text}],
    "turn_count": 1,
    "transition": None,
    "tool_use_context": {...},
}
```

Sự thay đổi tinh thần chính:

**một yêu cầu là tiến trình runtime đa lượt, không phải phản hồi model duy nhất.**

Đọc liên quan:

- [`s01-the-agent-loop.md`](./s01-the-agent-loop.md)
- [`s00a-query-control-plane.md`](./s00a-query-control-plane.md)

## Phân Đoạn 2: Đầu Vào Model Thực Sự Được Lắp Ráp

Harness thường không gửi `messages` thô trực tiếp.

Nó lắp ráp:

- block system prompt
- messages đã chuẩn hóa
- đính kèm bộ nhớ
- nhắc nhở
- định nghĩa công cụ

Nên payload thực sự gần hơn với:

```text
system prompt
+ messages đã chuẩn hóa
+ tools
+ nhắc nhở và đính kèm tùy chọn
```

Chương liên quan:

- `s09`
- `s10`
- [`s10a-message-prompt-pipeline.md`](./s10a-message-prompt-pipeline.md)

## Phân Đoạn 3: Model Tạo Ra Câu Trả Lời Hoặc Ý Định Hành Động

Có hai lớp đầu ra quan trọng.

### Câu trả lời bình thường

Yêu cầu có thể kết thúc ở đây.

### Ý định hành động

Đây thường là lần gọi công cụ, ví dụ:

- `read_file(...)`
- `bash(...)`
- `task_create(...)`
- `mcp__server__tool(...)`

Hệ thống không còn chỉ nhận văn bản nữa.

Nó đang nhận hướng dẫn nên ảnh hưởng đến thế giới thực.

## Phân Đoạn 4: Tool Control Plane Tiếp Quản

Khi `tool_use` xuất hiện, hệ thống vào tool control plane (lớp quyết định lần gọi công cụ được định tuyến, kiểm tra và thực thi như thế nào).

Nó trả lời:

1. đây là công cụ nào?
2. nó nên định tuyến đến đâu?
3. nó có nên qua cổng quyền hạn?
4. hook có quan sát hoặc sửa đổi hành động?
5. ngữ cảnh runtime chung nào nó có thể truy cập?

Hình ảnh tối thiểu:

```text
tool_use
  |
  v
tool router
  |
  +-- handler native
  +-- MCP client
  +-- agent / nhóm / tác vụ runtime
```

Đọc liên quan:

- [`s02-tool-use.md`](./s02-tool-use.md)
- [`s02a-tool-control-plane.md`](./s02a-tool-control-plane.md)

## Phân Đoạn 5: Thực Thi Có Thể Cập Nhật Nhiều Hơn Messages

Kết quả công cụ không chỉ trả về văn bản.

Thực thi cũng có thể cập nhật:

- trạng thái task board
- trạng thái tác vụ runtime
- bản ghi bộ nhớ
- bản ghi yêu cầu
- bản ghi worktree

Đó là lý do các chương giữa và cuối không phải tính năng phụ tùy chọn. Chúng trở thành phần của vòng đời yêu cầu.

## Phân Đoạn 6: Kết Quả Quay Lại Vòng Lặp Chính

Bước quan trọng luôn giống nhau:

```text
kết quả thực thi thực sự
  ->
tool_result hoặc ghi lại có cấu trúc
  ->
messages / trạng thái truy vấn được cập nhật
  ->
lượt tiếp theo
```

Nếu kết quả không bao giờ quay lại vòng lặp, model không thể suy luận trên thực tế.

## Nén Hữu Ích

Khi bạn bị lạc, nén toàn bộ vòng đời thành ba lớp:

### Vòng lặp truy vấn

Sở hữu tiến trình yêu cầu đa lượt.

### Tool control plane

Sở hữu định tuyến, quyền hạn, hook và ngữ cảnh thực thi.

### Trạng thái nền tảng

Sở hữu bản ghi lâu dài như tác vụ, khe runtime, đồng đội, worktree và cấu hình khả năng bên ngoài.

## Bài Học Chính

**Yêu cầu người dùng vào như trạng thái truy vấn, đi qua đầu vào đã lắp ráp, trở thành ý định hành động, vượt qua tool control plane, chạm vào trạng thái nền tảng, và sau đó quay lại vòng lặp như ngữ cảnh nhìn thấy được mới.**
