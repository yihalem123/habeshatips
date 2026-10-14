import type { Metadata } from "next";
import { connection } from "next/server";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono, Noto_Sans_Ethiopic } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { getLocale } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/session";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600", "700"] });
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500", "600"] });
const ethiopic = Noto_Sans_Ethiopic({ subsets: ["ethiopic"], variable: "--font-ethiopic", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "HabeshaTips", template: "%s · HabeshaTips" },
  description: "Soccer tips from six AI strategy rooms. Every tip timestamped before kickoff and settled in public.",
};

// Every page is personalised (locale cookie, session), so the shell renders per request.
export const instant = false;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const [locale, user] = await Promise.all([getLocale(), getCurrentUser()]);
  return (
    <html lang={locale} className={`${display.variable} ${sans.variable} ${mono.variable} ${ethiopic.variable} h-full`}>
      <body data-locale={locale} className="min-h-full flex flex-col">
        <Nav locale={locale} user={user ? { id: user.id, isAdmin: user.isAdmin } : null} />
        <main className="flex-1">{children}</main>
        <Footer locale={locale} />
      </body>
    </html>
  );
}
