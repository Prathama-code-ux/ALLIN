import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle, ChevronLeft } from 'lucide-react';
import Logo from '../components/common/Logo';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { useAuth } from '../context/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Where to redirect after login (default /dashboard)
  const from = location.state?.from?.pathname || '/dashboard';

  const validateForm = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setServerError('');

    try {
      await login(formData.email, formData.password);
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(err.message || 'Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#080B0D] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden select-none">
      {/* Background Glow Accents */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-[#00E5D4]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-[#087E78]/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Navigation back to Welcome */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between z-10">
        <Link
          to="/welcome"
          className="inline-flex items-center gap-1.5 text-xs text-[#8E9CA3] hover:text-[#00E5D4] transition-colors py-1 px-2.5 rounded-lg hover:bg-white/5"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </Link>
        <span className="text-xs text-[#64748B]">Secure Login</span>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-[#111719]/90 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-10 relative">
        {/* Subtle cyan glow line along top border */}
        <div className="absolute -top-px left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[#00E5D4]/60 to-transparent" />

        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-block mb-3">
            <Logo size="md" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#F3F6F6]">
            Welcome back
          </h2>
          <p className="text-sm text-[#8E9CA3] mt-1.5">
            Sign in to manage your group splits & payments
          </p>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{serverError}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Email Address"
            id="login-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            error={fieldErrors.email}
            icon={Mail}
            required
            autoComplete="email"
            disabled={submitting}
          />

          <Input
            label="Password"
            id="login-password"
            name="password"
            type="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            error={fieldErrors.password}
            icon={Lock}
            required
            autoComplete="current-password"
            disabled={submitting}
          />

          <div className="flex items-center justify-end pt-1">
            <button
              type="button"
              onClick={() => alert('Password reset is not configured on this server. Please contact your group administrator or register a new account.')}
              className="text-xs text-[#00E5D4] hover:text-[#38BDF8] transition-colors"
            >
              Forgot password?
            </button>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={submitting}
              icon={ArrowRight}
              iconPosition="right"
              className="shadow-[0_0_20px_rgba(0,229,212,0.3)] hover:shadow-[0_0_30px_rgba(0,229,212,0.5)]"
            >
              Sign In
            </Button>
          </div>
        </form>

        {/* Switch to Register */}
        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-sm text-[#8E9CA3]">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-semibold text-[#00E5D4] hover:text-[#38BDF8] transition-colors ml-1"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>

      {/* Security note */}
      <p className="mt-6 text-xs text-[#64748B] text-center z-10">
        ALLIN uses 256-bit SSL encryption & JWT token security
      </p>
    </div>
  );
}
