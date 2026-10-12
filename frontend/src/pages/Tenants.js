import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Spinner, Alert, Modal } from 'react-bootstrap';
import { Building2, Edit3, Search, Copy, CheckCircle2, ShieldCheck, FolderKanban, Users as UsersIcon } from 'lucide-react';
import api from '../utils/api';
import AuthContext from '../context/AuthContext';

const Tenants = () => {
  const { user } = useContext(AuthContext);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [telemetry, setTelemetry] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const [editingTenant, setEditingTenant] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', status: 'active', subscription_plan: 'starter', max_users: 10, max_projects: 5 });

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tenants', getAuthConfig());
      if (res.telemetry) {
        setTelemetry(res.telemetry);
      }
      setTenants(res.data.data.tenants || []);
    } catch (err) {
      setError('Failed to fetch tenants directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openEditModal = (tenant) => {
    setEditingTenant(tenant);
    setEditForm({
      name: tenant.name,
      status: tenant.status || 'active',
      subscription_plan: tenant.subscription_plan || 'starter',
      max_users: tenant.max_users || 10,
      max_projects: tenant.max_projects || 5
    });
    setShowModal(true);
  };

  const handleSaveTenant = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/tenants/${editingTenant.id || editingTenant._id}`, editForm, getAuthConfig());
      setShowModal(false);
      setEditingTenant(null);
      fetchTenants();
      alert('Tenant updated successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.name?.toLowerCase().includes(search.toLowerCase()) || 
    t.subdomain?.toLowerCase().includes(search.toLowerCase()) ||
    (t._id || t.id)?.toLowerCase().includes(search.toLowerCase())
  );

  if (user?.role !== 'super_admin') {
    return (
      <Container className="mt-5">
        <Alert variant="danger">
          <h4 className="fw-bold">Super Admin Access Required</h4>
          <p className="mb-0">Only System Super Administrators can access the Tenants Directory.</p>
        </Alert>
      </Container>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--color-bg-body)', minHeight: '100vh', paddingBottom: '60px' }}>
      <Container fluid className="app-page-container">
        {/* Header */}
        <div className="page-header-row mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <ShieldCheck size={24} style={{ color: 'var(--color-primary)' }} />
              <h2 className="fw-bold mb-0" style={{ color: 'var(--color-text-main)' }}>Tenants Directory</h2>
            </div>
            <p className="mb-0" style={{ color: 'var(--color-text-muted)' }}>
              Manage registered organizations, view tenant IDs, project metrics & member capacity
            </p>
          </div>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        {/* Search */}
        <Row className="mb-4">
          <Col xs={12} md={6}>
            <div className="position-relative">
              <Search size={18} className="position-absolute" style={{ top: '12px', left: '14px', color: 'var(--color-text-subtle)' }} />
              <Form.Control
                className="ps-5"
                placeholder="Search by Tenant ID, Organization Name, or Subdomain..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </Col>
        </Row>

        {/* Tenants Table */}
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : (
          <Card className="shadow-sm border-0">
            <Card.Body className="p-0 table-responsive-custom">
              <Table responsive hover className="mb-0 align-middle">
                <thead style={{ backgroundColor: 'var(--color-bg-body)', borderBottom: '2px solid var(--color-border)' }}>
                  <tr>
                    <th className="py-3 px-4 text-uppercase small text-muted">Tenant ID</th>
                    <th className="py-3 px-4 text-uppercase small text-muted">Organization Name</th>
                    <th className="py-3 px-4 text-uppercase small text-muted">Subdomain</th>
                    <th className="py-3 px-4 text-uppercase small text-muted">No. of Projects</th>
                    <th className="py-3 px-4 text-uppercase small text-muted">No. of Employees</th>
                    <th className="py-3 px-4 text-uppercase small text-muted">Status</th>
                    <th className="py-3 px-4 text-uppercase small text-muted text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTenants.map((t) => {
                    const tenantId = t.id || t._id;
                    return (
                      <tr key={tenantId}>
                        <td className="px-4">
                          <div className="d-flex align-items-center gap-2">
                            <code className="px-2 py-1 bg-light rounded text-dark font-monospace small" style={{ fontSize: '0.8rem' }}>
                              {tenantId}
                            </code>
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 text-muted"
                              title="Copy Tenant ID"
                              onClick={() => handleCopyId(tenantId)}
                            >
                              {copiedId === tenantId ? <CheckCircle2 size={14} className="text-success" /> : <Copy size={14} />}
                            </Button>
                          </div>
                        </td>
                        <td className="px-4 fw-bold" style={{ color: 'var(--color-text-main)' }}>
                          <div className="d-flex align-items-center gap-2">
                            <Building2 size={16} style={{ color: 'var(--color-primary)' }} />
                            <span>{t.name}</span>
                          </div>
                        </td>
                        <td className="px-4">
                          <Badge bg="secondary" className="fw-semibold px-2 py-1">
                            {t.subdomain}
                          </Badge>
                        </td>
                        <td className="px-4">
                          <div className="d-flex align-items-center gap-1 font-monospace fw-bold" style={{ color: 'var(--color-text-main)' }}>
                            <FolderKanban size={15} className="text-muted" />
                            <span>{t.projectCount !== undefined ? t.projectCount : 0}</span>
                            <small className="text-muted fw-normal ms-1">/ {t.max_projects || '∞'}</small>
                          </div>
                        </td>
                        <td className="px-4">
                          <div className="d-flex align-items-center gap-1 font-monospace fw-bold" style={{ color: 'var(--color-text-main)' }}>
                            <UsersIcon size={15} className="text-muted" />
                            <span>{t.employeeCount !== undefined ? t.employeeCount : 0}</span>
                            <small className="text-muted fw-normal ms-1">/ {t.max_users || '∞'}</small>
                          </div>
                        </td>
                        <td className="px-4">
                          <span className={`badge-status ${t.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                            <span className="badge-status-dot"></span>
                            {(t.status || 'active').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 text-end">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="d-inline-flex align-items-center gap-1"
                            onClick={() => openEditModal(t)}
                          >
                            <Edit3 size={14} />
                            <span>Edit Capacity</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTenants.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-muted">
                        No organizations found matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        )}
      </Container>

      {/* Edit Tenant Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton style={{ borderBottom: '1px solid #f1f5f9', padding: '18px 28px' }}>
          <Modal.Title className="fw-bold fs-5">Edit Tenant Configuration</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveTenant}>
          <Modal.Body style={{ padding: '24px 28px' }}>
            <Row className="g-3 mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold mb-1">Organization Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold mb-1">Status <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="inactive">Inactive</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="small fw-semibold mb-1">Subscription Plan <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={editForm.subscription_plan}
                    onChange={(e) => setEditForm({ ...editForm, subscription_plan: e.target.value })}
                  >
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="small fw-semibold mb-1">Max Users <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={editForm.max_users}
                    onChange={(e) => setEditForm({ ...editForm, max_users: parseInt(e.target.value) })}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="small fw-semibold mb-1">Max Projects <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={editForm.max_projects}
                    onChange={(e) => setEditForm({ ...editForm, max_projects: parseInt(e.target.value) })}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer style={{ borderTop: '1px solid #f1f5f9', padding: '16px 28px' }}>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" style={{ backgroundColor: '#0F2C59', borderColor: '#0F2C59', fontWeight: 600 }}>Save Changes</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default Tenants;
