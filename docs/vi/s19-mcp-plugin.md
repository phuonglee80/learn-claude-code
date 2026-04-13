# s19: MCP & Plugin

`s01 > s02 > s03 > s04 > s05 > s06 > s07 > s08 > s09 > s10 > s11 > s12 > s13 > s14 > s15 > s16 > s17 > s18 > [ s19 ]`

## Bạn Sẽ Học Được
- Cách MCP (Model Context Protocol -- cách chuẩn để agent giao tiếp với server khả năng bên ngoài) cho phép agent có công cụ mới mà không thay đổi code cốt lõi
- Cách chuẩn hóa tên công cụ với tiền tố `mcp__{server}__{tool}` giữ công cụ bên ngoài không va chạm với native
- Cách router hợp nhất điều phối lần gọi công cụ đến handler cục bộ hoặc server từ xa qua cùng đường dẫn
- Cách manifest plugin cho phép server khả năng bên ngoài được phát hiện và khởi chạy tự động

Đến thời điểm này, mọi công cụ agent sử dụng -- bash, read, write, edit, tasks, worktrees -- sống bên trong harness Python. Bạn viết từng cái bằng tay. Điều đó hoạt động tốt cho codebase giảng dạy, nhưng agent thực sự cần giao tiếp với cơ sở dữ liệu, trình duyệt, dịch vụ cloud, và công cụ chưa tồn tại. Cứng hóa mọi khả năng có thể không bền vững. Chương này cho thấy cách các chương trình bên ngoài có thể gia nhập agent qua cùng mặt phẳng định tuyến công cụ bạn đã xây dựng.

## Vấn Đề

Agent của bạn mạnh mẽ, nhưng khả năng của nó bị cố định tại thời điểm build. Nếu bạn muốn nó truy vấn cơ sở dữ liệu Postgres, bạn viết handler Python mới. Nếu bạn muốn nó điều khiển trình duyệt, bạn viết handler khác. Mỗi khả năng mới có nghĩa là thay đổi harness cốt lõi, test lại tool router, và triển khai lại. Trong khi đó, các nhóm khác đang xây dựng server chuyên biệt đã biết cách giao tiếp với các hệ thống này. Bạn cần giao thức chuẩn để các server bên ngoài có thể hiển thị công cụ của chúng cho agent, và agent có thể gọi chúng tự nhiên như gọi công cụ native riêng -- mà không cần viết lại vòng lặp cốt lõi mỗi lần.

## Giải Pháp

MCP cho agent cách chuẩn để kết nối với server khả năng bên ngoài qua stdio. Agent khởi động tiến trình server, hỏi nó cung cấp công cụ gì, chuẩn hóa tên với tiền tố, và định tuyến lần gọi đến server đó -- tất cả qua cùng pipeline công cụ xử lý công cụ native.

```text
LLM
  |
  | yêu cầu gọi công cụ
  v
Agent tool router
  |
  +-- công cụ native  -> handler Python cục bộ
  |
  +-- công cụ MCP     -> server MCP bên ngoài
                         |
                         v
                     trả về kết quả
```

## Đọc Cùng Nhau

- Nếu bạn muốn hiểu MCP phù hợp vào bề mặt khả năng rộng hơn ngoài chỉ công cụ (tài nguyên, prompt, phát hiện plugin), [`s19a-mcp-capability-layers.md`](./s19a-mcp-capability-layers.md) bao phủ ranh giới nền tảng đầy đủ.
- Nếu bạn muốn xác nhận rằng khả năng bên ngoài vẫn trả về qua cùng bề mặt thực thi như công cụ native, hãy ghép chương này với [`s02b-tool-execution-runtime.md`](./s02b-tool-execution-runtime.md).
- Nếu kiểm soát truy vấn và định tuyến khả năng bên ngoài đang rời nhau trong mô hình tinh thần, [`s00a-query-control-plane.md`](./s00a-query-control-plane.md) kết nối chúng lại.

## Cách Hoạt Động

Có ba mảnh thiết yếu. Khi bạn hiểu chúng, MCP ngừng bí ẩn.

**Bước 1.** Xây dựng `MCPClient` quản lý kết nối đến một server bên ngoài. Nó khởi động tiến trình server qua stdio, gửi bắt tay, và cache danh sách công cụ khả dụng.

```python
class MCPClient:
    def __init__(self, server_name, command, args=None, env=None):
        self.server_name = server_name
        self.command = command
        self.args = args or []
        self.process = None
        self._tools = []

    def connect(self):
        self.process = subprocess.Popen(
            [self.command] + self.args,
            stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            stderr=subprocess.PIPE, text=True,
        )
        self._send({"method": "initialize", "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "teaching-agent", "version": "1.0"},
        }})
        response = self._recv()
        if response and "result" in response:
            self._send({"method": "notifications/initialized"})
            return True
        return False

    def list_tools(self):
        self._send({"method": "tools/list", "params": {}})
        response = self._recv()
        if response and "result" in response:
            self._tools = response["result"].get("tools", [])
        return self._tools

    def call_tool(self, tool_name, arguments):
        self._send({"method": "tools/call", "params": {
            "name": tool_name, "arguments": arguments,
        }})
        response = self._recv()
        if response and "result" in response:
            content = response["result"].get("content", [])
            return "\n".join(c.get("text", str(c)) for c in content)
        return "MCP Error: no response"
```

**Bước 2.** Chuẩn hóa tên công cụ bên ngoài với tiền tố để chúng không bao giờ va chạm với công cụ native. Quy ước đơn giản: `mcp__{server}__{tool}`.

```text
mcp__postgres__query
mcp__browser__open_tab
```

Tiền tố này phục vụ hai mục đích: nó ngăn va chạm tên, và nó cho router biết chính xác server nào nên xử lý lần gọi.

```python
def get_agent_tools(self):
    agent_tools = []
    for tool in self._tools:
        prefixed_name = f"mcp__{self.server_name}__{tool['name']}"
        agent_tools.append({
            "name": prefixed_name,
            "description": tool.get("description", ""),
            "input_schema": tool.get("inputSchema", {
                "type": "object", "properties": {}
            }),
        })
    return agent_tools
```

**Bước 3.** Xây dựng một router hợp nhất. Router không quan tâm công cụ native hay bên ngoài ngoài quyết định điều phối. Nếu tên bắt đầu bằng `mcp__`, định tuyến đến server MCP; nếu không, gọi handler cục bộ. Điều này giữ vòng lặp agent không bị đụng -- nó chỉ thấy danh sách phẳng các công cụ.

```python
if tool_name.startswith("mcp__"):
    return mcp_router.call(tool_name, arguments)
else:
    return native_handler(arguments)
```

**Bước 4.** Thêm phát hiện plugin. Nếu MCP trả lời "agent giao tiếp với server khả năng bên ngoài như thế nào," plugin trả lời "các server đó được phát hiện và cấu hình như thế nào?" Một plugin tối thiểu là tệp manifest cho harness biết server nào cần khởi chạy:

```json
{
  "name": "my-db-tools",
  "version": "1.0.0",
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"]
    }
  }
}
```

Tệp này sống trong `.claude-plugin/plugin.json`. `PluginLoader` quét các manifest này, trích xuất cấu hình server, và giao chúng cho `MCPToolRouter` để kết nối.

**Bước 5.** Thực thi ranh giới an toàn. Đây là quy tắc quan trọng nhất của toàn bộ chương: công cụ bên ngoài vẫn phải đi qua cùng cổng quyền hạn như công cụ native. Nếu công cụ MCP bỏ qua kiểm tra quyền hạn, bạn đã tạo một cửa sau bảo mật ở rìa hệ thống.

```python
decision = permission_gate.check(block.name, block.input or {})
# Cùng kiểm tra cho "bash", "read_file", và "mcp__postgres__query"
```

## Cách Nó Kết Nối Vào Toàn Bộ Harness

MCP trở nên khó hiểu khi được coi như vũ trụ riêng biệt. Mô hình sạch hơn là:

```text
khởi động
  ->
plugin loader tìm manifest
  ->
cấu hình server được trích xuất
  ->
MCP client kết nối và liệt kê công cụ
  ->
công cụ bên ngoài được chuẩn hóa vào cùng pool công cụ

runtime
  ->
LLM phát tool_use
  ->
cổng quyền hạn chung
  ->
đường dẫn native hoặc đường dẫn MCP
  ->
chuẩn hóa kết quả
  ->
tool_result trả về cùng vòng lặp
```

Điểm vào khác, cùng control plane và execution plane.

## Plugin vs Server vs Công Cụ

| Lớp | Nó là gì | Dùng để làm gì |
|---|---|---|
| manifest plugin | khai báo cấu hình | cho harness biết server nào cần phát hiện và khởi chạy |
| server MCP | tiến trình / kết nối bên ngoài | hiển thị một bộ khả năng |
| công cụ MCP | một khả năng có thể gọi từ server đó | thứ cụ thể model gọi |

Ghi nhớ ngắn nhất:

- plugin = phát hiện
- server = kết nối
- tool = gọi

## Cấu Trúc Dữ Liệu Chính

### Cấu hình server

```python
{
    "command": "npx",
    "args": ["-y", "..."],
    "env": {}
}
```

### Định nghĩa công cụ bên ngoài chuẩn hóa

```python
{
    "name": "mcp__postgres__query",
    "description": "Run a SQL query",
    "input_schema": {...}
}
```

### Đăng ký client

```python
clients = {
    "postgres": mcp_client_instance
}
```

## Những Gì Đã Thay Đổi Từ s18

| Thành phần         | Trước (s18)                       | Sau (s19)                                        |
|--------------------|-----------------------------------|--------------------------------------------------|
| Nguồn công cụ      | Tất cả native (Python cục bộ)     | Native + server MCP bên ngoài                    |
| Đặt tên công cụ    | Tên phẳng (`bash`, `read_file`)   | Có tiền tố cho bên ngoài (`mcp__postgres__query`)|
| Định tuyến         | Một handler map duy nhất          | Router hợp nhất: dispatch native + dispatch MCP  |
| Phát triển khả năng| Chỉnh sửa code harness mỗi công cụ| Thêm manifest plugin hoặc kết nối server         |
| Phạm vi quyền hạn  | Chỉ công cụ native               | Công cụ native + bên ngoài qua cùng cổng        |

## Thử Ngay

```sh
cd learn-claude-code
python agents/s19_mcp_plugin.py
```

1. Xem cách công cụ bên ngoài được phát hiện từ manifest plugin khi khởi động.
2. Gõ `/tools` để xem công cụ native và MCP được liệt kê cạnh nhau trong một pool phẳng.
3. Gõ `/mcp` để xem server MCP nào được kết nối và mỗi cái cung cấp bao nhiêu công cụ.
4. Yêu cầu agent sử dụng công cụ và chú ý cách kết quả trả về qua cùng vòng lặp như công cụ cục bộ.

## Những Gì Bạn Đã Thành Thạo

Tại điểm này, bạn có thể:

- Kết nối đến server khả năng bên ngoài sử dụng giao thức stdio MCP
- Chuẩn hóa tên công cụ bên ngoài với tiền tố `mcp__{server}__{tool}` để ngăn va chạm
- Định tuyến lần gọi công cụ qua dispatcher hợp nhất xử lý cả công cụ native và MCP
- Phát hiện và khởi chạy server MCP tự động qua manifest plugin
- Thực thi cùng kiểm tra quyền hạn trên công cụ bên ngoài như trên native

## Bức Tranh Toàn Cảnh

Bạn bây giờ đã đi qua toàn bộ xương sống thiết kế của một coding agent production, từ s01 đến s19.

Bạn bắt đầu với vòng lặp agent trần gọi LLM và thêm kết quả công cụ. Bạn thêm sử dụng công cụ, sau đó danh sách tác vụ liên tục, sau đó subagent, tải skill, và nén ngữ cảnh. Bạn xây dựng hệ thống quyền hạn, hệ thống hook và hệ thống bộ nhớ. Bạn xây dựng pipeline system prompt, thêm phục hồi lỗi, và cho agent task board đầy đủ với thực thi nền và lập lịch cron. Bạn tổ chức agent thành nhóm với giao thức phối hợp, làm chúng tự chủ, cho mỗi tác vụ worktree cô lập riêng, và cuối cùng mở cửa cho khả năng bên ngoài qua MCP.

Mỗi chương thêm đúng một ý tưởng vào hệ thống. Không có chương nào yêu cầu bạn vứt bỏ những gì đã xây trước đó. Agent bạn có bây giờ không phải đồ chơi -- đó là mô hình hoạt động của cùng các quyết định kiến trúc định hình agent production thực sự.

Nếu bạn muốn kiểm tra hiểu biết, hãy thử xây dựng lại toàn bộ hệ thống từ đầu. Bắt đầu với vòng lặp agent. Thêm công cụ. Thêm tác vụ. Tiếp tục cho đến khi bạn đạt MCP. Nếu bạn có thể làm điều đó mà không nhìn lại các chương, bạn đã hiểu thiết kế. Và nếu bạn bị kẹt ở đâu đó giữa chừng, chương bao phủ ý tưởng đó sẽ chờ bạn.

## Bài Học Chính

> Khả năng bên ngoài nên vào cùng pipeline công cụ như native -- cùng đặt tên, cùng định tuyến, cùng quyền hạn -- để vòng lặp agent không bao giờ cần biết sự khác biệt.
