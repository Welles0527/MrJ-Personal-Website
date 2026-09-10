# ChatGPT 云端报告主动写入

## 运行路径与验收状态

四个既有 ChatGPT 云端监控（每日北京时间 16:00）生成报告后，调用 OAuth 授权的 MCP 工具写入 CloudBase。网站打开页面或点击“刷新数据”时读取后台结论。此路径无需 Codex、个人电脑或每日重新发布静态站点。

后台已部署：HTTP 云函数 stock-monitor-reports，Nodejs20.19，server.mjs + scf_bootstrap；数据库 stockMonitorReports、stockMonitorOAuth 均为 ADMINONLY。已使用一份此前发布的浩通报告完成真实 OAuth、MCP 写入、数据库读回和未授权拒绝测试。这次写入由部署验证程序发起，不能算作 ChatGPT 云端定时执行成功。

待验收：ChatGPT 账号连接授权、四个原任务保存工具的实际可用性、无人值守执行是否能完成写入，以及网站发布后的刷新读回。开发者模式中可手动调用工具，不等于原定时任务能调用；必须分别验证，不能提前承诺。

## ChatGPT 连接

- 名称：个股监控同步。
- MCP 地址：https://www.magicj.cn/api/stock-monitor-reports/mcp
- 认证：OAuth，支持动态客户端注册和 S256 PKCE。
- 在 magicj.cn 授权页输入部署时生成的私人网站连接授权码。不要把授权码发给模型或写入网站前端。
- 已授权会话的访问令牌 15 分钟有效，刷新令牌轮换、闲置 30 天过期，会话最长 90 天；过期需要重新授权。刷新令牌重复使用会撤销对应会话。

## 接口与数据

- POST /api/stock-monitor-reports/mcp，工具 save_stock_monitor_report，要求固定发布者身份及 reports:write。
- GET /api/stock-monitor-reports/reports/latest?code=301026，返回 { report }；无数据时 report 为 null；Cache-Control: no-store。
- 仅公开四股授权评级结论，完整聊天和账号凭据不入报告库。
- 星球石墨 688633、浩通科技 301026、振江股份 603507：基本面、机构、筹码、资金面、风险事项、综合。
- 回盛生物 300871：基本面、机构、筹码、财务质量、行业景气、风险事项、量价资金、综合。
- tone 仅按评级标题圆点映射：绿 positive、黄 neutral、红 negative。不能按评级文字或理由中的圆点重算。
- 完整校验股票名、真实日期和唯一维度；同数据幂等，旧日期和同日冲突拒绝；历史与最新记录使用数据库事务写入。
- 网站保留此前有效报告作为兜底；空数据、失败和过期倒退不会覆盖旧报告，并显示真实读取状态。

## 服务端配置

CLOUDBASE_ENV_ID、REPORT_WRITER_ID、REPORT_BASE_URL、REPORT_OWNER_SECRET_HASH、REPORT_PRIVATE_JWK_B64 仅配置在云函数环境。原始授权码、RSA 私钥及部署配置保存在仓库外的私人目录，不提交 Git，不发布到静态站点。

## 原云端任务追加指令（需逐个验证任务支持此工具）

保留原任务时间、原监控方法和本对话上下文。每次完成日报后，调用 save_stock_monitor_report，把本次完整“今日综合评级”逐项传入，保留股票代码、名称、真实报告日期、评级标题圆点颜色、评级文字、较昨日变化和理由。只发送评级结论，不发送完整聊天。缺项不自行补写；综合无单列理由时 evidence 可留空。只有工具返回保存回执才说明已同步网站；失败时仍正常输出原监控报告并说明同步失败。不得改变颜色或为了通过校验伪造数据。

旧 Codex automation-3 已暂停，不得作为此路径的替代。

## 验证命令

node tests/stock-monitor-report-service.mjs
node tests/stock-monitor-http.mjs
node tests/stock-monitor-oauth.mjs
node tests/stock-monitor-runtime.mjs
node tests/stock-monitor-provider.mjs

前四项包含测试身份及测试存储，不是 ChatGPT 定时执行证据。网站还需桌面 1440x900、手机 390x844、刷新按钮网络请求和线上资源指纹验证。
