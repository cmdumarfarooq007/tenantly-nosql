import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col } from 'react-bootstrap';

const EmployeeModal = ({ show, onHide, onSave, targetEmployee = null, hasManager = false }) => {
  const [formData, setFormData] = useState({ 
    email: '', 
    fullName: '', 
    password: '', 
    role: 'employee' 
  });
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    setValidated(false);
    if (targetEmployee) {
      setFormData({
        email: targetEmployee.email,
        fullName: targetEmployee.fullName || targetEmployee.full_name,
        role: targetEmployee.role,
        password: ''
      });
    } else {
      setFormData({ 
        email: '', 
        fullName: '', 
        password: '', 
        role: hasManager ? 'employee' : 'tenant_admin' 
      });
    }
  }, [targetEmployee, show, hasManager]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }
    setValidated(true);
    onSave(formData);
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton style={{ borderBottom: '1px solid #f1f5f9', padding: '18px 28px' }}>
        <Modal.Title className="fw-bold fs-5">{targetEmployee ? 'Edit Team Member' : 'Add Team Member'}</Modal.Title>
      </Modal.Header>
      <Form noValidate validated={validated} onSubmit={handleSubmit}>
        <Modal.Body style={{ padding: '26px 28px' }}>
          <Row className="g-3">
            {/* Full Name */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold small mb-1">
                  Full Name <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  required
                  minLength={2}
                  placeholder="e.g. Jane Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
                <Form.Control.Feedback type="invalid">
                  Please enter the team member's full name (at least 2 characters).
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            {/* Email */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold small mb-1">
                  Email Address <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="email"
                  required
                  disabled={!!targetEmployee}
                  placeholder="jane@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <Form.Control.Feedback type="invalid">
                  Please enter a valid email address.
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            
            {/* Role */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold small mb-1 d-flex justify-content-between align-items-center">
                  <span>System Role <span className="text-danger">*</span></span>
                  {targetEmployee?.role === 'tenant_admin' && (
                    <span className="badge-status badge-neutral py-0 px-2" style={{ fontSize: '10.5px' }}>
                      🔒 Role Locked
                    </span>
                  )}
                </Form.Label>
                <Form.Select
                  required
                  disabled={targetEmployee?.role === 'tenant_admin'}
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="user">Employee (Task Execution)</option>
                  <option value="manager">Manager (Task Creation & Assignment)</option>
                  <option value="tenant_admin">Tenant Admin (Full Control)</option>
                </Form.Select>
                {targetEmployee?.role === 'tenant_admin' ? (
                  <Form.Text className="text-muted small mt-1 d-block" style={{ fontSize: '11px' }}>
                    Tenant Admin role cannot be changed to prevent organization lockout.
                  </Form.Text>
                ) : (
                  <Form.Control.Feedback type="invalid">
                    Please select a role.
                  </Form.Control.Feedback>
                )}
              </Form.Group>
            </Col>

            {/* Password */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold small mb-1">
                  {targetEmployee ? 'New Password (leave blank to keep)' : <>Initial Password <span className="text-danger">*</span></>}
                </Form.Label>
                <Form.Control
                  type="password"
                  required={!targetEmployee}
                  minLength={targetEmployee ? 0 : 6}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <Form.Control.Feedback type="invalid">
                  Please enter a password (at least 6 characters).
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            {!targetEmployee && (
              <Col md={12}>
                <div className="py-1 px-2.5 rounded text-muted small" style={{ backgroundColor: '#f8fafc', fontSize: '11.5px' }}>
                  ℹ️ Set an initial password for the employee. Share this password and your workspace subdomain with them so they can log in via the Employee Portal.
                </div>
              </Col>
            )}
          </Row>
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid #f1f5f9', padding: '16px 28px' }}>
          <Button variant="secondary" onClick={onHide}>Cancel</Button>
          <Button variant="primary" type="submit" style={{ backgroundColor: '#0F2C59', borderColor: '#0F2C59', fontWeight: 600 }}>
            {targetEmployee ? 'Update Member' : 'Save Employee'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default EmployeeModal;