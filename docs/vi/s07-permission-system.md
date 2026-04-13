# s07: Hệ Thống Quyền Hạn (Permission System)

`s01 > s02 > s03 > s04 > s05 > s06 > [ s07 ] > s08 > s09 > s10 > s11 > s12 > s13 > s14 > s15 > s16 > s17 > s18 > s19`

## Bạn Sẽ Học Được

- Pipeline quyền hạn bốn giai đoạn mà mọi lần gọi công cụ phải vượt qua trước khi thực thi
- Ba chế độ quyền hạn kiểm soát mức độ tích cực mà agent tự động phê duyệt hành động
- Cách các quy tắc từ chối và cho phép sử dụng khớp pattern để tạo chính sách first-match-wins
- Phê duyệt tương tác với tùy chọn "always" ghi các quy tắc cho phép vĩnh viễn tại runtime

Agent của bạn từ s06 có năng lực và tồn tại lâu dài. Nó đọc tệp, viết code, chạy lệnh shell, ủy thác subtask và nén ngữ cảnh của chính nó để tiếp tục. Nhưng không có cơ chế bắt an toàn. Mọi lần gọi công cụ mà model đề xuất đều đi thẳng đến thực thi. Yêu cầu nó xóa một thư mục và nó sẽ làm -- không hỏi gì. Trước khi bạn cho agent này quyền truy cập vào bất cứ thứ gì quan trọng, bạn cần một cổng giữa "model muốn làm X" và "hệ thống thực sự làm X."

## Vấn Đề

Hãy tưởng tượng agent của bạn đang giúp tái cấu trúc một codebase. Nó đọc vài tệp, đề xuất một số chỉnh sửa, và sau đó quyết định chạy `rm -rf /tmp/old_build` để dọn dẹp. Ngoại trừ model đã ảo giác đường dẫn -- thư mục thực sự là thư mục home của bạn. Hoặc nó quyết định `sudo` thứ gì đó vì model đã thấy pattern đó trong dữ liệu training. Không có lớp quyền hạn, ý định trở thành thực thi ngay lập tức. Không có khoảnh khắc nào để hệ thống nói "chờ đã, điều đó trông nguy hiểm" hoặc để bạn nói "không, đừng làm điều đó." Agent cần một checkpoint -- một pipeline (chuỗi các giai đoạn mà mọi yêu cầu đi qua) giữa những gì model yêu cầu và những gì thực sự xảy ra.

## Giải Pháp

Mọi lần gọi công cụ bây giờ đi qua pipeline quyền hạn bốn giai đoạn trước khi thực thi. Các giai đoạn chạy theo thứ tự, và giai đoạn đầu tiên tạo ra câu trả lời dứt khoát sẽ thắng.

```
tool_call từ LLM
     |
     v
[1. Quy tắc từ chối]   -- blocklist: luôn chặn các pattern này
     |
     v
[2. Kiểm tra chế độ]   -- chế độ plan? chế độ auto? mặc định?
     |
     v
[3. Quy tắc cho phép]  -- allowlist: luôn cho phép các pattern này
     |
     v
[4. Hỏi người dùng]    -- prompt tương tác y/n/always
     |
     v
thực thi (hoặc từ chối)
```

## Đọc Cùng Nhau

- Nếu bạn bắt đầu mờ nhạt "model đề xuất một hành động" với "hệ thống thực sự thực thi một hành động," bạn có thể thấy hữu ích khi xem lại [`s00a-query-control-plane.md`](./s00a-query-control-plane.md).
- Nếu bạn chưa rõ tại sao các yêu cầu công cụ không nên rơi thẳng vào các handler, giữ [`s02a-tool-control-plane.md`](./s02a-tool-control-plane.md) mở bên cạnh chương này có thể giúp ích.
- Nếu `PermissionRule`, `PermissionDecision` và `tool_result` bắt đầu sụp đổ thành một ý tưởng mơ hồ, [`data-structures.md`](./data-structures.md) có thể đặt lại chúng.

## Cách Hoạt Động

**Bước 1.** Xác định ba chế độ quyền hạn. Mỗi chế độ thay đổi cách pipeline xử lý các lần gọi công cụ không khớp với bất kỳ quy tắc rõ ràng nào. Chế độ "default" là an toàn nhất -- nó hỏi bạn về mọi thứ. Chế độ "plan" chặn tất cả các lần ghi hoàn toàn, hữu ích khi bạn muốn agent khám phá mà không chạm vào bất cứ thứ gì. Chế độ "auto" cho phép các lần đọc qua âm thầm và chỉ hỏi về các lần ghi, tốt cho khám phá nhanh.

| Chế độ | Hành vi | Trường hợp sử dụng |
|--------|---------|-------------------|
| `default` | Hỏi người dùng cho mọi lần gọi công cụ không khớp | Sử dụng tương tác bình thường |
| `plan` | Chặn tất cả ghi, cho phép đọc | Chế độ lập kế hoạch/xem xét |
| `auto` | Tự động cho phép đọc, hỏi về ghi | Chế độ khám phá nhanh |

**Bước 2.** Thiết lập các quy tắc từ chối và cho phép với khớp pattern. Các quy tắc được kiểm tra theo thứ tự -- first match wins. Các quy tắc từ chối bắt các pattern nguy hiểm không bao giờ nên thực thi, bất kể chế độ nào. Các quy tắc cho phép cho các hoạt động an toàn đã biết qua mà không cần hỏi.

```python
rules = [
    # Luôn từ chối các pattern nguy hiểm
    {"tool": "bash", "content": "rm -rf /", "behavior": "deny"},
    {"tool": "bash", "content": "sudo *",   "behavior": "deny"},
    # Cho phép đọc bất cứ thứ gì
    {"tool": "read_file", "path": "*", "behavior": "allow"},
]
```

Khi người dùng trả lời "always" tại prompt tương tác, một quy tắc cho phép vĩnh viễn được thêm vào tại runtime.

**Bước 3.** Triển khai kiểm tra bốn giai đoạn. Đây là cốt lõi của hệ thống quyền hạn. Lưu ý rằng các quy tắc từ chối chạy đầu tiên và không thể bị vượt qua -- điều này là cố ý. Bất kể bạn đang ở chế độ nào hay quy tắc cho phép nào tồn tại, một quy tắc từ chối luôn thắng.

```python
def check(self, tool_name, tool_input):
    # Bước 1: Quy tắc từ chối (miễn dịch bypass, luôn kiểm tra trước)
    for rule in self.rules:
        if rule["behavior"] == "deny" and self._matches(rule, ...):
            return {"behavior": "deny", "reason": "..."}

    # Bước 2: Quyết định dựa trên chế độ
    if self.mode == "plan" and tool_name in WRITE_TOOLS:
        return {"behavior": "deny", "reason": "Plan mode: writes blocked"}
    if self.mode == "auto" and tool_name in READ_ONLY_TOOLS:
        return {"behavior": "allow", "reason": "Auto: read-only approved"}

    # Bước 3: Quy tắc cho phép
    for rule in self.rules:
        if rule["behavior"] == "allow" and self._matches(rule, ...):
            return {"behavior": "allow", "reason": "..."}

    # Bước 4: Rơi qua để hỏi người dùng
    return {"behavior": "ask", "reason": "..."}
```

**Bước 4.** Tích hợp kiểm tra quyền hạn vào vòng lặp agent. Mọi lần gọi công cụ bây giờ đi qua pipeline trước khi thực thi. Kết quả là một trong ba kết quả: bị từ chối (có lý do), được cho phép (âm thầm), hoặc được hỏi (tương tác).

```python
for block in response.content:
    if block.type == "tool_use":
        decision = perms.check(block.name, block.input)

        if decision["behavior"] == "deny":
            output = f"Permission denied: {decision['reason']}"
        elif decision["behavior"] == "ask":
            if perms.ask_user(block.name, block.input):
                output = handler(**block.input)
            else:
                output = "Permission denied by user"
        else:  # allow
            output = handler(**block.input)

        results.append({"type": "tool_result", ...})
```

**Bước 5.** Thêm theo dõi từ chối như một circuit breaker đơn giản. `PermissionManager` theo dõi các lần từ chối liên tiếp. Sau 3 lần liên tiếp, nó gợi ý chuyển sang chế độ plan -- điều này ngăn agent liên tục chạm vào cùng một bức tường và lãng phí các lượt.

## Những Gì Đã Thay Đổi Từ s06

| Thành phần | Trước (s06) | Sau (s07) |
|---|---|---|
| An toàn | Không có | Pipeline quyền hạn 4 giai đoạn |
| Chế độ | Không có | 3 chế độ: default, plan, auto |
| Quy tắc | Không có | Quy tắc từ chối/cho phép với khớp pattern |
| Kiểm soát người dùng | Không có | Phê duyệt tương tác với tùy chọn "always" |
| Theo dõi từ chối | Không có | Circuit breaker sau 3 lần từ chối liên tiếp |

## Thử Ngay

```sh
cd learn-claude-code
python agents/s07_permission_system.py
```

1. Bắt đầu ở chế độ `default` -- mọi công cụ ghi đều yêu cầu phê duyệt
2. Thử chế độ `plan` -- tất cả các lần ghi bị chặn, đọc đi qua
3. Thử chế độ `auto` -- đọc được tự động phê duyệt, ghi vẫn hỏi
4. Trả lời "always" để vĩnh viễn cho phép một công cụ
5. Gõ `/mode plan` để chuyển đổi chế độ tại runtime
6. Gõ `/rules` để kiểm tra bộ quy tắc hiện tại

## Những Gì Bạn Đã Thành Thạo

Tại điểm này, bạn có thể:

- Giải thích tại sao ý định model phải đi qua pipeline quyết định trước khi trở thành thực thi
- Xây dựng kiểm tra quyền hạn bốn giai đoạn: từ chối, chế độ, cho phép, hỏi
- Cấu hình ba chế độ quyền hạn cho bạn các đánh đổi an toàn/tốc độ khác nhau
- Thêm quy tắc động tại runtime khi người dùng trả lời "always"
- Triển khai circuit breaker đơn giản bắt các vòng lặp từ chối lặp đi lặp lại

## Tiếp Theo Là Gì

Hệ thống quyền hạn của bạn kiểm soát những gì agent được phép làm, nhưng nó sống hoàn toàn bên trong code riêng của agent. Điều gì sẽ xảy ra nếu bạn muốn mở rộng hành vi -- thêm ghi nhật ký, kiểm toán hoặc xác thực tùy chỉnh -- mà không cần sửa đổi vòng lặp agent chút nào? Đó là những gì s08 giới thiệu: một hệ thống hook cho phép các shell script bên ngoài quan sát và ảnh hưởng đến mọi lần gọi công cụ.

## Bài Học Chính

> An toàn là một pipeline, không phải boolean -- từ chối trước, sau đó xem xét chế độ, sau đó kiểm tra quy tắc cho phép, sau đó hỏi người dùng.
