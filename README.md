<div align="center">

# LocalAudit

### Understand your browsing. Keep it private.

A local-first browser history analyzer that turns raw exports into clear activity and privacy insights without uploading personal data.

[Live demo](https://rickythakar.github.io/localaudit/) · [Report a bug](https://github.com/Rickythakar/localaudit/issues)

</div>

## Why LocalAudit

Browser history can reveal routines, interests, work patterns, and sensitive context. Most analytics products ask users to send that information to a server. LocalAudit performs the full import and analysis workflow inside the browser tab instead.

## What it does

- Imports CSV history exports and Chrome Takeout `BrowserHistory.json`
- Normalizes common URL, title, and timestamp field names
- Summarizes visits, unique domains, categories, and peak hours
- Highlights insecure HTTP visits and query-bearing URLs
- Displays hourly activity, attention mix, top domains, and a filterable visit log
- Includes realistic synthetic data for a one-click portfolio demo
- Clears all session data on refresh or when the audit is discarded

## Privacy model

LocalAudit has no backend, analytics SDK, account system, cookies, or third-party runtime requests. Files are read with browser APIs and remain in memory for the active tab. No history data is transmitted or persisted by the application.

## Supported inputs

| Format | Expected fields |
| --- | --- |
| CSV | `url`, `title`, and a timestamp such as `visit_time`, `visited_at`, or `date` |
| Chrome Takeout JSON | The standard `Browser History` collection with `url`, `title`, and `time_usec` |

Invalid rows and unsupported URL schemes are safely skipped and reported in the audit header.

## Tech stack

- React 18 and TypeScript
- Vite
- Papa Parse
- Vitest and Testing Library
- GitHub Actions and GitHub Pages

## Run locally

```bash
nvm use
npm install
npm run dev
```

Quality checks:

```bash
npm test
npm run build
npm audit --omit=dev
```

## Architecture

```text
CSV / JSON export
       ↓
format-aware parser
       ↓
normalized history entries
       ↓
local audit engine
       ↓
responsive insight dashboard
```

The parsing and audit layers are pure TypeScript modules, which keeps the privacy boundary easy to inspect and the core behavior fast to test.

## Current scope

This release deliberately focuses on a strong base workflow. Browser-specific setup guides, additional personal-data exports, custom categorization, saved comparisons, and downloadable reports are natural future extensions.

## License

[MIT](LICENSE)
