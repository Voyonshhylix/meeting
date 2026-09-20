'use client';

import { useState } from 'react';
import type { Meeting, Objective, ObjectiveKind, Priority } from '@/lib/types';
import { KIND_META } from '@/lib/labels';
import { uidGen } from '@/lib/templates';
import { Badge, Btn, Card, Empty, Field, PriorityTag, SectionTitle, inputCls } from './ui';

interface Props {
  meeting: Meeting;
  update: (fn: (m: Meeting) => Meeting) => void;
  onNext: () => void;
}

export default function PlanStep({ meeting: m, update, onNext }: Props) {
  const [kind, setKind] = useState<ObjectiveKind>('decision');
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Priority>('must');
  const [stageId, setStageId] = useState(m.stages[0]?.id ?? '');

  const addObjective = () => {
    const t = text.trim();
    if (!t) return;
    const o: Objective = { id: uidGen('o'), kind, text: t, priority, stageId: stageId || undefined };
    update((mm) => ({ ...mm, objectives: [...mm.objectives, o] }));
    setText('');
  };

  const patchObjective = (id: string, patch: Partial<Objective>) =>
    update((mm) => ({ ...mm, objectives: mm.objectives.map((o) => (o.id === id ? { ...o, ...patch } : o)) }));

  const removeObjective = (id: string) => update((mm) => ({ ...mm, objectives: mm.objectives.filter((o) => o.id !== id) }));

  const mustCount = m.objectives.filter((o) => o.priority === 'must').length;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
      {/* 左：会议信息 + 参会人 */}
      <div className="space-y-4">
        <Card>
          <SectionTitle title="① 会议信息" desc="给这场会起个名字，确认谁必须到场" />
          <div className="space-y-3 p-5 pt-3">
            <Field label="会议名称">
              <input className={inputCls} value={m.title} onChange={(e) => update((mm) => ({ ...mm, title: e.target.value }))} />
            </Field>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[12px] font-medium text-slate-600">参会角色（用于「必发言人」检查）</span>
                <Btn size="sm" onClick={() => update((mm) => ({ ...mm, participants: [...mm.participants, { name: '新成员', role: '角色' }] }))}>
                  + 添加
                </Btn>
              </div>
              <div className="space-y-2">
                {m.participants.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className={`${inputCls} flex-[0_0_38%]`}
                      value={p.name}
                      onChange={(e) =>
                        update((mm) => ({ ...mm, participants: mm.participants.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) }))
                      }
                    />
                    <input
                      className={inputCls}
                      value={p.role}
                      onChange={(e) =>
                        update((mm) => ({ ...mm, participants: mm.participants.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)) }))
                      }
                    />
                    <Btn size="sm" variant="danger" onClick={() => update((mm) => ({ ...mm, participants: mm.participants.filter((_, j) => j !== i) }))}>
                      删除
                    </Btn>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle title="② 议程结构 / Agenda" desc="每个环节都可以指定「必须发言」的人 —— 会中未表态会被检查出来" />
          <div className="space-y-2.5 p-5 pt-3">
            {m.stages.map((s, i) => (
              <div key={s.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[12px] font-semibold text-slate-500">{i + 1}</span>
                  <input
                    className={`${inputCls} flex-1`}
                    value={s.name}
                    onChange={(e) => update((mm) => ({ ...mm, stages: mm.stages.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)) }))}
                  />
                  <div className="flex items-center gap-1 text-[12px] text-slate-500">
                    <input
                      type="number"
                      min={1}
                      className={`${inputCls} w-16`}
                      value={s.minutes}
                      onChange={(e) => update((mm) => ({ ...mm, stages: mm.stages.map((x) => (x.id === s.id ? { ...x, minutes: Number(e.target.value) || 1 } : x)) }))}
                    />
                    分钟
                  </div>
                  <Btn size="sm" variant="danger" onClick={() => update((mm) => ({ ...mm, stages: mm.stages.filter((x) => x.id !== s.id) }))}>
                    ✕
                  </Btn>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11.5px] text-slate-400">必须发言：</span>
                  {m.participants.map((p) => {
                    const on = s.requiredSpeakers.includes(p.name);
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() =>
                          update((mm) => ({
                            ...mm,
                            stages: mm.stages.map((x) =>
                              x.id === s.id
                                ? { ...x, requiredSpeakers: on ? x.requiredSpeakers.filter((n) => n !== p.name) : [...x.requiredSpeakers, p.name] }
                                : x,
                            ),
                          }))
                        }
                        className={`rounded-full px-2.5 py-[3px] text-[11.5px] ring-1 ring-inset transition ${
                          on ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-slate-500 ring-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <Btn size="sm" onClick={() => update((mm) => ({ ...mm, stages: [...mm.stages, { id: uidGen('s'), name: '新环节', minutes: 5, requiredSpeakers: [] }] }))}>
              + 添加环节
            </Btn>
          </div>
        </Card>
      </div>

      {/* 右：目标清单 */}
      <Card className="h-fit">
        <SectionTitle
          title="③ 会议目标清单"
          desc="会前定义要达成什么 —— 这是结束前缺口检查的判定依据"
          right={<Badge tone="indigo">必须完成 {mustCount} 项</Badge>}
        />
        <div className="space-y-2.5 p-5 pt-3">
          {m.objectives.length === 0 && <Empty text="还没有目标项，用下面的表单添加，或直接加载示例会议" />}
          {m.objectives.map((o) => {
            const meta = KIND_META[o.kind];
            return (
              <div key={o.id} className="group rounded-xl border border-slate-200 p-3 transition hover:border-indigo-200">
                <div className="flex items-start gap-2">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  <input className={`${inputCls} flex-1 border-transparent bg-transparent px-1`} value={o.text} onChange={(e) => patchObjective(o.id, { text: e.target.value })} />
                  <button type="button" onClick={() => removeObjective(o.id)} className="mt-1 text-[12px] text-slate-300 transition hover:text-rose-500">
                    ✕
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {(['must', 'should', 'note'] as Priority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => patchObjective(o.id, { priority: p })}
                      className={`rounded-full px-2 py-[3px] text-[11px] ring-1 ring-inset transition ${
                        o.priority === p ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-500 ring-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {p === 'must' ? '必须完成' : p === 'should' ? '建议完成' : '仅供记录'}
                    </button>
                  ))}
                  <select
                    className="ml-auto rounded-lg border border-slate-200 bg-white px-2 py-[3px] text-[11.5px] text-slate-600 outline-none"
                    value={o.stageId ?? ''}
                    onChange={(e) => patchObjective(o.id, { stageId: e.target.value || undefined })}
                  >
                    <option value="">未关联环节</option>
                    {m.stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}

          <div className="mt-3 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 p-3">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(KIND_META) as ObjectiveKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`rounded-full px-2.5 py-[4px] text-[11.5px] ring-1 ring-inset transition ${
                    kind === k ? 'bg-white text-indigo-700 ring-indigo-300' : 'bg-white/60 text-slate-500 ring-slate-200'
                  }`}
                >
                  {KIND_META[k].label}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input className={inputCls} placeholder={KIND_META[kind].hint} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addObjective()} />
              <select className={`${inputCls} w-28`} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                <option value="must">必须完成</option>
                <option value="should">建议完成</option>
                <option value="note">仅供记录</option>
              </select>
              <Btn variant="primary" onClick={addObjective} disabled={!text.trim()}>
                添加
              </Btn>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <span className="text-[12px] text-slate-400">共 {m.objectives.length} 项目标 · {m.stages.length} 个环节</span>
          <Btn variant="primary" onClick={onNext} disabled={m.objectives.length === 0}>
            进入会中记录 →
          </Btn>
        </div>
      </Card>
    </div>
  );
}
