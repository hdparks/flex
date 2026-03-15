const API_URL = '/api';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function clearToken() {
  localStorage.removeItem('token');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearToken();
  }

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const api = {
  auth: {
    register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
    login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    me: () => request('/auth/me'),
  },
  admin: {
    createDummyUser: (userData) => request('/admin/dummy-user', { method: 'POST', body: JSON.stringify(userData) }),
    impersonate: (userId) => request(`/admin/impersonate/${userId}`, { method: 'POST' }),
  },
  workouts: {
    list: () => request('/workouts'),
    my: () => request('/workouts?my=true'),
    get: (id) => request(`/workouts/${id}`),
    create: (data) => request('/workouts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/workouts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/workouts/${id}`, { method: 'DELETE' }),
  },
  cheers: {
    create: (workoutId, message) => request('/cheers', { method: 'POST', body: JSON.stringify({ workout_id: workoutId, message }) }),
  },
  team: {
    get: () => request('/team'),
    create: (name) => request('/team', { method: 'POST', body: JSON.stringify({ name }) }),
    join: (inviteCode) => request('/team', { method: 'POST', body: JSON.stringify({ invite_code: inviteCode }) }),
    getByInviteCode: (inviteCode) => request(`/team?invite_code=${inviteCode}`),
    leave: (teamId) => request(`/team/${teamId}?action=leave`, { method: 'DELETE' }),
    disband: (teamId) => request(`/team/${teamId}`, { method: 'DELETE' }),
    feed: () => request('/team?feed=true'),
  },
  push: {
    getPublicKey: () => request('/push'),
    subscribe: (subscription) => request('/push', { method: 'POST', body: JSON.stringify({ subscription }) }),
    unsubscribe: (endpoint) => request('/push', { method: 'POST', body: JSON.stringify({ endpoint }) }),
  },
  getToken,
  setToken,
  clearToken,
};
