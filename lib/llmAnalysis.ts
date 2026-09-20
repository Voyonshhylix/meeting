import type { LlmAnalysis, Gap, GapType, Summary, Meeting } from './types';

const DEFAULT_GAP_TYPE: GapType = 'action-incomplete';

/** 把大模型返回的 blocking / followUp issues 映射成与现有规则引擎相同的 Gap 结构，
 *  从而直接复用 Prepare to End 的「转行动项 / 记录例外 / 返回讨论」逻辑。 */
export function llmToGaps(a: LlmAnalysis): Gap[] {
  const conv = (it: LlmAnalysis['blockingIssues'][number], sev: 'blocker' | 'followup'): Gap => ({
    id: it.id,
    type: (it.type as GapType) || DEFAULT_GAP_TYPE,
    severity: sev,
    title: it.title,
    detail: it.detail ?? '',
    suggestion: it.suggestion ?? '',
  });
  return [...a.blockingIssues.map((i) => conv(i, 'blocker')), ...a.followUpIssues.map((i) => conv(i, 'followup'))];
}

/** 把大模型返回的结构化结果映射成现有 Summary 形状（不输出一大段流水账）。 */
export function llmToSummary(m: Meeting, a: LlmAnalysis): Summary {
  return {
    title: m.title,
    finishedAt: m.finishedAt ?? new Date().toISOString(),
    goals: m.objectives.filter((o) => o.kind === 'goal'),
    conclusions: a.goalCoverage.filter((g) => g.status !== 'missing').map((g) => ({ text: g.text, evidence: [] })),
    decisions: a.decisions.map((d) => ({ text: d.text, evidence: [], decided: d.decided })),
    openIssues: [
      ...a.blockingIssues.map((i) => ({ text: i.title, reason: '阻塞会议结束' })),
      ...a.followUpIssues.map((i) => ({ text: i.title, reason: i.suggestion ? `可会后跟进 · ${i.suggestion}` : '可会后跟进' })),
    ],
    actions: a.actionItems.map((ai) => ({
      text: ai.text,
      owner: ai.owner && ai.owner !== 'missing' ? ai.owner : '待定',
      due: ai.deadline && ai.deadline !== 'missing' ? ai.deadline : '待定',
    })),
    risks: m.exceptions.map((e) => ({
      text: a.blockingIssues.find((b) => b.id === e.gapId)?.title ?? e.gapId,
      reason: e.reason || '未填写',
    })),
  };
}
