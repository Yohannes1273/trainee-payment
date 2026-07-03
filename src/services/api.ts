import axios from 'axios';

// Create central API client
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Auto-Inject Saved JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('college_payment_token');
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Catch 401 Session Expirations
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('[API Client] Unauthorized request or expired session. Logging out.');
      localStorage.removeItem('college_payment_token');
      localStorage.removeItem('college_payment_user');
      localStorage.removeItem('college_payment_trainee');
      
      // Auto-refresh page to redirect to login if we are in client browser
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
