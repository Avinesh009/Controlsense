const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const devPort = window.location.port === '5173';

const API_BASE_URL = isLocalDev && devPort
  ? 'http://127.0.0.1:8000/api'
  : `${window.location.origin}/api`;
const TOKEN_KEY = 'emt_admin_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return !!getToken();
}

export async function login(username, password) {
  const body = new URLSearchParams();
  body.set('username', username);
  body.set('password', password);

  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Login failed');
  }

  const data = await res.json();
  setToken(data.access_token);
  return data;
}

export function logout() {
  clearToken();
}

/**
 * Wrapper around fetch that attaches the admin bearer token and
 * triggers a logout + reload if the session has expired.
 */
export async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new Event('emt-session-expired'));
  }

  return res;
}
