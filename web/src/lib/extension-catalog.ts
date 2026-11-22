import { RAW_PLUGINS } from "../../../plugins/index";
import type { Lang } from "@/i18n/langs";
import { messages } from "@/i18n/messages";

/**
 * What the browser extension can guide, read straight from its site maps (plugins/*.json at the
 * repo root, the same files the extension loads). Add a map there and the web knows about it.
 * Types mirror the parts of src/plugins/schema.ts the web uses.
 */
export type LoginMethod =
  | "clave"
  | "clave_pin"
  | "clave_permanente"
  | "certificado"
  | "dnie"
  | "referencia"
  | "sms"
  | "sin_identificacion";

export type MapStep = { title: string; url?: string; guidance: string; person_does?: string };

export type MapProcedure = {
  id: string;
  title: string;
  summary: string;
  keywords: string[];
  entry_url: string;
  login: LoginMethod[];
  steps: MapStep[];
  you_need?: string[];
};

export type SiteMap = {
  id: string;
  name: string;
  authority: string;
  status: "verified" | "draft";
  domains: string[];
  home: string;
  procedures: MapProcedure[];
};

export const siteMaps = RAW_PLUGINS as SiteMap[];

/**
 * Extra keywords in ca/eu/gl/en, kept on the web side so the shared site maps stay as they are.
 * The maps' own keywords are in Spanish. Matching ignores accents and needs every word present.
 */
const extraKeywords: Record<string, string[]> = {
  "pedir-cita": [
    "renovar dni", "passaport", "renovar passaport", "cita passaport",
    "nana berritu", "nan berritu", "nan hitzordua", "pasaportea",
    "renew dni", "dni appointment", "renew passport", "passport",
  ],
  "consultar-anular": ["cancel dni appointment", "change dni appointment", "nan hitzordua ezeztatu"],
  requisitos: ["dni requirements", "what to bring dni", "dni photo", "passport requirements", "nan baldintzak"],
  "alquiler-asequible": [
    "lloguer assequible", "habitatge assequible",
    "aluguer asequible", "aluguer accesible", "vivenda asequible",
    "alokairu eskuragarri", "alokairu eskuragarria", "etxebizitza eskuragarri",
    "affordable rent", "affordable housing", "social housing",
  ],
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9@ ]/g, " ");

/**
 * The procedure whose keywords best match `text`. A keyword matches when all its words appear in the
 * text, so "búscame cita para el dni" matches "cita dni"; longer keywords win.
 */
export function findProcedure(text: string): { site: SiteMap; procedure: MapProcedure } | undefined {
  const words = new Set(norm(text).split(/\s+/).filter(Boolean));
  let best: { site: SiteMap; procedure: MapProcedure; score: number } | undefined;
  for (const site of siteMaps) {
    for (const procedure of site.procedures) {
      for (const k of [...procedure.keywords, procedure.title, ...(extraKeywords[procedure.id] ?? [])]) {
        const kw = norm(k).split(/\s+/).filter((w) => w.length > 1);
        if (kw.length && kw.every((w) => words.has(w)) && (!best || kw.length > best.score)) {
          best = { site, procedure, score: kw.length };
        }
      }
    }
  }
  return best && { site: best.site, procedure: best.procedure };
}

/** The plan the web shows for doing a procedure with the extension. */
export type ExtensionPlan = {
  sitio: string;
  organismo: string;
  borrador: boolean;
  tramite: string;
  resumen: string;
  url: string;
  acceso: string[];
  necesitas: string[];
  pasos: { titulo: string; extension: string; tu: string | null }[];
  frase: string;
  /** Which site map procedure this is, so the extension can open it directly. */
  mapa: { plugin: string; id: string };
};

/** The maps are in Spanish; the texts the web adds around them follow `lang`. */
export function planFor(site: SiteMap, p: MapProcedure, lang: Lang = "es"): ExtensionPlan {
  const x = messages[lang].extensionPlan;
  return {
    sitio: site.name,
    organismo: site.authority,
    borrador: site.status === "draft",
    tramite: p.title,
    resumen: p.summary,
    url: p.entry_url,
    acceso: p.login.map((l) => x.login[l]),
    necesitas: p.you_need ?? [],
    pasos: p.steps.map((s) => ({
      titulo: s.title,
      // The map's guidance is written for the assistant; the person gets what that means for them.
      extension: s.person_does ? x.stepPerson : x.stepAuto,
      tu: s.person_does ?? null,
    })),
    frase: p.title,
    mapa: { plugin: site.id, id: p.id },
  };
}

/** Every procedure the extension knows, for the "what it can do" list. */
export const extensionProcedures = siteMaps.flatMap((site) =>
  site.procedures.map((procedure) => ({ site, procedure }))
);
