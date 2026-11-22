/** The co-official languages of Spain, plus English. Labels are each language's own name. */
export const LANGS = [
  { code: "es", label: "Castellano", locale: "es-ES" },
  { code: "ca", label: "Català", locale: "ca-ES" },
  { code: "eu", label: "Euskara", locale: "eu-ES" },
  { code: "gl", label: "Galego", locale: "gl-ES" },
  { code: "en", label: "English", locale: "en-GB" },
] as const;

export type Lang = (typeof LANGS)[number]["code"];

export const DEFAULT_LANG: Lang = "es";
const STORAGE_KEY = "asistente-tramites:lang";

const isLang = (v: unknown): v is Lang => LANGS.some((l) => l.code === v);

export const localeOf = (lang: Lang) => LANGS.find((l) => l.code === lang)!.locale;

/** Saved choice first, then the browser's languages (valencià maps to català), then Spanish. */
export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLang(saved)) return saved;
  } catch {
    // Storage can be blocked; fall through to the browser languages.
  }
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.toLowerCase().split("-")[0];
    if (base === "va") return "ca";
    if (isLang(base)) return base;
  }
  return DEFAULT_LANG;
}

export function saveLang(lang: Lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Not persisting is fine.
  }
}
