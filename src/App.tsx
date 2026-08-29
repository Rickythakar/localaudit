import { useMemo, useRef, useState, type DragEvent } from 'react'
import { auditHistory, normalizeHistoryRows, type HistoryEntry } from './lib/audit'
import { parseHistoryText } from './lib/import'
import { sampleHistoryRows } from './lib/sample'

type ImportMeta = { name: string; format: string; skipped: number }

const categoryColors: Record<string, string> = {
  Development: '#1f6f52', Communication: '#d77f44', Productivity: '#5e6fa3', Social: '#b35b72',
  Media: '#8a63a8', Shopping: '#bb9b3f', Other: '#84918a',
}

function ShieldIcon({ small = false }: { small?: boolean }) {
  return (
    <svg className={small ? 'icon-sm' : 'brand-mark'} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 2 28 7v8c0 7.2-4.7 12.2-12 15C8.7 27.2 4 22.2 4 15V7l12-5Z" fill="currentColor" />
      <path d="m10.5 16 3.6 3.6 7.8-8" fill="none" stroke="#f8f5ec" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Header({ hasAudit, onClear }: { hasAudit: boolean; onClear: () => void }) {
  return (
    <header className="site-header">
      <a className="brand" href="./" aria-label="LocalAudit home"><ShieldIcon /><span>Local<span>Audit</span></span></a>
      <div className="header-actions">
        <span className="local-status"><span className="status-dot" /> Local processing only</span>
        {hasAudit && <button className="button button-ghost button-small" onClick={onClear}>Clear audit</button>}
      </div>
    </header>
  )
}

function ImportScreen({ onRows }: { onRows: (rows: Array<Record<string, unknown>>, meta: ImportMeta) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  async function loadFile(file?: File) {
    if (!file) return
    try {
      setError('')
      const parsed = parseHistoryText(await file.text(), file.name)
      const normalized = normalizeHistoryRows(parsed.rows)
      if (!normalized.entries.length) throw new Error('No valid browser visits were found')
      onRows(parsed.rows, { name: file.name, format: parsed.format, skipped: normalized.skipped })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'This export could not be read')
    }
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    void loadFile(event.dataTransfer.files[0])
  }

  return (
    <main>
      <section className="hero shell">
        <div className="hero-copy">
          <span className="eyebrow"><span /> Privacy-first browser insights</span>
          <h1>Understand your browsing.<br /><em>Keep it private.</em></h1>
          <p className="hero-lede">Turn a browser history export into a clear picture of your habits, focus, and privacy exposure—without uploading a single visit.</p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={() => inputRef.current?.click()}>Choose history export <span>↗</span></button>
            <button className="button button-secondary" onClick={() => onRows(sampleHistoryRows, { name: 'sample-history.csv', format: 'Sample', skipped: 0 })}>Try sample audit</button>
          </div>
          <div className="trust-line"><ShieldIcon small /><span><strong>Your data never leaves your device.</strong><br />No accounts. No servers. No tracking.</span></div>
        </div>

        <div className="audit-preview" aria-label="Example local audit">
          <div className="preview-top"><span>LOCAL AUDIT</span><span className="preview-live"><i /> ANALYSIS READY</span></div>
          <div className="score-orbit"><div><strong>92</strong><span>privacy score</span></div></div>
          <div className="preview-stats">
            <div><span>Visits reviewed</span><strong>2,481</strong></div>
            <div><span>Unique domains</span><strong>186</strong></div>
            <div><span>Data uploaded</span><strong className="safe">0 bytes</strong></div>
          </div>
          <div className="preview-bars"><span style={{ width: '86%' }} /><span style={{ width: '64%' }} /><span style={{ width: '76%' }} /><span style={{ width: '48%' }} /><span style={{ width: '69%' }} /></div>
          <div className="preview-caption">A private window into your digital routine</div>
        </div>
      </section>

      <section className="import-section shell">
        <div className={`drop-zone ${dragging ? 'is-dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={drop}>
          <input ref={inputRef} type="file" accept=".csv,.json,text/csv,application/json" onChange={(event) => void loadFile(event.target.files?.[0])} />
          <div className="drop-icon">⇩</div>
          <div><strong>Drop a CSV or JSON history export</strong><span>Chrome Takeout and common CSV formats supported</span></div>
          <button className="text-button" onClick={() => inputRef.current?.click()}>Browse files</button>
        </div>
        {error && <p className="error-message" role="alert">{error}</p>}
      </section>

      <section className="principles shell">
        <article><span>01</span><h2>Stays local</h2><p>Analysis runs entirely in your browser. Refresh the page and the data is gone.</p></article>
        <article><span>02</span><h2>Shows patterns</h2><p>See domains, categories, active hours, and the rhythm hiding in raw history.</p></article>
        <article><span>03</span><h2>Flags exposure</h2><p>Spot insecure visits and URLs carrying query parameters that may reveal context.</p></article>
      </section>
    </main>
  )
}

function formatHour(hour: number | null) {
  if (hour === null) return '—'
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const display = hour % 12 || 12
  return `${display} ${suffix}`
}

function Dashboard({ entries, meta, onClear }: { entries: HistoryEntry[]; meta: ImportMeta; onClear: () => void }) {
  const [query, setQuery] = useState('')
  const audit = useMemo(() => auditHistory(entries), [entries])
  const filtered = useMemo(() => entries.filter((entry) => `${entry.hostname} ${entry.title} ${entry.category}`.toLowerCase().includes(query.toLowerCase())), [entries, query])
  const maxHour = Math.max(...audit.hourlyActivity.map((item) => item.visits), 1)
  const categoryGradient = audit.categories.length
    ? `conic-gradient(${audit.categories.map((item, index) => {
      const before = audit.categories.slice(0, index).reduce((sum, current) => sum + current.share, 0)
      return `${categoryColors[item.name]} ${before}% ${before + item.share}%`
    }).join(', ')})`
    : '#d8ddd7'

  return (
    <main className="dashboard shell">
      <div className="dashboard-heading">
        <div><span className="eyebrow"><span /> Audit complete</span><h1>Audit overview</h1><p>{meta.name} · {meta.format} · processed locally {meta.skipped ? `· ${meta.skipped} skipped` : ''}</p></div>
        <div className="score-pill"><span>Privacy score</span><strong>{audit.privacy.score}</strong><i>/100</i></div>
      </div>

      <section className="metrics" aria-label="Audit metrics">
        <article><span>Total visits</span><strong className="metric-value">{audit.totalVisits.toLocaleString()}</strong><small>rows analyzed</small></article>
        <article><span>Unique domains</span><strong className="metric-value">{audit.uniqueDomains}</strong><small>across your export</small></article>
        <article><span>Peak activity</span><strong className="metric-value">{formatHour(audit.peakHour)}</strong><small>UTC export time</small></article>
        <article><span>Insecure visits</span><strong className="metric-value">{audit.privacy.insecureVisits}</strong><small>used HTTP</small></article>
      </section>

      <section className="dashboard-grid">
        <article className="panel activity-panel">
          <div className="panel-heading"><div><span>ACTIVITY RHYTHM</span><h2>Visits by hour</h2></div><small>UTC</small></div>
          <div className="hour-chart" aria-label="Hourly activity chart">
            {audit.hourlyActivity.map((item) => <div className="hour-column" key={item.hour} title={`${formatHour(item.hour)}: ${item.visits} visits`}><i style={{ height: `${Math.max(5, (item.visits / maxHour) * 100)}%` }} /><span>{item.hour % 4 === 0 ? item.hour.toString().padStart(2, '0') : ''}</span></div>)}
          </div>
        </article>

        <article className="panel category-panel">
          <div className="panel-heading"><div><span>ATTENTION MIX</span><h2>Categories</h2></div></div>
          <div className="category-content">
            <div className="donut" style={{ background: categoryGradient }}><div><strong>{audit.categories.length}</strong><span>groups</span></div></div>
            <div className="legend">{audit.categories.slice(0, 5).map((item) => <div key={item.name}><i style={{ background: categoryColors[item.name] }} /><span>{item.name}</span><strong>{item.share}%</strong></div>)}</div>
          </div>
        </article>

        <article className="panel domains-panel">
          <div className="panel-heading"><div><span>FREQUENCY</span><h2>Top domains</h2></div><small>{audit.uniqueDomains} total</small></div>
          <div className="domain-list">{audit.topDomains.slice(0, 6).map((item, index) => <div className="domain-row" key={item.domain}><span className="rank">{String(index + 1).padStart(2, '0')}</span><div><strong>{item.domain}</strong><i><b style={{ width: `${item.share}%` }} /></i></div><span>{item.visits} visits</span></div>)}</div>
        </article>

        <article className="panel privacy-panel">
          <div className="panel-heading"><div><span>EXPOSURE CHECK</span><h2>Privacy signals</h2></div></div>
          <div className="signal-list">
            <div className={audit.privacy.insecureVisits ? 'signal warning' : 'signal safe-signal'}><span>{audit.privacy.insecureVisits ? '!' : '✓'}</span><div><strong>Unencrypted pages</strong><p>{audit.privacy.insecureVisits ? `${audit.privacy.insecureVisits} visits across ${audit.privacy.uniqueInsecureDomains} domains used HTTP.` : 'Every recorded visit used HTTPS.'}</p></div></div>
            <div className={audit.privacy.queryStringVisits ? 'signal note' : 'signal safe-signal'}><span>{audit.privacy.queryStringVisits ? '?' : '✓'}</span><div><strong>Query parameters</strong><p>{audit.privacy.queryStringVisits ? `${audit.privacy.queryStringVisits} URLs include parameters that can preserve search or referral context.` : 'No query parameters detected.'}</p></div></div>
            <div className="signal safe-signal"><span>✓</span><div><strong>Local analysis</strong><p>Nothing from this audit was sent to a server.</p></div></div>
          </div>
        </article>
      </section>

      <section className="panel visit-panel">
        <div className="panel-heading visit-heading"><div><span>RECENT RECORDS</span><h2>Visit log</h2></div><label className="search-field"><span>⌕</span><input type="search" aria-label="Filter visits" placeholder="Filter visits" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
        <div className="visit-table" role="table">
          <div className="visit-row table-head" role="row"><span>Domain</span><span>Page</span><span>Category</span><span>Visited</span></div>
          {filtered.slice(0, 20).map((entry) => <div className="visit-row" role="row" key={entry.id}><strong>{entry.hostname}</strong><span>{entry.title}</span><span><i style={{ background: categoryColors[entry.category] }} />{entry.category}</span><time>{entry.visitedAt.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time></div>)}
          {!filtered.length && <div className="empty-filter">No visits match “{query}”.</div>}
        </div>
      </section>
      <div className="dashboard-footer"><span><ShieldIcon small /> This session exists only in this tab.</span><button className="text-button" onClick={onClear}>Discard session</button></div>
    </main>
  )
}

export default function App() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [meta, setMeta] = useState<ImportMeta | null>(null)

  function load(rows: Array<Record<string, unknown>>, nextMeta: ImportMeta) {
    const normalized = normalizeHistoryRows(rows)
    setEntries(normalized.entries)
    setMeta({ ...nextMeta, skipped: normalized.skipped })
    window.scrollTo?.({ top: 0, behavior: 'auto' })
  }

  function clear() {
    setEntries([])
    setMeta(null)
  }

  return <><Header hasAudit={Boolean(meta)} onClear={clear} />{meta ? <Dashboard entries={entries} meta={meta} onClear={clear} /> : <ImportScreen onRows={load} />}<footer className="site-footer"><span>LocalAudit</span><span>Private by architecture · Open source by design</span></footer></>
}
