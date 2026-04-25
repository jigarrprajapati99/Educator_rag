import axios from 'axios';

const API_URL = 'http://localhost:8000';

// Create an Axios instance
const api = axios.create({
    baseURL: API_URL,
});

// Automatically attach the JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// --- AUTHENTICATION ROUTES ---
export const loginUser = async (email, password) => {
    // FastAPI's OAuth2 expects form data with 'username' and 'password'
    const formData = new FormData();
    formData.append('username', email); 
    formData.append('password', password);

    const response = await api.post('/auth/login', formData);
    return response.data;
};

export const signupUser = async (name, email, password) => {
    const response = await api.post('/auth/signup', { name, email, password });
    return response.data;
};

// --- RAG ROUTES ---
export const chatWithAI = async (query) => {
    const response = await api.post('/chat/', { query: query, top_k: 3 });
    return response.data;
};

export const uploadDocuments = async (files) => {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }
    const response = await api.post('/ingest/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};