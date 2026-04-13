# s08: Hệ Thống Hook (Hook System)

`s01 > s02 > s03 > s04 > s05 > s06 > s07 > [ s08 ] > s09 > s10 > s11 > s12 > s13 > s14 > s15 > s16 > s17 > s18 > s19`

## Bạn Sẽ Học Được

- Ba sự kiện vòng đời cho phép code bên ngoài quan sát và ảnh hưởng đến vòng lặp agent
- Cách các hook dựa trên shell chạy như subprocesses với đầy đủ ngữ cảnh về lần gọi công cụ hiện tại
- Giao thức exit code: 0 có nghĩa là tiếp tục, 1 có nghĩa là chặn, 2 có nghĩa là tiêm một tin nhắn
- Cách cấu hình các hook trong tệp JSON bên ngoài để bạn không bao giờ phải chạm vào code vòng lặp chính

Agent của bạn từ s07 có hệ thống quyền hạn kiểm soát những gì nó được phép làm. Nhưng quyền hạn là cổng yes/no -- chúng không cho phép bạn thêm hành vi mới. Giả sử bạn muốn mọi lệnh bash được ghi nhật ký vào tệp kiểm toán, hoặc bạn muốn một linter tự động chạy sau mọi lần ghi tệp, hoặc bạn muốn một trình quét bảo mật tùy chỉnh kiểm tra đầu vào công cụ trước khi chúng thực thi. Bạn có thể thêm các nhánh if/else bên trong vòng lặp chính cho mỗi cái trong số này, nhưng điều đó biến vòng lặp sạch sẽ của bạn thành một mê hồn trận của các trường hợp đặc biệt. Điều bạn thực sự muốn là một cách để mở rộng hành vi của agent từ bên ngoài, mà không cần sửa đổi bản thân vòng lặp.

## Vấn Đề

Bạn đang chạy agent của mình trong môi trường nhóm. Các nhóm khác nhau muốn các hành vi khác nhau: nhóm bảo mật muốn quét mọi lệnh bash, nhóm QA muốn tự động chạy test sau các lần chỉnh sửa tệp, và nhóm ops muốn một trail kiểm toán của mỗi lần gọi công cụ. Nếu mỗi cái trong số này yêu cầu thay đổi code trong vòng lặp agent, bạn sẽ kết thúc với một mớ hỗn hợp các điều kiện mà không ai có thể bảo trì. Tệ hơn, mọi yêu cầu mới có nghĩa là triển khai lại agent. Bạn cần một cách để các nhóm cắm logic riêng của họ vào những khoảnh khắc được xác định rõ ràng -- mà không cần chạm vào code cốt lõi.

## Giải Pháp

Vòng lặp agent hiển thị ba điểm mở rộng cố định (sự kiện vòng đời). Tại mỗi điểm, nó chạy các lệnh shell bên ngoài gọi là hook. Mỗi hook truyền đạt ý định của nó thông qua exit code của nó: tiếp tục âm thầm, chặn thao tác, hoặc tiêm một tin nhắn vào cuộc hội thoại.

```
tool_call từ LLM
     |
     v
[Hook PreToolUse]
     |  exit 0 -> tiếp tục
     |  exit 1 -> chặn công cụ, trả về stderr như lỗi
     |  exit 2 -> tiêm stderr vào cuộc hội thoại, tiếp tục
     |
     v
[thực thi công cụ]
     |
     v
[Hook PostToolUse]
     |  exit 0 -> tiếp tục
     |  exit 2 -> thêm stderr vào kết quả
     |
     v
trả về kết quả
```

## Đọc Cùng Nhau

- Nếu bạn vẫn hình dung hook là "nhiều nhánh if/else hơn bên trong vòng lặp chính," bạn có thể thấy hữu ích khi xem lại [`s02a-tool-control-plane.md`](./s02a-tool-control-plane.md) trước.
- Nếu vòng lặp chính, handler công cụ và side effect hook bắt đầu mờ nhạt lại với nhau, [`entity-map.md`](./entity-map.md) có thể giúp bạn tách biệt ai đẩy trạng thái cốt lõi và ai chỉ quan sát từ bên cạnh.
- Nếu bạn dự định tiếp tục vào lắp ráp prompt, phục hồi hoặc đội nhóm, việc giữ [`s00e-reference-module-map.md`](./s00e-reference-module-map.md) ở gần hữu ích vì pattern "vòng lặp cốt lõi cộng với mở rộng sidecar" này quay lại nhiều lần.

## Cách Hoạt Động

**Bước 1.** Xác định ba sự kiện vòng đời. `SessionStart` kích hoạt một lần khi agent khởi động -- hữu ích cho khởi tạo, ghi nhật ký hoặc kiểm tra môi trường. `PreToolUse` kích hoạt trước mọi lần gọi công cụ và là sự kiện duy nhất có thể chặn thực thi. `PostToolUse` kích hoạt sau mọi lần gọi công cụ và có thể chú thích kết quả nhưng không thể hoàn tác nó.

| Sự kiện | Khi nào | Có thể chặn? |
|---------|--------|------------|
| `SessionStart` | Một lần khi bắt đầu phiên | Không |
| `PreToolUse` | Trước mỗi lần gọi công cụ | Có (exit 1) |
| `PostToolUse` | Sau mỗi lần gọi công cụ | Không |

**Bước 2.** Cấu hình các hook trong tệp `.hooks.json` bên ngoài tại gốc workspace. Mỗi hook chỉ định một lệnh shell để chạy. Trường `matcher` tùy chọn lọc theo tên công cụ -- không có matcher, hook kích hoạt cho mọi công cụ.

```json
{
  "hooks": {
    "PreToolUse": [
      {"matcher": "bash", "command": "echo 'Checking bash command...'"},
      {"matcher": "write_file", "command": "/path/to/lint-check.sh"}
    ],
    "PostToolUse": [
      {"command": "echo 'Tool finished'"}
    ],
    "SessionStart": [
      {"command": "echo 'Session started at $(date)'"}
    ]
  }
}
```

**Bước 3.** Triển khai giao thức exit code. Đây là trung tâm của hệ thống hook -- ba exit code, ba ý nghĩa. Giao thức được thiết kế đơn giản đến mức bất kỳ ngôn ngữ hay script nào cũng có thể tham gia. Viết hook của bạn bằng bash, Python, Ruby, bất cứ thứ gì -- miễn là nó exit với code đúng.

| Exit Code | Ý nghĩa | PreToolUse | PostToolUse |
|----------|---------|-----------|-----------|
| 0 | Thành công | Tiếp tục thực thi công cụ | Tiếp tục bình thường |
| 1 | Chặn | Công cụ KHÔNG được thực thi, stderr được trả về như lỗi | Cảnh báo được ghi nhật ký |
| 2 | Tiêm | stderr được tiêm như tin nhắn, công cụ vẫn thực thi | stderr được thêm vào kết quả |

**Bước 4.** Truyền ngữ cảnh cho các hook thông qua biến môi trường. Các hook cần biết điều gì đang xảy ra -- sự kiện nào kích hoạt chúng, công cụ nào đang được gọi, và đầu vào trông như thế nào. Đối với các hook `PostToolUse`, đầu ra công cụ cũng có sẵn.

```
HOOK_EVENT=PreToolUse
HOOK_TOOL_NAME=bash
HOOK_TOOL_INPUT={"command": "npm test"}
HOOK_TOOL_OUTPUT=...  (chỉ PostToolUse)
```

**Bước 5.** Tích hợp các hook vào vòng lặp agent. Tích hợp sạch sẽ: chạy pre-hook trước thực thi, kiểm tra xem có cái nào bị chặn không, thực thi công cụ, chạy post-hook, và thu thập bất kỳ tin nhắn được tiêm nào. Vòng lặp vẫn sở hữu luồng điều khiển -- các hook chỉ quan sát, chặn hoặc chú thích tại những khoảnh khắc được đặt tên.

```python
# Trước khi thực thi công cụ
pre_result = hooks.run_hooks("PreToolUse", ctx)
if pre_result["blocked"]:
    output = f"Blocked by hook: {pre_result['block_reason']}"
    continue

# Thực thi công cụ
output = handler(**tool_input)

# Sau khi thực thi công cụ
post_result = hooks.run_hooks("PostToolUse", ctx)
for msg in post_result["messages"]:
    output += f"\n[Hook note]: {msg}"
```

## Những Gì Đã Thay Đổi Từ s07

| Thành phần | Trước (s07) | Sau (s08) |
|---|---|---|
| Khả năng mở rộng | Không có | Hệ thống hook dựa trên shell |
| Sự kiện | Không có | PreToolUse, PostToolUse, SessionStart |
| Luồng điều khiển | Chỉ pipeline quyền hạn | Quyền hạn + hook |
| Cấu hình | Quy tắc trong code | Tệp `.hooks.json` bên ngoài |

## Thử Ngay

```sh
cd learn-claude-code
# Tạo cấu hình hook
cat > .hooks.json << 'EOF'
{
  "hooks": {
    "PreToolUse": [
      {"matcher": "bash", "command": "echo 'Auditing bash command' >&2; exit 0"}
    ],
    "SessionStart": [
      {"command": "echo 'Agent session started'"}
    ]
  }
}
EOF
python agents/s08_hook_system.py
```

1. Xem hook SessionStart kích hoạt khi khởi động
2. Yêu cầu agent chạy một lệnh bash -- xem PreToolUse hook kích hoạt
3. Tạo một hook chặn (exit 1) và xem nó ngăn thực thi công cụ
4. Tạo một hook tiêm (exit 2) và xem nó thêm tin nhắn vào cuộc hội thoại

## Những Gì Bạn Đã Thành Thạo

Tại điểm này, bạn có thể:

- Giải thích tại sao các điểm mở rộng tốt hơn các điều kiện trong vòng lặp để thêm hành vi mới
- Xác định các sự kiện vòng đời tại những khoảnh khắc đúng trong vòng lặp agent
- Viết các hook shell truyền đạt ý định thông qua giao thức exit code ba mã
- Cấu hình các hook bên ngoài để các nhóm khác nhau có thể tùy chỉnh hành vi mà không cần chạm vào code agent
- Duy trì ranh giới: vòng lặp sở hữu luồng điều khiển, handler sở hữu thực thi, hook chỉ quan sát, chặn hoặc chú thích

## Tiếp Theo Là Gì

Agent của bạn bây giờ có thể thực thi công cụ một cách an toàn (s07) và được mở rộng mà không cần thay đổi code (s08). Nhưng nó vẫn bị mất trí nhớ -- mọi phiên mới bắt đầu từ zero. Tùy chọn, sự sửa chỉnh và ngữ cảnh dự án của người dùng bị quên ngay khi phiên kết thúc. Trong s09, bạn sẽ xây dựng hệ thống bộ nhớ cho phép agent mang các sự kiện lâu dài qua các phiên.

## Bài Học Chính

> Vòng lặp chính có thể hiển thị các điểm mở rộng cố định mà không từ bỏ quyền sở hữu luồng điều khiển -- hook quan sát, chặn hoặc chú thích, nhưng vòng lặp vẫn quyết định điều gì xảy ra tiếp theo.
