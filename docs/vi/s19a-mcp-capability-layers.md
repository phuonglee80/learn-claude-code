# s19a: Các Lớp Khả Năng MCP (MCP Capability Layers)

> **Deep Dive** -- Đọc tốt nhất cùng với s19. Nó cho thấy MCP nhiều hơn chỉ công cụ bên ngoài.

### Khi Nào Đọc

Sau khi đọc cách tiếp cận công-cụ-trước của s19, khi bạn sẵn sàng thấy stack khả năng MCP đầy đủ.

---

> `s19` vẫn nên giữ dòng chính công-cụ-trước.
> Ghi chú cầu nối này thêm mô hình tinh thần thứ hai:
>
> **MCP không chỉ là truy cập công cụ bên ngoài. Đó là stack các lớp khả năng.**

## Cách Đọc Với Dòng Chính

Nếu bạn muốn nghiên cứu MCP mà không trôi khỏi mục tiêu giảng dạy:

- đọc [`s19-mcp-plugin.md`](./s19-mcp-plugin.md) trước và giữ đường dẫn công-cụ-trước rõ ràng
- sau đó bạn có thể thấy hữu ích khi xem lại [`s02a-tool-control-plane.md`](./s02a-tool-control-plane.md) để thấy cách khả năng bên ngoài định tuyến ngược vào bus công cụ thống nhất
- nếu bản ghi trạng thái bắt đầu mờ nhạt, bạn có thể thấy hữu ích khi xem lại [`data-structures.md`](./data-structures.md)
- nếu ranh giới khái niệm mờ nhạt, bạn có thể thấy hữu ích khi xem lại [`glossary.md`](./glossary.md) và [`entity-map.md`](./entity-map.md)

## Tại Sao Điều Này Cần Ghi Chú Cầu Nối Riêng

Cho repo giảng dạy, giữ dòng chính tập trung vào công cụ bên ngoài trước là đúng.

Đó là entry dễ nhất:

- kết nối server bên ngoài
- nhận định nghĩa công cụ
- gọi công cụ
- mang kết quả trở lại agent

Nhưng nếu bạn muốn hình dạng hệ thống tiếp cận hành vi hoàn thành cao thực sự, bạn nhanh chóng gặp câu hỏi sâu hơn:

- server kết nối qua stdio, HTTP, SSE hay WebSocket
- tại sao một số server `connected`, trong khi khác `pending` hoặc `needs-auth`
- tài nguyên và prompt nằm ở đâu so với công cụ
- tại sao elicitation trở thành loại tương tác đặc biệt
- OAuth hoặc luồng auth khác nên đặt ở đâu về mặt khái niệm

Không có bản đồ lớp khả năng, MCP bắt đầu cảm thấy rời rạc.

## Thuật Ngữ Trước

### Lớp khả năng nghĩa là gì

Lớp khả năng đơn giản là:

> một lát trách nhiệm trong hệ thống lớn hơn

Điểm là tránh trộn mọi mối quan tâm MCP vào một túi.

### Transport nghĩa là gì

Transport là kênh kết nối giữa agent và server MCP:

- stdio (đầu vào/đầu ra chuẩn, tốt cho tiến trình cục bộ)
- HTTP
- SSE (Server-Sent Events, giao thức streaming một chiều qua HTTP)
- WebSocket

### Elicitation nghĩa là gì

Đây là một trong những thuật ngữ ít quen thuộc hơn.

Định nghĩa giảng dạy đơn giản:

> tương tác mà server MCP hỏi người dùng thêm đầu vào trước khi nó có thể tiếp tục

Nên hệ thống không còn chỉ:

> agent gọi công cụ -> công cụ trả kết quả

Server cũng có thể nói:

> Tôi cần thêm thông tin trước khi có thể hoàn thành

Điều này biến gọi-và-trả đơn giản thành cuộc hội thoại nhiều bước giữa agent và server.

## Mô Hình Tinh Thần Tối Thiểu

Hình ảnh sáu lớp rõ ràng:

```text
1. Lớp Cấu Hình
   cấu hình server trông như thế nào

2. Lớp Transport
   kết nối server được mang như thế nào

3. Lớp Trạng Thái Kết Nối
   connected / pending / failed / needs-auth

4. Lớp Khả Năng
   tools / resources / prompts / elicitation

5. Lớp Auth
   liệu xác thực cần thiết và trạng thái của nó

6. Lớp Tích Hợp Router
   cách MCP định tuyến ngược vào định tuyến công cụ, quyền hạn, và thông báo
```

Bài học then chốt:

**công cụ là một lớp, không phải toàn bộ câu chuyện MCP**

## Tại Sao Dòng Chính Vẫn Nên Giữ Công-Cụ-Trước

Điều này rất quan trọng cho giảng dạy.

Mặc dù MCP chứa nhiều lớp, dòng chính chương vẫn nên dạy:

### Bước 1: công cụ bên ngoài trước

Vì điều đó kết nối tự nhiên nhất với mọi thứ bạn đã học:

- công cụ cục bộ
- công cụ bên ngoài
- một router chung

### Bước 2: cho thấy nhiều lớp khả năng hơn tồn tại

Ví dụ:

- tài nguyên
- prompt
- elicitation
- auth

### Bước 3: quyết định lớp nâng cao nào repo nên thực sự triển khai

Điều đó khớp mục tiêu giảng dạy:

**xây dựng hệ thống tương tự trước, sau đó thêm lớp nền tảng nặng hơn**

## Bản Ghi Cốt Lõi

### 1. `ScopedMcpServerConfig`

Ngay cả phiên bản giảng dạy tối thiểu cũng nên hiển thị ý tưởng này:

```python
config = {
    "name": "postgres",
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "..."],
    "scope": "project",
}
```

`scope` quan trọng vì cấu hình server có thể đến từ nơi khác nhau (cài đặt người dùng toàn cục, cài đặt cấp dự án, hoặc thậm chí ghi đè theo workspace).

### 2. Trạng thái kết nối MCP

```python
server_state = {
    "name": "postgres",
    "status": "connected",   # pending / failed / needs-auth / disabled
    "config": {...},
}
```

### 3. `MCPToolSpec`

```python
tool = {
    "name": "mcp__postgres__query",
    "description": "...",
    "input_schema": {...},
}
```

### 4. `ElicitationRequest`

```python
request = {
    "server_name": "some-server",
    "message": "Please provide additional input",
    "requested_schema": {...},
}
```

Điểm giảng dạy không phải bạn cần triển khai elicitation ngay lập tức.

Điểm là:

**MCP không đảm bảo giữ mãi là gọi công cụ một chiều**

## Hình Ảnh Nền Tảng Sạch Hơn

```text
MCP Config
  |
  v
Transport
  |
  v
Trạng Thái Kết Nối
  |
  +-- connected
  +-- pending
  +-- needs-auth
  +-- failed
  |
  v
Khả Năng
  +-- tools
  +-- resources
  +-- prompts
  +-- elicitation
  |
  v
Tích Hợp Router / Quyền Hạn / Thông Báo
```

## Tại Sao Auth Không Nên Thống Trị Dòng Chính Chương

Auth là lớp thực trong nền tảng đầy đủ.

Nhưng nếu dòng chính rơi vào OAuth hoặc chi tiết luồng auth dành riêng cho nhà cung cấp quá sớm, người mới bắt đầu mất hình dạng hệ thống thực sự.

Thứ tự giảng dạy tốt hơn:

- trước tiên giải thích rằng lớp auth tồn tại
- sau đó giải thích rằng `connected` và `needs-auth` là trạng thái kết nối khác nhau
- chỉ sau đó, trong công việc nền tảng nâng cao, mở rộng máy trạng thái auth đầy đủ

Điều đó giữ repo trung thực mà không làm trệch đường học tập.

## Điều Này Liên Quan Đến `s19` và `s02a` Thế Nào

- chương `s19` tiếp tục dạy đường dẫn khả năng bên ngoài công-cụ-trước
- ghi chú này cung cấp bản đồ nền tảng rộng hơn
- `s02a` giải thích cách khả năng MCP cuối cùng kết nối lại tool control plane thống nhất

Cùng nhau, chúng dạy ý tưởng thực sự:

**MCP là nền tảng khả năng bên ngoài, và công cụ chỉ là mặt đầu tiên của nó vào dòng chính**

## Sai Lầm Phổ Biến Người Mới Bắt Đầu

### 1. Coi MCP chỉ là danh mục công cụ bên ngoài

Điều đó làm tài nguyên, prompt, auth, và elicitation cảm thấy bất ngờ sau này.

### 2. Đi sâu vào chi tiết transport hoặc OAuth quá sớm

Điều đó phá vỡ dòng chính giảng dạy.

### 3. Để công cụ MCP bỏ qua kiểm tra quyền hạn

Điều đó mở cửa phụ nguy hiểm trong ranh giới hệ thống.

### 4. Trộn cấu hình server, trạng thái kết nối, và khả năng được hiển thị vào một blob

Các lớp đó nên giữ tách biệt về mặt khái niệm.

## Bài Học Chính

**MCP là nền tảng khả năng sáu lớp. Công cụ là lớp đầu tiên bạn xây dựng, nhưng tài nguyên, prompt, elicitation, auth, và tích hợp router đều là phần của bức tranh đầy đủ.**
