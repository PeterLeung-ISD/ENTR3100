import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Inter, JetBrains_Mono, Noto_Sans_TC, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/lib/LocaleProvider";
import { LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n";

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-tc",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "NexusSim — High-Pressure Workplace & Critical-Thinking Simulator",
    template: "%s · NexusSim",
  },
  description:
    "NexusSim puts university students inside a live workplace cockpit to practise critical thinking and decision-making under pressure. Available in English and Traditional Chinese.",
  applicationName: "NexusSim",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f8fafc",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);

  return (
    <html
      lang={locale === "en" ? "en" : "zh-Hant"}
      className={`${display.variable} ${sans.variable} ${mono.variable} ${notoSansTC.variable}`}
    >
      <body className="min-h-screen bg-canvas font-sans text-navy antialiased">
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
