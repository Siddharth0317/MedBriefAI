import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuthStore } from '../store/authStore';
import { Activity, Lock, Mail, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    if (isAuthenticated) {
      const redirect = router.query.redirect || '/dashboard';
      router.push(redirect);
    }
  }, [isAuthenticated, router]);

  const validate = () => {
    const errors = {};
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      errors.password = 'Password is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (formErrors[e.target.name]) {
      setFormErrors({
        ...formErrors,
        [e.target.name]: null,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const res = await login(formData.email, formData.password);
    if (res.success) {
      const redirect = router.query.redirect || '/dashboard';
      router.push(redirect);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-cyan-50/20 to-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex items-center justify-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25">
            <Activity className="w-7 h-7" />
          </div>
          <span className="font-bold text-2xl tracking-tight text-slate-900">
            MedBrief<span className="text-cyan-600 font-extrabold">.AI</span>
          </span>
        </Link>
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-slate-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Or{' '}
          <Link href="/register" className="font-medium text-cyan-600 hover:text-cyan-500">
            create a new patient or doctor profile
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white/85 backdrop-blur-md py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200/80">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 animate-fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
              <div className="text-sm font-medium">{error}</div>
            </div>
          )}

          {router.query.expired && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-800 animate-fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
              <div className="text-sm font-medium">Your session expired. Please sign in again.</div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="doctor@hospital.org or patient@mail.com"
                  className={`block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:bg-white transition ${
                    formErrors.email
                      ? 'border-red-300 focus:ring-red-400'
                      : 'border-slate-300 focus:ring-cyan-500 focus:border-cyan-500'
                  }`}
                />
              </div>
              {formErrors.email && (
                <p className="mt-1.5 text-xs text-red-600 font-medium">{formErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:bg-white transition ${
                    formErrors.password
                      ? 'border-red-300 focus:ring-red-400'
                      : 'border-slate-300 focus:ring-cyan-500 focus:border-cyan-500'
                  }`}
                />
              </div>
              {formErrors.password && (
                <p className="mt-1.5 text-xs text-red-600 font-medium">{formErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-md text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-cyan-600/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-500">
              Role-based redirection will automatically load your Patient or Doctor workstation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
