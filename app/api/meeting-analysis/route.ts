import { NextResponse } from 'next/server';
import { callMeetingAnalysis, type AnalysisInput } from '@/lib/providers';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AnalysisInput;
    if (!body?.transcript?.length) {
      return NextResponse.json({ error: '还没有会议内容，无法分析' }, { status: 400 });
    }
    const analysis = await callMeetingAnalysis(body);
    return NextResponse.json({ analysis });
  } catch (e) {
    // 失败不抛 500，前端自动 fallback 到内置规则引擎
    return NextResponse.json({ error: e instanceof Error ? e.message : '分析失败' }, { status: 200 });
  }
}
