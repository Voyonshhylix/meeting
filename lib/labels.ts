import type { ObjectiveKind, GapType, ItemStatus } from './types';

/** 同一状态在不同目标类型下的说法不同（决策要「拍板」，行动项要「owner + 截止」） */
export function statusLabel(status: ItemStatus, kind?: ObjectiveKind): string {
  if (status === 'decided')
    return kind === 'decision' ? '已决策' : kind === 'action' ? '已指派 owner / 截止' : '已达成';
  if (status === 'discussed')
    return kind === 'decision' ? '已讨论 · 未决策' : kind === 'action' ? '已提及 · 未指派' : '已讨论 · 未确认';
  if (status === 'mentioned') return '仅提及';
  return '未覆盖';
}

export const KIND_META: Record<ObjectiveKind, { label: string; en: string; tone: string; hint: string }> = {
  goal: { label: '关键目标', en: 'Key Goal', tone: 'indigo', hint: '这场会最重要的目标' },
  conclusion: { label: '关键结论', en: 'Key Conclusion', tone: 'blue', hint: '需要形成哪些结论' },
  decision: { label: '关键决策', en: 'Key Decision', tone: 'amber', hint: '必须做出哪些决策' },
  action: { label: '行动项', en: 'Action Item', tone: 'green', hint: '会后必须产生的行动' },
};

export const GAP_TYPE_LABEL: Record<GapType, string> = {
  'topic-missing': '议题遗漏',
  'speaker-missing': '必发言人未表态',
  'decision-missing': '决策缺失',
  'discussed-not-decided': '讨论过未决定',
  'action-incomplete': '行动项不完整',
  'stage-missing': '环节未进行',
};
