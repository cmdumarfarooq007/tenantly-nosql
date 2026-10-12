import React, { useState, useEffect, useContext } from 'react';
import { Container, Button, Card, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Calendar, Building2 } from 'lucide-react';
import api from '../utils/api';
import TaskModal from '../components/TaskModal';
import TaskCard from '../components/TaskCard';
import AuthContext from '../context/AuthContext';

const ProjectDetails = () => {
  const { user } = useContext(AuthContext);
  const canManageTasks = ['tenant_admin', 'manager', 'super_admin'].includes(user?.role);

  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [debugError, setDebugError] = useState(null);
  const [telemetry, setTelemetry] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const config = getAuthConfig();
      const projRes = await api.get(`/projects/${id}`, config);
      setProject(projRes.data.data.projects ? projRes.data.data.projects[0] : projRes.data.data);
      if (projRes.telemetry) {
        setTelemetry(projRes.telemetry);
      }

      const taskRes = await api.get(`/projects/${id}/tasks`, config);
      setTasks(taskRes.data.data.tasks);
    } catch (err) {
      const msg = err.response?.status + " " + (err.response?.data?.message || err.message);
      setDebugError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleCreateOrUpdateTask = async (data) => {
    try {
      const config = getAuthConfig();
      if (editingTask) {
        await api.put(`/tasks/${editingTask.id}`, data, config);
      } else {
        await api.post(`/projects/${id}/tasks`, data, config);
      }
      setShowModal(false);
      setEditingTask(null);
      fetchData();
    } catch (err) {
      alert('Failed to save task');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus }, getAuthConfig());
      fetchData();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  if (loading) return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      <Spinner animation="border" style={{ color: 'var(--color-primary)' }} />
    </Container>
  );

  if (debugError) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">
          <h4 className="fw-bold">Error Loading Project</h4>
          <p>{debugError}</p>
          <Button variant="outline-danger" onClick={() => navigate('/projects')}>Back to List</Button>
        </Alert>
      </Container>
    );
  }

  if (!project) return <Container className="mt-5 text-dark">Project not found</Container>;

  return (
    <Container fluid className="app-page-container">
        {/* Header Section */}
        <div className="page-header-row mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <Button
            variant="link"
            className="p-0 text-decoration-none fw-semibold d-flex align-items-center gap-1"
            style={{ color: 'var(--color-primary)' }}
            onClick={() => navigate('/projects')}
          >
            <ArrowLeft size={16} />
            <span>Back to Projects</span>
          </Button>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {canManageTasks && (
              <Button
                style={{ backgroundColor: '#0F2C59', borderColor: '#0F2C59', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                onClick={() => { setEditingTask(null); setShowModal(true); }}
              >
                <Plus size={18} />
                <span>Create Task</span>
              </Button>
            )}
          </div>
        </div>

        {/* Project Hero Card */}
        <Card className="mb-4 shadow-sm border-0" style={{ borderRadius: '12px' }}>
          <Card.Body className="p-3 p-sm-4">
            <Row className="align-items-center">
              <Col md={8}>
                <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                  <span className={`badge-status ${project.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                    <span className="badge-status-dot"></span>
                    {project.status?.toUpperCase()}
                  </span>
                  {project.priority && (
                    <span className={`badge-status ${project.priority === 'urgent' || project.priority === 'high' ? 'badge-danger' : 'badge-neutral'}`} style={{ fontSize: '11px' }}>
                      {project.priority?.toUpperCase()} PRIORITY
                    </span>
                  )}
                  {project.client ? (
                    <span className="badge-status badge-neutral">
                      <Building2 size={12} className="me-1" />
                      Client: {project.client.name}
                    </span>
                  ) : (
                    <span className="badge-status badge-neutral" style={{ color: '#475569' }}>
                      Standalone Project
                    </span>
                  )}
                  {project.category && (
                    <span className="badge-status badge-neutral">
                      {project.category}
                    </span>
                  )}
                </div>
                <h2 className="fw-bold mb-1" style={{ color: 'var(--color-text-main)', fontSize: 'clamp(1.4rem, 3vw, 1.85rem)' }}>{project.name}</h2>
                <p className="mb-2" style={{ color: 'var(--color-text-muted)' }}>{project.description}</p>

                {/* Timeline Dates & Budget Info */}
                {(project.startDate || project.endDate || project.budget > 0) && (
                  <div className="d-flex align-items-center gap-3 mt-2 pt-2 border-top flex-wrap" style={{ borderColor: '#f1f5f9', fontSize: '12.5px' }}>
                    {(project.startDate || project.endDate) && (
                      <div className="d-flex align-items-center gap-1.5" style={{ color: '#334155' }}>
                        <Calendar size={14} style={{ color: 'var(--color-primary)' }} />
                        <span>Timeline: </span>
                        <strong>{project.startDate ? new Date(project.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Start'}</strong>
                        <span> → </span>
                        <strong>{project.endDate ? new Date(project.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Ongoing'}</strong>
                      </div>
                    )}
                    {project.budget > 0 && (
                      <div className="d-flex align-items-center gap-1" style={{ color: '#334155' }}>
                        <span>Budget: </span>
                        <strong style={{ color: 'var(--color-primary)' }}>₹{Number(project.budget).toLocaleString()}</strong>
                      </div>
                    )}
                  </div>
                )}
              </Col>
              <Col md={4} className="text-md-end mt-3 mt-md-0">
                <div className="d-flex flex-column align-items-md-end">
                  <span className="small uppercase fw-bold" style={{ color: 'var(--color-text-subtle)', fontSize: '11px' }}>TEAM COLLABORATION</span>
                  <div className="mt-1 small fw-semibold" style={{ color: 'var(--color-text-main)' }}>
                    {project.assignedMembers?.length || 0} Assigned Member{(project.assignedMembers?.length !== 1) ? 's' : ''}
                  </div>
                  <div className="small text-muted mt-0.5">
                    Lead: {project.createdBy?.fullName || 'Tenant Admin'}
                  </div>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Kanban Board */}
        <Row className="g-4">
          {['todo', 'in_progress', 'completed'].map((status) => (
            <Col xs={12} lg={4} key={status}>
              <div className="p-3 rounded-4" style={{ backgroundColor: 'var(--color-bg-body)', border: '1px solid var(--color-border)', minHeight: '300px' }}>
                <div className="d-flex justify-content-between align-items-center mb-3 px-1">
                  <h6 className="fw-bold text-uppercase mb-0" style={{ fontSize: '11px', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
                    {status.replace('_', ' ')}
                    <span className="ms-2">({tasks.filter(t => t.status === status).length})</span>
                  </h6>
                </div>

                <div className="task-list">
                  {tasks.filter(t => t.status === status).map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      status={status}
                      canManageTasks={canManageTasks}
                      onEdit={(t) => { setEditingTask(t); setShowModal(true); }}
                      onStatusChange={handleStatusChange}
                    />
                  ))}

                  {tasks.filter(t => t.status === status).length === 0 && (
                    <div className="text-center py-5" style={{ color: 'var(--color-text-subtle)' }}>
                      <small>No tasks in this list</small>
                    </div>
                  )}
                </div>
              </div>
            </Col>
          ))}
        </Row>
      <TaskModal
        show={showModal}
        onHide={() => setShowModal(false)}
        onSave={handleCreateOrUpdateTask}
        task={editingTask}
        defaultProjectId={id}
      />
    </Container>
  );
};

export default ProjectDetails;