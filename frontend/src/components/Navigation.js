import React, { useContext } from 'react';
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, User, LogOut, LayoutDashboard, FolderKanban, Users as UsersIcon, ShieldAlert } from 'lucide-react';
import AuthContext from '../context/AuthContext';

const Navigation = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Navbar bg="white" variant="light" expand="lg" className="mb-4 shadow-sm border-bottom sticky-top py-2">
      <Container>
        <Navbar.Brand as={Link} to="/dashboard" className="fw-bold text-primary fs-4 d-flex align-items-center me-4">
          <div className="p-1.5 rounded-3 d-flex align-items-center justify-content-center me-2" style={{ backgroundColor: 'rgba(13, 148, 136, 0.08)', border: '1px solid rgba(13, 148, 136, 0.2)', width: 32, height: 32 }}>
            <img src="/favicon.ico" alt="Tenantly" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          </div>
          <span>Tenantly</span>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto fw-medium gap-2">
            <Nav.Link as={Link} to="/dashboard" className="d-flex align-items-center gap-1 px-3">
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </Nav.Link>
            <Nav.Link as={Link} to="/projects" className="d-flex align-items-center gap-1 px-3">
              <FolderKanban size={18} />
              <span>Projects</span>
            </Nav.Link>
            
            {/* Role-based Links */}
            {user?.role === 'tenant_admin' && (
              <Nav.Link as={Link} to="/users" className="d-flex align-items-center gap-1 px-3">
                <UsersIcon size={18} />
                <span>Users</span>
              </Nav.Link>
            )}
            {user?.role === 'super_admin' && (
              <Nav.Link as={Link} to="/tenants" className="d-flex align-items-center gap-1 px-3">
                <ShieldAlert size={18} />
                <span>Tenants</span>
              </Nav.Link>
            )}
          </Nav>
          <Nav>
            <NavDropdown 
              title={
                <span className="fw-semibold text-dark d-inline-flex align-items-center gap-2">
                  <User size={18} className="text-secondary" />
                  <span>{user?.role === 'super_admin' ? 'Super Admin' : (user?.fullName || user?.full_name || (user?.role === 'tenant_admin' ? 'Tenant Admin' : user?.role === 'manager' ? 'Manager' : 'Employee'))}</span>
                </span>
              } 
              id="basic-nav-dropdown"
              align="end"
            >
              <NavDropdown.Item disabled className="small text-muted">Role: {user?.role}</NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={handleLogout} className="text-danger fw-semibold d-flex align-items-center gap-2">
                <LogOut size={16} />
                <span>Logout</span>
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Navigation;