/**
 * projectEditGuards.ts
 *
 * Utilities to protect editorial fields (listing priority, pinning, featured status)
 * from being overwritten by scrapers, bulk imports, or automated updates.
 *
 * Editorial fields should only be set by admin actions, never by:
 * - Project scrapers/data ingestion
 * - Bulk import operations
 * - Automated data sync processes
 */

/**
 * Editorial fields that should never be modified by scrapers or imports
 */
export const EDITORIAL_FIELDS = [
  'listingPriority',
  'isPinned',
  'pinPriority',
  'isFeatured',
  'featuredOrder',
] as const

export type EditorialField = (typeof EDITORIAL_FIELDS)[number]

/**
 * Check if a field is an editorial field
 */
export function isEditorialField(field: string): field is EditorialField {
  return EDITORIAL_FIELDS.includes(field as EditorialField)
}

/**
 * Remove all editorial fields from an update payload
 *
 * This is used to prevent scrapers and bulk imports from modifying:
 * - listingPriority: Admin-curated project order within city
 * - isPinned: Temporary top placement flag
 * - pinPriority: Order among pinned projects
 * - isFeatured: Featured project status
 * - featuredOrder: Order among featured projects
 *
 * @example
 * const updateData = {
 *   name: 'New Project Name',
 *   listingPriority: 999,  // Should be removed
 *   isPinned: true,        // Should be removed
 *   description: 'Updated description'
 * }
 * const safe = removeEditorialFields(updateData)
 * // Result: { name: 'New Project Name', description: 'Updated description' }
 */
export function removeEditorialFields<T extends Record<string, any>>(
  data: T
): Omit<T, EditorialField> {
  const { listingPriority, isPinned, pinPriority, isFeatured, featuredOrder, ...safe } = data as any
  return safe
}

/**
 * Get an object containing only editorial fields from update data
 *
 * Useful for auditing/logging what editorial fields were attempted to be changed
 *
 * @example
 * const updateData = {
 *   name: 'Project',
 *   listingPriority: 5,
 *   isPinned: true
 * }
 * const editorial = getEditorialFields(updateData)
 * // Result: { listingPriority: 5, isPinned: true }
 */
export function getEditorialFields<T extends Record<string, any>>(
  data: T
): Partial<Record<EditorialField, any>> {
  const editorial: Partial<Record<EditorialField, any>> = {}
  for (const field of EDITORIAL_FIELDS) {
    if (field in data && data[field] !== undefined) {
      editorial[field] = data[field]
    }
  }
  return editorial
}

/**
 * Check if update data contains any editorial fields
 */
export function hasEditorialFields(data: Record<string, any>): boolean {
  return EDITORIAL_FIELDS.some((field) => field in data && data[field] !== undefined)
}

/**
 * Assert that update data does NOT contain editorial fields
 *
 * Throws an error if editorial fields are present. Useful for import/scraper code
 * that wants to explicitly validate that no editorial fields are being modified.
 *
 * @throws Error if editorial fields are found
 *
 * @example
 * const updateData = { name: 'Project', description: '...' }
 * assertNoEditorialFields(updateData) // Passes silently
 *
 * const badData = { name: 'Project', listingPriority: 5 }
 * assertNoEditorialFields(badData) // Throws error
 */
export function assertNoEditorialFields(data: Record<string, any>): void {
  const found = getEditorialFields(data)
  if (Object.keys(found).length > 0) {
    throw new Error(
      `Editorial fields detected in update payload: ${Object.keys(found).join(
        ', '
      )}. These fields cannot be modified by scrapers or imports.`
    )
  }
}

/**
 * Create a safe update payload for scrapers/imports
 *
 * Combines removeEditorialFields with optional logging for audit trail.
 *
 * @example
 * const rawUpdate = { name: 'Project', listingPriority: 5, description: '...' }
 * const safeUpdate = makeSafeImportUpdate(rawUpdate, { logStripped: true })
 * // Returns: { name: 'Project', description: '...' }
 * // Logs: "Stripped editorial fields: listingPriority"
 */
export function makeSafeImportUpdate<T extends Record<string, any>>(
  data: T,
  options?: { logStripped?: boolean }
): Omit<T, EditorialField> {
  const stripped = getEditorialFields(data)
  if (options?.logStripped && Object.keys(stripped).length > 0) {
    console.warn(
      `[projectEditGuards] Stripped editorial fields from import update: ${Object.keys(stripped).join(
        ', '
      )}`
    )
  }
  return removeEditorialFields(data)
}

export default {
  EDITORIAL_FIELDS,
  isEditorialField,
  removeEditorialFields,
  getEditorialFields,
  hasEditorialFields,
  assertNoEditorialFields,
  makeSafeImportUpdate,
}
