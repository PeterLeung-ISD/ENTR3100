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
  log(
    "lobby 聚焦單一旗艦任務（無 Coming Soon 卡片）",
    !html.includes("Coming Soon") && !html.includes("Meridian") && html.includes("立即進入旗艦模擬"),
  );
  log("lobby 有評分標準入口", html.includes("查看評分標準") || html.includes("Rubric"));
  log("lobby 有擴充劇本預告", html.includes("FinGuard") || html.includes("第二波"));
  log("lobby 有四個能力支柱", html.includes("批判") && html.includes("抗干擾"));
}

// 2. simulation page
{
  const { status, html } = await get("/simulation/nexus-launch-crisis");
  log("GET /simulation/nexus-launch-crisis 200", status === 200, `status=${status}`);
  log("cockpit 有任務簡報", html.includes("簡報") || html.includes("Mission") || html.includes("作戰"));
  log("cockpit 有 NPC 名", html.includes("Marcus") && html.includes("Chloe"));
  log("cockpit 有倒數 10:00", html.includes("10:00") || html.includes("600"));
  log("cockpit 有行前導覽與倒數暫停", html.includes("倒數計時暫停中") && html.includes("行前導覽"));
  log("cockpit 有操作導覽 / 評分標準按鈕", html.includes("操作導覽") && html.includes("評分標準"));
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
  log("bad run 有 4 個維度升等指導", json?.dimensionCoaching?.length === 4, `n=${json?.dimensionCoaching?.length}`);
  log(
    "升等指導含 Level 與具體做法",
    json?.dimensionCoaching?.every(
      (item) => [1, 2, 3, 4, 5].includes(item.achievedLevel) && item.howToLevelUp.length > 20 && item.evidenceObserved.length > 0,
    ),
  );
  const missedIds = (json?.missedSteps ?? []).map((item) => item.id);
  log("bad run 抓到遺漏原始日誌", missedIds.includes("missed-raw-logs"), `ids=${missedIds.join(",")}`);
  log("bad run 抓到遺漏法務備忘錄", missedIds.includes("missed-legal-memo"));
  log("bad run 抓到 VP 逾時", missedIds.includes("missed-vp-timeout"));
  log(
    "遺漏步驟都有 why + fix",
    (json?.missedSteps ?? []).every((item) => item.whyItMatters.length > 10 && item.actionableFix.length > 10),
  );
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

// 15. AI 設定：GET 探測 + 無金鑰 ping
{
  const { json } = await getJson("/api/npc-chat");
  log("GET /api/npc-chat 有 hasServerKey", typeof json?.hasServerKey === "boolean", `hasServerKey=${json?.hasServerKey}`);
  log("GET /api/npc-chat 有預設 model", json?.defaults?.model === "deepseek-chat", `model=${json?.defaults?.model}`);
  log("GET /api/npc-chat 有預設 baseUrl", json?.defaults?.baseUrl === "https://api.deepseek.com");

  const ping = await post("/api/npc-chat", { ping: true });
  log("無金鑰 ping 回 ok:false", ping.json?.ok === false, `ok=${ping.json?.ok}`);
  log("無金鑰 ping 有 warningNotice", typeof ping.json?.warningNotice === "string" && ping.json.warningNotice.length > 0);
  log("無金鑰 ping 非 live", ping.json?.isLiveAi === false);
}

// 16. 假金鑰 ping 不應 500
{
  const res = await fetch(BASE + "/api/npc-chat", {
    method: "POST",
    headers: { "content-type": "application/json", "x-deepseek-api-key": "sk-invalid-key-for-test-only" },
    body: JSON.stringify({ ping: true }),
  });
  const json = await res.json().catch(() => null);
  log("假金鑰 ping 回 200", res.status === 200, `status=${res.status}`);
  log("假金鑰 ping 回 ok:false", json?.ok === false, `ok=${json?.ok}`);
  log("假金鑰 ping 有降級提示", typeof json?.warningNotice === "string");
}

// 17. 多輪對話 payload（chatHistory + simulationContext）
{
  const { json } = await post("/api/npc-chat", {
    npcId: "chloe",
    userMessage: "等一下，這 92% 的樣本數是多少？有做過外部真實用戶測試嗎？",
    chatHistory: [
      { sender: "user", content: "Chloe，簡報在哪？", timestamp: "14:01" },
      { sender: "npc", content: "數字都在 Marcus 那份簡報裡。", timestamp: "14:01" },
    ],
    simulationContext: { remainingSeconds: 420, unlockedDocIds: ["doc-exec-deck"], pressureLevel: 48 },
    scenarioId: "nexus-launch-crisis",
  });
  log("多輪 payload 有回覆", typeof json?.reply === "string" && json.reply.length > 0, (json?.reply ?? "").slice(0, 30));
  log("多輪 payload isLiveAi 為布林", typeof json?.isLiveAi === "boolean", `isLiveAi=${json?.isLiveAi}`);
  log("多輪 payload 觸發 doc-raw-logs 解鎖", json?.unlockDocumentId === "doc-raw-logs", `unlock=${json?.unlockDocumentId}`);

  const marcus = await post("/api/npc-chat", {
    npcId: "marcus",
    userMessage: "我要看原始測試日誌 log 和樣本來源，快點給我。",
    chatHistory: [],
    simulationContext: { remainingSeconds: 300, unlockedDocIds: ["doc-exec-deck"], pressureLevel: 60 },
    scenarioId: "nexus-launch-crisis",
  });
  log("Marcus 永不解鎖文件", !marcus.json?.unlockDocumentId, `unlock=${marcus.json?.unlockDocumentId}`);
  log("Marcus 被質疑時標記 questionedAuthority", marcus.json?.questionedAuthority === true);
}

// 18. 舊版 payload 仍然相容
{
  const { json } = await post("/api/npc-chat", {
    npcId: "chloe",
    message: "樣本數是幾多？",
    scenarioId: "nexus-launch-crisis",
    unlockedDocuments: ["doc-exec-deck"],
  });
  log("舊版 payload 仍可解鎖", json?.unlockDocumentId === "doc-raw-logs", `unlock=${json?.unlockDocumentId}`);
  log("舊版 payload 仍回 mode", json?.mode === "offline-mock" || json?.mode === "live", `mode=${json?.mode}`);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n== ${results.length - failed.length}/${results.length} passed ==`);
if (failed.length) {
  console.log("FAILED:");
  for (const f of failed) console.log(" - " + f.name + (f.extra ? " :: " + f.extra : ""));
  process.exit(1);
}
