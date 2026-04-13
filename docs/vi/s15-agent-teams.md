# s15: Đội Nhóm Agent (Agent Teams)

`s01 > s02 > s03 > s04 > s05 > s06 > s07 > s08 > s09 > s10 > s11 > s12 > s13 > s14 > [ s15 ] > s16 > s17 > s18 > s19`

## Bạn Sẽ Học Được
- Cách đồng đội liên tục khác với subagent có thể vứt bỏ
- Cách inbox dựa trên JSONL cung cấp cho các agent một kênh giao tiếp lâu dài
- Cách vòng đời đồng đội di chuyển qua spawn, working, idle và shutdown
- Cách phối hợp dựa trên tệp cho phép nhiều vòng lặp agent chạy bên cạnh nhau

Đôi khi một agent không đủ. Một dự án phức tạp -- chẳng hạn, xây dựng một tính năng liên quan đến frontend, backend và test -- cần nhiều worker chạy song song, mỗi cái có danh tính và bộ nhớ riêng. Trong chương này bạn sẽ xây dựng một hệ thống nhóm nơi các agent tồn tại vượt ra ngoài một prompt duy nhất, giao tiếp qua hộp thư dựa trên tệp, và phối hợp mà không chia sẻ một luồng hội thoại duy nhất.

## Vấn Đề

Subagent từ s04 có thể vứt bỏ: bạn spawn một cái, nó làm việc, nó trả về bản tóm tắt, và nó chết. Nó không có danh tính và không có bộ nhớ giữa các lần gọi. Tác vụ nền từ s13 có thể giữ công việc chạy ở nền, nhưng chúng không phải là đồng đội liên tục ra quyết định được hướng dẫn bởi LLM riêng.

Teamwork thực sự cần ba thứ: (1) các agent liên tục tồn tại vượt quá một prompt duy nhất, (2) quản lý danh tính và vòng đời để bạn biết ai đang làm gì, và (3) kênh giao tiếp giữa các agent để chúng có thể trao đổi thông tin mà lead không cần chuyển tiếp thủ công mọi tin nhắn.

## Giải Pháp

Harness duy trì một danh sách nhóm trong tệp cấu hình chung và cung cấp cho mỗi đồng đội một inbox JSONL chỉ-thêm (append-only). Khi một agent gửi tin nhắn cho agent khác, nó đơn giản thêm một dòng JSON vào tệp inbox của người nhận. Người nhận drain tệp đó trước mỗi lần gọi LLM.

```
Vòng đời đồng đội:
  spawn -> WORKING -> IDLE -> WORKING -> ... -> SHUTDOWN

Giao tiếp:
  .team/
    config.json           <- danh sách nhóm + trạng thái
    inbox/
      alice.jsonl         <- chỉ-thêm, drain-on-read
      bob.jsonl
      lead.jsonl

              +--------+    send("alice","bob","...")    +--------+
              | alice  | -----------------------------> |  bob   |
              | loop   |    bob.jsonl << {json_line}    |  loop  |
              +--------+                                +--------+
                   ^                                         |
                   |        BUS.read_inbox("alice")          |
                   +---- alice.jsonl -> read + drain ---------+
```

## Cách Hoạt Động

**Bước 1.** `TeammateManager` duy trì `config.json` với danh sách nhóm. Nó theo dõi tên, vai trò và trạng thái hiện tại của mọi đồng đội.

```python
class TeammateManager:
    def __init__(self, team_dir: Path):
        self.dir = team_dir
        self.dir.mkdir(exist_ok=True)
        self.config_path = self.dir / "config.json"
        self.config = self._load_config()
        self.threads = {}
```

**Bước 2.** `spawn()` tạo một mục đồng đội trong danh sách và bắt đầu vòng lặp agent của nó trong một thread riêng. Từ thời điểm này, đồng đội chạy độc lập -- nó có lịch sử hội thoại riêng, lần gọi công cụ riêng và tương tác LLM riêng.

```python
def spawn(self, name: str, role: str, prompt: str) -> str:
    member = {"name": name, "role": role, "status": "working"}
    self.config["members"].append(member)
    self._save_config()
    thread = threading.Thread(
        target=self._teammate_loop,
        args=(name, role, prompt), daemon=True)
    thread.start()
    return f"Spawned teammate '{name}' (role: {role})"
```

**Bước 3.** `MessageBus` cung cấp inbox JSONL chỉ-thêm. `send()` thêm một dòng JSON duy nhất vào tệp của người nhận; `read_inbox()` đọc tất cả tin nhắn tích lũy và sau đó làm trống tệp ("drain" nó). Định dạng lưu trữ cố ý đơn giản -- trọng tâm giảng dạy ở đây là ranh giới hộp thư, không phải sự thông minh của lưu trữ.

```python
class MessageBus:
    def send(self, sender, to, content, msg_type="message", extra=None):
        msg = {"type": msg_type, "from": sender,
               "content": content, "timestamp": time.time()}
        if extra:
            msg.update(extra)
        with open(self.dir / f"{to}.jsonl", "a") as f:
            f.write(json.dumps(msg) + "\n")

    def read_inbox(self, name):
        path = self.dir / f"{name}.jsonl"
        if not path.exists(): return "[]"
        msgs = [json.loads(l) for l in path.read_text().strip().splitlines() if l]
        path.write_text("")  # drain
        return json.dumps(msgs, indent=2)
```

**Bước 4.** Mỗi đồng đội kiểm tra inbox của mình trước mỗi lần gọi LLM. Bất kỳ tin nhắn nhận được nào được tiêm vào ngữ cảnh hội thoại để model có thể thấy và phản hồi chúng.

```python
def _teammate_loop(self, name, role, prompt):
    messages = [{"role": "user", "content": prompt}]
    for _ in range(50):
        inbox = BUS.read_inbox(name)
        if inbox != "[]":
            messages.append({"role": "user",
                "content": f"<inbox>{inbox}</inbox>"})
            messages.append({"role": "assistant",
                "content": "Noted inbox messages."})
        response = client.messages.create(...)
        if response.stop_reason != "tool_use":
            break
        # thực thi công cụ, thêm kết quả...
    self._find_member(name)["status"] = "idle"
```

## Đọc Cùng Nhau

- Nếu bạn vẫn coi đồng đội như subagent có thể vứt bỏ của s04, hãy xem lại [`entity-map.md`](./entity-map.md) để thấy chúng khác nhau như thế nào.
- Nếu bạn dự định tiếp tục vào s16-s18, hãy giữ [`team-task-lane-model.md`](./team-task-lane-model.md) mở -- nó tách đồng đội, yêu cầu giao thức, tác vụ, khe runtime và làn worktree thành các khái niệm riêng biệt.
- Nếu bạn không chắc đồng đội tồn tại lâu dài khác với khe runtime trực tiếp như thế nào, hãy ghép chương này với [`s13a-runtime-task-model.md`](./s13a-runtime-task-model.md).

## Cách Nó Kết Nối Vào Hệ Thống Trước Đó

Chương này không chỉ là "thêm lần gọi model." Nó thêm các executor lâu dài trên các cấu trúc công việc bạn đã xây dựng trong s12-s14.

```text
lead xác định công việc cần một worker tồn tại lâu dài
  ->
spawn đồng đội
  ->
ghi mục danh sách trong .team/config.json
  ->
gửi tin nhắn inbox / gợi ý tác vụ
  ->
đồng đội drain inbox trước vòng lặp tiếp theo
  ->
đồng đội chạy vòng lặp agent và công cụ riêng
  ->
kết quả quay lại qua tin nhắn nhóm hoặc cập nhật tác vụ
```

Giữ ranh giới thẳng:

- s12-s14 cho bạn tác vụ, khe runtime và lịch
- s15 thêm worker có tên lâu dài
- s15 vẫn chủ yếu là công việc được lead giao
- giao thức có cấu trúc đến trong s16
- tự nhận đến trong s17

## Đồng Đội vs Subagent vs Khe Runtime

| Cơ chế | Nghĩ về nó như | Vòng đời | Ranh giới chính |
|---|---|---|---|
| subagent | trợ lý có thể vứt bỏ | spawn -> làm việc -> tóm tắt -> biến mất | phân lập một nhánh khám phá |
| khe runtime | khe thực thi trực tiếp | tồn tại trong khi công việc nền đang chạy | theo dõi thực thi dài hạn, không phải danh tính |
| đồng đội | worker lâu dài | có thể idle, tiếp tục, và tiếp tục nhận công việc | có tên, inbox, và vòng lặp độc lập |

## Những Gì Đã Thay Đổi Từ s14

| Thành phần     | Trước (s14)      | Sau (s15)                    |
|----------------|------------------|------------------------------|
| Công cụ        | 6                | 9 (+spawn/send/read_inbox)   |
| Agent          | Đơn              | Lead + N đồng đội            |
| Lưu trữ        | Không có         | config.json + inbox JSONL    |
| Thread         | Lệnh nền         | Vòng lặp agent đầy đủ mỗi thread|
| Vòng đời       | Fire-and-forget  | idle -> working -> idle      |
| Giao tiếp      | Không có         | message + broadcast          |

## Thử Ngay

```sh
cd learn-claude-code
python agents/s15_agent_teams.py
```

1. `Spawn alice (coder) and bob (tester). Have alice send bob a message.`
2. `Broadcast "status update: phase 1 complete" to all teammates`
3. `Check the lead inbox for any messages`
4. Gõ `/team` để xem danh sách nhóm với trạng thái
5. Gõ `/inbox` để kiểm tra inbox của lead thủ công

## Những Gì Bạn Đã Thành Thạo

Tại điểm này, bạn có thể:

- Spawn đồng đội liên tục, mỗi cái chạy vòng lặp agent độc lập riêng
- Gửi tin nhắn giữa các agent qua inbox JSONL lâu dài
- Theo dõi trạng thái đồng đội qua tệp cấu hình chung
- Phối hợp nhiều agent mà không cần dồn mọi thứ qua một cuộc hội thoại duy nhất

## Tiếp Theo Là Gì

Đồng đội của bạn bây giờ có thể giao tiếp tự do, nhưng chúng thiếu quy tắc phối hợp. Điều gì xảy ra khi bạn cần tắt máy một đồng đội một cách sạch sẽ, hoặc xem xét một kế hoạch rủi ro trước khi nó thực thi? Trong s16, bạn sẽ thêm các giao thức có cấu trúc -- bắt tay yêu cầu-phản hồi mang lại trật tự cho đàm phán đa agent.

## Bài Học Chính

> Đồng đội tồn tại vượt ra ngoài một prompt, mỗi cái có danh tính, vòng đời và hộp thư lâu dài -- phối hợp không còn bị giới hạn bởi một vòng lặp cha duy nhất.
