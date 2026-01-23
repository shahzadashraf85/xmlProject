import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SidebarLayout from './components/SidebarLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Inventory from './pages/Inventory';
import Messages from './pages/Messages';
import InventoryTable from './pages/InventoryTable';
import PartsManager from './pages/PartsManager';
import UiDemo from './pages/UiDemo';


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
            path="/messages"
            element={
              <ProtectedRoute>
                <SidebarLayout>
                  <Messages />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/inventory-grid"
            element={
              <ProtectedRoute>
                <SidebarLayout>
                  <InventoryTable />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />



          <Route
            path="/parts"
            element={
              <ProtectedRoute>
                <SidebarLayout>
                  <PartsManager />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ui-demo"
            element={
              <SidebarLayout>
                <UiDemo />
              </SidebarLayout>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

