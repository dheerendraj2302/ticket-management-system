import { useMemo, useState } from 'react';

import { updateTicketStatus } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { getPermittedNextStatuses, requiresRemarks } from '../utils/stateMachine.js';

export default function StatusActions({ ticket, actingUser, actingUserId, onStatusChanged }) {
  const { showSuccess, showError } = useToast();

  const [selectedStatus, setSelectedStatus] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const permittedStatuses = useMemo(
    () => getPermittedNextStatuses(actingUser, ticket),
    [actingUser, ticket]
  );

  const remarksRequired = selectedStatus ? requiresRemarks(selectedStatus) : false;

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedStatus) {
      showError('Select a status to move this ticket to.');
      return;
    }

    if (remarksRequired && !remarks.trim()) {
      showError('Remarks are required when resolving or cancelling a ticket.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        status: selectedStatus,
        actingUserId,
      };

      if (remarksRequired) {
        payload.remarks = remarks.trim();
      }

      await updateTicketStatus(ticket.id, payload);
      setSelectedStatus('');
      setRemarks('');
      showSuccess(`Status updated to ${selectedStatus}.`);
      onStatusChanged?.();
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (permittedStatuses.length === 0) {
    return null;
  }

  return (
    <div className="ticket-detail__card">
      <h3 className="ticket-detail__section-title">Status actions</h3>

      <form className="status-actions" onSubmit={handleSubmit}>
        <label className="form-field" htmlFor="status-select">
          <span className="form-field__label">Change status to</span>
          <select
            id="status-select"
            className="form-field__select"
            value={selectedStatus}
            onChange={(event) => {
              setSelectedStatus(event.target.value);
              setRemarks('');
            }}
            disabled={submitting}
          >
            <option value="">Select status</option>
            {permittedStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        {remarksRequired && (
          <label className="form-field" htmlFor="status-remarks">
            <span className="form-field__label">
              Remarks (required to move to {selectedStatus})
            </span>
            <textarea
              id="status-remarks"
              className="form-field__textarea"
              rows={3}
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              disabled={submitting}
            />
          </label>
        )}

        <div className="status-actions__submit">
          <button
            type="submit"
            className="button button--primary"
            disabled={submitting || !selectedStatus}
          >
            {submitting ? 'Updating...' : 'Update status'}
          </button>
        </div>
      </form>
    </div>
  );
}
