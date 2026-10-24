import { useEffect, useState } from 'react'
import Shell from '../components/Shell.jsx'
import Icon from '../components/Icon.jsx'
import { Button, Drawer, Toast, inputBase } from '../components/ui.jsx'
import { RegisterHeading, SeatsBar, TextTabs } from '../components/Register.jsx'
import { ACADEMIC_YEAR } from '../data/mock.js'
import { REPORTING_DEADLINE } from '../data/institutions.js'
import { getInstitution, listInstitutions } from '../api/index.js'
import { cx, dateOnly, dateTime, inr, pct } from '../lib/format.js'
import { downloadText, toCsv } from '../lib/csv.js'
import { Link } from '../lib/router.jsx'

const NAV = [
  { label: 'National overview', icon: 'dashboard', to: '/aicte' },
  { label: 'Institutions & intake', icon: 'building', to: '/aicte/institutions', active: true },
  { label: 'Student register', icon: 'users' },
  { label: 'Anomalies', icon: 'alert', badge: '1,286' },
  { label: 'Verification ledger', icon: 'shieldCheck', to: '/verify' },
  { label: 'Compliance reports', icon: 'file' },
]

const REGIONS = ['All', 'Western', 'Southern', 'Northern', 'Eastern', 'Central', 'North-Eastern']
const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'pending', label: 'Not submitted' },
  { value: 'over', label: 'Over intake' },
]

const urgentEdge = { boxShadow: 'inset 3px 0 0 var(--color-err)', paddingLeft: '10px' }

function Submission({ inst }) {
  if (inst.status === 'submitted') {
    return (
      <span className="whitespace-nowrap">
        <span className="mr-2 inline-block size-2 bg-ok" />
        Submitted {dateOnly(inst.submittedOn)}
      </span>
    )
  }
  return (
    <span className={cx('whitespace-nowrap', inst.status === 'overdue' && 'font-semibold text-err')}>
      <span className={cx('mr-2 inline-block size-2', inst.status === 'overdue' ? 'bg-err' : 'bg-warn')} />
      {inst.status === 'overdue' ? 'Overdue' : 'Not submitted'}
    </span>
  )
}

export default function AicteInstitutions({ account }) {
  const [list, setList] = useState(null)
  const [region, setRegion] = useState('All')
  const [status, setStatus] = useState('all')
  const [q, setQ] = useState('')
  const [openCode, setOpenCode] = useState(null)
  const [detail, setDetail] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    listInstitutions().then(setList)
  }, [])

  useEffect(() => {
    setDetail(null)
    if (openCode) getInstitution(openCode).then(setDetail)
  }, [openCode])

  const flash = (m) => {
    setToast(m)
    setTimeout(() => setToast(''), 2600)
  }

  const isOver = (i) => i.enrolled != null && i.enrolled > i.sanctioned

  const shown = (list ?? []).filter((i) => {
    if (region !== 'All' && i.region !== region) return false
    if (status === 'submitted' && i.status !== 'submitted') return false
    if (status === 'pending' && i.status === 'submitted') return false
    if (status === 'over' && !isOver(i)) return false
    if (q) {
      const s = q.toLowerCase()
      return [i.name, i.city, i.state, i.code].some((v) => v.toLowerCase().includes(s))
    }
    return true
  })

  const submitted = list?.filter((i) => i.status === 'submitted').length ?? 0
  const pending = (list?.length ?? 0) - submitted
  const over = list?.filter(isOver).length ?? 0

  const exportList = () => {
    const rows = shown.map((i) => ({
      code: i.code,
      institution: i.name,
      city: i.city,
      state: i.state,
      region: i.region,
      sanctioned: i.sanctioned,
      enrolled: i.enrolled ?? '',
      submission: i.status,
      submitted_on: i.submittedOn ?? '',
      open_anomalies: i.openAnomalies,
    }))
    downloadText('aicte-institutions.csv', toCsv(Object.keys(rows[0] ?? { code: '' }), rows))
  }

  return (
    <Shell
      subtitle="AICTE oversight"
      context="National academic ledger for AICTE-approved institutions"
      nav={NAV}
      user={{ name: account.name, role: account.title }}
      crumbs={['AICTE HQ, New Delhi', 'Institutions & intake']}
    >
      {!list ? (
        <div className="py-24 text-center text-muted">Loading institutions…</div>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h1 className="text-[15px] font-semibold text-muted">Institutions & intake</h1>
            <span lang="hi" className="text-[14px] text-primary-3">
              संस्थान एवं प्रवेश क्षमता
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-220">
              <p className="text-[28px] leading-9 font-bold tracking-tight text-ink">
                {submitted} of {list.length} institutions have submitted {ACADEMIC_YEAR} student data.
              </p>
              <p className="mt-2 text-[16px] leading-6 text-muted">
                <span className="font-semibold text-ink">{pending} still pending</span> before the {dateOnly(REPORTING_DEADLINE)}{' '}
                deadline, and <span className="font-semibold text-err">{over} admitted more students than sanctioned.</span>
              </p>
            </div>
            <Button icon="download" onClick={exportList}>
              Export list
            </Button>
          </div>

          <section className="mt-9">
            <RegisterHeading
              en="Institutions & intake"
              right={
                <>
                  <TextTabs label="Status" options={STATUS_FILTERS} value={status} onChange={setStatus} />
                  <div className="relative">
                    <Icon name="search" size={15} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-subtle" />
                    <input className={cx(inputBase, 'h-8 w-56 pl-8 text-[13px]')} placeholder="Name, city or code" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search institutions" />
                  </div>
                </>
              }
            />
            <div className="mt-3">
              <TextTabs label="Region" options={REGIONS} value={region} onChange={setRegion} />
            </div>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-245 text-left text-[14px]">
                <thead className="text-[12px] text-muted">
                  <tr className="border-b border-line">
                    <th className="py-2.5 pr-3 font-semibold">Institution</th>
                    <th className="py-2.5 pr-3 font-semibold">Region</th>
                    <th className="py-2.5 pr-3 text-right font-semibold">Sanctioned</th>
                    <th className="py-2.5 pr-3 text-right font-semibold">Enrolled</th>
                    <th className="py-2.5 pl-6 font-semibold">Seats used</th>
                    <th className="py-2.5 pr-3 font-semibold">Data submission</th>
                    <th className="py-2.5 pr-3 text-right font-semibold">Open anomalies</th>
                    <th className="py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((i) => {
                    const overIntake = isOver(i)
                    return (
                      <tr key={i.code} className="border-b border-line-soft align-top hover:bg-surface-low">
                        <td className="py-3 pr-3" style={overIntake ? urgentEdge : undefined}>
                          <div className="font-medium text-ink">
                            {i.name}
                            {i.live && <span className="ml-2 rounded-sm bg-primary-tint px-1.5 py-px align-[1px] text-[11px] font-semibold text-primary-3">Demo college</span>}
                          </div>
                          <div className="text-[12.5px] text-muted">
                            {i.city}, {i.state} · {i.code}
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-muted">{i.region}</td>
                        <td className="py-3 pr-3 text-right">{inr(i.sanctioned)}</td>
                        <td className={cx('py-3 pr-3 text-right', overIntake && 'font-semibold text-err')}>{i.enrolled == null ? '—' : inr(i.enrolled)}</td>
                        <td className="py-3 pl-6 pt-4.5">
                          {i.enrolled == null ? <span className="text-[12.5px] text-subtle">Awaiting data</span> : <SeatsBar sanctioned={i.sanctioned} enrolled={i.enrolled} />}
                        </td>
                        <td className="py-3 pr-3">
                          <Submission inst={i} />
                        </td>
                        <td className={cx('py-3 pr-3 text-right', i.openAnomalies ? 'font-semibold text-err' : 'text-muted')}>{i.openAnomalies}</td>
                        <td className="py-3 pl-3 text-right">
                          <button type="button" onClick={() => setOpenCode(i.code)} className="font-semibold whitespace-nowrap text-primary-2 underline underline-offset-4 hover:text-primary">
                            Open file
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {!shown.length && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-muted">
                        No institutions match these filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[12.5px] text-muted">
              Showing {shown.length} of {list.length} institutions in this prototype. Demo colleges update live when they
              submit data.
            </p>
          </section>
        </>
      )}

      <Drawer
        open={!!openCode}
        title={detail?.name ?? 'Loading…'}
        onClose={() => setOpenCode(null)}
        footer={
          detail &&
          detail.status !== 'submitted' && (
            <Button variant="primary" icon="bell" onClick={() => flash(`Reminder sent to ${detail.name}`)}>
              Send reminder
            </Button>
          )
        }
      >
        {detail && (
          <div className="space-y-6">
            <dl className="divide-y divide-line-soft border-y border-line-soft text-[13.5px]">
              {[
                ['Institution code', detail.code],
                ['AICTE permanent ID', detail.aictePid],
                ['Location', `${detail.city}, ${detail.state}`],
                ['Region', detail.region],
                ['Type', detail.type],
                ['Nodal officer', detail.nodalOfficer],
              ]
                .filter(([, v]) => v)
                .map(([dt, dd]) => (
                  <div key={dt} className="flex justify-between gap-4 py-2">
                    <dt className="text-muted">{dt}</dt>
                    <dd className="text-right font-medium">{dd}</dd>
                  </div>
                ))}
            </dl>

            <section>
              <h3 className="mb-2 text-[13px] font-semibold">{ACADEMIC_YEAR} data submission</h3>
              {detail.submission ? (
                <div className="rounded-md bg-ok-bg/40 p-3 text-[13.5px]">
                  <div className="font-semibold text-ok">Submitted {dateTime(detail.submission.at)}</div>
                  <div className="mt-1">
                    {inr(detail.submission.students)} students · acknowledgement <span className="font-mono">{detail.submission.ack}</span>
                  </div>
                  <div className="mt-1 font-mono text-[12px] break-all text-muted">SHA-256 {detail.submission.sha256}</div>
                </div>
              ) : detail.status === 'submitted' ? (
                <p className="text-[13.5px]">Submitted on {dateOnly(detail.submittedOn)}.</p>
              ) : (
                <p className="rounded-md bg-warn-bg/60 p-3 text-[13.5px]">
                  Not submitted yet. The deadline is {dateOnly(REPORTING_DEADLINE)}.
                </p>
              )}
            </section>

            {detail.programmes && (
              <section>
                <h3 className="mb-2 text-[13px] font-semibold">Approved programmes</h3>
                <table className="w-full text-left text-[13px]">
                  <thead className="text-[12px] text-muted">
                    <tr className="border-b border-line">
                      <th className="py-1.5 pr-2 font-semibold">Programme</th>
                      <th className="py-1.5 pr-2 text-right font-semibold">Sanctioned</th>
                      <th className="py-1.5 text-right font-semibold">Enrolled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.programmes.map((p) => (
                      <tr key={p.code} className="border-b border-line-soft">
                        <td className="py-2 pr-2">{p.name}</td>
                        <td className="py-2 pr-2 text-right">{p.sanctioned}</td>
                        <td className={cx('py-2 text-right', p.regular > p.sanctioned && 'font-semibold text-err')}>
                          {p.regular == null ? '—' : `${p.regular} (${pct(p.regular, p.sanctioned)}%)`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            <section>
              <h3 className="mb-2 text-[13px] font-semibold">Anomalies ({detail.anomalies.length})</h3>
              {detail.anomalies.length ? (
                <ul className="space-y-2">
                  {detail.anomalies.map((a) => (
                    <li key={a.id} className="rounded-md border border-line-soft p-3 text-[13.5px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[12px] text-muted">{a.ref}</span>
                        <span className={cx('text-[12px] font-semibold', a.status === 'open' ? 'text-err' : 'text-muted')}>{a.status === 'open' ? 'Open' : a.status}</span>
                      </div>
                      <div className="mt-1 font-medium">{a.summary}</div>
                      <div className="text-[12.5px] text-muted">{a.typeLabel} · {dateTime(a.detected)}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13.5px] text-muted">No anomalies on file.</p>
              )}
              {detail.anomalies.length > 0 && (
                <Link to="/aicte" className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-primary-2 underline underline-offset-4">
                  Act on these in the anomaly register <Icon name="chevronRight" size={14} />
                </Link>
              )}
            </section>
          </div>
        )}
      </Drawer>
      <Toast message={toast} />
    </Shell>
  )
}
