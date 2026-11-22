/**
 * Catalogue of common trámites. The links point at the real official portals; summaries and
 * requirements are a simplified guide, so always check the official page before applying.
 *
 * This file holds the language-neutral part (id, link, search keywords). The texts shown to
 * the user live in each language's messages file (`src/i18n/messages/*.ts`, key `tramites`).
 */
import type { Lang } from "@/i18n/langs";
import { messages } from "@/i18n/messages";

export type TramiteId =
  | "nie"
  | "padron"
  | "renta"
  | "paro"
  | "certificado"
  | "clave"
  | "vida-laboral"
  | "carnet";

export type Categoria =
  | "Extranjería"
  | "Impuestos"
  | "Empleo"
  | "Padrón"
  | "Identidad digital"
  | "Seguridad Social"
  | "Tráfico";

/** What a user sees about a trámite, in one language. */
export type FichaTexto = {
  titulo: string;
  organismo: string;
  resumen: string;
  requisitos: string[];
  duracion: string;
  coste: string;
};

type FichaBase = {
  id: TramiteId;
  categoria: Categoria;
  url: string;
  /** Word starts, in every supported language, that point to this trámite. */
  palabrasClave: string[];
};

export type FichaCatalogo = FichaBase & FichaTexto;

const catalogo: FichaBase[] = [
  {
    id: "nie",
    categoria: "Extranjería",
    url: "https://icp.administracionelectronica.gob.es/icpplus/index.html",
    palabrasClave: ["nie", "extranjer", "residencia", "ex-15", "estranger", "residènc", "atzerritar", "estranxeir", "foreigner", "residence"],
  },
  {
    id: "padron",
    categoria: "Padrón",
    url: "https://administracion.gob.es/pag_Home/Tu-espacio-europeo/derechos-obligaciones/ciudadanos/residencia/empadronamiento.html",
    palabrasClave: ["padr", "empadron", "domicili", "ayuntamiento", "ajuntament", "concello", "errold", "udal", "census", "town hall"],
  },
  {
    id: "renta",
    categoria: "Impuestos",
    url: "https://sede.agenciatributaria.gob.es/Sede/Renta.html",
    palabrasClave: [
      "renta", "irpf", "hacienda", "declaraci", "borrador", "impuesto",
      "renda", "hisenda", "esborrany", "impost",
      "errenta", "pfez", "zerga", "zirriborro",
      "facenda",
      "tax", "income tax", "draft",
    ],
  },
  {
    id: "paro",
    categoria: "Empleo",
    url: "https://sede.sepe.gob.es/",
    palabrasClave: ["paro", "desempleo", "sepe", "prestaci", "atur", "desocupaci", "langabezi", "prestazio", "desemprego", "unemploy", "jobless", "lost my job"],
  },
  {
    id: "certificado",
    categoria: "Identidad digital",
    url: "https://www.sede.fnmt.gob.es/certificados/persona-fisica",
    palabrasClave: ["certificado", "firma", "fnmt", "digital", "dixital", "certificat", "signatura", "ziurtagiri", "sinadura", "sinatura", "signature"],
  },
  {
    id: "clave",
    categoria: "Identidad digital",
    url: "https://clave.gob.es/",
    palabrasClave: ["clave", "cl@ve", "pin", "identific", "identifikazio"],
  },
  {
    id: "vida-laboral",
    categoria: "Seguridad Social",
    url: "https://portal.seg-social.gob.es/wps/portal/importass/importass",
    palabrasClave: [
      "vida laboral", "seguridad social", "afiliaci", "cotiza",
      "seguretat social", "cotitza",
      "lan-bizitza", "lan bizitza", "gizarte segurantza", "kotizazio",
      "seguridade social",
      "work history", "employment history", "social security",
    ],
  },
  {
    id: "carnet",
    categoria: "Tráfico",
    url: "https://sede.dgt.gob.es/",
    palabrasClave: ["carnet", "carné", "conduc", "conduir", "dgt", "permiso", "permís", "gidabaimen", "gidatze", "driving", "driver", "licence", "license"],
  },
];

/** The trámite with its texts in `lang`. */
export function ficha(id: TramiteId, lang: Lang): FichaCatalogo {
  const base = catalogo.find((f) => f.id === id)!;
  return { ...base, ...messages[lang].tramites[id] };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** True if `term` appears in `text` at the start of a word (so "atur" doesn't match "natural"). */
const startsWord = (text: string, term: string) =>
  new RegExp(`(^|[^\\p{L}\\p{N}@])${escapeRe(term)}`, "u").test(text);

const LANG_CODES = Object.keys(messages) as Lang[];

/**
 * Finds the trámite a free-text query is about, in any supported language: by keyword, or by
 * its title in any language (follow-ups from the cards quote the title).
 */
export function buscarEnCatalogo(texto: string, lang: Lang): FichaCatalogo | undefined {
  const t = texto.toLowerCase();
  const hit = catalogo.find(
    (f) =>
      f.palabrasClave.some((k) => startsWord(t, k)) ||
      LANG_CODES.some((l) => t.includes(messages[l].tramites[f.id].titulo.toLowerCase()))
  );
  return hit && ficha(hit.id, lang);
}
