// Institutions in the prototype. All names are fictional.
//
// `demo: true` institutions have a sign-in account and a generated student roster,
// so their numbers on AICTE's screens update live when they submit data.
// The rest are static entries that fill out AICTE's national register.

export const DEMO_INSTITUTIONS = [
  {
    code: 'C-49270',
    aictePid: '1-1049281',
    name: 'Konkan Institute of Engineering & Technology',
    shortName: 'KIET',
    slug: 'kiet',
    city: 'Navi Mumbai',
    state: 'Maharashtra',
    region: 'Western',
    type: 'Private, unaided',
    officer: 'Dr. Rajeshwar Patil',
    officerRole: 'Registrar, nodal officer',
    seed: 26263,
    programmes: [
      { code: 'BTECH-CE', name: 'B.Tech Computer Engineering', sanctioned: 180, supernumerary: 9, admitted: 174, superAdmitted: 3 },
      { code: 'BTECH-IT', name: 'B.Tech Information Technology', sanctioned: 120, supernumerary: 6, admitted: 116, superAdmitted: 2 },
      { code: 'BTECH-EXTC', name: 'B.Tech Electronics & Telecommunication', sanctioned: 60, supernumerary: 3, admitted: 54, superAdmitted: 0 },
      { code: 'MCA', name: 'Master of Computer Applications', sanctioned: 60, supernumerary: 3, admitted: 58, superAdmitted: 1 },
    ],
  },
  {
    code: 'C-51882',
    aictePid: '1-1082214',
    name: 'Sahyadri College of Engineering',
    shortName: 'SCE',
    slug: 'sce',
    city: 'Pune',
    state: 'Maharashtra',
    region: 'Western',
    type: 'Private, unaided',
    officer: 'Prof. Meera Kulkarni',
    officerRole: 'Principal, nodal officer',
    seed: 51882,
    programmes: [
      { code: 'BTECH-CE', name: 'B.Tech Computer Engineering', sanctioned: 120, supernumerary: 6, admitted: 112, superAdmitted: 2 },
      { code: 'BTECH-MECH', name: 'B.Tech Mechanical Engineering', sanctioned: 60, supernumerary: 3, admitted: 47, superAdmitted: 0 },
      { code: 'BTECH-CIVIL', name: 'B.Tech Civil Engineering', sanctioned: 60, supernumerary: 3, admitted: 39, superAdmitted: 1 },
    ],
  },
  {
    code: 'C-43107',
    aictePid: '1-1031776',
    name: 'Tapti Valley Institute of Technology',
    shortName: 'TVIT',
    slug: 'tvit',
    city: 'Jalgaon',
    state: 'Maharashtra',
    region: 'Western',
    type: 'Government-aided',
    officer: 'Dr. Sunil Bhosale',
    officerRole: 'Director, nodal officer',
    seed: 43107,
    programmes: [
      { code: 'BTECH-IT', name: 'B.Tech Information Technology', sanctioned: 60, supernumerary: 3, admitted: 58, superAdmitted: 1 },
      { code: 'BTECH-EE', name: 'B.Tech Electrical Engineering', sanctioned: 60, supernumerary: 3, admitted: 51, superAdmitted: 0 },
      { code: 'DIP-ME', name: 'Diploma in Mechanical Engineering', sanctioned: 120, supernumerary: 6, admitted: 106, superAdmitted: 2 },
    ],
  },
  {
    code: 'C-38815',
    aictePid: '1-1019940',
    name: 'Godavari College of Management Studies',
    shortName: 'GCMS',
    slug: 'gcms',
    city: 'Nashik',
    state: 'Maharashtra',
    region: 'Western',
    type: 'Private, unaided',
    officer: 'Dr. Anjali Deshpande',
    officerRole: 'Director, nodal officer',
    seed: 38815,
    programmes: [
      { code: 'MBA', name: 'Master of Business Administration', sanctioned: 120, supernumerary: 6, admitted: 117, superAdmitted: 2 },
      { code: 'MCA', name: 'Master of Computer Applications', sanctioned: 60, supernumerary: 3, admitted: 55, superAdmitted: 0 },
    ],
  },
]

// Institutions that only appear on AICTE's screens.
// `submitted` is an ISO date, or null if the institution hasn't submitted yet.
export const OTHER_INSTITUTIONS = [
  { code: 'C-33821', name: 'Deccan Valley College of Engineering', city: 'Pune', state: 'Maharashtra', region: 'Western', type: 'Private, unaided', sanctioned: 540, enrolled: 552, submitted: '2026-10-12' },
  { code: 'C-26914', name: 'Konkan Coast Institute of Technology', city: 'Ratnagiri', state: 'Maharashtra', region: 'Western', type: 'Private, unaided', sanctioned: 360, enrolled: 398, submitted: '2026-10-09' },
  { code: 'C-41209', name: 'Narmada Institute of Technology', city: 'Indore', state: 'Madhya Pradesh', region: 'Central', type: 'Private, unaided', sanctioned: 480, enrolled: 466, submitted: '2026-10-15' },
  { code: 'C-40188', name: 'Malwa Technical Campus', city: 'Ujjain', state: 'Madhya Pradesh', region: 'Central', type: 'Private, unaided', sanctioned: 300, enrolled: 312, submitted: '2026-10-03' },
  { code: 'C-6228', name: 'Hooghly Riverside Engineering College', city: 'Kolkata', state: 'West Bengal', region: 'Eastern', type: 'Private, unaided', sanctioned: 420, enrolled: 431, submitted: '2026-10-07' },
  { code: 'C-35560', name: 'Mahanadi Institute of Technology', city: 'Bhubaneswar', state: 'Odisha', region: 'Eastern', type: 'Private, unaided', sanctioned: 360, enrolled: 379, submitted: '2026-10-11' },
  { code: 'C-1294', name: 'Kaveri Institute of Engineering', city: 'Bengaluru', state: 'Karnataka', region: 'Southern', type: 'Private, unaided', sanctioned: 600, enrolled: 588, submitted: '2026-10-06' },
  { code: 'C-8812', name: 'Godavari Institute of Management', city: 'Rajahmundry', state: 'Andhra Pradesh', region: 'Southern', type: 'Private, unaided', sanctioned: 180, enrolled: 181, submitted: '2026-10-04' },
  { code: 'C-29931', name: 'Penna Engineering College', city: 'Nellore', state: 'Andhra Pradesh', region: 'Southern', type: 'Private, unaided', sanctioned: 480, enrolled: 508, submitted: '2026-10-10' },
  { code: 'C-10331', name: 'Shivalik Group of Colleges', city: 'Mohali', state: 'Punjab', region: 'Northern', type: 'Private, unaided', sanctioned: 660, enrolled: 641, submitted: '2026-10-05' },
  { code: 'C-47716', name: 'Yamuna Global Institute', city: 'Greater Noida', state: 'Uttar Pradesh', region: 'Northern', type: 'Private, unaided', sanctioned: 300, enrolled: 309, submitted: '2026-10-14' },
  { code: 'C-30452', name: 'Aravalli Institute of Technology', city: 'Jaipur', state: 'Rajasthan', region: 'Central', type: 'Private, unaided', sanctioned: 420, enrolled: 441, submitted: '2026-10-08' },
  { code: 'C-22087', name: 'Brahmaputra Valley Engineering College', city: 'Guwahati', state: 'Assam', region: 'North-Eastern', type: 'Government', sanctioned: 360, enrolled: 0, submitted: null },
  { code: 'C-27104', name: 'Thar Desert Polytechnic', city: 'Bikaner', state: 'Rajasthan', region: 'Central', type: 'Government', sanctioned: 240, enrolled: 0, submitted: null },
]

export const REPORTING_DEADLINE = '2026-11-15'

export function findInstitution(code) {
  return DEMO_INSTITUTIONS.find((i) => i.code === code) ?? OTHER_INSTITUTIONS.find((i) => i.code === code) ?? null
}
