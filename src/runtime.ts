export type GoalDraft = {
  schema_version?: string;
  goal_statement: string;
  target_audience: string;
  desired_outcomes: string[];
  success_criteria: string[];
  must_have: string[];
  forbidden: string[];
  strategy_tags: string[];
  assumptions: string[];
  status: string;
};

export type GoalQuestion = {
  id: string;
  text: string;
  options: Array<{ label: string; value: string }>;
};

export type GoalChatResult = {
  schema_version?: string;
  type: 'goal_clarification' | 'goal_ready';
  assistant_message: string;
  ready_to_confirm: boolean;
  goal_draft: GoalDraft;
  missing_fields: string[];
  question: GoalQuestion;
};

export type DesignDecision = {
  anchor_id: string;
  location: string;
  title: string;
  explanation: string;
  goal_link?: string;
  verify_action?: string;
  /** Stable row id. Several scenes can share one anchor, so the anchor is not a key. */
  decision_id?: string;
  /** Scene state marker the preview highlights: opening | question | reveal | result. */
  state?: string;
  scene_id?: string;
  evidence?: string[];
};

export type BuildArtifact = {
  html: string;
  manifest: Record<string, unknown>;
  design_decisions: DesignDecision[];
  design_summary?: string;
  validation: Record<string, unknown>;
  version_no: number;
  artifact_id?: string;
  execution_plan?: Record<string, unknown>;
  project_bundle?: Record<string, unknown>;
  spec?: Record<string, unknown>;
  design?: Record<string, unknown>;
  files?: Array<{ path: string; content: string }>;
  assets?: Record<string, unknown>;
  screenshots?: Record<string, string>;
  preview_url?: string;
  visual_review?: Record<string, unknown>;
  quality_score?: number;
  cost?: Record<string, unknown>;
  diversity?: Record<string, unknown>;
  timings?: Record<string, number>;
  template?: {
    id?: string;
    deliveryType?: string;
    deliveryLabel?: string;
    workType?: string;
    workLabel?: string;
    structureLabel?: string;
    version?: string;
  };
};

export type GuardImpactLocation = {
  anchor_id: string;
  location: string;
  severity: 'low' | 'medium' | 'high';
  impact: string;
  goal_relation: string;
};

export type GuardReview = {
  schema_version?: string;
  type: 'guard_review' | 'interaction_response';
  status: 'safe' | 'warning' | 'conflict';
  interaction_type?: 'feedback' | 'question' | 'modify' | 'goal_update' | 'uncertain';
  needs_guard?: boolean;
  assistant_message?: string;
  change_request: string;
  summary: string;
  reason: string;
  affected_goal_items: string[];
  affected_locations: GuardImpactLocation[];
  unmapped_impacts: string[];
  alternative: {
    title: string;
    description: string;
    effective_change_request: string;
    why_better: string;
  };
  allowed_actions: string[];
};

export type RuntimeEvent = {
  event: string;
  task_id?: string;
  conversation_id?: string;
  answer?: string;
  data?: {
    title?: string;
    status?: string;
    outputs?: Record<string, unknown>;
    error?: string;
    elapsed_time?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
/* ============================================================================
 * CLIENT RUNTIME
 * ----------------------------------------------------------------------------
 * Keeps the same exported signatures the app expects, but every call is served
 * locally from `./fixture` instead of going over the network. This makes the
 * app deployable as a static site with no server dependency and no keys.
 *
 * Sample data is captured from a real generation run.
 * ==========================================================================*/

import { DEMO_ARTIFACT, DEMO_VERSION_1, DEMO_SESSION, DEMO_VERSIONS } from './fixture';

export { DEMO_ARTIFACT, DEMO_VERSION_1, DEMO_SESSION, DEMO_VERSIONS };

const EMPTY_GOAL: GoalDraft = {
  goal_statement: '', target_audience: '', desired_outcomes: [], success_criteria: [],
  must_have: [], forbidden: [], strategy_tags: [], assumptions: [], status: 'drafting',
};

const sleep = (ms: number) => new Promise<void>((resolve) => { window.setTimeout(resolve, ms); });

/** Demo pacing. Real runs take 60s+; the demo compresses that to ~14s so a
 *  reviewer with 30 seconds of patience still sees the whole pipeline. */
const PACE = { chat: 900, stage: 1700, guard: 1100 };

let goalTurn = 0;

/** Deterministic goal draft that grows richer with each clarification turn. */
const GOAL_STEPS: GoalDraft[] = [
  {
    ...EMPTY_GOAL,
    goal_statement: '帮助用户通过测试更了解自己的性格和偏好，获得自我认知',
    target_audience: '喜欢在城市中漫步、探索城市角落和特色地点的人群',
    desired_outcomes: ['用户完成测试并得到一个人格类型'],
    strategy_tags: ['自我认知', '轻量互动'],
    status: 'drafting',
  },
  {
    ...EMPTY_GOAL,
    goal_statement: '帮助用户通过测试更了解自己的性格和偏好，获得自我认知',
    target_audience: '喜欢在城市中漫步、探索城市角落和特色地点的人群',
    desired_outcomes: ['用户完成测试并得到一个人格类型', '愿意把结果分享给朋友'],
    success_criteria: ['5 道题内完成', '结果有画面感、可被记住'],
    must_have: ['单选计分', '结果页可重新开始'],
    forbidden: ['居中渐变大卡片'],
    strategy_tags: ['自我认知', '轻量互动', '可分享'],
    status: 'drafting',
  },
  {
    ...EMPTY_GOAL,
    goal_statement: '帮助用户通过测试更了解自己的性格和偏好，获得自我认知',
    target_audience: '喜欢在城市中漫步、探索城市角落和特色地点的人群',
    desired_outcomes: ['用户完成测试并得到一个人格类型', '愿意把结果分享给朋友'],
    success_criteria: ['5 道题内完成', '结果有画面感、可被记住', '手机上不出现横向滚动'],
    must_have: ['单选计分', '结果页可重新开始', '开场点明这是城市漫游主题'],
    forbidden: ['居中渐变大卡片', '三个等宽功能卡'],
    strategy_tags: ['自我认知', '轻量互动', '可分享'],
    assumptions: ['用户在手机上单手完成'],
    status: 'ready',
  },
];

const GOAL_QUESTIONS: GoalQuestion[] = [
  {
    id: 'q_outcome',
    text: '这个测试做出来，你最想让用户得到什么？',
    options: [
      { label: '认识自己：得到一个说得准的人格类型', value: '我想让用户得到一个说得准的人格类型，产生自我认知' },
      { label: '愿意分享：结果好看到想发朋友圈', value: '我想让结果好看到用户愿意分享出去' },
      { label: '纯粹好玩：轻松打发几分钟', value: '我只想让它好玩，轻松打发几分钟' },
    ],
  },
  {
    id: 'q_style',
    text: '风格上你有偏好吗？这会决定作品长什么样。',
    options: [
      { label: '编辑感：像杂志内页 / 小票排版', value: '我想要编辑感，像杂志内页或小票那种排版，不要居中大卡片' },
      { label: '夜间城市：墨蓝 + 霓虹点缀', value: '我想要夜间城市的感觉，墨蓝配色加一点霓虹强调色' },
      { label: '你来定：按目标推荐最合适的', value: '风格你来定，按我的目标推荐最合适的' },
    ],
  },
];

export async function runGoalChat(
  query: string,
  conversationId: string,
  user: string,
  onEvent?: (event: RuntimeEvent) => void,
): Promise<{ payload: GoalChatResult; conversationId: string; taskId: string }> {
  void query; void user;
  onEvent?.({ event: 'message', answer: '' });
  await sleep(PACE.chat);

  const turn = Math.min(goalTurn, GOAL_STEPS.length - 1);
  const draft = GOAL_STEPS[turn];
  const isReady = turn >= GOAL_STEPS.length - 1;
  goalTurn += 1;

  const payload: GoalChatResult = isReady
    ? {
        type: 'goal_ready',
        assistant_message: '目标已经收敛清楚了。确认之后我会把它锁成契约，生成过程和后续每次修改都以它为准。',
        ready_to_confirm: true,
        goal_draft: draft,
        missing_fields: [],
        question: { id: '', text: '', options: [] },
      }
    : {
        type: 'goal_clarification',
        assistant_message: turn === 0
          ? '我先确认这个作品要达成什么，再决定怎么做。'
          : '目标基本清楚了，还有一处会明显影响成品效果。',
        ready_to_confirm: false,
        goal_draft: draft,
        missing_fields: turn === 0 ? ['desired_outcomes'] : ['style'],
        question: GOAL_QUESTIONS[Math.min(turn, GOAL_QUESTIONS.length - 1)],
      };

  return { payload, conversationId: conversationId || 'demo-conversation', taskId: 'demo-task' };
}

/** Mirrors the 5 decorative SSE stages the real backend emits before delivery. */
const BUILD_STAGES: Array<{ id: string; title: string }> = [
  { id: 'platform-10_requirement_design', title: '10_REQUIREMENT_DESIGN' },
  { id: 'platform-20_reference', title: '20_REFERENCE' },
  { id: 'platform-30_build', title: '30_BUILD' },
  { id: 'platform-40_gate', title: '40_GATE' },
  { id: 'platform-50_visual_review', title: '50_VISUAL_REVIEW' },
];

let buildCount = 0;

export async function runBuild(
  inputs: Record<string, unknown>,
  user: string,
  onEvent?: (event: RuntimeEvent) => void,
): Promise<{ artifact: BuildArtifact; taskId: string }> {
  void user;
  const isModify = String(inputs.request_type ?? '') === 'modify';
  onEvent?.({ event: 'workflow_started' });

  for (const stage of BUILD_STAGES) {
    onEvent?.({ event: 'node_started', data: { node_id: stage.id, title: stage.title } });
    await sleep(PACE.stage);
    onEvent?.({ event: 'node_finished', data: { node_id: stage.id, title: stage.title, status: 'succeeded' } });
  }

  buildCount += 1;
  const versionNo = isModify ? Math.min(2, 1 + buildCount) : 1;
  const source = versionNo >= 2 ? DEMO_ARTIFACT : DEMO_VERSION_1;

  onEvent?.({ event: 'workflow_finished' });

  return {
    artifact: {
      html: source.html,
      manifest: { ...DEMO_ARTIFACT.manifest, version_no: versionNo },
      design_decisions: DEMO_ARTIFACT.design_decisions,
      design_summary: DEMO_ARTIFACT.design_summary,
      validation: source.validation,
      diversity: {},
      timings: {},
      project_bundle: {},
      spec: source.spec,
      design: source.design,
      files: [],
      assets: {},
      screenshots: {},
      visual_review: {},
      quality_score: 0,
      cost: {},
      version_no: versionNo,
      artifact_id: DEMO_ARTIFACT.artifact_id,
      execution_plan: source.spec,
    },
    taskId: 'demo-build',
  };
}

/** Requests that change the locked contract (question count, scoring, capability). */
/**
 * Requests that change the locked contract rather than the visuals.
 * Covers question/result counts, scoring rules, the capability itself, and
 * paywalls (the demo goal contract forbids blocking the first experience).
 */
const CONTRACT_PATTERNS: RegExp[] = [
  /题(目|数|量)|几(道|题)|\d+\s*(题|道)/,
  /结果(数|量|条)|隐藏结果|新增结果|增加结果/,
  /计分|评分|分数|权重|算法/,
  /多选|单选|选项数|填空|排序题/,
  /付费|付款|收费|解锁|会员|充值|\d+(\.\d+)?\s*元/,
  /改成(测试|游戏|问卷|抽奖|投票)|换成(测试|游戏|问卷|抽奖|投票)|测试类型/,
  /目标|受众|用户群|面向.*人群/,
];

function breaksContract(request: string): boolean {
  return CONTRACT_PATTERNS.some((pattern) => pattern.test(request));
}

export async function runGuard(
  inputs: Record<string, unknown>,
  user: string,
  onEvent?: (event: RuntimeEvent) => void,
): Promise<{ review: GuardReview; taskId: string }> {
  void user;
  onEvent?.({ event: 'workflow_started' });
  await sleep(PACE.guard);
  onEvent?.({ event: 'workflow_finished' });

  const request = String(inputs.change_request ?? inputs.user_instruction ?? '');
  const deviates = breaksContract(request);

  const safeReview: GuardReview = {
    type: 'guard_review',
    status: 'safe',
    interaction_type: 'modify',
    summary: '目标检查通过，这个修改不会破坏当前目标',
    reason: '这次修改只影响视觉与排版，不触及契约里的能力、题目数和计分方式。',
    change_request: request,
    affected_goal_items: [],
    affected_locations: [],
    unmapped_impacts: [],
    alternative: { title: '', description: '', effective_change_request: request, why_better: '' },
    allowed_actions: ['modify'],
  };

  const conflictReview: GuardReview = {
    type: 'guard_review',
    status: 'conflict',
    interaction_type: 'modify',
    summary: '这次修改会改动已锁定的目标契约',
    reason: '这次修改会改变契约里已确认的题目数或计分结构，属于目标层面的变更，不是视觉调整。已通过的 17 项交付门禁需要全部重跑。',
    change_request: request,
    affected_goal_items: ['5 题单选计分', '4 个结果可达'],
    affected_locations: [
      { anchor_id: 'question_progress', location: '答题过程', severity: 'medium', impact: '题目数量与计分区间需要重新分配', goal_relation: '题目数量决定结果区分度，直接影响「获得自我认知」这一目标' },
      { anchor_id: 'result_reveal', location: '结果页', severity: 'high', impact: '结果映射区间随之变化，可能出现不可达结果', goal_relation: '结果必须可达，否则用户拿不到自我认知结论' },
    ],
    unmapped_impacts: ['历史版本的分数与新结构不再可比'],
    alternative: {
      title: '只改观感，不动目标',
      description: '保持 5 题单选计分与 4 个结果不变，只调整答题页的选项间距和字号。',
      effective_change_request: '保持 5 题单选计分不变，只把答题页的选项间距和字号调得更舒展',
      why_better: '不需要重新验证目标契约，改动范围最小，视觉诉求同样能满足。',
    },
    allowed_actions: ['cancel', 'alternative', 'force'],
  };

  return { review: deviates ? conflictReview : safeReview, taskId: 'demo-guard' };
}
/** Reset demo pacing so "重新开始" behaves like a fresh session. */
export function resetDemoRuntime(): void {
  goalTurn = 0;
  buildCount = 0;
}