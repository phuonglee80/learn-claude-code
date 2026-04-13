# s05: Kỹ Năng (Skills)

`s01 > s02 > s03 > s04 > [ s05 ] > s06 > s07 > s08 > s09 > s10 > s11 > s12 > s13 > s14 > s15 > s16 > s17 > s18 > s19`

## Bạn Sẽ Học Được
- Tại sao nhồi tất cả kiến thức tên miền vào system prompt lãng phí token
- Pattern tải hai lớp: tên rẻ lên trước, thân đắt khi cần
- Cách frontmatter (metadata YAML ở đầu tệp) cho mỗi skill một tên và mô tả
- Cách model tự quyết định nên tải skill nào và khi nào

Bạn không ghi nhớ mọi công thức trong mọi cuốn sách nấu ăn bạn có. Bạn biết giá sách nào mỗi cuốn sách nằm, và bạn chỉ lấy một cuốn xuống khi bạn thực sự nấu món đó. Kiến thức tên miền của agent hoạt động theo cách tương tự. Bạn có thể có các tệp chuyên môn về quy trình git, pattern testing, checklist code review, xử lý PDF -- hàng chục chủ đề. Tải tất cả chúng vào system prompt trong mọi yêu cầu giống như đọc mọi cuốn sách nấu ăn từ đầu đến cuối trước khi đập một quả trứng. Hầu hết kiến thức đó không liên quan đến bất kỳ tác vụ nào.

## Vấn Đề

Bạn muốn agent của mình theo dõi các quy trình làm việc đặc thù tên miền: quy ước git, các phương pháp tốt nhất về testing, checklist code review. Cách tiếp cận ngây thơ là đặt mọi thứ vào system prompt. Nhưng 10 skill mỗi cái 2.000 token có nghĩa là 20.000 token hướng dẫn trong mỗi lần gọi API -- hầu hết không liên quan đến câu hỏi hiện tại. Bạn trả cho những token đó mỗi lượt, và tệ hơn, tất cả văn bản không liên quan đó cạnh tranh sự chú ý của model với nội dung thực sự quan trọng.

## Giải Pháp

Chia kiến thức thành hai lớp. Lớp 1 sống trong system prompt và rẻ: chỉ là tên skill và mô tả một dòng (~100 token mỗi skill). Lớp 2 là thân skill đầy đủ, được tải theo yêu cầu thông qua lần gọi công cụ chỉ khi model quyết định nó cần kiến thức đó.

```
System prompt (Lớp 1 -- luôn hiện diện):
+--------------------------------------+
| You are a coding agent.              |
| Skills available:                    |
|   - git: Git workflow helpers        |  ~100 tokens/skill
|   - test: Testing best practices     |
+--------------------------------------+

Khi model gọi load_skill("git"):
+--------------------------------------+
| tool_result (Lớp 2 -- theo yêu cầu):|
| <skill name="git">                   |
|   Full git workflow instructions...  |  ~2000 tokens
|   Bước 1: ...                        |
| </skill>                             |
+--------------------------------------+
```

## Cách Hoạt Động

**Bước 1.** Mỗi skill là một thư mục chứa tệp `SKILL.md`. Tệp bắt đầu bằng YAML frontmatter (block metadata được giới hạn bởi các dòng `---`) khai báo tên và mô tả của skill, theo sau là thân hướng dẫn đầy đủ.

```
skills/
  pdf/
    SKILL.md       # ---\n name: pdf\n description: Process PDF files\n ---\n ...
  code-review/
    SKILL.md       # ---\n name: code-review\n description: Review code\n ---\n ...
```

**Bước 2.** `SkillLoader` quét tất cả các tệp `SKILL.md` khi khởi động. Nó phân tích frontmatter để trích xuất tên và mô tả, và lưu trữ thân đầy đủ để truy xuất sau.

```python
class SkillLoader:
    def __init__(self, skills_dir: Path):
        self.skills = {}
        for f in sorted(skills_dir.rglob("SKILL.md")):
            text = f.read_text()
            meta, body = self._parse_frontmatter(text)
            # Sử dụng tên frontmatter, hoặc dùng tên thư mục làm dự phòng
            name = meta.get("name", f.parent.name)
            self.skills[name] = {"meta": meta, "body": body}

    def get_descriptions(self) -> str:
        """Lớp 1: one-liner rẻ cho system prompt."""
        lines = []
        for name, skill in self.skills.items():
            desc = skill["meta"].get("description", "")
            lines.append(f"  - {name}: {desc}")
        return "\n".join(lines)

    def get_content(self, name: str) -> str:
        """Lớp 2: thân đầy đủ, được trả về như tool_result."""
        skill = self.skills.get(name)
        if not skill:
            return f"Error: Unknown skill '{name}'."
        return f"<skill name=\"{name}\">\n{skill['body']}\n</skill>"
```

**Bước 3.** Lớp 1 vào system prompt để model luôn biết skill nào tồn tại. Lớp 2 được kết nối như một tool handler thông thường -- model gọi `load_skill` khi nó quyết định cần hướng dẫn đầy đủ.

```python
SYSTEM = f"""You are a coding agent at {WORKDIR}.
Skills available:
{SKILL_LOADER.get_descriptions()}"""

TOOL_HANDLERS = {
    # ...base tools...
    "load_skill": lambda **kw: SKILL_LOADER.get_content(kw["name"]),
}
```

Model học những skill nào tồn tại (rẻ, ~100 token mỗi cái) và tải chúng chỉ khi liên quan (đắt, ~2000 token mỗi cái). Trong một lượt điển hình, chỉ một skill được tải thay vì tất cả mười.

## Những Gì Đã Thay Đổi Từ s04

| Thành phần     | Trước (s04)      | Sau (s05)                  |
|----------------|------------------|----------------------------|
| Tools          | 5 (base + task)  | 5 (base + load_skill)      |
| System prompt  | Static string    | + mô tả skill              |
| Knowledge      | Không có         | các tệp skills/*/SKILL.md  |
| Injection      | Không có         | Hai lớp (system + result)  |

## Thử Ngay

```sh
cd learn-claude-code
python agents/s05_skill_loading.py
```

1. `What skills are available?`
2. `Load the agent-builder skill and follow its instructions`
3. `I need to do a code review -- load the relevant skill first`
4. `Build an MCP server using the mcp-builder skill`

## Những Gì Bạn Đã Thành Thạo

Tại điểm này, bạn có thể:

- Giải thích tại sao "liệt kê trước, tải sau" đánh bại việc nhồi mọi thứ vào system prompt
- Viết một `SKILL.md` với YAML frontmatter mà `SkillLoader` có thể khám phá
- Kết nối tải hai lớp: mô tả rẻ trong system prompt, thân đầy đủ qua `tool_result`
- Để model tự quyết định khi nào kiến thức miền đáng tải

Bạn không cần hệ thống xếp hạng skill, hợp nhất nhiều nhà cung cấp, template tham số hóa, hoặc quy tắc khôi phục khi phục hồi. Pattern cốt lõi đơn giản: quảng cáo rẻ, tải theo yêu cầu.

## Tiếp Theo Là Gì

Bây giờ bạn biết cách giữ kiến thức ra ngoài ngữ cảnh cho đến khi cần. Nhưng điều gì xảy ra khi ngữ cảnh vẫn phát triển lớn -- sau hàng chục lượt công việc thực sự? Trong s06, bạn sẽ học cách nén một cuộc hội thoại dài xuống còn thiết yếu để agent có thể tiếp tục làm việc mà không đạt đến giới hạn token.

## Bài Học Chính

> Quảng cáo tên skill rẻ trong system prompt; tải thân đầy đủ thông qua lần gọi công cụ chỉ khi model thực sự cần nó.
