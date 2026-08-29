const sampleDomains = [
  ['github.com', 'Pull request review', '/Rickythakar/localaudit/pulls'],
  ['docs.google.com', 'Project planning notes', '/document/d/sample'],
  ['youtube.com', 'Design systems talk', '/watch'],
  ['github.com', 'LocalAudit repository', '/Rickythakar/localaudit'],
  ['stackoverflow.com', 'TypeScript URL parsing', '/questions/sample'],
  ['mail.google.com', 'Inbox', '/mail/u/0'],
  ['notion.so', 'Product backlog', '/workspace/backlog'],
  ['reddit.com', 'Web development discussion', '/r/webdev'],
  ['figma.com', 'Dashboard exploration', '/file/sample'],
  ['news.ycombinator.com', 'Hacker News', '/news'],
  ['amazon.com', 'Order history', '/gp/your-account'],
  ['spotify.com', 'Focus playlist', '/collection/tracks'],
] as const

export const sampleHistoryRows: Array<Record<string, unknown>> = Array.from({ length: 48 }, (_, index) => {
  const [domain, title, path] = sampleDomains[index % sampleDomains.length]
  const date = new Date(Date.UTC(2026, 7, 28 - Math.floor(index / 16), 22 - (index % 12), (index * 7) % 60))
  const protocol = index === 17 || index === 35 ? 'http' : 'https'
  const query = index % 9 === 0 ? '?ref=sample' : ''
  return {
    url: `${protocol}://${domain}${path}${query}`,
    title,
    visit_time: date.toISOString(),
  }
})
