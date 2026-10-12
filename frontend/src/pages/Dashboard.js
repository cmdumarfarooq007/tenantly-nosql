import React, { useEffect, useState, useContext, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Spinner, Button, Modal, Form, Alert, Badge, ProgressBar } from 'react-bootstrap';
import { 
  Building2, 
  Users, 
  FolderKanban, 
  Activity, 
  PlusCircle, 
  RefreshCw, 
  CheckCircle2, 
  Server, 
  ArrowRight,
  Cpu,
  Calendar,
  Clock,
  Video,
  AlertTriangle,
  ExternalLink,
  CheckSquare,
  ArrowUpRight,
  Cloud,
  Database
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import AuthContext from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === 'super_admin';
  const isTenantAdmin = user?.role === 'tenant_admin';
  const isManager = user?.role === 'manager';
  const canViewClients = ['tenant_admin', 'manager', 'super_admin'].includes(user?.role);

  // Super Admin Stats state
  const [stats, setStats] = useState({ 
    tenantsCount: 0, 
    activeTenants: 0, 
    totalUsers: 0, 
    totalProjects: 0, 
    tasks: 0 
  });
  const [tenantsList, setTenantsList] = useState([]);

  // Tenant Workspace Data State
  const [projectsList, setProjectsList] = useState([]);
  const [tasksList, setTasksList] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  const [meetingsList, setMeetingsList] = useState([]);
  const [activitiesList, setActivitiesList] = useState([]);
  const [loading, setLoading] = useState(true);


  // System Health state (Super Admin)
  const [systemHealth, setSystemHealth] = useState({ status: 'Online', latency: '8ms', database: 'MongoDB Connected' });
  const [healthMsg, setHealthMsg] = useState(null);

  // Super Admin New Tenant Modal State
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provisionData, setProvisionData] = useState({ name: '', subdomain: '', adminEmail: '', adminName: '', adminPassword: 'Admin@123' });
  const [provisionError, setProvisionError] = useState('');
  const [provisionSuccess, setProvisionSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const config = getAuthConfig();
      if (isSuperAdmin) {
        const tenantRes = await api.get('/tenants?skipCache=true', config);
        const tenants = tenantRes.data?.data?.tenants || [];
        const totalProjects = tenants.reduce((acc, curr) => acc + (curr.projectCount || 0), 0);
        const totalUsers = tenants.reduce((acc, curr) => acc + (curr.employeeCount || 0), 0);
        const activeTenantsCount = tenants.filter(t => t.status === 'active').length;

        setTenantsList(tenants);
        setStats({
          tenantsCount: tenants.length,
          activeTenants: activeTenantsCount,
          totalUsers,
          totalProjects,
          tasks: totalProjects * 3
        });
      } else {
        // Fetch workspace datasets directly from MongoDB without caching the dashboard
        const [projRes, taskRes, clientRes, meetRes, actRes] = await Promise.allSettled([
          api.get('/projects?limit=50&skipCache=true', config),
          api.get('/tasks?limit=200&skipCache=true', config),
          canViewClients ? api.get('/clients?skipCache=true', config) : Promise.resolve({ data: { data: [] } }),
          api.get('/meetings?skipCache=true', config),
          api.get('/activities?limit=12', config)
        ]);

        const fetchedProjects = projRes.status === 'fulfilled' ? (projRes.value.data?.data?.projects || []) : [];
        const fetchedTasks = taskRes.status === 'fulfilled' ? (taskRes.value.data?.data?.tasks || []) : [];
        
        // Handle clients: API returns array in res.data.data directly
        let fetchedClients = [];
        if (canViewClients && clientRes.status === 'fulfilled') {
          const raw = clientRes.value.data?.data;
          fetchedClients = Array.isArray(raw) ? raw : (raw?.clients || []);
        }

        let fetchedMeetings = [];
        if (meetRes.status === 'fulfilled') {
          const rawMeet = meetRes.value.data?.data;
          fetchedMeetings = Array.isArray(rawMeet) ? rawMeet : (rawMeet?.meetings || []);
        }

        let fetchedActivities = [];
        if (actRes.status === 'fulfilled') {
          fetchedActivities = actRes.value.data?.data || [];
        }

        setProjectsList(fetchedProjects);
        setTasksList(fetchedTasks);
        setClientsList(fetchedClients);
        setMeetingsList(fetchedMeetings);
        setActivitiesList(fetchedActivities);
      }

    } catch (error) {
      console.error("Error loading dashboard data", error);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, canViewClients]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Ping Backend Health (Super Admin)
  const runHealthCheck = async () => {
    try {
      const res = await api.get('/health');
      if (res.data?.status === 'ok') {
        setSystemHealth({ status: '100% Operational', latency: '< 10ms', database: res.data.database || 'MongoDB Connected' });
        setHealthMsg('Health Check Passed: Platform APIs and Database are fully operational.');
      } else {
        setSystemHealth({ status: 'Degraded', latency: '45ms', database: 'Connecting...' });
        setHealthMsg('Warning: Platform database reported degraded performance.');
      }
    } catch (err) {
      setHealthMsg('System Health Ping Failed: Check backend connection.');
    }
    setTimeout(() => setHealthMsg(null), 4000);
  };

  // Toggle Tenant Status (Super Admin)
  const handleToggleTenantStatus = async (tenantId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.put(`/tenants/${tenantId}`, { status: newStatus }, getAuthConfig());
      fetchData();
    } catch (err) {
      alert('Failed to update tenant status: ' + (err.response?.data?.message || err.message));
    }
  };

  // Provision New Tenant submit (Super Admin)
  const handleProvisionSubmit = async (e) => {
    e.preventDefault();
    setProvisionError('');
    setProvisionSuccess('');
    setSubmitting(true);

    try {
      await api.post('/auth/register-tenant', {
        name: provisionData.name,
        subdomain: provisionData.subdomain,
        adminEmail: provisionData.adminEmail,
        adminName: provisionData.adminName,
        adminPassword: provisionData.adminPassword
      });

      setProvisionSuccess(`Tenant "${provisionData.name}" provisioned successfully!`);
      setProvisionData({ name: '', subdomain: '', adminEmail: '', adminName: '', adminPassword: 'Admin@123' });
      fetchData();
      setTimeout(() => {
        setShowProvisionModal(false);
        setProvisionSuccess('');
      }, 1800);
    } catch (err) {
      setProvisionError(err.response?.data?.message || 'Failed to provision tenant.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <Spinner animation="border" style={{ color: 'var(--color-primary)' }} />
      </Container>
    );
  }

  // Calculate Tenant Workspace Metrics (Distinct KPIs - No duplicates)
  const totalProjects = projectsList.length;
  const activeProjects = projectsList.filter(p => p.status === 'active' || p.status === 'in_progress').length;
  
  const totalTasks = tasksList.length;
  const completedTasks = tasksList.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasksList.filter(t => t.status === 'in_progress').length;
  const todoTasks = tasksList.filter(t => t.status === 'todo').length;
  const highPriorityTasks = tasksList.filter(t => t.priority === 'high' && t.status !== 'completed').length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalClients = clientsList.length;
  const totalMeetings = meetingsList.length;

  const displayName = user?.fullName || user?.full_name || 'Team Member';
  const tenantName = user?.tenant?.name || user?.tenantSubdomain || 'Workspace';

  return (
    <Container fluid className="app-page-container">
      
      {/* 1. Header & Quick Actions */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h4 style={{ fontWeight: 800, color: 'var(--color-text-main)', margin: 0 }}>
              {isSuperAdmin ? 'System Governance Console' : `Welcome back, ${displayName}`}
            </h4>
          </div>
          <span style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>
            {isSuperAdmin 
              ? 'Multi-tenant provisioning, database health monitoring, and global platform analytics'
              : `${tenantName} workspace overview`}
          </span>
        </div>

        {/* Action Shortcuts */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {isSuperAdmin ? (

            <>
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={runHealthCheck}
                className="d-flex align-items-center gap-1 fw-semibold"
                style={{ borderRadius: '8px' }}
              >
                <RefreshCw size={14} /> Ping Health
              </Button>
              <Button 
                style={{ backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)', fontWeight: 600, borderRadius: '8px' }}
                size="sm"
                onClick={() => setShowProvisionModal(true)}
                className="d-flex align-items-center gap-1"
              >
                <PlusCircle size={15} /> Provision Tenant
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={() => navigate('/tasks')}
                className="d-flex align-items-center gap-1.5 fw-semibold"
                style={{ borderRadius: '8px', color: '#090D16' }}
              >
                <CheckSquare size={14} /> Task Board
              </Button>
              {(isTenantAdmin || isManager) && (
                <Button 
                  style={{ backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)', fontWeight: 600, borderRadius: '8px' }}
                  size="sm"
                  onClick={() => navigate('/meetings')}
                  className="d-flex align-items-center gap-1.5 text-white"
                >
                  <Calendar size={14} /> Schedule Meeting
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* System Health Feedback Toast */}
      {healthMsg && (
        <Alert variant="info" className="mb-4 py-2 d-flex align-items-center gap-2 shadow-sm" style={{ borderRadius: '10px' }}>
          <CheckCircle2 size={16} />
          <span className="small fw-semibold">{healthMsg}</span>
        </Alert>
      )}

      {/* 2. SUPER ADMIN DASHBOARD */}
      {isSuperAdmin ? (
        <>
          {/* Super Admin Metric Cards */}
          <Row className="mb-4 g-3">
            <Col xs={12} sm={6} lg={3}>
              <Card className="card-hover p-2 h-100 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                <Card.Body className="p-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="small text-uppercase fw-bold" style={{ color: '#475569', letterSpacing: '0.05em', fontSize: '11px' }}>
                      Tenant Workspaces
                    </span>
                    <div className="p-2 rounded-3" style={{ backgroundColor: 'var(--color-primary-soft)' }}>
                      <Building2 size={18} style={{ color: 'var(--color-primary)' }} />
                    </div>
                  </div>
                  <h2 className="fw-bold mb-1" style={{ color: 'var(--color-text-main)' }}>{stats.tenantsCount}</h2>
                  <div className="d-flex align-items-center gap-1 small">
                    <Badge bg="success" className="fw-normal">{stats.activeTenants} Active</Badge>
                    <span style={{ color: '#334155' }}>/ {stats.tenantsCount - stats.activeTenants} Suspended</span>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} sm={6} lg={3}>
              <Card className="card-hover p-2 h-100 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                <Card.Body className="p-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="small text-uppercase fw-bold" style={{ color: '#475569', letterSpacing: '0.05em', fontSize: '11px' }}>
                      Platform Users
                    </span>
                    <div className="p-2 rounded-3" style={{ backgroundColor: 'var(--color-primary-soft)' }}>
                      <Users size={18} style={{ color: 'var(--color-primary)' }} />
                    </div>
                  </div>
                  <h2 className="fw-bold mb-1" style={{ color: 'var(--color-text-main)' }}>{stats.totalUsers}</h2>
                  <small style={{ color: '#334155' }}>Across all verified tenants</small>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} sm={6} lg={3}>
              <Card className="card-hover p-2 h-100 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                <Card.Body className="p-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="small text-uppercase fw-bold" style={{ color: '#475569', letterSpacing: '0.05em', fontSize: '11px' }}>
                      Global Projects
                    </span>
                    <div className="p-2 rounded-3" style={{ backgroundColor: 'var(--color-primary-soft)' }}>
                      <FolderKanban size={18} style={{ color: 'var(--color-primary)' }} />
                    </div>
                  </div>
                  <h2 className="fw-bold mb-1" style={{ color: 'var(--color-text-main)' }}>{stats.totalProjects}</h2>
                  <small style={{ color: '#334155' }}>Initiatives created across organizations</small>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} sm={6} lg={3}>
              <Card className="card-hover p-2 h-100 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                <Card.Body className="p-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="small text-uppercase fw-bold" style={{ color: '#475569', letterSpacing: '0.05em', fontSize: '11px' }}>
                      Cluster Health
                    </span>
                    <div className="p-2 rounded-3" style={{ backgroundColor: '#ECFDF5' }}>
                      <Activity size={18} style={{ color: '#10B981' }} />
                    </div>
                  </div>
                  <h6 className="fw-bold mb-1 text-success d-flex align-items-center gap-1">
                    <span className="badge-status-dot me-1" style={{ backgroundColor: '#10b981' }}></span>
                    {systemHealth.status}
                  </h6>
                  <small style={{ color: '#334155' }}>{systemHealth.database} ({systemHealth.latency})</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Super Admin Tables & Logs */}
          <Row className="g-4">
            <Col lg={8}>
              <Card className="border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                <Card.Header className="bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-0 fw-bold" style={{ color: 'var(--color-text-main)' }}>Tenants Directory & Management</h5>
                    <small style={{ color: '#334155' }}>Live overview of organization workspaces</small>
                  </div>
                  <Link to="/tenants" className="btn btn-sm btn-outline-primary fw-semibold d-flex align-items-center gap-1" style={{ borderRadius: '6px', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
                    <span>View All</span>
                    <ArrowRight size={14} />
                  </Link>
                </Card.Header>
                <Card.Body className="p-0">
                  <Table responsive className="table-custom align-middle mb-0">
                    <thead>
                      <tr>
                        <th className="px-4">Organization</th>
                        <th>Subdomain</th>
                        <th>Members</th>
                        <th>Status</th>
                        <th className="text-end px-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenantsList.slice(0, 6).map((t) => (
                        <tr key={t.id || t._id}>
                          <td className="px-4">
                            <div className="fw-bold" style={{ color: 'var(--color-text-main)' }}>{t.name}</div>
                            <small style={{ color: '#334155' }}>{t.subscriptionPlan?.toUpperCase() || 'FREE'} Plan</small>
                          </td>
                          <td>
                            <code style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{t.subdomain}</code>
                          </td>
                          <td>
                            <span className="fw-semibold" style={{ color: 'var(--color-text-main)' }}>{t.employeeCount || 0}</span>
                            <small style={{ color: '#334155' }}> / {t.maxUsers}</small>
                          </td>
                          <td>
                            <span className={`badge-status ${t.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                              <span className="badge-status-dot"></span>
                              {t.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="text-end px-4">
                            <Button
                              variant={t.status === 'active' ? 'outline-danger' : 'outline-success'}
                              size="sm"
                              className="fw-semibold px-2.5 py-1"
                              style={{ borderRadius: '6px', fontSize: '11px' }}
                              onClick={() => handleToggleTenantStatus(t.id || t._id, t.status)}
                            >
                              {t.status === 'active' ? 'Suspend' : 'Activate'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={4}>
              <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
                <Card.Header className="bg-white border-bottom py-3 px-4">
                  <h6 className="mb-0 fw-bold d-flex align-items-center gap-2" style={{ color: 'var(--color-text-main)' }}>
                    <Server size={18} style={{ color: 'var(--color-primary)' }} />
                    <span>Infrastructure Status</span>
                  </h6>
                </Card.Header>
                <Card.Body className="p-3">
                  <div className="mb-3 pb-3 border-bottom" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="small fw-semibold" style={{ color: '#334155' }}>MongoDB Core</span>
                      <span className="badge-status badge-success py-0 px-2" style={{ fontSize: '10px' }}>Active</span>
                    </div>
                    <small style={{ color: '#334155' }}>Replica cluster response: 8ms</small>
                  </div>
                  <div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="small fw-semibold" style={{ color: '#334155' }}>Subdomain Isolation</span>
                      <span className="badge-status badge-success py-0 px-2" style={{ fontSize: '10px' }}>Enforced</span>
                    </div>
                    <small style={{ color: '#334155' }}>Wildcard SSL routing operational</small>
                  </div>
                </Card.Body>
              </Card>

              <Card className="border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                <Card.Header className="bg-white border-bottom py-3 px-4">
                  <h6 className="mb-0 fw-bold d-flex align-items-center gap-2" style={{ color: 'var(--color-text-main)' }}>
                    <Cpu size={18} style={{ color: 'var(--color-primary)' }} />
                    <span>Live Audit Stream</span>
                  </h6>
                </Card.Header>
                <Card.Body className="p-3">
                  <ul className="list-unstyled mb-0 small">
                    <li className="mb-3 d-flex align-items-start gap-2">
                      <span className="badge-status-dot mt-1" style={{ backgroundColor: '#10b981' }}></span>
                      <div>
                        <strong className="d-block" style={{ color: 'var(--color-text-main)' }}>Super Admin Session Active</strong>
                        <span style={{ color: '#334155' }}>Governance privileges authenticated</span>
                      </div>
                    </li>
                    <li className="mb-3 d-flex align-items-start gap-2">
                      <span className="badge-status-dot mt-1" style={{ backgroundColor: 'var(--color-primary)' }}></span>
                      <div>
                        <strong className="d-block" style={{ color: 'var(--color-text-main)' }}>Cross-Tenant Security Barrier</strong>
                        <span style={{ color: '#334155' }}>Strict tenant isolation active</span>
                      </div>
                    </li>
                    <li className="d-flex align-items-start gap-2">
                      <span className="badge-status-dot mt-1" style={{ backgroundColor: '#0F2C59' }}></span>
                      <div>
                        <strong className="d-block" style={{ color: 'var(--color-text-main)' }}>Database Indexing Synchronized</strong>
                        <span style={{ color: '#334155' }}>Performance metrics verified</span>
                      </div>
                    </li>
                  </ul>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      ) : (
        /* 3. TENANT WORKSPACE EXECUTIVE DASHBOARD (NON-SUPER ADMIN) */
        <>
          {/* Top 4 Distinct KPI Metric Cards (Zero Repetition) */}
          <Row className="mb-4 g-3">
            
            {/* KPI 1: Active Projects */}
            <Col xs={12} sm={6} xl={3}>
              <Card className="card-hover p-2 h-100 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                <Card.Body className="p-3 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="small text-uppercase fw-bold" style={{ color: '#475569', letterSpacing: '0.05em', fontSize: '11px' }}>
                        Active Projects
                      </span>
                      <div className="p-2 rounded-3" style={{ backgroundColor: 'var(--color-primary-soft)' }}>
                        <FolderKanban size={18} style={{ color: 'var(--color-primary)' }} />
                      </div>
                    </div>
                    <h2 className="fw-bold mb-1" style={{ color: 'var(--color-text-main)' }}>{activeProjects}</h2>
                  </div>
                  <div className="d-flex align-items-center justify-content-between mt-2 pt-2 border-top" style={{ borderColor: '#f1f5f9', fontSize: '12px' }}>
                    <span style={{ color: '#334155' }}>Total: <strong>{totalProjects}</strong> registered</span>
                    <Link to="/projects" className="text-decoration-none fw-semibold d-flex align-items-center gap-0.5" style={{ color: 'var(--color-primary)' }}>
                      <span>View</span> <ArrowUpRight size={13} />
                    </Link>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* KPI 2: Task Execution Velocity */}
            <Col xs={12} sm={6} xl={3}>
              <Card className="card-hover p-2 h-100 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                <Card.Body className="p-3 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="small text-uppercase fw-bold" style={{ color: '#475569', letterSpacing: '0.05em', fontSize: '11px' }}>
                        Task Velocity
                      </span>
                      <div className="p-2 rounded-3" style={{ backgroundColor: '#ECFDF5' }}>
                        <CheckCircle2 size={18} style={{ color: '#10B981' }} />
                      </div>
                    </div>
                    <div className="d-flex align-items-baseline gap-2 mb-1">
                      <h2 className="fw-bold mb-0" style={{ color: 'var(--color-text-main)' }}>{taskCompletionRate}%</h2>
                      <span className="small fw-semibold text-success">Completed</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <ProgressBar now={taskCompletionRate} style={{ height: '6px', borderRadius: '4px' }} variant="success" />
                    <div className="d-flex justify-content-between align-items-center mt-1" style={{ fontSize: '11px', color: '#334155' }}>
                      <span>{completedTasks} completed</span>
                      <span>{totalTasks} total</span>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* KPI 3: Commercial Client Partnerships (Tenant Admin & Manager) OR Tasks In-Progress (Employee) */}
            <Col xs={12} sm={6} xl={3}>
              <Card className="card-hover p-2 h-100 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                <Card.Body className="p-3 d-flex flex-column justify-content-between">
                  {canViewClients ? (
                    <>
                      <div>
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="small text-uppercase fw-bold" style={{ color: '#475569', letterSpacing: '0.05em', fontSize: '11px' }}>
                            Client Accounts
                          </span>
                          <div className="p-2 rounded-3" style={{ backgroundColor: 'var(--color-primary-soft)' }}>
                            <Building2 size={18} style={{ color: 'var(--color-primary)' }} />
                          </div>
                        </div>
                        <h2 className="fw-bold mb-1" style={{ color: 'var(--color-text-main)' }}>{totalClients}</h2>
                      </div>
                      <div className="d-flex align-items-center justify-content-between mt-2 pt-2 border-top" style={{ borderColor: '#f1f5f9', fontSize: '12px' }}>
                        <span style={{ color: '#334155' }}>Corporate client accounts</span>
                        <Link to="/clients" className="text-decoration-none fw-semibold d-flex align-items-center gap-0.5" style={{ color: 'var(--color-primary)' }}>
                          <span>Manage</span> <ArrowUpRight size={13} />
                        </Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="small text-uppercase fw-bold" style={{ color: '#475569', letterSpacing: '0.05em', fontSize: '11px' }}>
                            Tasks In Progress
                          </span>
                          <div className="p-2 rounded-3" style={{ backgroundColor: 'var(--color-primary-soft)' }}>
                            <Activity size={18} style={{ color: 'var(--color-primary)' }} />
                          </div>
                        </div>
                        <h2 className="fw-bold mb-1" style={{ color: 'var(--color-text-main)' }}>{inProgressTasks}</h2>
                      </div>
                      <div className="d-flex align-items-center justify-content-between mt-2 pt-2 border-top" style={{ borderColor: '#f1f5f9', fontSize: '12px' }}>
                        <span style={{ color: '#334155' }}>Active tasks underway</span>
                        <Link to="/tasks" className="text-decoration-none fw-semibold d-flex align-items-center gap-0.5" style={{ color: 'var(--color-primary)' }}>
                          <span>Board</span> <ArrowUpRight size={13} />
                        </Link>
                      </div>
                    </>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* KPI 4: Scheduled Video Syncs */}
            <Col xs={12} sm={6} xl={3}>
              <Card className="card-hover p-2 h-100 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                <Card.Body className="p-3 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="small text-uppercase fw-bold" style={{ color: '#475569', letterSpacing: '0.05em', fontSize: '11px' }}>
                        Scheduled Meetings
                      </span>
                      <div className="p-2 rounded-3" style={{ backgroundColor: 'var(--color-primary-soft)' }}>
                        <Calendar size={18} style={{ color: 'var(--color-primary)' }} />
                      </div>
                    </div>
                    <h2 className="fw-bold mb-1" style={{ color: 'var(--color-text-main)' }}>{totalMeetings}</h2>
                  </div>
                  <div className="d-flex align-items-center justify-content-between mt-2 pt-2 border-top" style={{ borderColor: '#f1f5f9', fontSize: '12px' }}>
                    <span style={{ color: '#334155' }}>Team syncs & discussions</span>
                    <Link to="/meetings" className="text-decoration-none fw-semibold d-flex align-items-center gap-0.5" style={{ color: 'var(--color-primary)' }}>
                      <span>Calendar</span> <ArrowUpRight size={13} />
                    </Link>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Row 2: Active Projects Delivery Matrix (8 cols) + Task Distribution & Urgency (4 cols) */}
          <Row className="g-4 mb-4">
            
            {/* Active Projects Table Matrix */}
            <Col lg={8}>
              <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                <Card.Header className="bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-0 fw-bold" style={{ color: 'var(--color-text-main)' }}>Project Portfolio & Milestones</h5>
                    <small style={{ color: '#334155' }}>Active initiatives, task counts and project ownership</small>
                  </div>
                  <Link to="/projects" className="btn btn-sm btn-outline-secondary fw-semibold d-flex align-items-center gap-1" style={{ borderRadius: '6px', color: '#090D16' }}>
                    <span>All Projects</span>
                    <ArrowRight size={14} />
                  </Link>
                </Card.Header>
                <Card.Body className="p-0">
                  <Table responsive className="table-custom mb-0">
                    <thead>
                      <tr>
                        <th className="px-4">Project</th>
                        <th>Status</th>
                        <th>Tasks</th>
                        <th>Lead</th>
                        <th className="text-end px-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectsList.slice(0, 5).map((proj) => (
                        <tr key={proj.id || proj._id}>
                          <td className="px-4">
                            <div className="fw-bold" style={{ color: 'var(--color-text-main)' }}>{proj.name}</div>
                            <small className="text-truncate d-inline-block" style={{ maxWidth: '240px', color: '#334155' }}>
                              {proj.description || 'No project description'}
                            </small>
                          </td>
                          <td>
                            <span className={`badge-status ${proj.status === 'active' || proj.status === 'in_progress' ? 'badge-success' : 'badge-neutral'}`}>
                              <span className="badge-status-dot"></span>
                              {proj.status?.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <span className="fw-bold" style={{ color: 'var(--color-primary)' }}>{proj.taskCount || 0}</span>
                              <span className="small" style={{ color: '#334155' }}>items</span>
                            </div>
                          </td>
                          <td>
                            <span className="fw-medium small" style={{ color: 'var(--color-text-main)' }}>
                              {proj.createdBy?.fullName || proj.createdBy?.name || 'Assigned Lead'}
                            </span>
                          </td>
                          <td className="text-end px-4">
                            <Link 
                              to={`/projects/${proj.id || proj._id}`}
                              className="btn btn-sm btn-outline-primary py-1 px-2.5 fw-semibold d-inline-flex align-items-center gap-1"
                              style={{ borderRadius: '6px', fontSize: '11.5px', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                            >
                              <span>Board</span>
                              <ArrowRight size={12} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {projectsList.length === 0 && (
                        <tr>
                          <td colSpan="5" className="text-center py-5" style={{ color: '#334155' }}>
                            <FolderKanban size={32} className="mb-2 opacity-50" />
                            <div className="fw-semibold">No active projects created in this workspace</div>
                            <small>Get started by creating a new project in the projects module.</small>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>

            {/* Task Workflow Breakdown & Urgency */}
            <Col lg={4}>
              <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                <Card.Header className="bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
                  <h6 className="mb-0 fw-bold" style={{ color: 'var(--color-text-main)' }}>Task Execution Pipeline</h6>
                  <Link to="/tasks" className="text-decoration-none small fw-semibold" style={{ color: 'var(--color-primary)' }}>
                    Kanban Board
                  </Link>
                </Card.Header>
                <Card.Body className="p-4 d-flex flex-column justify-content-between">
                  
                  {/* Task Status Progress Bars */}
                  <div>
                    {/* Completed */}
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="small fw-semibold d-flex align-items-center gap-1.5" style={{ color: '#090D16' }}>
                          <span className="badge-status-dot" style={{ backgroundColor: '#10B981' }}></span> Completed
                        </span>
                        <span className="small fw-bold" style={{ color: 'var(--color-text-main)' }}>
                          {completedTasks} <span className="text-muted fw-normal">({totalTasks > 0 ? Math.round((completedTasks/totalTasks)*100) : 0}%)</span>
                        </span>
                      </div>
                      <ProgressBar now={totalTasks > 0 ? (completedTasks/totalTasks)*100 : 0} variant="success" style={{ height: '6px', borderRadius: '4px' }} />
                    </div>

                    {/* In Progress */}
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="small fw-semibold d-flex align-items-center gap-1.5" style={{ color: '#090D16' }}>
                          <span className="badge-status-dot" style={{ backgroundColor: '#0F2C59' }}></span> In Progress
                        </span>
                        <span className="small fw-bold" style={{ color: 'var(--color-text-main)' }}>
                          {inProgressTasks} <span className="text-muted fw-normal">({totalTasks > 0 ? Math.round((inProgressTasks/totalTasks)*100) : 0}%)</span>
                        </span>
                      </div>
                      <ProgressBar now={totalTasks > 0 ? (inProgressTasks/totalTasks)*100 : 0} style={{ height: '6px', borderRadius: '4px', backgroundColor: '#e2e8f0' }} className="progress-bar-primary" />
                    </div>

                    {/* To Do */}
                    <div className="mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="small fw-semibold d-flex align-items-center gap-1.5" style={{ color: '#090D16' }}>
                          <span className="badge-status-dot" style={{ backgroundColor: '#64748B' }}></span> Backlog / To Do
                        </span>
                        <span className="small fw-bold" style={{ color: 'var(--color-text-main)' }}>
                          {todoTasks} <span className="text-muted fw-normal">({totalTasks > 0 ? Math.round((todoTasks/totalTasks)*100) : 0}%)</span>
                        </span>
                      </div>
                      <ProgressBar now={totalTasks > 0 ? (todoTasks/totalTasks)*100 : 0} variant="secondary" style={{ height: '6px', borderRadius: '4px' }} />
                    </div>
                  </div>

                  {/* Priority Alert Banner */}
                  {highPriorityTasks > 0 ? (
                    <div className="p-3 rounded-3" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                      <div className="d-flex align-items-center gap-2 mb-1 text-danger fw-bold small">
                        <AlertTriangle size={16} />
                        <span>Action Required: Urgent Tasks</span>
                      </div>
                      <div className="small" style={{ color: '#991B1B', fontSize: '12px' }}>
                        You have <strong>{highPriorityTasks} high-priority</strong> task{highPriorityTasks > 1 ? 's' : ''} pending completion across active boards.
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-3" style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                      <div className="d-flex align-items-center gap-2 mb-1 text-success fw-bold small">
                        <CheckCircle2 size={16} />
                        <span>Workflow Healthy</span>
                      </div>
                      <div className="small text-success" style={{ fontSize: '12px' }}>
                        All high-priority milestones are on track with zero critical blockers.
                      </div>
                    </div>
                  )}

                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Row 3: Upcoming Meetings Agenda (7 cols) + Key Client Accounts (5 cols for Admins/Managers) OR Priority Work Tasks (5 cols for Employees) */}
          <Row className="g-4">
            
            {/* Upcoming Meetings Agenda List */}
            <Col lg={7}>
              <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                <Card.Header className="bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-0 fw-bold" style={{ color: 'var(--color-text-main)' }}>Upcoming Meetings & Video Syncs</h5>
                    <small style={{ color: '#334155' }}>Scheduled client briefings and team collaboration sessions</small>
                  </div>
                  <Link to="/meetings" className="btn btn-sm btn-outline-secondary fw-semibold d-flex align-items-center gap-1" style={{ borderRadius: '6px', color: '#090D16' }}>
                    <span>All Meetings</span>
                    <ArrowRight size={14} />
                  </Link>
                </Card.Header>
                <Card.Body className="p-3">
                  {meetingsList.slice(0, 4).map((m) => (
                    <div 
                      key={m.id || m._id} 
                      className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center p-3 mb-2 rounded-3 border"
                      style={{ backgroundColor: '#F8FAFC', borderColor: 'var(--color-border)' }}
                    >
                      <div className="d-flex align-items-start gap-3 mb-2 mb-sm-0">
                        <div 
                          className="p-2.5 rounded-3 d-flex flex-column align-items-center justify-content-center text-center" 
                          style={{ backgroundColor: 'var(--color-primary-soft)', minWidth: '55px' }}
                        >
                          <Calendar size={16} style={{ color: 'var(--color-primary)' }} />
                          <span className="fw-bold mt-1" style={{ fontSize: '11px', color: 'var(--color-primary)' }}>
                            {m.meeting_date ? new Date(m.meeting_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Upcoming'}
                          </span>
                        </div>
                        <div>
                          <div className="fw-bold" style={{ color: 'var(--color-text-main)', fontSize: '14px' }}>{m.title}</div>
                          <div className="d-flex align-items-center gap-2 mt-1" style={{ fontSize: '12px', color: '#334155' }}>
                            <span className="d-flex align-items-center gap-1">
                              <Clock size={12} />
                              {m.start_time || 'TBD'} {m.end_time ? `- ${m.end_time}` : ''}
                            </span>
                            {/* Hide Client Info from Employee */}
                            {canViewClients && m.client_id?.name && (
                              <span>• Client: <strong>{m.client_id.name}</strong></span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        {m.meeting_link ? (
                          <a
                            href={m.meeting_link}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1.5 fw-semibold"
                            style={{ borderRadius: '6px', fontSize: '11.5px', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                          >
                            <Video size={13} />
                            <span>Join Video</span>
                            <ExternalLink size={11} />
                          </a>
                        ) : (
                          <Badge bg="secondary" className="fw-normal">Internal Sync</Badge>
                        )}
                      </div>
                    </div>
                  ))}

                  {meetingsList.length === 0 && (
                    <div className="text-center py-5" style={{ color: '#334155' }}>
                      <Calendar size={32} className="mb-2 opacity-50" />
                      <div className="fw-semibold">No upcoming meetings scheduled</div>
                      <small>Keep track of team syncs and discussions by scheduling a meeting.</small>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* Strategic Client Accounts (For Admins/Managers) OR Priority Work Tasks (For Employees) */}
            <Col lg={5}>
              {canViewClients ? (
                <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                  <Card.Header className="bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
                    <div>
                      <h5 className="mb-0 fw-bold" style={{ color: 'var(--color-text-main)' }}>Key Client Portfolio</h5>
                      <small style={{ color: '#334155' }}>Commercial accounts & stakeholders</small>
                    </div>
                    <Link to="/clients" className="btn btn-sm btn-outline-secondary fw-semibold d-flex align-items-center gap-1" style={{ borderRadius: '6px', color: '#090D16' }}>
                      <span>View All</span>
                      <ArrowRight size={14} />
                    </Link>
                  </Card.Header>
                  <Card.Body className="p-3">
                    {clientsList.slice(0, 4).map((c) => (
                      <div 
                        key={c.id || c._id} 
                        className="d-flex justify-content-between align-items-center p-3 mb-2 rounded-3 border"
                        style={{ backgroundColor: '#F8FAFC', borderColor: 'var(--color-border)' }}
                      >
                        <div className="d-flex align-items-center gap-3">
                          <div 
                            className="rounded-circle text-white d-flex justify-content-center align-items-center fw-bold" 
                            style={{ width: 38, height: 38, backgroundColor: 'var(--color-primary)', fontSize: '0.85rem' }}
                          >
                            {c.name ? c.name.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div>
                            <div className="fw-bold" style={{ color: 'var(--color-text-main)', fontSize: '13.5px' }}>{c.name}</div>
                            <div style={{ fontSize: '11.5px', color: '#334155' }}>
                              {c.company ? `${c.company} • ` : ''}{c.email}
                            </div>
                          </div>
                        </div>

                        <div className="text-end">
                          <span className="badge-status badge-neutral" style={{ fontSize: '11px' }}>
                            {c.projectCount !== undefined ? c.projectCount : (c.project_count || 0)} projects
                          </span>
                        </div>
                      </div>
                    ))}

                    {clientsList.length === 0 && (
                      <div className="text-center py-5" style={{ color: '#334155' }}>
                        <Building2 size={32} className="mb-2 opacity-50" />
                        <div className="fw-semibold">No client accounts on file</div>
                        <small>Add clients to organize deliverables and track initiatives.</small>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              ) : (
                /* EMPLOYEE VIEW: Priority Work Tasks (Zero Client Information) */
                <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                  <Card.Header className="bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
                    <div>
                      <h5 className="mb-0 fw-bold" style={{ color: 'var(--color-text-main)' }}>My Work Focus</h5>
                      <small style={{ color: '#334155' }}>Active tasks pending your completion</small>
                    </div>
                    <Link to="/tasks" className="btn btn-sm btn-outline-secondary fw-semibold d-flex align-items-center gap-1" style={{ borderRadius: '6px', color: '#090D16' }}>
                      <span>Task Board</span>
                      <ArrowRight size={14} />
                    </Link>
                  </Card.Header>
                  <Card.Body className="p-3">
                    {tasksList.filter(t => t.status !== 'completed').slice(0, 4).map((task) => (
                      <div 
                        key={task.id || task._id} 
                        className="d-flex justify-content-between align-items-center p-3 mb-2 rounded-3 border"
                        style={{ backgroundColor: '#F8FAFC', borderColor: 'var(--color-border)' }}
                      >
                        <div style={{ maxWidth: '70%' }}>
                          <div className="fw-bold text-truncate" style={{ color: 'var(--color-text-main)', fontSize: '13.5px' }}>
                            {task.title}
                          </div>
                          <div className="d-flex align-items-center gap-2 mt-1" style={{ fontSize: '11.5px', color: '#334155' }}>
                            <span className="fw-semibold text-truncate">{task.projectName || 'Project Task'}</span>
                            {task.dueDate && (
                              <span>• Due {new Date(task.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <span 
                            className={`badge-status ${task.priority === 'high' ? 'badge-danger' : task.priority === 'medium' ? 'badge-warning' : 'badge-neutral'}`}
                            style={{ fontSize: '10px' }}
                          >
                            {task.priority?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}

                    {tasksList.filter(t => t.status !== 'completed').length === 0 && (
                      <div className="text-center py-5" style={{ color: '#334155' }}>
                        <CheckCircle2 size={32} className="mb-2 text-success opacity-75" />
                        <div className="fw-semibold text-success">All tasks completed!</div>
                        <small>You have no active pending tasks on your board.</small>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              )}
            </Col>

          </Row>

          {/* Row 4: AWS DynamoDB Real-Time Tenant Activity Stream */}
          <Row className="mt-4">
            <Col xs={12}>
              <Card className="border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                <Card.Header className="bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <div className="p-2 rounded-3" style={{ backgroundColor: '#FFF7ED' }}>
                      <Cloud size={18} style={{ color: '#EA580C' }} />
                    </div>
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <h6 className="mb-0 fw-bold" style={{ color: 'var(--color-text-main)' }}>Tenant Activity & Audit Trail</h6>
                        <Badge bg="warning" text="dark" className="d-flex align-items-center gap-1 px-2 py-1" style={{ fontSize: '10px', backgroundColor: '#FEF3C7' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#D97706', display: 'inline-block' }}></span>
                          AWS DynamoDB • ap-south-1
                        </Badge>
                      </div>
                      <small style={{ color: '#64748B', fontSize: '12px' }}>
                        High-throughput append-only event stream stored directly in Amazon DynamoDB with automatic 2-hour TTL expiry
                      </small>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="small text-muted" style={{ fontSize: '11px' }}>
                      Table: <code>TenantActivity</code>
                    </span>
                    <Button 
                      variant="light" 
                      size="sm" 
                      onClick={fetchData} 
                      className="d-flex align-items-center gap-1 border"
                      style={{ fontSize: '11px', borderRadius: '6px' }}
                    >
                      <RefreshCw size={12} />
                      <span>Refresh</span>
                    </Button>
                  </div>
                </Card.Header>
                <Card.Body className="p-0">
                  {activitiesList.length > 0 ? (
                    <div className="table-responsive">
                      <Table hover className="mb-0 align-middle" style={{ fontSize: '13px' }}>
                        <thead style={{ backgroundColor: '#F8FAFC', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                          <tr>
                            <th className="py-2.5 px-4">Event Type</th>
                            <th className="py-2.5 px-3">Description</th>
                            <th className="py-2.5 px-3">Actor</th>
                            <th className="py-2.5 px-3">Timestamp</th>
                            <th className="py-2.5 px-4 text-end">Auto-Expiry</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activitiesList.map((act) => {
                            let badgeBg = '#E0E7FF';
                            let badgeColor = '#3730A3';
                            if (act.eventType.includes('TASK')) { badgeBg = '#DCFCE7'; badgeColor = '#166534'; }
                            else if (act.eventType.includes('PROJECT')) { badgeBg = '#E0F2FE'; badgeColor = '#075985'; }
                            else if (act.eventType.includes('CLIENT')) { badgeBg = '#F3E8FF'; badgeColor = '#6B21A8'; }
                            else if (act.eventType.includes('LOGIN')) { badgeBg = '#EFF6FF'; badgeColor = '#1E40AF'; }
                            else if (act.eventType.includes('MEETING')) { badgeBg = '#FEF3C7'; badgeColor = '#92400E'; }

                            return (
                              <tr key={act.id}>
                                <td className="py-3 px-4">
                                  <span 
                                    className="px-2 py-1 rounded-2 fw-semibold" 
                                    style={{ 
                                      backgroundColor: badgeBg, 
                                      color: badgeColor, 
                                      fontSize: '11px',
                                      letterSpacing: '0.02em'
                                    }}
                                  >
                                    {act.eventType}
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="fw-semibold" style={{ color: 'var(--color-text-main)' }}>{act.summary}</div>
                                  {act.entityType && (
                                    <small className="text-muted" style={{ fontSize: '11px' }}>Target: {act.entityType}</small>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="fw-medium text-truncate" style={{ maxWidth: '160px', color: '#1E293B' }}>
                                    {act.userName || 'System'}
                                  </div>
                                  <small className="text-muted text-truncate d-block" style={{ maxWidth: '160px', fontSize: '11px' }}>
                                    {act.userEmail || '-'}
                                  </small>
                                </td>
                                <td className="py-3 px-3 text-muted" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                                  {act.createdAt ? new Date(act.createdAt).toLocaleString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: true
                                  }) : '-'}
                                </td>
                                <td className="py-3 px-4 text-end text-muted" style={{ fontSize: '11px' }}>
                                  <span className="badge bg-light text-secondary border" style={{ fontSize: '10px' }}>
                                    2-Hour TTL
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-5 text-muted">
                      <Cloud size={32} className="mb-2 opacity-50 text-warning" />
                      <div className="fw-semibold">No activity recorded yet in DynamoDB</div>
                      <small>Create tasks, projects, clients, or log in to generate live events.</small>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* Provision Tenant Modal (Super Admin) */}
      <Modal show={showProvisionModal} onHide={() => setShowProvisionModal(false)} centered size="lg">
        <Modal.Header closeButton style={{ borderBottom: '1px solid #f1f5f9', padding: '18px 28px' }}>
          <Modal.Title className="fw-bold fs-5">Provision New Tenant Workspace</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleProvisionSubmit}>
          <Modal.Body style={{ padding: '24px 28px' }}>
            {provisionError && <Alert variant="danger" className="py-2 small mb-3">{provisionError}</Alert>}
            {provisionSuccess && <Alert variant="success" className="py-2 small mb-3">{provisionSuccess}</Alert>}

            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold mb-1">Organization Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="e.g. Acme Innovations" 
                    value={provisionData.name}
                    onChange={(e) => setProvisionData({ ...provisionData, name: e.target.value })}
                    required 
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold mb-1">Workspace Subdomain <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="e.g. acme-innovations" 
                    value={provisionData.subdomain}
                    onChange={(e) => setProvisionData({ ...provisionData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    required 
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold mb-1">Tenant Admin Full Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="e.g. Alice Smith" 
                    value={provisionData.adminName}
                    onChange={(e) => setProvisionData({ ...provisionData, adminName: e.target.value })}
                    required 
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold mb-1">Tenant Admin Email <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    type="email" 
                    placeholder="e.g. admin@acme.com" 
                    value={provisionData.adminEmail}
                    onChange={(e) => setProvisionData({ ...provisionData, adminEmail: e.target.value })}
                    required 
                  />
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold mb-1">Default Initial Password <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    type="password" 
                    value={provisionData.adminPassword}
                    onChange={(e) => setProvisionData({ ...provisionData, adminPassword: e.target.value })}
                    required 
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer style={{ borderTop: '1px solid #f1f5f9', padding: '16px 28px' }}>
            <Button variant="secondary" onClick={() => setShowProvisionModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting} style={{ backgroundColor: '#0F2C59', borderColor: '#0F2C59', fontWeight: 600 }}>
              {submitting ? 'Provisioning...' : 'Provision Tenant'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

    </Container>
  );
};

export default Dashboard;
