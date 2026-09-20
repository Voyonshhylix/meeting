import type {
  Meeting,
  CoverageReport,
  ItemCoverage,
  StageCoverage,
  SpeakerCoverage,
  Evidence,
  Gap,
  Summary,
  Objective,
} from './types';
import { extractKeywords, matchScore, hasDecisionSignal, findOwner, findDue, formatTime } from './nlp';

const TH_STRONG = 0.6;
const TH_HIT = 0.34;
const TH_WEAK = 0.18;

export function keywordsOf(o: Objective): string[] {
  return (o.keywords && o.keywords.length ? o.keywords : extractKeywords(o.text));
}

export function computeCoverage(m: Meeting): CoverageReport {
  const names = m.participants.map((p) => p.name);

  // ---- 目标覆盖 ----
  const items: ItemCoverage[] = m.objectives.map((o) => {
    const kws = keywordsOf(o);
    const hits = m.transcript
      .map((u) => ({ u, s: matchScore(u.text, kws) }))
      .filter((h) => h.s >= TH_WEAK)
      .sort((a, b) => b.s - a.s);
    const ratio = hits.length ? hits[0].s : 0;
    const evidence: Evidence[] = hits.slice(0, 3).map((h) => ({
      utteranceId: h.u.id,
      t: h.u.t,
      speaker: h.u.speaker,
      text: h.u.text,
    }));

    let status: ItemCoverage['status'] = 'missing';
    const owner = evidence.length ? findOwner(evidence.map((e) => e.text).join('。'), names) : undefined;
    const due = evidence.length ? findDue(evidence.map((e) => e.text).join('。')) : undefined;

    if (o.kind === 'decision') {
      const decided = ratio >= TH_HIT && evidence.some((e) => hasDecisionSignal(e.text));
      status = decided ? 'decided' : ratio >= TH_HIT ? 'discussed' : ratio >= TH_WEAK ? 'mentioned' : 'missing';
    } else if (o.kind === 'action') {
      if (owner && due) status = 'decided';
      else if (ratio >= TH_HIT) status = 'discussed';
      else if (ratio >= TH_WEAK) status = 'mentioned';
      else status = 'missing';
    } else {
      status = ratio >= TH_STRONG ? 'decided' : ratio >= TH_HIT ? 'discussed' : ratio >= TH_WEAK ? 'mentioned' : 'missing';
    }

    const missing: ('owner' | 'due')[] = [];
    if (o.kind === 'action') {
      if (!owner) missing.push('owner');
      if (!due) missing.push('due');
    }
    return { objectiveId: o.id, status, ratio, evidence, owner, due, missing };
  });

  // ---- 环节覆盖 ----
  const stages: StageCoverage[] = m.stages.map((s) => {
    const us = m.transcript.filter((u) => u.stageId === s.id);
    const speakers = new Set(us.map((u) => u.speaker));
    return {
      stageId: s.id,
      name: s.name,
      covered: us.length > 0,
      utterances: us.length,
      missingSpeakers: s.requiredSpeakers.filter((r) => !speakers.has(r)),
    };
  });

  // ---- 发言人覆盖 ----
  const speakers: SpeakerCoverage[] = m.participants.map((p) => {
    const us = m.transcript.filter((u) => u.speaker === p.name);
    return {
      name: p.name,
      role: p.role,
      spoke: us.length > 0,
      count: us.length,
      words: us.reduce((a, u) => a + u.text.length, 0),
    };
  });

  // ---- 完成度评分（must 权重 1，should 0.5，note 不计） ----
  let total = 0;
  let got = 0;
  m.objectives.forEach((o) => {
    const w = o.priority === 'must' ? 1 : o.priority === 'should' ? 0.5 : 0;
    total += w;
    const c = items.find((i) => i.objectiveId === o.id)!;
    got += w * (c.status === 'decided' ? 1 : c.status === 'discussed' ? 0.5 : c.status === 'mentioned' ? 0.2 : 0);
  });
  const score = total ? Math.round((got / total) * 100) : 0;

  // ---- 会中主动提示（Nice-to-have：AI 主动提示缺少的内容） ----
  const nudges: string[] = [];
  m.objectives.forEach((o) => {
    const c = items.find((i) => i.objectiveId === o.id)!;
    if (o.priority !== 'must') return;
    if (o.kind === 'decision' && c.status !== 'decided') {
      if (c.status === 'missing') nudges.push(`还没有讨论「${o.text}」，建议现在补上，否则会议结束前无法达成目标。`);
      else nudges.push(`「${o.text}」已讨论但还没有明确决策，建议主持人现在拍板。`);
    }
    if (o.kind === 'action' && c.status !== 'decided' && c.evidence.length) {
      nudges.push(`行动项「${o.text}」还缺${c.missing.map((x) => (x === 'owner' ? '负责人' : '截止时间')).join('和') || '确认'}。`);
    }
    if ((o.kind === 'goal' || o.kind === 'conclusion') && c.status === 'missing') {
      nudges.push(`目标项「${o.text}」还没被讨论到。`);
    }
  });
  stages.forEach((s) => {
    const st = m.stages.find((x) => x.id === s.stageId)!;
    if (!s.covered) return;
    // 该环节已进行，但必须发言人还没表态
    const laterHasSpeech = m.stages.slice(m.stages.indexOf(st) + 1).some((x) => m.transcript.some((u) => u.stageId === x.id));
    if (!laterHasSpeech) return;
    s.missingSpeakers.forEach((r) => {
      const p = m.participants.find((x) => x.name === r);
      const related = m.objectives.find((o) => o.stageId === st.id && o.priority === 'must');
      nudges.push(
        `${p ? p.role + ' ' : ''}${r} 还没有在「${s.name}」环节表态${related ? `，该环节需要确认：${related.text}` : ''}。`,
      );
    });
  });
  const lastT = m.transcript.length ? Math.max(...m.transcript.map((u) => u.t)) : 0;
  const planned = m.stages.reduce((a, s) => a + s.minutes, 0) * 60;
  if (planned && lastT > planned * 0.6) {
    const undone = stages.filter((s) => !s.covered).map((s) => s.name);
    if (undone.length) nudges.push(`会议已过 ${formatTime(lastT)}，还有 ${undone.length} 个环节未进行：${undone.join('、')}。`);
  }

  return { items, stages, speakers, score, nudges: nudges.slice(0, 6) };
}

const severityOf = (o?: Objective) => (o && o.priority === 'must' ? 'blocker' : 'followup');

export function buildGaps(m: Meeting, cov: CoverageReport): Gap[] {
  const gaps: Gap[] = [];

  // 1) 目标 / 结论 / 决策 / 行动项缺口
  m.objectives.forEach((o) => {
    const c = cov.items.find((i) => i.objectiveId === o.id)!;
    const sev = severityOf(o);
    if (o.kind === 'decision') {
      if (c.status === 'missing') {
        gaps.push({
          id: `gap:${o.id}`,
          type: 'topic-missing',
          severity: sev,
          title: `必须决策项未讨论：${o.text}`,
          detail: '整场会议没有出现与该决策相关的内容。',
          suggestion: `直接问一句：「${o.text}，今天能不能定下来？」`,
          objectiveId: o.id,
          stageId: o.stageId,
        });
      } else if (c.status !== 'decided') {
        gaps.push({
          id: `gap:${o.id}`,
          type: 'discussed-not-decided',
          severity: sev,
          title: `讨论过但没有决定：${o.text}`,
          detail: `相关发言 ${c.evidence.length} 处（${c.evidence.map((e) => e.speaker).join('、')}），但没有出现明确结论。`,
          suggestion: '让主持人复述两个选项并当场拍板，避免会后再拉一次会。',
          objectiveId: o.id,
          stageId: o.stageId,
        });
      }
    } else if (o.kind === 'action') {
      if (c.status !== 'decided') {
        const lack = c.missing.map((x) => (x === 'owner' ? '负责人' : '截止时间')).join('和') || '负责人与截止时间';
        gaps.push({
          id: `gap:${o.id}`,
          type: 'action-incomplete',
          severity: sev,
          title: `行动项不完整：${o.text}`,
          detail: c.evidence.length ? `已提及，但缺少${lack}。` : `完全没有提及，缺少${lack}。`,
          suggestion: '当场指定 owner 并给出可验收的日期，例如「王睿，9 月 24 号前」。',
          objectiveId: o.id,
          stageId: o.stageId,
        });
      }
    } else if (c.status === 'missing') {
      gaps.push({
        id: `gap:${o.id}`,
        type: 'topic-missing',
        severity: sev,
        title: `${o.kind === 'goal' ? '目标项' : '结论项'}未达成：${o.text}`,
        detail: '会议中没有相关内容，无法判断是否达成。',
        suggestion: '补 2 分钟定向讨论，或明确改为会后跟进。',
        objectiveId: o.id,
        stageId: o.stageId,
      });
    }
  });

  // 2) 必发言人缺口（该环节已进行、且后续环节已开始）
  m.stages.forEach((st, idx) => {
    const sc = cov.stages.find((s) => s.stageId === st.id)!;
    if (!sc.covered) return;
    const laterStarted = m.stages.slice(idx + 1).some((x) => m.transcript.some((u) => u.stageId === x.id));
    if (!laterStarted) return;
    sc.missingSpeakers.forEach((r) => {
      const p = m.participants.find((x) => x.name === r);
      const obj = m.objectives.find((o) => o.stageId === st.id && o.priority === 'must');
      gaps.push({
        id: `gap:spk:${st.id}:${r}`,
        type: 'speaker-missing',
        severity: severityOf(obj),
        title: `${r} 未表态：在「${st.name}」环节未发言`,
        detail: `${p ? p.role + ' · ' : ''}该环节要求 ${st.requiredSpeakers.join('、')} 必须发言，实际缺少 ${r}。`,
        suggestion: `点名确认：「${r}，你的结论是什么？」`,
        stageId: st.id,
        speaker: r,
      });
    });
  });

  // 3) 环节缺口
  m.stages.forEach((st) => {
    const sc = cov.stages.find((s) => s.stageId === st.id)!;
    if (sc.covered) return;
    const anyLater = m.transcript.some((u) => {
      const i = m.stages.findIndex((x) => x.id === u.stageId);
      const j = m.stages.findIndex((x) => x.id === st.id);
      return i > j;
    });
    if (!anyLater && m.transcript.length === 0) return;
    const obj = m.objectives.find((o) => o.stageId === st.id && o.priority === 'must');
    gaps.push({
      id: `gap:stage:${st.id}`,
      type: 'stage-missing',
      severity: severityOf(obj),
      title: `环节未进行：${st.name}`,
      detail: `计划 ${st.minutes} 分钟，会议记录中没有该环节的发言。`,
      suggestion: obj ? '该环节关联了必须完成项，建议补讨论后再结束。' : '可记为会后跟进。',
      stageId: st.id,
    });
  });

  const rank = { blocker: 0, followup: 1 } as const;
  return gaps.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

export function buildSummary(m: Meeting, cov: CoverageReport, gaps: Gap[]): Summary {
  const byObj = (id: string) => cov.items.find((i) => i.objectiveId === id);
  const resolvedMap = new Map(m.resolvedGaps.map((r) => [r.gapId, r.how]));

  const decisions = m.objectives
    .filter((o) => o.kind === 'decision')
    .map((o) => ({ text: o.text, evidence: byObj(o.id)?.evidence ?? [], decided: byObj(o.id)?.status === 'decided' }));

  const conclusions = m.objectives
    .filter((o) => o.kind === 'conclusion' && (byObj(o.id)?.status === 'decided' || byObj(o.id)?.status === 'discussed'))
    .map((o) => ({ text: o.text, evidence: byObj(o.id)?.evidence ?? [] }));

  const actions = m.objectives
    .filter((o) => o.kind === 'action')
    .map((o) => {
      const c = byObj(o.id);
      return {
        text: o.text,
        owner: c?.owner ?? o.owner ?? '待定',
        due: c?.due ?? o.due ?? '待定',
      };
    });

  const openIssues = [
    ...decisions.filter((d) => !d.decided).map((d) => ({ text: d.text, reason: '会上讨论过但未形成决策' })),
    ...gaps
      .filter((g) => g.severity === 'followup' && !resolvedMap.has(g.id))
      .map((g) => ({ text: g.title, reason: '可会后跟进' })),
  ];

  const risks = [
    ...m.exceptions.map((e) => ({
      text: gaps.find((g) => g.id === e.gapId)?.title ?? e.gapId,
      reason: e.reason || '未填写',
    })),
    ...gaps
      .filter((g) => g.severity === 'blocker' && resolvedMap.get(g.id) === 'exception')
      .map((g) => ({ text: g.title, reason: m.exceptions.find((e) => e.gapId === g.id)?.reason ?? '记录例外后结束' })),
  ];

  return {
    title: m.title,
    finishedAt: m.finishedAt ?? new Date().toISOString(),
    goals: m.objectives.filter((o) => o.kind === 'goal'),
    conclusions,
    decisions,
    openIssues,
    actions,
    risks,
  };
}

export function summaryToMarkdown(m: Meeting, s: Summary, cov: CoverageReport): string {
  const L: string[] = [];
  L.push(`# ${s.title} · 会议总结`, '');
  L.push(`- 结束时间：${new Date(s.finishedAt).toLocaleString('zh-CN')}`);
  L.push(`- 目标达成度：${cov.score}%`);
  L.push(`- 记录发言：${m.transcript.length} 条 / 参会 ${m.participants.length} 人`, '');
  L.push('## 一、原会议目标');
  s.goals.forEach((g) => L.push(`- [${g.priority === 'must' ? '必须' : g.priority === 'should' ? '建议' : '记录'}] ${g.text}`));
  L.push('', '## 二、已达成的结论');
  s.conclusions.length
    ? s.conclusions.forEach((c) => {
        L.push(`- ${c.text}`);
        if (c.evidence[0]) L.push(`  - 依据：${c.evidence[0].speaker}「${c.evidence[0].text}」`);
      })
    : L.push('- （本次会议未形成可确认的结论）');
  L.push('', '## 三、决策事项');
  s.decisions.forEach((d) => {
    L.push(`- ${d.decided ? '✅ 已决策' : '⚠️ 未决策'}：${d.text}`);
    if (d.evidence[0]) L.push(`  - 依据：${d.evidence[0].speaker}「${d.evidence[0].text}」`);
  });
  L.push('', '## 四、行动项');
  s.actions.forEach((a) => L.push(`- ${a.text} —— 负责人：${a.owner}｜截止：${a.due}`));
  L.push('', '## 五、未解决的问题');
  s.openIssues.length ? s.openIssues.forEach((o) => L.push(`- ${o.text}${o.reason ? `（${o.reason}）` : ''}`)) : L.push('- 无');
  L.push('', '## 六、保留的风险与例外');
  s.risks.length ? s.risks.forEach((r) => L.push(`- ${r.text} —— 例外原因：${r.reason}`)) : L.push('- 无');
  return L.join('\n');
}
