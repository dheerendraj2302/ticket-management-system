import { useEffect, useState } from 'react';

import { getTickets } from '../api/client.js';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '../constants/tickets.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { formatDate } from '../utils/format.js';
import StatusBadge from './StatusBadge.jsx';

export default function TicketList({ onSelectTicket }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    let cancelled = false;

    async function loadTickets() {
      setLoading(true);
      setError(null);

      try {
        const data = await getTickets({
          search: debouncedSearch,
          status: statusFilter,
          priority: priorityFilter,
        });

        if (!cancelled) {
          setTickets(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setTickets([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTickets();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, statusFilter, priorityFilter]);

  return (
    <section className="ticket-list">
      <div className="ticket-list__toolbar">
        <label className="ticket-list__field">
          <span className="ticket-list__label">Search</span>
          <input
            className="ticket-list__input"
            type="search"
            placeholder="Search title, description, or comments"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <label className="ticket-list__field">
          <span className="ticket-list__label">Status</span>
          <select
            className="ticket-list__select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All</option>
            {TICKET_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="ticket-list__field">
          <span className="ticket-list__label">Priority</span>
          <select
            className="ticket-list__select"
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
          >
            <option value="">All</option>
            {TICKET_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="ticket-list__error">{error}</p>}

      {loading ? (
        <p className="ticket-list__status">Loading tickets...</p>
      ) : tickets.length === 0 ? (
        <p className="ticket-list__status">No tickets found.</p>
      ) : (
        <div className="ticket-list__table-wrap">
          <table className="ticket-list__table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="ticket-list__row"
                  onClick={() => onSelectTicket?.(ticket.id)}
                >
                  <td className="ticket-list__title">{ticket.title}</td>
                  <td>
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td>{ticket.priority}</td>
                  <td>{ticket.assigneeName}</td>
                  <td>{formatDate(ticket.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
