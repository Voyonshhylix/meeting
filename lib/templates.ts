import type { MeetingTemplate, Utterance, Meeting, AgendaStage, Objective } from './types';

export const TEMPLATES: MeetingTemplate[] = [
  {
    id: 'launch',
    name: '产品上线决策会',
    scene: '版本即将发布，需要在会上拍板是否按期上线、灰度比例与回滚预案',
    desc: '适用于发版前的 Go / No-Go 决策。重点防止「讨论很久但没拍板」和「关键角色没表态」。',
    mode: '环节×发言人矩阵',
    participants: [
      { name: '林哲', role: '产品负责人 / 主持人' },
      { name: '王睿', role: '技术负责人' },
      { name: '陈曦', role: '设计负责人' },
      { name: '孙浩', role: '数据' },
      { name: '周琳', role: '市场' },
      { name: '赵敏', role: '销售负责人' },
    ],
    stages: [
      { name: '背景与目标回顾', minutes: 5, requiredSpeakers: ['林哲'], desc: '对齐本次要决策的事' },
      { name: '方案与进度确认', minutes: 10, requiredSpeakers: ['王睿', '陈曦'], desc: '研发与设计进度' },
      { name: '风险与依赖', minutes: 8, requiredSpeakers: ['王睿', '孙浩'], desc: '风险、回滚、监控' },
      { name: '决策：是否按期上线', minutes: 10, requiredSpeakers: ['林哲', '赵敏', '王睿'], desc: 'Go / No-Go' },
      { name: '下一步与行动项', minutes: 5, requiredSpeakers: ['林哲'], desc: 'owner + 截止时间' },
    ],
    objectives: [
      { id: 'o1', kind: 'goal', priority: 'must', text: '确认 v2.3 是否按 9 月 25 日按期上线', keywords: ['上线', '9月25', '按期', 'v2.3'], stageId: 's4' },
      { id: 'o2', kind: 'conclusion', priority: 'must', text: '明确上线范围：新版智能推荐卡片 + 订阅流程', keywords: ['上线范围', '推荐卡片', '订阅流程'], stageId: 's2' },
      { id: 'o3', kind: 'decision', priority: 'must', text: '决策是否按期上线（按期 / 延期 / 先灰度）', keywords: ['是否', '按期上线', '上线', '延期'], stageId: 's4' },
      { id: 'o4', kind: 'decision', priority: 'must', text: '确定灰度比例（10% 还是 20%）', keywords: ['灰度', '比例'], stageId: 's4' },
      { id: 'o5', kind: 'decision', priority: 'must', text: '确认定价方案与首批发售目标客群', keywords: ['定价', '目标客群', '客群'], stageId: 's4' },
      { id: 'o6', kind: 'conclusion', priority: 'should', text: '确认上线风险清单与回滚方案', keywords: ['风险', '回滚'], stageId: 's3' },
      { id: 'o7', kind: 'action', priority: 'must', text: '灰度方案与回滚预案的负责人与完成时间', keywords: ['灰度', '回滚', '负责人'], stageId: 's5' },
      { id: 'o8', kind: 'action', priority: 'must', text: '上线后数据监控看板的负责人与上线时间', keywords: ['数据看板', '监控看板', '看板'], stageId: 's5' },
      { id: 'o9', kind: 'action', priority: 'should', text: '官网首页文案补充', keywords: ['官网', '文案'], stageId: 's5' },
    ],
  },
  {
    id: 'retro',
    name: '项目复盘会',
    scene: '迭代结束后复盘目标达成、延期原因与下个迭代的流程改动',
    desc: '适用于迭代/项目结束后的复盘。重点防止「只陈述现象、没有结论和改进行动」。',
    mode: '按时间顺序',
    participants: [
      { name: '何静', role: '项目经理 / 主持人' },
      { name: '李涛', role: '后端' },
      { name: '郑楠', role: '前端' },
      { name: '吴倩', role: 'QA' },
      { name: '陈曦', role: '设计' },
    ],
    stages: [
      { name: '目标回顾', minutes: 5, requiredSpeakers: ['何静'], desc: '原定目标与验收标准' },
      { name: '结果对比', minutes: 8, requiredSpeakers: ['何静', '李涛'], desc: '实际结果 vs 目标' },
      { name: '原因分析', minutes: 12, requiredSpeakers: ['李涛', '郑楠', '吴倩'], desc: '定位根因' },
      { name: '经验沉淀', minutes: 8, requiredSpeakers: ['陈曦'], desc: '可复用做法' },
      { name: '改进行动', minutes: 7, requiredSpeakers: ['何静'], desc: 'owner + 截止时间' },
    ],
    objectives: [
      { id: 'r1', kind: 'goal', priority: 'must', text: '确认 Q3 迭代是否达成原定交付目标', keywords: ['交付目标', '达成', '迭代'], stageId: 's2' },
      { id: 'r2', kind: 'conclusion', priority: 'must', text: '形成延期主因的统一结论', keywords: ['延期', '主因', '原因'], stageId: 's3' },
      { id: 'r3', kind: 'decision', priority: 'must', text: '决策下个迭代要改的流程项（评审 / 提测 / 验收）', keywords: ['流程', '提测', '验收', '评审'], stageId: 's5' },
      { id: 'r4', kind: 'action', priority: 'must', text: '流程改进的负责人与落地时间', keywords: ['流程', '改进', '负责人'], stageId: 's5' },
      { id: 'r5', kind: 'conclusion', priority: 'should', text: '沉淀 2 条可复用的团队协作经验', keywords: ['经验', '复用'], stageId: 's4' },
    ],
  },
  {
    id: 'customer',
    name: '客户推进会',
    scene: '推进重点客户，确认卡点、报价底线与下一步承诺',
    desc: '适用于大客户/商机推进。重点防止「客户承诺含糊、内部责任人不明确」。',
    mode: '按发言人顺序',
    participants: [
      { name: '赵敏', role: '销售负责人 / 主持人' },
      { name: '张可', role: '客户成功' },
      { name: '刘洋', role: '售前' },
      { name: '林哲', role: '产品' },
      { name: '顾清', role: '法务' },
    ],
    stages: [
      { name: '客户背景与目标', minutes: 5, requiredSpeakers: ['赵敏'], desc: '客户诉求与本场目标' },
      { name: '当前进展与卡点', minutes: 12, requiredSpeakers: ['张可', '刘洋'], desc: '卡在哪、谁卡住' },
      { name: '下一步承诺', minutes: 10, requiredSpeakers: ['赵敏', '林哲', '顾清'], desc: '对内对外承诺' },
      { name: '内部协同', minutes: 5, requiredSpeakers: ['赵敏'], desc: 'owner + 截止时间' },
    ],
    objectives: [
      { id: 'c1', kind: 'goal', priority: 'must', text: '确认 A 客户本周是否进入 POC 阶段', keywords: ['poc', '客户', '本周'], stageId: 's2' },
      { id: 'c2', kind: 'decision', priority: 'must', text: '决策报价与折扣底线', keywords: ['报价', '折扣', '底线'], stageId: 's3' },
      { id: 'c3', kind: 'decision', priority: 'must', text: '明确合同签署时间节点', keywords: ['合同', '签署', '时间'], stageId: 's3' },
      { id: 'c4', kind: 'action', priority: 'must', text: 'POC 方案交付的负责人与截止时间', keywords: ['poc', '方案', '负责人'], stageId: 's4' },
      { id: 'c5', kind: 'conclusion', priority: 'should', text: '汇总客户侧尚未解决的问题清单', keywords: ['未解决', '问题清单', '卡点'], stageId: 's2' },
    ],
  },
  {
    id: 'exec',
    name: '管理层决策会',
    scene: '预算、优先级与资源投入的高层决策',
    desc: '适用于 CXO/管理层会议。重点防止「议题没有明确结论、责任人缺位」。',
    mode: '环节推进',
    participants: [
      { name: 'CEO', role: '主持人' },
      { name: 'CFO', role: '财务' },
      { name: 'CTO', role: '技术' },
      { name: 'CMO', role: '市场' },
    ],
    stages: [
      { name: '议题背景', minutes: 5, requiredSpeakers: ['CEO'], desc: '为什么现在要决策' },
      { name: '方案对比', minutes: 12, requiredSpeakers: ['CTO', 'CMO'], desc: '2~3 个备选方案' },
      { name: '财务影响', minutes: 8, requiredSpeakers: ['CFO'], desc: '成本与回报' },
      { name: '决策', minutes: 10, requiredSpeakers: ['CEO', 'CFO'], desc: '拍板' },
      { name: '分工与时间', minutes: 5, requiredSpeakers: ['CEO'], desc: 'owner + 截止时间' },
    ],
    objectives: [
      { id: 'e1', kind: 'decision', priority: 'must', text: '是否批准本次预算', keywords: ['预算', '批准'], stageId: 's4' },
      { id: 'e2', kind: 'decision', priority: 'must', text: '确定三个候选项的优先级排序', keywords: ['优先级', '排序'], stageId: 's4' },
      { id: 'e3', kind: 'action', priority: 'must', text: '落地负责人与复盘时间', keywords: ['负责人', '复盘'], stageId: 's5' },
      { id: 'e4', kind: 'conclusion', priority: 'should', text: '记录本次决策的主要风险', keywords: ['风险'], stageId: 's3' },
    ],
  },
];

export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

let uid = 0;
export const uidGen = (p: string) => `${p}${Date.now().toString(36)}${(uid++).toString(36)}`;

/** 由模板创建一场会议 */
export function createMeetingFromTemplate(templateId: string, title?: string): Meeting {
  const t = getTemplate(templateId);
  const stages: AgendaStage[] = t.stages.map((s, i) => ({ ...s, id: `s${i + 1}` }));
  const objectives: Objective[] = t.objectives.map((o) => ({
    ...o,
    id: o.id ?? uidGen('o'),
  }));
  return {
    id: uidGen('m'),
    title: title ?? `${t.name} · ${new Date().toLocaleDateString('zh-CN')}`,
    templateId: t.id,
    createdAt: new Date().toISOString(),
    participants: t.participants.map((p) => ({ ...p })),
    stages,
    objectives,
    transcript: [],
    status: 'planning',
    exceptions: [],
    resolvedGaps: [],
  };
}

// ============ 预置模拟会议（可直接加载演示） ============

const launchScript: Omit<Utterance, 'id'>[] = [
  { t: 0, speaker: '林哲', role: '产品负责人 / 主持人', stageId: 's1', text: '今天是个 6 分钟的快速会，目标只有一个：确认 v2.3 是不是按 9 月 25 日上线。先过一下背景。' },
  { t: 20, speaker: '林哲', role: '产品负责人 / 主持人', stageId: 's1', text: '本次上线范围是新版智能推荐卡片和订阅流程，灰度先按 10% 放。' },
  { t: 45, speaker: '王睿', role: '技术负责人', stageId: 's2', text: '后端接口和灰度开关已经就绪，压测到 QPS 3000 没问题，还剩两个 P1 缺陷在修。' },
  { t: 72, speaker: '陈曦', role: '设计负责人', stageId: 's2', text: '视觉和交互终稿已交付，订阅流程从三步改两步已经落地，只差官网首页那一版文案。' },
  { t: 95, speaker: '孙浩', role: '数据', stageId: 's2', text: '埋点和数据看板方案我做了一版，A/B 实验的分流逻辑和指标口径已经跟数据团队对齐。' },
  { t: 120, speaker: '林哲', role: '产品负责人 / 主持人', stageId: 's3', text: '风险这块，王睿你先说。' },
  { t: 130, speaker: '王睿', role: '技术负责人', stageId: 's3', text: '主要风险是老版本缓存兼容，回滚方案我写了，回滚窗口 15 分钟，随时可以切回去。' },
  { t: 155, speaker: '孙浩', role: '数据', stageId: 's3', text: '监控上如果上线后 30 分钟转化跌超过 5%，我会立刻告警。' },
  { t: 175, speaker: '林哲', role: '产品负责人 / 主持人', stageId: 's4', text: '进入决策环节。是否按期上线，我个人倾向按期，但要先听销售的意见。' },
  { t: 195, speaker: '周琳', role: '市场', stageId: 's4', text: '我们的推广物料要 9 月 24 号定稿，如果延期一周，投放节奏整个要重排。' },
  { t: 220, speaker: '王睿', role: '技术负责人', stageId: 's4', text: '技术上我建议再等一天，把两个 P1 修完再上，也就是 9 月 26 号。' },
  { t: 238, speaker: '林哲', role: '产品负责人 / 主持人', stageId: 's4', text: '两种意见都有道理。另外灰度比例到底是 10% 还是 20%，今天也还没定下来。' },
  { t: 260, speaker: '周琳', role: '市场', stageId: 's4', text: '灰度 10% 我的素材量够，20% 也行，主要看技术稳定性。' },
  { t: 280, speaker: '林哲', role: '产品负责人 / 主持人', stageId: 's4', text: '时间差不多了，我先记一下：要不要再等一天这件事，今天没有拍板。' },
  { t: 302, speaker: '孙浩', role: '数据', stageId: 's5', text: '数据看板谁来负责、什么时候上线，这个得定个人，不然上线后没人盯。' },
  { t: 325, speaker: '林哲', role: '产品负责人 / 主持人', stageId: 's5', text: '那灰度方案和回滚预案由王睿负责，9 月 24 号前完成，这个就定了。' },
  { t: 340, speaker: '陈曦', role: '设计负责人', stageId: 's5', text: '官网首页文案我这周内补上，不影响上线。' },
  { t: 355, speaker: '林哲', role: '产品负责人 / 主持人', stageId: 's5', text: '好，那就先这样，回头我们再约一次把上线日期最终定下来。' },
];

const retroScript: Omit<Utterance, 'id'>[] = [
  { t: 0, speaker: '何静', role: '项目经理 / 主持人', stageId: 's1', text: '今天复盘 Q3 迭代，先回顾原定目标：9 月 10 号交付订单中心重构并上线。' },
  { t: 25, speaker: '何静', role: '项目经理 / 主持人', stageId: 's2', text: '实际结果是延期 9 天，范围砍掉了导出模块，交付目标没有完全达成。' },
  { t: 55, speaker: '李涛', role: '后端', stageId: 's3', text: '后端这边主要卡在订单状态机的改造，第三方接口文档给晚了，我这边等了 4 天。' },
  { t: 90, speaker: '郑楠', role: '前端', stageId: 's3', text: '前端是联调阶段才拿到最终字段，改了两轮，另外需求在迭代中期又加了两张报表。' },
  { t: 125, speaker: '陈曦', role: '设计', stageId: 's4', text: '这次比较好的做法是我们提前出了交互稿并锁定，中途没有再改视觉，省了不少时间。' },
  { t: 155, speaker: '何静', role: '项目经理 / 主持人', stageId: 's4', text: '还有一条：把第三方依赖提前到迭代前一周确认，这次如果早做就不会等 4 天。' },
  { t: 190, speaker: '李涛', role: '后端', stageId: 's5', text: '流程上我建议以后提测必须带自测报告，不然 QA 那边反复退回。' },
  { t: 220, speaker: '郑楠', role: '前端', stageId: 's5', text: '我同意，另外中期加需求这件事，最好有个明确 cutoff 时间。' },
  { t: 245, speaker: '何静', role: '项目经理 / 主持人', stageId: 's5', text: '那就落到行动上：提测门槛和 cutoff 机制我来推动，具体落地时间我们再对一下。' },
  { t: 275, speaker: '李涛', role: '后端', stageId: 's5', text: '延期主因我认为就两条：第三方依赖晚、中期插需求，这个大家没有异议吧。' },
  { t: 300, speaker: '郑楠', role: '前端', stageId: 's5', text: '没有异议，我这边数据也支持这个判断。' },
];

export interface DemoMeeting {
  key: string;
  name: string;
  duration: string;
  highlight: string;
  build: () => Meeting;
}

export const DEMO_MEETINGS: DemoMeeting[] = [
  {
    key: 'launch',
    name: '产品上线决策会（6 分钟）',
    duration: '6 分钟 · 18 条发言 · 6 人',
    highlight: '演示「讨论过但没拍板」「销售负责人没表态」「行动项缺 owner/截止」三类典型缺口',
    build: () => {
      const m = createMeetingFromTemplate('launch', 'v2.3 上线决策会（示例）');
      m.status = 'live';
      m.transcript = launchScript.map((u, i) => ({ ...u, id: `u${i + 1}` }));
      return m;
    },
  },
  {
    key: 'retro',
    name: '项目复盘会（5 分钟）',
    duration: '5 分钟 · 11 条发言 · 5 人',
    highlight: '演示「QA 未发言」「流程改动没有拍板」「行动项缺截止时间」',
    build: () => {
      const m = createMeetingFromTemplate('retro', 'Q3 迭代复盘会（示例）');
      m.status = 'live';
      m.transcript = retroScript.map((u, i) => ({ ...u, id: `u${i + 1}` }));
      return m;
    },
  },
];
