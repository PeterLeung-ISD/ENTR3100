import {
  getNpc as getZhNpc,
  getScenario as getZhScenario,
  scenarioCatalog,
} from "./flagshipScenario";
import {
  getNpcEn,
  getScenarioEn,
  npcsEn,
  scenarioCatalogEn,
} from "./flagshipScenarioEn";
import type { Locale } from "@/lib/i18n";
import type { NpcId, NpcProfile, Scenario, ScenarioSummary } from "@/types/simulation";

/** 旗艦任務列表（已依語言挑選）。 */
export function getScenarioCatalog(locale: Locale): ScenarioSummary[] {
  return locale === "en" ? scenarioCatalogEn : scenarioCatalog;
}

/**
 * 英文 NPC 的解鎖關鍵詞同時保留中文觸發詞，
 * 這樣學生用中文提問、介面切到英文時，文件依然解得開。
 */
function withBilingualTriggers(npc: NpcProfile | undefined, fallbackId: NpcId): NpcProfile | undefined {
  if (!npc) return npc;
  const zhNpc = getZhNpc(fallbackId);
  if (!zhNpc) return npc;
  return {
    ...npc,
    unlockTriggerKeywords: Array.from(
      new Set([...(npc.unlockTriggerKeywords ?? []), ...(zhNpc.unlockTriggerKeywords ?? [])]),
    ),
  };
}

export function getNpcById(id: NpcId, locale: Locale): NpcProfile | undefined {
  if (locale !== "en") return getZhNpc(id);
  return withBilingualTriggers(getNpcEn(id), id);
}

export function getScenarioById(id: string, locale: Locale): Scenario | undefined {
  if (locale !== "en") return getZhScenario(id);

  const scenario = getScenarioEn(id);
  if (!scenario) return scenario;

  return {
    ...scenario,
    npcs: scenario.npcs.map((npc) => withBilingualTriggers(npc, npc.id) ?? npc),
  };
}

/** 所有 NPC（英文時附帶中文觸發詞）。 */
export function getAllNpcs(locale: Locale): NpcProfile[] {
  if (locale !== "en") return getZhScenario("nexus-launch-crisis")?.npcs ?? [];
  return npcsEn.map((npc) => withBilingualTriggers(npc, npc.id) ?? npc);
}
