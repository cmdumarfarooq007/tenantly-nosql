import React, { useState, useEffect, useContext } from 'react';
import { Modal, Form, Button, Badge, Row, Col } from 'react-bootstrap';
import api from '../utils/api';
import AuthContext from '../context/AuthContext';

const ProjectModal = ({ show, onHide, onSave, project = null }) => {
  const { user } = useContext(AuthContext);
  const canViewClients = ['tenant_admin', 'manager', 'super_admin'].includes(user?.role);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    clientId: '',
    startDate: '',
    endDate: '',
    priority: 'medium',
    budget: '',
    category: 'General'
  });
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [orgUsers, setOrgUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    if (show) {
      // Fetch organization users for member assignment
      api.get('/users')
        .then(res => setOrgUsers(res.data.data?.users || []))
        .catch(() => setOrgUsers([]));

      // Fetch clients only if user is authorized (tenant_admin or manager)
      if (canViewClients) {
        api.get('/clients')
          .then(res => {
            const list = Array.isArray(res.data?.data) ? res.data.data : (res.data?.data?.clients || []);
            setClients(list);
          })
          .catch(() => setClients([]));
      }
    }
  }, [show, canViewClients]);

  useEffect(() => {
    setValidated(false);
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        status: project.status || 'active',
        clientId: project.clientId || (project.client_id ? (project.client_id._id || project.client_id) : '') || '',
        startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : (project.start_date ? new Date(project.start_date).toISOString().split('T')[0] : ''),
        endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : (project.end_date ? new Date(project.end_date).toISOString().split('T')[0] : ''),
        priority: project.priority || 'medium',
        budget: project.budget !== undefined && project.budget !== null ? project.budget : '',
        category: project.category || 'General'
      });
      const initialMembers = project.assignedMembers 
        ? project.assignedMembers.map(m => typeof m === 'object' ? m.id : m)
        : [];
      setSelectedMembers(initialMembers);
    } else {
      setFormData({
        name: '',
        description: '',
        status: 'active',
        clientId: '',
        startDate: '',
        endDate: '',
        priority: 'medium',
        budget: '',
        category: 'General'
      });
      setSelectedMembers([]);
    }
  }, [project, show]);

  const handleMemberToggle = (userId) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }
    setValidated(true);
    onSave({
      ...formData,
      clientId: formData.clientId || null,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
      budget: formData.budget ? Number(formData.budget) : 0,
      assignedMembers: selectedMembers
    });
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton style={{ borderBottom: '1px solid #f1f5f9', padding: '18px 28px' }}>
        <Modal.Title className="fw-bold" style={{ color: 'var(--color-text-main)' }}>
          {project ? 'Edit Project Profile' : 'Create New Project'}
        </Modal.Title>
      </Modal.Header>
      <Form noValidate validated={validated} onSubmit={handleSubmit}>
        <Modal.Body style={{ padding: '24px 28px' }}>
          <Row className="g-3 mb-3">
            {/* Project Name */}
            <Col md={canViewClients ? 6 : 12}>
              <Form.Group>
                <Form.Label className="fw-semibold small mb-1">
                  Project Name <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  required
                  minLength={3}
                  placeholder="e.g. Website Redesign & Portal Launch"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <Form.Control.Feedback type="invalid">
                  Please provide a valid project name (at least 3 characters).
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            {/* Client Selection Field */}
            {canViewClients && (
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold small mb-1 d-flex justify-content-between align-items-center">
                    <span>Associated Client</span>
                    <span className="badge-status badge-neutral py-0 px-2" style={{ fontSize: '10.5px', fontWeight: 500 }}>
                      Optional
                    </span>
                  </Form.Label>
                  <Form.Select
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  >
                    <option value="">Standalone Project (Internal / No Client)</option>
                    {clients.map(c => (
                      <option key={c.id || c._id} value={c.id || c._id}>
                        {c.name || c.company || c.company_name} {c.company && c.name !== c.company ? `(${c.company})` : ''}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            )}
          </Row>

          {/* Priority, Category, Budget, Status in a single 4-column row */}
          <Row className="g-3 mb-3">
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small mb-1">
                  Priority <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  required
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small mb-1">
                  Category <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="General">General Initiative</option>
                  <option value="Web Development">Web Development</option>
                  <option value="Mobile App">Mobile App</option>
                  <option value="UI/UX Design">UI/UX Design</option>
                  <option value="Marketing & SEO">Marketing & SEO</option>
                  <option value="DevOps & Cloud">DevOps & Cloud</option>
                  <option value="Consulting">Consulting</option>
                  <option value="Product Engineering">Product Engineering</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small mb-1">
                  Budget (₹)
                </Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  placeholder="e.g. 50000"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                />
              </Form.Group>
            </Col>

            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small mb-1">
                  Status <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {/* Start Date & Target End Date */}
          <Row className="g-3 mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold small mb-1">
                  Start Date <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
                <Form.Control.Feedback type="invalid">
                  Please specify a start date.
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold small mb-1">
                  Deadline <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="date"
                  required
                  min={formData.startDate || undefined}
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
                <Form.Control.Feedback type="invalid">
                  Please specify a target completion deadline.
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          {/* Description side-by-side with Team Members */}
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold small mb-1">
                  Description <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  required
                  minLength={5}
                  placeholder="Brief overview of project goals, deliverables, and scope..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ height: '105px', resize: 'none' }}
                />
                <Form.Control.Feedback type="invalid">
                  Please provide a brief project description (at least 5 characters).
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold small mb-1 d-flex align-items-center justify-content-between">
                  <span>Assign Team Members</span>
                  <small className="text-muted">{selectedMembers.length} selected</small>
                </Form.Label>
                <div 
                  className="p-2 rounded border"
                  style={{ height: '105px', overflowY: 'auto', backgroundColor: 'var(--color-bg-body)' }}
                >
                  {orgUsers.filter(u => u.role !== 'tenant_admin').map(userItem => (
                    <Form.Check 
                      key={userItem.id}
                      type="checkbox"
                      id={`proj-user-${userItem.id}`}
                      className="mb-1.5 d-flex align-items-center gap-2"
                      label={
                        <span className="small">
                          <strong className="text-dark">{userItem.fullName || userItem.email}</strong>
                          <span className="text-muted ms-1" style={{ fontSize: '11px' }}>({userItem.email})</span>
                          <Badge bg={userItem.role === 'manager' ? 'warning' : 'secondary'} className="ms-1.5 py-0 px-1.5 fw-normal text-dark" style={{ fontSize: '10px' }}>
                            {userItem.role === 'manager' ? 'Manager' : 'Employee'}
                          </Badge>
                        </span>
                      }
                      checked={selectedMembers.includes(userItem.id)}
                      onChange={() => handleMemberToggle(userItem.id)}
                    />
                  ))}
                  {orgUsers.filter(u => u.role !== 'tenant_admin').length === 0 && (
                    <small className="text-muted d-block text-center py-3">No team members available.</small>
                  )}
                </div>
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid #f1f5f9', padding: '16px 28px' }}>
          <Button variant="secondary" onClick={onHide}>Cancel</Button>
          <Button 
            type="submit" 
            style={{ backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)', fontWeight: 600 }}
          >
            {project ? 'Update Project' : 'Create Project'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default ProjectModal;
