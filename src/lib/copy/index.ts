import { cockpitCopy } from "./cockpit";
import { commonCopy } from "./common";
import { lobbyCopy } from "./lobby";
import { reportCopy } from "./report";

export const copy = {
  zh: {
    common: commonCopy.zh,
    lobby: lobbyCopy.zh,
    cockpit: cockpitCopy.zh,
    report: reportCopy.zh,
  },
  en: {
    common: commonCopy.en,
    lobby: lobbyCopy.en,
    cockpit: cockpitCopy.en,
    report: reportCopy.en,
  },
};

export type Copy = (typeof copy)["zh"];

export { cockpitCopy, commonCopy, lobbyCopy, reportCopy };
