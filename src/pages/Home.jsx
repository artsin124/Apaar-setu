import Icon from '../components/Icon.jsx'
import { Brand } from '../components/Shell.jsx'
import { Link } from '../lib/router.jsx'
import { useAppState } from '../state/AppState.jsx'
import { useState } from 'react'

const PORTALS = [
  {
    to: '/aicte',
    icon: 'dashboard',
    who: 'AICTE officials',
    title: 'National overview',
    does: 'Intake vs. enrolment by region, intake breaches, and cross-institution anomaly alerts.',
  },
  {
    to: '/institution',
    icon: 'upload',
    who: 'College admin',
    title: 'Student data upload',
    does: 'Upload a CSV, see every rule violation with a fix, and submit only when the batch is clean.',
  },
  {
    to: '/student',
    icon: 'user',
    who: 'Student',
    title: 'My record & consent',
    does: 'A signed QR credential, and control over which organisations can see the record.',
  },
  {
    to: '/verify',
    icon: 'qr',
    who: 'Employer',
    title: 'Verify a credential',
    does: 'Scan or paste a code. The signature check catches any edit to the record.',
  },
]

export default function Home() {
  const { reset } = useAppState()
  const [done, setDone] = useState(false)

  return (
    <div className="min-h-screen bg-primary text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-8 sm:px-8">
        <header className="flex items-center justify-between">
          <Brand subtitle="Prototype · SIH26263" />
          <span className="text-[13px] text-primary-soft">Team Syntax Slayers</span>
        </header>

        <section className="pt-16 pb-12 sm:pt-24">
          <h1 className="max-w-3xl font-display text-4xl leading-[1.1] font-bold sm:text-[56px]">
            One APAAR ID. One verified student record.
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-7 text-primary-soft">
            Colleges submit student data once. AICTE catches duplicate and excess admissions automatically. Anyone the
            student allows can verify the record in seconds, and any edit to it is detected.
          </p>
        </section>

        <section aria-label="Portals" className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2">
          {PORTALS.map((p) => (
            <Link key={p.to} to={p.to} className="group flex gap-4 bg-primary-2 p-6 transition-colors hover:bg-primary-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-white/10 text-saffron-2">
                <Icon name={p.icon} size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] text-primary-soft">{p.who}</span>
                <span className="mt-0.5 flex items-center gap-2 font-display text-xl font-semibold">
                  {p.title}
                  <Icon name="arrowRight" size={18} className="transition-transform group-hover:translate-x-1" />
                </span>
                <span className="mt-2 block text-[14px] leading-5 text-white/75">{p.does}</span>
              </span>
            </Link>
          ))}
        </section>

        <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-12 text-[13px] text-primary-soft">
          <span>All data is synthetic. Institution names are fictional.</span>
          <button
            type="button"
            onClick={() => {
              reset()
              setDone(true)
              setTimeout(() => setDone(false), 2000)
            }}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-white/10 hover:text-white"
          >
            <Icon name="refresh" size={15} /> {done ? 'Demo data reset' : 'Reset demo data'}
          </button>
        </footer>
      </div>
    </div>
  )
}
