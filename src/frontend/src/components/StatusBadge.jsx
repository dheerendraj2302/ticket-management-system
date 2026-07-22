const STATUS_CLASS_MAP = {
  Open: 'status-badge--open',
  'In Progress': 'status-badge--in-progress',
  Resolved: 'status-badge--resolved',
  Closed: 'status-badge--closed',
  Cancelled: 'status-badge--cancelled',
};

export default function StatusBadge({ status }) {
  const className = STATUS_CLASS_MAP[status] || 'status-badge--default';

  return <span className={`status-badge ${className}`}>{status}</span>;
}
