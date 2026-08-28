import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSession } from '@/lib/session'
import { FullPageLoader } from '@/components/ui/Loader'

/* ── Código dividido por área ─────────────────────────────────────────── */
const Landing = lazy(() => import('@/landing/Landing'))
const AuthLayout = lazy(() => import('@/auth/AuthLayout'))
const Login = lazy(() => import('@/auth/Login'))
const Register = lazy(() => import('@/auth/Register'))
const ForgotPassword = lazy(() => import('@/auth/ForgotPassword'))

/* Portal do cliente */
const DashboardLayout = lazy(() => import('@/portal/DashboardLayout'))
const DashboardHome = lazy(() => import('@/portal/DashboardHome'))
const PetsList = lazy(() => import('@/portal/PetsList'))
const PetProfile = lazy(() => import('@/portal/PetProfile'))
const Consultas = lazy(() => import('@/portal/Consultas'))
const Receitas = lazy(() => import('@/portal/Receitas'))
const Exames = lazy(() => import('@/portal/Exames'))
const Vacinas = lazy(() => import('@/portal/Vacinas'))
const Documentos = lazy(() => import('@/portal/Documentos'))
const Agendamentos = lazy(() => import('@/portal/Agendamentos'))
const Notificacoes = lazy(() => import('@/portal/Notificacoes'))
const Perfil = lazy(() => import('@/portal/Perfil'))

/* Painel admin */
const AdminLayout = lazy(() => import('@/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('@/admin/Dashboard'))
const AdminClientes = lazy(() => import('@/admin/Clientes'))
const AdminPets = lazy(() => import('@/admin/Pets'))
const AdminConsultas = lazy(() => import('@/admin/Consultas'))
const AdminReceitas = lazy(() => import('@/admin/Receitas'))
const AdminExames = lazy(() => import('@/admin/Exames'))
const AdminVacinas = lazy(() => import('@/admin/Vacinas'))
const AdminDocumentos = lazy(() => import('@/admin/Documentos'))
const AdminFotos = lazy(() => import('@/admin/Fotos'))
const AdminLogs = lazy(() => import('@/admin/Logs'))
const AdminFuncionarios = lazy(() => import('@/admin/Funcionarios'))

const SuspenseWrapper = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<FullPageLoader />}>{children}</Suspense>
)

/** Guard: exige papel de cliente. */
function RequireClient({ children }: { children: ReactNode }) {
  const { user, loading } = useSession()
  if (loading) return <FullPageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'client') return <Navigate to="/admin" replace />
  return <>{children}</>
}

/** Guard: exige papel de admin. */
function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useSession()
  if (loading) return <FullPageLoader />
  if (!user) return <Navigate to="/admin/login" replace />
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing */}
        <Route
          path="/"
          element={
            <SuspenseWrapper>
              <Landing />
            </SuspenseWrapper>
          }
        />

        {/* Auth */}
        <Route
          path="/login"
          element={
            <SuspenseWrapper>
              <AuthLayout>
                <Login />
              </AuthLayout>
            </SuspenseWrapper>
          }
        />
        <Route
          path="/cadastro"
          element={
            <SuspenseWrapper>
              <AuthLayout>
                <Register />
              </AuthLayout>
            </SuspenseWrapper>
          }
        />
        <Route
          path="/recuperar"
          element={
            <SuspenseWrapper>
              <AuthLayout>
                <ForgotPassword />
              </AuthLayout>
            </SuspenseWrapper>
          }
        />

        {/* Portal do cliente */}
        <Route
          path="/dashboard"
          element={
            <RequireClient>
              <SuspenseWrapper>
                <DashboardLayout />
              </SuspenseWrapper>
            </RequireClient>
          }
        >
          <Route
            index
            element={
              <SuspenseWrapper>
                <DashboardHome />
              </SuspenseWrapper>
            }
          />
          <Route
            path="pets"
            element={
              <SuspenseWrapper>
                <PetsList />
              </SuspenseWrapper>
            }
          />
          <Route
            path="pets/:id"
            element={
              <SuspenseWrapper>
                <PetProfile />
              </SuspenseWrapper>
            }
          />
          <Route
            path="consultas"
            element={
              <SuspenseWrapper>
                <Consultas />
              </SuspenseWrapper>
            }
          />
          <Route
            path="receitas"
            element={
              <SuspenseWrapper>
                <Receitas />
              </SuspenseWrapper>
            }
          />
          <Route
            path="exames"
            element={
              <SuspenseWrapper>
                <Exames />
              </SuspenseWrapper>
            }
          />
          <Route
            path="vacinas"
            element={
              <SuspenseWrapper>
                <Vacinas />
              </SuspenseWrapper>
            }
          />
          <Route
            path="documentos"
            element={
              <SuspenseWrapper>
                <Documentos />
              </SuspenseWrapper>
            }
          />
          <Route
            path="agendamentos"
            element={
              <SuspenseWrapper>
                <Agendamentos />
              </SuspenseWrapper>
            }
          />
          <Route
            path="notificacoes"
            element={
              <SuspenseWrapper>
                <Notificacoes />
              </SuspenseWrapper>
            }
          />
          <Route
            path="perfil"
            element={
              <SuspenseWrapper>
                <Perfil />
              </SuspenseWrapper>
            }
          />
        </Route>

        {/* Admin */}
        <Route
          path="/admin/login"
          element={
            <SuspenseWrapper>
              <AuthLayout admin>
                <Login admin />
              </AuthLayout>
            </SuspenseWrapper>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <SuspenseWrapper>
                <AdminLayout />
              </SuspenseWrapper>
            </RequireAdmin>
          }
        >
          <Route
            index
            element={
              <SuspenseWrapper>
                <AdminDashboard />
              </SuspenseWrapper>
            }
          />
          <Route
            path="clientes"
            element={
              <SuspenseWrapper>
                <AdminClientes />
              </SuspenseWrapper>
            }
          />
          <Route
            path="pets"
            element={
              <SuspenseWrapper>
                <AdminPets />
              </SuspenseWrapper>
            }
          />
          <Route
            path="consultas"
            element={
              <SuspenseWrapper>
                <AdminConsultas />
              </SuspenseWrapper>
            }
          />
          <Route
            path="receitas"
            element={
              <SuspenseWrapper>
                <AdminReceitas />
              </SuspenseWrapper>
            }
          />
          <Route
            path="exames"
            element={
              <SuspenseWrapper>
                <AdminExames />
              </SuspenseWrapper>
            }
          />
          <Route
            path="vacinas"
            element={
              <SuspenseWrapper>
                <AdminVacinas />
              </SuspenseWrapper>
            }
          />
          <Route
            path="documentos"
            element={
              <SuspenseWrapper>
                <AdminDocumentos />
              </SuspenseWrapper>
            }
          />
          <Route
            path="fotos"
            element={
              <SuspenseWrapper>
                <AdminFotos />
              </SuspenseWrapper>
            }
          />
          <Route
            path="logs"
            element={
              <SuspenseWrapper>
                <AdminLogs />
              </SuspenseWrapper>
            }
          />
          <Route
            path="funcionarios"
            element={
              <SuspenseWrapper>
                <AdminFuncionarios />
              </SuspenseWrapper>
            }
          />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream p-8 text-center">
      <p className="font-display text-6xl font-black text-magenta">404</p>
      <p className="text-dark/60">Página não encontrada.</p>
      <a href="/" className="mt-2 font-display text-sm font-bold uppercase tracking-widest text-turquesa hover:text-azul">
        Voltar ao início
      </a>
    </div>
  )
}
