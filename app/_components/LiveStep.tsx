'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ItemStatus, LlmAnalysis, Meeting, Utterance } from '@/lib/types';
import { computeCoverage } from '@/lib/engine';
import { KIND_META } from '@/lib/labels';
import { DEMO_MEETINGS, getTemplate, uidGen } from '@/lib/templates';
import { DEFAULT_AI, loadAiCfg, saveAiCfg, type AiCfg } from '@/lib/storage';
import { formatTime } from '@/lib/nlp';
import { Badge, Btn, Card, ProgressBar, SectionTitle, StatusPill, inputCls } from './ui';

interface Props {
  meeting: Meeting;
  update: (fn: (m: Meeting) => Meeting) => void;
  onPrepareEnd: () => void;
}

export default function LiveStep({ meeting: m, update, onPrepareEnd }: Props) {
  const [speaker, setSpeaker] = useState(m.participants[0]?.name ?? '');
  const [stageId, setStageId] = useState(m.stages[0]?.id ?? '');
  const [text, setText] = useState('');
  const [tab, setTab] = useState<'goals' | 'agenda' | 'speakers'>('goals');
  const [batch, setBatch] = useState('');
  const [showBatch, setShowBatch] = useState(false);
  const [queue, setQueue] = useState<Utterance[] | null>(null);
  const [playing, setPlaying] = useState(false);
  const [aiCfg, setAiCfg] = useState<AiCfg>(DEFAULT_AI);
  const [showAi, setShowAi] = useState(false);
  const [aiMap, setAiMap] = useState<Record<string, ItemStatus>>({});
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState('');
  const [serverAi, setServerAi] = useState<{ configured: boolean; model: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const [recBusy, setRecBusy] = useState(false);
  const [recErr, setRecErr] = useState('');
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    setAiCfg(loadAiCfg());
    fetch('/api/ai-check')
      .then((r) => r.json())
      .then((j: { configured: boolean; model: string }) => setServerAi({ configured: j.configured, model: j.model }))
      .catch(() => setServerAi({ configured: false, model: '' }));
  }, []);

  const aiReady = Boolean(aiCfg.key || serverAi?.configured);

  const runAi = async () => {
    setAiBusy(true);
    setAiMsg('');
    try {
      const r = await fetch('/api/ai-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: aiCfg.key,
          baseUrl: aiCfg.baseUrl,
          model: aiCfg.model,
          objectives: m.objectives.map((o) => ({ id: o.id, kind: o.kind, text: o.text, priority: o.priority })),
          transcript: m.transcript.map((u) => ({ speaker: u.speaker, text: u.text })),
        }),
      });
      const j = (await r.json()) as { items?: { id: string; status: string; reason?: string }[]; error?: string };
      if (j.error) {
        setAiMsg(j.error);
      } else if (j.items) {
        const map: Record<string, ItemStatus> = {};
        j.items.forEach((it) => {
          if (['decided', 'discussed', 'mentioned', 'missing'].includes(it.status)) map[it.id] = it.status as ItemStatus;
        });
        setAiMap(map);
        setAiMsg(`已用模型复核 ${Object.keys(map).length} 项`);
      }
    } catch (e) {
      setAiMsg(e instanceof Error ? e.message : '请求失败');
    } finally {
      setAiBusy(false);
    }
  };

  const cov = useMemo(() => computeCoverage(m), [m]);
  const lastT = m.transcript.length ? Math.max(...m.transcript.map((u) => u.t)) : 0;

  useEffect(() => {
    if (!playing || !queue || queue.length === 0) {
      if (playing && queue && queue.length === 0) setPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      const [head, ...rest] = queue;
      update((mm) => ({ ...mm, transcript: [...mm.transcript, head] }));
      setQueue(rest);
    }, 1500);
    return () => clearTimeout(timer);
  }, [playing, queue, update]);

  const addUtterance = () => {
    const t = text.trim();
    if (!t) return;
    const u: Utterance = {
      id: uidGen('u'),
      t: lastT + 15,
      speaker: speaker || '未署名',
      role: m.participants.find((p) => p.name === speaker)?.role,
      stageId: stageId || undefined,
      text: t,
    };
    update((mm) => ({ ...mm, transcript: [...mm.transcript, u], status: 'live' }));
    setText('');
  };

  const importBatch = () => {
    const lines = batch.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    const list: Utterance[] = lines.map((line, i) => {
      const mt = line.match(/^\s*(?:\[?(\d{1,2}):(\d{2})\]?)?\s*([^：:]{1,12})[：:]\s*(.+)$/);
      let t = i * 20;
      let sp = speaker || '未署名';
      let body = line;
      if (mt) {
        if (mt[1]) t = Number(mt[1]) * 60 + Number(mt[2]);
        sp = mt[3].trim();
        body = mt[4].trim();
      }
      const auto = m.stages[Math.min(m.stages.length - 1, Math.floor((i / lines.length) * m.stages.length))];
      return {
        id: uidGen('u'),
        t,
        speaker: sp,
        role: m.participants.find((p) => p.name === sp)?.role,
        stageId: stageId || auto?.id,
        text: body,
      };
    });
    update((mm) => ({ ...mm, transcript: [...mm.transcript, ...list], status: 'live' }));
    setBatch('');
    setShowBatch(false);
  };

  const loadDemo = (key: string) => {
    const d = DEMO_MEETINGS.find((x) => x.key === key)!;
    const built = d.build();
    setQueue(built.transcript);
    setPlaying(false);
    update(() => ({ ...built, transcript: [] }));
  };

  const playDemo = () => {
    if (!queue || queue.length === 0) {
      const d = DEMO_MEETINGS[0];
      setQueue(d.build().transcript);
      update(() => ({ ...d.build(), transcript: [] }));
      setPlaying(true);
      return;
    }
    update((mm) => ({ ...mm, transcript: [] }));
    setPlaying(true);
  };

  const objOf = (id: string) => m.objectives.find((o) => o.id === id)!;

  const ingestTranscript = (text: string) => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const src = lines.length ? lines : text ? [text] : [];
    if (!src.length) return;
    update((mm) => {
      const base = mm.transcript.length ? Math.max(...mm.transcript.map((u) => u.t)) : 0;
      const list = src.map((line, i) => {
        const mt = line.match(/^(.{1,20})[：:]\s*(.+)$/);
        let sp = mm.participants[0]?.name ?? '会议';
        let body = line;
        if (mt) {
          sp = mm.participants.find((p) => p.name === mt[1].trim())?.name ?? mt[1].trim();
          body = mt[2].trim();
        }
        return { id: uidGen('u'), t: base + (i + 1) * 15, speaker: sp, role: mm.participants.find((p) => p.name === sp)?.role, stageId: stageId || undefined, text: body };
      });
      return { ...mm, transcript: [...mm.transcript, ...list], status: 'live' };
    });
  };

  const transcribeAndIngest = async (blob: Blob, fname = 'recording.webm') => {
    setRecBusy(true);
    setRecErr('');
    try {
      const fd = new FormData();
      fd.append('file', new File([blob], fname, { type: blob.type || 'audio/webm' }));
      const r = await fetch('/api/transcribe', { method: 'POST', body: fd });
      const j = (await r.json()) as { transcript?: string; error?: string };
      if (j.error) {
        setRecErr(`${j.error}。可改用「粘贴转录」手动填入，或稍后重试。`);
        return;
      }
      if (!j.transcript) {
        setRecErr('转写返回为空，请重试，或改用「粘贴转录」。');
        return;
      }
      ingestTranscript(j.transcript);
    } catch (e) {
      setRecErr(e instanceof Error ? e.message : '转写请求失败');
    } finally {
      setRecBusy(false);
    }
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        await transcribeAndIngest(blob);
      };
      mediaRef.current = mr;
      mr.start();
      setRecording(true);
      setRecErr('');
    } catch (e) {
      setRecErr('无法访问麦克风：' + (e instanceof Error ? e.message : '权限被拒绝'));
    }
  };

  const stopRec = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) await transcribeAndIngest(f, f.name);
    e.target.value = '';
  };

  const buildAnalysisPayload = () => ({
    title: m.title,
    meetingType: getTemplate(m.templateId).name,
    keyGoal: m.objectives.filter((o) => o.kind === 'goal').map((o) => o.text),
    keyConclusions: m.objectives.filter((o) => o.kind === 'conclusion').map((o) => o.text),
    keyDecisions: m.objectives.filter((o) => o.kind === 'decision').map((o) => o.text),
    agenda: m.stages.map((s) => s.name),
    requiredSpeakers: Array.from(new Set(m.stages.flatMap((s) => s.requiredSpeakers))),
    requiredActionItems: m.objectives.filter((o) => o.kind === 'action').map((o) => o.text),
    transcript: m.transcript.map((u) => ({ speaker: u.speaker, text: u.text })),
  });

  const prepareEnd = async () => {
    if (!m.llmAnalysis && m.transcript.length) {
      setAnalysisBusy(true);
      try {
        const r = await fetch('/api/meeting-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildAnalysisPayload()),
        });
        const j = (await r.json()) as { analysis?: LlmAnalysis; error?: string };
        if (j.analysis) update((mm) => ({ ...mm, llmAnalysis: j.analysis! }));
      } catch {
        /* 失败则走内置规则引擎，不阻断 */
      } finally {
        setAnalysisBusy(false);
      }
    }
    onPrepareEnd();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
      <div className="space-y-4">
        <Card>
          <SectionTitle
            title="会中记录"
            desc="粘贴或录入讨论内容（真实场景可接会议转写；此处支持手输 / 批量粘贴 / 示例数据）"
            right={
              <div className="flex gap-1.5">
                {DEMO_MEETINGS.map((d) => (
                  <Btn key={d.key} size="sm" onClick={() => loadDemo(d.key)} title={d.highlight}>
                    载入「{d.name}」
                  </Btn>
                ))}
              </div>
            }
          />
          <div className="space-y-3 p-5 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <Btn size="sm" variant={playing ? 'danger' : 'soft'} onClick={() => (playing ? setPlaying(false) : playDemo())} title="演示用：依次注入示例发言">
                {playing ? '⏸ 暂停演示' : '▶ 逐条推进演示'}
              </Btn>
              <Btn size="sm" variant={recording ? 'danger' : 'soft'} onClick={recording ? stopRec : startRec} disabled={recBusy} title="浏览器录音，停止后自动调用转写 API">
                {recording ? '⏹ 停止录音' : '🎙 录音录入'}
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => fileRef.current?.click()} disabled={recBusy} title="上传 mp3/wav/m4a/webm/mp4，调用转写 API">
                ⬆ 上传录音
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => setShowBatch((v) => !v)} title="粘贴整段转录文本，按「说话人：内容」自动切分">
                📋 粘贴转录
              </Btn>
              <input ref={fileRef} type="file" accept=".mp3,.wav,.m4a,.webm,.mp4,audio/*,video/*" className="hidden" onChange={onFile} />
              <Btn size="sm" variant="danger" onClick={() => update((mm) => ({ ...mm, transcript: [] }))}>
                清空记录
              </Btn>
              <span className="mx-1 h-4 w-px bg-slate-200" />
              <Btn
                size="sm"
                variant={aiReady ? 'soft' : 'ghost'}
                onClick={runAi}
                disabled={aiBusy || !aiReady || m.transcript.length === 0}
                title={aiReady ? '用大模型复核每一项目标的达成状态' : '服务端未配置 AI_API_KEY，可在模型设置里自填 Key'}
              >
                {aiBusy ? '复核中…' : 'AI 语义复核'}
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => setShowAi((v) => !v)}>
                {showAi ? '收起配置' : '服务配置'}
              </Btn>
              <span className="ml-auto text-[12px] text-slate-400">
                {m.transcript.length} 条发言 · {formatTime(lastT)}
              </span>
            </div>
            {recording && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/50 px-3 py-2 text-[12.5px] text-rose-700">
                <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" /> 录音中…点「停止录音」后自动转写并填入下方实录
              </div>
            )}
            {recBusy && !recording && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 px-3 py-2 text-[12.5px] text-indigo-700">⏳ 正在调用转写 / 分析服务…</div>
            )}
            {recErr && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
                <span>⚠ {recErr}</span>
                <Btn size="sm" variant="soft" onClick={() => setRecErr('')}>
                  知道了
                </Btn>
              </div>
            )}

            {(showAi || aiMsg) && (
              <div className="rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 p-3 text-[12.5px]">
                <div className="mb-2 space-y-1 text-slate-600">
                  <p>
                    🎙 <b className="text-slate-800">录音转写</b> 与 <b className="text-slate-800">结束前大模型分析</b> 都走
                    <b className="text-slate-800">服务端环境变量</b>（TRANSCRIPTION_API_URL / TRANSCRIPTION_API_KEY / LLM_API_URL / LLM_API_KEY），
                    <b className="text-slate-800">Key 不出现在前端</b>，请在 Vercel 环境变量里配置。
                  </p>
                  <p>
                    覆盖看板默认由<b className="text-slate-800">规则引擎</b>实时计算（无需联网）。下方是可选项：填入任意 OpenAI 兼容 Key 做「会中 AI 语义复核」。
                  </p>
                </div>
                {showAi && (
                  <div className="grid gap-2 sm:grid-cols-[1.2fr_1fr_0.8fr_auto]">
                    <input className={inputCls} placeholder="API Key（sk-…）" value={aiCfg.key} onChange={(e) => setAiCfg({ ...aiCfg, key: e.target.value })} />
                    <input className={inputCls} placeholder="Base URL" value={aiCfg.baseUrl} onChange={(e) => setAiCfg({ ...aiCfg, baseUrl: e.target.value })} />
                    <input className={inputCls} placeholder="模型名" value={aiCfg.model} onChange={(e) => setAiCfg({ ...aiCfg, model: e.target.value })} />
                    <Btn size="sm" variant="primary" onClick={() => saveAiCfg(aiCfg)}>
                      保存
                    </Btn>
                  </div>
                )}
                {aiMsg && <div className="mt-2 text-[12px] text-indigo-800">{aiMsg}</div>}
              </div>
            )}

            {showBatch && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
                <textarea
                  className={`${inputCls} h-28 resize-none font-mono text-[12px]`}
                  placeholder={'支持格式：\n[00:20] 林哲：本次上线范围是新版推荐卡片\n王睿：后端接口已经就绪'}
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                />
                <div className="mt-2 flex justify-end gap-2">
                  <Btn size="sm" variant="ghost" onClick={() => setShowBatch(false)}>
                    取消
                  </Btn>
                  <Btn size="sm" variant="primary" onClick={importBatch} disabled={!batch.trim()}>
                    导入
                  </Btn>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-end gap-2">
              <div className="w-32">
                <span className="mb-1 block text-[11.5px] text-slate-500">发言人</span>
                <select className={inputCls} value={speaker} onChange={(e) => setSpeaker(e.target.value)}>
                  {m.participants.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}（{p.role}）
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-40">
                <span className="mb-1 block text-[11.5px] text-slate-500">所属环节</span>
                <select className={inputCls} value={stageId} onChange={(e) => setStageId(e.target.value)}>
                  {m.stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                className={`${inputCls} h-[62px] flex-1 resize-none`}
                placeholder="输入这段发言的内容…（Ctrl+Enter 快速添加）"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addUtterance();
                }}
              />
              <Btn variant="primary" onClick={addUtterance} disabled={!text.trim()}>
                添加
              </Btn>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle title="讨论实录" desc="按时间顺序展示已录入的内容，命中目标的发言会高亮" />
          <div className="max-h-[420px] space-y-2 overflow-y-auto p-5 pt-3">
            {m.transcript.length === 0 && <div className="py-8 text-center text-[13px] text-slate-400">还没有内容，点上方「载入示例会议」或手动录入</div>}
            {m.transcript.map((u) => (
              <div key={u.id} className="animate-fade flex gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <div className="w-14 shrink-0 text-[11.5px] font-mono text-slate-400">{formatTime(u.t)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[13px] font-medium text-slate-800">{u.speaker}</span>
                    {u.role && <span className="text-[11px] text-slate-400">{u.role}</span>}
                    {u.stageId && <Badge tone="slate">{m.stages.find((s) => s.id === u.stageId)?.name}</Badge>}
                    <button type="button" onClick={() => update((mm) => ({ ...mm, transcript: mm.transcript.filter((x) => x.id !== u.id) }))} className="ml-auto text-[11px] text-slate-300 hover:text-rose-500">
                      删除
                    </button>
                  </div>
                  <p className="mt-1 text-[13px] leading-6 text-slate-700">{u.text}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 右：覆盖看板 */}
      <div className="space-y-4">
        <Card>
          <div className="p-5">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[12px] text-slate-500">目标达成度</div>
                <div className="text-[30px] font-semibold leading-none text-slate-900">
                  {cov.score}
                  <span className="ml-0.5 text-[15px] text-slate-400">%</span>
                </div>
              </div>
              <div className="flex gap-3 text-center">
                {(['decided', 'discussed', 'mentioned', 'missing'] as const).map((s) => (
                  <div key={s}>
                    <div className="text-[16px] font-semibold text-slate-800">{cov.items.filter((i) => i.status === s).length}</div>
                    <div className="text-[11px] text-slate-400">{s === 'decided' ? '已达成' : s === 'discussed' ? '待确认' : s === 'mentioned' ? '仅提及' : '未覆盖'}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3">
              <ProgressBar value={cov.score} />
            </div>
          </div>
        </Card>

        {cov.nudges.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/60">
            <SectionTitle title="⏱ 会中主动提示" desc="主持人可以在会议进行中据此补问；规则引擎实时计算，无需等待 AI" />
            <ul className="space-y-2 p-5 pt-3">
              {cov.nudges.map((n, i) => (
                <li key={i} className="flex gap-2 rounded-lg bg-white/80 p-2.5 text-[12.5px] leading-5 text-amber-900 ring-1 ring-inset ring-amber-100">
                  <span className="mt-[2px]">•</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card>
          <SectionTitle
            title="覆盖看板"
            right={
              <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
                {(['goals', 'agenda', 'speakers'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`rounded-md px-2.5 py-1 text-[12px] transition ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                  >
                    {t === 'goals' ? '目标' : t === 'agenda' ? '环节' : '发言人'}
                  </button>
                ))}
              </div>
            }
          />
          <div className="max-h-[460px] space-y-2 overflow-y-auto p-5 pt-3">
            {tab === 'goals' &&
              m.objectives.map((o) => {
                const c = cov.items.find((i) => i.objectiveId === o.id)!;
                return (
                  <div key={o.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-start gap-2">
                      <Badge tone={KIND_META[o.kind].tone}>{KIND_META[o.kind].label}</Badge>
                      <span className="flex-1 text-[13px] font-medium text-slate-800">{o.text}</span>
                      <StatusPill status={aiMap[o.id] ?? c.status} kind={o.kind} />
                      {aiMap[o.id] && <Badge tone="indigo">AI</Badge>}
                    </div>
                    {c.evidence.length > 0 ? (
                      <div className="mt-2 space-y-1.5">
                        {c.evidence.slice(0, 2).map((e) => (
                          <div key={e.utteranceId} className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[12px] leading-5 text-slate-600">
                            <span className="mr-1 font-medium text-slate-700">{e.speaker}</span>
                            {e.text.length > 70 ? `${e.text.slice(0, 70)}…` : e.text}
                          </div>
                        ))}
                        {o.kind === 'action' && (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            <Badge tone={c.owner ? 'green' : 'red'}>负责人：{c.owner ?? '未识别'}</Badge>
                            <Badge tone={c.due ? 'green' : 'red'}>截止：{c.due ?? '未识别'}</Badge>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 text-[12px] text-slate-400">暂无相关发言</div>
                    )}
                  </div>
                );
              })}

            {tab === 'agenda' &&
              cov.stages.map((s) => (
                <div key={s.stageId} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-slate-800">{s.name}</span>
                    <Badge tone={s.covered ? 'green' : 'red'}>{s.covered ? `已进行 · ${s.utterances} 条` : '未进行'}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.stages.find((x) => x.id === s.stageId)!.requiredSpeakers.map((r) => {
                      const ok = !s.missingSpeakers.includes(r);
                      return (
                        <Badge key={r} tone={ok ? 'green' : 'red'}>
                          {r}
                          {ok ? ' ✓' : ' 未表态'}
                        </Badge>
                      );
                    })}
                    {m.stages.find((x) => x.id === s.stageId)!.requiredSpeakers.length === 0 && <span className="text-[12px] text-slate-400">未设置必发言人</span>}
                  </div>
                </div>
              ))}

            {tab === 'speakers' &&
              cov.speakers.map((s) => (
                <div key={s.name} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-slate-800">{s.name}</div>
                    <div className="text-[11.5px] text-slate-400">{s.role}</div>
                  </div>
                  <Badge tone={s.spoke ? 'green' : 'red'}>{s.spoke ? `已发言 ${s.count} 次` : '未发言'}</Badge>
                  <span className="w-16 text-right text-[12px] text-slate-400">{s.words} 字</span>
                </div>
              ))}
          </div>
          <div className="border-t border-slate-100 p-4">
            <Btn variant="primary" className="w-full" onClick={prepareEnd} disabled={m.transcript.length === 0 || analysisBusy}>
              {analysisBusy ? '分析会议中…' : '准备结束会议 · 检查缺口 →'}
            </Btn>
            {!!m.llmAnalysis && (
              <div className="mt-2 text-center text-[11.5px] text-indigo-600">
                已调用大模型分析：{m.llmAnalysis.blockingIssues.length} 项阻塞 / {m.llmAnalysis.followUpIssues.length} 项会后跟进
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
