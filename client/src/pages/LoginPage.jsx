import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, AlertCircle, ArrowRight } from 'lucide-react';
import useAuth from '../context/useAuth';
import Logo from '../components/common/Logo';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Card from '../components/common/Card';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, authError, setAuthError } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear specific field error as user types
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (authError) {
      setAuthError(null);
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const result = await login(formData.email, formData.password);
    setIsSubmitting(false);

    if (result.success) {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#080B0D] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] md:w-[500px] h-[350px] md:h-[500px] bg-[#00E5D4]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-5 right-5 w-[200px] h-[200px] bg-[#087E78]/15 rounded-full blur-[90px] pointer-events-none" />

      {/* Top back navigation */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        <Link
          to="/welcome"
          className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#00E5D4] transition-colors py-1 px-2 rounded-lg hover:bg-white/5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </Link>
        <span className="text-xs text-[#64748B]">Fintech Security</span>
      </div>

      {/* Main card */}
      <Card className="w-full max-w-md p-6 sm:p-8 relative z-10 border-white/10 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-block mb-3">
            <Logo size="md" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F3F6F6]">
            Welcome Back
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            Sign in to manage your group splits and payments
          </p>
        </div>

        {/* Global Error Banner */}
        {authError && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">{authError}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="name@example.com"
            icon={Mail}
            error={fieldErrors.email}
            autoComplete="email"
            required
          />

          <div>
            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              icon={Lock}
              error={fieldErrors.password}
              autoComplete="current-password"
              required
            />
            <div className="flex justify-end mt-1.5">
              <span className="text-[11px] text-[#64748B] hover:text-[#00E5D4] cursor-pointer transition-colors">
                Protected with JWT Authentication
              </span>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
              icon={ArrowRight}
              iconPosition="right"
              className="font-semibold shadow-[0_0_20px_rgba(0,229,212,0.3)]"
            >
              Sign In
            </Button>
          </div>
        </form>

        {/* Switch to Register */}
        <div className="mt-6 pt-5 border-t border-white/5 text-center">
          <p className="text-xs text-[#94A3B8]">
            Don't have an ALLIN account?{' '}
            <Link
              to="/register"
              className="text-[#00E5D4] font-medium hover:underline ml-1"
            >
              Create Account
            </Link>
          </p>
        </div>
      </Card>

      {/* Footer disclaimer */}
      <p className="mt-6 text-[11px] text-[#64748B] text-center max-w-xs">
        Encrypted connection. ALLIN never shares your credentials.
      </p>
    </div>
  );
}

