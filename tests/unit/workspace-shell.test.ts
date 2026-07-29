import { shouldUseWorkspaceShell } from '@/lib/workspaceShell'

describe('shouldUseWorkspaceShell', () => {
  it('treats developer and agency routes as authenticated workspace shells', () => {
    expect(shouldUseWorkspaceShell('/developer/dashboard')).toBe(true)
    expect(shouldUseWorkspaceShell('/developer/onboarding')).toBe(true)
    expect(shouldUseWorkspaceShell('/agency/dashboard')).toBe(true)
    expect(shouldUseWorkspaceShell('/agency/settings')).toBe(true)
  })

  it('keeps public marketing routes on the public app shell', () => {
    expect(shouldUseWorkspaceShell('/')).toBe(false)
    expect(shouldUseWorkspaceShell('/buy')).toBe(false)
    expect(shouldUseWorkspaceShell('/rent')).toBe(false)
    expect(shouldUseWorkspaceShell('/about')).toBe(false)
  })
})
