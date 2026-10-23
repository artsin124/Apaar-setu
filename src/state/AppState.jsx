import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { INITIAL_ACTIVITY, INITIAL_GRANTS, STUDENT } from '../data/mock.js'
import { issueCredential } from '../api/index.js'

// Shared demo state: the student's consent grants, their credential and the
// access log. Persisted in localStorage so the demo survives a refresh; a real
// deployment keeps this on the backend.

const KEY = 'apaar-setu-demo-v1'
const Ctx = createContext(null)

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage unavailable: the demo still works for this session */
  }
}

export function AppStateProvider({ children }) {
  const saved = load()
  const [grants, setGrants] = useState(saved?.grants ?? INITIAL_GRANTS)
  const [activity, setActivity] = useState(saved?.activity ?? INITIAL_ACTIVITY)
  const [credential, setCredential] = useState(saved?.credential ?? null)

  useEffect(() => {
    if (!credential) issueCredential(STUDENT).then(setCredential)
  }, [credential])

  useEffect(() => {
    save({ grants, activity, credential })
  }, [grants, activity, credential])

  const log = useCallback((entry) => {
    setActivity((a) => [{ id: `a${Date.now()}`, at: new Date().toISOString(), ...entry }, ...a].slice(0, 30))
  }, [])

  const revokeGrant = useCallback(
    (id) => {
      setGrants((gs) =>
        gs.map((g) => (g.id === id ? { ...g, status: 'revoked', revokedOn: new Date().toISOString().slice(0, 10) } : g)),
      )
      const g = grants.find((x) => x.id === id)
      if (g) log({ kind: 'revoked', who: 'You', what: `Revoked access for ${g.org}`, result: 'Takes effect immediately' })
    },
    [grants, log],
  )

  const addGrant = useCallback(
    ({ orgId, org, purpose, scope, days }) => {
      const expires = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
      setGrants((gs) => [
        { id: `g-${orgId}-${Date.now()}`, orgId, org, purpose, scope, expires, status: 'active' },
        ...gs.filter((g) => !(g.orgId === orgId && g.status === 'active')),
      ])
      log({ kind: 'shared', who: 'You', what: `Granted access to ${org}`, result: `${scope.join(', ')} · ${days} days` })
    },
    [log],
  )

  const regenerate = useCallback(async () => {
    const c = await issueCredential(STUDENT)
    setCredential(c)
    log({ kind: 'issued', who: 'AICTE credential service', what: 'Issued a new signed credential', result: 'Previous QR still verifies until it expires' })
  }, [log])

  const consentFor = useCallback(
    (orgId) => {
      const list = grants.filter((g) => g.orgId === orgId)
      const active = list.find((g) => g.status === 'active' && (!g.expires || new Date(g.expires) >= new Date()))
      if (active) return { state: 'active', grant: active }
      if (list.some((g) => g.status === 'revoked')) return { state: 'revoked', grant: list.find((g) => g.status === 'revoked') }
      return { state: 'none' }
    },
    [grants],
  )

  const reset = useCallback(() => {
    setGrants(INITIAL_GRANTS)
    setActivity(INITIAL_ACTIVITY)
    setCredential(null)
  }, [])

  const value = useMemo(
    () => ({ grants, activity, credential, revokeGrant, addGrant, regenerate, consentFor, log, reset }),
    [grants, activity, credential, revokeGrant, addGrant, regenerate, consentFor, log, reset],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAppState() {
  return useContext(Ctx)
}
