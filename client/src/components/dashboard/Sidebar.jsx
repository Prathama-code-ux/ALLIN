import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  CreditCard, 
  History, 
  UserCircle, 
  LogOut, 
  PlusCircle,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';

export const NAV_ITEMS = [
  { id: 'Overview', label: 'Overview', icon: LayoutDashboard, badge: null },
  { id: 'My Groups', label: 'My Groups', icon: Users, badge: null },
  { id: 'Expenses', label: 'Expenses', icon: Receipt, badge: null },
  { id: 'Payments', label: 'Payments', icon: CreditCard, badge: 'Live' },
  { id: 'Transactions', label: 'Transactions', icon: History, badge: null },
  { id: 'Profile', label: 'Profile / Settings', icon: UserCircle, badge: null },
];

export default function Sidebar({
  activePage,
  setActivePage,
  mobileOpen,
  setMobileOpen,
  activeGroup,
  groups = [],
  onOpenGroupModal,
}) {
  const { user, logout } = useAuth();

  const userInitials = (user?.name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="sidebar-overlay fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Shell */}
      <aside
        className={`sidebar fixed lg:sticky top-0 left-0 h-screen w-64 min-w-[16rem] bg-[#0c0a14]/95 backdrop-blur-xl border-r border-white/5 flex flex-col p-5 z-50 transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#a66bff] via-[#8b43f6] to-[#5b21b6] flex items-center justify-center text-white font-extrabold text-xl shadow-[0_0_20px_rgba(166,107,255,0.45)]">
              A
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-wider text-white font-['Plus_Jakarta_Sans'] leading-tight">
                ALLIN
              </span>
              <span className="text-[10px] font-semibold tracking-widest text-[#a66bff] uppercase">
                Fintech Cloud
              </span>
            </div>
          </div>
          <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#a66bff]/10 text-[#c49cff] border border-[#a66bff]/20">
            v2.4
          </span>
        </div>

        {/* Active Group / Crew Pill */}
        <div className="my-5 p-3 rounded-2xl bg-[#171426]/90 border border-white/5 hover:border-[#a66bff]/30 transition-all shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold tracking-wider text-[#7E8B99] uppercase">
              Active Crew
            </span>
            {onOpenGroupModal && (
              <button
                type="button"
                onClick={onOpenGroupModal}
                className="text-[11px] font-medium text-[#a66bff] hover:text-[#c49cff] flex items-center gap-1 transition-colors cursor-pointer"
                title="Switch or create group"
              >
                <PlusCircle className="w-3 h-3" />
                <span>Switch</span>
              </button>
            )}
          </div>

          <div 
            onClick={onOpenGroupModal}
            className="flex items-center justify-between p-2 rounded-xl bg-[#090810]/70 border border-white/5 hover:border-[#a66bff]/40 cursor-pointer transition-all group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#8b43f6]/40 to-[#6125c8]/30 border border-[#a66bff]/30 flex items-center justify-center text-xs font-bold text-[#c49cff]">
                  {(activeGroup?.name || 'A').charAt(0).toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#090810]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#F3F6F6] truncate group-hover:text-[#c49cff] transition-colors">
                  {activeGroup?.name || 'Select a Crew'}
                </p>
                <p className="text-[10px] text-[#7E8B99] font-mono">
                  {activeGroup?.inviteCode ? `Code: ${activeGroup.inviteCode}` : `${groups.length} squads available`}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#7E8B99] group-hover:text-[#a66bff] group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pr-1">
          <div className="text-[10px] font-bold tracking-wider text-[#7E8B99] uppercase px-3 mb-2">
            Navigation
          </div>

          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActivePage(item.id);
                    setMobileOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#a66bff]/15 to-[#8b43f6]/5 text-[#c49cff] border border-[#a66bff]/30 shadow-[0_0_15px_rgba(166,107,255,0.15)] font-semibold'
                      : 'text-[#94A3B8] hover:text-[#F3F6F6] hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-[#a66bff]' : 'text-[#7E8B99] group-hover:text-[#c49cff]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/25">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Account / Footer */}
        <div className="pt-4 mt-auto border-t border-white/5">
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#171426]/70 border border-white/5">
            <div 
              onClick={() => {
                setActivePage('Profile');
                setMobileOpen(false);
              }}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
              title="View Account Settings"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#a66bff]/30 to-[#6125c8]/30 border border-[#a66bff]/40 flex items-center justify-center text-xs font-bold text-[#c49cff] group-hover:border-[#a66bff] transition-colors">
                {userInitials}
              </div>
              <div className="min-w-0 text-left">
                <p className="text-xs font-semibold text-[#F3F6F6] truncate group-hover:text-[#c49cff] transition-colors">
                  {user?.name || 'Fintech User'}
                </p>
                <p className="text-[10px] text-[#7E8B99] truncate font-mono" title={user?.email}>
                  {user?.email || 'user@allin.io'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7E8B99] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
