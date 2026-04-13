# s10: System Prompt (Prompt Hệ Thống)

`s01 > s02 > s03 > s04 > s05 > s06 > s07 > s08 > s09 > [ s10 ] > s11 > s12 > s13 > s14 > s15 > s16 > s17 > s18 > s19`

## Bạn Sẽ Học Được

- Cách lắp ráp system prompt từ các phần độc lập thay vì một chuỗi được cứng hóa
- Ranh giới giữa nội dung ổn định (vai trò, quy tắc) và nội dung động (ngày, cwd, nhắc nhở mỗi lượt)
- Cách các tệp CLAUDE.md lớp các hướng dẫn mà không ghi đè lên nhau
- Tại sao bộ nhớ phải được tiêm lại qua pipeline prompt để thực sự hướng dẫn agent

Khi agent của bạn chỉ có một công cụ và một công việc, một chuỗi prompt được cứng hóa duy nhất hoạt động tốt. Nhưng hãy nhìn vào mọi thứ harness của bạn đã tích lũy đến bây giờ: một mô tả vai trò, định nghĩa công cụ, skill đã tải, bộ nhớ đã lưu, tệp hướng dẫn CLAUDE.md, và ngữ cảnh runtime mỗi lượt. Nếu bạn tiếp tục nhồi tất cả vào một chuỗi lớn, không ai -- kể cả bạn -- có thể biết từng phần đến từ đâu, tại sao nó ở đó, hoặc cách thay đổi nó một cách an toàn. Cách khắc phục là ngừng coi prompt như một blob và bắt đầu coi nó như một pipeline lắp ráp.

## Vấn Đề

Hãy tưởng tượng bạn muốn thêm một công cụ mới vào agent của mình. Bạn mở system prompt, cuộn qua đoạn văn vai trò, qua các quy tắc an toàn, qua ba mô tả skill, qua block bộ nhớ, và dán một mô tả công cụ vào đâu đó ở giữa. Tuần tiếp theo ai đó khác thêm bộ tải CLAUDE.md và thêm đầu ra của nó vào cùng chuỗi. Một tháng sau prompt dài 6.000 ký tự, một nửa cũ và không ai nhớ dòng nào nên thay đổi mỗi lượt và dòng nào nên cố định trong suốt phiên.

Đây không phải là kịch bản giả thuyết -- đây là quỹ đạo tự nhiên của mọi agent giữ prompt trong một biến duy nhất.

## Giải Pháp

Biến việc xây dựng prompt thành một pipeline. Mỗi phần có một nguồn và một trách nhiệm. Một đối tượng builder lắp ráp chúng theo thứ tự cố định, với ranh giới rõ ràng giữa các phần ổn định và các phần thay đổi mỗi lượt.

```text
1. danh tính và quy tắc cốt lõi
2. danh mục công cụ
3. skill
4. bộ nhớ
5. chuỗi hướng dẫn CLAUDE.md
6. ngữ cảnh runtime động
```

Sau đó lắp ráp:

```text
core
+ tools
+ skills
+ memory
+ claude_md
+ dynamic_context
= đầu vào model cuối cùng
```

## Cách Hoạt Động

**Bước 1. Định nghĩa builder.** Mỗi phương thức sở hữu chính xác một nguồn nội dung.

```python
class SystemPromptBuilder:
    def build(self) -> str:
        parts = []
        parts.append(self._build_core())
        parts.append(self._build_tools())
        parts.append(self._build_skills())
        parts.append(self._build_memory())
        parts.append(self._build_claude_md())
        parts.append(self._build_dynamic())
        return "\n\n".join(p for p in parts if p)
```

Đó là ý tưởng trung tâm của chương. Mỗi phương thức `_build_*` chỉ kéo từ một nguồn: `_build_tools()` đọc danh sách công cụ, `_build_memory()` đọc kho bộ nhớ, v.v. Nếu bạn muốn biết một dòng trong prompt đến từ đâu, bạn kiểm tra phương thức duy nhất chịu trách nhiệm về nó.

**Bước 2. Tách nội dung ổn định khỏi nội dung động.** Đây là ranh giới quan trọng nhất trong toàn bộ pipeline.

Nội dung ổn định ít thay đổi hoặc không bao giờ thay đổi trong một phiên:

- mô tả vai trò
- hợp đồng công cụ (danh sách công cụ và schema của chúng)
- quy tắc an toàn lâu dài
- chuỗi hướng dẫn dự án (tệp CLAUDE.md)

Nội dung động thay đổi mỗi lượt hoặc mỗi vài lượt:

- ngày hiện tại
- thư mục làm việc hiện tại
- chế độ hiện tại (chế độ plan, chế độ code, v.v.)
- cảnh báo hoặc nhắc nhở mỗi lượt

Trộn lẫn chúng có nghĩa là model đọc lại hàng nghìn token văn bản ổn định chưa thay đổi, trong khi vài token thực sự đã thay đổi bị chôn vùi đâu đó ở giữa. Một hệ thống thực sự tách chúng với một marker ranh giới để tiền tố ổn định có thể được cache qua các lượt để tiết kiệm token prompt.

**Bước 3. Lớp các hướng dẫn CLAUDE.md.** `CLAUDE.md` không giống như bộ nhớ và không giống như skill. Đó là một nguồn hướng dẫn được lớp -- có nghĩa là nhiều tệp đóng góp, và các lớp sau thêm vào các lớp trước thay vì thay thế chúng:

1. tệp hướng dẫn cấp người dùng (`~/.claude/CLAUDE.md`)
2. tệp hướng dẫn gốc dự án (`<project>/CLAUDE.md`)
3. tệp hướng dẫn thư mục con sâu hơn

Điểm quan trọng không phải là tên tệp bản thân. Điểm quan trọng là các nguồn hướng dẫn có thể được lớp thay vì ghi đè.

**Bước 4. Tiêm lại bộ nhớ.** Lưu bộ nhớ (trong s09) chỉ là một nửa cơ chế. Nếu bộ nhớ không bao giờ quay lại đầu vào model, nó không thực sự hướng dẫn agent. Vì vậy bộ nhớ tự nhiên thuộc về pipeline prompt:

- lưu sự thật lâu dài trong `s09`
- tiêm lại chúng qua builder prompt trong `s10`

**Bước 5. Đính kèm nhắc nhở mỗi lượt riêng biệt.** Một số thông tin thậm chí còn ngắn hạn hơn "ngữ cảnh động" -- nó chỉ quan trọng cho lượt này và không nên làm ô nhiễm system prompt ổn định. Một `system-reminder` user message giữ các tín hiệu thoáng qua này hoàn toàn ngoài builder:

- hướng dẫn chỉ lượt này
- thông báo tạm thời
- hướng dẫn phục hồi thoáng qua

## Những Gì Đã Thay Đổi Từ s09

| Khía cạnh | s09: Hệ Thống Bộ Nhớ | s10: System Prompt |
|--------|-----|-----|
| Mối quan tâm cốt lõi | Lưu trữ sự thật lâu dài qua các phiên | Lắp ráp tất cả nguồn thành đầu vào model |
| Vai trò của bộ nhớ | Viết và lưu trữ | Đọc và tiêm |
| Cấu trúc prompt | Giả định nhưng không quản lý | Pipeline rõ ràng với các phần |
| Tệp hướng dẫn | Không được đề cập | Lớp CLAUDE.md được giới thiệu |
| Ngữ cảnh động | Không được đề cập | Tách biệt khỏi nội dung ổn định |

## Đọc Cùng Nhau

- Nếu bạn vẫn coi prompt như một blob bí ẩn của văn bản, hãy xem lại [`s00a-query-control-plane.md`](./s00a-query-control-plane.md) để xem những gì đến model và qua các lớp kiểm soát nào.
- Nếu bạn muốn ổn định thứ tự lắp ráp, hãy giữ [`s10a-message-prompt-pipeline.md`](./s10a-message-prompt-pipeline.md) bên cạnh chương này -- đó là ghi chú cầu nối chính cho `s10`.
- Nếu quy tắc hệ thống, tài liệu công cụ, bộ nhớ và trạng thái runtime bắt đầu sụp đổ thành một cục đầu vào lớn, hãy reset với [`data-structures.md`](./data-structures.md).

## Lỗi Người Mới Bắt Đầu Thông Thường

**Lỗi 1: dạy prompt như một chuỗi cố định.** Điều đó ẩn cách hệ thống thực sự phát triển. Một chuỗi cố định ổn cho demo; nó không còn ổn ngay khi bạn thêm khả năng thứ hai.

**Lỗi 2: đặt mọi chi tiết thay đổi vào cùng một block prompt.** Điều đó trộn lẫn quy tắc lâu dài với tiếng ồn mỗi lượt. Khi bạn cập nhật một, bạn có nguy cơ phá vỡ cái kia.

**Lỗi 3: coi skill, bộ nhớ và CLAUDE.md như một thứ.** Chúng có thể đều trở thành các phần prompt, nhưng nguồn và mục đích của chúng khác nhau:

- `skills`: các gói khả năng tùy chọn được tải theo yêu cầu
- `memory`: sự thật xuyên phiên lâu dài về người dùng hoặc dự án
- `CLAUDE.md`: tài liệu hướng dẫn lâu dài lớp mà không ghi đè

## Thử Ngay

```sh
cd learn-claude-code
python agents/s10_system_prompt.py
```

Tìm kiếm ba điều sau:

1. mỗi phần đến từ đâu
2. phần nào ổn định
3. các phần nào được tạo động mỗi lượt

## Những Gì Bạn Đã Thành Thạo

Tại điểm này, bạn có thể:

- Xây dựng system prompt từ các phần độc lập, có thể kiểm tra thay vì một chuỗi mờ đục duy nhất
- Vẽ ranh giới rõ ràng giữa nội dung ổn định và nội dung động
- Lớp các tệp hướng dẫn để các quy tắc cấp dự án và cấp thư mục cùng tồn tại mà không ghi đè
- Tiêm lại bộ nhớ vào pipeline prompt để các sự thật đã lưu thực sự ảnh hưởng đến model
- Đính kèm nhắc nhở mỗi lượt riêng biệt khỏi system prompt chính

## Tiếp Theo Là Gì

Pipeline lắp ráp prompt có nghĩa là agent của bạn bây giờ vào mỗi lượt với các hướng dẫn đúng, công cụ đúng và ngữ cảnh đúng. Nhưng công việc thực tế tạo ra lỗi thực tế -- đầu ra bị cắt bớt, prompt phát triển quá lớn, API time out. Trong [s11: Error Recovery](./s11-error-recovery.md), bạn sẽ dạy harness phân loại các lỗi đó và chọn một con đường phục hồi thay vì crash.

## Bài Học Chính

> System prompt là một pipeline lắp ráp với các phần rõ ràng và ranh giới rõ ràng, không phải một chuỗi bí ẩn lớn.
