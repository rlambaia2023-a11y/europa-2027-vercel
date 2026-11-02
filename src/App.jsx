import { Toaster } from "@/components/ui/toaster"
import { Toaster as HotToaster } from "react-hot-toast"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Layout from '@/components/Layout';
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Itinerario = lazy(() => import('@/pages/Itinerario'));
const DayDetail = lazy(() => import('@/pages/DayDetail'));
const Reservas = lazy(() => import('@/pages/Reservas'));
const Orcamento = lazy(() => import('@/pages/Orcamento'));
const Documentos = lazy(() => import('@/pages/Documentos'));
const Diario = lazy(() => import('@/pages/Diario'));
const Album = lazy(() => import('@/pages/Album'));
const Mapa = lazy(() => import('@/pages/Mapa'));
const Clima = lazy(() => import('@/pages/Clima'));
const Admin = lazy(() => import('@/pages/Admin'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Sugestoes = lazy(() => import('@/pages/Sugestoes'));
const Bagagem = lazy(() => import('@/pages/Bagagem'));
// Add page imports here

const Carregando = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const { pathname } = useLocation();
  const paginaPublica = ['/login', '/register', '/forgot-password', '/reset-password'].includes(pathname);

  // Show loading spinner while checking app public settings or auth
  if ((isLoadingPublicSettings || isLoadingAuth) && !paginaPublica) {
    return <Carregando />;
  }

  // Handle authentication errors
  if (authError && !paginaPublica) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Suspense fallback={<Carregando />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/itinerario" element={<Itinerario />} />
        <Route path="/itinerario/:data" element={<DayDetail />} />
        <Route path="/reservas" element={<Reservas />} />
        <Route path="/orcamento" element={<Orcamento />} />
        <Route path="/documentos" element={<Documentos />} />
        <Route path="/diario" element={<Diario />} />
        <Route path="/album" element={<Album />} />
        <Route path="/sugestoes" element={<Sugestoes />} />
        <Route path="/bagagem" element={<Bagagem />} />
        <Route path="/mapa" element={<Mapa />} />
        <Route path="/clima" element={<Clima />} />
        <Route path="/admin" element={<Admin />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <HotToaster position="top-center" toastOptions={{ style: { background: "#1e2a4a", color: "#fff", borderRadius: "10px", fontSize: "13px" } }} />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App