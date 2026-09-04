export type GoalType = 'viral' | 'marketing' | 'monetize' | 'fun' | 'deliver' | 'unknown';

export type AppStage = 'init' | 'collecting' | 'generating' | 'paused' | 'done' | 'error';

export interface SuccessMetric {
  metric: string;
  target: string;
  rationale?: string;
}

export interface GoalContract {
  goal_type: GoalType;
  target_audience: string;
  core_content: string;
  must_have: string[];
  forbidden: string[];
  success_metrics: SuccessMetric[];
  platforms?: string[];
  brand?: {
    name?: string;
    primary_color?: string;
    tone?: string;
  };
}

export interface QuestionOption {
  label: string;
  value: string;
}

export interface ClarificationQuestion {
  id: string;
  text: string;
  options: QuestionOption[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  questions?: ClarificationQuestion[];
  streaming?: boolean;
  error?: boolean;
}

export interface ToolRecommendation {
  icon: string;
  name: string;
  desc: string;
}

export interface WaitingPreview {
  headline: string;
  strategyPoints: string[];
  tips: Array<{ icon?: string; text: string }>;
}

export interface ActionCard {
  icon: string;
  title: string;
  description: string;
  action_type?: 'copy' | 'checklist' | 'schedule' | 'track';
  copyable_content: string;
}

export interface ValidationSummary {
  passed: boolean;
  warnings: string[];
  attempts: number;
  checksPassed?: number;
}

export interface CompletePayload {
  schema_version: string;
  type: 'complete';
  stage: 'done';
  goal_contract: GoalContract;
  artifact: {
    html: string;
    config: Record<string, unknown>;
    public_url?: string;
  };
  validation: ValidationSummary;
  next_actions: ActionCard[];
  version_no: number;
}

export interface ClarificationPayload {
  schema_version: string;
  type: 'clarification';
  stage: 'collecting';
  goal_contract: GoalContract;
  assistant_message: string;
  questions: ClarificationQuestion[];
}

export interface WaitingPayload {
  schema_version?: string;
  type: 'waiting_content';
  preview: WaitingPreview;
}

export interface ErrorPayload {
  schema_version?: string;
  type: 'error';
  stage: 'error';
  message: string;
  retryable: boolean;
}

export type UiPayload = CompletePayload | ClarificationPayload | WaitingPayload | ErrorPayload;

export interface GuardResult {
  status: 'safe' | 'warning' | 'conflict';
  reason: string;
  impact: string;
  suggestion: string;
  effective_change_request?: string;
}

export type TraceStatus = 'running' | 'completed' | 'warning' | 'error';

export interface TraceItem {
  id: string;
  nodeId: string;
  nodeTitle: string;
  label: string;
  icon: string;
  status: TraceStatus;
  message: string;
  startedAt: number;
  duration?: number;
}

export interface VersionSnapshot {
  versionNo: number;
  html: string;
  config: Record<string, unknown>;
  createdAt: number;
  changeSummary: string;
}

export interface NodeDisplay {
  label: string;
  icon: string;
  stage: number;
  startText: string;
  doneText: string;
}

export interface RuntimeEvent {
  event: string;
  task_id?: string;
  workflow_run_id?: string;
  conversation_id?: string;
  answer?: string;
  message_id?: string;
  data?: {
    id?: string;
    node_id?: string;
    node_type?: string;
    title?: string;
    status?: string;
    outputs?: Record<string, unknown>;
    error?: string;
    elapsed_time?: number;
    total_tokens?: number;
    total_steps?: number;
    form_token?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface HumanInputForm {
  form_content: string;
  inputs: Array<Record<string, unknown>>;
  resolved_default_values: Record<string, string>;
  user_actions: Array<{
    id: string;
    title: string;
    button_style: string;
  }>;
  expiration_time: number | null;
}
