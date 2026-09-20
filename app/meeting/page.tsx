'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Meeting } from '@/lib/types';
import { createMeetingFromTemplate, DEMO_MEETINGS, TEMPLATES, getTemplate } from '@/lib/templates';
import { loadMeeting, saveMeeting } from '@/lib/storage';
import { Btn, Card, SectionTitle, Badge } from '../_components/ui';
import PlanStep from '../_components/PlanStep';
import LiveStep from '../_components/LiveStep';
import CloseStep from '../_components/CloseStep';
import SummaryStep from '../_components/SummaryStep';

type Step = 'create' | 'plan' | 'live' | 'close' | 'summary';

const STEPS: { key: Step; label: string; n: string }[] = [
  { key: 'plan', label: '会前配置', n: '1' },
  { key: 'live', label: '会中记录', n: '2' },
  { key: 'close', label: '结束检查', n: '3' },
  { key: 'summary', label: '会议总结', n: '4' },
];

export default function MeetingPage() {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [step, setStep] = useState<Step>('create');

  useEffect(() => {
    const demo = new URLSearchParams(window.location.search).get('demo');
    if (demo) {
      const d = DEMO_MEETINGS.find((x) => x.key === demo);
      if (d) {
        setMeeting(d.build());
        setStep('live');
        return;
      }
    }
    const m = loadMeeting();
    if (m) {
      setMeeting(m);
      setStep(m.status === 'done' ? 'summary' : m.status === 'closing' ? 'close' : m.status === 'live' ? 'live' : 'plan');
    }
  }, []);

  useEffect(() => {
    saveMeeting(meeting);
  }, [meeting]);

  const update = useCallback((fn: (m: Meeting) => Meeting) => {
    setMeeting((prev) => (prev ? fn(prev) : prev));
  }, []);

  const startTemplate = (id: string) => {
    const m = createMeetingFromTemplate(id);
    setMeeting(m);
    setStep('plan');
  };

  const startDemo = (key: string) => {
    const d = DEMO_MEETINGS.find((x) => x.key === key)!;
    const m = d.build();
    setMeeting(m);
    setStep('live');
  };

  const goto = (s: Step) => {
    if (!meeting) return;
    if (s === 'live') update((m) => ({ ...m, status: 'live' }));
    if (s === 'close') update((m) => ({ ...m, status: 'closing' }));
    setStep(s);
  };

  const finish = () => {
    update((m) => ({ ...m, status: 'done', finishedAt: new Date().toISOString() }));
    setStep('summary');
  };

  const reset = () => {
    setMeeting(null);
    saveMeeting(null);
    setStep('create');
  };

  const tpl = meeting ? getTemplate(meeting.templateId) : null;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1240px] items-center gap-4 px-5 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-600 text-[13px] font-bold text-white">M</span>
            <span className="text-[14px] font-semibold text-slate-900">有效会议助手</span>
          </Link>
          {meeting && (
            <>
              <div className="hidden items-center gap-1 md:flex">
                {STEPS.map((s, i) => {
                  const idx = STEPS.findIndex((x) => x.key === step);
                  const active = s.key === step;
                  const done = STEPS.findIndex((x) => x.key === s.key) < idx;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => goto(s.key)}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] transition ${
                        active ? 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200' : done ? 'text-slate-600 hover:bg-slate-50' : 'text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`grid h-4.5 w-4.5 place-items-center rounded-full text-[10.5px] ${active ? 'bg-indigo-600 text-white' : done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {done ? '✓' : s.n}
                      </span>
                      {s.label}
                    </button>
                  );
                })}
              </div>
              <div className="ml-auto flex items-center gap-2">
                {tpl && <Badge tone="slate">{tpl.name}</Badge>}
                <Btn size="sm" variant="ghost" onClick={reset}>
                  新建会议
                </Btn>
              </div>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-5 py-5">
        {step === 'create' && !meeting && (
          <div className="space-y-4">
            <Card>
              <SectionTitle
                title="选择会议模板，或从示例会议直接体验"
                desc="模板预置了目标、议程与「必须发言」的角色；可在此基础上改成你自己的会议"
              />
              <div className="grid gap-3 p-5 pt-3 md:grid-cols-2 xl:grid-cols-4">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => startTemplate(t.id)}
                    className="group rounded-xl border border-slate-200 p-4 text-left transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-[0_8px_24px_-12px_rgba(79,70,229,.35)]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-semibold text-slate-900">{t.name}</span>
                      <Badge tone="indigo">{t.mode}</Badge>
                    </div>
                    <p className="mt-1.5 text-[12.5px] leading-5 text-slate-500">{t.desc}</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      <Badge tone="slate">{t.stages.length} 环节</Badge>
                      <Badge tone="slate">{t.objectives.length} 目标项</Badge>
                      <Badge tone="slate">{t.participants.length} 角色</Badge>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="border-indigo-200 bg-indigo-50/40">
              <SectionTitle title="⚡ 一键体验：预置模拟会议" desc="不用配置，直接看「结束前缺口检查」的效果" />
              <div className="grid gap-3 p-5 pt-3 md:grid-cols-2">
                {DEMO_MEETINGS.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => startDemo(d.key)}
                    className="rounded-xl border border-indigo-200 bg-white p-4 text-left transition hover:border-indigo-400 hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-semibold text-slate-900">{d.name}</span>
                      <Badge tone="green">Mock 数据</Badge>
                    </div>
                    <p className="mt-1 text-[12px] text-slate-500">{d.duration}</p>
                    <p className="mt-2 text-[12.5px] leading-5 text-indigo-900/80">{d.highlight}</p>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )}

        {meeting && step === 'plan' && <PlanStep meeting={meeting} update={update} onNext={() => goto('live')} />}
        {meeting && step === 'live' && <LiveStep meeting={meeting} update={update} onPrepareEnd={() => goto('close')} />}
        {meeting && step === 'close' && (
          <CloseStep meeting={meeting} update={update} onContinue={() => setStep('live')} onFinish={finish} />
        )}
        {meeting && step === 'summary' && <SummaryStep meeting={meeting} onRestart={reset} />}
      </main>
    </div>
  );
}
