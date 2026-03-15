const getApiUrl = () => {
  if (typeof window === 'undefined') return process.env.FLEX_PUBLIC_API_URL || 'http://localhost:4001/api';

  // This hack lets me test stuff out on the same machine running the front+backend. It gets confused if I tell it its own local network address instead of just "localhost"
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:4001/api';
  }
  return process.env.FLEX_PUBLIC_API_URL || 'http://localhost:4001/api';
};

const API_URL = getApiUrl();

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
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
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
  workouts: {
    list: () => request('/workouts'),
    my: () => request('/workouts/my'),
    get: (id) => request(`/workouts/${id}`),
    create: (data) => request('/workouts', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => request(`/workouts/${id}`, { method: 'DELETE' }),
  },
  cheers: {
    create: (workoutId, message) => request('/cheers', { method: 'POST', body: JSON.stringify({ workout_id: workoutId, message }) }),
  },
  team: {
    get: () => request('/team'),
    create: (name) => request('/team/create', { method: 'POST', body: JSON.stringify({ name }) }),
    join: (inviteCode) => request('/team/join', { method: 'POST', body: JSON.stringify({ invite_code: inviteCode }) }),
    leave: (teamId) => request(`/team/${teamId}/leave`, { method: 'DELETE' }),
    disband: (teamId) => request(`/team/${teamId}`, { method: 'DELETE' }),
    feed: () => request('/team/feed'),
  },
  getToken,
  setToken,
  clearToken,
};
