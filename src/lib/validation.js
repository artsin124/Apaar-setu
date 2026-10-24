// Rule engine for institution uploads.
// Rules are data, not code paths: AICTE could edit severity, wording or turn a rule
// off for a given academic year without touching the engine.

import { apaarRegistry } from '../data/registry.js'

export const RULES = {
  REQUIRED: { severity: 'error', title: 'Required field missing', fix: 'Fill in the missing value and re-upload.' },
  APAAR_FORMAT: { severity: 'error', title: 'APAAR ID must be exactly 12 digits', fix: 'Copy the ID from the student’s DigiLocker APAAR card.' },
  APAAR_NOT_FOUND: { severity: 'error', title: 'APAAR ID not found in national registry', fix: 'Ask the student to generate or confirm their APAAR ID through DigiLocker.' },
  DUPLICATE_IN_FILE: { severity: 'error', title: 'Duplicate row in this file', fix: 'Remove the repeated row.' },
  ACTIVE_ELSEWHERE: { severity: 'error', title: 'Already enrolled at another institution', fix: 'Ask the student for a migration certificate, or for proof they’ve withdrawn from the other institution.' },
  PROGRAMME_UNKNOWN: { severity: 'error', title: 'Programme not approved for this institution', fix: 'Use one of the approved programme codes.' },
  DATE_FORMAT: { severity: 'error', title: 'Date must be YYYY-MM-DD', fix: 'Re-enter the date of birth from the school-leaving certificate.' },
  AGE_RANGE: { severity: 'error', title: 'Age is implausible for this programme', fix: 'Check the date of birth against the SSC certificate.' },
  NRI_DOC: { severity: 'error', title: 'NRI quota without supporting document', fix: 'Attach the NRI sponsor document reference or change the quota.' },
  INTAKE_EXCEEDED: { severity: 'error', title: 'Regular admissions exceed sanctioned intake', fix: 'Move the student to a supernumerary category if eligible, or withdraw the admission.' },
  SUPERNUMERARY_EXCEEDED: { severity: 'warning', title: 'Supernumerary seats exceed allowed limit', fix: 'Confirm the supernumerary category approval letter.' },
  NAME_MISMATCH: { severity: 'warning', title: 'Name differs from APAAR record', fix: 'Correct the spelling to match the APAAR record, or ask the student to update it.' },
  DOB_MISMATCH: { severity: 'warning', title: 'Date of birth differs from APAAR record', fix: 'Verify against the SSC certificate.' },
  NATIONALITY: { severity: 'warning', title: 'Foreign national marked with Indian nationality', fix: 'Correct the nationality or the quota.' },
}

const REQUIRED_FIELDS = ['apaar_id', 'student_name', 'date_of_birth', 'programme_code', 'seat_type', 'quota']

function ageOn(dob, ref = new Date('2026-08-01')) {
  const d = new Date(dob)
  let age = ref.getFullYear() - d.getFullYear()
  const m = ref.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && ref.getDate() < d.getDate())) age--
  return age
}

function validIsoDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

const norm = (s = '') => s.toLowerCase().replace(/\s+/g, ' ').trim()

// `conflicts` in the result is for the server only (to alert AICTE). The API layer
// strips it before the result reaches the college, which never learns where else
// a student is enrolled.
export function validateRows(rows, { institution, programmes }) {
  const issues = []
  const conflicts = []
  const progByCode = Object.fromEntries(programmes.map((p) => [p.code, p]))
  const seen = new Map()
  const counts = Object.fromEntries(programmes.map((p) => [p.code, { regular: 0, supernumerary: 0 }]))

  const add = (row, rule, field, detail) => {
    issues.push({
      id: `${row.__row}-${rule}`,
      row: row.__row,
      apaar: row.apaar_id,
      name: row.student_name || '—',
      programme: row.programme_code,
      field,
      rule,
      severity: RULES[rule].severity,
      title: RULES[rule].title,
      detail,
      fix: RULES[rule].fix,
    })
  }

  for (const row of rows) {
    for (const f of REQUIRED_FIELDS) {
      if (!row[f]) add(row, 'REQUIRED', f, `“${f}” is empty.`)
    }

    const id = row.apaar_id || ''
    let idUsable = false
    if (id) {
      if (!/^\d{12}$/.test(id)) {
        add(row, 'APAAR_FORMAT', 'apaar_id', `Found ${id.length} characters${/\D/.test(id) ? ', including non-digits' : ''}.`)
      } else if (seen.has(id)) {
        add(row, 'DUPLICATE_IN_FILE', 'apaar_id', `Same APAAR ID already appears in row ${seen.get(id)}.`)
      } else {
        seen.set(id, row.__row)
        const rec = apaarRegistry.lookup(id)
        if (!rec) {
          add(row, 'APAAR_NOT_FOUND', 'apaar_id', 'The registry returned no record for this ID.')
        } else {
          idUsable = true
          const elsewhere = apaarRegistry.activeElsewhere(id, institution.code)
          if (elsewhere) {
            add(row, 'ACTIVE_ELSEWHERE', 'apaar_id', 'This student is actively enrolled at another AICTE-approved institution this year.')
            conflicts.push({ apaar: id, name: rec.name, programme: row.programme_code, withCode: elsewhere.institutionCode })
          }
          if (row.student_name && norm(rec.name) !== norm(row.student_name)) {
            add(row, 'NAME_MISMATCH', 'student_name', `APAAR record says “${rec.name}”.`)
          }
          if (row.date_of_birth && validIsoDate(row.date_of_birth) && rec.dob !== row.date_of_birth) {
            add(row, 'DOB_MISMATCH', 'date_of_birth', `APAAR record says ${rec.dob}.`)
          }
        }
      }
    }

    if (row.date_of_birth) {
      if (!validIsoDate(row.date_of_birth)) {
        add(row, 'DATE_FORMAT', 'date_of_birth', `“${row.date_of_birth}” is not a valid date.`)
      } else {
        const age = ageOn(row.date_of_birth)
        const pg = row.programme_code === 'MCA' || row.programme_code === 'MBA'
        const [min, max] = pg ? [20, 45] : [16, 30]
        if (age < min || age > max) add(row, 'AGE_RANGE', 'date_of_birth', `Student would be ${age} years old at admission.`)
      }
    }

    if (row.quota === 'NRI' && !row.nri_document_ref) {
      add(row, 'NRI_DOC', 'nri_document_ref', 'NRI quota selected but no document reference given.')
    }
    if (row.quota === 'Foreign National' && norm(row.nationality) === 'indian') {
      add(row, 'NATIONALITY', 'nationality', 'Quota is Foreign National but nationality is Indian.')
    }

    const prog = progByCode[row.programme_code]
    if (row.programme_code && !prog) {
      add(row, 'PROGRAMME_UNKNOWN', 'programme_code', `“${row.programme_code}” is not on the approved list.`)
    }

    // Intake counting: only rows that represent a real, distinct student.
    if (prog && idUsable) {
      const c = counts[prog.code]
      if (row.seat_type === 'Supernumerary') {
        c.supernumerary++
        if (c.supernumerary > prog.supernumerary) {
          add(row, 'SUPERNUMERARY_EXCEEDED', 'seat_type', `Supernumerary seat ${c.supernumerary} of ${prog.supernumerary} allowed.`)
        }
      } else {
        c.regular++
        if (c.regular > prog.sanctioned) {
          add(row, 'INTAKE_EXCEEDED', 'seat_type', `Regular seat ${c.regular} of ${prog.sanctioned} sanctioned.`)
        }
      }
    }
  }

  const errorRows = new Set(issues.filter((i) => i.severity === 'error').map((i) => i.row))
  const warningRows = new Set(issues.filter((i) => i.severity === 'warning').map((i) => i.row))

  return {
    issues,
    conflicts,
    total: rows.length,
    validRows: rows.length - errorRows.size,
    errorCount: issues.filter((i) => i.severity === 'error').length,
    warningCount: issues.filter((i) => i.severity === 'warning').length,
    errorRows: errorRows.size,
    warningRows: warningRows.size,
    intake: programmes.map((p) => ({
      code: p.code,
      name: p.name,
      sanctioned: p.sanctioned,
      supernumeraryAllowed: p.supernumerary,
      regular: counts[p.code].regular,
      supernumeraryUsed: counts[p.code].supernumerary,
    })),
  }
}

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
