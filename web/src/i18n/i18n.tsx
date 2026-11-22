import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { detectLang, localeOf, saveLang, type Lang } from "@/i18n/langs";
import { messages, type Messages } from "@/i18n/messages";

type I18n = { lang: Lang; locale: string; t: Messages; setLang: (lang: Lang) => void };

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = messages[lang].meta.title;
  }, [lang]);

  const value = useMemo<I18n>(
    () => ({
      lang,
      locale: localeOf(lang),
      t: messages[lang],
      setLang: (next) => {
        saveLang(next);
        setLangState(next);
      },
    }),
    [lang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
