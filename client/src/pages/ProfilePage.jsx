import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  ShieldCheck,
  Key,
  LogOut,
  CreditCard,
  Lock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import useAuth from '../context/useAuth';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';

export default function ProfilePage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleConfirmLogout = () => {
    logout();
    navigate('/welcome');
  };

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F3F6F6] tracking-tight">
          Account & Security
        </h1>
        <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
          Manage your ALLIN profile, credentials, and authentication session
        </p>
      </div>

      {/* User Identity Card */}
      <Card className="p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 border-white/10 shadow-xl relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute -top-10 -right-10 w-44 h-44 bg-[#00E5D4]/10 rounded-full blur-[60px] pointer-events-none" />

        {/* Avatar */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#00E5D4] via-[#087E78] to-[#043331] p-[2px] shadow-[0_0_30px_rgba(0,229,212,0.4)] shrink-0">
          <div className="w-full h-full bg-[#080B0D] rounded-[22px] flex items-center justify-center text-2xl font-black text-[#00E5D4]">
            {initial}
          </div>
        </div>

        {/* User Details */}
        <div className="flex-1 text-center sm:text-left min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
            <h2 className="text-xl sm:text-2xl font-bold text-[#F3F6F6]">{user?.name}</h2>
            <Badge variant="cyan" size="sm">
              Verified Member
            </Badge>
          </div>
          <p className="text-xs text-[#94A3B8] font-mono">{user?.email}</p>

          <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-[#64748B]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> End-to-End JWT Auth
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-[#00E5D4]" /> PayPal Ready
            </span>
          </div>
        </div>
      </Card>

      {/* Account Details & Session Card */}
      <Card className="p-6 space-y-4">
        <h3 className="text-xs font-semibold tracking-wider text-[#94A3B8] uppercase">
          Session & Security Info
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#080B0D] border border-white/5">
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-[#64748B]" />
              <span className="text-[#94A3B8]">User ID:</span>
            </div>
            <span className="font-mono text-[#F3F6F6] truncate max-w-[200px]">
              {user?.id || '—'}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[#080B0D] border border-white/5">
            <div className="flex items-center gap-2.5">
              <Key className="w-4 h-4 text-[#64748B]" />
              <span className="text-[#94A3B8]">JWT Bearer Token:</span>
            </div>
            <span className="font-mono text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {token ? 'Authenticated & Armed' : 'Missing'}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[#080B0D] border border-white/5">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-[#64748B]" />
              <span className="text-[#94A3B8]">Encryption:</span>
            </div>
            <span className="text-[#00E5D4] font-medium">Bcrypt 12 Rounds + JWT HMAC</span>
          </div>
        </div>
      </Card>

      {/* Sign Out Card */}
      <Card className="p-6 border-rose-500/20 bg-rose-500/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-rose-300">Sign Out of ALLIN</h3>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Clears your authentication session tokens and cached profile from this device.
          </p>
        </div>

        <Button
          variant="danger"
          size="md"
          icon={LogOut}
          onClick={() => setShowLogoutModal(true)}
          className="shrink-0"
        >
          Sign Out
        </Button>
      </Card>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Confirm Sign Out"
      >
        <div className="space-y-4 text-left">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Are you sure you want to sign out? You will need to log back in with your credentials to manage your groups and splits.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowLogoutModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" icon={LogOut} onClick={handleConfirmLogout}>
              Confirm Sign Out
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
