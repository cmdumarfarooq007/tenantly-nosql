import React, { useState, useEffect, useContext } from 'react';
import { Container, Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { Search, Plus, Download } from 'lucide-react';
import api from '../utils/api';
import ProjectModal from '../components/ProjectModal';
import ProjectCard from '../components/ProjectCard';
import AuthContext from '../context/AuthContext';

const Projects = () => {
  const { user } = useContext(AuthContext);
  const canManageProjects = user?.role === 'tenant_admin' || user?.role === 'super_admin';

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [telemetry, setTelemetry] = useState(null);

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchProjects = async () => {
    try {
      let query = `/projects?limit=100`;
      if (search) query += `&search=${search}`;
      if (statusFilter) query += `&status=${statusFilter}`;

      const res = await api.get(query, getAuthConfig());
      setProjects(res.data.data.projects);
      if (res.telemetry) {
        setTelemetry(res.telemetry);
      }
    } catch (err) {
      setError('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [search, statusFilter]);

  const handleCreateOrUpdate = async (data) => {
    try {
      const config = getAuthConfig();
      if (editingProject) {
        await api.put(`/projects/${editingProject.id}`, data, config);
      } else {
        await api.post('/projects', data, config);
      }
      setShowModal(false);
      setEditingProject(null);
      fetchProjects();
    } catch (err) {
      alert(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure? This will delete all tasks in this project.')) {
      try {
        await api.delete(`/projects/${id}`, getAuthConfig());
        fetchProjects();
      } catch (err) {
        alert(err.response?.data?.message || 'Delete failed');
      }
    }
  };

  const openEditModal = (proj) => {
    setEditingProject(proj);
    setShowModal(true);
  };

  const handleExportProjects = async () => {
    try {
      const res = await api.get('/projects/export', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'projects_export.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <Container fluid className="app-page-container">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h4 style={{ fontWeight: 800, color: '#0f172a', margin: 0 }}>Projects</h4>
          <span style={{ fontSize: '13px', color: '#334155' }}>
            {!canManageProjects ? 'Projects assigned to your organization' : "Manage and track your organization's initiatives"}
          </span>
        </div>
        <div className="page-header-actions">
          {canManageProjects && (
            <Button
              variant="outline-secondary"
              onClick={handleExportProjects}
              style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Export all project records as formatted JSON file"
            >
              <Download size={16} /> Export JSON
            </Button>
          )}
          {canManageProjects && (
            <Button
              onClick={() => { setEditingProject(null); setShowModal(true); }}
              style={{ backgroundColor: '#0F2C59', borderColor: '#0F2C59', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={16} /> Create New Project
            </Button>
          )}
        </div>
      </div>

        {error && <Alert variant="danger">{error}</Alert>}

        <Row className="mb-4 g-3 filter-row">
          <Col xs={12} md={4}>
            <div className="position-relative">
              <Search size={18} className="position-absolute" style={{ top: '12px', left: '14px', color: 'var(--color-text-subtle)' }} />
              <Form.Control
                className="ps-5"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Form.Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </Form.Select>
          </Col>
        </Row>

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : (
          <Row className="g-4">
            {projects.map((p) => (
              <Col xs={12} md={6} lg={4} key={p.id}>
                <ProjectCard
                  project={p}
                  canManage={canManageProjects}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                />
              </Col>
            ))}

            {!loading && projects.length === 0 && (
              <Col xs={12} className="text-center py-5">
                <h5 style={{ color: 'var(--color-text-muted)' }}>No projects match your criteria.</h5>
              </Col>
            )}
          </Row>
        )}
      <ProjectModal
        show={showModal}
        onHide={() => setShowModal(false)}
        onSave={handleCreateOrUpdate}
        project={editingProject}
      />
    </Container>
  );
};

export default Projects;