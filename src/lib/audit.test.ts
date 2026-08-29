import { describe, expect, it } from 'vitest'
import { auditHistory, normalizeHistoryRows } from './audit'

describe('normalizeHistoryRows', () => {
  it('accepts common browser history field names and skips invalid rows', () => {
    const rows = [
      { url: 'https://docs.example.com/guide?q=private', title: 'Guide', visit_time: '2026-08-28T14:00:00Z' },
      { URL: 'http://news.example.org/story', Title: 'Story', 'Visit Time': '2026-08-28 10:30:00' },
      { url: 'not a url', title: 'Broken', visit_time: '2026-08-28T15:00:00Z' },
    ]

    const result = normalizeHistoryRows(rows)

    expect(result.entries).toHaveLength(2)
    expect(result.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ hostname: 'docs.example.com', protocol: 'https:' }),
      expect.objectContaining({ hostname: 'news.example.org', protocol: 'http:' }),
    ]))
    expect(result.skipped).toBe(1)
  })

  it('supports Chrome Takeout microsecond timestamps', () => {
    const result = normalizeHistoryRows([
      { url: 'https://example.com', title: 'Example', time_usec: '1787925600000000' },
    ])

    expect(result.entries[0].visitedAt.toISOString()).toBe('2026-08-28T14:00:00.000Z')
  })
})

describe('auditHistory', () => {
  it('summarizes domains, activity, categories, and privacy signals', () => {
    const { entries } = normalizeHistoryRows([
      { url: 'https://github.com/ricky', title: 'GitHub', visit_time: '2026-08-28T14:00:00Z' },
      { url: 'https://github.com/issues?token=visible', title: 'Issues', visit_time: '2026-08-28T14:20:00Z' },
      { url: 'http://mail.example.com/inbox', title: 'Mail', visit_time: '2026-08-28T22:00:00Z' },
    ])

    const audit = auditHistory(entries)

    expect(audit.totalVisits).toBe(3)
    expect(audit.uniqueDomains).toBe(2)
    expect(audit.topDomains[0]).toMatchObject({ domain: 'github.com', visits: 2 })
    expect(audit.peakHour).toBe(14)
    expect(audit.privacy.insecureVisits).toBe(1)
    expect(audit.privacy.queryStringVisits).toBe(1)
    expect(audit.categories.find((item) => item.name === 'Development')?.visits).toBe(2)
  })

  it('returns an empty audit without invalid numeric values', () => {
    const audit = auditHistory([])

    expect(audit.totalVisits).toBe(0)
    expect(audit.uniqueDomains).toBe(0)
    expect(audit.peakHour).toBeNull()
    expect(audit.privacy.score).toBe(100)
  })
})
