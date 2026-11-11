import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function Input({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  helperText,
  icon: Icon,
  required = false,
  disabled = false,
  className = '',
  autoComplete,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;
  const inputId = id || name;

  return (
    <div className={`w-full text-left ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium uppercase tracking-wider text-[#94A3B8] mb-1.5"
        >
          {label} {required && <span className="text-[#a66bff]">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-[#7E8B99] group-focus-within:text-[#a66bff]">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          id={inputId}
          name={name}
          type={effectiveType}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className={`w-full rounded-xl bg-[#171426] text-[#F3F6F6] text-sm placeholder-[#64748B] border transition-all duration-200 outline-none
            ${Icon ? 'pl-10' : 'pl-4'}
            ${isPassword ? 'pr-11' : 'pr-4'}
            py-3
            ${
              error
                ? 'border-rose-500/70 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20'
                : 'border-white/10 hover:border-white/20 focus:border-[#a66bff] focus:ring-2 focus:ring-[#a66bff]/20'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed bg-black/40' : ''}
          `}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            className="absolute right-3.5 p-1 text-[#7E8B99] hover:text-[#a66bff] transition-colors focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>

      {error ? (
        <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1 animate-fadeIn">
          <span className="w-1 h-1 rounded-full bg-rose-400 inline-block" />
          {error}
        </p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-[#7E8B99]">{helperText}</p>
      ) : null}
    </div>
  );
}
