# s17: Agent Tự Chủ (Autonomous Agents)

`s01 > s02 > s03 > s04 > s05 > s06 > s07 > s08 > s09 > s10 > s11 > s12 > s13 > s14 > s15 > s16 > [ s17 ] > s18 > s19`

## Bạn Sẽ Học Được
- Cách idle polling cho phép đồng đội tìm công việc mới mà không cần được chỉ bảo
- Cách auto-claim biến task board thành hàng đợi công việc tự phục vụ
- Cách tiêm lại danh tính phục hồi cảm giác về bản thân của đồng đội sau nén ngữ cảnh
- Cách shutdown dựa trên timeout ngăn agent nhàn rỗi chạy mãi

Giao thủ công không mở rộng được. Với mười tác vụ chưa được nhận trên board, lead phải chọn một, tìm đồng đội nhàn rỗi, soạn prompt, và giao nó -- mười lần. Lead trở thành nút thắt, dành nhiều thời gian điều phối hơn là suy nghĩ. Trong chương này bạn sẽ loại bỏ nút thắt đó bằng cách làm đồng đội tự chủ: chúng tự quét task board, nhận công việc chưa được nhận, và tắt máy duyên dáng khi không còn gì để làm.

## Vấn Đề

Trong s15-s16, đồng đội chỉ làm việc khi được chỉ bảo rõ ràng. Lead phải spawn mỗi cái với prompt cụ thể. Nếu mười tác vụ nằm chưa được nhận trên board, lead giao mỗi cái thủ công. Điều này tạo ra nút thắt phối hợp tệ hơn khi nhóm phát triển.

Tự chủ thực sự có nghĩa là đồng đội tự quét task board, nhận tác vụ chưa được nhận, làm việc trên chúng, sau đó tìm thêm -- tất cả mà lead không cần nhấc ngón tay.

Một điểm tinh tế làm điều này khó hơn vẻ ngoài: sau nén ngữ cảnh (bạn đã xây dựng trong s06), lịch sử hội thoại của agent bị cắt bớt. Agent có thể quên nó là ai. Tiêm lại danh tính sửa điều này bằng cách phục hồi tên và vai trò của agent khi ngữ cảnh quá ngắn.

## Giải Pháp

Mỗi đồng đội xen kẽ giữa hai pha: WORK (gọi LLM và thực thi công cụ) và IDLE (polling tin nhắn mới hoặc tác vụ chưa được nhận). Nếu pha idle timeout mà không có gì để làm, đồng đội tự tắt.

```
Vòng đời đồng đội với chu kỳ idle:

+-------+
| spawn |
+---+---+
    |
    v
+-------+   tool_use     +-------+
| WORK  | <------------- |  LLM  |
+---+---+                +-------+
    |
    | stop_reason != tool_use (hoặc công cụ idle được gọi)
    v
+--------+
|  IDLE  |  poll mỗi 5s trong tối đa 60s
+---+----+
    |
    +--> kiểm tra inbox --> có tin nhắn? ----------> WORK
    |
    +--> quét .tasks/ --> có chưa được nhận? ------> claim -> WORK
    |
    +--> 60s timeout ----------------------> SHUTDOWN

Tiêm lại danh tính sau nén:
  if len(messages) <= 3:
    messages.insert(0, identity_block)
```

## Cách Hoạt Động

**Bước 1.** Vòng lặp đồng đội có hai pha: WORK và IDLE. Trong pha work, đồng đội gọi LLM liên tục và thực thi công cụ. Khi LLM ngừng gọi công cụ (hoặc đồng đội gọi công cụ `idle` rõ ràng), nó chuyển sang pha idle.

```python
def _loop(self, name, role, prompt):
    while True:
        # -- PHA WORK --
        messages = [{"role": "user", "content": prompt}]
        for _ in range(50):
            response = client.messages.create(...)
            if response.stop_reason != "tool_use":
                break
            # thực thi công cụ...
            if idle_requested:
                break

        # -- PHA IDLE --
        self._set_status(name, "idle")
        resume = self._idle_poll(name, messages)
        if not resume:
            self._set_status(name, "shutdown")
            return
        self._set_status(name, "working")
```

**Bước 2.** Pha idle poll hai thứ trong vòng lặp: tin nhắn inbox và tác vụ chưa được nhận. Nó kiểm tra mỗi 5 giây trong tối đa 60 giây. Nếu tin nhắn đến, đồng đội thức dậy. Nếu tác vụ chưa được nhận xuất hiện trên board, đồng đội nhận nó và quay lại làm việc. Nếu không có gì xảy ra trong cửa sổ timeout, đồng đội tự tắt.

```python
def _idle_poll(self, name, messages):
    for _ in range(IDLE_TIMEOUT // POLL_INTERVAL):  # 60s / 5s = 12
        time.sleep(POLL_INTERVAL)
        inbox = BUS.read_inbox(name)
        if inbox:
            messages.append({"role": "user",
                "content": f"<inbox>{inbox}</inbox>"})
            return True
        unclaimed = scan_unclaimed_tasks()
        if unclaimed:
            claim_task(unclaimed[0]["id"], name)
            messages.append({"role": "user",
                "content": f"<auto-claimed>Task #{unclaimed[0]['id']}: "
                           f"{unclaimed[0]['subject']}</auto-claimed>"})
            return True
    return False  # timeout -> shutdown
```

**Bước 3.** Quét task board tìm tác vụ pending, không có chủ, không bị chặn. Quét đọc tệp tác vụ từ đĩa và lọc các tác vụ có thể nhận -- không có chủ, không có phụ thuộc chặn, và vẫn ở trạng thái `pending`.

```python
def scan_unclaimed_tasks() -> list:
    unclaimed = []
    for f in sorted(TASKS_DIR.glob("task_*.json")):
        task = json.loads(f.read_text())
        if (task.get("status") == "pending"
                and not task.get("owner")
                and not task.get("blockedBy")):
            unclaimed.append(task)
    return unclaimed
```

**Bước 4.** Tiêm lại danh tính xử lý một vấn đề tinh tế. Sau nén ngữ cảnh (s06), lịch sử hội thoại có thể co lại chỉ còn vài tin nhắn -- và agent quên nó là ai. Khi danh sách tin nhắn ngắn đáng ngờ (3 tin nhắn trở xuống), harness chèn một block danh tính vào đầu để agent biết tên, vai trò và nhóm của nó.

```python
if len(messages) <= 3:
    messages.insert(0, {"role": "user",
        "content": f"<identity>You are '{name}', role: {role}, "
                   f"team: {team_name}. Continue your work.</identity>"})
    messages.insert(1, {"role": "assistant",
        "content": f"I am {name}. Continuing."})
```

## Đọc Cùng Nhau

- Nếu đồng đội, tác vụ và khe runtime bắt đầu mờ nhạt thành một lớp, hãy xem lại [`team-task-lane-model.md`](./team-task-lane-model.md) để tách chúng rõ ràng.
- Nếu auto-claim khiến bạn thắc mắc khe thực thi trực tiếp thực sự nằm ở đâu, hãy giữ [`s13a-runtime-task-model.md`](./s13a-runtime-task-model.md) ở gần.
- Nếu bạn bắt đầu quên sự khác biệt cốt lõi giữa đồng đội liên tục và subagent một lần, hãy xem lại [`entity-map.md`](./entity-map.md).

## Những Gì Đã Thay Đổi Từ s16

| Thành phần     | Trước (s16)      | Sau (s17)                    |
|----------------|------------------|------------------------------|
| Công cụ        | 12               | 14 (+idle, +claim_task)      |
| Tự chủ         | Do lead chỉ đạo  | Tự tổ chức                   |
| Pha idle       | Không có         | Poll inbox + task board       |
| Nhận tác vụ    | Chỉ thủ công     | Tự động nhận tác vụ chưa được nhận |
| Danh tính      | System prompt    | + tiêm lại sau nén           |
| Timeout        | Không có         | 60s idle -> tự động shutdown  |

## Thử Ngay

```sh
cd learn-claude-code
python agents/s17_autonomous_agents.py
```

1. `Create 3 tasks on the board, then spawn alice and bob. Watch them auto-claim.`
2. `Spawn a coder teammate and let it find work from the task board itself`
3. `Create tasks with dependencies. Watch teammates respect the blocked order.`
4. Gõ `/tasks` để xem task board với chủ sở hữu
5. Gõ `/team` để giám sát ai đang làm việc vs nhàn rỗi

## Những Gì Bạn Đã Thành Thạo

Tại điểm này, bạn có thể:

- Xây dựng đồng đội tìm và nhận công việc từ task board chung mà không cần lead can thiệp
- Triển khai vòng lặp idle polling cân bằng tính phản hồi với hiệu quả tài nguyên
- Phục hồi danh tính agent sau nén ngữ cảnh để đồng đội chạy lâu dài vẫn mạch lạc
- Sử dụng shutdown dựa trên timeout để ngăn agent bị bỏ rơi chạy vô thời hạn

## Tiếp Theo Là Gì

Đồng đội của bạn bây giờ tự tổ chức, nhưng tất cả đều chia sẻ cùng thư mục làm việc. Khi hai agent chỉnh sửa cùng tệp cùng lúc, mọi thứ hỏng. Trong s18, bạn sẽ cho mỗi đồng đội worktree riêng cô lập -- một bản sao riêng biệt của codebase nơi nó có thể làm việc mà không giẫm lên thay đổi của ai khác.

## Bài Học Chính

> Đồng đội tự chủ quét task board, nhận công việc chưa được nhận, và tắt khi nhàn rỗi -- loại bỏ lead như nút thắt phối hợp.
