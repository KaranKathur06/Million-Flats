import { revalidatePath, revalidateTag } from 'next/cache'

export const ECOSYSTEM_PARTNERS_CACHE_TAG = 'ecosystem-partners'

export function revalidatePartnerSurfaces(categorySlug: string, partnerSlug?: string | null) {
  revalidateTag(ECOSYSTEM_PARTNERS_CACHE_TAG)
  revalidatePath('/ecosystem-partners')
  revalidatePath(`/ecosystem-partners/${categorySlug}`)
  if (partnerSlug) {
    revalidatePath(`/partners/${categorySlug}/${partnerSlug}`)
  }
}
