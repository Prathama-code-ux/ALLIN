import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, ArrowRight, AlertCircle, ChevronLeft } from 'lucide-react';
import Logo from '../components/common/Logo';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { useAuth } from '../context/useAuth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validateForm = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.name.trim()) {
      errors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

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

    if (formData.confirmPassword !== formData.password) {
      errors.confirmPassword = 'Passwords do not match';
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
      await register(formData.name, formData.email, formData.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setServerError(err.response?.data?.message || err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#090810] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden select-none">
      {/* Background Glow Accents */}
      <div className="absolute top-1/4 -right-20 w-80 h-80 bg-[#a66bff]/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-[#6125c8]/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Navigation back to Welcome */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between z-10">
        <Link
          to="/welcome"
          className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#a66bff] transition-colors py-1 px-2.5 rounded-lg hover:bg-white/5"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </Link>
        <span className="text-xs text-[#7E8B99]">Create Account</span>
      </div>

      {/* Register Card */}
      <div className="w-full max-w-md bg-[#171426]/90 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-10 relative">
        {/* Subtle violet glow line along top border */}
        <div className="absolute -top-px left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[#a66bff]/60 to-transparent" />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <Logo size="md" />
          <h2 className="text-xl sm:text-2xl font-bold text-[#F3F6F6] mt-4 tracking-tight">
            Join ALLIN
          </h2>
          <p className="text-xs text-[#94A3B8] mt-1">
            Collaborative payments & smart group expense management
          </p>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-rose-300 text-xs animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Registration Failed</span>
              <span>{serverError}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
          <Input
            label="Full Name"
            id="name"
            name="name"
            type="text"
            placeholder="Alex Morgan"
            value={formData.name}
            onChange={handleChange}
            error={fieldErrors.name}
            icon={User}
            autoComplete="name"
            required
          />

          <Input
            label="Email Address"
            id="email"
            name="email"
            type="email"
            placeholder="name@example.com"
            value={formData.email}
            onChange={handleChange}
            error={fieldErrors.email}
            icon={Mail}
            autoComplete="email"
            required
          />

          <Input
            label="Password"
            id="password"
            name="password"
            type="password"
            placeholder="At least 6 characters"
            value={formData.password}
            onChange={handleChange}
            error={fieldErrors.password}
            icon={Lock}
            autoComplete="new-password"
            required
          />

          <Input
            label="Confirm Password"
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Re-enter password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={fieldErrors.confirmPassword}
            icon={Lock}
            autoComplete="new-password"
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={submitting}
            fullWidth
            icon={ArrowRight}
            iconPosition="right"
            className="mt-6 shadow-[0_0_25px_rgba(166,107,255,0.4)]"
          >
            Create Free Account
          </Button>
        </form>

        {/* Footer Links */}
        <div className="mt-6 text-center text-xs text-[#94A3B8]">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-[#a66bff] hover:text-[#c49cff] transition-colors underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
