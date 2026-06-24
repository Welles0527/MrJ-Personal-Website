export type AiTermGroup = 'ai-llm' | 'network-software' | 'vibe-coding' | 'third-party';

export type AiTerm = {
  order: number;
  group: AiTermGroup;
  term: string;
  english: string;
  briefDefinition: string;
  detailedDefinition: string;
  value: string;
  useCase: string;
  isRequired: boolean;
};

export const aiTermGroups: Array<{ slug: AiTermGroup; label: string }> = [
  { slug: 'ai-llm', label: 'AI 与大模型' },
  { slug: 'network-software', label: '网络与软件' },
  { slug: 'vibe-coding', label: 'Vibe Coding' },
  { slug: 'third-party', label: '第三方服务' }
];

const groupCopy: Record<AiTermGroup, Pick<AiTerm, 'detailedDefinition' | 'value' | 'useCase'>> = {
  'ai-llm': {
    detailedDefinition: '用于理解模型能力、输入与输出机制。',
    value: '建立模型认知，提升AI使用与判断效率。',
    useCase: '选模型、写提示词或讨论AI方案时'
  },
  'network-software': {
    detailedDefinition: '常用于搭建、部署与维护软件服务。',
    value: '理解系统运行，减少部署和排错成本。',
    useCase: '搭建、部署或排查网站服务时'
  },
  'vibe-coding': {
    detailedDefinition: '用于理解从开发到发布的协作流程。',
    value: '提升AI协作开发与交付效率。',
    useCase: '用AI开发、测试或发布项目时'
  },
  'third-party': {
    detailedDefinition: '用于评估和接入外部在线服务。',
    value: '帮助评估服务，降低接入决策风险。',
    useCase: '选择、接入或管理在线服务时'
  }
};

const rawAiTerms: Array<Omit<AiTerm, 'detailedDefinition' | 'value' | 'useCase'>> = [
  {
    "order": 1,
    "group": "network-software",
    "term": "服务器",
    "english": "Server",
    "briefDefinition": "提供服务的远程计算机",
    "isRequired": true
  },
  {
    "order": 2,
    "group": "network-software",
    "term": "客户端",
    "english": "Client",
    "briefDefinition": "发起请求的用户设备",
    "isRequired": true
  },
  {
    "order": 3,
    "group": "network-software",
    "term": "前端",
    "english": "Frontend",
    "briefDefinition": "用户可见的界面层",
    "isRequired": true
  },
  {
    "order": 4,
    "group": "network-software",
    "term": "后端",
    "english": "Backend",
    "briefDefinition": "处理业务逻辑的服务层",
    "isRequired": true
  },
  {
    "order": 5,
    "group": "network-software",
    "term": "网址",
    "english": "URL",
    "briefDefinition": "网页的完整访问地址",
    "isRequired": true
  },
  {
    "order": 6,
    "group": "network-software",
    "term": "域名",
    "english": "Domain Name",
    "briefDefinition": "便于记忆的网站名称",
    "isRequired": true
  },
  {
    "order": 7,
    "group": "network-software",
    "term": "IP地址",
    "english": "IP Address",
    "briefDefinition": "设备在网络中的地址",
    "isRequired": true
  },
  {
    "order": 8,
    "group": "network-software",
    "term": "DNS 域名解析",
    "english": "DNS",
    "briefDefinition": "域名转换IP的系统",
    "isRequired": false
  },
  {
    "order": 9,
    "group": "network-software",
    "term": "HTTP/HTTPS",
    "english": "HTTP/HTTPS",
    "briefDefinition": "网络数据传输协议",
    "isRequired": false
  },
  {
    "order": 10,
    "group": "network-software",
    "term": "端口",
    "english": "Port",
    "briefDefinition": "服务通信入口编号",
    "isRequired": false
  },
  {
    "order": 11,
    "group": "network-software",
    "term": "数据库",
    "english": "Database",
    "briefDefinition": "结构化数据存储系统",
    "isRequired": true
  },
  {
    "order": 12,
    "group": "network-software",
    "term": "API 应用程序接口",
    "english": "API",
    "briefDefinition": "程序之间的接口",
    "isRequired": true
  },
  {
    "order": 13,
    "group": "network-software",
    "term": "带宽/流量",
    "english": "Bandwidth",
    "briefDefinition": "数据传输能力大小",
    "isRequired": false
  },
  {
    "order": 14,
    "group": "network-software",
    "term": "云计算",
    "english": "Cloud Computing",
    "briefDefinition": "按需提供计算资源",
    "isRequired": false
  },
  {
    "order": 15,
    "group": "network-software",
    "term": "云服务器/VPS",
    "english": "Cloud Server / VPS",
    "briefDefinition": "虚拟化独立服务器",
    "isRequired": true
  },
  {
    "order": 16,
    "group": "network-software",
    "term": "部署",
    "english": "Deploy",
    "briefDefinition": "将代码发布到服务器",
    "isRequired": true
  },
  {
    "order": 17,
    "group": "network-software",
    "term": "上线/生产环境",
    "english": "Production",
    "briefDefinition": "正式对外运行环境",
    "isRequired": false
  },
  {
    "order": 18,
    "group": "network-software",
    "term": "开发/测试/生产环境",
    "english": "Environments (Dev / Staging / Production)",
    "briefDefinition": "不同用途运行环境",
    "isRequired": false
  },
  {
    "order": 19,
    "group": "network-software",
    "term": "环境变量",
    "english": "Environment Variable",
    "briefDefinition": "独立管理的配置参数",
    "isRequired": false
  },
  {
    "order": 20,
    "group": "network-software",
    "term": "容器",
    "english": "Container",
    "briefDefinition": "应用运行隔离环境",
    "isRequired": false
  },
  {
    "order": 21,
    "group": "network-software",
    "term": "Docker",
    "english": "Docker",
    "briefDefinition": "容器管理平台",
    "isRequired": false
  },
  {
    "order": 22,
    "group": "network-software",
    "term": "镜像",
    "english": "Image",
    "briefDefinition": "容器运行模板",
    "isRequired": false
  },
  {
    "order": 23,
    "group": "network-software",
    "term": "Kubernetes / K8s",
    "english": "Kubernetes / K8s",
    "briefDefinition": "容器集群管理平台",
    "isRequired": false
  },
  {
    "order": 24,
    "group": "network-software",
    "term": "对象存储",
    "english": "Object Storage (S3)",
    "briefDefinition": "海量文件存储服务",
    "isRequired": false
  },
  {
    "order": 25,
    "group": "network-software",
    "term": "CDN 内容分发网络",
    "english": "CDN (Content Delivery Network)",
    "briefDefinition": "就近分发内容网络",
    "isRequired": false
  },
  {
    "order": 26,
    "group": "network-software",
    "term": "反向代理 / Nginx",
    "english": "Reverse Proxy / Nginx",
    "briefDefinition": "高性能Web服务器",
    "isRequired": false
  },
  {
    "order": 27,
    "group": "network-software",
    "term": "负载均衡",
    "english": "Load Balancer",
    "briefDefinition": "分配访问流量系统",
    "isRequired": false
  },
  {
    "order": 28,
    "group": "network-software",
    "term": "SSH 远程登录",
    "english": "SSH",
    "briefDefinition": "安全远程登录协议",
    "isRequired": false
  },
  {
    "order": 29,
    "group": "network-software",
    "term": "SSL/TLS 证书",
    "english": "SSL/TLS Certificate",
    "briefDefinition": "网站加密身份凭证",
    "isRequired": true
  },
  {
    "order": 30,
    "group": "network-software",
    "term": "Serverless 无服务器",
    "english": "Serverless",
    "briefDefinition": "无需管理服务器架构",
    "isRequired": false
  },
  {
    "order": 31,
    "group": "network-software",
    "term": "日志",
    "english": "Log",
    "briefDefinition": "系统运行记录",
    "isRequired": true
  },
  {
    "order": 32,
    "group": "network-software",
    "term": "监控",
    "english": "Monitoring",
    "briefDefinition": "实时监控系统状态",
    "isRequired": false
  },
  {
    "order": 33,
    "group": "network-software",
    "term": "缓存",
    "english": "Cache",
    "briefDefinition": "临时高速数据存储",
    "isRequired": true
  },
  {
    "order": 34,
    "group": "network-software",
    "term": "Redis",
    "english": "Redis",
    "briefDefinition": "高性能内存数据库",
    "isRequired": false
  },
  {
    "order": 35,
    "group": "network-software",
    "term": "消息队列",
    "english": "Message Queue",
    "briefDefinition": "异步任务传递机制",
    "isRequired": true
  },
  {
    "order": 36,
    "group": "vibe-coding",
    "term": "编程语言",
    "english": "Programming Language",
    "briefDefinition": "编写程序的语言",
    "isRequired": true
  },
  {
    "order": 37,
    "group": "vibe-coding",
    "term": "库",
    "english": "Library",
    "briefDefinition": "可复用功能代码集",
    "isRequired": false
  },
  {
    "order": 38,
    "group": "vibe-coding",
    "term": "框架",
    "english": "Framework",
    "briefDefinition": "应用开发基础框架",
    "isRequired": false
  },
  {
    "order": 39,
    "group": "vibe-coding",
    "term": "包/依赖",
    "english": "Package / Dependency",
    "briefDefinition": "项目依赖组件",
    "isRequired": true
  },
  {
    "order": 40,
    "group": "vibe-coding",
    "term": "包管理器",
    "english": "Package Manager",
    "briefDefinition": "依赖安装管理工具",
    "isRequired": false
  },
  {
    "order": 41,
    "group": "vibe-coding",
    "term": "技术栈",
    "english": "Tech Stack",
    "briefDefinition": "项目技术组合方案",
    "isRequired": false
  },
  {
    "order": 42,
    "group": "vibe-coding",
    "term": "技术选型",
    "english": "Tech Stack Selection",
    "briefDefinition": "技术方案选择过程",
    "isRequired": false
  },
  {
    "order": 43,
    "group": "vibe-coding",
    "term": "开源",
    "english": "Open Source",
    "briefDefinition": "公开源代码的软件",
    "isRequired": true
  },
  {
    "order": 44,
    "group": "vibe-coding",
    "term": "代码编辑器 / IDE",
    "english": "Code Editor / IDE",
    "briefDefinition": "集成开发工具",
    "isRequired": true
  },
  {
    "order": 45,
    "group": "vibe-coding",
    "term": "终端 / 命令行",
    "english": "Terminal / CLI",
    "briefDefinition": "命令行操作界面",
    "isRequired": true
  },
  {
    "order": 46,
    "group": "vibe-coding",
    "term": "版本控制",
    "english": "Version Control",
    "briefDefinition": "代码版本管理机制",
    "isRequired": false
  },
  {
    "order": 47,
    "group": "vibe-coding",
    "term": "Git",
    "english": "Git",
    "briefDefinition": "主流版本控制工具",
    "isRequired": true
  },
  {
    "order": 48,
    "group": "vibe-coding",
    "term": "GitHub / 代码仓库",
    "english": "GitHub / Repository",
    "briefDefinition": "代码托管平台与仓库",
    "isRequired": true
  },
  {
    "order": 49,
    "group": "vibe-coding",
    "term": "提交/推送",
    "english": "commit / push",
    "briefDefinition": "保存并上传代码",
    "isRequired": true
  },
  {
    "order": 50,
    "group": "vibe-coding",
    "term": "分支",
    "english": "Branch",
    "briefDefinition": "独立开发代码分支",
    "isRequired": true
  },
  {
    "order": 51,
    "group": "vibe-coding",
    "term": "CI/CD 持续集成与部署",
    "english": "CI/CD",
    "briefDefinition": "自动测试部署流程",
    "isRequired": false
  },
  {
    "order": 52,
    "group": "vibe-coding",
    "term": "Bug",
    "english": "Bug",
    "briefDefinition": "程序缺陷或错误",
    "isRequired": true
  },
  {
    "order": 53,
    "group": "vibe-coding",
    "term": "调试",
    "english": "Debug",
    "briefDefinition": "查找并修复错误",
    "isRequired": true
  },
  {
    "order": 54,
    "group": "vibe-coding",
    "term": "测试",
    "english": "Test",
    "briefDefinition": "验证程序正确性",
    "isRequired": true
  },
  {
    "order": 55,
    "group": "vibe-coding",
    "term": "SDK",
    "english": "SDK (Software Development Kit)",
    "briefDefinition": "软件开发工具包",
    "isRequired": false
  },
  {
    "order": 56,
    "group": "vibe-coding",
    "term": "JSON 数据格式",
    "english": "JSON",
    "briefDefinition": "通用数据交换格式",
    "isRequired": true
  },
  {
    "order": 57,
    "group": "vibe-coding",
    "term": "REST API",
    "english": "REST API",
    "briefDefinition": "基于HTTP的接口规范",
    "isRequired": false
  },
  {
    "order": 58,
    "group": "vibe-coding",
    "term": "Webhook 回调",
    "english": "Webhook",
    "briefDefinition": "事件触发通知机制",
    "isRequired": false
  },
  {
    "order": 59,
    "group": "vibe-coding",
    "term": "WebSocket",
    "english": "WebSocket",
    "briefDefinition": "实时双向通信协议",
    "isRequired": false
  },
  {
    "order": 60,
    "group": "vibe-coding",
    "term": "ORM 对象关系映射",
    "english": "ORM",
    "briefDefinition": "对象与数据库映射层",
    "isRequired": false
  },
  {
    "order": 61,
    "group": "ai-llm",
    "term": "人工智能",
    "english": "Artificial Intelligence (AI)",
    "briefDefinition": "模拟智能能力系统",
    "isRequired": true
  },
  {
    "order": 62,
    "group": "ai-llm",
    "term": "大语言模型",
    "english": "Large Language Model (LLM)",
    "briefDefinition": "大规模语言模型",
    "isRequired": true
  },
  {
    "order": 63,
    "group": "ai-llm",
    "term": "提示词",
    "english": "Prompt",
    "briefDefinition": "给AI的任务指令",
    "isRequired": true
  },
  {
    "order": 64,
    "group": "ai-llm",
    "term": "Token 词元",
    "english": "Token",
    "briefDefinition": "AI处理的最小单位",
    "isRequired": true
  },
  {
    "order": 65,
    "group": "ai-llm",
    "term": "上下文 / 上下文窗口",
    "english": "Context / Context Window",
    "briefDefinition": "模型可记忆内容范围",
    "isRequired": true
  },
  {
    "order": 66,
    "group": "ai-llm",
    "term": "提示工程",
    "english": "Prompt Engineering",
    "briefDefinition": "优化提示词的方法",
    "isRequired": true
  },
  {
    "order": 67,
    "group": "ai-llm",
    "term": "幻觉",
    "english": "Hallucination",
    "briefDefinition": "AI生成错误信息",
    "isRequired": true
  },
  {
    "order": 68,
    "group": "ai-llm",
    "term": "API调用 vs 本地部署",
    "english": "API Call vs Local Deployment",
    "briefDefinition": "调用远程模型服务 vs 本地运行模型",
    "isRequired": true
  },
  {
    "order": 69,
    "group": "ai-llm",
    "term": "Agent 智能体",
    "english": "AI Agent",
    "briefDefinition": "可自主执行任务的AI",
    "isRequired": true
  },
  {
    "order": 70,
    "group": "ai-llm",
    "term": "MCP 模型上下文协议",
    "english": "Model Context Protocol (MCP)",
    "briefDefinition": "AI连接工具统一协议",
    "isRequired": true
  },
  {
    "order": 71,
    "group": "ai-llm",
    "term": "RAG 检索增强生成",
    "english": "Retrieval-Augmented Generation (RAG)",
    "briefDefinition": "检索增强生成技术",
    "isRequired": true
  },
  {
    "order": 72,
    "group": "ai-llm",
    "term": "Embedding 嵌入向量",
    "english": "Embedding",
    "briefDefinition": "文本向量化表示",
    "isRequired": false
  },
  {
    "order": 73,
    "group": "ai-llm",
    "term": "向量数据库",
    "english": "Vector Database",
    "briefDefinition": "存储向量数据数据库",
    "isRequired": false
  },
  {
    "order": 74,
    "group": "ai-llm",
    "term": "多模态",
    "english": "Multimodal",
    "briefDefinition": "支持多种输入形式",
    "isRequired": true
  },
  {
    "order": 75,
    "group": "ai-llm",
    "term": "机器学习",
    "english": "Machine Learning",
    "briefDefinition": "数据驱动学习方法",
    "isRequired": true
  },
  {
    "order": 76,
    "group": "ai-llm",
    "term": "微调",
    "english": "Fine-tuning",
    "briefDefinition": "模型定向训练优化",
    "isRequired": false
  },
  {
    "order": 77,
    "group": "ai-llm",
    "term": "推理",
    "english": "Inference",
    "briefDefinition": "模型实际生成过程",
    "isRequired": true
  },
  {
    "order": 78,
    "group": "ai-llm",
    "term": "参数量",
    "english": "Parameters (7B / 70B)",
    "briefDefinition": "模型知识容量指标",
    "isRequired": false
  },
  {
    "order": 79,
    "group": "ai-llm",
    "term": "温度",
    "english": "Temperature",
    "briefDefinition": "控制输出随机程度",
    "isRequired": true
  },
  {
    "order": 80,
    "group": "ai-llm",
    "term": "开源模型 vs 闭源模型",
    "english": "Open-source vs Closed-source Models",
    "briefDefinition": "开放与封闭模型",
    "isRequired": false
  },
  {
    "order": 81,
    "group": "ai-llm",
    "term": "API Key 密钥",
    "english": "API Key",
    "briefDefinition": "接口访问凭证",
    "isRequired": true
  },
  {
    "order": 82,
    "group": "vibe-coding",
    "term": "认证 Authentication",
    "english": "Authentication",
    "briefDefinition": "验证用户身份",
    "isRequired": true
  },
  {
    "order": 83,
    "group": "vibe-coding",
    "term": "授权 Authorization",
    "english": "Authorization",
    "briefDefinition": "控制用户权限",
    "isRequired": true
  },
  {
    "order": 84,
    "group": "vibe-coding",
    "term": "Token / JWT 令牌",
    "english": "Token / JWT",
    "briefDefinition": "身份认证令牌",
    "isRequired": true
  },
  {
    "order": 85,
    "group": "vibe-coding",
    "term": "OAuth 第三方登录",
    "english": "OAuth",
    "briefDefinition": "第三方授权登录协议",
    "isRequired": true
  },
  {
    "order": 86,
    "group": "vibe-coding",
    "term": "哈希 Hash(密码存储)",
    "english": "Hash",
    "briefDefinition": "单向加密算法",
    "isRequired": false
  },
  {
    "order": 87,
    "group": "vibe-coding",
    "term": "加密 Encryption",
    "english": "Encryption",
    "briefDefinition": "可解密加密技术",
    "isRequired": false
  },
  {
    "order": 88,
    "group": "vibe-coding",
    "term": ".env 文件 / 密钥泄露",
    "english": ".env File / Secret Leak",
    "briefDefinition": "存放敏感配置文件",
    "isRequired": false
  },
  {
    "order": 89,
    "group": "vibe-coding",
    "term": "速率限制 Rate Limiting",
    "english": "Rate Limiting",
    "briefDefinition": "限制访问频率机制",
    "isRequired": false
  },
  {
    "order": 90,
    "group": "vibe-coding",
    "term": "SQL注入 SQL Injection",
    "english": "SQL Injection",
    "briefDefinition": "数据库注入攻击",
    "isRequired": false
  },
  {
    "order": 91,
    "group": "vibe-coding",
    "term": "XSS 跨站脚本",
    "english": "XSS (Cross-Site Scripting)",
    "briefDefinition": "跨站脚本攻击",
    "isRequired": false
  },
  {
    "order": 92,
    "group": "vibe-coding",
    "term": "CSRF 跨站请求伪造",
    "english": "CSRF (Cross-Site Request Forgery)",
    "briefDefinition": "跨站请求伪造攻击",
    "isRequired": false
  },
  {
    "order": 93,
    "group": "vibe-coding",
    "term": "CORS 跨域",
    "english": "CORS (Cross-Origin Resource Sharing)",
    "briefDefinition": "跨域访问控制机制",
    "isRequired": false
  },
  {
    "order": 94,
    "group": "network-software",
    "term": "防火墙 Firewall",
    "english": "Firewall",
    "briefDefinition": "网络安全防护系统",
    "isRequired": true
  },
  {
    "order": 95,
    "group": "vibe-coding",
    "term": "最小权限原则 Least Privilege",
    "english": "Least Privilege",
    "briefDefinition": "最低必要权限原则",
    "isRequired": false
  },
  {
    "order": 96,
    "group": "third-party",
    "term": "软件即服务",
    "english": "SaaS (Software as a Service)",
    "briefDefinition": "在线软件服务模式",
    "isRequired": true
  },
  {
    "order": 97,
    "group": "third-party",
    "term": "托管平台",
    "english": "Hosting (Vercel / Netlify)",
    "briefDefinition": "网站托管服务",
    "isRequired": true
  },
  {
    "order": 98,
    "group": "third-party",
    "term": "后端即服务",
    "english": "BaaS (Supabase / Firebase)",
    "briefDefinition": "后端能力托管服务",
    "isRequired": false
  },
  {
    "order": 99,
    "group": "third-party",
    "term": "支付网关",
    "english": "Payment Gateway",
    "briefDefinition": "在线支付处理服务",
    "isRequired": true
  },
  {
    "order": 100,
    "group": "third-party",
    "term": "Stripe 支付",
    "english": "Stripe",
    "briefDefinition": "国际支付平台",
    "isRequired": true
  },
  {
    "order": 101,
    "group": "third-party",
    "term": "支付宝/微信支付",
    "english": "Alipay / WeChat Pay",
    "briefDefinition": "国内主流支付平台",
    "isRequired": true
  },
  {
    "order": 102,
    "group": "third-party",
    "term": "认证服务",
    "english": "Auth Service (Clerk / Auth0)",
    "briefDefinition": "用户认证服务",
    "isRequired": true
  },
  {
    "order": 103,
    "group": "third-party",
    "term": "邮件服务",
    "english": "Email Service (Resend / SendGrid)",
    "briefDefinition": "邮件发送服务",
    "isRequired": true
  },
  {
    "order": 104,
    "group": "third-party",
    "term": "短信服务",
    "english": "SMS (Twilio)",
    "briefDefinition": "短信发送服务",
    "isRequired": true
  },
  {
    "order": 105,
    "group": "third-party",
    "term": "数据分析",
    "english": "Analytics (GA / PostHog)",
    "briefDefinition": "用户行为分析工具",
    "isRequired": false
  },
  {
    "order": 106,
    "group": "third-party",
    "term": "域名注册商",
    "english": "Domain Registrar",
    "briefDefinition": "域名注册服务商",
    "isRequired": false
  },
  {
    "order": 107,
    "group": "third-party",
    "term": "云厂商",
    "english": "Cloud Provider (AWS / 阿里云)",
    "briefDefinition": "云计算资源提供商",
    "isRequired": false
  },
  {
    "order": 108,
    "group": "third-party",
    "term": "API 中转/聚合平台",
    "english": "API Aggregator / Proxy",
    "briefDefinition": "多接口统一接入平台",
    "isRequired": false
  },
  {
    "order": 109,
    "group": "third-party",
    "term": "内容管理系统",
    "english": "CMS (Content Management System)",
    "briefDefinition": "内容管理系统",
    "isRequired": false
  },
  {
    "order": 110,
    "group": "third-party",
    "term": "低代码/无代码",
    "english": "No-code / Low-code",
    "briefDefinition": "少代码开发模式",
    "isRequired": false
  },
  {
    "order": 111,
    "group": "vibe-coding",
    "term": "Vibe Coding 氛围编程",
    "english": "Vibe Coding",
    "briefDefinition": "AI驱动开发模式",
    "isRequired": true
  },
  {
    "order": 112,
    "group": "vibe-coding",
    "term": "AI 编程工具 / AI 代码编辑器",
    "english": "AI Code Editor (Cursor, Lovable, Bolt, v0)",
    "briefDefinition": "AI辅助编程工具",
    "isRequired": true
  },
  {
    "order": 113,
    "group": "vibe-coding",
    "term": "HTML / CSS / JavaScript",
    "english": "HTML / CSS / JavaScript",
    "briefDefinition": "网页结构语言/网页样式语言/网页交互语言",
    "isRequired": true
  },
  {
    "order": 114,
    "group": "vibe-coding",
    "term": "开发者工具 / F12 控制台",
    "english": "DevTools / Browser Console",
    "briefDefinition": "浏览器调试工具",
    "isRequired": true
  },
  {
    "order": 115,
    "group": "vibe-coding",
    "term": "本地运行 / localhost",
    "english": "Localhost (localhost / 127.0.0.1)",
    "briefDefinition": "本地运行地址",
    "isRequired": true
  },
  {
    "order": 116,
    "group": "vibe-coding",
    "term": "构建 / 编译 Build",
    "english": "Build / Compile",
    "briefDefinition": "代码打包构建过程",
    "isRequired": false
  },
  {
    "order": 117,
    "group": "vibe-coding",
    "term": "响应式设计",
    "english": "Responsive Design",
    "briefDefinition": "多设备适配设计",
    "isRequired": false
  },
  {
    "order": 118,
    "group": "vibe-coding",
    "term": "数据库迁移 / Migration",
    "english": "Database Migration",
    "briefDefinition": "数据结构升级过程",
    "isRequired": true
  },
  {
    "order": 119,
    "group": "vibe-coding",
    "term": "备份 Backup",
    "english": "Backup",
    "briefDefinition": "数据备份机制",
    "isRequired": true
  },
  {
    "order": 120,
    "group": "vibe-coding",
    "term": "定时任务 / 计划任务 Cron",
    "english": "Cron / Scheduled Job",
    "briefDefinition": "定时执行任务",
    "isRequired": true
  },
  {
    "order": 121,
    "group": "vibe-coding",
    "term": "爬虫 / 数据抓取",
    "english": "Web Scraping / Crawler",
    "briefDefinition": "自动采集网页数据",
    "isRequired": true
  },
  {
    "order": 122,
    "group": "vibe-coding",
    "term": "开源协议 / 许可证",
    "english": "Open Source License (MIT, GPL, Apache)",
    "briefDefinition": "开源使用规则",
    "isRequired": false
  }
];

const termCopyUpdates: Record<string, Pick<AiTerm, 'detailedDefinition' | 'value'>> = {
  "服务器": {
    "detailedDefinition": "提供计算、存储服务，接收并响应客户端请求的硬件 / 程序",
    "value": "承载业务，提供各类网络服务"
  },
  "客户端": {
    "detailedDefinition": "面向用户操作，向服务器发起数据请求的终端程序",
    "value": "用户交互入口，发起业务请求"
  },
  "前端": {
    "detailedDefinition": "用户可见交互界面，由页面、交互逻辑组成",
    "value": "展示内容，实现人机可视化交互"
  },
  "后端": {
    "detailedDefinition": "服务端逻辑，处理数据、运算、权限与业务规则",
    "value": "处理核心业务，管理数据存储"
  },
  "网址": {
    "detailedDefinition": "互联网资源唯一访问地址，定位网页 / 接口资源",
    "value": "快速定位网络资源，直接访问"
  },
  "域名": {
    "detailedDefinition": "易记字符地址，替代复杂 IP 用于访问站点",
    "value": "简化地址，方便用户记忆访问"
  },
  "IP地址": {
    "detailedDefinition": "设备网络唯一数字标识，区分局域网 / 公网设备",
    "value": "网络设备身份标识，实现互通"
  },
  "DNS 域名解析": {
    "detailedDefinition": "将域名翻译成对应 IP 的网络解析服务",
    "value": "域名转 IP，实现域名访问网站"
  },
  "HTTP/HTTPS": {
    "detailedDefinition": "网页数据传输协议，HTTPS 附加加密传输",
    "value": "浏览器与服务器数据通信标准"
  },
  "端口": {
    "detailedDefinition": "服务器区分不同服务的数字标识通道",
    "value": "一台主机同时运行多项网络服务"
  },
  "数据库": {
    "detailedDefinition": "结构化存储数据的系统，支持增删改查操作",
    "value": "持久化存储、高效查询业务数据"
  },
  "API 应用程序接口": {
    "detailedDefinition": "程序间数据交互的标准化通信接口",
    "value": "不同系统、程序快速对接通信"
  },
  "带宽/流量": {
    "detailedDefinition": "网络传输速率上限；数据传输总量指标",
    "value": "决定网络访问速度与用量上限"
  },
  "云计算": {
    "detailedDefinition": "依托云端资源按需提供算力、存储服务",
    "value": "按需取用资源，无需自建硬件"
  },
  "云服务器/VPS": {
    "detailedDefinition": "云端虚拟独立服务器，拥有独立系统与资源",
    "value": "低成本替代物理服务器部署项目"
  },
  "部署": {
    "detailedDefinition": "将代码、程序上传至服务器并运行上线",
    "value": "让项目在服务器正常对外运行"
  },
  "上线/生产环境": {
    "detailedDefinition": "面向真实用户正式使用的服务器环境",
    "value": "对外提供稳定正式业务服务"
  },
  "开发/测试/生产环境": {
    "detailedDefinition": "三套隔离环境，分别用于编码、校验、正式使用",
    "value": "隔离流程，避免测试影响用户"
  },
  "环境变量": {
    "detailedDefinition": "存储配置、密钥等参数，与代码文件分离",
    "value": "统一管理配置，区分多环境参数"
  },
  "容器": {
    "detailedDefinition": "打包程序与依赖的标准化隔离运行单元",
    "value": "统一运行环境，消除环境差异"
  },
  "Docker": {
    "detailedDefinition": "主流容器化工具，打包程序构建可移植容器",
    "value": "快速打包、分发、运行应用程序"
  },
  "镜像": {
    "detailedDefinition": "容器只读模板，包含程序、依赖与运行环境",
    "value": "批量快速创建相同运行容器"
  },
  "Kubernetes / K8s": {
    "detailedDefinition": "容器编排工具，批量管理容器集群",
    "value": "自动化调度、扩缩容容器服务"
  },
  "对象存储": {
    "detailedDefinition": "以文件对象形式存储海量图片、视频等资源",
    "value": "低成本存放静态大体积文件"
  },
  "CDN 内容分发网络": {
    "detailedDefinition": "多节点缓存静态资源，就近分发访问内容",
    "value": "加速静态资源，减轻源站压力"
  },
  "反向代理 / Nginx": {
    "detailedDefinition": "服务端代理，转发客户端请求至后端服务",
    "value": "分发请求，隐藏后端真实服务"
  },
  "负载均衡": {
    "detailedDefinition": "将访问请求分摊至多台后端服务器",
    "value": "均分流量，提升系统并发承载"
  },
  "SSH 远程登录": {
    "detailedDefinition": "加密协议远程连接服务器终端操作",
    "value": "安全远程管理云端服务器"
  },
  "SSL/TLS 证书": {
    "detailedDefinition": "网站加密凭证，实现 HTTPS 加密传输",
    "value": "加密通信，证明网站合法身份"
  },
  "Serverless 无服务器": {
    "detailedDefinition": "无需管理服务器，函数触发自动运行代码",
    "value": "免运维服务器，按调用计费"
  },
  "日志": {
    "detailedDefinition": "程序运行记录，存储报错、请求、操作信息",
    "value": "排查故障，追溯系统运行行为"
  },
  "监控": {
    "detailedDefinition": "实时采集服务器、程序运行状态数据",
    "value": "及时发现异常、预警系统故障"
  },
  "缓存": {
    "detailedDefinition": "临时存储高频访问数据，减少数据库查询",
    "value": "加速数据读取，降低数据库压力"
  },
  "Redis": {
    "detailedDefinition": "高性能内存型键值数据库，常用作缓存",
    "value": "高速缓存、实现分布式数据共享"
  },
  "消息队列": {
    "detailedDefinition": "异步存储消息的中间件，解耦程序流程",
    "value": "异步处理任务，削平流量峰值"
  },
  "编程语言": {
    "detailedDefinition": "编写程序代码的标准化语法语言",
    "value": "开发软件、实现业务逻辑代码"
  },
  "库": {
    "detailedDefinition": "封装好的功能代码集合，可直接调用复用",
    "value": "避免重复开发，快速实现功能"
  },
  "框架": {
    "detailedDefinition": "成套标准化开发架构，规范项目结构",
    "value": "统一开发规范，简化项目搭建"
  },
  "包/依赖": {
    "detailedDefinition": "项目运行所需外部代码库、工具组件",
    "value": "补充程序缺失的功能能力"
  },
  "包管理器": {
    "detailedDefinition": "统一安装、更新、卸载项目依赖工具",
    "value": "自动化管理项目所有第三方依赖"
  },
  "技术栈": {
    "detailedDefinition": "项目开发整套配套语言、框架、工具集合",
    "value": "定义项目完整开发技术方案"
  },
  "技术选型": {
    "detailedDefinition": "根据需求挑选适配框架、数据库等技术",
    "value": "匹配业务，平衡成本与性能"
  },
  "开源": {
    "detailedDefinition": "代码完全公开，允许查看、修改、分发源码",
    "value": "免费复用代码，社区协同迭代"
  },
  "代码编辑器 / IDE": {
    "detailedDefinition": "编写、调试代码的专业软件工具",
    "value": "高效编码、内置调试辅助功能"
  },
  "终端 / 命令行": {
    "detailedDefinition": "文本指令操作系统、服务器交互界面",
    "value": "快速执行系统、运维操作命令"
  },
  "版本控制": {
    "detailedDefinition": "记录代码变更历史，支持多人协同开发",
    "value": "追踪代码改动，回滚、合并代码"
  },
  "Git": {
    "detailedDefinition": "主流分布式代码版本管理工具",
    "value": "本地管理代码版本，支持团队协作"
  },
  "GitHub / 代码仓库": {
    "detailedDefinition": "云端存储托管代码，提供 Git 协作平台",
    "value": "云端存代码，团队远程协同开发"
  },
  "提交/推送": {
    "detailedDefinition": "本地保存代码变更；上传代码至远程仓库",
    "value": "记录改动，同步代码到云端仓库"
  },
  "分支": {
    "detailedDefinition": "代码独立开发副本，互不干扰主线代码",
    "value": "并行开发新功能，隔离未上线代码"
  },
  "CI/CD 持续集成与部署": {
    "detailedDefinition": "自动构建、测试、发布代码的自动化流程",
    "value": "代码提交后自动测试部署上线"
  },
  "Bug": {
    "detailedDefinition": "程序逻辑缺陷，引发报错、异常错误",
    "value": "程序故障，导致功能异常失效"
  },
  "调试": {
    "detailedDefinition": "定位、修复代码错误的排查过程",
    "value": "查找并修复程序存在的各类 bug"
  },
  "测试": {
    "detailedDefinition": "验证程序功能、稳定性是否符合需求",
    "value": "提前发现缺陷，保障上线稳定性"
  },
  "SDK": {
    "detailedDefinition": "面向开发封装好的全套调用工具库",
    "value": "快速对接第三方平台能力"
  },
  "JSON 数据格式": {
    "detailedDefinition": "轻量文本格式，用于程序间传输结构化数据",
    "value": "前后端、接口通用数据交换格式"
  },
  "REST API": {
    "detailedDefinition": "遵循 REST 规范的标准化接口设计风格",
    "value": "规范接口，简化前后端数据交互"
  },
  "Webhook 回调": {
    "detailedDefinition": "第三方事件触发，主动推送数据到指定接口",
    "value": "接收外部平台实时事件通知"
  },
  "WebSocket": {
    "detailedDefinition": "长连接通信协议，支持服务端主动推送消息",
    "value": "实现实时聊天、通知等双向通信"
  },
  "ORM 对象关系映射": {
    "detailedDefinition": "代码对象自动映射数据库表，免手写 SQL",
    "value": "简化数据库操作，兼容多数据库"
  },
  "人工智能": {
    "detailedDefinition": "模拟人类思考、推理、创作的计算机技术",
    "value": "赋予程序感知、判断、生成能力"
  },
  "大语言模型": {
    "detailedDefinition": "基于海量文本训练，理解生成人类文字 AI",
    "value": "智能对话、文案、代码生成核心"
  },
  "提示词": {
    "detailedDefinition": "输入给大模型的指令、描述文本",
    "value": "引导 AI 按照指定需求输出内容"
  },
  "Token 词元": {
    "detailedDefinition": "文本拆分最小单元，AI 计算计费基础单位",
    "value": "模型读取文本、计算消耗标准"
  },
  "上下文 / 上下文窗口": {
    "detailedDefinition": "对话历史记录；模型单次可读取文本上限",
    "value": "维持对话连贯，限制单次输入长度"
  },
  "提示工程": {
    "detailedDefinition": "优化提示词，提升 AI 输出精准度的技术",
    "value": "规范指令，改善模型回答质量"
  },
  "幻觉": {
    "detailedDefinition": "大模型生成不存在、虚假错误内容",
    "value": "模型无依据编造不实信息内容"
  },
  "API调用 vs 本地部署": {
    "detailedDefinition": "调用厂商接口；本地硬件运行模型两种方案",
    "value": "两种使用大模型的部署模式"
  },
  "Agent 智能体": {
    "detailedDefinition": "具备自主规划、调用工具能力的 AI 程序",
    "value": "自动拆解任务，联动工具完成复杂工作"
  },
  "MCP 模型上下文协议": {
    "detailedDefinition": "标准化模型与工具交互通信协议",
    "value": "统一 AI 调用外部工具交互标准"
  },
  "RAG 检索增强生成": {
    "detailedDefinition": "检索外部资料再交给模型生成回答",
    "value": "引入私有数据，减少模型幻觉"
  },
  "Embedding 嵌入向量": {
    "detailedDefinition": "文字转为数值向量，表征文本语义含义",
    "value": "实现文本相似度检索匹配"
  },
  "向量数据库": {
    "detailedDefinition": "专门存储文本向量、快速相似度检索数据库",
    "value": "高效检索匹配语义相似内容"
  },
  "多模态": {
    "detailedDefinition": "模型同时支持文本、图片、音频等多种输入",
    "value": "图文音视频统一理解生成内容"
  },
  "机器学习": {
    "detailedDefinition": "机器从数据自动学习规律，无需硬编码",
    "value": "让模型自主学习数据内在规律"
  },
  "微调": {
    "detailedDefinition": "基于预训练模型，用自有数据二次训练适配",
    "value": "定制模型适配私有业务场景"
  },
  "推理": {
    "detailedDefinition": "训练完成后，输入内容让模型生成输出",
    "value": "模型运行生成回答的计算过程"
  },
  "参数量": {
    "detailedDefinition": "模型神经网络权重总量，代表模型能力规模",
    "value": "决定模型理解与生成能力上限"
  },
  "温度": {
    "detailedDefinition": "控制 AI 输出随机性参数，数值越高创意越强",
    "value": "调节回答稳定程度与发散程度"
  },
  "开源模型 vs 闭源模型": {
    "detailedDefinition": "代码权重公开；仅可调用 API 两种大模型",
    "value": "两类授权模式的大语言模型"
  },
  "API Key 密钥": {
    "detailedDefinition": "调用厂商接口专属身份密钥，鉴权计费",
    "value": "身份凭证，管控接口调用权限"
  },
  "认证 Authentication": {
    "detailedDefinition": "校验用户 / 程序身份是否合法流程",
    "value": "验证访问者真实合法身份"
  },
  "授权 Authorization": {
    "detailedDefinition": "确认身份后分配对应操作访问权限",
    "value": "管控不同用户可操作资源范围"
  },
  "Token / JWT 令牌": {
    "detailedDefinition": "加密身份凭证，登录后用于接口鉴权",
    "value": "无状态校验用户登录身份权限"
  },
  "OAuth 第三方登录": {
    "detailedDefinition": "授权第三方账号登录本站的安全协议",
    "value": "免注册，使用微信谷歌等快捷登录"
  },
  "哈希 Hash(密码存储)": {
    "detailedDefinition": "单向加密算法，原文不可逆推密文",
    "value": "安全存储用户密码，防泄露明文"
  },
  "加密 Encryption": {
    "detailedDefinition": "通过算法将明文转为密文防止窃取",
    "value": "传输存储数据，防止信息窃听"
  },
  ".env 文件 / 密钥泄露": {
    "detailedDefinition": "存放密钥配置文件；密钥外泄安全事故",
    "value": "统一存密钥，泄露会引发入侵风险"
  },
  "速率限制 Rate Limiting": {
    "detailedDefinition": "限制单位时间接口请求次数防护策略",
    "value": "防止接口被高频刷请求攻击"
  },
  "SQL注入 SQL Injection": {
    "detailedDefinition": "恶意输入拼接 SQL，非法读取篡改数据库",
    "value": "高危漏洞，窃取、破坏库内数据"
  },
  "XSS 跨站脚本": {
    "detailedDefinition": "注入恶意 JS 代码，窃取用户浏览器信息",
    "value": "盗取用户 Cookie、账号凭证"
  },
  "CSRF 跨站请求伪造": {
    "detailedDefinition": "诱导用户不知情发起伪造恶意请求",
    "value": "冒用用户身份执行非法操作"
  },
  "CORS 跨域": {
    "detailedDefinition": "浏览器同源策略限制，跨站点访问限制",
    "value": "配置放行，允许前端跨站调接口"
  },
  "防火墙 Firewall": {
    "detailedDefinition": "网络安全屏障，拦截异常 IP 与非法请求",
    "value": "过滤恶意访问，隔离危险流量"
  },
  "最小权限原则 Least Privilege": {
    "detailedDefinition": "仅分配完成工作必需最低操作权限",
    "value": "缩小漏洞造成的安全破坏范围"
  },
  "软件即服务": {
    "detailedDefinition": "云端在线软件，按需订阅直接使用",
    "value": "无需部署，开箱即用线上软件"
  },
  "托管平台": {
    "detailedDefinition": "厂商代为运维服务器、服务的线上平台",
    "value": "免除自行运维底层服务器成本"
  },
  "后端即服务": {
    "detailedDefinition": "预封装后端接口、数据库云端平台",
    "value": "免开发后端，快速搭建应用服务"
  },
  "支付网关": {
    "detailedDefinition": "对接各大支付渠道的统一中转接口",
    "value": "统一接入各类线上支付渠道"
  },
  "Stripe 支付": {
    "detailedDefinition": "海外主流线上支付服务商，支持外币收单",
    "value": "海外网站收取国际信用卡付款"
  },
  "支付宝/微信支付": {
    "detailedDefinition": "国内主流第三方移动线上支付渠道",
    "value": "国内平台实现人民币线上收款"
  },
  "认证服务": {
    "detailedDefinition": "独立负责登录、鉴权、账号管理服务",
    "value": "统一管理全平台账号登录校验"
  },
  "邮件服务": {
    "detailedDefinition": "发送、接收、管理邮件的服务接口 / 平台",
    "value": "程序自动发送通知、验证码邮件"
  },
  "短信服务": {
    "detailedDefinition": "运营商短信接口，程序批量发送短信",
    "value": "下发验证码、营销通知类短信"
  },
  "数据分析": {
    "detailedDefinition": "采集、清洗、统计业务数据挖掘价值",
    "value": "从业务数据提炼运营决策依据"
  },
  "域名注册商": {
    "detailedDefinition": "官方授权售卖、管理域名的服务商",
    "value": "注册、续费、解析管理网站域名"
  },
  "云厂商": {
    "detailedDefinition": "提供服务器、存储、AI 算力的云服务企业",
    "value": "一站式采购各类云端计算资源"
  },
  "API 中转/聚合平台": {
    "detailedDefinition": "聚合多厂商接口，统一转发调用请求",
    "value": "整合多 API，统一鉴权管控用量"
  },
  "内容管理系统": {
    "detailedDefinition": "可视化管理图文页面，无需写代码建站",
    "value": "快速搭建网站，可视化编辑内容"
  },
  "低代码/无代码": {
    "detailedDefinition": "拖拽可视化搭建应用，极少手写代码",
    "value": "降低开发门槛，快速搭建业务系统"
  },
  "Vibe Coding 氛围编程": {
    "detailedDefinition": "AI 辅助沉浸式开发，人机协同写代码",
    "value": "依托 AI 大幅提升编码开发效率"
  },
  "AI 编程工具 / AI 代码编辑器": {
    "detailedDefinition": "内置大模型，智能补全、生成代码软件",
    "value": "自动生成、优化、排查代码问题"
  },
  "HTML / CSS / JavaScript": {
    "detailedDefinition": "前端三大核心语言，搭建页面与交互",
    "value": "构建网页布局、样式、交互逻辑"
  },
  "开发者工具 / F12 控制台": {
    "detailedDefinition": "浏览器调试前端页面、接口的工具",
    "value": "调试页面样式、查看接口请求数据"
  },
  "本地运行 / localhost": {
    "detailedDefinition": "本机电脑启动项目，仅本机可访问",
    "value": "开发调试，无需部署到线上服务器"
  },
  "构建 / 编译 Build": {
    "detailedDefinition": "转换源代码为可运行程序 / 静态资源",
    "value": "压缩打包代码，适配线上运行环境"
  },
  "响应式设计": {
    "detailedDefinition": "页面自动适配手机、电脑不同屏幕尺寸",
    "value": "一套页面兼容多终端设备浏览"
  },
  "数据库迁移 / Migration": {
    "detailedDefinition": "版本化管理数据表结构变更脚本",
    "value": "统一同步多环境数据表结构更新"
  },
  "备份 Backup": {
    "detailedDefinition": "定时复制数据库、文件做数据副本",
    "value": "数据丢失故障后可恢复业务资料"
  },
  "定时任务 / 计划任务 Cron": {
    "detailedDefinition": "服务器定时自动执行指定脚本程序",
    "value": "周期性自动执行清理、统计任务"
  },
  "爬虫 / 数据抓取": {
    "detailedDefinition": "程序自动批量访问网页提取公开数据",
    "value": "批量采集网络公开文本、图片数据"
  },
  "开源协议 / 许可证": {
    "detailedDefinition": "规范开源代码使用、修改分发的法律条款",
    "value": "界定开源代码商用、分发权限"
  }
};

const termUseCaseUpdates: Record<string, string> = {
  "服务器": "网站、AI 接口、数据库部署",
  "客户端": "手机 APP、浏览器、桌面软件",
  "前端": "网页、小程序、软件可视化界面",
  "后端": "订单、用户、AI 推理服务开发",
  "网址": "浏览器访问页面、调用 API 接口",
  "域名": "企业官网、线上业务平台入口",
  "IP地址": "服务器组网、内网设备连通管理",
  "DNS 域名解析": "域名绑定服务器、线上建站",
  "HTTP/HTTPS": "网页访问、前后端接口请求通信",
  "端口": "一台服务器部署网站、数据库、AI 服务",
  "数据库": "存储用户、订单、业务结构化数据",
  "API 应用程序接口": "前后端联调、第三方服务对接",
  "带宽/流量": "服务器托管、CDN、云服务器计费",
  "云计算": "AI 训练、网站、系统云端部署",
  "云服务器/VPS": "中小型网站、测试环境、轻量 AI 服务",
  "部署": "开发完成后上架线上服务器",
  "上线/生产环境": "面向大众开放的官网、付费系统",
  "开发/测试/生产环境": "项目迭代、新功能灰度验证",
  "环境变量": "数据库密钥、API 密钥、多环境配置",
  "容器": "多项目混布、跨服务器迁移服务",
  "Docker": "后端项目、AI 模型容器打包交付",
  "镜像": "批量部署统一环境服务、集群扩容",
  "Kubernetes / K8s": "大型平台、AI 集群、高并发系统运维",
  "对象存储": "图片、视频、附件、模型文件存储",
  "CDN 内容分发网络": "网站图片、视频、静态 JS 加速访问",
  "反向代理 / Nginx": "网站分流、接口转发、静态资源托管",
  "负载均衡": "高并发商城、AI 接口、流量高峰分流",
  "SSH 远程登录": "远程运维云服务器、执行运维命令",
  "SSL/TLS 证书": "官网、支付平台、API 接口加密",
  "Serverless 无服务器": "轻量接口、定时任务、AI 简易调用",
  "日志": "线上故障排查、用户行为审计",
  "监控": "服务器负载、接口报错实时告警",
  "缓存": "商品列表、用户信息、AI 问答缓存",
  "Redis": "登录会话、热点数据、分布式锁",
  "消息队列": "短信推送、订单延时任务、AI 异步任务",
  "编程语言": "网站、AI 脚本、后端服务开发编码",
  "库": "图片处理、AI 计算、加密工具调用",
  "框架": "Web 网站、AI 应用、后端接口快速开发",
  "包/依赖": "AI 模型依赖、前端组件、数据库驱动",
  "包管理器": "前端 npm、Python pip、Java maven",
  "技术栈": "新项目前期技术方案规划设计",
  "技术选型": "创业项目、AI 平台、大型系统方案设计",
  "开源": "免费框架、开源大模型、工具组件使用",
  "代码编辑器 / IDE": "程序员日常写代码、调试项目程序",
  "终端 / 命令行": "服务器运维、本地编译、AI 脚本运行",
  "版本控制": "团队多人协作开发项目代码管理",
  "Git": "几乎所有软件开发项目代码管理",
  "GitHub / 代码仓库": "开源项目托管、企业远程代码存储",
  "提交/推送": "每日开发完成同步代码至远程仓库",
  "分支": "迭代新功能、bug 修复、版本灰度开发",
  "CI/CD 持续集成与部署": "互联网产品快速迭代、自动发布服务",
  "Bug": "开发测试、线上运行出现功能异常",
  "调试": "开发阶段排查代码报错、逻辑异常",
  "测试": "单元测试、接口测试、上线前验收",
  "SDK": "对接支付、AI 大模型、短信、登录服务",
  "JSON 数据格式": "接口请求返回、AI 对话数据传输",
  "REST API": "企业系统、AI 通用接口标准化设计",
  "Webhook 回调": "支付结果回调、AI 任务完成通知",
  "WebSocket": "在线聊天、实时数据看板、AI 流式输出",
  "ORM 对象关系映射": "后端开发快速读写业务数据表",
  "人工智能": "智能客服、AI 绘图、数据分析、大模型",
  "大语言模型": "AI 问答、文案写作、代码辅助、智能 Agent",
  "提示词": "调用大模型、定制 AI 输出格式与风格",
  "Token 词元": "大模型计费、上下文长度限制计算",
  "上下文 / 上下文窗口": "多轮对话、长文档 AI 问答场景",
  "提示工程": "企业 AI 应用、专业领域问答调优",
  "幻觉": "专业知识库、企业 RAG 场景需规避",
  "API调用 vs 本地部署": "小型 AI 工具选 API，隐私项目本地部署",
  "Agent 智能体": "自动数据分析、AI 自动化工作流",
  "MCP 模型上下文协议": "AI Agent 调用数据库、接口统一标准",
  "RAG 检索增强生成": "企业私有知识库、内部文档问答 AI",
  "Embedding 嵌入向量": "文档检索、知识库匹配、文本分类",
  "向量数据库": "RAG 知识库、海量文本语义检索系统",
  "多模态": "图文问答、AI 绘图、视频理解模型",
  "机器学习": "图像识别、用户推荐、数据预测",
  "微调": "行业专属大模型、企业私有数据优化",
  "推理": "线上 AI 服务、本地模型生成内容",
  "参数量": "选型大模型，区分轻量 / 巨型模型",
  "温度": "文案创作、严谨问答差异化调参",
  "开源模型 vs 闭源模型": "本地私有化部署选开源，快速开发选闭源 API",
  "API Key 密钥": "调用 GPT、各类第三方 AI 接口鉴权",
  "认证 Authentication": "网站登录、接口访问身份校验",
  "授权 Authorization": "后台管理系统、多角色权限管控",
  "Token / JWT 令牌": "前后端分离项目、APP 登录鉴权",
  "OAuth 第三方登录": "网站、APP 微信 / 谷歌快捷登录",
  "哈希 Hash(密码存储)": "用户账号密码数据库加密存储",
  "加密 Encryption": "用户隐私、支付数据传输加密保护",
  ".env 文件 / 密钥泄露": "本地 / 服务器存放数据库、API 密钥",
  "速率限制 Rate Limiting": "开放 API、公开接口防恶意刷量",
  "SQL注入 SQL Injection": "网站、后台管理系统安全防护",
  "XSS 跨站脚本": "前端页面、用户评论区安全防护",
  "CSRF 跨站请求伪造": "网站表单、后台操作安全防护",
  "CORS 跨域": "前端本地调试、前后端分离项目",
  "防火墙 Firewall": "服务器、企业内网网络安全防护",
  "最小权限原则 Least Privilege": "服务器账号、后台角色权限分配",
  "软件即服务": "在线 AI 工具、云端 CRM、协作办公软件",
  "托管平台": "AI 模型托管、网站一键托管平台",
  "后端即服务": "小程序、轻量 APP 快速开发",
  "支付网关": "电商、付费会员系统收款对接",
  "Stripe 支付": "外贸独立站、海外 SaaS 产品收款",
  "支付宝/微信支付": "国内电商、小程序、APP 付费场景",
  "认证服务": "多端统一账号、企业单点登录系统",
  "邮件服务": "注册验证码、业务通知邮件推送",
  "短信服务": "账号验证码、活动短信批量发送",
  "数据分析": "平台用户行为、营收数据统计分析",
  "域名注册商": "搭建官网、业务平台注册域名",
  "云厂商": "采购云服务器、向量库、AI 推理算力",
  "API 中转/聚合平台": "多模型 AI 平台、聚合第三方接口服务",
  "内容管理系统": "企业官网、资讯博客、活动页面搭建",
  "低代码/无代码": "企业内部管理系统、简单业务工具",
  "Vibe Coding 氛围编程": "日常后端、前端、AI 脚本开发",
  "AI 编程工具 / AI 代码编辑器": "程序员写代码、排错、重构项目",
  "HTML / CSS / JavaScript": "所有网页、小程序前端页面开发",
  "开发者工具 / F12 控制台": "前端页面调试、排查接口报错问题",
  "本地运行 / localhost": "本地写代码、调试前后端项目",
  "构建 / 编译 Build": "前端打包、后端程序编译上线",
  "响应式设计": "官网、H5 活动页适配手机电脑",
  "数据库迁移 / Migration": "迭代更新数据表、同步开发生产库",
  "备份 Backup": "服务器数据库、业务文件定期备份",
  "定时任务 / 计划任务 Cron": "每日数据统计、定时清理缓存、发通知",
  "爬虫 / 数据抓取": "行业资讯采集、公开数据汇总分析",
  "开源协议 / 许可证": "使用开源框架、开源大模型合规判定"
};

const termLabelOverrides: Record<string, string> = {
  '上下文 / 上下文窗口': '上下文窗口',
  'MCP 模型上下文协议': 'MCP',
  'API 应用程序接口': 'API 接口',
  '认证 Authentication': '认证',
  '授权 Authorization': '授权',
  'Vibe Coding 氛围编程': '氛围编程',
  '本地运行 / localhost': '本地运行'
};

const requiredTermOverrides: Record<string, boolean> = {
  'API调用 vs 本地部署': false
};

const limit = (value: string, max: number) => Array.from(value).slice(0, max).join('');

const orderedRawAiTerms = aiTermGroups.flatMap(({ slug }) => rawAiTerms.filter((term) => term.group === slug));

export const aiTerms: AiTerm[] = orderedRawAiTerms.map((term, index) => {
  const copy = groupCopy[term.group];
  const update = termCopyUpdates[term.term];

  return {
    ...term,
    order: index + 1,
    term: termLabelOverrides[term.term] ?? term.term,
    isRequired: requiredTermOverrides[term.term] ?? term.isRequired,
    detailedDefinition: update?.detailedDefinition ?? limit(`${term.briefDefinition}，${copy.detailedDefinition}`, 40),
    value: update?.value ?? limit(copy.value, 30),
    useCase: termUseCaseUpdates[term.term] ?? limit(copy.useCase, 20)
  };
});

const expectedGroupCounts: Record<AiTermGroup, number> = {
  'ai-llm': 21,
  'network-software': 36,
  'vibe-coding': 50,
  'third-party': 15
};

const dataIssues = [
  ...aiTermGroups.flatMap(({ slug, label }) => aiTerms.filter((term) => term.group === slug).length === expectedGroupCounts[slug] ? [] : [`${label}数量不正确`]),
  ...(aiTerms.length === 122 ? [] : ['术语总数不正确']),
  ...(aiTerms.filter((term) => term.isRequired).length === 65 ? [] : ['必学词汇数量不正确']),
  ...aiTerms.flatMap((term) => (
    Array.from(term.detailedDefinition).length <= 40
      && Array.from(term.value).length <= 30
      && Array.from(term.useCase).length <= 30
      ? []
      : [`${term.term}的补充说明超过字数限制`]
  ))
];

if (dataIssues.length > 0) {
  throw new Error(`AI术语数据校验失败：${dataIssues.join('；')}`);
}
