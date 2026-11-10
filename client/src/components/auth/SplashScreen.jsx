import React, { useState, useEffect } from 'react';
import { ArrowRight, ShieldCheck, Zap, Users } from 'lucide-react';
import Logo from '../common/Logo';
import Button from '../common/Button';

export default function SplashScreen({ onNavigateLogin, onNavigateRegister }) {
  // Animation stages:
  // 0: Dark screen
  // 1: Logo appears at center with cyan glow
  // 2: Logo smoothly glides upward
  // 3: Welcome messaging & Sign In / Create Account options appear
  const hasSeen = typeof window !== 'undefined' && sessionStorage.getItem('allin_intro_seen');
  const [stage, setStage] = useState(hasSeen ? 3 : 0);

  useEffect(() => {
    if (hasSeen) return;

    // Crisp animation sequence timing:
    // 0 -> 1: 300ms (dark screen -> logo appears)
    const t1 = setTimeout(() => setStage(1), 300);
    // 1 -> 2: 1200ms (logo begins gliding upward)
    const t2 = setTimeout(() => setStage(2), 1300);
    // 2 -> 3: 1800ms (welcome text and options fade in)
    const t3 = setTimeout(() => {
      setStage(3);
      sessionStorage.setItem('allin_intro_seen', 'true');
    }, 1800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [hasSeen]);

  const handleSkip = () => {
    setStage(3);
    sessionStorage.setItem('allin_intro_seen', 'true');
  };

  return (
    <div className="relative min-h-screen w-full bg-[#080B0D] flex flex-col items-center justify-center px-4 overflow-hidden select-none">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] md:w-[600px] h-[340px] md:h-[600px] bg-[#00E5D4]/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[220px] h-[220px] bg-[#087E78]/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Subtle Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Fast skip button during opening sequence */}
      {stage < 3 && (
        <button
          onClick={handleSkip}
          className="absolute top-6 right-6 text-xs font-medium text-[#64748B] hover:text-[#00E5D4] transition-colors z-20 cursor-pointer"
        >
          Skip Intro
        </button>
      )}

      {/* Main Container */}
      <div className="w-full max-w-md mx-auto flex flex-col items-center text-center z-10 px-2">
        {/* Animated Logo Section */}
        <div
          className={`transition-all duration-700 ease-out transform ${
            stage === 0
              ? 'opacity-0 scale-90 translate-y-6'
              : stage === 1
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-100 scale-95 -translate-y-6 md:-translate-y-10'
          }`}
        >
          <Logo size={stage >= 2 ? 'lg' : 'xl'} animated={stage <= 2} showTagline={false} />
        </div>

        {/* Content Section: Message & Options (Appears in stage 3) */}
        <div
          className={`w-full flex flex-col items-center transition-all duration-700 ease-out ${
            stage >= 2
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8 pointer-events-none'
          }`}
        >
          {/* Welcome Headline */}
          <div className="mt-4 mb-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F3F6F6] font-['Plus_Jakarta_Sans']">
              Payments, <span className="text-[#00E5D4] drop-shadow-[0_0_15px_rgba(0,229,212,0.4)]">together.</span>
            </h1>
            <p className="mt-3 text-base text-[#94A3B8] font-normal leading-relaxed max-w-sm mx-auto">
              Split expenses. Pay together. Stay connected.
            </p>
          </div>

          {/* Fintech Trust Badges */}
          <div className="flex items-center justify-center gap-4 my-6 py-2 px-4 rounded-full bg-[#111719]/70 border border-white/5 backdrop-blur-md text-xs text-[#94A3B8]">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#00E5D4]" /> Instant Splits
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00E5D4]" /> Secure
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#00E5D4]" /> Groups
            </span>
          </div>

          {/* Action Options: Sign In & Create Account */}
          <div className="w-full space-y-3.5 mt-2">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={onNavigateLogin}
              icon={ArrowRight}
              iconPosition="right"
              className="font-semibold shadow-[0_0_25px_rgba(0,229,212,0.3)] hover:shadow-[0_0_35px_rgba(0,229,212,0.5)]"
            >
              Sign In
            </Button>

            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={onNavigateRegister}
              className="border-white/10 hover:border-[#00E5D4]/40 bg-[#111719]/80"
            >
              Create Account
            </Button>
          </div>

          {/* Mobile footer hint */}
          <p className="mt-8 text-xs text-[#64748B]">
            Fintech group expense-sharing and collaborative payments
          </p>
        </div>
      </div>
    </div>
  );
}

