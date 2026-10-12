import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { Calendar as CalendarIcon, Plus, Video, Clock, ExternalLink, Trash2 } from 'lucide-react';
import api from '../utils/api';
import AuthContext from '../context/AuthContext';
import MeetingModal from '../components/MeetingModal';

const Meetings = () => {
  const { user } = useContext(AuthContext);
  const canSchedule = ['tenant_admin', 'manager', 'super_admin'].includes(user?.role);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [telemetry, setTelemetry] = useState(null);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  const fetchMeetings = async () => {
    try {
      const res = await api.get('/meetings');
      if (res.telemetry) {
        setTelemetry(res.telemetry);
      }
      setMeetings(res.data.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleSaveMeeting = async (formData) => {
    try {
      await api.post('/meetings', formData);
      setShowModal(false);
      fetchMeetings();
    } catch (e) {
      alert(e.response?.data?.message || 'Error scheduling meeting');
    }
  };

  const handleDeleteMeeting = async (id) => {
    if (!window.confirm('Cancel this meeting?')) return;
    try {
      await api.delete(`/meetings/${id}`);
      fetchMeetings();
    } catch (e) {
      alert(e.response?.data?.message || 'Error deleting meeting');
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Container fluid className="app-page-container">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h4 style={{ fontWeight: 800, color: '#0f172a', margin: 0 }}>Meetings & Video Calendar</h4>
          <span style={{ fontSize: '13px', color: '#334155' }}>Schedule client syncs and internal employee meetings</span>
        </div>
        <div className="page-header-actions">
          {canSchedule && (
            <Button
              onClick={() => setShowModal(true)}
              style={{ backgroundColor: '#0F2C59', borderColor: '#0F2C59', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={16} /> Schedule Meeting
            </Button>
          )}
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Meetings List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><Spinner animation="border" style={{ color: "#0F2C59" }} /></div>
      ) : meetings.length === 0 ? (
        <Card style={{ padding: '40px', textAlign: 'center', border: '1px border-dashed #cbd5e1' }}>
          <CalendarIcon size={36} color="#475569" style={{ margin: '0 auto 12px' }} />
          <h6>No Upcoming Meetings</h6>
          <p style={{ fontSize: '13px', color: '#334155' }}>
            {canSchedule ? 'Schedule a new meeting with your team or clients.' : 'You have no scheduled meetings at this time.'}
          </p>
        </Card>
      ) : (
        <Row className="g-3">
          {meetings.map(m => (
            <Col xs={12} md={6} lg={4} key={m._id || m.id}>
              <Card style={{ borderRadius: '12px', border: '1px solid #e2e8f0', height: '100%' }}>
                <Card.Body style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h6 style={{ fontWeight: 700, color: '#0f172a', margin: 0 }}>{m.title}</h6>
                    <Badge bg="info" style={{ borderRadius: '6px', fontSize: '11px' }}>
                      {m.duration_minutes || 60}m
                    </Badge>
                  </div>

                  {m.client_id && (
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F2C59', marginBottom: '10px' }}>
                      Client: {m.client_id.name}
                    </div>
                  )}

                  <div style={{ fontSize: '12.5px', color: '#334155', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} color="#475569" />
                    <span>{formatDateTime(m.start_time)}</span>
                  </div>

                  {m.agenda && (
                    <div style={{ fontSize: '12px', color: '#475569', marginBottom: '14px', background: '#f8fafc', padding: '8px 10px', borderRadius: '6px' }}>
                      {m.agenda}
                    </div>
                  )}

                  {/* Attendees Stack */}
                  <div style={{ marginTop: 'auto', marginBottom: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>ATTENDEES</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {m.attendees?.map((att, idx) => (
                        <span key={idx} style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
                          {att.full_name || att.email}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {m.meeting_link ? (
                      <a
                        href={m.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        style={{ textDecoration: 'none', fontSize: '12px', fontWeight: 700, color: '#0F2C59', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Video size={14} /> Join Video Link <ExternalLink size={12} />
                      </a>
                    ) : <span />}
                    {canSchedule && (
                      <Button variant="outline-danger" size="sm" onClick={() => handleDeleteMeeting(m._id || m.id)} style={{ padding: '3px 8px' }}>
                        <Trash2 size={13} />
                      </Button>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {canSchedule && (
        <MeetingModal
          show={showModal}
          onHide={() => setShowModal(false)}
          onSave={handleSaveMeeting}
        />
      )}
    </Container>
  );
};

export default Meetings;
