import { MotionConfig, motion } from "motion/react";
import { useI18n } from "@/i18n/i18n";
import { LANGS } from "@/i18n/langs";
import { cn } from "@/lib/utils";

/**
 * ES · CA · EU · GL · EN in a capsule; a red pill slides to the active language. Each code
 * is named in its own language for screen readers. Motion is skipped for users who ask for
 * reduced motion.
 */
export function LangSwitcher({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n();

  return (
    <MotionConfig reducedMotion="user">
      <nav
        aria-label={t.meta.language}
        className={cn("inline-flex rounded-full border bg-muted/40 p-[3px] font-slab", className)}
      >
        {LANGS.map((l) => {
          const active = l.code === lang;
          return (
            <button
              key={l.code}
              aria-label={l.label}
              aria-pressed={active}
              className={cn(
                "relative rounded-full px-1.5 py-1 text-[11px] uppercase transition-colors sm:px-2.5 sm:py-[5px] sm:text-xs sm:tracking-[0.08em]",
                active ? "font-bold text-white" : "text-muted-foreground hover:text-foreground"
              )}
              lang={l.code}
              onClick={() => setLang(l.code)}
              title={l.label}
              type="button"
            >
              {active && (
                <motion.span
                  className="pointer-events-none absolute inset-0 rounded-full bg-brand-red-solid shadow-[0_2px_6px_-2px_rgb(242_13_13/0.6)]"
                  layoutId="lang-pill"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
                />
              )}
              <span className="relative">{l.code}</span>
            </button>
          );
        })}
      </nav>
    </MotionConfig>
  );
}
