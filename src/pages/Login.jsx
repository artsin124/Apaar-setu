import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { LogoMark } from '../components/Shell.jsx'
import { GovFooter, GovStrip } from '../components/GovChrome.jsx'
import { Avatar, Button } from '../components/ui.jsx'
import { listDemoAccounts } from '../api/index.js'
import { ROLE_LABEL } from '../data/accounts.js'
import { Link, navigate } from '../lib/router.jsx'
import { cx } from '../lib/format.js'
import { useSession } from '../state/Session.jsx'

export default function Login({ params }) {
  const { signIn } = useSession()
  const [accounts, setAccounts] = useState([])
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)
  const role = params.get('as')
  const next = params.get('next')

  useEffect(() => {
    listDemoAccounts().then((list) => {
      setAccounts(list)
      setSelected((list.find((a) => a.role === role) ?? list[0]).id)
    })
  }, [role])

  const submit = async (e) => {
    e.preventDefault()
    if (!selected) return
    setBusy(true)
    const a = await signIn(selected)
    navigate(next && next.startsWith(a.home) ? next : a.home)
  }

  const groups = Object.keys(ROLE_LABEL).map((r) => ({ role: r, label: ROLE_LABEL[r], items: accounts.filter((a) => a.role === r) }))

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <GovStrip />
      <header className="border-b border-line-soft bg-card">
        <div className="mx-auto flex max-w-350 items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="APAAR Setu home">
            <LogoMark size={44} />
            <div className="leading-tight">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-[20px] font-bold text-primary">APAAR Setu</span>
                <span lang="hi" className="text-[15px] font-semibold text-primary-3">
                  अपार सेतु
                </span>
              </div>
              <div className="text-[13px] text-muted">Student data and verification platform</div>
            </div>
          </Link>
        </div>
      </header>
      <div className="h-1.5 bg-primary-2" />

      <main id="main" tabIndex={-1} className="mx-auto grid w-full max-w-350 flex-1 gap-10 px-4 py-10 outline-none sm:px-6 lg:grid-cols-12 lg:px-8">
        <section className="max-w-xl lg:col-span-5">
          <h1 className="text-[30px] leading-10 font-bold text-primary">Sign in</h1>
          <p className="mt-3 text-[15.5px] leading-6 text-ink">
            AICTE officials, institution nodal officers and students each see only what their role allows. A college
            sees its own students and nothing about any other college.
          </p>
          <div className="mt-6 rounded-md border border-saffron-2/50 bg-saffron-bg/40 p-4 text-[13.5px] leading-5">
            <div className="flex items-center gap-2 font-semibold text-saffron">
              <Icon name="info" size={17} /> Demo sign-in
            </div>
            <p className="mt-1.5 text-ink">
              Pick an account to see the platform from that person’s side. In the real system, every user signs in with
              their own credentials and a one-time password.
            </p>
          </div>
          <div className="mt-8 border-t border-line-soft pt-5 text-[14px]">
            <div className="font-semibold">Employer or verifier?</div>
            <p className="mt-1 text-muted">Checking a student’s credential doesn’t need an account.</p>
            <Link to="/verify" className="mt-2 inline-flex items-center gap-1.5 font-semibold text-primary-2 underline underline-offset-4">
              Verify a credential <Icon name="chevronRight" size={15} />
            </Link>
          </div>
        </section>

        <form onSubmit={submit} className="self-start rounded-lg border border-line-soft bg-card lg:col-span-7">
          <fieldset>
            <legend className="sr-only">Choose a demo account</legend>
            {groups.map((g) => (
              <div key={g.role} className="border-b border-line-soft last:border-b-0">
                <div className="bg-surface-low px-5 py-2 text-[12.5px] font-semibold text-muted">{g.label}</div>
                <ul className="divide-y divide-line-soft">
                  {g.items.map((a) => (
                    <li key={a.id}>
                      <label
                        className={cx(
                          'flex cursor-pointer items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-surface-low',
                          selected === a.id && 'bg-primary-tint/50',
                        )}
                      >
                        <input type="radio" name="account" value={a.id} checked={selected === a.id} onChange={() => setSelected(a.id)} className="size-4 accent-[#1e2a5a]" />
                        <Avatar name={a.name} size={38} />
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-ink">{a.name}</span>
                          <span className="block truncate text-[13px] text-muted">
                            {a.title} · {a.org}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </fieldset>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-5 py-4">
            <span className="flex items-center gap-1.5 text-[13px] text-muted">
              <Icon name="lock" size={15} /> No password needed for the demo
            </span>
            <Button variant="primary" type="submit" iconRight="arrowRight" disabled={!selected || busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </div>
        </form>
      </main>
      <GovFooter />
    </div>
  )
}
