import { cockpitCopy } from "./cockpit";
import { commonCopy } from "./common";
import { guideCopy } from "./guide";
import { lobbyCopy } from "./lobby";
import { reportCopy } from "./report";
import { rubricCopy } from "./rubric";

export const copy = {
  zh: {
    common: commonCopy.zh,
    lobby: lobbyCopy.zh,
    cockpit: cockpitCopy.zh,
    report: reportCopy.zh,
    rubric: rubricCopy.zh,
    guide: guideCopy.zh,
  },
  en: {
    common: commonCopy.en,
    lobby: lobbyCopy.en,
    cockpit: cockpitCopy.en,
    report: reportCopy.en,
    rubric: rubricCopy.en,
    guide: guideCopy.en,
  },
};

export type Copy = (typeof copy)["zh"];

export { cockpitCopy, commonCopy, guideCopy, lobbyCopy, reportCopy, rubricCopy };
