import React from 'react';
import { Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FolderKanban, Edit2, Trash2, Building2, Calendar } from 'lucide-react';

/**
 * Presentation component for individual project cards.
 * Receives project data and action callbacks via props from the parent view.
 */
const ProjectCard = ({ project, canManage = false, onEdit, onDelete }) => {
  if (!project) return null;

  const progress = project.taskCount > 0 ? (project.completedTaskCount / project.taskCount) * 100 : 0;
  const projectId = project.id || project._id;

  return (
    <Card className="card-hover h-100 p-1">
      <Card.Body className="d-flex flex-column p-4">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="d-flex align-items-center gap-1.5 flex-wrap">
            <span className={`badge-status ${project.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
              <span className="badge-status-dot"></span>
              {(project.status || 'ACTIVE').toUpperCase()}
            </span>
            {project.priority && project.priority !== 'medium' && (
              <span className={`badge-status ${project.priority === 'urgent' || project.priority === 'high' ? 'badge-danger' : 'badge-neutral'}`} style={{ fontSize: '10px' }}>
                {project.priority.toUpperCase()}
              </span>
            )}
            {project.client?.name ? (
              <span className="badge-status badge-neutral" title={`Client: ${project.client.name}`}>
                <Building2 size={12} />
                <span>{project.client.name}</span>
              </span>
            ) : (
              <span className="badge-status badge-neutral" style={{ color: '#475569' }}>
                Standalone
              </span>
            )}
          </div>
          {canManage && (
            <div className="d-flex gap-2">
              <Button 
                variant="link" 
                className="p-0 border-0" 
                style={{ color: 'var(--color-primary)' }} 
                onClick={() => onEdit && onEdit(project)}
                title="Edit Project"
              >
                <Edit2 size={16} />
              </Button>
              <Button 
                variant="link" 
                className="p-0 border-0 text-danger" 
                onClick={() => onDelete && onDelete(projectId)}
                title="Delete Project"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          )}
        </div>

        <Link to={`/projects/${projectId}`} className="text-decoration-none">
          <h4 className="fw-bold mb-1" style={{ color: 'var(--color-text-main)', fontSize: '1.2rem' }}>
            {project.name}
          </h4>
        </Link>

        <Card.Text className="small flex-grow-1 mb-3" style={{ color: 'var(--color-text-muted)', minHeight: '36px' }}>
          {project.description || 'No description provided.'}
        </Card.Text>

        {/* Timeline & Metadata */}
        <div className="mb-3 pt-2 border-top d-flex flex-column gap-1" style={{ borderColor: '#f1f5f9', fontSize: '12px' }}>
          {(project.startDate || project.endDate) && (
            <div className="d-flex align-items-center gap-1.5" style={{ color: '#334155' }}>
              <Calendar size={13} style={{ color: 'var(--color-primary)' }} />
              <span>
                {project.startDate ? new Date(project.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Start'}
                {' → '}
                {project.endDate ? (
                  <span className={new Date(project.endDate) < new Date() && project.status !== 'completed' ? 'text-danger fw-semibold' : ''}>
                    {new Date(project.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {new Date(project.endDate) < new Date() && project.status !== 'completed' ? ' (Overdue)' : ''}
                  </span>
                ) : 'Ongoing'}
              </span>
            </div>
          )}
          <div className="d-flex align-items-center justify-content-between mt-1" style={{ fontSize: '11.5px', color: '#64748b' }}>
            {project.category && (
              <span className="badge-status badge-neutral py-0 px-2" style={{ fontSize: '10.5px' }}>
                {project.category}
              </span>
            )}
            {project.budget > 0 && (
              <span className="fw-semibold" style={{ color: '#090D16' }}>
                Budget: ₹{Number(project.budget).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="d-flex justify-content-between small mb-1" style={{ color: 'var(--color-text-muted)' }}>
            <span>Progress</span>
            <span className="fw-bold" style={{ color: 'var(--color-text-main)' }}>{Math.round(progress)}%</span>
          </div>
          <div className="progress" style={{ height: '6px', borderRadius: '10px', backgroundColor: 'var(--color-border)' }}>
            <div
              className="progress-bar"
              style={{
                width: `${progress}%`,
                backgroundColor: 'var(--color-primary)',
                borderRadius: '10px'
              }}
            ></div>
          </div>
        </div>

        {/* Footer: Members & Task Count */}
        <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top" style={{ borderColor: 'var(--color-border)' }}>
          <span className="small" style={{ color: '#334155' }}>
            {project.assignedMembers?.length || 0} Member{(project.assignedMembers?.length !== 1) ? 's' : ''}
          </span>
          <span className="badge-status badge-neutral">
            <FolderKanban size={13} />
            <span>{project.taskCount || 0} Tasks</span>
          </span>
        </div>
      </Card.Body>
    </Card>
  );
};

export default ProjectCard;
