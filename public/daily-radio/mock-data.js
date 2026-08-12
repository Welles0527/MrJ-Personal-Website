"use strict";

window.DAILY_RADIO_DATA = (() => {
  const channels = [
    { id: "finance", name: "财经", icon: "chart", hint: "宏观、市场与政策脉络" },
    { id: "stocks", name: "个股", icon: "trend", hint: "你的 A 股自选与持仓" },
    { id: "ai", name: "AI", icon: "bot", hint: "模型、产品与产业进展" },
    { id: "faith", name: "信仰", icon: "cross", hint: "经文、默想与信仰生活" },
    { id: "sports", name: "赛事", icon: "trophy", hint: "焦点赛程与关键结果" }
  ];

  const briefings = [
    {
      id: "finance-1",
      channel: "finance",
      updatedAt: "07:30",
      title: "市场静待关键数据，资金延续谨慎定价",
      summary: "主要指数维持窄幅整理，交易关注点从情绪修复转向盈利兑现。",
      duration: "03:20",
      durationSeconds: 200,
      source: "公开市场信息汇编",
      importance: "重要",
      transcript: "早上好。今天的财经晨报先看市场节奏。主要指数维持窄幅整理，资金正在等待新的经济数据与企业盈利信号。短期交易更重视业绩兑现和现金流质量。以上内容为演示数据，不构成任何投资建议。"
    },
    {
      id: "finance-2",
      channel: "finance",
      updatedAt: "07:18",
      title: "长端利率波动收窄，避险资产出现分化",
      summary: "跨市场波动有所降温，但资产之间的风险偏好仍未完全同步。",
      duration: "02:45",
      durationSeconds: 165,
      source: "全球市场公开信息",
      importance: "关注",
      transcript: "第二条财经简讯关注利率与避险资产。长端利率波动收窄，黄金与主要货币的表现出现分化。观察重点仍是通胀预期和流动性变化。本条为演示内容。"
    },
    {
      id: "finance-3",
      channel: "finance",
      updatedAt: "06:55",
      title: "产业政策聚焦长期供给质量",
      summary: "政策信号更强调技术投入、产能效率与可持续的需求扩张。",
      duration: "02:18",
      durationSeconds: 138,
      source: "政策公开资料整理",
      importance: "一般",
      transcript: "今天的政策观察聚焦供给质量。公开信息显示，政策讨论更强调技术投入、产能效率和可持续需求。本条为演示内容。"
    },
    {
      id: "stocks-1",
      channel: "stocks",
      updatedAt: "07:26",
      title: "自选股进入业绩验证窗口",
      summary: "关注收入质量、毛利率变化与管理层对下阶段需求的判断。",
      duration: "04:10",
      durationSeconds: 250,
      source: "上市公司公开资料",
      importance: "重要",
      transcript: "你的自选股正在进入业绩验证窗口。今天建议优先核对收入质量、毛利率变化以及管理层对下阶段需求的判断。页面展示为模拟数据，不代表真实股票状态。"
    },
    {
      id: "stocks-2",
      channel: "stocks",
      updatedAt: "07:05",
      title: "持仓观察：量价配合仍需确认",
      summary: "价格修复已经出现，但成交结构尚不足以确认趋势延续。",
      duration: "03:05",
      durationSeconds: 185,
      source: "演示行情分析",
      importance: "关注",
      transcript: "持仓观察提示，价格修复已经出现，但成交结构仍需确认。请结合自己的研究框架判断，本条为演示数据，不构成投资建议。"
    },
    {
      id: "stocks-3",
      channel: "stocks",
      updatedAt: "06:48",
      title: "公告速览：留意现金流与资本开支",
      summary: "比起单一利润数字，更值得核对经营现金流与扩产节奏是否匹配。",
      duration: "02:36",
      durationSeconds: 156,
      source: "公司公告演示摘要",
      importance: "一般",
      transcript: "公告速览提醒你留意经营现金流与资本开支。单一利润数字之外，现金回收和扩产节奏同样重要。本条为演示内容。"
    },
    {
      id: "ai-1",
      channel: "ai",
      updatedAt: "07:22",
      title: "端侧 AI 加速进入日常工作流",
      summary: "新一轮产品更新更强调本地推理、隐私保护与低延迟协作。",
      duration: "03:42",
      durationSeconds: 222,
      source: "科技公司公开动态",
      importance: "重要",
      transcript: "AI 简讯关注端侧能力。近期产品方向更加重视本地推理、隐私保护和低延迟协作。真正的竞争焦点正在从模型参数走向用户每天是否愿意使用。本条为演示内容。"
    },
    {
      id: "ai-2",
      channel: "ai",
      updatedAt: "06:50",
      title: "企业采用 AI 的衡量方式趋于务实",
      summary: "团队开始从试用数量转向节省时间、质量稳定性与可审计性。",
      duration: "02:54",
      durationSeconds: 174,
      source: "行业公开报告",
      importance: "关注",
      transcript: "企业采用 AI 的衡量方式正在变得务实。节省多少时间、质量是否稳定、结果能否审计，比简单的试用人数更重要。本条为演示内容。"
    },
    {
      id: "faith-1",
      channel: "faith",
      updatedAt: "06:30",
      title: "今日默想：在安静中重新辨认方向",
      summary: "把未完成的焦虑暂时放下，为真正重要的事情留出安静。",
      duration: "04:05",
      durationSeconds: 245,
      source: "每日灵修演示内容",
      importance: "今日",
      transcript: "今天的默想邀请你在安静中重新辨认方向。先把未完成的焦虑放下几分钟，诚实地看见自己的有限，也为真正重要的人和事留出空间。"
    },
    {
      id: "faith-2",
      channel: "faith",
      updatedAt: "06:15",
      title: "经文提示：用温柔回应匆忙",
      summary: "在快节奏的一天里，选择先倾听，再表达自己的判断。",
      duration: "02:28",
      durationSeconds: 148,
      source: "经文主题整理",
      importance: "一般",
      transcript: "今天可以练习用温柔回应匆忙。在给出判断之前先倾听，在行动之前先辨认动机，让节奏服务于真正重要的目标。"
    },
    {
      id: "sports-1",
      channel: "sports",
      updatedAt: "07:12",
      title: "焦点赛事进入阵容与节奏博弈",
      summary: "临场轮换和体能分配，可能比纸面实力更早改变比赛走势。",
      duration: "03:16",
      durationSeconds: 196,
      source: "赛事公开信息整理",
      importance: "关注",
      transcript: "赛事简讯关注阵容和节奏博弈。临场轮换与体能分配可能比纸面实力更早改变走势。请在正式开赛前再次核对阵容信息。本条为演示内容。"
    },
    {
      id: "sports-2",
      channel: "sports",
      updatedAt: "06:42",
      title: "今日赛程：三场关键对决值得留意",
      summary: "晚间焦点集中，建议提前设置提醒，避免错过开场阶段。",
      duration: "02:12",
      durationSeconds: 132,
      source: "演示赛程资料",
      importance: "一般",
      transcript: "今天晚间有三场关键对决值得留意。建议提前设置提醒，并在开赛前查看最新时间和阵容。本页面使用演示赛程。"
    }
  ];

  const replaceChannel = (items, channel, anchorId, generated) => generated.length
    ? items.flatMap(item => item.id === anchorId ? generated : item.channel === channel ? [] : [item])
    : items;
  const liveFinanceBriefings = Array.isArray(window.DAILY_RADIO_FINANCE_NEWS?.briefings)
    ? window.DAILY_RADIO_FINANCE_NEWS.briefings
    : [];
  const liveAiBriefings = Array.isArray(window.DAILY_RADIO_AI_NEWS?.briefings)
    ? window.DAILY_RADIO_AI_NEWS.briefings
    : [];
  const liveStockBriefings = Array.isArray(window.DAILY_RADIO_STOCK_NEWS?.briefings)
    ? window.DAILY_RADIO_STOCK_NEWS.briefings
    : [];
  const resolvedBriefings = replaceChannel(
    replaceChannel(briefings, "finance", "finance-1", liveFinanceBriefings),
    "ai",
    "ai-1",
    liveAiBriefings
  );

  return {
    channels,
    briefings: replaceChannel(resolvedBriefings, "stocks", "stocks-1", liveStockBriefings),
    financeNewsMeta: window.DAILY_RADIO_FINANCE_NEWS || null,
    aiNewsMeta: window.DAILY_RADIO_AI_NEWS || null,
    stockNewsMeta: window.DAILY_RADIO_STOCK_NEWS || null,
    stockSuggestions: [
      { code: "600519", name: "贵州茅台" },
      { code: "300750", name: "宁德时代" },
      { code: "601318", name: "中国平安" },
      { code: "000858", name: "五粮液" }
    ]
  };
})();
