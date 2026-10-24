import { useEffect, useState } from 'react'
import Shell from '../components/Shell.jsx'
import Icon from '../components/Icon.jsx'
import { Button, Drawer, Toast, inputBase, inputClass } from '../components/ui.jsx'
import { ACADEMIC_YEAR, PROGRAMMES } from '../data/mock.js'
import { getOverview, listAnomalies, runDeduplication, updateAnomaly } from '../api/index.js'
import { cx, dateTime, inr } from '../lib/format.js'
import { downloadText, toCsv } from '../lib/csv.js'
import { RegisterHeading, SeatsBar, TextTabs } from '../components/Register.jsx'

const NAV = [
  { label: 'National overview', icon: 'dashboard', to: '/aicte', active: true },
  { label: 'Institutions & intake', icon: 'building', to: '/aicte/institutions' },
  { label: 'Student register', icon: 'users' },
  { label: 'Anomalies', icon: 'alert', badge: '1,286' },
  { label: 'Verification ledger', icon: 'shieldCheck', to: '/verify' },
  { label: 'Compliance reports', icon: 'file' },
]

const STATUS = {
  open: { label: 'Open', color: 'bg-err' },
  review: { label: 'Under review', color: 'bg-subtle' },
  notice: { label: 'Notice issued', color: 'bg-saffron-2' },
  dismissed: { label: 'Dismissed', color: 'bg-line' },
}
const SEVERITY = { critical: 'Critical', high: 'High', medium: 'Medium' }

const urgentEdge = { boxShadow: 'inset 3px 0 0 var(--color-err)', paddingLeft: '10px' }

export default function AicteDashboard({ account }) {
  const [programme, setProgramme] = useState('All')
  const [overview, setOverview] = useState(null)
  const [anomalies, setAnomalies] = useState([])
  const [region, setRegion] = useState(null)
  const [sev, setSev] = useState('all')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState(null)
  const [note, setNote] = useState('')
  const [toast, setToast] = useState('')
  const [deduping, setDeduping] = useState(false)

  const flash = (m) => {
    setToast(m)
    setTimeout(() => setToast(''), 2600)
  }

  useEffect(() => {
    getOverview({ programme }).then(setOverview)
  }, [programme])

  useEffect(() => {
    listAnomalies().then(setAnomalies)
  }, [])

  const refresh = async () => {
    const [o, a] = await Promise.all([getOverview({ programme }), listAnomalies()])
    setOverview(o)
    setAnomalies(a)
  }

  const act = async (id, status, msg) => {
    await updateAnomaly(id, { status, note })
    setOpenId(null)
    setNote('')
    flash(msg)
    refresh()
  }

  const dedupe = async () => {
    setDeduping(true)
    const r = await runDeduplication()
    setDeduping(false)
    flash(`Deduplication finished: ${inr(r.checked)} records checked, ${r.newMatches} new matches`)
    refresh()
  }

  const exportReport = () => {
    const rows = anomalies.map((a) => ({
      reference: a.ref,
      severity: a.severity,
      finding: a.typeLabel,
      institution: a.institution,
      code: a.code,
      region: a.region,
      students: a.affected,
      detected: a.detected,
      status: STATUS[a.status].label,
    }))
    downloadText('aicte-anomaly-register.csv', toCsv(Object.keys(rows[0]), rows))
  }

  const regionName = overview?.regions.find((r) => r.id === region)?.name
  const shown = anomalies.filter((a) => {
    if (sev !== 'all' && a.severity !== sev) return false
    if (regionName && a.region !== regionName) return false
    if (q) {
      const s = q.toLowerCase()
      return [a.institution, a.code, a.city, a.ref, a.typeLabel].some((v) => v.toLowerCase().includes(s))
    }
    return true
  })
  const open = anomalies.find((a) => a.id === openId)
  const h = overview?.headline
  const k = overview?.kpis

  return (
    <Shell
      subtitle="AICTE oversight"
      context="National academic ledger for AICTE-approved institutions"
      nav={NAV}
      user={{ name: account.name, role: account.title }}
      crumbs={['AICTE HQ, New Delhi', 'National overview']}
    >
      {!overview ? (
        <div className="py-24 text-center text-muted">Loading the national ledger…</div>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted">
            <span>Approval Bureau, AICTE HQ</span>
            <span className="border-l border-line pl-4">File {overview.fileRef}</span>
            <span className="border-l border-line pl-4">{ACADEMIC_YEAR}</span>
            <span className="border-l border-line pl-4">Ledger updated {dateTime(overview.updatedAt)}</span>
          </div>

          <div className="mt-4 flex flex-wrap items-baseline gap-x-3">
            <h1 className="text-[15px] font-semibold text-muted">National overview</h1>
            <span lang="hi" className="text-[14px] text-primary-3">
              राष्ट्रीय अवलोकन
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-220">
              <p className="text-[30px] leading-9.5 font-bold tracking-tight text-ink">
                <span className="text-err">{h.institutionsOverIntake} institutions</span> admitted more students than they
                were sanctioned for this year.
              </p>
              <p className="mt-2 text-[16px] leading-6 text-muted">
                <span className="font-semibold text-ink">
                  {h.needsNoticeToday} {h.needsNoticeToday === 1 ? 'case needs' : 'cases need'} a notice from you.
                </span>{' '}
                {inr(h.studentsAtMultipleInstitutions)} students appear at more than one institution, and{' '}
                {inr(h.institutionsNotReported)} institutions haven’t submitted data before the {h.reportingDue} deadline.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button icon="download" onClick={exportReport}>
                Export register
              </Button>
              <Button variant="primary" icon={deduping ? 'refresh' : 'layers'} onClick={dedupe} disabled={deduping}>
                {deduping ? 'Running…' : 'Run deduplication'}
              </Button>
            </div>
          </div>

          <dl className="mt-7 grid border-t border-b border-t-ink border-b-line sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Students registered with APAAR ID', inr(k.studentsRegistered), `+${inr(k.studentsThisCycle)} this cycle`],
              ['Institutions reporting', inr(k.institutionsReporting), `of ${inr(k.institutionsTotal)} · due ${k.reportingDue}`],
              ['Institutions over sanctioned intake', k.intakeBreaches, `${inr(k.excessSeats)} excess students`, true],
              ['Open anomalies', inr(k.openAnomalies), `${k.crossInstitutionDuplicates} cross-institution`],
            ].map(([label, value, sub, bad], i) => (
              <div key={label} className={cx('py-3.5 pr-4', i > 0 && 'xl:border-l xl:border-line xl:pl-5', i % 2 === 1 && 'sm:border-l sm:border-line sm:pl-5')}>
                <dt className="text-[12.5px] text-muted">{label}</dt>
                <dd className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                  <span className={cx('text-[24px] leading-8 font-semibold', bad ? 'text-err' : 'text-ink')}>{value}</span>
                  <span className="text-[13px] text-muted">{sub}</span>
                </dd>
              </div>
            ))}
          </dl>

          <section className="mt-10">
            <RegisterHeading
              en="Regional intake register"
              right={<TextTabs label="Programme" options={PROGRAMMES} value={programme} onChange={setProgramme} />}
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-205 text-left text-[14px]">
                <thead className="text-[12px] text-muted">
                  <tr className="border-b border-line">
                    <th className="py-2.5 pr-3 font-semibold">Region</th>
                    <th className="py-2.5 pr-3 font-semibold">States</th>
                    <th className="py-2.5 pr-3 text-right font-semibold">Sanctioned</th>
                    <th className="py-2.5 pr-3 text-right font-semibold">Enrolled (APAAR)</th>
                    <th className="py-2.5 pr-3 text-right font-semibold">Difference</th>
                    <th className="py-2.5 pl-6 font-semibold">
                      Seats used <span className="font-normal">(tick = 100%)</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {overview.regions.map((r) => {
                    const diff = r.enrolled - r.sanctioned
                    const over = diff > 0
                    const selected = region === r.id
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setRegion(selected ? null : r.id)}
                        className={cx('cursor-pointer border-b border-line-soft hover:bg-surface-low', selected && 'bg-primary-tint/50')}
                      >
                        <td className="py-3 pr-3 font-semibold" style={over ? urgentEdge : undefined}>
                          <button type="button" aria-pressed={selected} className="text-left" title="Filter the anomaly register by this region">
                            {r.name}
                          </button>
                        </td>
                        <td className="py-3 pr-3 text-[13px] text-muted">{r.states}</td>
                        <td className="py-3 pr-3 text-right">{inr(r.sanctioned)}</td>
                        <td className="py-3 pr-3 text-right">{inr(r.enrolled)}</td>
                        <td className={cx('py-3 pr-3 text-right', over ? 'font-semibold text-err' : 'text-muted')}>
                          {over ? '+' : '−'}
                          {inr(Math.abs(diff))}
                        </td>
                        <td className="py-3 pl-6">
                          <SeatsBar sanctioned={r.sanctioned} enrolled={r.enrolled} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[12.5px] text-muted">Select a region to filter the anomaly register.</p>
          </section>

          <section className="mt-10">
            <RegisterHeading
              en="Anomaly register"
              right={
                <>
                  <TextTabs
                    label="Severity"
                    options={[{ value: 'all', label: 'All' }, ...Object.entries(SEVERITY).map(([value, label]) => ({ value, label }))]}
                    value={sev}
                    onChange={setSev}
                  />
                  <div className="relative">
                    <Icon name="search" size={15} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-subtle" />
                    <input className={cx(inputBase, 'h-8 w-56 pl-8 text-[13px]')} placeholder="Institution, code or reference" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search anomalies" />
                  </div>
                </>
              }
            >
              {regionName && (
                <button type="button" onClick={() => setRegion(null)} className="inline-flex items-center gap-1 rounded-sm bg-primary-tint px-2 py-0.5 text-[12.5px] text-primary-3">
                  {regionName} region <Icon name="x" size={13} />
                </button>
              )}
            </RegisterHeading>
            <div className="overflow-x-auto">
              <table className="w-full min-w-245 text-left text-[14px]">
                <thead className="text-[12px] text-muted">
                  <tr className="border-b border-line">
                    <th className="py-2.5 pr-3 font-semibold">Reference</th>
                    <th className="py-2.5 pr-3 font-semibold">Detected</th>
                    <th className="py-2.5 pr-3 font-semibold">Institution</th>
                    <th className="py-2.5 pr-3 font-semibold">Finding</th>
                    <th className="py-2.5 pr-3 text-right font-semibold">Students</th>
                    <th className="py-2.5 pl-6 font-semibold">Status</th>
                    <th className="py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((a) => {
                    const urgent = a.severity === 'critical' && a.status === 'open'
                    return (
                      <tr key={a.id} className="border-b border-line-soft align-top">
                        <td className="py-3 pr-3 font-mono text-[12px] whitespace-nowrap text-muted" style={urgent ? urgentEdge : undefined}>
                          {a.ref}
                        </td>
                        <td className="py-3 pr-3 text-[13px] whitespace-nowrap text-muted">{dateTime(a.detected)}</td>
                        <td className="py-3 pr-3">
                          {a.institution}
                          <div className="text-[12.5px] text-muted">
                            {a.city} · {a.code}
                          </div>
                        </td>
                        <td className="max-w-95 py-3 pr-3">
                          {a.live && <span className="mr-1.5 rounded-sm bg-err px-1.5 py-px align-[1px] text-[11px] font-semibold text-white">New</span>}
                          {a.summary}
                          <div className="text-[12.5px] text-muted">{a.typeLabel}</div>
                        </td>
                        <td className={cx('py-3 pr-3 text-right', urgent ? 'font-semibold text-err' : 'text-ink')}>{a.affected}</td>
                        <td className="py-3 pl-6 whitespace-nowrap">
                          <span className={cx('mr-2 inline-block size-2', a.status === 'open' && a.severity === 'medium' ? 'bg-warn' : STATUS[a.status].color)} />
                          {a.status === 'open' ? `${SEVERITY[a.severity]}, open` : STATUS[a.status].label}
                        </td>
                        <td className="py-3 pl-3 text-right">
                          <button type="button" onClick={() => setOpenId(a.id)} className="font-semibold whitespace-nowrap text-primary-2 underline underline-offset-4 hover:text-primary">
                            Open file
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {!shown.length && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-muted">
                        Nothing in the register matches these filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[12.5px] text-muted">
              Showing {shown.length} of {inr(k.openAnomalies)} open entries. Flags are decision support: action against an
              institution requires an officer’s review.
            </p>
          </section>
        </>
      )}

      <Drawer
        open={!!open}
        title={open ? open.ref : ''}
        onClose={() => setOpenId(null)}
        footer={
          open && (
            <div className="flex w-full flex-wrap gap-2">
              <Button variant="primary" icon="file" onClick={() => act(open.id, 'notice', `Notice recorded on ${open.ref}`)}>
                Issue notice
              </Button>
              <Button icon="eye" onClick={() => act(open.id, 'review', 'Marked as under review')}>
                Mark under review
              </Button>
              <Button variant="dangerGhost" onClick={() => act(open.id, 'dismissed', 'Dismissed as a false positive')}>
                Dismiss
              </Button>
            </div>
          )
        }
      >
        {open && (
          <div className="space-y-5">
            <div>
              <div className="text-[13px] text-muted">
                {open.typeLabel} · {SEVERITY[open.severity]}
              </div>
              <p className="mt-1 text-[17px] leading-6 font-semibold">{open.summary}</p>
            </div>
            <dl className="divide-y divide-line-soft border-y border-line-soft text-[13.5px]">
              {[
                ['Institution', `${open.institution}, ${open.city}`],
                ['Institution code', open.code],
                ['Region', open.region],
                ['Students affected', open.affected],
                ['Detected', dateTime(open.detected)],
                ['Status', STATUS[open.status].label],
              ].map(([dt, dd]) => (
                <div key={dt} className="flex justify-between gap-4 py-2">
                  <dt className="text-muted">{dt}</dt>
                  <dd className="text-right font-medium">{dd}</dd>
                </div>
              ))}
            </dl>
            <div>
              <div className="mb-2 text-[13px] font-semibold">Evidence</div>
              <ol className="list-decimal space-y-2 pl-5 text-[13.5px] leading-5">
                {open.evidence.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ol>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold">Officer’s note</span>
              <textarea className={cx(inputClass, 'h-24 py-2')} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Recorded on the file with your name and the time" />
            </label>
          </div>
        )}
      </Drawer>
      <Toast message={toast} />
    </Shell>
  )
}
