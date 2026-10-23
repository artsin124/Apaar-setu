import { useState } from 'react'
import Icon from './Icon.jsx'
import { Avatar } from './ui.jsx'
import { Link } from '../lib/router.jsx'
import { cx } from '../lib/format.js'
import { GovFooter, GovStrip } from './GovChrome.jsx'
import { usePrefs } from '../state/Prefs.jsx'

export function LogoMark({ size = 32, className }) {
  // A bridge ("setu") arching over a baseline of record dots.
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="7" fill="#ffa44b" />
      <path d="M5 21c3.5-8 18.5-8 22 0" fill="none" stroke="#061445" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M11 16.6v4.4M16 15v6M21 16.6v4.4" stroke="#061445" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 24.5h24" stroke="#061445" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}

export function Brand({ subtitle, dark = true }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <div className="leading-tight">
        <div className={cx('font-display text-[16px] font-bold', dark ? 'text-white' : 'text-primary')}>APAAR Setu</div>
        {subtitle && <div className={cx('text-[11.5px]', dark ? 'text-primary-soft' : 'text-muted')}>{subtitle}</div>}
      </div>
    </div>
  )
}

export default function Shell({ subtitle, context, nav, user, crumbs, topExtra, children }) {
  const [open, setOpen] = useState(false)
  const { t } = usePrefs()

  const sidebar = (
    <div className="flex h-full flex-col bg-primary-2 text-white">
      <div className="border-b border-white/10 px-5 pt-5 pb-4">
        <Brand subtitle={subtitle} />
        {context && <p className="mt-3 text-[12px] leading-4 text-primary-soft">{context}</p>}
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-4" aria-label="Main">
        {nav.map((item) => (
          <a
            key={item.label}
            href={item.to ? `#${item.to}` : undefined}
            aria-current={item.active ? 'page' : undefined}
            aria-disabled={!item.to || undefined}
            onClick={() => setOpen(false)}
            className={cx(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-[14px] transition-colors',
              item.active ? 'bg-white/12 font-semibold text-white' : 'text-white/75',
              item.to ? 'hover:bg-white/8 hover:text-white' : 'cursor-default opacity-60',
            )}
          >
            <Icon name={item.icon} size={18} />
            <span className="flex-1">{t(item.label)}</span>
            {item.badge && <span className="rounded-sm bg-err px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white">{item.badge}</span>}
          </a>
        ))}
      </nav>
      <div className="border-t border-white/10 px-5 py-4 text-[12px] text-primary-soft">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[#43d38f]" />
          Registry sync live
        </div>
        <Link to="/" className="mt-3 inline-flex items-center gap-1.5 text-white/80 hover:text-white">
          <Icon name="switch" size={15} /> {t('Switch portal')}
        </Link>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen flex-col lg:pl-62">
      <GovStrip />
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-62 lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-primary/40" />
          <aside className="absolute inset-y-0 left-0 w-65" onClick={(e) => e.stopPropagation()}>
            {sidebar}
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line-soft bg-surface/95 px-4 backdrop-blur sm:px-6">
        <button type="button" className="rounded-md p-2 text-ink hover:bg-surface-mid lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
          <Icon name="menu" />
        </button>
        <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 items-center gap-1.5 truncate text-[13px] text-muted md:flex">
          {crumbs.map((c, i) => (
            <span key={c} className={cx('truncate', i === crumbs.length - 1 && 'font-medium text-ink')}>
              {i > 0 && <span className="mr-1.5 text-subtle">/</span>}
              {t(c)}
            </span>
          ))}
        </nav>
        <div className="flex-1 md:hidden" />
        {topExtra}
        <div className="flex items-center gap-3 border-l border-line-soft pl-3">
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-[13.5px] font-semibold text-ink">{user.name}</div>
            <div className="text-[12px] text-muted">{user.role}</div>
          </div>
          <Avatar name={user.name} size={36} />
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-350 flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8">
        {children}
      </main>
      <GovFooter />
    </div>
  )
}
