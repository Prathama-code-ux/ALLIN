import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  icon: Icon = null,
  iconPosition = 'left',
  onClick,
  type = 'button',
  className = '',
  ...props
}) {
  const baseStyles =
    'relative inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none rounded-xl active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-[#00E5D4]/60';

  const sizeStyles = {
    sm: 'text-xs px-3.5 py-2 gap-1.5 h-9',
    md: 'text-sm px-4.5 py-2.5 gap-2 h-11',
    lg: 'text-base px-6 py-3.5 gap-2.5 h-13 rounded-2xl',
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-[#00E5D4] via-[#00E5D4] to-[#087E78] text-[#080B0D] font-semibold hover:brightness-110 shadow-[0_0_20px_rgba(0,229,212,0.3)] hover:shadow-[0_0_28px_rgba(0,229,212,0.5)] active:shadow-[0_0_15px_rgba(0,229,212,0.4)] border border-[#00E5D4]/40',
    secondary:
      'bg-[#111719] text-[#F3F6F6] hover:bg-[#161E21] border border-white/10 hover:border-[#00E5D4]/40 shadow-sm',
    outline:
      'bg-transparent text-[#00E5D4] border border-[#00E5D4]/40 hover:bg-[#00E5D4]/10 hover:border-[#00E5D4]',
    ghost:
      'bg-transparent text-[#94A3B8] hover:text-[#F3F6F6] hover:bg-white/5',
    danger:
      'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 hover:border-rose-500/50',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        ${baseStyles}
        ${sizeStyles[size] || sizeStyles.md}
        ${variantStyles[variant] || variantStyles.primary}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && (
            <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:-translate-x-0.5" />
          )}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && (
            <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
          )}
        </>
      )}
    </button>
  );
}

