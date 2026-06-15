const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

export const TOKEN_KEYS = {
  access: 'pwm_access_token',
  refresh: 'pwm_refresh_token',
  user: 'pwm_user',
};

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEYS.access);
}

export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem(TOKEN_KEYS.user) || 'null'); }
  catch { return null; }
}

export function saveAuth(tokens, user = null) {
  if (tokens?.access) localStorage.setItem(TOKEN_KEYS.access, tokens.access);
  if (tokens?.refresh) localStorage.setItem(TOKEN_KEYS.refresh, tokens.refresh);
  if (user) localStorage.setItem(TOKEN_KEYS.user, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEYS.access);
  localStorage.removeItem(TOKEN_KEYS.refresh);
  localStorage.removeItem(TOKEN_KEYS.user);
}

export function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export function buildQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') q.set(key, value);
  });
  const text = q.toString();
  return text ? `?${text}` : '';
}

function makeUrl(path, params) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}${buildQuery(params)}`;
}

async function parseResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => '');
  if (!res.ok) {
    const message = body?.detail || body?.message || body?.non_field_errors?.join?.(', ') || JSON.stringify(body) || `HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export async function apiRequest(path, { method = 'GET', body, params, headers = {}, isFormData = false } = {}) {
  const token = getAccessToken();
  const options = {
    method,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };
  if (body !== undefined) options.body = isFormData ? body : JSON.stringify(body);
  const res = await fetch(makeUrl(path, params), options);
  if (res.status === 401) {
    clearAuth();
    if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
  }
  return parseResponse(res);
}

export const api = {
  baseUrl: API_BASE_URL,
  auth: {
    async login(email, password) {
      const tokens = await apiRequest('/auth/login/', { method: 'POST', body: { email, password } });
      saveAuth(tokens);
      const user = await apiRequest('/auth/me/');
      saveAuth(tokens, user);
      return { tokens, user };
    },
    async register(data) {
      await apiRequest('/auth/register/', { method: 'POST', body: data });
      return this.login(data.email, data.password);
    },
    me: () => apiRequest('/auth/me/'),
    updateMe: (data) => apiRequest('/auth/me/', { method: 'PATCH', body: data }),
    changePassword: (data) => apiRequest('/auth/change-password/', { method: 'POST', body: data }),
    forgotPassword: (email) => apiRequest('/auth/forgot-password/', { method: 'POST', body: { email } }),
    resetPassword: (data) => apiRequest('/auth/reset-password/', { method: 'POST', body: data }),
    logout: clearAuth,
  },
  dashboard: () => apiRequest('/dashboard/'),
  options: () => apiRequest('/options/'),
  list: (path, params) => apiRequest(path, { params }),
  get: (path) => apiRequest(path),
  create: (path, body) => apiRequest(path, { method: 'POST', body }),
  update: (path, body) => apiRequest(path, { method: 'PATCH', body }),
  remove: (path) => apiRequest(path, { method: 'DELETE' }),
  upload: (path, formData) => apiRequest(path, { method: 'POST', body: formData, isFormData: true }),
};

export const endpoints = {
  tasks: '/tasks/',
  taskBulk: '/tasks/bulk-create/',
  meetings: '/meetings/',
  meetingBulk: '/meetings/bulk-create/',
  leave: '/leave/',
  salary: '/salary/',
  salaryCalculate: '/salary/calculate/',
  emails: '/emails/',
  jobs: '/management/jobs/',
  sources: '/management/sources/',
  freelancing: '/management/freelancing/',
  projects: '/management/projects/',
  employees: '/management/employees/',
  emailTypes: '/management/email-types/',
  emailTemplates: '/management/email-templates/',
  emailVariables: '/management/email-variables/',
  designations: '/management/designations/',
  salaryChanges: '/management/salary-changes/',
  attachments: '/management/attachments/',
};

export function getErrorMessage(err) {
  if (!err) return 'Something went wrong';
  if (typeof err.body === 'object' && err.body) {
    const first = Object.entries(err.body)[0];
    if (first) {
      const [key, value] = first;
      return `${key}: ${Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? JSON.stringify(value) : value}`;
    }
  }
  return err.message || 'Something went wrong';
}
