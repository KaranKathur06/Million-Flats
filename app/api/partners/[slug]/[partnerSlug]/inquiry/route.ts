import { handleEcosystemInquiry } from '@/lib/ecosystem/inquiryHttp'

export const runtime = 'nodejs'

export async function POST(
  request: Request,
  { params }: { params: { slug: string; partnerSlug: string } }
) {
  return handleEcosystemInquiry(request, {
    categorySlug: decodeURIComponent(params.slug || '').trim().toLowerCase(),
    partnerSlug: decodeURIComponent(params.partnerSlug || '').trim().toLowerCase(),
  })
}
