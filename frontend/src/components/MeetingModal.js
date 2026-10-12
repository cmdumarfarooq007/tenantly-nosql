import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col } from 'react-bootstrap';
import api from '../utils/api';

const MeetingModal = ({ show, onHide, onSave }) => {
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    agenda: '',
    startTime: '',
    durationMinutes: 60,
    meetingLink: '',
    clientId: '',
    attendees: []
  });

  useEffect(() => {
    if (show) {
      api.get('/clients').then(res => setClients(res.data.data || [])).catch(() => {});
      api.get('/users').then(res => { const raw = res.data.data; const list = Array.isArray(raw) ? raw : (raw?.users || []); setEmployees(list); }).catch(() => setEmployees([]));
      const now = new Date();
      now.setMinutes(0, 0, 0);
      const isoNow = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
      setFormData({
        title: '', description: '', agenda: '', startTime: isoNow, durationMinutes: 60, meetingLink: 'https://meet.google.com/new', clientId: '', attendees: []
      });
    }
  }, [show]);

  const handleAttendeeToggle = (empId) => {
    setFormData(prev => {
      const exists = prev.attendees.includes(empId);
      const updated = exists ? prev.attendees.filter(id => id !== empId) : [...prev.attendees, empId];
      return { ...prev, attendees: updated };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const start = new Date(formData.startTime);
    const end = new Date(start.getTime() + (parseInt(formData.durationMinutes) * 60000));
    onSave({
      ...formData,
      startTime: start.toISOString(),
      endTime: end.toISOString()
    });
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton style={{ borderBottom: '1px solid #f1f5f9', padding: '18px 28px' }}>
        <Modal.Title style={{ fontSize: '1.15rem', fontWeight: 700 }}>Schedule New Meeting</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body style={{ padding: '24px 28px' }}>
          <Row className="g-3 mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold small mb-1">Meeting Title <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  required
                  type="text"
                  placeholder="e.g. Q4 Sprint Planning / Client Sync"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold small mb-1 d-flex justify-content-between">
                  <span>Associated Client</span>
                  <span className="badge-status badge-neutral py-0 px-2" style={{ fontSize: '10.5px', fontWeight: 500 }}>Optional</span>
                </Form.Label>
                <Form.Select
                  value={formData.clientId}
                  onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                >
                  <option value="">No Client (Internal Meeting)</option>
                  {clients.map(c => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.name} ({c.company_name || 'Client'})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col md={5}>
              <Form.Group>
                <Form.Label className="fw-semibold small mb-1">
                  Meeting Link <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  required
                  type="url"
                  placeholder="https://meet.google.com/abc-defg-hij"
                  value={formData.meetingLink}
                  onChange={e => setFormData({ ...formData, meetingLink: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-semibold small mb-1">
                  Date & Time <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  required
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small mb-1">
                  Duration <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  required
                  value={formData.durationMinutes}
                  onChange={e => setFormData({ ...formData, durationMinutes: e.target.value })}
                >
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold small mb-1">
                  Agenda & Description <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  required
                  as="textarea"
                  placeholder="Outline meeting points and key agenda..."
                  value={formData.agenda}
                  onChange={e => setFormData({ ...formData, agenda: e.target.value })}
                  style={{ height: '110px', resize: 'none' }}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold small mb-1 d-flex justify-content-between">
                  <span>Invite Employees</span>
                  <small className="text-muted">{formData.attendees.length} selected</small>
                </Form.Label>
                <div style={{ height: '110px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', backgroundColor: 'var(--color-bg-body)' }}>
                  {!Array.isArray(employees) || employees.length === 0 ? (
                    <span style={{ fontSize: '12px', color: '#64748b' }}>No employees found.</span>
                  ) : (
                    (Array.isArray(employees) ? employees : []).map(emp => (
                      <Form.Check
                        key={emp._id || emp.id}
                        type="checkbox"
                        id={`emp-${emp._id || emp.id}`}
                        label={
                          <span style={{ fontSize: '12.5px' }}>
                            <strong>{emp.full_name || emp.fullName}</strong>
                            <span className="text-muted ms-1" style={{ fontSize: '11px' }}>({emp.email})</span>
                          </span>
                        }
                        checked={formData.attendees.includes(emp._id || emp.id)}
                        onChange={() => handleAttendeeToggle(emp._id || emp.id)}
                        className="mb-1"
                      />
                    ))
                  )}
                </div>
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid #f1f5f9', padding: '16px 28px' }}>
          <Button variant="light" onClick={onHide}>Cancel</Button>
          <Button variant="primary" type="submit" style={{ backgroundColor: '#0F2C59', borderColor: '#0F2C59', fontWeight: 600 }}>
            Schedule Meeting
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default MeetingModal;
