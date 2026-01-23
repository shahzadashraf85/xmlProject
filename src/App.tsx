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
import BestBuyTemplates from './pages/bestbuy/Templates';
import BestBuyListings from './pages/bestbuy/Listings';
import BestBuyNewListing from './pages/bestbuy/NewListing';
import BestBuyEditListing from './pages/bestbuy/EditListing';
import BestBuyExports from './pages/bestbuy/Exports';


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

          {/* Best Buy Module Routes */}
          <Route
            path="/bestbuy/templates"
            element={
              <ProtectedRoute>
                <SidebarLayout>
                  <BestBuyTemplates />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/bestbuy/listings"
            element={
              <ProtectedRoute>
                <SidebarLayout>
                  <BestBuyListings />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/bestbuy/new"
            element={
              <ProtectedRoute>
                <SidebarLayout>
                  <BestBuyNewListing />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/bestbuy/listings/:id"
            element={
              <ProtectedRoute>
                <SidebarLayout>
                  <BestBuyEditListing />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/bestbuy/exports"
            element={
              <ProtectedRoute>
                <SidebarLayout>
                  <BestBuyExports />
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

