import Link from 'next/link'
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'

type BaseProps = {
  variant?: 'primary' | 'secondary'
  size?: 'lg' | 'md'
  className?: string
  children: ReactNode
}

type AnchorProps = BaseProps & AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string
}

type ButtonProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: undefined
}

const variantStyles: Record<NonNullable<BaseProps['variant']>, string> = {
  primary:
    'bg-dark-blue text-white shadow-[0_18px_45px_rgba(15,23,42,0.18)] hover:bg-[#25476f] hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(30,58,95,0.24)] active:translate-y-0 active:scale-[0.98]',
  secondary:
    'border border-dark-blue/40 bg-white text-dark-blue shadow-sm hover:bg-slate-100 hover:border-dark-blue hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.10)] active:translate-y-0 active:scale-[0.98]',
}

const sizeStyles: Record<NonNullable<BaseProps['size']>, string> = {
  lg: 'min-h-14 px-8 py-3 text-base font-semibold',
  md: 'min-h-12 px-6 py-2.5 text-sm font-semibold',
}

function cx(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default function MillionFlatsButton(props: AnchorProps | ButtonProps) {
  const { variant = 'primary', size = 'lg', className, children, ...rest } = props as BaseProps & Record<string, unknown>
  const classes = cx(
    'inline-flex items-center justify-center rounded-full text-center leading-tight transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-blue/30 disabled:cursor-not-allowed disabled:opacity-60',
    variantStyles[variant],
    sizeStyles[size],
    className as string,
  )

  if ('href' in props && props.href) {
    return (
      <Link href={props.href} className={classes} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </Link>
    )
  }

  return (
    <button className={classes} type="button" {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  )
}
