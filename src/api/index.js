// ─────────────────────────────────────────────────────────────────────────────
// API layer: the ONLY place the frontend gets or changes data.
//
// Every function below is async and returns plain JSON-shaped objects. Today
// they're backed by mock data in the browser (shared between accounts through
// localStorage, see data/store.js). To connect the real backend, replace each
// function body with a fetch() to the endpoint in its comment and keep the
// return shape the same; the screens won't need any changes.
//
// Example:
//   export async function listAnomalies() {
//     const res = await fetch(`${API_BASE}/aicte/anomalies`, { credentials: 'include' })
//     if (!res.ok) throw new Error(await res.text())
//     return res.json()
//   }
// ─────────────────────────────────────────────────────────────────────────────

import { ANOMALIES, ANOMALY_TYPES, INTAKE_VIOLATORS, KPIS, regionStats } from '../data/mock.js'
import { DEMO_INSTITUTIONS, OTHER_INSTITUTIONS, REPORTING_DEADLINE, findInstitution } from '../data/institutions.js'
import { ACCOUNTS } from '../data/accounts.js'
import { getConflicts, getSubmissions, recordConflict, saveSubmission } from '../data/store.js'
import { validateRows, sha256Hex } from '../lib/validation.js'
import { issueCredential as signCredential, verifyCredential as checkSignature } from '../lib/credential.js'

export const API_BASE = import.meta.env?.VITE_API_BASE ?? '/api'

const LATENCY_MS = 250
const respond = (data) => new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), LATENCY_MS))

// In-memory state for the mock
const anomalyState = {}
const stateOf = (id) => (anomalyState[id] ??= { status: 'open', notes: [] })
let lastDeduplication = '2026-10-23T09:24:00+05:30'

// ───────────── Sign-in ─────────────

/**
 * GET /auth/demo-accounts
 * → [{ id, role, name, title, org, institutionCode?, home }]
 * Demo only. The real system has a normal sign-in form with 2FA.
 */
export async function listDemoAccounts() {
  return respond(ACCOUNTS)
}

/**
 * POST /auth/session   body { accountId }
 * → { id, role, name, title, org, institutionCode?, home }
 */
export async function signIn(accountId) {
  const account = ACCOUNTS.find((a) => a.id === accountId)
  if (!account) throw new Error('Unknown account')
  return respond(account)
}

// ───────────── AICTE ─────────────

function liveAnomalies() {
  return getConflicts().map((c, i) => {
    const from = findInstitution(c.fromCode)
    const other = findInstitution(c.withCode)
    const n = c.students.length
    return {
      id: c.id,
      live: true,
      severity: 'critical',
      type: 'dual',
      summary: `${n} ${n === 1 ? 'student' : 'students'} already enrolled at ${other.name}`,
      institution: from.name,
      code: from.code,
      city: from.city,
      region: from.region,
      affected: n,
      detected: c.at,
      ref: `AB/ANM/26/L${String(i + 1).padStart(3, '0')}`,
      evidence: [
        `${from.name} (${from.code}) tried to enrol ${n} ${n === 1 ? 'student whose APAAR ID is' : 'students whose APAAR IDs are'} active at ${other.name}, ${other.city} (${other.code}).`,
        'The submission was blocked. The college was told only that the students are enrolled elsewhere, not where.',
        `Students: ${c.students.map((s) => s.name).join(', ')}.`,
      ],
    }
  })
}

function allAnomalies() {
  const fixed = ANOMALIES.map((a) => ({ ...a, ref: `AB/ANM/26/${a.id.slice(-4)}` }))
  return [...liveAnomalies(), ...fixed].map((a) => ({
    ...a,
    typeLabel: ANOMALY_TYPES[a.type],
    status: stateOf(a.id).status,
  }))
}

/**
 * GET /aicte/overview?programme=All
 * → { fileRef, updatedAt, kpis, regions[{id,name,states,sanctioned,enrolled}], headline, largestBreaches[] }
 */
export async function getOverview({ programme = 'All' } = {}) {
  const anomalies = allAnomalies()
  return respond({
    fileRef: 'AB/APAAR/2026/0471',
    updatedAt: lastDeduplication,
    kpis: KPIS,
    regions: regionStats(programme).map(({ ratio, ...r }) => r),
    headline: {
      institutionsOverIntake: KPIS.intakeBreaches,
      needsNoticeToday: anomalies.filter(
        (a) => a.status === 'open' && (a.severity === 'critical' || (a.type === 'intake' && a.severity === 'high')),
      ).length,
      studentsAtMultipleInstitutions: KPIS.crossInstitutionDuplicates,
      institutionsNotReported: KPIS.institutionsTotal - KPIS.institutionsReporting,
      reportingDue: KPIS.reportingDue,
    },
    largestBreaches: INTAKE_VIOLATORS,
  })
}

/**
 * GET /aicte/anomalies
 * → [{ id, ref, severity, type, typeLabel, summary, institution, code, city, region, affected, detected, evidence[], status, live? }]
 */
export async function listAnomalies() {
  return respond(allAnomalies())
}

/**
 * PATCH /aicte/anomalies/:id   body { status: 'review'|'notice'|'dismissed', note }
 * → { id, status }
 */
export async function updateAnomaly(id, { status, note }) {
  const s = stateOf(id)
  s.status = status
  if (note) s.notes.push({ note, at: new Date().toISOString() })
  return respond({ id, status })
}

/**
 * POST /aicte/deduplication
 * → { checked, newMatches, finishedAt }
 */
export async function runDeduplication() {
  await new Promise((r) => setTimeout(r, 1400))
  lastDeduplication = new Date().toISOString()
  return respond({ checked: KPIS.studentsRegistered, newMatches: getConflicts().length, finishedAt: lastDeduplication })
}

function submissionStatus(submittedOn) {
  if (submittedOn) return 'submitted'
  return new Date() > new Date(`${REPORTING_DEADLINE}T23:59:59+05:30`) ? 'overdue' : 'pending'
}

/**
 * GET /aicte/institutions
 * → [{ code, name, city, state, region, type, sanctioned, enrolled|null, status, submittedOn|null, openAnomalies, live }]
 */
export async function listInstitutions() {
  const subs = getSubmissions()
  const anomalies = allAnomalies().filter((a) => a.status === 'open')
  const openFor = (code) => anomalies.filter((a) => a.code === code).length

  const demo = DEMO_INSTITUTIONS.map((i) => {
    const sub = subs[i.code]
    return {
      code: i.code,
      name: i.name,
      city: i.city,
      state: i.state,
      region: i.region,
      type: i.type,
      sanctioned: i.programmes.reduce((n, p) => n + p.sanctioned, 0),
      enrolled: sub ? sub.students.filter((s) => s.seat_type !== 'Supernumerary').length : null,
      status: submissionStatus(sub?.at),
      submittedOn: sub?.at ?? null,
      openAnomalies: openFor(i.code),
      live: true,
    }
  })
  const others = OTHER_INSTITUTIONS.map((i) => ({
    code: i.code,
    name: i.name,
    city: i.city,
    state: i.state,
    region: i.region,
    type: i.type,
    sanctioned: i.sanctioned,
    enrolled: i.submitted ? i.enrolled : null,
    status: submissionStatus(i.submitted),
    submittedOn: i.submitted,
    openAnomalies: openFor(i.code),
    live: false,
  }))
  return respond([...demo, ...others])
}

/**
 * GET /aicte/institutions/:code
 * → { ...institution, programmes[{code,name,sanctioned,supernumerary,regular|null,supernumeraryUsed|null}]|null, submission|null, anomalies[] }
 */
export async function getInstitution(code) {
  const list = await listInstitutions()
  const base = list.find((i) => i.code === code)
  const demo = DEMO_INSTITUTIONS.find((i) => i.code === code)
  const sub = getSubmissions()[code] ?? null
  const programmes = demo
    ? demo.programmes.map((p) => {
        const mine = sub?.students.filter((s) => s.programme_code === p.code)
        return {
          code: p.code,
          name: p.name,
          sanctioned: p.sanctioned,
          supernumerary: p.supernumerary,
          regular: mine ? mine.filter((s) => s.seat_type !== 'Supernumerary').length : null,
          supernumeraryUsed: mine ? mine.filter((s) => s.seat_type === 'Supernumerary').length : null,
        }
      })
    : null
  return respond({
    ...base,
    aictePid: demo?.aictePid ?? null,
    nodalOfficer: demo ? `${demo.officer}, ${demo.officerRole}` : null,
    programmes,
    submission: sub && { ack: sub.ack, sha256: sub.sha256, at: sub.at, students: sub.students.length },
    anomalies: allAnomalies().filter((a) => a.code === code),
  })
}

// ───────────── Institution (scoped to the signed-in college) ─────────────

function demoInstitution(code) {
  const inst = DEMO_INSTITUTIONS.find((i) => i.code === code)
  if (!inst) throw new Error('Not an institution account')
  return inst
}

/**
 * GET /institutions/me
 * → { institution, programmes[{code,name,sanctioned,supernumerary}], submission|null }
 */
export async function getInstitutionContext(code) {
  const inst = demoInstitution(code)
  const sub = getSubmissions()[code]
  return respond({
    institution: inst,
    programmes: inst.programmes.map(({ code: c, name, sanctioned, supernumerary }) => ({ code: c, name, sanctioned, supernumerary })),
    submission: sub ? { ack: sub.ack, sha256: sub.sha256, at: sub.at, students: sub.students.length } : null,
  })
}

/**
 * POST /institutions/me/batches/validate   body { rows[] }  (or the CSV as multipart)
 * → { issues[], total, validRows, errorCount, warningCount, errorRows, warningRows, intake[] }
 * The server also alerts AICTE about students already enrolled elsewhere. The
 * college only sees that a student is enrolled elsewhere, never where.
 */
export async function validateBatch(code, rows) {
  const inst = demoInstitution(code)
  const { conflicts, ...result } = validateRows(rows, { institution: inst, programmes: inst.programmes })

  const byInstitution = {}
  for (const c of conflicts) {
    if (!c.withCode) continue // enrolled outside this demo
    ;(byInstitution[c.withCode] ??= []).push({ apaar: c.apaar, name: c.name, programme: c.programme })
  }
  for (const [withCode, students] of Object.entries(byInstitution)) {
    recordConflict({ fromCode: code, withCode, students })
  }
  return respond(result)
}

/**
 * POST /institutions/me/batches   body { csv }
 * → { acknowledgement, sha256, submittedAt, students }
 */
export async function submitBatch(code, csvText, rows) {
  demoInstitution(code)
  const hash = await sha256Hex(csvText)
  const record = {
    ack: `AICTE-SUB-2026-${hash.slice(0, 6).toUpperCase()}`,
    sha256: hash,
    at: new Date().toISOString(),
    students: rows.map((r) => ({ apaar_id: r.apaar_id, programme_code: r.programme_code, seat_type: r.seat_type })),
  }
  saveSubmission(code, record)
  return respond({ acknowledgement: record.ack, sha256: record.sha256, submittedAt: record.at, students: rows.length })
}

// ───────────── Credentials ─────────────

/**
 * POST /students/me/credentials
 * → { token, payload, digest }   (signed server-side with AICTE's key in production)
 */
export async function issueCredential(student) {
  return signCredential(student)
}

/**
 * POST /credentials/verify   body { token, verifierOrgId }
 * → { status: 'verified'|'tampered'|'expired'|'malformed', payload, digest, keyId, checkedAt }
 * Verification can also run fully offline with AICTE's public key, which is what the mock does.
 */
export async function verifyCredential(token) {
  return checkSignature(token)
}
