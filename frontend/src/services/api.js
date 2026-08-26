import { authFetch } from './auth';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export async function fetchEmployees() {
  try {
    const res = await authFetch(`${API_BASE_URL}/employees`);
    if (!res.ok) throw new Error('Failed to fetch employees');
    return await res.json();
  } catch (err) {
    console.error('API Error:', err);
    return [];
  }
}

export async function fetchSummary() {
  try {
    const res = await authFetch(`${API_BASE_URL}/analytics/summary`);
    if (!res.ok) throw new Error('Failed to fetch summary stats');
    return await res.json();
  } catch (err) {
    console.error('API Error:', err);
    return null;
  }
}

export async function fetchEmployeeDetail(code, range = 'daily') {
  try {
    const res = await authFetch(`${API_BASE_URL}/employees/${encodeURIComponent(code)}?range=${range}`);
    if (!res.ok) throw new Error('Failed to fetch employee details');
    return await res.json();
  } catch (err) {
    console.error('API Error:', err);
    return null;
  }
}

export async function fetchAlerts() {
  try {
    const res = await authFetch(`${API_BASE_URL}/alerts`);
    if (!res.ok) throw new Error('Failed to fetch alerts');
    return await res.json();
  } catch (err) {
    console.error('API Error:', err);
    return [];
  }
}

export async function resolveAlert(alertId) {
  try {
    const res = await authFetch(`${API_BASE_URL}/alerts/${alertId}/resolve`, { method: 'POST' });
    return await res.json();
  } catch (err) {
    console.error('API Error:', err);
    return null;
  }
}

export async function fetchHistory() {
  try {
    const res = await authFetch(`${API_BASE_URL}/analytics/history`);
    if (!res.ok) throw new Error('Failed to fetch history analytics');
    return await res.json();
  } catch (err) {
    console.error('API Error:', err);
    return [];
  }
}
