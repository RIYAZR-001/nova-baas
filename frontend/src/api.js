import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Interceptor to attach Bearer Token to every outgoing request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('nova_token');
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