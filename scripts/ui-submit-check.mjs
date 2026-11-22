/**
 * 提交簽核的端到端回歸測試（真實滑鼠事件，非 JS click）。
 *
 * 覆蓋：
 *  1. 行前導覽在矮視窗（1280×620）仍可完整操作：卡片不超出視窗，主體可滾動，開始按鈕可點。
 *  2. 未選決策 / 理據不足時點擊「提交簽核並結束模擬」，必須出現可見提示（不再靜默無反應）。
 *  3. 選好決策 + 理據 → 確認面板出現（不被裁切）→ 確認提交 → 導向 /report/<scenarioId>。
 *  4. 行動版（375×640）走 簽核 分頁，流程同樣可完成。
 *
 * 用法：
 *   node scripts/ui-submit-check.mjs
 *   node scripts/ui-submit-check.mjs http://localhost:3000
 */
import { mkdtemp } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

const BASE = process.argv[2] ?? process.env.NX_BASE ?? "http://localhost:3000";
const EDGE =
  process.env.NX_EDGE ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const SCENARIO = "nexus-launch-crisis";
const COCKPIT = `${BASE}/simulation/${SCENARIO}`;
const REPORT = `${BASE}/report/${SCENARIO}`;
const PORT = 8500 + Math.floor(Math.random() * 200);

const results = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

async function launchEdge() {
  const userDir = await mkdtemp(path.join(tmpdir(), "nx-submit-"));
  const proc = spawn(
    EDGE,
    [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${userDir}`,
      "--no-first-run",
      "--disable-gpu",
      "--hide-scrollbars",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  for (let i = 0; i < 120; i += 1) {
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) return proc;
    } catch {
      /* retry */
    }
    await sleep(120);
  }
  throw new Error("無法啟動 headless Edge");
}

async function newPage() {
  const info = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", () => resolve(undefined), { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = (nextId += 1);
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const out = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (out.exceptionDetails) throw new Error(out.exceptionDetails.exception?.description ?? "eval failed");
    return out.result.value;
  };
  return { send, evaluate, close: () => ws.close() };
}

async function viewport(send, width, height) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 500,
  });
}

async function waitFor(page, expression, timeout = 12000, interval = 120) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await page.evaluate(expression)) return true;
    await sleep(interval);
  }
  return false;
}

/** 以真實滑鼠事件點擊（必須帶 buttons，否則 Chrome 不會合成 click）。 */
async function mouseClick(page, point) {
  const { send } = page;
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y, button: "none" });
  await send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 1,
    clickCount: 1,
  });
  await sleep(40);
  await send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 0,
    clickCount: 1,
  });
  await sleep(160);
}

const CENTER_JS = (text) => `(() => {
  const candidates = [...document.querySelectorAll('button, a, label')].filter((el) => (el.textContent || '').trim().includes(${JSON.stringify(text)}));
  const visible = candidates.find((el) => {
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.pointerEvents !== 'none';
  });
  if (!visible) return null;
  visible.scrollIntoView({ block: 'center', inline: 'center' });
  const r = visible.getBoundingClientRect();
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), disabled: Boolean(visible.disabled) };
})()`;

async function clickText(page, text) {
  const point = await page.evaluate(CENTER_JS(text));
  if (!point) return false;
  await mouseClick(page, point);
  return true;
}

async function openCockpit(page, width, height, { clearDraft = true } = {}) {
  await viewport(page.send, width, height);
  await page.send("Page.navigate", { url: BASE });
  await sleep(1200);
  if (clearDraft) {
    await page.evaluate(`(() => {
      Object.keys(localStorage).filter((k) => k.startsWith('nexussim:draft:')).forEach((k) => localStorage.removeItem(k));
      return true;
    })()`);
  }
  await page.evaluate(`document.cookie = 'nexussim_locale=zh; path=/; max-age=31536000; samesite=lax'`);
  await page.send("Page.navigate", { url: COCKPIT });
  await sleep(2600);
  await waitFor(page, `Boolean(Object.keys(document.body).find((k) => k.startsWith('__react')))`, 15000);
}

async function dismissGuide(page) {
  const opened = await waitFor(page, `Boolean(document.querySelector('[role="dialog"]'))`);
  if (!opened) return false;
  const skip = await clickText(page, "跳過導覽");
  if (skip) {
    await waitFor(page, `!document.querySelector('[role="dialog"]')`, 4000);
    return true;
  }
  for (let i = 0; i < 2; i += 1) {
    await clickText(page, "下一步");
    await sleep(220);
  }
  await clickText(page, "開始 10 分鐘高壓模擬");
  await waitFor(page, `!document.querySelector('[role="dialog"]')`, 4000);
  return true;
}

async function fillDecision(page) {
  const ok = await page.evaluate(`(() => {
    const input = [...document.querySelectorAll('input[name="final-decision"]')].find((el) => el.value === 'canary_release');
    if (!input) return false;
    input.click();
    const areas = [...document.querySelectorAll('textarea')];
    const ta = areas[areas.length - 1];
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, '92% 只來自 15 位內部員工，外部 500 位用戶幻覺率達 41%，應先降至 5% 以下並以 5% 灰度驗證。');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return ta.value.length;
  })()`);
  await sleep(260);
  return typeof ok === "number" && ok > 20;
}

async function main() {
  const proc = await launchEdge();
  const page = await newPage();
  try {
    await page.send("Page.enable");
    await page.send("Runtime.enable");

    // ── 1. 矮視窗：導覽卡不得超出視窗，主體可滾動，開始按鈕可點 ──
    await openCockpit(page, 1280, 620);
    const guideBox = await page.evaluate(`(() => {
      const card = document.querySelector('[role="dialog"]');
      if (!card) return null;
      const r = card.getBoundingClientRect();
      const body = card.querySelector('.scroll-thin');
      return {
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        viewport: innerHeight,
        inside: r.top >= 0 && r.bottom <= innerHeight + 1,
        scrollable: body ? body.scrollHeight > body.clientHeight + 4 : false,
      };
    })()`);
    check(
      "1280×620 導覽卡完整落在視窗內",
      Boolean(guideBox?.inside),
      guideBox ? `top=${guideBox.top} bottom=${guideBox.bottom} viewport=${guideBox.viewport}` : "找不到導覽",
    );

    let started = await dismissGuide(page);
    check("1280×620 可完成導覽並開始計時", started);
    const timerA = await page.evaluate(
      `([...document.querySelectorAll('.tabular-telemetry')].map((n) => (n.textContent || '').trim()).find((t) => /^\\d\\d:\\d\\d$/.test(t)) ?? '')`,
    );
    await sleep(1600);
    const timerB = await page.evaluate(
      `([...document.querySelectorAll('.tabular-telemetry')].map((n) => (n.textContent || '').trim()).find((t) => /^\\d\\d:\\d\\d$/.test(t)) ?? '')`,
    );
    check("開始後倒數計時啟動", timerA !== timerB, `${timerA} → ${timerB}`);

    // ── 2. 未填寫就提交 → 必須有可見提示 ──
    const submitPoint = await page.evaluate(CENTER_JS("提交簽核並結束模擬"));
    check("矮視窗提交按鈕可點（未 disabled）", Boolean(submitPoint) && submitPoint.disabled === false, JSON.stringify(submitPoint));
    if (submitPoint) await mouseClick(page, submitPoint);
    const warned = await waitFor(page, `Boolean(document.querySelector('[role="alert"]'))`, 3000);
    const warnText = warned ? await page.evaluate(`(document.querySelector('[role="alert"]')?.textContent ?? '').trim()`) : "";
    check("未選決策就提交會顯示提示（不再靜默）", warned, warnText.slice(0, 40));
    check("未通過驗證時不會跳轉報告頁", (await page.evaluate("location.pathname")) !== `/report/${SCENARIO}`);

    // ── 3. 選好決策 + 理據 → 確認 → 送出 ──
    const filled = await fillDecision(page);
    check("可選決策並輸入理據", filled);
    const submitReady = await page.evaluate(CENTER_JS("提交簽核並結束模擬"));
    await mouseClick(page, submitReady);
    const confirmOpen = await waitFor(page, `Boolean(document.querySelector('[role="alertdialog"]'))`, 3000);
    const confirmCtas = confirmOpen
      ? await page.evaluate(`(() => {
          const dialog = document.querySelector('[role="alertdialog"]');
          const buttons = [...dialog.querySelectorAll('button')].map((b) => {
            const r = b.getBoundingClientRect();
            const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            return {
              text: (b.textContent || '').trim(),
              inside: r.top >= 0 && r.bottom <= innerHeight,
              hit: top ? b.contains(top) || top === b : false,
            };
          });
          return buttons;
        })()`)
      : [];
    check("確認面板出現", confirmOpen, JSON.stringify(confirmCtas));
    check(
      "確認面板按鈕在視窗內且可點中",
      confirmCtas.length >= 2 && confirmCtas.every((b) => b.inside && b.hit),
      JSON.stringify(confirmCtas),
    );

    await clickText(page, "確認提交");
    const reached = await waitFor(page, `location.pathname === ${JSON.stringify(`/report/${SCENARIO}`)}`, 15000);
    check("確認後跳轉到覆盤報告", reached, await page.evaluate("location.pathname"));
    if (reached) {
      await waitFor(page, `Boolean(document.querySelector('h1'))`, 8000);
      const heading = await page.evaluate(`(document.querySelector('h1')?.textContent ?? '').trim()`);
      check("報告頁有內容", heading.length > 0, heading.slice(0, 30));
    }

    // ── 4. 行動版：透過底部「簽核」分頁完成同樣流程 ──
    await openCockpit(page, 375, 640);
    await dismissGuide(page);
    await clickText(page, "簽核");
    await sleep(400);
    const mobileSubmit = await page.evaluate(CENTER_JS("提交簽核並結束模擬"));
    check("行動版簽核分頁可看到提交按鈕", Boolean(mobileSubmit), JSON.stringify(mobileSubmit));
    if (mobileSubmit) {
      await fillDecision(page);
      const again = await page.evaluate(CENTER_JS("提交簽核並結束模擬"));
      await mouseClick(page, again);
      const mobileConfirm = await waitFor(page, `Boolean(document.querySelector('[role="alertdialog"]'))`, 3000);
      check("行動版確認面板出現", mobileConfirm);
      await clickText(page, "確認提交");
      const mobileReached = await waitFor(
        page,
        `location.pathname === ${JSON.stringify(`/report/${SCENARIO}`)}`,
        15000,
      );
      check("行動版可完成提交並跳轉報告", mobileReached, await page.evaluate("location.pathname"));
    }
  } finally {
    page.close();
    proc.kill();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error("ERROR", error);
  process.exitCode = 1;
});
