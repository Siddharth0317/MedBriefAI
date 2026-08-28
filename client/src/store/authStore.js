import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      clearError: () => set({ error: null }),

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/api/auth/login', { email, password });
          const { token, user } = response.data;

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return { success: true, user };
        } catch (err) {
          const message =
            err.response?.data?.message ||
            err.response?.data?.errors?.[0]?.message ||
            'Login failed. Please check your credentials.';
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      register: async ({ name, email, password, role }) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/api/auth/register', {
            name,
            email,
            password,
            role,
          });
          const { token, user } = response.data;

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return { success: true, user };
        } catch (err) {
          const message =
            err.response?.data?.message ||
            err.response?.data?.errors?.[0]?.message ||
            'Registration failed. Please verify your details.';
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      fetchMe: async () => {
        const { token } = get();
        if (!token) {
          set({ user: null, isAuthenticated: false });
          return;
        }

        try {
          const response = await api.get('/api/auth/me');
          set({ user: response.data.user, isAuthenticated: true });
        } catch (err) {
          // If token is invalid or expired, reset auth state
          set({ user: null, token: null, isAuthenticated: false });
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('medbrief-auth');
        }
      },
    }),
    {
      name: 'medbrief-auth',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      })),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
