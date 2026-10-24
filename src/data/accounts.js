import { DEMO_INSTITUTIONS } from './institutions.js'

// Demo sign-in accounts. In production each person signs in with their own
// credentials and two-factor authentication; there is no account picker.
export const ACCOUNTS = [
  {
    id: 'aicte',
    role: 'aicte',
    name: 'Dr. Alok Singh',
    title: 'Joint Secretary, Approval Bureau',
    org: 'AICTE HQ, New Delhi',
    home: '/aicte',
  },
  ...DEMO_INSTITUTIONS.map((i) => ({
    id: i.slug,
    role: 'institution',
    name: i.officer,
    title: i.officerRole,
    org: `${i.name}, ${i.city}`,
    institutionCode: i.code,
    home: '/institution',
  })),
  {
    id: 'student',
    role: 'student',
    name: 'Priya Deshmukh',
    title: 'Student, B.Tech Computer Engineering',
    org: `${DEMO_INSTITUTIONS[0].name}, ${DEMO_INSTITUTIONS[0].city}`,
    home: '/student',
  },
]

export const ROLE_LABEL = {
  aicte: 'AICTE',
  institution: 'Institutions',
  student: 'Students',
}
