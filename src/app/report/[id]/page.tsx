import type { Metadata } from "next";
import { cookies } from "next/headers";
import ReportView from "@/components/report/ReportView";
import { LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  return locale === "en"
    ? {
        title: "Decision Debrief",
        description:
          "NexusSim competency assessment, behavioural X-ray and certification for a high-pressure decision simulation.",
      }
    : {
        title: "決策覆盤報告",
        description: "NexusSim 高壓決策模擬的能力評估、行為軌跡覆盤與認證證書。",
      };
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReportView scenarioId={id} />;
}
