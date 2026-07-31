const USER_STORAGE_KEY = "jma-current-user-id";
const DEVICE_USER_KEY = "jma-device-user-id";
const AUTH_PASSWORD_KEY = "jma-current-user-password";
const AUTH_NAME_KEY = "jma-current-user-name";
const CLOUDBASE_API_BASE = "https://magicj-web-d5g9yvowj6862f7a2-1439083941.ap-shanghai.app.tcloudbase.com";

function getDeviceUserId() {
  let id = localStorage.getItem(DEVICE_USER_KEY);
  if (!id) {
    id = `student-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36).slice(-4)}`;
    localStorage.setItem(DEVICE_USER_KEY, id);
  }
  return id;
}

function userStorageKey(key) {
  return `${getDeviceUserId()}_${key}`;
}

const deviceUserId = getDeviceUserId();
let STORAGE_KEY = userStorageKey("jma-enrollment-demo-v2");

const levelDefs = [
  { min: 0, title: "见习魔法师", icon: "wand", artifact: "魔法杖" },
  { min: 20, title: "初阶咒术师", icon: "pet", artifact: "星座灵宠" },
  { min: 40, title: "中阶召唤师", icon: "book", artifact: "魔法书" },
  { min: 60, title: "高阶魔法师", icon: "orb", artifact: "魔法水晶球" },
  { min: 80, title: "魔法导师", icon: "key", artifact: "魔法钥匙" },
  { min: 100, title: "炼金大术士", icon: "seal", artifact: "炼金印章" },
];

const academies = [
  {
    id: "spell",
    order: "I",
    name: "咒语学院",
    title: "咒语学院",
    castle: "咒语学院",
    subtitle: "第一试炼 · AI核心理论",
    panelSubtitle: "入门基础，学会向 AI 发出清晰魔咒。",
    terrain: "森林与卷轴城堡",
    icon: "魔法帽",
    level: "见习魔法师",
    guardian: "咒",
    liveTime: "2026-05-31 19:30",
    entranceUrl: "/academy/spell",
    nextId: "pet",
    mapPosition: { x: "16%", y: "32%" },
    position: { left: "16%", top: "32%", width: "15%", height: "23%", popupLeft: "26px", popupTop: "20%" },
    overview: "学习地点：咒语学院；对应称号：见习魔法师；获得武器：魔法杖；课程名称：1.AI核心理论；课时：2；魔力值：20。",
    learningContent: ["6大AI核心概念", "模型分类与部署技巧", "AI运行原理", "AI交流秘诀"],
    cases: ["提示词编写黄金法则", "反向提取提示词", "优化大模型记忆"],
    terms: ["LLM 大模型", "Prompt 提示词", "Token 词元"],
    gift: "中美大模型对比表",
    tools: [
      { name: "豆包", description: "TODO：图纸未提供工具说明", url: "/academy/spell/tool/doubao" },
      { name: "DeepSeek", description: "TODO：图纸未提供工具说明", url: "/academy/spell/tool/deepseek" },
    ],
    progress: {
      total: 20,
      completed: 0,
      score: 0,
      courses: { total: 10, completed: 0, url: "/academy/spell/courses/lesson-1#course" },
      homework: { total: 5, completed: 0, url: "/academy/spell/courses/lesson-1#homework" },
      exam: { total: 1, completed: 0, url: "/academy/spell/courses/lesson-1#exam" },
    },
    actions: [
      { key: "live", label: "参加直播课", detail: "1.AI核心理论", score: 5 },
      { key: "homework", label: "完成作业", detail: "提示词编写黄金法则 / 反向提取提示词 / 优化大模型记忆", score: 10 },
      { key: "exam", label: "通过考试", detail: "LLM 大模型 / Prompt 提示词 / Token 词元", score: 5 },
    ],
  },
  {
    id: "pet",
    order: "II",
    name: "灵宠学院",
    title: "灵宠学院",
    castle: "灵宠学院",
    subtitle: "第二试炼 · AI工具",
    panelSubtitle: "训练 AI 灵宠和 Agent 分身。",
    terrain: "湖泊与灵宠花园",
    icon: "爪印",
    level: "初阶咒术师",
    guardian: "兽",
    liveTime: "2026-05-29 20:00",
    entranceUrl: "/academy/pet",
    nextId: "circle",
    mapPosition: { x: "45%", y: "35%" },
    position: { left: "45%", top: "35%", width: "14%", height: "21%", popupLeft: "48%", popupTop: "20%" },
    overview: "学习地点：灵宠学院；对应称号：初阶咒术师；获得武器：魔法宠物；课程名称：2.AI 工具；课时：1.5；魔力值：20。",
    learningContent: ["LLM高阶使用技巧", "Agent智能体实操", "实用案例分享（生活/办公/创业）", "领养AI宠物"],
    cases: ["苏格拉底提问法让AI说真话", "创意PPT制作", "Excel表格高效处理"],
    terms: ["Agent智能体", "Skills 技能"],
    gift: "六大AI巨头工具大比拼",
    tools: [
      { name: "Kimi", description: "TODO：图纸未提供工具说明", url: "/academy/pet/tool/kimi" },
      { name: "Qclaw", description: "TODO：图纸未提供工具说明", url: "/academy/pet/tool/qclaw" },
      { name: "Workbuddy", description: "TODO：图纸未提供工具说明", url: "/academy/pet/tool/workbuddy" },
    ],
    progress: {
      total: 20,
      completed: 0,
      score: 0,
      courses: { total: 10, completed: 0, url: "/academy/pet/courses" },
      homework: { total: 5, completed: 0, url: "/academy/pet/homework" },
      exam: { total: 1, completed: 0, url: "/pet-exam.html" },
    },
    actions: [
      { key: "live", label: "参加直播课", detail: "2.AI 工具", score: 5 },
      { key: "homework", label: "完成作业", detail: "LLM高阶使用技巧 / Agent智能体实操 / 领养AI宠物", score: 10 },
      { key: "exam", label: "通过考试", detail: "Agent智能体 / Skills 技能", score: 5 },
    ],
  },
  {
    id: "circle",
    order: "III",
    name: "龙虾学院",
    title: "龙虾学院",
    castle: "龙虾学院",
    subtitle: "第三试炼 · AI智能体介绍 / AI智能体配置",
    panelSubtitle: "搭建自动化、网页和工作流法阵。",
    terrain: "水晶湖与法阵广场",
    icon: "魔法阵",
    level: "中阶召唤师",
    guardian: "阵",
    liveTime: "2026-06-14 19:30",
    entranceUrl: "/academy/circle",
    nextId: "legion",
    mapPosition: { x: "36%", y: "72%" },
    position: { left: "36%", top: "72%", width: "18%", height: "23%", popupLeft: "23%", popupTop: "43%" },
    overview: "学习地点：龙虾学院；对应称号：中阶召唤师；获得武器：魔法书；课程名称：3. AI智能体介绍 / 4. AI智能体配置；课时：1.5 + 1.5；魔力值：20 + 20。",
    learningContent: [
      "3. AI智能体介绍：云端小龙虾介绍与对比；0代码做应用；AI创意视频制作",
      "4. AI智能体配置：Marvis；龙虾实战安装和配置；飞书集成",
    ],
    cases: [
      "手搓App/小程序/个人网站",
      "一秒变身大漫画导演",
      "使用专业垂直大模型",
      "左青龙右白马",
      "Arkclaw实战指南",
      "飞书遥控台",
    ],
    terms: ["Openclaw", "Console控制台", "API 接口", "Workflow 工作流", "Context 上下文", "Claude Code", "Codex"],
    gift: "/",
    tools: [
      { name: "扣子", description: "TODO：图纸未提供工具说明", url: "/academy/circle/tool/coze" },
      { name: "秒悟", description: "TODO：图纸未提供工具说明", url: "/academy/circle/tool/miaowu" },
      { name: "Seedance", description: "TODO：图纸未提供工具说明", url: "/academy/circle/tool/seedance" },
      { name: "Arkclaw", description: "TODO：图纸未提供工具说明", url: "/academy/circle/tool/arkclaw" },
      { name: "飞书", description: "TODO：图纸未提供工具说明", url: "/academy/circle/tool/feishu" },
    ],
    progress: {
      total: 20,
      completed: 0,
      score: 0,
      courses: { total: 10, completed: 0, url: "/academy/circle/courses" },
      homework: { total: 5, completed: 0, url: "/academy/circle/homework" },
      exam: { total: 1, completed: 0, url: "/academy/circle/exam" },
    },
    actions: [
      { key: "live", label: "参加直播课", detail: "3. AI智能体介绍 / 4. AI智能体配置", score: 5 },
      { key: "homework", label: "完成作业", detail: "0代码做应用 / 飞书集成", score: 10 },
      { key: "exam", label: "通过考试", detail: "Workflow 工作流 / Context 上下文 / Codex", score: 5 },
    ],
  },
  {
    id: "legion",
    order: "IV",
    name: "OPC学院",
    title: "OPC学院",
    castle: "OPC学院",
    subtitle: "第四试炼 · OPC一人公司",
    panelSubtitle: "组织多 Agent 和 AI 团队协作。",
    terrain: "云岛与旗帜城堡",
    icon: "旗帜",
    level: "高阶魔法师",
    guardian: "军",
    liveTime: "2026-06-08 19:30",
    entranceUrl: "/academy/legion",
    nextId: "final",
    mapPosition: { x: "78%", y: "25%" },
    position: { left: "78%", top: "25%", width: "15%", height: "21%", popupLeft: "60%", popupTop: "18%" },
    overview: "学习地点：OPC学院；对应称号：高阶魔法师；获得武器：魔法水晶；课程名称：5. OPC一人公司；课时：1.5；魔力值：20。",
    learningContent: ["搭建OPC一人公司", "公司架构与AI人设系统搭建"],
    cases: ["OPC一人公司，让多智能体为你打工", "飞书平台机场"],
    terms: ["Markdown 格式", ".MD 文件", "多Agent协作", "沙箱"],
    gift: "MD配置手册",
    tools: [
      { name: "Arkclaw", description: "TODO：图纸未提供工具说明", url: "/academy/legion/tool/arkclaw" },
      { name: "Workbuddy", description: "TODO：图纸未提供工具说明", url: "/academy/legion/tool/workbuddy" },
    ],
    progress: {
      total: 20,
      completed: 0,
      score: 0,
      courses: { total: 10, completed: 0, url: "/academy/legion/courses" },
      homework: { total: 5, completed: 0, url: "/academy/legion/homework" },
      exam: { total: 1, completed: 0, url: "/academy/legion/exam" },
    },
    actions: [
      { key: "live", label: "参加直播课", detail: "5. OPC一人公司", score: 5 },
      { key: "homework", label: "完成作业", detail: "公司架构与AI人设系统搭建", score: 10 },
      { key: "exam", label: "通过考试", detail: "Markdown 格式 / 多Agent协作 / 沙箱", score: 5 },
    ],
  },
  {
    id: "final",
    order: "V",
    name: "炼金学院",
    title: "炼金学院",
    castle: "炼金学院",
    subtitle: "第五试炼 · AI理财 / AI投资",
    panelSubtitle: "综合实战，把 AI 变成项目与投资能力。",
    terrain: "金色峡谷与水晶塔",
    icon: "皇冠",
    level: "炼金大术士",
    guardian: "金",
    liveTime: "2026-06-10 20:00 / 2026-06-12 20:00",
    entranceUrl: "/academy/final",
    nextId: null,
    mapPosition: { x: "81%", y: "71%" },
    position: { left: "81%", top: "71%", width: "17%", height: "23%", popupLeft: "58%", popupTop: "43%" },
    overview: "学习地点：炼金学院；对应称号：炼金大术士；获得武器：魔法钥匙；课程名称：6. AI 理财 / 7. AI 投资；课时：1.5 + 1.5；魔力值：20 + 20。",
    learningContent: ["6. AI 理财：智能挑选基金经理", "7. AI 投资：智能构建A股策略"],
    cases: ["让最牛基金经理为你打工", "大A散户武器大升级"],
    terms: ["Harness", "MCP 协议", "终端", "CLI 语言", "开源/闭源"],
    gift: "AI智选基金策略 / 大A智能投资组合",
    tools: [
      { name: "天天基金", description: "TODO：图纸未提供工具说明", url: "/academy/final/tool/fund" },
      { name: "Choice/东方财富", description: "TODO：图纸未提供工具说明", url: "/academy/final/tool/choice" },
    ],
    progress: {
      total: 20,
      completed: 0,
      score: 0,
      courses: { total: 10, completed: 0, url: "/academy/final/courses" },
      homework: { total: 5, completed: 0, url: "/academy/final/homework" },
      exam: { total: 1, completed: 0, url: "/academy/final/exam" },
    },
    actions: [
      { key: "live", label: "参加直播课", detail: "6. AI 理财 / 7. AI 投资", score: 5 },
      { key: "homework", label: "完成作业", detail: "智能挑选基金经理 / 智能构建A股策略", score: 10 },
      { key: "exam", label: "通过考试", detail: "Harness / MCP 协议 / CLI 语言", score: 5 },
    ],
  },
];

academies.forEach((academy, index) => {
  academy.shortName = academy.shortName || academy.name.replace("学院", "");
  academy.status = index === 0 ? "active" : "locked";
  academy.isLit = false;
  academy.isUnlocked = index === 0;
  academy.progress.courses.unlocked = index === 0;
  academy.progress.homework.unlocked = false;
  academy.progress.exam.unlocked = false;
});

const trials = academies;

const academyPopupRows = {
  spell: [
    {
      overview: "学习AI核心概念，了解AI运行原理",
      learning: "LLM/Prompt/Token 等概念， AI交流技巧与秘籍",
      tools: "豆包/DeepSeek\n等通用大模型",
    },
  ],
  pet: [
    {
      overview: "学习AI常用工具\n领取AI魔法宠物",
      learning: "让AI说真话/创意PPT制作/Excel表格处理",
      tools: "Qclaw\nWorkbuddy",
    },
  ],
  circle: [
    {
      overview: "云端Agent配置\n0代码做应用",
      learning: "手搓App/秒变成大导演/",
      tools: "扣子\n秒悟\nSeedance",
    },
    {
      overview: "龙虾实战安装和配置",
      learning: "Arkclaw实战指南\n飞书接入小龙虾",
      tools: "Arkclaw\n飞书",
    },
  ],
  legion: [
    {
      overview: "搭建OPC一人公司",
      learning: "一人公司架构与AI人设系统搭建",
      tools: "Arkclaw\nWorkbuddy",
    },
  ],
  final: [
    {
      overview: "智能理财",
      learning: "让最牛基金经理为你打工",
      tools: "天天基金",
    },
    {
      overview: "智能投资",
      learning: "大A散户武器大升级",
      tools: "Choice/东方财富",
    },
  ],
};

const spellLessonOne = {
  academyId: "spell",
  academyName: "咒语学院",
  lessonId: "lesson-1",
  order: 1,
  title: "魔法理论",
  fullTitle: "第一课 · 魔法理论",
  trialName: "第一试炼 · AI核心理论",
  courseResource: {
    name: "第一课_魔法理论",
    platform: "百度网盘",
    url: "https://pan.baidu.com/s/1TXNQgKp3SQ78qvt2rL-4ew",
    extractCode: "x9qr",
  },
  homework: {
    title: "第一课作业 · 梦想与提问练习",
    description: "完成两个小练习，写下你的 AI 梦想，并学会用 Prompt 黄金法则向大模型提出清晰问题。",
    questions: [
      {
        id: "dream-board",
        storagePrefix: "q1",
        order: 1,
        title: "AI 梦想题板",
        fullTitle: "作业一 · AI梦想题板",
        prompt:
          "请填写你想用 AI 完成的梦想",
        placeholder: "写下你的 AI 魔法梦想，例如：我想做一个个人网站，记录我的作品和故事……",
        maxLength: 500,
        completionLabel: "提交",
        emptyWarning: "请先填写你的 AI 梦想。",
        visibilityOptions: [
          {
            id: "academy",
            label: "全体可见",
            description: "所有学员都可以看到你的内容。",
          },
          {
            id: "dean",
            label: "仅院长可见",
            description: "院长会查看并协助你优化学习与实现愿望。",
          },
        ],
        defaultVisibility: "dean",
      },
      {
        id: "prompt-golden-rule",
        storagePrefix: "q2",
        order: 2,
        title: "Prompt 黄金法则练习",
        fullTitle: "作业二 · Prompt黄金法则练习",
        prompt:
          "请你根据下方提示，设计一段完整 Prompt，并发送给任意大模型。然后将你的 Prompt 提示词和大模型回答，一起复制粘贴到下面的输入框中。",
        hint: "Prompt 黄金法则：角色 + 背景 + 任务 + 要求 + 格式 + 禁忌",
        placeholder: "请粘贴你的 Prompt 提示词和大模型回答，例如：\n\n【我的 Prompt】\n你是一位……\n\n【大模型回答】\n……",
        maxLength: 1500,
        completionLabel: "提交",
        emptyWarning: "请先粘贴你的 Prompt 和大模型回答。",
        visibilityOptions: [
          {
            id: "academy",
            label: "全体可见",
            description: "所有学员都可以看到你的内容。",
          },
          {
            id: "dean",
            label: "仅院长可见",
            description: "院长会查看并协助你优化学习与实现愿望。",
          },
        ],
        defaultVisibility: "dean",
      },
    ],
  },
  exam: {
    title: "第一课考试 · 魔法理论挑战",
    url: "https://zfjxfrf0qd59.meoo.fun/",
  },
};

const petLessonOne = {
  academyId: "pet",
  academyName: "灵宠学院",
  lessonId: "lesson-1",
  order: 2,
  title: "魔法工具",
  fullTitle: "第二课 · 魔法工具",
  trialName: "第二试炼 · 魔法工具",
  courseResource: {
    name: "第二课_AI工具",
    platform: "百度网盘",
    url: "https://pan.baidu.com/s/16sJzcTqcwfNUACVa0PVjpg",
    extractCode: "tpds",
  },
  homework: {
    title: "第二课作业 · AI工具实操与灵宠领养",
    description: "完成两个实操练习，掌握AI工具的使用方法并领养你的AI灵宠。",
    questions: [
      {
        id: "model-top10",
        storagePrefix: "q1",
        order: 1,
        title: "大模型十大技巧学习",
        fullTitle: "作业一 · 大模型十大技巧学习",
        prompt: "挑选十大技巧中的一种，在下方粘贴问题与模型回答。",
        placeholder: "",
        maxLength: 1500,
        completionLabel: "提交",
        emptyWarning: "请先粘贴你的问题与模型回答。",
        visibilityOptions: [
          {
            id: "academy",
            label: "全体可见",
            description: "所有学员都可以看到你的内容。",
          },
          {
            id: "dean",
            label: "仅院长可见",
            description: "院长会查看并给予指导。",
          },
        ],
        defaultVisibility: "dean",
      },
      {
        id: "agent-pet",
        storagePrefix: "q2",
        order: 2,
        title: "领养AI灵宠",
        fullTitle: "作业二 · 领养AI灵宠",
        prompt: "1. 完成Workbuddy指定任务，领取两只宠物\n2. 将2只宠物名字复制到下方文本框中\n3. 分享其中一只（图片）至AI魔法学院交流群；",
        placeholder: "例如：小白、小黑",
        maxLength: 500,
        completionLabel: "提交",
        emptyWarning: "请先将2只宠物名字复制到下方文本框中。",
        checkboxLabel: "已分享至AI魔法学院交流群",
        checkboxEmptyWarning: "请先勾选\"已分享至AI魔法学院交流群\"。",
        visibilityOptions: [
          {
            id: "academy",
            label: "全体可见",
            description: "所有学员都可以看到你的内容。",
          },
          {
            id: "dean",
            label: "仅院长可见",
            description: "院长会查看并给予指导。",
          },
        ],
        defaultVisibility: "dean",
      },
    ],
  },
  exam: {
    title: "第二课考试 · AI工具挑战",
    url: "/pet-exam.html",
  },
};

const circleLessonOne = {
  academyId: "circle",
  academyName: "龙虾学院",
  lessonId: "lesson-1",
  order: 3,
  title: "AI智能体",
  fullTitle: "第三课 · AI智能体",
  trialName: "第三试炼 · AI智能体",
  courseResource: {
    name: "第三课_AI智能体",
    platform: "百度网盘",
    url: "https://pan.baidu.com/s/1KK9BxgXkGcKmV7U02Orwbg",
    extractCode: "3s3u",
  },
  homework: {
    title: "第三课作业 · 用AI打造个人产品",
    description: "完成一个实操练习，用AI打造个人产品。",
    questions: [
      {
        id: "model-top10",
        storagePrefix: "q1",
        order: 1,
        title: "创建一款APP/网页/小程序",
        fullTitle: "作业一 · 创建一款APP/网页/小程序",
        prompt: "推荐：点亮自己的旅游地图（可以用Plan模式）",
        placeholder: "",
        maxLength: 1500,
        noTextInput: true,
        checkboxLabel: "已分享至交流群",
        checkboxEmptyWarning: "请先勾选\"已分享至交流群\"。",
        noVisibilityOptions: true,
        completionLabel: "提交",
        emptyWarning: "请先勾选\"已分享至交流群\"。",
        visibilityOptions: [
          {
            id: "academy",
            label: "全体可见",
            description: "所有学员都可以看到你的内容。",
          },
          {
            id: "dean",
            label: "仅院长可见",
            description: "院长会查看并给予指导。",
          },
        ],
        defaultVisibility: "dean",
      },
      {
        id: "agent-pet",
        storagePrefix: "q2",
        order: 2,
        title: "用AI工具创建自动提醒功能",
        fullTitle: "作业二 · 用AI工具创建自动提醒功能（如每日AI新闻播报，世界杯比赛播报等），将自动化任务的提示词复制到下方文本框",
        prompt: "",
        placeholder: "如：每天早上9点将前一天世界杯的比赛结果，发送给我。内容需包括比分，双方进球队员和下场对阵球队。",
        maxLength: 500,
        completionLabel: "提交",
        emptyWarning: "请输入自动化任务的提示词。",
        visibilityOptions: [
          {
            id: "academy",
            label: "全体可见",
            description: "所有学员都可以看到你的内容。",
          },
          {
            id: "dean",
            label: "仅院长可见",
            description: "院长会查看并给予指导。",
          },
        ],
        defaultVisibility: "dean",
      },
    ],
  },
  exam: {
    title: "第三课考试 · AI智能体",
    url: "/academy/circle/exam",
  },
};

const legionLessonOne = {
  ...circleLessonOne,
  academyId: "legion",
  academyName: "OPC学院",
  order: 4,
  title: "OPC一人公司",
  fullTitle: "第五课 · OPC一人公司",
  trialName: "第四试炼 · OPC一人公司",
  courseResource: {
    ...circleLessonOne.courseResource,
    url: "https://pan.baidu.com/s/1TIX2OEuEwLx4e4gKEkaADQ",
    extractCode: "hgg5",
  },
  homework: {
    ...circleLessonOne.homework,
    title: "第三课作业",
    questions: [
      {
        ...circleLessonOne.homework.questions[0],
        title: "用工程化Vibe coding方式做一款产品",
        fullTitle: "作业一： 用工程化Vibe coding方式做一款产品",
        prompt: "推荐：一个简单的个人网页",
      },
    ],
  },
  exam: {
    title: "第五课考试 · OPC一人公司",
    url: "/academy/legion/exam",
  },
};

const defaultState = {
  profile: null,
  lit: [],
  selectedTrial: 0,
  activeRoute: null,
  popupAcademyId: null,
  completed: trials.map(() => []),
  lastLevelIndex: 0,
};

const state = loadState();

const LESSON_ONE_MAX_POWER = 20;
const lessonOnePowerConfig = {
  course: 5,
  homework1: 5,
  homework2: 5,
  exam: 10,
};

const modal = document.querySelector("[data-modal]");
const onboardingModal = document.querySelector("[data-onboarding-modal]");
const ritualModal = document.querySelector("[data-ritual-modal]");
const levelModal = document.querySelector("[data-level-modal]");
const rewardModal = document.querySelector("[data-reward-modal]");
const feedbackModal = document.querySelector("[data-feedback-modal]");
const guideModal = document.querySelector("[data-guide-modal]");
const certificateModal = document.querySelector("[data-certificate-modal]");
const onboardingForm = document.querySelector("[data-onboarding-form]");
const authTitleEl = document.querySelector("[data-auth-title]");
const authEyebrowEl = document.querySelector("[data-auth-eyebrow]");
const authCopyEl = document.querySelector("[data-auth-copy]");
const authSubmitEl = document.querySelector("[data-auth-submit]");
const authMessageEl = document.querySelector("[data-auth-message]");
const authSwitchEl = document.querySelector("[data-auth-switch]");
const energyEl = document.querySelector("[data-energy]");
const progressEl = document.querySelector("[data-progress]");
const titleEl = document.querySelector("[data-level-title]");
const nameEl = document.querySelector("[data-student-name]");
const idEl = document.querySelector("[data-student-id]");
const badgesEl = document.querySelector("[data-profile-badges]");
const artifactIconEl = document.querySelector("[data-artifact-icon]");
const artifactLabelEl = document.querySelector("[data-artifact-label]");
const castleButtons = Array.from(document.querySelectorAll("[data-trial]"));
const mapStage = document.querySelector("[data-map-stage]");
const wand = document.querySelector("[data-wand]");
const academyListEl = document.querySelector("[data-academy-list]");
const castlePopup = document.querySelector("[data-castle-popup]");
const popupEnterButton = document.querySelector("[data-popup-enter]");
const popupCourseButton = document.querySelector("[data-popup-courses]");
const popupHomeworkButton = document.querySelector("[data-popup-homework]");
const popupExamButton = document.querySelector("[data-popup-exam]");
const activeRoutePath = document.querySelector("[data-active-route-path]");
const levelNoEl = document.querySelector("[data-level-no]");
const litCountEl = document.querySelector("[data-lit-count]");
const mainTaskEl = document.querySelector("[data-main-task]");
const learningEntryListEl = document.querySelector("[data-learning-entry-list]");
const academyShell = document.querySelector(".academy-shell");
const lessonPage = document.querySelector("[data-lesson-page]");
const adminPage = document.querySelector("[data-admin-page]");
const adminMain = document.querySelector("[data-admin-main]");
const adminDenied = document.querySelector("[data-admin-denied]");
const adminContent = document.querySelector("[data-admin-content]");
const lessonCompletionModal = document.querySelector("[data-lesson-completion-modal]");
const currentParams = new URLSearchParams(window.location.search);
function normalizeAppBasePath(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/^([^/])/, "/$1");
}

const deployedAppBasePath = normalizeAppBasePath(window.JMA_BASE_PATH);
const configuredStaticAppBasePath = normalizeAppBasePath(window.JMA_STATIC_BASE_PATH);
const locationPathname = window.location.pathname.replace(/\/$/, "") || "/";
const legacyStaticAppBasePath = !deployedAppBasePath && configuredStaticAppBasePath
  ? configuredStaticAppBasePath
  : !deployedAppBasePath && locationPathname.startsWith("/app/")
    ? locationPathname.split("/").slice(0, 3).join("/")
    : "";
const staticAppBasePath = deployedAppBasePath || legacyStaticAppBasePath;

function stripAppBasePath(pathname) {
  if (!staticAppBasePath) return pathname;
  if (pathname === staticAppBasePath) return "/";
  if (pathname.startsWith(`${staticAppBasePath}/`)) return pathname.slice(staticAppBasePath.length) || "/";
  return pathname;
}

const rawPathname = stripAppBasePath(locationPathname);
const currentPath = (currentParams.get("route") || (legacyStaticAppBasePath ? "/" : rawPathname)).replace(/\/$/, "") || "/";
const isSpellLessonPath = [
  "/academy/spell",
  "/academy/spell/courses",
  "/academy/spell/homework",
  "/academy/spell/exam",
  "/academy/spell/courses/lesson-1",
].includes(currentPath);
const isPetLessonPath = [
  "/academy/pet",
  "/academy/pet/courses",
  "/academy/pet/homework",
  "/academy/pet/exam",
  "/academy/pet/courses/lesson-1",
].includes(currentPath);
const isCircleLessonPath = [
  "/academy/circle",
  "/academy/circle/courses",
  "/academy/circle/homework",
  "/academy/circle/courses/lesson-1",
].includes(currentPath);
const isLegionLessonPath = [
  "/academy/legion",
  "/academy/legion/courses",
  "/academy/legion/homework",
  "/academy/legion/courses/lesson-1",
].includes(currentPath);
const isLessonPath = isSpellLessonPath || isPetLessonPath || isCircleLessonPath || isLegionLessonPath;
const isAdminPath = currentPath === "/admin" || currentPath === "/dean/dashboard" || currentPath.startsWith("/admin/");

function getCurrentLessonConfig() {
  if (isLegionLessonPath) return legionLessonOne;
  if (isCircleLessonPath) return circleLessonOne;
  if (isPetLessonPath) return petLessonOne;
  return spellLessonOne;
}

function getCurrentLessonPrefix() {
  const config = getCurrentLessonConfig();
  return `${getLearningUserId()}_${config.academyId}_${config.lessonId}`;
}

function lessonCourseKey(suffix) {
  return `${getCurrentLessonPrefix()}_${suffix}`;
}

let ritualPage = 0;
let pendingLightIndex = null;
let currentUser = null;
let lessonSyncTimer = null;
let remoteProgressReady = false;
let authMode = "register";
let authSubmitting = false;

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      ...defaultState,
      ...stored,
      completed: trials.map((_, index) => stored.completed?.[index] || []),
    };
  } catch {
    return { ...defaultState, completed: trials.map(() => []) };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getCurrentUserId() {
  return currentParams.get("as") || sessionStorage.getItem(USER_STORAGE_KEY) || getDeviceUserId();
}

function getCurrentPassword() {
  return currentParams.get("code") || sessionStorage.getItem(AUTH_PASSWORD_KEY) || "";
}

function hasStoredLogin() {
  return Boolean(currentParams.get("as") || sessionStorage.getItem(USER_STORAGE_KEY));
}

function getLearningUserId() {
  if (currentUser?.role === "dean" || currentUser?.role === "assistant") return "student-001";
  return currentUser?.id || getCurrentUserId();
}

async function apiRequest(path, options = {}) {
  const configuredApiBase = String(window.JMA_API_BASE || "").replace(/\/$/, "");
  const apiBase = configuredApiBase || (window.location.hostname.endsWith(".tcloudbaseapp.com") ? CLOUDBASE_API_BASE : "");
  const apiPath = path.startsWith("/") ? path : `/${path}`;
  const headers = {
    "X-User-Id": getCurrentUserId(),
    ...(options.headers || {}),
  };
  const password = getCurrentPassword();
  if (password && !headers["X-Access-Code"]) headers["X-Access-Code"] = password;
  if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const response = await fetch(`${apiBase}${apiPath}`, { ...options, headers });
  const contentType = response.headers.get("Content-Type") || "";
  const body = contentType.includes("application/json") ? await response.json().catch(() => ({})) : {};
  if (!response.ok) {
    const error = new Error(body.message || body.error || "请求失败");
    error.status = response.status;
    error.body = body;
    throw error;
  }
  if (!contentType.includes("application/json")) {
    throw new Error("登录接口地址异常，请刷新页面后重试。");
  }
  return body;
}

async function loadCurrentUser() {
  if (!hasStoredLogin()) {
    currentUser = null;
    renderUserControls();
    return;
  }
  try {
    const result = await apiRequest("/api/me");
    currentUser = result.user;
  } catch {
    currentUser = null;
  }
  renderUserControls();
}

function renderUserControls() {
  document.querySelectorAll("[data-user-switch]").forEach((select) => {
    select.value = getCurrentUserId();
  });
  document.querySelectorAll("[data-admin-link]").forEach((button) => {
    button.hidden = currentUser?.role !== "dean";
  });
  document.querySelectorAll("[data-reenroll]").forEach((button) => {
    button.textContent = currentUser ? "已登录" : localStorage.getItem(AUTH_NAME_KEY) ? "登录" : "入院登记";
  });
}

function mapVisibilityToBackend(value) {
  return value === "academy" ? "public" : "dean";
}

function normalizeVisibility(value) {
  return value === "academy" ? "academy" : "dean";
}

function normalizeBackendVisibility(value) {
  return value === "public" ? "academy" : "dean";
}

function setBooleanStorage(key, value) {
  localStorage.setItem(key, value ? "true" : "false");
}

function applyRemoteLessonMapState(progress) {
  let changed = false;

  (progress.lesson_progress || []).forEach((row) => {
    const academyId = row.academy_id;
    if (!academyId || !row.all_completed) return;

    const academyIndex = getAcademyIndexById(academyId);
    if (academyIndex < 0) return;

    setBooleanStorage(userStorageKey(`academy_${academyId}_unlocked`), true);
    setBooleanStorage(userStorageKey(`academy_${academyId}_completed`), true);
    state.completed[academyIndex] = [0, 1, 2];
    if (!state.lit.includes(academyIndex)) state.lit.push(academyIndex);

    const nextAcademyId = getAcademyById(academyId)?.nextId;
    const nextAcademyIndex = getAcademyIndexById(nextAcademyId);
    if (nextAcademyIndex >= 0) {
      setBooleanStorage(userStorageKey(`academy_${nextAcademyId}_unlocked`), true);
      state.selectedTrial = nextAcademyIndex;
      state.activeRoute = { from: academyIndex, to: nextAcademyIndex };
    }

    changed = true;
  });

  if (!changed) return;
  state.lit = Array.from(new Set(state.lit)).sort((a, b) => a - b);
  saveState();
}

function applyRemoteProgress(progress) {
  if (!progress) return;

  if (progress.user) {
    state.profile = {
      name: progress.user.name || "小魔法师",
      zodiac: progress.user.zodiac || state.profile?.zodiac || "星座",
      project: progress.user.project || state.profile?.project || "",
      tools: progress.user.tools || state.profile?.tools || "",
      id: progress.user.id || state.profile?.id || "",
    };
    localStorage.setItem(userStorageKey("student_title"), progress.user.title || "见习魔法师");
    localStorage.setItem(userStorageKey("student_magic_power"), String(progress.user.magic_power || 0));
    saveState();
  }

  (progress.lesson_progress || []).forEach((row) => {
    const prefix = `${row.user_id}_${row.academy_id}_${row.lesson_id}`;
    setBooleanStorage(`${prefix}_live_completed`, row.live_completed);
    setBooleanStorage(`${prefix}_recorded_completed`, row.recorded_completed);
    setBooleanStorage(`${prefix}_course_completed`, row.course_completed);
    setBooleanStorage(`${prefix}_exam_started`, row.exam_started);
    setBooleanStorage(`${prefix}_exam_completed`, row.exam_completed);
    setBooleanStorage(`${prefix}_all_completed`, row.all_completed);
    localStorage.setItem(`${prefix}_homework_completed_count`, String(Number(row.homework_q1_completed || 0) + Number(row.homework_q2_completed || 0)));
    if (row.exam_score !== null && row.exam_score !== undefined) localStorage.setItem(`${prefix}_exam_score`, String(row.exam_score));
    if (row.updated_at) localStorage.setItem(`${prefix}_updated_at`, row.updated_at);
  });

  (progress.homework_submissions || []).forEach((row) => {
    const prefix = `${row.user_id}_${row.academy_id}_${row.lesson_id}`;
    const storagePrefix = row.question_id === "homework-2" ? "q2" : "q1";
    localStorage.setItem(`${prefix}_homework_${storagePrefix}_content`, row.content || "");
    localStorage.setItem(`${prefix}_homework_${storagePrefix}_submitted_content`, row.content || "");
    localStorage.setItem(`${prefix}_homework_${storagePrefix}_visibility`, normalizeBackendVisibility(row.visibility));
    setBooleanStorage(`${prefix}_homework_${storagePrefix}_completed`, row.completed);
    if (row.updated_at || row.submitted_at) localStorage.setItem(`${prefix}_homework_updated_at`, row.updated_at || row.submitted_at);
  });

  (progress.academy_progress || []).forEach((row) => {
    setBooleanStorage(userStorageKey(`academy_${row.academy_id}_unlocked`), row.unlocked);
    setBooleanStorage(userStorageKey(`academy_${row.academy_id}_completed`), row.completed);
  });

  applyRemoteLessonMapState(progress);
  syncMapStateFromAcademyStorage();
}

async function restoreRemoteProgress() {
  remoteProgressReady = false;
  try {
    const result = await apiRequest("/api/progress");
    applyRemoteProgress(result.progress);
  } catch (error) {
    console.warn("Remote progress restore failed", error);
  } finally {
    remoteProgressReady = true;
  }
}

function buildLessonSyncPayload() {
  const config = getCurrentLessonConfig();
  const [questionOne, questionTwo] = config.homework.questions;
  const q1 = getLessonQuestionState(questionOne);
  const q2 = questionTwo ? getLessonQuestionState(questionTwo) : null;
  return {
    user_id: getLearningUserId(),
    academy_id: config.academyId,
    lesson_id: config.lessonId,
    live_completed: isLessonLiveCompleted(),
    recorded_completed: isLessonRecordedCompleted(),
    homework_q1_completed: q1.completed,
    homework_q2_completed: q2 ? q2.completed : true,
    exam_started: isLessonExamStarted(),
    exam_completed: isLessonExamCompleted(),
    exam_score: getLessonExamScore() || null,
    magic_power_earned: getLessonMagicPower(),
    exam_url: config.exam.url,
    homework_submissions: [
      {
        question_id: "homework-1",
        title: questionOne.title,
        content: q1.content,
        visibility: mapVisibilityToBackend(q1.visibility),
        completed: q1.completed,
        submitted_at: q1.completed ? localStorage.getItem(lessonCourseKey("homework_updated_at")) || new Date().toISOString() : null,
      },
      questionTwo ? {
        question_id: "homework-2",
        title: questionTwo.title,
        content: q2.content,
        visibility: mapVisibilityToBackend(q2.visibility),
        completed: q2.completed,
        submitted_at: q2.completed ? localStorage.getItem(lessonCourseKey("homework_updated_at")) || new Date().toISOString() : null,
      } : null,
    ].filter(Boolean),
  };
}

function scheduleLessonSync() {
  if (!lessonPage || !currentUser || !remoteProgressReady) return;
  window.clearTimeout(lessonSyncTimer);
  lessonSyncTimer = window.setTimeout(async () => {
    try {
      await apiRequest("/api/sync-local-progress", {
        method: "POST",
        body: JSON.stringify(buildLessonSyncPayload()),
      });
    } catch (error) {
      console.warn("Lesson sync failed", error);
    }
  }, 350);
}

function lessonStorageKey(question, field) {
  return `${getCurrentLessonPrefix()}_homework_${question.storagePrefix}_${field}`;
}

function migrateOldLessonStorage() {
  const firstQuestion = getCurrentLessonConfig().homework.questions[0];
  const contentKey = lessonStorageKey(firstQuestion, "content");
  const visibilityKey = lessonStorageKey(firstQuestion, "visibility");
  const oldContent = localStorage.getItem(userStorageKey("spell_lesson1_homework_content"));
  const oldVisibility = localStorage.getItem(userStorageKey("spell_lesson1_homework_visibility"));

  if (!localStorage.getItem(contentKey) && oldContent) {
    localStorage.setItem(contentKey, oldContent);
  }

  if (!localStorage.getItem(visibilityKey) && oldVisibility) {
    localStorage.setItem(visibilityKey, normalizeVisibility(oldVisibility));
  }

  getCurrentLessonConfig().homework.questions.forEach((question) => {
    const defaultVisibilityKey = lessonStorageKey(question, "visibility");
    const completedKey = lessonStorageKey(question, "completed");
    if (!localStorage.getItem(defaultVisibilityKey)) {
      localStorage.setItem(defaultVisibilityKey, question.defaultVisibility);
    } else if (localStorage.getItem(defaultVisibilityKey) === "private") {
      localStorage.setItem(defaultVisibilityKey, "dean");
    }
    if (!localStorage.getItem(completedKey)) {
      localStorage.setItem(completedKey, "false");
    }
  });

  if (localStorage.getItem(lessonCourseKey("course_completed")) === "true") {
    if (!localStorage.getItem(lessonCourseKey("live_completed")) && !localStorage.getItem(lessonCourseKey("recorded_completed"))) {
      localStorage.setItem(lessonCourseKey("live_completed"), "true");
    }
  }
  if (localStorage.getItem(lessonCourseKey("live_completed")) === "true" && localStorage.getItem(lessonCourseKey("recorded_completed")) === "true") {
    localStorage.removeItem(lessonCourseKey("recorded_completed"));
  }
}

function getLessonQuestionState(question) {
  const visibilityKey = lessonStorageKey(question, "visibility");
  const visibility = normalizeVisibility(localStorage.getItem(visibilityKey) || question.defaultVisibility);
  if (localStorage.getItem(visibilityKey) !== visibility) {
    localStorage.setItem(visibilityKey, visibility);
  }
  return {
    content: localStorage.getItem(lessonStorageKey(question, "content")) || "",
    visibility,
    submittedContent: localStorage.getItem(lessonStorageKey(question, "submitted_content")) || "",
    completed: localStorage.getItem(lessonStorageKey(question, "completed")) === "true",
  };
}

function setLessonQuestionValue(question, field, value) {
  localStorage.setItem(lessonStorageKey(question, field), String(value));
  localStorage.setItem(lessonCourseKey("homework_updated_at"), new Date().toISOString());
  localStorage.setItem(lessonCourseKey("updated_at"), new Date().toISOString());
}

function getLessonHomeworkCompletedCount() {
  return getCurrentLessonConfig().homework.questions.reduce((count, question) => {
    return count + (getLessonQuestionState(question).completed ? 1 : 0);
  }, 0);
}

function isLessonLiveCompleted() {
  return localStorage.getItem(lessonCourseKey("live_completed")) === "true";
}

function isLessonRecordedCompleted() {
  return localStorage.getItem(lessonCourseKey("recorded_completed")) === "true";
}

function syncLessonCourseCompleted() {
  const completed = isLessonLiveCompleted() || isLessonRecordedCompleted();
  localStorage.setItem(lessonCourseKey("course_completed"), completed ? "true" : "false");
  return completed;
}

function isLessonCourseCompleted() {
  return syncLessonCourseCompleted();
}

function isLessonExamStarted() {
  return localStorage.getItem(lessonCourseKey("exam_started")) === "true";
}

function isLessonExamCompleted() {
  return localStorage.getItem(lessonCourseKey("exam_completed")) === "true";
}

function isLessonHomeworkCompleted() {
  return getLessonHomeworkCompletedCount() === getCurrentLessonConfig().homework.questions.length;
}

function getLessonRawMagicPower() {
  const questions = getCurrentLessonConfig().homework.questions;
  const [questionOne, questionTwo] = questions;
  const questionOneScore = questions.length === 1
    ? lessonOnePowerConfig.homework1 + lessonOnePowerConfig.homework2
    : lessonOnePowerConfig.homework1;
  return (
    (isLessonLiveCompleted() ? lessonOnePowerConfig.course : 0) +
    (getLessonQuestionState(questionOne).completed ? questionOneScore : 0) +
    (questionTwo && getLessonQuestionState(questionTwo).completed ? lessonOnePowerConfig.homework2 : 0) +
    (isLessonExamCompleted() ? lessonOnePowerConfig.exam : 0)
  );
}

function getLessonMagicPower() {
  return Math.min(LESSON_ONE_MAX_POWER, getLessonRawMagicPower());
}

function getLessonNextStep() {
  const config = getCurrentLessonConfig();
  const [questionOne, questionTwo] = config.homework.questions;
  const nextAcademy = trials.find((t) => t.id === config.academyId)?.nextId;
  const nextName = nextAcademy ? getAcademyById(nextAcademy)?.name : "";
  if (!isLessonLiveCompleted()) return "请先确认已参加直播课程";
  if (!isLessonRecordedCompleted()) return "请打开录播课程并完成学习";
  if (!getLessonQuestionState(questionOne).completed) return "请完成作业一";
  if (questionTwo && !getLessonQuestionState(questionTwo).completed) return "请完成作业二";
  if (!isLessonExamCompleted()) return "请进入考试并完成挑战";
  return nextName ? `${config.academyName}已完成，返回主地图查看${nextName}` : "本课已完成，返回主地图";
}

function getLessonCurrentStepKey() {
  const [questionOne, questionTwo] = getCurrentLessonConfig().homework.questions;
  if (!isLessonLiveCompleted()) return "live";
  if (!isLessonRecordedCompleted()) return "recorded";
  if (!getLessonQuestionState(questionOne).completed) return "q1";
  if (questionTwo && !getLessonQuestionState(questionTwo).completed) return "q2";
  if (!isLessonExamCompleted()) return "exam";
  return "done";
}

function syncLessonCompletedCount() {
  localStorage.setItem(lessonCourseKey("homework_completed_count"), String(getLessonHomeworkCompletedCount()));
}

function getLessonStatus() {
  const config = getCurrentLessonConfig();
  const courseDone = isLessonCourseCompleted();
  const examStarted = isLessonExamStarted();
  const examCompleted = isLessonExamCompleted();
  const homeworkCount = getLessonHomeworkCompletedCount();
  const hasHomeworkContent = config.homework.questions.some((question) => getLessonQuestionState(question).content.trim());

  if (courseDone && homeworkCount === 2 && examCompleted) return `${config.academyName}已完成`;
  if (examCompleted) return "考试已完成";
  if (examStarted) return "考试进行中";
  if (courseDone && homeworkCount === config.homework.questions.length) return "已完成作业";
  if (courseDone || homeworkCount > 0 || hasHomeworkContent) return "学习中";
  return "未开始";
}

function getHomeworkMessage(count) {
  const total = getCurrentLessonConfig().homework.questions.length;
  if (count === 0) return "";
  if (count < total) return `还差 ${total - count} 份作业，即可完成本课作业。`;
  return "本课作业已完成。";
}

function getExamMessage(count) {
  const config = getCurrentLessonConfig();
  const total = config.homework.questions.length;
  if (count === 0) return `建议先完成${total === 1 ? "作业" : "两份作业"}，再进入考试。`;
  if (count < total) return `还差 ${total - count} 份作业，完成后再挑战考试会更稳。`;
  if (isLessonExamCompleted()) return `考试已完成，${config.academyName}任务闭环已完成。`;
  if (isLessonExamStarted()) return "考试已开始。考完后请回到本页确认完成，系统才会发放考试魔能。";
  return "作业已完成，可以进入本课考试。";
}

function getLessonExamScore() {
  return localStorage.getItem(lessonCourseKey("exam_score")) || "";
}

function isLessonAllCompleted() {
  return isLessonCourseCompleted() && isLessonHomeworkCompleted() && isLessonExamCompleted();
}

function syncAcademyCompletion() {
  if (!isLessonAllCompleted()) {
    localStorage.setItem(userStorageKey("student_magic_power"), String(getLessonMagicPower()));
    return false;
  }

  const config = getCurrentLessonConfig();
  const academyIndex = getAcademyIndexById(config.academyId);
  const nextAcademy = trials[academyIndex + 1];
  const nextIndex = academyIndex + 1;

  localStorage.setItem(lessonCourseKey("all_completed"), "true");
  localStorage.setItem(userStorageKey(`academy_${config.academyId}_unlocked`), "true");
  localStorage.setItem(userStorageKey(`academy_${config.academyId}_completed`), "true");
  if (nextAcademy) {
    localStorage.setItem(userStorageKey(`academy_${nextAcademy.id}_unlocked`), "true");
  }
  const levelIndex = Math.min(nextIndex, levelDefs.length - 1);
  localStorage.setItem(userStorageKey("student_title"), levelDefs[levelIndex]?.title || levelDefs[1]?.title || "正式咒语学徒");
  localStorage.setItem(userStorageKey("student_magic_power"), String(getLessonMagicPower()));

  state.completed[academyIndex] = [0, 1, 2];
  if (!state.lit.includes(academyIndex)) state.lit.push(academyIndex);
  state.lit = Array.from(new Set(state.lit)).sort((a, b) => a - b);
  if (nextIndex < trials.length) {
    state.selectedTrial = nextIndex;
    state.activeRoute = { from: academyIndex, to: nextIndex };
  }
  saveState();
  return true;
}

function showLessonCompletionModal() {
  if (!lessonCompletionModal || lessonCompletionModal.open) return;
  const score = getLessonExamScore();
  const scoreLine = document.querySelector("[data-completion-score-line]");
  const scoreEl = document.querySelector("[data-completion-score]");
  if (scoreLine && scoreEl) {
    scoreLine.hidden = !score;
    scoreEl.textContent = score || "--";
  }

  const config = getCurrentLessonConfig();
  const level = levelDefs[getLevelIndex()];
  const nextAcademy = getAcademyById(config.academyId)?.nextId ? getAcademyById(getAcademyById(config.academyId).nextId) : null;

  const eyebrowEl = document.querySelector("[data-completion-eyebrow]");
  if (eyebrowEl) eyebrowEl.textContent = `${config.academyName} Complete`;

  const titleEl = document.querySelector("[data-completion-title]");
  if (titleEl) titleEl.textContent = `恭喜晋级成为"${level?.title || "初阶咒术师"}"！`;

  const descEl = document.querySelector("[data-completion-desc]");
  if (descEl) {
    descEl.textContent = nextAcademy
      ? `请前往下一个"${nextAcademy.name}"继续修炼！`
      : "全部学院已修炼完成，前往主地图查看最终奖励！";
  }

  const hintEl = document.querySelector("[data-completion-hint]");
  if (hintEl) {
    hintEl.textContent = nextAcademy
      ? `返回主地图，查看已解锁的${nextAcademy.name}任务。`
      : "返回主地图，查看结业排行与终极奖励。";
  }

  lessonCompletionModal.showModal();
}

function maybeShowLessonCompletionModal() {
  if (!syncAcademyCompletion()) return;
  if (localStorage.getItem(lessonCourseKey("completion_acknowledged")) === "true") return;
  showLessonCompletionModal();
}

function completeLessonExam(score = "") {
  localStorage.setItem(lessonCourseKey("exam_started"), "true");
  localStorage.setItem(lessonCourseKey("exam_completed"), "true");
  if (score) localStorage.setItem(lessonCourseKey("exam_score"), score);
  localStorage.setItem(lessonCourseKey("updated_at"), new Date().toISOString());
  localStorage.removeItem(lessonCourseKey("completion_acknowledged"));
  syncAcademyCompletion();
}

function handleLessonReturnParams() {
  if (currentParams.get("examCompleted") !== "1") return;
  completeLessonExam(currentParams.get("score") || "");
  const config = getCurrentLessonConfig();
  const cleanUrl = toInternalUrl(`/academy/${config.academyId}/courses/${config.lessonId}#exam`);
  window.history.replaceState({}, "", cleanUrl);
}

function formatLessonUpdatedAt(value) {
  if (!value) return "尚未保存";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "尚未保存";
  return `已保存：${date.toLocaleString("zh-CN", { hour12: false })}`;
}

function showLessonToast(message) {
  const toast = document.querySelector("[data-lesson-toast]");
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(showLessonToast.timer);
  showLessonToast.timer = window.setTimeout(() => {
    toast.hidden = true;
  }, 1800);
}

function showQuestionWarning(questionId, message) {
  const warning = document.querySelector(`[data-question-warning="${questionId}"]`);
  if (!warning) return;
  warning.textContent = message;
  warning.hidden = false;
  window.setTimeout(() => {
    warning.hidden = true;
  }, 2200);
}

function visibilityHintFor(question, visibility) {
  if (visibility === "academy") return "所有学员都可以看到你的内容。";
  return "院长会查看并协助你优化学习与实现愿望。";
}

function renderLessonQuestion(question) {
  const questionState = getLessonQuestionState(question);
  const card = document.querySelector(`[data-question-card="${question.id}"]`);
  const textarea = document.querySelector(`[data-homework-input="${question.id}"]`);
  const counter = document.querySelector(`[data-homework-counter="${question.id}"]`);
  const status = document.querySelector(`[data-question-state="${question.id}"]`);
  const hint = document.querySelector(`[data-visibility-hint="${question.id}"]`);
  const completeButton = document.querySelector(`[data-complete-question="${question.id}"]`);
  const stamp = document.querySelector(`[data-question-stamp="${question.id}"]`);

  if (textarea && textarea.value !== questionState.content) textarea.value = questionState.content;
  if (counter) counter.textContent = `${questionState.content.length}/${question.maxLength}`;
  if (status) status.textContent = questionState.completed ? "已完成" : "未完成";
  if (stamp) {
    stamp.textContent = questionState.completed ? "已完成" : "待完成";
    stamp.classList.toggle("is-complete", questionState.completed);
  }
  if (hint) hint.textContent = visibilityHintFor(question, questionState.visibility);
  if (card) card.classList.toggle("is-complete", questionState.completed);
  const feedback = document.querySelector(`[data-question-feedback="${question.id}"]`);
  if (feedback) {
    feedback.hidden = true;
    feedback.textContent = "";
  }
  if (completeButton) {
    completeButton.classList.toggle("is-complete", questionState.completed);
    completeButton.textContent = questionState.completed
      ? questionState.content !== questionState.submittedContent
        ? "更新提交"
        : "已提交 √"
      : question.completionLabel;
  }

  const checkbox = document.querySelector(`[data-homework-checkbox="${question.id}"]`);
  if (checkbox) {
    const checked = localStorage.getItem(lessonStorageKey(question, "checkbox_checked")) === "true";
    checkbox.checked = checked;
  }

  document.querySelectorAll(`[data-question-id="${question.id}"][data-visibility-option]`).forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.visibilityOption === questionState.visibility);
  });
}

function generateQuestionCardHTML(question) {
  const hasHint = Boolean(question.hint || question.prompt);
  const hintHtml = hasHint
    ? `<div class="prompt-hint">${(question.hint || question.prompt).replace(/\n/g, "<br>")}</div>`
    : "";
  const visibilityOptionsHtml = question.visibilityOptions.map((opt) => `
    <button type="button" data-question-id="${question.id}" data-visibility-option="${opt.id}">
      <strong>${opt.label}</strong>
    </button>
  `).join("");
  const defaultHint = question.visibilityOptions.find((o) => o.id === question.defaultVisibility)?.description || "";
  const checkboxHtml = question.checkboxLabel ? `
    <label class="homework-checkbox" style="display:flex;align-items:center;gap:8px;margin:12px 0;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.55);cursor:pointer;font-size:0.96rem;">
      <input type="checkbox" data-homework-checkbox="${question.id}" style="width:18px;height:18px;margin:0;flex-shrink:0;accent-color:#7b2cbf;">
      <span>${question.checkboxLabel}</span>
    </label>
  ` : "";

  return `
    <article class="question-card" id="${question.id}" data-question-card="${question.id}">
      <span class="status-stamp" data-question-stamp="${question.id}">待完成</span>
      <div class="question-head">
        <h3>${question.fullTitle}</h3>
        <p data-question-state="${question.id}" hidden>未完成</p>
      </div>
      ${hintHtml}
      ${question.noTextInput ? "" : `
      <label class="homework-field">
        <textarea data-homework-input="${question.id}" maxlength="${question.maxLength}" rows="${question.maxLength > 1000 ? 9 : 6}" placeholder="${question.placeholder || ""}"></textarea>
      </label>
      `}
      ${checkboxHtml}
      ${question.noVisibilityOptions ? "" : `
      <section class="visibility-section">
        <h4>选择可见范围</h4>
        <div class="visibility-options" data-visibility-group="${question.id}">
          ${visibilityOptionsHtml}
        </div>
        <p class="visibility-hint" data-visibility-hint="${question.id}">${defaultHint}</p>
        <p class="visibility-admin-note">院长可在后台查看学习记录，用于课程辅导和进度管理。</p>
      </section>
      `}
      <div class="question-footer">
        <button class="completion-button" type="button" data-complete-question="${question.id}">${question.completionLabel}</button>
        <p class="question-warning" data-question-warning="${question.id}" hidden></p>
      </div>
      <p class="task-feedback" data-question-feedback="${question.id}" hidden></p>
    </article>
  `;
}

function renderLessonPage() {
  if (!lessonPage) return;
  migrateOldLessonStorage();
  syncLessonCompletedCount();

  const config = getCurrentLessonConfig();

  // Dynamic static text
  const breadcrumbEl = document.querySelector("[data-lesson-breadcrumb]");
  if (breadcrumbEl) breadcrumbEl.textContent = `${config.academyName} / ${config.trialName} / ${config.fullTitle}`;

  const titleEl = document.querySelector("[data-lesson-title]");
  if (titleEl) titleEl.textContent = config.fullTitle;

  const subtitleEl = document.querySelector("[data-lesson-subtitle]");
  if (subtitleEl) subtitleEl.textContent = config.homework.description;

  const task1TitleEl = document.querySelector("[data-task1-title]");
  if (task1TitleEl) task1TitleEl.textContent = "魔法课程打卡";

  const liveTimeEl = document.querySelector("[data-course-live-time]");
  const academyData = getAcademyById(config.academyId);
  if (liveTimeEl) liveTimeEl.textContent = academyData?.liveTime || "";

  const extractCodeEl = document.querySelector("[data-extract-code]");
  if (extractCodeEl) extractCodeEl.textContent = config.courseResource.extractCode;

  const task2TitleEl = document.querySelector("[data-task2-title]");
  if (task2TitleEl) task2TitleEl.textContent = config.homework.title;

  const examCopyEl = document.querySelector("[data-exam-copy]");
  if (examCopyEl) examCopyEl.textContent = `完成考试，升级${config.academyName.replace("学院", "")}魔法`;

  const sidebarKickerEl = document.querySelector("[data-sidebar-kicker]");
  if (sidebarKickerEl) sidebarKickerEl.textContent = `${config.fullTitle.replace(" · ", "")}修炼进度`;

  const powerLabelEl = document.querySelector("[data-lesson-power-label]");
  if (powerLabelEl) powerLabelEl.textContent = `${config.academyName.replace("学院", "")}魔能`;

  // Dynamic homework question cards
  const homeworkContainer = document.querySelector("[data-homework-questions]");
  if (homeworkContainer) {
    homeworkContainer.innerHTML = config.homework.questions.map((question) => generateQuestionCardHTML(question)).join("");
  }

  // Dynamic sidebar homework buttons
  const q1Btn = document.querySelector("[data-side-q1]")?.closest("button");
  const q2Btn = document.querySelector("[data-side-q2]")?.closest("button");
  if (q1Btn) {
    q1Btn.dataset.scrollTarget = config.homework.questions[0]?.id || "";
    const q1Span = q1Btn.querySelector("span");
    if (q1Span) q1Span.childNodes[0].textContent = config.homework.questions[0]?.title || "作业一";
  }
  if (q2Btn) {
    q2Btn.hidden = !config.homework.questions[1];
    q2Btn.dataset.scrollTarget = config.homework.questions[1]?.id || "";
    const q2Span = q2Btn.querySelector("span");
    if (q2Span) q2Span.childNodes[0].textContent = config.homework.questions[1]?.title || "作业二";
  }
  const sidebarRewardEl = document.querySelector(".sidebar-reward");
  if (sidebarRewardEl) {
    sidebarRewardEl.textContent = config.homework.questions.length === 1
      ? "提交作业一后同步10魔能。"
      : "两份作业提交后同步魔能。";
  }

  const liveDone = isLessonLiveCompleted();
  const recordedDone = isLessonRecordedCompleted();
  const courseDone = isLessonCourseCompleted();
  const examStarted = isLessonExamStarted();
  const examCompleted = isLessonExamCompleted();
  const homeworkCount = getLessonHomeworkCompletedCount();
  const questionOneDone = getLessonQuestionState(config.homework.questions[0]).completed;
  const questionTwoDone = !config.homework.questions[1] || getLessonQuestionState(config.homework.questions[1]).completed;
  const homeworkDone = questionOneDone && questionTwoDone;
  const magicPower = getLessonMagicPower();

  const lessonStatus = document.querySelector("[data-lesson-status]");
  if (lessonStatus) lessonStatus.textContent = getLessonStatus();
  document.querySelector("[data-lesson-magic-power]").textContent = String(magicPower);
  document.querySelector("[data-course-status]").textContent = courseDone ? "已完成" : "未完成";
  document.querySelector("[data-course-status]").classList.toggle("is-complete", courseDone);
  document.querySelector("[data-stamp-course]").textContent = courseDone ? "已完成" : "待完成";
  document.querySelector("[data-stamp-course]").classList.toggle("is-complete", courseDone);
  document.querySelectorAll("[data-course-check]").forEach((button) => {
    const isLive = button.dataset.courseCheck === "live";
    const completed = isLive ? liveDone : recordedDone;
    const otherDone = isLive ? recordedDone : liveDone;
    const shell = button.closest(".course-check-item") || button;
    shell.classList.toggle("is-complete", completed);
    button.classList.toggle("is-complete", completed);
    shell.classList.toggle("is-disabled", !completed && otherDone);
  });
  document.querySelector("[data-homework-count]").textContent = `${homeworkCount}/${config.homework.questions.length}`;
  document.querySelector("[data-homework-count]").classList.toggle("is-complete", homeworkDone);
  document.querySelector("[data-homework-message]").textContent = getHomeworkMessage(homeworkCount);
  document.querySelector("[data-exam-status]").textContent = examCompleted ? "已完成" : examStarted ? "已开始" : "未开始";
  document.querySelector("[data-exam-status]").classList.toggle("is-complete", examCompleted);
  document.querySelector("[data-stamp-exam]").textContent = examCompleted ? "已完成" : "待完成";
  document.querySelector("[data-stamp-exam]").classList.toggle("is-complete", examCompleted);
  const examMessageEl = document.querySelector("[data-exam-message]");
  if (examMessageEl) examMessageEl.textContent = getExamMessage(homeworkCount);
  const homeworkUpdatedEl = document.querySelector("[data-homework-updated]");
  if (homeworkUpdatedEl) {
    homeworkUpdatedEl.textContent = formatLessonUpdatedAt(
      localStorage.getItem(lessonCourseKey("homework_updated_at")),
    );
  }
  const completeStampEl = document.querySelector("[data-lesson-complete-stamp]");
  if (completeStampEl) {
    completeStampEl.hidden = !isLessonAllCompleted();
    if (!completeStampEl.hidden) completeStampEl.textContent = `${config.academyName}已完成`;
  }

  const courseFeedback = document.querySelector("[data-course-feedback]");
  if (courseFeedback) {
    courseFeedback.hidden = true;
    courseFeedback.textContent = "";
  }

  const examFeedback = document.querySelector("[data-exam-feedback]");
  if (examFeedback) {
    examFeedback.hidden = !examStarted || examCompleted;
    examFeedback.textContent =
      examStarted && !examCompleted ? "考试挑战已开启，考完并回到本页后才会发放考试魔能。" : "";
  }

  getCurrentLessonConfig().homework.questions.forEach(renderLessonQuestion);

  const sideLiveBtn = document.querySelector("[data-side-live]")?.closest("button");
  const sideRecordedBtn = document.querySelector("[data-side-recorded]")?.closest("button");
  if (sideLiveBtn) {
    sideLiveBtn.hidden = recordedDone;
    sideLiveBtn.querySelector("[data-side-live]").textContent = liveDone ? "已完成" : "未完成";
  }
  if (sideRecordedBtn) {
    sideRecordedBtn.hidden = liveDone;
    sideRecordedBtn.querySelector("[data-side-recorded]").textContent = recordedDone ? "已完成" : "未完成";
  }
  document.querySelector("[data-side-course]").textContent = courseDone ? "已完成" : "待完成";
  document.querySelector("[data-side-q1]").textContent = questionOneDone ? "已完成" : "待完成";
  document.querySelector("[data-side-q2]").textContent = questionTwoDone ? "已完成" : "待完成";
  document.querySelector("[data-side-exam]").textContent = examCompleted ? "已完成" : "待完成";
  document.querySelector("[data-side-magic-power]").textContent = String(magicPower);
  document.querySelector("[data-side-magic-bar]").style.width = `${Math.min((magicPower / LESSON_ONE_MAX_POWER) * 100, 100)}%`;
  document.querySelector("[data-side-advice]").textContent = getLessonNextStep();

  [
    ["course", courseDone, !courseDone],
    ["homework", homeworkDone, courseDone && !homeworkDone],
    ["exam", examCompleted, courseDone && homeworkDone && !examCompleted],
  ].forEach(([key, complete, current]) => {
    const step = document.querySelector(`[data-flow-step="${key}"]`);
    const status = document.querySelector(`[data-flow-status="${key}"]`);
    if (!step || !status) return;
    step.classList.toggle("is-complete", Boolean(complete));
    step.classList.toggle("is-current", Boolean(current));
    status.textContent = complete ? "已完成" : current ? "进行中" : "未开始";
  });

  [
    ["live", liveDone],
    ["recorded", recordedDone],
    ["course", courseDone],
    ["q1", questionOneDone],
    ["q2", questionTwoDone],
    ["exam", examCompleted],
  ].forEach(([key, complete]) => {
    const node =
      key === "live"
        ? document.querySelector("[data-side-live]")?.closest("button")
        : key === "recorded"
          ? document.querySelector("[data-side-recorded]")?.closest("button")
          : key === "course"
        ? document.querySelector("[data-side-course]")?.closest("button")
        : key === "q1"
          ? document.querySelector("[data-side-q1]")?.closest("button")
          : key === "q2"
            ? document.querySelector("[data-side-q2]")?.closest("button")
            : document.querySelector("[data-side-exam]")?.closest("button");
    node?.classList.toggle("is-complete", Boolean(complete));
    node?.classList.toggle("is-current", key === getLessonCurrentStepKey());
  });

  maybeShowLessonCompletionModal();
  scheduleLessonSync();
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back to the temporary textarea path below.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function lessonInitialTarget() {
  if (currentPath.endsWith("/homework")) return "homework";
  if (currentPath === "/academy/spell/exam" || currentPath === "/academy/pet/exam") return "exam";
  return window.location.hash.replace("#", "");
}

function scrollToLessonTarget(target) {
  const element = target ? document.getElementById(target) : null;
  if (!element) return;
  element.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showLessonPage() {
  if (!lessonPage || !academyShell) return;
  document.documentElement.classList.add("lesson-route");
  document.documentElement.classList.remove("admin-route");
  document.body.classList.add("lesson-route");
  document.body.classList.remove("admin-route");
  document.body.style.overflowY = "";
  academyShell.hidden = true;
  lessonPage.hidden = false;
  if (adminPage) adminPage.hidden = true;
  handleLessonReturnParams();
  // Sync standalone exam completion from exam pages localStorage
  if (isPetLessonPath) {
    const petExamCompleted = localStorage.getItem(userStorageKey("pet_exam_completed")) === "true";
    const petExamScore = localStorage.getItem(userStorageKey("pet_exam_score")) || "";
    if (petExamCompleted && localStorage.getItem(lessonCourseKey("exam_completed")) !== "true") {
      localStorage.setItem(lessonCourseKey("exam_completed"), "true");
      localStorage.setItem(lessonCourseKey("exam_started"), "true");
      if (petExamScore) localStorage.setItem(lessonCourseKey("exam_score"), petExamScore);
      localStorage.setItem(lessonCourseKey("updated_at"), new Date().toISOString());
    }
  }
  if (isCircleLessonPath) {
    const circleExamCompleted = localStorage.getItem(userStorageKey("circle_exam_completed")) === "true";
    const circleExamScore = localStorage.getItem(userStorageKey("circle_exam_score")) || "";
    if (circleExamCompleted && localStorage.getItem(lessonCourseKey("exam_completed")) !== "true") {
      localStorage.setItem(lessonCourseKey("exam_completed"), "true");
      localStorage.setItem(lessonCourseKey("exam_started"), "true");
      if (circleExamScore) localStorage.setItem(lessonCourseKey("exam_score"), circleExamScore);
      localStorage.setItem(lessonCourseKey("updated_at"), new Date().toISOString());
    }
  }
  if (isLegionLessonPath) {
    const legionExamCompleted = localStorage.getItem(userStorageKey("legion_exam_completed")) === "true";
    const legionExamScore = localStorage.getItem(userStorageKey("legion_exam_score")) || "";
    if (legionExamCompleted && localStorage.getItem(lessonCourseKey("exam_completed")) !== "true") {
      localStorage.setItem(lessonCourseKey("exam_completed"), "true");
      localStorage.setItem(lessonCourseKey("exam_started"), "true");
      if (legionExamScore) localStorage.setItem(lessonCourseKey("exam_score"), legionExamScore);
      localStorage.setItem(lessonCourseKey("updated_at"), new Date().toISOString());
    }
  }
  renderLessonPage();
  requestAnimationFrame(() => scrollToLessonTarget(lessonInitialTarget()));
}

function showMapPage() {
  if (!lessonPage || !academyShell) return;
  document.documentElement.classList.remove("lesson-route");
  document.documentElement.classList.remove("admin-route");
  document.body.classList.remove("lesson-route");
  document.body.classList.remove("admin-route");
  document.body.style.overflowY = "";
  academyShell.hidden = false;
  lessonPage.hidden = true;
  if (adminPage) adminPage.hidden = true;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function visibilityText(value) {
  return { public: "全体可见", academy: "全体可见", dean: "仅院长可见", private: "仅院长可见" }[value] || "仅院长可见";
}

function adminStatusText(value) {
  return value === true ? "已完成" : String(value || "待完成");
}

function statusTag(value) {
  const done = String(value).includes("已完成") || value === true;
  return `<span class="admin-status ${done ? "is-done" : ""}">${escapeHtml(adminStatusText(value))}</span>`;
}

function escapeExcelXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function exportAdminExcel(filename, sheets) {
  const worksheets = sheets
    .map((sheet) => {
      const headerRows = new Set(sheet.headerRows || [0]);
      const columns = (sheet.columnWidths || [])
        .map((width) => `<Column ss:AutoFitWidth="0" ss:Width="${width}"/>`)
        .join("");
      const rows = sheet.rows
        .map(
          (row, rowIndex) => `
            <Row>
              ${row
                .map((value) => {
                  const isNumber = typeof value === "number" && Number.isFinite(value);
                  return `<Cell${headerRows.has(rowIndex) ? ' ss:StyleID="Header"' : ""}><Data ss:Type="${isNumber ? "Number" : "String"}">${escapeExcelXml(value)}</Data></Cell>`;
                })
                .join("")}
            </Row>`,
        )
        .join("");
      return `
        <Worksheet ss:Name="${escapeExcelXml(sheet.name)}">
          <Table>${columns}${rows}</Table>
          <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
            <FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane>
          </WorksheetOptions>
        </Worksheet>`;
    })
    .join("");
  const workbook = `<?xml version="1.0" encoding="UTF-8"?>
    <?mso-application progid="Excel.Sheet"?>
    <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
      <Styles>
        <Style ss:ID="Default" ss:Name="Normal">
          <Alignment ss:Vertical="Top" ss:WrapText="1"/>
          <Font ss:FontName="Microsoft YaHei" ss:Size="10"/>
        </Style>
        <Style ss:ID="Header">
          <Alignment ss:Vertical="Center" ss:WrapText="1"/>
          <Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Bold="1" ss:Color="#5E3718"/>
          <Interior ss:Color="#F4E2B4" ss:Pattern="Solid"/>
        </Style>
      </Styles>
      ${worksheets}
    </Workbook>`;
  const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function renderAdminDashboard() {
  const [{ summary }, { students }] = await Promise.all([
    apiRequest("/api/admin/summary"),
    apiRequest("/api/admin/students"),
  ]);
  const hiddenTestEmails = new Set([
    "1781426241598@jmagic.local",
    "1781441216096@jmagic.local",
    "student-apas9f-4x4c@jmagic.local",
    "student-egv2u6-092o@jmagic.local",
    "student-d03bmi-i4bk@jmagic.local",
    "student-5hs22p-j2kl@jmagic.local",
  ]);
  const overviewStudents = students.filter((student) => !hiddenTestEmails.has(String(student.email || "").toLocaleLowerCase("zh-CN")));
  const overviewSummary = {
    ...summary,
    total_students: overviewStudents.length,
    average_magic_power: overviewStudents.length
      ? Math.round(overviewStudents.reduce((total, student) => total + Number(student.magic_power || 0), 0) / overviewStudents.length)
      : 0,
  };
  const academyMeta = {
    spell: { symbol: "✦", tone: "violet" },
    pet: { symbol: "◆", tone: "green" },
    circle: { symbol: "★", tone: "orange" },
    legion: { symbol: "♛", tone: "gold" },
    final: { symbol: "✤", tone: "rose" },
  };
  const pageSize = 8;
  let currentPage = 1;
  const totalMagic = overviewStudents.reduce((total, student) => total + Number(student.magic_power || 0), 0);
  const totalMagicMaximum = overviewStudents.length * academies.length * 20;
  const totalMagicRate = totalMagicMaximum ? Math.min(100, Math.round((totalMagic / totalMagicMaximum) * 100)) : 0;
  const updatedAt = new Date().toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).replaceAll("/", "-");
  const getAcademyDetail = (student, academyId) => getAdminAcademyScoreDetails(student).find((detail) => detail.academy.id === academyId);
  const getScoreParts = (detail) => {
    const earned = (label) => detail.tasks
      .filter((task) => task.completed && task.label.startsWith(label))
      .reduce((total, task) => total + Number(task.score || 0), 0);
    const rawParts = [Math.min(5, earned("直播课程")), Math.min(10, earned("作业")), Math.min(10, earned("魔法考试"))];
    let remaining = Math.max(0, Math.min(20, Number(detail.recordedScore || 0)));
    return rawParts.map((score) => {
      const allocated = Math.min(score, remaining);
      remaining -= allocated;
      return allocated;
    });
  };
  const topStudent = [...overviewStudents].sort((left, right) => Number(right.magic_power || 0) - Number(left.magic_power || 0))[0];
  const academyAverages = academies.map((academy) => {
    const total = overviewStudents.reduce((sum, student) => sum + Number(getAcademyDetail(student, academy.id)?.recordedScore || 0), 0);
    return {
      academy,
      average: overviewStudents.length ? Math.round(total / overviewStudents.length) : 0,
    };
  });
  const getFilteredStudents = () => {
    const keyword = String(adminContent.querySelector("[data-admin-student-keyword]")?.value || "")
      .trim()
      .toLocaleLowerCase("zh-CN");
    const academyId = String(adminContent.querySelector("[data-admin-academy-filter]")?.value || "all");

    return overviewStudents
      .filter((student) => !keyword || String(student.name || "").toLocaleLowerCase("zh-CN").includes(keyword))
      .sort((left, right) => {
        const leftScore = academyId === "all"
          ? Number(left.magic_power || 0)
          : Number(getAcademyDetail(left, academyId)?.recordedScore || 0);
        const rightScore = academyId === "all"
          ? Number(right.magic_power || 0)
          : Number(getAcademyDetail(right, academyId)?.recordedScore || 0);
        return rightScore - leftScore || String(left.name || "").localeCompare(String(right.name || ""), "zh-CN", { numeric: true });
      });
  };

  const renderStudentRows = () => {
    const filterSummary = adminContent.querySelector("[data-admin-filter-summary]");
    const scoreBoard = adminContent.querySelector("[data-admin-score-board]");
    const pagination = adminContent.querySelector("[data-admin-pagination]");
    if (!filterSummary || !scoreBoard || !pagination) return;

    const visibleStudents = getFilteredStudents();
    const pageCount = Math.max(1, Math.ceil(visibleStudents.length / pageSize));
    currentPage = Math.min(currentPage, pageCount);
    const pagedStudents = visibleStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const academyId = String(adminContent.querySelector("[data-admin-academy-filter]")?.value || "all");
    const academyLabel = academyId === "all" ? "总魔能" : getAcademyById(academyId)?.name || "学院";
    filterSummary.textContent = `共 ${visibleStudents.length} 名学员 · 按${academyLabel}排序`;
    scoreBoard.innerHTML = pagedStudents.length
      ? pagedStudents
          .map((student) => {
            const academyScoreDetails = getAdminAcademyScoreDetails(student);
            const rowIndex = visibleStudents.indexOf(student) + 1;
            const rankClass = rowIndex <= 3 ? ` is-top-${rowIndex}` : "";
            const initial = String(student.name || "学").trim().slice(0, 1);
            return `
              <tr>
                <td class="admin-score-rank-cell"><span class="admin-score-rank${rankClass}">${rowIndex}</span></td>
                <td class="admin-score-student-cell">
                  <span class="admin-score-avatar" aria-hidden="true">${escapeHtml(initial)}</span>
                  <button type="button" data-student-detail="${escapeHtml(student.id)}">${escapeHtml(student.name)}</button>
                </td>
                <td class="admin-score-total-cell">
                  <div><strong>${escapeHtml(student.magic_power)}</strong><small>/ 100</small></div>
                  <span class="admin-score-progress"><i style="width:${Math.min(100, Number(student.magic_power || 0))}%"></i></span>
                </td>
                ${academyScoreDetails
                  .map(
                    (detail) => {
                      const [courseScore, homeworkScore, examScore] = getScoreParts(detail);
                      const tone = academyMeta[detail.academy.id]?.tone || "gold";
                      return `
                        <td class="admin-score-detail-cell" data-tone="${tone}">
                          <div class="admin-score-academy-total">
                            <strong>${detail.recordedScore}</strong><small>/ 20</small>
                            ${detail.hasScoreDifference ? '<span class="admin-score-alert" title="历史记录分数与当前完成状态不一致" aria-label="历史分数异常">!</span>' : ""}
                          </div>
                          <div class="admin-score-part"><span>课程</span><b>${courseScore}<small>/5</small></b></div>
                          <div class="admin-score-part"><span>作业</span><b>${homeworkScore}<small>/10</small></b></div>
                          <div class="admin-score-part"><span>考试</span><b>${examScore}<small>/10</small></b></div>
                        </td>
                      `;
                    },
                  )
                  .join("")}
              </tr>
            `;
          })
          .join("")
      : '<tr><td class="admin-empty-state" colspan="8">没有符合筛选条件的学员。</td></tr>';
    pagination.innerHTML = pageCount > 1
      ? `
          <button type="button" data-page="${currentPage - 1}" ${currentPage === 1 ? "disabled" : ""} aria-label="上一页">‹</button>
          ${Array.from({ length: pageCount }, (_, index) => index + 1)
            .map((page) => `<button type="button" data-page="${page}" class="${page === currentPage ? "is-current" : ""}">${page}</button>`)
            .join("")}
          <button type="button" data-page="${currentPage + 1}" ${currentPage === pageCount ? "disabled" : ""} aria-label="下一页">›</button>
        `
      : "";
    adminContent.querySelectorAll("[data-student-detail]").forEach((button) => {
      button.addEventListener("click", () => {
        goTo(`/admin/students/${button.dataset.studentDetail}`);
      });
    });
    pagination.querySelectorAll("[data-page]").forEach((button) => {
      button.addEventListener("click", () => {
        currentPage = Number(button.dataset.page || 1);
        renderStudentRows();
      });
    });
  };

  adminContent.innerHTML = `
    <section class="admin-scoreboard-heading">
      <div class="admin-scoreboard-title">
        <span class="admin-scoreboard-sigil" aria-hidden="true">✦</span>
        <div>
          <h2>学院学生魔能看板</h2>
          <p>查看各学院学员魔能获取进度与明细</p>
        </div>
      </div>
      <div class="admin-scoreboard-update">
        <span>最后更新：${escapeHtml(updatedAt)}</span>
        <button type="button" data-refresh-admin-dashboard aria-label="刷新看板" title="刷新看板">↻</button>
        <button type="button" data-export-admin-dashboard>导出</button>
      </div>
    </section>
    <section class="admin-scoreboard-overview">
      <div class="admin-scoreboard-metrics">
        <article>
          <span class="admin-metric-icon is-students" aria-hidden="true">●</span>
          <div><small>学员总数</small><strong>${overviewSummary.total_students}<em>/ ${overviewSummary.total_students}</em></strong><p>已激活</p></div>
        </article>
        <article>
          <span class="admin-metric-icon is-magic" aria-hidden="true">✦</span>
          <div><small>魔能总分</small><strong>${totalMagic}<em>/ ${totalMagicMaximum}</em></strong><p>达成率 ${totalMagicRate}%</p><span class="admin-metric-progress"><i style="width:${totalMagicRate}%"></i></span></div>
        </article>
        <article>
          <span class="admin-metric-icon is-average" aria-hidden="true">★</span>
          <div><small>平均魔能</small><strong>${overviewSummary.average_magic_power}</strong><p>每位学员</p></div>
        </article>
        <article>
          <span class="admin-metric-icon is-top" aria-hidden="true">♛</span>
          <div><small>排行榜 TOP</small><strong class="admin-metric-top-name">${escapeHtml(topStudent?.name || "--")}</strong><p>${Number(topStudent?.magic_power || 0)} 魔能</p></div>
        </article>
      </div>
      <div class="admin-scoreboard-filters" aria-label="看板筛选">
        <label>
          <span>学院排序</span>
          <select data-admin-academy-filter>
            <option value="all">全部学院</option>
            ${academies.map((academy) => `<option value="${escapeHtml(academy.id)}">${escapeHtml(academy.name)}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>学员名字</span>
          <input type="search" data-admin-student-keyword placeholder="搜索学员名称" />
        </label>
      </div>
    </section>
    <section class="admin-scoreboard-layout">
      <div class="admin-scoreboard-table-card">
        <p class="admin-filter-summary" data-admin-filter-summary></p>
        <div class="admin-table-wrap admin-score-matrix-wrap">
          <table class="admin-score-matrix">
            <thead>
              <tr>
                <th>排名</th>
                <th>学员名称</th>
                <th>总魔能 ↓</th>
                ${academies.map((academy) => {
                  const meta = academyMeta[academy.id] || { symbol: "✦", tone: "gold" };
                  return `<th><span class="admin-academy-heading" data-tone="${meta.tone}"><i>${meta.symbol}</i>${escapeHtml(academy.name)}</span></th>`;
                }).join("")}
              </tr>
            </thead>
            <tbody data-admin-score-board></tbody>
          </table>
        </div>
        <nav class="admin-score-pagination" data-admin-pagination aria-label="学员列表分页"></nav>
      </div>
      <aside class="admin-scoreboard-sidebar">
        <section>
          <h3>各学院平均魔能</h3>
          <div class="admin-academy-average-list">
            ${academyAverages.map(({ academy, average }) => {
              const meta = academyMeta[academy.id] || { symbol: "✦", tone: "gold" };
              return `
                <article data-tone="${meta.tone}">
                  <span class="admin-average-symbol">${meta.symbol}</span>
                  <div><strong>${escapeHtml(academy.name)}</strong><span class="admin-average-progress"><i style="width:${Math.min(100, average * 5)}%"></i></span></div>
                  <b>${average}<small>/20</small></b>
                </article>
              `;
            }).join("")}
          </div>
        </section>
        <section>
          <h3>魔能获取规则</h3>
          <div class="admin-score-rules">
            <article><span>▣</span><div><strong>课程</strong><p>完成直播课程，最多获得 5 魔能</p></div></article>
            <article><span>◇</span><div><strong>作业</strong><p>完成学院作业，最多获得 10 魔能</p></div></article>
            <article><span>★</span><div><strong>考试</strong><p>完成魔法考试，计入学院进度</p></div></article>
          </div>
          <p class="admin-score-cap">单学院累计封顶 20 魔能</p>
        </section>
        <p class="admin-scoreboard-note">✦ 魔能总分满分 ${totalMagicMaximum}，快去施展魔法吧！</p>
      </aside>
    </section>
  `;
  adminContent.querySelector("[data-admin-student-keyword]")?.addEventListener("input", () => {
    currentPage = 1;
    renderStudentRows();
  });
  adminContent.querySelector("[data-admin-academy-filter]")?.addEventListener("change", () => {
    currentPage = 1;
    renderStudentRows();
  });
  adminContent.querySelector("[data-refresh-admin-dashboard]")?.addEventListener("click", renderAdminDashboard);
  renderStudentRows();
  adminContent.querySelector("[data-export-admin-dashboard]")?.addEventListener("click", () => {
    const metrics = [["学员总数", overviewSummary.total_students], ["魔能总分", totalMagic], ["平均魔能", overviewSummary.average_magic_power]];
    const studentRows = getFilteredStudents().map((student) => [student.name, student.magic_power, ...getAdminAcademyScoreDetails(student).map((detail) => detail.recordedScore)]);
    exportAdminExcel(`院长后台-总览-${new Date().toLocaleDateString("zh-CN").replace(/\//g, "-")}.xls`, [
      {
        name: "汇总指标",
        rows: [["指标", "数值"], ...metrics],
        columnWidths: [120, 90],
      },
      {
        name: "学员明细",
        rows: [
          ["学员名称", "总魔能", ...academies.map((academy) => academy.name)],
          ...studentRows,
        ],
        columnWidths: [120, 90, 90, 90, 90, 90, 90],
      },
    ]);
  });
}

function getAdminAcademyScoreDetails(student) {
  const lessonProgress = student.lesson_progress || student.academy_scores || [];
  const academyProgress = student.academy_progress || [];
  const lessonRows = new Map(lessonProgress.map((row) => [row.academy_id, row]));
  const academyRows = new Map(academyProgress.map((row) => [row.academy_id, row]));

  return academies.map((academy) => {
    const lesson = lessonRows.get(academy.id) || {};
    const academyProgress = academyRows.get(academy.id) || {};
    const singleHomework = academy.id === "legion";
    const tasks = [
      { label: "直播课程", score: 5, completed: Boolean(lesson.live_completed) },
      { label: "录播课程", score: 0, completed: Boolean(lesson.recorded_completed), note: "补充学习，不计分" },
      { label: "作业一", score: singleHomework ? 10 : 5, completed: Boolean(lesson.homework_q1_completed) },
      ...(!singleHomework ? [{ label: "作业二", score: 5, completed: Boolean(lesson.homework_q2_completed) }] : []),
      { label: "魔法考试", score: 10, completed: Boolean(lesson.exam_completed), started: Boolean(lesson.exam_started) },
    ];
    const calculatedScore = tasks.reduce((total, task) => total + (task.completed ? task.score : 0), 0);
    const recordedScore = lesson.magic_power_earned === null || lesson.magic_power_earned === undefined
      ? calculatedScore
      : Number(lesson.magic_power_earned);
    const academyStatus = academyProgress.completed
      ? "已完成"
      : academyProgress.unlocked || lesson.academy_id
        ? "进行中"
        : "未解锁";

    return {
      academy,
      tasks,
      calculatedScore,
      recordedScore,
      academyStatus,
      hasScoreDifference: recordedScore !== calculatedScore,
    };
  });
}

async function renderAdminStudentDetail(studentId) {
  const { student } = await apiRequest(`/api/admin/students/${studentId}`);
  const user = student.user;
  const lesson = student.lesson_progress.find((row) => row.academy_id === "spell" && row.lesson_id === "lesson-1") || {};
  const academyRows = student.academy_progress;
  const homeworkRows = student.homework_submissions;
  const examRows = student.exam_results;
  const academyScoreDetails = getAdminAcademyScoreDetails(student);
  adminContent.innerHTML = `
    <section class="admin-card">
      <button class="admin-back-link" type="button" data-admin-route="/admin">返回总览</button>
      <h2>${escapeHtml(user.name)} · 学员详情</h2>
      <div class="admin-detail-grid">
        <article><span>邮箱</span><strong>${escapeHtml(user.email)}</strong></article>
        <article><span>称号</span><strong>${escapeHtml(user.title)}</strong></article>
        <article><span>当前魔能</span><strong>${escapeHtml(user.magic_power)}</strong></article>
        <article><span>考试分数</span><strong>${lesson.exam_score ?? "--"}</strong></article>
      </div>
      <h3>咒语学院第一课</h3>
      <div class="admin-detail-grid">
        <article><span>直播课程</span><strong>${lesson.live_completed ? "已完成" : "待完成"}</strong></article>
        <article><span>录播课程</span><strong>${lesson.recorded_completed ? "已完成" : "待完成"}</strong></article>
        <article><span>作业一</span><strong>${lesson.homework_q1_completed ? "已完成" : "待完成"}</strong></article>
        <article><span>作业二</span><strong>${lesson.homework_q2_completed ? "已完成" : "待完成"}</strong></article>
        <article><span>考试</span><strong>${lesson.exam_completed ? "已完成" : lesson.exam_started ? "已开始" : "待完成"}</strong></article>
        <article><span>全部完成</span><strong>${lesson.all_completed ? "已完成" : "待完成"}</strong></article>
      </div>
      <h3>学院进度</h3>
      <div class="admin-chip-list">
        ${academyRows.map((row) => `<span>${escapeHtml(row.academy_id)}：${row.completed ? "已完成" : row.unlocked ? "已解锁" : "未解锁"}</span>`).join("") || "<span>暂无记录</span>"}
      </div>
      <h3>学院魔能明细</h3>
      <p class="admin-score-intro">每个学院满分 20 魔能。绿色为已得分，灰色为尚未完成。</p>
      <div class="admin-academy-score-list">
        ${academyScoreDetails
          .map(
            ({ academy, tasks, calculatedScore, recordedScore, academyStatus, hasScoreDifference }) => `
              <article class="admin-academy-score-card">
                <header>
                  <div>
                    <h4>${escapeHtml(academy.name)}</h4>
                    <span>${academyStatus}</span>
                  </div>
                  <strong>${recordedScore}/20</strong>
                </header>
                <div class="admin-score-task-list">
                  ${tasks
                    .map((task) => {
                      const statusText = task.completed ? "已完成" : task.started ? "已开始" : "未完成";
                      return `
                        <div class="admin-score-task ${task.completed ? "is-earned" : "is-pending"}">
                          <span>${escapeHtml(task.label)}${task.note ? `<small>${escapeHtml(task.note)}</small>` : ""}</span>
                          <b>${task.completed && task.score > 0 ? `+${task.score}` : task.score === 0 ? "0" : `0/${task.score}`} 魔能</b>
                          <em>${statusText}</em>
                        </div>
                      `;
                    })
                    .join("")}
                </div>
                ${hasScoreDifference ? `<p class="admin-score-warning">系统记录为 ${recordedScore} 分；按当前任务状态计算为 ${calculatedScore} 分，请核对该学员的历史同步记录。</p>` : ""}
              </article>
            `,
          )
          .join("")}
      </div>
      <h3>作业内容</h3>
      <div class="admin-homework-list">
        ${
          homeworkRows
            .map(
              (row) => `
                <article>
                  <header><strong>${escapeHtml(row.title)}</strong><span>${visibilityText(row.visibility)}</span></header>
                  <p>${escapeHtml(row.content || "未提交")}</p>
                  <small>提交时间：${escapeHtml(row.submitted_at || row.updated_at || "--")}</small>
                </article>
              `,
            )
            .join("") || "<p>暂无作业</p>"
        }
      </div>
      <h3>考试结果</h3>
      <div class="admin-chip-list">
        ${examRows.map((row) => `<span>${escapeHtml(row.lesson_id)}：${row.score ?? "--"} 分 · ${row.passed ? "通过" : "待确认"}</span>`).join("") || "<span>暂无考试记录</span>"}
      </div>
    </section>
  `;
  adminContent.querySelector("[data-admin-route]")?.addEventListener("click", (event) => {
    goTo(event.currentTarget.dataset.adminRoute);
  });
}

async function renderAdminHomework() {
  const [{ homework }, { students }] = await Promise.all([
    apiRequest("/api/admin/homework"),
    apiRequest("/api/admin/students"),
  ]);
  const academyName = (row) => getAcademyById(row.academy_id)?.name || row.academy_id || row.lesson_id || "--";
  const completedHomework = homework.filter((row) => row.completed);
  const homeworkTitles = Array.from(
    new Set(homework.map((row) => String(row.title || "").trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "zh-CN"));
  const studentOptions = [...students].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), "zh-CN"),
  );
  const answerText = (row) => String(row.content || "").trim() || "已完成（该作业无文字答案）";

  adminContent.innerHTML = `
    <div class="admin-homework-boards">
      <section class="admin-card admin-homework-header">
        <div>
          <h2>作业看板</h2>
          <p>按作业标题或学员姓名筛选，集中查看已完成作业及答案。</p>
        </div>
        <button type="button" data-export-admin-homework>导出作业 Excel</button>
      </section>

      <section class="admin-card admin-answer-board">
        <div class="admin-board-head">
          <div>
            <span class="admin-board-kicker">看板一</span>
            <h2>按作业查看学员答案</h2>
            <p>选择已经布置的作业标题，查看所有完成该作业的学员及提交内容。</p>
          </div>
          <label class="admin-board-filter">
            作业标题
            <select data-homework-title-filter ${homeworkTitles.length ? "" : "disabled"}>
              ${
                homeworkTitles.length
                  ? homeworkTitles.map((title) => `<option value="${escapeHtml(title)}">${escapeHtml(title)}</option>`).join("")
                  : '<option value="">暂无作业</option>'
              }
            </select>
          </label>
        </div>
        <div class="admin-board-summary" data-homework-title-summary></div>
        <div class="admin-table-wrap">
          <table class="admin-table admin-answer-table">
            <thead><tr><th>学员</th><th>作业内容</th></tr></thead>
            <tbody data-homework-title-results></tbody>
          </table>
        </div>
      </section>

      <section class="admin-card admin-answer-board">
        <div class="admin-board-head">
          <div>
            <span class="admin-board-kicker">看板二</span>
            <h2>按学员查看已完成作业</h2>
            <p>选择学员姓名，查看该学员已经完成的作业标题及对应答案。</p>
          </div>
          <label class="admin-board-filter">
            学员姓名
            <select data-homework-student-filter ${studentOptions.length ? "" : "disabled"}>
              ${
                studentOptions.length
                  ? studentOptions
                      .map((student) => `<option value="${escapeHtml(student.id)}">${escapeHtml(student.name)}</option>`)
                      .join("")
                  : '<option value="">暂无学员</option>'
              }
            </select>
          </label>
        </div>
        <div class="admin-board-summary" data-homework-student-summary></div>
        <div class="admin-table-wrap">
          <table class="admin-table admin-answer-table admin-student-answer-table">
            <thead><tr><th>学院</th><th>作业</th><th>答案</th><th>更新时间</th></tr></thead>
            <tbody data-homework-student-results></tbody>
          </table>
        </div>
      </section>
    </div>
  `;

  const titleFilter = adminContent.querySelector("[data-homework-title-filter]");
  const titleSummary = adminContent.querySelector("[data-homework-title-summary]");
  const titleResults = adminContent.querySelector("[data-homework-title-results]");
  const studentFilter = adminContent.querySelector("[data-homework-student-filter]");
  const studentSummary = adminContent.querySelector("[data-homework-student-summary]");
  const studentResults = adminContent.querySelector("[data-homework-student-results]");

  const renderTitleBoard = () => {
    const selectedTitle = titleFilter?.value || "";
    const rows = completedHomework.filter((row) => row.title === selectedTitle);
    titleSummary.textContent = selectedTitle ? `${selectedTitle} · 已提交 ${rows.length} 人` : "暂无可筛选的作业";
    titleResults.innerHTML = rows.length
      ? rows
          .map(
            (row) => `
              <tr>
                <td class="admin-student-cell">
                  <strong>${escapeHtml(row.student_name)}</strong>
                  <small>${escapeHtml(row.student_email || "--")}</small>
                </td>
                <td class="admin-long-cell">${escapeHtml(answerText(row))}</td>
              </tr>
            `,
          )
          .join("")
      : '<tr><td class="admin-empty-state" colspan="2">暂无学员提交这份作业。</td></tr>';
  };

  const renderStudentBoard = () => {
    const selectedStudentId = studentFilter?.value || "";
    const selectedStudent = studentOptions.find((student) => student.id === selectedStudentId);
    const rows = completedHomework.filter((row) => row.user_id === selectedStudentId);
    studentSummary.textContent = selectedStudent
      ? `${selectedStudent.name} · 已完成 ${rows.length} 份作业`
      : "暂无可筛选的学员";
    studentResults.innerHTML = rows.length
      ? rows
          .map(
            (row) => `
              <tr>
                <td>${escapeHtml(academyName(row))}</td>
                <td>${escapeHtml(row.title)}</td>
                <td class="admin-long-cell">${escapeHtml(answerText(row))}</td>
                <td>${escapeHtml(row.updated_at || "--")}</td>
              </tr>
            `,
          )
          .join("")
      : '<tr><td class="admin-empty-state" colspan="4">该学员暂无已完成作业。</td></tr>';
  };

  titleFilter?.addEventListener("change", renderTitleBoard);
  studentFilter?.addEventListener("change", renderStudentBoard);
  renderTitleBoard();
  renderStudentBoard();

  adminContent.querySelector("[data-export-admin-homework]")?.addEventListener("click", () => {
    const homeworkRows = homework.map((row) => [
      row.student_name,
      row.student_email,
      academyName(row),
      row.title,
      visibilityText(row.visibility),
      row.completed ? "已完成" : "待完成",
      row.content || "--",
      row.updated_at || "--",
    ]);
    exportAdminExcel(`院长后台-作业管理-${new Date().toLocaleDateString("zh-CN").replace(/\//g, "-")}.xls`, [
      {
        name: "作业管理",
        rows: [
          ["学员", "邮箱", "课程", "作业", "可见范围", "状态", "内容", "更新时间"],
          ...homeworkRows,
        ],
        columnWidths: [100, 180, 90, 150, 100, 90, 280, 155],
      },
    ]);
  });
}

async function renderAdminFeedback() {
  const { feedback } = await apiRequest("/api/admin/feedback");
  adminContent.innerHTML = `
    <section class="admin-card">
      <h2>学员留言</h2>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>学员</th><th>邮箱</th><th>留言内容</th><th>提交时间</th></tr></thead>
          <tbody>
            ${feedback.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:#8b6d3f;">暂无留言</td></tr>' : feedback.map((row) => `
              <tr>
                <td>${escapeHtml(row.user_name)}</td>
                <td>${escapeHtml(row.user_email)}</td>
                <td class="admin-long-cell">${escapeHtml(row.content)}</td>
                <td>${escapeHtml(row.created_at || "--")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

async function renderAdminExams() {
  const { exams } = await apiRequest("/api/admin/exams");
  adminContent.innerHTML = `
    <section class="admin-card">
      <h2>考试成绩管理</h2>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>学员</th><th>邮箱</th><th>课程</th><th>状态</th><th>分数</th><th>是否通过</th><th>完成时间</th></tr></thead>
          <tbody>
            ${exams
              .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
              .map(
                (row) => `
                  <tr>
                    <td>${escapeHtml(row.student_name)}</td>
                    <td>${escapeHtml(row.student_email)}</td>
                    <td>${escapeHtml(row.lesson_id)}</td>
                    <td>${statusTag(row.score !== null && row.score !== undefined ? "已完成" : "待完成")}</td>
                    <td>${row.score ?? "--"}</td>
                    <td>${row.passed ? "通过" : "待确认"}</td>
                    <td>${escapeHtml(row.completed_at || "--")}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

async function renderAdminPage() {
  if (!adminContent) return;
  renderUserControls();
  adminDenied.hidden = true;
  adminMain.hidden = false;
  adminContent.innerHTML = `<section class="admin-card"><p>正在读取院长后台数据...</p></section>`;
  try {
    if (currentPath.startsWith("/admin/students/")) {
      await renderAdminStudentDetail(currentPath.split("/").pop());
    } else if (currentPath === "/admin/homework") {
      await renderAdminHomework();
    } else if (currentPath === "/admin/exams") {
      await renderAdminExams();
    } else if (currentPath === "/admin/feedback") {
      await renderAdminFeedback();
    } else {
      await renderAdminDashboard();
    }
  } catch (error) {
    if (error.status === 403) {
      adminMain.hidden = true;
      adminDenied.hidden = false;
      return;
    }
    adminContent.innerHTML = `<section class="admin-card"><h2>后台读取失败</h2><p>${escapeHtml(error.message)}</p></section>`;
  }
}

async function showAdminPage() {
  document.documentElement.classList.remove("lesson-route");
  document.documentElement.classList.add("admin-route");
  document.body.classList.remove("lesson-route");
  document.body.classList.add("admin-route");
  document.body.style.overflowY = "";
  academyShell.hidden = true;
  lessonPage.hidden = true;
  if (adminPage) adminPage.hidden = false;
  await renderAdminPage();
}

function syncMapStateFromAcademyStorage() {
  if (localStorage.getItem(userStorageKey("academy_spell_completed")) === "true" || localStorage.getItem(userStorageKey("spell_lesson1_all_completed")) === "true") {
    if (!state.completed[0]?.length) state.completed[0] = [0, 1, 2];
    if (!state.lit.includes(0)) state.lit.push(0);
    state.lit = Array.from(new Set(state.lit)).sort((a, b) => a - b);
    state.activeRoute = { from: 0, to: 1 };
  }

  if (localStorage.getItem(userStorageKey("academy_pet_completed")) === "true" || localStorage.getItem(userStorageKey("pet_lesson1_all_completed")) === "true") {
    if (!state.completed[1]?.length) state.completed[1] = [0, 1, 2];
    if (!state.lit.includes(1)) state.lit.push(1);
    state.lit = Array.from(new Set(state.lit)).sort((a, b) => a - b);
    state.activeRoute = { from: 1, to: 2 };
  }

  const circleLessonCompleted = localStorage.getItem(`${getLearningUserId()}_circle_lesson-1_all_completed`) === "true";
  const legacyCircleCompleted = localStorage.getItem("academy_circle_completed") === "true";
  if (localStorage.getItem(userStorageKey("academy_circle_completed")) === "true" || circleLessonCompleted || legacyCircleCompleted) {
    localStorage.setItem(userStorageKey("academy_circle_completed"), "true");
    localStorage.setItem(userStorageKey("academy_legion_unlocked"), "true");
    if (!state.completed[2]?.length) state.completed[2] = [0, 1, 2];
    if (!state.lit.includes(2)) state.lit.push(2);
    state.lit = Array.from(new Set(state.lit)).sort((a, b) => a - b);
    state.activeRoute = { from: 2, to: 3 };
  }

  const legionLessonCompleted = localStorage.getItem(`${getLearningUserId()}_legion_lesson-1_all_completed`) === "true";
  const legacyLegionCompleted = localStorage.getItem("academy_legion_completed") === "true";
  if (localStorage.getItem(userStorageKey("academy_legion_completed")) === "true" || legionLessonCompleted || legacyLegionCompleted) {
    localStorage.setItem(userStorageKey("academy_legion_completed"), "true");
    localStorage.setItem(userStorageKey("academy_final_unlocked"), "true");
    if (!state.completed[3]?.length) state.completed[3] = [0, 1, 2];
    if (!state.lit.includes(3)) state.lit.push(3);
    state.lit = Array.from(new Set(state.lit)).sort((a, b) => a - b);
    state.activeRoute = { from: 3, to: 4 };
  }

  if (localStorage.getItem(userStorageKey("academy_pet_unlocked")) === "true") {
    state.selectedTrial = 1;
  }

  const focusIndex = getAcademyIndexById(currentParams.get("focus"));
  if (focusIndex >= 0 && isAcademyUnlocked(focusIndex)) state.selectedTrial = focusIndex;

  saveState();
}

function bindLessonPage() {
  if (!lessonPage) return;

  document.querySelector("[data-return-map]").addEventListener("click", () => {
    goTo("/");
  });

  document.querySelector("[data-return-academy]")?.addEventListener("click", () => {
    goTo(`/academy/${getCurrentLessonConfig().academyId}`);
  });

  document.querySelector("[data-open-course-resource]").addEventListener("click", () => {
    window.open(getCurrentLessonConfig().courseResource.url, "_blank", "noopener");
  });

  document.querySelector("[data-copy-extract-code]").addEventListener("click", async () => {
    await copyText(getCurrentLessonConfig().courseResource.extractCode);
    showLessonToast("提取码已复制");
  });

  document.querySelectorAll("[data-course-check]").forEach((button) => {
    button.addEventListener("click", () => {
      const shell = button.closest(".course-check-item") || button;
      if (shell.classList.contains("is-disabled")) return;
      const isLive = button.dataset.courseCheck === "live";
      const key = isLive ? lessonCourseKey("live_completed") : lessonCourseKey("recorded_completed");
      const otherKey = isLive ? lessonCourseKey("recorded_completed") : lessonCourseKey("live_completed");
      const nextValue = localStorage.getItem(key) !== "true";
      localStorage.setItem(key, nextValue ? "true" : "false");
      if (nextValue) localStorage.removeItem(otherKey);
      localStorage.setItem(lessonCourseKey("updated_at"), new Date().toISOString());
      const done = syncLessonCourseCompleted();
      renderLessonPage();
      if (done) {
        showLessonToast("课程任务已完成，魔能已同步。");
      } else {
        showLessonToast(
          button.dataset.courseCheck === "live"
            ? nextValue
              ? "直播课程已确认，获得 5 魔能。"
              : "直播课程已取消，魔能已同步更新。"
            : nextValue
              ? "录播课程已确认，补充学习不额外计分。"
              : "录播课程已取消。",
        );
      }
    });
  });

  // Event delegation for dynamic homework cards
  lessonPage.addEventListener("input", (event) => {
    const textarea = event.target.closest("[data-homework-input]");
    if (!textarea) return;
    const question = getCurrentLessonConfig().homework.questions.find((item) => item.id === textarea.dataset.homeworkInput);
    if (!question) return;
    setLessonQuestionValue(question, "content", textarea.value);
    renderLessonQuestion(question);
    const updatedEl = document.querySelector("[data-homework-updated]");
    if (updatedEl) {
      updatedEl.textContent = formatLessonUpdatedAt(
        localStorage.getItem(lessonCourseKey("homework_updated_at")),
      );
    }
  });

  lessonPage.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-homework-checkbox]");
    if (!checkbox) return;
    const question = getCurrentLessonConfig().homework.questions.find((item) => item.id === checkbox.dataset.homeworkCheckbox);
    if (!question) return;
    localStorage.setItem(lessonStorageKey(question, "checkbox_checked"), checkbox.checked ? "true" : "false");
    localStorage.setItem(lessonCourseKey("updated_at"), new Date().toISOString());
  });

  lessonPage.addEventListener("click", (event) => {
    const visibilityButton = event.target.closest("[data-visibility-option]");
    if (visibilityButton) {
      const question = getCurrentLessonConfig().homework.questions.find((item) => item.id === visibilityButton.dataset.questionId);
      if (!question) return;
      setLessonQuestionValue(question, "visibility", visibilityButton.dataset.visibilityOption);
      renderLessonQuestion(question);
      return;
    }

    const completeButton = event.target.closest("[data-complete-question]");
    if (completeButton) {
      const question = getCurrentLessonConfig().homework.questions.find((item) => item.id === completeButton.dataset.completeQuestion);
      if (!question) return;
      const questionState = getLessonQuestionState(question);
      if (!question.noTextInput && !questionState.content.trim()) {
        showQuestionWarning(question.id, question.emptyWarning);
        showLessonToast(question.emptyWarning);
        return;
      }
      if (question.checkboxLabel) {
        const checkbox = document.querySelector(`[data-homework-checkbox="${question.id}"]`);
        if (checkbox && !checkbox.checked) {
          showQuestionWarning(question.id, question.checkboxEmptyWarning || "请先勾选确认项。");
          showLessonToast(question.checkboxEmptyWarning || "请先勾选确认项。");
          return;
        }
      }
      const wasCompleted = questionState.completed;
      setLessonQuestionValue(question, "completed", "true");
      setLessonQuestionValue(question, "submitted_content", questionState.content);
      syncLessonCompletedCount();
      renderLessonPage();
      const config = getCurrentLessonConfig();
      const q1Id = config.homework.questions[0]?.id;
      if (wasCompleted) {
        showLessonToast(`${question.fullTitle.split(" · ")[0]}已更新提交。`);
      } else if (isLessonHomeworkCompleted()) {
        showLessonToast(`${question.fullTitle.split(" · ")[0]}已提交，本课作业已完成。`);
      } else if (question.id === q1Id) {
        showLessonToast("作业一已提交，继续完成作业二。");
      } else {
        showLessonToast("作业二已提交，继续完成作业一。");
      }
    }
  });

  // Removed save-all-homework button: auto-save on input makes it redundant

  document.querySelector("[data-start-exam]").addEventListener("click", () => {
    const config = getCurrentLessonConfig();
    localStorage.setItem(lessonCourseKey("exam_started"), "true");
    localStorage.setItem(lessonCourseKey("updated_at"), new Date().toISOString());
    renderLessonPage();
    showLessonToast("考试挑战已开启。考完回到本页后才会发放考试魔能。");
    const examUrl = new URL(toInternalUrl(config.exam.url), window.location.origin);
    if (/^https?:\/\//i.test(config.exam.url)) {
      const returnUrl = new URL(toInternalUrl(`/academy/${config.academyId}/courses/${config.lessonId}?examCompleted=1#exam`), window.location.origin).toString();
      examUrl.searchParams.set("userId", getLearningUserId());
      examUrl.searchParams.set("lessonId", config.lessonId);
      examUrl.searchParams.set("returnUrl", returnUrl);
      examUrl.searchParams.set("return_url", returnUrl);
      window.open(examUrl.toString(), "_blank", "noopener");
    } else {
      window.location.href = examUrl.toString();
    }
  });

  document.querySelector("[data-complete-exam-fallback]").addEventListener("click", () => {
    const confirmed = window.confirm("请确认你已经完成考试并看到分数。确认后将记录考试完成状态。");
    if (!confirmed) return;
    completeLessonExam();
    renderLessonPage();
    showLessonToast("考试已完成，魔能已同步。");
  });

  document.querySelector("[data-completion-return-map]").addEventListener("click", () => {
    const config = getCurrentLessonConfig();
    const nextId = getAcademyById(config.academyId)?.nextId;
    localStorage.setItem(lessonCourseKey("completion_acknowledged"), "true");
    goTo(nextId ? `/?focus=${nextId}` : "/");
  });

  document.querySelectorAll("[data-scroll-target]").forEach((button) => {
    button.addEventListener("click", () => scrollToLessonTarget(button.dataset.scrollTarget));
  });
}

function getEnergy() {
  return trials.reduce((sum, trial, trialIndex) => {
    return (
      sum +
      trial.actions.reduce((taskSum, action, actionIndex) => {
        return taskSum + (state.completed[trialIndex]?.includes(actionIndex) ? action.score : 0);
      }, 0)
    );
  }, 0);
}

function getTrialScore(index) {
  return trials[index].actions.reduce((sum, action, actionIndex) => {
    return sum + (state.completed[index]?.includes(actionIndex) ? action.score : 0);
  }, 0);
}

function getAcademyById(id) {
  return trials.find((trial) => trial.id === id);
}

function getAcademyIndexById(id) {
  return trials.findIndex((trial) => trial.id === id);
}

function isAcademyUnlocked(index) {
  if (currentUser?.role === "dean" || currentUser?.role === "assistant") return true;
  if (trials[index]?.id === "circle") return true;
  const academyId = trials[index]?.id;
  if (academyId && localStorage.getItem(userStorageKey(`academy_${academyId}_unlocked`)) === "true") return true;
  return index === 0 || state.lit.includes(index) || state.lit.includes(index - 1) || getTrialScore(index) > 0;
}

function getAcademyComputedProgress(index) {
  const completed = state.completed[index] || [];
  const trial = trials[index];
  return {
    total: trial.progress.total,
    completed: getTrialScore(index),
    score: getTrialScore(index) * 5,
    courses: {
      ...trial.progress.courses,
      completed: completed.includes(0) ? trial.progress.courses.total : 0,
    },
    homework: {
      ...trial.progress.homework,
      completed: completed.includes(1) ? trial.progress.homework.total : 0,
    },
    exam: {
      ...trial.progress.exam,
      completed: completed.includes(2) ? trial.progress.exam.total : 0,
    },
  };
}

function parsePercent(value) {
  return Number.parseFloat(String(value).replace("%", ""));
}

const mapRoadPaths = {
  "0-1": "M 16 32 C 23 42, 31 43, 38 39 C 41 37, 43 36, 45 35",
  "1-2": "M 45 35 C 48 47, 44 57, 39 64 C 37 68, 36 70, 36 72",
  "2-3": "M 36 72 C 48 63, 54 49, 64 39 C 70 32, 75 27, 78 25",
  "3-4": "M 78 25 C 86 38, 87 51, 83 62 C 81 67, 80 70, 81 71",
};

function routePath(fromIndex, toIndex) {
  const roadPath = mapRoadPaths[`${fromIndex}-${toIndex}`];
  if (roadPath) return roadPath;

  const from = trials[fromIndex]?.mapPosition;
  const to = trials[toIndex]?.mapPosition;
  if (!from || !to) return "";
  const x1 = parsePercent(from.x);
  const y1 = parsePercent(from.y);
  const x2 = parsePercent(to.x);
  const y2 = parsePercent(to.y);
  const cx1 = x1 + (x2 - x1) * 0.36;
  const cy1 = y1 - 12;
  const cx2 = x1 + (x2 - x1) * 0.64;
  const cy2 = y2 + 12;
  return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
}

function actionDone(index, actionIndex) {
  return state.completed[index]?.includes(actionIndex);
}

function academyStepLocks(index) {
  const locked = !isAcademyUnlocked(index);
  if (["circle", "legion"].includes(trials[index]?.id)) {
    return {
      courses: locked,
      homework: locked,
      exam: locked,
    };
  }
  if (index === 0) {
    return {
      courses: locked,
      homework: locked,
      exam: locked,
    };
  }
  return {
    courses: locked,
    homework: locked || !actionDone(index, 0),
    exam: locked || !actionDone(index, 1),
  };
}

function updateActiveRoute() {
  const activeGuideIndex = nextUnlitIndex();
  const fallbackRoute = activeGuideIndex < trials.length - 1 ? { from: activeGuideIndex, to: activeGuideIndex + 1 } : null;
  const route = state.activeRoute || fallbackRoute;
  const hasRoute = route && route.to < trials.length;
  activeRoutePath.setAttribute("d", hasRoute ? routePath(route.from, route.to) : "");
  mapStage.classList.toggle("has-active-route", Boolean(hasRoute));
}

function getNextStepText(index) {
  if (index === 0 && localStorage.getItem(userStorageKey("academy_spell_completed")) === "true") return "前往灵宠学院，开启第二阶段修炼";
  const actionIndex = (state.completed[index] || []).length;
  const action = trials[index].actions[actionIndex];
  if (!action) return "本院任务已完成，可以点亮城堡";
  if (index === 0 && action.key === "live") return "完成第一节AI核心理论课";
  return `${action.label}：${action.detail}`;
}

function toInternalUrl(url) {
  if (!url) return "";
  if (/^(https?:|mailto:|tel:)/i.test(url)) return url;
  if (!staticAppBasePath || !url.startsWith("/")) return url;

  const target = new URL(url, window.location.origin);
  if (deployedAppBasePath) {
    return `${deployedAppBasePath}${target.pathname === "/" ? "/" : target.pathname}${target.search}${target.hash}`;
  }
  if (target.pathname.endsWith(".html")) {
    return `${staticAppBasePath}${target.pathname}${target.search}${target.hash}`;
  }

  const route = target.pathname.replace(/\/$/, "") || "/";
  const params = new URLSearchParams(target.search);
  params.set("route", route);
  const query = params.toString();
  return `${staticAppBasePath}/${query ? `?${query}` : ""}${target.hash}`;
}

function goTo(url) {
  if (!url) return;
  window.location.href = toInternalUrl(url);
}

function navigateTo(url) {
  goTo(url);
}

function getLevelIndex(energy = getEnergy()) {
  return levelDefs.reduce((current, level, index) => (energy >= level.min ? index : current), 0);
}

function getLevel(energy = getEnergy()) {
  return levelDefs[getLevelIndex(energy)];
}

function getPetName() {
  const zodiac = state.profile?.zodiac || "星座";
  return `${zodiac}星灵宠`;
}

function artifactName(levelIndex = getLevelIndex()) {
  if (levelIndex === 1) return getPetName();
  return levelDefs[levelIndex].artifact;
}

function setArtifactIcon(element, icon) {
  element.className = `artifact-icon artifact-${icon}`;
}

function nextUnlitIndex() {
  const index = trials.findIndex((_, trialIndex) => !state.lit.includes(trialIndex));
  return index === -1 ? trials.length - 1 : index;
}

function canLightCastle(index) {
  const previousLit = Array.from({ length: index }, (_, previousIndex) => state.lit.includes(previousIndex)).every(Boolean);
  return previousLit && getTrialScore(index) >= 20 && !state.lit.includes(index);
}

function getAcademyStatus(index) {
  if (index === 0 && localStorage.getItem(userStorageKey("academy_spell_completed")) === "true") return "已完成";
  if (index === 1 && localStorage.getItem(userStorageKey("academy_pet_unlocked")) === "true" && !state.lit.includes(index)) return "已解锁";
  if (state.lit.includes(index)) return "已完成";
  if (!isAcademyUnlocked(index)) return "未解锁";
  if (getTrialScore(index) > 0) return "修炼中";
  return "已解锁";
}

function flashRoute() {
  mapStage.classList.remove("flash-route");
  void mapStage.offsetWidth;
  mapStage.classList.add("flash-route");
  window.setTimeout(() => mapStage.classList.remove("flash-route"), 680);
}

function closeCastlePopup() {
  castlePopup.hidden = true;
  castlePopup.classList.remove("is-magic-sample");
  mapStage.classList.remove("popup-open");
  state.popupAcademyId = null;
  saveState();
}

function openCastlePopup(index) {
  const trial = trials[index];
  const position = trial.position || {};
  const computed = getAcademyComputedProgress(index);
  const locked = !isAcademyUnlocked(index);
  const rows = academyPopupRows[trial.id] || [];
  const academyStatus = getAcademyStatus(index);
  mapStage.classList.add("popup-open");
  castlePopup.style.setProperty("--popup-left", position.popupLeft || "28px");
  castlePopup.style.setProperty("--popup-top", position.popupTop || "28px");
  document.querySelector("[data-popup-kicker]").textContent = trial.subtitle;
  document.querySelector("[data-popup-title]").textContent = `${trial.order} · ${trial.name}`;
  const stepLocks = academyStepLocks(index);
  const overviewText = rows.map((row) => row.overview).join("\n");
  const learningText = rows.map((row) => row.learning).join("\n");
  document.querySelector("[data-popup-overview]").innerHTML = `
    <div class="popup-meta">
      <span>状态：${academyStatus}</span>
      <span>修炼进度：${computed.completed}/${computed.total}</span>
      <span>下一步：${locked ? "完成上一学院" : getNextStepText(index)}</span>
    </div>
    ${locked ? '<p class="locked-note">完成上一学院后解锁。</p>' : ""}
  `;
  document.querySelector("[data-popup-learning]").innerHTML = `
    <div class="academy-file-grid">
      <article class="academy-file-card">
        <h4>学院概况</h4>
        <p>${overviewText}</p>
      </article>
      <article class="academy-file-card">
        <h4>学习内容</h4>
        <p>${learningText}</p>
      </article>
      <article class="academy-file-card">
        <h4>工具使用</h4>
        <p>可使用通用大模型辅助学习与练习。</p>
        <div class="tool-tags">
          ${trial.tools.map((tool) => `<button type="button" data-tool-route="${tool.url}">${tool.name}</button>`).join("")}
        </div>
      </article>
    </div>
  `;
  document.querySelector("[data-popup-tools]").innerHTML = "";
  document.querySelectorAll("[data-tool-route]").forEach((button) => {
    button.addEventListener("click", () => navigateTo(button.dataset.toolRoute));
  });
  popupEnterButton.disabled = locked;
  popupEnterButton.textContent = locked ? "尚未解锁" : "进入学院";
  popupCourseButton.disabled = stepLocks.courses;
  popupCourseButton.textContent = index === 0 && isLessonCourseCompleted() ? "已完成课程 √" : "查看课程";
  popupCourseButton.classList.toggle("is-complete", index === 0 && isLessonCourseCompleted());
  popupHomeworkButton.disabled = stepLocks.homework;
  popupHomeworkButton.textContent =
    index === 0 && isLessonHomeworkCompleted()
      ? "已完成作业 √"
      : "查看作业";
  popupHomeworkButton.classList.toggle("is-complete", index === 0 && isLessonHomeworkCompleted());
  popupExamButton.disabled = index !== 1 && stepLocks.exam;
  popupExamButton.textContent =
    index === 0 && isLessonExamCompleted()
      ? "已完成考试 √"
      : "进入考试";
  popupExamButton.classList.toggle("is-complete", index === 0 && isLessonExamCompleted());
  state.popupAcademyId = trial.id;
  saveState();
  castlePopup.classList.toggle("is-magic-sample", trial.id === "spell");
  castlePopup.hidden = false;
}

function focusCurrentGuide() {
  const guide = document.querySelector(".current-guide");
  guide.classList.remove("panel-pulse");
  void guide.offsetWidth;
  guide.classList.add("panel-pulse");
  window.setTimeout(() => guide.classList.remove("panel-pulse"), 780);
}

function selectTrial(index, options = {}) {
  state.selectedTrial = index;
  saveState();
  render();
  flashRoute();

  if (options.popup) {
    openCastlePopup(index);
  }
}

function render() {
  const energy = getEnergy();
  const levelIndex = getLevelIndex(energy);
  const level = levelDefs[levelIndex];
  const selected = trials[state.selectedTrial] || trials[0];
  const selectedScore = getTrialScore(state.selectedTrial);

  energyEl.textContent = String(energy);
  progressEl.style.width = `${Math.min(energy, 100)}%`;
  titleEl.textContent = state.profile?.name ? `${state.profile.name} · ${level.title}` : level.title;
  artifactLabelEl.textContent = `${artifactName(levelIndex)}已获得 · 当前称号已更新`;
  setArtifactIcon(artifactIconEl, level.icon);

  if (state.profile) {
    nameEl.textContent = state.profile.name;
    idEl.textContent = state.profile.id;
    if (badgesEl) {
      badgesEl.innerHTML = [state.profile.zodiac, state.profile.project, state.profile.tools]
        .map((item) => `<span>${item}</span>`)
        .join("");
    }
  }

  const activeGuideIndex = nextUnlitIndex();
  levelNoEl.textContent = `Lv.${levelIndex + 1}`;
  litCountEl.textContent = `${state.lit.length}/5`;
  const nextIndex = state.lit.length >= trials.length ? -1 : nextUnlitIndex();
  mainTaskEl.textContent =
    localStorage.getItem(userStorageKey("academy_pet_unlocked")) === "true" && !state.lit.includes(1)
      ? "主线：前往灵宠学院，开启第二阶段修炼"
      : nextIndex === -1
        ? "主线：全部学院已解锁"
        : `主线：点亮${trials[nextIndex].name}`;

  castleButtons.forEach((button, index) => {
    const score = getTrialScore(index);
    const position = trials[index].position || {};
    button.style.setProperty("--castle-left", position.left || "50%");
    button.style.setProperty("--castle-top", position.top || "50%");
    button.style.setProperty("--castle-width", position.width || "16%");
    button.style.setProperty("--castle-height", position.height || "22%");
    button.dataset.order = trials[index].order;
    const orb = button.querySelector(".magic-orb");
    if (orb) {
      orb.textContent = trials[index].order;
      orb.setAttribute("aria-label", `${trials[index].order} ${trials[index].name}`);
    }
    button.classList.toggle("is-lit", state.lit.includes(index));
    button.classList.toggle("is-current", index === activeGuideIndex);
    button.classList.toggle("is-selected", index === state.selectedTrial);
    button.classList.toggle("can-light", canLightCastle(index));
    button.classList.toggle("is-locked", !isAcademyUnlocked(index));
    button.classList.toggle("is-completed", getAcademyStatus(index) === "已完成");
    button.classList.toggle("is-new-unlocked", false);
    button.setAttribute("aria-pressed", String(index === state.selectedTrial));
    if (index === activeGuideIndex && !state.lit.includes(index)) {
      button.dataset.hint = index === 0 ? "从这里开始" : "下一站";
    } else {
      button.removeAttribute("data-hint");
    }
    button.querySelector("small").textContent =
      getAcademyStatus(index) === "已完成"
        ? "已完成"
        : index === 1 && localStorage.getItem(userStorageKey("academy_pet_unlocked")) === "true" && score === 0
          ? "已解锁"
          : `${score}/20`;
  });

  updateActiveRoute();

  academyListEl.innerHTML = trials
    .map((trial, index) => {
      const progress = getAcademyComputedProgress(index);
      const status = getAcademyStatus(index);
      const doneCount = state.completed[index]?.length || 0;
      const unfinishedActions = trial.actions.filter((_, actionIndex) => !state.completed[index]?.includes(actionIndex));
      return `
        <button class="academy-card ${index === state.selectedTrial ? "is-selected" : ""} ${state.lit.includes(index) ? "is-lit" : ""}" type="button" data-panel-trial="${index}">
          <div class="academy-card-head">
            <h4><b>${trial.order}</b> ${trial.name}</h4>
            <span class="academy-card-state">${status}</span>
          </div>
          <div class="academy-card-progress">
            <span>${progress.completed}/${progress.total}</span>
            <i><b style="--card-progress: ${Math.min(progress.completed / progress.total, 1) * 100}%"></b></i>
          </div>
          <em>${doneCount}/${trial.actions.length} 项任务</em>
          ${
            index === state.selectedTrial
              ? `<div class="academy-card-expand">
                  <strong>未完成任务</strong>
                  ${
                    unfinishedActions.length
                      ? unfinishedActions.map((action) => `<span>${action.label} · +${action.score}</span>`).join("")
                      : "<span>本学院任务已完成，等待点亮城堡。</span>"
                  }
                </div>`
              : ""
          }
        </button>
      `;
    })
    .join("");

  academyListEl.querySelectorAll("[data-panel-trial]").forEach((button) => {
    button.addEventListener("click", () => {
      closeCastlePopup();
      selectTrial(Number(button.dataset.panelTrial));
    });
  });

  document.querySelector("[data-selected-title]").textContent = selected.castle;
  document.querySelector("[data-selected-desc]").textContent = selected.panelSubtitle || selected.subtitle;
  document.querySelector("[data-selected-tools]").innerHTML = selected.tools
    .map((tool) => `<span>${tool.name}</span>`)
    .join("");

  const selectedProgress = getAcademyComputedProgress(state.selectedTrial);
  const selectedLocked = !isAcademyUnlocked(state.selectedTrial);
  const selectedStepLocks = academyStepLocks(state.selectedTrial);
  const selectedNext = selected.nextId ? getAcademyById(selected.nextId) : null;
  const routeNext = state.activeRoute?.to < trials.length ? trials[state.activeRoute.to] : null;
  const nextAction = selected.actions.find((_, actionIndex) => !state.completed[state.selectedTrial]?.includes(actionIndex));
  document.querySelector("[data-guide-title]").textContent = selected.name;
  document.querySelector("[data-guide-desc]").textContent = routeNext
    ? `下一站：${routeNext.name}`
    : nextAction
      ? `下一步：${getNextStepText(state.selectedTrial)}`
      : selectedNext
        ? `下一站：${selectedNext.name}`
        : "全部学院已解锁 / 可进入终极试炼";
  document.querySelector("[data-stage-score]").textContent = String(selectedScore);
  document.querySelector("[data-stage-progress]").style.width = `${Math.min(selectedScore / 20, 1) * 100}%`;

  learningEntryListEl.innerHTML = [
    { label: "课程", action: "课程", data: selectedProgress.courses, locked: selectedStepLocks.courses },
    { label: "作业", action: selectedStepLocks.homework ? "课程后开放" : "作业", data: selectedProgress.homework, locked: selectedStepLocks.homework },
    { label: "考试", action: selectedStepLocks.exam ? "作业后开放" : "考试", data: selectedProgress.exam, locked: selectedStepLocks.exam },
  ]
    .map(
      (entry) => `
        <div class="learning-entry">
          <span>${entry.label}<b>${entry.data.completed}/${entry.data.total}</b></span>
          <button type="button" data-entry-route="${entry.data.url}" ${entry.locked ? "disabled" : ""}>${entry.action}</button>
        </div>
      `,
    )
    .join("");
  learningEntryListEl.querySelectorAll("[data-entry-route]").forEach((button) => {
    button.addEventListener("click", () => navigateTo(button.dataset.entryRoute));
  });

  document.querySelector("[data-next-tasks]").innerHTML = nextAction
    ? `<div class="check-item todo"><span class="check-dot">·</span><span>建议：${nextAction.detail}</span></div>`
    : `<div class="check-item done"><span class="check-dot">✓</span><span>本院任务已完成，可以点亮城堡。</span></div>`;

  document.querySelector("[data-score-actions]").innerHTML = renderScoreActions(state.selectedTrial);
  bindScoreActionButtons(document.querySelector("[data-score-actions]"));

  const enterCurrentButton = document.querySelector("[data-enter-current]");
  enterCurrentButton.disabled = selectedLocked;
  enterCurrentButton.textContent = selectedLocked ? "尚未解锁" : "进入学院";
}

function renderScoreActions(trialIndex) {
  const locked = !isAcademyUnlocked(trialIndex);
  return trials[trialIndex].actions
    .map((action, actionIndex) => {
      const done = state.completed[trialIndex]?.includes(actionIndex);
      return `
        <button class="score-action ${done ? "is-done" : ""}" type="button" data-score-action="${actionIndex}" ${done || locked ? "disabled" : ""}>
          <span>${done ? "已完成" : action.label}</span>
          <strong>+${action.score}</strong>
        </button>
      `;
    })
    .join("");
}

function bindScoreActionButtons(container) {
  container.querySelectorAll("[data-score-action]").forEach((button) => {
    button.addEventListener("click", () => completeScoreTask(state.selectedTrial, Number(button.dataset.scoreAction)));
  });
}

function openTrial(index) {
  selectTrial(index, { popup: true });
}

function completeScoreTask(trialIndex, actionIndex) {
  if (state.completed[trialIndex]?.includes(actionIndex)) return;

  const beforeLevelIndex = getLevelIndex();
  state.completed[trialIndex] = [...(state.completed[trialIndex] || []), actionIndex].sort((a, b) => a - b);
  state.selectedTrial = trialIndex;
  const afterLevelIndex = getLevelIndex();
  const shouldLight = canLightCastle(trialIndex);
  saveState();
  render();

  if (modal.open) {
    modal.close();
  }

  if (afterLevelIndex > beforeLevelIndex) {
    pendingLightIndex = shouldLight ? trialIndex : null;
    showLevelModal(afterLevelIndex, trialIndex);
    return;
  }

  if (shouldLight) {
    lightCastle(trialIndex);
    return;
  }

  if (getTrialScore(trialIndex) >= 20 && !state.lit.includes(trialIndex)) {
    showReadyToLightModal(trialIndex);
  }
}

function showLevelModal(levelIndex, trialIndex) {
  const level = levelDefs[levelIndex];
  state.lastLevelIndex = levelIndex;
  saveState();
  setArtifactIcon(document.querySelector("[data-level-icon]"), level.icon);
  document.querySelector("[data-level-modal-title]").textContent = `称号更新：${level.title}`;
  document.querySelector("[data-level-modal-copy]").textContent =
    `尊敬的${level.title}·${state.profile?.name || "小魔法师"}，你的累计魔能已达到 ${level.min}。你获得了「${artifactName(levelIndex)}」，学院头像图标已同步更新。${pendingLightIndex === trialIndex ? `关闭提示后，法杖会自动点亮「${trials[trialIndex].castle}」。` : ""}`;
  levelModal.showModal();
}

function showReadyToLightModal(trialIndex) {
  setArtifactIcon(document.querySelector("[data-level-icon]"), getLevel().icon);
  document.querySelector("[data-level-modal-title]").textContent = `${trials[trialIndex].castle}已满20分`;
  document.querySelector("[data-level-modal-copy]").textContent =
    `尊敬的${getLevel().title}·${state.profile?.name || "小魔法师"}，你已经拿满本城堡20魔能。请回到地图，手动用法杖点亮魔法球。`;
  levelModal.showModal();
}

function playWand(index) {
  const target = castleButtons[index].querySelector(".magic-orb").getBoundingClientRect();
  const stage = mapStage.getBoundingClientRect();
  wand.style.left = `${target.left - stage.left + target.width / 2 - 85}px`;
  wand.style.top = `${target.top - stage.top + target.height / 2 - 85}px`;
  wand.classList.remove("play");
  void wand.offsetWidth;
  wand.classList.add("play");
}

function triggerCastleBurst(index) {
  const castle = castleButtons[index];
  castle.classList.remove("is-bursting");
  void castle.offsetWidth;
  castle.classList.add("is-bursting");
  window.setTimeout(() => castle.classList.remove("is-bursting"), 900);
}

function lightCastle(index) {
  if (!canLightCastle(index)) return;

  state.lit.push(index);
  state.lit.sort((a, b) => a - b);
  state.selectedTrial = Math.min(index + 1, trials.length - 1);
  state.activeRoute = index < trials.length - 1 ? { from: index, to: index + 1 } : null;
  saveState();
  if (modal.open) modal.close();
  if (levelModal.open) levelModal.close();
  closeCastlePopup();
  render();
  flashRoute();
  playWand(index);
  triggerCastleBurst(index);
  window.setTimeout(() => showRewardModal(index), 520);
}

function showRewardModal(index) {
  const allLit = state.lit.length === trials.length;
  document.querySelector("[data-reward-title]").textContent = `${trials[index].castle}已点亮`;
  document.querySelector("[data-reward-copy]").textContent = allLit
    ? "五座城堡已全部点亮。接下来进入结业排行与终极奖励阶段，魔能排名前2名可获得学费减半。"
    : "每点亮一座城堡都会保留一次学院惊喜奖励机会。最终全部点亮5座城堡后，魔能排名前2名可获得学费减半终极大奖。";
  rewardModal.showModal();
}

function setAuthMode(mode) {
  authMode = mode;
  const isLogin = mode === "login";
  if (authEyebrowEl) authEyebrowEl.textContent = isLogin ? "Login" : "First Login";
  if (authTitleEl) authTitleEl.textContent = isLogin ? "登录" : "入院登记";
  if (authCopyEl) {
    authCopyEl.textContent = isLogin
      ? "请输入入院登记时使用的昵称和 6 位数字密码，登录后会恢复你的学习数据。"
      : "第一次入院登记就是注册。请填全信息并设置 6 位数字密码，之后用昵称和密码登录。";
  }
  setAuthSubmitting(false);
  if (authSwitchEl) authSwitchEl.textContent = isLogin ? "还没有账号，去入院登记" : "已有账号，去登录";
  onboardingForm.querySelectorAll("[data-register-field]").forEach((field) => {
    field.closest("label").hidden = isLogin;
    field.required = !isLogin;
  });
  if (authMessageEl) {
    authMessageEl.hidden = true;
    authMessageEl.textContent = "";
  }
  const nameInput = onboardingForm.elements.name;
  if (nameInput && isLogin && localStorage.getItem(AUTH_NAME_KEY)) {
    nameInput.value = localStorage.getItem(AUTH_NAME_KEY);
  }
}

function showAuthMessage(message) {
  if (!authMessageEl) return;
  authMessageEl.textContent = message;
  authMessageEl.hidden = false;
}

function clearAuthMessage() {
  if (!authMessageEl) return;
  authMessageEl.hidden = true;
  authMessageEl.textContent = "";
}

function setAuthSubmitting(isSubmitting) {
  authSubmitting = isSubmitting;
  if (!authSubmitEl) return;
  authSubmitEl.disabled = isSubmitting;
  authSubmitEl.textContent = isSubmitting
    ? authMode === "login"
      ? "登录中..."
      : "登记中..."
    : authMode === "login"
      ? "登录"
      : "完成登记，领取魔杖";
}

function storeLogin(user, password) {
  currentUser = user;
  sessionStorage.setItem(USER_STORAGE_KEY, user.id);
  localStorage.setItem(AUTH_NAME_KEY, user.name || "");
  sessionStorage.setItem(AUTH_PASSWORD_KEY, password);
  renderUserControls();
}

function applyRegisteredProfile(user, formData) {
  state.profile = {
    name: user.name || String(formData.get("name") || "").trim(),
    zodiac: user.zodiac || String(formData.get("zodiac") || "").trim(),
    project: user.project || String(formData.get("project") || "").trim(),
    tools: user.tools || String(formData.get("tools") || "").trim(),
    id: user.id,
  };
}

async function completeOnboarding(formData) {
  if (authSubmitting) return;
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const zodiac = String(formData.get("zodiac") || "").trim();
  const project = String(formData.get("project") || "").trim();
  const tools = String(formData.get("tools") || "").trim();
  clearAuthMessage();
  if (!name || !password || (authMode === "register" && (!zodiac || !project || !tools))) {
    showAuthMessage("请填全信息后再完成登记，领取魔杖。");
    return;
  }
  if (!/^[0-9]{6}$/.test(password)) {
    showAuthMessage("密码必须是 6 位数字。");
    return;
  }

  const endpoint = authMode === "login" ? "/api/login" : "/api/register";
  let result;
  setAuthSubmitting(true);
  try {
    result = await apiRequest(endpoint, {
      method: "POST",
      headers: { "X-Access-Code": password },
      body: JSON.stringify({ name, password, zodiac, project, tools }),
    });
  } catch (error) {
    showAuthMessage(error.message || "操作失败，请稍后再试。");
    return;
  } finally {
    setAuthSubmitting(false);
  }
  if (!result?.user) {
    showAuthMessage("登录服务没有返回账号信息，请刷新页面后重试。");
    return;
  }

  if (authMode === "register") {
    currentUser = null;
    sessionStorage.removeItem(USER_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_PASSWORD_KEY);
    localStorage.setItem(AUTH_NAME_KEY, result.user.name || name);
    applyRegisteredProfile(result.user, formData);
    state.lit = [];
    state.selectedTrial = 0;
    state.activeRoute = null;
    state.popupAcademyId = null;
    state.completed = trials.map(() => []);
    state.lastLevelIndex = 0;
  } else {
    storeLogin(result.user, password);
    applyRegisteredProfile(result.user, formData);
    applyRemoteProgress(result.progress);
  }
  saveState();
  render();
  onboardingModal.close();
  if (authMode === "register") {
    setAuthMode("login");
    renderUserControls();
    showRitualModal(0);
  }
}

function resetEnrollmentDemo() {
  // 只清除当前设备用户相关的 localStorage
  const prefix = `${getDeviceUserId()}_`;
  const keysToRemove = [];
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key === STORAGE_KEY || key === USER_STORAGE_KEY || key === AUTH_PASSWORD_KEY || key === AUTH_NAME_KEY || key.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
  sessionStorage.removeItem(USER_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_PASSWORD_KEY);

  // 重置内存中的 state
  Object.assign(state, {
    profile: null,
    lit: [],
    selectedTrial: 0,
    activeRoute: null,
    popupAcademyId: null,
    completed: trials.map(() => []),
    lastLevelIndex: 0,
  });
  saveState();
  closeCastlePopup();
  currentUser = null;

  // 关闭所有弹框
  [
    modal,
    onboardingModal,
    levelModal,
    rewardModal,
    feedbackModal,
    guideModal,
    certificateModal,
    ritualModal,
    lessonCompletionModal,
  ].forEach((dialog) => {
    if (dialog?.open) dialog.close();
  });
}

function confirmReenroll() {
  if (currentUser) return;
  setAuthMode(localStorage.getItem(AUTH_NAME_KEY) ? "login" : "register");
  const nameInput = onboardingForm.elements.name;
  if (nameInput && localStorage.getItem(AUTH_NAME_KEY)) nameInput.value = localStorage.getItem(AUTH_NAME_KEY);
  onboardingModal.showModal();
}

function requireLogin() {
  if (currentUser || isAdminPath) return false;
  setAuthMode(localStorage.getItem(AUTH_NAME_KEY) ? "login" : "register");
  onboardingModal.showModal();
  return true;
}

function ritualPages() {
  const name = state.profile?.name || "小魔法师";
  return [
    {
      icon: "wand",
      title: "领取魔法杖",
      copy: `尊敬的见习魔法师·${name}，第一课学习已完成。学院授予你第一件魔法道具：魔法杖。`,
      body: `<ul class="ritual-list"><li>魔法杖用于点亮城堡魔法球。</li><li>每座城堡满20魔能后，需要你亲手点击点亮。</li><li>从这一刻开始，魔能将进入学院排名。</li></ul>`,
    },
    {
      icon: "wand",
      title: "称号与魔能已初始化",
      copy: "你已成为见习魔法师，初始魔能为0。后续每完成直播、作业、考试都会增加魔能。",
      body: `<table class="ritual-table"><tr><th>项目</th><th>当前状态</th></tr><tr><td>学院称号</td><td>见习魔法师</td></tr><tr><td>初始魔能</td><td>0</td></tr><tr><td>学院编号</td><td>${state.profile?.id || "JMA-2026-042"}</td></tr></table>`,
    },
    {
      icon: "book",
      title: "下一阶段任务",
      copy: "第一座城堡是咒语学院。你可以先拿分，也可以点击其他城堡预览后续课程。",
      body: `<ul class="ritual-list"><li>参加直播课：${trials[0].liveTime}，可获得5魔能。</li><li>完成作业：提交提示词与工具实操截图，可获得10魔能。</li><li>通过考试：完成 AI 对话能力小测，可获得5魔能。</li></ul>`,
    },
    {
      icon: "orb",
      title: "点亮条件总览",
      copy: "单座城堡拿满20分，即可手动点亮。没点亮城堡不影响继续累计魔能和学习下一阶段。",
      body: `<table class="ritual-table"><tr><th>任务</th><th>魔能</th></tr><tr><td>参加直播课</td><td>5</td></tr><tr><td>完成作业</td><td>10</td></tr><tr><td>通过考试</td><td>5</td></tr><tr><td>点亮条件</td><td>满20分</td></tr></table>`,
    },
  ];
}

function showRitualModal(page) {
  ritualPage = page;
  const pages = ritualPages();
  const current = pages[ritualPage];
  setArtifactIcon(document.querySelector("[data-ritual-icon]"), current.icon);
  document.querySelector("[data-ritual-step]").textContent = `Enrollment Ritual ${ritualPage + 1}/${pages.length}`;
  document.querySelector("[data-ritual-title]").textContent = current.title;
  document.querySelector("[data-ritual-copy]").textContent = current.copy;
  document.querySelector("[data-ritual-body]").innerHTML = current.body;
  document.querySelector("[data-ritual-prev]").disabled = ritualPage === 0;
  document.querySelector("[data-ritual-next]").textContent = ritualPage === pages.length - 1 ? "完成入院仪式" : "继续";
  if (!ritualModal.open) ritualModal.showModal();
}

castleButtons.forEach((button, index) => {
  button.addEventListener("click", () => openTrial(index));
});

document.querySelector("[data-checkin]").addEventListener("click", () => lightCastle(state.selectedTrial));
document.querySelector("[data-close-popup]").addEventListener("click", closeCastlePopup);
popupEnterButton.addEventListener("click", () => {
  const index = getAcademyIndexById(state.popupAcademyId) >= 0 ? getAcademyIndexById(state.popupAcademyId) : state.selectedTrial;
  if (!isAcademyUnlocked(index)) return;
  navigateTo(trials[index].entranceUrl);
});
document.querySelector("[data-enter-current]").addEventListener("click", () => {
  if (!isAcademyUnlocked(state.selectedTrial)) return;
  navigateTo(trials[state.selectedTrial].entranceUrl);
});
popupCourseButton.addEventListener("click", () => {
  const index = getAcademyIndexById(state.popupAcademyId) >= 0 ? getAcademyIndexById(state.popupAcademyId) : state.selectedTrial;
  if (!isAcademyUnlocked(index)) return;
  navigateTo(trials[index].progress.courses.url);
});
popupHomeworkButton.addEventListener("click", () => {
  const index = getAcademyIndexById(state.popupAcademyId) >= 0 ? getAcademyIndexById(state.popupAcademyId) : state.selectedTrial;
  if (!isAcademyUnlocked(index) || academyStepLocks(index).homework) return;
  navigateTo(trials[index].progress.homework.url);
});
popupExamButton.addEventListener("click", () => {
  const index = getAcademyIndexById(state.popupAcademyId) >= 0 ? getAcademyIndexById(state.popupAcademyId) : state.selectedTrial;
  if (!isAcademyUnlocked(index)) return;
  if (index !== 1 && academyStepLocks(index).exam) return;
  navigateTo(trials[index].progress.exam.url);
});

mapStage.addEventListener("click", (event) => {
  if (event.target.closest("[data-trial]") || event.target.closest("[data-castle-popup]")) return;
  closeCastlePopup();
});

onboardingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  completeOnboarding(new FormData(onboardingForm));
});

authSubmitEl?.addEventListener("click", (event) => {
  event.preventDefault();
  completeOnboarding(new FormData(onboardingForm));
});

document.querySelector("[data-ritual-prev]").addEventListener("click", () => showRitualModal(Math.max(ritualPage - 1, 0)));
document.querySelector("[data-ritual-next]").addEventListener("click", () => {
  const lastPage = ritualPages().length - 1;
  if (ritualPage >= lastPage) {
    ritualModal.close();
    return;
  }
  showRitualModal(ritualPage + 1);
});

document.querySelector("[data-reset]")?.addEventListener("click", (event) => {
  if (!event.altKey) {
    certificateModal.showModal();
    return;
  }

  state.lit = [];
  state.selectedTrial = 0;
  state.activeRoute = null;
  state.popupAcademyId = null;
  state.completed = trials.map(() => []);
  state.lastLevelIndex = 0;
  saveState();
  render();
  closeCastlePopup();
});

document.querySelector("[data-restart]")?.addEventListener("click", () => {
  closeCastlePopup();
  onboardingModal.showModal();
});

document.querySelectorAll("[data-reenroll]").forEach((button) => {
  button.addEventListener("click", confirmReenroll);
});

onboardingForm.addEventListener("click", (event) => {
  if (!event.target.closest("[data-auth-switch]")) return;
  event.preventDefault();
  setAuthMode(authMode === "login" ? "register" : "login");
  onboardingForm.elements.name?.focus();
});

document.querySelectorAll("[data-user-switch]").forEach((select) => {
  select.addEventListener("change", () => {
    localStorage.setItem(USER_STORAGE_KEY, select.value);
    const cleanPath = currentPath === "/" ? "/" : currentPath;
    goTo(cleanPath);
  });
});

document.querySelectorAll("[data-admin-link]").forEach((button) => {
  button.addEventListener("click", () => {
    goTo("/admin");
  });
});

document.querySelector("[data-admin-back]")?.addEventListener("click", () => {
  goTo("/");
});

document.querySelectorAll("[data-admin-route]").forEach((button) => {
  button.addEventListener("click", () => {
    goTo(button.dataset.adminRoute);
  });
});

document.querySelector("[data-close]").addEventListener("click", () => modal.close());
document.querySelector("[data-close-level]").addEventListener("click", () => {
  const index = pendingLightIndex;
  pendingLightIndex = null;
  levelModal.close();
  if (index !== null && canLightCastle(index)) {
    lightCastle(index);
  }
});
document.querySelector("[data-close-reward]").addEventListener("click", () => rewardModal.close());
document.querySelector("[data-open-feedback]").addEventListener("click", () => feedbackModal.showModal());
document.querySelectorAll("[data-close-feedback]").forEach((button) => {
  button.addEventListener("click", () => feedbackModal.close());
});
document.querySelector("[data-open-guide]")?.addEventListener("click", () => guideModal?.showModal());
document.querySelectorAll("[data-close-guide]").forEach((button) => {
  button.addEventListener("click", () => guideModal?.close());
});
document.querySelector("[data-submit-feedback]").addEventListener("click", async () => {
  const input = document.querySelector("[data-feedback-input]");
  const content = input?.value?.trim();
  if (!content) { showLessonToast("请先填写留言内容。"); return; }
  try {
    await apiRequest("/api/feedback", { method: "POST", body: JSON.stringify({ content }) });
    input.value = "";
    feedbackModal.close();
    showLessonToast("魔法信笺已发送，院长会尽快查看！");
  } catch {
    showLessonToast("发送失败，请稍后重试。");
  }
});
document.querySelector("[data-open-certificate]").addEventListener("click", () => certificateModal.showModal());
document.querySelector("[data-close-certificate]").addEventListener("click", () => certificateModal.close());

function initMagicCursor() {}

bindLessonPage();
syncMapStateFromAcademyStorage();
initMagicCursor();

async function startApp() {
  if (isCircleLessonPath || isLegionLessonPath) showLessonPage();

  await loadCurrentUser();
  if (currentUser && !isAdminPath) await restoreRemoteProgress();
  render();

  if (isAdminPath) {
    await showAdminPage();
  } else if (isLessonPath) {
    showLessonPage();
  } else {
    showMapPage();
  }

  if (!isAdminPath && (!currentUser || !state.profile)) {
    requestAnimationFrame(() => requireLogin());
  }
}

startApp();
