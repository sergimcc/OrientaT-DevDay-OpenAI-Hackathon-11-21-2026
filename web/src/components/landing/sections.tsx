import { useState } from "react";
import { ArrowRightIcon, CheckIcon, MoonIcon, PuzzleIcon, SunIcon, XIcon } from "lucide-react";
import { Logo, LogoMark, Waves, Wordmark } from "@/components/brand/logo";
import { LangSwitcher } from "@/components/landing/lang-switcher";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/i18n";
import { useExtensionInstalled } from "@/lib/extension-bridge";
import { siteMaps } from "@/lib/extension-catalog";
import { cn } from "@/lib/utils";
import { withBold } from "@/lib/with-bold";

export const scrollToChat = () =>
  document.getElementById("asistente")?.scrollIntoView({ behavior: "smooth", block: "start" });

export function SiteHeader({ onAsk }: { onAsk: (text: string) => void }) {
  const installed = useExtensionInstalled();
  const { t } = useI18n();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const themeLabel = dark ? t.header.lightMode : t.header.darkMode;

  function toggleTheme() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    setDark(next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // The selected theme still applies for this visit.
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-3 sm:gap-6 sm:px-6">
        <a className="shrink-0" href="#top">
          <Logo />
        </a>
        <div className="flex items-center gap-1.5 sm:gap-4">
          {/* Hidden on phones to leave room for the language picker; the section is right below. */}
          <button
            className="hidden items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors hover:border-foreground/30 sm:inline-flex"
            onClick={() => {
              onAsk(t.chat.askExtension);
              scrollToChat();
            }}
            type="button"
          >
            <PuzzleIcon className="size-4 text-brand-red" /> {t.header.extension}
            {installed && <span className="size-1.5 rounded-full bg-status-done" title={t.header.installed} />}
          </button>
          <LangSwitcher />
          <Button aria-label={themeLabel} title={themeLabel} onClick={toggleTheme} size="icon" type="button" variant="ghost" className="rounded-full text-muted-foreground">
            {dark ? <SunIcon aria-hidden="true" /> : <MoonIcon aria-hidden="true" />}
          </Button>
        </div>
      </div>
    </header>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("font-slab text-[11px] uppercase tracking-[0.3em] text-brand-red", className)}>{children}</p>
  );
}

export function HeroCopy() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h1 className="font-slab text-4xl leading-[1.1] tracking-tight text-balance sm:text-[52px]">
        {t.hero.title}
      </h1>
      <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-balance text-muted-foreground">
        {t.hero.subtitle}
      </p>
    </div>
  );
}

export function ExtensionSection({ onAsk }: { onAsk: (text: string) => void }) {
  const { t } = useI18n();
  const x = t.extension;
  return (
    <section className="scroll-mt-16 border-t" id="extension">
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <Eyebrow>{x.eyebrow}</Eyebrow>
          <h2 className="mt-3 font-slab text-3xl tracking-tight sm:text-4xl">{x.title}</h2>
          <p className="mt-4 text-muted-foreground">{x.intro}</p>
        </div>

        <BrowserMock className="mt-12" />

        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {x.steps.map((p, i) => (
            <li key={i} className="border-t-2 border-foreground pt-4">
              <span className="font-slab text-sm font-bold text-brand-red">0{i + 1}</span>
              <h3 className="mt-1.5 font-semibold">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-14 grid gap-4 md:grid-cols-2">
          <Rule items={x.does.items} ok title={x.does.title} />
          <Rule items={x.never.items} ok={false} title={x.never.title} />
        </div>

        <div className="mt-14">
          <h3 className="font-semibold">{x.knows.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{x.knows.subtitle}</p>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            {siteMaps.map((site) => (
              <div key={site.id}>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{site.name}</p>
                <ul className="mt-2 divide-y rounded-xl border">
                  {site.procedures.map((p) => (
                    <li key={p.id}>
                      <button
                        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted/50 hover:text-brand-red"
                        onClick={() => {
                          onAsk(t.chat.askPlan(p.title));
                          scrollToChat();
                        }}
                        type="button"
                      >
                        {p.title}
                        <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-10 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm">
          <span className="size-1.5 rounded-full bg-brand-red" /> {x.soon}
        </p>
      </div>
    </section>
  );
}

function Rule({ title, items, ok }: { title: string; items: string[]; ok: boolean }) {
  return (
    <div className={cn("rounded-2xl p-6", ok ? "border" : "bg-muted")}>
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-4 space-y-2.5 text-sm">
        {items.map((t) => (
          <li key={t} className="flex items-start gap-2.5">
            <span
              className={cn(
                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                ok ? "bg-brand-red/10 text-brand-red" : "bg-foreground/10 text-foreground/60"
              )}
            >
              {ok ? <CheckIcon className="size-3" strokeWidth={3} /> : <XIcon className="size-3" strokeWidth={3} />}
            </span>
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** An illustration of the extension at work: an official page with a highlighted field, and the side panel. */
function BrowserMock({ className }: { className?: string }) {
  const m = useI18n().t.extension.mock;
  return (
    <div
      aria-hidden="true"
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-[0_24px_60px_-28px_rgb(0_0_0/0.25)]",
        className
      )}
    >
      <div className="flex items-center gap-3 border-b bg-muted/60 px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-foreground/15" />
          <span className="size-2.5 rounded-full bg-foreground/15" />
          <span className="size-2.5 rounded-full bg-foreground/15" />
        </span>
        <span className="min-w-0 truncate rounded-md bg-background px-3 py-1 font-mono text-[11px] text-muted-foreground">
          sede.agenciatributaria.gob.es/Sede/Renta.html
        </span>
      </div>

      <div className="grid md:grid-cols-[1fr_280px]">
        {/* The official site */}
        <div className="relative space-y-5 p-6 sm:p-8">
          <div className="space-y-2">
            <div className="h-2.5 w-24 rounded bg-foreground/10" />
            <div className="h-4 w-56 rounded bg-foreground/20" />
          </div>
          <div className="space-y-2">
            <div className="h-2 w-full rounded bg-foreground/[0.07]" />
            <div className="h-2 w-4/5 rounded bg-foreground/[0.07]" />
          </div>
          <div className="max-w-xs space-y-4 pt-2">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground/60">{m.field}</p>
              <div className="relative">
                <div className="h-9 rounded-md border bg-background" />
                <div className="pointer-events-none absolute -inset-1.5 animate-pulse rounded-lg border-[3px] border-brand-gold" />
              </div>
              <div className="relative mt-3 max-w-[250px] rounded-lg bg-brand-ink px-3 py-2.5 text-[13px] leading-snug text-white shadow-lg">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-brand-gold">{m.hint}</span>
                {m.hintText}
              </div>
            </div>
            <div className="space-y-1.5 opacity-60">
              <p className="text-xs font-medium text-foreground/60">{m.validity}</p>
              <div className="h-9 rounded-md border bg-background" />
            </div>
            <div className="h-9 w-28 rounded-md bg-foreground/15" />
          </div>
        </div>

        {/* The side panel */}
        <div className="flex flex-col border-t bg-sidebar md:border-l md:border-t-0">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <LogoMark size={20} />
            <span className="text-sm font-semibold">{m.panelTitle}</span>
          </div>
          <div className="flex-1 space-y-3 p-4 text-[13px] leading-snug">
            <p className="ml-auto w-fit max-w-[85%] rounded-lg bg-secondary px-3 py-2">{m.user}</p>
            <p className="max-w-[92%]">{withBold(m.bot)}</p>
            <p className="max-w-[92%] text-muted-foreground">{m.botNext}</p>
          </div>
          <div className="m-3 rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground">{m.composer}</div>
        </div>
      </div>
    </div>
  );
}

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="bg-brand-red-solid text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-14 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-5">
          <LogoMark className="text-brand-gold" size={72} />
          <div className="leading-none">
            <p className="font-slab text-[11px] uppercase tracking-[0.32em] text-white/80">{t.brand.descriptor}</p>
            <Wordmark className="mt-1.5 block text-4xl" tClassName="text-brand-gold" />
            <Waves className="mt-3 text-brand-gold" />
          </div>
        </div>
        <p className="max-w-sm text-xs leading-relaxed text-white/80">{t.footer.disclaimer}</p>
      </div>
    </footer>
  );
}
