import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('modapella_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn('Unable to read auth token', error);
  }
  if (import.meta.env.DEV) {
    console.debug('[API]', config.method?.toUpperCase(), config.url, 'Authorization:', !!config.headers.Authorization);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Session expired or unauthorized (401)');
      const path = window.location.pathname;
      if (path.startsWith('/admin') || path.startsWith('/cashier') || path.startsWith('/employee')) {
        localStorage.removeItem('modapella_token');
        localStorage.removeItem('modapella_user');
        localStorage.removeItem('modapella_role');
        if (!path.includes('/login')) {
          window.location.href = '/login?expired=1';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
