import React from 'react';

export default function Card({
  children,
  variant = 'default',
  glow = false,
  className = '',
  onClick,
  ...props
}) {
  const isInteractive = Boolean(onClick) || variant === 'interactive';

  const variantStyles = {
    default: 'bg-[#111719]/90 border border-white/8 backdrop-blur-xl',
    cyan: 'bg-[#111719]/95 border border-[#00E5D4]/25 backdrop-blur-xl shadow-[0_0_25px_rgba(0,229,212,0.1)]',
    elevated: 'bg-[#161E21] border border-white/10 backdrop-blur-xl shadow-xl',
    interactive:
      'bg-[#111719]/90 border border-white/8 hover:border-[#00E5D4]/40 hover:bg-[#161E21] hover:shadow-[0_10px_30px_-10px_rgba(0,229,212,0.18)] hover:-translate-y-0.5 cursor-pointer transition-all duration-200',
  };

  return (
    <div
      onClick={onClick}
      className={`
        rounded-2xl p-5
        ${variantStyles[variant] || variantStyles.default}
        ${glow ? 'shadow-[0_0_30px_rgba(0,229,212,0.15)] border-[#00E5D4]/30' : ''}
        ${isInteractive && variant !== 'interactive' ? 'cursor-pointer hover:border-[#00E5D4]/40 transition-all duration-200' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

