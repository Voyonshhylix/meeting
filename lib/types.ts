// 有效会议助手 —— 数据模型
export type Priority = 'must' | 'should' | 'note';

export type ObjectiveKind = 'goal' | 'conclusion' | 'decision' | 'action';

export interface Objective {
  id: string;
  kind: ObjectiveKind;
  text: string;
  priority: Priority;
  /** 覆盖匹配用的关键词（模板预置；用户新建时自动从文案提取） */
  keywords?: string[];
  /** 该目标归属的议程环节 */
  stageId?: string;
  /** action 类：期望负责人 */
  owner?: string;
  /** action 类：期望截止时间 */
  due?: string;
  /** 由缺口转换而来 */
  fromGap?: string;
}

export interface AgendaStage {
  id: string;
  name: string;
  /** 计划时长（分钟） */
  minutes: number;
  /** 该环节必须发言的角色/人名 */
  requiredSpeakers: string[];
  desc?: string;
}

export interface Participant {
  name: string;
  role: string;
}

export interface Utterance {
  id: string;
  /** 会议内相对时间（秒） */
  t: number;
  speaker: string;
  role?: string;
  text: string;
  stageId?: string;
}

export interface MeetingTemplate {
  id: string;
  name: string;
  scene: string;
  desc: string;
  mode: string;
  participants: Participant[];
  stages: Omit<AgendaStage, 'id'>[];
  objectives: (Omit<Objective, 'id'> & { id?: string })[];
}

export interface ExceptionRecord {
  id: string;
  gapId: string;
  reason: string;
  at: string;
}

export interface Meeting {
  id: string;
  title: string;
  templateId: string;
  createdAt: string;
  participants: Participant[];
  stages: AgendaStage[];
  objectives: Objective[];
  transcript: Utterance[];
  status: 'planning' | 'live' | 'closing' | 'done';
  exceptions: ExceptionRecord[];
  /** 已被处理的缺口 id */
  resolvedGaps: { gapId: string; how: 'action' | 'exception' | 'continued' }[];
  finishedAt?: string;
  /** 最近一次由大模型 API 分析得到的结构化结果；为空则走内置规则引擎 */
  llmAnalysis?: LlmAnalysis | null;
}

export type ItemStatus = 'decided' | 'discussed' | 'mentioned' | 'missing';

export interface Evidence {
  utteranceId: string;
  t: number;
  speaker: string;
  text: string;
}

export interface ItemCoverage {
  objectiveId: string;
  status: ItemStatus;
  ratio: number;
  evidence: Evidence[];
  owner?: string;
  due?: string;
  missing: ('owner' | 'due')[];
}

export interface StageCoverage {
  stageId: string;
  name: string;
  covered: boolean;
  utterances: number;
  missingSpeakers: string[];
}

export interface SpeakerCoverage {
  name: string;
  role: string;
  spoke: boolean;
  count: number;
  words: number;
}

export interface CoverageReport {
  items: ItemCoverage[];
  stages: StageCoverage[];
  speakers: SpeakerCoverage[];
  score: number;
  /** 会中主动提示 */
  nudges: string[];
}

export type GapType =
  | 'topic-missing'
  | 'speaker-missing'
  | 'decision-missing'
  | 'discussed-not-decided'
  | 'action-incomplete'
  | 'stage-missing';

export interface Gap {
  id: string;
  type: GapType;
  severity: 'blocker' | 'followup';
  title: string;
  detail: string;
  suggestion: string;
  objectiveId?: string;
  stageId?: string;
  speaker?: string;
}

export interface Summary {
  title: string;
  finishedAt: string;
  goals: Objective[];
  conclusions: { text: string; evidence: Evidence[] }[];
  decisions: { text: string; evidence: Evidence[]; decided: boolean }[];
  openIssues: { text: string; reason?: string }[];
  actions: { text: string; owner: string; due: string }[];
  risks: { text: string; reason: string }[];
}

// ============ 大模型 API 返回的结构化会议分析结果 ============
export interface LlmIssue {
  id: string;
  type: string;
  title: string;
  detail?: string;
  suggestion?: string;
}

export interface LlmAnalysis {
  generatedAt: string;
  /** 目标 / 结论 / 决策的覆盖情况 */
  goalCoverage: { objectiveId?: string; text: string; status: 'covered' | 'partial' | 'missing'; note?: string }[];
  /** 议程环节覆盖 */
  agendaCoverage: { stage: string; covered: boolean; note?: string }[];
  /** 发言人覆盖（未发言的人要指出） */
  speakerCoverage: { speaker: string; spoke: boolean; note?: string }[];
  /** 决策事项：讨论过但没决定 -> decided=false */
  decisions: { text: string; decided: boolean; note?: string }[];
  /** 行动项：缺 owner 写 "missing"，缺 deadline 写 "missing" */
  actionItems: { text: string; owner: string; deadline: string }[];
  /** 阻塞会议结束的问题 */
  blockingIssues: LlmIssue[];
  /** 可会后跟进的问题 */
  followUpIssues: LlmIssue[];
  /** 结构化总结正文（不是一大段流水账） */
  summary: string;
  source: 'live' | 'mock';
}
