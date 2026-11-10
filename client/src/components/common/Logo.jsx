import React from 'react';

export default function Logo({
  size = 'md',
  showTagline = false,
  animated = false,
  className = '',
}) {
  const sizeMap = {
    sm: {
      icon: 'w-6 h-6',
      text: 'text-lg',
      tagline: 'text-[9px]',
      gap: 'gap-2',
      glow: 'shadow-[0_0_12px_rgba(0,229,212,0.35)]',
    },
    md: {
      icon: 'w-9 h-9',
      text: 'text-2xl',
      tagline: 'text-[11px]',
      gap: 'gap-2.5',
      glow: 'shadow-[0_0_20px_rgba(0,229,212,0.4)]',
    },
    lg: {
      icon: 'w-12 h-12',
      text: 'text-3xl sm:text-4xl',
      tagline: 'text-xs',
      gap: 'gap-3',
      glow: 'shadow-[0_0_30px_rgba(0,229,212,0.5)]',
    },
    xl: {
      icon: 'w-18 h-18 sm:w-20 sm:h-20',
      text: 'text-4xl sm:text-5xl',
      tagline: 'text-sm',
      gap: 'gap-4',
      glow: 'shadow-[0_0_45px_rgba(0,229,212,0.6)]',
    },
  };

  const current = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <div className={`flex items-center ${current.gap}`}>
        {/* Hexagonal / Diamond Fintech Icon */}
        <div
          className={`relative ${current.icon} rounded-2xl bg-gradient-to-br from-[#00E5D4] via-[#087E78] to-[#043331] p-[2px] ${current.glow} ${
            animated ? 'animate-pulse-glow' : ''
          }`}
        >
          <div className="w-full h-full bg-[#080B0D] rounded-[14px] flex items-center justify-center relative overflow-hidden">
            {/* Ambient Cyan Sheen */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#00E5D4]/20 to-transparent pointer-events-none" />
            
            {/* Payment Convergence Symbol */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-3/5 h-3/5 text-[#00E5D4] drop-shadow-[0_0_6px_rgba(0,229,212,0.8)]"
            >
              <path
                d="M4 16L12 4L20 16"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M7 19L12 12L17 19"
                stroke="#F3F6F6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="1.5" fill="#00E5D4" />
            </svg>
          </div>
        </div>

        {/* Brand Text */}
        <div className="flex flex-col text-left">
          <div className={`font-black tracking-tight font-['Plus_Jakarta_Sans'] ${current.text} leading-none text-[#F3F6F6] flex items-baseline`}>
            ALL<span className="text-[#00E5D4] ml-0.5 drop-shadow-[0_0_12px_rgba(0,229,212,0.6)]">IN</span>
          </div>
        </div>
      </div>

      {showTagline && (
        <span className={`mt-1.5 font-medium tracking-wide uppercase text-[#94A3B8] ${current.tagline}`}>
          Payments, together.
        </span>
      )}
    </div>
  );
}

