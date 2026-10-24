function sanitizeSlugSegment(input: string) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function buildLegacyRecoveryCandidates(params: { slug: string; key: string }) {
  const safeSlug = sanitizeSlugSegment(params.slug)
  if (!safeSlug) return [] as string[]

  const cleanKey = String(params.key || '').trim().replace(/^\/+/, '')
  const fileName = cleanKey.split('/').pop() || 'guide.pdf'
  const isPdfFile = /\.pdf$/i.test(fileName)
  const candidates = [
    ...(isPdfFile ? [`private/lead-magnets/${safeSlug}/guide.pdf`] : []),
    `private/lead-magnets/${safeSlug}/${fileName}`,
    ...(isPdfFile ? [`private/lead-magnets/faq/${safeSlug}/guide.pdf`] : []),
    `private/lead-magnets/faq/${safeSlug}/${fileName}`,
  ]

  return Array.from(new Set(candidates.filter(Boolean)))
}
