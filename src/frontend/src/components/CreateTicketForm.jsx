import { useMemo, useState } from 'react';

import { createTicket } from '../api/client.js';
import { DEFAULT_PRIORITY, TICKET_PRIORITIES } from '../constants/tickets.js';
import { useActingUser } from '../context/ActingUserContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { isAssignableUser } from '../utils/permissions.js';

function formatUserLabel(user) {
  return `${user.name} (${user.role})`;
}

function validateField(name, value) {
  switch (name) {
    case 'title':
      return value.trim() ? '' : 'Title is required.';
    case 'description':
      return value.trim() ? '' : 'Description is required.';
    case 'assignedTo':
      return value ? '' : 'Assignee is required.';
    default:
      return '';
  }
}

export default function CreateTicketForm({ onCancel, onSuccess }) {
  const { users, actingUserId } = useActingUser();
  const { showSuccess, showError } = useToast();

  const assignees = useMemo(() => users.filter(isAssignableUser), [users]);

  const [values, setValues] = useState({
    title: '',
    description: '',
    priority: DEFAULT_PRIORITY,
    assignedTo: '',
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function setValue(name, value) {
    setValues((current) => ({ ...current, [name]: value }));

    if (touched[name]) {
      setErrors((current) => ({ ...current, [name]: validateField(name, value) }));
    }
  }

  function handleBlur(name) {
    setTouched((current) => ({ ...current, [name]: true }));
    setErrors((current) => ({ ...current, [name]: validateField(name, values[name]) }));
  }

  function validateAll() {
    const nextErrors = {
      title: validateField('title', values.title),
      description: validateField('description', values.description),
      assignedTo: validateField('assignedTo', values.assignedTo),
    };

    setErrors(nextErrors);
    setTouched({ title: true, description: true, assignedTo: true });

    return Object.values(nextErrors).every((message) => !message);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validateAll()) {
      return;
    }

    setSubmitting(true);

    try {
      await createTicket({
        title: values.title.trim(),
        description: values.description.trim(),
        priority: values.priority,
        assignedTo: Number(values.assignedTo),
        actingUserId,
      });
      showSuccess('Ticket created successfully.');
      onSuccess?.();
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="create-ticket">
      <div className="create-ticket__header">
        <h2 className="create-ticket__title">Create Ticket</h2>
        <button type="button" className="button button--secondary" onClick={onCancel}>
          Back to list
        </button>
      </div>

      <form className="create-ticket__form" onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label className="form-field__label" htmlFor="ticket-title">
            Title
          </label>
          <input
            id="ticket-title"
            className="form-field__input"
            type="text"
            value={values.title}
            onChange={(event) => setValue('title', event.target.value)}
            onBlur={() => handleBlur('title')}
            disabled={submitting}
            aria-invalid={Boolean(errors.title)}
          />
          {errors.title && <span className="form-field__error">{errors.title}</span>}
        </div>

        <div className="form-field">
          <label className="form-field__label" htmlFor="ticket-description">
            Description
          </label>
          <textarea
            id="ticket-description"
            className="form-field__textarea"
            rows={4}
            value={values.description}
            onChange={(event) => setValue('description', event.target.value)}
            onBlur={() => handleBlur('description')}
            disabled={submitting}
            aria-invalid={Boolean(errors.description)}
          />
          {errors.description && (
            <span className="form-field__error">{errors.description}</span>
          )}
        </div>

        <div className="form-field">
          <label className="form-field__label" htmlFor="ticket-priority">
            Priority
          </label>
          <select
            id="ticket-priority"
            className="form-field__select"
            value={values.priority}
            onChange={(event) => setValue('priority', event.target.value)}
            disabled={submitting}
          >
            {TICKET_PRIORITIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label className="form-field__label" htmlFor="ticket-assignee">
            Assignee
          </label>
          <select
            id="ticket-assignee"
            className="form-field__select"
            value={values.assignedTo}
            onChange={(event) => setValue('assignedTo', event.target.value)}
            onBlur={() => handleBlur('assignedTo')}
            disabled={submitting}
            aria-invalid={Boolean(errors.assignedTo)}
          >
            <option value="">Select assignee</option>
            {assignees.map((user) => (
              <option key={user.id} value={user.id}>
                {formatUserLabel(user)}
              </option>
            ))}
          </select>
          {errors.assignedTo && (
            <span className="form-field__error">{errors.assignedTo}</span>
          )}
        </div>

        <div className="create-ticket__actions">
          <button type="submit" className="button button--primary" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Ticket'}
          </button>
        </div>
      </form>
    </section>
  );
}
