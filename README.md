[Tiếng Việt](./README.md) | [English](./README-en.md) | [中文](./README-zh.md) | [日本語](./README-ja.md)

# Học Claude Code (Learn Claude Code)

Một kho lưu trữ hướng dẫn dành cho những người phát triển muốn xây dựng một hệ thống coding-agent hoàn chỉnh từ con số 0.

Dự án này không cố gắng sao chép mọi chi tiết sản phẩm từ một mã nguồn thực tế. Thay vào đó, nó tập trung vào các cơ chế cốt lõi quyết định liệu một agent có thực sự hoạt động hiệu quả hay không:

*   **Vòng lặp (The Loop)**
*   **Công cụ (Tools)**
*   **Lập kế hoạch (Planning)**
*   **Ủy thác (Delegation)**
*   **Kiểm soát ngữ cảnh (Context control)**
*   **Quyền hạn (Permissions)**
*   **Hooks**
*   **Bộ nhớ (Memory)**
*   **Lắp ráp Prompt (Prompt assembly)**
*   **Nhiệm vụ (Tasks)**
*   **Đội ngũ (Teams)**
*   **Làn thực thi cô lập (Isolated execution lanes)**
*   **Định tuyến khả năng bên ngoài (External capability routing)**

Mục tiêu rất đơn giản:
> **Hiểu rõ khung xương thiết kế thực tế để bạn có thể tự mình xây dựng lại nó.**

---

## Dự án này thực sự dạy điều gì?

Tóm gọn trong một câu:
**Mô hình (Model) thực hiện suy luận. Hệ thống (Harness) cung cấp cho mô hình một môi trường làm việc.**

Môi trường làm việc đó được tạo thành từ một vài phần hợp tác với nhau:
- `Vòng lặp Agent`: hỏi mô hình, chạy công cụ, thêm kết quả, tiếp tục.
- `Công cụ`: "đôi tay" của agent.
- `Lập kế hoạch`: một cấu trúc nhỏ giúp công việc nhiều bước không bị lệch hướng.
- `Quản lý ngữ cảnh`: giữ cho ngữ cảnh hoạt động nhỏ gọn và mạch lạc.
- `Quyền hạn`: không để ý định của mô hình biến trực tiếp thành việc thực thi không an toàn.
- `Hooks`: mở rộng hành vi xung quanh vòng lặp mà không cần viết lại mã nguồn vòng lặp.
- `Bộ nhớ`: chỉ giữ lại những sự thật bền vững cần tồn tại qua các phiên làm việc.
- `Xây dựng Prompt`: lắp ráp đầu vào cho mô hình từ các quy tắc ổn định và trạng thái thời gian thực.
- `Tasks / Teams / Worktree / MCP`: phát triển từ lõi agent đơn lẻ thành một nền tảng làm việc lớn hơn.

**Lời hứa của dự án này:**
- Giảng dạy theo thứ tự logic, sạch sẽ.
- Giải thích các khái niệm lạ trước khi bắt đầu sử dụng chúng.
- Bám sát cấu trúc hệ thống thực tế.
- Tránh làm người học bị ngợp bởi các chi tiết sản phẩm không liên quan.

---

## Dự án này cố tình KHÔNG dạy điều gì?

Dự án này không cố gắng bảo tồn mọi chi tiết tồn tại trong một hệ thống sản xuất thực tế. Nếu một chi tiết không nằm ở trung tâm mô hình hoạt động của agent, nó sẽ không được đưa vào nội dung dạy chính. Điều đó bao gồm:
- Cơ chế đóng gói và phát hành.
- Các lớp tương thích đa nền tảng.
- Kết nối chính sách doanh nghiệp.
- Đo lường (telemetry) và kết nối tài khoản.
- Các nhánh tương thích lịch sử.
- Các tên gọi đặc thù của sản phẩm.

---

## Đối tượng hướng tới

Người đọc được giả định:
- Biết Python cơ bản.
- Hiểu về hàm, lớp (class), danh sách (list) và từ điển (dictionary).
- Có thể hoàn toàn mới đối với các hệ thống agent.

---

## Thứ tự đọc được đề xuất

Tài liệu tiếng Việt đã được bản địa hóa hoàn toàn. Thứ tự chương và bản đồ cơ chế được căn chỉnh trên tất cả các ngôn ngữ.

- Tổng quan kiến trúc: [`docs/vi/s00-architecture-overview.md`](./docs/vi/s00-architecture-overview.md)
- Thứ tự đọc mã nguồn: [`docs/vi/s00f-code-reading-order.md`](./docs/vi/s00f-code-reading-order.md)
- Thuật ngữ: [`docs/vi/glossary.md`](./docs/vi/glossary.md)
- Phạm vi giảng dạy: [`docs/vi/teaching-scope.md`](./docs/vi/teaching-scope.md)
- Cấu trúc dữ liệu: [`docs/vi/data-structures.md`](./docs/vi/data-structures.md)

### Nếu đây là lần đầu bạn ghé thăm, hãy bắt đầu từ đây:

1. Đọc [`docs/vi/s00-architecture-overview.md`](./docs/vi/s00-architecture-overview.md) để nắm bắt bản đồ hệ thống.
2. Đọc [`docs/vi/s00d-chapter-order-rationale.md`](./docs/vi/s00d-chapter-order-rationale.md) để hiểu tại sao các chương được sắp xếp như vậy.
3. Đọc [`docs/vi/s00f-code-reading-order.md`](./docs/vi/s00f-code-reading-order.md) để biết nên mở file nào trước.
4. Theo dõi 4 giai đoạn theo thứ tự: `s01-s06 -> s07-s11 -> s12-s14 -> s15-s19`.
5. Sau mỗi giai đoạn, hãy dừng lại và tự mình xây dựng lại phiên bản nhỏ nhất trước khi tiếp tục.

---

## Giao diện học tập Web

Nếu bạn muốn một cách trực quan hơn để hiểu thứ tự chương và các nâng cấp giữa các chương, hãy chạy trang web hướng dẫn tích hợp:

```sh
cd web
npm install
npm run dev
```

Sau đó sử dụng các đường dẫn này:
- `/vi`: trang bắt đầu tiếng Việt.
- `/vi/timeline`: cái nhìn rõ ràng nhất về lộ trình chính.
- `/vi/layers`: bản đồ ranh giới 4 giai đoạn.
- `/vi/compare`: so sánh các bước liền kề và chẩn đoán bước nhảy.

---

## Cấu trúc Repository

```text
learn-claude-code/
├── agents/              # Các triển khai tham chiếu Python có thể chạy được cho mỗi chương
├── docs/vi/             # Tài liệu hướng dẫn chính bằng tiếng Việt
├── docs/en/             # Tài liệu tiếng Anh
├── docs/zh/             # Tài liệu tiếng Trung
├── docs/ja/             # Tài liệu tiếng Nhật
├── skills/              # Các file kỹ năng được sử dụng trong s05
├── web/                 # Nền tảng giảng dạy Web (Next.js)
└── requirements.txt
```

---

## Mục tiêu cuối cùng

Khi kết thúc lộ trình này, bạn sẽ có thể trả lời rõ ràng các câu hỏi sau:
- Trạng thái tối thiểu mà một coding agent cần là gì?
- Tại sao `tool_result` lại là trung tâm của vòng lặp?
- Khi nào nên sử dụng một subagent thay vì nhồi nhét thêm vào một ngữ cảnh?
- Các vấn đề mà permissions, hooks, memory, prompt assembly và tasks giải quyết là gì?
- Khi nào một hệ thống agent đơn lẻ nên phát triển thành tasks, teams, worktrees và MCP?

Nếu bạn có thể trả lời những câu hỏi này một cách rõ ràng và tự mình xây dựng một hệ thống tương tự, dự án này đã hoàn thành nhiệm vụ của nó.
