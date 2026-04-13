# s02: Sử Dụng Công Cụ (Tool Use)

`s01 > [ s02 ] > s03 > s04 > s05 > s06 > s07 > s08 > s09 > s10 > s11 > s12 > s13 > s14 > s15 > s16 > s17 > s18 > s19`

## Bạn Sẽ Học Được

- Cách xây dựng một dispatch map (bảng định tuyến ánh xạ tên công cụ đến các hàm handler)
- Cách path sandboxing ngăn model thoát khỏi workspace của nó
- Cách thêm công cụ mới mà không cần chạm vào vòng lặp agent

Nếu bạn chạy agent s01 trong hơn vài phút, bạn có thể nhận thấy các vết nứt. `cat` âm thầm cắt ngắn các tệp dài. `sed` bị nghẹt bởi các ký tự đặc biệt. Mọi lệnh bash đều là một cánh cửa mở -- không có gì ngăn model chạy `rm -rf /` hoặc đọc SSH keys của bạn. Bạn cần các công cụ chuyên dụng với hàng rào bảo vệ, và bạn cần một cách sạch sẽ để thêm chúng.

## Vấn Đề

Với chỉ `bash`, agent gọi shell cho mọi thứ. Không có cách nào giới hạn những gì nó đọc, nơi nào nó ghi, hoặc bao nhiêu đầu ra nó trả về. Một lệnh xấu có thể làm hỏng tệp, rò rỉ bí mật, hoặc vượt ngân sách token của bạn với một stdout dump khổng lồ. Những gì bạn thực sự muốn là một tập hợp nhỏ các công cụ chuyên dụng -- `read_file`, `write_file`, `edit_file` -- mỗi cái có kiểm tra an toàn riêng. Câu hỏi là: làm thế nào để kết nối chúng mà không cần viết lại vòng lặp mỗi lần?

## Giải Pháp

Câu trả lời là một dispatch map -- một từ điển định tuyến tên công cụ đến các hàm handler. Thêm một công cụ có nghĩa là thêm một mục. Bản thân vòng lặp không bao giờ thay đổi.

```
+--------+      +-------+      +------------------+
|  User  | ---> |  LLM  | ---> | Tool Dispatch    |
| prompt |      |       |      | {                |
+--------+      +---+---+      |   bash: run_bash |
                    ^           |   read: run_read |
                    |           |   write: run_wr  |
                    +-----------+   edit: run_edit |
                    tool_result | }                |
                                +------------------+

Dispatch map là một dict: {tool_name: handler_function}.
Một lần tra cứu thay thế bất kỳ chuỗi if/elif nào.
```

## Cách Hoạt Động

**Bước 1.** Mỗi công cụ nhận một hàm handler. Path sandboxing ngăn model thoát khỏi workspace -- mọi đường dẫn được yêu cầu được giải quyết và kiểm tra so với thư mục làm việc trước khi bất kỳ I/O nào xảy ra.

```python
def safe_path(p: str) -> Path:
    path = (WORKDIR / p).resolve()
    if not path.is_relative_to(WORKDIR):
        raise ValueError(f"Path escapes workspace: {p}")
    return path

def run_read(path: str, limit: int = None) -> str:
    text = safe_path(path).read_text()
    lines = text.splitlines()
    if limit and limit < len(lines):
        lines = lines[:limit]
    return "\n".join(lines)[:50000]  # giới hạn cứng để tránh thổi bay ngữ cảnh
```

**Bước 2.** Dispatch map liên kết tên công cụ với các handler. Đây là toàn bộ lớp định tuyến -- không có chuỗi if/elif, không có phân cấp lớp, chỉ là một từ điển.

```python
TOOL_HANDLERS = {
    "bash":       lambda **kw: run_bash(kw["command"]),
    "read_file":  lambda **kw: run_read(kw["path"], kw.get("limit")),
    "write_file": lambda **kw: run_write(kw["path"], kw["content"]),
    "edit_file":  lambda **kw: run_edit(kw["path"], kw["old_text"],
                                        kw["new_text"]),
}
```

**Bước 3.** Trong vòng lặp, tra cứu handler theo tên. Thân vòng lặp không thay đổi so với s01 -- chỉ dòng dispatch là mới.

```python
for block in response.content:
    if block.type == "tool_use":
        handler = TOOL_HANDLERS.get(block.name)
        output = handler(**block.input) if handler \
            else f"Unknown tool: {block.name}"
        results.append({
            "type": "tool_result",
            "tool_use_id": block.id,
            "content": output,
        })
```

Thêm một công cụ = thêm một handler + thêm một mục schema. Vòng lặp không bao giờ thay đổi.

## Những Gì Đã Thay Đổi Từ s01

| Thành phần     | Trước (s01)        | Sau (s02)                  |
|----------------|--------------------|----------------------------|
| Tools          | 1 (bash only)      | 4 (bash, read, write, edit)|
| Dispatch       | Gọi bash cứng      | Dict `TOOL_HANDLERS`       |
| Path safety    | Không có           | Sandbox `safe_path()`      |
| Agent loop     | Không thay đổi     | Không thay đổi             |

## Thử Ngay

```sh
cd learn-claude-code
python agents/s02_tool_use.py
```

1. `Read the file requirements.txt`
2. `Create a file called greet.py with a greet(name) function`
3. `Edit greet.py to add a docstring to the function`
4. `Read greet.py to verify the edit worked`

## Những Gì Bạn Đã Thành Thạo

Tại điểm này, bạn có thể:

- Kết nối bất kỳ công cụ mới nào vào agent bằng cách thêm một handler và một mục schema -- mà không cần chạm vào vòng lặp.
- Thực thi path sandboxing để model không thể đọc hoặc ghi bên ngoài workspace của nó.
- Giải thích tại sao một dispatch map mở rộng tốt hơn một chuỗi if/elif.

Giữ ranh giới sạch sẽ: một tool schema là đủ bây giờ. Bạn không cần các lớp chính sách, UI phê duyệt hoặc hệ sinh thái plugin chưa. Nếu bạn có thể thêm một công cụ mới mà không cần viết lại vòng lặp, bạn đã nắm được pattern cốt lõi.

## Tiếp Theo Là Gì

Agent của bạn bây giờ có thể đọc, ghi và chỉnh sửa tệp một cách an toàn. Nhưng điều gì xảy ra khi bạn yêu cầu nó thực hiện một tái cấu trúc 10 bước? Nó hoàn thành bước 1 đến 3 và sau đó bắt đầu ngẫu hứng vì nó đã quên phần còn lại. Trong s03, bạn sẽ cho agent một kế hoạch phiên -- một danh sách todo có cấu trúc giúp nó theo dõi qua các tác vụ phức tạp, đa bước.

## Bài Học Chính

> Vòng lặp không nên quan tâm đến cách một công cụ hoạt động nội bộ. Nó chỉ cần một tuyến đường đáng tin cậy từ tên công cụ đến handler.
