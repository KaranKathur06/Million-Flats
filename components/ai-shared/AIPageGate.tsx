import type { ReactNode } from 'react'

type PreviewMetric = {
  label: string
  value: string
}

type AIPageGateProps = {
  children: ReactNode
  product: string
  title: string
  description: string
  metrics: PreviewMetric[]
}

export function AIPageGate({
  children,
}: AIPageGateProps) {
  return <>{children}</>
}
