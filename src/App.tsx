import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  runBuild,
  runGoalChat,
  runGuard,
  type BuildArtifact,
  type DesignDecision,
  type GoalDraft,
  type GoalQuestion,
  type GuardReview,
  type RuntimeEvent,
} from './runtime';

type SessionSummary = {
  artifact_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  latest_version: number;
  working_version: number;
  status: string;
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(then).toLocaleDateString('zh-CN');
}

function SessionHistory({ sessions, busy, activeId, accent, triggerRef, onPick, onClose }: {
  sessions: SessionSummary[]; busy: boolean; activeId: string; accent: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onPick: (session: SessionSummary) => void; onClose: () => void;
}) {
  const [anchor, setAnchor] = useState<{ top: number; right: number }>({ top: 72, right: 24 });
  useEffect(() => {
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setAnchor({ top: Math.round(rect.bottom + 9), right: Math.round(Math.max(12, window.innerWidth - rect.right)) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [triggerRef]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div className="history-layer" style={{ '--accent': accent } as React.CSSProperties}>
      <div className="history-scrim" onClick={onClose} />
      <div className="history-pop" role="menu" style={{ top: anchor.top, right: anchor.right }}>
        <div className="history-pop-head"><span>近期会话</span><small>{sessions.length ? `${sessions.length} 个可打开` : ''}</small></div>
        {busy && <p className="history-empty">正在读取…</p>}
        {!busy && !sessions.length && <p className="history-empty">还没有已交付的作品。生成成功后会自动出现在这里。</p>}
        {!busy && sessions.map((session) => (
          <button
            key={session.artifact_id}
            type="button"
            className={`history-row ${session.artifact_id === activeId ? 'current' : ''}`}
            onClick={() => onPick(session)}
          >
            <strong>{session.title || '未命名作品'}</strong>
            <small>{relativeTime(session.updated_at)}{session.latest_version > 1 ? ` · ${session.latest_version} 个版本` : ''}{session.artifact_id === activeId ? ' · 当前' : ''}</small>
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}

type Stage = 'landing' | 'kickoff' | 'confirm' | 'generating' | 'done' | 'guard' | 'error';
type GoalType = 'viral' | 'monetize' | 'fun' | 'deliver';
type ChatItem = { id: number; role: 'user' | 'assistant'; content: string };
type GoalHistoryItem = { id: number; kind: 'confirmed' | 'changed' | 'risk'; title: string; detail: string; time: string };

type GoalView = {
  label: string;
  color: string;
  summary: string;
  audience: string;
  outcomes: string[];
  metrics: string[];
  rules: string[];
  forbidden: string[];
};

const EMPTY_GOAL_DRAFT: GoalDraft = {
  goal_statement: '', target_audience: '', desired_outcomes: [], success_criteria: [],
  must_have: [], forbidden: [], strategy_tags: [], assumptions: [], status: 'draft',
};

const GOALS: Array<{ type: GoalType; icon: string; name: string; desc: string }> = [
  { type: 'viral', icon: '📣', name: '抖音引流传播', desc: '让更多人参与、截图并主动分享' },
  { type: 'monetize', icon: '💳', name: '商业变现', desc: '通过透明付费权益或广告获得收入' },
  { type: 'fun', icon: '🎮', name: '纯娱乐互动', desc: '优先提高趣味性、惊喜感和复玩率' },
  { type: 'deliver', icon: '📦', name: '客户交付', desc: '做出可演示、可验收的完整成果' },
];

const AUDIENCES = ['18～25岁女性', '情侣用户', '泛娱乐用户', '自己填写'];
const BEHAVIORS = ['截图分享结果', '转发朋友挑战', '关注账号', '继续玩第二次'];

// One brand accent for every goal type: the accent used to be derived from the inferred goal
// type, so the same product flashed green or purple depending on wording and read as an error.
const BRAND_ACCENT = '#ff6b7a';

const GOAL_DETAIL = {
  viral: {
    label: '抖音引流传播', color: '#ff6b7a', summary: '让18～25岁女性在15秒内理解玩法，完成测试后愿意截图或分享。',
    metrics: ['完成一次完整测试', '点击分享结果', '愿意重新挑战'],
    rules: ['首屏直接开玩', '单局约15秒', '结果具有传播点'], forbidden: ['强制登录', '首次体验付费墙'],
  },
  monetize: {
    label: '商业变现', color: '#c47aff', summary: '先提供完整免费体验，再在高意愿时刻呈现透明付费权益。',
    metrics: ['付费入口点击', '支付完成', '免费用户留存'],
    rules: ['先免费体验', '权益清晰', '随时可取消'], forbidden: ['暗扣', '诱导支付'],
  },
  fun: {
    label: '纯娱乐互动', color: '#55d98b', summary: '用轻松、有反差的反馈提高复玩和朋友间互动。',
    metrics: ['完成率', '复玩率', '朋友挑战'], rules: ['反馈有趣', '操作简单', '结果有变化'], forbidden: ['冗长引导', '复杂注册'],
  },
  deliver: {
    label: '客户交付', color: '#ffad5c', summary: '交付一个完整、稳定、可演示和可验收的H5成品。',
    metrics: ['功能通过', '可下载', '可复现'], rules: ['完整交互', '验收清单', '版本记录'], forbidden: ['未完成占位', '依赖外部登录'],
  },
};

function inferGoalType(draft: GoalDraft): GoalType {
  const text = [draft.goal_statement, draft.target_audience, ...(draft.desired_outcomes ?? []), ...(draft.strategy_tags ?? [])].join(' ');
  if (/变现|付费|收入|广告|销售|转化|支付/.test(text)) return 'monetize';
  if (/品牌|营销|客户|交付|验收|活动|推广/.test(text)) return 'deliver';
  if (/引流|传播|分享|涨粉|关注|曝光|获客/.test(text)) return 'viral';
  return 'fun';
}

function goalLabel(draft: GoalDraft, type: GoalType): string {
  const statement = draft.goal_statement.trim();
  if (/引流|传播|分享|涨粉|关注/.test(statement)) return '引流传播';
  if (/变现|付费|收入|广告|销售/.test(statement)) return '商业变现';
  if (/品牌|营销|推广/.test(statement)) return '品牌营销';
  if (/交付|验收/.test(statement)) return '客户交付';
  if (/娱乐|互动|趣味|朋友/.test(statement)) return '娱乐互动';
  return GOAL_DETAIL[type].label;
}

function toGoalView(draft: GoalDraft, type: GoalType): GoalView {
  const fallback = GOAL_DETAIL[type];
  return {
    label: goalLabel(draft, type),
    color: BRAND_ACCENT,
    summary: draft.goal_statement || fallback.summary,
    audience: draft.target_audience || '待确认',
    outcomes: draft.desired_outcomes?.length ? draft.desired_outcomes : fallback.metrics,
    metrics: draft.success_criteria?.length ? draft.success_criteria : fallback.metrics,
    rules: draft.must_have?.length ? draft.must_have : fallback.rules,
    forbidden: draft.forbidden?.length ? draft.forbidden : fallback.forbidden,
  };
}

const GOAL_CAST_MS = 4200;

const NODE_STATUS: Record<string, string> = {
  '10_CAPABILITY_MATCH': '正在确认核心玩法是否有稳定能力支持',
  '11_CREATIVE_BLUEPRINT': '正在把需求转成可执行的创作规格',
  '30_CAPABILITY_COMPILE': '正在装配内容、视觉和真实玩法',
  '40_QUALITY_HARNESS': '正在试玩核心路径并检查移动端适配',
  '20_STRATEGY_AGENT': '正在围绕目标策划玩法与内容',
  '21_NORMALIZE_SPEC': '正在整理作品结构与目标锚点',
  '30_CODE_GENERATOR': '正在生成可玩的 H5 作品',
  '31_CLEAN_HTML': '正在整理生成内容',
  '32_RULE_VALIDATOR': '正在检查交互、安全与完整性',
  '33_BUILD_VERIFY_TASKS': '正在准备目标验收任务',
  '34_PARALLEL_VERIFIER': '正在并行验证目标实现情况',
  '35_AGGREGATE_VERDICT': '正在汇总检查结果',
  '36_REPAIR_LOOP': '正在自动修复发现的问题',
  '40_FINALIZE_ARTIFACT': '正在准备最终作品与设计解读',
  '50_OUTPUT_PAYLOAD': '正在完成交付',
};

function eventStatus(event: RuntimeEvent): string | null {
  if (event.event !== 'node_started') return null;
  const title = String(event.data?.title ?? '');
  const userLabel = String(event.data?.label ?? '').trim();
  return userLabel || NODE_STATUS[title] || (title && !/^[A-Z][A-Z_]+$/.test(title) ? `正在执行：${title.replace(/^\d+_/, '')}` : null);
}

type ToolRecommendation = { icon: string; name: string; category: string; timing: string; value: string; href: string };

const TOOL_RECOMMENDATIONS: Record<GoalType, ToolRecommendation[]> = {
  viral: [
    { icon: '📊', name: '友盟+', category: '数据埋点与效果追踪', timing: '作品发出去之后，你会想知道哪个渠道真的带来了人。', value: '投放后看UV、跳出率、分享率，知道哪个渠道引流效果最好', href: 'https://www.umeng.com/' },
    { icon: '🎨', name: '草料二维码', category: '生成带参数的渠道码', timing: '同时发了群、朋友圈和公众号，事后就分不清人是从哪来的。', value: '不同投放渠道使用不同二维码，自动统计各渠道引流数据', href: 'https://cli.im/' },
    { icon: '📢', name: '巨量引擎', category: '一站式信息流投放', timing: '等你发现某个渠道数据明显更好，就该考虑花钱把它放大。', value: '作品测试跑通后，直接投DOU+放大引流效果', href: 'https://www.oceanengine.com/' },
  ],
  monetize: [
    { icon: '💰', name: '微信流量主', category: '开通广告分成', timing: '有了稳定访问量之后，这些流量本身就可以变成收入。', value: '接入激励视频、插屏广告，用户看广告你就能获得收益', href: 'https://mp.weixin.qq.com/' },
    { icon: '🔧', name: '穿山甲广告联盟', category: '移动广告SDK接入', timing: '单一广告源填充不满时，收入会卡在一个上限上下不来。', value: '覆盖更多广告品类，通过更丰富的填充提升变现效率', href: 'https://www.csjplatform.com/' },
    { icon: '💳', name: '虎皮椒支付', category: '个人H5支付通道', timing: '当用户愿意为解锁结果付费，你需要一个能立刻收到钱的通道。', value: '快速开通付费解锁、打赏等变现功能', href: 'https://www.xunhupay.com/' },
  ],
  deliver: [
    { icon: '📊', name: '友盟+', category: '活动数据全链路埋点', timing: '活动结束要复盘效果，光靠访问量说不清有没有达标。', value: '实时监控UV、转化率、留资率，评估活动效果', href: 'https://www.umeng.com/' },
    { icon: '🎨', name: '草料活码', category: '渠道溯源二维码', timing: '同一场活动铺了多个渠道，得知道哪个渠道带来了真实留资。', value: '不同推广渠道使用不同码，精准归因各渠道转化效果', href: 'https://cli.im/' },
    { icon: '📢', name: '腾讯广告', category: '品牌活动精准投放', timing: '自然流量到顶之后，精准投放是继续拿到目标人群的方式。', value: '定向目标人群投放，为活动页精准引流获客', href: 'https://e.qq.com/' },
  ],
  fun: [
    { icon: '💬', name: '群邀请语生成', category: '一键生成趣味邀请文案', timing: '想拉朋友一起玩时，最卡人的其实是开场那句话怎么说。', value: '直接复制发群，邀请朋友一起来玩', href: 'https://www.doubao.com/' },
    { icon: '🏆', name: '群玩排行榜助手', category: '实时同步群内成绩', timing: '大家都玩过一轮之后，有排名才会有人想再来一次。', value: '自动排名次，激发群内PK和复玩', href: 'https://docs.qq.com/' },
    { icon: '📱', name: '一键生成分享图', category: '自动生成战绩海报', timing: '玩出好结果的那一刻，用户最想晒，但懒得自己截图排版。', value: '玩完直接发朋友圈，不用自己截图和排版', href: 'https://www.canva.cn/' },
  ],
};

const now = () => new Date().toLocaleTimeString('zh-CN', { hour12: false });

export default function App() {
  const [stage, setStage] = useState<Stage>('landing');
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyTriggerRef = useRef<HTMLButtonElement>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionsBusy, setSessionsBusy] = useState(false);
  const [brief, setBrief] = useState('');
  const [kickoffStep, setKickoffStep] = useState(0);
  const [goalType, setGoalType] = useState<GoalType>('viral');
  const [goalDraft, setGoalDraft] = useState<GoalDraft>(EMPTY_GOAL_DRAFT);
  const [question, setQuestion] = useState<GoalQuestion>({ id: '', text: '', options: [] });
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [composer, setComposer] = useState('');
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalCast, setGoalCast] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [deviations, setDeviations] = useState(0);
  const [goalHistory, setGoalHistory] = useState<GoalHistoryItem[]>([]);
  const [conversationId, setConversationId] = useState('');
  const [artifact, setArtifact] = useState<BuildArtifact | null>(null);
  const [guardReview, setGuardReview] = useState<GuardReview | null>(null);
  const [pendingChange, setPendingChange] = useState('');
  const [busy, setBusy] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState('正在理解你的需求');
  const [runtimeError, setRuntimeError] = useState('');
  const idRef = useRef(1);
  const clientUser = useMemo(() => {
    const saved = window.localStorage.getItem('goalkeeper_user');
    if (saved) return saved;
    const created = `web_${crypto.randomUUID()}`;
    window.localStorage.setItem('goalkeeper_user', created);
    return created;
  }, []);
  const goal = useMemo(() => toGoalView(goalDraft, goalType), [goalDraft, goalType]);

  useEffect(() => {
    if (stage !== 'generating') return;
    setElapsed(0);
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [stage]);

  useEffect(() => {
    if (!goalCast) return;
    const timer = window.setTimeout(() => setGoalCast(false), GOAL_CAST_MS);
    return () => window.clearTimeout(timer);
  }, [goalCast]);

  useEffect(() => {
    if (stage !== 'generating') setGoalCast(false);
  }, [stage]);

  const accentStyle = useMemo(() => ({ '--accent': goal.color } as React.CSSProperties), [goal.color]);

  function startKickoff(event: FormEvent) {
    event.preventDefault();
    const text = brief.trim() || '做一个城市漫游人格测试，看看我属于哪种探索者';
    setBrief(text);
    setMessages([]);
    setKickoffStep(0);
    setStage('kickoff');
    void askGoal(text, text);
  }

  async function askGoal(query: string, visibleText: string) {
    if (!query.trim() || busy) return;
    setBusy(true);
    setRuntimeError('');
    setMessages((current) => [...current, { id: idRef.current++, role: 'user', content: visibleText }]);
    try {
      const result = await runGoalChat(query, conversationId, clientUser);
      setConversationId(result.conversationId);
      setGoalDraft(result.payload.goal_draft);
      setGoalType(inferGoalType(result.payload.goal_draft));
      setMessages((current) => [...current, { id: idRef.current++, role: 'assistant', content: result.payload.assistant_message }]);
      if (result.payload.ready_to_confirm || result.payload.type === 'goal_ready') {
        setStage('confirm');
      } else {
        setQuestion(result.payload.question);
        setKickoffStep((value) => value + 1);
      }
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : '目标对话失败');
    } finally {
      setBusy(false);
    }
  }

  async function confirmGoal() {
    if (busy) return;
    const activeGoal = { ...goalDraft, status: 'active' };
    setGoalDraft(activeGoal);
    setGoalHistory((current) => [...current, { id: Date.now(), kind: artifact ? 'changed' : 'confirmed', title: `${artifact ? '更新' : '确认'}目标：${goal.label}`, detail: '目标契约开始生效，后续创作与修改都以此为准。', time: now() }]);
    setMessages((current) => [...current, { id: idRef.current++, role: 'assistant', content: `目标已锁定为“${goal.label}”。接下来会围绕这个目标完成策划、制作和检查。` }]);
    await executeBuild('create', '', activeGoal);
  }

  async function executeBuild(requestType: 'create' | 'modify', changeRequest: string, contract = goalDraft, sourceDisclosureAuthorized = false) {
    setStage('generating');
    if (requestType === 'create') { setGoalOpen(false); setGoalCast(true); }
    setBusy(true);
    setRuntimeError('');
    setRuntimeStatus(requestType === 'create' ? '正在围绕目标策划作品' : '正在按照修改要求生成新版本');
    try {
      const result = await runBuild({
        request_type: requestType,
        creative_brief: brief,
        goal_contract_json: JSON.stringify(contract),
        change_request: changeRequest,
        previous_artifact_id: artifact?.artifact_id ?? '',
        version_no: artifact?.version_no ?? 0,
        source_disclosure_authorized: requestType === 'modify' && sourceDisclosureAuthorized,
      }, clientUser, (event) => {
        const status = eventStatus(event);
        if (status) setRuntimeStatus(status);
      });
      setArtifact(result.artifact);
      setStage('done');
      setGuardReview(null);
      setMessages((current) => [...current, {
        id: idRef.current++, role: 'assistant',
        content: requestType === 'create'
          ? '作品已生成，并完成目标相关检查。你可以直接试玩，也可以继续告诉我怎么修改。'
          : `修改已完成，当前为 v${result.artifact.version_no}。设计解读也已同步更新。`,
      }]);
    } catch (error) {
      const reason = error instanceof Error ? error.message : '作品生成失败';
      setRuntimeError(reason);
      setStage(artifact ? 'done' : 'error');
      const failureReply = requestType === 'modify'
        ? `这次修改没有通过交付前的检查，当前版本保持不变。原因：${reason}`
        : `这次生成没有完成。原因：${reason}`;
      setMessages((current) => [...current, { id: idRef.current++, role: 'assistant', content: failureReply }]);
    } finally {
      setBusy(false);
    }
  }

  function authorizeV5WorkspaceModification(): boolean {
    if (!artifact?.artifact_id) {
      setRuntimeError('当前作品没有 V5 工作区，无法进行可回滚的局部修改。请先生成一个 V5 版本。');
      setStage('done');
      return false;
    }
    return true;
  }

  async function submitComposer(event: FormEvent) {
    event.preventDefault();
    const text = composer.trim();
    if (!text || busy || !artifact) return;
    setMessages((current) => [...current, { id: idRef.current++, role: 'user', content: text }]);
    setComposer('');
    setPendingChange(text);
    setBusy(true);
    setRuntimeError('');
    try {
      const result = await runGuard({
        change_request: text,
        goal_contract_json: JSON.stringify(goalDraft),
        artifact_manifest_json: JSON.stringify(artifact.manifest),
        design_decisions_json: JSON.stringify(artifact.design_decisions),
        current_html: artifact.html,
      }, clientUser);
      setGuardReview(result.review);
      if (result.review.type === 'interaction_response' || (result.review.interaction_type && result.review.interaction_type !== 'modify')) {
        const reply = result.review.assistant_message || result.review.summary || '我理解了，你可以继续告诉我希望怎么调整。';
        setMessages((current) => [...current, { id: idRef.current++, role: 'assistant', content: reply }]);
        setGuardReview(null);
        if (result.review.interaction_type === 'goal_update') {
          const goalResult = await runGoalChat(text, conversationId, clientUser);
          setConversationId(goalResult.conversationId);
          setGoalDraft(goalResult.payload.goal_draft);
          setGoalType(inferGoalType(goalResult.payload.goal_draft));
          setMessages((current) => [...current, { id: idRef.current++, role: 'assistant', content: goalResult.payload.assistant_message }]);
          if (goalResult.payload.ready_to_confirm || goalResult.payload.type === 'goal_ready') setStage('confirm');
          else { setQuestion(goalResult.payload.question); setKickoffStep((value) => value + 1); setStage('kickoff'); }
        } else setStage('done');
        return;
      }
      if (result.review.status === 'safe') {
        setMessages((current) => [...current, { id: idRef.current++, role: 'assistant', content: '目标检查通过，这个修改不会破坏当前目标，开始生成新版本。' }]);
        setBusy(false);
        if (!authorizeV5WorkspaceModification()) return;
        await executeBuild('modify', text, goalDraft, true);
        return;
      }
      setMessages((current) => [...current, { id: idRef.current++, role: 'assistant', content: result.review.summary || '目标守卫发现这次修改可能影响当前目标，请查看右侧影响位置。' }]);
      setStage('guard');
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : '目标检查失败');
    } finally {
      setBusy(false);
    }
  }

  async function resolveGuard(action: 'cancel' | 'alternative' | 'force') {
    if (action === 'cancel') {
      setMessages((current) => [...current, { id: idRef.current++, role: 'assistant', content: '已取消这次修改，当前版本和目标都保持不变。' }]);
      setStage('done');
      setGuardReview(null);
      return;
    }
    let effectiveRequest = pendingChange;
    if (action === 'alternative') {
      effectiveRequest = guardReview?.alternative.effective_change_request || pendingChange;
      setMessages((current) => [...current, { id: idRef.current++, role: 'assistant', content: `已采用替代方案：${guardReview?.alternative.title || effectiveRequest}` }]);
    } else {
      setDeviations((value) => value + 1);
      setGoalHistory((current) => [...current, { id: Date.now(), kind: 'risk', title: '保留目标，接受一次偏移风险', detail: '用户决定仍然执行本次修改，本次决策已记录。', time: now() }]);
      setMessages((current) => [...current, { id: idRef.current++, role: 'assistant', content: '你已确认接受目标风险。我会保留当前目标，并记录这次目标偏移。' }]);
    }
    if (!authorizeV5WorkspaceModification()) return;
    await executeBuild('modify', effectiveRequest, goalDraft, true);
  }

  const loadSessions = async () => {
    setSessionsBusy(true);
    try {
      const response = await fetch('/api/v5/sessions?limit=20');
      const payload = await response.json() as { items?: SessionSummary[] };
      setSessions(Array.isArray(payload.items) ? payload.items : []);
    } catch { setSessions([]); }
    finally { setSessionsBusy(false); }
  };

  const toggleHistory = () => {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next) void loadSessions();
  };

  // Reopening a past work restores the delivered version so effects can be reviewed without rebuilding.
  const openSession = async (session: SessionSummary) => {
    setHistoryOpen(false);
    setBusy(true);
    setRuntimeError('');
    try {
      const response = await fetch(`/api/v5/artifacts/${encodeURIComponent(session.artifact_id)}`);
      if (!response.ok) throw new Error('该会话的作品已不可读取');
      const payload = await response.json() as Record<string, unknown>;
      const restored = (payload.artifact && typeof payload.artifact === 'object' ? payload.artifact : payload) as Record<string, unknown>;
      const html = String(restored.html ?? '');
      if (!html) throw new Error('该会话没有可展示的作品');
      setArtifact({
        html,
        manifest: (restored.manifest ?? {}) as Record<string, unknown>,
        design_decisions: Array.isArray(restored.design_decisions) ? restored.design_decisions as DesignDecision[] : [],
        design_summary: typeof restored.design_summary === 'string' ? restored.design_summary : undefined,
        validation: (restored.validation ?? {}) as Record<string, unknown>,
        version_no: Number(payload.version_no ?? session.working_version ?? 1),
        artifact_id: session.artifact_id,
        spec: (restored.spec ?? {}) as Record<string, unknown>,
        design: (restored.design ?? {}) as Record<string, unknown>,
      });
      setMessages([{ id: idRef.current++, role: 'assistant', content: `已打开历史会话“${session.title}”。你可以直接试玩效果，或告诉我想改哪里。` }]);
      setGuardReview(null); setPendingChange(''); setComposer(''); setGoalOpen(false);
      setStage('done');
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : '历史会话打开失败');
    } finally { setBusy(false); }
  };

  function resetDemo() {
    setStage('landing'); setBrief(''); setKickoffStep(0); setGoalType('viral'); setGoalDraft(EMPTY_GOAL_DRAFT);
    setQuestion({ id: '', text: '', options: [] }); setMessages([]); setComposer(''); setConversationId(''); setArtifact(null);
    setGuardReview(null); setPendingChange(''); setBusy(false); setRuntimeError(''); setGoalOpen(false); setElapsed(0); setDeviations(0); setGoalHistory([]); setHistoryOpen(false); setGoalCast(false);
  }

  if (stage === 'landing') return <Landing brief={brief} setBrief={setBrief} onSubmit={startKickoff} />;
  if (stage === 'kickoff') return <Kickoff step={kickoffStep} messages={messages} question={question} busy={busy} error={runtimeError} onSelect={(option) => void askGoal(option.value, option.label)} onCustom={(value) => void askGoal(value, value)} onBack={() => setStage('landing')} />;
  if (stage === 'confirm') return <GoalConfirm goal={goal} onBack={() => setStage('kickoff')} onConfirm={() => void confirmGoal()} />;

  return (
    <div className="app" style={accentStyle}>
      <header className="app-header">
        <button className="logo" type="button" onClick={resetDemo}><span>🎯</span><strong>GoalKeeper</strong></button>
        <button className="new-session" type="button" onClick={resetDemo}>＋ 新建会话</button>
        <div className="header-actions"><div className="history-menu"><button ref={historyTriggerRef} className={`history-trigger ${historyOpen ? 'open' : ''}`} type="button" aria-expanded={historyOpen} onClick={toggleHistory}><i aria-hidden="true">↺</i><span>历史会话</span></button>{historyOpen && <SessionHistory sessions={sessions} busy={sessionsBusy} activeId={artifact?.artifact_id ?? ''} accent={goal.color} triggerRef={historyTriggerRef} onPick={(session) => void openSession(session)} onClose={() => setHistoryOpen(false)} />}</div></div>
      </header>
      <div className="studio-shell">
        {goalOpen && <button className="goal-scrim" type="button" aria-label="收起目标详情" onClick={() => setGoalOpen(false)} />}
        <GoalDock goal={goal} open={goalOpen} setOpen={setGoalOpen} stage={stage} deviations={deviations} history={goalHistory} cast={goalCast} onCastEnd={() => setGoalCast(false)} />
        <main className="studio">
          <Conversation messages={messages} composer={composer} setComposer={setComposer} onSubmit={(event) => void submitComposer(event)} stage={stage} busy={busy} guard={guardReview} onGuard={(action) => void resolveGuard(action)} />
          <section className="workbench">
            {stage === 'generating' && <Generating goal={goal} goalType={goalType} elapsed={elapsed} status={runtimeStatus} />}
            {stage === 'done' && artifact && <Result artifact={artifact} onArtifactChange={setArtifact} onEdit={(prompt) => setComposer(prompt)} />}
            {stage === 'guard' && artifact && guardReview && <GuardImpact review={guardReview} html={artifact.html} onResolve={(action) => void resolveGuard(action)} />}
            {stage === 'error' && <RuntimeError message={runtimeError} onRetry={() => void executeBuild('create', '', { ...goalDraft, status: 'active' })} />}
            {runtimeError && stage !== 'error' && <div className="runtime-toast"><span>⚠️ {runtimeError}</span><button type="button" onClick={() => setRuntimeError('')}>×</button></div>}
          </section>
        </main>
      </div>
    </div>
  );
}

function Landing({ brief, setBrief, onSubmit }: { brief: string; setBrief: (value: string) => void; onSubmit: (event: FormEvent) => void }) {
  return <div className="landing">
    <header className="landing-header"><div className="logo-static"><span>🎯</span><strong>GoalKeeper</strong></div><span>目标驱动的AI生产系统</span></header>
    <main className="landing-main">
      <div className="hero-orbit"><i /><span>🎯</span></div>
      <p className="eyebrow">GOAL-FIRST AI CREATION</p>
      <h1>同样需求不同目标，创作不同作品</h1>
      <p className="hero-sub">GoalKeeper 会先了解你需求背后的目的，创作时依据你的目的去设计。</p>
      <form className="creation-box" onSubmit={onSubmit}>
        <textarea value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="例如：做一个城市漫游人格测试，看看我属于哪种探索者……" autoFocus />
        <div className="creation-actions"><button type="button" className="soft-button">＋ 上传参考图</button><span>{brief.length}/1000</span><button className="primary-button" type="submit">开始创建 <b>→</b></button></div>
      </form>
      <div className="difference-line"><span>01 锁定目标</span><i>→</i><span>02 双轨生产</span><i>→</i><span>03 目标守卫</span><i>→</i><span>04 验收交付</span></div>
    </main>
  </div>;
}

// Waiting on the LLM used to render one static line, which read as a hang. Rotating phases
// plus a live elapsed counter make the wait legible without inventing fake progress.
const THINKING_PHASES = [
  { title: '正在理解你的回答…', hint: '把你刚才的选择归入目标草稿。' },
  { title: '正在比对已知信息…', hint: '看目标、用户、期待行为还缺哪一块。' },
  { title: '正在决定下一步…', hint: '挑一个最能减少模糊的问题。' },
  { title: '快好了…', hint: '正在把问题和备选项整理成你能直接选的形式。' },
];

function GoalThinking() {
  const [phase, setPhase] = useState(0);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const tick = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(tick);
  }, []);
  useEffect(() => {
    // Hold on the last phase instead of looping, so it never claims to restart work.
    if (phase >= THINKING_PHASES.length - 1) return;
    const next = window.setTimeout(() => setPhase((value) => value + 1), phase === 0 ? 2600 : 3400);
    return () => window.clearTimeout(next);
  }, [phase]);
  const active = THINKING_PHASES[Math.min(phase, THINKING_PHASES.length - 1)];
  return (
    <div className="assistant-question thinking">
      <div className="bot-avatar pulsing">GK</div>
      <div>
        <p key={active.title} className="thinking-line">{active.title}<i className="thinking-dots" aria-hidden="true"><em /><em /><em /></i></p>
        <small key={active.hint}>{active.hint}</small>
        <div className="thinking-track" aria-hidden="true"><span /></div>
        <div className="thinking-meta">
          {THINKING_PHASES.map((item, index) => <b key={item.title} className={index <= phase ? 'on' : ''} />)}
          <span>{seconds >= 1 ? `已用 ${seconds} 秒` : ''}</span>
        </div>
      </div>
    </div>
  );
}

function Kickoff({ step, messages, question, busy, error, onSelect, onCustom, onBack }: { step: number; messages: ChatItem[]; question: GoalQuestion; busy: boolean; error: string; onSelect: (option: { label: string; value: string }) => void; onCustom: (value: string) => void; onBack: () => void }) {
  const [custom, setCustom] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, question, busy]);
  const submitCustom = () => { if (custom.trim() && !busy) { onCustom(custom.trim()); setCustom(''); } };
  return <div className="kickoff-page">
    <header className="landing-header"><div className="logo-static"><span>🎯</span><strong>GoalKeeper</strong></div><span>正在理解目标 · 第 {Math.max(1, step)} 轮</span></header>
    <main className="kickoff-card">
      <div className="kickoff-head"><div><p>GOAL KICKOFF</p><h1>确定你需求背后的目标</h1></div><button type="button" onClick={onBack}>×</button></div>
      <div className="kickoff-scroll" ref={scrollRef}>
        {messages.map((message) => <div className={`mini-message ${message.role}`} key={message.id}>{message.content}</div>)}
        {busy && <GoalThinking />}
        {!busy && question.text && <div className="assistant-question"><div className="bot-avatar">GK</div><div><p>{question.text}</p><small>选择最接近的答案，也可以在下方用自己的话补充。</small></div></div>}
        <div className={`option-grid step-${step}`}>
          {!busy && question.options.map((option) => <button type="button" key={`${option.label}-${option.value}`} onClick={() => onSelect(option)}><strong>{option.label}</strong></button>)}
        </div>
        {error && <div className="kickoff-error">⚠️ {error}</div>}
      </div>
      <div className="kickoff-input"><input value={custom} disabled={busy} onChange={(event) => setCustom(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submitCustom(); }} placeholder="也可以在这里输入自己的答案……" /><button type="button" disabled={busy || !custom.trim()} onClick={submitCustom}>→</button></div>
    </main>
  </div>;
}

function GoalConfirm({ goal, onBack, onConfirm }: { goal: GoalView; onBack: () => void; onConfirm: () => void }) {
  return <div className="confirm-page" style={{ '--accent': goal.color } as React.CSSProperties}>
    <header className="landing-header"><div className="logo-static"><span>🎯</span><strong>GoalKeeper</strong></div><span>目标确认</span></header>
    <main className="confirm-card">
      <div className="lock-mark">🎯</div><p className="eyebrow">READY TO LOCK</p><h1>准备锁定本次目标</h1><p>确认后，所有生成、校验和修改都会以这份目标为依据。</p>
      <div className="confirm-summary">
        <section><span>本次创作目标</span><strong>{goal.label}</strong><p>{goal.summary}</p></section>
        <div className="summary-columns"><section><span>主要用户</span><strong>{goal.audience}</strong></section><section><span>期待结果</span>{goal.outcomes.map((item) => <i key={item}>✓ {item}</i>)}</section></div>
        <div className="summary-columns"><section><span>成功标准</span>{goal.metrics.map((item) => <i key={item}>✓ {item}</i>)}</section><section><span>禁止项</span>{goal.forbidden.map((item) => <i className="forbid" key={item}>× {item}</i>)}</section></div>
      </div>
      <div className="confirm-actions"><button type="button" onClick={onBack}>继续调整</button><button className="primary-button" type="button" onClick={onConfirm}>确认目标并开始生成 →</button></div>
    </main>
  </div>;
}

/**
 * Composer suggestions after a build lands. One cosmetic edit that passes the
 * goal guard and lands a new version, one that knowingly breaks the locked
 * contract so the guard's interception path is reachable in a single click.
 */
const COMPOSER_SUGGESTIONS = [
  '把首页标题字号调小一点',
  '把题目改成 10 道',
];

function Conversation({ messages, composer, setComposer, onSubmit, stage, busy, guard, onGuard }: { messages: ChatItem[]; composer: string; setComposer: (value: string) => void; onSubmit: (event: FormEvent) => void; stage: Stage; busy: boolean; guard: GuardReview | null; onGuard: (action: 'cancel' | 'alternative' | 'force') => void }) {
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, stage]);

  return <aside className="conversation">
    <div className="chat-list">
      {messages.map((message) => <div key={message.id} className={`chat-message ${message.role}`}>{message.role === 'assistant' && <span className="bot-avatar">GK</span>}<div>{message.content}</div></div>)}
      {stage === 'guard' && guard && <div className="guard-chat-card"><i className="guard-chat-flash" key={guard.summary} aria-hidden="true" /><span className="guard-icon">🛡️</span><div><p>目标守卫已介入</p><h3>{guard.summary}</h3><small>{guard.reason}</small>{guard.alternative?.title && <div className="alternative"><b>推荐替代</b><span>{guard.alternative.title}</span></div>}<div className="guard-chat-actions"><button type="button" onClick={() => onGuard('cancel')}>取消</button><button type="button" onClick={() => onGuard('alternative')}>采用替代方案</button><button className="danger" type="button" onClick={() => onGuard('force')}>仍然修改</button></div></div></div>}
      {busy && (stage === 'generating'
        ? <div className="chat-progress-note"><span>作品正在右侧生成</span><small>完成后可以直接在这里提修改意见</small></div>
        : <div className="typing"><span /><span /><span /> GoalKeeper 正在处理</div>)}
      <div ref={chatEndRef} className="chat-end-anchor" />
    </div>
    <div className="suggestion-chips">{stage === 'done' && COMPOSER_SUGGESTIONS.map((item) => <button key={item} type="button" onClick={() => setComposer(item)}>{item}</button>)}</div>
    <form className="composer" onSubmit={onSubmit}><textarea value={composer} disabled={busy || !['done', 'guard'].includes(stage)} onChange={(event) => setComposer(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder={busy ? '正在处理当前请求……' : '告诉GoalKeeper下一步怎么改……'} /><div><span>Enter发送 · Shift+Enter换行</span><button type="submit" disabled={busy || !composer.trim() || stage !== 'done'}>→</button></div></form>
  </aside>;
}

function GoalDock({ goal, open, setOpen, stage, deviations, history, cast, onCastEnd }: { goal: GoalView; open: boolean; setOpen: (value: boolean) => void; stage: Stage; deviations: number; history: GoalHistoryItem[]; cast: boolean; onCastEnd: () => void }) {
  const risky = stage === 'guard';
  const changeCount = history.filter((item) => item.kind === 'changed').length;
  const showCast = cast && !open;
  return <div className={`goal-dock ${open ? 'open' : ''} ${risky ? 'risky' : ''} ${showCast ? 'casting' : ''}`}>
    <button className="goal-dock-summary" type="button" onClick={() => { onCastEnd(); setOpen(!open); }}><span className="goal-symbol">{risky ? '⚠️' : '🎯'}</span><div><small>{risky ? '检测到目标偏移风险' : '当前生效目标'}</small><strong>{goal.label}</strong><p>{risky ? '付费墙可能中断首次体验路径' : goal.rules.join(' · ')}</p></div><div className="goal-version"><small>{risky ? '守卫审查中' : '目标变更'}</small><b className={changeCount ? 'goal-change-count' : 'goal-change-count none'}>{changeCount}<em>次</em></b></div><span className="dock-arrow">{open ? '⌃' : '⌄'}</span></button>
    {showCast && <div className="goal-cast" role="status" aria-live="polite">
      <div className="goal-cast-head"><span>目标已锁定</span><small>本次创作和检查的唯一依据</small></div>
      <section className="goal-contract-panel goal-cast-panel"><header><span>🎯 目标契约</span><small>{changeCount ? `目标已变更 ${changeCount} 次` : '目标自确认后未变更'}</small></header><div className="goal-description"><span>目标描述</span><p>{goal.summary}</p></div><div className="goal-rules-grid"><section><span>成功标准</span>{goal.metrics.map((item) => <i key={item}>✓ {item}</i>)}</section><section><span>必须遵守</span>{goal.rules.map((item) => <i key={item}>✓ {item}</i>)}</section><section><span>禁止项</span>{goal.forbidden.map((item) => <i className="forbid" key={item}>× {item}</i>)}</section></div></section>
      <div className="goal-cast-timer"><i /></div>
    </div>}
    {open && <div className="goal-details">
      <section className="goal-contract-panel"><header><span>🎯 目标契约</span><small>{changeCount ? `目标已变更 ${changeCount} 次` : '目标自确认后未变更'}</small></header><div className="goal-description"><span>目标描述</span><p>{goal.summary}</p></div><div className="goal-rules-grid"><section><span>成功标准</span>{goal.metrics.map((item) => <i key={item}>✓ {item}</i>)}</section><section><span>必须遵守</span>{goal.rules.map((item) => <i key={item}>✓ {item}</i>)}</section><section><span>禁止项</span>{goal.forbidden.map((item) => <i className="forbid" key={item}>× {item}</i>)}</section></div></section>
      <section className="goal-history goal-history-panel"><div className="goal-history-title"><span>🕘 历史目标与决策</span><small>{history.length || 1}条记录</small></div><div className="goal-history-scroll">{history.length ? history.map((item) => <div className={`goal-history-item ${item.kind}`} key={item.id}><i>{item.kind === 'changed' ? '↻' : item.kind === 'risk' ? '⚠' : '✓'}</i><div><strong>{item.title}</strong><p>{item.detail}</p></div><time>{item.time}</time></div>) : <div className="goal-history-empty">✓ 当前目标已确认，暂未发生变更</div>}</div><footer><span>已记录偏移决策：{deviations}次</span><span>最后确认：刚刚</span></footer></section>
    </div>}
  </div>;
}

const TOOL_CAST_MS = 7000;

function Generating({ goal, goalType, elapsed, status }: { goal: GoalView; goalType: GoalType; elapsed: number; status: string }) {
  const tools = TOOL_RECOMMENDATIONS[goalType];
  const [toolIndex, setToolIndex] = useState(0);
  const [manual, setManual] = useState(false);
  // One ad card at a time, looping, so it never looks like a finished result.
  // Any manual pick stops the rotation so reading is never interrupted.
  useEffect(() => {
    if (manual) return;
    const timer = window.setTimeout(() => setToolIndex((value) => (value + 1) % tools.length), TOOL_CAST_MS);
    return () => window.clearTimeout(timer);
  }, [manual, toolIndex, tools.length]);
  const activeIndex = Math.min(toolIndex, tools.length - 1);
  return <div className="generation-stage simple-generating">
    <div className="generation-heading"><div><p>正在围绕目标创作</p><h2>正在生成你的「{goal.label}版」作品</h2></div><div className="actual-time"><span>{elapsed}s</span><small>已用时间</small></div></div>
    <div className="generating-canvas">
      <section className="creation-animation" aria-label="作品生成中">
        <div className="animation-scene">
          <div className="animation-window">
            <i className="float-shape shape-star">✦</i><i className="float-shape shape-chat">◯</i><i className="float-shape shape-user">◎</i><i className="float-shape shape-dot">●</i>
            <div className="tool-cast tool-cast-inline" aria-label="推广推荐，不是生成结果">
              <i className="tool-cast-flash" key={activeIndex} aria-hidden="true" />
              <header className="tool-cast-head"><span className="tool-cast-flag">广告 · 合作工具</span><small>作品仍在生成，这不是你的结果</small></header>
              <div className="tool-cast-stage">
                {tools.map((tool, index) => <a
                  className={`tool-cast-card ${index === activeIndex ? "active" : index < activeIndex ? "past" : "next"}`}
                  key={tool.name} href={tool.href} target="_blank" rel="noreferrer nofollow sponsored"
                  aria-hidden={index !== activeIndex} tabIndex={index === activeIndex ? 0 : -1}
                >
                  <span className="tool-cast-row"><span className="tool-cast-icon">{tool.icon}</span><span className="tool-cast-titles"><b className="tool-cast-category">{tool.category}</b><strong className="tool-cast-name">{tool.name}</strong></span></span>
                  <p className="tool-cast-timing">{tool.timing}</p>
                  <p className="tool-cast-value">{tool.value}</p>
                  <i className="tool-cast-open">去看看 ↗</i>
                </a>)}
              </div>
              <div className="tool-cast-dots">
                {tools.map((tool, index) => <button
                  key={tool.name} type="button" aria-label={`查看${tool.name}`} aria-current={index === activeIndex}
                  className={index === activeIndex ? "on" : ""}
                  onClick={() => { setManual(true); setToolIndex(index); }}
                />)}
              </div>
            </div>
          </div>
        </div>
      </section>
      <footer className="generation-progress" role="status" aria-live="polite">
        <span className="progress-pulse" aria-hidden="true"><i /><i /><i /></span>
        <p>{status}</p>
      </footer>
    </div>
  </div>;
}
const rowId = (item: DesignDecision, index: number): string => item.decision_id || `${item.state || item.anchor_id}-${index}`;

function Result({ artifact, onArtifactChange, onEdit }: { artifact: BuildArtifact; onArtifactChange: (artifact: BuildArtifact) => void; onEdit: (prompt: string) => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [insightOpen, setInsightOpen] = useState(true);
  const [followPreview, setFollowPreview] = useState(true);
  const [activeDesignId, setActiveDesignId] = useState(rowId(artifact.design_decisions[0] ?? ({} as DesignDecision), 0));
  const [locateHint, setLocateHint] = useState('');
  const [hintOpen, setHintOpen] = useState(false);
  const [deviceId, setDeviceId] = useState('mobile');
  const [fitScale, setFitScale] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [autoFit, setAutoFit] = useState(true);
  const [frameKey, setFrameKey] = useState(0);
  const [versions, setVersions] = useState<number[]>([]);
  const [versionBusy, setVersionBusy] = useState(false);
  const interpretation = useMemo(() => ({
    summary: artifact.design_summary || `${artifact.design_decisions.length}处设计围绕当前目标落实到作品中`,
    items: artifact.design_decisions.map((item, index) => ({
      id: rowId(item, index),
      // Highlighting needs the scene state: several scenes share one anchor value.
      locateId: item.state || item.anchor_id,
      location: item.location, title: item.title, reason: item.explanation,
      goal: item.goal_link ?? '', verify: item.verify_action ?? '',
    })),
  }), [artifact.design_decisions, artifact.design_summary]);
  const gameHtml = artifact.html;
  const activeInsight = interpretation.items.find((item) => item.id === activeDesignId) ?? interpretation.items[0];
  const devices = [
    { id: 'small', label: '小屏手机', width: 320, height: 568 },
    { id: 'mobile', label: '标准手机', width: 375, height: 667 },
    { id: 'large', label: '大屏手机', width: 430, height: 932 },
    { id: 'tablet', label: '平板', width: 768, height: 1024 },
    { id: 'desktop', label: '桌面端', width: 1280, height: 720 },
  ];
  const device = devices.find((item) => item.id === deviceId) ?? devices[1];
  const displayScale = fitScale * (zoom / 100);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    const measure = () => {
      const rect = preview.getBoundingClientRect();
      setFitScale(Math.min((rect.width - 36) / device.width, (rect.height - 28) / device.height, 1));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(preview);
    return () => observer.disconnect();
  }, [device.width, device.height, insightOpen]);

  useEffect(() => {
    const onPreviewEvent = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow || !followPreview) return;
      if (event.data?.type === 'GK_DESIGN_LOCATED') { setLocateHint(event.data.found ? '' : String(event.data.hint ?? '')); return; }
      if (event.data?.type !== 'GK_DESIGN_EVENT') return;
      const reported = String(event.data.scene_id ?? ''), state = String(event.data.designId ?? '');
      const match = interpretation.items.find((item) => reported && artifact.design_decisions.find((d, i) => rowId(d, i) === item.id)?.scene_id === reported)
        ?? interpretation.items.find((item) => item.locateId === state);
      if (match) setActiveDesignId(match.id);
    };
    window.addEventListener('message', onPreviewEvent);
    return () => window.removeEventListener('message', onPreviewEvent);
  }, [followPreview, interpretation.items, artifact.design_decisions]);

  useEffect(() => {
    if (!artifact.artifact_id) { setVersions([]); return; }
    fetch(`/api/v5/artifacts/${encodeURIComponent(artifact.artifact_id)}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('版本列表读取失败')))
      .then((payload: { versions?: number[] }) => setVersions(Array.isArray(payload.versions) ? payload.versions : []))
      .catch(() => setVersions([]));
  }, [artifact.artifact_id, artifact.version_no]);

  const rollbackVersion = async (versionNo: number) => {
    if (!artifact.artifact_id || versionNo === artifact.version_no || versionBusy) return;
    setVersionBusy(true);
    try {
      const rollback = await fetch(`/api/v5/artifacts/${encodeURIComponent(artifact.artifact_id)}/rollback`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version_no: versionNo }) });
      if (!rollback.ok) throw new Error('版本回滚失败');
      const response = await fetch(`/api/v5/artifacts/${encodeURIComponent(artifact.artifact_id)}?version=${versionNo}`);
      const payload = await response.json() as Record<string, unknown>;
      const restored = (payload.artifact && typeof payload.artifact === 'object' ? payload.artifact : {}) as Record<string, unknown>;
      onArtifactChange({ ...artifact, ...restored, html: String(restored.html ?? artifact.html), version_no: Number(payload.version_no ?? versionNo), artifact_id: artifact.artifact_id });
      setFrameKey((value) => value + 1);
    } finally { setVersionBusy(false); }
  };

  const locateDesign = (rowKey: string, locateId: string) => {
    setActiveDesignId(rowKey);
    setLocateHint('');
    iframeRef.current?.contentWindow?.postMessage({ type: 'GK_LOCATE_DESIGN', designId: locateId }, '*');
  };

  const adjustZoom = (delta: number) => {
    setAutoFit(false);
    setZoom((value) => Math.max(40, Math.min(160, value + delta)));
  };

  const downloadHtml = () => {
    const url = URL.createObjectURL(new Blob([gameHtml], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `goalkeeper-v${artifact.version_no}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const deliveryLabel = artifact.template?.deliveryLabel || String(artifact.manifest.delivery_label ?? '互动作品');
  const workLabel = artifact.template?.workLabel || String(artifact.manifest.work_label ?? '智能创作');
  const structureLabel = artifact.template?.structureLabel || String(artifact.manifest.structure_label ?? '目标适配结构');
  return <div className="result-stage">
    <div className="result-toolbar"><div className="preview-title"><span>👁</span><p><strong>预览 · v{artifact.version_no}</strong><small>{deliveryLabel} / {workLabel} / {structureLabel}</small></p><button type="button" title="刷新预览" onClick={() => setFrameKey((value) => value + 1)}>↻</button></div><div className="preview-controls"><label><select value={deviceId} onChange={(event) => { setDeviceId(event.target.value); setAutoFit(true); setZoom(100); }}>{devices.map((item) => <option value={item.id} key={item.id}>{item.label} {item.width}×{item.height}</option>)}</select></label>{versions.length > 1 && <label><select aria-label="版本回滚" disabled={versionBusy} value={artifact.version_no} onChange={(event) => void rollbackVersion(Number(event.target.value))}>{versions.map((version) => <option key={version} value={version}>版本 v{version}</option>)}</select></label>}<div className="zoom-control"><button type="button" onClick={() => adjustZoom(-10)}>−</button><button className={autoFit ? 'active' : ''} type="button" onClick={() => { setAutoFit(true); setZoom(100); }}>{autoFit ? `自适应 ${Math.round(fitScale * 100)}%` : `${Math.round(displayScale * 100)}%`}</button><button type="button" onClick={() => adjustZoom(10)}>＋</button></div><button className="fullscreen-button" type="button" title="全屏预览" onClick={() => previewRef.current?.requestFullscreen()}>⛶</button></div><div className="result-actions"><button type="button" onClick={downloadHtml}>下载HTML</button><button className="primary-button" type="button">发布作品</button></div></div>
    <div className="result-content"><div className="preview-side" ref={previewRef}><div className={`phone-frame device-${deviceId}`} style={{ width: device.width, height: device.height, transform: `translate(-50%, -50%) scale(${displayScale})` }}><div className="notch" /><iframe key={frameKey} ref={iframeRef} title="GoalKeeper 作品预览" srcDoc={gameHtml} sandbox="allow-scripts allow-forms allow-modals" /></div></div><aside className={`design-rail ${insightOpen ? 'open' : 'collapsed'}`}><button className="design-rail-handle" type="button" onClick={() => setInsightOpen(!insightOpen)} aria-label={insightOpen ? '收起设计解读' : '展开设计解读'}>{insightOpen ? '›' : '‹'}</button><div className="design-summary"><span className="design-icon">🎯</span><div><small>设计解读</small><strong>{interpretation.summary}</strong><p><b>{interpretation.items.length}</b> 处设计可逐项定位并验证</p></div></div>{insightOpen && activeInsight && <><div className={`live-design-hint ${hintOpen ? 'open' : 'shut'}`}><button className="design-hint-toggle" type="button" aria-expanded={hintOpen} onClick={() => setHintOpen(!hintOpen)}><span>你正在体验</span><strong>{activeInsight.location} · {activeInsight.title}</strong><i aria-hidden="true">{hintOpen ? '–' : '+'}</i></button><div className="design-hint-body"><p>{activeInsight.reason}</p>{activeInsight.goal && <p className="design-goal-link">{activeInsight.goal}</p>}{activeInsight.verify && <p className="design-verify">怎么验：{activeInsight.verify}</p>}{locateHint && <p className="design-locate-hint">{locateHint}</p>}<button className="design-hint-edit" type="button" onClick={() => onEdit(`只修改${activeInsight.location}中的“${activeInsight.title}”，其他内容和交互保持不变`)}><i aria-hidden="true">✎</i><span>只改这一处</span></button></div></div><div className="design-list"><div className="design-list-head"><span>作品中的目标设计</span><button type="button" className={followPreview ? 'following' : ''} onClick={() => setFollowPreview(!followPreview)}>{followPreview ? '● 跟随试玩' : '○ 跟随已暂停'}</button></div><div className="design-list-scroll">{interpretation.items.map((item, index) => <button key={item.id} type="button" className={`design-card ${activeDesignId === item.id ? 'active' : ''}`} onClick={() => locateDesign(item.id, item.locateId)}><span className="design-index">{String(index + 1).padStart(2, '0')}</span><div><small>{item.location}</small><strong>{item.title}</strong><p>{item.reason}</p>{item.goal && <em className="design-goal">{item.goal}</em>}<i>在预览中定位 →</i></div></button>)}</div></div></>}</aside></div>
  </div>;
}

const GUARD_PREVIEW = { width: 375, height: 667 };

function GuardImpact({ review, html, onResolve }: { review: GuardReview; html: string; onResolve: (action: 'cancel' | 'alternative' | 'force') => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const [activeImpact, setActiveImpact] = useState(0);
  const impactPoints = review.affected_locations;
  const selectImpact = (index: number) => {
    setActiveImpact(index);
    const anchor = impactPoints[index]?.anchor_id;
    if (anchor) iframeRef.current?.contentWindow?.postMessage({ type: 'GK_LOCATE_DESIGN', designId: anchor }, '*');
  };
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    // The guard preview must render at the same device size as the result preview, otherwise the
    // artifact CSS (written for a phone viewport) overflows and shows scrollbars.
    const measure = () => {
      const rect = stage.getBoundingClientRect();
      setFitScale(Math.min((rect.width - 32) / GUARD_PREVIEW.width, (rect.height - 26) / GUARD_PREVIEW.height, 1));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);
  const severityLabel = { low: '低', medium: '中', high: '高' } as const;
  const maxSeverity = impactPoints.some((item) => item.severity === 'high') ? '高' : impactPoints.some((item) => item.severity === 'medium') ? '中' : '低';

  return <div className="guard-impact impact-preview-stage">
    <div className="impact-preview-toolbar"><div><span>🛡️</span><p><small>目标守卫已启动</small><strong>已在原版作品中定位 {impactPoints.length} 处受影响位置</strong></p></div><b>综合风险：{maxSeverity}</b></div>
    <div className="impact-preview-layout">
      <section className="impact-work-preview" ref={stageRef}>
        <div className="impact-phone original highlighted" style={{ width: GUARD_PREVIEW.width, height: GUARD_PREVIEW.height, transform: `scale(${fitScale})` }}><div className="impact-notch" /><iframe ref={iframeRef} title="受影响位置预览" srcDoc={html} sandbox="allow-scripts allow-forms allow-modals" /></div>
        <div className="impact-preview-caption changed">点击右侧影响项，可在原作品中定位 · 当前查看 {String(activeImpact + 1).padStart(2, '0')}</div>
      </section>
      <aside className="impact-insight-rail">
        <header><span>🎯</span><div><small>目标影响 · {impactPoints.length}处</small><strong>{review.summary}</strong></div></header>
        <section className="impact-point-list"><small>修改影响了哪些位置</small>{impactPoints.map((point, index) => <button key={`${point.anchor_id}-${index}`} type="button" className={activeImpact === index ? 'active' : ''} onClick={() => selectImpact(index)}><b>{String(index + 1).padStart(2, '0')}</b><div><span>{point.location}<em className={point.severity === 'high' ? 'high' : ''}>{severityLabel[point.severity]}风险</em></span><strong>{point.impact}</strong><p>{point.goal_relation}</p></div></button>)}</section>
        {review.unmapped_impacts.length > 0 && <section className="impact-cause"><small>其他暂无法定位的影响</small>{review.unmapped_impacts.map((item) => <p key={item}>• {item}</p>)}</section>}
        <section className="impact-cause"><small>为什么与目标冲突</small><p>{review.reason}</p></section>
        <section className="impact-recommendation"><small>更合适的做法</small><h3>💡 {review.alternative.title}</h3><p>{review.alternative.description}</p><p>{review.alternative.why_better}</p></section>
        <footer><button className="protect" type="button" onClick={() => onResolve('alternative')}>采用推荐方案</button><button className="force" type="button" onClick={() => onResolve('force')}>仍然修改</button><button className="cancel" type="button" onClick={() => onResolve('cancel')}>取消</button></footer>
      </aside>
    </div>
  </div>;
}

function RuntimeError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="runtime-error"><span>⚠️</span><h2>这次生成没有完成</h2><p>{message}</p><button className="primary-button" type="button" onClick={onRetry}>重新生成</button></div>;
}
