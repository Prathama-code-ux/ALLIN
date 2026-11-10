import React from 'react';
import Button from './Button';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  actionIcon,
  className = '',
}) {
  return (
    <div
      className={`
        w-full p-8 sm:p-12 rounded-3xl bg-[#111719]/60 border border-white/5
        flex flex-col items-center justify-center text-center backdrop-blur-md
        ${className}
      `}
    >
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-[#00E5D4]/10 border border-[#00E5D4]/20 flex items-center justify-center text-[#00E5D4] mb-4 shadow-[0_0_25px_rgba(0,229,212,0.15)]">
          <Icon className="w-7 h-7" />
        </div>
      )}

      <h3 className="text-lg font-bold text-[#F3F6F6]">{title}</h3>

      {description && (
        <p className="text-xs sm:text-sm text-[#94A3B8] max-w-sm mt-1.5 mb-6 leading-relaxed">
          {description}
        </p>
      )}

      {actionText && onAction && (
        <Button
          variant="primary"
          size="md"
          icon={actionIcon}
          onClick={onAction}
          className="shadow-[0_0_20px_rgba(0,229,212,0.25)]"
        >
          {actionText}
        </Button>
      )}
    </div>
  );
}

