# s14: Bộ Lập Lịch Cron (Cron Scheduler)

`s01 > s02 > s03 > s04 > s05 > s06 > s07 > s08 > s09 > s10 > s11 > s12 > s13 > [ s14 ] > s15 > s16 > s17 > s18 > s19`

## Bạn Sẽ Học Được

- Cách các bản ghi lịch lưu trữ ý định tương lai dưới dạng dữ liệu lâu dài
- Cách bộ kiểm tra dựa trên thời gian biến biểu thức cron thành thông báo được kích hoạt
- Sự khác biệt giữa công việc lâu dài (tồn tại qua khởi động lại) và công việc chỉ phiên (chết cùng tiến trình)
- Cách công việc theo lịch quay lại hệ thống agent qua cùng hàng đợi thông báo từ s13

Trong s13 bạn đã học cách chạy công việc chậm ở nền để agent không bị chặn. Nhưng công việc đó vẫn bắt đầu ngay lập tức -- người dùng nói "chạy cái này" và nó chạy bây giờ. Quy trình làm việc thực tế thường cần công việc bắt đầu sau: "chạy cái này mỗi đêm," "tạo báo cáo mỗi sáng thứ Hai," "nhắc tôi kiểm tra lại sau 30 phút." Không có lập lịch, người dùng phải phát lại cùng yêu cầu mỗi lần. Chương này thêm một ý tưởng mới: lưu ý định tương lai bây giờ, kích hoạt nó sau. Và nó kết thúc Giai Đoạn 3 bằng cách hoàn thành tiến trình từ tác vụ lâu dài (s12) đến thực thi nền (s13) đến trigger dựa trên thời gian (s14).

## Vấn Đề

Agent của bạn bây giờ có thể quản lý đồ thị tác vụ và chạy lệnh ở nền. Nhưng mọi phần công việc bắt đầu với người dùng yêu cầu rõ ràng. Nếu người dùng muốn chạy test hàng đêm, họ phải nhớ gõ "run the tests" mỗi tối. Nếu họ muốn báo cáo tình trạng hàng tuần, họ phải mở phiên mỗi sáng thứ Hai. Agent không có khái niệm về thời gian tương lai -- nó phản ứng với những gì bạn nói ngay bây giờ, và nó không thể hành động trên thứ gì đó bạn muốn xảy ra ngày mai. Bạn cần một cách để ghi lại "làm X vào thời điểm Y" và để hệ thống kích hoạt nó tự động.

## Giải Pháp

Thêm ba phần chuyển động: bản ghi lịch mô tả khi nào và cái gì, bộ kiểm tra thời gian chạy ở nền và kiểm tra liệu lịch nào khớp với thời gian hiện tại, và cùng hàng đợi thông báo từ s13 để đưa công việc được kích hoạt trở lại vào vòng lặp chính.

```text
schedule_create(...)
  ->
ghi bản ghi lịch lâu dài
  ->
bộ kiểm tra thời gian thức dậy và kiểm tra "quy tắc này có khớp bây giờ không?"
  ->
nếu có, thêm thông báo theo lịch vào hàng đợi
  ->
vòng lặp chính tiêm thông báo đó như công việc mới
```

Quan sát chính là bộ lập lịch không phải là vòng lặp agent thứ hai. Nó đưa các prompt được kích hoạt vào cùng hệ thống mà agent đã sử dụng. Vòng lặp chính không biết hoặc không quan tâm liệu phần công việc đến từ người dùng gõ nó hay từ trigger cron -- nó xử lý cả hai theo cùng cách.

## Cách Hoạt Động

**Bước 1.** Xác định bản ghi lịch. Mỗi công việc lưu trữ một biểu thức cron (cú pháp khớp thời gian ngắn gọn như `0 9 * * 1` có nghĩa "9:00 sáng mỗi thứ Hai"), prompt cần thực thi, liệu nó lặp lại hay chỉ kích hoạt một lần, và dấu thời gian `last_fired_at` để ngăn kích hoạt hai lần.

```python
schedule = {
    "id": "job_001",
    "cron": "0 9 * * 1",
    "prompt": "Run the weekly status report.",
    "recurring": True,
    "durable": True,
    "created_at": 1710000000.0,
    "last_fired_at": None,
}
```

Công việc lâu dài được ghi vào đĩa và tồn tại qua khởi động lại tiến trình. Công việc chỉ phiên sống trong bộ nhớ và chết khi agent thoát. Công việc một lần (`recurring: False`) kích hoạt một lần và sau đó tự xóa.

**Bước 2.** Tạo lịch qua lần gọi công cụ. Phương thức lưu trữ bản ghi và trả nó lại để model có thể xác nhận những gì đã được lên lịch.

```python
def create(self, cron_expr: str, prompt: str, recurring: bool = True):
    job = {
        "id": new_id(),
        "cron": cron_expr,
        "prompt": prompt,
        "recurring": recurring,
        "created_at": time.time(),
        "last_fired_at": None,
    }
    self.jobs.append(job)
    return job
```

**Bước 3.** Chạy vòng lặp kiểm tra nền thức dậy mỗi 60 giây và kiểm tra mỗi lịch so với thời gian hiện tại.

```python
def check_loop(self):
    while True:
        now = datetime.now()
        self.check_jobs(now)
        time.sleep(60)
```

**Bước 4.** Khi lịch khớp, thêm thông báo vào hàng đợi. Trường `last_fired_at` được cập nhật để ngăn cùng phút kích hoạt công việc hai lần.

```python
def check_jobs(self, now):
    for job in self.jobs:
        if cron_matches(job["cron"], now):
            self.queue.put({
                "type": "scheduled_prompt",
                "schedule_id": job["id"],
                "prompt": job["prompt"],
            })
            job["last_fired_at"] = now.timestamp()
```

**Bước 5.** Đưa thông báo theo lịch trở lại vòng lặp chính sử dụng cùng pattern drain từ s13. Từ góc nhìn agent, một prompt theo lịch trông giống hệt tin nhắn người dùng.

```python
notifications = scheduler.drain()
for item in notifications:
    messages.append({
        "role": "user",
        "content": f"[scheduled:{item['schedule_id']}] {item['prompt']}",
    })
```

## Đọc Cùng Nhau

- Nếu `schedule`, `task` và `runtime task` vẫn cảm thấy như cùng một đối tượng, hãy đọc lại [`s13a-runtime-task-model.md`](./s13a-runtime-task-model.md) -- nó vẽ ranh giới giữa bản ghi lập kế hoạch, bản ghi thực thi và bản ghi lịch.
- Nếu bạn muốn thấy cách một trigger cuối cùng quay lại mainline, hãy ghép chương này với [`s00b-one-request-lifecycle.md`](./s00b-one-request-lifecycle.md).
- Nếu trigger tương lai bắt đầu cảm thấy như cả một hệ thống thực thi thứ hai, hãy reset với [`data-structures.md`](./data-structures.md) và tách bản ghi lịch khỏi bản ghi runtime.

## Những Gì Đã Thay Đổi

| Cơ chế | Câu hỏi chính |
|---|---|
| Tác vụ nền (s13) | "Công việc chậm tiếp tục mà không chặn như thế nào?" |
| Lập lịch (s14) | "Khi nào công việc tương lai nên bắt đầu?" |

| Thành phần | Trước (s13) | Sau (s14) |
|---|---|---|
| Công cụ | 6 (base + background) | 8 (+ schedule_create, schedule_list, schedule_delete) |
| Nhận thức thời gian | Không có | Trigger tương lai dựa trên cron |
| Lưu trữ | Tác vụ nền trong bộ nhớ | Lịch lâu dài tồn tại qua khởi động lại |
| Mô hình trigger | Chỉ do người dùng khởi tạo | Do người dùng + kích hoạt theo thời gian |

## Thử Ngay

```sh
cd learn-claude-code
python agents/s14_cron_scheduler.py
```

1. Tạo lịch lặp lại: `Schedule "echo hello" to run every 2 minutes`
2. Tạo nhắc nhở một lần: `Remind me in 1 minute to check the build`
3. Tạo theo dõi bị trì hoãn: `In 5 minutes, run the test suite and report results`

## Những Gì Bạn Đã Thành Thạo

Tại điểm này, bạn có thể:

- Xác định bản ghi lịch lưu trữ ý định tương lai dưới dạng dữ liệu lâu dài
- Chạy bộ kiểm tra thời gian nền khớp biểu thức cron với đồng hồ hiện tại
- Phân biệt công việc lâu dài (lưu trữ vào đĩa) từ công việc chỉ phiên (trong bộ nhớ)
- Đưa trigger theo lịch trở lại vào vòng lặp chính qua cùng hàng đợi thông báo được sử dụng bởi tác vụ nền
- Ngăn kích hoạt hai lần với theo dõi `last_fired_at`

## Giai Đoạn 3 Hoàn Thành

Bạn đã hoàn thành Giai đoạn 3: lớp thực thi và lập lịch. Nhìn lại ba chương cùng nhau:

- **s12** cho agent một đồ thị tác vụ với phụ thuộc và lưu trữ -- nó có thể lập kế hoạch công việc có cấu trúc tồn tại qua khởi động lại.
- **s13** thêm thực thi nền -- công việc chậm chạy song song thay vì chặn vòng lặp.
- **s14** thêm trigger dựa trên thời gian -- agent có thể lên lịch công việc tương lai mà người dùng không cần phải nhớ.

Cùng nhau, ba chương này biến đổi agent từ thứ gì chỉ phản ứng với những gì bạn gõ ngay bây giờ thành thứ gì có thể lập kế hoạch trước, làm việc song song, và hành động theo lịch riêng. Trong Giai đoạn 4 (s15-s18), bạn sẽ sử dụng nền tảng này để điều phối nhiều agent làm việc như một nhóm.

## Bài Học Chính

> Bộ lập lịch lưu trữ ý định tương lai dưới dạng bản ghi, kiểm tra nó so với đồng hồ trong vòng lặp nền, và đưa công việc được kích hoạt trở lại vào cùng hệ thống agent -- không cần vòng lặp thứ hai.
