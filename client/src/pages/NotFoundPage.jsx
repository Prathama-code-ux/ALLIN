import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import Button from '../components/common/Button';
import Logo from '../components/common/Logo';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#080B0D] text-[#F3F6F6] flex flex-col items-center justify-center p-6 text-center">
      <Logo size="lg" className="mb-6" />
      <div className="w-16 h-16 rounded-3xl bg-[#00E5D4]/10 border border-[#00E5D4]/30 flex items-center justify-center text-[#00E5D4] mb-4 shadow-[0_0_30px_rgba(0,229,212,0.2)]">
        <Compass className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-[#F3F6F6]">404 - Screen Not Found</h1>
      <p className="text-sm text-[#94A3B8] max-w-sm mt-2 mb-6">
        The fintech page or ledger you requested does not exist or has been moved.
      </p>
      <Link to="/dashboard">
        <Button variant="primary" icon={ArrowLeft}>
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
}

