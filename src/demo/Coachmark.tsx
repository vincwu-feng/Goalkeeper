/**
 * Product guided tour.
 *
 * First-time visitors often spend under a minute on the page. Instead of a wall
 * of text, the tour spotlights the real UI element that carries each product
 * idea and explains it in one sentence.
 *
 * Design constraints:
 * - Zero changes to App.tsx. Stage detection is done by reading the DOM.
 * - Every step fires at most once, so the tour never nags on repeated prompts.
 * - "跳过引导" is persisted; a corner switch can bring it back.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import './coachmark.css';

const OFF_KEY = 'gk_demo_guide_off';

type Placement = 'top' | 'bottom' | 'left' | 'right';

type Step = {
  id: string;
  /** Selector identifying which screen the app is on. */
  stage: string;
  /** Element to spotlight. First match wins. */
  target: string;
  eyebrow: string;
  title: string;
  body: string;
  prefer?: Placement;
};

const STEPS: Step[] = [
  {
    id: 'landing-brief',
    stage: '.landing',
    target: '.creation-box',
    eyebrow: '这个产品解决什么问题',
    title: '同样的需求，不同的目标，该做出不同的东西',
    body: '普通 AI 建站/生成工具只看你「要什么」。写一句需求就直接出页面，做出来好不好没有判断依据。GoalKeeper 先问「你为什么要」，把目标变成可校验的契约，再据此生成和验收。',
    prefer: 'right',
  },
  {
    id: 'landing-pipeline',
    stage: '.landing',
    target: '.difference-line',
    eyebrow: '四个环节',
    title: '锁定目标 → 双轨生产 → 目标守卫 → 验收交付',
    body: '每一环都可被检查：目标是结构化契约，生产会产出真实代码工程，守卫拦截偏离目标的修改，交付前跑 17 项浏览器门禁。现在就试着输入一句需求。',
    prefer: 'top',
  },
  {
    id: 'kickoff-question',
    stage: '.kickoff-page',
    target: '.kickoff-card',
    eyebrow: '第 1 环 · 锁定目标',
    title: '它不会直接开始做，而是先问清目标',
    body: '同一句「做个人格测试」，用于抖音引流和用于商业变现，成品结构完全不同。这里每个问题都在补全目标契约里缺的字段，问完即停，不会无限追问。',
    prefer: 'right',
  },
  {
    id: 'confirm-contract',
    stage: '.confirm-page',
    target: '.confirm-summary',
    eyebrow: '目标契约',
    title: '这份契约是后面所有环节的唯一依据',
    body: '目标、用户、期待结果、成功标准、禁止项都会被写成机器可读的结构，交给生成节点，也交给验收门禁。它不是给人看的说明，而是真的会被程序读取。',
    prefer: 'left',
  },
  {
    id: 'generating-goal',
    stage: '.generation-stage',
    target: '.goal-dock-summary',
    eyebrow: '目标常驻',
    title: '目标始终挂在最上方',
    body: '整个创作过程中目标不会被折叠掉。点开可以看到完整契约和历史决策记录，包括每一次目标变更和每一次你选择接受偏移风险。',
    prefer: 'bottom',
  },
  {
    id: 'generating-ad',
    stage: '.generation-stage',
    target: '.animation-window',
    eyebrow: '第 2 环 · 双轨生产',
    title: '等待时间也和你的目标有关',
    body: '生成一份作品需要一分钟以上。这段等待时间的主视觉不放无意义动画，而是按你选的目标推荐能配合完成目标的工具——引流目标推数据埋点，变现目标推收款工具。',
    prefer: 'bottom',
  },
  {
    id: 'result-preview',
    stage: '.result-stage',
    target: '.phone-frame',
    eyebrow: '第 4 环 · 验收交付',
    title: '根据用户需求及目标，AI生成效果',
    body: '手机框里可以直接试玩：5 道题 4 个结果，完全按你确认的目标契约生成。交付前它跑完了全部 17 项浏览器门禁——能加载、主按钮可点、结果可达、文字无遮挡、三档视口无溢出，不过就不交付。',
    prefer: 'left',
  },
  {
    id: 'result-design',
    stage: '.result-stage',
    target: '.design-summary',
    eyebrow: '设计解读',
    title: '每一处设计都要说清为什么这么做',
    body: '这些解读不是事后编的文案，而是由生成时的设计决策直接产出：每条都带位置、目标关联和验证方式。这是「目标导向」能被验证的关键一环。',
    prefer: 'left',
  },
  {
    id: 'result-locate',
    stage: '.result-stage',
    target: '.design-list',
    eyebrow: '可定位',
    title: '点任意一条，预览会跳到对应位置',
    body: '解读和产物之间有双向定位通道。点条目定位到页面，试玩时页面也会反过来高亮当前所处的设计点。还可以「只改这一处」，把修改范围收窄到单点。',
    prefer: 'left',
  },
  {
    id: 'result-composer',
    stage: '.result-stage',
    target: '.composer',
    eyebrow: '第 3 环 · 目标守卫',
    title: '在这里提修改，会先过目标检查',
    body: '试着输入「把标题字号调小一点」——这类视觉修改会直接放行。再试「把题目改成 10 道」——它会被判定为改动已锁定契约并拦下来，给出不破坏目标的替代方案。',
    prefer: 'top',
  },
  {
    id: 'result-history',
    stage: '.result-stage',
    target: '.history-trigger',
    eyebrow: '版本与会话',
    title: '历史会话和版本回滚',
    body: '每次修改都会生成新版本，旧版本随时可回滚对比，在预览工具栏的版本下拉里切换。历史会话也能随时回到之前任何一个作品。',
    prefer: 'bottom',
  },
  {
    id: 'guard-impact',
    stage: '.guard-impact',
    target: '.impact-insight-rail',
    eyebrow: '目标守卫已介入',
    title: '它会指出这次修改会打到哪里',
    body: '守卫不是简单地说「不行」。它在原版作品上定位受影响的位置、说明与目标的关系、给出风险等级，并提供一个能达到你想要的效果又不破坏目标的替代方案。选择权仍在你手上。',
    prefer: 'left',
  },
];

type Rect = { top: number; left: number; width: number; height: number };

function readRect(element: Element): Rect {
  const box = element.getBoundingClientRect();
  return { top: box.top, left: box.left, width: box.width, height: box.height };
}

/** Horizontal pointer position (percent) so the arrow keeps aiming at the target. */
function arrowOffset(rect: Rect, left: number, width: number): number {
  const targetCentre = rect.left + rect.width / 2;
  return Math.min(88, Math.max(12, ((targetCentre - left) / width) * 100));
}

/** Keeps the bubble inside the viewport and off the highlighted element. */
function bubbleStyle(rect: Rect, prefer: Placement): { style: CSSProperties; placement: Placement; arrow: number } {
  const width = Math.min(360, window.innerWidth - 28);
  const gap = 14;
  const estimatedHeight = 240;
  const order: Placement[] = [prefer, 'bottom', 'top', 'right', 'left'];

  for (const placement of order) {
    if (placement === 'bottom' && rect.top + rect.height + gap + estimatedHeight < window.innerHeight) {
      let left = Math.min(Math.max(14, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 14);
      // Never park the bubble dead-centre — push toward the nearer edge.
      if (Math.abs(left + width / 2 - window.innerWidth / 2) / window.innerWidth < 0.13) {
        left = left + width / 2 < window.innerWidth / 2 ? 14 : window.innerWidth - width - 14;
      }
      return { style: { top: rect.top + rect.height + gap, left, width }, placement, arrow: arrowOffset(rect, left, width) };
    }
    if (placement === 'top' && rect.top - gap - estimatedHeight > 0) {
      let left = Math.min(Math.max(14, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 14);
      if (Math.abs(left + width / 2 - window.innerWidth / 2) / window.innerWidth < 0.13) {
        left = left + width / 2 < window.innerWidth / 2 ? 14 : window.innerWidth - width - 14;
      }
      return { style: { top: rect.top - gap - estimatedHeight, left, width }, placement, arrow: arrowOffset(rect, left, width) };
    }
    if (placement === 'right' && rect.left + rect.width + gap + width < window.innerWidth) {
      const top = Math.min(Math.max(14, rect.top + rect.height / 2 - estimatedHeight / 2), window.innerHeight - estimatedHeight - 14);
      return { style: { top, left: rect.left + rect.width + gap, width }, placement, arrow: 50 };
    }
    if (placement === 'left' && rect.left - gap - width > 0) {
      const top = Math.min(Math.max(14, rect.top + rect.height / 2 - estimatedHeight / 2), window.innerHeight - estimatedHeight - 14);
      return { style: { top, left: rect.left - gap - width, width }, placement, arrow: 50 };
    }
  }

  // Never park the bubble dead-centre: that reads as a product modal rather than
  // an annotation. Dock it to whichever side has more free room instead.
  const targetCentreX = rect.left + rect.width / 2;
  const dockLeft = targetCentreX > window.innerWidth / 2 ? 14 : window.innerWidth - width - 14;
  const targetCentreY = rect.top + rect.height / 2;
  const dockTop = targetCentreY > window.innerHeight / 2 ? 14 : window.innerHeight - estimatedHeight - 14;
  return {
    style: { top: Math.max(14, dockTop), left: Math.max(14, dockLeft), width },
    placement: targetCentreX > window.innerWidth / 2 ? 'left' : 'right',
    arrow: 50,
  };
}

export default function Coachmark() {
  const [off, setOff] = useState(() => window.localStorage.getItem(OFF_KEY) === '1');
  const [seen, setSeen] = useState<string[]>([]);
  const [activeId, setActiveId] = useState('');
  const [rect, setRect] = useState<Rect | null>(null);
  const seenRef = useRef<string[]>([]);
  seenRef.current = seen;

  const active = useMemo(() => STEPS.find((step) => step.id === activeId) ?? null, [activeId]);
  const shownCount = seen.length;

  // The app never reports its stage upward, so the tour reads the rendered DOM.
  useEffect(() => {
    if (off) { setActiveId(''); setRect(null); return; }
    const scan = () => {
      const current = seenRef.current;
      const next = STEPS.find((step) => {
        if (current.includes(step.id)) return false;
        if (!document.querySelector(step.stage)) return false;
        const element = document.querySelector(step.target);
        if (!element) return false;
        const box = element.getBoundingClientRect();
        return box.width > 8 && box.height > 8;
      });
      setActiveId((previous) => {
        if (previous && current.includes(previous)) return next?.id ?? '';
        return previous || (next?.id ?? '');
      });
    };
    scan();
    const timer = window.setInterval(scan, 450);
    return () => window.clearInterval(timer);
  }, [off, seen]);

  // Highlight must follow layout changes (goal dock opening, preview rescaling).
  useEffect(() => {
    if (!active) { setRect(null); return; }
    let frame = 0;
    const track = () => {
      const element = document.querySelector(active.target);
      if (element) setRect(readRect(element));
      frame = window.requestAnimationFrame(track);
    };
    track();
    return () => window.cancelAnimationFrame(frame);
  }, [active]);

  const dismiss = useCallback(() => {
    if (!activeId) return;
    setSeen((current) => (current.includes(activeId) ? current : [...current, activeId]));
    setActiveId('');
    setRect(null);
  }, [activeId]);

  const turnOff = useCallback(() => {
    window.localStorage.setItem(OFF_KEY, '1');
    setOff(true);
    setActiveId('');
    setRect(null);
  }, []);

  const turnOn = useCallback(() => {
    window.localStorage.removeItem(OFF_KEY);
    setOff(false);
    setSeen([]);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dismiss]);

  const bubble = rect && active ? bubbleStyle(rect, active.prefer ?? 'bottom') : null;

  return <>
    <div className="demo-badge">
      <span className="demo-badge-dot" aria-hidden="true" />
      <div className="demo-badge-text">
        <strong>GoalKeeper</strong>
        <small>先锁定目标，再据此生成和验收的 AI 创作系统</small>
      </div>
      <button type="button" className={off ? '' : 'on'} onClick={off ? turnOn : turnOff}>
        {off ? '开启引导' : '不用引导'}
      </button>
    </div>

    {active && rect && bubble && <div className="coach-layer" role="dialog" aria-label={active.title}>
      <div
        className="coach-spot"
        style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }}
      />
      <div className={`coach-bubble place-${bubble.placement}`} style={{ ...bubble.style, ['--coach-arrow' as string]: `${bubble.arrow}%` }}>
        <p className="coach-eyebrow">{active.eyebrow}</p>
        <h3>{active.title}</h3>
        <p className="coach-body">{active.body}</p>
        <div className="coach-actions">
          <button type="button" className="coach-skip" onClick={turnOff}>不用引导</button>
          <span className="coach-count">{shownCount + 1} / {STEPS.length}</span>
          <button type="button" className="coach-next" onClick={dismiss}>知道了</button>
        </div>
      </div>
    </div>}
  </>;
}