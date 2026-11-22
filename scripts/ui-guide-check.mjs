/**
 * 行前導覽 / 評分標準 / 計時暫停 的行為自檢。
 *
 * 用法：node scripts/ui-guide-check.mjs [baseUrl]
 */
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

const BASE = process.argv[2] ?? process.env.NX_BASE ?? "http://localhost:3000";
const EDGE = process.env.NX_EDGE ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9600 + Math.floor(Math.random() * 200);
const SIEGE = "/simulation/nexus-launch-crisis";
const OUT = path.resolve("docs/ui-shots");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
}

async function launchEdge() {
  const profile = await mkdtemp(path.join(tmpdir(), "nx-guide-"));
  const child = spawn(
    EDGE,
    [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return child;
    } catch {}
    await sleep(250);
  }
  throw new Error("Edge CDP did not start");
}

async function newTarget() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" });
  const target = await res.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      id += 1;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  return { ws, send };
}

async function evaluate(send, expression) {
  const res = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (res.exceptionDetails) {
    throw new Error(res.exceptionDetails.exception?.description ?? "evaluate failed");
  }
  return res.result.value;
}

/** 等 hydration：React 會在 DOM 節點掛上 __reactFiber$… */
async function waitHydrated(send, timeoutMs = 25000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const ok = await evaluate(
      send,
      `Object.keys(document.body).some((k) => k.startsWith("__reactFiber$"))`,
    );
    if (ok) return true;
    await sleep(300);
  }
  return false;
}

const TIMER_JS = `(() => {
  const nodes = [...document.querySelectorAll(".tabular-telemetry")];
  const hit = nodes.find((n) => /^\\d\\d:\\d\\d$/.test((n.textContent || "").trim()));
  return hit ? hit.textContent.trim() : null;
})()`;

const CLICK_BY_TEXT_JS = (text, scope = "button") => `(() => {
  const want = ${JSON.stringify(text)};
  const nodes = [...document.querySelectorAll(${JSON.stringify(scope)})];
  const hit = nodes.find((n) => (n.textContent || "").trim().includes(want));
  if (!hit) return false;
  hit.click();
  return true;
})()`;

const CLICK_BY_ARIA_JS = (text) => `(() => {
  const want = ${JSON.stringify(text)};
  const nodes = [...document.querySelectorAll("button[aria-label]")];
  const hit = nodes.find((n) => (n.getAttribute("aria-label") || "").includes(want));
  if (!hit) return false;
  hit.click();
  return true;
})()`;

const CLOSE_DIALOG_JS = `(() => {
  const d = document.querySelector('[role="dialog"]');
  if (!d) return false;
  const buttons = [...d.querySelectorAll("button")];
  const hit = buttons.find((n) => {
    const al = n.getAttribute("aria-label") || "";
    const txt = (n.textContent || "").trim();
    return (
      al.includes("關閉行前導覽") ||
      al.includes("關閉評分標準") ||
      al.startsWith("Close") ||
      txt === "關閉" ||
      txt === "Close"
    );
  });
  if (!hit) return false;
  hit.click();
  return true;
})()`;

const DIALOG_JS = `(() => {
  const d = document.querySelector('[role="dialog"]');
  if (!d) return null;
  return { label: d.getAttribute("aria-label") || "", text: (d.innerText || "").slice(0, 6000) };
})()`;

async function main() {
  const edge = await launchEdge();
  const { send, ws } = await newTarget();
  let exitCode = 0;
  const capture = async (file) => {
    try {
      const shot = await send("Page.captureScreenshot", { format: "png" });
      await mkdir(OUT, { recursive: true });
      await writeFile(path.join(OUT, file), Buffer.from(shot.data, "base64"));
    } catch (error) {
      console.log(`WARN  screenshot ${file}: ${error?.message ?? error}`);
    }
  };
  try {
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Network.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send("Network.setCookie", {
      name: "nexussim_locale",
      value: "zh",
      url: BASE,
    });

    await send("Page.navigate", { url: `${BASE}${SIEGE}` });
    check("cockpit hydrated", await waitHydrated(send));
    await sleep(600);

    // 1) 首次進入：導覽自動開啟 + 倒數暫停
    const guide = await evaluate(send, DIALOG_JS);
    check("guide opens automatically", Boolean(guide?.text.includes("倒數計時暫停中")), guide?.label);
    check("guide has 3 steps", Boolean(guide?.text.includes("步驟 1 / 3")));
    check(
      "guide step1 mentions verification mindset",
      Boolean(guide?.text.includes("不要盲目相信單一來源")),
    );

    const t0 = await evaluate(send, TIMER_JS);
    await sleep(2600);
    const t1 = await evaluate(send, TIMER_JS);
    check("timer paused while guide open", t0 === t1 && t0 === "10:00", `${t0} → ${t1}`);
    await capture("guide-step1-1440.png");

    // 2) 導覽三頁可切換，第三頁有 Rubric 入口
    await evaluate(send, CLICK_BY_TEXT_JS("下一步"));
    await sleep(200);
    await evaluate(send, CLICK_BY_TEXT_JS("下一步"));
    await sleep(250);
    const step3 = await evaluate(send, DIALOG_JS);
    check("guide step3 renders", Boolean(step3?.text.includes("步驟 3 / 3")));
    check("guide step3 links rubric", Boolean(step3?.text.includes("評分標準")));
    await capture("guide-step3-1440.png");

    // 3) 開始 → 倒數真的啟動
    await evaluate(send, CLICK_BY_TEXT_JS("開始 10 分鐘高壓模擬"));
    await sleep(2400);
    const t2 = await evaluate(send, TIMER_JS);
    const guideGone = await evaluate(send, `document.querySelector('[role="dialog"]') === null`);
    check("guide closes on start", guideGone);
    check("timer starts after start", t2 !== t1 && t2 !== null, `${t1} → ${t2}`);

    // 4) 頂部「評分標準」→ Rubric 視窗，含 4 維度 × 5 等級
    check("rubric button exists", await evaluate(send, CLICK_BY_ARIA_JS("評分標準")));
    await sleep(500);
    const rubric = await evaluate(send, DIALOG_JS);
    check("rubric modal opens", Boolean(rubric?.text.includes("評分標準")));
    check("rubric has 5 level bands", Boolean(rubric?.text.includes("85 - 100") || rubric?.text.includes("85 – 100")));
    const dims = await evaluate(
      send,
      `(() => {
        const d = document.querySelector('[role="dialog"]');
        if (!d) return 0;
        return (d.innerText.match(/Level [1-5]/g) || []).length;
      })()`,
    );
    check("rubric lists 20 level rows", dims >= 20, `levelMentions=${dims}`);
    await capture("rubric-modal-1440.png");

    // 5) 關閉 Rubric：計時暫停時的暫停狀態會被還原（此處原本在跑）
    const beforeClose = await evaluate(send, TIMER_JS);
    const wasRunning = await evaluate(
      send,
      `(() => {
        const b = [...document.querySelectorAll("button[aria-label]")].find((n) =>
          ["暫停倒數", "Pause countdown"].includes(n.getAttribute("aria-label")),
        );
        return Boolean(b);
      })()`,
    );
    await evaluate(send, CLOSE_DIALOG_JS);
    await sleep(2400);
    const afterClose = await evaluate(send, TIMER_JS);
    check(
      "timer resumes after rubric closes",
      beforeClose !== afterClose,
      `${beforeClose} → ${afterClose}`,
    );

    // 6) 頂部「操作導覽」→ 導覽重開且暫停
    check("guide reopen button exists", await evaluate(send, CLICK_BY_ARIA_JS("操作導覽")));
    await sleep(400);
    const reopened = await evaluate(send, DIALOG_JS);
    check("guide reopens from top bar", Boolean(reopened?.text.includes("倒數計時暫停中")));
    const p0 = await evaluate(send, TIMER_JS);
    await sleep(2200);
    const p1 = await evaluate(send, TIMER_JS);
    check("timer paused by reopened guide", p0 === p1, `${p0} → ${p1}`);

    // 7) 關閉後恢復
    await evaluate(send, CLICK_BY_ARIA_JS("關閉行前導覽"));
    await sleep(2400);
    const p2 = await evaluate(send, TIMER_JS);
    check("timer resumes after guide closes", p2 !== p1, `${p1} → ${p2}`);

    // 8) 英文介面同樣有兩個入口
    await evaluate(
      send,
      `(() => { localStorage.removeItem("nexussim:draft:nexus-launch-crisis"); return true; })()`,
    );
    await send("Network.setCookie", { name: "nexussim_locale", value: "en", url: BASE });
    await send("Page.navigate", { url: `${BASE}${SIEGE}` });
    await waitHydrated(send);
    await sleep(700);
    const enGuide = await evaluate(send, DIALOG_JS);
    check(
      "EN guide text",
      Boolean(enGuide?.text.match(/step 1 \/ 3/i)),
      enGuide?.text.slice(0, 90),
    );
    // 先關掉導覽，避免兩個 dialog 疊在一起
    await evaluate(send, CLOSE_DIALOG_JS);
    await sleep(400);
    check("EN rubric button exists", await evaluate(send, CLICK_BY_ARIA_JS("Scoring rubric")));
    await sleep(400);
    const enRubric = await evaluate(send, DIALOG_JS);
    check("EN rubric modal", Boolean(enRubric?.text.match(/Level 5/)));

    await send("Network.setCookie", { name: "nexussim_locale", value: "zh", url: BASE });
  } catch (error) {
    check("unhandled error", false, String(error));
  } finally {
    const failed = results.filter((r) => !r.ok);
    console.log(
      `\n${results.length - failed.length}/${results.length} checks passed${failed.length ? ` — ${failed.length} FAILED` : ""}`,
    );
    if (failed.length) exitCode = 1;
    try {
      ws.close();
    } catch {}
    edge.kill();
    process.exit(exitCode);
  }
}

main();
