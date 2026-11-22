/**
 * DeepSeek API 薄封裝：8 秒超時、JSON 模式、失敗即回傳 null 交由 Mock 降級。
 * 支援兩種憑證來源 —— 請求標頭（網頁端設定）優先，其次伺服器環境變數。
 */

export const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
export const DEEPSEEK_ENDPOINT = `${DEEPSEEK_BASE_URL}/chat/completions`;
export const DEEPSEEK_MODEL = "deepseek-chat";
const TIMEOUT_MS = 8000;
const MIN_KEY_LENGTH = 8;

export interface AiRuntimeConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export type AiConfigSource = "browser" | "env" | "none";

export function hasDeepSeekKey(): boolean {
  return envConfig().apiKey.length > 0;
}

function envConfig(): AiRuntimeConfig {
  return {
    apiKey: (process.env.DEEPSEEK_API_KEY ?? "").trim(),
    baseUrl: (process.env.DEEPSEEK_BASE_URL ?? DEEPSEEK_BASE_URL).trim(),
    model: (process.env.DEEPSEEK_MODEL ?? DEEPSEEK_MODEL).trim(),
  };
}

const trimSlash = (value: string) => value.replace(/\/+$/, "");

/** 由請求標頭解析連線設定；前端未提供時退回環境變數。 */
export function resolveAiConfig(headers: Headers): {
  config: AiRuntimeConfig;
  source: AiConfigSource;
} {
  const env = envConfig();
  const headerKey = (headers.get("x-deepseek-api-key") ?? "").trim();
  const headerBase = (headers.get("x-deepseek-base-url") ?? "").trim();
  const headerModel = (headers.get("x-deepseek-model") ?? "").trim();

  if (headerKey.length >= MIN_KEY_LENGTH) {
    return {
      config: {
        apiKey: headerKey,
        baseUrl: trimSlash(headerBase || env.baseUrl || DEEPSEEK_BASE_URL),
        model: headerModel || env.model || DEEPSEEK_MODEL,
      },
      source: "browser",
    };
  }

  if (env.apiKey.length >= MIN_KEY_LENGTH) {
    return {
      config: {
        apiKey: env.apiKey,
        baseUrl: trimSlash(env.baseUrl || DEEPSEEK_BASE_URL),
        model: env.model || DEEPSEEK_MODEL,
      },
      source: "env",
    };
  }

  return {
    config: { apiKey: "", baseUrl: trimSlash(env.baseUrl || DEEPSEEK_BASE_URL), model: env.model || DEEPSEEK_MODEL },
    source: "none",
  };
}

/** 伺服器可公開的預設值（不含金鑰）。 */
export function publicAiDefaults(): { baseUrl: string; model: string } {
  const env = envConfig();
  return { baseUrl: trimSlash(env.baseUrl || DEEPSEEK_BASE_URL), model: env.model || DEEPSEEK_MODEL };
}

export interface ChatTurn {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DeepSeekResult {
  content: string;
  mode: "live";
}

export async function callDeepSeek(
  messages: ChatTurn[],
  options: { temperature?: number; json?: boolean; config?: AiRuntimeConfig; maxTokens?: number } = {},
): Promise<DeepSeekResult | null> {
  const config = options.config ?? envConfig();
  if (!config.apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${trimSlash(config.baseUrl)}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 700,
        ...(options.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    return { content, mode: "live" };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface DeepSeekProbe {
  ok: boolean;
  status?: number;
  message?: string;
}

/** 設定彈窗「測試連線」用：送一則極短的請求，回報可行的錯誤原因。 */
export async function probeDeepSeek(config: AiRuntimeConfig): Promise<DeepSeekProbe> {
  if (!config.apiKey) return { ok: false, message: "missing-key" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${trimSlash(config.baseUrl)}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 4,
        temperature: 0,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (res.ok) return { ok: true, status: res.status };

    const detail = await res.text().catch(() => "");
    return {
      ok: false,
      status: res.status,
      message: detail.slice(0, 220) || `HTTP ${res.status}`,
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return { ok: false, message: aborted ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}

/** 從模型回覆中抽取 JSON 物件（容忍 ```json 圍欄或前後雜訊）。 */
export function parseJsonLoose<T>(raw: string): T | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    } catch {
      return null;
    }
  }
}
