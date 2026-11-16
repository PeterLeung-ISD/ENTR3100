/** 大廳（首頁）文案。 */
const zh = {
  nav: {
    missions: "實戰任務",
    method: "訓練方法",
    framework: "能力框架",
    start: "開始模擬",
    subtitle: "Enterprise Workplace Simulation",
    dimensions: "評估維度說明",
    reset: "重置體驗紀錄",
    resetDone: "已清除本機的模擬紀錄。",
    dimensionsClose: "關閉",
    dimensionsNote: "四項維度依權重加總為總分：批判性驗證 35%、向上溝通 25%、高壓抗干擾 20%、資訊交叉比對 20%。",
  },
  dimensions: {
    eyebrow: "How you are scored",
    title: "四個維度，全部由你的行為決定",
    items: [
      {
        title: "批判性驗證 · 35%",
        copy: "是否追問數據來源、樣本量與外部驗證；是否解鎖被藏起來的原始日誌。只看簡報就簽核，此項會被硬性壓到 35 分以下。",
      },
      {
        title: "向上溝通 · 25%",
        copy: "決策理據清楚交代風險、數據依據與建議方案；是否在被拉高的壓力下仍能講清楚。",
      },
      {
        title: "高壓抗干擾 · 20%",
        copy: "倒數計時下是否凜而不亂、是否在時限內回覆 VP 的 45 秒突擊、是否倉促提交。",
      },
      {
        title: "資訊交叉比對 · 20%",
        copy: "是否閱讀多份文件、是否向不同角色交叉查證，而不是只聽一個人的版本。",
      },
    ],
  },
  hero: {
    eyebrow: "Institutional-grade training",
    titleLine1: "在 AI 給出漂亮答案的時代，",
    titleLine2: "訓練你識破數據陷阱與高壓決策的真本事。",
    lead: "NexusSim 把你放進真實的職場駕駛艙：十分鐘倒數、四個各懷立場的同事、一份漂亮得過分的數據簡報。你只有一次簽核機會——",
    leadHighlight: "你會相信 92%，還是去找那份沒人想給你的原始日誌？",
    primaryCta: "進入戰情室",
    secondaryCta: "了解訓練方法",
    stats: [
      { value: "10 MIN", label: "高壓決策窗口" },
      { value: "4", label: "資訊不對稱 NPC" },
      { value: "4D", label: "能力雷達評分" },
    ],
    previewTitle: "War-room preview",
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
  missions: {
    eyebrow: "Enterprise Simulations",
    title: "企業模擬任務",
    lead: "一個旗艦級深度劇本已開放，其餘三個產業任務正在製作中。",
    audience: "適合大專院校商管、資訊與傳播科系",
    duration: "10 MIN",
    open: "OPEN",
    comingSoon: "即將開放",
    enter: "進入戰情室",
    locked: "敬請期待",
    flagshipNote: "旗艦劇本：4 位 AI NPC、3 份工作文件、5 段確定性事件與 45 秒高壓彈窗。",
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
  cta: {
    title: "你只有 10 分鐘，而 92% 可能不是真的。",
    lead: "不需要註冊、不需要登入。所有模擬狀態保存在你的瀏覽器，重新整理或重置即可再挑戰一次。",
    button: "立即進入 NovaTech 上線風暴",
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
    missions: "Missions",
    method: "Method",
    framework: "Framework",
    start: "Start simulation",
    subtitle: "Enterprise Workplace Simulation",
    dimensions: "How scoring works",
    reset: "Reset my records",
    resetDone: "Local simulation records cleared.",
    dimensionsClose: "Close",
    dimensionsNote: "Each dimension is weighted into your total score: critical verification 35%, upward communication 25%, pressure resilience 20%, cross-referencing 20%.",
  },
  dimensions: {
    eyebrow: "How you are scored",
    title: "Four dimensions, all evidence-based",
    items: [
      {
        title: "Critical verification · 35%",
        copy: "Did you question the source, the sample size and the external validation — and unlock the raw logs? Signing off on the deck alone hard-caps this dimension below 35.",
      },
      {
        title: "Upward communication · 25%",
        copy: "Does your rationale state the risk, the data behind it and a recommended path — clearly, even while pressure rises?",
      },
      {
        title: "Pressure resilience · 20%",
        copy: "Do you stay composed against the countdown, answer the VP within 45 seconds, and avoid a rushed sign-off?",
      },
      {
        title: "Cross-referencing · 20%",
        copy: "Do you read more than one document and check the story with more than one colleague instead of trusting a single version?",
      },
    ],
  },
  hero: {
    eyebrow: "Institutional-grade training",
    titleLine1: "In an era of polished AI answers,",
    titleLine2: "train the judgement to spot the data trap — and decide under pressure.",
    lead: "NexusSim drops you into a real workplace cockpit: a ten-minute countdown, four colleagues with four agendas, and a deck that looks too good to be true. You get exactly one sign-off —",
    leadHighlight: "will you trust the 92%, or go looking for the raw logs nobody wants to hand you?",
    primaryCta: "Enter the war room",
    secondaryCta: "See how the training works",
    stats: [
      { value: "10 MIN", label: "Decision window" },
      { value: "4", label: "Asymmetric-information NPCs" },
      { value: "4D", label: "Scored competency radar" },
    ],
    previewTitle: "War-room preview",
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
  missions: {
    eyebrow: "Enterprise Simulations",
    title: "Enterprise missions",
    lead: "One flagship deep-dive scenario is live; three more industry missions are in production.",
    audience: "Built for business, computing and communication students",
    duration: "10 MIN",
    open: "OPEN",
    comingSoon: "COMING SOON",
    enter: "Enter the war room",
    locked: "Coming soon",
    flagshipNote: "Flagship scenario: 4 AI NPCs, 3 working documents, 5 scripted events and a 45-second pressure popup.",
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
  cta: {
    title: "You have 10 minutes, and that 92% might not be real.",
    lead: "No sign-up, no login. Everything is stored in your browser — refresh or reset to take another run.",
    button: "Enter the NovaTech launch crisis",
  },
  footer: {
    brand: "NexusSim · High-pressure workplace & critical-thinking simulator",
    disclaimer: "Teaching prototype — all scenarios and companies are fictional",
    version: "v0.1",
  },
};

export const lobbyCopy = { zh, en };
