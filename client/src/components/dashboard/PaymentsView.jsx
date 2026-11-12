import React, { useState } from 'react';
import { 
  CreditCard, 
  ShieldCheck, 
  Zap, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Clock, 
  RefreshCw,
  ExternalLink,
  Users
} from 'lucide-react';
import { formatUSD } from '../../utils/currency';

export default function PaymentsView({
  activeGroup,
  contributions = [],
  poolData = { totalPool: 0, targetAmount: 0, remaining: 0 },
  onPayNow,
  paymentLoading,
  paymentCompleted,
  myPaymentStatus,
  userShare = 0,
  currentUserId,
}) {
  const [customAmount, setCustomAmount] = useState(userShare);
  const [useCustom, setUseCustom] = useState(false);

  const percentage = poolData.targetAmount > 0
    ? Math.min(Math.round((poolData.totalPool / poolData.targetAmount) * 100), 100)
    : 0;

  const isUserPaid = myPaymentStatus === 'COMPLETED' || paymentCompleted;

  const handleTriggerPayment = () => {
    const amountToPay = useCustom ? Number(customAmount) : Number(userShare);
    if (!amountToPay || amountToPay <= 0) return;
    onPayNow(amountToPay);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-br from-[#171426] via-[#151224] to-[#0d0b17] border border-white/5 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#a66bff]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10">
          <span className="text-[11px] font-bold tracking-widest text-[#a66bff] uppercase">
            PAYMENT MANAGEMENT
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F3F6F6] mt-1 font-['Plus_Jakarta_Sans']">
            PayPal Payment Hub
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1 max-w-xl">
            Settle your group share or contribute to the joint pool securely via PayPal Sandbox.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] text-xs font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>Sandbox Certified</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Payment Action Card & Pool Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Payment Terminal */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-[#171426] border border-[#a66bff]/30 backdrop-blur-xl relative overflow-hidden shadow-2xl">
            {/* Top accent glow line */}
            <div className="absolute -top-px left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[#a66bff] to-transparent" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5 mb-6">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-[#a66bff] uppercase">
                  DIRECT SETTLEMENT
                </span>
                <h2 className="text-xl font-bold text-[#F3F6F6] mt-0.5">
                  Contribute Your Share
                </h2>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Destination: <strong className="text-white">{activeGroup?.name || 'Active Squad Pool'}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isUserPaid
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}>
                  {isUserPaid ? '✓ Share Paid' : '● Contribution Pending'}
                </span>
              </div>
            </div>

            {/* Amount Selection */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#94A3B8]">
                  Select Contribution Amount
                </label>
                <button
                  type="button"
                  onClick={() => setUseCustom(!useCustom)}
                  className="text-xs text-[#a66bff] hover:text-[#c49cff] font-medium cursor-pointer"
                >
                  {useCustom ? 'Use calculated split share' : 'Enter custom amount'}
                </button>
              </div>

              {!useCustom ? (
                <div className="p-4 rounded-2xl bg-[#090810]/70 border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#7E8B99] block">Allocated Equal Split</span>
                    <strong className="text-2xl font-bold text-[#F3F6F6] font-mono">
                      {formatUSD(userShare)} USD
                    </strong>
                  </div>
                  <span className="text-xs text-[#c49cff] bg-[#a66bff]/10 px-3 py-1.5 rounded-xl border border-[#a66bff]/20 font-medium">
                    Recommended
                  </span>
                </div>
              ) : (
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-[#7E8B99] font-mono">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="50.00"
                    className="w-full pl-9 pr-4 py-3 rounded-2xl bg-[#090810] border border-[#a66bff]/40 text-xl font-bold text-[#F3F6F6] font-mono focus:outline-none focus:border-[#a66bff] transition-colors"
                  />
                </div>
              )}
            </div>

            {/* PayPal Trigger Button */}
            <button
              type="button"
              disabled={paymentLoading || isUserPaid}
              onClick={handleTriggerPayment}
              className={`w-full py-4 px-6 rounded-2xl text-sm font-bold flex items-center justify-center gap-3 transition-all cursor-pointer ${
                isUserPaid
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                  : paymentLoading
                  ? 'bg-[#a66bff]/50 text-white cursor-wait'
                  : 'bg-gradient-to-r from-[#a66bff] via-[#8b43f6] to-[#6125c8] text-white hover:brightness-110 shadow-[0_0_25px_rgba(166,107,255,0.4)]'
              }`}
            >
              {paymentLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Connecting to PayPal Sandbox Gateway...</span>
                </>
              ) : isUserPaid ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Your Share is Already Settled</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  <span>
                    Pay {formatUSD(useCustom ? customAmount : userShare)} USD with PayPal Sandbox
                  </span>
                  <ExternalLink className="w-4 h-4 ml-1 opacity-70" />
                </>
              )}
            </button>

            {/* Security note */}
            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-[#7E8B99]">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Payments are processed with 256-bit encryption on PayPal Sandbox</span>
            </div>
          </div>

          {/* Group Split Breakdown Table */}
          <div className="p-6 rounded-3xl bg-[#171426] border border-white/5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#a66bff]" />
                <h3 className="text-sm font-bold text-[#F3F6F6]">
                  Crew Member Contributions ({contributions.length})
                </h3>
              </div>
              <span className="text-xs text-[#7E8B99] font-mono">
                Goal: {formatUSD(poolData.targetAmount)} USD
              </span>
            </div>

            <div className="space-y-2">
              {contributions.map((c) => {
                const isYou = currentUserId && (c.userId === currentUserId || c.id === currentUserId);
                const isPaid = c.status === 'COMPLETED' || (isYou && paymentCompleted);

                return (
                  <div
                    key={c.id || c.name}
                    className="p-3 rounded-2xl bg-[#090810]/50 border border-white/5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#8b43f6]/20 to-[#6125c8]/20 border border-[#a66bff]/20 flex items-center justify-center text-xs font-bold text-[#c49cff]">
                        {c.initials || 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-[#F3F6F6]">{c.name}</span>
                          {isYou && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#a66bff]/20 text-[#c49cff]">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#7E8B99]">{c.role}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold font-mono text-[#F3F6F6]">
                        {formatUSD(c.amount)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isPaid
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}>
                        {isPaid ? 'PAID' : 'PENDING'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Pool Metrics & Info */}
        <div className="space-y-6">
          {/* Progress Card */}
          <div className="p-6 rounded-3xl bg-[#171426] border border-white/5 shadow-xl space-y-4">
            <h3 className="text-xs font-bold tracking-wider text-[#7E8B99] uppercase">
              Pool Goal Progress
            </h3>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-[#F3F6F6] font-mono">
                  {formatUSD(poolData.totalPool)}
                </span>
                <span className="text-xs text-[#7E8B99] block mt-0.5">
                  of {formatUSD(poolData.targetAmount)} USD target
                </span>
              </div>
              <div className="text-2xl font-bold text-[#a66bff]">
                {percentage}%
              </div>
            </div>

            <div className="w-full h-3 rounded-full bg-[#090810] overflow-hidden p-0.5 border border-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#8b43f6] to-[#a66bff] shadow-[0_0_12px_#a66bff]"
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-[#7E8B99] pt-2 border-t border-white/5">
              <span>Remaining to goal:</span>
              <strong className="text-[#F3F6F6] font-mono">{formatUSD(poolData.remaining)} USD</strong>
            </div>
          </div>

          {/* Sandbox Info Card */}
          <div className="p-6 rounded-3xl bg-[#171426] border border-white/5 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#c49cff]">
              <Zap className="w-4 h-4 text-[#a66bff]" />
              <span>PayPal Sandbox Details</span>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              This environment communicates directly with PayPal REST v2 API Sandbox.
              Orders are generated with real approval URLs and captured idempotently.
            </p>
            <div className="p-3 rounded-xl bg-[#090810]/70 border border-white/5 text-[11px] font-mono text-[#7E8B99] space-y-1">
              <div>Currency: <span className="text-white">USD</span></div>
              <div>Intent: <span className="text-white">CAPTURE</span></div>
              <div>Mode: <span className="text-emerald-400">Sandbox Test</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
