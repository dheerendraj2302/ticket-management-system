const API_BASE = '/api';

async function parseResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  return response.json();
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const body = await parseResponse(response);

  if (!response.ok) {
    const message = body?.error || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return body;
}

export function getUsers() {
  return request('/users');
}

export function getTickets({ search, status, priority } = {}) {
  const params = new URLSearchParams();

  if (search?.trim()) {
    params.set('search', search.trim());
  }

  if (status) {
    params.set('status', status);
  }

  if (priority) {
    params.set('priority', priority);
  }

  const query = params.toString();

  return request(`/tickets${query ? `?${query}` : ''}`);
}

export function createTicket(payload) {
  return request('/tickets', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getTicketById(id) {
  return request(`/tickets/${id}`);
}

export function updateTicket(id, payload) {
  return request(`/tickets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function addComment(ticketId, payload) {
  return request(`/tickets/${ticketId}/comments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateTicketStatus(ticketId, payload) {
  return request(`/tickets/${ticketId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
