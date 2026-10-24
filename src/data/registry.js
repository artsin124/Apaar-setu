// Mock APAAR registry + synthetic student rosters for the demo colleges.
//
// The real APAAR / ABC registry API isn't publicly accessible, so the app talks
// to it only through `apaarRegistry` below. In production, swap `MockApaarRegistry`
// for an HTTP client with the same methods; nothing else in the app changes.

import { DEMO_INSTITUTIONS } from './institutions.js'
import { submittedAt } from './store.js'

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FIRST_F = ['Priya', 'Ananya', 'Sneha', 'Aditi', 'Pooja', 'Riya', 'Kavya', 'Isha', 'Neha', 'Tanvi', 'Shruti', 'Meera', 'Sakshi', 'Divya', 'Aarti', 'Nikita', 'Gauri', 'Sanika', 'Mrunal', 'Fatima']
const FIRST_M = ['Rahul', 'Aakash', 'Rohan', 'Vikramaditya', 'Arjun', 'Siddharth', 'Omkar', 'Pranav', 'Yash', 'Aditya', 'Kunal', 'Harsh', 'Tejas', 'Nikhil', 'Sahil', 'Atharva', 'Varun', 'Irfan', 'Manav', 'Karan']
const LAST = ['Deshmukh', 'Kulkarni', 'Verma', 'Iyer', 'Shinde', 'Mukherjee', 'Joshi', 'Patil', 'Pawar', 'Naik', 'Gupta', 'Sharma', 'Reddy', 'Nair', 'Jadhav', 'More', 'Bhosale', 'Khan', 'Fernandes', 'Chavan', 'Sawant', 'Gaikwad', 'Mehta', 'Rao']

const pad = (n) => String(n).padStart(2, '0')
const isPg = (code) => code === 'MCA' || code === 'MBA'

function makeId(rand) {
  let s = String(1 + Math.floor(rand() * 9))
  for (let i = 0; i < 11; i++) s += Math.floor(rand() * 10)
  return s
}

function makePerson(rand, programmeCode) {
  const female = rand() < 0.45
  const first = (female ? FIRST_F : FIRST_M)[Math.floor(rand() * 20)]
  const last = LAST[Math.floor(rand() * LAST.length)]
  const year = isPg(programmeCode) ? 2003 + Math.floor(rand() * 2) : 2007 + Math.floor(rand() * 2)
  const dob = `${year}-${pad(1 + Math.floor(rand() * 12))}-${pad(1 + Math.floor(rand() * 28))}`
  return { name: `${first} ${last}`, gender: female ? 'F' : 'M', dob }
}

function makeRow(rand, id, person, programmeCode, seatType, quota = 'Merit') {
  return {
    apaar_id: id,
    student_name: person.name,
    date_of_birth: person.dob,
    gender: person.gender,
    programme_code: programmeCode,
    admission_year: '2026',
    seat_type: seatType,
    quota,
    nationality: quota === 'Foreign National' ? ['Nepal', 'Bangladesh', 'Sri Lanka'][Math.floor(rand() * 3)] : 'Indian',
    oci_status: quota === 'OCI' ? 'Y' : 'N',
    nri_document_ref: quota === 'NRI' ? `NRI-DOC-${Math.floor(10000 + rand() * 89999)}` : '',
  }
}

export const CSV_HEADERS = [
  'apaar_id',
  'student_name',
  'date_of_birth',
  'gender',
  'programme_code',
  'admission_year',
  'seat_type',
  'quota',
  'nationality',
  'oci_status',
  'nri_document_ref',
]

const REGISTRY = new Map()
const USED = new Set()

function freshId(rand) {
  let id = makeId(rand)
  while (USED.has(id)) id = makeId(rand)
  USED.add(id)
  return id
}

// Students who applied to two demo colleges and appear in both colleges' lists.
// Whichever college submits first "wins"; the other one gets the duplicate error.
const OVERLAPS = [
  { from: 'C-49270', to: 'C-51882', programme: 'BTECH-CE', toProgramme: 'BTECH-CE', count: 3 },
  { from: 'C-49270', to: 'C-38815', programme: 'MCA', toProgramme: 'MCA', count: 2 },
]

function buildRosters() {
  const rosters = {}
  for (const inst of DEMO_INSTITUTIONS) {
    const rand = mulberry32(inst.seed)
    const rows = []
    for (const p of inst.programmes) {
      const shared = OVERLAPS.filter((o) => o.to === inst.code && o.toProgramme === p.code).reduce((n, o) => n + o.count, 0)
      const total = p.admitted - shared + p.superAdmitted
      for (let i = 0; i < total; i++) {
        const r = rand()
        const quota = r < 0.04 ? 'NRI' : r < 0.06 ? 'Foreign National' : r < 0.07 ? 'OCI' : 'Merit'
        rows.push(makeRow(rand, freshId(rand), makePerson(rand, p.code), p.code, i < p.admitted - shared ? 'Regular' : 'Supernumerary', quota))
      }
    }
    rosters[inst.code] = rows
  }
  // Copy shared applicants into the second college's list (as regular Merit seats)
  for (const o of OVERLAPS) {
    const src = rosters[o.from].filter((r) => r.programme_code === o.programme && r.seat_type === 'Regular' && r.quota === 'Merit')
    const picks = src.slice(-o.count).map((r) => ({ ...r, programme_code: o.toProgramme }))
    const dest = rosters[o.to]
    const at = dest.findIndex((r) => r.programme_code === o.toProgramme && r.seat_type === 'Supernumerary')
    dest.splice(at < 0 ? dest.length : at, 0, ...picks)
  }
  for (const rows of Object.values(rosters)) {
    for (const r of rows) REGISTRY.set(r.apaar_id, { name: r.student_name, dob: r.date_of_birth, activeAt: null })
  }
  return rosters
}

const ROSTERS = buildRosters()

// Students already actively enrolled at institutions outside the demo.
const ELSEWHERE = [
  { apaar_id: '482190123847', name: 'Rahul Kulkarni', dob: '2007-05-14', gender: 'M' },
  { apaar_id: '561203948817', name: 'Omkar Jadhav', dob: '2008-01-22', gender: 'M' },
  { apaar_id: '617730284451', name: 'Fatima Khan', dob: '2007-11-03', gender: 'F' },
]
for (const e of ELSEWHERE) REGISTRY.set(e.apaar_id, { name: e.name, dob: e.dob, activeAt: 'external' })

// The demo student used on the profile and verifier screens.
REGISTRY.set('739428105621', { name: 'Priya Deshmukh', dob: '2005-03-18', activeAt: 'C-49270' })

class MockApaarRegistry {
  // Returns null when the APAAR ID doesn't exist.
  lookup(apaarId) {
    return REGISTRY.get(apaarId) ?? null
  }

  // Is this student actively enrolled at another institution this year?
  // Returns { institutionCode } or null. The code is for AICTE's records only and
  // is never shown to the uploading college.
  activeElsewhere(apaarId, myCode) {
    const rec = REGISTRY.get(apaarId)
    if (rec?.activeAt && rec.activeAt !== myCode) {
      return { institutionCode: rec.activeAt === 'external' ? null : rec.activeAt }
    }
    const code = submittedAt(apaarId)
    if (code && code !== myCode) return { institutionCode: code }
    return null
  }
}

export const apaarRegistry = new MockApaarRegistry()

// ---------- Sample upload files ----------

export function sampleRowsClean(code) {
  return (ROSTERS[code] ?? []).map((r) => ({ ...r }))
}

export function sampleRowsWithIssues(code) {
  const inst = DEMO_INSTITUTIONS.find((i) => i.code === code)
  const rows = sampleRowsClean(code)
  const rand = mulberry32(inst.seed + 7)
  const [main, second, ...rest] = inst.programmes
  const last = rest.at(-1) ?? second
  const of = (p) => rows.filter((r) => r.programme_code === p.code)
  const mainRows = of(main)
  const at = (f) => mainRows[Math.floor(mainRows.length * f)]

  // 1. Invalid APAAR formats
  at(0.24).apaar_id = '8492102948' // 10 digits
  at(0.44).apaar_id = '73049281055213' // 14 digits
  at(0.69).apaar_id = '9102A8417729' // contains a letter

  // 2. Missing or malformed data
  at(0.19).student_name = ''
  at(0.86).date_of_birth = '31/02/2008'

  // 3. Implausible age
  at(0.34).date_of_birth = '2015-08-14'

  // 4. NRI quota without document
  for (const p of [second, last]) {
    const r = of(p).find((x) => x.quota === 'Merit')
    if (r) {
      r.quota = 'NRI'
      r.nri_document_ref = ''
    }
  }

  // 5. Foreign national marked as Indian (warning)
  const fn = of(last).filter((r) => r.quota === 'Merit')[3]
  if (fn) {
    fn.quota = 'Foreign National'
    fn.nationality = 'Indian'
  }

  // 6. Name / DOB differ from registry (warnings)
  const nm = at(0.07)
  nm.student_name = nm.student_name.replace(/a/, 'aa')
  const sec = of(second)
  sec[Math.floor(sec.length * 0.3)].date_of_birth = isPg(second.code) ? '2002-12-30' : '2006-12-30'
  const swap = sec[Math.floor(sec.length * 0.5)]
  swap.student_name = swap.student_name.split(' ').reverse().join(' ')

  // 7. Programme not approved for this institution
  sec[Math.floor(sec.length * 0.7)].programme_code = 'BTECH-AIML'

  const extra = []
  // 8. Duplicates within the file
  extra.push({ ...at(0.36) })
  extra.push({ ...sec[Math.floor(sec.length * 0.1)] })

  // 9. Already enrolled at an institution outside the demo
  for (const e of ELSEWHERE) {
    extra.push(makeRow(rand, e.apaar_id, e, main.code, 'Regular'))
  }

  // 10. IDs that don't exist in the registry
  extra.push({ ...at(0.03), apaar_id: '999912345678', student_name: 'Harsh Mehta' })
  extra.push({ ...at(0.04), apaar_id: '999987654321', student_name: 'Tanvi Rao' })

  // 11. More regular admissions than sanctioned in the main programme
  const over = main.sanctioned - main.admitted + 6
  for (let i = 0; i < over; i++) {
    const id = freshId(rand)
    const p = makePerson(rand, main.code)
    REGISTRY.set(id, { name: p.name, dob: p.dob, activeAt: null })
    extra.push(makeRow(rand, id, p, main.code, 'Regular'))
  }

  return [...rows, ...extra]
}
