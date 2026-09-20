'use client';

import { useMemo, useState } from 'react';
import type { Meeting } from '@/lib/types';
import { buildGaps, buildSummary, computeCoverage, summaryToMarkdown } from '@/lib/engine';
import { Badge, Btn, Card, ProgressBar, SectionTitle } from './ui';

interface Props {
  meeting: Meeting;
  onRestart: () => void;
}

export default function SummaryStep({ meeting: m, onRestart }: Props) {
  const cov = useMemo(() => computeCoverage(m), [m]);
  const gaps = useMemo(() => buildGaps(m, cov), [m, cov]);
  const s = useMemo(() => buildSummary(m, cov, gaps), [m, cov, gaps]);
  const md = useMemo(() => summaryToMarkdown(m, s, cov), [m, s, cov]);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const download = () => {
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${m.title}-会议总结.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Card>
      <SectionTitle title={title} />
      <div className="p-5 pt-3">{children}</div>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-4 p-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge tone="green">会议已结束</Badge>
              <span className="text-[12px] text-slate-400">{new Date(s.finishedAt).toLocaleString('zh-CN')}</span>
            </div>
            <h3 className="mt-1.5 truncate text-[17px] font-semibold text-slate-900">{s.title}</h3>
            <div className="mt-2 flex items-center gap-3">
              <div className="w-56">
                <ProgressBar value={cov.score} />
              </div>
              <span className="text-[12.5px] text-slate-500">目标达成度 {cov.score}% · {m.transcript.length} 条发言 · {m.participants.length} 人参会</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={copy}>
              {copied ? '已复制 ✓' : '复制 Markdown'}
            </Btn>
            <Btn variant="soft" onClick={download}>
              下载 .md
            </Btn>
            <Btn variant="primary" onClick={onRestart}>
              新建一场会议
            </Btn>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Block title="一、原会议目标">
          <ul className="space-y-1.5">
            {s.goals.map((g) => (
              <li key={g.id} className="flex items-start gap-2 text-[13px] text-slate-700">
                <Badge tone={g.priority === 'must' ? 'red' : g.priority === 'should' ? 'amber' : 'slate'}>
                  {g.priority === 'must' ? '必须' : g.priority === 'should' ? '建议' : '记录'}
                </Badge>
                <span>{g.text}</span>
              </li>
            ))}
            {s.goals.length === 0 && <li className="text-[13px] text-slate-400">未设置目标</li>}
          </ul>
        </Block>

        <Block title="二、已达成的结论">
          <ul className="space-y-2">
            {s.conclusions.map((c, i) => (
              <li key={i} className="text-[13px] text-slate-700">
                <div>• {c.text}</div>
                {c.evidence[0] && <div className="mt-1 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[12px] text-slate-500">依据：{c.evidence[0].speaker}「{c.evidence[0].text.slice(0, 60)}…」</div>}
              </li>
            ))}
            {s.conclusions.length === 0 && <li className="text-[13px] text-slate-400">本次会议未形成可确认的结论</li>}
          </ul>
        </Block>

        <Block title="三、决策事项">
          <ul className="space-y-2">
            {s.decisions.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px]">
                <Badge tone={d.decided ? 'green' : 'red'}>{d.decided ? '已决策' : '未决策'}</Badge>
                <span className="flex-1 text-slate-700">{d.text}</span>
              </li>
            ))}
            {s.decisions.length === 0 && <li className="text-[13px] text-slate-400">无决策项</li>}
          </ul>
        </Block>

        <Block title="四、行动项（负责人 / 截止）">
          <ul className="space-y-2">
            {s.actions.map((a, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-slate-700">
                <span className="flex-1">{a.text}</span>
                <Badge tone={a.owner === '待定' ? 'red' : 'green'}>{a.owner}</Badge>
                <Badge tone={a.due === '待定' ? 'red' : 'green'}>{a.due}</Badge>
              </li>
            ))}
            {s.actions.length === 0 && <li className="text-[13px] text-slate-400">无行动项</li>}
          </ul>
        </Block>

        <Block title="五、未解决的问题">
          <ul className="space-y-1.5">
            {s.openIssues.map((o, i) => (
              <li key={i} className="text-[13px] text-slate-700">
                • {o.text}
                {o.reason && <span className="ml-1 text-[12px] text-slate-400">（{o.reason}）</span>}
              </li>
            ))}
            {s.openIssues.length === 0 && <li className="text-[13px] text-slate-400">无</li>}
          </ul>
        </Block>

        <Block title="六、保留的风险与例外">
          <ul className="space-y-2">
            {s.risks.map((r, i) => (
              <li key={i} className="rounded-lg bg-rose-50/60 px-3 py-2 text-[13px] text-rose-900">
                <div>{r.text}</div>
                <div className="mt-0.5 text-[12px] text-rose-700/70">例外原因：{r.reason}</div>
              </li>
            ))}
            {s.risks.length === 0 && <li className="text-[13px] text-slate-400">无</li>}
          </ul>
        </Block>
      </div>
    </div>
  );
}
