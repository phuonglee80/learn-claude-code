# s04: Subagent

`s01 > s02 > s03 > [ s04 ] > s05 > s06 > s07 > s08 > s09 > s10 > s11 > s12 > s13 > s14 > s15 > s16 > s17 > s18 > s19`

## Bạn Sẽ Học Được
- Tại sao khám phá một câu hỏi phụ có thể làm ô nhiễm ngữ cảnh của agent cha
- Cách một subagent nhận được lịch sử tin nhắn mới, trống rỗng
- Cách chỉ một bản tóm tắt ngắn di chuyển trở lại agent cha
- Tại sao lịch sử tin nhắn đầy đủ của con bị loại bỏ sau khi sử dụng

Tưởng tượng bạn yêu cầu agent của mình "Framework testing nào dự án này sử dụng?" Để trả lời, nó đọc năm tệp, phân tích các block config, và so sánh các import statement. Tất cả sự khám phá đó hữu ích trong một khoảnh khắc -- nhưng một khi câu trả lời là "pytest", bạn thực sự không muốn năm file dump đó ngồi trong cuộc hội thoại mãi mãi. Mọi lần gọi API trong tương lai bây giờ đều mang trọng lượng chết đó, đốt token và làm phân tâm model. Bạn cần một cách để đặt một câu hỏi phụ trong một phòng sạch và chỉ mang lại câu trả lời.

## Vấn Đề

Khi agent làm việc, mảng `messages` của nó phát triển. Mọi lần đọc tệp, mọi đầu ra bash đều tồn tại trong ngữ cảnh vĩnh viễn. Một câu hỏi đơn giản như "framework testing nào đây?" có thể yêu cầu đọc năm tệp, nhưng cha chỉ cần một từ trở lại: "pytest." Không có phân lập, những artifact trung gian đó tồn tại trong ngữ cảnh cho phần còn lại của phiên, lãng phí token trong mọi lần gọi API tiếp theo và làm mờ sự chú ý của model. Phiên càng chạy lâu, điều này càng tệ -- ngữ cảnh lấp đầy với debris khám phá không liên gì đến tác vụ hiện tại.

## Giải Pháp

Agent cha ủy thác các tác vụ phụ cho một agent con bắt đầu với `messages=[]` trống rỗng. Con thực hiện tất cả các khám phá lộn xộn, sau đó chỉ bản tóm tắt text cuối cùng của nó di chuyển trở lại. Lịch sử đầy đủ của con bị loại bỏ.

```
Agent cha                        Subagent
+------------------+             +------------------+
| messages=[...]   |             | messages=[]      | <-- tươi
|                  |  dispatch   |                  |
| tool: task       | ----------> | while tool_use:  |
|   prompt="..."   |             |   call tools     |
|                  |  summary    |   append results |
|   result = "..." | <---------- | return last text |
+------------------+             +------------------+

Ngữ cảnh cha giữ sạch. Ngữ cảnh subagent bị loại bỏ.
```

## Cách Hoạt Động

**Bước 1.** Cha nhận một công cụ `task` mà con không có. Điều này ngăn spawning đệ quy -- một con không thể tạo ra con của chính nó.

```python
PARENT_TOOLS = CHILD_TOOLS + [
    {"name": "task",
     "description": "Spawn a subagent with fresh context.",
     "input_schema": {
         "type": "object",
         "properties": {"prompt": {"type": "string"}},
         "required": ["prompt"],
     }},
]
```

**Bước 2.** Subagent bắt đầu với `messages=[]` và chạy vòng lặp agent của chính nó. Chỉ block text cuối cùng trả về cho cha như một `tool_result`.

```python
def run_subagent(prompt: str) -> str:
    sub_messages = [{"role": "user", "content": prompt}]
    for _ in range(30):  # giới hạn an toàn
        response = client.messages.create(
            model=MODEL, system=SUBAGENT_SYSTEM,
            messages=sub_messages,
            tools=CHILD_TOOLS, max_tokens=8000,
        )
        sub_messages.append({"role": "assistant",
                             "content": response.content})
        if response.stop_reason != "tool_use":
            break
        results = []
        for block in response.content:
            if block.type == "tool_use":
                handler = TOOL_HANDLERS.get(block.name)
                output = handler(**block.input)
                results.append({"type": "tool_result",
                    "tool_use_id": block.id,
                    "content": str(output)[:50000]})
        sub_messages.append({"role": "user", "content": results})
    # Chỉ trích xuất text cuối cùng -- mọi thứ khác bị loại bỏ
    return "".join(
        b.text for b in response.content if hasattr(b, "text")
    ) or "(no summary)"
```

Toàn bộ lịch sử tin nhắn của con (có thể là 30+ lần gọi công cụ đáng của việc đọc tệp và đầu ra bash) bị loại bỏ khi `run_subagent` trả về. Cha nhận một bản tóm tắt một đoạn văn như một `tool_result` thông thường, giữ ngữ cảnh riêng của nó sạch.

## Những Gì Đã Thay Đổi Từ s03

| Thành phần     | Trước (s03)      | Sau (s04)                 |
|----------------|------------------|---------------------------|
| Tools          | 5                | 5 (base) + task (parent)  |
| Context        | Một shared duy nhất | Phân lập cha + con     |
| Subagent       | Không có         | Hàm `run_subagent()`      |
| Return value   | N/A              | Chỉ text tóm tắt          |

## Thử Ngay

```sh
cd learn-claude-code
python agents/s04_subagent.py
```

1. `Use a subtask to find what testing framework this project uses`
2. `Delegate: read all .py files and summarize what each one does`
3. `Use a task to create a new module, then verify it from here`

## Những Gì Bạn Đã Thành Thạo

Tại điểm này, bạn có thể:

- Giải thích tại sao một subagent chủ yếu là một **ranh giới ngữ cảnh**, không phải một thủ thuật process
- Spawn một agent con một lần với `messages=[]` tươi
- Chỉ trả về một bản tóm tắt cho cha, loại bỏ tất cả các khám phá trung gian
- Quyết định những công cụ nào con nên và không nên có quyền truy cập

Bạn không cần các worker tồn tại lâu dài, phiên có thể tiếp tục, hay phân lập worktree chưa. Ý tưởng cốt lõi đơn giản: cho subtask một không gian làm việc trong bộ nhớ, sau đó chỉ mang lại câu trả lời mà cha vẫn cần.

## Tiếp Theo Là Gì

Cho đến nay bạn đã học cách giữ ngữ cảnh sạch bằng cách phân lập các tác vụ phụ. Nhưng còn kiến thức mà agent mang theo ngay từ đầu thì sao? Trong s05, bạn sẽ thấy cách tránh làm phình system prompt với chuyên môn tên miền mà model có thể không bao giờ sử dụng -- tải skill theo yêu cầu thay vì trước.

## Bài Học Chính

> Subagent là một tờ giấy nháp có thể vứt bỏ: ngữ cảnh tươi vào, tóm tắt ngắn ra, mọi thứ khác bị loại bỏ.
