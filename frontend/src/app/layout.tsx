import "./globals.css";
import React from "react";
import { QueryProvider } from "@/providers/QueryProvider";
import { LanguageProvider } from "@/providers/LanguageProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "Ergon — Платформаи зеҳнии ҷои кор дар Тоҷикистон",
  description: "Ergon - AI-Powered Job Search Platform connecting workers and employers in Tajikistan",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tg" className="dark" suppressHydrationWarning>
      <body className="bg-[#faf8ff] dark:bg-[#020617] text-slate-900 dark:text-slate-100 antialiased selection:bg-[#0052ff] selection:text-white flex flex-col min-h-screen">
        <QueryProvider>
          <LanguageProvider>
            <ThemeProvider>
              <AuthProvider>
                <div className="flex flex-col min-h-screen">
                  <Header />
                  <Sidebar />
                  <div className="flex-1 lg:ml-[320px] transition-all duration-300">
                    <main className="flex-grow min-h-[80vh]">{children}</main>
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
