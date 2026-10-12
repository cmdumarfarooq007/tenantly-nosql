import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { Building2, Plus, Search, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import AuthContext from '../context/AuthContext';
import ClientModal from '../components/ClientModal';
import ClientCard from '../components/ClientCard';

const Clients = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [telemetry, setTelemetry] = useState(null);

  const fetchClients = async () => {
    try {
      const res = await api.get('/clients');
      setClients(res.data.data || []);
      if (res.telemetry) {
        setTelemetry(res.telemetry);
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSaveClient = async (formData) => {
    if (editingClient) {
      await api.put(`/clients/${editingClient._id || editingClient.id}`, formData);
    } else {
      await api.post('/clients', formData);
    }
    setShowModal(false);
    setEditingClient(null);
    fetchClients();
  };

  const handleDeleteClient = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete client "${name}"?`)) return;
    try {
      await api.delete(`/clients/${id}`);
      fetchClients();
    } catch (e) {
      alert(e.response?.data?.message || 'Error deleting client');
    }
  };

  const handleExportClients = async () => {
    try {
      const res = await api.get('/clients/export', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'clients_export.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const filteredClients = clients.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.industry?.toLowerCase().includes(search.toLowerCase())
  );

  const canExport = user?.role === 'tenant_admin' || user?.role === 'super_admin';

  return (
    <Container fluid className="app-page-container">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h4 style={{ fontWeight: 800, color: '#0f172a', margin: 0 }}>Clients Management</h4>
          <span style={{ fontSize: '13px', color: '#334155' }}>Manage tenant clients, linked projects, and account managers</span>
        </div>
        <div className="page-header-actions">
          {canExport && (
            <Button
              variant="outline-secondary"
              onClick={handleExportClients}
              style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Export all client records as formatted JSON file"
            >
              <Download size={16} /> Export JSON
            </Button>
          )}
          {user?.role === 'tenant_admin' && (
            <Button
              onClick={() => { setEditingClient(null); setShowModal(true); }}
              style={{ backgroundColor: '#0F2C59', borderColor: '#0F2C59', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={16} /> Add New Client
            </Button>
          )}
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Search Bar */}
      <div className="search-filter-box" style={{ marginBottom: '20px', maxWidth: '360px', position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#475569' }} />
        <Form.Control
          type="text"
          placeholder="Search clients by name or industry..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '38px', borderRadius: '8px', fontSize: '14px' }}
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><Spinner animation="border" style={{ color: "#0F2C59" }} /></div>
      ) : filteredClients.length === 0 ? (
        <Card style={{ padding: '40px', textAlign: 'center', border: '1px border-dashed #cbd5e1' }}>
          <Building2 size={36} color="#475569" style={{ margin: '0 auto 12px' }} />
          <h6>No Clients Found</h6>
          <p style={{ fontSize: '13px', color: '#334155' }}>Get started by adding your first client account.</p>
        </Card>
      ) : (
        <Row className="g-3">
          {filteredClients.map(c => (
            <Col xs={12} md={6} lg={4} key={c._id || c.id}>
              <ClientCard
                client={c}
                canManage={user?.role === 'tenant_admin'}
                onEdit={(client) => { setEditingClient(client); setShowModal(true); }}
                onDelete={handleDeleteClient}
                onView={(id) => navigate(`/clients/${id}`)}
              />
            </Col>
          ))}
        </Row>
      )}

      <ClientModal
        show={showModal}
        onHide={() => { setShowModal(false); setEditingClient(null); }}
        onSave={handleSaveClient}
        targetClient={editingClient}
      />
    </Container>
  );
};

export default Clients;
