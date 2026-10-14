import type { Metadata } from "next";
import { connection } from "next/server";
import { Geist_Mono, Manrope, Noto_Sans_Ethiopic } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shell/app-shell";
import { PublicNav } from "@/components/shell/public-nav";
import { Footer } from "@/components/shell/footer";
import { getLocale } from "@/lib/i18n";
import { activeRoomIds, getTodayTips } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", weight: ["500", "600", "700", "800"] });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", weight: ["400", "500", "700"] });
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
  let todayCount = 0;
  if (user) {
    const rooms = await activeRoomIds(user.id);
    todayCount = (await getTodayTips(rooms)).length;
  }
  return (
    <html lang={locale} className={`${manrope.variable} ${mono.variable} ${ethiopic.variable} h-full`}>
      <body data-locale={locale} className="min-h-full flex flex-col">
        {user ? (
          <AppShell locale={locale} user={{ phone: user.phone, isAdmin: user.isAdmin }} todayCount={todayCount}>
            {children}
          </AppShell>
        ) : (
          <>
            <PublicNav locale={locale} />
            <main className="flex-1">{children}</main>
            <Footer locale={locale} />
          </>
        )}
      </body>
    </html>
  );
}
