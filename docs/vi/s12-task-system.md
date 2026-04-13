# s12: Hệ Thống Tác Vụ (Task System)

`s01 > s02 > s03 > s04 > s05 > s06 > s07 > s08 > s09 > s10 > s11 > [ s12 ] > s13 > s14 > s15 > s16 > s17 > s18 > s19`

## Bạn Sẽ Học Được

- Cách nâng cấp một checklist phẳng thành một đồ thị tác vụ với các phụ thuộc rõ ràng
- Cách các cạnh `blockedBy` và `blocks` thể hiện thứ tự và song song
- Cách các chuyển đổi trạng thái (`pending` -> `in_progress` -> `completed`) thúc đẩy mở khóa tự động
- Cách lưu trữ tác vụ vào đĩa giúp chúng tồn tại qua nén và khởi động lại

Trong s03, bạn đã cho agent một công cụ TodoWrite -- một checklist phẳng theo dõi những gì đã xong và những gì chưa. Điều đó hoạt động tốt cho một phiên tập trung duy nhất. Nhưng công việc thực sự có cấu trúc. Tác vụ B phụ thuộc vào tác vụ A. Tác vụ C và D có thể chạy song song. Tác vụ E chờ cả C và D. Một danh sách phẳng không thể thể hiện bất kỳ điều nào trong số đó. Và vì checklist chỉ sống trong bộ nhớ, nén ngữ cảnh (s06) xóa sạch nó. Trong chương này bạn sẽ thay thế checklist bằng một đồ thị tác vụ thực sự hiểu các phụ thuộc, lưu trữ vào đĩa và trở thành xương sống phối hợp cho mọi thứ tiếp theo.

## Vấn Đề

Hãy tưởng tượng bạn yêu cầu agent của mình tái cấu trúc một codebase: phân tích AST, chuyển đổi các node, phát code mới và chạy test. Bước phân tích phải hoàn thành trước khi chuyển đổi và phát có thể bắt đầu. Chuyển đổi và phát có thể chạy song song. Test phải chờ cả hai. Với TodoWrite phẳng của s03, agent không có cách thể hiện các mối quan hệ này. Nó có thể thực hiện chuyển đổi trước khi phân tích xong, hoặc chạy test trước khi bất cứ thứ gì sẵn sàng. Không có thứ tự, không theo dõi phụ thuộc, và không có trạng thái ngoài "xong hay không." Tệ hơn, nếu cửa sổ ngữ cảnh lấp đầy và nén khởi động, toàn bộ kế hoạch biến mất.

## Giải Pháp

Nâng cấp checklist thành một đồ thị tác vụ lưu trữ vào đĩa. Mỗi tác vụ là một tệp JSON với trạng thái, phụ thuộc (`blockedBy`) và dependents (`blocks`). Đồ thị trả lời ba câu hỏi bất kỳ lúc nào: cái gì sẵn sàng, cái gì bị chặn, và cái gì đã xong.

```
.tasks/
  task_1.json  {"id":1, "status":"completed"}
  task_2.json  {"id":2, "blockedBy":[1], "status":"pending"}
  task_3.json  {"id":3, "blockedBy":[1], "status":"pending"}
  task_4.json  {"id":4, "blockedBy":[2,3], "status":"pending"}

Đồ thị tác vụ (DAG):
                 +----------+
            +--> | task 2   | --+
            |    | pending  |   |
+----------+     +----------+    +--> +----------+
| task 1   |                          | task 4   |
| completed| --> +----------+    +--> | blocked  |
+----------+     | task 3   | --+     +----------+
                 | pending  |
                 +----------+

Thứ tự:   task 1 phải hoàn thành trước 2 và 3
Song song: tasks 2 và 3 có thể chạy cùng lúc
Phụ thuộc: task 4 chờ cả 2 và 3
Trạng thái: pending -> in_progress -> completed
```

Cấu trúc trên là một DAG -- directed acyclic graph (đồ thị có hướng không chu trình), nghĩa là các tác vụ chảy tiến và không bao giờ vòng lại. Đồ thị tác vụ này trở thành xương sống phối hợp cho các chương sau: thực thi nền (s13), đội nhóm agent (s15+) và phân lập worktree (s18) tất cả đều xây dựng trên cùng cấu trúc tác vụ lâu dài.

## Cách Hoạt Động

**Bước 1.** Tạo một `TaskManager` lưu trữ một tệp JSON trên mỗi tác vụ, với các hoạt động CRUD và một đồ thị phụ thuộc.

```python
class TaskManager:
    def __init__(self, tasks_dir: Path):
        self.dir = tasks_dir
        self.dir.mkdir(exist_ok=True)
        self._next_id = self._max_id() + 1

    def create(self, subject, description=""):
        task = {"id": self._next_id, "subject": subject,
                "status": "pending", "blockedBy": [],
                "blocks": [], "owner": ""}
        self._save(task)
        self._next_id += 1
        return json.dumps(task, indent=2)
```

**Bước 2.** Triển khai giải quyết phụ thuộc. Khi một tác vụ hoàn thành, xóa ID của nó khỏi danh sách `blockedBy` của mọi tác vụ khác, tự động mở khóa các dependents.

```python
def _clear_dependency(self, completed_id):
    for f in self.dir.glob("task_*.json"):
        task = json.loads(f.read_text())
        if completed_id in task.get("blockedBy", []):
            task["blockedBy"].remove(completed_id)
            self._save(task)
```

**Bước 3.** Kết nối các chuyển đổi trạng thái và cạnh phụ thuộc trong phương thức `update`. Khi trạng thái một tác vụ thay đổi thành `completed`, logic xóa phụ thuộc từ Bước 2 kích hoạt tự động.

```python
def update(self, task_id, status=None,
           add_blocked_by=None, add_blocks=None):
    task = self._load(task_id)
    if status:
        task["status"] = status
        if status == "completed":
            self._clear_dependency(task_id)
    self._save(task)
```

**Bước 4.** Đăng ký bốn công cụ tác vụ trong dispatch map, cung cấp cho agent toàn quyền kiểm soát việc tạo, cập nhật, liệt kê và kiểm tra các tác vụ.

```python
TOOL_HANDLERS = {
    # ...công cụ cơ sở...
    "task_create": lambda **kw: TASKS.create(kw["subject"]),
    "task_update": lambda **kw: TASKS.update(kw["task_id"], kw.get("status")),
    "task_list":   lambda **kw: TASKS.list_all(),
    "task_get":    lambda **kw: TASKS.get(kw["task_id"]),
}
```

Từ s12 trở đi, đồ thị tác vụ trở thành mặc định cho công việc đa bước lâu dài. Todo của s03 vẫn hữu ích cho các checklist phiên đơn nhanh, nhưng bất cứ thứ gì cần thứ tự, song song hoặc lưu trữ thuộc về đây.

## Đọc Cùng Nhau

- Nếu bạn đến thẳng từ s03, hãy xem lại [`data-structures.md`](./data-structures.md) để tách `TodoItem` / `PlanState` khỏi `TaskRecord` -- chúng trông tương tự nhưng phục vụ các mục đích khác nhau.
- Nếu ranh giới đối tượng bắt đầu mờ nhạt, hãy reset với [`entity-map.md`](./entity-map.md) trước khi bạn trộn lẫn messages, tasks, runtime tasks và teammates vào một lớp.
- Nếu bạn dự định tiếp tục vào s13, hãy giữ [`s13a-runtime-task-model.md`](./s13a-runtime-task-model.md) bên cạnh chương này vì các cặp tác vụ lâu dài và tác vụ runtime là cặp dễ nhầm lẫn nhất tiếp theo.

## Những Gì Đã Thay Đổi

| Thành phần | Trước (s06) | Sau (s12) |
|---|---|---|
| Công cụ | 5 | 8 (`task_create/update/list/get`) |
| Mô hình lập kế hoạch | Checklist phẳng (trong bộ nhớ) | Đồ thị tác vụ với phụ thuộc (trên đĩa) |
| Mối quan hệ | Không có | Cạnh `blockedBy` + `blocks` |
| Theo dõi trạng thái | Xong hay không | `pending` -> `in_progress` -> `completed` |
| Lưu trữ | Mất khi nén | Tồn tại qua nén và khởi động lại |

## Thử Ngay

```sh
cd learn-claude-code
python agents/s12_task_system.py
```

1. `Create 3 tasks: "Setup project", "Write code", "Write tests". Make them depend on each other in order.`
2. `List all tasks and show the dependency graph`
3. `Complete task 1 and then list tasks to see task 2 unblocked`
4. `Create a task board for refactoring: parse -> transform -> emit -> test, where transform and emit can run in parallel after parse`

## Những Gì Bạn Đã Thành Thạo

Tại điểm này, bạn có thể:

- Xây dựng một đồ thị tác vụ dựa trên tệp nơi mỗi tác vụ là một bản ghi JSON tự chứa
- Thể hiện thứ tự và song song thông qua các cạnh phụ thuộc `blockedBy` và `blocks`
- Triển khai mở khóa tự động khi các tác vụ upstream hoàn thành
- Lưu trữ trạng thái lập kế hoạch để nó tồn tại qua nén ngữ cảnh và khởi động lại tiến trình

## Tiếp Theo Là Gì

Các tác vụ bây giờ có cấu trúc và sống trên đĩa. Nhưng mọi lần gọi công cụ vẫn chặn vòng lặp chính -- nếu một tác vụ liên quan đến một subprocess chậm như `npm install` hoặc `pytest`, agent ngồi không chờ. Trong s13 bạn sẽ thêm thực thi nền để công việc chậm chạy song song trong khi agent tiếp tục suy nghĩ.

## Bài Học Chính

> Một đồ thị tác vụ với các phụ thuộc rõ ràng biến một checklist phẳng thành một cấu trúc phối hợp biết cái gì sẵn sàng, cái gì bị chặn, và cái gì có thể chạy song song.
