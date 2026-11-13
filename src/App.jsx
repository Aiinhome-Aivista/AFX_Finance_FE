import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/common/ProtectedRoute'
import { useAuth } from './context/AuthContext'
import AuthPage from './pages/AuthPage'
import AppSelect from './pages/AppSelect'
import FinanceLanding from './pages/FinanceLanding'
import FmcgWorkspace from './pages/FmcgWorkspace'
import SupplyChainWorkspace from './pages/SupplyChainWorkspace'
import DomainOverview from './pages/DomainOverview'
import DomainGraph from './pages/DomainGraph'
import Customize from './pages/Customize'
import Finalize from './pages/Finalize'
import Telemetry from './pages/Telemetry'
import DigitalTwinExplorer from './pages/DigitalTwinExplorer'

const P = ({ children, allowedRoles, redirectTo }) => (
  <ProtectedRoute allowedRoles={allowedRoles} redirectTo={redirectTo}>
    {children}
  </ProtectedRoute>
)

export default function App() {
  const { user } = useAuth()
  const isAnalyst = (user?.role || 'data_architect') === 'data_analyst'
  const fallback = user
    ? isAnalyst
      ? '/finance'
      : user.selected_app
        ? (user.selected_app === 'fmcg' || user.selected_app === 'supply_chain' ? '/fmcg' : `/${user.selected_app}`)
        : user.subscribed_apps && user.subscribed_apps.length > 0
          ? (user.subscribed_apps[0] === 'fmcg' || user.subscribed_apps[0] === 'supply_chain' ? '/fmcg' : `/${user.subscribed_apps[0]}`)
          : '/apps'
    : '/login'

  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route
        path="/apps"
        element={
          <P allowedRoles={['data_architect']} redirectTo="/finance">
            <AppSelect />
          </P>
        }
      />
      <Route path="/finance" element={<P><FinanceLanding /></P>} />
      <Route
        path="/supply-chain"
        element={
          <P allowedRoles={['data_architect']} redirectTo="/finance">
            <SupplyChainWorkspace />
          </P>
        }
      />
      <Route
        path="/fmcg"
        element={
          <P allowedRoles={['data_architect']} redirectTo="/finance">
            <SupplyChainWorkspace />
          </P>
        }
      />
      <Route
        path="/finance/:slug"
        element={
          <P allowedRoles={['data_architect']} redirectTo="/finance">
            <DomainGraph />
          </P>
        }
      />
      <Route
        path="/finance/:slug/graph"
        element={
          <P allowedRoles={['data_architect']} redirectTo="/finance">
            <DomainGraph />
          </P>
        }
      />
      <Route
        path="/finance/:slug/overview"
        element={
          <P allowedRoles={['data_architect']} redirectTo="/finance">
            <DomainOverview />
          </P>
        }
      />
      <Route
        path="/finance/:slug/customize"
        element={
          <P allowedRoles={['data_architect']} redirectTo="/finance">
            <DomainGraph />
          </P>
        }
      />
      <Route
        path="/finance/:slug/finalize"
        element={
          <P allowedRoles={['data_architect']} redirectTo="/finance">
            <Finalize />
          </P>
        }
      />
      <Route path="/finance/:slug/twin" element={<P><DigitalTwinExplorer /></P>} />
      <Route
        path="/finance/:slug/telemetry"
        element={
          <P allowedRoles={['data_architect']} redirectTo="/finance">
            <DomainGraph />
          </P>
        }
      />
      <Route path="*" element={<Navigate to={fallback} replace />} />
    </Routes>
  )
}
