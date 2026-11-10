import React from 'react';

export default function Logo({ size = 'md', animated = false, showTagline = false }) {
  const sizes = {
    sm: { box: 'w-8 h-8', text: 'text-lg', dot: 'w-1.5 h-1.5', padding: 'p-1.5' },
    md: { box: 'w-10 h-10', text: 'text-2xl', dot: 'w-2 h-2', padding: 'p-2' },
    lg: { box: 'w-16 h-16', text: 'text-4xl', dot: 'w-3 h-3', padding: 'p-3' },
    xl: { box: 'w-24 h-24', text: 'text-5xl', dot: 'w-4 h-4', padding: 'p-5' },
  };

  const currentSize = sizes[size] || sizes.md;

  return (
    <div className="flex flex-col items-center select-none">
      <div className="flex items-center gap-3">
        {/* Glowing Geometric Logo Mark */}
        <div
          className={`relative ${currentSize.box} rounded-2xl bg-gradient-to-br from-[#161E21] via-[#111719] to-[#080B0D] border border-[#00E5D4]/40 flex items-center justify-center ${
            animated ? 'animate-pulse-glow shadow-[0_0_35px_rgba(0,229,212,0.4)]' : 'shadow-[0_0_20px_rgba(0,229,212,0.25)]'
          }`}
        >
          {/* Subtle inner grid lines */}
          <div className="absolute inset-0 bg-[radial-gradient(#00E5D4_1px,transparent_1px)] [background-size:8px_8px] opacity-20 rounded-2xl pointer-events-none" />

          {/* Connected nodes icon representing collaborative payments */}
          <svg
            className="w-full h-full text-[#00E5D4] drop-shadow-[0_0_8px_rgba(0,229,212,0.8)]"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Triangular network of collaborative nodes */}
            <path
              d="M20 9L11 27H29L20 9Z"
              stroke="#087E78"
              strokeWidth="2"
              strokeLinejoin="round"
              className="opacity-60"
            />
            <path
              d="M20 9L11 27L20 23L29 27L20 9Z"
              fill="url(#logo-grad)"
              fillOpacity="0.25"
              stroke="#00E5D4"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Center core pulse */}
            <circle cx="20" cy="9" r="2.5" fill="#F3F6F6" />
            <circle cx="11" cy="27" r="2.5" fill="#00E5D4" />
            <circle cx="29" cy="27" r="2.5" fill="#00E5D4" />
            <circle cx="20" cy="21" r="2" fill="#00E5D4" className="animate-ping" opacity="0.75" />
            <circle cx="20" cy="21" r="2" fill="#F3F6F6" />

            <defs>
              <linearGradient id="logo-grad" x1="11" y1="9" x2="29" y2="27" gradientUnits="userSpaceOnUse">
                <stop stopColor="#00E5D4" />
                <stop offset="1" stopColor="#087E78" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Brand Wordmark */}
        <div className="flex flex-col">
          <div className="flex items-center">
            <span className={`font-extrabold tracking-wider ${currentSize.text} text-[#F3F6F6] font-['Plus_Jakarta_Sans']`}>
              ALL
            </span>
            <span className={`font-extrabold tracking-wider ${currentSize.text} text-[#00E5D4] drop-shadow-[0_0_12px_rgba(0,229,212,0.5)]`}>
              IN
            </span>
            <div className={`ml-1 ${currentSize.dot} rounded-full bg-[#00E5D4] shadow-[0_0_8px_#00E5D4]`} />
          </div>
        </div>
      </div>

      {showTagline && (
        <span className="mt-1 text-xs font-medium tracking-widest uppercase text-[#8E9CA3]">
          Collaborative Payments
        </span>
      )}
    </div>
  );
}

