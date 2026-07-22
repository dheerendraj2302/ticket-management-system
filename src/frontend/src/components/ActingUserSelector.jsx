import { useActingUser } from '../context/ActingUserContext.jsx';

function formatUserLabel(user) {
  return `${user.name} (${user.role})`;
}

export default function ActingUserSelector() {
  const { users, actingUser, setActingUser, loading, error } = useActingUser();

  if (loading) {
    return <span className="acting-user-status">Loading users...</span>;
  }

  if (error) {
    return <span className="acting-user-status acting-user-status--error">{error}</span>;
  }

  if (users.length === 0) {
    return <span className="acting-user-status">No users available</span>;
  }

  return (
    <label className="acting-user-selector">
      <span className="acting-user-selector__label">Acting as</span>
      <select
        className="acting-user-selector__select"
        value={actingUser?.id ?? ''}
        onChange={(event) => {
          const selectedUser = users.find(
            (user) => user.id === Number(event.target.value)
          );
          if (selectedUser) {
            setActingUser(selectedUser);
          }
        }}
      >
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {formatUserLabel(user)}
          </option>
        ))}
      </select>
    </label>
  );
}
