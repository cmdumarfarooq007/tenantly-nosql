import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import AuthContext, { AuthProvider } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Clients from './pages/Clients';
import ClientDetails from './pages/ClientDetails';
import Meetings from './pages/Meetings';
import ProjectDetails from './pages/ProjectDetails'; 
import AllTasks from './pages/AllTasks';
import Users from './pages/Users';
import Tenants from './pages/Tenants';
import Settings from './pages/Settings';
import NoSqlDemoDock from './components/NoSqlDemoDock';
import NoSqlTopBanner from './components/NoSqlTopBanner';

const MobileTopBar = ({ onToggleSidebar }) => {
  const { user } = useContext(AuthContext);
  const isSuperAdmin = user?.role === 'super_admin';
  const tenantName = isSuperAdmin ? 'System Admin' : (user?.tenant?.name || user?.tenantSubdomain || 'Workspace');
  const logoUrl = (user?.tenant?.logo_url || user?.tenant?.logoUrl) ? (user.tenant.logo_url || user.tenant.logoUrl) : '/favicon.ico';

  return (
    <header className="mobile-topbar">
      <div className="d-flex align-items-center gap-2">
        <button 
          type="button"
          className="mobile-menu-btn" 
          onClick={onToggleSidebar}
          aria-label="Toggle navigation drawer"
          title="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="d-flex align-items-center gap-2">
          <div style={{ width: 28, height: 28, backgroundColor: '#ffffff', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255, 255, 255, 0.2)' }}>
            <img 
              src={logoUrl} 
              alt="Logo" 
              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: (user?.tenant?.logo_url || user?.tenant?.logoUrl) ? '1px' : '3px' }}
              onError={(e) => { e.target.onerror = null; e.target.src = '/favicon.ico'; e.target.style.padding = '3px'; }}
            />
          </div>
          <span className="fw-bold text-white text-truncate" style={{ fontSize: '0.925rem', maxWidth: '170px' }}>
            {tenantName}
          </span>
        </div>
      </div>
      <div className="d-flex align-items-center gap-2">
        <span className="badge-status badge-neutral py-1 px-2" style={{ fontSize: '10px', textTransform: 'capitalize' }}>
          {user?.role === 'tenant_admin' ? 'Admin' : user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'manager' ? 'Manager' : 'Employee'}
        </span>
      </div>
    </header>
  );
};

const Layout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-layout">
      <MobileTopBar onToggleSidebar={() => setMobileOpen(prev => !prev)} />
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      {mobileOpen && (
        <div 
          className="sidebar-backdrop d-lg-none" 
          onClick={() => setMobileOpen(false)} 
          aria-label="Close menu backdrop"
        />
      )}
      <main className="app-main-content">
        <NoSqlTopBanner />
        {children}
      </main>
      <NoSqlDemoDock />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected Routes with Sidebar Layout */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/clients" 
            element={
              <ProtectedRoute>
                <Layout><Clients /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/clients/:id" 
            element={
              <ProtectedRoute>
                <Layout><ClientDetails /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/meetings" 
            element={
              <ProtectedRoute>
                <Layout><Meetings /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/tenants" 
            element={
              <ProtectedRoute>
                <Layout><Tenants /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/projects" 
            element={
              <ProtectedRoute>
                <Layout><Projects /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/projects/:id" 
            element={
              <ProtectedRoute>
                <Layout><ProjectDetails /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/tasks" 
            element={
              <ProtectedRoute>
                <Layout><AllTasks /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <Layout><Settings /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/users" 
            element={
              <ProtectedRoute>
                <Layout><Users /></Layout>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
