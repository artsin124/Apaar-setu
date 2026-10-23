import { useMemo, useState } from 'react'
import Shell from '../components/Shell.jsx'
import Icon from '../components/Icon.jsx'
import { Badge, Button, Drawer, Panel, Segmented, Severity, Toast, inputBase, inputClass } from '../components/ui.jsx'
import { ACADEMIC_YEAR, ANOMALIES, ANOMALY_TYPES, INTAKE_VIOLATORS, KPIS, PROGRAMMES, regionStats } from '../data/mock.js'
import { cx, dateTime, inr, pct } from '../lib/format.js'
import { downloadText, toCsv } from '../lib/csv.js'
import { navigate } from '../lib/router.jsx'

const NAV = [
  { label: 'National overview', icon: 'dashboard', to: '/aicte', active: true },
  { label: 'Institutions & intake', icon: 'building' },
  { label: 'Student registry', icon: 'users' },
  { label: 'Anomaly hub', icon: 'alert', badge: inr(KPIS.openAnomalies) },
  { label: 'Verification ledger', icon: 'shieldCheck', to: '/verify' },
  { label: 'Compliance reports', icon: 'file' },
]

const STATUS = {
  open: { tone: 'err', label: 'Open' },
  review: { tone: 'warn', label: 'Under review' },
  notice: { tone: 'info', label: 'Notice issued' },
  dismissed: { tone: 'neutral', label: 'Dismissed' },
}

function Kpi({ label, value, note, tone, children }) {
  return (
    <div className={cx('rounded-lg border bg-card p-5', tone === 'err' ? 'border-err/30' : 'border-line-soft')}>
      <div className="text-[13px] text-muted">{label}</div>
      <div className={cx('mt-2 font-mono text-[30px] leading-9 font-semibold tracking-tight tnum', tone === 'err' ? 'text-err' : 'text-primary')}>
        {value}
      </div>
      {note && <div className="mt-1 text-[13px] text-muted">{note}</div>}
      {children}
    </div>
  )
}

export default function AicteDashboard() {
  const [programme, setProgramme] = useState('All')
  const [region, setRegion] = useState('all')
  const [sev, setSev] = useState('all')
  const [q, setQ] = useState('')
  const [statuses, setStatuses] = useState({})
  const [openId, setOpenId] = useState(null)
  const [note, setNote] = useState('')
  const [toast, setToast] = useState('')
  const [dedupe, setDedupe] = useState({ running: false, last: '2026-10-23T09:24:00+05:30' })
  const [token, setToken] = useState('')

  const flash = (m) => {
    setToast(m)
    setTimeout(() => setToast(''), 2600)
  }

  const regions = useMemo(() => regionStats(programme), [programme])
  const shownRegions = region === 'all' ? regions : regions.filter((r) => r.id === region)
  const scaleMax = Math.max(...regions.map((r) => Math.max(r.sanctioned, r.enrolled)))
  const regionName = regions.find((r) => r.id === region)?.name

  const anomalies = ANOMALIES.filter((a) => {
    if (sev !== 'all' && a.severity !== sev) return false
    if (region !== 'all' && a.region !== regionName) return false
    if (q) {
      const s = q.toLowerCase()
      return [a.institution, a.code, a.city, a.id, ANOMALY_TYPES[a.type]].some((v) => v.toLowerCase().includes(s))
    }
    return true
  })

  const open = ANOMALIES.find((a) => a.id === openId)
  const setStatus = (id, s, msg) => {
    setStatuses((x) => ({ ...x, [id]: s }))
    setOpenId(null)
    setNote('')
    flash(msg)
  }

  const runDedupe = () => {
    setDedupe((d) => ({ ...d, running: true }))
    setTimeout(() => {
      setDedupe({ running: false, last: new Date().toISOString() })
      flash('Deduplication finished: 18,42,310 records checked, no new matches since the last run')
    }, 1600)
  }

  const exportReport = () => {
    const rows = ANOMALIES.map((a) => ({
      id: a.id,
      severity: a.severity,
      type: ANOMALY_TYPES[a.type],
      institution: a.institution,
      code: a.code,
      region: a.region,
      students_affected: a.affected,
      detected: a.detected,
      status: STATUS[statuses[a.id] ?? 'open'].label,
    }))
    downloadText('aicte-anomaly-report.csv', toCsv(Object.keys(rows[0]), rows))
  }

  return (
    <Shell
      subtitle="AICTE oversight"
      context="National academic ledger for AICTE-approved institutions"
      nav={NAV}
      user={{ name: 'Dr. Alok Singh', role: 'Joint Secretary, Approval Bureau' }}
      crumbs={['AICTE HQ, New Delhi', 'National overview']}
      topExtra={<Badge tone="info">{ACADEMIC_YEAR}</Badge>}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[13px] text-ok">
            <span className="size-2 rounded-full bg-ok" />
            Last deduplication run {dateTime(dedupe.last)}
          </div>
          <h1 className="mt-2 text-[28px] leading-9 font-bold text-primary">National overview</h1>
          <p className="mt-1 max-w-2xl text-muted">
            APAAR-linked enrolment against sanctioned intake, and anomalies across all reporting institutions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon="download" onClick={exportReport}>
            Export report
          </Button>
          <Button variant="primary" icon={dedupe.running ? 'refresh' : 'layers'} onClick={runDedupe} disabled={dedupe.running}>
            {dedupe.running ? 'Running…' : 'Run deduplication'}
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-4 rounded-lg border border-line-soft bg-card p-4">
        <label className="min-w-[180px]">
          <span className="mb-1.5 block text-[13px] text-muted">Region</span>
          <select className={inputClass} value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="all">All regions</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <div className="max-w-full">
          <span className="mb-1.5 block text-[13px] text-muted">Programme</span>
          <Segmented options={PROGRAMMES} value={programme} onChange={setProgramme} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Students registered with APAAR" value={inr(KPIS.studentsRegistered)} note={`+${inr(KPIS.studentsThisCycle)} this cycle · ${KPIS.apaarValidPct}% IDs valid`} />
        <Kpi label="Institutions reporting" value={inr(KPIS.institutionsReporting)} note={`of ${inr(KPIS.institutionsTotal)} · due ${KPIS.reportingDue}`}>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-mid">
            <div className="h-full bg-primary-2" style={{ width: `${pct(KPIS.institutionsReporting, KPIS.institutionsTotal)}%` }} />
          </div>
        </Kpi>
        <Kpi label="Institutions over sanctioned intake" value={KPIS.intakeBreaches} tone="err" note={`${inr(KPIS.excessSeats)} students above sanctioned seats`} />
        <Kpi label="Open anomalies" value={inr(KPIS.openAnomalies)} note={`${KPIS.crossInstitutionDuplicates} cross-institution duplicates`} />
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          icon="scale"
          title="Sanctioned intake vs. APAAR-verified enrolment"
          subtitle={`By AICTE region · ${programme === 'All' ? 'all programmes' : programme}`}
          actions={
            <div className="flex items-center gap-4 text-[12.5px] text-muted">
              <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm bg-primary-2" /> Sanctioned</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm bg-saffron-2" /> Enrolled</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm bg-err" /> Over intake</span>
            </div>
          }
        >
          <ul className="divide-y divide-line-soft">
            {shownRegions.map((r) => {
              const over = r.enrolled > r.sanctioned
              const util = pct(r.enrolled, r.sanctioned)
              return (
                <li key={r.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <div className="min-w-0">
                      <span className="font-semibold text-ink">{r.name}</span>
                      <span className="ml-2 text-[12.5px] text-muted">{r.states}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {over ? <Badge tone="err">+{(util - 100).toFixed(1)}% over</Badge> : <Badge tone="ok">{util}% filled</Badge>}
                      <span className="font-mono text-[13px] text-ink tnum">
                        {inr(r.enrolled)} <span className="text-subtle">/ {inr(r.sanctioned)}</span>
                      </span>
                    </div>
                  </div>
                  <div className="mt-2.5 space-y-1">
                    <div className="h-2 rounded-full bg-primary-2" style={{ width: `${(r.sanctioned / scaleMax) * 100}%` }} />
                    <div className="flex h-2" style={{ width: `${(r.enrolled / scaleMax) * 100}%` }}>
                      <div className={cx('h-full bg-saffron-2', over ? 'rounded-l-full' : 'rounded-full')} style={{ width: `${(Math.min(r.enrolled, r.sanctioned) / r.enrolled) * 100}%` }} />
                      {over && <div className="h-full flex-1 rounded-r-full bg-err" />}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </Panel>

        <div className="space-y-6">
          <Panel icon="alert" title="Largest intake breaches" subtitle="Uploaded regular admissions vs. sanctioned seats" bodyClassName="p-0">
            <ul className="divide-y divide-line-soft">
              {INTAKE_VIOLATORS.map((v) => {
                const extra = v.uploaded - v.sanctioned
                return (
                  <li key={v.name} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-ink">{v.name}</div>
                        <div className="text-[12.5px] text-muted">
                          {v.city} · {v.programme}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-sm bg-err px-1.5 py-0.5 font-mono text-[12px] font-semibold text-white">
                        +{(pct(extra, v.sanctioned)).toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-1.5 font-mono text-[12.5px] text-muted tnum">
                      {v.sanctioned} sanctioned · {v.uploaded} uploaded · <span className="text-err">+{extra}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Panel>

          <Panel icon="qr" title="Quick verification" subtitle="Paste a credential code from a student QR">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                navigate(token.trim() ? `/verify?t=${encodeURIComponent(token.trim())}` : '/verify')
              }}
              className="flex gap-2"
            >
              <input className={cx(inputClass, 'font-mono text-[13px]')} placeholder="AS1.eyJ2Ijox…" value={token} onChange={(e) => setToken(e.target.value)} aria-label="Credential code" />
              <Button variant="primary" type="submit" icon="arrowRight" aria-label="Verify" />
            </form>
          </Panel>
        </div>
      </div>

      <Panel
        className="mt-6"
        icon="shield"
        title="Integrity and intake anomalies"
        subtitle="Raised automatically when APAAR records conflict across institutions or with sanctioned intake"
        bodyClassName="p-0"
        actions={
          <>
            <div className="relative">
              <Icon name="search" size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle" />
              <input className={cx(inputBase, 'h-8 w-56 pl-8 text-[13px]')} placeholder="Institution, code or ID" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search anomalies" />
            </div>
            <Segmented
              options={[
                { value: 'all', label: 'All' },
                { value: 'critical', label: 'Critical' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
              ]}
              value={sev}
              onChange={setSev}
            />
          </>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[13.5px]">
            <thead className="bg-surface-low text-[12.5px] text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Severity</th>
                <th className="px-3 py-3 font-medium">Anomaly</th>
                <th className="px-3 py-3 font-medium">Institution</th>
                <th className="px-3 py-3 text-right font-medium">Students</th>
                <th className="px-3 py-3 font-medium">Detected</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {anomalies.map((a) => {
                const st = STATUS[statuses[a.id] ?? 'open']
                return (
                  <tr key={a.id} className={cx(a.severity === 'critical' && !statuses[a.id] && 'bg-err-bg/35')}>
                    <td className="px-5 py-3.5 align-top"><Severity level={a.severity} /></td>
                    <td className="px-3 py-3.5 align-top">
                      <div className="font-medium text-ink">{ANOMALY_TYPES[a.type]}</div>
                      <div className="text-[12.5px] text-muted">{a.summary}</div>
                    </td>
                    <td className="px-3 py-3.5 align-top">
                      <div className="text-ink">{a.institution}</div>
                      <div className="font-mono text-[12px] text-muted">{a.city} · {a.code}</div>
                    </td>
                    <td className="px-3 py-3.5 text-right align-top font-mono font-semibold text-ink tnum">{a.affected}</td>
                    <td className="px-3 py-3.5 align-top text-muted whitespace-nowrap">{dateTime(a.detected)}</td>
                    <td className="px-3 py-3.5 align-top"><Badge tone={st.tone}>{st.label}</Badge></td>
                    <td className="px-5 py-3.5 text-right align-top">
                      <Button size="sm" variant={a.severity === 'critical' ? 'primary' : 'secondary'} onClick={() => setOpenId(a.id)}>
                        Review
                      </Button>
                    </td>
                  </tr>
                )
              })}
              {!anomalies.length && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-muted">
                    No anomalies match these filters. Clear the search or pick another severity.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line-soft px-5 py-3 text-[13px] text-muted">
          Showing {anomalies.length} of {inr(KPIS.openAnomalies)} open anomalies
        </div>
      </Panel>

      <Drawer
        open={!!open}
        title={open ? ANOMALY_TYPES[open.type] : ''}
        onClose={() => setOpenId(null)}
        footer={
          open && (
            <div className="flex w-full flex-wrap gap-2">
              <Button variant="primary" icon="file" onClick={() => setStatus(open.id, 'notice', `Notice drafted for ${open.institution}`)}>
                Issue notice
              </Button>
              <Button icon="eye" onClick={() => setStatus(open.id, 'review', 'Marked as under review')}>
                Mark under review
              </Button>
              <Button variant="dangerGhost" onClick={() => setStatus(open.id, 'dismissed', 'Dismissed as false positive')}>
                Dismiss
              </Button>
            </div>
          )
        }
      >
        {open && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Severity level={open.severity} />
              <span className="font-mono text-[12.5px] text-muted">{open.id}</span>
            </div>
            <div>
              <div className="text-[13px] text-muted">Institution</div>
              <div className="font-semibold">{open.institution}</div>
              <div className="font-mono text-[12.5px] text-muted">{open.city} · {open.code} · {open.region} region</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-surface-low p-3">
                <div className="text-[12.5px] text-muted">Students affected</div>
                <div className="font-mono text-xl font-semibold">{open.affected}</div>
              </div>
              <div className="rounded-md bg-surface-low p-3">
                <div className="text-[12.5px] text-muted">Detected</div>
                <div className="text-[13.5px] font-medium">{dateTime(open.detected)}</div>
              </div>
            </div>
            <div>
              <div className="mb-2 text-[13px] font-medium">Evidence</div>
              <ul className="space-y-2">
                {open.evidence.map((e) => (
                  <li key={e} className="flex gap-2 text-[13.5px] leading-5 text-ink">
                    <Icon name="chevronRight" size={16} className="mt-0.5 text-saffron" />
                    {e}
                  </li>
                ))}
              </ul>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium">Officer note</span>
              <textarea className={cx(inputClass, 'h-24 py-2')} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Recorded in the audit trail with your name and time" />
            </label>
            <p className="flex gap-2 rounded-md bg-primary-tint/60 p-3 text-[12.5px] leading-5 text-primary-3">
              <Icon name="info" size={16} className="mt-0.5" />
              Flags are decision support. Action against an institution needs an officer’s review.
            </p>
          </div>
        )}
      </Drawer>
      <Toast message={toast} />
    </Shell>
  )
}
