const WORKSPACE_PREFIXES = ['/developer/', '/agency/']
const PUBLIC_PREFIXES = ['/', '/buy', '/rent', '/projects', '/find-an-agent', '/market-analysis', '/services']

export function shouldUseWorkspaceShell(pathname: string) {
  if (!pathname) return false

  if (pathname === '/' || pathname === '') return false

  if (WORKSPACE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) {
    return true
  }

  return false
}
