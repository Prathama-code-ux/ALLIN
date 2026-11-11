import React, { useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { 
  ShieldCheck, 
  Plus, 
  RefreshCw, 
  Menu, 
  User, 
  LogOut, 
  CheckCircle2, 
  ChevronDown,
  Layers,
  Receipt
} from 'lucide-react';

export default function Header({
  activePage,
  setActivePage,
  setMobileOpen,
  activeGroup,
  groups = [],
  onOpenGroupModal,
  onRefresh,
  refreshing,
}) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const getPageTitle = (page) => {
    switch (page) {
      case 'Overview':
        return 'Fintech Command Center';
      case 'My Groups':
        return 'Crew & Group Management';
      case 'Expenses':
        return 'Expense Tracker & Splits';
      case 'Payments':
        return 'Payment Management';
      case 'Transactions':
        return 'Transaction History';
      case 'Profile':
        return 'Account & Security Settings';
      default:
        return page;
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 w-full bg-[#0c0a14]/85 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 flex items-center justify-between transition-colors">
      {/* Left Section: Mobile toggle + Page Context */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-[#94A3B8] hover:text-white hover:bg-white/5 border border-white/5 cursor-pointer"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold text-[#F3F6F6] truncate">
              {getPageTitle(activePage)}
            </h1>
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#a66bff]/10 border border-[#a66bff]/20 text-[#c49cff]">
              <ShieldCheck className="w-3 h-3 text-[#10B981]" /> Sandbox
            </span>
          </div>
          <span className="text-[11px] text-[#7E8B99] hidden sm:block truncate">
            {activeGroup?.name ? `Active Workspace: ${activeGroup.name}` : 'Collaborative Group Payments'}
          </span>
        </div>
      </div>

      {/* Right Section: Actions + User Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Refresh Live Data */}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#94A3B8] hover:text-[#c49cff] hover:bg-white/5 border border-white/5 cursor-pointer transition-colors disabled:opacity-50"
            title="Refresh live data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#a66bff]' : ''}`} />
          </button>
        )}

        {/* Crew / Group Modal Switcher */}
        {onOpenGroupModal && (
          <button
            type="button"
            onClick={onOpenGroupModal}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#171426] hover:bg-[#1f1a34] border border-[#a66bff]/30 hover:border-[#a66bff]/60 text-xs font-semibold text-[#c49cff] transition-all cursor-pointer shadow-sm shadow-[#a66bff]/10"
          >
            <Plus className="w-3.5 h-3.5 text-[#a66bff]" />
            <span>Crew ({groups.length})</span>
          </button>
        )}

        {/* User Profile Pill & Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-[#171426]/90 hover:bg-[#1b172e] border border-white/10 hover:border-[#a66bff]/40 transition-all cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#a66bff] to-[#6125c8] flex items-center justify-center text-xs font-bold text-white shadow-[0_0_10px_rgba(166,107,255,0.4)]">
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-[#F3F6F6] leading-tight group-hover:text-[#c49cff] transition-colors">
                {user?.name || 'Account'}
              </span>
              <span className="text-[10px] text-[#7E8B99] leading-tight font-mono">
                {user?.email?.split('@')[0] || 'member'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#7E8B99] group-hover:text-white transition-transform" />
          </button>

          {/* User Account Dropdown Menu */}
          {dropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setDropdownOpen(false)} 
              />
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#171426] border border-white/10 shadow-2xl p-2 z-50 backdrop-blur-2xl">
                <div className="px-3 py-2 border-b border-white/5 mb-1">
                  <p className="text-xs font-semibold text-[#F3F6F6]">{user?.name || 'Fintech User'}</p>
                  <p className="text-[10px] text-[#7E8B99] truncate font-mono">{user?.email}</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActivePage('Profile');
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#94A3B8] hover:text-[#c49cff] hover:bg-white/5 transition-colors cursor-pointer text-left"
                >
                  <User className="w-4 h-4 text-[#a66bff]" />
                  <span>Profile & Security</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActivePage('My Groups');
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#94A3B8] hover:text-[#c49cff] hover:bg-white/5 transition-colors cursor-pointer text-left"
                >
                  <Layers className="w-4 h-4 text-[#a66bff]" />
                  <span>Manage Groups</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActivePage('Expenses');
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#94A3B8] hover:text-[#c49cff] hover:bg-white/5 transition-colors cursor-pointer text-left"
                >
                  <Receipt className="w-4 h-4 text-[#a66bff]" />
                  <span>Expense Records</span>
                </button>

                <div className="h-px bg-white/5 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
