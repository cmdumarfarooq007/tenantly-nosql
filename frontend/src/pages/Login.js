import React, { useState, useEffect, useContext } from 'react';
import { Form, Button, Container, Alert, Card } from 'react-bootstrap';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, Building2, UserCheck, ArrowLeft, AlertTriangle } from 'lucide-react';
import AuthContext from '../context/AuthContext';

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const queryParams = new URLSearchParams(location.search);
  const roleParam = queryParams.get('role') || '';

  const [formData, setFormData] = useState({ 
    email: roleParam === 'super_admin' ? 'superadmin@system.com' : '', 
    password: '', 
    subdomain: '' 
  });
  const [selectedRole, setSelectedRole] = useState(roleParam || 'user');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ subdomain: '', email: '', password: '' });

  useEffect(() => {
    if (roleParam) {
      setSelectedRole(roleParam);
      if (roleParam === 'super_admin') {
        setFormData(prev => ({ ...prev, email: 'superadmin@system.com' }));
      }
    }
  }, [roleParam]);

  const portalDetails = {
    super_admin: {
      title: 'Super Admin Portal',
      icon: <ShieldAlert size={32} style={{ color: 'var(--color-error)' }} />,
      badge: 'System Admin',
      badgeClass: 'badge-danger',
      btnStyle: { backgroundColor: 'var(--color-error)', borderColor: 'var(--color-error)', color: '#fff' },
      description: 'System level governance and global tenant management.',
      requireSubdomain: false
    },
    tenant_admin: {
      title: 'Tenant Admin Portal',
      icon: <Building2 size={32} style={{ color: 'var(--color-primary)' }} />,
      badge: 'Organization Admin',
      badgeClass: 'badge-success',
      btnStyle: { backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: '#fff' },
      description: 'Workspace management, adding members & project limits.',
      requireSubdomain: true
    },
    user: {
      title: 'Employee Portal',
      icon: <UserCheck size={32} style={{ color: 'var(--color-primary)' }} />,
      badge: 'Employee & Manager',
      badgeClass: 'badge-neutral',
      btnStyle: { backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: '#fff' },
      description: 'Project task management and Kanban collaboration for employees and managers.',
      requireSubdomain: true
    },
    employee: {
      title: 'Employee Portal',
      icon: <UserCheck size={32} style={{ color: 'var(--color-primary)' }} />,
      badge: 'Employee & Manager',
      badgeClass: 'badge-neutral',
      btnStyle: { backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: '#fff' },
      description: 'Project task management and Kanban collaboration for employees and managers.',
      requireSubdomain: true
    }
  };

  const activePortal = portalDetails[selectedRole] || portalDetails['user'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({ subdomain: '', email: '', password: '' });

    let hasClientError = false;
    const newFieldErrors = { subdomain: '', email: '', password: '' };

    if (activePortal.requireSubdomain && !formData.subdomain.trim()) {
      newFieldErrors.subdomain = 'Please enter your organization workspace subdomain.';
      hasClientError = true;
    }
    if (!formData.email.trim()) {
      newFieldErrors.email = 'Please enter a valid email address.';
      hasClientError = true;
    }
    if (!formData.password) {
      newFieldErrors.password = 'Password is required.';
      hasClientError = true;
    }

    if (hasClientError) {
      setFieldErrors(newFieldErrors);
      return;
    }

    const res = await login(formData.email, formData.password, formData.subdomain, selectedRole);
    if (res.success) {
      navigate('/dashboard');
    } else {
      const serverMsg = res.message || 'Login failed';
      const msgLower = serverMsg.toLowerCase();

      if (msgLower.includes('password')) {
        setFieldErrors(prev => ({ ...prev, password: 'Invalid password. Please check your password.' }));
      } else if (msgLower.includes('subdomain') || msgLower.includes('workspace')) {
        setFieldErrors(prev => ({ ...prev, subdomain: serverMsg }));
      } else if (msgLower.includes('email') || msgLower.includes('user not found')) {
        setFieldErrors(prev => ({ ...prev, email: serverMsg }));
      } else {
        setError(serverMsg);
      }
    }
  };

  return (
    <div style={{
      backgroundColor: 'var(--color-bg-body)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      padding: '24px 12px'
    }}>
      <Container className="d-flex justify-content-center align-items-center px-0">
        <Card style={{ width: '100%', maxWidth: '450px' }} className="p-3 login-card">
          
          {/* Header & Back Link */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Link to="/" className="text-decoration-none small fw-semibold d-flex align-items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
              <ArrowLeft size={16} />
              <span>Back to Portals</span>
            </Link>
            <span className={`badge-status ${activePortal.badgeClass}`}>
              <span className="badge-status-dot"></span>
              {activePortal.badge}
            </span>
          </div>

          <div className="text-center mb-4">
            <div className="p-3 rounded-4 d-inline-flex align-items-center justify-content-center mb-2" style={{ backgroundColor: 'var(--color-bg-body)', border: '1px solid var(--color-border)' }}>
              {activePortal.icon}
            </div>
            <h3 className="fw-bold mb-1" style={{ color: 'var(--color-text-main)' }}>{activePortal.title}</h3>
            <p className="small mb-0" style={{ color: 'var(--color-text-muted)' }}>{activePortal.description}</p>
          </div>

          {error && (
            <Alert variant="danger" className="py-2 text-center shadow-sm" style={{ borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
              <div className="fw-bold mb-1 d-flex align-items-center justify-content-center gap-1">
                <AlertTriangle size={15} />
                <span>{error.toLowerCase().includes('restriction') ? 'Restricted Access' : 'Login Failed'}</span>
              </div>
              {error}
            </Alert>
          )}

          <Form noValidate onSubmit={handleSubmit}>
            {activePortal.requireSubdomain && (
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold" style={{ color: 'var(--color-text-main)' }}>
                  Workspace Subdomain <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter the workspace subdomain"
                  value={formData.subdomain}
                  onChange={(e) => {
                    setFormData({ ...formData, subdomain: e.target.value });
                    setFieldErrors(prev => ({ ...prev, subdomain: '' }));
                  }}
                  isInvalid={!!fieldErrors.subdomain}
                />
                {fieldErrors.subdomain && (
                  <div className="invalid-feedback-styled">
                    {fieldErrors.subdomain}
                  </div>
                )}
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold" style={{ color: 'var(--color-text-main)' }}>
                Email Address <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="email"
                placeholder="Enter the email address"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setFieldErrors(prev => ({ ...prev, email: '' }));
                }}
                isInvalid={!!fieldErrors.email}
              />
              {fieldErrors.email && (
                <div className="invalid-feedback-styled">
                  {fieldErrors.email}
                </div>
              )}
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="small fw-semibold" style={{ color: 'var(--color-text-main)' }}>
                Password <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="password"
                placeholder="Enter the password"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  setFieldErrors(prev => ({ ...prev, password: '' }));
                }}
                isInvalid={!!fieldErrors.password}
              />
              {fieldErrors.password && (
                <div className="invalid-feedback-styled">
                  {fieldErrors.password}
                </div>
              )}
            </Form.Group>

            <Button 
              type="submit" 
              style={activePortal.btnStyle}
              className="w-100 py-2.5 fw-semibold"
            >
              Sign In to {activePortal.title.replace(' Portal', '')}
            </Button>
          </Form>

          <div className="mt-4 text-center">
            <p className="small mb-0" style={{ color: 'var(--color-text-muted)' }}>
              Need a new workspace? <Link to="/register" className="text-decoration-none fw-bold" style={{ color: 'var(--color-primary)' }}>Register Tenant</Link>
            </p>
          </div>
        </Card>
      </Container>
    </div>
  );
};

export default Login;