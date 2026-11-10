import React, { useState, useId } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function Input({
  label,
  type = 'text',
  value,
  onChange,
  name,
  placeholder,
  error,
  helperText,
  icon: Icon = null,
  disabled = false,
  required = false,
  autoComplete,
  id,
  className = '',
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const reactGeneratedId = useId();
  const inputId = id || name || reactGeneratedId;

  const isPasswordType = type === 'password';
  const effectiveType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`w-full text-left space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold tracking-wider text-[#94A3B8] uppercase"
          >
            {label} {required && <span className="text-[#00E5D4]">*</span>}
          </label>
        </div>
      )}

      <div className="relative group">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B] group-focus-within:text-[#00E5D4] transition-colors">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          id={inputId}
          name={name}
          type={effectiveType}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`
            w-full bg-[#111719]/90 text-[#F3F6F6] text-sm rounded-xl px-3.5 py-3
            border transition-all duration-200 outline-none
            placeholder:text-[#64748B]
            ${Icon ? 'pl-10' : 'pl-3.5'}
            ${isPasswordType ? 'pr-11' : 'pr-3.5'}
            ${
              error
                ? 'border-rose-500/60 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30'
                : 'border-white/10 hover:border-white/20 focus:border-[#00E5D4] focus:ring-2 focus:ring-[#00E5D4]/20 focus:shadow-[0_0_20px_rgba(0,229,212,0.15)]'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          {...props}
        />

        {isPasswordType && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#64748B] hover:text-[#00E5D4] transition-colors cursor-pointer"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>

      {error ? (
        <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-1 animate-fadeIn">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : helperText ? (
        <p className="text-xs text-[#64748B] mt-1">{helperText}</p>
      ) : null}
    </div>
  );
}
