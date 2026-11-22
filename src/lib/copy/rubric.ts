// ---------------------------------------------------------------------------
// 透明評分標準（Rubric）視窗的介面文案：大廳、行前導覽、戰情室頂部、結算報告共用
// ---------------------------------------------------------------------------

const zh = {
  title: "透明評分標準",
  subtitle:
    "四個維度 × 五個等級的行為錨點 —— 動手之前，你就知道 Level 5 需要做到什麼。",
  weightLabel: "權重",
  levelBadge: (level: number) => `Level ${level}`,
  criteriaLabel: "行為標準",
  currentBadge: "你目前在此",
  targetBadge: "最高標準",
  scoreBandsLabel: "等級分數門檻",
  bandLine: (level: number, range: string) => `Level ${level}：${range} 分`,
  scoringNote:
    "分數由「行為埋點規則（客觀）+ 語義分析（主觀）」共同產生：三個行為維度以規則計算，向上溝通力再由語意分析微調。",
  close: "關閉",
  openAria: "查看透明評分標準",
  footerHint: "評分標準在模擬前、中、後都可隨時查閱，結算報告亦會標示你目前所在的等級。",
};

type RubricCopy = typeof zh;

const en: RubricCopy = {
  title: "Transparent scoring rubric",
  subtitle:
    "Four dimensions × five levels of behavioural anchors — you know what Level 5 requires before you start.",
  weightLabel: "Weight",
  levelBadge: (level: number) => `Level ${level}`,
  criteriaLabel: "Behavioural criteria",
  currentBadge: "You are here",
  targetBadge: "Top standard",
  scoreBandsLabel: "Score bands",
  bandLine: (level: number, range: string) => `Level ${level}: ${range} pts`,
  scoringNote:
    "Scores combine behavioural telemetry (objective) with semantic analysis (subjective): three dimensions come from rules, and upward communication is refined by language analysis.",
  close: "Close",
  openAria: "View the transparent scoring rubric",
  footerHint:
    "The rubric is available before, during and after the simulation — the debrief report also highlights the level you reached.",
};

export const rubricCopy = { zh, en };
export type { RubricCopy };
