import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Form, Button, Spinner } from 'react-bootstrap';
import { Search, Plus } from 'lucide-react';
import api from '../utils/api';
import TaskModal from '../components/TaskModal';
import TaskCard from '../components/TaskCard';
import AuthContext from '../context/AuthContext';

const AllTasks = () => {
  const { user } = useContext(AuthContext);
  const canManageTasks = ['tenant_admin', 'manager', 'super_admin'].includes(user?.role);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [telemetry, setTelemetry] = useState(null);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchAllTasks = async () => {
    try {
      setLoading(true);
      const config = getAuthConfig();
      let query = `/tasks?limit=200`;
      if (search) query += `&search=${search}`;
      if (priorityFilter) query += `&priority=${priorityFilter}`;

      const res = await api.get(query, config);
      if (res.telemetry) {
        setTelemetry(res.telemetry);
      }
      setTasks(res.data.data.tasks);
    } catch (err) {
      console.error('Failed to fetch workspace tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTasks();
  }, [search, priorityFilter]);

  const handleSaveTask = async (data) => {
    try {
      const config = getAuthConfig();
      if (editingTask) {
        await api.put(`/tasks/${editingTask.id}`, data, config);
      } else if (data.projectId) {
        await api.post(`/projects/${data.projectId}/tasks`, data, config);
      } else {
        alert('Please select a project for the task');
        return;
      }
      setShowModal(false);
      setEditingTask(null);
      fetchAllTasks();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save task');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus }, getAuthConfig());
      fetchAllTasks();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  if (loading) return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      <Spinner animation="border" style={{ color: 'var(--color-primary)' }} />
    </Container>
  );

  return (
    <Container fluid className="app-page-container">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h4 style={{ fontWeight: 800, color: '#0f172a', margin: 0 }}>Tasks</h4>
          <span style={{ fontSize: '13px', color: '#334155' }}>Overview of all active tasks across all organization projects</span>
        </div>
        <div className="page-header-actions">
          {canManageTasks && (
            <Button
              onClick={() => { setEditingTask(null); setShowModal(true); }}
              style={{ backgroundColor: '#0F2C59', borderColor: '#0F2C59', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={16} /> Create Task
            </Button>
          )}
        </div>
      </div>

        {/* Search & Filters */}
        <Row className="mb-4 g-3 filter-row">
          <Col xs={12} md={4}>
            <div className="position-relative">
              <Search size={18} className="position-absolute" style={{ top: '12px', left: '14px', color: 'var(--color-text-subtle)' }} />
              <Form.Control
                className="ps-5"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Form.Select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Form.Select>
          </Col>
        </Row>

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
        onSave={handleSaveTask}
        task={editingTask}
      />
    </Container>
  );
};

export default AllTasks;
