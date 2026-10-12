import React, { useState, useEffect, useContext } from 'react';
import { Container, Button, Form, Row, Col, Alert, Card, Spinner, Modal } from 'react-bootstrap';
import { Search, UserPlus, Edit2, Trash2, CheckCircle2, Copy } from 'lucide-react';
import api from '../utils/api';
import AuthContext from '../context/AuthContext';
import EmployeeModal from '../components/EmployeeModal';

const Employees = () => {
  const { user } = useContext(AuthContext);
  const [users, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [telemetry, setTelemetry] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [createdCredentials, setCreatedCredentials] = useState(null);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      let reliableTenantId = user?.tenantId || user?.tenant?.id || user?.tenant?._id;
      if (!reliableTenantId) {
        try {
          const decodedToken = JSON.parse(atob(token.split('.')[1]));
          reliableTenantId = decodedToken.tenantId;
        } catch (e) {}
      }

      if (!reliableTenantId) return;

      const config = { headers: { Authorization: `Bearer ${token}` } };
      let query = `/tenants/${reliableTenantId}/users?limit=100`;
      if (search) query += `&search=${search}`;

      const res = await api.get(query, config);
      if (res.telemetry) {
        setTelemetry(res.telemetry);
      }
      setEmployees(res.data.data.users || []);
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search, user]);

  const handleCreateOrUpdate = async (data) => {
    try {
      const token = localStorage.getItem('token');
      const decodedToken = JSON.parse(atob(token.split('.')[1]));
      const reliableTenantId = decodedToken.tenantId;
      const config = { headers: { Authorization: `Bearer ${token}` } };

      if (editingEmployee) {
        await api.put(`/users/${editingEmployee.id}`, data, config);
        alert('Employee updated successfully!');
      } else {
        await api.post(`/tenants/${reliableTenantId}/users`, data, config);
        const subdomain = user?.tenantSubdomain || user?.tenant?.subdomain || 'your-subdomain';
        setCreatedCredentials({
          fullName: data.fullName,
          email: data.email,
          password: data.password,
          subdomain: subdomain
        });
      }

      setShowModal(false);
      setEditingEmployee(null);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        await api.delete(`/users/${userId}`, config);
        fetchEmployees();
      } catch (err) {
        alert(err.response?.data?.message || 'Delete failed');
      }
    }
  };

  if (user?.role !== 'tenant_admin' && user?.role !== 'super_admin') {
    return (
      <Container className="mt-5">
        <Alert variant="danger">
          <h4 className="fw-bold">Security Alert</h4>
          <p className="mb-0">You do not have administrative privileges to access the user management module.</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="app-page-container">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h4 style={{ fontWeight: 800, color: '#0f172a', margin: 0 }}>Employees</h4>
          <span style={{ fontSize: '13px', color: '#334155' }}>Manage roles, access, and permissions for your team members</span>
        </div>
        <div className="page-header-actions">
          <Button
            onClick={() => { setEditingEmployee(null); setShowModal(true); }}
            style={{ backgroundColor: '#0F2C59', borderColor: '#0F2C59', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <UserPlus size={16} /> Add Employee
          </Button>
        </div>
      </div>

        {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

        <Row className="mb-4">
          <Col xs={12} md={5}>
            <div className="position-relative">
              <Search size={18} className="position-absolute" style={{ top: '12px', left: '14px', color: 'var(--color-text-subtle)' }} />
              <Form.Control
                className="ps-5"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </Col>
        </Row>

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : (
          <Row className="g-4">
            {users.map((u) => (
              <Col xs={12} md={6} lg={4} key={u.id}>
                <Card className="card-hover h-100 p-1">
                  <Card.Body className="p-4">
                    <div className="d-flex align-items-center mb-3">
                      <div className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold me-3" style={{ width: 44, height: 44, backgroundColor: 'var(--color-primary)', fontSize: '1rem' }}>
                        {(u.full_name || u.fullName || u.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <h5 className="mb-0 text-truncate fw-bold" style={{ color: 'var(--color-text-main)' }}>{u.full_name || u.fullName || 'Employee'}</h5>
                        <small className="text-truncate d-block" style={{ color: 'var(--color-text-muted)' }}>{u.email}</small>
                      </div>
                    </div>

                    <div className="d-flex gap-2 mb-4">
                      <span className={`badge-status ${u.role === 'tenant_admin' ? 'badge-primary' : u.role === 'employee' ? 'badge-warning' : 'badge-neutral'}`}>
                        <span className="badge-status-dot"></span>
                        {u.role === 'tenant_admin' ? 'TENANT ADMIN' : u.role === 'employee' ? 'MANAGER' : u.role === 'employee' ? 'EMPLOYEE' : u.role.replace('_', ' ').toUpperCase()}
                      </span>
                      {(() => {
                        const userActive = u.isActive !== undefined ? u.isActive : (u.is_active !== undefined ? u.is_active : true);
                        return (
                          <span className={`badge-status ${userActive ? 'badge-success' : 'badge-danger'}`}>
                            <span className="badge-status-dot"></span>
                            {userActive ? 'Active' : 'Inactive'}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="d-flex gap-2 pt-3 border-top" style={{ borderColor: 'var(--color-border)' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                        onClick={() => { setEditingEmployee(u); setShowModal(true); }}
                      >
                        <Edit2 size={14} />
                        <span>Edit Profile</span>
                      </Button>
                      {u.id !== user.id && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="d-flex align-items-center justify-content-center px-3 text-danger"
                          onClick={() => handleDelete(u.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
            {users.length === 0 && (
              <Col className="text-center py-5" style={{ color: 'var(--color-text-muted)' }}>
                <h4>No team members found.</h4>
              </Col>
            )}
          </Row>
        )}

        <EmployeeModal
          show={showModal}
          onHide={() => setShowModal(false)}
          onSave={handleCreateOrUpdate}
          targetEmployee={editingEmployee}
          hasManager={users.some(u => u.role === 'tenant_admin' && u.id !== editingEmployee?.id)}
        />

        {/* Employee Login Credentials Success Modal */}
        <Modal show={!!createdCredentials} onHide={() => setCreatedCredentials(null)} centered>
          <Modal.Header closeButton className="border-0 pb-0">
            <Modal.Title className="fw-bold d-flex align-items-center gap-2" style={{ color: 'var(--color-primary)' }}>
              <CheckCircle2 size={24} />
              <span>Employee Created Successfully!</span>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="py-4">
            <p className="text-muted mb-3">
              Provide these login details to <strong>{createdCredentials?.fullName}</strong> so they can log in via the <strong>Employee Portal</strong>:
            </p>
            <div className="p-3 rounded-3" style={{ backgroundColor: 'var(--color-bg-body)', border: '1px solid var(--color-border)' }}>
              <div className="mb-2">
                <small className="text-muted fw-bold d-block">WORKSPACE SUBDOMAIN</small>
                <code className="fs-6 fw-bold" style={{ color: 'var(--color-primary)' }}>{createdCredentials?.subdomain}</code>
              </div>
              <div className="mb-2">
                <small className="text-muted fw-bold d-block">EMAIL ADDRESS</small>
                <code className="fs-6 fw-bold text-dark">{createdCredentials?.email}</code>
              </div>
              <div className="mb-2">
                <small className="text-muted fw-bold d-block">INITIAL PASSWORD</small>
                <code className="fs-6 fw-bold text-dark">{createdCredentials?.password}</code>
              </div>
              <div className="mt-3 pt-2 border-top">
                <small className="text-muted fw-bold d-block mb-1">LOGIN PORTAL URL</small>
                <small className="text-muted d-block" style={{ wordBreak: 'break-all' }}>
                  {window.location.origin}/login?role=user
                </small>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button
              variant="outline-primary"
              className="d-flex align-items-center gap-2"
              onClick={() => {
                const infoText = `Workspace Subdomain: ${createdCredentials?.subdomain}\nEmail: ${createdCredentials?.email}\nPassword: ${createdCredentials?.password}\nLogin URL: ${window.location.origin}/login?role=user`;
                navigator.clipboard.writeText(infoText);
                alert('Login credentials copied to clipboard!');
              }}
            >
              <Copy size={16} />
              <span>Copy Login Info</span>
            </Button>
            <Button variant="primary" onClick={() => setCreatedCredentials(null)}>
              Done
            </Button>
          </Modal.Footer>
        </Modal>
    </Container>
  );
};

export default Employees;