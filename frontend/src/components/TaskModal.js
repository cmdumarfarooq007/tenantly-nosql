import React, { useState, useEffect, useContext } from 'react';
import { Modal, Form, Button, Badge, Row, Col } from 'react-bootstrap';
import api from '../utils/api';
import AuthContext from '../context/AuthContext';

const TaskModal = ({ show, onHide, onSave, task = null, projects = [], defaultProjectId = '' }) => {
  const { user } = useContext(AuthContext);
  const canEdit = ['tenant_admin', 'manager', 'super_admin'].includes(user?.role);
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    priority: 'medium', 
    dueDate: '', 
    assignedTo: '',
    projectId: defaultProjectId || ''
  });
  const [orgUsers, setOrgUsers] = useState([]);
  const [activeProjects, setActiveProjects] = useState([]);
  const [validated, setValidated] = useState(false);

  // Load users and projects only when modal is opened, preventing re-render flickering
  useEffect(() => {
    if (show) {
      api.get('/users')
        .then(res => setOrgUsers(res.data.data?.users || []))
        .catch(() => setOrgUsers([]));

      if (projects && projects.length > 0) {
        setActiveProjects(projects);
      } else {
        api.get('/projects?limit=100')
          .then(res => setActiveProjects(res.data.data?.projects || []))
          .catch(() => setActiveProjects([]));
      }
    }
  }, [show]);

  // Synchronize form data when task or modal visibility changes
  useEffect(() => {
    if (show) {
      setValidated(false);
      if (task) {
        const assigneeId = task.assignedTo 
          ? (typeof task.assignedTo === 'object' ? task.assignedTo.id || task.assignedTo._id : task.assignedTo) 
          : '';
        const rawDate = task.dueDate || task.due_date;
        const formattedDate = rawDate ? String(rawDate).split('T')[0] : '';
        const selectedProjId = task.projectId || task.project_id || (task.project ? (task.project.id || task.project._id) : '') || defaultProjectId || '';

        setFormData({
          title: task.title || '',
          description: task.description || '',
          priority: task.priority || 'medium',
          dueDate: formattedDate,
          assignedTo: assigneeId || '',
          projectId: selectedProjId
        });
      } else {
        const initialProjId = defaultProjectId 
          || (projects && projects.length === 1 ? (projects[0].id || projects[0]._id) : '');

        setFormData({ 
          title: '', 
          description: '', 
          priority: 'medium', 
          dueDate: '', 
          assignedTo: '',
          projectId: initialProjId || ''
        });
      }
    }
  }, [show, task?.id, defaultProjectId]);

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
      projectId: formData.projectId || defaultProjectId,
      assignedTo: formData.assignedTo || null
    });
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton style={{ borderBottom: '1px solid #f1f5f9', padding: '18px 28px' }}>
        <Modal.Title className="fw-bold d-flex align-items-center gap-2" style={{ fontSize: '1.15rem' }}>
          <span>{task ? (canEdit ? 'Edit Task' : 'Task Details') : 'New Task'}</span>
          {!canEdit && <Badge bg="secondary" style={{ fontSize: '11px', fontWeight: 500 }}>Read Only</Badge>}
        </Modal.Title>
      </Modal.Header>
      <Form noValidate validated={validated} onSubmit={handleSubmit}>
        <Modal.Body style={{ padding: '24px 28px' }}>
          <Row className="g-3">
            {!task && activeProjects.length > 0 ? (
              <>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold small mb-1">
                      Project <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Select
                      required
                      disabled={!canEdit}
                      value={formData.projectId || defaultProjectId || ''}
                      onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    >
                      <option value="" disabled>Select a Project</option>
                      {activeProjects.map(p => {
                        const pId = p.id || p._id;
                        return (
                          <option key={pId} value={pId}>{p.name}</option>
                        );
                      })}
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">
                      Please select a project for this task.
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold small mb-1">
                      Task Title <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      required
                      disabled={!canEdit}
                      minLength={3}
                      placeholder="e.g. Design Landing Page"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                    <Form.Control.Feedback type="invalid">
                      Please enter a valid task title (at least 3 characters).
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </>
            ) : (
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-semibold small mb-1">
                    Task Title <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    required
                    disabled={!canEdit}
                    minLength={3}
                    placeholder="e.g. Design Landing Page"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                  <Form.Control.Feedback type="invalid">
                    Please enter a valid task title (at least 3 characters).
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            )}

            <Col md={12}>
              <Form.Group>
                <Form.Label className="fw-semibold small mb-1">
                  Description <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  required
                  minLength={3}
                  placeholder="Task details and instructions..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <Form.Control.Feedback type="invalid">
                  Please provide a task description.
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-semibold small mb-1">
                  Priority <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  required
                  disabled={!canEdit}
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  Please select a valid task priority.
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-semibold small mb-1">
                  Due Date <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="date"
                  required
                  disabled={!canEdit}
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
                <Form.Control.Feedback type="invalid">
                  Please specify a due date for this task.
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-semibold small mb-1">Assignee</Form.Label>
                <Form.Select
                  disabled={!canEdit}
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                >
                  <option value="">🎟️ Unassigned (Open)</option>
                  {orgUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      👤 {u.fullName || u.email}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid #f1f5f9', padding: '16px 28px' }}>
          <Button variant="secondary" onClick={onHide}>
            {canEdit ? 'Cancel' : 'Close'}
          </Button>
          {canEdit && (
            <Button variant="primary" type="submit" style={{ backgroundColor: '#0F2C59', borderColor: '#0F2C59', fontWeight: 600 }}>
              Save Task
            </Button>
          )}
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default TaskModal;
