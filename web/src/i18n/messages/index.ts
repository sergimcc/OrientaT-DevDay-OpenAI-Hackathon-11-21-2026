import type { Lang } from "@/i18n/langs";
import { ca } from "./ca";
import { en } from "./en";
import { es, type Messages } from "./es";
import { eu } from "./eu";
import { gl } from "./gl";

export type { Messages };

export const messages: Record<Lang, Messages> = { es, ca, eu, gl, en };
