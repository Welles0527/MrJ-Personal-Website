export type Detail = {
  slug: string;
  title: string;
  tags: string[];
  summary?: string;
  status?: 'ready' | 'draft';
};

export type CategoryFilter = {
  slug: string;
  title: string;
};

export type Category = {
  slug: string;
  title: string;
  details: Detail[];
  filters?: CategoryFilter[];
};

export type Theme = {
  slug: string;
  shortLabel: string;
  title: string;
  color: 'clay' | 'olive' | 'sky' | 'violet' | 'amber' | 'stone';
  description: string;
  image: string;
  categories: Category[];
};

const detail = (slug: string, title: string, tags: string[], summary?: string): Detail => ({
  slug,
  title,
  tags,
  summary,
  status: 'draft'
});

export const themes: Theme[] = [
  {
    slug: 'knowledge',
    shortLabel: '知识',
    title: 'AI知识库',
    color: 'olive',
    description: '梳理概念、方法与命令，建立可复用的 AI 基础知识体系。',
    image: '/images/topic-knowledge.png',
    categories: [
      {
        slug: 'terms',
        title: 'AI术语',
        details: [],
        filters: [
          { slug: 'ai-llm', title: 'AI 与大模型' },
          { slug: 'network-software', title: '网络与软件' },
          { slug: 'vibe-coding', title: 'Vibe Coding' },
          { slug: 'third-party', title: '第三方服务' }
        ]
      },
      { slug: 'prompts', title: '提示词 Prompt', details: [detail('project-prompts', '按项目分类', ['提示词', '项目']), detail('golden-rules', '黄金编写法则', ['提示词', '方法']), detail('socratic-method', '苏格拉底提问法等高级手段', ['提示词', '进阶'])] },
      { slug: 'cli', title: 'CLI命令', details: [detail('cli-guide', 'CLI命令大全', ['CLI', '工具'])] },
      { slug: 'timeline', title: 'AI大事记', details: [detail('milestones', '重要节点整理', ['趋势', '历史'])] }
    ]
  },
  {
    slug: 'tools',
    shortLabel: '工具',
    title: 'AI实用工具',
    color: 'clay',
    description: '筛选并记录真正提升学习、创作和交付效率的实用工具。',
    image: '/images/topic-tools.png',
    categories: [
      { slug: 'llm', title: '大模型 LLM', details: [detail('model-guide', '模型选择与使用记录', ['大模型', '入门'])] },
      { slug: 'skills-mcp', title: 'Skills / MCP', details: [detail('skills-mcp-directory', 'Skills / MCP大全', ['MCP', '工具'])] },
      { slug: 'agents', title: '智能体 Agents', details: [detail('domestic-agents', '国内', ['智能体', '国内']), detail('global-agents', '国外', ['智能体', '国外'])] },
      { slug: 'professional-tools', title: '专业工具 / 网站', details: [detail('image-tools', '文生图工具', ['图像', '创作']), detail('audio-tools', '音频工具', ['音频', '创作']), detail('video-tools', '文生视频工具', ['视频', '创作']), detail('web-tools', '网页 / 小程序', ['网页', '开发'])] }
    ]
  },
  {
    slug: 'build',
    shortLabel: '搭建',
    title: 'AI项目搭建',
    color: 'violet',
    description: '把 AI 想法落成项目，沉淀配置、流程与持续交付的方法。',
    image: '/images/topic-build.png',
    categories: [
      { slug: 'vibe-coding', title: 'Vibe Coding', details: [detail('definition', '定义', ['Vibe Coding', '方法']), detail('stages', '1.0野生 / 2.0受控 / 3.0工程化 / 4.0商业化', ['Vibe Coding', '阶段']), detail('launch-flow', '产品发布流程', ['发布', '流程']), detail('complex-projects', '复杂项目配置', ['工程化', '部署'])] },
      { slug: 'opc', title: 'OPC一人公司搭建', details: [detail('md-configuration', 'md配置', ['配置', '文档']), detail('advanced-tools', '高级工具', ['工具', '进阶'])] },
      { slug: 'platform-connect', title: '控制平台连接', details: [detail('feishu', '飞书', ['连接', '飞书']), detail('wechat', '微信', ['连接', '微信'])] },
      { slug: 'token-tips', title: '减少Token消耗技巧', details: [detail('rules', '规则约束', ['Token', '规则']), detail('commands', '命令约束', ['Token', '命令']), detail('prompt-constraints', '提示词约束', ['Token', '提示词']), detail('coding-plan', 'Coding Plan选择', ['Token', '规划'])] }
    ]
  },
  {
    slug: 'applications',
    shortLabel: '应用',
    title: 'AI个人应用',
    color: 'clay',
    description: '记录个人可直接使用的 AI 网页、小插件、课件和灵感案例。',
    image: '/images/topic-applications.png',
    categories: [
      { slug: 'original-applications', title: '自创应用', details: [detail('web-pages', '网页', ['应用', '网页']), detail('mini-plugins', '小插件', ['应用', '工具']), detail('courseware', '课件', ['应用', '教学'])] },
      { slug: 'inspiration-station', title: 'AI灵感站', details: [detail('theology', '神学', ['灵感', '神学']), detail('office', '办公', ['灵感', '办公']), detail('scenes', '场景应用', ['灵感', '场景']), detail('investment', '投资', ['灵感', '投资']), detail('celebrity', '名人', ['灵感', '人物']), detail('fun', '趣味', ['灵感', '趣味'])] },
      { slug: 'recommended-applications', title: '推荐应用', details: [detail('utilities', '小工具', ['推荐', '工具'])] }
    ]
  },
  {
    slug: 'courses',
    shortLabel: '课程',
    title: 'AI课程学习',
    color: 'olive',
    description: '把自学材料整理为可跟随、可复盘的课程路径与视频入口。',
    image: '/images/topic-courses.png',
    categories: [
      { slug: 'expert-videos', title: '大神视频', details: [detail('yao-shunyu', '姚顺宇采访视频', ['视频', '访谈']), detail('karpathy', 'Karpathy大神视频', ['视频', '学习'])] },
      { slug: 'academy', title: '课程介绍', details: [detail('academy-intro', 'J先生魔法学院课程介绍', ['课程', '介绍'])] },
      { slug: 'catalog', title: '课程目录', details: [detail('foundation', '基础理论课程', ['课程', '基础']), detail('tool-usage', 'AI工具使用', ['课程', '工具']), detail('local-agent', 'AI Agent智能体（本地）', ['课程', '智能体']), detail('one-person-company', 'AI一人公司搭建', ['课程', '项目']), detail('vibe-coding-course', 'Vibe Coding', ['课程', '开发']), detail('ai-investing', 'AI投资理财', ['课程', '投资'])] },
      { slug: 'mindmaps', title: '课程脑图', details: [detail('course-mindmap', '课程脑图', ['课程', '脑图'])] },
      { slug: 'videos', title: '课程视频', details: [detail('video-channel', '视频号课程入口', ['课程', '视频'])] }
    ]
  },
  {
    slug: 'space',
    shortLabel: '空间',
    title: '个人空间站',
    color: 'sky',
    description: '公开记录效率系统、生活运动、投资观察和旅行足迹。',
    image: '/images/topic-space.png',
    categories: [
      { slug: 'planning', title: '日历待办', details: [detail('calendar', '个性化日历创建', ['规划', '日历']), detail('todo', '待办事项功能创建', ['规划', '效率'])] },
      { slug: 'lifestyle', title: '生活运动', details: [detail('snooker', '斯诺克', ['生活', '运动']), detail('football', '足球', ['生活', '运动']), detail('coffee', '咖啡', ['生活', '兴趣']), detail('games', '游戏', ['生活', '兴趣'])] },
      { slug: 'investing', title: '个人投资', details: [detail('funds', '基金', ['投资', '记录']), detail('stocks', '股票', ['投资', '记录'])] },
      { slug: 'travel', title: '旅行记录', details: [detail('travel-map', '旅行地图', ['旅行', '地图']), detail('photo-wall', '照片墙', ['旅行', '照片'])] }
    ]
  }
];

export const getTheme = (slug: string) => themes.find((theme) => theme.slug === slug);

export const getCategory = (theme: Theme, slug: string) => theme.categories.find((category) => category.slug === slug);

export const getDetail = (category: Category, slug: string) => category.details.find((item) => item.slug === slug);

export const categoryPath = (theme: Theme, category: Category) => `/topics/${theme.slug}/${category.slug}`;

export const categoryFilterPath = (theme: Theme, category: Category, filter: CategoryFilter) => `${categoryPath(theme, category)}?group=${filter.slug}`;

export const detailPath = (theme: Theme, category: Category, item: Detail) => category.slug === 'cli' && item.slug === 'cli-guide'
  ? categoryPath(theme, category)
  : `${categoryPath(theme, category)}/${item.slug}`;

export const isInvestment = (theme: Theme, category?: Category) => theme.slug === 'space' && category?.slug === 'investing';
