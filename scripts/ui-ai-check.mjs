// 以 CDP 驗證 API 設定彈窗、快速提問膠囊、輸入中指示與機密附件卡
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE = process.env.NX_BASE ?? "http://localhost:3000";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9333 + Math.floor(Math.random() * 200);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "nx-ai-"));

const results = [];
const log = (name, ok, extra = "") => {
  results.push({ name, ok, extra });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
};

const child = spawn(
  EDGE,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "about:blank",
  ],
  { stdio: "ignore" },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function targets() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === "page");
      if (page) return page;
    } catch {}
    await sleep(300);
  }
  throw new Error("Edge CDP not available");
}

function connect(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  });
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", reject);
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const msgId = ++id;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  return { ws, ready, send };
}

const page = await targets();
const client = connect(page.webSocketDebuggerUrl);
await client.ready;
await client.send("Page.enable");
await client.send("Runtime.enable");

async function evaluate(expression) {
  const { result } = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result?.subtype === "error") throw new Error(result.description ?? "eval error");
  return result?.value;
}

async function goto(url) {
  await client.send("Page.navigate", { url });
  await sleep(1500);
  for (let i = 0; i < 40; i++) {
    const hydrated = await evaluate(
      `Object.keys(document.body).some((k) => k.startsWith("__react")) || document.querySelector("main, header") !== null`,
    );
    if (hydrated) return;
    await sleep(250);
  }
}

await client.send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});

await goto(`${BASE}/simulation/nexus-launch-crisis`);
await evaluate(`localStorage.removeItem("nexussim_ai_config"); true`);
await goto(`${BASE}/simulation/nexus-launch-crisis`);

// 關閉任務簡報
await evaluate(`(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => /進入作戰室|Enter War Room/i.test(b.textContent || ""));
  if (btn) btn.click();
  return true;
})()`);
await sleep(400);

// 1) 狀態膠囊
const capsule = await evaluate(`(() => {
  const el = document.querySelector('[aria-label*="API"]');
  return el ? { text: (el.textContent || "").trim(), cls: el.className } : null;
})()`);
log("TopControlBar 有 AI 狀態膠囊", Boolean(capsule), capsule?.text ?? "missing");
log("未設定時顯示離線文案", /點擊設定 API Key|Set API Key/i.test(capsule?.text ?? ""), capsule?.text ?? "");
log("離線膠囊為琥珀色系", /warn/.test(capsule?.cls ?? ""));

// 2) 點擊膠囊 → 彈窗
await evaluate(`(() => {
  const el = document.querySelector('[aria-label*="API"]');
  if (el) el.click();
  return true;
})()`);
await sleep(500);
const dialog = await evaluate(`(() => {
  const d = document.querySelector('[role="dialog"]');
  if (!d) return null;
  const input = d.querySelector('input[type="password"], input[type="text"]');
  return {
    text: d.innerText.slice(0, 160),
    hasPassword: Boolean(d.querySelector('input[type="password"]')),
    hasTest: /測試連線|Test connection/i.test(d.innerText),
    hasAdvanced: /進階|Advanced/i.test(d.innerText),
    placeholder: input?.getAttribute("placeholder") ?? "",
  };
})()`);
log("設定彈窗可打開", Boolean(dialog), dialog?.text?.replace(/\s+/g, " ").slice(0, 60) ?? "missing");
log("API Key 為密碼欄位", dialog?.hasPassword === true);
log("有測試連線按鈕", dialog?.hasTest === true);
log("有進階選項", dialog?.hasAdvanced === true);
log("Key placeholder 提示 sk-", /sk-/.test(dialog?.placeholder ?? ""), dialog?.placeholder ?? "");

// 眼睛圖標切換顯示
await evaluate(`(() => {
  const d = document.querySelector('[role="dialog"]');
  const btn = [...d.querySelectorAll("button")].find((b) => /顯示|隱藏|Show|Hide/i.test(b.getAttribute("aria-label") || ""));
  if (btn) btn.click();
  return true;
})()`);
await sleep(300);
const eyeType = await evaluate(`document.querySelector('[role="dialog"] input')?.type ?? "none"`);
log("眼睛圖標可切換為明文", eyeType === "text", `type=${eyeType}`);

// 3) 測試連線（無金鑰 → 提示缺少金鑰）
await evaluate(`(() => {
  const d = document.querySelector('[role="dialog"]');
  const btn = [...d.querySelectorAll("button")].find((b) => /測試連線|Test connection/i.test(b.textContent || ""));
  if (btn) btn.click();
  return true;
})()`);
await sleep(1200);
const testMsg = await evaluate(`(() => {
  const d = document.querySelector('[role="dialog"]');
  return d ? d.innerText.replace(/\\s+/g, " ").slice(0, 400) : "";
})()`);
log("測試連線有回饋訊息", /尚未|未設定|缺少|missing|無效|失敗|未能/i.test(testMsg), testMsg.slice(0, 80));

// 4) 儲存本機金鑰 → 膠囊轉綠
await evaluate(`(() => {
  const d = document.querySelector('[role="dialog"]');
  const input = d.querySelector("input");
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(input, "sk-local-test-key-1234567890");
  input.dispatchEvent(new Event("input", { bubbles: true }));
  const btn = [...d.querySelectorAll("button")].find((b) => /儲存|Save/i.test(b.textContent || ""));
  if (btn) btn.click();
  return true;
})()`);
await sleep(700);
const afterSave = await evaluate(`(() => {
  const el = document.querySelector('[aria-label*="API"]');
  return {
    text: (el?.textContent || "").trim(),
    cls: el?.className ?? "",
    stored: localStorage.getItem("nexussim_ai_config"),
  };
})()`);
log("儲存後 localStorage 有金鑰", /sk-local-test-key/.test(afterSave.stored ?? ""), (afterSave.stored ?? "").slice(0, 60));
log("儲存後膠囊轉為已啟用", /已啟用|enabled/i.test(afterSave.text ?? ""), afterSave.text ?? "");
log("已啟用膠囊為翡翠綠系", /unlocked/.test(afterSave.cls ?? ""));

// 5) 回到離線模式（清除假金鑰）再測試對話互動
await evaluate(`localStorage.removeItem("nexussim_ai_config"); true`);
await goto(`${BASE}/simulation/nexus-launch-crisis`);
await evaluate(`(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => /進入作戰室|Enter War Room/i.test(b.textContent || ""));
  if (btn) btn.click();
  return true;
})()`);
await sleep(500);

// 切到 Chloe 頻道，檢查快速提問膠囊
await evaluate(`(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => /Chloe/i.test(b.textContent || ""));
  if (btn) btn.click();
  return true;
})()`);
await sleep(400);
const channels = await evaluate(`(() => {
  const group = [...document.querySelectorAll('[role="group"]')].find((g) =>
    /快速追問|Suggested/i.test(g.getAttribute("aria-label") || ""),
  );
  if (!group) return null;
  return {
    label: group.getAttribute("aria-label"),
    items: [...group.querySelectorAll("button")].map((b) => (b.textContent || "").trim()),
  };
})()`);
log("有快速提問膠囊", (channels?.items?.length ?? 0) >= 2, JSON.stringify(channels?.items ?? []).slice(0, 140));
log("膠囊針對 Chloe 樣本問題", /樣本|sample|外部|external/i.test(channels?.items?.[0] ?? ""), channels?.items?.[0] ?? "");

// 點膠囊 → 填入輸入框
await evaluate(`(() => {
  const group = [...document.querySelectorAll('[role="group"]')].find((g) =>
    /快速追問|Suggested/i.test(g.getAttribute("aria-label") || ""),
  );
  group?.querySelectorAll("button")[0]?.click();
  return true;
})()`);
await sleep(300);
const filled = await evaluate(`(() => {
  const ta = [...document.querySelectorAll("textarea")].find((t) => !t.closest('[role="dialog"]'));
  return ta ? ta.value : "";
})()`);
log("點膠囊會填入輸入框", filled.length > 4, filled.slice(0, 40));

await evaluate(`(() => {
  const ta = [...document.querySelectorAll("textarea")].find((t) => !t.closest('[role="dialog"]'));
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
  setter.call(ta, "這份 92% 的樣本數是多少？有做外部測試嗎？");
  ta.dispatchEvent(new Event("input", { bubbles: true }));
  ta.focus();
  return true;
})()`);
await sleep(150);
await client.send("Network.enable");
await client.send("Network.emulateNetworkConditions", {
  offline: false,
  latency: 700,
  downloadThroughput: -1,
  uploadThroughput: -1,
});
await evaluate(`(() => {
  const ta = [...document.querySelectorAll("textarea")].find((t) => !t.closest('[role="dialog"]'));
  ta.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true }));
  return true;
})()`);

// 6) 輸入中指示（以網路延遲讓 request 停留，才能觀察 typing row）
let typingSeen = false;
let dotsMax = 0;
for (let i = 0; i < 60; i++) {
  const probe = await evaluate(`(() => ({
    text: (document.body.innerText || ""),
    dots: document.querySelectorAll(".typing-dot").length,
  }))()`);
  dotsMax = Math.max(dotsMax, probe?.dots ?? 0);
  if (/正在輸入|正在打字|is typing/i.test(probe?.text ?? "")) {
    typingSeen = true;
    break;
  }
  await sleep(60);
}
log("送出後顯示輸入中指示", typingSeen && dotsMax >= 3, `typingText=${typingSeen} dotsMax=${dotsMax}`);
await client.send("Network.emulateNetworkConditions", {
  offline: false,
  latency: 0,
  downloadThroughput: -1,
  uploadThroughput: -1,
});

// 7) 機密附件卡（原始測試日誌）
let card = null;
for (let i = 0; i < 60; i++) {
  card = await evaluate(`(() => {
    const el = [...document.querySelectorAll("div,button,a")].find(
      (d) => /emerald-500\\/60/.test(d.className || "") && /原始測試日誌|Raw Test Logs/i.test(d.textContent || ""),
    );
    if (!el) return null;
    return { text: el.textContent.replace(/\\s+/g, " ").slice(0, 120), cls: el.className, tag: el.tagName };
  })()`);
  if (card) break;
  await sleep(150);
}
log("對話內有翡翠綠機密附件卡", Boolean(card), card?.text ?? "missing");
log("附件卡顯示機密檔案標題", /原始測試日誌|Raw Test Logs/i.test(card?.text ?? ""), card?.text ?? "");
log("附件卡使用翡翠綠邊框", /emerald-500\/60/.test(card?.cls ?? "") && /emerald-950\/50/.test(card?.cls ?? ""));
log("附件卡為可點擊控件", card?.tag === "BUTTON", `tag=${card?.tag}`);

// 點擊附件卡 → 中欄開啟該文件
await evaluate(`(() => {
  const el = [...document.querySelectorAll("div,button,a")].find(
    (d) => /emerald-500\\/60/.test(d.className || "") && /原始測試日誌|Raw Test Logs/i.test(d.textContent || ""),
  );
  const btn = el?.tagName === "BUTTON" ? el : el?.querySelector("button");
  if (btn) btn.click();
  else if (el) el.click();
  return true;
})()`);
await sleep(800);
const opened = await evaluate(`(() => {
  const headings = [...document.querySelectorAll("h1, h2, h3")].map((h) => (h.textContent || "").trim());
  return { headings, overflow: document.documentElement.scrollWidth - window.innerWidth };
})()`);
log("附件卡可開啟中欄文件", opened.headings.some((h) => /原始測試日誌|Raw Test Logs/i.test(h)), JSON.stringify(opened.headings.slice(0, 4)));
log("水平溢出為 0", opened.overflow === 0, `overflow=${opened.overflow}px`);

// 8) 清除金鑰後回到離線
await evaluate(`localStorage.removeItem("nexussim_ai_config"); true`);
await goto(`${BASE}/simulation/nexus-launch-crisis`);
await sleep(800);
const afterClear = await evaluate(`(() => {
  const el = document.querySelector('[aria-label*="API"]');
  return (el?.textContent || "").trim();
})()`);
log("清除後回到離線文案", /點擊設定 API Key|Set API Key/i.test(afterClear), afterClear);

await goto(`${BASE}/`);
const lobbyToggle = await evaluate(`document.documentElement.lang`);
log("大堂可載入（lang 屬性正常）", ["zh-Hant", "en"].includes(lobbyToggle), lobbyToggle);

const failed = results.filter((r) => !r.ok);
console.log(`\n== ${results.length - failed.length}/${results.length} passed ==`);
if (failed.length) {
  for (const f of failed) console.log(" - " + f.name + (f.extra ? " :: " + f.extra : ""));
}
try {
  child.kill();
  await sleep(600);
  fs.rmSync(profile, { recursive: true, force: true });
} catch {}
process.exit(failed.length ? 1 : 0);
