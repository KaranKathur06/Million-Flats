'use client'

type ProjectDetails = {
  name: string
  slug: string
  developerName: string
  city: string | null
  status: string
  startingPrice: string
  mediaCount: number
  leadsCount: number
  createdAt: string
  goldenVisa: boolean
}

type Props = {
  open: boolean
  project: ProjectDetails | null
  onClose: () => void
}

export default function ProjectDetailsDrawer({ open, project, onClose }: Props) {
  if (!open || !project) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close details" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0b1a2b] p-5 shadow-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
        <h3 className="text-lg font-bold text-white">{project.name}</h3>
        <p className="text-xs font-mono text-white/45 mt-0.5">{project.slug}</p>
        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-white/35">Developer</dt>
            <dd className="font-medium text-white/85">{project.developerName}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-white/35">City</dt>
            <dd className="font-medium text-white/85">{project.city || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-white/35">Status</dt>
            <dd className="font-medium text-white/85">{project.status}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-white/35">Price</dt>
            <dd className="font-medium text-white/85">{project.startingPrice}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-white/35">Media</dt>
            <dd className="font-medium text-white/85 tabular-nums">{project.mediaCount}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-white/35">Leads</dt>
            <dd className="font-medium text-white/85 tabular-nums">{project.leadsCount}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[10px] uppercase tracking-wider text-white/35">Created</dt>
            <dd className="font-medium text-white/85">{project.createdAt}</dd>
          </div>
          {project.goldenVisa ? (
            <div className="col-span-2">
              <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-200">
                Golden Visa eligible
              </span>
            </div>
          ) : null}
        </dl>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white/80"
        >
          Close
        </button>
      </div>
    </div>
  )
}
