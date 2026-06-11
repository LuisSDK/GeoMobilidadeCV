import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { I18nProvider } from './contexts/I18nContext';
import Login from './pages/Login';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import HelpPage from './pages/HelpPage';
import ChatbotWidget from './components/Chatbot/ChatbotWidget';

function AppRoutes() {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-cv-blue flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70 text-sm font-medium tracking-wide">A carregar...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to={isAdmin ? '/admin' : '/mapa'} replace />} />
        <Route path="/mapa/*" element={user ? <UserDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/admin/*" element={user && isAdmin ? <AdminDashboard /> : <Navigate to={user ? '/mapa' : '/login'} replace />} />
        <Route path="/ajuda" element={user ? <HelpPage /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to={user ? (isAdmin ? '/admin' : '/mapa') : '/login'} replace />} />
      </Routes>
      {/* Global chatbot - always visible when logged in */}
      {user && !loading && <ChatbotWidget isAdmin={isAdmin} />}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AccessibilityProvider>
          <AppRoutes />
        </AccessibilityProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
