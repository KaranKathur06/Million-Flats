export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export const metadata = {
  title: 'Our Team | MillionFlats',
  robots: { index: false, follow: false },
}

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
