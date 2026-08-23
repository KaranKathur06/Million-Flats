'use client'

import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  X,
} from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type ActionVariant = 'default' | 'danger' | 'governance'
type ActionPhase = 'confirmation' | 'processing' | 'success' | 'error'

export type AdminActionConfig = {
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  variant?: ActionVariant
  requiresConfirmation?: boolean
  loadingTitle?: string
  loadingMessage?: string
  successTitle?: string
  successMessage?: string
  errorTitle?: string
  errorMessage?: string
  input?: { label: string; placeholder?: string; required?: boolean; onChange?: (value: string) => void }
  validation?: Array<{ label: string; value: string; tone?: 'neutral' | 'warning' | 'danger' | 'success' }>
  mutation: () => Promise<unknown>
  onSuccess?: () => Promise<void> | void
}

type ActiveAction = AdminActionConfig & {
  phase: ActionPhase
  errorMessage?: string
}

type AdminActionContextValue = {
  runAction: (config: AdminActionConfig) => Promise<boolean>
}

const AdminActionContext = createContext<AdminActionContextValue | null>(null)

export function getAdminActionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message && !/\b(stack|error:|traceback)\b/i.test(error.message)) {
    return error.message
  }
  return fallback
}

export function AdminActionProvider({ children }: { children: ReactNode }) {
  const [activeAction, setActiveAction] = useState<ActiveAction | null>(null)
  const [inputValue, setInputValue] = useState('')
  const activeActionRef = useRef<ActiveAction | null>(null)
  const resolveRef = useRef<((result: boolean) => void) | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const modalRef = useRef<HTMLDivElement | null>(null)
  const submittedRef = useRef(false)

  const setAction = useCallback((action: ActiveAction | null) => {
    activeActionRef.current = action
    setActiveAction(action)
  }, [])

  const closeAction = useCallback((result: boolean) => {
    if (activeActionRef.current?.phase === 'processing') return
    const trigger = triggerRef.current
    triggerRef.current = null
    setAction(null)
    submittedRef.current = false
    setInputValue('')
    resolveRef.current?.(result)
    resolveRef.current = null
    window.setTimeout(() => trigger?.focus(), 0)
  }, [setAction])

  const executeAction = useCallback(async () => {
    const action = activeActionRef.current
    if (!action || submittedRef.current) return

    submittedRef.current = true
  setAction({ ...action, phase: 'processing' })
    try {
      await action.mutation()
      await action.onSuccess?.()
      setAction({ ...action, phase: 'success' })
      window.setTimeout(() => {
        if (activeActionRef.current?.phase === 'success') closeAction(true)
      }, 1400)
    } catch (error) {
      submittedRef.current = false
      setAction({
        ...action,
        phase: 'error',
        errorMessage: getAdminActionErrorMessage(error, action.errorMessage || 'Unable to complete this action.'),
      })
    }
  }, [closeAction, setAction])

  const runAction = useCallback((config: AdminActionConfig) => {
    if (activeActionRef.current) return Promise.resolve(false)

    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    submittedRef.current = false
    setInputValue('')
    setAction({
      ...config,
      phase: config.requiresConfirmation === false ? 'processing' : 'confirmation',
    })

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
      if (config.requiresConfirmation === false) void executeAction()
    })
  }, [executeAction, setAction])

  useEffect(() => {
    if (!activeAction) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const modal = modalRef.current
    const focusable = modal?.querySelector<HTMLElement>('button:not([disabled]), textarea, input, [tabindex="0"]')
    focusable?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      const current = activeActionRef.current
      if (!current) return
      if (event.key === 'Escape' && current.phase === 'confirmation') {
        event.preventDefault()
        closeAction(false)
        return
      }
      if (event.key === 'Enter' && current.phase === 'confirmation' && event.target === modal) {
        event.preventDefault()
        void executeAction()
        return
      }
      if (event.key !== 'Tab' || !modal) return
      const elements = Array.from(modal.querySelectorAll<HTMLElement>('button:not([disabled]), textarea, input, [tabindex="0"]'))
      if (!elements.length) return
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [activeAction, closeAction, executeAction])

  const value = { runAction }

  return (
    <AdminActionContext.Provider value={value}>
      {children}
      {activeAction ? <AdminActionModal action={activeAction} inputValue={inputValue} modalRef={modalRef} onInputChange={(value) => { setInputValue(value); activeAction.input?.onChange?.(value) }} onCancel={() => closeAction(false)} onConfirm={() => void executeAction()} /> : null}
    </AdminActionContext.Provider>
  )
}

export function useAdminAction() {
  const context = useContext(AdminActionContext)
  if (!context) throw new Error('useAdminAction must be used within AdminActionProvider')
  return context
}

function AdminActionModal({
  action,
  inputValue,
  modalRef,
  onInputChange,
  onCancel,
  onConfirm,
}: {
  action: ActiveAction
  inputValue: string
  modalRef: React.RefObject<HTMLDivElement>
  onInputChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
}) {
  const isConfirmation = action.phase === 'confirmation'
  const isProcessing = action.phase === 'processing'
  const isSuccess = action.phase === 'success'
  const isError = action.phase === 'error'
  const variant = action.variant || 'default'
  const title = isProcessing ? action.loadingTitle || 'Updating MillionFlats' : isSuccess ? action.successTitle || 'Action completed' : isError ? action.errorTitle || 'Action failed' : action.title
  const message = isProcessing ? action.loadingMessage || 'Please wait while we update the server.' : isSuccess ? action.successMessage || 'The action was completed successfully.' : isError ? action.errorMessage || 'Unable to complete this action.' : action.description
  const Icon = isProcessing ? Loader2 : isSuccess ? CheckCircle2 : isError ? AlertTriangle : variant === 'governance' ? ShieldCheck : variant === 'danger' ? AlertTriangle : ShieldCheck
  const iconClass = isSuccess ? 'text-emerald-300 bg-emerald-400/10 border-emerald-400/25' : isError || variant === 'danger' ? 'text-red-300 bg-red-400/10 border-red-400/25' : 'text-amber-300 bg-amber-400/10 border-amber-400/25'
  const confirmClass = variant === 'danger' ? 'bg-red-500 text-white hover:bg-red-400' : variant === 'governance' ? 'bg-emerald-500 text-white hover:bg-emerald-400' : 'bg-amber-400 text-[#0b1220] hover:bg-amber-300'

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="presentation">
      <div className="absolute inset-0 bg-[#050a12]/80 backdrop-blur-sm" aria-hidden="true" />
      <div ref={modalRef} className="relative w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#0c1425] p-6 shadow-2xl shadow-black/60" role="dialog" aria-modal="true" aria-labelledby="admin-action-title" aria-describedby="admin-action-description" tabIndex={-1}>
        <div className="flex items-start gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${iconClass}`}>
            <Icon className={`h-5 w-5 ${isProcessing ? 'animate-spin' : ''}`} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="admin-action-title" className="text-lg font-bold text-white">{title}</h2>
            <p id="admin-action-description" className="mt-2 text-sm leading-6 text-white/65">{message}</p>
          </div>
          {!isProcessing && isConfirmation ? <button type="button" onClick={onCancel} className="rounded-lg p-1 text-white/45 hover:bg-white/[0.06] hover:text-white" aria-label="Close confirmation"><X className="h-5 w-5" /></button> : null}
        </div>

        {isConfirmation && action.validation?.length ? (
          <dl className="mt-5 space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
            {action.validation.map((item) => <div key={item.label} className="flex items-center justify-between gap-4 text-sm"><dt className="text-white/45">{item.label}</dt><dd className={item.tone === 'danger' ? 'font-semibold text-red-300' : item.tone === 'warning' ? 'font-semibold text-amber-300' : item.tone === 'success' ? 'font-semibold text-emerald-300' : 'font-semibold text-white/80'}>{item.value}</dd></div>)}
          </dl>
        ) : null}

        {isConfirmation && action.input ? <label className="mt-5 block text-sm font-semibold text-white/70">{action.input.label}<textarea value={inputValue} onChange={(event) => onInputChange(event.target.value)} placeholder={action.input.placeholder} required={action.input.required} rows={3} className="mt-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm font-normal text-white outline-none focus:border-amber-400/40" /></label> : null}

        {isError ? <div className="mt-5 rounded-xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">{action.errorMessage || 'Unable to complete this action.'}</div> : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {isConfirmation ? <button type="button" onClick={onCancel} className="h-10 rounded-xl border border-white/[0.12] bg-white/[0.04] px-5 text-sm font-semibold text-white/70 hover:bg-white/[0.08]">{action.cancelLabel || 'Cancel'}</button> : null}
          {isConfirmation ? <button type="button" onClick={onConfirm} disabled={Boolean(action.input?.required && !inputValue.trim())} className={`h-10 rounded-xl px-5 text-sm font-bold transition ${confirmClass} disabled:cursor-not-allowed disabled:opacity-40`}>{action.confirmLabel}</button> : null}
          {isError ? <><button type="button" onClick={onCancel} className="h-10 rounded-xl border border-white/[0.12] px-5 text-sm font-semibold text-white/70 hover:bg-white/[0.08]">Close</button><button type="button" onClick={onConfirm} className={`h-10 rounded-xl px-5 text-sm font-bold transition ${confirmClass}`}>Try Again</button></> : null}
          {isSuccess ? <button type="button" onClick={() => onCancel()} className="h-10 rounded-xl bg-emerald-500 px-5 text-sm font-bold text-white hover:bg-emerald-400">Continue</button> : null}
        </div>
      </div>
    </div>
  )
}