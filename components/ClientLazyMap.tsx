'use client'

import dynamic from 'next/dynamic'

type Props = {
  lat: number
  lng: number
  className?: string
}

const LazyMapNoSSR = dynamic(() => import('./LazyMap'), {
  ssr: false,
  loading: () => <div className="w-full h-[320px] bg-gray-100 animate-pulse" />,
})

export default function ClientLazyMap(props: Props) {
  return <LazyMapNoSSR {...props} />
}
