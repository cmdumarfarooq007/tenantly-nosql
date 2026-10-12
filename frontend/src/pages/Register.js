import React, { useState, useContext } from 'react';
import { Form, Button, Container, Alert, Card } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    tenantName: '', subdomain: '', adminEmail: '', adminFullName: '', adminPassword: '', confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [validated, setValidated] = useState(false);
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    setValidated(true);

    if (formData.adminPassword !== formData.confirmPassword) {
      return setError("Passwords don't match");
    }

    if (formData.adminPassword.length < 6) {
      return setError("Password must be at least 6 characters long.");
    }

    const res = await register(formData);
    if (res.success) {
      alert('Registration successful! Please login.');
      navigate('/login?role=tenant_admin');
    } else {
      setError(res.message);
    }
  };

  const styles = `
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .register-card {
      animation: slideUp 0.5s ease-out forwards;
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 20px !important;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05) !important;
    }
    .form-control-light {
      background: #f8fafc !important;
      border: 1px solid #cbd5e1 !important;
      color: #0f172a !important;
      border-radius: 10px !important;
      padding: 10px 14px !important;
    }
    .form-control-light:focus {
      background: #ffffff !important;
      border-color: #10b981 !important;
      box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.15) !important;
    }
    .submit-btn {
      padding: 12px !important;
      border-radius: 12px !important;
      font-weight: 600 !important;
      background: #10b981 !important;
      border: none !important;
      color: #ffffff !important;
      transition: all 0.2s ease !important;
    }
    .submit-btn:hover {
      background: #059669 !important;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }
  `;

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      padding: '24px 12px'
    }}>
      <style>{styles}</style>
      <Container className="d-flex justify-content-center px-0">
        <Card style={{ width: '100%', maxWidth: '550px' }} className="p-3 p-sm-4 register-card">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Link to="/" className="text-decoration-none text-muted small fw-semibold">
              &larr; Back to Portals
            </Link>
          </div>

          <div className="text-center mb-4">
            <h3 className="fw-bold" style={{ color: '#0f172a' }}>Register Organization</h3>
            <p className="text-muted small">Start your multi-tenant workspace governance</p>
          </div>

          {error && <Alert variant="danger" className="py-2 text-center" style={{ borderRadius: '10px' }}>{error}</Alert>}

          <Form noValidate validated={validated} onSubmit={handleSubmit}>
            <div className="row">
              <Form.Group className="mb-3 col-md-6">
                <Form.Label className="small fw-semibold text-slate-700">
                  Org Name <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  className="form-control-light"
                  required
                  placeholder="Enter the organization name"
                  onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                />
                <Form.Control.Feedback type="invalid">Organization name required.</Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3 col-md-6">
                <Form.Label className="small fw-semibold text-slate-700">
                  Subdomain <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  className="form-control-light"
                  required
                  placeholder="Enter the workspace subdomain"
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                />
                <Form.Control.Feedback type="invalid">Subdomain required.</Form.Control.Feedback>
              </Form.Group>
            </div>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold text-slate-700">
                Admin Full Name <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                className="form-control-light"
                required
                placeholder="Enter the admin full name"
                onChange={(e) => setFormData({ ...formData, adminFullName: e.target.value })}
              />
              <Form.Control.Feedback type="invalid">Full name required.</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold text-slate-700">
                Admin Email <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="email"
                className="form-control-light"
                required
                placeholder="Enter the admin email address"
                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
              />
              <Form.Control.Feedback type="invalid">Valid email required.</Form.Control.Feedback>
            </Form.Group>

            <div className="row">
              <Form.Group className="mb-4 col-md-6">
                <Form.Label className="small fw-semibold text-slate-700">
                  Password <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="password"
                  className="form-control-light"
                  required
                  minLength={6}
                  placeholder="Enter the password"
                  onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                />
                <Form.Control.Feedback type="invalid">Password must be at least 6 chars.</Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-4 col-md-6">
                <Form.Label className="small fw-semibold text-slate-700">
                  Confirm Password <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="password"
                  className="form-control-light"
                  required
                  placeholder="Enter the confirm password"
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
                <Form.Control.Feedback type="invalid">Confirm password required.</Form.Control.Feedback>
              </Form.Group>
            </div>

            <Button type="submit" className="w-100 submit-btn">
              Register Organization
            </Button>
          </Form>

          <div className="mt-4 text-center">
            <span className="text-muted small">Already registered? </span>
            <Link to="/login?role=tenant_admin" className="text-success text-decoration-none fw-bold small">Sign In</Link>
          </div>
        </Card>
      </Container>
    </div>
  );
};

export default Register;