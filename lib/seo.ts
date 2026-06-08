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

export function parsePropertyIdFromSlug(slug: string): string {
  const s = (slug || '').trim()
  if (!s) return ''

  const uuidRe = /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/
  const uuid = s.match(uuidRe)?.[1]
  if (uuid) return uuid

  return parseIdFromSlug(s)
}

export function buildPropertySlugPath(args: { id: string | number; title: string }) {
  const id = typeof args.id === 'number' ? String(args.id) : String(args.id || '').trim()
  if (!id) return ''

  const slug = slugify(args.title)
  const encodedId = encodeURIComponent(id)
  const segment = slug ? `${slug}-${encodedId}` : encodedId
  return `/properties/${segment}`
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
