import axios from 'axios';

const rawBaseUrl = import.meta.env.VITE_API_URL || 'https://nova-baas.onrender.com';
const normalizedBase = rawBaseUrl.replace(/\/+$/, '');
const apiBaseUrl = normalizedBase.endsWith('/api')
  ? normalizedBase
  : `${normalizedBase}/api`;

const DEFAULT_API_KEY =
  import.meta.env.VITE_NOVA_API_KEY ||
  'nova_477771ef75f38992c40be966140320f53b6d6a1bc6962331';

const API = axios.create({
  baseURL: apiBaseUrl,
});

// Interceptor to attach API Key and Bearer Token to every outgoing request
API.interceptors.request.use((config) => {
  const apiKey =
    (typeof window !== 'undefined' && window.localStorage.getItem('nova_api_key')?.trim()) ||
    DEFAULT_API_KEY;
  if (apiKey) {
    config.headers['x-api-key'] = apiKey;
  }

  const token =
    (typeof window !== 'undefined' &&
      (window.localStorage.getItem('nova_token') || window.localStorage.getItem('token'))) ||
    null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth Endpoints
export const loginUser = (credentials) => API.post('/auth/login', credentials);
export const registerUser = (userData) => API.post('/auth/register', userData);

// Dynamic Record CRUD Endpoints
export const fetchRecords = (entity) => API.get(`/records/${entity}`);
export const fetchSingleRecord = (entity, id) => API.get(`/records/${entity}/${id}`);
export const createRecord = (entity, data) => API.post(`/records/${entity}`, data);
export const updateRecord = (entity, id, data) => API.put(`/records/${entity}/${id}`, data);
export const deleteRecord = (entity, id) => API.delete(`/records/${entity}/${id}`);

export default API;