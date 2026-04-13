[English](../../README.md) | [中文](../../README-zh.md) | [日本語](../../README-ja.md) | [Tiếng Việt](./README-vi.md)

# Learn Claude Code (Học Claude Code)

Kho tài liệu giảng dạy dành cho những ai muốn xây dựng một harness (bộ khung) agent code hoàn chỉnh từ đầu.

Repo này không cố gắng phản chiếu mọi chi tiết sản phẩm từ một codebase production. Nó tập trung vào các cơ chế thực sự quyết định liệu một agent có thể hoạt động tốt hay không:

- vòng lặp (loop)
- công cụ (tools)
- lập kế hoạch (planning)
- ủy thác (delegation)
- kiểm soát ngữ cảnh (context control)
- quyền hạn (permissions)
- hook
- bộ nhớ (memory)
- lắp ráp prompt (prompt assembly)
- tác vụ (tasks)
- đội nhóm (teams)
- làn thực thi riêng biệt (isolated execution lanes)
- định tuyến năng lực ngoài (external capability routing)

Mục tiêu rất đơn giản:

**hiểu rõ kiến trúc thiết kế cốt lõi đủ để bạn có thể tự xây dựng lại nó.**

## Repo Này Thực Sự Đang Dạy Gì

Một câu trước:

**Model thực hiện suy luận. Harness cung cấp cho model một môi trường làm việc.**

Môi trường làm việc đó được tạo thành từ một vài phần phối hợp với nhau:

- `Agent Loop`: hỏi model, chạy công cụ, gắn kết quả, tiếp tục
- `Tools`: đôi tay của agent
- `Planning`: cấu trúc nhỏ giúp công việc đa bước không bị lạc hướng
- `Context Management`: giữ ngữ cảnh đang hoạt động nhỏ gọn và nhất quán
- `Permissions`: không để ý định của model trực tiếp trở thành thực thi không an toàn
- `Hooks`: mở rộng hành vi xung quanh vòng lặp mà không cần viết lại vòng lặp
- `Memory`: chỉ giữ lại những sự kiện lâu dài đáng tồn tại qua các phiên
- `Prompt Construction`: lắp ráp đầu vào của model từ các quy tắc ổn định và trạng thái thời gian chạy
- `Tasks / Teams / Worktree / MCP`: phát triển lõi agent đơn lên thành nền tảng làm việc lớn hơn

Đây là cam kết giảng dạy của repo:

- dạy luồng chính theo thứ tự rõ ràng
- giải thích các khái niệm xa lạ trước khi dựa vào chúng
- bám sát cấu trúc hệ thống thực tế
- tránh làm người học chìm đắm trong các chi tiết sản phẩm không liên quan

## Những Gì Repo Này Cố Ý Không Dạy

Repo này không cố gắng gìn giữ mọi chi tiết có thể tồn tại trong một hệ thống production thực tế.

Nếu một chi tiết không phải trung tâm của mô hình vận hành cốt lõi của agent, nó không nên chiếm đóng con đường giảng dạy. Điều đó bao gồm những thứ như:

- cơ chế đóng gói và phát hành
- lớp tương thích đa nền tảng
- keo dính chính sách doanh nghiệp
- kết nối telemetry và tài khoản
- nhánh tương thích lịch sử
- tai nạn đặt tên đặc thù sản phẩm

Những chi tiết đó có thể quan trọng trong production. Chúng không thuộc về trung tâm của con đường giảng dạy từ 0 đến 1.

## Đây Là Tài Liệu Dành Cho Ai

Người đọc được giả định:

- biết Python cơ bản
- hiểu hàm, lớp, danh sách và từ điển
- có thể hoàn toàn mới với hệ thống agent

Vì vậy repo cố gắng giữ một vài quy tắc giảng dạy mạnh mẽ:

- giải thích một khái niệm trước khi sử dụng nó
- giữ một khái niệm được giải thích đầy đủ ở một nơi chính
- bắt đầu từ "nó là gì", rồi "tại sao nó tồn tại", rồi "cách triển khai nó"
- tránh buộc người mới tự lắp ráp hệ thống từ các mảnh rải rác

## Thứ Tự Đọc Được Đề Xuất

Tài liệu tiếng Anh được thiết kế để tự đứng vững. Thứ tự chương, tài liệu cầu nối và bản đồ cơ chế được căn chỉnh theo tất cả các ngôn ngữ, vì vậy bạn có thể ở trong một ngôn ngữ trong khi theo dõi con đường học tập chính.

- Tổng quan: [`docs/vi/s00-architecture-overview.md`](./s00-architecture-overview.md)
- Thứ tự đọc code: [`docs/vi/s00f-code-reading-order.md`](./s00f-code-reading-order.md)
- Thuật ngữ: [`docs/vi/glossary.md`](./glossary.md)
- Phạm vi giảng dạy: [`docs/vi/teaching-scope.md`](./teaching-scope.md)
- Cấu trúc dữ liệu: [`docs/vi/data-structures.md`](./data-structures.md)

## Nếu Đây Là Lần Đầu Bạn Ghé Thăm, Bắt Đầu Từ Đây

Đừng mở các chương ngẫu nhiên trước.

Con đường an toàn nhất là:

1. Đọc [`docs/vi/s00-architecture-overview.md`](./s00-architecture-overview.md) để có bản đồ toàn hệ thống.
2. Đọc [`docs/vi/s00d-chapter-order-rationale.md`](./s00d-chapter-order-rationale.md) để thứ tự chương có ý nghĩa trước khi bạn đi sâu vào chi tiết cơ chế.
3. Đọc [`docs/vi/s00f-code-reading-order.md`](./s00f-code-reading-order.md) để biết file nào mở trước.
4. Theo dõi bốn giai đoạn theo thứ tự: `s01-s06 -> s07-s11 -> s12-s14 -> s15-s19`.
5. Sau mỗi giai đoạn, dừng lại và tự xây dựng lại phiên bản nhỏ nhất trước khi tiếp tục.

Nếu các chương giữa và cuối bắt đầu mờ nhạt, đặt lại theo thứ tự này:

1. [`docs/vi/data-structures.md`](./data-structures.md)
2. [`docs/vi/entity-map.md`](./entity-map.md)
3. các tài liệu cầu nối gần nhất với chương bạn đang bị kẹt
4. rồi quay lại thân chương

## Giao Diện Học Web

Nếu bạn muốn cách hiểu thứ tự chương, ranh giới giai đoạn và nâng cấp chương-sang-chương trực quan hơn, hãy chạy trang web giảng dạy tích hợp:

```sh
cd web
npm install
npm run dev
```

Sau đó sử dụng các route này:

- `/en`: trang nhập tiếng Anh để chọn con đường đọc
- `/en/timeline`: chế độ xem sạch nhất của toàn bộ luồng chính
- `/en/layers`: bản đồ ranh giới bốn giai đoạn
- `/en/compare`: so sánh bước liền kề và chẩn đoán nhảy cóc

Cho lần đọc đầu tiên, hãy bắt đầu với `timeline`.  
Nếu bạn đã ở giữa và ranh giới chương đang trở nên mờ nhạt, hãy sử dụng `layers` và `compare` trước khi đi sâu hơn vào mã nguồn.

### Tài Liệu Cầu Nối

Đây không phải là các chương chính bổ sung. Chúng là các tài liệu cầu nối giúp hệ thống giữa và cuối dễ hiểu hơn:

- Lý do thứ tự chương: [`docs/vi/s00d-chapter-order-rationale.md`](./s00d-chapter-order-rationale.md)
- Thứ tự đọc code: [`docs/vi/s00f-code-reading-order.md`](./s00f-code-reading-order.md)
- Bản đồ module tham chiếu: [`docs/vi/s00e-reference-module-map.md`](./s00e-reference-module-map.md)
- Mặt phẳng điều khiển truy vấn: [`docs/vi/s00a-query-control-plane.md`](./s00a-query-control-plane.md)
- Vòng đời một yêu cầu: [`docs/vi/s00b-one-request-lifecycle.md`](./s00b-one-request-lifecycle.md)
- Mô hình chuyển đổi truy vấn: [`docs/vi/s00c-query-transition-model.md`](./s00c-query-transition-model.md)
- Mặt phẳng điều khiển công cụ: [`docs/vi/s02a-tool-control-plane.md`](./s02a-tool-control-plane.md)
- Runtime thực thi công cụ: [`docs/vi/s02b-tool-execution-runtime.md`](./s02b-tool-execution-runtime.md)
- Pipeline tin nhắn và prompt: [`docs/vi/s10a-message-prompt-pipeline.md`](./s10a-message-prompt-pipeline.md)
- Mô hình tác vụ runtime: [`docs/vi/s13a-runtime-task-model.md`](./s13a-runtime-task-model.md)
- Các lớp năng lực MCP: [`docs/vi/s19a-mcp-capability-layers.md`](./s19a-mcp-capability-layers.md)
- Mô hình làn tác vụ nhóm: [`docs/vi/team-task-lane-model.md`](./team-task-lane-model.md)
- Bản đồ thực thể: [`docs/vi/entity-map.md`](./entity-map.md)

### Bốn Giai Đoạn

1. `s01-s06`: xây dựng lõi agent đơn hữu ích
2. `s07-s11`: thêm an toàn, điểm mở rộng, bộ nhớ, lắp ráp prompt và phục hồi
3. `s12-s14`: biến lập kế hoạch phiên tạm thời thành công việc runtime lâu dài
4. `s15-s19`: tiến vào đội nhóm, giao thức, tự chủ, thực thi riêng biệt và định tuyến năng lực ngoài

### Các Chương Chính

| Chương | Chủ đề | Bạn nhận được gì |
|---|---|---|
| `s00` | Tổng quan kiến trúc | bản đồ toàn cầu, thuật ngữ chính và thứ tự học |
| `s01` | Agent Loop | vòng lặp agent nhỏ nhất hoạt động được |
| `s02` | Tool Use | lớp dispatch công cụ ổn định |
| `s03` | Todo / Planning | kế hoạch phiên có thể nhìn thấy |
| `s04` | Subagent | ngữ cảnh mới cho từng subtask được ủy thác |
| `s05` | Skills | tải kiến thức chuyên biệt chỉ khi cần |
| `s06` | Context Compact | giữ cửa sổ đang hoạt động nhỏ |
| `s07` | Permission System | cổng an toàn trước khi thực thi |
| `s08` | Hook System | điểm mở rộng xung quanh vòng lặp |
| `s09` | Memory System | kiến thức lâu dài qua các phiên |
| `s10` | System Prompt | lắp ráp prompt theo từng phần |
| `s11` | Error Recovery | nhánh tiếp tục và thử lại |
| `s12` | Task System | đồ thị tác vụ liên tục |
| `s13` | Background Tasks | thực thi không chặn |
| `s14` | Cron Scheduler | trigger dựa trên thời gian |
| `s15` | Agent Teams | đồng đội liên tục |
| `s16` | Team Protocols | quy tắc phối hợp chung |
| `s17` | Autonomous Agents | tự nhận và tự tiếp tục |
| `s18` | Worktree Isolation | làn thực thi riêng biệt |
| `s19` | MCP & Plugin | định tuyến năng lực ngoài |

## Khởi Động Nhanh

```sh
git clone https://github.com/shareAI-lab/learn-claude-code
cd learn-claude-code
pip install -r requirements.txt
cp .env.example .env
```

Sau đó cấu hình `ANTHROPIC_API_KEY` hoặc endpoint tương thích trong `.env`, và chạy:

```sh
python agents/s01_agent_loop.py
python agents/s18_worktree_task_isolation.py
python agents/s19_mcp_plugin.py
python agents/s_full.py
```

Thứ tự gợi ý:

1. Chạy `s01` và đảm bảo vòng lặp tối thiểu thực sự hoạt động.
2. Đọc `s00`, rồi di chuyển qua `s01 -> s11` theo thứ tự.
3. Chỉ sau khi lõi agent đơn cùng mặt phẳng điều khiển của nó cảm thấy ổn định, hãy tiếp tục vào `s12 -> s19`.
4. Đọc `s_full.py` cuối cùng, sau khi các cơ chế đã có ý nghĩa riêng lẻ.

## Cách Đọc Từng Chương

Mỗi chương dễ tiếp thu hơn nếu bạn giữ cùng nhịp độ đọc:

1. vấn đề gì xuất hiện mà không có cơ chế này
2. khái niệm mới có nghĩa gì
3. triển khai đúng nhỏ nhất trông như thế nào
4. trạng thái thực sự sống ở đâu
5. nó kết nối trở lại vào vòng lặp như thế nào
6. nên dừng lại ở đâu trước, và những gì có thể chờ đến sau

Nếu bạn liên tục hỏi:

- "Đây là luồng chính hay chỉ là chi tiết phụ?"
- "Trạng thái này thực sự sống ở đâu?"

hãy quay lại:

- [`docs/vi/teaching-scope.md`](./teaching-scope.md)
- [`docs/vi/data-structures.md`](./data-structures.md)
- [`docs/vi/entity-map.md`](./entity-map.md)

## Cấu Trúc Kho

```text
learn-claude-code/
├── agents/              # các triển khai tham chiếu Python có thể chạy theo từng chương
├── docs/zh/             # tài liệu luồng chính tiếng Trung
├── docs/en/             # tài liệu tiếng Anh
├── docs/ja/             # tài liệu tiếng Nhật
├── docs/vi/             # tài liệu tiếng Việt
├── skills/              # file skill sử dụng trong s05
├── web/                 # nền tảng web giảng dạy
└── requirements.txt
```

## Trạng Thái Ngôn Ngữ

Tiếng Trung vẫn là luồng giảng dạy chuẩn và phiên bản cập nhật nhanh nhất.

- `zh`: được xem xét nhiều nhất và hoàn chỉnh nhất
- `en`: các chương chính cùng các tài liệu cầu nối lớn đã có
- `ja`: các chương chính cùng các tài liệu cầu nối lớn đã có
- `vi`: bản dịch tiếng Việt đầy đủ

Nếu bạn muốn con đường giải thích đầy đủ nhất và được tinh chỉnh thường xuyên nhất, hãy sử dụng tài liệu tiếng Trung trước.

## Mục Tiêu Cuối Cùng

Đến cuối repo, bạn nên có thể trả lời rõ ràng các câu hỏi này:

- trạng thái tối thiểu mà một agent code cần là gì?
- tại sao `tool_result` là trung tâm của vòng lặp?
- khi nào nên sử dụng subagent thay vì nhồi nhét thêm vào một ngữ cảnh?
- vấn đề gì mà permissions, hooks, memory, prompt assembly và tasks mỗi cái giải quyết?
- khi nào một hệ thống agent đơn nên phát triển thành tasks, teams, worktrees và MCP?

Nếu bạn có thể trả lời rõ ràng những câu hỏi đó và tự xây dựng một hệ thống tương tự, repo này đã hoàn thành nhiệm vụ của nó.
