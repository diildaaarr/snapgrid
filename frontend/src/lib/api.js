import axios from 'axios';
import { logout } from '@/redux/authSlice';

// Create axios instance with default config
const api = axios.create({
    baseURL: 'https://snapgrid-r8kd.onrender.com/api/v1',
    withCredentials: true,
});

// Store reference to dispatch function
let storeDispatch = null;

// Function to set the store dispatch reference
export const setStoreDispatch = (dispatch) => {
    storeDispatch = dispatch;
};

// Response interceptor to handle 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid, logout user
            if (storeDispatch) {
                storeDispatch(logout());
                // Clear any persisted state
                localStorage.clear();
                sessionStorage.clear();
                // Redirect to login
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
