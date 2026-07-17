import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('crm_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and user details from localStorage
      localStorage.removeItem('crm_token');
      localStorage.removeItem('crm_user');
      
      // Redirect to login - this reloads the page and resets Redux state
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
