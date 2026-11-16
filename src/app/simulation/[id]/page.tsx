import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import Cockpit from "@/components/cockpit/Cockpit";
import { getScenarioById } from "@/data/scenarios";
import { LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const scenario = getScenarioById(id, locale);

  return {
    title: scenario?.summary.title ?? (locale === "en" ? "Simulation" : "模擬進行中"),
    description:
      scenario?.summary.tagline ??
      (locale === "en"
        ? "A ten-minute high-pressure decision simulation."
        : "十分鐘高壓決策模擬。"),
  };
}

export default async function SimulationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const scenario = getScenarioById(id, locale);

  if (!scenario) notFound();

  return <Cockpit scenario={scenario} />;
}
