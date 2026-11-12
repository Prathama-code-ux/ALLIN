import React from 'react';
import StatCard from './StatCard';
import { ShieldCheck, ArrowUpRight, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { formatUSD } from '../../utils/currency';

export default function PaymentOverview({
  onPayNow,
  paymentLoading,
  paymentCompleted,
  totalPool = 0,
  targetAmount = 0,
  totalExpenses = 0,
  userShare = 0,
  myPaymentStatus = 'PENDING',
  nextPendingSplit = null,
  onApproveSplit,
  activeGroup,
}) {
  const percentage = targetAmount > 0
    ? Math.min(Math.round((totalPool / targetAmount) * 100), 100)
    : 0;

  const remaining = Math.max(0, targetAmount - totalPool);
  const isPaid = paymentCompleted || myPaymentStatus === 'COMPLETED';

  // Check whether the user has a specific split to approve or pay
  const hasSplitToApprove = nextPendingSplit && nextPendingSplit.status === 'pending';
  const hasSplitReadyToPay = nextPendingSplit && nextPendingSplit.status === 'approved';

  const handleCtaClick = () => {
    if (isPaid || paymentLoading) return;

    if (hasSplitToApprove && onApproveSplit) {
      onApproveSplit(nextPendingSplit.expenseId);
    } else if (hasSplitReadyToPay) {
      onPayNow({ expenseId: nextPendingSplit.expenseId, groupId: activeGroup?._id });
    } else {
      onPayNow({ groupId: activeGroup?._id, amount: userShare });
    }
  };

  return (
    <section className="space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-[#171426] via-[#120f21] to-[#0c0a16] border border-white/5 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#a66bff]/10 rounded-full blur-[110px] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold tracking-widest text-[#a66bff] uppercase px-2 py-0.5 rounded-full bg-[#a66bff]/10 border border-[#a66bff]/20">
              COLLABORATIVE POOL
            </span>
            {activeGroup?.name && (
              <span className="text-xs text-[#94A3B8]">
                • {activeGroup.name}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F3F6F6] font-['Plus_Jakarta_Sans'] tracking-tight">
            Group Payment Overview
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-1 max-w-xl">
            Real-time pooled payments, expense splits, and PayPal Sandbox settlement tracking.
          </p>
        </div>

        {/* Primary Payment Action Button */}
        <div className="relative z-10 flex items-center">
          <button
            type="button"
            className={`w-full sm:w-auto px-6 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg cursor-pointer ${
              isPaid
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                : 'bg-gradient-to-r from-[#a66bff] via-[#8b43f6] to-[#6125c8] text-white hover:brightness-110 shadow-[0_0_25px_rgba(166,107,255,0.4)] active:scale-98'
            }`}
            onClick={handleCtaClick}
            disabled={paymentLoading || isPaid}
          >
            {paymentLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Connecting to PayPal...</span>
              </>
            ) : isPaid ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Share Paid ({formatUSD(userShare)} USD)</span>
              </>
            ) : hasSplitToApprove ? (
              <>
                <Clock className="w-4 h-4 text-white" />
                <span>Review & Approve Split ({formatUSD(nextPendingSplit.amount)} USD)</span>
              </>
            ) : (
              <>
                <span>Pay Your Share ({formatUSD(userShare)} USD)</span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-white/20 text-white">
                  Sandbox
                </span>
                <ArrowUpRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Target Progress Panel */}
      <div className="p-6 rounded-3xl bg-[#100d1d]/90 backdrop-blur-md border border-white/5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-[#94A3B8] tracking-wider uppercase">
              Target Collection Progress
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#F3F6F6] font-['Plus_Jakarta_Sans']">
                {formatUSD(totalPool)}
              </span>
              <span className="text-xs sm:text-sm text-[#94A3B8]">
                USD collected of {formatUSD(targetAmount)} target
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1 rounded-xl text-sm font-extrabold text-[#a66bff] bg-[#a66bff]/10 border border-[#a66bff]/25">
              {percentage}% Complete
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3.5 rounded-full bg-white/5 overflow-hidden p-0.5 border border-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#a66bff] via-[#8b43f6] to-[#00E5D4] transition-all duration-700 shadow-[0_0_15px_rgba(166,107,255,0.6)]"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-[#94A3B8] pt-1">
          <span>{formatUSD(remaining)} USD remaining to goal</span>
          <span className="font-semibold text-[#F3F6F6]">
            {percentage >= 100 ? '🎉 Collection Goal Reached!' : 'Collection in progress'}
          </span>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          label="Total Pool Collected"
          amount={formatUSD(totalPool)}
          description={`${percentage}% of crew goal reached`}
          icon="♧"
          accent
        />

        <StatCard
          label="Target Pool Goal"
          amount={formatUSD(targetAmount)}
          description="Total group target (USD)"
          icon="◎"
        />

        <StatCard
          label="Total Group Expenses"
          amount={formatUSD(totalExpenses)}
          description="Tracked group expenditures"
          icon="◈"
        />

        <StatCard
          label="Your Allocated Share"
          amount={formatUSD(userShare)}
          description={isPaid ? 'Payment verified' : 'Pending payment'}
          icon="⇄"
          badge={isPaid ? 'PAID' : 'PENDING'}
        />
      </div>
    </section>
  );
}
