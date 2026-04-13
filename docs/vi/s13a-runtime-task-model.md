# s13a: Mô Hình Tác Vụ Runtime (Runtime Task Model)

> **Deep Dive** -- Đọc tốt nhất giữa s12 và s13. Nó ngăn nhầm lẫn phổ biến nhất trong Giai đoạn 3.

### Khi Nào Đọc

Ngay sau s12 (Hệ thống tác vụ), trước khi bạn bắt đầu s13 (Tác vụ nền). Ghi chú này tách hai nghĩa của "tác vụ" mà người mới bắt đầu thường xuyên sụp đổ thành một.

---

> Ghi chú cầu nối này giải quyết một nhầm lẫn trở nên tốn kém rất nhanh:
>
> **tác vụ trong đồ thị công việc không phải cùng thứ với tác vụ đang chạy hiện tại**

## Cách Đọc Với Dòng Chính

Ghi chú này hoạt động tốt nhất giữa các tài liệu này:

- đọc [`s12-task-system.md`](./s12-task-system.md) trước để khóa đồ thị công việc lâu dài
- sau đó đọc [`s13-background-tasks.md`](./s13-background-tasks.md) để thấy thực thi nền
- nếu thuật ngữ bắt đầu mờ nhạt, bạn có thể thấy hữu ích khi xem lại [`glossary.md`](./glossary.md)
- nếu bạn muốn các trường khớp chính xác, bạn có thể thấy hữu ích khi xem lại [`data-structures.md`](./data-structures.md) và [`entity-map.md`](./entity-map.md)

## Tại Sao Điều Này Cần Ghi Chú Cầu Nối Riêng

Dòng chính vẫn đúng:

- `s12` dạy hệ thống tác vụ
- `s13` dạy tác vụ nền

Nhưng không có thêm một lớp cầu nối, bạn có thể dễ dàng sụp đổ hai nghĩa khác nhau của "tác vụ" thành một.

Ví dụ:

- tác vụ đồ thị công việc như "triển khai module auth"
- thực thi nền như "chạy pytest"
- thực thi đồng đội như "alice đang chỉnh sửa tệp"

Cả ba có thể được gọi là tác vụ một cách tùy tiện, nhưng chúng không sống trên cùng lớp.

## Hai Loại Tác Vụ Rất Khác Nhau

### 1. Tác vụ đồ thị công việc

Đây là nút lâu dài được giới thiệu trong `s12`.

Nó trả lời:

- cái gì nên được làm
- công việc nào phụ thuộc vào công việc nào khác
- ai sở hữu nó
- trạng thái tiến trình là gì

Được hiểu tốt nhất như:

> đơn vị lâu dài của công việc đã lập kế hoạch

### 2. Tác vụ runtime

Lớp này trả lời:

- đơn vị thực thi nào đang sống ngay bây giờ
- đó là loại thực thi gì
- nó đang chạy, hoàn thành, thất bại hay bị kill
- đầu ra của nó nằm ở đâu

Được hiểu tốt nhất như:

> khe thực thi trực tiếp bên trong runtime

## Mô Hình Tinh Thần Tối Thiểu

Coi đây như hai bảng riêng biệt:

```text
tác vụ đồ thị công việc
  - lâu dài
  - hướng mục tiêu và phụ thuộc
  - vòng đời dài hơn

tác vụ runtime
  - hướng thực thi
  - hướng đầu ra và trạng thái
  - vòng đời ngắn hơn
```

Mối quan hệ của chúng không phải "chọn một."

Mà là:

```text
một tác vụ đồ thị công việc
  có thể spawn
một hoặc nhiều tác vụ runtime
```

Ví dụ:

```text
tác vụ đồ thị công việc:
  "Triển khai module auth"

tác vụ runtime:
  1. chạy test ở nền
  2. khởi chạy đồng đội coder
  3. giám sát dịch vụ bên ngoài
```

## Tại Sao Phân Biệt Quan Trọng

Nếu bạn không giữ các lớp này tách biệt, các chương sau bắt đầu chồng chéo:

- thực thi nền `s13` mờ nhạt vào task board `s12`
- công việc đồng đội `s15-s17` không có nơi sạch sẽ để gắn
- worktree `s18` trở nên không rõ ràng vì bạn không còn biết lớp nào chúng thuộc

Tóm tắt đúng ngắn nhất:

**tác vụ đồ thị công việc quản lý mục tiêu; tác vụ runtime quản lý thực thi**

## Bản Ghi Cốt Lõi

### 1. `WorkGraphTaskRecord`

Đây là tác vụ lâu dài từ `s12`.

```python
task = {
    "id": 12,
    "subject": "Implement auth module",
    "status": "in_progress",
    "blockedBy": [],
    "blocks": [13],
    "owner": "alice",
    "worktree": "auth-refactor",
}
```

### 2. `RuntimeTaskState`

Hình dạng giảng dạy tối thiểu có thể trông thế này:

```python
runtime_task = {
    "id": "b8k2m1qz",
    "type": "local_bash",
    "status": "running",
    "description": "Run pytest",
    "start_time": 1710000000.0,
    "end_time": None,
    "output_file": ".task_outputs/b8k2m1qz.txt",
    "notified": False,
}
```

Các trường then chốt:

- `type`: đơn vị thực thi này là gì
- `status`: nó đang hoạt động hay đã kết thúc
- `output_file`: kết quả được lưu ở đâu
- `notified`: hệ thống đã hiển thị kết quả chưa

### 3. `RuntimeTaskType`

Bạn không cần triển khai mọi loại trong repo giảng dạy ngay lập tức.

Nhưng bạn vẫn nên biết rằng tác vụ runtime là một họ, không chỉ một loại lệnh shell.

Bảng tối thiểu:

```text
local_bash
local_agent
remote_agent
in_process_teammate
monitor
workflow
```

## Các Bước Triển Khai Tối Thiểu

### Bước 1: giữ task board `s12` nguyên vẹn

Đừng quá tải nó.

### Bước 2: thêm runtime task manager riêng

```python
class RuntimeTaskManager:
    def __init__(self):
        self.tasks = {}
```

### Bước 3: tạo tác vụ runtime khi công việc nền bắt đầu

```python
def spawn_bash_task(command: str):
    task_id = new_runtime_id()
    runtime_tasks[task_id] = {
        "id": task_id,
        "type": "local_bash",
        "status": "running",
        "description": command,
    }
```

### Bước 4: tùy chọn liên kết thực thi runtime ngược lại đồ thị công việc

```python
runtime_tasks[task_id]["work_graph_task_id"] = 12
```

Bạn không cần trường đó ngày đầu, nhưng nó trở nên ngày càng quan trọng khi hệ thống đến nhóm và worktree.

## Hình Ảnh Bạn Nên Giữ

```text
Đồ Thị Công Việc
  tác vụ #12: Triển khai module auth
        |
        +-- tác vụ runtime A: local_bash (pytest)
        +-- tác vụ runtime B: local_agent (worker coder)
        +-- tác vụ runtime C: monitor (theo dõi trạng thái dịch vụ)

Lớp Tác Vụ Runtime
  A/B/C mỗi cái có:
  - ID runtime riêng
  - trạng thái riêng
  - đầu ra riêng
  - vòng đời riêng
```

## Cách Điều Này Kết Nối Đến Các Chương Sau

Khi lớp này rõ ràng, phần còn lại của các chương runtime và nền tảng trở nên dễ hơn nhiều:

- lệnh nền `s13` là tác vụ runtime
- đồng đội `s15-s17` cũng có thể được hiểu như biến thể tác vụ runtime
- worktree `s18` chủ yếu ràng buộc vào công việc lâu dài, nhưng vẫn ảnh hưởng thực thi runtime
- `s19` một số giám sát hoặc công việc bên ngoài async cũng có thể đáp xuống lớp runtime

Mỗi khi bạn thấy "thứ gì đó đang sống ở nền và đẩy tiến công việc," hãy hỏi hai câu:

- đây có phải mục tiêu lâu dài từ đồ thị công việc?
- hay đây là khe thực thi trực tiếp trong runtime?

## Sai Lầm Phổ Biến Người Mới Bắt Đầu

### 1. Đặt trạng thái shell nền trực tiếp vào task board

Điều đó trộn trạng thái tác vụ lâu dài và trạng thái thực thi runtime.

### 2. Giả định một tác vụ đồ thị công việc chỉ có thể có một tác vụ runtime

Trong hệ thống thực, một mục tiêu thường spawn nhiều đơn vị thực thi.

### 3. Dùng lại cùng từ vựng trạng thái cho cả hai lớp

Ví dụ:

- tác vụ lâu dài: `pending / in_progress / completed`
- tác vụ runtime: `running / completed / failed / killed`

Đó nên giữ riêng biệt khi có thể.

### 4. Bỏ qua trường chỉ-runtime như `output_file` và `notified`

Task board lâu dài không quan tâm nhiều đến chúng.
Lớp runtime quan tâm rất nhiều.

## Bài Học Chính

**"Tác vụ" nghĩa hai thứ khác nhau: mục tiêu lâu dài trong đồ thị công việc (cái gì nên được làm) và khe thực thi trực tiếp trong runtime (cái gì đang chạy bây giờ). Giữ chúng trên các lớp riêng biệt.**
