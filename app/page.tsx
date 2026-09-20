import Link from 'next/link';

const PAINS = [
  { t: '会前没有定义要达成什么', d: '开会前先把 Key Goal / Conclusion / Decision / Action 写清楚，并逐项标注「必须 / 建议 / 记录」。' },
  { t: '讨论发散，关键问题没解决', d: '按环节推进，每个环节指定必须发言的人，谁没表态一眼可见。' },
  { t: '负责人没表达意见', d: '环节×发言人矩阵，实时显示「已表态 / 未表态」。' },
  { t: '临结束才发现没决策、没 owner', d: '点击「准备结束会议」，逐项回答：还缺什么讨论、什么确认、什么决定。' },
  { t: '会后只有摘要，不知道目标达没达成', d: '生成结构化总结：结论、决策、行动项（含 owner/截止）、未决问题与保留风险。' },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1080px] items-center gap-3 px-5 py-3">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-600 text-[13px] font-bold text-white">M</span>
          <span className="text-[14px] font-semibold text-slate-900">有效会议助手 · Meeting Copilot</span>
          <Link href="/meeting" className="ml-auto rounded-lg bg-indigo-600 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-indigo-700">
            打开工具 →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1080px] px-5 py-10">
        <section className="animate-fade">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-[12px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200">
            会前定目标 · 会中查覆盖 · 会前结束前查缺口
          </span>
          <h1 className="mt-4 text-[34px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[42px]">
            会议结束前，<span className="text-indigo-600">还差什么</span>没讨论、没确认、没决定？
          </h1>
          <p className="mt-4 max-w-[720px] text-[15px] leading-7 text-slate-600">
            大多数会议工具只回答「记录了什么」。有效会议助手回答另一个问题：
            <b className="text-slate-900">为了达成本次会议目标，还有什么没有讨论、没有确认、没有决定？</b>
            会前定义目标与议程，会中实时看覆盖情况，点击「准备结束会议」立即得到缺口清单，并区分「阻塞结束」与「可会后跟进」。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/meeting?demo=launch" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-[14px] font-medium text-white shadow-sm transition hover:bg-indigo-700">
              ⚡ 一键体验示例会议（6 分钟）
            </Link>
            <Link href="/meeting" className="rounded-xl bg-white px-5 py-2.5 text-[14px] font-medium text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50">
              用模板创建一场会议
            </Link>
          </div>
          <p className="mt-3 text-[12.5px] text-slate-400">无需注册、无需登录；数据保存在你自己的浏览器里（localStorage）。</p>
        </section>

        <section className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {PAINS.map((p) => (
            <div key={p.t} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-[14px] font-semibold text-slate-900">{p.t}</div>
              <p className="mt-1.5 text-[12.5px] leading-6 text-slate-500">{p.d}</p>
            </div>
          ))}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4">
            <div className="text-[14px] font-semibold text-indigo-900">会中主动提示（Nice-to-have）</div>
            <p className="mt-1.5 text-[12.5px] leading-6 text-indigo-900/70">
              例如：「销售负责人 赵敏 还没有确认目标客户和定价方案。」——由规则引擎实时算出，不依赖外部模型。
            </p>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-[20px] font-semibold text-slate-900">主流程</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-6">
            {['创建会议', '选择模板', '输入目标与议程', '录入/加载讨论内容', '检查覆盖情况', '结束前缺口提示 → 总结'].map((s, i) => (
              <div key={s} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-[11px] font-mono text-slate-400">STEP {i + 1}</div>
                <div className="mt-1 text-[13px] font-medium text-slate-800">{s}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-[16px] font-semibold text-slate-900">怎么用（评审可直接照做）</h2>
            <ol className="mt-3 space-y-2 text-[13px] leading-6 text-slate-600">
              <li>1. 打开工具 → 三种方式录入会议：点「🎙 录音录入」实时录制、点「⬆ 上传录音」传音频（mp3/wav/m4a/webm/mp4）、或点「📋 粘贴转录」粘贴文本；也可直接载入示例会议。</li>
              <li>2. 在「会中记录」页点 <b>▶ 逐条推进演示</b>，看覆盖看板随讨论实时变化。</li>
              <li>3. 点「准备结束会议 · 检查缺口」，查看阻塞项与可会后跟进项。</li>
              <li>4. 对任一缺口选择：转为行动项 / 记录例外原因 / 返回继续讨论。</li>
              <li>5. 处理完阻塞项后点「结束会议并生成总结」，可复制或下载 Markdown。</li>
              <li>6. 想换数据：新建会议 → 选其它模板，或批量粘贴自己的会议记录。</li>
            </ol>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
            <h2 className="text-[16px] font-semibold text-emerald-900">已实现 · Real</h2>
            <ul className="mt-3 space-y-2 text-[13px] leading-6 text-emerald-900/85">
              <li>• 浏览器麦克风录音（MediaRecorder）：开始 / 停止后自动上传</li>
              <li>• 音频文件上传：mp3 / wav / m4a / webm / mp4</li>
              <li>• 语音转文字：调用你的「会议转写 API」（服务端配置，Key 不暴露在前端）</li>
              <li>• 大模型会议分析：目标 / 议程 / 发言人覆盖、决策、行动项、阻塞与会后跟进项（服务端 LLM API）</li>
              <li>• 逐字稿编辑、结束前缺口检查、「准备结束会议」与结构化总结</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-[16px] font-semibold text-slate-700">未接入 · Not integrated</h2>
            <ul className="mt-3 space-y-2 text-[13px] leading-6 text-slate-500">
              <li>• Zoom / Google Meet / Teams 原生接入</li>
              <li>• 实时流式转写（streaming / websocket）</li>
              <li>• 云端账号与多端同步（数据仅保存在本地浏览器）</li>
            </ul>
          </div>
        </section>

        <footer className="mt-12 border-t border-slate-200 pt-6 text-[12.5px] text-slate-400">
          有效会议助手 · 单页可用 Demo · 数据仅保存在本地浏览器 · 不做任何上传
        </footer>
      </main>
    </div>
  );
}
