"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { LOCALES, translations, type Locale } from "../i18n";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (text: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export default function LanguageProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(
    (notify) => {
      window.addEventListener("storage", notify);
      window.addEventListener("sap-language-change", notify);
      return () => {
        window.removeEventListener("storage", notify);
        window.removeEventListener("sap-language-change", notify);
      };
    },
    () => {
      const saved = window.localStorage.getItem("sap-language");
      return LOCALES.includes(saved as Locale) ? (saved as Locale) : "id";
    },
    () => "id",
  );

  function setLocale(nextLocale: Locale) {
    window.localStorage.setItem("sap-language", nextLocale);
    window.dispatchEvent(new Event("sap-language-change"));
    document.documentElement.lang = nextLocale === "pt" ? "pt" : nextLocale;
  }

  return (
    <LanguageContext.Provider
      value={{ locale, setLocale, t: (text) => translations[locale][text] ?? text }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage harus digunakan di dalam LanguageProvider.");
  return context;
}
