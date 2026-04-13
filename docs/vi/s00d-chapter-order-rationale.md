# s00d: Lý Do Trình Tự Chương (Chapter Order Rationale)

> **Deep Dive** -- Đọc sau khi hoàn thành Giai đoạn 1 (s01-s06) hoặc bất cứ khi nào bạn thắc mắc "tại sao khóa học được sắp xếp theo cách này?"

Ghi chú này không phải về một cơ chế. Nó trả lời một câu hỏi giảng dạy cơ bản hơn: tại sao chương trình này dạy hệ thống theo thứ tự hiện tại thay vì theo thứ tự tệp nguồn, hype tính năng, hoặc độ phức tạp triển khai thô?

## Kết Luận Trước

Thứ tự `s01 -> s19` hiện tại là hợp lý về cấu trúc.

Sức mạnh của nó không chỉ là phạm vi rộng. Sức mạnh là nó phát triển hệ thống theo cùng thứ tự bạn nên hiểu nó:

1. Xây dựng vòng lặp agent hoạt động nhỏ nhất.
2. Thêm các lớp control-plane và củng cố xung quanh vòng lặp đó.
3. Nâng cấp lập kế hoạch phiên thành công việc lâu dài và trạng thái runtime.
4. Chỉ khi đó mới mở rộng sang nhóm liên tục, làn thực thi cô lập, và bus khả năng bên ngoài.

Đó là thứ tự giảng dạy đúng vì nó theo:

**thứ tự phụ thuộc giữa các cơ chế**

không phải thứ tự tệp hay thứ tự đóng gói sản phẩm.

## Bốn Dòng Phụ Thuộc

Chương trình này thực sự được tổ chức theo bốn dòng phụ thuộc:

1. `phụ thuộc vòng lặp cốt lõi`
2. `phụ thuộc control-plane`
3. `phụ thuộc trạng thái công việc`
4. `phụ thuộc ranh giới nền tảng`

Nói đơn giản:

```text
trước tiên làm agent chạy
  -> sau đó làm nó chạy an toàn
  -> sau đó làm nó chạy lâu dài
  -> sau đó làm nó chạy như nền tảng
```

## Hình Dạng Thực Sự Của Trình Tự

```text
s01-s06
  xây dựng một hệ thống agent đơn hoạt động

s07-s11
  củng cố và kiểm soát hệ thống đó

s12-s14
  biến lập kế hoạch tạm thời thành công việc lâu dài + runtime

s15-s19
  mở rộng vào đồng đội, giao thức, tự chủ, làn cô lập, và khả năng bên ngoài
```

Sau mỗi giai đoạn, bạn nên có thể nói:

- sau `s06`: "Tôi có thể xây dựng một harness agent đơn thực sự"
- sau `s11`: "Tôi có thể làm harness đó an toàn, ổn định và dễ mở rộng hơn"
- sau `s14`: "Tôi có thể quản lý công việc lâu dài, thực thi nền, và khởi chạy theo thời gian"
- sau `s19`: "Tôi hiểu ranh giới nền tảng của hệ thống agent có tỷ lệ hoàn thành cao"

## Tại Sao Các Chương Đầu Phải Giữ Nguyên Thứ Tự

### `s01` phải ở đầu tiên

Vì nó thiết lập:

- điểm vào tối thiểu
- vòng lặp theo lượt
- tại sao kết quả công cụ phải chảy ngược vào lần gọi model tiếp theo

Không có điều này, mọi thứ sau trở thành nói chuyện tính năng rời rạc.

### `s02` phải ngay sau `s01`

Vì agent không thể định tuyến ý định vào công cụ vẫn chỉ đang nói, không hành động.

`s02` là nơi người học đầu tiên thấy harness trở nên thực sự:

- model phát `tool_use`
- hệ thống điều phối đến handler
- công cụ thực thi
- `tool_result` chảy ngược vào vòng lặp

### `s03` nên ở trước `s04`

Đây là rào chắn quan trọng.

Bạn nên trước tiên hiểu:

- cách agent hiện tại tổ chức công việc riêng

trước khi học:

- khi nào ủy thác công việc vào ngữ cảnh con riêng biệt

Nếu `s04` đến quá sớm, subagent trở thành cửa thoát thay vì cơ chế cô lập rõ ràng.

### `s05` nên ở trước `s06`

Hai chương này giải quyết hai nửa cùng một vấn đề:

- `s05`: ngăn kiến thức không cần thiết vào ngữ cảnh
- `s06`: quản lý ngữ cảnh vẫn phải giữ hoạt động

Thứ tự đó quan trọng. Hệ thống tốt trước tiên tránh phình, sau đó nén những gì vẫn cần thiết.

## Tại Sao `s07-s11` Tạo Một Khối Củng Cố

Các chương này đều trả lời cùng câu hỏi lớn hơn:

**vòng lặp đã hoạt động, vậy làm sao nó trở nên ổn định, an toàn, và dễ đọc như hệ thống thực?**

### `s07` nên ở trước `s08`

Quyền hạn đến trước vì hệ thống trước tiên phải trả lời:

- hành động này có được phép xảy ra không
- nó có nên bị từ chối không
- nó có nên hỏi người dùng trước không

Chỉ sau đó mới nên dạy hook, trả lời:

- hành vi bổ sung nào gắn xung quanh vòng lặp

Nên thứ tự giảng dạy đúng là:

**cổng trước, mở rộng sau**

### `s09` nên ở trước `s10`

Đây là một quyết định sắp xếp rất quan trọng khác.

`s09` dạy:

- thông tin lâu dài nào tồn tại
- sự kiện nào xứng đáng lưu trữ dài hạn

`s10` dạy:

- nhiều nguồn thông tin được lắp ráp thành đầu vào model như thế nào

Có nghĩa:

- bộ nhớ định nghĩa một nguồn nội dung
- lắp ráp prompt giải thích cách tất cả nguồn nội dung được kết hợp

Nếu bạn đảo ngược, xây dựng prompt bắt đầu cảm thấy tùy ý và bí ẩn.

### `s11` là chương đóng đúng cho khối này

Phục hồi lỗi không phải tính năng cô lập.

Đó là nơi hệ thống cuối cùng cần giải thích:

- tại sao nó đang tiếp tục
- tại sao nó đang retry
- tại sao nó đang dừng

Điều đó chỉ trở nên dễ đọc sau khi đường dẫn đầu vào, đường dẫn công cụ, đường dẫn trạng thái, và đường dẫn kiểm soát đã tồn tại.

## Tại Sao `s12-s14` Phải Giữ Mục Tiêu -> Runtime -> Lịch

Đây là phần dễ dạy tệ nhất nếu thứ tự sai.

### `s12` phải ở trước `s13`

`s12` dạy:

- công việc nào tồn tại
- quan hệ phụ thuộc giữa các nút công việc
- khi nào công việc downstream mở khóa

`s13` dạy:

- thực thi trực tiếp nào đang chạy
- kết quả nền đi đâu
- trạng thái runtime ghi lại như thế nào

Đó là phân biệt quan trọng:

- `task` là mục tiêu công việc lâu dài
- `runtime task` là khe thực thi trực tiếp

Nếu `s13` đến trước, bạn gần như chắc chắn sụp đổ hai khái niệm đó thành một.

### `s14` phải ở sau `s13`

Cron không thêm loại tác vụ khác.

Nó thêm điều kiện khởi chạy mới:

**thời gian trở thành một cách nữa để khởi chạy công việc vào runtime**

Nên thứ tự đúng là:

`đồ thị tác vụ lâu dài -> khe runtime -> trigger lịch`

## Tại Sao `s15-s19` Nên Giữ Nhóm -> Giao Thức -> Tự Chủ -> Worktree -> Bus Khả Năng

### `s15` định nghĩa ai tồn tại liên tục trong hệ thống

Trước khi giao thức hoặc tự chủ có ý nghĩa, hệ thống cần actor lâu dài:

- đồng đội là ai
- danh tính nào chúng mang
- chúng tồn tại qua công việc như thế nào

### `s16` sau đó định nghĩa các actor đó phối hợp thế nào

Giao thức không nên đến trước actor.

Giao thức tồn tại để cấu trúc:

- ai yêu cầu
- ai phê duyệt
- ai phản hồi
- yêu cầu vẫn có thể truy vết thế nào

### `s17` chỉ có ý nghĩa sau cả hai

Tự chủ dễ dạy mơ hồ.

Nhưng trong hệ thống thực nó chỉ trở nên rõ ràng sau khi:

- đồng đội liên tục tồn tại
- phối hợp có cấu trúc đã tồn tại

Nếu không "nhận tự chủ" nghe như phép thuật thay vì cơ chế giới hạn thực sự.

### `s18` nên ở trước `s19`

Cô lập worktree là vấn đề ranh giới thực thi cục bộ:

- công việc song song thực sự chạy ở đâu
- cách một làn công việc giữ cô lập khỏi làn khác

Điều đó nên trở nên rõ ràng trước khi di chuyển ra ngoài vào:

- plugin
- server MCP
- định tuyến khả năng bên ngoài

Nếu không bạn có nguy cơ tập trung quá mức vào khả năng bên ngoài và học thiếu ranh giới nền tảng cục bộ.

### `s19` đúng ở cuối cùng

Đó là ranh giới nền tảng bên ngoài.

Nó chỉ trở nên sạch khi bạn đã hiểu:

- actor cục bộ
- làn công việc cục bộ
- công việc lâu dài cục bộ
- thực thi runtime cục bộ
- sau đó mới nhà cung cấp khả năng bên ngoài

## Năm Thay Đổi Thứ Tự Sẽ Làm Khóa Học Tệ Hơn

1. Chuyển `s04` trước `s03`
   Điều này dạy ủy thác trước lập kế hoạch cục bộ.

2. Chuyển `s10` trước `s09`
   Điều này dạy lắp ráp prompt trước khi người học hiểu một trong những đầu vào cốt lõi.

3. Chuyển `s13` trước `s12`
   Điều này sụp đổ mục tiêu lâu dài và khe runtime trực tiếp thành một ý tưởng lẫn lộn.

4. Chuyển `s17` trước `s15` hoặc `s16`
   Điều này biến tự chủ thành phép polling mơ hồ.

5. Chuyển `s19` trước `s18`
   Điều này làm nền tảng bên ngoài trông quan trọng hơn ranh giới thực thi cục bộ.

## Kiểm Tra Tốt Cho Người Bảo Trì Trước Khi Thay Đổi Thứ Tự

Trước khi di chuyển chương, hãy hỏi:

1. Người học đã hiểu khái niệm tiên quyết chưa?
2. Thay đổi thứ tự này có mờ nhạt hai khái niệm nên giữ tách biệt?
3. Chương này chủ yếu về mục tiêu, trạng thái runtime, actor, hay ranh giới khả năng?
4. Nếu tôi chuyển nó sớm hơn, người đọc vẫn có thể xây dựng phiên bản đúng tối thiểu?
5. Tôi đang tối ưu cho hiểu biết, hay chỉ sao chép thứ tự tệp nguồn?

Nếu câu trả lời trung thực cho câu hỏi cuối là "thứ tự tệp nguồn", thay đổi có lẽ là sai lầm.

## Bài Học Chính

**Thứ tự chương tốt không chỉ là danh sách cơ chế. Đó là trình tự mà mỗi chương cảm thấy như lớp tự nhiên tiếp theo phát triển từ lớp trước.**
