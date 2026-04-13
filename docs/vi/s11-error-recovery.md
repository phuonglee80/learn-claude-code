# s11: Phục Hồi Lỗi (Error Recovery)

`s01 > s02 > s03 > s04 > s05 > s06 > s07 > s08 > s09 > s10 > [ s11 ] > s12 > s13 > s14 > s15 > s16 > s17 > s18 > s19`

## Bạn Sẽ Học Được

- Ba danh mục lỗi có thể phục hồi: cắt ngắn, tràn ngữ cảnh và lỗi transport thoáng qua
- Cách định tuyến mỗi lỗi đến nhánh phục hồi đúng (tiếp tục, nén hoặc backoff)
- Tại sao ngân sách thử lại ngăn chặn các vòng lặp vô hạn
- Cách trạng thái phục hồi giữ "lý do" hiển thị thay vì chôn vùi nó trong một catch block

Agent của bạn đang làm công việc thực sự bây giờ -- đọc tệp, viết code, gọi công cụ qua nhiều lượt. Và công việc thực tế tạo ra lỗi thực sự. Đầu ra bị cắt bớt giữa câu. Prompt phát triển vượt quá cửa sổ ngữ cảnh của model. API time out hoặc bị rate limit. Nếu mỗi cái trong số các lỗi này kết thúc phiên ngay lập tức, hệ thống của bạn cảm thấy giòn và người dùng học cách không tin vào nó. Nhưng đây là quan sát chính: hầu hết các lỗi này không phải là lỗi tác vụ thực sự. Chúng là tín hiệu rằng bước tiếp theo cần một con đường tiếp tục khác.

## Vấn Đề

Người dùng của bạn yêu cầu agent tái cấu trúc một tệp lớn. Model bắt đầu viết phiên bản mới, nhưng đầu ra chạm `max_tokens` và dừng giữa hàm. Không có phục hồi, agent chỉ dừng lại với một tệp chỉ viết một nửa. Người dùng phải để ý, nhắc lại, và hy vọng model tiếp tục từ chỗ đã dừng.

Hoặc: cuộc hội thoại đã chạy 40 lượt. Các tin nhắn tích lũy đẩy prompt vượt quá giới hạn ngữ cảnh của model. API trả về lỗi. Không có phục hồi, toàn bộ phiên bị mất.

Hoặc: một sự cố mạng thoáng qua ngắt kết nối. Không có phục hồi, agent crash mặc dù cùng yêu cầu sẽ thành công một giây sau.

Mỗi cái trong số này là một loại lỗi khác nhau, và mỗi cái cần một hành động phục hồi khác nhau. Một lần retry tất cả trong một không thể xử lý đúng tất cả ba.

## Giải Pháp

Phân loại lỗi trước, chọn nhánh phục hồi sau, và thực thi ngân sách thử lại để hệ thống không thể vòng lặp mãi.

```text
Lệnh gọi LLM
  |
  +-- stop_reason == "max_tokens"
  |      -> thêm nhắc nhở tiếp tục
  |      -> retry
  |
  +-- prompt quá dài
  |      -> nén ngữ cảnh
  |      -> retry
  |
  +-- timeout / rate limit / lỗi kết nối
         -> back off
         -> retry
```

## Cách Hoạt Động

**Bước 1. Theo dõi trạng thái phục hồi.** Trước khi bạn có thể phục hồi, bạn cần biết bạn đã thử bao nhiêu lần rồi. Một bộ đếm đơn giản trên mỗi danh mục ngăn chặn các vòng lặp vô hạn:

```python
recovery_state = {
    "continuation_attempts": 0,
    "compact_attempts": 0,
    "transport_attempts": 0,
}
```

**Bước 2. Phân loại lỗi.** Mỗi lỗi ánh xạ đến chính xác một loại phục hồi. Bộ phân loại kiểm tra stop reason và error text, sau đó trả về một quyết định có cấu trúc:

```python
def choose_recovery(stop_reason: str | None, error_text: str | None) -> dict:
    if stop_reason == "max_tokens":
        return {"kind": "continue", "reason": "output truncated"}

    if error_text and "prompt" in error_text and "long" in error_text:
        return {"kind": "compact", "reason": "context too large"}

    if error_text and any(word in error_text for word in [
        "timeout", "rate", "unavailable", "connection"
    ]):
        return {"kind": "backoff", "reason": "transient transport failure"}

    return {"kind": "fail", "reason": "unknown or non-recoverable error"}
```

Sự tách biệt quan trọng: phân loại trước, hành động sau. Theo cách đó, lý do phục hồi vẫn hiển thị trong trạng thái thay vì biến mất bên trong một catch block.

**Bước 3. Xử lý tiếp tục (đầu ra bị cắt ngắn).** Khi model hết không gian đầu ra, tác vụ không thất bại -- lượt chỉ kết thúc quá sớm. Bạn tiêm một nhắc nhở tiếp tục và retry:

```python
CONTINUE_MESSAGE = (
    "Output limit hit. Continue directly from where you stopped. "
    "Do not restart or repeat."
)
```

Không có nhắc nhở này, các model có xu hướng khởi động lại từ đầu hoặc lặp lại những gì chúng đã viết. Hướng dẫn rõ ràng "tiếp tục trực tiếp" giữ đầu ra chảy tiếp.

**Bước 4. Xử lý nén (tràn ngữ cảnh).** Khi prompt quá lớn, vấn đề không phải là tác vụ bản thân -- ngữ cảnh tích lũy cần thu nhỏ trước khi lượt tiếp theo có thể tiến hành. Bạn gọi cùng cơ chế `auto_compact` từ s06 để tóm tắt lịch sử, sau đó retry:

```python
if decision["kind"] == "compact":
    messages = auto_compact(messages)
    continue
```

**Bước 5. Xử lý backoff (lỗi thoáng qua).** Khi lỗi có thể là tạm thời -- timeout, rate limit, mất điện ngắn -- bạn chờ và thử lại. Exponential backoff (nhân đôi delay mỗi lần thử, cộng jitter ngẫu nhiên để tránh vấn đề thundering-herd nơi nhiều client retry cùng một lúc) giữ hệ thống không tấn công một server đang gặp khó khăn:

```python
def backoff_delay(attempt: int) -> float:
    delay = min(BACKOFF_BASE_DELAY * (2 ** attempt), BACKOFF_MAX_DELAY)
    jitter = random.uniform(0, 1)
    return delay + jitter
```

**Bước 6. Kết nối vào vòng lặp.** Logic phục hồi nằm ngay bên trong vòng lặp agent. Mỗi nhánh điều chỉnh các tin nhắn và tiếp tục, hoặc bỏ cuộc:

```python
while True:
    try:
        response = client.messages.create(...)
        decision = choose_recovery(response.stop_reason, None)
    except Exception as e:
        response = None
        decision = choose_recovery(None, str(e).lower())

    if decision["kind"] == "continue":
        messages.append({"role": "user", "content": CONTINUE_MESSAGE})
        continue

    if decision["kind"] == "compact":
        messages = auto_compact(messages)
        continue

    if decision["kind"] == "backoff":
        time.sleep(backoff_delay(...))
        continue

    if decision["kind"] == "fail":
        break
```

Điểm quan trọng không phải là code thông minh. Điểm quan trọng là: phân loại, chọn, retry với ngân sách.

## Những Gì Đã Thay Đổi Từ s10

| Khía cạnh | s10: System Prompt | s11: Phục Hồi Lỗi |
|--------|-----|-----|
| Mối quan tâm cốt lõi | Lắp ráp đầu vào model từ các phần | Xử lý lỗi mà không crash |
| Hành vi vòng lặp | Chạy cho đến end_turn hoặc tool_use | Thêm các nhánh phục hồi trước khi bỏ cuộc |
| Nén | Không được đề cập | Kích hoạt phản ứng trên tràn ngữ cảnh |
| Logic thử lại | Không được đề cập | Có ngân sách trên mỗi danh mục lỗi |
| Theo dõi trạng thái | Các phần prompt | Bộ đếm phục hồi |

## Ghi Chú Về Hệ Thống Thực Tế

Các hệ thống agent thực sự cũng lưu trữ trạng thái phiên vào đĩa, để crash không phá hủy cuộc hội thoại dài. Lưu trữ phiên, checkpoint và tiếp tục là các mối quan tâm riêng biệt với phục hồi lỗi -- nhưng chúng bổ sung cho nhau. Phục hồi xử lý các lỗi bạn có thể retry trong tiến trình; lưu trữ xử lý các lỗi bạn không thể. Harness giảng dạy này tập trung vào các con đường phục hồi trong tiến trình, nhưng hãy nhớ rằng hệ thống production cần cả hai lớp.

## Đọc Cùng Nhau

- Nếu bạn bắt đầu mất theo dõi tại sao truy vấn hiện tại vẫn tiếp tục, hãy quay lại [`s00c-query-transition-model.md`](./s00c-query-transition-model.md).
- Nếu nén ngữ cảnh và phục hồi lỗi bắt đầu trông như cùng một cơ chế, hãy đọc lại [`s06-context-compact.md`](./s06-context-compact.md) để tách "co ngữ cảnh" khỏi "phục hồi sau lỗi."
- Nếu bạn sắp chuyển sang `s12`, hãy giữ [`data-structures.md`](./data-structures.md) ở gần vì hệ thống tác vụ thêm một lớp công việc lâu dài mới trên trạng thái phục hồi.

## Lỗi Người Mới Bắt Đầu Thông Thường

**Lỗi 1: sử dụng một quy tắc retry cho mọi lỗi.** Các lỗi khác nhau cần các hành động phục hồi khác nhau. Retry lỗi context-overflow mà không nén trước sẽ chỉ tạo ra cùng lỗi đó một lần nữa.

**Lỗi 2: không có ngân sách retry.** Không có ngân sách, hệ thống có thể vòng lặp mãi. Mỗi danh mục phục hồi cần bộ đếm riêng và tối đa riêng.

**Lỗi 3: ẩn lý do phục hồi.** Hệ thống nên biết *tại sao* nó đang retry. Lý do đó nên hiển thị trong trạng thái -- như một đối tượng quyết định có cấu trúc -- không biến mất bên trong catch block.

## Thử Ngay

```sh
cd learn-claude-code
python agents/s11_error_recovery.py
```

Cố gắng ép buộc:

- một phản hồi dài (để kích hoạt tiếp tục max_tokens)
- một ngữ cảnh lớn (để kích hoạt nén)
- timeout tạm thời (để kích hoạt backoff)

Sau đó quan sát nhánh phục hồi nào hệ thống chọn và bộ đếm thử lại tăng như thế nào.

## Những Gì Bạn Đã Thành Thạo

Tại điểm này, bạn có thể:

- Phân loại lỗi agent thành ba danh mục có thể phục hồi và một danh mục cuối cùng
- Định tuyến mỗi lỗi đến nhánh phục hồi đúng: tiếp tục, nén hoặc backoff
- Thực thi ngân sách retry để hệ thống không bao giờ vòng lặp mãi
- Giữ các quyết định phục hồi hiển thị như trạng thái có cấu trúc thay vì chôn vùi chúng trong exception handler
- Giải thích tại sao các loại lỗi khác nhau cần các hành động phục hồi khác nhau

## Giai Đoạn 2 Hoàn Thành

Bạn đã hoàn thành Giai đoạn 2 của harness. Nhìn vào những gì bạn đã xây dựng kể từ Giai đoạn 1:

- **s07 Hệ Thống Quyền Hạn** -- harness hỏi trước khi hành động, và người dùng kiểm soát những gì được tự động phê duyệt
- **s08 Hệ Thống Hook** -- các script bên ngoài chạy tại các điểm vòng đời mà không chạm vào vòng lặp agent
- **s09 Hệ Thống Bộ Nhớ** -- các sự thật lâu dài tồn tại qua các phiên
- **s10 System Prompt** -- prompt là một pipeline lắp ráp với các phần rõ ràng, không phải một chuỗi lớn
- **s11 Phục Hồi Lỗi** -- các lỗi được định tuyến đến con đường phục hồi đúng thay vì crash

Agent của bạn bắt đầu Giai đoạn 2 như một vòng lặp hoạt động có thể gọi công cụ và quản lý ngữ cảnh. Nó kết thúc Giai đoạn 2 như một hệ thống tự quản lý: nó kiểm tra quyền hạn, chạy hook, nhớ những gì quan trọng, lắp ráp hướng dẫn của chính nó và phục hồi sau lỗi mà không cần can thiệp của con người.

Đó là một harness agent thực sự. Nếu bạn dừng lại ở đây và xây dựng một sản phẩm trên nó, bạn sẽ có thứ gì đó thực sự hữu ích.

Nhưng còn nhiều thứ cần xây dựng. Giai đoạn 3 giới thiệu quản lý công việc có cấu trúc -- danh sách tác vụ, thực thi nền và công việc theo lịch. Agent ngừng thuần phản ứng và bắt đầu tổ chức công việc của chính nó theo thời gian. Hẹn gặp bạn trong [s12: Task System](./s12-task-system.md).

## Bài Học Chính

> Hầu hết lỗi agent không phải là lỗi tác vụ thực sự -- chúng là tín hiệu để thử một con đường tiếp tục khác, và harness nên phân loại chúng và phục hồi tự động.
