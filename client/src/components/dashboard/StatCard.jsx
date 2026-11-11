import React from 'react';

export default function StatCard({
  label,
  amount,
  description,
  icon,
  accent = false,
  badge,
}) {
  return (
    <div
      className={`p-5 rounded-2xl transition-all duration-200 border ${
        accent
          ? 'bg-gradient-to-br from-[#1a152e] via-[#141026] to-[#0e0c1b] border-[#a66bff]/35 shadow-[0_0_25px_rgba(166,107,255,0.15)]'
          : 'bg-[#100d1d]/85 backdrop-blur-md border-white/5 hover:border-white/10 shadow-lg'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold tracking-wider text-[#94A3B8] uppercase">
          {label}
        </span>
        {icon && (
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${
              accent
                ? 'bg-[#a66bff]/20 text-[#c49cff]'
                : 'bg-white/5 text-[#94A3B8]'
            }`}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="text-2xl sm:text-3xl font-extrabold text-[#F3F6F6] font-['Plus_Jakarta_Sans'] tracking-tight">
        {amount}
      </div>

      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/5 text-xs text-[#94A3B8]">
        {description && <span className="truncate">{description}</span>}
        {badge && (
          <span
            className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              badge === 'PAID' || badge === 'COMPLETED'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                : 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
            }`}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
