/** 大廳（首頁）文案：單一旗艦任務的展示型版面。 */
const zh = {
  nav: {
    missions: "旗艦任務",
    method: "訓練方法",
    framework: "能力框架",
    start: "開始模擬",
    subtitle: "Enterprise Workplace Simulation",
    dimensions: "評估維度說明",
    reset: "重置體驗紀錄",
    resetDone: "已清除本機的模擬紀錄。",
  },
  hero: {
    eyebrow: "Institutional-grade training",
    titleLine1: "在 AI 給出漂亮答案的時代，",
    titleLine2: "訓練你識破數據陷阱與高壓決策的真本事。",
    lead: "NexusSim 把你放進真實的職場駕駛艙：十分鐘倒數、四個各懷立場的同事、一份漂亮得過分的數據簡報。你只有一次簽核機會——",
    leadHighlight: "你會相信 92%，還是去找那份沒人想給你的原始日誌？",
    primaryCta: "立即進入旗艦模擬",
    secondaryCta: "查看評分標準 (Rubric)",
    stats: [
      { value: "10 MIN", label: "高壓決策窗口" },
      { value: "4", label: "資訊不對稱 NPC" },
      { value: "4D", label: "能力雷達評分" },
    ],
    previewSubtitle: "左欄施壓 → 中欄查證 → 右欄簽核",
    preview: {
      window: "nexus-launch-crisis",
      timer: "07:42",
      marcus: "數據這麼漂亮還有什麼好猶豫的？請在 5 分鐘內完成 Sign-off。",
      chloeBadge: "NEW 原始日誌",
      chloe: "外部真實客戶 N=500：滿意度 48%，嚴重幻覺率 41%。",
      lockedDoc: "法務合規備忘錄 · 06:00 解鎖",
      pressure: "壓力指數",
      pressureBand: "62%",
      options: ["立即全量發布", "暫緩並退回重測", "5% 灰度測試"],
      vpPopup: "Sarah（VP）· 限時 45 秒",
    },
  },
  flagship: {
    eyebrow: "Flagship Scenario",
    title: "一個劇本，練到骨子裡",
    lead: "目前全站只開放一個旗艦級深度劇本。它不是選擇題測驗，而是一場十分鐘的真實上線簽核。",
    status: "LIVE · 現正開放",
    telemetry: (minutes: number) => `${minutes} MIN 限時高壓`,
    roleLabel: "你的角色",
    roleValue: "產品營運專員 / Product Operations Associate",
    rubricLabel: "4 個維度，依權重加總",
    cta: "進入戰情室",
    engineLive: "LIVE AI · DeepSeek",
    engineOffline: "OFFLINE DEMO",
    flowLabel: "一場模擬，四個階段",
    flow: [
      {
        step: "01",
        title: "行前導覽",
        copy: "90 秒看懂你的角色、任務目標與計分方式，再進場。",
      },
      {
        step: "02",
        title: "多方對話查證",
        copy: "四位各懷立場的同事、三份互相矛盾的文件；問對問題才解鎖原始日誌。",
      },
      {
        step: "03",
        title: "高壓危機應對",
        copy: "倒數計時、主管催促、副總裁 45 秒突擊，在壓力下交出判斷。",
      },
      {
        step: "04",
        title: "透明 Rubric 升級報告",
        copy: "四維雷達、行為軌跡覆盤，以及下一步該怎麼練。",
      },
    ],
    debriefNote: "結業報告附可執行的升級建議與漏步診斷：哪一步沒做、哪個關鍵問題沒問，都會逐項標出。",
  },
  teaser: "第二波深度劇本開發中：《FinGuard 金融危機公關應變》—— 展示平台可擴充架構。",
  pillars: {
    eyebrow: "Competency Framework",
    title: "四項 AI 取代不了的職場能力",
    lead: "每一項能力都會在模擬中被具體觸發、被系統記錄、並在結業報告中以行為證據覆盤。",
    items: [
      {
        title: "批判性驗證",
        copy: "追問數據從哪裡來、樣本有多大、誰在說話。不接受包裝過的漂亮數字。",
      },
      {
        title: "高壓抗干擾",
        copy: "倒數計時、主管催促、高層突襲。練習在被中斷的情況下仍然交付判斷。",
      },
      {
        title: "資訊交叉比對",
        copy: "同一件事，四個同事四個版本。學會把一手資料和二手摘要對齊。",
      },
      {
        title: "向上溝通",
        copy: "用一句話講清楚最大風險與建議方案，而不是把焦慮傳遞給老闆。",
      },
    ],
  },
  why: {
    eyebrow: "Why NexusSim",
    title: "不只是「看完影片交作業」",
    paragraph1:
      "傳統線上實習（如 Forage）是「看預錄影片 → 下載靜態檔案 → 離線交作業」的非同步模式，無法模擬真實職場的時間壓迫感與資訊混亂度。",
    paragraph2:
      "NexusSim 用即時互動環境重現：主管連環追問、法務突然插單、副總裁限時 45 秒。你的每一個提問、每一份文件、每一次猶豫，都會變成結業報告裡的行為證據。",
    features: [
      { title: "行為埋點追蹤", copy: "是否解鎖原始數據、是否質疑權威、是否準時回應高層。" },
      { title: "DeepSeek 語義分析", copy: "提問品質與決策邏輯的深度評估，自動降級為離線腳本庫。" },
      { title: "邏輯漏洞解析", copy: "結業時公開每份文件裡被埋設的樣本陷阱與合規風險。" },
    ],
    flowEyebrow: "Simulation Flow",
    flow: [
      {
        step: "01",
        title: "進入職場駕駛艙",
        copy: "三欄式工作台：左邊是同事私訊、中間是工作文件、右邊是突發事件與簽核台。",
      },
      {
        step: "02",
        title: "在倒數中追問",
        copy: "向 Chloe 問對問題才能解鎖原始日誌；向 Marcus 質疑會換來更大的壓力。",
      },
      {
        step: "03",
        title: "簽下你的判斷",
        copy: "全量發布、暫緩重測、還是 5% 灰度？決策連同理據一起被評分。",
      },
      {
        step: "04",
        title: "領取能力憑證",
        copy: "四維雷達圖、行為軌跡覆盤、可列印的企業模擬結業憑證。",
      },
    ],
  },
  footer: {
    brand: "NexusSim · AI 時代職場高壓與批判性思考模擬器",
    disclaimer: "此原型為教學示範，劇本與企業均為虛構",
    version: "v0.1",
  },
};

export type LobbyCopy = typeof zh;

const en: LobbyCopy = {
  nav: {
    missions: "Flagship",
    method: "Method",
    framework: "Framework",
    start: "Start simulation",
    subtitle: "Enterprise Workplace Simulation",
    dimensions: "How scoring works",
    reset: "Reset my records",
    resetDone: "Local simulation records cleared.",
  },
  hero: {
    eyebrow: "Institutional-grade training",
    titleLine1: "In an era of polished AI answers,",
    titleLine2: "train the judgement to spot the data trap — and decide under pressure.",
    lead: "NexusSim drops you into a real workplace cockpit: a ten-minute countdown, four colleagues with four agendas, and a deck that looks too good to be true. You get exactly one sign-off —",
    leadHighlight: "will you trust the 92%, or go looking for the raw logs nobody wants to hand you?",
    primaryCta: "Enter the flagship simulation",
    secondaryCta: "View the scoring rubric",
    stats: [
      { value: "10 MIN", label: "Decision window" },
      { value: "4", label: "Asymmetric-information NPCs" },
      { value: "4D", label: "Scored competency radar" },
    ],
    previewSubtitle: "Pressure on the left → evidence in the middle → sign-off on the right",
    preview: {
      window: "nexus-launch-crisis",
      timer: "07:42",
      marcus: "The numbers look great — what's the holdup? I need your sign-off in 5 minutes.",
      chloeBadge: "NEW raw logs",
      chloe: "Real external customers, N=500: 48% satisfaction, 41% severe hallucination rate.",
      lockedDoc: "Legal & compliance memo · unlocks at 06:00",
      pressure: "Pressure index",
      pressureBand: "62%",
      options: ["Ship everything now", "Pause and re-test", "5% canary release"],
      vpPopup: "Sarah (VP) · 45 seconds",
    },
  },
  flagship: {
    eyebrow: "Flagship Scenario",
    title: "One scenario, trained all the way down",
    lead: "Only one flagship deep-dive is live. It isn't a multiple-choice quiz — it's ten real minutes of a launch sign-off.",
    status: "LIVE · Open now",
    telemetry: (minutes: number) => `${minutes} MIN under pressure`,
    roleLabel: "Your role",
    roleValue: "Product Operations Associate / 產品營運專員",
    rubricLabel: "4 dimensions, weighted into your score",
    cta: "Enter the war room",
    engineLive: "LIVE AI · DeepSeek",
    engineOffline: "OFFLINE DEMO",
    flowLabel: "One simulation, four stages",
    flow: [
      {
        step: "01",
        title: "Pre-brief",
        copy: "Ninety seconds to understand your role, the mission and exactly how you're scored.",
      },
      {
        step: "02",
        title: "Multi-source verification",
        copy: "Four colleagues with four agendas, three conflicting documents. Only the right questions unlock the raw logs.",
      },
      {
        step: "03",
        title: "Pressure response",
        copy: "A running clock, a pushing director, a 45-second VP grilling. Deliver your judgement under pressure.",
      },
      {
        step: "04",
        title: "Transparent rubric debrief",
        copy: "A four-axis radar, a behavioural play-by-play, and a concrete plan for your next run.",
      },
    ],
    debriefNote:
      "The debrief ships with actionable level-up coaching and missed-step diagnostics: which step you skipped and which question you never asked are called out one by one.",
  },
  teaser:
    "Second-wave deep scenarios in development: “FinGuard Financial Crisis PR Response” — proof the platform is built to expand.",
  pillars: {
    eyebrow: "Competency Framework",
    title: "Four workplace skills AI can't replace",
    lead: "Every skill is triggered inside the simulation, logged by the engine, and reviewed afterwards with behavioural evidence in your report.",
    items: [
      {
        title: "Critical verification",
        copy: "Ask where the data came from, how big the sample was, and who is talking. Don't accept polished numbers at face value.",
      },
      {
        title: "Pressure resilience",
        copy: "Countdowns, a pushy director, a sudden VP drop-in. Practise delivering a judgement while being interrupted.",
      },
      {
        title: "Cross-referencing",
        copy: "One story, four colleagues, four versions. Learn to line up the primary source against the second-hand summary.",
      },
      {
        title: "Upward communication",
        copy: "Say the biggest risk and your recommendation in one clear message — instead of forwarding your anxiety to the boss.",
      },
    ],
  },
  why: {
    eyebrow: "Why NexusSim",
    title: "Not another “watch the video, submit the file”",
    paragraph1:
      "Traditional online internships (think Forage) are asynchronous: watch a pre-recorded video, download a static file, submit offline. They cannot reproduce the time pressure and information chaos of a real workplace.",
    paragraph2:
      "NexusSim rebuilds it as a live environment: a manager who keeps chasing, legal cutting in unannounced, a VP who gives you 45 seconds. Every question you ask, every document you open, every hesitation becomes behavioural evidence in your report.",
    features: [
      { title: "Behavioural telemetry", copy: "Did you unlock the raw data? Did you challenge authority? Did you answer the VP on time?" },
      { title: "DeepSeek semantic analysis", copy: "Depth-scored evaluation of your questioning and decision logic, with automatic offline fallback." },
      { title: "Flaw analysis", copy: "At the end, every planted sample-size trap and compliance risk is revealed document by document." },
    ],
    flowEyebrow: "Simulation Flow",
    flow: [
      {
        step: "01",
        title: "Enter the cockpit",
        copy: "A three-column workspace: colleagues' DMs on the left, the working documents in the middle, live events and the sign-off desk on the right.",
      },
      {
        step: "02",
        title: "Question against the clock",
        copy: "Only the right questions to Chloe unlock the raw logs; challenging Marcus buys you more pressure instead.",
      },
      {
        step: "03",
        title: "Sign your judgement",
        copy: "Ship everything, pause and re-test, or a 5% canary? The decision is scored together with your rationale.",
      },
      {
        step: "04",
        title: "Collect your credential",
        copy: "A four-axis radar, a behavioural play-by-play review, and a printable enterprise-simulation certificate.",
      },
    ],
  },
  footer: {
    brand: "NexusSim · High-pressure workplace & critical-thinking simulator",
    disclaimer: "Teaching prototype — all scenarios and companies are fictional",
    version: "v0.1",
  },
};

export const lobbyCopy = { zh, en };
