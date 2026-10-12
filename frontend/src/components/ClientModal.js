import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { Building2, AlertCircle } from 'lucide-react';
import api from '../utils/api';

const ClientModal = ({ show, onHide, onSave, targetClient = null }) => {
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    location: '',
    industry: '',
    status: 'active',
    allottedBudget: '',
    assignedTo: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (show) {
      setServerError('');
      setErrors({});
      setTouched({});
      setSubmitting(false);

      setLoadingEmployees(true);
      api.get('/users')
        .then(res => {
          const raw = res.data.data;
          const list = Array.isArray(raw) ? raw : (raw?.users || []);
          setEmployees(list);
        })
        .catch(() => setEmployees([]))
        .finally(() => setLoadingEmployees(false));

      if (targetClient) {
        setFormData({
          name: targetClient.name || '',
          companyName: targetClient.company_name || targetClient.companyName || '',
          contactPerson: targetClient.contact_person || targetClient.contactPerson || '',
          email: targetClient.email || '',
          phone: targetClient.phone || '',
          location: targetClient.location || '',
          industry: targetClient.industry || '',
          status: targetClient.status || 'active',
          allottedBudget: targetClient.allotted_budget !== undefined && targetClient.allotted_budget !== null ? targetClient.allotted_budget : '',
          assignedTo: targetClient.assigned_to?._id || targetClient.assigned_to || '',
          notes: ''
        });
      } else {
        setFormData({
          name: '',
          companyName: '',
          contactPerson: '',
          email: '',
          phone: '',
          location: '',
          industry: '',
          status: 'active',
          allottedBudget: '',
          assignedTo: '',
          notes: ''
        });
      }
    }
  }, [show, targetClient]);

  // Validation engine for single fields
  const validateField = (field, value) => {
    switch (field) {
      case 'name': {
        const val = (value || '').trim();
        if (!val) return 'Client name is required.';
        if (val.length < 2) return 'Client name must be at least 2 characters.';
        if (val.length > 100) return 'Client name cannot exceed 100 characters.';
        return '';
      }
      case 'contactPerson': {
        const val = (value || '').trim();
        if (!val) return 'Primary contact person is required.';
        if (val.length < 2) return 'Contact person name must be at least 2 characters.';
        if (val.length > 100) return 'Contact person name cannot exceed 100 characters.';
        return '';
      }
      case 'email': {
        const val = (value || '').trim();
        if (!val) return 'Email address is required.';
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(val)) return 'Please enter a valid email address (e.g., client@domain.com).';
        return '';
      }
      case 'phone': {
        const val = (value || '').trim();
        if (!val) return 'Phone number is required.';
        const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{5,20}$/;
        const digitsOnly = val.replace(/\D/g, '');
        if (!phoneRegex.test(val) || digitsOnly.length < 7 || digitsOnly.length > 15) {
          return 'Please enter a valid phone number (between 7 and 15 digits).';
        }
        return '';
      }
      case 'industry': {
        const val = (value || '').trim();
        if (!val) return 'Please select an industry / domain.';
        return '';
      }
      case 'allottedBudget': {
        if (value === '' || value === null || value === undefined) return '';
        const num = Number(value);
        if (isNaN(num)) return 'Budget must be a valid number.';
        if (num < 0) return 'Budget cannot be negative.';
        return '';
      }
      case 'companyName': {
        const val = (value || '').trim();
        if (val.length > 100) return 'Company name cannot exceed 100 characters.';
        return '';
      }
      default:
        return '';
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const errorMsg = validateField(field, formData[field]);
    setErrors(prev => ({ ...prev, [field]: errorMsg }));
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (serverError) setServerError('');

    // If already touched, validate live
    if (touched[field]) {
      const errorMsg = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: errorMsg }));
    }
  };

  const validateAll = () => {
    const fieldsToValidate = ['name', 'contactPerson', 'email', 'phone', 'industry', 'allottedBudget', 'companyName'];
    const newErrors = {};
    let isValid = true;

    fieldsToValidate.forEach(field => {
      const msg = validateField(field, formData[field]);
      if (msg) {
        newErrors[field] = msg;
        isValid = false;
      }
    });

    setErrors(newErrors);
    setTouched(fieldsToValidate.reduce((acc, f) => ({ ...acc, [f]: true }), {}));
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateAll()) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        companyName: formData.companyName.trim(),
        contactPerson: formData.contactPerson.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        location: formData.location.trim(),
        industry: formData.industry.trim(),
        status: formData.status,
        allottedBudget: formData.allottedBudget !== '' ? Number(formData.allottedBudget) : 0,
        assignedTo: formData.assignedTo || null,
        notes: formData.notes.trim()
      };

      await onSave(payload);
      onHide();
    } catch (err) {
      console.error('Error saving client:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to save client. Please check your inputs.';
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={submitting ? undefined : onHide} centered size="lg" backdrop={submitting ? 'static' : true}>
      <Modal.Header closeButton={!submitting} style={{ borderBottom: '1px solid #f1f5f9', padding: '18px 28px' }}>
        <Modal.Title style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={20} color="#0F2C59" />
          {targetClient ? 'Edit Client Profile' : 'Add New Client'}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Body style={{ padding: '24px 28px' }}>
          {serverError && (
            <Alert variant="danger" className="d-flex align-items-center gap-2 mb-3 py-2 px-3" style={{ fontSize: '13px', borderRadius: '8px' }}>
              <AlertCircle size={16} className="flex-shrink-0" />
              <div>{serverError}</div>
            </Alert>
          )}

          <Row className="g-3">
            {/* Client Name (Required) */}
            <Col md={6}>
              <Form.Group>
                <Form.Label style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>
                  Client / Account Name <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. Acme Corporation"
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  isInvalid={touched.name && !!errors.name}
                  style={{ borderRadius: '8px', fontSize: '13.5px' }}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.name}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            {/* Company Legal Name */}
            <Col md={6}>
              <Form.Group>
                <Form.Label style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>
                  Company Name <span className="text-muted fw-normal">(Optional)</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. Acme Tech Solutions Pvt. Ltd."
                  value={formData.companyName}
                  onChange={e => handleChange('companyName', e.target.value)}
                  onBlur={() => handleBlur('companyName')}
                  isInvalid={touched.companyName && !!errors.companyName}
                  style={{ borderRadius: '8px', fontSize: '13.5px' }}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.companyName}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            {/* Contact Person */}
            <Col md={6}>
              <Form.Group>
                <Form.Label style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>
                  Primary Contact Person <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={formData.contactPerson}
                  onChange={e => handleChange('contactPerson', e.target.value)}
                  onBlur={() => handleBlur('contactPerson')}
                  isInvalid={touched.contactPerson && !!errors.contactPerson}
                  style={{ borderRadius: '8px', fontSize: '13.5px' }}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.contactPerson}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            {/* Email Address */}
            <Col md={6}>
              <Form.Group>
                <Form.Label style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>
                  Email Address <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="email"
                  placeholder="contact@acme.com"
                  value={formData.email}
                  onChange={e => handleChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  isInvalid={touched.email && !!errors.email}
                  style={{ borderRadius: '8px', fontSize: '13.5px' }}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.email}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            {/* Phone Number */}
            <Col md={6}>
              <Form.Group>
                <Form.Label style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>
                  Phone Number <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={e => handleChange('phone', e.target.value)}
                  onBlur={() => handleBlur('phone')}
                  isInvalid={touched.phone && !!errors.phone}
                  style={{ borderRadius: '8px', fontSize: '13.5px' }}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.phone}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            {/* Status */}
            <Col md={6}>
              <Form.Group>
                <Form.Label style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>
                  Account Status
                </Form.Label>
                <Form.Select
                  value={formData.status}
                  onChange={e => handleChange('status', e.target.value)}
                  style={{ borderRadius: '8px', fontSize: '13.5px' }}
                >
                  <option value="active">Active (Ongoing Engagement)</option>
                  <option value="lead">Lead (Prospective Client)</option>
                  <option value="inactive">Inactive / On Hold</option>
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Industry */}
            <Col md={6}>
              <Form.Group>
                <Form.Label style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>
                  Industry / Domain <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={formData.industry}
                  onChange={e => handleChange('industry', e.target.value)}
                  onBlur={() => handleBlur('industry')}
                  isInvalid={touched.industry && !!errors.industry}
                  style={{ borderRadius: '8px', fontSize: '13.5px' }}
                >
                  <option value="">Select Industry...</option>
                  <option value="Technology & SaaS">Technology &amp; SaaS</option>
                  <option value="Finance & Banking">Finance &amp; Banking</option>
                  <option value="Healthcare & Pharma">Healthcare &amp; Pharma</option>
                  <option value="E-Commerce & Retail">E-Commerce &amp; Retail</option>
                  <option value="Education & EdTech">Education &amp; EdTech</option>
                  <option value="Manufacturing & Logistics">Manufacturing &amp; Logistics</option>
                  <option value="Real Estate & Construction">Real Estate &amp; Construction</option>
                  <option value="Legal & Consulting">Legal &amp; Consulting</option>
                  <option value="Media & Entertainment">Media &amp; Entertainment</option>
                  <option value="Other">Other</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.industry}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            {/* Allotted Budget */}
            <Col md={6}>
              <Form.Group>
                <Form.Label style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>
                  Allotted Budget (₹)
                </Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="e.g. 250000"
                  value={formData.allottedBudget}
                  onChange={e => handleChange('allottedBudget', e.target.value)}
                  onBlur={() => handleBlur('allottedBudget')}
                  isInvalid={touched.allottedBudget && !!errors.allottedBudget}
                  style={{ borderRadius: '8px', fontSize: '13.5px' }}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.allottedBudget}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            {/* Assigned Account Employee */}
            <Col md={6}>
              <Form.Group>
                <Form.Label style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>
                  Account Manager / Employee
                </Form.Label>
                <Form.Select
                  value={formData.assignedTo}
                  onChange={e => handleChange('assignedTo', e.target.value)}
                  disabled={loadingEmployees}
                  style={{ borderRadius: '8px', fontSize: '13.5px' }}
                >
                  <option value="">Select Employee (Optional)...</option>
                  {employees.map(emp => (
                    <option key={emp._id || emp.id} value={emp._id || emp.id}>
                      {emp.full_name || emp.fullName} ({emp.email})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Location */}
            <Col md={6}>
              <Form.Group>
                <Form.Label style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>
                  Location / City
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. Bengaluru, India"
                  value={formData.location}
                  onChange={e => handleChange('location', e.target.value)}
                  style={{ borderRadius: '8px', fontSize: '13.5px' }}
                />
              </Form.Group>
            </Col>

            {/* Initial Context Note (Only when creating) */}
            {!targetClient && (
              <Col md={12}>
                <Form.Group>
                  <Form.Label style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>
                    Initial Client Notes / Context
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    placeholder="Enter project requirements, lead source, or client background..."
                    value={formData.notes}
                    onChange={e => handleChange('notes', e.target.value)}
                    style={{ borderRadius: '8px', fontSize: '13px', height: '62px', resize: 'none' }}
                  />
                </Form.Group>
              </Col>
            )}
          </Row>
        </Modal.Body>

        <Modal.Footer style={{ borderTop: '1px solid #f1f5f9', padding: '16px 28px' }}>
          <Button variant="light" onClick={onHide} disabled={submitting} style={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            style={{
              backgroundColor: '#0F2C59',
              borderColor: '#0F2C59',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 22px'
            }}
          >
            {submitting && <Spinner animation="border" size="sm" />}
            {submitting ? 'Saving...' : (targetClient ? 'Save Changes' : 'Create Client')}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default ClientModal;
