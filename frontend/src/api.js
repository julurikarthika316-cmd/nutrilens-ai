const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function getToken() { return localStorage.getItem('nutrilens_token'); }

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const message = body?.detail || body?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body;
}

export const api = {
  register: (data) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/api/me'),
  saveProfile: (data) => request('/api/me/profile', { method: 'PUT', body: JSON.stringify(data) }),
  scan: (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/api/scans', { method: 'POST', body: form });
  },
  scans: () => request('/api/scans'),
  dailySummary: () => request('/api/daily-summary'),
};
