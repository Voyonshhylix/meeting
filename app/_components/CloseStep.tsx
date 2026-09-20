'use client';

import { useMemo, useState } from 'react';
import type { Gap, Meeting } from '@/lib/types';
import { buildGaps, computeCoverage } from '@/lib/engine';
import { llmToGaps } from '@/lib/llmAnalysis';
import { GAP_TYPE_LABEL } from '@/lib/labels';
import { getTemplate, uidGen } from '@/lib/templates';
import { Badge, Btn, Card, SectionTitle, inputCls } from './ui';

interface Props {
  meeting: Meeting;
  update: (fn: (m: Meeting) => Meeting) => void;
  onContinue: () => void;
  onFinish: () => void;
}

export default function CloseStep({ meeting: m, update, onContinue, onFinish }: Props) {
  const cov = useMemo(() => computeCoverage(m), [m]);
  // 优先用大模型分析的结构化结果；没有（未配置 / 分析失败）则回退内置规则引擎
  const gaps = useMemo(() => (m.llmAnalysis ? llmToGaps(m.llmAnalysis) : buildGaps(m, cov)), [m, cov]);
  const [reasonFor, setReasonFor] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [reAnalyzing, setReAnalyzing] = useState(false);

  const reAnalyze = async () => {
    if (!m.transcript.length) return;
    setReAnalyzing(true);
    try {
      const payload = {
        title: m.title,
        meetingType: getTemplate(m.templateId).name,
        keyGoal: m.objectives.filter((o) => o.kind === 'goal').map((o) => o.text),
        keyConclusions: m.objectives.filter((o) => o.kind === 'conclusion').map((o) => o.text),
        keyDecisions: m.objectives.filter((o) => o.kind === 'decision').map((o) => o.text),
        agenda: m.stages.map((s) => s.name),
        requiredSpeakers: Array.from(new Set(m.stages.flatMap((s) => s.requiredSpeakers))),
        requiredActionItems: m.objectives.filter((o) => o.kind === 'action').map((o) => o.text),
        transcript: m.transcript.map((u) => ({ speaker: u.speaker, text: u.text })),
      };
      const r = await fetch('/api/meeting-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = (await r.json()) as { analysis?: Meeting['llmAnalysis']; error?: string };
      if (j.analysis) update((mm) => ({ ...mm, llmAnalysis: j.analysis ?? null }));
    } catch {
      /* 失败保持现状 */
    } finally {
      setReAnalyzing(false);
    }
  };

  const resolved = new Map(m.resolvedGaps.map((r) => [r.gapId, r.how]));
  const open = gaps.filter((g) => !resolved.has(g.id));
  const blockers = open.filter((g) => g.severity === 'blocker');
  const followups = open.filter((g) => g.severity === 'followup');
  const handled = gaps.filter((g) => resolved.has(g.id));

  const mark = (g: Gap, how: 'action' | 'exception' | 'continued') =>
    update((mm) => ({ ...mm, resolvedGaps: [...mm.resolvedGaps.filter((r) => r.gapId !== g.id), { gapId: g.id, how }] }));

  const toAction = (g: Gap) => {
    update((mm) => ({
      ...mm,
      objectives: [
        ...mm.objectives,
        {
          id: uidGen('o'),
          kind: 'action' as const,
          text: g.title.replace(/^[^：]*：/, ''),
          priority: g.severity === 'blocker' ? ('must' as const) : ('should' as const),
          owner: '待定',
          due: '待定',
          fromGap: g.id,
          stageId: g.stageId,
        },
      ],
      resolvedGaps: [...mm.resolvedGaps.filter((r) => r.gapId !== g.id), { gapId: g.id, how: 'action' as const }],
    }));
  };

  const saveException = (g: Gap) => {
    if (!reason.trim()) return;
    update((mm) => ({
      ...mm,
      exceptions: [...mm.exceptions, { id: uidGen('e'), gapId: g.id, reason: reason.trim(), at: new Date().toISOString() }],
      resolvedGaps: [...mm.resolvedGaps.filter((r) => r.gapId !== g.id), { gapId: g.id, how: 'exception' as const }],
    }));
    setReasonFor(null);
    setReason('');
  };

  const GapCard = ({ g }: { g: Gap }) => {
    const isBlocker = g.severity === 'blocker';
    return (
      <div className={`rounded-xl border p-3.5 ${isBlocker ? 'border-rose-200 bg-rose-50/50' : 'border-amber-200 bg-amber-50/40'}`}>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={isBlocker ? 'red' : 'amber'}>{isBlocker ? '阻塞会议结束' : '可会后跟进'}</Badge>
          <Badge tone="slate">{(GAP_TYPE_LABEL as Record<string, string>)[g.type] ?? '问题'}</Badge>
        </div>
        <div className="mt-2 text-[13.5px] font-medium text-slate-900">{g.title}</div>
        <div className="mt-1 text-[12.5px] leading-5 text-slate-600">{g.detail}</div>
        <div className="mt-1.5 rounded-lg bg-white/70 px-2.5 py-1.5 text-[12px] leading-5 text-slate-500">建议：{g.suggestion}</div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Btn size="sm" variant="soft" onClick={() => toAction(g)}>
            转为行动项
          </Btn>
          <Btn size="sm" variant="ghost" onClick={() => setReasonFor(reasonFor === g.id ? null : g.id)}>
            记录例外原因
          </Btn>
          <Btn
            size="sm"
            variant="ghost"
            onClick={() => {
              mark(g, 'continued');
              onContinue();
            }}
          >
            返回继续讨论
          </Btn>
        </div>
        {reasonFor === g.id && (
          <div className="mt-2 flex gap-2">
            <input className={inputCls} placeholder="例：客户未到场，改由会后书面确认" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
            <Btn size="sm" variant="primary" onClick={() => saveException(g)} disabled={!reason.trim()}>
              保存
            </Btn>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-5">
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900">为了达成本次会议目标，还有什么没有讨论、没有确认、没有决定？</h3>
            <p className="mt-1 text-[12.5px] text-slate-500">
              {m.llmAnalysis ? '来源：大模型会议分析' : '来源：内置规则引擎'} · 目标达成度 <b className="text-slate-800">{cov.score}%</b> · 共发现 {gaps.length} 个缺口，其中
              <b className="text-rose-600"> {blockers.length} 项阻塞会议结束</b>、
              <b className="text-amber-600"> {followups.length} 项可会后跟进</b>
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            {m.transcript.length > 0 && (
              <Btn size="sm" variant="ghost" onClick={reAnalyze} disabled={reAnalyzing} title="用大模型重新分析会议缺口">
                {reAnalyzing ? '分析中…' : '重新大模型分析'}
              </Btn>
            )}
            <Btn variant="ghost" onClick={onContinue}>
              ← 返回继续讨论
            </Btn>
            <Btn variant="primary" onClick={onFinish} disabled={blockers.length > 0}>
              {blockers.length > 0 ? `还有 ${blockers.length} 项未处理` : '结束会议并生成总结 →'}
            </Btn>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle
            title="🚧 阻塞会议结束的问题"
            desc="这些问题不解决，会议目标就没有真正达成"
            right={blockers.length > 0 ? <Btn size="sm" variant="soft" onClick={() => blockers.forEach(toAction)}>全部转为行动项</Btn> : undefined}
          />
          <div className="space-y-2.5 p-5 pt-3">
            {blockers.length === 0 && <div className="py-6 text-center text-[13px] text-emerald-600">没有阻塞项，可以结束会议</div>}
            {blockers.map((g) => (
              <GapCard key={g.id} g={g} />
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <SectionTitle title="📌 可会后跟进的问题" desc="不影响本次会议目标，可转入行动项或记录例外" />
            <div className="space-y-2.5 p-5 pt-3">
              {followups.length === 0 && <div className="py-4 text-center text-[13px] text-slate-400">没有会后跟进项</div>}
              {followups.map((g) => (
                <GapCard key={g.id} g={g} />
              ))}
            </div>
          </Card>

          {handled.length > 0 && (
            <Card>
              <SectionTitle title="处理记录" desc="已转行动项 / 已记录例外 / 已返回讨论" />
              <div className="space-y-2 p-5 pt-3">
                {handled.map((g) => {
                  const how = resolved.get(g.id);
                  const ex = m.exceptions.find((e) => e.gapId === g.id);
                  return (
                    <div key={g.id} className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[12.5px]">
                      <Badge tone={how === 'action' ? 'green' : how === 'exception' ? 'amber' : 'slate'}>
                        {how === 'action' ? '已转行动项' : how === 'exception' ? '例外结束' : '返回讨论'}
                      </Badge>
                      <span className="flex-1 text-slate-600">{g.title}</span>
                      {ex && <span className="text-[11.5px] text-slate-400">{ex.reason}</span>}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
