'use client'

const DEFAULT_MATTERPORT_URL =
  process.env.NEXT_PUBLIC_MATTERPORT_DEMO_URL ||
  'https://my.matterport.com/show/?m=SxQL3RgGooG'

type Props = {
  className?: string
  title?: string
}

export default function MatterportEmbed({ className = '', title = '3D property walkthrough preview' }: Props) {
  return (
    <div className={`relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl ${className}`}>
      <iframe
        src={DEFAULT_MATTERPORT_URL}
        title={title}
        className="absolute inset-0 h-full w-full border-0"
        allow="fullscreen; xr-spatial-tracking"
        allowFullScreen
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/90 to-transparent" />
    </div>
  )
}
