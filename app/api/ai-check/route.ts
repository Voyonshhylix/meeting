import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface ReqBody {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  objectives: { id: string; kind: string; text: string; priority: string }[];
  transcript: { speaker: string; text: string }[];
}

const SYS = `你是会议目标达成度检查助手。给定「会前目标清单」和「会议逐字稿」，逐项判断每一项目标的达成状态。
判定标准：
- decided：已形成明确结论/决策，或行动项已明确负责人与截止时间
- discussed：有实质讨论但没有明确结论
- mentioned：只是顺带提到，没有实质讨论
- missing：完全没有提到
只依据逐字稿内容判断，不得臆造。若行动项有负责人/截止时间，同时给出 owner / due（原文中的表述）。
只输出 JSON 数组，不要任何解释文字。格式：
[{"id":"o1","status":"decided","reason":"依据简述","owner":"王睿","due":"9月24号"}]`;

/** 服务端接入状态：前端据此决定是否显示「已接入模型」 */
export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.AI_API_KEY),
    baseUrl: process.env.AI_BASE_URL || 'https://api.deepseek.com/v1',
    model: process.env.AI_MODEL || 'deepseek-chat',
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReqBody;
    // 优先用调用方自带的 Key，其次用服务端环境变量（Vercel / .env.local）
    const apiKey = body.apiKey || process.env.AI_API_KEY || '';
    if (!apiKey) return NextResponse.json({ error: '服务端未配置 AI_API_KEY，且未提供自定义 Key' }, { status: 200 });
    if (!body.objectives?.length) return NextResponse.json({ error: '没有目标项' }, { status: 400 });

    const baseUrl = (body.baseUrl || process.env.AI_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '');
    const model = body.model || process.env.AI_MODEL || 'deepseek-chat';
    const script = body.transcript
      .slice(0, 200)
      .map((u) => `${u.speaker}：${u.text}`)
      .join('\n')
      .slice(0, 12000);

    const user = `【会前目标清单】\n${body.objectives
      .map((o) => `- id=${o.id} | ${o.kind} | ${o.priority} | ${o.text}`)
      .join('\n')}

【会议逐字稿】
${script || '（本次会议暂无内容）'}`;

    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: SYS }, { role: 'user', content: user }], temperature: 0.2 }),
    });

    if (!r.ok) {
      const t = await r.text();
      return NextResponse.json({ error: `模型请求失败（${r.status}）：${t.slice(0, 200)}` }, { status: 200 });
    }
    const json = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? '';
    const m = raw.match(/\[[\s\S]*\]/);
    if (!m) return NextResponse.json({ error: '模型未返回可解析的 JSON' }, { status: 200 });
    const items = JSON.parse(m[0]) as { id: string; status: string; reason?: string; owner?: string; due?: string }[];
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '未知错误' }, { status: 200 });
  }
}
