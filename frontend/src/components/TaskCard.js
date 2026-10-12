import React from 'react';
import { Card, Button } from 'react-bootstrap';
import { FolderKanban, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';

/**
 * Presentation component for individual task cards in Kanban columns.
 * Receives task state and handlers via props from the parent view.
 */
const TaskCard = ({ task, status, canManageTasks = false, onEdit, onStatusChange }) => {
  if (!task) return null;

  const priorityClass = task.priority === 'high' 
    ? 'badge-danger' 
    : task.priority === 'medium' 
      ? 'badge-warning' 
      : 'badge-neutral';

  const assigneeName = task.assignedTo 
    ? (typeof task.assignedTo === 'object' ? (task.assignedTo.fullName || task.assignedTo.name || task.assignedTo.email) : task.assignedTo)
    : 'Unassigned';

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && status !== 'completed';

  return (
    <Card className="card-hover mb-3">
      <Card.Body className="p-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          {task.projectName ? (
            <span className="badge-status badge-neutral">
              <FolderKanban size={13} />
              <span>{task.projectName}</span>
            </span>
          ) : <span />}

          <span className={`badge-status ${priorityClass}`}>
            <span className="badge-status-dot"></span>
            {task.priority ? task.priority.toUpperCase() : 'MEDIUM'}
          </span>
        </div>

        <h6 className="fw-bold mb-1" style={{ color: 'var(--color-text-main)' }}>
          {task.title}
        </h6>

        {/* Assignee & Due Date Information */}
        <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top small" style={{ borderColor: 'var(--color-border)', fontSize: '11.5px' }}>
          <div className="d-flex align-items-center gap-1 text-truncate" style={{ maxWidth: '60%' }} title="Assignee">
            <span>👤</span>
            <span className="fw-semibold text-dark text-truncate">
              {assigneeName}
            </span>
          </div>
          <div className="d-flex align-items-center gap-1" title="Due Date">
            <span>📅</span>
            <span className={isOverdue ? 'text-danger fw-semibold' : 'text-muted'}>
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'No due date'}
            </span>
          </div>
        </div>

        <hr className="my-3" style={{ borderColor: 'var(--color-border)' }} />

        <div className="d-flex justify-content-between align-items-center">
          {canManageTasks ? (
            <Button
              type="button"
              variant="link"
              className="p-0 text-decoration-none fw-semibold small d-inline-flex align-items-center gap-1"
              style={{ color: 'var(--color-primary)' }}
              onClick={() => onEdit && onEdit(task)}
            >
              <Pencil size={13} />
              <span>Edit Task</span>
            </Button>
          ) : (
            <span className="small text-muted">Status Only</span>
          )}

          <div className="btn-group shadow-sm">
            {status !== 'todo' && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="px-2"
                onClick={() => onStatusChange && onStatusChange(task.id || task._id, status === 'completed' ? 'in_progress' : 'todo')}
                title="Move Left"
              >
                <ChevronLeft size={16} />
              </Button>
            )}
            {status !== 'completed' && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="px-2"
                onClick={() => onStatusChange && onStatusChange(task.id || task._id, status === 'todo' ? 'in_progress' : 'completed')}
                title="Move Right"
              >
                <ChevronRight size={16} />
              </Button>
            )}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default TaskCard;
