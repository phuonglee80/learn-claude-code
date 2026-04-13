# s13: Tác Vụ Nền (Background Tasks)

`s01 > s02 > s03 > s04 > s05 > s06 > s07 > s08 > s09 > s10 > s11 > s12 > [ s13 ] > s14 > s15 > s16 > s17 > s18 > s19`

## Bạn Sẽ Học Được

- Cách chạy các lệnh chậm trong các thread nền trong khi vòng lặp chính vẫn phản hồi
- Cách một hàng đợi thông báo thread-safe gửi kết quả trở lại agent
- Cách các daemon thread giữ tiến trình sạch sẽ khi thoát
- Cách pattern drain-before-call tiêm kết quả nền vào đúng thời điểm

Bạn có một đồ thị tác vụ bây giờ, và mọi tác vụ có thể thể hiện nó phụ thuộc vào cái gì. Nhưng có một vấn đề thực tế: một số tác vụ liên quan đến các lệnh mất hàng phút. `npm install`, `pytest`, `docker build` -- những lệnh này chặn vòng lặp chính, và trong khi agent chờ, người dùng cũng chờ. Nếu người dùng nói "cài đặt phụ thuộc và trong khi đó chạy, tạo tệp cấu hình," agent của bạn từ s12 làm chúng tuần tự vì nó không có cách nào để bắt đầu thứ gì đó và quay lại nó sau. Chương này sửa điều đó bằng cách thêm thực thi nền.

## Vấn Đề

Xem xét một quy trình làm việc thực tế: người dùng yêu cầu agent chạy bộ test đầy đủ (mất 90 giây) và sau đó thiết lập một tệp cấu hình. Với vòng lặp chặn, agent gửi lệnh test, nhìn chằm chằm vào subprocess đang quay 90 giây, nhận kết quả, và chỉ sau đó mới bắt đầu tệp cấu hình. Người dùng xem tất cả điều này xảy ra tuần tự. Tệ hơn, nếu có ba lệnh chậm, tổng thời gian wall-clock là tổng của cả ba -- mặc dù chúng có thể chạy song song. Agent cần một cách để bắt đầu công việc chậm, trả điều khiển lại cho vòng lặp chính ngay lập tức, và nhận kết quả sau.

## Giải Pháp

Giữ vòng lặp chính đơn luồng, nhưng chạy các subprocess chậm trên các daemon thread nền. Khi một lệnh nền hoàn thành, kết quả của nó đi vào một hàng đợi thông báo thread-safe. Trước mỗi lần gọi LLM, vòng lặp chính drain hàng đợi đó và tiêm bất kỳ kết quả đã hoàn thành nào vào cuộc hội thoại.

```
Thread chính                Thread nền
+-----------------+        +-----------------+
| agent loop      |        | subprocess runs |
| ...             |        | ...             |
| [LLM call] <---+------- | enqueue(result) |
|  ^drain queue   |        +-----------------+
+-----------------+

Timeline:
Agent --[spawn A]--[spawn B]--[công việc khác]----
             |          |
             v          v
          [A runs]   [B runs]      (song song)
             |          |
             +-- kết quả được tiêm trước lần gọi LLM tiếp --+
```

## Cách Hoạt Động

**Bước 1.** Tạo một `BackgroundManager` theo dõi các tác vụ đang chạy với một hàng đợi thông báo thread-safe. Lock đảm bảo rằng thread chính và các thread nền không bao giờ làm hỏng hàng đợi đồng thời.

```python
class BackgroundManager:
    def __init__(self):
        self.tasks = {}
        self._notification_queue = []
        self._lock = threading.Lock()
```

**Bước 2.** Phương thức `run()` bắt đầu một daemon thread và trả về ngay lập tức. Daemon thread là thread mà Python runtime tự động kill khi chương trình chính thoát -- bạn không cần join hoặc dọn dẹp nó.

```python
def run(self, command: str) -> str:
    task_id = str(uuid.uuid4())[:8]
    self.tasks[task_id] = {"status": "running", "command": command}
    thread = threading.Thread(
        target=self._execute, args=(task_id, command), daemon=True)
    thread.start()
    return f"Background task {task_id} started"
```

**Bước 3.** Khi subprocess hoàn thành, thread nền đặt kết quả vào hàng đợi thông báo. Lock làm điều này an toàn ngay cả khi thread chính đang drain hàng đợi cùng lúc.

```python
def _execute(self, task_id, command):
    try:
        r = subprocess.run(command, shell=True, cwd=WORKDIR,
            capture_output=True, text=True, timeout=300)
        output = (r.stdout + r.stderr).strip()[:50000]
    except subprocess.TimeoutExpired:
        output = "Error: Timeout (300s)"
    with self._lock:
        self._notification_queue.append({
            "task_id": task_id, "result": output[:500]})
```

**Bước 4.** Vòng lặp agent drain thông báo trước mỗi lần gọi LLM. Đây là pattern drain-before-call: ngay trước khi bạn yêu cầu model suy nghĩ, quét lấy bất kỳ kết quả nền nào và thêm chúng vào cuộc hội thoại để model thấy chúng ở lượt tiếp theo.

```python
def agent_loop(messages: list):
    while True:
        notifs = BG.drain_notifications()
        if notifs:
            notif_text = "\n".join(
                f"[bg:{n['task_id']}] {n['result']}" for n in notifs)
            messages.append({"role": "user",
                "content": f"<background-results>\n{notif_text}\n"
                           f"</background-results>"})
            messages.append({"role": "assistant",
                "content": "Noted background results."})
        response = client.messages.create(...)
```

Demo giảng dạy này giữ vòng lặp cốt lõi đơn luồng; chỉ chờ subprocess được song song hóa. Một hệ thống production thường sẽ chia công việc nền thành nhiều làn runtime, nhưng bắt đầu với một pattern sạch sẽ duy nhất giúp cơ chế dễ theo dõi.

## Đọc Cùng Nhau

- Nếu bạn chưa hoàn toàn tách "mục tiêu tác vụ" khỏi "khe thực thi đang chạy," hãy đọc [`s13a-runtime-task-model.md`](./s13a-runtime-task-model.md) trước -- nó làm rõ tại sao bản ghi tác vụ và bản ghi runtime là các đối tượng khác nhau.
- Nếu bạn không chắc trạng thái nào thuộc `RuntimeTaskRecord` và trạng thái nào vẫn thuộc task board, hãy giữ [`data-structures.md`](./data-structures.md) ở gần.
- Nếu thực thi nền bắt đầu cảm thấy như "một vòng lặp chính khác," hãy quay lại [`s02b-tool-execution-runtime.md`](./s02b-tool-execution-runtime.md) và reset ranh giới: thực thi và chờ có thể chạy song song, nhưng vòng lặp chính vẫn là một mainline.

## Những Gì Đã Thay Đổi

| Thành phần     | Trước (s12)      | Sau (s13)                    |
|----------------|------------------|------------------------------|
| Công cụ        | 8                | 6 (base + background_run + check)|
| Thực thi       | Chỉ chặn         | Chặn + thread nền            |
| Thông báo      | Không có         | Hàng đợi drain mỗi vòng lặp  |
| Đồng thời      | Không có         | Daemon thread                |

## Thử Ngay

```sh
cd learn-claude-code
python agents/s13_background_tasks.py
```

1. `Run "sleep 5 && echo done" in the background, then create a file while it runs`
2. `Start 3 background tasks: "sleep 2", "sleep 4", "sleep 6". Check their status.`
3. `Run pytest in the background and keep working on other things`

## Những Gì Bạn Đã Thành Thạo

Tại điểm này, bạn có thể:

- Chạy các subprocess chậm trên daemon thread mà không chặn vòng lặp agent chính
- Thu thập kết quả qua hàng đợi thông báo thread-safe
- Tiêm kết quả nền vào cuộc hội thoại sử dụng pattern drain-before-call
- Để agent làm việc khác trong khi các lệnh chạy lâu hoàn thành song song

## Tiếp Theo Là Gì

Các tác vụ nền giải quyết vấn đề công việc chậm bắt đầu ngay. Nhưng còn công việc nên bắt đầu sau thì sao -- "chạy cái này mỗi đêm" hoặc "nhắc tôi sau 30 phút"? Trong s14 bạn sẽ thêm bộ lập lịch cron lưu trữ ý định tương lai và kích hoạt nó khi đến thời điểm.

## Bài Học Chính

> Thực thi nền là một làn runtime, không phải vòng lặp chính thứ hai -- công việc chậm chạy trên daemon thread và đưa kết quả trở lại qua một hàng đợi thông báo duy nhất.
