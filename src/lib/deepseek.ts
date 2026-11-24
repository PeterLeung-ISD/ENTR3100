/**
 * DeepSeek API 封裝：支援分級逾時（相容 Netlify 免費版 10 秒限制）、短暫錯誤快速重試、
 * 結構化錯誤回報，以及兩種憑證模式：
 * 1. 伺服器鎖定模式（推薦線上部署）：Netlify 設定 DEEPSEEK_API_KEY 後，使用者免填金鑰即可直接用。
 * 2. 本機開發／自備金鑰模式：伺服器未設金鑰（或 ALLOW_CLIENT_API_KEY=true）時，允許標頭金鑰。
 */

export const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
export const DEEPSEEK_ENDPOINT = `${DEEPSEEK_BASE_URL}/v1/chat/completions`;
export const DEEPSEEK_MODEL = "deepseek-chat";
const DEFAULT_TIMEOUT_MS = 8500;
const MIN_TIMEOUT_MS = 4000;
const MAX_TIMEOUT_MS = 25000;
const MIN_KEY_LENGTH = 8;

export interface AiRuntimeConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export type AiConfigSource = "browser" | "env" | "none";

export type DeepSeekErrorKind =
  | "missing-key"
  | "invalid-key"
  | "insufficient-balance"
  | "bad-endpoint"
  | "bad-request"
  | "rate-limited"
  | "timeout"
  | "network"
  | "server-error"
  | "empty-response";

export type DeepSeekCallOutcome =
  | { ok: true; content: string; mode: "live" }
  | { ok: false; error: DeepSeekErrorKind; status?: number; detail?: string };

const trimSlash = (value: string) => value.replace(/\/+$/, "");

/**
 * 自動補全 OpenAI 相容端點路徑：
 * - `https://new.itus.cc` → `https://new.itus.cc/v1/chat/completions`
 * - `https://new.itus.cc/v1` → `https://new.itus.cc/v1/chat/completions`
 * - `https://new.itus.cc/v1/chat/completions` → 維持不變
 */
export function buildChatCompletionsUrl(baseUrl: string): string {
  const clean = trimSlash(baseUrl.trim() || DEEPSEEK_BASE_URL);
  if (/\/chat\/completions$/i.test(clean)) return clean;
  if (/\/v\d+[a-z0-9_-]*$/i.test(clean)) return `${clean}/chat/completions`;
  return `${clean}/v1/chat/completions`;
}

function clampTimeout(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_TIMEOUT_MS;
  return Math.max(MIN_TIMEOUT_MS, Math.min(MAX_TIMEOUT_MS, Math.round(value)));
}

function defaultTimeoutMs(): number {
  const raw = process.env.DEEPSEEK_TIMEOUT_MS;
  if (!raw) return DEFAULT_TIMEOUT_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? clampTimeout(parsed) : DEFAULT_TIMEOUT_MS;
}

function envConfig(): AiRuntimeConfig {
  return {
    apiKey: (process.env.DEEPSEEK_API_KEY ?? "").trim(),
    baseUrl: trimSlash((process.env.DEEPSEEK_BASE_URL ?? DEEPSEEK_BASE_URL).trim() || DEEPSEEK_BASE_URL),
    model: (process.env.DEEPSEEK_MODEL ?? DEEPSEEK_MODEL).trim() || DEEPSEEK_MODEL,
  };
}

export function hasDeepSeekKey(): boolean {
  return envConfig().apiKey.length >= MIN_KEY_LENGTH;
}

/**
 * 當伺服器端已設定 DEEPSEEK_API_KEY 且未允許前端覆寫時，進入伺服器託管模式：
 * 所有請求強制採用伺服器環境變數金鑰，確保金鑰不會外洩且端點不可被當成任意代理。
 */
export function isServerManagedAi(): boolean {
  return hasDeepSeekKey() && process.env.ALLOW_CLIENT_API_KEY !== "true";
}

/** 由請求標頭解析連線設定；伺服器託管模式下永遠優先採用環境變數。 */
export function resolveAiConfig(headers: Headers): {
  config: AiRuntimeConfig;
  source: AiConfigSource;
} {
  const env = envConfig();

  if (isServerManagedAi()) {
    return {
      config: env,
      source: "env",
    };
  }

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
      config: env,
      source: "env",
    };
  }

  return {
    config: { apiKey: "", baseUrl: env.baseUrl, model: env.model },
    source: "none",
  };
}

/** 伺服器可公開的預設值（不含金鑰）。 */
export function publicAiDefaults(): { baseUrl: string; model: string } {
  const env = envConfig();
  return { baseUrl: env.baseUrl, model: env.model };
}

export interface ChatTurn {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DeepSeekResult {
  content: string;
  mode: "live";
}

export interface DeepSeekCallOptions {
  temperature?: number;
  json?: boolean;
  config?: AiRuntimeConfig;
  maxTokens?: number;
  timeoutMs?: number;
}

function mapHttpStatusToError(status: number): DeepSeekErrorKind {
  if (status === 401 || status === 403) return "invalid-key";
  if (status === 402) return "insufficient-balance";
  if (status === 404) return "bad-endpoint";
  if (status === 400 || status === 422) return "bad-request";
  if (status === 429) return "rate-limited";
  return "server-error";
}

function stripThinkingTags(raw: string): string {
  return raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function extractMessageContent(message: unknown): { content: string; reasoningLen: number } {
  if (!message || typeof message !== "object") {
    return { content: "", reasoningLen: 0 };
  }
  const msg = message as { content?: unknown; reasoning_content?: unknown };
  const reasoningLen =
    typeof msg.reasoning_content === "string" ? msg.reasoning_content.trim().length : 0;

  let rawContent = "";
  if (typeof msg.content === "string") {
    rawContent = msg.content;
  } else if (Array.isArray(msg.content)) {
    rawContent = msg.content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          const t = (part as { text?: unknown }).text;
          return typeof t === "string" ? t : "";
        }
        return "";
      })
      .join("");
  }

  return {
    content: stripThinkingTags(rawContent),
    reasoningLen,
  };
}

async function runChatAttempt(
  messages: ChatTurn[],
  config: AiRuntimeConfig,
  options: DeepSeekCallOptions,
  timeoutMs: number,
): Promise<DeepSeekCallOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = buildChatCompletionsUrl(config.baseUrl);

  try {
    const res = await fetch(url, {
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

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return {
        ok: false,
        error: mapHttpStatusToError(res.status),
        status: res.status,
        detail: detail.slice(0, 200) || `HTTP ${res.status}`,
      };
    }

    const rawText = await res.text();
    let data: {
      choices?: { finish_reason?: string; message?: unknown }[];
    } | null = null;
    try {
      data = JSON.parse(rawText) as {
        choices?: { finish_reason?: string; message?: unknown }[];
      };
    } catch {
      return {
        ok: false,
        error: "bad-endpoint",
        status: res.status,
        detail: `Non-JSON response from ${url}`,
      };
    }

    const choice = data?.choices?.[0];
    const { content, reasoningLen } = extractMessageContent(choice?.message);
    if (!content) {
      const reason = choice?.finish_reason ?? "unknown";
      return {
        ok: false,
        error: "empty-response",
        status: res.status,
        detail: `finish_reason=${reason}${reasoningLen > 0 ? `, reasoning_len=${reasoningLen}` : ""}`,
      };
    }
    return { ok: true, content, mode: "live" };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      error: aborted ? "timeout" : "network",
      detail: error instanceof Error ? error.message.slice(0, 160) : undefined,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function callDeepSeekDetailed(
  messages: ChatTurn[],
  options: DeepSeekCallOptions = {},
): Promise<DeepSeekCallOutcome> {
  const config = options.config ?? envConfig();
  if (!config.apiKey || config.apiKey.trim().length < MIN_KEY_LENGTH) {
    return { ok: false, error: "missing-key" };
  }

  const budgetMs = clampTimeout(options.timeoutMs ?? defaultTimeoutMs());
  const startedAt = Date.now();

  let outcome = await runChatAttempt(messages, config, options, budgetMs);

  // 中轉站拒絕 response_format 或於 json_object 模式下吐空字串時，移除該參數快速重試一次
  if (
    !outcome.ok &&
    options.json &&
    (outcome.error === "bad-request" || outcome.error === "empty-response")
  ) {
    const remaining = budgetMs - (Date.now() - startedAt);
    if (remaining >= 2500) {
      outcome = await runChatAttempt(messages, config, { ...options, json: false }, remaining);
    }
  } else if (!outcome.ok && outcome.error === "empty-response") {
    const elapsed = Date.now() - startedAt;
    const remaining = budgetMs - elapsed;
    if (elapsed < 4500 && remaining >= 2500) {
      outcome = await runChatAttempt(messages, config, options, remaining);
    }
  } else if (!outcome.ok && (outcome.error === "network" || outcome.error === "server-error")) {
    const elapsed = Date.now() - startedAt;
    const remaining = budgetMs - elapsed;
    if (elapsed < 2000 && remaining >= 4000) {
      outcome = await runChatAttempt(messages, config, options, remaining);
    }
  }

  if (!outcome.ok) {
    console.warn("[DeepSeek]", {
      endpoint: buildChatCompletionsUrl(config.baseUrl),
      error: outcome.error,
      status: outcome.status,
      detail: outcome.detail,
    });
  }

  return outcome;
}

export async function callDeepSeek(
  messages: ChatTurn[],
  options: DeepSeekCallOptions = {},
): Promise<DeepSeekResult | null> {
  const outcome = await callDeepSeekDetailed(messages, options);
  return outcome.ok ? { content: outcome.content, mode: "live" } : null;
}

export interface DeepSeekProbe {
  ok: boolean;
  status?: number;
  error?: DeepSeekErrorKind;
  message?: string;
}

/** 設定彈窗「測試連線」用：送一則極短的請求，回報可行的錯誤原因。 */
export async function probeDeepSeek(config: AiRuntimeConfig): Promise<DeepSeekProbe> {
  if (!config.apiKey || config.apiKey.trim().length < MIN_KEY_LENGTH) {
    return { ok: false, error: "missing-key", message: "missing-key" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), defaultTimeoutMs());

  try {
    const res = await fetch(buildChatCompletionsUrl(config.baseUrl), {
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

    if (res.ok) {
      const rawText = await res.text().catch(() => "");
      try {
        const parsed = JSON.parse(rawText) as { choices?: unknown[] };
        if (Array.isArray(parsed?.choices)) {
          return { ok: true, status: res.status };
        }
      } catch {
        /* non-JSON 200 HTML page */
      }
      return {
        ok: false,
        status: res.status,
        error: "bad-endpoint",
        message: "bad-endpoint",
      };
    }

    const errorKind = mapHttpStatusToError(res.status);
    const detail = await res.text().catch(() => "");
    return {
      ok: false,
      status: res.status,
      error: errorKind,
      message: detail.slice(0, 220) || `HTTP ${res.status}`,
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    const errorKind: DeepSeekErrorKind = aborted ? "timeout" : "network";
    return { ok: false, error: errorKind, message: errorKind };
  } finally {
    clearTimeout(timer);
  }
}

/** 從模型回覆中抽取 JSON 物件（容忍 <think> 標籤、```json 圍欄或前後雜訊）。 */
export function parseJsonLoose<T>(raw: string): T | null {
  if (!raw) return null;
  const cleaned = stripThinkingTags(raw)
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
