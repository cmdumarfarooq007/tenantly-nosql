import React from 'react';
import { Card, Badge, Button } from 'react-bootstrap';
import { FolderKanban, Phone, Mail, MapPin, Trash2, Edit2 } from 'lucide-react';

/**
 * Presentation component for individual client cards.
 * Receives client data and action handlers via props from the parent view.
 */
const ClientCard = ({ client, onEdit, onDelete, onView, canManage = false }) => {
  if (!client) return null;

  return (
    <Card style={{ borderRadius: '12px', border: '1px solid #e2e8f0', height: '100%' }}>
      <Card.Body style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <h6 
              style={{ fontWeight: 700, color: '#0f172a', margin: 0, cursor: 'pointer' }}
              onClick={() => onView && onView(client._id || client.id)}
            >
              {client.name}
            </h6>
            <span style={{ fontSize: '12px', color: '#334155' }}>
              {client.company_name || 'Individual Client'}
            </span>
          </div>
          <Badge bg={client.status === 'active' ? 'success' : 'secondary'} style={{ borderRadius: '6px' }}>
            {client.status}
          </Badge>
        </div>

        <div style={{ fontSize: '13px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
          {client.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={14} color="#475569" /> {client.email}
            </div>
          )}
          {client.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Phone size={14} color="#475569" /> {client.phone}
            </div>
          )}
          {client.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={14} color="#475569" /> {client.location}
            </div>
          )}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F2C59', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FolderKanban size={14} /> {client.projectCount || 0} Projects
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => onView && onView(client._id || client.id)}
              style={{ fontSize: '12px' }}
            >
              View Profile
            </Button>
            {canManage && (
              <>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => onEdit && onEdit(client)}
                  style={{ padding: '4px 8px' }}
                  title="Edit Client"
                >
                  <Edit2 size={14} />
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => onDelete && onDelete(client._id || client.id, client.name)}
                  style={{ padding: '4px 8px' }}
                  title="Delete Client"
                >
                  <Trash2 size={14} />
                </Button>
              </>
            )}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default ClientCard;
