import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";
import { buscarEnCatalogo, type FichaCatalogo } from "@/data/tramites";
import type { Lang } from "@/i18n/langs";
import { messages } from "@/i18n/messages";
import { extensionProcedures, findProcedure, planFor } from "@/lib/extension-catalog";

/**
 * A local stand-in for the model. It speaks the AI SDK UI-message stream protocol
 * (reasoning, tool calls, text, sources), so `useChat` and the AI Elements render it
 * exactly as they would a real model. To go live, swap it for:
 *
 *   new DefaultChatTransport({ api: "/api/chat" })
 *
 * with a server route that returns `streamText(...).toUIMessageStreamResponse()`.
 */
export class MockTramitesTransport implements ChatTransport<UIMessage> {
  private lang: Lang = "es";

  /** Language of the next replies. The app keeps it in sync with the header's language picker. */
  setLang(lang: Lang) {
    this.lang = lang;
  }

  async sendMessages({
    messages,
    abortSignal,
  }: Parameters<ChatTransport<UIMessage>["sendMessages"]>[0]) {
    const last = messages.at(-1);
    const text =
      last?.parts
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join(" ") ?? "";
    return stream(responder(text, this.lang), abortSignal);
  }

  async reconnectToStream() {
    return null;
  }
}

type Step =
  | { kind: "reasoning"; text: string }
  | { kind: "tool"; name: string; input: unknown; output: unknown; ms?: number }
  | { kind: "text"; text: string }
  | { kind: "sources"; items: { url: string; title: string }[] };

// Intent keywords in every supported language (es, ca, eu, gl, en): the user may type in any of them.
const EXTENSION = /(extensi|plugin|complement|panel lateral|luzapen|hedapen|gehigarri)/;
const ESTADO =
  /(estado|cómo va|como va|mis trámites|mis tramites|expedient|\bestat\b|com van|els meus tràmits|egoera|nire izapide|espediente|os meus trámites|\bstatus\b|my procedures|my applications)/;

function responder(input: string, lang: Lang): Step[] {
  const t = input.toLowerCase();
  const r = messages[lang].replies;

  // A trámite the extension has a site map for: show how to do it with the extension.
  const enMapa = findProcedure(input);
  if (enMapa) {
    const plan = planFor(enMapa.site, enMapa.procedure, lang);
    return [
      { kind: "reasoning", text: r.planReasoning(plan.sitio, plan.tramite, plan.pasos.length) },
      { kind: "tool", name: "plan_extension", input: { sitio: enMapa.site.id, tramite: enMapa.procedure.id }, output: plan, ms: 900 },
      { kind: "text", text: r.planText },
      { kind: "sources", items: [{ url: plan.url, title: r.planSource(plan.sitio) }] },
    ];
  }

  if (EXTENSION.test(t)) {
    return [
      { kind: "reasoning", text: r.extensionReasoning },
      {
        kind: "tool",
        name: "explicar_extension",
        input: {},
        output: {
          tramites: extensionProcedures.map(({ site, procedure }) => ({ titulo: procedure.title, sitio: site.name })),
        },
        ms: 600,
      },
      { kind: "text", text: r.extension },
    ];
  }

  // Public site: there is no session, so status questions go to Carpeta Ciudadana.
  if (ESTADO.test(t)) {
    return [
      { kind: "text", text: r.estado },
      { kind: "sources", items: [{ url: "https://carpetaciudadana.gob.es/", title: r.estadoSource }] },
    ];
  }

  const ficha = buscarEnCatalogo(t, lang);
  if (ficha) return tramiteSteps(ficha, lang);

  return [{ kind: "text", text: r.fallback }];
}

function tramiteSteps(f: FichaCatalogo, lang: Lang): Step[] {
  const r = messages[lang].replies;
  return [
    { kind: "reasoning", text: r.tramiteReasoning(f.titulo, f.organismo) },
    { kind: "tool", name: "buscar_tramite", input: { consulta: f.titulo }, output: f, ms: 1100 },
    { kind: "text", text: r.tramiteText(f) },
    { kind: "sources", items: [{ url: f.url, title: r.tramiteSource(f.organismo) }] },
  ];
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

let seq = 0;
const nextId = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

function stream(steps: Step[], signal?: AbortSignal): ReadableStream<UIMessageChunk> {
  return new ReadableStream<UIMessageChunk>({
    async start(controller) {
      const emit = (c: UIMessageChunk) => controller.enqueue(c);
      try {
        emit({ type: "start" });
        await sleep(350, signal);
        for (const step of steps) {
          emit({ type: "start-step" });
          if (step.kind === "reasoning") {
            const id = nextId("r");
            emit({ type: "reasoning-start", id });
            for (const w of words(step.text)) {
              emit({ type: "reasoning-delta", id, delta: w });
              await sleep(22, signal);
            }
            emit({ type: "reasoning-end", id });
          } else if (step.kind === "tool") {
            const toolCallId = nextId("call");
            emit({ type: "tool-input-available", toolCallId, toolName: step.name, input: step.input });
            await sleep(step.ms ?? 800, signal);
            emit({ type: "tool-output-available", toolCallId, output: step.output });
          } else if (step.kind === "text") {
            const id = nextId("t");
            emit({ type: "text-start", id });
            for (const w of words(step.text)) {
              emit({ type: "text-delta", id, delta: w });
              await sleep(18, signal);
            }
            emit({ type: "text-end", id });
          } else {
            for (const s of step.items) {
              emit({ type: "source-url", sourceId: nextId("src"), url: s.url, title: s.title });
            }
          }
          emit({ type: "finish-step" });
        }
        emit({ type: "finish" });
        controller.close();
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          emit({ type: "abort" });
          controller.close();
        } else {
          controller.error(err);
        }
      }
    },
  });
}

/** Split into word-sized deltas, keeping the whitespace so markdown survives. */
const words = (s: string) => s.match(/\S+\s*|\s+/g) ?? [];
