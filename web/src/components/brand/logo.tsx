import { useI18n } from "@/i18n/i18n";
import { cn } from "@/lib/utils";

/** An original letter mark. `size` is its height in pixels. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("shrink-0 text-brand-red", className)}
      height={size}
      viewBox="0 0 64 64"
      width={size}
    >
      <rect x="6" y="6" width="52" height="52" rx="16" fill="currentColor" />
      <path d="M18 23h28M32 23v23" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" />
      <circle cx="47" cy="46" r="4" fill="#ffe500" />
    </svg>
  );
}

/** The ≈ waves: the brand's recurring glyph (dividers, footers). */
export function Waves({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("text-brand-red", className)}
      fill="none"
      height="10"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth={2.4}
      viewBox="0 0 22 10"
      width="22"
    >
      <path d="M2 3.5c3-2.4 6-2.4 9 0s6 2.4 9 0M2 8.5c3-2.4 6-2.4 9 0s6 2.4 9 0" />
    </svg>
  );
}

/**
 * The name, «OrientaT»: fixed in every language, mixed case so the final T stands out in
 * colour (it reads «oriéntate» / «orienta't»). `tClassName` sets the T's colour: brand red by
 * default, yellow on the red footer.
 */
export function Wordmark({ className, tClassName = "text-brand-red" }: { className?: string; tClassName?: string }) {
  return (
    <span className={cn("whitespace-nowrap font-slab font-bold tracking-[0.01em]", className)}>
      Orienta<span className={tClassName}>T</span>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <span className={cn("flex items-center gap-3 max-[399px]:gap-1.5", className)}>
      <LogoMark className="max-[399px]:h-6 max-[399px]:w-auto" size={38} />
      <span className="flex flex-col leading-none">
        <span className="font-slab text-[9px] uppercase tracking-[0.16em] text-foreground/70 max-[399px]:sr-only sm:text-[10px] sm:tracking-[0.28em]">
          {t.brand.descriptor}
        </span>
        <Wordmark className="mt-1 text-[22px] max-[399px]:mt-0 max-[399px]:text-[16px]" />
      </span>
    </span>
  );
}
