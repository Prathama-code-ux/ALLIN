import React from 'react';
import { useAuth } from '../context/useAuth';
import Button from '../components/common/Button';
import Logo from '../components/common/Logo';
import { LogOut, ShieldCheck } from 'lucide-react';

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#080B0D] text-[#F3F6F6] p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-lg bg-[#111719] border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl text-center">
        <div className="inline-block mb-4">
          <Logo size="md" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00E5D4]/10 border border-[#00E5D4]/30 text-[#00E5D4] text-xs font-semibold mb-4">
          <ShieldCheck className="w-3.5 h-3.5" /> Authenticated Session
        </div>
        <h1 className="text-2xl font-bold mb-2">Welcome, {user?.name || 'Fintech User'}!</h1>
        <p className="text-sm text-[#8E9CA3] mb-6">
          Logged in as <span className="text-[#F3F6F6] font-mono">{user?.email}</span>
        </p>

        <div className="p-4 rounded-2xl bg-black/40 border border-white/5 mb-6 text-left space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-[#8E9CA3]">User ID:</span>
            <span className="font-mono text-[#00E5D4]">{user?.id || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8E9CA3]">Status:</span>
            <span className="text-emerald-400">Active</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8E9CA3]">JWT Interceptor:</span>
            <span className="text-[#00E5D4]">Armed & Ready</span>
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={logout}
          icon={LogOut}
          fullWidth
          className="border-white/10 hover:border-rose-500/40 hover:text-rose-400"
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}
