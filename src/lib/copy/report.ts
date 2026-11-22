/**
 * 結業報告 / 證書文案。只放介面 chrome。
 *
 * 評估內容（executiveFeedback、strengths、blindSpots、xray[].title/detail、
 * trapAnalysis[].trap/lesson、candidateName、verificationId、generatedAt）由評估引擎
 * 依語言產生，一律直接渲染，不在這裡翻譯。
 *
 * `zh` 是型別來源；`en` 必須完全對齊（`ReportCopy` 會強制檢查）。
 */
const zh = {
  header: {
    breadcrumb: "決策覆盤報告",
  },
  actions: {
    backToLobby: "返回任務大廳",
    retry: "重新挑戰此劇本",
    print: "下載 / 列印結業憑證（PDF）",
    backAria: "返回任務大廳",
    retryAria: "重新挑戰此劇本，會先清除本機成績",
    printAria: "下載或列印結業憑證（A4 橫向 PDF）",
  },
  dashboard: {
    gradeLabel: "整體評級",
    scoreUnit: "/ 100",
    radarScale: "0 – 100",
  },
  hero: {
    greeting: (name: string) => `${name}，這是你的決策覆盤`,
    modeLive: "LIVE AI 評估",
    modeOffline: "離線模擬評估",
    regeneratingHint: "重新生成評語中…",
  },
  grade: {
    S: "卓越",
    A: "優秀",
    B: "合格",
    C: "待強化",
    sealSuffix: "等級",
  },
  metrics: {
    score: "總分",
    elapsed: (minutes: string, seconds: string) => `${minutes} 分 ${seconds} 秒完成`,
    messagesBefore: "往來訊息",
    messagesAfter: "則",
    verificationId: "認證編號",
    decision: "最終決策",
    rawLogs: "原始數據",
    rawLogsYes: "已取得並納入判斷",
    rawLogsNo: "未取得",
    vp: "VP 限時回覆",
    vpOnTime: "45 秒內回覆",
    vpLate: "未在時限內回覆",
    vpNone: "未觸發",
    challenge: "質疑主管數據",
    challengeYes: "有，並要求佐證",
    challengeNo: "未提出質疑",
  },
  radar: {
    title: "四大核心能力",
    score: "得分",
    seriesName: "能力分數",
    focusPrefix: "評估面向：",
  },
  dimensions: {
    criticalVerification: "批判性驗證",
    pressureResilience: "高壓抗干擾",
    crossReferencing: "資訊交叉比對",
    upwardCommunication: "向上溝通力",
    /** 證書迷你統計用的短標籤（四欄排版）。 */
    compact: {
      criticalVerification: "批判性驗證",
      pressureResilience: "高壓抗干擾",
      crossReferencing: "交叉比對",
      upwardCommunication: "向上溝通",
    },
    /** 雷達下方長條圖的「評估面向」描述。 */
    focus: {
      criticalVerification: "查證假設",
      pressureResilience: "時間壓力",
      crossReferencing: "多方比對",
      upwardCommunication: "書面交代",
    },
  },
  xray: {
    title: "Critical Thinking X-Ray",
    badge: "行為軌跡",
    status: {
      pass: "已達成",
      warn: "待注意",
      fail: "未達成",
    },
    strengthLabel: "優勢行為",
    blindSpotLabel: "待改善行為",
  },
  strengths: {
    title: "做對的事",
    blindSpots: "盲點與下一步",
  },
  traps: {
    title: "埋設陷阱全解析",
    subtitle: "文件 / 主管 / 時間壓力三個層次的漏洞",
    badge: "陷阱",
    lesson: "教學重點",
  },
  /** 教授回饋 1：逐維度升等路線圖 */
  coaching: {
    title: "如何從目前等級更進一步",
    subtitle: "四個能力維度的升等路線圖：先看系統觀察到的行為證據，再照著下一級的做法調整。",
    scoreLabel: "目前得分",
    levelLabel: (level: number) => `Level ${level} / 5`,
    levelProgressAria: (level: number) => `已達 5 個等級中的第 ${level} 級`,
    evidenceLabel: "系統觀察到的證據",
    nextLevelLabel: (next: number) => `升至 Level ${next} 的關鍵做法`,
    topLevelLabel: "已達 Level 5 · 維持頂標的做法",
  },
  /** 教授回饋 2：遺漏的關鍵步驟與盲點 */
  missed: {
    title: "途中遺漏的關鍵步驟與盲點",
    subtitle: "標準查證流程中沒有被執行到的環節；每一項都附上下次可以直接照做的修正。",
    badge: (count: number) => `${count} 項待補`,
    whyLabel: "為什麼重要",
    fixLabel: "下次這樣做",
    category: {
      verification: "資料查證",
      stakeholder: "利害關係人",
      risk_control: "風險控制",
      communication: "對上溝通",
    },
    zeroTitle: "零關鍵遺漏 — 完整執行標準查證流程",
    zeroBody: "沒有漏掉任何關鍵環節：查證、跨部門確認與風險控管都在時限內完成。",
    zeroHint: "把這次的流程寫成一頁檢查清單，下次可以直接複製使用。",
  },
  /** 教授回饋 3：透明評分標準對照表（權重／等級徽章沿用 c.rubric） */
  rubricMatrix: {
    title: "透明評分標準對照表",
    subtitle: "4 個維度 × 5 個等級的行為標準；你的目前等級已標示，Level 5 就是最高標準。",
    expand: "展開完整對照表",
    collapse: "收起對照表",
    openModal: "查看完整評分標準",
    bandsLabel: "等級門檻",
    colLevel: "等級",
    colRange: "分數區間",
    colCriteria: "行為標準",
    dimensionAria: (title: string) => `${title}的等級對照`,
  },
  certificate: {
    sectionTitle: "能力認證證書",
    editHint: "姓名可直接在證書上修改",
    headerLine: (company: string) => `${company.toUpperCase()} × NEXUSSIM WORKPLACE SIMULATION`,
    title: "高 壓 決 策 能 力 認 證",
    subtitle: "高壓下的批判性思考能力認證",
    certifies: "茲證明",
    nameLabel: "受測者姓名",
    namePlaceholder: "學員姓名（點擊編輯）",
    nameEditAria: "點擊編輯學員姓名",
    nameHint: "姓名可點擊直接修改（模擬註冊名稱）",
    certNo: "認證編號",
    completedOn: "完成日期",
    signatureRole: "增長與營運總監",
    badges: {
      verification: "批判性數據驗證",
      crisis: "高壓危機決策",
    },
    bodyBefore: "已完成",
    bodyAfter:
      "沉浸式高壓決策模擬，在 10 分鐘限時、主管施壓與資訊不對稱的條件下完成最終上線簽核，並取得整體表現評級",
    gradeCopy: {
      S: "卓越 · Outstanding",
      A: "優秀 · Proficient",
      B: "合格 · Developing",
      C: "待強化 · Needs Practice",
    },
    gradeLabel: "等級",
    engineNote: "由 NexusSim 評估引擎（行為軌跡 60% · 語義 40%）產生",
    verify: "驗證方式：於 nexussim.app/verify 輸入上方編號",
    fineprint: "本證書由模擬系統自動產生，僅供能力展示與練習回饋使用",
  },
  empty: {
    loading: "載入評估報告…",
    title: "尚未找到這場模擬的成績",
    body: "成績儲存在此瀏覽器的本機空間。若你剛完成模擬，請確認使用的是同一個瀏覽器與裝置；否則請重新進行一次 10 分鐘模擬。",
    backToLobby: "返回任務大廳",
    start: "開始模擬",
  },
  print: {
    certificate: "列印此證書（A4 橫向）",
  },
  footer: {
    ctaTitle: "想再挑戰一次，或用不同策略重跑？",
    ctaBody: "每次重試都會清除本機成績；建議先列印或儲存這份報告。",
    backToLobby: "返回大廳",
    retry: "再挑戰一次",
    disclaimer: "NexusSim · 成績僅儲存於本機瀏覽器（localStorage），不會上傳至伺服器。",
  },
};

export type ReportCopy = typeof zh;

const en: ReportCopy = {
  header: {
    breadcrumb: "Decision review report",
  },
  actions: {
    backToLobby: "Back to mission lobby",
    retry: "Retry this scenario",
    print: "Download / print certificate (PDF)",
    backAria: "Back to mission lobby",
    retryAria: "Retry this scenario — clears the score stored in this browser",
    printAria: "Download or print the certificate (A4 landscape PDF)",
  },
  dashboard: {
    gradeLabel: "Overall grade",
    scoreUnit: "/ 100",
    radarScale: "0 – 100",
  },
  hero: {
    greeting: (name: string) => `${name}, here is your decision review`,
    modeLive: "LIVE AI EVALUATION",
    modeOffline: "OFFLINE MOCK EVALUATION",
    regeneratingHint: "Regenerating assessment…",
  },
  grade: {
    S: "Outstanding",
    A: "Proficient",
    B: "Developing",
    C: "Needs practice",
    sealSuffix: "",
  },
  metrics: {
    score: "Overall score",
    elapsed: (minutes: string, seconds: string) => `completed in ${minutes}m ${seconds}s`,
    messagesBefore: "",
    messagesAfter: "messages exchanged",
    verificationId: "Verification ID",
    decision: "Final decision",
    rawLogs: "Raw data",
    rawLogsYes: "Retrieved and used",
    rawLogsNo: "Not retrieved",
    vp: "VP response window",
    vpOnTime: "Replied within 45s",
    vpLate: "Missed the deadline",
    vpNone: "Not triggered",
    challenge: "Challenged the manager's data",
    challengeYes: "Yes, and asked for evidence",
    challengeNo: "No challenge raised",
  },
  radar: {
    title: "Four core competencies",
    score: "Score",
    seriesName: "Competency score",
    focusPrefix: "Focus: ",
  },
  dimensions: {
    criticalVerification: "Critical verification",
    pressureResilience: "Pressure resilience",
    crossReferencing: "Cross-referencing",
    upwardCommunication: "Upward communication",
    compact: {
      criticalVerification: "Verification",
      pressureResilience: "Resilience",
      crossReferencing: "Cross-ref.",
      upwardCommunication: "Upward comms",
    },
    focus: {
      criticalVerification: "Questioning assumptions",
      pressureResilience: "Time pressure",
      crossReferencing: "Multi-source checks",
      upwardCommunication: "Written sign-off",
    },
  },
  xray: {
    title: "Critical Thinking X-Ray",
    badge: "Behavior trace",
    status: {
      pass: "Achieved",
      warn: "Needs attention",
      fail: "Missed",
    },
    strengthLabel: "Strength",
    blindSpotLabel: "Blind spot",
  },
  strengths: {
    title: "What you did well",
    blindSpots: "Blind spots & next steps",
  },
  traps: {
    title: "Every planted trap, explained",
    subtitle: "Flaws at three levels: document, manager, time pressure",
    badge: "Trap",
    lesson: "Lesson",
  },
  /** Professor feedback 1: per-dimension level-up roadmap */
  coaching: {
    title: "How to move up from your current level",
    subtitle:
      "A level-up roadmap for all four dimensions: start from the behaviour the system observed, then apply the next level's moves.",
    scoreLabel: "Current score",
    levelLabel: (level: number) => `Level ${level} / 5`,
    levelProgressAria: (level: number) => `Level ${level} of 5 reached`,
    evidenceLabel: "What the system observed",
    nextLevelLabel: (next: number) => `Key move to reach Level ${next}`,
    topLevelLabel: "Already at Level 5 — how to hold the top standard",
  },
  /** Professor feedback 2: missed steps */
  missed: {
    title: "Missed steps & considerations",
    subtitle:
      "Gaps in the standard verification workflow — each one comes with a fix you can apply on the next run.",
    badge: (count: number) => `${count} to close`,
    whyLabel: "Why it matters",
    fixLabel: "Do this next time",
    category: {
      verification: "Data verification",
      stakeholder: "Stakeholders",
      risk_control: "Risk control",
      communication: "Upward comms",
    },
    zeroTitle: "No critical steps missed — full standard workflow completed",
    zeroBody:
      "Nothing critical was skipped: verification, cross-team confirmation and risk control all happened inside the time limit.",
    zeroHint: "Turn this run into a one-page checklist you can reuse next time.",
  },
  /** Professor feedback 3: rubric matrix (weight / level badges reuse c.rubric) */
  rubricMatrix: {
    title: "Transparent rubric matrix",
    subtitle:
      "Four dimensions × five levels of behavioural standards — your current level is marked, and Level 5 is the top standard.",
    expand: "Expand the full matrix",
    collapse: "Collapse the matrix",
    openModal: "Open the full rubric",
    bandsLabel: "Level bands",
    colLevel: "Level",
    colRange: "Score range",
    colCriteria: "Behaviour standard",
    dimensionAria: (title: string) => `${title} level matrix`,
  },
  certificate: {
    sectionTitle: "Competency certificate",
    editHint: "Edit the name directly on the certificate",
    headerLine: (company: string) => `${company.toUpperCase()} × NEXUSSIM WORKPLACE SIMULATION`,
    title: "DECISION-MAKING UNDER PRESSURE",
    subtitle: "Certificate of Critical Thinking under Pressure",
    certifies: "This certifies that",
    nameLabel: "Candidate name",
    namePlaceholder: "Student name (click to edit)",
    nameEditAria: "Click to edit the student name",
    nameHint: "Click the name to edit it (registered name for this simulation)",
    certNo: "Verification ID",
    completedOn: "Completed",
    signatureRole: "Director of Growth & Operations",
    badges: {
      verification: "Critical data verification",
      crisis: "High-pressure crisis decisions",
    },
    bodyBefore: "has completed",
    bodyAfter:
      "— an immersive high-pressure decision simulation run against a 10-minute limit, executive pressure and asymmetric information, ending in a final launch sign-off and an overall performance rating.",
    gradeCopy: {
      S: "Outstanding",
      A: "Proficient",
      B: "Developing",
      C: "Needs Practice",
    },
    gradeLabel: "Grade",
    engineNote: "Generated by the NexusSim assessment engine (60% behavior trace · 40% semantic)",
    verify: "Verify: enter the number above at nexussim.app/verify",
    fineprint: "Auto-generated by the simulation system; for capability demonstration and practice feedback only.",
  },
  empty: {
    loading: "Loading evaluation report…",
    title: "No score found for this simulation",
    body: "Scores are stored locally in this browser. If you just finished the simulation, make sure you are on the same browser and device; otherwise run the 10-minute simulation again.",
    backToLobby: "Back to mission lobby",
    start: "Start simulation",
  },
  print: {
    certificate: "Print this certificate (A4 landscape)",
  },
  footer: {
    ctaTitle: "Want another run, or a different strategy?",
    ctaBody: "Each retry clears the score stored locally — print or save this report first.",
    backToLobby: "Back to lobby",
    retry: "Try again",
    disclaimer: "NexusSim · Scores are stored only in this browser (localStorage) and are never uploaded.",
  },
};

export const reportCopy = { zh, en };
