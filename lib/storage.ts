import type { Meeting } from './types';

const KEY = 'meeting-copilot:v1';

export function loadMeeting(): Meeting | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Meeting) : null;
  } catch {
    return null;
  }
}

export function saveMeeting(m: Meeting | null) {
  if (typeof window === 'undefined') return;
  try {
    if (!m) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

export interface AiCfg {
  key: string;
  baseUrl: string;
  model: string;
}

const AI_CFG_STORAGE = 'meeting-copilot:aicfg';
export const DEFAULT_AI: AiCfg = { key: '', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' };

export function loadAiCfg(): AiCfg {
  if (typeof window === 'undefined') return DEFAULT_AI;
  try {
    const raw = localStorage.getItem(AI_CFG_STORAGE);
    return raw ? { ...DEFAULT_AI, ...(JSON.parse(raw) as AiCfg) } : DEFAULT_AI;
  } catch {
    return DEFAULT_AI;
  }
}

export function saveAiCfg(c: AiCfg) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AI_CFG_STORAGE, JSON.stringify(c));
}
