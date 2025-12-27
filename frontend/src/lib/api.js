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
        console.log('API Response:', error.response?.status, error.response?.data);
        if (error.response?.status === 401) {
            console.log('401 detected - logging out automatically');
            console.log('storeDispatch available:', !!storeDispatch);

            // Force logout regardless of storeDispatch
            if (typeof window !== 'undefined') {
                console.log('Clearing local storage');
                localStorage.clear();
                sessionStorage.clear();

                console.log('Redirecting to login page');
                // Use replace to avoid back button issues
                window.location.replace('/login');
                return; // Don't continue with error handling
            }

            // Fallback to dispatch if available
            if (storeDispatch) {
                console.log('Dispatching logout action');
                storeDispatch(logout());
            }
        }
        return Promise.reject(error);
    }
);

// Test function to manually trigger logout (for debugging)
export const testLogout = () => {
    console.log('Testing logout mechanism...');
    if (storeDispatch) {
        console.log('Dispatching logout');
        storeDispatch(logout());
        localStorage.clear();
        sessionStorage.clear();
        setTimeout(() => {
            window.location.href = '/login';
        }, 100);
    } else {
        console.log('storeDispatch not available, using direct redirect');
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
    }
};

// Test function to trigger API call that will fail with 401 (for testing auto-logout)
export const testTokenExpiration = async () => {
    console.log('Testing token expiration...');
    try {
        const response = await api.get('/user/profile');
        console.log('API call succeeded (token still valid):', response.data);
    } catch (error) {
        console.log('API call failed (expected if token expired):', error.response?.status);
        if (error.response?.status === 401) {
            console.log('✅ 401 detected - auto-logout should trigger');
        }
    }
};

// Force logout for testing
export const forceLogout = () => {
    console.log('Force logout initiated');
    localStorage.clear();
    sessionStorage.clear();
    if (storeDispatch) {
        storeDispatch(logout());
    }
    window.location.href = '/login';
};

export default api;
