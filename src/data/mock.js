import { DEMO_INSTITUTIONS } from './institutions.js'

// Synthetic data for the prototype. Every institution below is fictional:
// real college names should never appear next to "breach" or "anomaly" flags in a demo.

export const ACADEMIC_YEAR = 'AY 2026–27'

export const PROGRAMMES = ['All', 'B.Tech / B.E.', 'MBA / PGDM', 'MCA', 'Diploma']

// Share of each region's sanctioned intake by programme, and the enrolment ratio
// observed for that programme (enrolled / sanctioned).
const REGION_BASE = [
  { id: 'west', name: 'Western', states: 'Maharashtra, Goa, Gujarat', sanctioned: 540000, ratio: [1.041, 1.012, 0.981, 1.064] },
  { id: 'south', name: 'Southern', states: 'Tamil Nadu, Karnataka, Kerala, Andhra Pradesh, Telangana', sanctioned: 680000, ratio: [0.962, 0.948, 0.97, 0.958] },
  { id: 'north', name: 'Northern', states: 'Uttar Pradesh, Punjab, Haryana, Delhi, Uttarakhand', sanctioned: 410000, ratio: [0.956, 0.93, 0.944, 0.91] },
  { id: 'east', name: 'Eastern', states: 'West Bengal, Odisha, Bihar, Jharkhand', sanctioned: 220000, ratio: [1.038, 0.972, 1.012, 1.054] },
  { id: 'central', name: 'Central', states: 'Madhya Pradesh, Chhattisgarh, Rajasthan', sanctioned: 195000, ratio: [0.962, 0.91, 0.94, 0.981] },
  { id: 'ne', name: 'North-Eastern', states: 'Assam and 7 other states', sanctioned: 45000, ratio: [0.851, 0.82, 0.86, 0.879] },
]
const PROGRAMME_SHARE = [0.62, 0.17, 0.08, 0.13] // B.Tech, MBA, MCA, Diploma

export function regionStats(programme = 'All') {
  return REGION_BASE.map((r) => {
    const parts = PROGRAMME_SHARE.map((share, i) => {
      const sanctioned = Math.round((r.sanctioned * share) / 10) * 10
      const enrolled = Math.round((sanctioned * r.ratio[i]) / 10) * 10
      return { sanctioned, enrolled }
    })
    const idx = PROGRAMMES.indexOf(programme) - 1
    const pick = idx >= 0 ? [parts[idx]] : parts
    const sanctioned = pick.reduce((a, p) => a + p.sanctioned, 0)
    const enrolled = pick.reduce((a, p) => a + p.enrolled, 0)
    return { ...r, sanctioned, enrolled }
  })
}

export const KPIS = {
  studentsRegistered: 1842310,
  studentsThisCycle: 142890,
  apaarValidPct: 98.1,
  institutionsReporting: 3214,
  institutionsTotal: 3450,
  reportingDue: '15 Nov 2026',
  intakeBreaches: 47,
  excessSeats: 3412,
  openAnomalies: 1286,
  anomalyStates: 28,
  crossInstitutionDuplicates: 712,
}

export const ANOMALY_TYPES = {
  dual: 'Cross-institution duplicate',
  intake: 'Intake exceeded',
  invalid: 'Invalid APAAR ID',
  inconsistent: 'Data inconsistency',
  concurrent: 'Concurrent full-time enrolment',
}

export const ANOMALIES = [
  {
    id: 'ANM-26-04812',
    severity: 'critical',
    type: 'dual',
    summary: 'Same APAAR ID actively enrolled at 2 institutions',
    institution: 'Deccan Valley College of Engineering',
    code: 'C-33821',
    city: 'Pune',
    region: 'Western',
    affected: 142,
    detected: '2026-10-23T09:24:00+05:30',
    evidence: [
      '142 APAAR IDs submitted by this institution are also active at Narmada Institute of Technology, Indore (C-41209).',
      'Both submissions list the students as full-time, regular intake for AY 2026–27.',
      'Example: APAAR 4821 9012 3847 — admitted 02 Aug 2026 (Pune) and 19 Aug 2026 (Indore).',
    ],
  },
  {
    id: 'ANM-26-04790',
    severity: 'high',
    type: 'intake',
    summary: '+38 seats beyond sanctioned intake',
    institution: 'Konkan Coast Institute of Technology',
    code: 'C-26914',
    city: 'Ratnagiri',
    region: 'Western',
    affected: 38,
    detected: '2026-10-22T16:12:00+05:30',
    evidence: [
      'B.Tech Computer Engineering: sanctioned 180, regular admissions uploaded 218.',
      'No supernumerary category declared for the 38 extra students.',
    ],
  },
  {
    id: 'ANM-26-04655',
    severity: 'high',
    type: 'invalid',
    summary: 'APAAR IDs not found in the national registry',
    institution: 'Hooghly Riverside Engineering College',
    code: 'C-6228',
    city: 'Kolkata',
    region: 'Eastern',
    affected: 89,
    detected: '2026-10-08T11:05:00+05:30',
    evidence: [
      '89 IDs are 12 digits long but return "not found" from the APAAR registry lookup.',
      '61 of them share the prefix 9999, suggesting placeholder values.',
    ],
  },
  {
    id: 'ANM-26-04611',
    severity: 'medium',
    type: 'inconsistent',
    summary: 'Name and date of birth differ from APAAR record',
    institution: 'Kaveri Institute of Engineering',
    code: 'C-1294',
    city: 'Bengaluru',
    region: 'Southern',
    affected: 24,
    detected: '2026-10-07T14:40:00+05:30',
    evidence: [
      '24 records: date of birth differs from the APAAR registry by more than 30 days.',
      '9 of these also have a different father’s name spelling.',
    ],
  },
  {
    id: 'ANM-26-04588',
    severity: 'high',
    type: 'concurrent',
    summary: 'Full-time B.Tech and full-time Diploma at once',
    institution: 'Shivalik Group of Colleges',
    code: 'C-10331',
    city: 'Mohali',
    region: 'Northern',
    affected: 19,
    detected: '2026-10-06T10:18:00+05:30',
    evidence: [
      '19 students are registered as full-time in B.Tech (Shivalik) and a full-time Diploma programme elsewhere.',
    ],
  },
  {
    id: 'ANM-26-04530',
    severity: 'medium',
    type: 'intake',
    summary: 'Supernumerary seats exceed allowed quota',
    institution: 'Godavari Institute of Management',
    code: 'C-8812',
    city: 'Rajahmundry',
    region: 'Southern',
    affected: 7,
    detected: '2026-10-05T12:30:00+05:30',
    evidence: ['MBA: supernumerary (TFWS) admissions 13 against an allowed 6.'],
  },
  {
    id: 'ANM-26-04477',
    severity: 'critical',
    type: 'dual',
    summary: 'Same APAAR ID at 3 institutions in one state',
    institution: 'Malwa Technical Campus',
    code: 'C-40188',
    city: 'Ujjain',
    region: 'Central',
    affected: 31,
    detected: '2026-10-04T18:02:00+05:30',
    evidence: ['31 APAAR IDs are active at Malwa Technical Campus and 2 other institutions in Madhya Pradesh.'],
  },
]

export const INTAKE_VIOLATORS = [
  { name: 'Konkan Coast Institute of Technology', city: 'Ratnagiri', programme: 'B.Tech CS', sanctioned: 180, uploaded: 218 },
  { name: 'Aravalli Institute of Technology', city: 'Jaipur', programme: 'B.Tech Mechanical', sanctioned: 120, uploaded: 141 },
  { name: 'Yamuna Global Institute', city: 'Greater Noida', programme: 'MCA', sanctioned: 60, uploaded: 69 },
  { name: 'Penna Engineering College', city: 'Nellore', programme: 'Diploma Electronics', sanctioned: 240, uploaded: 268 },
  { name: 'Mahanadi Institute of Technology', city: 'Bhubaneswar', programme: 'B.Tech IT', sanctioned: 180, uploaded: 199 },
]

// The student used on the student portal and verifier is enrolled here.
const STUDENT_INSTITUTION = DEMO_INSTITUTIONS[0]

export const STUDENT = {
  name: 'Priya Deshmukh',
  apaarId: '739428105621',
  abcId: 'ABC-489-102-4829',
  enrolmentNo: '2023-KIET-CE-0419',
  institution: STUDENT_INSTITUTION.name,
  institutionCity: STUDENT_INSTITUTION.city,
  aictePid: STUDENT_INSTITUTION.aictePid,
  programme: 'B.Tech Computer Engineering',
  duration: '4-year, full-time',
  batch: '2023–2027',
  semester: 'Semester VII',
  admissionYear: 2023,
  quota: 'Merit (CAP Round 1)',
  category: 'General',
  status: 'Active',
  credits: 128,
}

export const VERIFIER_ORGS = [
  { id: 'infosys', name: 'Infosys Ltd.' },
  { id: 'tcs', name: 'Tata Consultancy Services' },
  { id: 'lnt', name: 'L&T Technology Services' },
  { id: 'wipro', name: 'Wipro Ltd.' },
]

export const INITIAL_GRANTS = [
  {
    id: 'g-infosys',
    orgId: 'infosys',
    org: 'Infosys Ltd.',
    purpose: 'Campus placement background verification',
    scope: ['Enrolment status', 'Programme & batch'],
    expires: '2026-11-30',
    status: 'active',
  },
  {
    id: 'g-tcs',
    orgId: 'tcs',
    org: 'Tata Consultancy Services',
    purpose: 'National Qualifier Test profile match',
    scope: ['Enrolment status'],
    expires: '2027-01-15',
    status: 'active',
  },
  {
    id: 'g-aicte',
    orgId: 'aicte',
    org: 'AICTE',
    purpose: 'Statutory intake and approval monitoring',
    scope: ['Enrolment record', 'Intake category'],
    expires: null,
    status: 'statutory',
  },
  {
    id: 'g-lnt',
    orgId: 'lnt',
    org: 'L&T Technology Services',
    purpose: 'Summer internship onboarding',
    scope: ['Enrolment status'],
    expires: '2026-10-31',
    status: 'revoked',
    revokedOn: '2026-10-14',
  },
]

export const INITIAL_ACTIVITY = [
  { id: 'a1', kind: 'verified', who: 'Tata Consultancy Services', what: 'Scanned your credential QR', result: 'Signature valid, consent active', at: '2026-10-21T15:42:00+05:30' },
  { id: 'a2', kind: 'shared', who: 'Infosys Ltd.', what: 'Opened your shared link', result: 'Enrolment status viewed', at: '2026-10-19T11:15:00+05:30' },
  { id: 'a3', kind: 'statutory', who: 'AICTE', what: 'Annual intake verification', result: 'Matched sanctioned regular seat', at: '2026-10-01T09:00:00+05:30' },
  { id: 'a4', kind: 'blocked', who: 'Unregistered requester', what: 'Tried to open your record', result: 'Rejected: no consent on file', at: '2026-09-28T16:12:00+05:30' },
]
