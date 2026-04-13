# s06: Nén Ngữ Cảnh (Context Compact)

`s01 > s02 > s03 > s04 > s05 > [ s06 ] > s07 > s08 > s09 > s10 > s11 > s12 > s13 > s14 > s15 > s16 > s17 > s18 > s19`

## Bạn Sẽ Học Được

- Tại sao các phiên dài không thể tránh khỏi hết không gian ngữ cảnh, và điều gì xảy ra khi chúng xảy ra
- Chiến lược nén bốn đòn bẩy: đầu ra lưu trữ, micro-compact, auto-compact và compact thủ công
- Cách di chuyển chi tiết ra khỏi bộ nhớ đang hoạt động mà không mất nó
- Cách giữ một phiên hoạt động vô thời hạn bằng cách tóm tắt và tiếp tục

Agent của bạn từ s05 có năng lực. Nó đọc tệp, chạy lệnh, chỉnh sửa code và ủy thác subtask. Nhưng hãy thử điều gì đó tham vọng -- yêu cầu nó tái cấu trúc một module chạm vào 30 tệp. Sau khi đọc tất cả chúng và chạy 20 lệnh shell, bạn sẽ nhận thấy các phản hồi trở nên tệ hơn. Model bắt đầu quên những gì nó đã đọc. Nó lặp lại công việc. Cuối cùng API từ chối yêu cầu của bạn hoàn toàn. Bạn đã đạt giới hạn cửa sổ ngữ cảnh, và không có kế hoạch cho điều đó, agent của bạn bị kẹt.

## Vấn Đề

Mọi lần gọi API đến model bao gồm toàn bộ cuộc hội thoại cho đến nay: mọi tin nhắn người dùng, mọi phản hồi trợ lý, mọi lần gọi công cụ và kết quả của nó. Cửa sổ ngữ cảnh của model (tổng lượng văn bản nó có thể giữ trong working memory cùng một lúc) là hữu hạn. Một `read_file` duy nhất trên tệp nguồn 1000 dòng tốn khoảng 4.000 token (xấp xỉ các đơn vị có kích thước từ -- một tệp 1.000 dòng sử dụng khoảng 4.000 token). Đọc 30 tệp và chạy 20 lệnh bash, và bạn đã đốt qua 100.000+ token. Ngữ cảnh đầy, nhưng công việc chỉ mới hoàn thành một nửa.

Cách sửa ngây thơ -- chỉ cắt ngắn các tin nhắn cũ -- ném bỏ thông tin mà agent có thể cần sau. Một cách tiếp cận thông minh hơn nén có chiến lược: giữ lại các bit quan trọng, di chuyển các chi tiết cồng kềnh đến đĩa, và tóm tắt khi cuộc hội thoại trở nên quá dài. Đó là những gì chương này xây dựng.

## Giải Pháp

Chúng ta sử dụng bốn đòn bẩy, mỗi cái hoạt động ở một giai đoạn khác nhau của pipeline, từ lọc thời gian đầu ra đến tóm tắt cuộc hội thoại đầy đủ.

```
Mỗi lần gọi công cụ:
+------------------+
| Kết quả tool call|
+------------------+
        |
        v
[Đòn bẩy 0: persisted-output]     (tại thời điểm thực thi công cụ)
  Đầu ra lớn (>50KB, bash >30KB) được ghi vào đĩa
  và thay thế bằng marker preview <persisted-output>.
        |
        v
[Đòn bẩy 1: micro_compact]        (âm thầm, mỗi lượt)
  Thay thế tool_result > 3 lượt tuổi
  bằng "[Previous: used {tool_name}]"
  (bảo toàn kết quả read_file làm tài liệu tham chiếu)
        |
        v
[Kiểm tra: tokens > 50000?]
   |               |
   không            có
   |               |
   v               v
tiếp tục    [Đòn bẩy 2: auto_compact]
              Lưu transcript vào .transcripts/
              LLM tóm tắt cuộc hội thoại.
              Thay thế tất cả messages bằng [summary].
                    |
                    v
            [Đòn bẩy 3: compact tool]
              Model gọi compact rõ ràng.
              Cơ chế tóm tắt giống auto_compact.
```

## Cách Hoạt Động

### Bước 1: Đòn Bẩy 0 -- Persisted Output

Tuyến phòng thủ đầu tiên chạy tại thời điểm thực thi công cụ, trước khi một kết quả thậm chí vào cuộc hội thoại. Khi một kết quả công cụ vượt ngưỡng kích thước, chúng ta ghi đầu ra đầy đủ vào đĩa và thay thế nó bằng một preview ngắn. Điều này ngăn một đầu ra lệnh khổng lồ tiêu hao một nửa cửa sổ ngữ cảnh.

```python
PERSIST_OUTPUT_TRIGGER_CHARS_DEFAULT = 50000
PERSIST_OUTPUT_TRIGGER_CHARS_BASH = 30000   # bash sử dụng ngưỡng thấp hơn

def maybe_persist_output(tool_use_id, output, trigger_chars=None):
    if len(output) <= trigger:
        return output                                    # đủ nhỏ -- giữ inline
    stored_path = _persist_tool_result(tool_use_id, output)
    return _build_persisted_marker(stored_path, output)  # hoán đổi bằng preview gọn
    # Trả về: <persisted-output>
    #   Output too large (48.8KB). Full output saved to: .task_outputs/tool-results/abc123.txt
    #   Preview (first 2.0KB):
    #   ... 2000 ký tự đầu ...
    # </persisted-output>
```

Model có thể sau đó `read_file` đường dẫn được lưu trữ để truy cập nội dung đầy đủ nếu cần. Không có gì bị mất -- chi tiết chỉ sống trên đĩa thay vì trong cuộc hội thoại.

### Bước 2: Đòn Bẩy 1 -- Micro-Compact

Trước mỗi lần gọi LLM, chúng ta quét các kết quả công cụ cũ và thay thế chúng bằng placeholder một dòng. Điều này vô hình với người dùng và chạy mỗi lượt. Sự tinh tế chính: chúng ta bảo toàn kết quả `read_file` vì chúng phục vụ làm tài liệu tham chiếu mà model thường cần nhìn lại.

```python
PRESERVE_RESULT_TOOLS = {"read_file"}

def micro_compact(messages: list) -> list:
    tool_results = [...]  # thu thập tất cả mục tool_result
    if len(tool_results) <= KEEP_RECENT:
        return messages                                  # không đủ kết quả để nén chưa
    for part in tool_results[:-KEEP_RECENT]:
        if tool_name in PRESERVE_RESULT_TOOLS:
            continue   # giữ tài liệu tham chiếu
        part["content"] = f"[Previous: used {tool_name}]"  # thay thế bằng placeholder ngắn
    return messages
```

### Bước 3: Đòn Bẩy 2 -- Auto-Compact

Khi micro-compaction không đủ và số token vượt ngưỡng, harness thực hiện một bước lớn hơn: nó lưu transcript đầy đủ vào đĩa để phục hồi, yêu cầu LLM tóm tắt toàn bộ cuộc hội thoại, và sau đó thay thế tất cả messages bằng bản tóm tắt đó. Agent tiếp tục từ bản tóm tắt như thể không có gì xảy ra.

```python
def auto_compact(messages: list) -> list:
    # Lưu transcript để phục hồi
    transcript_path = TRANSCRIPT_DIR / f"transcript_{int(time.time())}.jsonl"
    with open(transcript_path, "w") as f:
        for msg in messages:
            f.write(json.dumps(msg, default=str) + "\n")
    # LLM tóm tắt
    response = client.messages.create(
        model=MODEL,
        messages=[{"role": "user", "content":
            "Summarize this conversation for continuity..."
            + json.dumps(messages, default=str)[:80000]}],  # giới hạn ở 80K ký tự cho lần gọi tóm tắt
        max_tokens=2000,
    )
    return [
        {"role": "user", "content": f"[Compressed]\n\n{response.content[0].text}"},
    ]
```

### Bước 4: Đòn Bẩy 3 -- Manual Compact

Công cụ `compact` cho phép model tự kích hoạt tóm tắt theo yêu cầu. Nó sử dụng chính xác cùng cơ chế như auto-compact. Sự khác biệt là ai quyết định: auto-compact kích hoạt trên ngưỡng, manual compact kích hoạt khi agent đánh giá đây là thời điểm thích hợp để nén.

### Bước 5: Tích Hợp trong Agent Loop

Tất cả bốn đòn bẩy kết hợp tự nhiên bên trong vòng lặp chính:

```python
def agent_loop(messages: list):
    while True:
        micro_compact(messages)                        # Đòn bẩy 1
        if estimate_tokens(messages) > THRESHOLD:
            messages[:] = auto_compact(messages)       # Đòn bẩy 2
        response = client.messages.create(...)
        # ... thực thi công cụ với persisted-output ... # Đòn bẩy 0
        if manual_compact:
            messages[:] = auto_compact(messages)       # Đòn bẩy 3
```

Các transcript bảo toàn lịch sử đầy đủ trên đĩa. Các đầu ra lớn được lưu vào `.task_outputs/tool-results/`. Không có gì thực sự bị mất -- chỉ di chuyển ra khỏi ngữ cảnh đang hoạt động.

## Những Gì Đã Thay Đổi Từ s05

| Thành phần        | Trước (s05)      | Sau (s06)                      |
|-------------------|------------------|--------------------------------|
| Tools             | 5                | 5 (base + compact)             |
| Context mgmt      | Không có         | Nén bốn đòn bẩy               |
| Persisted-output  | Không có         | Đầu ra lớn -> disk + preview   |
| Micro-compact     | Không có         | Kết quả cũ -> placeholder      |
| Auto-compact      | Không có         | Trigger ngưỡng token           |
| Transcripts       | Không có         | Lưu vào .transcripts/          |

## Thử Ngay

```sh
cd learn-claude-code
python agents/s06_context_compact.py
```

1. `Read every Python file in the agents/ directory one by one` (xem micro-compact thay thế kết quả cũ)
2. `Keep reading files until compression triggers automatically`
3. `Use the compact tool to manually compress the conversation`

## Những Gì Bạn Đã Thành Thạo

Tại điểm này, bạn có thể:

- Giải thích tại sao một phiên agent dài bị suy giảm và cuối cùng thất bại mà không có nén
- Chặn các đầu ra công cụ quá lớn trước khi chúng vào cửa sổ ngữ cảnh
- Âm thầm thay thế kết quả công cụ cũ bằng placeholder nhẹ mỗi lượt
- Kích hoạt tóm tắt cuộc hội thoại đầy đủ -- tự động theo ngưỡng hoặc thủ công qua lần gọi công cụ
- Bảo toàn transcript đầy đủ trên đĩa để không có gì bị mất vĩnh viễn

## Giai Đoạn 1 Hoàn Thành

Bây giờ bạn có một hệ thống agent đơn hoàn chỉnh. Bắt đầu từ một lần gọi API trần trong s01, bạn đã xây dựng lên sử dụng công cụ, lập kế hoạch có cấu trúc, ủy thác sub-agent, tải skill động và nén ngữ cảnh. Agent của bạn có thể đọc, ghi, thực thi, lập kế hoạch, ủy thác và làm việc vô thời hạn mà không hết bộ nhớ. Đó là một agent code thực sự.

Trước khi tiếp tục, hãy cân nhắc quay lại s01 và tự xây dựng lại toàn bộ stack từ đầu mà không nhìn vào code. Nếu bạn có thể viết tất cả sáu lớp từ bộ nhớ, bạn thực sự sở hữu các ý tưởng -- không chỉ là triển khai.

Giai đoạn 2 bắt đầu với s07 và củng cố nền tảng này. Bạn sẽ thêm kiểm soát quyền hạn, hệ thống hook, bộ nhớ liên tục, phục hồi lỗi và nhiều hơn nữa. Agent đơn bạn xây dựng ở đây trở thành kernel mà mọi thứ khác bao bọc xung quanh.

## Bài Học Chính

> Nén không phải là xóa lịch sử -- mà là tái vị trí chi tiết để agent có thể tiếp tục làm việc.
