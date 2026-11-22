// Match the website's original letter mark.

export function BrandMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="6" y="6" width="52" height="52" rx="16" fill="currentColor" />
      <path d="M18 23h28M32 23v23" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" />
      <circle cx="47" cy="46" r="4" fill="#ffe500" />
    </svg>
  )
}

/** The website's lockup (web/src/components/brand/logo.tsx): the descriptor, then «OrientaT» with a red T. */
export function BrandLockup() {
  return (
    <span className="brand-lockup">
      <BrandMark size={38} />
      <span className="brand-name">
        <span className="brand-org">Asistente de trámites</span>
        <span className="brand-product">
          Orienta<span className="brand-t">T</span>
        </span>
      </span>
    </span>
  )
}
