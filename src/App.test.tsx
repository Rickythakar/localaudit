import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('LocalAudit', () => {
  it('explains local processing before an export is loaded', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /understand your browsing/i })).toBeInTheDocument()
    expect(screen.getByText(/never leaves your device/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try sample audit/i })).toBeInTheDocument()
  })

  it('loads the sample audit and shows actionable insights', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /try sample audit/i }))

    expect(screen.getByRole('heading', { name: /audit overview/i })).toBeInTheDocument()
    expect(screen.getByText('48', { selector: '.metric-value' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /privacy signals/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /top domains/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clear audit/i })).toBeInTheDocument()
  })

  it('filters the visit log without changing audit totals', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /try sample audit/i }))

    await user.type(screen.getByRole('searchbox', { name: /filter visits/i }), 'github')

    expect(screen.getAllByText('github.com').length).toBeGreaterThan(0)
    expect(screen.queryByText('youtube.com')).not.toBeInTheDocument()
    expect(screen.getByText('48', { selector: '.metric-value' })).toBeInTheDocument()
  })

  it('clears the audit and returns to the import screen', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /try sample audit/i }))
    await user.click(screen.getByRole('button', { name: /clear audit/i }))

    expect(screen.getByRole('heading', { name: /understand your browsing/i })).toBeInTheDocument()
  })
})
