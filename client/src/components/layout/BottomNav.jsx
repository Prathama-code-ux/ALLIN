import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Activity, User } from 'lucide-react';

export default function BottomNav() {
  const navItems = [
    { label: 'Home', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Groups', path: '/groups', icon: Users },
    { label: 'Activity', path: '/activity', icon: Activity },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#111719]/90 backdrop-blur-xl border-t border-white/8 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      aria-label="Mobile Navigation"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200
                ${
                  isActive
                    ? 'text-[#00E5D4] drop-shadow-[0_0_10px_rgba(0,229,212,0.4)]'
                    : 'text-[#94A3B8] hover:text-[#F3F6F6]'
                }
              `}
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon className="w-5 h-5" />
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#00E5D4] shadow-[0_0_6px_#00E5D4]" />
                    )}
                  </div>
                  <span className="text-[10px] font-medium tracking-wide mt-1">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

