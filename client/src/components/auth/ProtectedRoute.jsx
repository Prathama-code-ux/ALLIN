import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { Loader2 } from 'lucide-react';
import Logo from '../common/Logo';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#080B0D] flex flex-col items-center justify-center">
        <div className="mb-4">
          <Logo size="md" animated={true} />
        </div>
        <div className="flex items-center gap-2 text-xs text-[#00E5D4]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Verifying authentication...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/welcome" state={{ from: location }} replace />;
  }

  return children;
}
