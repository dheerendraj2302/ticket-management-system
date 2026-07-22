import { useCallback, useEffect, useMemo, useState } from 'react';

import { addComment, getTicketById, updateTicket } from '../api/client.js';
import { TICKET_PRIORITIES } from '../constants/tickets.js';
import { useActingUser } from '../context/ActingUserContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate, formatDateTime } from '../utils/format.js';
import { canUpdateTicketFields, isAssignableUser } from '../utils/permissions.js';
import { formatUserLabel, getUserName } from '../utils/users.js';
import StatusActions from './StatusActions.jsx';
import StatusBadge from './StatusBadge.jsx';

export default function TicketDetail({ ticketId, onBack }) {
  const { users, actingUser, actingUserId } = useActingUser();
  const { showSuccess, showError } = useToast();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editValues, setEditValues] = useState({
    title: '',
    description: '',
    priority: '',
    assignedTo: '',
  });
  const [commentMessage, setCommentMessage] = useState('');
  const [submittingUpdate, setSubmittingUpdate] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  const assignees = useMemo(() => users.filter(isAssignableUser), [users]);
  const canEdit = canUpdateTicketFields(actingUser, ticket);

  const loadTicket = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getTicketById(ticketId);
      setTicket(data);
      setEditValues({
        title: data.title,
        description: data.description,
        priority: data.priority,
        assignedTo: String(data.assignedTo),
      });
    } catch (err) {
      setError(err.message);
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  async function handleUpdate(event) {
    event.preventDefault();
    setSubmittingUpdate(true);

    try {
      await updateTicket(ticketId, {
        title: editValues.title.trim(),
        description: editValues.description.trim(),
        priority: editValues.priority,
        assignedTo: Number(editValues.assignedTo),
        actingUserId,
      });
      showSuccess('Ticket updated successfully.');
      await loadTicket();
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmittingUpdate(false);
    }
  }

  async function handleAddComment(event) {
    event.preventDefault();

    if (!commentMessage.trim()) {
      showError('Comment message is required.');
      return;
    }

    setSubmittingComment(true);

    try {
      await addComment(ticketId, {
        message: commentMessage.trim(),
        actingUserId,
      });
      setCommentMessage('');
      showSuccess('Comment added.');
      await loadTicket();
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmittingComment(false);
    }
  }

  if (loading) {
    return <p className="ticket-detail__status">Loading ticket...</p>;
  }

  if (error || !ticket) {
    return (
      <section className="ticket-detail">
        <button type="button" className="button button--secondary" onClick={onBack}>
          Back to list
        </button>
        <p className="ticket-detail__error">{error || 'Ticket not found.'}</p>
      </section>
    );
  }

  return (
    <section className="ticket-detail">
      <div className="ticket-detail__header">
        <button type="button" className="button button--secondary" onClick={onBack}>
          Back to list
        </button>
      </div>

      <div className="ticket-detail__card">
        <div className="ticket-detail__title-row">
          <h2 className="ticket-detail__title">{ticket.title}</h2>
          <StatusBadge status={ticket.status} />
        </div>

        <dl className="ticket-detail__meta">
          <div>
            <dt>Priority</dt>
            <dd>{ticket.priority}</dd>
          </div>
          <div>
            <dt>Assignee</dt>
            <dd>{ticket.assigneeName}</dd>
          </div>
          <div>
            <dt>Created by</dt>
            <dd>{getUserName(users, ticket.createdBy)}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{formatDate(ticket.createdAt)}</dd>
          </div>
          <div>
            <dt>Last updated</dt>
            <dd>{formatDateTime(ticket.updatedAt)}</dd>
          </div>
        </dl>

        <div className="ticket-detail__section">
          <h3 className="ticket-detail__section-title">Description</h3>
          <p className="ticket-detail__description">{ticket.description}</p>
        </div>
      </div>

      <StatusActions
        ticket={ticket}
        actingUser={actingUser}
        actingUserId={actingUserId}
        onStatusChanged={loadTicket}
      />

      <div className="ticket-detail__card">
        <h3 className="ticket-detail__section-title">Comments</h3>

        {ticket.comments.length === 0 ? (
          <p className="ticket-detail__status">No comments yet.</p>
        ) : (
          <ul className="comment-thread">
            {ticket.comments.map((comment) => (
              <li key={comment.id} className="comment-thread__item">
                <div className="comment-thread__meta">
                  <strong>{getUserName(users, comment.createdBy)}</strong>
                  <span>{formatDateTime(comment.createdAt)}</span>
                </div>
                <p className="comment-thread__message">{comment.message}</p>
              </li>
            ))}
          </ul>
        )}

        <form className="comment-form" onSubmit={handleAddComment}>
          <label className="form-field" htmlFor="comment-message">
            <span className="form-field__label">Add comment</span>
            <textarea
              id="comment-message"
              className="form-field__textarea"
              rows={3}
              value={commentMessage}
              onChange={(event) => setCommentMessage(event.target.value)}
              disabled={submittingComment}
            />
          </label>
          <button
            type="submit"
            className="button button--primary"
            disabled={submittingComment}
          >
            {submittingComment ? 'Posting...' : 'Post comment'}
          </button>
        </form>
      </div>

      {canEdit && (
        <div className="ticket-detail__card">
          <h3 className="ticket-detail__section-title">Edit ticket</h3>

          <form className="ticket-edit-form" onSubmit={handleUpdate}>
            <label className="form-field">
              <span className="form-field__label">Title</span>
              <input
                className="form-field__input"
                type="text"
                value={editValues.title}
                onChange={(event) =>
                  setEditValues((current) => ({ ...current, title: event.target.value }))
                }
                disabled={submittingUpdate}
              />
            </label>

            <label className="form-field">
              <span className="form-field__label">Description</span>
              <textarea
                className="form-field__textarea"
                rows={4}
                value={editValues.description}
                onChange={(event) =>
                  setEditValues((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                disabled={submittingUpdate}
              />
            </label>

            <label className="form-field">
              <span className="form-field__label">Priority</span>
              <select
                className="form-field__select"
                value={editValues.priority}
                onChange={(event) =>
                  setEditValues((current) => ({ ...current, priority: event.target.value }))
                }
                disabled={submittingUpdate}
              >
                {TICKET_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span className="form-field__label">Assignee</span>
              <select
                className="form-field__select"
                value={editValues.assignedTo}
                onChange={(event) =>
                  setEditValues((current) => ({ ...current, assignedTo: event.target.value }))
                }
                disabled={submittingUpdate}
              >
                {assignees.map((user) => (
                  <option key={user.id} value={user.id}>
                    {formatUserLabel(user)}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" className="button button--primary" disabled={submittingUpdate}>
              {submittingUpdate ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
