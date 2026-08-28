'use client'

import { useState, useCallback, useRef, useMemo } from 'react'

export type PartnerFormMode = 'create' | 'edit'

export type PartnerCoreFields = {
  id?: string
  categoryId: string
  categorySlug?: string
  name: string
  slug: string
  tagline: string
  shortDescription: string
  description: string
  logo: string
  coverImage: string
  rating: string
  yearsExperience: string
  experienceDisplay: string
  projectsCompleted: string
  teamSize: string
  partnerSince: string
  locationCoverage: string
  pricingRange: string
  contactPerson: string
  contactEmail: string
  contactPhone: string
  whatsapp: string
  website: string
  gstNumber: string
  registrationNumber: string
  status: string
  isFeatured: boolean
  isVerified: boolean
  isActive: boolean
  metaTitle: string
  metaDescription: string
  metaKeywords: string
  categoryData: Record<string, unknown>
}

export const EMPTY_PARTNER_FORM: PartnerCoreFields = {
  categoryId: '',
  categorySlug: '',
  name: '',
  slug: '',
  tagline: '',
  shortDescription: '',
  description: '',
  logo: '',
  coverImage: '',
  rating: '',
  yearsExperience: '',
  experienceDisplay: '',
  projectsCompleted: '',
  teamSize: '',
  partnerSince: '',
  locationCoverage: '',
  pricingRange: '',
  contactPerson: '',
  contactEmail: '',
  contactPhone: '',
  whatsapp: '',
  website: '',
  gstNumber: '',
  registrationNumber: '',
  status: 'PENDING',
  isFeatured: false,
  isVerified: false,
  isActive: true,
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
  categoryData: {},
}

export function usePartnerForm(initial?: Partial<PartnerCoreFields> & { id?: string }) {
  const [form, setForm] = useState<PartnerCoreFields>({
    ...EMPTY_PARTNER_FORM,
    ...initial,
    categoryData: initial?.categoryData ?? {},
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const initialRef = useRef(JSON.stringify({ ...EMPTY_PARTNER_FORM, ...initial }))

  const isEdit = Boolean(initial?.id)
  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== initialRef.current
  }, [form])

  const updateField = useCallback((name: keyof PartnerCoreFields, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    setError('')
    setSuccessMessage('')
  }, [])

  const updateCategoryData = useCallback((key: string, value: unknown) => {
    setForm((prev) => ({
      ...prev,
      categoryData: { ...prev.categoryData, [key]: value },
    }))
    setError('')
  }, [])

  const setCategoryDataBulk = useCallback((data: Record<string, unknown>) => {
    setForm((prev) => ({
      ...prev,
      categoryData: { ...prev.categoryData, ...data },
    }))
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    setError('')
    setSuccessMessage('')
  }, [])

  /** Build the API payload — converts string numbers to actual numbers, strips empty strings */
  const buildPayload = useCallback(() => {
    return {
      categoryId: form.categoryId,
      name: form.name,
      slug: form.slug || undefined,
      tagline: form.tagline || null,
      shortDescription: form.shortDescription || null,
      description: form.description || null,
      logo: form.logo || null,
      coverImage: form.coverImage || null,
      rating: form.rating ? Number(form.rating) : null,
      yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : null,
      experienceDisplay: form.experienceDisplay || null,
      projectsCompleted: form.projectsCompleted ? Number(form.projectsCompleted) : null,
      teamSize: form.teamSize ? Number(form.teamSize) : null,
      partnerSince: form.partnerSince ? Number(form.partnerSince) : null,
      locationCoverage: form.locationCoverage || null,
      pricingRange: form.pricingRange || null,
      contactPerson: form.contactPerson || null,
      contactEmail: form.contactEmail || null,
      contactPhone: form.contactPhone || null,
      whatsapp: form.whatsapp || null,
      website: form.website || null,
      gstNumber: form.gstNumber || null,
      registrationNumber: form.registrationNumber || null,
      categoryData: Object.keys(form.categoryData).length > 0 ? form.categoryData : null,
      status: form.status,
      isFeatured: form.isFeatured,
      isVerified: form.isVerified,
      isActive: form.isActive,
      metaTitle: form.metaTitle || null,
      metaDescription: form.metaDescription || null,
      metaKeywords: form.metaKeywords || null,
    }
  }, [form])

  return {
    form,
    setForm,
    saving,
    setSaving,
    error,
    setError,
    successMessage,
    setSuccessMessage,
    isEdit,
    isDirty,
    updateField,
    updateCategoryData,
    setCategoryDataBulk,
    handleChange,
    buildPayload,
  }
}
