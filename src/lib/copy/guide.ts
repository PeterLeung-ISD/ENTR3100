// ---------------------------------------------------------------------------
// 行前分步導覽（PreSimGuideModal）介面文案
// ---------------------------------------------------------------------------

const zh = {
  reopen: "操作導覽",
  pausedBanner: "倒數計時暫停中 · 看完再開始",
  eyebrow: "行前導覽",
  title: "用 1 分鐘看懂這場戰情室",
  subtitle:
    "真正的 10 分鐘倒數，會在你按下「開始」的那一刻才啟動。先看清楚你的角色、三欄介面與建議節奏。",
  stepLabel: (current: number, total: number) => `步驟 ${current} / ${total}`,
  openBrief: "展開完整任務簡報",
  rosterLabel: "你的同事",
  back: "上一步",
  next: "下一步",
  start: "開始 10 分鐘高壓模擬 →",
  skip: "跳過導覽直接開始",
  viewRubric: "查看完整評分標準 (Rubric)",
  closeAria: "關閉行前導覽",
  close: "關閉",
  step1: {
    title: "你的職場角色與任務目標",
    kicker: "NovaTech 產品營運專員",
    body: [
      "今天是 NovaTech 新 AI 功能 NovaAssist 2.0 的上線日。增長總監 Marcus 拿著一份「92% 滿意度」的簡報，要你在 10 分鐘內完成上線簽核 —— 董事會正在等。",
      "你手上只有簡報、一個內部聊天室，以及三位同事與一位副總裁。時間是壓力，也是你的掩護：你只有一次簽核機會。",
    ],
    callout:
      "核心心法：不要盲目相信單一來源的漂亮數據。主動查證，才是這場模擬真正的評分重點。",
  },
  step2: {
    title: "戰情室三欄介面功能圖解",
    kicker: "左 · 中 · 右",
    columns: [
      {
        tag: "左欄",
        title: "即時通訊頻道",
        body: "與 4 位 AI 同事對話：增長總監、數據分析師、法務顧問與副總裁。",
        use: "主動追問數據來源、釐清立場，套出被藏起來的機密文件。",
      },
      {
        tag: "中欄",
        title: "機密工作文件與報表",
        body: "檢視上線簡報、原始測試日誌與法務備忘錄。",
        use: "交叉比對表面指標與底層原始數據之間的矛盾。",
      },
      {
        tag: "右欄",
        title: "危機動態與最終簽核台",
        body: "追蹤突發高壓事件，並在倒數結束前完成最終決策。",
        use: "寫下具體理據，說明你為什麼這樣決定。",
      },
    ],
  },
  step3: {
    title: "建議實戰流程與評分預告",
    kicker: "4 步節奏",
    flow: [
      { step: "1", title: "先讀簡報找疑點", body: "看懂對方想讓你相信什麼，記下所有「太漂亮」的數字。" },
      { step: "2", title: "向相關同事追問一手數據", body: "樣本多大？來源是內部還是外部客戶？有沒有被藏起來的報告？" },
      { step: "3", title: "應對突發高壓干擾並評估合規風險", body: "副總裁會在最後階段突襲；法務的免責條款決定風險上限。" },
      { step: "4", title: "結合數據提交決策理據", body: "選擇上線方案，並用具體數字與替代方案支撐你的判斷。" },
    ],
    rubricNote:
      "結算報告會逐維度告訴你是否達到目標等級、還差什麼、以及遺漏了哪些關鍵步驟。",
  },
};

type GuideCopy = typeof zh;

const en: GuideCopy = {
  reopen: "How it works",
  pausedBanner: "Countdown paused · take your time",
  eyebrow: "Pre-simulation guide",
  title: "Understand this war room in one minute",
  subtitle:
    "The real 10-minute countdown starts only when you press Start. First, learn your role, the three panes and the recommended rhythm.",
  stepLabel: (current: number, total: number) => `Step ${current} / ${total}`,
  openBrief: "Open the full mission brief",
  rosterLabel: "Your colleagues",
  back: "Back",
  next: "Next",
  start: "Start the 10-minute simulation →",
  skip: "Skip the guide and start",
  viewRubric: "View the full scoring rubric",
  closeAria: "Close the pre-simulation guide",
  close: "Close",
  step1: {
    title: "Your role and your objective",
    kicker: "Product Operations Associate, NovaTech",
    body: [
      "It is launch day for NovaAssist 2.0, NovaTech's new AI feature. Growth Director Marcus is holding a deck claiming 92% satisfaction and wants your sign-off within 10 minutes — the board is waiting.",
      "All you have is the deck, one internal chat, three colleagues and a VP. Time is the pressure, and you only get one sign-off.",
    ],
    callout:
      "Core principle: never trust a flattering number from a single source. Verification is what this simulation actually scores.",
  },
  step2: {
    title: "Your three-pane war room",
    kicker: "Left · Middle · Right",
    columns: [
      {
        tag: "Left",
        title: "Live chat channels",
        body: "Talk to four AI colleagues: growth, data, legal and the VP.",
        use: "Question the data source, test each stance, and coax out hidden classified files.",
      },
      {
        tag: "Middle",
        title: "Classified documents & reports",
        body: "Read the launch deck, the raw test logs and the legal memo.",
        use: "Cross-check the headline metrics against the underlying raw data.",
      },
      {
        tag: "Right",
        title: "Crisis feed & final sign-off",
        body: "Track urgent events and submit your final decision before the clock runs out.",
        use: "Write a concrete rationale explaining why you decided this way.",
      },
    ],
  },
  step3: {
    title: "Recommended rhythm and scoring preview",
    kicker: "Four moves",
    flow: [
      { step: "1", title: "Read the deck for red flags", body: "Notice what they want you to believe, and write down every number that looks too good." },
      { step: "2", title: "Chase primary data from the right colleague", body: "How big is the sample? Internal or external users? Is a report being hidden?" },
      { step: "3", title: "Handle the pressure drop-in and size the compliance risk", body: "The VP ambushes you late; the legal memo sets your downside." },
      { step: "4", title: "Submit a decision backed by data", body: "Pick a launch path and support it with concrete numbers and an alternative plan." },
    ],
    rubricNote:
      "The debrief report shows, dimension by dimension, whether you reached the target level, what is missing, and which key steps you skipped.",
  },
};

export const guideCopy = { zh, en };
export type { GuideCopy };
