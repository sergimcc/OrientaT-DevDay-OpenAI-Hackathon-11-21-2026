// Sites the person approved in this session (found by the assistant with web search, not mapped and not a
// public-administration domain). Kept in session storage: they are forgotten when the browser closes.

const KEY = 'approvedHosts'

export async function loadApprovedHosts(): Promise<string[]> {
  const stored = (await chrome.storage.session.get(KEY))[KEY] as string[] | undefined
  return stored ?? []
}

export async function saveApprovedHosts(hosts: string[]): Promise<void> {
  await chrome.storage.session.set({ [KEY]: [...new Set(hosts)].sort() })
}

/**
 * Asks Chrome for access to one site. Must run inside the click handler of the approval card: Chrome only
 * shows its permission prompt in response to a user gesture.
 */
export async function requestSiteAccess(host: string): Promise<boolean> {
  try {
    return await chrome.permissions.request({ origins: [`https://${host}/*`] })
  } catch {
    return false
  }
}

/** Gives back the access to a site the person no longer trusts. */
export async function dropSiteAccess(host: string): Promise<void> {
  await chrome.permissions.remove({ origins: [`https://${host}/*`] }).catch(() => false)
}
