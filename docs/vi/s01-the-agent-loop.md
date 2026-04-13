# s01: Vòng Lặp Agent

`[ s01 ] > s02 > s03 > s04 > s05 > s06 > s07 > s08 > s09 > s10 > s11 > s12 > s13 > s14 > s15 > s16 > s17 > s18 > s19`

## Bạn Sẽ Học Được

- Vòng lặp agent cốt lõi hoạt động như thế nào: gửi tin nhắn, chạy công cụ, đưa kết quả trở lại
- Tại sao bước "ghi trở lại" là ý tưởng quan trọng nhất trong thiết kế agent
- Cách xây dựng một agent hoạt động trong dưới 30 dòng Python

Tưởng tượng bạn có một trợ lý xuất sắc có thể lý luận về code, lập kế hoạch giải pháp và viết những câu trả lời tuyệt vời -- nhưng không thể chạm vào bất cứ thứ gì. Mỗi lần nó gợi ý chạy một lệnh, bạn phải sao chép nó, tự chạy, dán đầu ra trở lại và chờ gợi ý tiếp theo. Bạn là vòng lặp. Chương này loại bỏ bạn khỏi vòng lặp đó.

## Vấn Đề

Không có vòng lặp, mọi lệnh gọi công cụ đều cần một người ở giữa. Model nói "chạy test này." Bạn chạy nó. Bạn dán đầu ra. Model nói "bây giờ sửa dòng 12." Bạn sửa nó. Bạn cho model biết điều gì đã xảy ra. Việc qua lại thủ công này có thể hoạt động cho một câu hỏi đơn, nhưng hoàn toàn sụp đổ khi một tác vụ yêu cầu 10, 20 hoặc 50 lần gọi công cụ liên tiếp.

Giải pháp rất đơn giản: để code thực hiện vòng lặp.

## Giải Pháp

Đây là toàn bộ hệ thống trong một bức tranh:

```
+--------+      +-------+      +---------+
|  User  | ---> |  LLM  | ---> |  Tool   |
| prompt |      |       |      | execute |
+--------+      +---+---+      +----+----+
                    ^                |
                    |   tool_result  |
                    +----------------+
                    (lặp cho đến khi model dừng gọi công cụ)
```

Model nói chuyện, harness (code bao quanh model) thực thi công cụ, và kết quả đi thẳng trở lại cuộc hội thoại. Vòng lặp tiếp tục quay cho đến khi model quyết định xong.

## Cách Hoạt Động

**Bước 1.** Prompt của người dùng trở thành tin nhắn đầu tiên.

```python
messages.append({"role": "user", "content": query})
```

**Bước 2.** Gửi cuộc hội thoại đến model, cùng với các định nghĩa công cụ.

```python
response = client.messages.create(
    model=MODEL, system=SYSTEM, messages=messages,
    tools=TOOLS, max_tokens=8000,
)
```

**Bước 3.** Thêm phản hồi của model vào cuộc hội thoại. Sau đó kiểm tra: nó có gọi một công cụ không, hay xong rồi?

```python
messages.append({"role": "assistant", "content": response.content})

# Nếu model không gọi công cụ, tác vụ đã hoàn thành
if response.stop_reason != "tool_use":
    return
```

**Bước 4.** Thực thi từng lệnh gọi công cụ, thu thập kết quả, và đưa chúng trở lại cuộc hội thoại như một tin nhắn mới. Sau đó lặp lại từ Bước 2.

```python
results = []
for block in response.content:
    if block.type == "tool_use":
        output = run_bash(block.input["command"])
        results.append({
            "type": "tool_result",
            "tool_use_id": block.id,  # liên kết kết quả với lệnh gọi công cụ
            "content": output,
        })
# Đây là "ghi trở lại" -- model bây giờ có thể thấy kết quả thế giới thực
messages.append({"role": "user", "content": results})
```

Kết hợp lại, toàn bộ agent vừa trong một hàm:

```python
def agent_loop(query):
    messages = [{"role": "user", "content": query}]
    while True:
        response = client.messages.create(
            model=MODEL, system=SYSTEM, messages=messages,
            tools=TOOLS, max_tokens=8000,
        )
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason != "tool_use":
            return  # model đã xong

        results = []
        for block in response.content:
            if block.type == "tool_use":
                output = run_bash(block.input["command"])
                results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": output,
                })
        messages.append({"role": "user", "content": results})
```

Đó là toàn bộ agent trong dưới 30 dòng. Mọi thứ khác trong khóa học này đều xây dựng trên vòng lặp này -- mà không thay đổi hình dạng cốt lõi của nó.

> **Ghi chú về hệ thống thực tế:** Các agent production thường sử dụng phản hồi streaming, nơi đầu ra của model đến từng token thay vì tất cả một lúc. Điều đó thay đổi trải nghiệm người dùng (bạn thấy text xuất hiện theo thời gian thực), nhưng vòng lặp cơ bản -- gửi, thực thi, ghi trở lại -- vẫn hoàn toàn giống nhau. Chúng ta bỏ qua streaming ở đây để giữ ý tưởng cốt lõi tinh khiết.

## Những Gì Đã Thay Đổi

| Thành phần    | Trước       | Sau                            |
|---------------|-------------|--------------------------------|
| Agent loop    | (không có)  | `while True` + stop_reason     |
| Tools         | (không có)  | `bash` (một công cụ)           |
| Messages      | (không có)  | Danh sách tích lũy             |
| Control flow  | (không có)  | `stop_reason != "tool_use"`    |

## Thử Ngay

```sh
cd learn-claude-code
python agents/s01_agent_loop.py
```

1. `Create a file called hello.py that prints "Hello, World!"`
2. `List all Python files in this directory`
3. `What is the current git branch?`
4. `Create a directory called test_output and write 3 files in it`

## Những Gì Bạn Đã Thành Thạo

Tại điểm này, bạn có thể:

- Xây dựng một vòng lặp agent hoạt động từ đầu
- Giải thích tại sao kết quả công cụ phải chảy trở lại cuộc hội thoại (sự "ghi trở lại")
- Vẽ lại vòng lặp từ bộ nhớ: messages -> model -> thực thi công cụ -> ghi trở lại -> lượt tiếp theo

## Tiếp Theo Là Gì

Ngay bây giờ, agent chỉ có thể chạy các lệnh bash. Điều đó có nghĩa là mọi lần đọc tệp sử dụng `cat`, mọi chỉnh sửa sử dụng `sed`, và không có ranh giới an toàn nào cả. Trong chương tiếp theo, bạn sẽ thêm các công cụ chuyên dụng với hệ thống định tuyến sạch -- và bản thân vòng lặp sẽ không cần thay đổi chút nào.

## Bài Học Chính

> Một agent chỉ là một vòng lặp: gửi tin nhắn đến model, thực thi các công cụ nó yêu cầu, đưa kết quả trở lại, và lặp lại cho đến khi xong.
