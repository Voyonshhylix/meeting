// 轻量中文匹配工具：无外部依赖，用于覆盖检查的规则引擎
const STOPWORDS = new Set([
  '的', '了', '和', '与', '及', '或', '在', '对', '把', '被', '是', '有', '要', '会',
  '我们', '你们', '他们', '这个', '那个', '可以', '需要', '应该', '进行', '一个', '以及',
  '确认', '明确', '相关', '情况', '内容', '目前', '已经', '还是', '如果', '那么', '什么',
  '是否', '本次', '会议', '大家', '现在', '这边', '这边', '然后', '就是', '没有', '不',
]);

const DECISION_SIGNALS = [
  '决定', '定了', '拍板', '通过', '批准', '同意', '就按', '采用', '达成一致', '确认按',
  '就这么定', '最终确定', '确定', '负责', 'ok', '可以上线', '上线吧',
];

const ACTION_SIGNALS = ['负责', '跟进', '牵头', 'owner', '排期', '交付', '接手', '我来', '由'];

/** 明确日期：月日 / 号 / 周几 / 日期 */
const DUE_SPECIFIC =
  /(\d{1,2}\s*月\s*\d{1,2}\s*[号日]?)|(\d{1,2}\s*号)|(\d{4}[-/]\d{1,2}[-/]\d{1,2})|((?:本|下)?周[一二三四五六日天末])|((?:本|下)?周内)|(月底)/;
/** 模糊时间：今天 / 明天 / 本周 —— 只在出现行动信号时认定 */
const DUE_LOOSE = /(今天)|(明天)|(本周)|(下周)/;

/** 从一句话里切出用于匹配的实义词（模板可覆盖 keywords） */
export function extractKeywords(text: string): string[] {
  const raw = text.trim();
  const words = new Set<string>();
  // 英文 / 数字 token
  for (const m of raw.matchAll(/[A-Za-z][A-Za-z0-9._-]{1,}|\d+(?:\.\d+)?%?/g)) {
    words.add(m[0].toLowerCase());
  }
  // 中文：按标点与停用词切段
  const segs = raw
    .split(/[，。、；：？！,.;:?!()（）\[\]【】"'“”\s\/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const seg of segs) {
    const zh = seg.replace(/[^一-龥A-Za-z0-9]/g, '');
    if (!zh) continue;
    if (/^[一-龥]+$/.test(zh)) {
      if (zh.length <= 4 && !STOPWORDS.has(zh)) words.add(zh);
      // 长片段切 2-gram，提升召回
      for (let i = 0; i + 2 <= zh.length; i++) {
        const g = zh.slice(i, i + 2);
        if (!STOPWORDS.has(g)) words.add(g);
      }
    } else if (zh.length >= 2) {
      words.add(zh.toLowerCase());
    }
  }
  return [...words];
}

/** 计算一段发言与某目标的匹配强度（0~1） */
export function matchScore(utterance: string, keywords: string[]): number {
  if (!keywords.length) return 0;
  const text = utterance.toLowerCase();
  let hit = 0;
  for (const k of keywords) {
    if (!k) continue;
    if (text.includes(k.toLowerCase())) hit += k.length >= 3 ? 1.2 : 0.8;
  }
  return Math.min(1, hit / Math.max(3, keywords.length * 0.6));
}

export function hasDecisionSignal(text: string): boolean {
  const t = text.toLowerCase();
  return DECISION_SIGNALS.some((s) => t.includes(s));
}

export function hasActionSignal(text: string): boolean {
  const t = text.toLowerCase();
  return ACTION_SIGNALS.some((s) => t.includes(s));
}

/** 只认「由 X 负责 / X 负责」这类明确指派，X 必须是在场角色，避免把「谁来做」的提问当成负责人 */
export function findOwner(text: string, names: string[]): string | undefined {
  for (const n of names) {
    if (new RegExp(`由\\s*${n}\\s*(?:来)?\\s*(?:负责|牵头|跟进|接手)`).test(text)) return n;
    if (new RegExp(`${n}\\s*(?:来)?\\s*(?:负责|牵头|跟进|接手)`).test(text)) return n;
  }
  return undefined;
}

export function findDue(text: string): string | undefined {
  const m = text.match(DUE_SPECIFIC);
  if (m) return m[0].trim();
  if (hasActionSignal(text)) {
    const m2 = text.match(DUE_LOOSE);
    if (m2) return m2[0];
  }
  return undefined;
}

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
