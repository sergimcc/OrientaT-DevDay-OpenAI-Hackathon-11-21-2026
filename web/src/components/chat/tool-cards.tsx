import { createContext, useContext, useState } from "react";
import {
  ArrowUpRightIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  EuroIcon,
  GlobeIcon,
  KeyRoundIcon,
  PuzzleIcon,
  UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { FichaCatalogo } from "@/data/tramites";
import type { ExtensionPlan } from "@/lib/extension-catalog";
import { startInExtension, useExtensionInstalled, type StartResult } from "@/lib/extension-bridge";
import { useI18n } from "@/i18n/i18n";
import type { Who } from "@/i18n/messages/es";
import { withBold } from "@/lib/with-bold";

/** Lets a card send a follow-up message to the chat. */
export const AskContext = createContext<(text: string) => void>(() => {});

/** What the person has written in the chat so far, oldest first: it travels with the hand-off. */
export const UserWordsContext = createContext<string[]>([]);

/** A tool result rendered as UI: the "generative" part of the chat. */
export function ToolResultCard({ name, output }: { name: string; output: unknown }) {
  switch (name) {
    case "buscar_tramite":
      return <FichaCard ficha={output as FichaCatalogo} />;
    case "explicar_extension":
      return <ExtensionGuideCard {...(output as GuideOutput)} />;
    case "plan_extension":
      return <PlanCard plan={output as ExtensionPlan} />;
    default:
      return null;
  }
}

function Shell({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="w-full overflow-hidden rounded-xl border bg-card">
      <div className="border-b px-4 py-2.5">
        <span className="font-slab text-[10px] uppercase tracking-[0.24em] text-muted-foreground">{eyebrow}</span>
      </div>
      {children}
    </div>
  );
}

/* ---------- Hand-off: from this website to the extension ---------- */

const host = (url: string) => new URL(url).hostname.replace(/^www\./, "");

/**
 * The bridge to the extension: opens the official site in a new tab with the assistant's panel,
 * already knowing what the person wants to do. Without the extension, it says how to get it.
 */
function HandoffBox({
  text,
  url,
  procedure,
}: {
  text: string;
  url: string;
  procedure?: { plugin: string; id: string };
}) {
  const mapped = !!procedure;
  const context = useContext(UserWordsContext);
  const installed = useExtensionInstalled();
  const h = useI18n().t.cards.handoff;
  const [state, setState] = useState<"idle" | "opening" | StartResult>("idle");
  const [copiado, setCopiado] = useState(false);

  const start = () => {
    setState("opening");
    void startInExtension({ text, url, procedure, context }).then(setState);
  };
  const copiar = () =>
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1600);
      },
      () => {}
    );

  return (
    <div className="rounded-xl bg-brand-red/[0.04] p-4 ring-1 ring-brand-red/15">
      <p className="text-sm font-semibold">{h.title}</p>
      <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
        {withBold(h.opens(host(url), mapped), "font-medium text-foreground")}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {installed ? (
          <Button
            className="bg-brand-red-solid text-white hover:bg-brand-red-solid/90"
            disabled={state === "opening"}
            onClick={start}
            size="sm"
          >
            {state === "opening" ? <Spinner /> : <PuzzleIcon />} {h.cta}
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed px-2.5 py-1.5 text-xs text-muted-foreground">
            <PuzzleIcon className="size-3.5" /> {h.install}
          </span>
        )}
        <Button asChild size="sm" variant="ghost">
          <a href={url} rel="noreferrer" target="_blank">
            {h.openOnly} <ArrowUpRightIcon />
          </a>
        </Button>
      </div>

      {typeof state === "object" && (
        <p className={cn("mt-3 text-[13px] leading-snug", state.ok ? "text-status-done" : "text-destructive")}>
          {state.ok
            ? state.panel
              ? h.okPanel(host(url))
              : h.okNoPanel(host(url))
            : state.reason === "url"
              ? h.errUrl
              : h.errOther}
        </p>
      )}

      {installed && (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {h.alreadyOpen}
          <button
            className="inline-flex items-center gap-1 rounded bg-brand-ink px-1.5 py-0.5 text-[11px] text-white"
            onClick={copiar}
            type="button"
          >
            «{text}» <CopyIcon className="size-3" />
          </button>
          {copiado && <span className="text-status-done">{h.copied}</span>}
        </p>
      )}
    </div>
  );
}

/* ---------- Cards ---------- */

function FichaCard({ ficha }: { ficha: FichaCatalogo }) {
  const c = useI18n().t.cards;
  const [hechos, setHechos] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setHechos((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <Shell eyebrow={ficha.organismo}>
      <div className="space-y-4 p-4">
        <div>
          <h3 className="text-base font-semibold tracking-tight">{ficha.titulo}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{ficha.resumen}</p>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {c.needs(hechos.size, ficha.requisitos.length)}
          </p>
          <ul className="space-y-1">
            {ficha.requisitos.map((r, i) => (
              <li key={r}>
                <button
                  className="flex w-full items-start gap-2.5 rounded-md px-1.5 py-1 text-left text-sm hover:bg-muted"
                  onClick={() => toggle(i)}
                  type="button"
                >
                  <span
                    className={cn(
                      "mt-0.5 grid size-4 shrink-0 place-items-center rounded border",
                      hechos.has(i) ? "border-brand-red-solid bg-brand-red-solid text-white" : "border-input"
                    )}
                  >
                    {hechos.has(i) && <CheckIcon className="size-3" strokeWidth={3} />}
                  </span>
                  <span className={cn(hechos.has(i) && "text-muted-foreground line-through")}>{r}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ClockIcon className="size-3.5" /> {ficha.duracion}
          </span>
          <span className="flex items-center gap-1.5">
            <EuroIcon className="size-3.5" /> {ficha.coste}
          </span>
        </div>

        <HandoffBox text={ficha.titulo} url={ficha.url} />
      </div>
    </Shell>
  );
}

const laneStyle: Record<Who, { className: string; icon: typeof UserIcon }> = {
  tu: { className: "bg-brand-gold text-brand-ink", icon: UserIcon },
  extension: { className: "bg-brand-red/10 text-brand-red", icon: PuzzleIcon },
  web: { className: "bg-foreground/[0.07] text-foreground/70", icon: GlobeIcon },
};

function Lane({ who, children }: { who: Who; children: React.ReactNode }) {
  const l = laneStyle[who];
  const label = useI18n().t.cards.lanes[who];
  return (
    <div className="flex items-start gap-2 text-[13px] leading-snug">
      <span className="w-[84px] shrink-0">
        <span
          className={cn(
            "mt-px inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            l.className
          )}
        >
          <l.icon className="size-3" />
          {label}
        </span>
      </span>
      <span>{children}</span>
    </div>
  );
}

type GuideOutput = { tramites: { titulo: string; sitio: string }[] };

function ExtensionGuideCard({ tramites }: GuideOutput) {
  const ask = useContext(AskContext);
  const installed = useExtensionInstalled();
  const { t } = useI18n();
  const g = t.cards.guide;
  return (
    <Shell eyebrow={g.eyebrow}>
      <ol className="divide-y">
        {t.cards.journey.map((step, i) => (
          <li key={i} className="space-y-2 px-4 py-3">
            <p className="text-sm font-semibold">
              <span className="mr-2 font-slab text-brand-red">{i + 1}</span>
              {step.title}
            </p>
            {step.lanes.map(([who, text]) => (
              <Lane key={who} who={who}>
                {text}
              </Lane>
            ))}
          </li>
        ))}
      </ol>
      <div className="border-t bg-muted/40 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          {installed ? (
            <span className="font-medium text-status-done">{g.installed}</span>
          ) : (
            g.needInstall
          )}
        </p>
        <p className="mt-3 text-xs font-medium text-muted-foreground">{g.knows}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tramites.map((x) => (
            <button
              key={x.titulo}
              className="rounded-full border bg-background px-2.5 py-1 text-left text-xs transition-colors hover:border-brand-red/40 hover:text-brand-red"
              onClick={() => ask(t.chat.askPlan(x.titulo))}
              type="button"
            >
              {x.titulo}
            </button>
          ))}
        </div>
      </div>
    </Shell>
  );
}

function PlanCard({ plan }: { plan: ExtensionPlan }) {
  const c = useI18n().t.cards.plan;
  return (
    <Shell eyebrow={c.eyebrow(plan.sitio)}>
      <div className="space-y-4 p-4">
        <div>
          <h3 className="text-base font-semibold tracking-tight">{plan.tramite}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{plan.resumen}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <KeyRoundIcon className="size-3.5" /> {c.access}
            </p>
            <p className="mt-1 text-sm first-letter:uppercase">{plan.acceso.join(c.or)}</p>
          </div>
          {plan.necesitas.length > 0 && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground">{c.have}</p>
              <ul className="mt-1 space-y-1 text-[13px] leading-snug">
                {plan.necesitas.map((n) => (
                  <li key={n}>· {n}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">{c.whatHappens}</p>
          <ol className="space-y-3">
            {plan.pasos.map((p, i) => (
              <li key={p.titulo} className="space-y-1.5">
                <p className="text-sm font-semibold">
                  <span className="mr-2 font-slab text-brand-red">{i + 1}</span>
                  {p.titulo}
                </p>
                <Lane who="extension">{p.extension}</Lane>
                {p.tu && <Lane who="tu">{p.tu}</Lane>}
              </li>
            ))}
          </ol>
        </div>

        <HandoffBox procedure={plan.mapa} text={plan.frase} url={plan.url} />
        {plan.borrador && (
          <p className="text-[11px] text-muted-foreground">
            {c.draft}
          </p>
        )}
      </div>
    </Shell>
  );
}
