# s03: TodoWrite (Ghi Kế Hoạch)

`s01 > s02 > [ s03 ] > s04 > s05 > s06 > s07 > s08 > s09 > s10 > s11 > s12 > s13 > s14 > s15 > s16 > s17 > s18 > s19`

## Bạn Sẽ Học Được

- Lập kế hoạch phiên giữ model theo dõi trong các tác vụ đa bước như thế nào
- Danh sách todo có cấu trúc với theo dõi trạng thái thay thế các kế hoạch văn xuôi tự do dễ vỡ như thế nào
- Các nhắc nhở nhẹ nhàng (nag injection) kéo model trở lại khi nó lạc đường như thế nào

Bạn đã bao giờ yêu cầu một AI thực hiện một tác vụ phức tạp và xem nó mất theo dõi giữa chừng chưa? Bạn nói "tái cấu trúc module này: thêm type hints, docstrings, tests, và main guard" và nó thực hiện tốt hai bước đầu, sau đó lang thang sang thứ gì đó bạn chưa bao giờ yêu cầu. Đây không phải vấn đề trí tuệ model -- đây là vấn đề working memory. Khi kết quả công cụ tích lũy trong cuộc hội thoại, kế hoạch ban đầu mờ dần. Đến bước 4, model đã thực sự quên các bước 5 đến 10. Bạn cần một cách để giữ kế hoạch luôn nhìn thấy được.

## Vấn Đề

Trong các tác vụ đa bước, model bị lạc. Nó lặp lại công việc, bỏ qua các bước, hoặc ngẫu hứng một khi system prompt mờ dần phía sau các trang kết quả công cụ. Cửa sổ ngữ cảnh (tổng lượng văn bản model có thể giữ trong working memory cùng một lúc) là hữu hạn, và các hướng dẫn trước đó bị đẩy xa hơn với mỗi lần gọi công cụ. Một tái cấu trúc 10 bước có thể hoàn thành bước 1-3, sau đó model bắt đầu bịa đặt vì nó đơn giản là không "thấy" các bước 4-10 nữa.

## Giải Pháp

Cho model một công cụ `todo` duy trì một checklist có cấu trúc. Sau đó inject các nhắc nhở nhẹ nhàng khi model đi quá lâu mà không cập nhật kế hoạch.

```
+--------+      +-------+      +---------+
|  User  | ---> |  LLM  | ---> | Tools   |
| prompt |      |       |      | + todo  |
+--------+      +---+---+      +----+----+
                    ^                |
                    |   tool_result  |
                    +----------------+
                          |
              +-----------+-----------+
              | TodoManager state     |
              | [ ] task A            |
              | [>] task B  <- doing  |
              | [x] task C            |
              +-----------------------+
                          |
              if rounds_since_todo >= 3:
                inject <reminder> into tool_result
```

## Cách Hoạt Động

**Bước 1.** TodoManager lưu trữ các items với trạng thái. Ràng buộc "chỉ một `in_progress` tại một thời điểm" buộc model phải hoàn thành những gì đã bắt đầu trước khi chuyển sang.

```python
class TodoManager:
    def update(self, items: list) -> str:
        validated, in_progress_count = [], 0
        for item in items:
            status = item.get("status", "pending")
            if status == "in_progress":
                in_progress_count += 1
            validated.append({"id": item["id"], "text": item["text"],
                              "status": status})
        if in_progress_count > 1:
            raise ValueError("Only one task can be in_progress")
        self.items = validated
        return self.render()  # trả về checklist dưới dạng text đã được định dạng
```

**Bước 2.** Công cụ `todo` vào dispatch map như bất kỳ công cụ nào khác -- không cần kết nối đặc biệt, chỉ thêm một mục vào từ điển bạn xây dựng trong s02.

```python
TOOL_HANDLERS = {
    # ...base tools...
    "todo": lambda **kw: TODO.update(kw["items"]),
}
```

**Bước 3.** Một nhắc nhở nag inject một gợi nhắc nếu model đi 3+ vòng mà không gọi `todo`. Đây là thủ thuật ghi trở lại (đưa kết quả công cụ trở lại cuộc hội thoại) được sử dụng cho một mục đích mới: harness (code bao quanh model) âm thầm chèn một nhắc nhở vào payload kết quả trước khi nó được gắn vào messages.

```python
if rounds_since_todo >= 3:
    results.insert(0, {
        "type": "text",
        "text": "<reminder>Update your todos.</reminder>",
    })
messages.append({"role": "user", "content": results})
```

Ràng buộc "chỉ một in_progress tại một thời điểm" buộc tập trung tuần tự. Nhắc nhở nag tạo ra trách nhiệm. Cùng nhau, chúng giữ model làm việc qua kế hoạch thay vì lạc đường.

## Những Gì Đã Thay Đổi Từ s02

| Thành phần     | Trước (s02)      | Sau (s03)                  |
|----------------|------------------|----------------------------|
| Tools          | 4                | 5 (+todo)                  |
| Planning       | Không có         | TodoManager với trạng thái |
| Nag injection  | Không có         | `<reminder>` sau 3 vòng   |
| Agent loop     | Dispatch đơn giản| + bộ đếm rounds_since_todo |

## Thử Ngay

```sh
cd learn-claude-code
python agents/s03_todo_write.py
```

1. `Refactor the file hello.py: add type hints, docstrings, and a main guard`
2. `Create a Python package with __init__.py, utils.py, and tests/test_utils.py`
3. `Review all Python files and fix any style issues`

Xem model tạo ra một kế hoạch, làm việc qua nó từng bước, và đánh dấu các items khi hoàn thành. Nếu nó quên cập nhật kế hoạch trong vài vòng, bạn sẽ thấy gợi nhắc `<reminder>` xuất hiện trong cuộc hội thoại.

## Những Gì Bạn Đã Thành Thạo

Tại điểm này, bạn có thể:

- Thêm lập kế hoạch phiên vào bất kỳ agent nào bằng cách thả một công cụ `todo` vào dispatch map.
- Thực thi tập trung tuần tự với ràng buộc "chỉ một in_progress tại một thời điểm".
- Sử dụng nag injection để kéo model trở lại đúng hướng khi nó lạc đường.
- Giải thích tại sao trạng thái có cấu trúc đánh bại văn xuôi tự do cho các kế hoạch đa bước.

Hãy nhớ ba ranh giới: `todo` ở đây có nghĩa là "kế hoạch cho cuộc hội thoại hiện tại", không phải cơ sở dữ liệu tác vụ lâu dài. Schema nhỏ `{id, text, status}` là đủ. Một nhắc nhở trực tiếp là đủ -- bạn không cần UI lập kế hoạch phức tạp chưa.

## Tiếp Theo Là Gì

Agent của bạn bây giờ có thể lập kế hoạch công việc và đi theo. Nhưng mọi tệp nó đọc, mọi đầu ra bash nó tạo ra -- tất cả đều ở lại cuộc hội thoại mãi mãi, ăn vào cửa sổ ngữ cảnh. Một cuộc điều tra năm tệp có thể đốt hàng nghìn token (xấp xỉ các từ -- một tệp 1000 dòng sử dụng khoảng 4000 token) mà cuộc hội thoại cha không bao giờ cần nữa. Trong s04, bạn sẽ học cách khởi động các subagent với ngữ cảnh tươi, riêng biệt -- để cha giữ sạch và model luôn sắc nét.

## Bài Học Chính

> Một khi kế hoạch sống trong trạng thái có cấu trúc thay vì văn xuôi tự do, agent lạc đường ít hơn nhiều.
