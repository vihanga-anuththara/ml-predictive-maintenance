import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
    baseURL: API_URL,
});

// Request Interceptor: access Token 
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response Interceptor: refresh the Token, if it expired
api.interceptors.response.use(
    (response) => response, // Send it, if success
    async (error) => {
        const originalRequest = error.config;

        if (
            error.response &&
            error.response.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url.includes('/login')
        ) {
            originalRequest._retry = true;

            try {
                // Send Refresh Token and request new Access Token
                const refreshToken = localStorage.getItem('refreshToken');
                const res = await axios.post(`${API_URL}/token/refresh/`, {
                    refresh: refreshToken,
                });

                // Save new Token
                localStorage.setItem('accessToken', res.data.access);

                // Send failed request with a new Token
                originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
                return api(originalRequest);

            } catch (refreshError) {
                // If Refresh Token expired, log out the session
                console.error("Session Expired. Please log in again.");
                localStorage.clear();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;