const BASE = process.env.NX_BASE ?? process.argv[2] ?? "http://localhost:3000";
const results = [];
function log(name, ok, extra = "") {
  results.push({ name, ok, extra });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
}

const EN = { cookie: "nexussim_locale=en" };

async function get(path, extraHeaders = {}) {
  const res = await fetch(BASE + path, {
    headers: { "cache-control": "no-cache", ...extraHeaders },
  });
  const html = await res.text();
  return { status: res.status, html };
}

async function getJson(path) {
  const res = await fetch(BASE + path, { headers: { "cache-control": "no-cache" } });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

// wait for server
for (let i = 0; i < 60; i++) {
  try {
    const r = await fetch(BASE + "/");
    if (r.ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 1000));
}

// 1. lobby
{
  const { status, html } = await get("/");
  log("GET / 200", status === 200, `status=${status}`);
  log("lobby 有 NovaAssist 字樣", html.includes("NovaAssist"));
  log("lobby 有 Coming Soon 任務", html.includes("Coming Soon") || html.includes("即將") || html.includes("Meridian"));
  log("lobby 有四個能力支柱", html.includes("批判") && html.includes("抗干擾"));
}

// 2. simulation page
{
  const { status, html } = await get("/simulation/nexus-launch-crisis");
  log("GET /simulation/nexus-launch-crisis 200", status === 200, `status=${status}`);
  log("cockpit 有任務簡報", html.includes("簡報") || html.includes("Mission") || html.includes("作戰"));
  log("cockpit 有 NPC 名", html.includes("Marcus") && html.includes("Chloe"));
  log("cockpit 有倒數 10:00", html.includes("10:00") || html.includes("600"));
}

// 3. unknown scenario → 404
{
  const { status } = await get("/simulation/does-not-exist");
  log("未知任務回 404", status === 404, `status=${status}`);
}

// 4. api mode probe
{
  const { status, json } = await getJson("/api/npc-chat");
  log("GET /api/npc-chat 200", status === 200);
  log("未設金鑰 → offline-mock", json?.mode === "offline-mock", `mode=${json?.mode}`);
}

// 5. ask Chloe for raw data → unlock doc-raw-logs
{
  const { status, json } = await post("/api/npc-chat", {
    npcId: "chloe",
    message: "這 92% 的樣本量是多少？我要看原始數據和外部測試的 log。",
    scenarioId: "nexus-launch-crisis",
    unlockedDocuments: ["doc-exec-deck"],
  });
  log("POST npc-chat chloe 200", status === 200, `status=${status}`);
  log("Chloe 解鎖 doc-raw-logs", json?.unlockDocumentId === "doc-raw-logs", `unlock=${json?.unlockDocumentId}`);
  log("Chloe 有回覆文字", typeof json?.reply === "string" && json.reply.length > 10, `len=${json?.reply?.length}`);
}

// 6. chit-chat must not unlock
{
  const { json } = await post("/api/npc-chat", {
    npcId: "chloe",
    message: "午安，今天天氣不錯，你午餐吃了什麼？",
    scenarioId: "nexus-launch-crisis",
    unlockedDocuments: ["doc-exec-deck"],
  });
  log("閒聊不會誤解鎖文件", !json?.unlockDocumentId, `unlock=${json?.unlockDocumentId}`);
}

// 7. question Marcus → authority flag
{
  const { json } = await post("/api/npc-chat", {
    npcId: "marcus",
    message: "我不認同 92% 這個數字，樣本只有 15 份，可否提供原始問卷與外部測試數據？",
    scenarioId: "nexus-launch-crisis",
    unlockedDocuments: ["doc-exec-deck"],
  });
  log("質疑 Marcus → questionedAuthority", json?.questionedAuthority === true, `flag=${json?.questionedAuthority}`);
}

// 8. evaluation: good run
const goodTelemetry = {
  unlockedRawLogs: true,
  viewedDocuments: ["doc-exec-deck", "doc-raw-logs", "doc-legal-memo"],
  questionedAuthority: true,
  respondedToVpOnTime: true,
  vpResponseText: "我建議先 5% canary 上線 48 小時，同步修補幻覺問題，下週看外部 N=500 的數據再全量。",
  totalMessagesSent: 9,
  timeSpentSeconds: 412,
  finalDecision: "canary_release",
  decisionRationale:
    "92% 來自內部 15 份問卷，外部 500 名客戶只有 48% 滿意度、41% 幻覺率，直接全量上線的聲譽與法務風險不可接受，因此改為 canary 分批並設定回滾標準。",
  contactedNpcs: ["marcus", "chloe", "david", "sarah"],
  rushedSubmission: false,
  conversation: [
    { npcId: "chloe", sender: "user", content: "這 92% 的樣本量是多少？" },
    { npcId: "chloe", sender: "npc", content: "那是內部 15 份問卷…" },
  ],
};
{
  const { status, json } = await post("/api/evaluate", {
    scenarioId: "nexus-launch-crisis",
    candidateName: "Alex Chen",
    telemetry: goodTelemetry,
  });
  log("POST evaluate 200", status === 200, `status=${status}`);
  log("good run 分數 ≥ 70", json?.overallScore >= 70, `score=${json?.overallScore} grade=${json?.grade}`);
  log("good run 批判性驗證 ≥ 80", json?.dimensions?.criticalVerification >= 80, `cv=${json?.dimensions?.criticalVerification}`);
  log("xray 4 項以上", Array.isArray(json?.xray) && json.xray.length >= 4, `n=${json?.xray?.length}`);
  log("trapAnalysis 3 份文件", Array.isArray(json?.trapAnalysis) && json.trapAnalysis.length === 3);
  log("有 verificationId", /^NX-\d{4}-\d{4}$/.test(json?.verificationId ?? ""), json?.verificationId);
  log("有 executiveFeedback", (json?.executiveFeedback ?? "").length > 40);
  log("strengths/blindSpots 非空", json?.strengths?.length > 0 && json?.blindSpots?.length > 0);
}

// 9. evaluation: bad run → hard cap
{
  const { json } = await post("/api/evaluate", {
    scenarioId: "nexus-launch-crisis",
    candidateName: "Alex Chen",
    telemetry: {
      unlockedRawLogs: false,
      viewedDocuments: ["doc-exec-deck"],
      questionedAuthority: false,
      respondedToVpOnTime: false,
      totalMessagesSent: 0,
      timeSpentSeconds: 45,
      finalDecision: "approve_full",
      decisionRationale: "Marcus 說 92% 很漂亮，先上線再說。",
      contactedNpcs: ["marcus"],
      rushedSubmission: true,
      conversation: [],
    },
  });
  log("bad run 批判性驗證上限 35", json?.dimensions?.criticalVerification <= 35, `cv=${json?.dimensions?.criticalVerification}`);
  log("bad run 等級不優於 B", ["B", "C"].includes(json?.grade), `grade=${json?.grade} score=${json?.overallScore}`);
  log("bad run 有負面盲點", json?.blindSpots?.length > 0);
}

// 10. report page
{
  const { status, html } = await get("/report/nexus-launch-crisis");
  log("GET /report/nexus-launch-crisis 200", status === 200, `status=${status}`);
}

// 11. bad json body
{
  const res = await fetch(BASE + "/api/evaluate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{not-json",
  });
  log("壞 JSON → 400", res.status === 400, `status=${res.status}`);
}

// 12. English locale (cookie nexussim_locale=en)
{
  const { status, html } = await get("/", EN);
  log("EN GET / 200", status === 200, `status=${status}`);
  log("EN lobby 英文文案", html.includes("Critical-Thinking") || html.includes("Simulator"), "");
  log("EN lobby 有語言切換", html.includes("EN") && html.includes("中文"));
  log("EN lobby 唔應出現「即將推出」中文任務", !html.includes("即將推出"));

  const { status: s2, html: h2 } = await get("/simulation/nexus-launch-crisis", EN);
  log("EN cockpit 200", s2 === 200, `status=${s2}`);
  log("EN cockpit 英文 Mission Brief", /Mission|Brief|War Room/i.test(h2));
}

// 13. EN npc-chat 解鎖 + 英文回覆
{
  const { json } = await post("/api/npc-chat", {
    npcId: "chloe",
    message: "What is the sample size behind that 92%? I want the raw data and external test logs.",
    scenarioId: "nexus-launch-crisis",
    unlockedDocuments: ["doc-exec-deck"],
    locale: "en",
  });
  log("EN Chloe 解鎖 doc-raw-logs", json?.unlockDocumentId === "doc-raw-logs", `unlock=${json?.unlockDocumentId}`);
  log("EN Chloe 回覆為英文", /[a-z]{4,}/i.test(json?.reply ?? "") && !/[\u4e00-\u9fff]/.test(json?.reply ?? ""), (json?.reply ?? "").slice(0, 40));
  log("EN npc-chat locale 回傳", json?.locale === "en", `locale=${json?.locale}`);
}

// 14. EN evaluate 產出英文報告
{
  const { json } = await post("/api/evaluate", {
    scenarioId: "nexus-launch-crisis",
    candidateName: "Alex Chen",
    locale: "en",
    telemetry: {
      unlockedRawLogs: true,
      viewedDocuments: ["doc-exec-deck", "doc-raw-logs", "doc-legal-memo"],
      questionedAuthority: true,
      respondedToVpOnTime: true,
      vpResponseText: "Recommend a 5% canary for 48 hours, patch hallucination, then full launch next week.",
      totalMessagesSent: 8,
      timeSpentSeconds: 400,
      finalDecision: "canary_release",
      decisionRationale:
        "The 92% comes from 15 internal staff; 500 external customers sit at 48% satisfaction and a 41% hallucination rate, so full launch is not acceptable. Recommend a canary with rollback criteria.",
      contactedNpcs: ["marcus", "chloe", "david", "sarah"],
      rushedSubmission: false,
      conversation: [{ npcId: "chloe", sender: "user", content: "What is the sample size?" }],
    },
  });
  const feedback = json?.executiveFeedback ?? "";
  log("EN evaluate locale=en", json?.locale === "en", `locale=${json?.locale}`);
  log("EN evaluate 英文評語", /[a-z]{4,}/i.test(feedback) && !/[\u4e00-\u9fff]/.test(feedback), feedback.slice(0, 40));
  log("EN evaluate 英文 xray", /[a-z]{4,}/i.test(json?.xray?.[0]?.title ?? ""));
  log("EN evaluate trapAnalysis 3 份", json?.trapAnalysis?.length === 3);
  log("EN evaluate 分數合理", json?.overallScore >= 70, `score=${json?.overallScore} grade=${json?.grade}`);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n== ${results.length - failed.length}/${results.length} passed ==`);
if (failed.length) {
  console.log("FAILED:");
  for (const f of failed) console.log(" - " + f.name + (f.extra ? " :: " + f.extra : ""));
  process.exit(1);
}
