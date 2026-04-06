import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000/api', // Or your Backend URL
});

// REQUEST INTERCEPTOR: Always fetch the latest Token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// RESPONSE INTERCEPTOR: Auto logout if Token expired or invalid
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // If Token is invalid, auto clean up to avoid getting stuck
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Only show error if not already on login page
            if (window.location.pathname !== '/login') {
                console.warn("Session issue detected, please log in again.");
                // window.location.href = '/login'; // Uncomment to force redirect to login
            }
        }
        return Promise.reject(error);
    }
);

export default api;