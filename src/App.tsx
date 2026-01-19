import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SidebarLayout from './components/SidebarLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Inventory from './pages/Inventory';
import Technician from './pages/Technician';
import Messages from './pages/Messages';

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
                <SidebarLayout>
                  <Dashboard />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <SidebarLayout>
                  <History />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <SidebarLayout>
                  <Inventory />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/technician"
            element={
              <ProtectedRoute>
                <SidebarLayout>
                  <Technician />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <SidebarLayout>
                  <Messages />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

