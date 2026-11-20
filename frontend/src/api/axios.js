import axios from 'axios';

const rawBaseUrl = import.meta.env.VITE_API_URL || 'https://nova-baas.onrender.com';
const normalizedBase = rawBaseUrl.replace(/\/+$/, '');
const apiBaseUrl = normalizedBase.endsWith('/api')
  ? normalizedBase
  : `${normalizedBase}/api`;

const API = axios.create({
  baseURL: apiBaseUrl,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;