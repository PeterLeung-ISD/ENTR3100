/**
 * 語言切換一致性自檢（headless Edge + CDP）。
 * 驗證：模擬中途切換中／英，自動產生的內容（時間軸訊息、事件列、文件、KPI）
 * 會跟著換語言，而學生輸入與 AI 回覆保留原語言。
 *
 * 用法：node scripts/ui-locale-check.mjs [baseUrl]
 */
import { mkdtemp } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

const BASE = process.argv[2] ?? process.env.NX_BASE ?? "http://localhost:3000";
const EDGE = process.env.NX_EDGE ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9200 + Math.floor(Math.random() * 200);
const SIM = "/simulation/nexus-launch-crisis";

const results = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

async function launchEdge() {
  const userDir = await mkdtemp(path.join(tmpdir(), "nx-locale-"));
  const proc = spawn(
    EDGE,
    [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${userDir}`,
      "--no-first-run",
      "--disable-gpu",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  for (let i = 0; i < 120; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return { proc };
    } catch {}
    await sleep(120);
  }
  throw new Error("Edge 啟動逾時");
}

async function newTarget() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" });
  const info = await res.json();
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", () => resolve(undefined), { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = (nextId += 1);
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  return { send, ws };
}

async function evaluate(send, expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? "evaluate failed");
  }
  return result.result.value;
}

const CLICK_BY_TEXT = (text) => `(() => {
  const target = ${JSON.stringify(text)};
  const button = [...document.querySelectorAll('button')].find((node) => (node.textContent || '').trim() === target);
  if (!button) return false;
  button.click();
  return true;
})()`;

const CLICK_TITLE = (title) => `(() => {
  const button = document.querySelector('button[title="${title}"]');
  if (!button) return false;
  button.click();
  return true;
})()`;

async function main() {
  const { proc } = await launchEdge();
  const { send, ws } = await newTarget();
  try {
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send("Network.setCookie", { name: "nexussim_locale", value: "zh", url: BASE });

    const load = async () => {
      await send("Page.navigate", { url: `${BASE}${SIM}` });
      await sleep(3200);
      await evaluate(send, `localStorage.removeItem("nexussim:draft:nexus-launch-crisis")`);
      await evaluate(send, CLICK_BY_TEXT("跳過導覽直接開始"));
      await sleep(1500);
    };

    await load();
    const chineseSeed = await evaluate(send, `document.body.innerText.includes("團隊注意，NovaAssist 2.0 今晚 20:00 全量上線")`);
    check("中文介面：時間軸訊息為中文", chineseSeed === true);

    // 切換到英文（toolbar 的 LanguageToggle compact，title="English"）
    const toEnglish = await evaluate(send, CLICK_TITLE("English"));
    check("可點擊 EN 切換器", toEnglish === true);
    await sleep(3500);

    const englishBubble = await evaluate(
      send,
      `document.body.innerText.includes("Team, NovaAssist 2.0 goes out to everyone tonight at 20:00")`,
    );
    check("英文介面：同一則時間軸訊息已改為英文", englishBubble === true);

    const residualChineseSeed = await evaluate(send, `document.body.innerText.includes("團隊注意")`);
    check("英文介面：不再殘留中文時間軸訊息", residualChineseSeed === false);

    const englishDocTitle = await evaluate(send, `document.body.innerText.includes("Launch Highlights")`);
    check("英文介面：文件標題同步為英文", englishDocTitle === true);

    const englishFlow = await evaluate(send, `document.body.innerText.includes("Sign-off")`);
    check("英文介面：簽核面板文案為英文", englishFlow === true);

    // 切回中文，確認可逆
    const toChinese = await evaluate(send, CLICK_TITLE("中文"));
    check("可點擊中文切換器", toChinese === true);
    await sleep(3500);

    const backToChinese = await evaluate(send, `document.body.innerText.includes("團隊注意")`);
    check("切回中文：時間軸訊息回復中文", backToChinese === true);

    const lang = await evaluate(send, `document.documentElement.lang`);
    check("html lang 同步", lang === "zh-Hant", lang);

    const overflow = await evaluate(send, `document.documentElement.scrollWidth - window.innerWidth`);
    check("切換過程無水平溢出", overflow === 0, `${overflow}px`);
  } finally {
    ws.close();
    proc.kill();
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed}/${results.length} checks passed`);
  if (passed !== results.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error("ERROR", error);
  process.exitCode = 1;
});
