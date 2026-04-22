import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Roteirizacao } from './pages/Roteirizacao';
import { Aprovacao } from './pages/Aprovacao';
import Filiais from './pages/cadastros/Filiais';
import { Usuarios } from './pages/cadastros/Usuarios';
import { Veiculos } from './pages/cadastros/Veiculos';
import { Regionalidade } from './pages/cadastros/Regionalidade';
import { TabelaANTT } from './pages/cadastros/TabelaANTT';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/roteirizacao"
            element={
              <ProtectedRoute>
                <Roteirizacao />
              </ProtectedRoute>
            }
          />

          <Route
            path="/aprovacao"
            element={
              <ProtectedRoute>
                <Aprovacao />
              </ProtectedRoute>
            }
          />

          <Route
            path="/cadastros/filiais"
            element={
              <ProtectedRoute requiredRole="admin">
                <Filiais />
              </ProtectedRoute>
            }
          />

          <Route
            path="/cadastros/usuarios"
            element={
              <ProtectedRoute requiredRole="admin">
                <Usuarios />
              </ProtectedRoute>
            }
          />

          <Route
            path="/cadastros/veiculos"
            element={
              <ProtectedRoute>
                <Veiculos />
              </ProtectedRoute>
            }
          />

          <Route
            path="/cadastros/regionalidade"
            element={
              <ProtectedRoute requiredRole="admin">
                <Regionalidade />
              </ProtectedRoute>
            }
          />

          <Route
            path="/cadastros/antt"
            element={
              <ProtectedRoute requiredRole="admin">
                <TabelaANTT />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
