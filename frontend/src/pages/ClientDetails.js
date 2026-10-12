import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Tabs, Tab, Form, Spinner, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft, Mail, Phone, MapPin, FolderKanban, Plus, Calendar } from 'lucide-react';
import api from '../utils/api';

const ClientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [telemetry, setTelemetry] = useState(null);
  const [newNote, setNewNote] = useState('');

  const fetchClient = async () => {
    try {
      const res = await api.get(`/clients/${id}`);
      setClientData(res.data.data);
      if (res.telemetry) {
        setTelemetry(res.telemetry);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClient();
  }, [id]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      await api.post(`/clients/${id}/notes`, { note: newNote });
      setNewNote('');
      fetchClient();
    } catch (e) {
      alert('Error adding note');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}><Spinner animation="border" style={{ color: "#0F2C59" }} /></div>;
  if (!clientData) return <Container style={{ padding: '40px' }}><Alert variant="danger">Client not found</Alert></Container>;

  return (
    <Container fluid className="app-page-container">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <Button variant="light" onClick={() => navigate('/clients')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeft size={16} /> Back to Clients
        </Button>
      </div>


      <Card style={{ padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h4 style={{ fontWeight: 800, color: '#0f172a', margin: 0 }}>{clientData.name}</h4>
            <span style={{ fontSize: '14px', color: '#334155' }}>{clientData.company_name || 'Individual Client'}</span>
          </div>
          <Badge bg="success" style={{ fontSize: '12px', padding: '6px 12px' }}>{clientData.status}</Badge>
        </div>

        <Row className="g-3 mt-3">
          <Col xs={6} md={3}>
            <div style={{ fontSize: '12px', color: '#475569' }}>Email</div>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>{clientData.email || 'N/A'}</div>
          </Col>
          <Col xs={6} md={3}>
            <div style={{ fontSize: '12px', color: '#475569' }}>Phone</div>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>{clientData.phone || 'N/A'}</div>
          </Col>
          <Col xs={6} md={3}>
            <div style={{ fontSize: '12px', color: '#475569' }}>Account Employee</div>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>{clientData.assigned_to?.full_name || 'Unassigned'}</div>
          </Col>
          <Col xs={6} md={3}>
            <div style={{ fontSize: '12px', color: '#475569' }}>Industry</div>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>{clientData.industry || 'N/A'}</div>
          </Col>
        </Row>
      </Card>

      <Tabs defaultActiveKey="projects" className="mb-3">
        <Tab eventKey="projects" title={`Linked Projects (${clientData.projects?.length || 0})`}>
          <Row className="g-3">
            {clientData.projects?.map(p => (
              <Col xs={12} md={6} key={p._id || p.id}>
                <Card style={{ padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <h6 style={{ fontWeight: 700, margin: 0 }}>{p.name}</h6>
                  <span style={{ fontSize: '12px', color: '#334155' }}>Status: {p.status}</span>
                </Card>
              </Col>
            ))}
          </Row>
        </Tab>
        <Tab eventKey="meetings" title={`Meetings (${clientData.meetings?.length || 0})`}>
          <Row className="g-3">
            {clientData.meetings?.map(m => (
              <Col xs={12} md={6} key={m._id || m.id}>
                <Card style={{ padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <h6 style={{ fontWeight: 700, margin: 0 }}>{m.title}</h6>
                  <span style={{ fontSize: '12px', color: '#334155' }}>{new Date(m.start_time).toLocaleString()}</span>
                </Card>
              </Col>
            ))}
          </Row>
        </Tab>
        <Tab eventKey="notes" title="Internal Notes">
          <Form onSubmit={handleAddNote} className="mb-3">
            <Form.Group className="mb-2">
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Add internal note for this client..."
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
              />
            </Form.Group>
            <Button size="sm" type="submit" style={{ backgroundColor: '#0F2C59', borderColor: '#0F2C59' }}>Add Note</Button>
          </Form>
          {clientData.notes?.map((n, idx) => (
            <Card key={idx} style={{ padding: '12px', marginBottom: '8px', background: '#f8fafc' }}>
              <div style={{ fontSize: '13px', color: '#0f172a' }}>{n.note}</div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                By {n.author_id?.full_name || 'System'} on {new Date(n.created_at).toLocaleString()}
              </div>
            </Card>
          ))}
        </Tab>
      </Tabs>
    </Container>
  );
};

export default ClientDetails;
