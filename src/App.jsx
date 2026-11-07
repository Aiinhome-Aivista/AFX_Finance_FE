import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/common/ProtectedRoute'
import { useAuth } from './context/AuthContext'
import AuthPage from './pages/AuthPage'
import AppSelect from './pages/AppSelect'
import FinanceLanding from './pages/FinanceLanding'
import DomainOverview from './pages/DomainOverview'
import DomainGraph from './pages/DomainGraph'
import Customize from './pages/Customize'
import Finalize from './pages/Finalize'
import Telemetry from './pages/Telemetry'

const P = ({ children, app }) => <ProtectedRoute requireApp={app}>{children}</ProtectedRoute>

export default function App() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/apps" element={<Navigate to="/finance" replace />} />
      <Route path="/finance" element={<P><FinanceLanding /></P>} />
      <Route path="/finance/:slug" element={<P><DomainGraph /></P>} />
      <Route path="/finance/:slug/graph" element={<P><DomainGraph /></P>} />
      <Route path="/finance/:slug/overview" element={<P><DomainOverview /></P>} />
      <Route path="/finance/:slug/customize" element={<P><DomainGraph /></P>} />
      <Route path="/finance/:slug/finalize" element={<P><Finalize /></P>} />
      <Route path="/finance/:slug/telemetry" element={<P><DomainGraph /></P>} />
      <Route path="*" element={<Navigate to={user ? '/finance' : '/login'} replace />} />
    </Routes>
  )
}
