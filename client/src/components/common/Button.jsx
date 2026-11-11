import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  iconPosition = 'left',
  onClick,
  className = '',
  ...props
}) {
  const baseStyles =
    'relative inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 select-none cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 focus:outline-none focus:ring-2 focus:ring-[#a66bff]/50';

  const sizeStyles = {
    sm: 'text-xs px-3.5 py-2 gap-1.5',
    md: 'text-sm px-5 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5 font-semibold',
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-[#a66bff] to-[#8b43f6] text-white font-semibold hover:from-[#b580ff] hover:to-[#9d5eff] hover:shadow-[0_0_25px_rgba(166,107,255,0.45)] shadow-[0_0_16px_rgba(139,67,246,0.3)] border border-[#a66bff]/40',
    secondary:
      'bg-[#171426] text-[#F3F6F6] hover:bg-[#201c35] hover:border-[#a66bff]/40 border border-white/10 shadow-sm',
    outline:
      'bg-transparent text-[#a66bff] border border-[#a66bff]/40 hover:bg-[#a66bff]/10 hover:border-[#a66bff]/70 shadow-[0_0_12px_rgba(166,107,255,0.15)]',
    ghost:
      'bg-transparent text-[#94A3B8] hover:text-[#F3F6F6] hover:bg-white/5 border border-transparent',
    danger:
      'bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 hover:border-rose-500/50',
    accent:
      'bg-gradient-to-r from-[#a66bff] to-[#6125c8] text-white font-bold hover:shadow-[0_0_25px_rgba(166,107,255,0.5)] shadow-[0_0_15px_rgba(139,67,246,0.3)]',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${
        variantStyles[variant] || variantStyles.primary
      } ${widthStyle} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-4 h-4 flex-shrink-0" />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon className="w-4 h-4 flex-shrink-0" />}
        </>
      )}
    </button>
  );
}
