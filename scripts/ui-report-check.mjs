/**
 * 結算報告頁自檢：升等指南 / 遺漏步驟 / 透明 Rubric 對照表。
 *
 * 用法：node scripts/ui-report-check.mjs [baseUrl]
 */
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

const BASE = process.argv[2] ?? process.env.NX_BASE ?? "http://localhost:3000";
const EDGE = process.env.NX_EDGE ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9800 + Math.floor(Math.random() * 150);
const OUT = path.resolve("docs/ui-shots");
const REPORT = "/report/nexus-launch-crisis";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
}

async function launchEdge() {
  const profile = await mkdtemp(path.join(tmpdir(), "nx-report-"));
  const child = spawn(
    EDGE,
    [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--hide-scrollbars",
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

const BAD_TELEMETRY = {
  unlockedRawLogs: false,
  viewedDocuments: ["doc-exec-deck"],
  questionedAuthority: false,
  respondedToVpOnTime: false,
  vpResponseText: "",
  totalMessagesSent: 2,
  timeSpentSeconds: 96,
  finalDecision: "approve_full",
  decisionRationale: "Marcus 說 92% 很高，先上線再說。",
  contactedNpcs: ["marcus"],
  rushedSubmission: true,
  conversation: [
    { npcId: "marcus", sender: "marcus", content: "董事會在看，直接簽核吧。", timestamp: "14:00" },
  ],
};

async function seed(send, locale) {
  const res = await evaluate(
    send,
    `(async () => {
      const payload = ${JSON.stringify({
        scenarioId: "nexus-launch-crisis",
        candidateName: "Alex Chen",
        locale,
        telemetry: BAD_TELEMETRY,
      })};
      const r = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const evaluation = await r.json();
      localStorage.setItem("nexussim:attempt:nexus-launch-crisis", JSON.stringify({
        scenarioId: "nexus-launch-crisis",
        candidateName: evaluation.candidateName ?? "Alex Chen",
        evaluation,
        telemetry: payload.telemetry,
        completedAt: new Date().toISOString(),
      }));
      return { status: r.status, score: evaluation.overallScore, grade: evaluation.grade, missed: (evaluation.missedSteps || []).length };
    })()`,
  );
  check(
    `seed attempt (${locale})`,
    res.status === 200 && res.missed >= 5,
    `score=${res.score} grade=${res.grade} missed=${res.missed}`,
  );
  return res;
}

async function shoot(send, file) {
  await mkdir(OUT, { recursive: true });
  const res = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await writeFile(path.join(OUT, file), Buffer.from(res.data, "base64"));
}

async function main() {
  const edge = await launchEdge();
  const { send, ws } = await newTarget();
  let exitCode = 0;
  try {
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Network.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1400,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send("Network.setCookie", { name: "nexussim_locale", value: "zh", url: BASE });

    // 以空白頁面建立 origin，才能寫 localStorage 給同源的報告頁讀取
    await send("Page.navigate", { url: `${BASE}/` });
    await waitHydrated(send);
    await seed(send, "zh");

    await send("Page.navigate", { url: `${BASE}${REPORT}` });
    check("report hydrated", await waitHydrated(send));
    await sleep(1800);

    const sections = await evaluate(
      send,
      `(() => {
        const ids = ["coaching-title", "missed-title", "rubric-matrix-title"];
        return Object.fromEntries(ids.map((id) => [id, Boolean(document.getElementById(id))]));
      })()`,
    );
    check("coaching section present", sections["coaching-title"]);
    check("missed-steps section present", sections["missed-title"]);
    check("rubric matrix present", sections["rubric-matrix-title"]);

    const text = await evaluate(send, "document.body.innerText");
    check("missed steps name the raw-log gap", /原始測試日誌|Chloe/.test(text));
    check("coaching shows level-up advice", /升至 Level|已達 Level 5/.test(text));
    check("coaching shows Level X / 5 bars", (text.match(/Level \d \/ 5/g) || []).length >= 4);
    check("missed-step panel has amber/rose categories", /驗證|持份者|風險控管|溝通/.test(text));
    check(
      "score & grade visible",
      /C/.test(text) && text.includes("35"),
    );

    // Rubric 對照表：展開 → 收合 → 再展開
    const toggleSel = `[aria-controls="rubric-matrix-body"]`;
    const startExpanded = await evaluate(
      send,
      `document.querySelector('${toggleSel}')?.getAttribute("aria-expanded") ?? null`,
    );
    check("rubric matrix toggle exists", startExpanded !== null, `aria-expanded=${startExpanded}`);

    const rows0 = await evaluate(send, `document.querySelectorAll("#rubric-matrix-body table tbody tr").length`);
    await evaluate(send, `document.querySelector('${toggleSel}').click()`);
    await sleep(400);
    const expanded = await evaluate(
      send,
      `document.querySelector('${toggleSel}')?.getAttribute("aria-expanded")`,
    );
    const rows1 = await evaluate(send, `document.querySelectorAll("#rubric-matrix-body table tbody tr").length`);
    const toggledOn = expanded === "true" ? rows1 > 0 : rows0 > 0;
    check("rubric matrix expands with 5 levels per dimension", toggledOn && rows1 >= 20, `rows ${rows0} → ${rows1}`);

    // 再點一次收合
    await evaluate(send, `document.querySelector('${toggleSel}').click()`);
    await sleep(300);
    const collapsed = await evaluate(
      send,
      `document.querySelector('${toggleSel}')?.getAttribute("aria-expanded")`,
    );
    check("rubric matrix collapses", collapsed === "false", `aria-expanded=${collapsed}`);

    // 展開後應標示「你目前在此」與「最高標準」
    if (collapsed === "false") {
      await evaluate(send, `document.querySelector('${toggleSel}').click()`);
      await sleep(300);
    }
    const bodyText = await evaluate(send, `document.getElementById("rubric-matrix-body")?.innerText ?? ""`);
    check("current level highlighted in rubric", /你目前在此/.test(bodyText));
    check("top standard highlighted in rubric", /最高標準/.test(bodyText));

    // 憑證列印：非憑證區塊都要 no-print
    const printState = await evaluate(
      send,
      `(() => {
        const sheets = [...document.querySelectorAll(".print-certificate-only")];
        const bleed = [...document.querySelectorAll(".print-certificate-only *")].filter(
          (n) => n.closest(".no-print"),
        ).length;
        return { sheets: sheets.length, bleed };
      })()`,
    );
    check("single printable certificate", printState.sheets === 1, JSON.stringify(printState));

    const overflow = await evaluate(
      send,
      `(() => {
        const wide = [...document.querySelectorAll("body *")].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.right > window.innerWidth + 1;
        });
        return { docScroll: document.scrollingElement.scrollWidth - window.innerWidth, offenders: wide.length };
      })()`,
    );
    check("no horizontal overflow at 1440", overflow.docScroll <= 0 && overflow.offenders === 0, JSON.stringify(overflow));

    await shoot(send, "report-coaching-1440.png");

    // 英文版
    await send("Network.setCookie", { name: "nexussim_locale", value: "en", url: BASE });
    await send("Page.navigate", { url: `${BASE}${REPORT}` });
    await waitHydrated(send);
    await sleep(2600);
    const enText = await evaluate(send, "document.body.innerText");
    check("EN report coaching section", /Level-up|reach Level/i.test(enText), enText.slice(0, 80));
    check("EN missed steps section", /Missed steps|missed/i.test(enText));
    check("EN rubric matrix", /rubric/i.test(enText));
    await shoot(send, "report-coaching-en-1440.png");
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
