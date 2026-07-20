'use client'

import { trackEvent } from '@/lib/tracking'
import MillionFlatsButton from '@/components/ui/MillionFlatsButton'

export default function FinalCTA({
  headline,
  primary,
  secondary,
}: {
  headline: string
  primary: { label: string; href: string }
  secondary: { label: string; href: string }
}) {
  return (
    <div className="rounded-[32px] border border-slate-200 bg-white px-6 py-12 shadow-[0_28px_90px_rgba(15,23,42,0.10)] sm:px-10 lg:px-16 lg:py-16">
      <div className="mx-auto max-w-4xl text-center">
        <h3 className="text-[34px] font-extrabold leading-tight tracking-tight text-slate-950 sm:text-[42px]">{headline}</h3>
        <p className="mx-auto mt-5 max-w-2xl text-[18px] leading-8 text-slate-600">
          Join our network or request a consultation. MillionFlats connects vetted partners with real project demand through one premium ecosystem experience.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <MillionFlatsButton
            href={primary.href}
            variant="primary"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() =>
              trackEvent('ecosystem_cta_click', {
                type: 'primary',
                label: primary.label,
                href: primary.href,
              })
            }
          >
            {primary.label}
          </MillionFlatsButton>
          <MillionFlatsButton
            href={secondary.href}
            variant="secondary"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() =>
              trackEvent('ecosystem_cta_click', {
                type: 'secondary',
                label: secondary.label,
                href: secondary.href,
              })
            }
          >
            {secondary.label}
          </MillionFlatsButton>
        </div>
      </div>
    </div>
  )
}
