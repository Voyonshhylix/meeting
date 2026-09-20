'use client';

import type { ReactNode } from 'react';
import type { Priority, ItemStatus, ObjectiveKind } from '@/lib/types';
import { statusLabel } from '@/lib/labels';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white/90 shadow-[0_1px_2px_rgba(16,19,34,.04),0_8px_24px_-12px_rgba(16,19,34,.12)] ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ title, desc, right }: { title: string; desc?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-4">
      <div>
        <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
        {desc && <p className="mt-1 text-[12.5px] leading-5 text-slate-500">{desc}</p>}
      </div>
      {right}
    </div>
  );
}

const TONES: Record<string, string> = {
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
};

export function Badge({ tone = 'slate', children, className = '' }: { tone?: keyof typeof TONES | string; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[11.5px] font-medium ring-1 ring-inset ${TONES[tone] ?? TONES.slate} ${className}`}>
      {children}
    </span>
  );
}

export const PRIORITY_LABEL: Record<Priority, string> = { must: '必须完成', should: '建议完成', note: '仅供记录' };
export const PRIORITY_TONE: Record<Priority, string> = { must: 'red', should: 'amber', note: 'slate' };

export function PriorityTag({ p }: { p: Priority }) {
  return <Badge tone={PRIORITY_TONE[p]}>{PRIORITY_LABEL[p]}</Badge>;
}

export const STATUS_META: Record<ItemStatus, { label: string; tone: string; icon: string }> = {
  decided: { label: '已达成 / 已决策', tone: 'green', icon: '✓' },
  discussed: { label: '已讨论 · 未确认', tone: 'amber', icon: '◐' },
  mentioned: { label: '仅提及', tone: 'blue', icon: '○' },
  missing: { label: '未覆盖', tone: 'red', icon: '!' },
};

export function StatusPill({ status, kind }: { status: ItemStatus; kind?: ObjectiveKind }) {
  const m = STATUS_META[status];
  return (
    <Badge tone={m.tone}>
      <span className="opacity-70">{m.icon}</span>
      {statusLabel(status, kind)}
    </Badge>
  );
}

export function ProgressBar({ value, tone = 'indigo' }: { value: number; tone?: string }) {
  const color = value >= 80 ? 'bg-emerald-500' : value >= 50 ? 'bg-indigo-500' : value >= 25 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Btn({ children, onClick, variant = 'ghost', size = 'md', disabled, className = '', title }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost' | 'soft' | 'danger'; size?: 'sm' | 'md'; disabled?: boolean; className?: string; title?: string;
}) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-45';
  const sizes = size === 'sm' ? 'px-2.5 py-1 text-[12px]' : 'px-3.5 py-2 text-[13px]';
  const variants: Record<string, string> = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
    soft: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 ring-1 ring-inset ring-indigo-200',
    ghost: 'bg-white text-slate-600 hover:bg-slate-50 ring-1 ring-inset ring-slate-200',
    danger: 'bg-rose-50 text-rose-600 hover:bg-rose-100 ring-1 ring-inset ring-rose-200',
  };
  return (
    <button type="button" title={title} onClick={onClick} disabled={disabled} className={`${base} ${sizes} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-slate-400">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';

export function Empty({ text }: { text: string }) {
  return <div className="px-5 py-8 text-center text-[13px] text-slate-400">{text}</div>;
}
