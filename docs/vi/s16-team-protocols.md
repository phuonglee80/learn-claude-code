# s16: Giao Thức Nhóm (Team Protocols)

`s01 > s02 > s03 > s04 > s05 > s06 > s07 > s08 > s09 > s10 > s11 > s12 > s13 > s14 > s15 > [ s16 ] > s17 > s18 > s19`

## Bạn Sẽ Học Được
- Cách pattern yêu cầu-phản hồi với ID theo dõi cấu trúc hóa đàm phán đa agent
- Cách giao thức shutdown cho phép lead dừng đồng đội một cách duyên dáng
- Cách phê duyệt kế hoạch giữ công việc rủi ro sau cổng xem xét
- Cách một FSM dùng lại được (bộ theo dõi trạng thái đơn giản với các chuyển đổi đã xác định) bao phủ cả hai giao thức

Trong s15 đồng đội của bạn có thể gửi tin nhắn tự do, nhưng sự tự do đó đi kèm với hỗn loạn. Một agent bảo agent khác "xin hãy dừng lại," và agent kia phớt lờ. Một đồng đội bắt đầu di chuyển cơ sở dữ liệu rủi ro mà không hỏi trước. Vấn đề không phải là giao tiếp bản thân -- bạn đã giải quyết điều đó với inbox -- mà là thiếu các quy tắc phối hợp. Trong chương này bạn sẽ thêm các giao thức có cấu trúc: một wrapper tin nhắn chuẩn hóa với ID theo dõi biến các tin nhắn rời rạc thành các bắt tay đáng tin cậy.

## Vấn Đề

Hai khoảng trống phối hợp trở nên rõ ràng một khi nhóm của bạn phát triển vượt quá các ví dụ đồ chơi:

**Shutdown.** Giết thread của đồng đội để lại các tệp viết dở và danh sách cấu hình cũ. Bạn cần một bắt tay: lead yêu cầu shutdown, và đồng đội phê duyệt (hoàn thành công việc hiện tại và thoát sạch sẽ) hoặc từ chối (tiếp tục làm việc vì nó có nghĩa vụ chưa hoàn thành).

**Phê duyệt kế hoạch.** Khi lead nói "tái cấu trúc module auth," đồng đội bắt đầu ngay lập tức. Nhưng đối với các thay đổi rủi ro cao, lead nên xem xét kế hoạch trước khi bất kỳ code nào được viết.

Cả hai kịch bản chia sẻ một cấu trúc đồng nhất: một bên gửi yêu cầu mang ID duy nhất, bên kia phản hồi tham chiếu cùng ID đó. Pattern đơn lẻ đó đủ để xây dựng bất kỳ giao thức phối hợp nào bạn cần.

## Giải Pháp

Cả shutdown và phê duyệt kế hoạch đều theo một hình dạng: gửi yêu cầu với `request_id`, nhận phản hồi tham chiếu cùng `request_id`, và theo dõi kết quả qua máy trạng thái đơn giản (`pending -> approved` hoặc `pending -> rejected`).

```
Giao Thức Shutdown          Giao Thức Phê Duyệt Kế Hoạch
==================           ======================

Lead             Đồng đội    Đồng đội           Lead
  |                 |           |                 |
  |--shutdown_req-->|           |--plan_req------>|
  | {req_id:"abc"}  |           | {req_id:"xyz"}  |
  |                 |           |                 |
  |<--shutdown_resp-|           |<--plan_resp-----|
  | {req_id:"abc",  |           | {req_id:"xyz",  |
  |  approve:true}  |           |  approve:true}  |

FSM chung:
  [pending] --approve--> [approved]
  [pending] --reject---> [rejected]

Bộ theo dõi:
  shutdown_requests = {req_id: {target, status}}
  plan_requests     = {req_id: {from, plan, status}}
```

## Cách Hoạt Động

**Bước 1.** Lead khởi tạo shutdown bằng cách tạo `request_id` duy nhất và gửi yêu cầu qua inbox của đồng đội. Yêu cầu được theo dõi trong từ điển để lead có thể kiểm tra trạng thái sau.

```python
shutdown_requests = {}

def handle_shutdown_request(teammate: str) -> str:
    req_id = str(uuid.uuid4())[:8]
    shutdown_requests[req_id] = {"target": teammate, "status": "pending"}
    BUS.send("lead", teammate, "Please shut down gracefully.",
             "shutdown_request", {"request_id": req_id})
    return f"Shutdown request {req_id} sent (status: pending)"
```

**Bước 2.** Đồng đội nhận yêu cầu trong inbox và phản hồi với phê duyệt hoặc từ chối. Phản hồi mang cùng `request_id` để lead có thể khớp nó với yêu cầu ban đầu -- đây là sự tương quan làm cho giao thức đáng tin cậy.

```python
if tool_name == "shutdown_response":
    req_id = args["request_id"]
    approve = args["approve"]
    shutdown_requests[req_id]["status"] = "approved" if approve else "rejected"
    BUS.send(sender, "lead", args.get("reason", ""),
             "shutdown_response",
             {"request_id": req_id, "approve": approve})
```

**Bước 3.** Phê duyệt kế hoạch theo pattern đồng nhất nhưng theo hướng ngược lại. Đồng đội gửi kế hoạch (tạo `request_id`), và lead xem xét nó (tham chiếu cùng `request_id` để phê duyệt hoặc từ chối).

```python
plan_requests = {}

def handle_plan_review(request_id, approve, feedback=""):
    req = plan_requests[request_id]
    req["status"] = "approved" if approve else "rejected"
    BUS.send("lead", req["from"], feedback,
             "plan_approval_response",
             {"request_id": request_id, "approve": approve})
```

Trong demo giảng dạy này, một hình dạng FSM bao phủ cả hai giao thức. Một hệ thống production có thể đối xử các họ giao thức khác nhau theo cách khác nhau, nhưng phiên bản giảng dạy cố ý giữ một template dùng lại được để bạn có thể thấy cấu trúc chung rõ ràng.

## Đọc Cùng Nhau

- Nếu tin nhắn thông thường và yêu cầu giao thức bắt đầu mờ nhạt lại với nhau, hãy xem lại [`glossary.md`](./glossary.md) và [`entity-map.md`](./entity-map.md) để thấy chúng khác nhau.
- Nếu bạn dự định tiếp tục vào s17 và s18, hãy đọc [`team-task-lane-model.md`](./team-task-lane-model.md) trước để tự chủ và làn worktree không sụp đổ thành một ý tưởng.
- Nếu bạn muốn truy vết cách một yêu cầu giao thức quay lại hệ thống chính, hãy ghép chương này với [`s00b-one-request-lifecycle.md`](./s00b-one-request-lifecycle.md).

## Cách Nó Kết Nối Vào Hệ Thống Nhóm

Nâng cấp thực sự trong s16 không phải là "hai loại tin nhắn mới." Đó là một con đường phối hợp lâu dài:

```text
bên yêu cầu bắt đầu một hành động giao thức
  ->
ghi RequestRecord
  ->
gửi ProtocolEnvelope qua inbox
  ->
bên nhận drain inbox ở vòng lặp tiếp theo
  ->
cập nhật trạng thái yêu cầu theo request_id
  ->
gửi phản hồi có cấu trúc
  ->
bên yêu cầu tiếp tục dựa trên approved / rejected
```

Đó là lớp thiếu giữa "các agent có thể chat" và "các agent có thể phối hợp đáng tin cậy."

## Message vs Protocol vs Request vs Task

| Đối tượng | Câu hỏi nào nó trả lời | Trường điển hình |
|---|---|---|
| `MessageEnvelope` | ai nói gì với ai | `from`, `to`, `content` |
| `ProtocolEnvelope` | đây có phải yêu cầu/phản hồi có cấu trúc | `type`, `request_id`, `payload` |
| `RequestRecord` | luồng phối hợp này ở đâu bây giờ | `kind`, `status`, `from`, `to` |
| `TaskRecord` | mục công việc thực tế nào đang được đẩy tiến | `subject`, `status`, `blockedBy`, `owner` |

Đừng sụp đổ chúng:

- yêu cầu giao thức không phải là tác vụ bản thân
- kho yêu cầu không phải là task board
- giao thức theo dõi luồng phối hợp
- tác vụ theo dõi tiến trình công việc

## Những Gì Đã Thay Đổi Từ s15

| Thành phần     | Trước (s15)      | Sau (s16)                       |
|----------------|------------------|---------------------------------|
| Công cụ        | 9                | 12 (+shutdown_req/resp +plan)   |
| Shutdown       | Chỉ thoát tự nhiên| Bắt tay yêu cầu-phản hồi      |
| Cổng kế hoạch  | Không có         | Gửi/xem xét với phê duyệt      |
| Tương quan     | Không có         | request_id cho mỗi yêu cầu     |
| FSM            | Không có         | pending -> approved/rejected    |

## Thử Ngay

```sh
cd learn-claude-code
python agents/s16_team_protocols.py
```

1. `Spawn alice as a coder. Then request her shutdown.`
2. `List teammates to see alice's status after shutdown approval`
3. `Spawn bob with a risky refactoring task. Review and reject his plan.`
4. `Spawn charlie, have him submit a plan, then approve it.`
5. Gõ `/team` để giám sát trạng thái

## Những Gì Bạn Đã Thành Thạo

Tại điểm này, bạn có thể:

- Xây dựng giao thức yêu cầu-phản hồi sử dụng ID duy nhất cho tương quan
- Triển khai shutdown duyên dáng qua bắt tay hai bước
- Giữ công việc rủi ro sau bước phê duyệt kế hoạch
- Sử dụng lại một pattern FSM duy nhất (`pending -> approved/rejected`) cho bất kỳ giao thức mới nào bạn phát minh

## Tiếp Theo Là Gì

Nhóm của bạn bây giờ có cấu trúc và quy tắc, nhưng lead vẫn phải trông nom mọi đồng đội -- giao tác vụ từng cái một, thúc giục các worker nhàn rỗi. Trong s17, bạn sẽ làm đồng đội tự chủ: chúng tự quét task board, nhận công việc chưa được nhận, và tiếp tục sau nén ngữ cảnh mà không mất danh tính.

## Bài Học Chính

> Yêu cầu giao thức là tin nhắn có cấu trúc với ID theo dõi, và phản hồi phải tham chiếu cùng ID đó -- pattern đơn lẻ đó đủ để xây dựng bất kỳ bắt tay phối hợp nào.
