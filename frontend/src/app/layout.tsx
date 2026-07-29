import "./globals.css";
import React from "react";
import { QueryProvider } from "@/providers/QueryProvider";
import { LanguageProvider } from "@/providers/LanguageProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "Ergon — Платформаи зеҳнии ҷои кор дар Тоҷикистон",
  description: "Ergon - AI-Powered Job Search Platform connecting workers and employers in Tajikistan",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tg" className="dark" suppressHydrationWarning>
      <body className="bg-slate-50 dark:bg-[#070b15] text-slate-900 dark:text-slate-100 antialiased selection:bg-blue-600 selection:text-white min-h-screen">
        <QueryProvider>
          <LanguageProvider>
            <ThemeProvider>
              <AuthProvider>
                <div className="min-h-screen flex flex-col">
                  <Sidebar />
                  <div className="flex-1 md:ml-60 pt-14 md:pt-0 transition-all">
                    <main className="min-h-[85vh] p-4 sm:p-6 lg:p-8">{children}</main>
                    <Footer />
                  </div>
                </div>
              </AuthProvider>
            </ThemeProvider>
          </LanguageProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
