import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, ArrowLeft, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import useAuth from '../context/useAuth';
import Logo from '../components/common/Logo';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Card from '../components/common/Card';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, authError, setAuthError } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculatePasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-transparent' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 1;

    switch (score) {
      case 1:
        return { score, label: 'Weak', color: 'bg-rose-500' };
      case 2:
        return { score, label: 'Fair', color: 'bg-amber-500' };
      case 3:
        return { score, label: 'Good', color: 'bg-cyan-400' };
      case 4:
      default:
        return { score, label: 'Strong', color: 'bg-emerald-400' };
    }
  };

  const strength = calculatePasswordStrength(formData.password);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (authError) {
      setAuthError(null);
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

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

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const result = await register(
      formData.name.trim(),
      formData.email.trim(),
      formData.password
    );
    setIsSubmitting(false);

    if (result.success) {
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#080B0D] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] md:w-[500px] h-[350px] md:h-[500px] bg-[#00E5D4]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-5 left-5 w-[200px] h-[200px] bg-[#087E78]/15 rounded-full blur-[90px] pointer-events-none" />

      {/* Top back navigation */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        <Link
          to="/welcome"
          className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#00E5D4] transition-colors py-1 px-2 rounded-lg hover:bg-white/5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </Link>
        <span className="text-xs text-[#64748B]">New Membership</span>
      </div>

      {/* Main card */}
      <Card className="w-full max-w-md p-6 sm:p-8 relative z-10 border-white/10 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-block mb-3">
            <Logo size="md" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F3F6F6]">
            Create Account
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            Join ALLIN to split expenses and settle balances together
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
        <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
          <Input
            label="Full Name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Alex Morgan"
            icon={User}
            error={fieldErrors.name}
            autoComplete="name"
            required
          />

          <Input
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="alex@example.com"
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
              placeholder="Minimum 6 characters"
              icon={Lock}
              error={fieldErrors.password}
              autoComplete="new-password"
              required
            />

            {/* Password strength visual meter */}
            {formData.password && (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between items-center text-[10px] text-[#94A3B8]">
                  <span>Strength: {strength.label}</span>
                  <span className="font-mono">{strength.score}/4</span>
                </div>
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden flex gap-1">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`h-full flex-1 rounded-full transition-all duration-300 ${
                        step <= strength.score ? strength.color : 'bg-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <Input
            label="Confirm Password"
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Re-enter password"
            icon={Lock}
            error={fieldErrors.confirmPassword}
            autoComplete="new-password"
            required
          />

          {/* Fintech perks */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 text-[11px] text-[#94A3B8]">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00E5D4]" />
              <span>Instant invite code generation for your squads</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00E5D4]" />
              <span>Fair equal & custom expense splitting</span>
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
              Create Account
            </Button>
          </div>
        </form>

        {/* Switch to Login */}
        <div className="mt-5 pt-4 border-t border-white/5 text-center">
          <p className="text-xs text-[#94A3B8]">
            Already have an ALLIN account?{' '}
            <Link
              to="/login"
              className="text-[#00E5D4] font-medium hover:underline ml-1"
            >
              Sign In
            </Link>
          </p>
        </div>
      </Card>

      {/* Footer */}
      <p className="mt-6 text-[11px] text-[#64748B] text-center max-w-xs">
        By joining ALLIN, you agree to collaborative payment terms.
      </p>
    </div>
  );
}

