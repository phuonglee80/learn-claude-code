# Mô Hình Nhóm-Tác Vụ-Làn (Team Task Lane Model)

> **Deep Dive** -- Đọc tốt nhất khi bắt đầu Giai đoạn 4 (s15-s18). Nó tách năm khái niệm trông giống nhau nhưng sống trên lớp khác nhau.

### Khi Nào Đọc

Trước khi bạn bắt đầu các chương nhóm. Giữ nó mở làm tham chiếu trong s15-s18.

---

> Khi bạn đến `s15-s18`, thứ dễ bị mờ nhạt nhất không phải tên hàm.
>
> Mà là:
>
> **Ai đang làm việc, ai đang phối hợp, cái gì ghi lại mục tiêu, và cái gì cung cấp làn thực thi.**

## Tài Liệu Cầu Nối Này Sửa Gì

Xuyên suốt `s15-s18`, bạn sẽ gặp những từ này có thể dễ dàng mờ nhạt thành một ý tưởng chung:

- đồng đội
- yêu cầu giao thức
- tác vụ
- tác vụ runtime
- worktree

Tất cả liên quan đến công việc được hoàn thành, nhưng chúng **không** sống trên cùng lớp.

Nếu bạn không tách chúng, các chương sau bắt đầu cảm thấy chồng chéo:

- Đồng đội có phải cùng thứ với tác vụ?
- Sự khác biệt giữa `request_id` và `task_id` là gì?
- Worktree có phải chỉ là tác vụ runtime khác?
- Tại sao tác vụ có thể hoàn thành trong khi worktree vẫn được giữ?

Tài liệu này tồn tại để tách các lớp đó sạch sẽ.

## Thứ Tự Đọc Khuyến Nghị

1. Đọc [`s15-agent-teams.md`](./s15-agent-teams.md) cho đồng đội tồn tại lâu.
2. Đọc [`s16-team-protocols.md`](./s16-team-protocols.md) cho phối hợp yêu cầu-phản hồi có theo dõi.
3. Đọc [`s17-autonomous-agents.md`](./s17-autonomous-agents.md) cho đồng đội tự nhận công việc.
4. Đọc [`s18-worktree-task-isolation.md`](./s18-worktree-task-isolation.md) cho làn thực thi cô lập.

Nếu từ vựng bắt đầu mờ nhạt, bạn có thể thấy hữu ích khi xem lại:

- [`entity-map.md`](./entity-map.md)
- [`data-structures.md`](./data-structures.md)
- [`s13a-runtime-task-model.md`](./s13a-runtime-task-model.md)

## Phân Tách Cốt Lõi

```text
đồng đội
  = ai tham gia theo thời gian

yêu cầu giao thức
  = một yêu cầu phối hợp được theo dõi bên trong nhóm

tác vụ
  = cái gì nên được làm

tác vụ runtime / khe thực thi
  = cái gì đang chạy tích cực ngay bây giờ

worktree
  = nơi công việc thực thi mà không va chạm với làn khác
```

Nhầm lẫn phổ biến nhất là giữa ba cái cuối:

- `tác vụ`
- `tác vụ runtime`
- `worktree`

Hỏi ba câu hỏi riêng biệt mỗi lần:

- Đây là mục tiêu?
- Đây là đơn vị thực thi đang chạy?
- Đây là thư mục thực thi cô lập?

## Sơ Đồ Sạch Nhỏ Nhất

```text
Lớp Nhóm
  đồng đội: alice (frontend)

Lớp Giao Thức
  request_id=req_01
  kind=plan_approval
  status=pending

Lớp Đồ Thị Công Việc
  task_id=12
  subject="Triển khai trang đăng nhập"
  owner="alice"
  status="in_progress"

Lớp Runtime
  runtime_id=rt_01
  type=in_process_teammate
  status=running

Lớp Làn Thực Thi
  worktree=login-page
  path=.worktrees/login-page
  status=active
```

Chỉ một trong những bản ghi đó ghi lại mục tiêu công việc bản thân:

> `task_id=12`

Các cái khác hỗ trợ phối hợp, thực thi, hoặc cô lập xung quanh mục tiêu đó.

## 1. Đồng Đội: Ai Đang Cộng Tác

Giới thiệu trong `s15`.

Lớp này trả lời:

- worker tồn tại lâu được gọi là gì
- vai trò nào nó có
- nó đang `working`, `idle`, hay `shutdown`
- nó có inbox riêng không

Ví dụ:

```python
member = {
    "name": "alice",
    "role": "frontend",
    "status": "idle",
}
```

Điểm không phải "instance agent khác."

Điểm là:

> danh tính liên tục có thể nhận công việc liên tục.

## 2. Yêu Cầu Giao Thức: Cái Gì Đang Được Phối Hợp

Giới thiệu trong `s16`.

Lớp này trả lời:

- ai hỏi ai
- đây là loại yêu cầu gì
- nó vẫn đang chờ hay đã giải quyết

Ví dụ:

```python
request = {
    "request_id": "a1b2c3d4",
    "kind": "plan_approval",
    "from": "alice",
    "to": "lead",
    "status": "pending",
}
```

Đây không phải chat thông thường.

Đó là:

> bản ghi phối hợp mà trạng thái có thể tiếp tục phát triển.

## 3. Tác Vụ: Cái Gì Nên Được Làm

Đây là tác vụ đồ thị công việc lâu dài từ `s12`, và là thứ đồng đội `s17` nhận.

Nó trả lời:

- mục tiêu là gì
- ai sở hữu nó
- cái gì chặn nó
- trạng thái tiến trình là gì

Ví dụ:

```python
task = {
    "id": 12,
    "subject": "Implement login page",
    "status": "in_progress",
    "owner": "alice",
    "blockedBy": [],
}
```

Từ khóa:

**mục tiêu**

Không phải thư mục. Không phải giao thức. Không phải tiến trình.

## 4. Tác Vụ Runtime / Khe Thực Thi: Cái Gì Đang Chạy

Lớp này đã được làm rõ trong tài liệu cầu nối `s13a`, nhưng nó quan trọng hơn nhiều trong `s15-s18`.

Ví dụ:

- lệnh shell nền
- đồng đội tồn tại lâu đang làm việc
- tiến trình monitor theo dõi trạng thái bên ngoài

Được hiểu tốt nhất như:

> khe thực thi đang hoạt động

Ví dụ:

```python
runtime = {
    "id": "rt_01",
    "type": "in_process_teammate",
    "status": "running",
    "work_graph_task_id": 12,
}
```

Ranh giới quan trọng:

- một tác vụ đồ thị công việc có thể spawn nhiều tác vụ runtime
- tác vụ runtime là instance thực thi, không phải mục tiêu lâu dài bản thân

## 5. Worktree: Nơi Công Việc Xảy Ra

Giới thiệu trong `s18`.

Lớp này trả lời:

- thư mục cô lập nào được sử dụng
- tác vụ nào nó ràng buộc
- làn đó `active`, `kept`, hay `removed`

Ví dụ:

```python
worktree = {
    "name": "login-page",
    "path": ".worktrees/login-page",
    "task_id": 12,
    "status": "active",
}
```

Từ khóa:

**ranh giới thực thi**

Đó không phải mục tiêu tác vụ bản thân. Đó là làn cô lập nơi mục tiêu đó được thực thi.

## Cách Các Lớp Kết Nối

```text
đồng đội
  phối hợp qua yêu cầu giao thức
  nhận tác vụ
  chạy như khe thực thi
  làm việc bên trong làn worktree
```

Trong câu cụ thể hơn:

> `alice` nhận `tác vụ #12` và đẩy tiến nó bên trong làn worktree `login-page`.

Câu đó sạch hơn nhiều so với nói:

> "alice đang làm tác vụ worktree login-page"

vì câu ngắn hơn hợp nhất sai:

- đồng đội
- tác vụ
- worktree

## Sai Lầm Phổ Biến

### 1. Coi đồng đội và tác vụ là cùng đối tượng

Đồng đội thực thi. Tác vụ thể hiện mục tiêu.

### 2. Coi `request_id` và `task_id` là thay thế được

Một theo dõi phối hợp. Cái kia theo dõi mục tiêu công việc.

### 3. Coi khe runtime là tác vụ lâu dài

Thực thi đang chạy có thể kết thúc trong khi tác vụ lâu dài vẫn tồn tại.

### 4. Coi worktree là tác vụ bản thân

Worktree chỉ là làn thực thi.

### 5. Nói "hệ thống làm việc song song" mà không gọi tên các lớp

Giảng dạy tốt không dừng ở "có nhiều agent."

Nó có thể nói rõ ràng:

> đồng đội cung cấp cộng tác tồn tại lâu, yêu cầu theo dõi phối hợp, tác vụ ghi lại mục tiêu, khe runtime mang thực thi, và worktree cô lập thư mục thực thi.

## Bạn Nên Nói Được Gì Sau Khi Đọc

1. Tự chủ `s17` nhận tác vụ đồ thị công việc `s12`, không phải khe runtime `s13`.
2. Worktree `s18` ràng buộc làn thực thi vào tác vụ; chúng không biến tác vụ thành thư mục.
3. Đồng đội có thể idle trong khi tác vụ vẫn tồn tại và worktree vẫn được giữ.
4. Yêu cầu giao thức theo dõi trao đổi phối hợp, không phải mục tiêu công việc.

## Bài Học Chính

**Năm thứ nghe giống nhau -- đồng đội, yêu cầu giao thức, tác vụ, khe runtime, worktree -- sống trên năm lớp riêng biệt. Gọi tên lớp bạn muốn nói là cách bạn giữ các chương nhóm không sụp đổ vào nhầm lẫn.**
