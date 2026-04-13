# s18: Cô Lập Worktree + Tác Vụ (Worktree + Task Isolation)

`s01 > s02 > s03 > s04 > s05 > s06 > s07 > s08 > s09 > s10 > s11 > s12 > s13 > s14 > s15 > s16 > s17 > [ s18 ] > s19`

## Bạn Sẽ Học Được
- Cách git worktree (bản sao cô lập của thư mục dự án, được quản lý bởi git) ngăn xung đột tệp giữa các agent chạy song song
- Cách ràng buộc tác vụ vào worktree chuyên dụng để "phải làm gì" và "làm ở đâu" được tách biệt sạch sẽ
- Cách các sự kiện vòng đời cho bạn bản ghi có thể quan sát của mọi hành động tạo, giữ và xóa
- Cách các làn thực thi song song cho phép nhiều agent làm việc trên các tác vụ khác nhau mà không bao giờ giẫm lên tệp của nhau

Khi hai agent cần chỉnh sửa cùng codebase cùng lúc, bạn có vấn đề. Mọi thứ bạn đã xây dựng cho đến nay -- task board, agent tự chủ, giao thức nhóm -- giả định rằng các agent làm việc trong một thư mục chia sẻ duy nhất. Điều đó hoạt động tốt cho đến khi không. Chương này cho mỗi tác vụ thư mục riêng, để công việc song song vẫn song song.

## Vấn Đề

Đến s17, các agent của bạn có thể nhận tác vụ, phối hợp qua giao thức nhóm, và hoàn thành công việc tự chủ. Nhưng tất cả đều chạy trong cùng thư mục dự án. Hãy tưởng tượng agent A đang tái cấu trúc module xác thực, và agent B đang xây dựng trang đăng nhập mới. Cả hai đều cần chạm vào `config.py`. Agent A stage các thay đổi, agent B stage các thay đổi khác vào cùng tệp, và bây giờ bạn có một mớ hỗn hợp lộn xộn các chỉnh sửa unstaged mà agent nào cũng không thể rollback sạch sẽ.

Task board theo dõi *phải làm gì* nhưng không có quan điểm về *làm ở đâu*. Bạn cần cách cho mỗi tác vụ thư mục làm việc cô lập riêng, để các thao tác cấp tệp không bao giờ va chạm. Cách sửa đơn giản: ghép nối mỗi tác vụ với một git worktree -- một checkout riêng biệt của cùng repository trên nhánh riêng. Tác vụ quản lý mục tiêu; worktree quản lý ngữ cảnh thực thi. Ràng buộc chúng bằng task ID.

## Đọc Cùng Nhau

- Nếu tác vụ, khe runtime và làn worktree đang mờ nhạt lại trong đầu bạn, [`team-task-lane-model.md`](./team-task-lane-model.md) tách chúng rõ ràng.
- Nếu bạn muốn xác nhận trường nào thuộc bản ghi tác vụ vs bản ghi worktree, [`data-structures.md`](./data-structures.md) có schema đầy đủ.
- Nếu bạn muốn xem tại sao chương này đến sau tác vụ và nhóm trong chương trình tổng thể, [`s00e-reference-module-map.md`](./s00e-reference-module-map.md) có lý do sắp xếp.

## Giải Pháp

Hệ thống chia thành hai mặt phẳng: một control plane (`.tasks/`) theo dõi mục tiêu, và một execution plane (`.worktrees/`) quản lý các thư mục cô lập. Mỗi tác vụ trỏ đến worktree của nó theo tên, và mỗi worktree trỏ ngược lại tác vụ theo ID.

```
Control plane (.tasks/)             Execution plane (.worktrees/)
+------------------+                +------------------------+
| task_1.json      |                | auth-refactor/         |
|   status: in_progress  <------>   branch: wt/auth-refactor
|   worktree: "auth-refactor"   |   task_id: 1             |
+------------------+                +------------------------+
| task_2.json      |                | ui-login/              |
|   status: pending    <------>     branch: wt/ui-login
|   worktree: "ui-login"       |   task_id: 2             |
+------------------+                +------------------------+
                                    |
                          index.json (đăng ký worktree)
                          events.jsonl (nhật ký vòng đời)

Máy trạng thái:
  Tác vụ:   pending -> in_progress -> completed
  Worktree: absent  -> active      -> removed | kept
```

## Cách Hoạt Động

**Bước 1.** Tạo tác vụ. Mục tiêu được ghi nhận trước, trước khi bất kỳ thư mục nào tồn tại.

```python
TASKS.create("Implement auth refactor")
# -> .tasks/task_1.json  status=pending  worktree=""
```

**Bước 2.** Tạo worktree và ràng buộc nó với tác vụ. Truyền `task_id` tự động đẩy tác vụ sang `in_progress` -- bạn không cần cập nhật trạng thái riêng.

```python
WORKTREES.create("auth-refactor", task_id=1)
# -> git worktree add -b wt/auth-refactor .worktrees/auth-refactor HEAD
# -> index.json nhận mục mới, task_1.json nhận worktree="auth-refactor"
```

Ràng buộc ghi trạng thái vào cả hai phía để bạn có thể duyệt mối quan hệ từ cả hai hướng:

```python
def bind_worktree(self, task_id, worktree):
    task = self._load(task_id)
    task["worktree"] = worktree
    if task["status"] == "pending":
        task["status"] = "in_progress"
    self._save(task)
```

**Bước 3.** Chạy lệnh trong worktree. Chi tiết quan trọng: `cwd` trỏ đến thư mục cô lập, không phải gốc dự án chính. Mọi thao tác tệp xảy ra trong sandbox không thể va chạm với worktree khác.

```python
subprocess.run(command, shell=True, cwd=worktree_path,
               capture_output=True, text=True, timeout=300)
```

**Bước 4.** Đóng worktree. Bạn có hai lựa chọn, tùy thuộc vào công việc đã xong hay chưa:

- `worktree_keep(name)` -- giữ thư mục cho sau (hữu ích khi tác vụ bị tạm dừng hoặc cần xem xét).
- `worktree_remove(name, complete_task=True)` -- xóa thư mục, đánh dấu tác vụ ràng buộc đã hoàn thành, và phát sự kiện. Một lần gọi xử lý teardown và hoàn thành cùng nhau.

```python
def remove(self, name, force=False, complete_task=False):
    self._run_git(["worktree", "remove", wt["path"]])
    if complete_task and wt.get("task_id") is not None:
        self.tasks.update(wt["task_id"], status="completed")
        self.tasks.unbind_worktree(wt["task_id"])
        self.events.emit("task.completed", ...)
```

**Bước 5.** Quan sát luồng sự kiện. Mọi bước vòng đời phát sự kiện có cấu trúc vào `.worktrees/events.jsonl`, cho bạn trail kiểm toán đầy đủ về những gì đã xảy ra và khi nào:

```json
{
  "event": "worktree.remove.after",
  "task": {"id": 1, "status": "completed"},
  "worktree": {"name": "auth-refactor", "status": "removed"},
  "ts": 1730000000
}
```

Các sự kiện được phát: `worktree.create.before/after/failed`, `worktree.remove.before/after/failed`, `worktree.keep`, `task.completed`.

Trong phiên bản giảng dạy, `.tasks/` cộng với `.worktrees/index.json` đủ để tái tạo trạng thái control-plane nhìn thấy được sau crash. Bài học quan trọng không phải mọi trường hợp biên production. Bài học quan trọng là trạng thái mục tiêu và trạng thái làn thực thi đều phải giữ dễ đọc trên đĩa.

## Những Gì Đã Thay Đổi Từ s17

| Thành phần         | Trước (s17)                  | Sau (s18)                                     |
|--------------------|------------------------------|-----------------------------------------------|
| Phối hợp           | Task board (owner/status)    | Task board + ràng buộc worktree rõ ràng       |
| Phạm vi thực thi   | Thư mục chia sẻ              | Thư mục cô lập phạm vi tác vụ                |
| Khả năng phục hồi  | Chỉ trạng thái tác vụ       | Trạng thái tác vụ + chỉ mục worktree         |
| Teardown           | Hoàn thành tác vụ            | Hoàn thành tác vụ + keep/remove rõ ràng      |
| Hiển thị vòng đời  | Ẩn trong log                 | Sự kiện rõ ràng trong `.worktrees/events.jsonl`|

## Thử Ngay

```sh
cd learn-claude-code
python agents/s18_worktree_task_isolation.py
```

1. `Create tasks for backend auth and frontend login page, then list tasks.`
2. `Create worktree "auth-refactor" for task 1, then bind task 2 to a new worktree "ui-login".`
3. `Run "git status --short" in worktree "auth-refactor".`
4. `Keep worktree "ui-login", then list worktrees and inspect events.`
5. `Remove worktree "auth-refactor" with complete_task=true, then list tasks/worktrees/events.`

## Những Gì Bạn Đã Thành Thạo

Tại điểm này, bạn có thể:

- Tạo git worktree cô lập để các agent song song không bao giờ tạo xung đột tệp
- Ràng buộc tác vụ với worktree bằng tham chiếu hai chiều (tác vụ trỏ đến tên worktree, worktree trỏ đến task ID)
- Chọn giữa giữ và xóa worktree khi đóng, với cập nhật trạng thái tác vụ tự động
- Đọc luồng sự kiện trong `events.jsonl` để hiểu vòng đời đầy đủ của mọi worktree

## Tiếp Theo Là Gì

Bạn bây giờ có các agent có thể làm việc hoàn toàn cô lập, mỗi cái trong thư mục riêng với nhánh riêng. Nhưng mọi khả năng chúng sử dụng -- bash, read, write, edit -- được cứng hóa trong harness Python. Trong s19, bạn sẽ học cách các chương trình bên ngoài có thể cung cấp khả năng mới qua MCP (Model Context Protocol), để agent có thể phát triển mà không thay đổi code cốt lõi.

## Bài Học Chính

> Tác vụ trả lời *công việc đang được làm là gì*; worktree trả lời *công việc đó chạy ở đâu*; giữ chúng tách biệt làm hệ thống song song dễ suy luận và phục hồi hơn nhiều.
