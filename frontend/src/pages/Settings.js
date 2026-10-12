import React, { useState, useEffect, useContext, useRef } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Building2, User, Upload, Trash2, CheckCircle2 } from 'lucide-react';
import api from '../utils/api';
import AuthContext from '../context/AuthContext';

const Settings = () => {
  const { user, setUser } = useContext(AuthContext);
  const isTenantAdmin = user?.role === 'tenant_admin' || user?.role === 'super_admin';

  // Subsections for Tenant Admin: 'organization' and 'profile'
  // For Employee: only 'profile'
  const [activeTab, setActiveTab] = useState(isTenantAdmin ? 'organization' : 'profile');

  // Organization Branding State
  const [orgData, setOrgData] = useState({
    name: '',
    logoUrl: '',
    headline: '',
    website: '',
    publicEmail: '',
    publicPhone: '',
    location: '',
    about: ''
  });

  // Profile Information State
  const currentSavedAvatar = user?.avatar_url || user?.avatarUrl || '';
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || user?.full_name || '',
    email: user?.email || '',
    avatarUrl: currentSavedAvatar
  });
  const [newAvatarPreview, setNewAvatarPreview] = useState('');
  const avatarFileInputRef = useRef(null);

  // Security & Password State
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const tenantId = user?.tenantId || user?.tenant_id || user?.tenant?.id;

  // Fetch initial tenant settings
  useEffect(() => {
    if (tenantId && isTenantAdmin) {
      api.get(`/tenants/${tenantId}`)
        .then(res => {
          const t = res.data.data;
          if (t) {
            setOrgData({
              name: t.name || '',
              logoUrl: t.logo_url || t.logoUrl || '',
              headline: t.headline || '',
              website: t.website || '',
              publicEmail: t.public_email || t.publicEmail || '',
              publicPhone: t.public_phone || t.publicPhone || '',
              location: t.location || '',
              about: t.about || ''
            });
          }
        })
        .catch(() => {});
    }
  }, [tenantId, isTenantAdmin]);

  useEffect(() => {
    if (user) {
      const uName = user.fullName || user.full_name || '';
      const uEmail = user.email || '';
      const uAvatar = user.avatar_url || user.avatarUrl || '';
      setProfileData(prev => ({
        fullName: uName,
        email: uEmail,
        avatarUrl: prev.avatarUrl ? prev.avatarUrl : uAvatar
      }));
    }
  }, [user]);

  // Handle Organization Logo Upload
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setFeedback({ type: 'danger', message: 'Logo file size must be less than 3MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setOrgData(prev => ({ ...prev, logoUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // Save Organization Branding
  const handleSaveOrganization = async (e) => {
    e.preventDefault();
    const tenantId = user?.tenantId || user?.tenant_id || user?.tenant?.id;
    if (!tenantId) {
      setFeedback({ type: 'danger', message: 'Unable to save: Tenant ID is missing.' });
      return;
    }

    setLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      const res = await api.put(`/tenants/${tenantId}`, {
        name: orgData.name,
        logo_url: orgData.logoUrl,
        headline: orgData.headline,
        website: orgData.website,
        public_email: orgData.publicEmail,
        public_phone: orgData.publicPhone,
        location: orgData.location,
        about: orgData.about
      });
      const updatedTenant = res.data.data;
      if (updatedTenant && setUser) {
        setUser(prev => ({
          ...prev,
          tenant: { ...prev?.tenant, ...updatedTenant }
        }));
      }
      setFeedback({ type: 'success', message: 'Organization branding & identity saved successfully!' });
    } catch (err) {
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to save organization settings.' });
    } finally {
      setLoading(false);
    }
  };

  // Handle Avatar Upload
  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setFeedback({ type: 'danger', message: 'Profile picture must be under 2MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewAvatarPreview(reader.result);
      setProfileData(prev => ({ ...prev, avatarUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // Cancel new picture selection and restore current saved picture
  const handleCancelNewAvatar = () => {
    setNewAvatarPreview('');
    setProfileData(prev => ({ ...prev, avatarUrl: currentSavedAvatar }));
    if (avatarFileInputRef.current) {
      avatarFileInputRef.current.value = '';
    }
  };

  // Save Profile Information
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      const res = await api.put('/auth/profile', { 
        fullName: profileData.fullName,
        avatarUrl: profileData.avatarUrl 
      });
      const updated = res.data.data;
      if (updated && setUser) {
        setUser(prev => ({
          ...prev,
          fullName: updated.full_name || updated.fullName,
          avatar_url: updated.avatar_url || profileData.avatarUrl,
          avatarUrl: updated.avatar_url || profileData.avatarUrl
        }));
      }
      setNewAvatarPreview('');
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = '';
      }
      setFeedback({ type: 'success', message: 'Profile information updated successfully!' });
    } catch (err) {
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  // Update Password
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!passwords.currentPassword || !passwords.newPassword) {
      setFeedback({ type: 'danger', message: 'Please provide both your current and new password.' });
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setFeedback({ type: 'danger', message: 'New password and confirmation password do not match.' });
      return;
    }
    if (passwords.newPassword.length < 6) {
      setFeedback({ type: 'danger', message: 'New password must be at least 6 characters.' });
      return;
    }

    setLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      await api.put('/auth/profile', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setFeedback({ type: 'success', message: 'Password updated successfully!' });
    } catch (err) {
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to update password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="app-page-container">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h4 style={{ fontWeight: 800, color: '#0f172a', margin: 0 }}>Settings</h4>
          <span style={{ fontSize: '13px', color: '#334155' }}>
            {isTenantAdmin 
              ? 'Manage your organization branding and personal profile details' 
              : 'Manage your personal profile details and account security'}
          </span>
        </div>
      </div>

      {feedback.message && (
        <Alert 
          variant={feedback.type} 
          dismissible 
          onClose={() => setFeedback({ type: '', message: '' })}
          style={{ borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {feedback.type === 'success' && <CheckCircle2 size={16} />}
          <span>{feedback.message}</span>
        </Alert>
      )}

      {/* Subsection Navigation (Only for Tenant Admin) */}
      {isTenantAdmin && (
        <div 
          className="d-flex gap-2 gap-md-3 mb-4 border-bottom pb-2 flex-wrap" 
          style={{ borderColor: '#e2e8f0' }}
        >
          <button
            onClick={() => { setActiveTab('organization'); setFeedback({ type: '', message: '' }); }}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'organization' ? '3px solid #0F2C59' : '3px solid transparent',
              paddingBottom: '10px',
              fontWeight: activeTab === 'organization' ? 700 : 500,
              color: activeTab === 'organization' ? '#0F2C59' : '#334155',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Building2 size={16} />
            <span>Organization Branding & Identity</span>
          </button>

          <button
            onClick={() => { setActiveTab('profile'); setFeedback({ type: '', message: '' }); }}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'profile' ? '3px solid #0F2C59' : '3px solid transparent',
              paddingBottom: '10px',
              fontWeight: activeTab === 'profile' ? 700 : 500,
              color: activeTab === 'profile' ? '#0F2C59' : '#334155',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <User size={16} />
            <span>Profile Details</span>
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. ORGANIZATION BRANDING & IDENTITY (Tenant Admin Only)         */}
      {/* ============================================================== */}
      {isTenantAdmin && activeTab === 'organization' && (
        <Card style={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <Card.Body style={{ padding: '28px' }}>
            <h5 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
              Organization Branding & Identity
            </h5>
            <p style={{ fontSize: '13px', color: '#334155', marginBottom: '24px' }}>
              Your organization name and logo appear on invoices, quotations, emails, and client portal.
            </p>

            {/* Logo Section */}
            <div className="d-flex align-items-center gap-4 mb-4 pb-3 border-bottom" style={{ borderColor: '#f1f5f9' }}>
              {orgData.logoUrl ? (
                <img 
                  src={orgData.logoUrl} 
                  alt="Organization Logo" 
                  style={{ width: 68, height: 68, borderRadius: 10, objectFit: 'cover', border: '1px solid #cbd5e1' }} 
                />
              ) : (
                <div style={{ 
                  width: 68, 
                  height: 68, 
                  borderRadius: 10, 
                  backgroundColor: 'rgba(13, 148, 136, 0.1)', 
                  color: '#0F2C59', 
                  border: '1px solid rgba(13, 148, 136, 0.2)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontWeight: 800, 
                  fontSize: 26 
                }}>
                  {orgData.name ? orgData.name.charAt(0).toUpperCase() : 'O'}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a', marginBottom: '2px' }}>Organization Logo</div>
                <div style={{ fontSize: '12px', color: '#334155', marginBottom: '10px' }}>Upload PNG, JPG, WEBP or SVG (up to 3MB).</div>
                <div className="d-flex gap-2 align-items-center">
                  <label 
                    className="btn btn-outline-secondary btn-sm" 
                    style={{ cursor: 'pointer', fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Upload size={14} /> Upload New Logo
                    <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                  </label>
                  {orgData.logoUrl && (
                    <Button 
                      variant="link" 
                      className="text-danger p-0 text-decoration-none small d-flex align-items-center gap-1"
                      onClick={() => setOrgData(prev => ({ ...prev, logoUrl: '' }))}
                    >
                      <Trash2 size={13} /> Remove Logo
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <Form onSubmit={handleSaveOrganization}>
              <Row className="g-3 mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Organization Name *</Form.Label>
                    <Form.Control 
                      required 
                      value={orgData.name} 
                      onChange={e => setOrgData({ ...orgData, name: e.target.value })} 
                      placeholder="e.g. Webcros Technologies" 
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Tagline / Headline</Form.Label>
                    <Form.Control 
                      value={orgData.headline} 
                      onChange={e => setOrgData({ ...orgData, headline: e.target.value })} 
                      placeholder="Premium software solutions" 
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Website URL</Form.Label>
                    <Form.Control 
                      value={orgData.website} 
                      onChange={e => setOrgData({ ...orgData, website: e.target.value })} 
                      placeholder="https://webcros.com" 
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Official Contact Email</Form.Label>
                    <Form.Control 
                      type="email" 
                      value={orgData.publicEmail} 
                      onChange={e => setOrgData({ ...orgData, publicEmail: e.target.value })} 
                      placeholder="contact@webcros.com" 
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Official Phone Number</Form.Label>
                    <Form.Control 
                      value={orgData.publicPhone} 
                      onChange={e => setOrgData({ ...orgData, publicPhone: e.target.value })} 
                      placeholder="+91 9884557662" 
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Office Location / Address</Form.Label>
                    <Form.Control 
                      value={orgData.location} 
                      onChange={e => setOrgData({ ...orgData, location: e.target.value })} 
                      placeholder="Suite 402, Cyber Tower, HiTECH City, Hyderabad" 
                    />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group>
                    <Form.Label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>About Your Organization / What You Do</Form.Label>
                    <Form.Control 
                      as="textarea" 
                      rows={3} 
                      value={orgData.about} 
                      onChange={e => setOrgData({ ...orgData, about: e.target.value })} 
                      placeholder="Brief summary of your agency services..." 
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Button 
                type="submit" 
                disabled={loading}
                style={{ backgroundColor: '#0F2C59', borderColor: '#0F2C59', fontWeight: 600, padding: '9px 24px' }}
              >
                {loading ? <Spinner animation="border" size="sm" /> : 'Save Organization Branding'}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      )}

      {/* ============================================================== */}
      {/* 2. PROFILE DETAILS (Available to Everyone: Employees & Admins)  */}
      {/* ============================================================== */}
      {(!isTenantAdmin || activeTab === 'profile') && (
        <div>
          {/* Card 1: Profile Information */}
          <Card style={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', marginBottom: '24px' }}>
            <Card.Body style={{ padding: '28px' }}>
              <h5 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                Profile Information
              </h5>
              <p style={{ fontSize: '13px', color: '#334155', marginBottom: '20px' }}>
                Your personal account details in the organization workspace.
              </p>

              {/* Profile Avatar Upload */}
              <div className="d-flex align-items-center gap-4 mb-4 pb-3 border-bottom flex-wrap" style={{ borderColor: '#f1f5f9' }}>
                {newAvatarPreview ? (
                  <div className="d-flex align-items-center gap-3">
                    {/* Current Saved Picture */}
                    <div className="d-flex flex-column align-items-center">
                      {currentSavedAvatar ? (
                        <img 
                          src={currentSavedAvatar} 
                          alt="Current Profile" 
                          style={{ width: 68, height: 68, borderRadius: '50%', objectFit: 'cover', border: '2px solid #cbd5e1' }} 
                        />
                      ) : (
                        <div style={{ 
                          width: 68, 
                          height: 68, 
                          borderRadius: '50%', 
                          backgroundColor: '#0F2C59', 
                          color: '#ffffff', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontWeight: 700, 
                          fontSize: 26 
                        }}>
                          {profileData.fullName ? profileData.fullName.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                      <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600, marginTop: '4px' }}>Current Picture</span>
                    </div>

                    <span style={{ color: '#94a3b8', fontSize: '18px', fontWeight: 700 }}>→</span>

                    {/* New Picture to be set */}
                    <div className="d-flex flex-column align-items-center">
                      <img 
                        src={newAvatarPreview} 
                        alt="New Selected Profile" 
                        style={{ width: 68, height: 68, borderRadius: '50%', objectFit: 'cover', border: '2px solid #0F2C59', boxShadow: '0 0 0 3px rgba(15, 44, 89, 0.15)' }} 
                      />
                      <span style={{ fontSize: '11px', color: '#0F2C59', fontWeight: 700, marginTop: '4px' }}>New (Pending Save)</span>
                    </div>
                  </div>
                ) : (
                  <div className="d-flex flex-column align-items-center">
                    {profileData.avatarUrl ? (
                      <img 
                        src={profileData.avatarUrl} 
                        alt="Current Profile" 
                        style={{ width: 68, height: 68, borderRadius: '50%', objectFit: 'cover', border: 'none', background: 'transparent' }} 
                      />
                    ) : (
                      <div style={{ 
                        width: 68, 
                        height: 68, 
                        borderRadius: '50%', 
                        backgroundColor: '#0F2C59', 
                        color: '#ffffff', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontWeight: 700, 
                        fontSize: 26 
                      }}>
                        {profileData.fullName ? profileData.fullName.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    {profileData.avatarUrl && (
                      <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600, marginTop: '4px' }}>Current Picture</span>
                    )}
                  </div>
                )}

                <div>
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a', marginBottom: '2px' }}>Profile Picture</div>
                  <div style={{ fontSize: '12px', color: '#334155', marginBottom: '10px' }}>Upload PNG, JPG or WEBP image (up to 2MB).</div>
                  <div className="d-flex gap-2 align-items-center flex-wrap">
                    <label 
                      className="btn btn-outline-secondary btn-sm" 
                      style={{ cursor: 'pointer', fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Upload size={14} /> {newAvatarPreview ? 'Choose Different Picture' : (profileData.avatarUrl ? 'Change Picture' : 'Upload Picture')}
                      <input 
                        ref={avatarFileInputRef}
                        type="file" 
                        accept="image/*" 
                        onChange={handleAvatarUpload} 
                        style={{ display: 'none' }} 
                      />
                    </label>

                    {newAvatarPreview && (
                      <Button 
                        variant="link" 
                        className="text-muted p-0 text-decoration-none small d-flex align-items-center gap-1"
                        onClick={handleCancelNewAvatar}
                      >
                        Cancel Selection
                      </Button>
                    )}

                    {!newAvatarPreview && profileData.avatarUrl && (
                      <Button 
                        variant="link" 
                        className="text-danger p-0 text-decoration-none small d-flex align-items-center gap-1"
                        onClick={() => {
                          setProfileData(prev => ({ ...prev, avatarUrl: '' }));
                          setNewAvatarPreview('');
                        }}
                      >
                        <Trash2 size={13} /> Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <Form onSubmit={handleSaveProfile}>
                <Row className="g-3 mb-4" style={{ maxWidth: 640 }}>
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Full Name *</Form.Label>
                      <Form.Control 
                        required
                        value={profileData.fullName}
                        onChange={e => setProfileData({ ...profileData, fullName: e.target.value })}
                        placeholder="Your full name"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Email Address (Locked)</Form.Label>
                      <Form.Control 
                        disabled 
                        value={profileData.email}
                        style={{ backgroundColor: '#f8fafc', color: '#334155' }}
                      />
                      <Form.Text className="text-muted small">Email address cannot be changed directly.</Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <Button 
                  type="submit" 
                  disabled={loading}
                  style={{ backgroundColor: '#0F2C59', borderColor: '#0F2C59', fontWeight: 600, padding: '9px 24px' }}
                >
                  {loading ? <Spinner animation="border" size="sm" /> : 'Save Profile'}
                </Button>
              </Form>
            </Card.Body>
          </Card>

          {/* Card 2: Security & Password */}
          <Card style={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <Card.Body style={{ padding: '28px' }}>
              <h5 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                Security & Password
              </h5>
              <p style={{ fontSize: '13px', color: '#334155', marginBottom: '20px' }}>
                Update your account password to keep your account secure.
              </p>

              <Form onSubmit={handleUpdatePassword}>
                <Row className="g-3 mb-4" style={{ maxWidth: 480 }}>
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Current Password</Form.Label>
                      <Form.Control 
                        type="password"
                        required
                        placeholder="••••••••"
                        value={passwords.currentPassword}
                        onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>New Password</Form.Label>
                      <Form.Control 
                        type="password"
                        required
                        placeholder="Min 6 characters"
                        value={passwords.newPassword}
                        onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Confirm New Password</Form.Label>
                      <Form.Control 
                        type="password"
                        required
                        placeholder="Confirm new password"
                        value={passwords.confirmPassword}
                        onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Button 
                  type="submit" 
                  disabled={loading}
                  style={{ backgroundColor: '#0F2C59', borderColor: '#0F2C59', fontWeight: 600, padding: '9px 24px' }}
                >
                  {loading ? <Spinner animation="border" size="sm" /> : 'Update Password'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </div>
      )}
    </Container>
  );
};

export default Settings;
