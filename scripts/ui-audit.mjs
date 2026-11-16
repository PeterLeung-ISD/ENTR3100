/**
 * UI audit: renders lobby / cockpit / report at 375 / 768 / 1024 / 1440 and records
 * horizontal-overflow offenders, computed surface colours, raw-emoji hits, and PNG
 * screenshots into docs/ui-shots/.
 *
 * Usage: node scripts/ui-audit.mjs [baseUrl]
 */
import { mkdir, writeFile, mkdtemp } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = path.resolve("docs/ui-shots");
const EDGE = process.env.NX_EDGE ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9400 + Math.floor(Math.random() * 200);
const VIEWPORTS = [
  { name: "375", width: 375, height: 812, mobile: true },
  { name: "768", width: 768, height: 1024, mobile: false },
  { name: "1024", width: 1024, height: 768, mobile: false },
  { name: "1440", width: 1440, height: 900, mobile: false },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launchEdge() {
  const profile = await mkdtemp(path.join(tmpdir(), "nx-audit-"));
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
      if (res.ok) return { child, profile };
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
  return { ws, send, targetId: target.id };
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

const AUDIT_JS = `(() => {
  const vw = window.innerWidth;
  const offenders = [];
  for (const el of document.querySelectorAll("body *")) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (rect.right > vw + 1 || rect.left < -1) {
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || "").toString().slice(0, 90),
        right: Math.round(rect.right),
        left: Math.round(rect.left),
      });
    }
  }
  const emoji = (document.body.innerText.match(/[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2B00}-\\u{2BFF}]/gu) || []);
  const bg = getComputedStyle(document.body).backgroundColor;
  const font = getComputedStyle(document.body).fontFamily;

  // --- text contrast sampling -------------------------------------------
  const parse = (c) => {
    const m = c.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(",").map((v) => parseFloat(v));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const composite = (fg, bgc) => ({
    r: fg.r * fg.a + bgc.r * (1 - fg.a),
    g: fg.g * fg.a + bgc.g * (1 - fg.a),
    b: fg.b * fg.a + bgc.b * (1 - fg.a),
    a: 1,
  });
  const bgOf = (el) => {
    let node = el;
    let acc = null;
    while (node && node !== document.documentElement) {
      const c = parse(getComputedStyle(node).backgroundColor);
      if (c && c.a > 0) {
        acc = acc ? composite(acc, c) : c;
        if (acc.a >= 0.999) return acc;
      }
      node = node.parentElement;
    }
    return acc || { r: 248, g: 250, b: 252, a: 1 };
  };
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const seen = new Set();
  const contrast = [];
  const samples = document.querySelectorAll("h1, h2, h3, p, li, td, th, button, label, small, span");
  for (const el of samples) {
    const text = (el.textContent || "").trim();
    if (!text || el.children.length) continue;
    // 純標點（分隔線 / 項目符號）屬於裝飾，不列入文字對比檢核
    if (/^[\\/·|•\\-–—]+$/.test(text)) continue;
    if (el.getAttribute("aria-hidden") === "true") continue;
    if (text.length > 40 && !/^(h1|h2|h3|p|li|td|th|button)$/i.test(el.tagName)) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) < 0.9) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const fg = parse(cs.color);
    if (!fg) continue;
    const back = bgOf(el);
    const r = ratio(fg.a < 1 ? composite(fg, back) : fg, back);
    const key = el.tagName + Math.round(rect.width) + Math.round(rect.height) + text.slice(0, 12);
    if (seen.has(key)) continue;
    seen.add(key);
    if (r < 4.5) {
      contrast.push({
        tag: el.tagName.toLowerCase(),
        text: text.slice(0, 28),
        ratio: Math.round(r * 100) / 100,
        size: cs.fontSize,
        color: cs.color,
      });
    }
  }

  return {
    vw,
    scrollWidth: document.documentElement.scrollWidth,
    overflow: Math.max(0, document.documentElement.scrollWidth - vw),
    offenders: offenders.slice(0, 6),
    emoji: [...new Set(emoji)],
    contrast: contrast.slice(0, 8),
    bg,
    font: font.slice(0, 60),
    title: document.title,
    text: document.body.innerText.slice(0, 160).replace(/\\s+/g, " "),
  };
})()`;

async function shoot(send, file) {
  const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(file, Buffer.from(data, "base64"));
}

async function seedAttempt(send) {
  const payload = {
    scenarioId: "nexus-launch-crisis",
    candidateName: "Alex Chen",
    locale: "zh",
    telemetry: {
      unlockedRawLogs: true,
      viewedDocuments: ["doc-exec-deck", "doc-raw-logs", "doc-legal-memo"],
      questionedAuthority: true,
      respondedToVpOnTime: true,
      vpResponseText: "暫緩全量發布，先確認外部樣本與法務承諾，30 分鐘後給你風險摘要。",
      totalMessagesSent: 7,
      timeSpentSeconds: 402,
      finalDecision: "canary_release",
      decisionRationale:
        "92% 來自內部 15 份問卷，外部 N=500 只有 48% 滿意度與 41% 幻覺率。建議 5% 灰度上線並同步法務確認退款承諾，兩週後以外部樣本重測。",
      contactedNpcs: ["marcus", "chloe", "david", "sarah"],
      rushedSubmission: false,
      conversation: [
        { npcId: "chloe", sender: "user", content: "這 92% 的樣本量是多少？外部客戶的原始數據呢？", timestamp: "14:02" },
        { npcId: "chloe", sender: "chloe", content: "內部只有 15 份有效問卷；外部 N=500 的嚴重幻覺率是 41%。", timestamp: "14:03" },
      ],
    },
  };
  const res = await evaluate(
    send,
    `(async () => {
      const r = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(${JSON.stringify(payload)}),
      });
      const evaluation = await r.json();
      localStorage.setItem("nexussim:attempt:nexus-launch-crisis", JSON.stringify({
        scenarioId: "nexus-launch-crisis",
        candidateName: evaluation.candidateName ?? "Alex Chen",
        evaluation,
        telemetry: ${JSON.stringify(payload.telemetry)},
        completedAt: new Date().toISOString(),
      }));
      return { status: r.status, score: evaluation.overallScore, grade: evaluation.grade };
    })()`,
  );
  if (res.status !== 200) throw new Error(`seed failed: ${res.status}`);
  return res;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const { child } = await launchEdge();
  const results = [];
  try {
    const { send, ws, targetId } = await newTarget();
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });

    const goto = async (url) => {
      await send("Page.navigate", { url: BASE + url });
      for (let i = 0; i < 80; i += 1) {
        const ready = await evaluate(send, "document.readyState").catch(() => "loading");
        if (ready === "complete") break;
        await sleep(150);
      }
      await sleep(900);
    };

    // Seed a finished attempt so the report page has data.
    await goto("/");
    const seeded = await seedAttempt(send);
    console.log("seeded attempt:", JSON.stringify(seeded));

    for (const vp of VIEWPORTS) {
      await send("Emulation.setDeviceMetricsOverride", {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.mobile,
      });

      for (const page of [
        { path: "/", slug: "lobby", prepare: null },
        {
          path: "/simulation/nexus-launch-crisis",
          slug: "cockpit",
          prepare: `(async () => {
            const btn = [...document.querySelectorAll("button")].find((b) => /進入作戰室|Enter the war room/i.test(b.textContent || ""));
            if (btn) btn.click();
            await new Promise((r) => setTimeout(r, 700));
            return Boolean(btn);
          })()`,
        },
        { path: "/report/nexus-launch-crisis", slug: "report", prepare: null },
      ]) {
        await goto(page.path);
        if (page.prepare) await evaluate(send, page.prepare).catch(() => null);
        const audit = await evaluate(send, AUDIT_JS);
        const file = path.join(OUT, `${page.slug}-${vp.name}.png`);
        await shoot(send, file);
        results.push({ surface: page.slug, viewport: vp.name, ...audit });
        console.log(
          `${page.slug.padEnd(8)} ${vp.name.padStart(4)}  overflow=${String(audit.overflow).padStart(3)}px  offenders=${audit.offenders.length}  emoji=${audit.emoji.length}  lowContrast=${audit.contrast.length}  bg=${audit.bg}`,
        );
        if (audit.offenders.length) console.log("   ↳", JSON.stringify(audit.offenders));
        if (audit.emoji.length) console.log("   ↳ emoji:", audit.emoji.join(" "));
        if (audit.contrast.length) console.log("   ↳ contrast:", JSON.stringify(audit.contrast));
      }
    }

    // English capture pass at 1440 for the two institutional surfaces.
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await goto("/");
    await evaluate(send, `document.cookie = "nexussim_locale=en; path=/; max-age=31536000"`);
    for (const page of [
      { path: "/", slug: "lobby-en" },
      { path: "/report/nexus-launch-crisis", slug: "report-en" },
    ]) {
      await goto(page.path);
      const audit = await evaluate(send, AUDIT_JS);
      await shoot(send, path.join(OUT, `${page.slug}-1440.png`));
      results.push({ surface: page.slug, viewport: "1440", ...audit });
      console.log(
        `${page.slug.padEnd(10)} 1440  overflow=${String(audit.overflow).padStart(3)}px  offenders=${audit.offenders.length}  emoji=${audit.emoji.length}`,
      );
    }
    await evaluate(send, `document.cookie = "nexussim_locale=zh; path=/; max-age=31536000"`);

    ws.close();
    await fetch(`http://127.0.0.1:${PORT}/json/close/${targetId}`).catch(() => null);
  } finally {
    child.kill();
    await writeFile(path.join(OUT, "audit.json"), JSON.stringify(results, null, 2));
    const bad = results.filter((r) => r.overflow > 0 || r.emoji.length > 0);
    console.log(`\n${results.length} renders · ${bad.length} with issues · screenshots in ${OUT}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
