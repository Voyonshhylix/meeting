import { NextResponse } from 'next/server';
import { callTranscription } from '@/lib/providers';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File) && typeof file !== 'object') {
      return NextResponse.json({ error: '请上传音频文件' }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: '上传内容不是文件' }, { status: 400 });
    }
    const res = await callTranscription(file);
    return NextResponse.json({ transcript: res.transcript });
  } catch (e) {
    // 失败不抛 500，让前端在页面内提示 Retry（不会弄坏现有 Demo）
    return NextResponse.json({ error: e instanceof Error ? e.message : '转写失败' }, { status: 200 });
  }
}
