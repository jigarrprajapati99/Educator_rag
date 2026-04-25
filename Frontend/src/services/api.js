import axios from 'axios';

// This points to your FastAPI server
const API_URL = 'http://localhost:8000';

export const chatWithAI = async (query) => {
    try {
        const response = await axios.post(`${API_URL}/chat/`, {
            query: query,
            top_k: 3
        });
        return response.data;
    } catch (error) {
        console.error("Error in chat:", error);
        throw error;
    }
};

export const uploadDocuments = async (files) => {
    const formData = new FormData();
    // Loop through the selected files and append them to the form data
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }

    try {
        const response = await axios.post(`${API_URL}/ingest/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error uploading documents:", error);
        throw error;
    }
};