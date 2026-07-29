"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import tg from "@/messages/tg.json";
import ru from "@/messages/ru.json";
import en from "@/messages/en.json";

export type Language = "tg" | "ru" | "en";

const translations: Record<Language, any> = { tg, ru, en };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (keyPath: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>("tg");

  useEffect(() => {
    const saved = localStorage.getItem("ergon_lang") as Language;
    if (saved && (saved === "tg" || saved === "ru" || saved === "en")) {
      setLanguageState(saved);
    } else {
      setLanguageState("tg");
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("ergon_lang", lang);
  };

  const t = (keyPath: string): string => {
    const keys = keyPath.split(".");
    let current = translations[language];
    for (const k of keys) {
      if (current && current[k] !== undefined) {
        current = current[k];
      } else {
        let fallback = translations["tg"];
        for (const fk of keys) {
          if (fallback && fallback[fk] !== undefined) {
            fallback = fallback[fk];
          } else {
            return keyPath;
          }
        }
        return typeof fallback === "string" ? fallback : keyPath;
      }
    }
    return typeof current === "string" ? current : keyPath;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
};
