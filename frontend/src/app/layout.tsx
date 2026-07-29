import "./globals.css";
import React from "react";
import { QueryProvider } from "@/providers/QueryProvider";
import { LanguageProvider } from "@/providers/LanguageProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "Ergon — Платформаи зеҳнии ҷои кор дар Тоҷикистон",
  description: "Ergon - AI-Powered Job Search Platform connecting workers and employers in Tajikistan",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tg" className="dark" suppressHydrationWarning>
      <body className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-indigo-500 selection:text-white flex flex-col min-h-screen">
        <QueryProvider>
          <LanguageProvider>
            <ThemeProvider>
              <AuthProvider>
                <Header />
                <main className="flex-grow">{children}</main>
                <Footer />
              </AuthProvider>
            </ThemeProvider>
          </LanguageProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
