// ============================================================================
// 第三方服务适配层（服务端专用，任何 Key 都不允许出现在前端）
//
// 你已经在「统一 API 配置」里提供了：
//   TRANSCRIPTION_API_URL / TRANSCRIPTION_API_KEY   —— 会议录音转写
//   LLM_API_URL          / LLM_API_KEY              —— 大模型会议分析
//   可选：APP_ID / SECRET / MODEL_NAME                —— 视你的服务而定
//
// 下面两个函数就是「填入请求格式」的唯一位置。默认实现按最常见的形态写好了，
// 如果你的服务字段名/鉴权方式不同，只需改这两个函数即可，其它代码不用动。
// ============================================================================

import type { LlmAnalysis } from './types';

/* ---------------------------------- 转写 ---------------------------------- */

export interface TranscribeResult {
  transcript: string;
  raw?: unknown;
}

/**
 * 调用你的「会议录音转写 API」。
 * 默认形态：POST 音频文件（multipart/form-data 的 field=file），可选 Bearer 鉴权，
 * 响应里取 transcript / text / result / data.text 任一字段作为转写文本。
 * 👉 改这里以匹配你真实的请求 / 响应格式。
 */
export async function callTranscription(file: File): Promise<TranscribeResult> {
  const url = process.env.TRANSCRIPTION_API_URL;
  const key = process.env.TRANSCRIPTION_API_KEY;
  if (!url) throw new Error('服务端未配置 TRANSCRIPTION_API_URL（请在 Vercel 环境变量里填写）');

  const fd = new FormData();
  fd.append('file', file); // 如需别的字段名（如 audio / recording），改这里
  // 如需 APP_ID / SECRET 等额外字段，可在 fd 里继续 append
  if (process.env.APP_ID) fd.append('app_id', process.env.APP_ID);
  if (process.env.SECRET) fd.append('secret', process.env.SECRET);

  const headers: Record<string, string> = {};
  if (key) headers['Authorization'] = `Bearer ${key}`; // 其它鉴权方式（如 apikey: xxx）改这里

  const r = await fetch(url, { method: 'POST', headers, body: fd });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`转写服务返回 ${r.status}：${t.slice(0, 200)}`);
  }
  const j = (await r.json().catch(() => ({}))) as Record<string, any>;
  const transcript: string =
    j?.transcript ?? j?.text ?? j?.result ?? j?.data?.text ?? j?.transcript_text ?? '';
  if (!transcript) throw new Error('转写结果里没有找到 transcript 字段，请检查你的响应结构并在 providers.ts 调整取值路径');
  return { transcript: String(transcript), raw: j };
}

/* ------------------------------- 大模型分析 ------------------------------- */

export interface AnalysisInput {
  title: string;
  meetingType: string;
  keyGoal: string[];
  keyConclusions: string[];
  keyDecisions: string[];
  agenda: string[];
  requiredSpeakers: string[];
  requiredActionItems: string[];
  transcript: { speaker: string; text: string }[];
}

const ANALYSIS_SYS = `你是会议分析与缺口检查助手。阅读下面给出的会议信息（目标 / 结论 / 决策 / 议程 / 必须发言人 / 行动项 / 逐字稿），
只依据逐字稿内容判断，禁止编造逐字稿中不存在的信息。

请严格输出如下结构的 JSON 对象（不要任何解释文字、不要 markdown 代码块）：
{
  "goalCoverage": [ { "objectiveId": "可选，对应传入的条目文本", "text": "目标/结论/决策原文", "status": "covered|partial|missing", "note": "一句说明" } ],
  "agendaCoverage": [ { "stage": "环节名", "covered": true|false, "note": "一句说明" } ],
  "speakerCoverage": [ { "speaker": "发言人", "spoke": true|false, "note": "未发言要写明为什么是问题" } ],
  "decisions": [ { "text": "决策事项", "decided": true|false, "note": "讨论过但没决定就 false" } ],
  "actionItems": [ { "text": "行动项", "owner": "负责人，缺则写 missing", "deadline": "截止时间，缺则写 missing" } ],
  "blockingIssues": [ { "id": "b1", "type": "topic-missing", "title": "阻塞标题", "detail": "说明", "suggestion": "建议怎么处理" } ],
  "followUpIssues": [ { "id": "f1", "type": "stage-missing", "title": "可会后跟进的标题", "detail": "说明", "suggestion": "建议" } ],
  "summary": "结构化总结：目标达成情况 / 关键结论 / 决策 / 行动项 / 未决问题 / 风险"
}
规则：
- blockingIssues：必须决定但未决定、必须发言人未表态、行动项缺 owner、行动项缺 deadline、关键议题未覆盖。
- followUpIssues：可会后继续处理、不阻塞会议结束的问题。
- 每个 issue 的 id 必须全局唯一（b 开头表阻塞，f 开头表会后跟进）。
- actionItems 里没有 owner 就写 "missing"，没有 deadline 就写 "missing"。
- speakerCoverage 里缺席表达的人要明确标出 spoke=false 并说明。`;

/**
 * 调用你的「大模型会议分析 API」。
 * 默认形态：OpenAI 兼容的 POST {base}/chat/completions，返回 choices[0].message.content（JSON）。
 * 👉 如果你的模型接口字段不同（如火山方舟 / 通义 / 自建网关），改这里即可。
 */
export async function callMeetingAnalysis(input: AnalysisInput): Promise<LlmAnalysis> {
  const base = process.env.LLM_API_URL;
  const key = process.env.LLM_API_KEY;
  const model = process.env.MODEL_NAME || process.env.LLM_MODEL || 'deepseek-chat';
  if (!base || !key) throw new Error('服务端未配置 LLM_API_URL 或 LLM_API_KEY（请在 Vercel 环境变量里填写）');

  const url = base.endsWith('/chat/completions') ? base : `${base.replace(/\/$/, '')}/chat/completions`;

  const user = `【会议标题】${input.title}
【会议类型】${input.meetingType}
【关键目标】\n${input.keyGoal.map((t) => `- ${t}`).join('\n') || '（无）'}
【关键结论】\n${input.keyConclusions.map((t) => `- ${t}`).join('\n') || '（无）'}
【关键决策】\n${input.keyDecisions.map((t) => `- ${t}`).join('\n') || '（无）'}
【议程】\n${input.agenda.map((t) => `- ${t}`).join('\n') || '（无）'}
【必须发言人】${input.requiredSpeakers.join('、') || '（无）'}
【必须产生的行动项】\n${input.requiredActionItems.map((t) => `- ${t}`).join('\n') || '（无）'}
【会议逐字稿】
${input.transcript.map((u) => `${u.speaker}：${u.text}`).join('\n') || '（暂无内容）'}`;

  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: ANALYSIS_SYS },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`模型服务返回 ${r.status}：${t.slice(0, 200)}`);
  }
  const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = j.choices?.[0]?.message?.content ?? '';
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('模型未返回可解析的 JSON');
  const parsed = JSON.parse(m[0]) as Partial<LlmAnalysis>;
  return {
    generatedAt: new Date().toISOString(),
    goalCoverage: parsed.goalCoverage ?? [],
    agendaCoverage: parsed.agendaCoverage ?? [],
    speakerCoverage: parsed.speakerCoverage ?? [],
    decisions: parsed.decisions ?? [],
    actionItems: (parsed.actionItems ?? []).map((a) => ({
      text: a.text,
      owner: a.owner && a.owner !== 'missing' ? a.owner : 'missing',
      deadline: a.deadline && a.deadline !== 'missing' ? a.deadline : 'missing',
    })),
    blockingIssues: parsed.blockingIssues ?? [],
    followUpIssues: parsed.followUpIssues ?? [],
    summary: parsed.summary ?? '',
    source: 'live',
  };
}
