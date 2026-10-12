import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, Building2, UserCheck, Zap, ArrowRight, Lock } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  const rolePortals = [
    {
      role: 'super_admin',
      title: 'Super Admin Portal',
      icon: <ShieldAlert style={{ color: 'var(--color-error)' }} size={28} />,
      badge: 'System Admin',
      badgeClass: 'badge-danger',
      description: 'System-wide governance, global tenant provisioning, and platform DB explorer.',
      buttonText: 'Login as Super Admin',
      btnStyle: { backgroundColor: 'var(--color-error)', borderColor: 'var(--color-error)', color: '#fff' },
      path: '/login?role=super_admin'
    },
    {
      role: 'tenant_admin',
      title: 'Tenant Admin Portal',
      icon: <Building2 style={{ color: 'var(--color-primary)' }} size={28} />,
      badge: 'Organization Admin',
      badgeClass: 'badge-success',
      description: 'Workspace management, adding team members, subscription limits, and project governance.',
      buttonText: 'Login as Tenant Admin',
      btnStyle: { backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: '#fff' },
      path: '/login?role=tenant_admin'
    },
    {
      role: 'user',
      title: 'Employee Portal',
      icon: <UserCheck style={{ color: 'var(--color-primary)' }} size={28} />,
      badge: 'Employee & Manager',
      badgeClass: 'badge-neutral',
      description: 'Collaborate on assigned projects, execute Kanban tasks, and update work statuses.',
      buttonText: 'Login as Employee / Manager',
      btnStyle: { backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: '#fff' },
      path: '/login?role=user'
    }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-body)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px 0' }}>
      <Container className="d-flex flex-column justify-content-between h-100 py-1 py-md-2">
        {/* Navigation Bar */}
        <div className="d-flex justify-content-between align-items-center pb-3 border-bottom" style={{ borderColor: 'var(--color-border)' }}>
          <div className="d-flex align-items-center gap-2">
            <div className="p-2 rounded-3" style={{ backgroundColor: 'var(--color-primary-soft)' }}>
              <Zap style={{ color: 'var(--color-primary)' }} size={22} />
            </div>
            <h4 className="fw-bold mb-0" style={{ color: 'var(--color-text-main)' }}>Tenantly</h4>
          </div>
          <div>
            <Link to="/register" className="btn btn-secondary px-3 py-1.5 fw-semibold small">
              Register Organization
            </Link>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center my-3 my-md-4 px-2">
          <span className="badge-status badge-success mb-2">
            <span className="badge-status-dot"></span>
            Multi-Tenant SaaS Governance Platform
          </span>
          <h2 className="fw-bold mb-2" style={{ color: 'var(--color-text-main)', fontSize: 'clamp(1.5rem, 4vw, 2.2rem)' }}>
            Welcome to <span style={{ color: 'var(--color-primary)' }}>Tenantly</span>
          </h2>
          <p className="mx-auto mb-0" style={{ maxWidth: '600px', color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            Select your assigned role portal below to access your workspace. Logins are strictly role-validated.
          </p>
        </div>

        {/* Role Portal Cards */}
        <Row className="g-3 my-2">
          {rolePortals.map((portal) => (
            <Col xs={12} md={6} lg={4} key={portal.role}>
              <Card className="card-hover h-100 p-1">
                <Card.Body className="p-3 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div className="p-2.5 rounded-3" style={{ backgroundColor: 'var(--color-bg-body)', border: '1px solid var(--color-border)' }}>
                        {portal.icon}
                      </div>
                      <span className={`badge-status ${portal.badgeClass}`}>
                        <span className="badge-status-dot"></span>
                        {portal.badge}
                      </span>
                    </div>

                    <h4 className="fw-bold mb-2" style={{ color: 'var(--color-text-main)', fontSize: '1.15rem' }}>
                      {portal.title}
                    </h4>

                    <p className="mb-3" style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', lineHeight: '1.5' }}>
                      {portal.description}
                    </p>
                  </div>

                  <Button
                    style={portal.btnStyle}
                    className="w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2"
                    onClick={() => navigate(portal.path)}
                  >
                    <span>{portal.buttonText}</span>
                    <ArrowRight size={15} />
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Footer info */}
        <div className="text-center pt-3 border-top d-flex align-items-center justify-content-center gap-2" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-subtle)', fontSize: '0.8rem' }}>
          <Lock size={13} />
          <span>Security Notice: Strictly enforced access control. Attempts to log into an unauthorized portal will be rejected.</span>
        </div>
      </Container>
    </div>
  );
};

export default LandingPage;
