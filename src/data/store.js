// Shared mock "server" storage. Everything every account submits goes here, so
// signing in as another college (or as AICTE) sees the same data. It lives in
// localStorage only because the prototype has no backend yet; the real system
// keeps this in AICTE's central database.

const KEYS = {
  submissions: 'apaar-setu-submissions-v1',
  conflicts: 'apaar-setu-conflicts-v1',
}

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable: data lasts for this page load only */
  }
}

// ---- Submissions: { [institutionCode]: { ack, sha256, at, students: [{ apaar_id, programme_code, seat_type }] } }

export function getSubmissions() {
  return read(KEYS.submissions, {})
}

export function saveSubmission(code, record) {
  const all = getSubmissions()
  all[code] = record
  write(KEYS.submissions, all)
}

// Which institution (code) has this APAAR ID in its latest submission, if any
export function submittedAt(apaarId) {
  const all = getSubmissions()
  for (const [code, rec] of Object.entries(all)) {
    if (rec.students.some((s) => s.apaar_id === apaarId)) return code
  }
  return null
}

// ---- Conflicts: blocked attempts to enrol a student already active at another institution

export function getConflicts() {
  return read(KEYS.conflicts, [])
}

export function recordConflict({ fromCode, withCode, students }) {
  const all = getConflicts().filter((c) => !(c.fromCode === fromCode && c.withCode === withCode))
  all.unshift({ id: `LIVE-${fromCode}-${withCode}`, fromCode, withCode, students, at: new Date().toISOString() })
  write(KEYS.conflicts, all)
}

export function resetStore() {
  write(KEYS.submissions, {})
  write(KEYS.conflicts, [])
}
