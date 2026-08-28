import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuthStore } from '../store/authStore';
import { Activity, Lock, Mail, User, Stethoscope, UserCheck, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export default function Register() {
  const router = useRouter();
  const { register: registerUser, isAuthenticated, isLoading, error, clearError } = useAuthStore();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'patient', // 'patient' | 'doctor'
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Full name is required';
    }
    if (!formData.email) {
      errors.email = 'Email address is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
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

  const handleRoleSelect = (role) => {
    setFormData((prev) => ({ ...prev, role }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const res = await registerUser({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
    });

    if (res.success) {
      router.push('/dashboard');
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
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Already registered?{' '}
          <Link href="/login" className="font-medium text-cyan-600 hover:text-cyan-500">
            Sign in here
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <div className="bg-white/85 backdrop-blur-md py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200/80">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 animate-fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
              <div className="text-sm font-medium">{error}</div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Role Selection Tabs */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                I am registering as:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleRoleSelect('patient')}
                  className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 text-center transition ${
                    formData.role === 'patient'
                      ? 'border-cyan-600 bg-cyan-50/80 text-cyan-900 ring-2 ring-cyan-500/20'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <UserCheck className={`w-5 h-5 ${formData.role === 'patient' ? 'text-cyan-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="font-semibold text-sm">Patient</div>
                    <div className="text-[11px] text-slate-500">Submit symptom intakes</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleSelect('doctor')}
                  className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 text-center transition ${
                    formData.role === 'doctor'
                      ? 'border-cyan-600 bg-cyan-50/80 text-cyan-900 ring-2 ring-cyan-500/20'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Stethoscope className={`w-5 h-5 ${formData.role === 'doctor' ? 'text-cyan-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="font-semibold text-sm">Doctor / Clinician</div>
                    <div className="text-[11px] text-slate-500">Review & SOAP triage</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Full Name
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={formData.role === 'doctor' ? 'Dr. Sarah Connor, MD' : 'Jane Doe'}
                  className={`block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:bg-white transition ${
                    formErrors.name
                      ? 'border-red-300 focus:ring-red-400'
                      : 'border-slate-300 focus:ring-cyan-500 focus:border-cyan-500'
                  }`}
                />
              </div>
              {formErrors.name && (
                <p className="mt-1.5 text-xs text-red-600 font-medium">{formErrors.name}</p>
              )}
            </div>

            {/* Email Input */}
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
                  placeholder="name@hospital.org"
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

            {/* Password Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    placeholder="Min. 6 chars"
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat password"
                    className={`block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:bg-white transition ${
                      formErrors.confirmPassword
                        ? 'border-red-300 focus:ring-red-400'
                        : 'border-slate-300 focus:ring-cyan-500 focus:border-cyan-500'
                    }`}
                  />
                </div>
                {formErrors.confirmPassword && (
                  <p className="mt-1.5 text-xs text-red-600 font-medium">{formErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-md text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-cyan-600/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create {formData.role === 'doctor' ? 'Doctor' : 'Patient'} Profile</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
