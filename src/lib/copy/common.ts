/**
 * 共用字串（語言切換器、模式指示燈等跨頁面重複出現的文案）。
 * 每個 section 檔都匯出 `{ zh, en }`，並以 `typeof zh` 約束 en 的結構，
 * 少翻一句就會在 typecheck 時被抓到。
 */
const zh = {
  brandTag: "Workplace Simulator",
  lang: {
    label: "語言",
    zh: "中文",
    en: "EN",
    switchAria: "切換介面語言 / Switch interface language",
  },
  mode: {
    live: "Live AI 已連線",
    liveShort: "LIVE AI",
    offline: "Offline Demo 模式",
    offlineShort: "OFFLINE DEMO",
    detecting: "偵測中",
  },
  docFallback: "附件",
  charUnit: "字",
  minutesUnit: (n: number) => `${n} 分鐘`,
  scoreUnit: "分",
  loading: "載入中…",
};

export type CommonCopy = typeof zh;

const en: CommonCopy = {
  brandTag: "Workplace Simulator",
  lang: {
    label: "Language",
    zh: "中文",
    en: "EN",
    switchAria: "Switch interface language",
  },
  mode: {
    live: "Live AI connected",
    liveShort: "LIVE AI",
    offline: "Offline demo mode",
    offlineShort: "OFFLINE DEMO",
    detecting: "Detecting",
  },
  docFallback: "Attachment",
  charUnit: "chars",
  minutesUnit: (n: number) => `${n} min`,
  scoreUnit: "pts",
  loading: "Loading…",
};

export const commonCopy = { zh, en };
