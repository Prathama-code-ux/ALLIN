import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../context/useAuth';
import Logo from '../common/Logo';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#080B0D] flex flex-col items-center justify-center p-4">
        <Logo size="lg" animated showTagline={false} />
        <div className="mt-6 flex items-center gap-2 text-xs text-[#00E5D4] font-medium tracking-wider uppercase">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00E5D4] animate-ping" />
          Authenticating secure session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/welcome" replace state={{ from: location }} />;
  }

  return children;
}

