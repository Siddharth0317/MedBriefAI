import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '../store/authStore';
import { ShieldAlert, Loader2 } from 'lucide-react';

/**
 * ProtectedRoute component to guard private routes
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {Array<string>} [props.allowedRoles] - Optional allowed roles: ['patient', 'doctor']
 */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const router = useRouter();
  const { user, isAuthenticated, fetchMe } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Check if hydration from localStorage has completed
    setIsHydrated(true);
    if (isAuthenticated && !user) {
      fetchMe();
    }
  }, [isAuthenticated, user, fetchMe]);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(router.asPath)}`);
    }
  }, [isHydrated, isAuthenticated, router]);

  // Loading state during hydration
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="p-8 rounded-2xl glass-panel flex flex-col items-center shadow-lg border border-slate-200">
          <Loader2 className="w-10 h-10 text-cyan-600 animate-spin mb-4" />
          <p className="text-slate-600 font-medium text-sm tracking-wide">
            Verifying clinical session credentials...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Role validation
  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full p-8 rounded-2xl glass-panel shadow-xl border border-red-200 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Access Restricted
          </h2>
          <p className="text-slate-600 text-sm mb-6">
            Your account role (<span className="font-semibold capitalize text-slate-800">{user.role}</span>) does not have permission to access this clinical workstation.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition"
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium transition"
            >
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
