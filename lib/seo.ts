export function slugify(value: string) {
  const s = (value || '').trim().toLowerCase()
  if (!s) return ''

  const ascii = s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return ascii
}

export function normalizePathSegment(value: string) {
  return slugify(value)
}

export function parseIdFromSlug(slug: string): string {
  const s = (slug || '').trim()
  const m = s.match(/(?:-|^)(\d+)$/)
  return m?.[1] ? String(Number(m[1])) : ''
}

export function buildProjectSeoPath(args: {
  id: string | number
  name: string
  region: string
  district: string
  sector: string
}) {
  const id = typeof args.id === 'number' ? String(args.id) : String(args.id || '').trim()
  if (!id) return ''

  const region = normalizePathSegment(args.region)
  const district = normalizePathSegment(args.district)
  const sector = normalizePathSegment(args.sector)
  const name = slugify(args.name)

  if (!region || !district || !sector || !name) return ''

  return `/buy/project/${region}/${district}/${sector}/${name}-${id}`
}
