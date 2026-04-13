# s00f: Thứ Tự Đọc Code (Code Reading Order)

> **Deep Dive** -- Đọc khi bạn sắp mở các tệp agent Python và muốn chiến lược để đọc chúng.

Trang này không phải về đọc nhiều code hơn. Nó trả lời câu hỏi hẹp hơn: khi thứ tự chương đã ổn định, thứ tự sạch nhất để đọc code của repository này mà không xáo trộn mô hình tinh thần lại là gì?

## Kết Luận Trước

Đừng đọc code như thế này:

- đừng bắt đầu với tệp dài nhất
- đừng nhảy thẳng vào chương "nâng cao" nhất
- đừng mở `web/` trước rồi đoán dòng chính
- đừng coi tất cả tệp `agents/*.py` như một pool nguồn phẳng

Quy tắc ổn định đơn giản:

**đọc code theo cùng thứ tự với chương trình giảng dạy.**

Bên trong mỗi tệp chương, giữ cùng thứ tự đọc:

1. cấu trúc trạng thái
2. định nghĩa hoặc đăng ký công cụ
3. hàm đẩy tiến một lượt
4. entry CLI cuối cùng

## Tại Sao Trang Này Tồn Tại

Bạn có lẽ sẽ không bị lạc trong văn xuôi trước. Bạn sẽ bị lạc khi cuối cùng mở code và ngay lập tức bắt đầu quét những thứ sai.

Sai lầm điển hình:

- nhìn chằm chằm vào nửa dưới của tệp dài trước
- đọc đống helper `run_*` trước khi biết chúng kết nối ở đâu
- nhảy vào các chương nền tảng muộn và coi chương sớm là "quá đơn giản"
- sụp đổ `task`, `runtime task`, `teammate`, và `worktree` trở lại thành một ý tưởng mơ hồ

## Sử Dụng Cùng Template Đọc Cho Mọi Tệp Agent

Cho bất kỳ `agents/sXX_*.py`, đọc theo thứ tự này:

### 1. Header tệp

Trả lời hai câu hỏi trước bất kỳ thứ gì khác:

- chương này đang dạy gì
- nó cố ý chưa dạy gì

### 2. Cấu trúc trạng thái hoặc lớp manager

Tìm những thứ như:

- `LoopState`
- `PlanningState`
- `CompactState`
- `TaskManager`
- `BackgroundManager`
- `TeammateManager`
- `WorktreeManager`

### 3. Danh sách hoặc đăng ký công cụ

Tìm:

- `TOOLS`
- `TOOL_HANDLERS`
- `build_tool_pool()`
- các entrypoint `run_*` quan trọng

### 4. Hàm đẩy tiến lượt

Thường là một trong:

- `run_one_turn(...)`
- `agent_loop(...)`
- `handle_*` riêng cho chương

### 5. Entry CLI cuối cùng

`if __name__ == "__main__"` quan trọng, nhưng không nên là thứ đầu tiên bạn nghiên cứu.

## Giai Đoạn 1: `s01-s06`

Giai đoạn này là xương sống agent đơn đang hình thành.

| Chương | Tệp | Đọc Trước | Sau Đó Đọc | Xác Nhận Trước Khi Tiếp |
|---|---|---|---|---|
| `s01` | `agents/s01_agent_loop.py` | `LoopState` | `TOOLS` -> `execute_tool_calls()` -> `run_one_turn()` -> `agent_loop()` | Bạn có thể truy vết `messages -> model -> tool_result -> lượt tiếp` |
| `s02` | `agents/s02_tool_use.py` | `safe_path()` | tool handler -> `TOOL_HANDLERS` -> `agent_loop()` | Bạn hiểu cách công cụ phát triển mà không viết lại vòng lặp |
| `s03` | `agents/s03_todo_write.py` | kiểu trạng thái lập kế hoạch | đường dẫn handler todo -> tiêm nhắc nhở -> `agent_loop()` | Bạn hiểu trạng thái lập kế hoạch phiên nhìn thấy được |
| `s04` | `agents/s04_subagent.py` | `AgentTemplate` | `run_subagent()` -> `agent_loop()` cha | Bạn hiểu subagent chủ yếu là cô lập ngữ cảnh |
| `s05` | `agents/s05_skill_loading.py` | kiểu đăng ký skill | phương thức đăng ký -> `agent_loop()` | Bạn hiểu phát hiện nhẹ, tải sâu |
| `s06` | `agents/s06_context_compact.py` | `CompactState` | persist / micro compact / history compact -> `agent_loop()` | Bạn hiểu nén di chuyển chi tiết thay vì xóa tính liên tục |

## Giai Đoạn 2: `s07-s11`

Giai đoạn này củng cố control plane xung quanh agent đơn hoạt động.

| Chương | Tệp | Đọc Trước | Sau Đó Đọc | Xác Nhận Trước Khi Tiếp |
|---|---|---|---|---|
| `s07` | `agents/s07_permission_system.py` | validator / manager | đường dẫn quyền hạn -> `run_bash()` -> `agent_loop()` | Bạn hiểu cổng trước thực thi |
| `s08` | `agents/s08_hook_system.py` | `HookManager` | đăng ký và điều phối hook -> `agent_loop()` | Bạn hiểu điểm mở rộng cố định |
| `s09` | `agents/s09_memory_system.py` | manager bộ nhớ | đường dẫn lưu -> xây dựng prompt -> `agent_loop()` | Bạn hiểu bộ nhớ như lớp thông tin dài hạn |
| `s10` | `agents/s10_system_prompt.py` | `SystemPromptBuilder` | xây dựng nhắc nhở -> `agent_loop()` | Bạn hiểu lắp ráp đầu vào như pipeline |
| `s11` | `agents/s11_error_recovery.py` | helper nén / backoff | nhánh phục hồi -> `agent_loop()` | Bạn hiểu tiếp tục sau thất bại |

## Giai Đoạn 3: `s12-s14`

Giai đoạn này biến harness thành work runtime.

| Chương | Tệp | Đọc Trước | Sau Đó Đọc | Xác Nhận Trước Khi Tiếp |
|---|---|---|---|---|
| `s12` | `agents/s12_task_system.py` | `TaskManager` | tạo tác vụ / phụ thuộc / mở khóa -> `agent_loop()` | Bạn hiểu mục tiêu công việc lâu dài |
| `s13` | `agents/s13_background_tasks.py` | `NotificationQueue` / `BackgroundManager` | đăng ký nền -> drain thông báo -> `agent_loop()` | Bạn hiểu khe runtime |
| `s14` | `agents/s14_cron_scheduler.py` | `CronLock` / `CronScheduler` | khớp cron -> trigger -> `agent_loop()` | Bạn hiểu điều kiện khởi chạy tương lai |

## Giai Đoạn 4: `s15-s19`

Giai đoạn này về ranh giới nền tảng.

| Chương | Tệp | Đọc Trước | Sau Đó Đọc | Xác Nhận Trước Khi Tiếp |
|---|---|---|---|---|
| `s15` | `agents/s15_agent_teams.py` | `MessageBus` / `TeammateManager` | roster / inbox / loop -> `agent_loop()` | Bạn hiểu đồng đội liên tục |
| `s16` | `agents/s16_team_protocols.py` | `RequestStore` / `TeammateManager` | handler yêu cầu -> `agent_loop()` | Bạn hiểu yêu cầu-phản hồi cộng `request_id` |
| `s17` | `agents/s17_autonomous_agents.py` | helper nhận và danh tính | đường dẫn nhận -> đường dẫn tiếp tục -> `agent_loop()` | Bạn hiểu kiểm tra idle -> nhận an toàn -> tiếp tục công việc |
| `s18` | `agents/s18_worktree_task_isolation.py` | `TaskManager` / `WorktreeManager` / `EventBus` | vòng đời worktree -> `agent_loop()` | Bạn hiểu mục tiêu vs làn thực thi |
| `s19` | `agents/s19_mcp_plugin.py` | cổng khả năng / MCP client / plugin loader / router | xây dựng pool công cụ -> định tuyến -> chuẩn hóa -> `agent_loop()` | Bạn hiểu cách khả năng bên ngoài vào cùng control plane |

## Vòng Lặp Doc + Code Tốt Nhất

Cho mỗi chương:

1. đọc văn xuôi chương
2. đọc ghi chú cầu nối cho chương đó
3. mở tệp `agents/sXX_*.py` tương ứng
4. theo thứ tự: trạng thái -> công cụ -> trình đẩy lượt -> entry CLI
5. chạy demo một lần
6. viết lại phiên bản nhỏ nhất từ đầu

## Bài Học Chính

**Thứ tự đọc code phải tuân theo thứ tự giảng dạy: đọc ranh giới trước, sau đó trạng thái, sau đó đường dẫn đẩy tiến vòng lặp.**
