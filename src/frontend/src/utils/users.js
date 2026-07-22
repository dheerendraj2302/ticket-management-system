export function getUserName(users, userId) {
  return users.find((user) => user.id === userId)?.name ?? 'Unknown';
}

export function formatUserLabel(user) {
  return `${user.name} (${user.role})`;
}
