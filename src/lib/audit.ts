export type HistoryEntry = {
  id: string
  url: string
  title: string
  hostname: string
  protocol: string
  pathname: string
  hasQuery: boolean
  visitedAt: Date
  category: CategoryName
}

export type CategoryName =
  | 'Development'
  | 'Communication'
  | 'Productivity'
  | 'Social'
  | 'Media'
  | 'Shopping'
  | 'Other'

export type AuditResult = {
  totalVisits: number
  uniqueDomains: number
  dateRange: { start: Date | null; end: Date | null }
  peakHour: number | null
  topDomains: Array<{ domain: string; visits: number; share: number; category: CategoryName }>
  categories: Array<{ name: CategoryName; visits: number; share: number }>
  hourlyActivity: Array<{ hour: number; visits: number }>
  privacy: {
    score: number
    insecureVisits: number
    queryStringVisits: number
    uniqueInsecureDomains: number
  }
}

const fieldAliases = {
  url: ['url', 'URL', 'page_url', 'Page URL'],
  title: ['title', 'Title', 'page_title', 'Page Title'],
  visitedAt: ['visit_time', 'Visit Time', 'visited_at', 'Visited At', 'date', 'Date', 'last_visit_time'],
  microseconds: ['time_usec', 'timeUsec'],
} as const

const categoryRules: Array<{ category: CategoryName; fragments: string[] }> = [
  { category: 'Development', fragments: ['github.', 'gitlab.', 'stackoverflow.', 'developer.', 'npmjs.', 'vercel.', 'netlify.'] },
  { category: 'Communication', fragments: ['mail.', 'gmail.', 'outlook.', 'slack.', 'teams.', 'discord.'] },
  { category: 'Productivity', fragments: ['notion.', 'docs.google.', 'drive.google.', 'dropbox.', 'figma.', 'asana.', 'trello.'] },
  { category: 'Social', fragments: ['reddit.', 'linkedin.', 'facebook.', 'instagram.', 'x.com', 'twitter.'] },
  { category: 'Media', fragments: ['youtube.', 'spotify.', 'netflix.', 'twitch.', 'vimeo.'] },
  { category: 'Shopping', fragments: ['amazon.', 'ebay.', 'etsy.', 'walmart.', 'target.'] },
]

function firstValue(row: Record<string, unknown>, keys: readonly string[]): unknown {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

function parseVisitedAt(row: Record<string, unknown>): Date | null {
  const microseconds = firstValue(row, fieldAliases.microseconds)
  if (microseconds !== undefined) {
    const milliseconds = Number(microseconds) / 1000
    const date = new Date(milliseconds)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const raw = firstValue(row, fieldAliases.visitedAt)
  if (raw === undefined) return null
  const date = new Date(String(raw))
  return Number.isNaN(date.getTime()) ? null : date
}

export function categorizeDomain(hostname: string): CategoryName {
  const normalized = hostname.toLowerCase()
  return categoryRules.find((rule) => rule.fragments.some((fragment) => normalized.includes(fragment)))?.category ?? 'Other'
}

export function normalizeHistoryRows(rows: Array<Record<string, unknown>>): {
  entries: HistoryEntry[]
  skipped: number
} {
  const entries: HistoryEntry[] = []
  let skipped = 0

  rows.forEach((row, index) => {
    const rawUrl = firstValue(row, fieldAliases.url)
    const visitedAt = parseVisitedAt(row)
    try {
      if (!rawUrl || !visitedAt) throw new Error('Missing required history data')
      const parsed = new URL(String(rawUrl))
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported protocol')
      entries.push({
        id: `${visitedAt.getTime()}-${index}`,
        url: parsed.href,
        title: String(firstValue(row, fieldAliases.title) ?? parsed.hostname),
        hostname: parsed.hostname.replace(/^www\./, ''),
        protocol: parsed.protocol,
        pathname: parsed.pathname,
        hasQuery: parsed.search.length > 0,
        visitedAt,
        category: categorizeDomain(parsed.hostname),
      })
    } catch {
      skipped += 1
    }
  })

  return { entries: entries.sort((a, b) => b.visitedAt.getTime() - a.visitedAt.getTime()), skipped }
}

function percent(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100)
}

export function auditHistory(entries: HistoryEntry[]): AuditResult {
  const totalVisits = entries.length
  const domainCounts = new Map<string, { visits: number; category: CategoryName }>()
  const categoryCounts = new Map<CategoryName, number>()
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, visits: 0 }))

  for (const entry of entries) {
    const currentDomain = domainCounts.get(entry.hostname)
    domainCounts.set(entry.hostname, {
      visits: (currentDomain?.visits ?? 0) + 1,
      category: entry.category,
    })
    categoryCounts.set(entry.category, (categoryCounts.get(entry.category) ?? 0) + 1)
    hours[entry.visitedAt.getUTCHours()].visits += 1
  }

  const topDomains = [...domainCounts.entries()]
    .map(([domain, value]) => ({ domain, ...value, share: percent(value.visits, totalVisits) }))
    .sort((a, b) => b.visits - a.visits || a.domain.localeCompare(b.domain))

  const categories = [...categoryCounts.entries()]
    .map(([name, visits]) => ({ name, visits, share: percent(visits, totalVisits) }))
    .sort((a, b) => b.visits - a.visits)

  const insecureEntries = entries.filter((entry) => entry.protocol === 'http:')
  const queryStringVisits = entries.filter((entry) => entry.hasQuery).length
  const privacyPenalty = Math.min(65, percent(insecureEntries.length, totalVisits) + Math.round(percent(queryStringVisits, totalVisits) / 3))
  const peak = hours.reduce((best, current) => (current.visits > best.visits ? current : best), hours[0])

  return {
    totalVisits,
    uniqueDomains: domainCounts.size,
    dateRange: {
      start: totalVisits ? entries.reduce((oldest, entry) => entry.visitedAt < oldest ? entry.visitedAt : oldest, entries[0].visitedAt) : null,
      end: totalVisits ? entries.reduce((newest, entry) => entry.visitedAt > newest ? entry.visitedAt : newest, entries[0].visitedAt) : null,
    },
    peakHour: peak.visits > 0 ? peak.hour : null,
    topDomains,
    categories,
    hourlyActivity: hours,
    privacy: {
      score: totalVisits ? 100 - privacyPenalty : 100,
      insecureVisits: insecureEntries.length,
      queryStringVisits,
      uniqueInsecureDomains: new Set(insecureEntries.map((entry) => entry.hostname)).size,
    },
  }
}
