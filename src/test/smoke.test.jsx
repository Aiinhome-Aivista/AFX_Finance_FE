// Mounts the real app against a running backend (http://127.0.0.1:5000) and walks the 6-step workflow.
import { describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import axios from 'axios'
import App from '../App'
import { AuthProvider } from '../context/AuthContext'
import { ThemeProvider } from '../context/ThemeContext'
import { ToastProvider } from '../context/ToastContext'

const API = 'http://127.0.0.1:5000/api'
const S = 'working-capital-treasury'
let token
const H = () => ({ headers: { Authorization: `Bearer ${token}` } })
const post = (u, b = {}) => axios.post(API + u, b, H()).then((r) => r.data)
const get = (u) => axios.get(API + u, H()).then((r) => r.data)

function mount(path) {
  localStorage.setItem('fkg-token', token)
  return render(<MemoryRouter initialEntries={[path]}><ThemeProvider><ToastProvider><AuthProvider><App /></AuthProvider></ToastProvider></ThemeProvider></MemoryRouter>)
}
const errors = []
vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ')) })

describe('UI against live backend', () => {
  it('registers, lands on Finance, shows 8 domains', async () => {
    const r = await axios.post(API + '/auth/register', { email: `ui${Date.now()}@example.com`, display_name: 'UI Tester', password: 'Passw0rdX' })
    token = r.data.token
    await post('/apps/select', { app: 'finance' })
    mount('/finance')
    await screen.findByText('Planning, Budgeting and Forecasting')
    expect(screen.getAllByRole('article')).toHaveLength(8)
    fireEvent.change(screen.getByLabelText('Search domains'), { target: { value: 'treasury' } })
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1))
    cleanup()
  })

  it('domain overview -> KG0 explorer renders graph, flows, blocks', async () => {
    mount(`/finance/${S}`)
    await screen.findByText(/Select this domain & generate KG0/)
    fireEvent.click(screen.getByText(/Select this domain & generate KG0/))
    await screen.findByText('KG0 · read-only reference', {}, { timeout: 15000 })
    await screen.findByText('Credit-to-cash', {}, { timeout: 15000 })
    await screen.findByText(/Choose the blocks you want to customise/)
    expect(document.querySelectorAll('.react-flow__node').length).toBeGreaterThan(8)
    // click a node -> details panel
    fireEvent.click(document.querySelector('.react-flow__node'))
    await screen.findByText('Definition', {}, { timeout: 10000 })
    // flow card highlights steps
    fireEvent.click(screen.getByText('Credit-to-cash'))
    await screen.findAllByText('DebtorPosition / CreditPolicy', {}, { timeout: 10000 })
    // confirm blocks -> customize
    fireEvent.click(screen.getByText(/Confirm blocks & start customising/))
    await screen.findByText('Tell us how your business really works', {}, { timeout: 15000 })
    cleanup()
  })

  it('chat -> proposal -> approve -> KG1; finalize; telemetry upload -> KG2', async () => {
    mount(`/finance/${S}/customize`)
    fireEvent.click(await screen.findByText('Start the interview', {}, { timeout: 15000 }))
    await screen.findByText(/What do you call this/, {}, { timeout: 15000 })
    const box = screen.getByLabelText('Your message')
    fireEvent.change(box, { target: { value: 'We call it Receivables Control Desk' } })
    fireEvent.click(screen.getByLabelText('Send'))
    await screen.findByText(/propose renaming/, {}, { timeout: 15000 })
    fireEvent.click(screen.getByText('Review proposed changes'))
    await screen.findByText(/Approve & create new version/, {}, { timeout: 15000 })
    fireEvent.click(screen.getByText('Approve & create new version'))
    await waitFor(async () => expect((await get(`/domains/${S}/versions`)).versions.length).toBe(1), { timeout: 15000 })
    cleanup()

    mount(`/finance/${S}/finalize`)
    await screen.findByText(/Graph preview · KG1/, {}, { timeout: 15000 })
    await screen.findByText('Change history')
    fireEvent.click(screen.getByText('Finalise ontology…'))
    const dlgBtn = await screen.findAllByText('Finalise')
    const ack = document.querySelector('[role=dialog] input[type=checkbox]')
    if (ack) fireEvent.click(ack)
    fireEvent.click(dlgBtn[dlgBtn.length - 1])
    await screen.findByText(/Finalised as KG1/, {}, { timeout: 15000 })
    cleanup()

    // upload through the real multipart path (the UI uses the same axios call)
    const fd = new FormData(); fd.append('file', new Blob(['arDso,ageingBuckets\n41,0-30\n'], { type: 'text/csv' }), 'debtors.csv')
    await axios.post(`${API}/domains/${S}/files`, fd, H())
    mount(`/finance/${S}/telemetry`)
    await screen.findByText('debtors.csv', {}, { timeout: 15000 })
    await screen.findByText('Processed', {}, { timeout: 15000 })
    fireEvent.click(screen.getByText('Generate telemetry graph'))
    fireEvent.click(await screen.findByText('Approve & create telemetry graph', {}, { timeout: 15000 }))
    await screen.findByText(/Telemetry graph · KG2/, {}, { timeout: 20000 })
    cleanup()
  })

  it('no React runtime errors were logged', () => {
    const real = errors.filter((e) => !/act\(|not wrapped in act|Could not parse CSS|Not implemented/.test(e))
    expect(real, real.join('\n---\n')).toEqual([])
  })
})
