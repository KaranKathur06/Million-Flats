'use client'

import { cn } from '@/lib/utils'

type ResponsiveDataTableProps = {
  /** Desktop / tablet table markup (hidden below `md`). */
  table: React.ReactNode
  /** Stacked card list for viewports below `md`. */
  mobileCards: React.ReactNode
  className?: string
  tableClassName?: string
  mobileClassName?: string
}

/**
 * Standard admin/public data table shell: horizontal scroll table on md+,
 * stacked touch-friendly cards on small screens.
 */
export function ResponsiveDataTable({
  table,
  mobileCards,
  className,
  tableClassName,
  mobileClassName,
}: ResponsiveDataTableProps) {
  return (
    <div className={cn('w-full min-w-0', className)}>
      <div className={cn('hidden md:block mf-table-scroll', tableClassName)}>{table}</div>
      <div className={cn('md:hidden space-y-3', mobileClassName)}>{mobileCards}</div>
    </div>
  )
}
