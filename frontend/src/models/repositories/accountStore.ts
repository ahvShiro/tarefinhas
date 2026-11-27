// Things the API does not keep yet live in this browser, apart for each account (key `<prefix><account id>`).
// Each store has subscribe/snapshot, so every screen that reads it sees the same value (useSyncExternalStore).

export interface AccountStore<T> {
  subscribe(listener: () => void): () => void
  /** The value of an account. The same object while nothing changes. `empty` for no account. */
  get(accountId: string | null): T
  /** Saves the value. Returns false when the browser refused (full or blocked); the screen still shows it. */
  set(accountId: string, value: T): boolean
}

export function createAccountStore<T>(prefix: string, parse: (data: unknown) => T, empty: T): AccountStore<T> {
  const cache = new Map<string, T>()
  const listeners = new Set<() => void>()

  function get(accountId: string | null): T {
    if (accountId === null) return empty
    const cached = cache.get(accountId)
    if (cached !== undefined) return cached
    let value = empty
    try {
      const raw = window.localStorage.getItem(prefix + accountId)
      value = raw === null ? empty : parse(JSON.parse(raw))
    } catch {
      // Blocked or broken storage: start empty.
    }
    cache.set(accountId, value)
    return value
  }

  function set(accountId: string, value: T): boolean {
    cache.set(accountId, value)
    listeners.forEach((listener) => listener())
    try {
      window.localStorage.setItem(prefix + accountId, JSON.stringify(value))
      return true
    } catch {
      return false
    }
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    get,
    set,
  }
}
