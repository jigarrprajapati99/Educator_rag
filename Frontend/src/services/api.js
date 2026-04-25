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

export const renameSession = async (sessionId, title) => {
    const response = await api.put(`/session/${sessionId}`, { title });
    return response.data;
};

export const getDocuments = async () => {
    const response = await api.get('/ingest/');
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

export const chatWithAI = async (query, sessionId = null) => {
    const response = await api.post('/chat/', { query: query, top_k: 3, session_id: sessionId });
    return response.data;
};

// Add these new Session routes
export const getSessions = async () => {
    const response = await api.get('/session/');
    return response.data;
};

export const getSessionDetails = async (sessionId) => {
    const response = await api.get(`/session/${sessionId}`);
    return response.data;
};

export const deleteSession = async (sessionId) => {
    const response = await api.delete(`/session/${sessionId}`);
    return response.data;
};

export const deleteDocument = async (id) => {
    const response = await api.delete(`/ingest/${id}`);
    return response.data;
};