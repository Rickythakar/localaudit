import { describe, expect, it } from 'vitest'
import { parseHistoryText } from './import'

describe('parseHistoryText', () => {
  it('parses CSV history exports', () => {
    const result = parseHistoryText(
      'url,title,visit_time\nhttps://example.com,Example,2026-08-28T14:00:00Z',
      'history.csv',
    )

    expect(result.rows).toEqual([
      { url: 'https://example.com', title: 'Example', visit_time: '2026-08-28T14:00:00Z' },
    ])
    expect(result.format).toBe('CSV')
  })

  it('extracts rows from Chrome Takeout JSON', () => {
    const result = parseHistoryText(
      JSON.stringify({ 'Browser History': [{ url: 'https://example.com', title: 'Example', time_usec: 1787925600000000 }] }),
      'BrowserHistory.json',
    )

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].url).toBe('https://example.com')
    expect(result.format).toBe('JSON')
  })

  it('rejects unsupported or empty exports', () => {
    expect(() => parseHistoryText('hello', 'notes.txt')).toThrow('Choose a CSV or JSON history export')
    expect(() => parseHistoryText('[]', 'history.json')).toThrow('No history rows were found')
  })
})
