/**
 * 瀏覽器端的 AI 連線設定（localStorage：nexussim_ai_config）。
 * 學生可在網頁介面直接填入 DeepSeek API Key；未填時後端會退回環境變數，
 * 兩者皆無則自動降級為離線備援回覆。
 */

export const AI_CONFIG_STORAGE_KEY = "nexussim_ai_config";

export const DEFAULT_AI_CONFIG: AiConfig = {
  apiKey: "",
  baseUrl: "https://api.deepseek.com",
  model: "deepseek-chat",
};

export interface AiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const isBrowser = () => typeof window !== "undefined";

export function normalizeAiConfig(input: Partial<AiConfig> | null | undefined): AiConfig {
  return {
    apiKey: (input?.apiKey ?? "").trim(),
    baseUrl: (input?.baseUrl ?? "").trim() || DEFAULT_AI_CONFIG.baseUrl,
    model: (input?.model ?? "").trim() || DEFAULT_AI_CONFIG.model,
  };
}

export function loadAiConfig(): AiConfig {
  if (!isBrowser()) return { ...DEFAULT_AI_CONFIG };
  try {
    const raw = window.localStorage.getItem(AI_CONFIG_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AI_CONFIG };
    const parsed = JSON.parse(raw) as Partial<AiConfig>;
    return normalizeAiConfig(parsed);
  } catch {
    return { ...DEFAULT_AI_CONFIG };
  }
}

export function saveAiConfig(config: Partial<AiConfig>): AiConfig {
  const next = normalizeAiConfig(config);
  if (!isBrowser()) return next;
  try {
    window.localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* localStorage 不可用時忽略（例如無痕模式配額已滿） */
  }
  return next;
}

export function clearAiConfig(): AiConfig {
  if (isBrowser()) {
    try {
      window.localStorage.removeItem(AI_CONFIG_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  return { ...DEFAULT_AI_CONFIG };
}

export function hasLocalAiKey(config?: AiConfig): boolean {
  const current = config ?? loadAiConfig();
  return current.apiKey.trim().length > 8;
}

/** 前端 → 後端的連線設定標頭（未填的欄位不送，讓後端改用環境變數）。 */
export function aiHeaders(config?: AiConfig): Record<string, string> {
  const current = config ?? loadAiConfig();
  const headers: Record<string, string> = {};
  const key = current.apiKey.trim();
  if (key.length > 8) headers["x-deepseek-api-key"] = key;
  if (current.baseUrl.trim() && current.baseUrl.trim() !== DEFAULT_AI_CONFIG.baseUrl) {
    headers["x-deepseek-base-url"] = current.baseUrl.trim();
  }
  if (current.model.trim() && current.model.trim() !== DEFAULT_AI_CONFIG.model) {
    headers["x-deepseek-model"] = current.model.trim();
  }
  return headers;
}
