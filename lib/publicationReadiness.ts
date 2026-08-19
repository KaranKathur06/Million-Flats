export type ReadinessResult = { ok: true } | { ok: false; message: string }

export function checkProjectPublishReadiness(project: {
  name?: string | null
  slug?: string | null
  developerId?: string | null
  isDeleted?: boolean | null
}): ReadinessResult {
  if (project.isDeleted) return { ok: false, message: 'Deleted project cannot be published.' }
  if (!String(project.name || '').trim()) return { ok: false, message: 'Project name is required before publishing.' }
  if (!String(project.slug || '').trim()) return { ok: false, message: 'Project slug is required before publishing.' }
  if (!String(project.developerId || '').trim()) return { ok: false, message: 'Developer is required before publishing.' }
  return { ok: true }
}

export function checkManualPropertyPublishReadiness(property: {
  title?: string | null
  intent?: string | null
  countryIso2?: string | null
  city?: string | null
}): ReadinessResult {
  if (!String(property.title || '').trim()) return { ok: false, message: 'Property title is required before publishing.' }
  if (property.intent !== 'SALE' && property.intent !== 'RENT') return { ok: false, message: 'Property intent is required before publishing.' }
  if (property.countryIso2 !== 'IN' && property.countryIso2 !== 'AE') return { ok: false, message: 'A supported country is required before publishing.' }
  if (!String(property.city || '').trim()) return { ok: false, message: 'City is required before publishing.' }
  return { ok: true }
}
