const API_URL = process.env.FLEX_PUBLIC_API_URL || 'http://localhost:3001/api';

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
  goals: {
    list: () => request('/goals'),
    create: (data) => request('/goals', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id) => request(`/goals/${id}`, { method: 'DELETE' }),
  },
  cheers: {
    create: (workoutId, message) => request('/cheers', { method: 'POST', body: JSON.stringify({ workout_id: workoutId, message }) }),
  },
  wins: {
    list: () => request('/wins'),
    my: () => request('/wins/my'),
    create: (data) => request('/wins', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => request(`/wins/${id}`, { method: 'DELETE' }),
  },
  team: {
    get: () => request('/team'),
    create: (name) => request('/team/create', { method: 'POST', body: JSON.stringify({ name }) }),
    join: (inviteCode) => request('/team/join', { method: 'POST', body: JSON.stringify({ invite_code: inviteCode }) }),
    feed: () => request('/team/feed'),
  },
  getToken,
  setToken,
  clearToken,
};
