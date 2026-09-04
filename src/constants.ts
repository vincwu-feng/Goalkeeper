import type { GoalType, NodeDisplay, ToolRecommendation, WaitingPreview } from './types';

export const GOAL_META: Record<GoalType, { label: string; color: string; icon: string }> = {
  viral: { label: '引流涨粉', color: '#ff6b6b', icon: '📣' },
  marketing: { label: '品牌营销', color: '#4dabf7', icon: '📈' },
  monetize: { label: '商业变现', color: '#be4bdb', icon: '💳' },
  fun: { label: '轻松自玩', color: '#51cf66', icon: '🎮' },
  deliver: { label: '客户交付', color: '#ffa94d', icon: '💼' },
  unknown: { label: '目标待确认', color: '#868e96', icon: '🎯' },
};

export const PROCESS_STEPS = [
  { icon: '🔍', label: '理解需求' },
  { icon: '📐', label: '规划方案' },
  { icon: '💻', label: '生成内容' },
  { icon: '✅', label: '质量校验' },
  { icon: '🚀', label: '交付准备' },
];

export const TOOL_RECS: Record<GoalType, ToolRecommendation[]> = {
  viral: [
    { icon: '🎬', name: '剪映', desc: '游戏录屏自动加字幕' },
    { icon: '📊', name: '抖查查', desc: '查同类游戏热门标签' },
  ],
  marketing: [
    { icon: '📈', name: '友盟+', desc: 'H5 活动数据埋点分析' },
    { icon: '🎨', name: '草料二维码', desc: '活动海报二维码生成' },
  ],
  monetize: [
    { icon: '💳', name: '微信支付沙箱', desc: '验证付费解锁链路' },
    { icon: '🧪', name: '神策数据', desc: '分析付费漏斗与转化' },
  ],
  fun: [
    { icon: '💬', name: '微信分享', desc: '邀请朋友一起来挑战' },
    { icon: '🏆', name: '群排行', desc: '做个排行榜增加复玩' },
  ],
  deliver: [
    { icon: '🎨', name: 'Figma', desc: '视觉稿交付协作' },
    { icon: '📋', name: 'Notion', desc: '项目文档和验收清单' },
  ],
  unknown: [
    { icon: '🧭', name: '目标契约', desc: '先确认目的，再匹配工具' },
    { icon: '🛡️', name: '目标守卫', desc: '改动前检查是否跑偏' },
  ],
};

export const WAITING_PREVIEW: Record<GoalType, WaitingPreview> = {
  viral: {
    headline: '正在为传播速度设计一局即懂的体验',
    strategyPoints: ['单局约 15–20 秒', '首屏埋入强钩子', '结果页触发分享', '不设置付费墙'],
    tips: [
      { icon: '⚡', text: '前 3 秒先让用户看懂玩法，再讲背景。' },
      { icon: '📣', text: '分享提示放在抽中稀有卡的情绪高点。' },
    ],
  },
  marketing: {
    headline: '正在把品牌信息收敛成一条清晰转化路径',
    strategyPoints: ['首屏品牌露出', '3 步内完成 CTA', '预留埋点事件', '减少无关玩法'],
    tips: [
      { icon: '🎯', text: '一个页面只保留一个核心转化目标。' },
      { icon: '📈', text: '按钮文案要说清用户点击后能获得什么。' },
    ],
  },
  monetize: {
    headline: '正在平衡游戏乐趣、付费价值与转化阻力',
    strategyPoints: ['免费体验先建立价值', '付费点出现在高意愿时刻', '价格和权益透明', '保留无付费退路'],
    tips: [
      { icon: '💎', text: '先让用户体验一次完整正反馈，再出现付费点。' },
      { icon: '🧪', text: '付费按钮、取消率与解锁完成率应分别埋点。' },
    ],
  },
  fun: {
    headline: '正在把规则压缩成五秒就能上手的小游戏',
    strategyPoints: ['无需登录', '即时反馈', '结果可重玩', '不强制分享'],
    tips: [
      { icon: '🎲', text: '第一次就能玩懂，比堆很多规则更重要。' },
      { icon: '✨', text: '稀有动画和音效反馈能显著提升抽卡爽感。' },
    ],
  },
  deliver: {
    headline: '正在兼顾演示效果、移动适配与二次修改成本',
    strategyPoints: ['单文件离线运行', '品牌配置集中', '核心区域可编辑', '交付说明完整'],
    tips: [
      { icon: '📦', text: '交付版本应把品牌色、文案和 CTA 集中配置。' },
      { icon: '✅', text: '验收清单需要覆盖交互、移动端与异常状态。' },
    ],
  },
  unknown: {
    headline: '目标确认后，这里会展示即将采用的生成策略',
    strategyPoints: ['目标对齐', '策略匹配', '生成校验', '行动建议'],
    tips: [
      { icon: '🎯', text: '相同功能在不同目标下，可能得到完全不同的判断。' },
      { icon: '🛡️', text: '目标守卫提醒风险，但最终决定权仍在用户。' },
    ],
  },
};

export const AD_RECS: Record<GoalType, { sponsor: string; headline: string; desc: string; cta: string }> = {
  viral: { sponsor: '剪映 · 演示广告位', headline: '录屏后自动生成竖屏字幕', desc: '适合小游戏结果页二创与短视频发布。', cta: '了解模板' },
  marketing: { sponsor: '友盟+ · 演示广告位', headline: '把 H5 转化路径变成可读漏斗', desc: '查看曝光、点击和完成转化的关键节点。', cta: '查看方案' },
  monetize: { sponsor: '支付测试工具 · 演示广告位', headline: '先用沙箱跑通付费解锁', desc: '避免在真实支付接入前反复修改核心链路。', cta: '查看接入' },
  fun: { sponsor: '好友挑战 · 演示广告位', headline: '生成一张可分享的挑战结果卡', desc: '邀请朋友比较手气，让小游戏更有复玩性。', cta: '看看玩法' },
  deliver: { sponsor: '协作空间 · 演示广告位', headline: '把验收与二改问题集中管理', desc: '让客户交付不再散落在聊天记录里。', cta: '查看模板' },
  unknown: { sponsor: 'GoalKeeper · 演示广告位', headline: '广告会跟随目标匹配', desc: '生产环境可接穿山甲或优量汇，此处展示真实布局逻辑。', cta: '了解机制' },
};

export const NODE_DISPLAY: Record<string, NodeDisplay> = {
  '10_V3_PLAN': { label: '体验规划', icon: '🧭', stage: 1, startText: '正在设计本次作品的独立结构与交互', doneText: '体验规划与历史避让策略已完成' },
  '20_V3_CODE': { label: 'React 代码生成', icon: '💻', stage: 2, startText: '正在生成本次作品的真实 React 代码', doneText: '项目源码已生成' },
  '30_V3_COMPILE': { label: '受控编译', icon: '🧱', stage: 2, startText: '正在编译 TypeScript 与 Tailwind', doneText: '源码编译完成' },
  '40_V3_QUALITY': { label: '浏览器验收', icon: '🧪', stage: 3, startText: '正在多尺寸试玩并检测遮挡与裁切', doneText: '交互与布局质量门已通过' },
  '45_V3_REPAIR': { label: '局部修复', icon: '🛠️', stage: 3, startText: '正在根据精确错误局部修复', doneText: '修复后重新验收完成' },
  '45_V3_REPAIR_1': { label: '第一轮局部修复', icon: '🛠️', stage: 3, startText: '首次验收未通过，正在按错误报告局部修复', doneText: '第一轮修复已完成，正在重新验收' },
  '55_V3_REPAIR_2': { label: '第二轮兜底修复', icon: '🛠️', stage: 3, startText: '仍有未通过项，正在执行最后一轮局部修复', doneText: '第二轮修复已完成，正在最终验收' },
  'REPAIR_1': { label: '第一轮局部修复', icon: '🛠️', stage: 3, startText: '首次验收未通过，正在按错误报告局部修复', doneText: '第一轮修复已完成，正在重新验收' },
  'REPAIR_2': { label: '第二轮兜底修复', icon: '🛠️', stage: 3, startText: '仍有未通过项，正在执行最后一轮局部修复', doneText: '第二轮修复已完成，正在最终验收' },
  'CHECK_REPAIR_PROGRESS': { label: '修复去重检查', icon: '🔍', stage: 3, startText: '正在对比两轮失败是否相同', doneText: '修复进度判定完成' },
  '00_START': { label: '任务启动', icon: '▶️', stage: 0, startText: '已接收你的需求', doneText: '任务上下文准备完成' },
  '01_INTENT': { label: '意图路由', icon: '🔀', stage: 0, startText: '正在识别当前意图', doneText: '意图识别完成' },
  '02_CHITCHAT': { label: '对话助手', icon: '💬', stage: 0, startText: '正在组织回复', doneText: '回复已准备' },
  '03_ANSWER_CHAT': { label: '对话回复', icon: '💬', stage: 0, startText: '正在回复', doneText: '回复完成' },
  '10_GOAL_EXTRACT': { label: '目标理解', icon: '🧭', stage: 0, startText: '产品策划正在理解目的和受众', doneText: '目标信息已整理' },
  '11_GOAL_READY?': { label: '完整度检查', icon: '🧩', stage: 0, startText: '正在检查信息是否足够', doneText: '目标完整度检查完成' },
  '12_SAVE_PARTIAL': { label: '保存目标草稿', icon: '📝', stage: 0, startText: '正在保存已知信息', doneText: '目标草稿已保存' },
  '13_UI_PAYLOAD_CLARIFY': { label: '准备追问', icon: '❓', stage: 0, startText: '正在准备关键选项', doneText: '追问选项已准备' },
  '14_ANSWER_CLARIFY': { label: '需求追问', icon: '❓', stage: 0, startText: '正在发起关键追问', doneText: '等待补充信息' },
  '15_SAVE_GOAL': { label: '目标确认', icon: '✅', stage: 0, startText: '正在固化目标契约', doneText: '目标契约已确认' },
  '20_STRATEGY_SELECT': { label: '策略匹配', icon: '📐', stage: 1, startText: '产品经理正在匹配生成策略', doneText: '目标策略已装配' },
  '21_SAVE_GENERATING': { label: '加载策略', icon: '📋', stage: 1, startText: '正在启动双轨生产', doneText: '主链路与并行分支已启动' },
  '22_WAITING_CONTENT_AGENT': { label: '预热内容策划', icon: '✨', stage: 1, startText: '增长策划正在并行准备预告与推荐', doneText: '等待期内容已就绪' },
  '23_UI_PAYLOAD_WAITING': { label: '等待页装配', icon: '🧱', stage: 1, startText: '正在装配等待页内容', doneText: '等待页内容已更新' },
  '24_PARALLEL_JOIN': { label: '并行结果汇合', icon: '🔗', stage: 1, startText: '正在汇合双轨结果', doneText: '并行任务已汇合' },
  '30_BUILD_REPAIR_LOOP': { label: '研发修复循环', icon: '🔁', stage: 2, startText: '研发流程已开始', doneText: '研发循环完成' },
  '31_CODE_GENERATOR': { label: '代码生成', icon: '💻', stage: 2, startText: '前端工程师正在生成可玩页面', doneText: '完整 H5 已生成' },
  '32_RULE_VALIDATOR': { label: '规则校验', icon: '🔍', stage: 3, startText: '测试工程师正在检查结构和安全', doneText: '确定性规则检查完成' },
  '33_RULE_PASS?': { label: '规则判定', icon: '⚖️', stage: 3, startText: '正在判断是否需要修复', doneText: '规则结果已判定' },
  '34_SEMANTIC_QA': { label: '目标一致性校验', icon: '🎯', stage: 3, startText: '验收员正在核对目标契约', doneText: '目标一致性验收完成' },
  '35_VERDICT_AND_FEEDBACK': { label: '验收结果汇总', icon: '📊', stage: 3, startText: '正在汇总问题并决定是否返工', doneText: '验收结论已形成' },
  '40_GOAL_GUARD': { label: '目标守卫', icon: '🛡️', stage: -1, startText: '目标守卫正在评估改动影响', doneText: '改动风险已判断' },
  '41_GUARD_ROUTE': { label: '守卫分流', icon: '🚦', stage: -1, startText: '正在选择修改路径', doneText: '修改路径已确定' },
  '42_SAVE_PENDING': { label: '暂存修改', icon: '📌', stage: -1, startText: '正在暂存待确认改动', doneText: '改动已暂存' },
  '43_HUMAN_CONFIRM': { label: '等待确认', icon: '⏸️', stage: -1, startText: '需要你确认风险', doneText: '用户决策已收到' },
  '44_CLEAR_PENDING': { label: '取消修改', icon: '↩️', stage: -1, startText: '正在撤销待处理改动', doneText: '修改已取消' },
  '45_ANSWER_CANCEL': { label: '取消确认', icon: '✅', stage: -1, startText: '正在恢复原版本', doneText: '已保留原版本' },
  '50_RESULT_GATE': { label: '交付门禁', icon: '🚪', stage: 3, startText: '正在确认产物达到交付线', doneText: '交付门禁检查完成' },
  '51_NEXT_ACTIONS': { label: '行动建议', icon: '🚀', stage: 4, startText: '增长顾问正在准备下一步', doneText: '行动建议已生成' },
  '52_SAVE_RESULT': { label: '保存结果', icon: '💾', stage: 4, startText: '正在保存版本和验收记录', doneText: '结果与版本已保存' },
  '53_UI_PAYLOAD_COMPLETE': { label: '交付装配', icon: '🎁', stage: 4, startText: '正在装配预览与行动卡片', doneText: '交付内容已准备' },
  '54_ANSWER_COMPLETE': { label: '交付完成', icon: '🎉', stage: 4, startText: '正在发送最终结果', doneText: '完整结果已交付' },
  '60_UI_PAYLOAD_ERROR': { label: '错误整理', icon: '❌', stage: -1, startText: '正在整理错误信息', doneText: '错误信息已准备' },
  '61_ANSWER_ERROR': { label: '失败反馈', icon: '❌', stage: -1, startText: '正在反馈失败原因', doneText: '失败原因已反馈' },
};

export const getNodeDisplay = (title: string): NodeDisplay =>
  NODE_DISPLAY[title] ?? {
    label: title || '工作流节点',
    icon: '⚙️',
    stage: -1,
    startText: '正在处理',
    doneText: '处理完成',
  };
