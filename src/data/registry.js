// Mock APAAR registry + synthetic student roster.
//
// The real APAAR / ABC registry API isn't publicly accessible, so the app talks
// to it only through `apaarRegistry` below. In production, swap `MockApaarRegistry`
// for an HTTP client with the same two methods; nothing else in the app changes.

import { MY_INSTITUTION, MY_PROGRAMMES } from './mock.js'

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

function pad(n) {
  return String(n).padStart(2, '0')
}

function makeId(rand) {
  let s = String(1 + Math.floor(rand() * 9))
  for (let i = 0; i < 11; i++) s += Math.floor(rand() * 10)
  return s
}

function makePerson(rand, programmeCode) {
  const female = rand() < 0.45
  const first = (female ? FIRST_F : FIRST_M)[Math.floor(rand() * 20)]
  const last = LAST[Math.floor(rand() * LAST.length)]
  const pg = programmeCode === 'MCA'
  const year = pg ? 2003 + Math.floor(rand() * 2) : 2007 + Math.floor(rand() * 2)
  const dob = `${year}-${pad(1 + Math.floor(rand() * 12))}-${pad(1 + Math.floor(rand() * 28))}`
  return { name: `${first} ${last}`, gender: female ? 'F' : 'M', dob }
}

// Students admitted to MY_INSTITUTION this year (clean roster).
const ROSTER_PLAN = [
  { code: 'BTECH-CE', regular: 174, supernumerary: 3 },
  { code: 'BTECH-IT', regular: 116, supernumerary: 2 },
  { code: 'BTECH-EXTC', regular: 54, supernumerary: 0 },
  { code: 'MCA', regular: 58, supernumerary: 1 },
]

function buildRoster() {
  const rand = mulberry32(26263)
  const used = new Set()
  const rows = []
  for (const plan of ROSTER_PLAN) {
    const total = plan.regular + plan.supernumerary
    for (let i = 0; i < total; i++) {
      let id = makeId(rand)
      while (used.has(id)) id = makeId(rand)
      used.add(id)
      const p = makePerson(rand, plan.code)
      const r = rand()
      const quota = r < 0.04 ? 'NRI' : r < 0.06 ? 'Foreign National' : r < 0.07 ? 'OCI' : 'Merit'
      rows.push({
        apaar_id: id,
        student_name: p.name,
        date_of_birth: p.dob,
        gender: p.gender,
        programme_code: plan.code,
        admission_year: '2026',
        seat_type: i < plan.regular ? 'Regular' : 'Supernumerary',
        quota,
        nationality: quota === 'Foreign National' ? ['Nepal', 'Bangladesh', 'Sri Lanka'][Math.floor(rand() * 3)] : 'Indian',
        oci_status: quota === 'OCI' ? 'Y' : 'N',
        nri_document_ref: quota === 'NRI' ? `NRI-DOC-${Math.floor(10000 + rand() * 89999)}` : '',
      })
    }
  }
  return rows
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

const ROSTER = buildRoster()

// Students already actively enrolled at other institutions this year.
const ELSEWHERE = [
  { apaar_id: '482190123847', name: 'Rahul Kulkarni', dob: '2007-05-14', institution: 'Sardar Patel College of Engineering, Mumbai' },
  { apaar_id: '561203948817', name: 'Omkar Jadhav', dob: '2008-01-22', institution: 'Deccan Valley College of Engineering, Pune' },
  { apaar_id: '617730284451', name: 'Fatima Khan', dob: '2007-11-03', institution: 'Narmada Institute of Technology, Indore' },
]

const REGISTRY = new Map()
for (const r of ROSTER) {
  REGISTRY.set(r.apaar_id, { name: r.student_name, dob: r.date_of_birth, activeAt: null })
}
for (const e of ELSEWHERE) {
  REGISTRY.set(e.apaar_id, { name: e.name, dob: e.dob, activeAt: e.institution })
}
// The demo student used on the profile and verifier screens.
REGISTRY.set('739428105621', { name: 'Priya Deshmukh', dob: '2005-03-18', activeAt: `${MY_INSTITUTION.name}, ${MY_INSTITUTION.city}` })

class MockApaarRegistry {
  // Returns null when the APAAR ID doesn't exist.
  lookup(apaarId) {
    return REGISTRY.get(apaarId) ?? null
  }
  // Institution where this APAAR ID is currently active, excluding `selfName`.
  activeElsewhere(apaarId, selfName) {
    const rec = REGISTRY.get(apaarId)
    if (!rec?.activeAt || rec.activeAt.startsWith(selfName)) return null
    return rec.activeAt
  }
}

export const apaarRegistry = new MockApaarRegistry()

// ---------- Sample upload files ----------

export function sampleRowsClean() {
  return ROSTER.map((r) => ({ ...r }))
}

export function sampleRowsWithIssues() {
  const rows = sampleRowsClean()
  const rand = mulberry32(42)
  const ceIdx = rows.map((r, i) => (r.programme_code === 'BTECH-CE' ? i : -1)).filter((i) => i >= 0)

  // 1. Invalid APAAR formats
  rows[ceIdx[41]].apaar_id = '8492102948' // 10 digits
  rows[ceIdx[77]].apaar_id = '73049281055213' // 14 digits
  rows[ceIdx[120]].apaar_id = '9102A8417729' // contains a letter

  // 2. Missing required data
  rows[ceIdx[33]].student_name = ''
  rows[ceIdx[150]].date_of_birth = '31/02/2008'

  // 3. Implausible age
  rows[ceIdx[60]].date_of_birth = '2015-08-14'

  // 4. NRI quota without document
  const nriA = rows.find((r) => r.programme_code === 'BTECH-EXTC')
  nriA.quota = 'NRI'
  nriA.nri_document_ref = ''
  const nriB = rows.find((r) => r.programme_code === 'BTECH-IT' && r.quota === 'Merit')
  nriB.quota = 'NRI'
  nriB.nri_document_ref = ''

  // 5. Foreign national marked as Indian (warning)
  const fn = rows.find((r) => r.programme_code === 'MCA' && r.quota === 'Merit')
  fn.quota = 'Foreign National'
  fn.nationality = 'Indian'

  // 6. Name / DOB differ from registry (warnings)
  rows[ceIdx[12]].student_name = rows[ceIdx[12]].student_name.replace(/a/, 'aa')
  const it = rows.filter((r) => r.programme_code === 'BTECH-IT')
  it[20].date_of_birth = '2006-12-30'
  it[45].student_name = it[45].student_name.split(' ').reverse().join(' ')

  // 7. Unknown programme code
  it[70].programme_code = 'BTECH-AIML'

  const extra = []
  // 8. Duplicates within the file
  extra.push({ ...rows[ceIdx[63]] })
  extra.push({ ...it[10] })

  // 9. Already enrolled elsewhere (cross-institution duplicates)
  for (const e of ELSEWHERE) {
    extra.push({
      apaar_id: e.apaar_id,
      student_name: e.name,
      date_of_birth: e.dob,
      gender: e.name.startsWith('Fatima') ? 'F' : 'M',
      programme_code: 'BTECH-CE',
      admission_year: '2026',
      seat_type: 'Regular',
      quota: 'Merit',
      nationality: 'Indian',
      oci_status: 'N',
      nri_document_ref: '',
    })
  }

  // 10. IDs that don't exist in the registry
  extra.push({ ...rows[ceIdx[5]], apaar_id: '999912345678', student_name: 'Harsh Mehta' })
  extra.push({ ...rows[ceIdx[6]], apaar_id: '999987654321', student_name: 'Tanvi Rao' })

  // 11. More regular CE admissions than sanctioned (174 clean + 12 extra = 186 of 180)
  for (let i = 0; i < 12; i++) {
    let id = makeId(rand)
    while (REGISTRY.has(id)) id = makeId(rand)
    // Register the ID so these rows only trip the intake rule
    const p = makePerson(rand, 'BTECH-CE')
    REGISTRY.set(id, { name: p.name, dob: p.dob, activeAt: null })
    extra.push({
      apaar_id: id,
      student_name: p.name,
      date_of_birth: p.dob,
      gender: p.gender,
      programme_code: 'BTECH-CE',
      admission_year: '2026',
      seat_type: 'Regular',
      quota: 'Merit',
      nationality: 'Indian',
      oci_status: 'N',
      nri_document_ref: '',
    })
  }

  return [...rows, ...extra]
}

export { MY_PROGRAMMES }
