import { useEffect, useRef, useState } from 'react'
import Shell from '../components/Shell.jsx'
import Icon from '../components/Icon.jsx'
import { Badge, Button, Meter, Panel, Segmented, Severity, inputBase, inputClass } from '../components/ui.jsx'
import { ACADEMIC_YEAR, MY_INSTITUTION, MY_PROGRAMMES } from '../data/mock.js'
import { CSV_HEADERS, sampleRowsClean, sampleRowsWithIssues } from '../data/registry.js'
import { downloadText, parseCsv, toCsv } from '../lib/csv.js'
import { submitBatch, validateBatch } from '../api/index.js'
import { usePrefs } from '../state/Prefs.jsx'
import { apaar as fmtApaar, cx, dateTime, inr, pct } from '../lib/format.js'

const NAV = [
  { label: 'Dashboard', icon: 'dashboard' },
  { label: 'Student data upload', icon: 'upload', to: '/institution', active: true },
  { label: 'APAAR verification', icon: 'shieldCheck' },
  { label: 'Approved intake', icon: 'building' },
  { label: 'Reports & audit log', icon: 'ledger' },
]

const PROG_NAME = Object.fromEntries(MY_PROGRAMMES.map((p) => [p.code, p.name]))
const PAGE = 10

function Steps({ stage, hasErrors }) {
  const steps = [
    { title: 'Upload file', done: stage !== 'empty' },
    { title: 'Run validation rules', done: stage !== 'empty' },
    { title: 'Review and fix', done: stage === 'submitted' || (stage === 'validated' && !hasErrors), active: stage === 'validated' && hasErrors },
    { title: 'Submit to AICTE', done: stage === 'submitted', active: stage === 'validated' && !hasErrors },
  ]
  return (
    <ol className="grid gap-px overflow-hidden rounded-lg border border-line-soft bg-line-soft sm:grid-cols-4">
      {steps.map((s, i) => (
        <li key={s.title} className={cx('flex items-center gap-3 px-4 py-3.5', s.active ? 'bg-saffron-bg/50' : 'bg-card')}>
          <span
            className={cx(
              'flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold',
              s.done ? 'bg-ok text-white' : s.active ? 'bg-saffron text-white' : 'bg-surface-mid text-muted',
            )}
          >
            {s.done ? <Icon name="check" size={15} strokeWidth={2.6} /> : i + 1}
          </span>
          <div className="min-w-0">
            <div className={cx('text-[13.5px] font-medium', s.done || s.active ? 'text-ink' : 'text-muted')}>{s.title}</div>
            <div className="text-[12px] text-muted">{s.done ? 'Done' : s.active ? 'Action needed' : 'Waiting'}</div>
          </div>
        </li>
      ))}
    </ol>
  )
}

export default function InstitutionUpload() {
  const [stage, setStage] = useState('empty')
  const [fileName, setFileName] = useState('')
  const [fileText, setFileText] = useState('')
  const [rows, setRows] = useState([])
  const [tab, setTab] = useState('all')
  const [prog, setProg] = useState('all')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [drag, setDrag] = useState(false)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState(null)
  const fileRef = useRef(null)

  const [result, setResult] = useState(null)
  const [checking, setChecking] = useState(false)
  const { t } = usePrefs()

  useEffect(() => {
    if (!rows.length) {
      setResult(null)
      return
    }
    let live = true
    setResult(null)
    setChecking(true)
    validateBatch(rows).then((r) => {
      if (live) {
        setResult(r)
        setChecking(false)
      }
    })
    return () => {
      live = false
    }
  }, [rows])

  const loadText = (text, name) => {
    const { headers, records } = parseCsv(text)
    const missing = CSV_HEADERS.filter((h) => !headers.includes(h))
    if (!records.length) {
      setError(`${name} has no student rows. Download the template to see the expected format.`)
      return
    }
    if (missing.length) {
      setError(`${name} is missing these columns: ${missing.join(', ')}. Download the template and copy your data into it.`)
      return
    }
    setError('')
    setFileName(name)
    setFileText(text)
    setRows(records)
    setStage('validated')
    setTab('all')
    setProg('all')
    setQ('')
    setPage(0)
    setReceipt(null)
  }

  const loadSample = (withIssues) => {
    const data = withIssues ? sampleRowsWithIssues() : sampleRowsClean()
    loadText(toCsv(CSV_HEADERS, data), withIssues ? 'kiet_admissions_2026_v2.csv' : 'kiet_admissions_2026_v3.csv')
  }

  const onFile = (file) => {
    if (!file) return
    if (!/\.csv$/i.test(file.name)) {
      setError('Upload a .csv file. In Excel, use File → Save As → CSV UTF-8.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => loadText(String(reader.result), file.name)
    reader.readAsText(file)
  }

  const issues = result?.issues ?? []
  const filtered = issues.filter((i) => {
    if (tab === 'error' && i.severity !== 'error') return false
    if (tab === 'warning' && i.severity !== 'warning') return false
    if (prog !== 'all' && i.programme !== prog) return false
    if (q) {
      const s = q.toLowerCase()
      return [i.name, i.apaar, i.title, String(i.row)].some((v) => (v || '').toLowerCase().includes(s))
    }
    return true
  })
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const shown = filtered.slice(page * PAGE, page * PAGE + PAGE)
  const hasErrors = (result?.errorCount ?? 0) > 0

  const downloadReport = () => {
    const out = issues.map((i) => ({
      row: i.row,
      apaar_id: i.apaar,
      student_name: i.name,
      programme_code: i.programme,
      field: i.field,
      severity: i.severity,
      issue: i.title,
      detail: i.detail,
      how_to_fix: i.fix,
    }))
    downloadText(`${fileName.replace(/\.csv$/i, '')}_issues.csv`, toCsv(Object.keys(out[0] ?? { row: '' }), out))
  }

  const submit = async () => {
    const r = await submitBatch(fileText, result.total)
    setReceipt({ id: r.acknowledgement, hash: r.sha256, at: r.submittedAt, students: r.students })
    setStage('submitted')
    window.scrollTo(0, 0)
  }

  return (
    <Shell
      subtitle="Institution portal"
      context={`${MY_INSTITUTION.name}, ${MY_INSTITUTION.city} · ${MY_INSTITUTION.code}`}
      nav={NAV}
      user={{ name: MY_INSTITUTION.officer, role: MY_INSTITUTION.officerRole }}
      crumbs={[MY_INSTITUTION.shortName, 'Student data upload', `${ACADEMIC_YEAR} admissions`]}
      topExtra={<Badge tone="info">{ACADEMIC_YEAR}</Badge>}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-9 font-bold text-primary">{t('Upload student data')}</h1>
          <p className="mt-1 max-w-2xl text-muted">
            One row per admitted student, keyed by APAAR ID. Every row is checked against the APAAR registry and your
            approved intake before it reaches AICTE.
          </p>
        </div>
        <Button icon="download" onClick={() => downloadText('apaar_setu_template.csv', toCsv(CSV_HEADERS, sampleRowsClean().slice(0, 3)))}>
          Download CSV template
        </Button>
      </div>

      <div className="mt-6">
        <Steps stage={stage} hasErrors={hasErrors} />
      </div>

      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />

      {error && (
        <div role="alert" className="mt-4 flex gap-2 rounded-md border border-err/30 bg-err-bg/50 px-4 py-3 text-[13.5px] text-err">
          <Icon name="alert" size={17} className="mt-0.5" /> {error}
        </div>
      )}

      {stage === 'empty' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files?.[0]) }}
          className={cx(
            'mt-6 flex flex-col items-center rounded-lg border-2 border-dashed px-6 py-14 text-center transition-colors',
            drag ? 'border-saffron bg-saffron-bg/30' : 'border-line bg-card',
          )}
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-primary-tint text-primary-3">
            <Icon name="upload" size={26} />
          </span>
          <h2 className="mt-4 text-xl font-semibold">Drop your admissions CSV here</h2>
          <p className="mt-1 max-w-md text-muted">Or choose a file. Validation runs instantly in the browser; nothing is sent until you submit.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="primary" icon="file" onClick={() => fileRef.current?.click()}>
              Choose CSV file
            </Button>
          </div>
          <div className="mt-8 border-t border-line-soft pt-5 text-[13px] text-muted">
            Demo files:
            <button type="button" className="ml-2 font-medium text-primary-3 underline-offset-2 hover:underline" onClick={() => loadSample(true)}>
              batch with errors
            </button>
            <span className="mx-2 text-subtle">·</span>
            <button type="button" className="font-medium text-primary-3 underline-offset-2 hover:underline" onClick={() => loadSample(false)}>
              clean batch
            </button>
          </div>
        </div>
      )}

      {stage === 'submitted' && receipt && (
        <section className="mt-6 rounded-lg border border-ok/30 bg-card">
          <div className="flex flex-wrap items-start gap-4 border-b border-line-soft bg-ok-bg/40 px-6 py-5">
            <span className="flex size-11 items-center justify-center rounded-full bg-ok text-white">
              <Icon name="check" size={22} strokeWidth={2.6} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold text-ink">Submitted to AICTE</h2>
              <p className="text-muted">
                {inr(receipt.students)} student records from {fileName} are now in the central repository.
              </p>
            </div>
            <Button icon="upload" onClick={() => { setStage('empty'); setRows([]); setFileName('') }}>
              Upload another batch
            </Button>
          </div>
          <dl className="grid gap-5 px-6 py-5 sm:grid-cols-3">
            <div>
              <dt className="text-[13px] text-muted">Acknowledgement number</dt>
              <dd className="mt-1 font-mono font-semibold">{receipt.id}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">Submitted</dt>
              <dd className="mt-1 font-medium">{dateTime(receipt.at)}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">File fingerprint (SHA-256)</dt>
              <dd className="mt-1 font-mono text-[12.5px] break-all text-ink">{receipt.hash}</dd>
            </div>
          </dl>
          <p className="border-t border-line-soft px-6 py-4 text-[13px] text-muted">
            The fingerprint proves exactly which file was submitted. Any later change to these records creates a new
            version in the audit log.
          </p>
        </section>
      )}

      {stage === 'validated' && checking && !result && <div className="py-16 text-center text-muted">Checking every row against the APAAR registry…</div>}

      {stage === 'validated' && result && (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-line-soft bg-card px-4 py-3">
            <Icon name="file" className="text-primary-3" />
            <span className="font-mono text-[13px] text-ink">{fileName}</span>
            <span className="text-[13px] text-muted">{inr(result.total)} rows</span>
            <div className="ml-auto flex gap-2">
              <Button size="sm" icon="upload" onClick={() => fileRef.current?.click()}>
                Upload corrected file
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setStage('empty'); setRows([]) }}>
                Start over
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-line-soft bg-card p-5">
              <div className="text-[13px] text-muted">Rows checked</div>
              <div className="mt-2 font-mono text-[30px] leading-9 font-semibold text-primary tnum">{inr(result.total)}</div>
              <div className="text-[13px] text-muted">across {MY_PROGRAMMES.length} programmes</div>
            </div>
            <div className="rounded-lg border border-line-soft bg-card p-5">
              <div className="text-[13px] text-muted">Ready for AICTE</div>
              <div className="mt-2 font-mono text-[30px] leading-9 font-semibold text-ok tnum">
                {inr(result.validRows)} <span className="text-base text-muted">{pct(result.validRows, result.total)}%</span>
              </div>
              <Meter value={result.validRows} max={result.total} className="mt-2" />
            </div>
            <div className={cx('rounded-lg border bg-card p-5', hasErrors ? 'border-err/30' : 'border-line-soft')}>
              <div className="text-[13px] text-muted">Blocking errors</div>
              <div className={cx('mt-2 font-mono text-[30px] leading-9 font-semibold tnum', hasErrors ? 'text-err' : 'text-ink')}>{result.errorCount}</div>
              <div className="text-[13px] text-muted">{hasErrors ? `in ${result.errorRows} rows · submission blocked` : 'None, you can submit'}</div>
            </div>
            <div className="rounded-lg border border-line-soft bg-card p-5">
              <div className="text-[13px] text-muted">Warnings</div>
              <div className={cx('mt-2 font-mono text-[30px] leading-9 font-semibold tnum', result.warningCount ? 'text-warn' : 'text-ink')}>{result.warningCount}</div>
              <div className="text-[13px] text-muted">Allowed, but worth checking</div>
            </div>
          </div>

          <Panel className="mt-6" icon="scale" title="Approved intake used" subtitle="Regular admissions against sanctioned seats, with supernumerary seats counted separately">
            <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
              {result.intake.map((p) => {
                const over = p.regular > p.sanctioned
                return (
                  <div key={p.code}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-medium text-ink">{p.name}</div>
                      {over ? (
                        <Badge tone="err">+{p.regular - p.sanctioned} over intake</Badge>
                      ) : p.regular === p.sanctioned ? (
                        <Badge tone="ok">Full</Badge>
                      ) : (
                        <Badge tone="neutral">{p.sanctioned - p.regular} seats vacant</Badge>
                      )}
                    </div>
                    <Meter value={p.regular} max={p.sanctioned} className="mt-2.5" />
                    <div className="mt-1.5 flex justify-between font-mono text-[12.5px] text-muted tnum">
                      <span>
                        Regular <span className={over ? 'font-semibold text-err' : 'text-ink'}>{p.regular}</span> / {p.sanctioned}
                      </span>
                      <span>
                        Supernumerary {p.supernumeraryUsed} / {p.supernumeraryAllowed}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Panel>

          <Panel
            className="mt-6"
            icon="alert"
            title="Errors and warnings"
            subtitle="Each issue shows the rule that raised it and how to fix it"
            bodyClassName="p-0"
            actions={
              <>
                <Segmented
                  value={tab}
                  onChange={(v) => { setTab(v); setPage(0) }}
                  options={[
                    { value: 'all', label: `All ${issues.length}` },
                    { value: 'error', label: `Errors ${result.errorCount}` },
                    { value: 'warning', label: `Warnings ${result.warningCount}` },
                  ]}
                />
                <select className={cx(inputBase, 'h-8 text-[13px]')} value={prog} onChange={(e) => { setProg(e.target.value); setPage(0) }} aria-label="Programme">
                  <option value="all">All programmes</option>
                  {MY_PROGRAMMES.map((p) => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </select>
                <div className="relative">
                  <Icon name="search" size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle" />
                  <input className={cx(inputBase, 'h-8 w-48 pl-8 text-[13px]')} placeholder="Name, APAAR or row" value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} aria-label="Search issues" />
                </div>
              </>
            }
          >
            {issues.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-12 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-ok-bg text-ok">
                  <Icon name="checkCircle" size={24} />
                </span>
                <h3 className="mt-3 text-lg font-semibold">Every row passed</h3>
                <p className="mt-1 text-muted">All APAAR IDs are valid and admissions are within approved intake.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-230 text-left text-[13.5px]">
                    <thead className="bg-surface-low text-[12.5px] text-muted">
                      <tr>
                        <th className="px-5 py-3 font-medium">Row</th>
                        <th className="px-3 py-3 font-medium">Student</th>
                        <th className="px-3 py-3 font-medium">APAAR ID</th>
                        <th className="px-3 py-3 font-medium">Issue</th>
                        <th className="px-3 py-3 font-medium">Severity</th>
                        <th className="px-5 py-3 font-medium">How to fix</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line-soft">
                      {shown.map((i) => (
                        <tr key={i.id}>
                          <td className="px-5 py-3.5 align-top font-mono text-muted tnum">{i.row}</td>
                          <td className="px-3 py-3.5 align-top">
                            <div className="font-medium text-ink">{i.name}</div>
                            <div className="text-[12.5px] text-muted">{PROG_NAME[i.programme] ?? i.programme}</div>
                          </td>
                          <td className={cx('px-3 py-3.5 align-top font-mono text-[13px] whitespace-nowrap tnum', i.field === 'apaar_id' ? 'text-err' : 'text-ink')}>
                            {/^\d{12}$/.test(i.apaar) ? fmtApaar(i.apaar) : i.apaar || '—'}
                          </td>
                          <td className="px-3 py-3.5 align-top">
                            <div className="font-medium text-ink">{i.title}</div>
                            <div className="text-[12.5px] text-muted">{i.detail}</div>
                          </td>
                          <td className="px-3 py-3.5 align-top"><Severity level={i.severity} /></td>
                          <td className="max-w-65 px-5 py-3.5 align-top text-[13px] text-muted">{i.fix}</td>
                        </tr>
                      ))}
                      {!shown.length && (
                        <tr>
                          <td colSpan={6} className="px-5 py-10 text-center text-muted">No issues match these filters.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-line-soft px-5 py-3 text-[13px] text-muted">
                  <span>
                    {filtered.length ? `${page * PAGE + 1}–${Math.min(filtered.length, (page + 1) * PAGE)} of ${filtered.length}` : '0 issues'}
                  </span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" icon="chevronLeft" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Previous page" />
                    <span className="flex items-center px-2 font-mono tnum">{page + 1} / {pages}</span>
                    <Button size="sm" variant="ghost" icon="chevronRight" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} aria-label="Next page" />
                  </div>
                </div>
              </>
            )}
          </Panel>

          <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-line-soft bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="flex flex-wrap items-center gap-3">
              <Button icon="download" onClick={downloadReport} disabled={!issues.length}>
                Download issue report
              </Button>
              <span className={cx('flex-1 text-[13px]', hasErrors ? 'text-err' : 'text-ok')}>
                {hasErrors
                  ? `Fix ${result.errorCount} blocking errors before submitting.`
                  : result.warningCount
                    ? `Ready to submit. ${result.warningCount} warnings will be sent along for AICTE’s review.`
                    : 'Ready to submit.'}
              </span>
              <Button variant="primary" icon="lock" disabled={hasErrors} onClick={submit}>
                Submit to AICTE
              </Button>
            </div>
          </div>
        </>
      )}
    </Shell>
  )
}
