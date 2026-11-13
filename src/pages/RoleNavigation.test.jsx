// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AppSelect from './AppSelect'
import FinanceLanding from './FinanceLanding'

const mockNavigate = vi.fn()
let mockAuthState = {
  user: { id: 1, email: 'arch@afx.io', display_name: 'Arch User', role: 'data_architect', selected_app: null },
  role: 'data_architect',
  isArchitect: true,
  isAnalyst: false,
  refreshUser: vi.fn(),
  logout: vi.fn(),
}

const mockAppsApi = {
  list: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  select: vi.fn(),
}

const mockDomainsApi = {
  workspaceModels: vi.fn(),
}

const mockOntologyApi = {
  overviewGraph: vi.fn(),
}

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}))

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggle: vi.fn() }),
}))

vi.mock('../context/WorkflowContext', () => ({
  useWorkflow: () => ({ updateDomainWorkflow: vi.fn(), getDomainWorkflow: () => ({}) }),
}))

vi.mock('../components/common/Layout', () => ({
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}))

vi.mock('../components/graph/OntologyGraphCanvas', () => ({
  default: () => <div data-testid="graph-canvas" />,
}))

vi.mock('../api', () => ({
  apps: {
    list: (...a) => mockAppsApi.list(...a),
    subscribe: (...a) => mockAppsApi.subscribe(...a),
    unsubscribe: (...a) => mockAppsApi.unsubscribe(...a),
    select: (...a) => mockAppsApi.select(...a),
  },
  domains: {
    workspaceModels: (...a) => mockDomainsApi.workspaceModels(...a),
  },
  ontology: {
    overviewGraph: (...a) => mockOntologyApi.overviewGraph(...a),
  },
}))

describe('Role-Based Navigation & Model Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthState = {
      user: { id: 1, email: 'arch@afx.io', display_name: 'Arch User', role: 'data_architect', selected_app: null },
      role: 'data_architect',
      isArchitect: true,
      isAnalyst: false,
      refreshUser: vi.fn().mockResolvedValue({ id: 1, role: 'data_architect', selected_app: 'finance' }),
      logout: vi.fn(),
    }
    mockOntologyApi.overviewGraph.mockResolvedValue({ nodes: [], edges: [], flows: [], domains: [], progress: {} })
  })

  afterEach(() => {
    cleanup()
  })

  it('AppSelect shows Finance, FMCG, and Others (disabled), moves selected model via center arrow, highlights card & Go button, and navigates on Go', async () => {
    const financeApp = { key: 'finance', name: 'Finance', description: 'Finance KG', route: '/finance', active: true }
    const fmcgApp = { key: 'fmcg', name: 'FMCG', description: 'FMCG KG', route: '/fmcg', active: true }
    const othersApp = { key: 'others', name: 'Others', description: 'Others KG', route: '/others', active: false }
    mockAppsApi.list.mockResolvedValue({
      apps: [financeApp, fmcgApp, othersApp],
      available_apps: [financeApp, fmcgApp, othersApp],
      subscribed_apps: [],
      selected_app: null,
    })
    mockAppsApi.subscribe.mockResolvedValue({
      apps: [financeApp, fmcgApp, othersApp],
      available_apps: [fmcgApp, othersApp],
      subscribed_apps: [financeApp],
      selected_app: null,
    })
    mockAppsApi.select.mockResolvedValue({
      selected_app: 'finance',
      available_apps: [fmcgApp, othersApp],
      subscribed_apps: [financeApp],
    })

    render(
      <MemoryRouter initialEntries={['/apps']}>
        <AppSelect />
      </MemoryRouter>
    )

    const availSection = await screen.findByLabelText('Available Models')
    expect(within(availSection).getByText('Finance')).toBeTruthy()
    expect(within(availSection).getByText('FMCG')).toBeTruthy()
    expect(within(availSection).getByText('Others')).toBeTruthy()
    expect(within(availSection).getByText('Disabled')).toBeTruthy()

    const goBtn = screen.getByTestId('model-select-go')
    expect(goBtn.disabled).toBe(true)

    // Clicking 'Others' displays disabled message
    fireEvent.click(screen.getByTestId('model-card-available-others'))
    expect(await screen.findByText(/The 'Others' domain is disabled/i)).toBeTruthy()

    fireEvent.click(screen.getByTestId('model-card-available-finance'))
    fireEvent.click(screen.getByLabelText('Move selected model to Subscribed Models'))

    await waitFor(() => expect(mockAppsApi.subscribe).toHaveBeenCalledWith('finance'))
    const subSection = screen.getByLabelText('Subscribed Models')
    expect(within(subSection).getByText('Finance')).toBeTruthy()

    // Clicking the subscribed card keeps Go active and highlighted
    fireEvent.click(goBtn)
    await waitFor(() => expect(mockAppsApi.select).toHaveBeenCalledWith('finance'))
    expect(mockNavigate).toHaveBeenCalledWith('/finance')
  })

  it('FinanceLanding renders New, My Finance Models, and Published Models tabs for Data Architect', async () => {
    mockDomainsApi.workspaceModels.mockResolvedValue({
      role: 'data_architect',
      my_models: [{ workflow_id: 10, slug: 'gl', code: 'F2', name: 'General Ledger', description: 'GL', current_step: 4, completed_steps: 3, finalized: false }],
      published_models: [{ workflow_id: 11, slug: 'gl', code: 'F2', name: 'General Ledger', description: 'GL', finalized_version_number: 2, owner_name: 'Arch User' }],
    })

    render(
      <MemoryRouter initialEntries={['/finance']}>
        <FinanceLanding />
      </MemoryRouter>
    )

    expect(await screen.findByRole('tab', { name: /New/i })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /My Finance Models/i })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /Published Models/i })).toBeTruthy()
  })

  it('FinanceLanding hides New and My Finance Models completely and shows only Published Models for Data Analyst', async () => {
    mockAuthState = {
      user: { id: 2, email: 'analyst@afx.io', display_name: 'Analyst User', role: 'data_analyst', selected_app: null },
      role: 'data_analyst',
      isArchitect: false,
      isAnalyst: true,
      refreshUser: vi.fn(),
      logout: vi.fn(),
    }
    mockDomainsApi.workspaceModels.mockResolvedValue({
      role: 'data_analyst',
      published_models: [
        { workflow_id: 11, slug: 'gl', code: 'F2', name: 'General Ledger Twin', description: 'Published GL', finalized_version_number: 2, owner_name: 'Arch User' },
      ],
    })

    render(
      <MemoryRouter initialEntries={['/finance']}>
        <Routes>
          <Route path="/finance" element={<FinanceLanding />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('General Ledger Twin')).toBeTruthy()
    expect(screen.queryByRole('tab', { name: /^New$/i })).toBeNull()
    expect(screen.queryByRole('tab', { name: /My Finance Models/i })).toBeNull()
    expect(screen.getByRole('tab', { name: /Published Models/i })).toBeTruthy()
  })
})

