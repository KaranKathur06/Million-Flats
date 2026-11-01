import { handleEcosystemInquiry } from '@/lib/ecosystem/inquiryHttp'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  return handleEcosystemInquiry(request)
}
