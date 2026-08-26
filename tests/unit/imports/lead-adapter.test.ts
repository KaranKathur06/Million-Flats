import { leadImportAdapter } from '@/lib/imports/adapters/lead/adapter'

describe('lead import adapter', () => {
  it('normalizes ecosystem categories and validates core CRM fields', () => {
    const normalized = leadImportAdapter.normalize({ raw: { type: 'Ecosystem Lead', full_name: 'Asha Rao', email_address: 'ASHA@EXAMPLE.COM', ecosystem_category: 'home-loans-finance' }, sourcePath: null, mappings: [] })
    const mapped = leadImportAdapter.mapCanonical({ raw: {}, normalized: normalized.normalized, mappings: [] })
    expect(mapped.canonical).toMatchObject({ leadType: 'ECOSYSTEM', name: 'Asha Rao', email: 'asha@example.com', category: 'HOME_LOANS' })
    expect(leadImportAdapter.validate({ canonical: mapped.canonical!, raw: {}, normalized: normalized.normalized }).ready).toBe(true)
  })

  it('blocks records without a valid lead type, name, or email', () => {
    const normalized = leadImportAdapter.normalize({ raw: { name: 'Incomplete' }, sourcePath: null, mappings: [] })
    const mapped = leadImportAdapter.mapCanonical({ raw: {}, normalized: normalized.normalized, mappings: [] })
    expect(mapped.ok).toBe(false)
    expect(mapped.errors).toEqual(expect.arrayContaining(['A valid lead type is required.', 'Lead email is required.']))
  })
})
