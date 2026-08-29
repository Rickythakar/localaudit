import Papa from 'papaparse'

export type ImportResult = {
  rows: Array<Record<string, unknown>>
  format: 'CSV' | 'JSON'
}

function extractJsonRows(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
  if (!value || typeof value !== 'object') return []

  const record = value as Record<string, unknown>
  const knownCollections = ['Browser History', 'browser_history', 'history', 'items']
  for (const key of knownCollections) {
    if (Array.isArray(record[key])) return extractJsonRows(record[key])
  }
  return []
}

export function parseHistoryText(text: string, fileName: string): ImportResult {
  const extension = fileName.split('.').pop()?.toLowerCase()

  if (extension === 'json') {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new Error('This JSON file could not be read')
    }
    const rows = extractJsonRows(parsed)
    if (!rows.length) throw new Error('No history rows were found')
    return { rows, format: 'JSON' }
  }

  if (extension === 'csv') {
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim(),
    })
    if (parsed.errors.length && !parsed.data.length) throw new Error(parsed.errors[0].message)
    if (!parsed.data.length) throw new Error('No history rows were found')
    return { rows: parsed.data, format: 'CSV' }
  }

  throw new Error('Choose a CSV or JSON history export')
}
