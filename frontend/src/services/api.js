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
  // Debug: show which endpoint is called and whether token was attached (dev only)
  if (import.meta.env.DEV) {
    console.debug('[API]', config.method?.toUpperCase(), config.url, 'Authorization:', !!config.headers.Authorization);
  }
  return config;
});

export default api;
