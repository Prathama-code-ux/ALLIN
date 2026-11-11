import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Shield, 
  Key, 
  Bell, 
  Check, 
  Copy, 
  ExternalLink,
  Layers,
  Sparkles,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';

export default function ProfileView({
  groups = [],
  activeGroup,
  contributions = [],
  transactions = [],
}) {
  const { user, logout } = useAuth();
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = () => {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const userInitials = (user?.name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#171426] via-[#151224] to-[#0d0b17] border border-white/5 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#a66bff]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#a66bff] via-[#8b43f6] to-[#6125c8] flex items-center justify-center text-xl font-bold text-white shadow-[0_0_25px_rgba(166,107,255,0.4)]">
            {userInitials}
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-widest text-[#a66bff] uppercase">
              ACCOUNT & PROFILE
            </span>
            <h1 className="text-2xl font-extrabold text-[#F3F6F6] mt-0.5 font-['Plus_Jakarta_Sans']">
              {user?.name || 'Fintech User'}
            </h1>
            <p className="text-xs text-[#94A3B8] font-mono mt-0.5">
              {user?.email || 'user@allin.io'}
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={logout}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Grid: Account Details & Security Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Information Panel */}
        <div className="p-6 rounded-3xl bg-[#171426] border border-white/5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/5">
            <User className="w-4 h-4 text-[#a66bff]" />
            <h2 className="text-sm font-bold text-[#F3F6F6]">Profile Details</h2>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[11px] text-[#7E8B99] block mb-1">Display Name</span>
              <div className="p-3 rounded-xl bg-[#090810]/70 border border-white/5 text-sm text-[#F3F6F6]">
                {user?.name || 'Fintech User'}
              </div>
            </div>

            <div>
              <span className="text-[11px] text-[#7E8B99] block mb-1">Email Address</span>
              <div className="p-3 rounded-xl bg-[#090810]/70 border border-white/5 text-sm text-[#F3F6F6] font-mono">
                {user?.email || 'user@allin.io'}
              </div>
            </div>

            <div>
              <span className="text-[11px] text-[#7E8B99] block mb-1">Account ID</span>
              <div className="p-3 rounded-xl bg-[#090810]/70 border border-white/5 text-xs text-[#c49cff] font-mono flex items-center justify-between">
                <span className="truncate pr-2">{user?.id || '—'}</span>
                {user?.id && (
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="text-[#7E8B99] hover:text-white transition-colors cursor-pointer"
                    title="Copy user ID"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Security & Authentication */}
        <div className="p-6 rounded-3xl bg-[#171426] border border-white/5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/5">
            <Shield className="w-4 h-4 text-[#a66bff]" />
            <h2 className="text-sm font-bold text-[#F3F6F6]">Security & Sessions</h2>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-[#090810]/70 border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#F3F6F6]">JWT Token Authentication</p>
                <p className="text-[10px] text-[#7E8B99]">Active secure session via Bearer headers</p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                ACTIVE
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#090810]/70 border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#F3F6F6]">PayPal Sandbox Integration</p>
                <p className="text-[10px] text-[#7E8B99]">REST v2 OAuth2 & Idempotent Capture</p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#a66bff]/15 border border-[#a66bff]/30 text-[#c49cff] text-[10px] font-bold">
                SANDBOX
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#090810]/70 border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#F3F6F6]">Active Workspace</p>
                <p className="text-[10px] text-[#7E8B99]">{activeGroup?.name || 'Default ALLIN Squad'}</p>
              </div>
              <span className="text-xs font-mono font-bold text-white">
                {groups.length} Crew{groups.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
