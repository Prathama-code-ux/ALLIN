import React from 'react';

export default function Badge({
  children,
  variant = 'cyan',
  size = 'md',
  icon: Icon = null,
  className = '',
}) {
  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  const variantStyles = {
    cyan: 'bg-[#00E5D4]/10 text-[#00E5D4] border border-[#00E5D4]/30',
    emerald: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    rose: 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
    slate: 'bg-white/5 text-[#94A3B8] border border-white/10',
  };

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full select-none
        ${sizeStyles[size] || sizeStyles.md}
        ${variantStyles[variant] || variantStyles.cyan}
        ${className}
      `}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{children}</span>
    </span>
  );
}

