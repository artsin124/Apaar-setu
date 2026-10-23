// ─────────────────────────────────────────────────────────────────────────────
// API layer: the ONLY place the frontend gets or changes data.
//
// Every function below is async and returns plain JSON-shaped objects. Today
// they're backed by mock data in the browser. To connect the real backend,
// replace each function body with a fetch() to the endpoint in its comment and
// keep the return shape the same; the screens won't need any changes.
//
// Example:
//   export async function listAnomalies() {
//     const res = await fetch(`${API_BASE}/aicte/anomalies`, { credentials: 'include' })
//     if (!res.ok) throw new Error(await res.text())
//     return res.json()
//   }
// ─────────────────────────────────────────────────────────────────────────────

import { ANOMALIES, ANOMALY_TYPES, INTAKE_VIOLATORS, KPIS, MY_INSTITUTION, MY_PROGRAMMES, regionStats } from '../data/mock.js'
import { validateRows, sha256Hex } from '../lib/validation.js'
import { issueCredential as signCredential, verifyCredential as checkSignature } from '../lib/credential.js'

export const API_BASE = import.meta.env?.VITE_API_BASE ?? '/api'

const LATENCY_MS = 250
const respond = (data) => new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), LATENCY_MS))

// In-memory "database" for the mock
const anomalyState = Object.fromEntries(ANOMALIES.map((a) => [a.id, { status: 'open', notes: [] }]))
let lastDeduplication = '2026-10-23T09:24:00+05:30'

// ───────────── AICTE ─────────────

/**
 * GET /aicte/overview?programme=All
 * → { fileRef, updatedAt, kpis, regions[{id,name,states,sanctioned,enrolled}], headline }
 */
export async function getOverview({ programme = 'All' } = {}) {
  return respond({
    fileRef: 'AB/APAAR/2026/0471',
    updatedAt: lastDeduplication,
    kpis: KPIS,
    regions: regionStats(programme).map(({ ratio, ...r }) => r),
    headline: {
      institutionsOverIntake: KPIS.intakeBreaches,
      needsNoticeToday: ANOMALIES.filter(
        (a) => anomalyState[a.id].status === 'open' && (a.severity === 'critical' || (a.type === 'intake' && a.severity === 'high')),
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
 * → [{ id, ref, severity, type, typeLabel, summary, institution, code, city, region, affected, detected, evidence[], status }]
 */
export async function listAnomalies() {
  return respond(
    ANOMALIES.map((a) => ({
      ...a,
      ref: `AB/ANM/26/${a.id.slice(-4)}`,
      typeLabel: ANOMALY_TYPES[a.type],
      status: anomalyState[a.id].status,
    })),
  )
}

/**
 * PATCH /aicte/anomalies/:id   body { status: 'review'|'notice'|'dismissed', note }
 * → { id, status }
 */
export async function updateAnomaly(id, { status, note }) {
  anomalyState[id].status = status
  if (note) anomalyState[id].notes.push({ note, at: new Date().toISOString() })
  return respond({ id, status })
}

/**
 * POST /aicte/deduplication
 * → { checked, newMatches, finishedAt }
 */
export async function runDeduplication() {
  await new Promise((r) => setTimeout(r, 1400))
  lastDeduplication = new Date().toISOString()
  return respond({ checked: KPIS.studentsRegistered, newMatches: 0, finishedAt: lastDeduplication })
}

// ───────────── Institution ─────────────

/**
 * GET /institutions/me
 * → { institution, programmes[{code,name,sanctioned,supernumerary}] }
 */
export async function getInstitutionContext() {
  return respond({ institution: MY_INSTITUTION, programmes: MY_PROGRAMMES })
}

/**
 * POST /institutions/me/batches/validate   body { rows[] }  (or the CSV as multipart)
 * → { issues[], total, validRows, errorCount, warningCount, errorRows, warningRows, intake[] }
 * The backend runs the same rules against the real APAAR registry.
 */
export async function validateBatch(rows) {
  return respond(validateRows(rows, { institutionName: MY_INSTITUTION.name, programmes: MY_PROGRAMMES }))
}

/**
 * POST /institutions/me/batches   body { csv }
 * → { acknowledgement, sha256, submittedAt, students }
 */
export async function submitBatch(csvText, students) {
  const hash = await sha256Hex(csvText)
  return respond({
    acknowledgement: `AICTE-SUB-2026-${hash.slice(0, 6).toUpperCase()}`,
    sha256: hash,
    submittedAt: new Date().toISOString(),
    students,
  })
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
