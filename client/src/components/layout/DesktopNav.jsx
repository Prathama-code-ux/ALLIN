import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Activity, User, LogOut } from 'lucide-react';
import useAuth from '../../context/useAuth';
import Logo from '../common/Logo';

export default function DesktopNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/welcome');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Groups', path: '/groups', icon: Users },
    { label: 'Activity', path: '/activity', icon: Activity },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <header className="hidden md:block sticky top-0 z-40 bg-[#080B0D]/85 backdrop-blur-xl border-b border-white/8 select-none">
      <div className="max-w-6xl mx-auto px-6 h-18 flex items-center justify-between">
        {/* Brand */}
        <Link to="/dashboard" className="flex items-center gap-2">
          <Logo size="sm" />
        </Link>

        {/* Center Nav Links */}
        <nav className="flex items-center gap-1 bg-[#111719]/80 p-1.5 rounded-2xl border border-white/5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200
                  ${
                    isActive
                      ? 'bg-[#00E5D4]/15 text-[#00E5D4] shadow-[0_0_15px_rgba(0,229,212,0.2)] border border-[#00E5D4]/30'
                      : 'text-[#94A3B8] hover:text-[#F3F6F6] hover:bg-white/5'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Pill & Logout */}
        <div className="flex items-center gap-3">
          <Link
            to="/profile"
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-[#111719] border border-white/10 hover:border-[#00E5D4]/40 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#00E5D4] to-[#087E78] flex items-center justify-center text-[#080B0D] font-bold text-xs shadow-[0_0_10px_rgba(0,229,212,0.3)]">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="text-left hidden lg:block">
              <div className="text-xs font-semibold text-[#F3F6F6] truncate max-w-[120px]">
                {user?.name || 'User'}
              </div>
              <div className="text-[10px] text-[#64748B] font-mono truncate max-w-[120px]">
                {user?.email}
              </div>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 rounded-xl text-[#94A3B8] hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

