import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import ThreeDTourDemoLandingClient from '@/components/three-d-tour/ThreeDTourDemoLandingClient'

export const metadata = {
  title: 'Book Your 3D Tour Consultation | MillionFlats',
  description:
    'Request a free 3D tour consultation for developers, luxury villas, commercial projects, and hospitality. Tailored demo, pricing, and delivery roadmap.',
}

export default async function ThreeDTourDemoPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/auth/login?next=%2Fservices%2F3d-tour-demo')
  }

  return <ThreeDTourDemoLandingClient />
}
