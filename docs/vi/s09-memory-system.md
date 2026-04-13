# s09: Hệ Thống Bộ Nhớ (Memory System)

`s01 > s02 > s03 > s04 > s05 > s06 > s07 > s08 > [ s09 ] > s10 > s11 > s12 > s13 > s14 > s15 > s16 > s17 > s18 > s19`

## Bạn Sẽ Học Được

- Bốn danh mục bộ nhớ bao gồm những gì đáng nhớ: tùy chọn người dùng, phản hồi, sự thật dự án và tài liệu tham khảo
- Cách các tệp YAML frontmatter cung cấp cho mỗi bản ghi bộ nhớ một tên, loại và mô tả
- Những gì KHÔNG nên đưa vào bộ nhớ -- và tại sao sai ranh giới này là lỗi phổ biến nhất
- Sự khác biệt giữa bộ nhớ, tác vụ, kế hoạch và CLAUDE.md

Agent của bạn từ s08 mạnh mẽ và có thể mở rộng. Nó có thể thực thi công cụ một cách an toàn, được mở rộng thông qua các hook, và làm việc trong các phiên dài nhờ nén ngữ cảnh. Nhưng nó bị mất trí nhớ. Mỗi lần bạn bắt đầu một phiên mới, agent gặp bạn lần đầu tiên. Nó không nhớ rằng bạn thích pnpm hơn npm, rằng bạn đã nói với nó ba lần để ngừng sửa đổi test snapshots, hoặc rằng thư mục legacy không thể bị xóa vì deployment phụ thuộc vào nó. Bạn kết thúc bằng cách lặp lại bản thân mỗi phiên. Cách khắc phục là một kho bộ nhớ nhỏ, lâu dài -- không phải là đổ mọi thứ agent đã thấy ra, mà là một tập hợp được chọn lọc các sự thật vẫn quan trọng lần sau.

## Vấn Đề

Không có bộ nhớ, một phiên mới bắt đầu từ zero. Agent tiếp tục quên những thứ như tùy chọn người dùng lâu dài, sự sửa chỉnh bạn đã lặp lại nhiều lần, ràng buộc dự án không rõ ràng từ code chính nó, và các tài liệu tham khảo bên ngoài mà dự án phụ thuộc vào. Kết quả là một agent luôn cảm thấy như đang gặp bạn lần đầu tiên. Bạn lãng phí thời gian tái tạo ngữ cảnh đáng lẽ phải được lưu một lần và tải tự động.

## Giải Pháp

Một kho bộ nhớ dựa trên tệp nhỏ lưu các sự thật lâu dài như các tệp markdown riêng lẻ với YAML frontmatter (một block metadata ở đầu mỗi tệp, được giới hạn bởi các dòng `---`). Vào đầu mỗi phiên, các bộ nhớ liên quan được tải và được tiêm vào ngữ cảnh của model.

```text
cuộc hội thoại
   |
   | sự thật lâu dài xuất hiện
   v
save_memory
   |
   v
.memory/
  ├── MEMORY.md
  ├── prefer_pnpm.md
  ├── ask_before_codegen.md
  └── incident_dashboard.md
   |
   v
phiên tiếp theo tải các mục liên quan
```

## Đọc Cùng Nhau

- Nếu bạn vẫn nghĩ bộ nhớ chỉ là "cửa sổ ngữ cảnh dài hơn," bạn có thể thấy hữu ích khi xem lại [`s06-context-compact.md`](./s06-context-compact.md) và tách biệt lại nén từ bộ nhớ lâu dài.
- Nếu `messages[]`, các block tóm tắt và kho bộ nhớ bắt đầu hòa trộn lại với nhau, việc giữ [`data-structures.md`](./data-structures.md) mở khi đọc có thể giúp ích.
- Nếu bạn sắp tiếp tục vào s10, đọc [`s10a-message-prompt-pipeline.md`](./s10a-message-prompt-pipeline.md) cùng chương này hữu ích vì bộ nhớ quan trọng nhất khi nó quay lại đầu vào model tiếp theo.

## Cách Hoạt Động

**Bước 1.** Xác định bốn danh mục bộ nhớ. Đây là các loại sự thật đáng giữ qua các phiên. Mỗi danh mục có một mục đích rõ ràng -- nếu một sự thật không phù hợp với một trong số chúng, nó có lẽ không nên ở trong bộ nhớ.

### 1. `user` -- Tùy chọn người dùng ổn định

Ví dụ: thích `pnpm`, muốn câu trả lời ngắn gọn, không thích tái cấu trúc lớn mà không có kế hoạch.

### 2. `feedback` -- Sự sửa chỉnh người dùng muốn thực thi

Ví dụ: "đừng thay đổi test snapshots trừ khi tôi yêu cầu", "hỏi trước khi sửa đổi các tệp được tạo."

### 3. `project` -- Sự thật dự án lâu dài không rõ ràng từ repo

Ví dụ: "thư mục cũ này vẫn không thể bị xóa vì deployment phụ thuộc vào nó", "dịch vụ này tồn tại vì một yêu cầu tuân thủ, không phải vì sở thích kỹ thuật."

### 4. `reference` -- Con trỏ đến các tài nguyên bên ngoài

Ví dụ: URL bảng incident, vị trí dashboard giám sát, vị trí tài liệu spec.

```python
MEMORY_TYPES = ("user", "feedback", "project", "reference")
```

**Bước 2.** Lưu một bản ghi trên mỗi tệp sử dụng frontmatter. Mỗi bộ nhớ là một tệp markdown với YAML frontmatter cho hệ thống biết bộ nhớ được gọi là gì, loại gì, và nó nói về điều gì.

```md
---
name: prefer_pnpm
description: User prefers pnpm over npm
type: user
---
The user explicitly prefers pnpm for package management commands.
```

```python
def save_memory(name, description, mem_type, content):
    path = memory_dir / f"{slugify(name)}.md"
    path.write_text(render_frontmatter(name, description, mem_type) + content)
    rebuild_index()
```

**Bước 3.** Xây dựng một chỉ mục nhỏ để hệ thống biết bộ nhớ nào tồn tại mà không cần đọc mọi tệp.

```md
# Memory Index

- prefer_pnpm [user]
- ask_before_codegen [feedback]
- incident_dashboard [reference]
```

Chỉ mục không phải là bộ nhớ bản thân -- đó là bản đồ nhanh về những gì tồn tại.

**Bước 4.** Tải bộ nhớ liên quan khi bắt đầu phiên và biến nó thành một phần prompt. Bộ nhớ chỉ trở nên hữu ích khi nó được đưa trở lại vào đầu vào model. Đây là lý do tại sao s09 kết nối tự nhiên vào s10.

```python
memories = memory_store.load_all()
```

**Bước 5.** Biết những gì KHÔNG nên đưa vào bộ nhớ. Ranh giới này là phần quan trọng nhất của chương, và nơi mà hầu hết người mới bắt đầu đi sai.

| Đừng lưu | Tại sao |
|---|---|
| cấu trúc cây tệp | có thể đọc lại từ repo |
| tên hàm và chữ ký | code là nguồn sự thật |
| trạng thái tác vụ hiện tại | thuộc về tác vụ / kế hoạch, không phải bộ nhớ |
| tên nhánh tạm thời hoặc số PR | nhanh trở nên cũ |
| bí mật hoặc thông tin xác thực | rủi ro bảo mật |

Quy tắc đúng là: chỉ giữ thông tin vẫn còn quan trọng qua các phiên và không thể tái tạo rẻ từ workspace hiện tại.

**Bước 6.** Hiểu ranh giới so với các khái niệm lân cận. Bốn thứ này nghe tương tự nhau nhưng phục vụ các mục đích khác nhau.

| Khái niệm | Mục đích | Thời gian sống |
|---------|---------|------------|
| Bộ nhớ | Sự thật nên tồn tại qua các phiên | Lâu dài |
| Tác vụ | Những gì hệ thống đang cố gắng hoàn thành ngay bây giờ | Một tác vụ |
| Kế hoạch | Cách lượt hoặc phiên này dự định tiến hành | Một phiên |
| CLAUDE.md | Tài liệu hướng dẫn ổn định và quy tắc cấp dự án lâu dài | Lâu dài |

Quy tắc ngắn gọn: chỉ hữu ích cho tác vụ này -- sử dụng `task` hoặc `plan`. Hữu ích phiên tiếp theo cũng -- sử dụng `memory`. Văn bản hướng dẫn lâu dài -- sử dụng `CLAUDE.md`.

## Lỗi Phổ Biến

**Lỗi 1: Lưu những thứ mà repo có thể cho bạn biết.** Nếu code có thể trả lời nó, bộ nhớ không nên sao chép nó. Bạn sẽ chỉ kết thúc với các bản sao cũ mâu thuẫn với thực tế.

**Lỗi 2: Lưu tiến trình tác vụ trực tiếp.** "Hiện đang sửa auth" không phải là bộ nhớ. Điều đó thuộc về trạng thái kế hoạch hoặc tác vụ. Khi tác vụ xong, bộ nhớ vô nghĩa.

**Lỗi 3: Coi bộ nhớ là sự thật tuyệt đối.** Bộ nhớ có thể cũ. Quy tắc an toàn hơn là: bộ nhớ cho hướng, quan sát hiện tại cho sự thật.

## Những Gì Đã Thay Đổi Từ s08

| Thành phần | Trước (s08) | Sau (s09) |
|---|---|---|
| Trạng thái xuyên phiên | Không có | Kho bộ nhớ dựa trên tệp |
| Loại bộ nhớ | Không có | user, feedback, project, reference |
| Định dạng lưu trữ | Không có | Tệp markdown YAML frontmatter |
| Bắt đầu phiên | Khởi động lạnh | Tải các bộ nhớ liên quan |
| Độ bền | Tất cả bị quên | Các sự thật quan trọng được lưu giữ |

## Thử Ngay

```sh
cd learn-claude-code
python agents/s09_memory_system.py
```

Thử yêu cầu nó nhớ:

- một tùy chọn người dùng
- một sự sửa chỉnh bạn muốn thực thi sau này
- một sự thật dự án không rõ ràng từ repository

## Những Gì Bạn Đã Thành Thạo

Tại điểm này, bạn có thể:

- Giải thích tại sao bộ nhớ là một kho được chọn lọc các sự thật lâu dài, không phải là đổ mọi thứ agent đã thấy ra
- Phân loại sự thật thành bốn loại: tùy chọn người dùng, phản hồi, kiến thức dự án và tài liệu tham khảo
- Lưu và truy xuất các bộ nhớ sử dụng các tệp markdown dựa trên frontmatter
- Vẽ ranh giới rõ ràng giữa những gì thuộc bộ nhớ và những gì thuộc trạng thái tác vụ, kế hoạch hoặc CLAUDE.md
- Tránh ba lỗi phổ biến nhất: sao chép repo, lưu trạng thái thoáng qua và coi bộ nhớ là sự thật cơ bản

## Tiếp Theo Là Gì

Agent của bạn bây giờ nhớ mọi thứ qua các phiên, nhưng những bộ nhớ đó chỉ nằm trong một tệp cho đến khi bắt đầu phiên. Trong s10, bạn sẽ xây dựng pipeline lắp ráp system prompt -- cơ chế lấy bộ nhớ, skill, quyền hạn và ngữ cảnh khác và dệt chúng vào prompt mà model thực sự thấy mỗi lượt.

## Bài Học Chính

> Bộ nhớ không phải là đổ mọi thứ agent đã thấy ra -- đó là một kho nhỏ các sự thật lâu dài vẫn quan trọng phiên tiếp theo.
