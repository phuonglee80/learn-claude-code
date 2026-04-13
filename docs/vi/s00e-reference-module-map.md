# s00e: Bản Đồ Module Tham Chiếu (Reference Module Map)

> **Deep Dive** -- Đọc khi bạn muốn xác minh cách các chương giảng dạy ánh xạ đến codebase production thực sự.

Đây là ghi chú hiệu chuẩn cho người bảo trì và người học nghiêm túc. Nó không biến nguồn đã reverse-engineer thành tài liệu bắt buộc đọc. Thay vào đó, nó trả lời một câu hỏi hẹp nhưng quan trọng: nếu bạn so sánh các cụm module tín hiệu cao trong repo tham chiếu với repo giảng dạy này, thứ tự chương hiện tại có thực sự hợp lý?

## Kết Luận Trước

Có.

Thứ tự `s01 -> s19` hiện tại đúng đại thể, và nó gần với xương sống thiết kế thực hơn bất kỳ thứ tự "theo cây nguồn" ngây thơ nào.

Lý do đơn giản:

- repo tham chiếu chứa nhiều thư mục cấp bề mặt
- nhưng trọng lượng thiết kế thực tập trung trong bộ module kiểm soát, trạng thái, tác vụ, nhóm, worktree và khả năng nhỏ hơn
- các module đó khớp với đường dẫn giảng dạy bốn giai đoạn hiện tại

Nên hành động đúng **không phải** san phẳng repo giảng dạy thành thứ tự cây nguồn.

Hành động đúng là:

- giữ thứ tự theo phụ thuộc hiện tại
- làm ánh xạ đến repo tham chiếu rõ ràng
- tiếp tục loại bỏ chi tiết sản phẩm thấp giá trị từ dòng chính

## Cách So Sánh Được Thực Hiện

So sánh dựa trên các cụm tín hiệu cao hơn của repo tham chiếu, đặc biệt các module xung quanh:

- `Tool.ts`
- `state/AppStateStore.ts`
- `coordinator/coordinatorMode.ts`
- `memdir/*`
- `services/SessionMemory/*`
- `services/toolUseSummary/*`
- `constants/prompts.ts`
- `tasks/*`
- `tools/TodoWriteTool/*`
- `tools/AgentTool/*`
- `tools/ScheduleCronTool/*`
- `tools/EnterWorktreeTool/*`
- `tools/ExitWorktreeTool/*`
- `tools/MCPTool/*`
- `services/mcp/*`
- `plugins/*`
- `hooks/toolPermission/*`

Đây đủ để đánh giá xương sống mà không kéo bạn qua mọi lệnh hướng sản phẩm, nhánh tương thích, hay chi tiết UI.

## Ánh Xạ Thực Sự

| Cụm repo tham chiếu | Ví dụ điển hình | Chương giảng dạy | Tại sao vị trí này đúng |
|---|---|---|---|
| Vòng lặp truy vấn + trạng thái kiểm soát | `Tool.ts`, `AppStateStore.ts`, trạng thái query/coordinator | `s00`, `s00a`, `s00b`, `s01`, `s11` | Hệ thống thực không chỉ là `messages[] + while True`. Repo giảng dạy đúng khi bắt đầu với vòng lặp nhỏ trước, sau đó thêm control plane sau. |
| Định tuyến công cụ và mặt phẳng thực thi | `Tool.ts`, công cụ native, ngữ cảnh công cụ, trợ giúp thực thi | `s02`, `s02a`, `s02b` | Nguồn rõ ràng coi công cụ như bề mặt thực thi chung, không phải bảng điều phối đồ chơi. Phân chia giảng dạy đúng. |
| Lập kế hoạch phiên | `TodoWriteTool` | `s03` | Lập kế hoạch phiên là lớp nhỏ nhưng trung tâm. Nó thuộc sớm, trước tác vụ lâu dài. |
| Ủy thác một lần | `AgentTool` ở dạng đơn giản nhất | `s04` | Máy móc spawn agent của repo tham chiếu lớn, nhưng repo giảng dạy đúng khi dạy subagent sạch nhỏ nhất trước: ngữ cảnh mới, tác vụ giới hạn, trả về tóm tắt. |
| Phát hiện và tải skill | `DiscoverSkillsTool`, `skills/*`, phần prompt | `s05` | Skill không phải bổ sung ngẫu nhiên. Đó là lớp tải kiến thức chọn lọc, nên thuộc trước khi áp lực prompt và ngữ cảnh trở nên nghiêm trọng. |
| Áp lực ngữ cảnh và sụp đổ | `services/toolUseSummary/*`, `services/contextCollapse/*`, logic nén | `s06` | Repo tham chiếu rõ ràng có máy móc nén rõ ràng. Dạy trước tính năng nền tảng sau là đúng. |
| Cổng quyền hạn | `types/permissions.ts`, `hooks/toolPermission/*`, handler phê duyệt | `s07` | An toàn thực thi là cổng riêng biệt, không phải "chỉ là hook khác". Giữ trước hook là lựa chọn giảng dạy đúng. |
| Hook và tác dụng phụ | `types/hooks.ts`, runner hook, tích hợp vòng đời | `s08` | Nguồn tách điểm mở rộng khỏi cổng chính. Dạy chúng sau quyền hạn bảo toàn ranh giới đó. |
| Chọn lọc bộ nhớ lâu dài | `memdir/*`, `services/SessionMemory/*`, trợ giúp trích xuất/chọn bộ nhớ | `s09` | Nguồn làm bộ nhớ thành lớp xuyên phiên có chọn lọc, không phải sổ tay chung. Dạy trước lắp ráp prompt là đúng. |
| Lắp ráp prompt | `constants/prompts.ts`, phần prompt, tải prompt bộ nhớ | `s10`, `s10a` | Nguồn xây dựng đầu vào từ nhiều phần. Repo giảng dạy đúng khi trình bày lắp ráp prompt như pipeline thay vì một chuỗi khổng lồ. |
| Phục hồi và tiếp tục | lý do chuyển đổi truy vấn, nhánh retry, retry nén, phục hồi token | `s11`, `s00c` | Repo tham chiếu có logic tiếp tục rõ ràng. Thuộc sau khi vòng lặp, công cụ, nén, quyền hạn, bộ nhớ, và lắp ráp prompt đã tồn tại. |
| Đồ thị công việc lâu dài | bản ghi tác vụ, khái niệm task board, mở khóa phụ thuộc | `s12` | Repo giảng dạy đúng khi tách mục tiêu công việc lâu dài khỏi lập kế hoạch phiên tạm thời. |
| Tác vụ runtime trực tiếp | `tasks/types.ts`, `LocalShellTask`, `LocalAgentTask`, `RemoteAgentTask`, `MonitorMcpTask` | `s13`, `s13a` | Nguồn có union tác vụ runtime rõ ràng. Điều này xác nhận mạnh mẽ phân chia giảng dạy giữa `TaskRecord` và `RuntimeTaskState`. |
| Trigger theo lịch | `ScheduleCronTool/*`, `useScheduledTasks` | `s14` | Lập lịch xuất hiện sau khi công việc runtime tồn tại, chính xác là thứ tự phụ thuộc đúng. |
| Đồng đội liên tục | `InProcessTeammateTask`, công cụ nhóm, đăng ký agent | `s15` | Nguồn rõ ràng phát triển từ subagent một lần thành actor lâu dài. Dạy đồng đội sau là đúng. |
| Phối hợp nhóm có cấu trúc | bao bì tin nhắn, luồng gửi-tin-nhắn, theo dõi yêu cầu, chế độ coordinator | `s16` | Giao thức chỉ có ý nghĩa sau khi actor lâu dài tồn tại. Thứ tự hiện tại khớp phụ thuộc thực. |
| Nhận tự chủ và tiếp tục | chế độ coordinator, nhận tác vụ, vòng đời worker async, logic tiếp tục | `s17` | Tự chủ trong nguồn không phải phép thuật. Nó xếp lớp trên actor, tác vụ, và quy tắc phối hợp. Vị trí hiện tại đúng. |
| Làn thực thi worktree | `EnterWorktreeTool`, `ExitWorktreeTool`, trợ giúp worktree agent | `s18` | Repo tham chiếu coi worktree như ranh giới làn thực thi với logic đóng. Dạy sau tác vụ và đồng đội ngăn sụp đổ khái niệm. |
| Bus khả năng bên ngoài | `MCPTool`, `services/mcp/*`, `plugins/*`, tài nguyên/prompt/công cụ MCP | `s19`, `s19a` | Nguồn rõ ràng đặt MCP và plugin ở ranh giới nền tảng bên ngoài. Giữ cuối cùng là lựa chọn giảng dạy đúng. |

## Các Điểm Xác Nhận Quan Trọng Nhất

Repo tham chiếu xác nhận mạnh mẽ năm lựa chọn giảng dạy.

### 1. `s03` nên ở trước `s12`

Nguồn chứa cả:

- lập kế hoạch phiên nhỏ
- máy móc tác vụ/runtime lâu dài lớn hơn

Đó không phải cùng một thứ.

Repo giảng dạy đúng khi dạy:

`lập kế hoạch phiên trước -> tác vụ lâu dài sau`

### 2. `s09` nên ở trước `s10`

Nguồn xây dựng đầu vào model từ nhiều nguồn, bao gồm bộ nhớ.

Có nghĩa:

- bộ nhớ là một nguồn đầu vào
- lắp ráp prompt là pipeline kết hợp nguồn

Nên bộ nhớ nên được giải thích trước lắp ráp prompt.

### 3. `s12` phải ở trước `s13`

Union tác vụ runtime trong repo tham chiếu là một trong những bằng chứng mạnh nhất trong toàn bộ so sánh.

Nó cho thấy:

- định nghĩa công việc lâu dài
- thực thi đang chạy trực tiếp

phải giữ tách biệt về khái niệm.

Nếu `s13` đến trước, bạn gần như chắc chắn hợp nhất hai lớp đó.

### 4. `s15 -> s16 -> s17` là thứ tự đúng

Nguồn có:

- actor lâu dài
- phối hợp có cấu trúc
- hành vi tiếp tục / nhận tự chủ

Tự chủ phụ thuộc vào hai cái đầu. Nên thứ tự hiện tại đúng.

### 5. `s18` nên ở trước `s19`

Repo tham chiếu coi cô lập worktree như cơ chế ranh giới thực thi cục bộ.

Điều đó nên được hiểu trước khi bạn được yêu cầu suy luận về:

- nhà cung cấp khả năng bên ngoài
- server MCP
- bề mặt được cài đặt bởi plugin

Nếu không khả năng bên ngoài trông trung tâm hơn thực sự.

## Repo Giảng Dạy Nên Vẫn Tránh Sao Chép Gì

Repo tham chiếu chứa nhiều thứ thực, nhưng vẫn không nên thống trị dòng giảng dạy chính:

- Bề mặt lệnh CLI
- Chi tiết render UI
- Nhánh telemetry và analytics
- Keo tích hợp sản phẩm
- Dây nối remote và enterprise
- Code tương thích dành riêng nền tảng
- Trivia đặt tên từng dòng

Đó là chi tiết triển khai hợp lệ.

Chúng không phải trung tâm đúng của đường dẫn giảng dạy 0-đến-1.

## Repo Giảng Dạy Phải Cẩn Thận Hơn Ở Đâu

Ánh xạ cũng tiết lộ vài nơi mọi thứ có thể dễ trôi vào nhầm lẫn.

### 1. Đừng hợp nhất subagent và đồng đội thành một khái niệm mơ hồ

`AgentTool` của repo tham chiếu bao gồm:

- ủy thác một lần
- worker async/nền
- worker liên tục giống đồng đội
- worker cô lập worktree

Đó chính xác là lý do repo giảng dạy nên chia câu chuyện qua:

- `s04`
- `s15`
- `s17`
- `s18`

### 2. Đừng dạy worktree là "chỉ là thủ thuật git"

Nguồn cho thấy đóng, tiếp tục, dọn dẹp, và trạng thái cô lập xung quanh worktree.

Nên `s18` nên tiếp tục dạy:

- danh tính làn
- ràng buộc tác vụ
- đóng keep/remove
- vấn đề tiếp tục và dọn dẹp

không chỉ `git worktree add`.

### 3. Đừng giảm MCP thành "công cụ từ xa"

Nguồn bao gồm:

- công cụ
- tài nguyên
- prompt
- trạng thái elicitation / kết nối
- trung gian plugin

Nên `s19` nên giữ đường dẫn giảng dạy công-cụ-trước, nhưng vẫn giải thích ranh giới bus khả năng rộng hơn.

## Đánh Giá Cuối Cùng

So sánh với các cụm module tín hiệu cao trong repo tham chiếu, thứ tự chương hiện tại hợp lý.

Các lợi ích chất lượng lớn nhất còn lại **không** đến từ thay đổi thứ tự lớn nữa.

Chúng đến từ:

- tài liệu cầu nối sạch hơn
- giải thích ranh giới thực thể mạnh hơn
- nhất quán đa ngôn ngữ chặt hơn
- trang web hiển thị cùng bản đồ học tập rõ ràng

## Bài Học Chính

**Thứ tự giảng dạy tốt nhất không phải thứ tự tệp xuất hiện trong repo. Đó là thứ tự mà phụ thuộc trở nên hiểu được cho người học muốn xây dựng lại hệ thống.**
