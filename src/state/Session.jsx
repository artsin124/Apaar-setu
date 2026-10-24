import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { signIn as apiSignIn } from '../api/index.js'

// Who is signed in. Demo only: stored per browser tab so two tabs can be
// signed in as two different colleges side by side during a demo.

const KEY = 'apaar-setu-session-v1'
const Ctx = createContext(null)

function load() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY))
  } catch {
    return null
  }
}

export function SessionProvider({ children }) {
  const [account, setAccount] = useState(load)

  const signIn = useCallback(async (accountId) => {
    const a = await apiSignIn(accountId)
    setAccount(a)
    try {
      sessionStorage.setItem(KEY, JSON.stringify(a))
    } catch {
      /* storage unavailable */
    }
    return a
  }, [])

  const signOut = useCallback(() => {
    setAccount(null)
    try {
      sessionStorage.removeItem(KEY)
    } catch {
      /* storage unavailable */
    }
  }, [])

  const value = useMemo(() => ({ account, signIn, signOut }), [account, signIn, signOut])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSession() {
  return useContext(Ctx)
}
