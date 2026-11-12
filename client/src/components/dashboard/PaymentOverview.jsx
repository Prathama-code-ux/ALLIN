import React from 'react';
import StatCard from './StatCard';
import { ShieldCheck, ArrowUpRight, CheckCircle2, Clock, Sparkles, Wallet, Users, ArrowDownLeft, Receipt } from 'lucide-react';
import { formatUSD } from '../../utils/currency';

export default function PaymentOverview({
  onPayNow,
  paymentLoading,
  paymentCompleted,
  totalPool = 0,
  targetAmount = 0,
  availablePoolBalance = 0,
  totalExpenses = 0,
  userShare = 0,
  myPaymentStatus = 'PENDING',
  nextPendingSplit = null,
  onApproveSplit,
  activeGroup,
  settlementsSummary = { totalOwed: 0, totalOwedToUser: 0, netBalance: 0 },
  onOpenSettlements,
}) {
  const percentage = targetAmount > 0
    ? Math.min(Math.round((totalPool / targetAmount) * 100), 100)
    : 0;

  const remaining = Math.max(0, targetAmount - totalPool);
  const isPaid = paymentCompleted || myPaymentStatus === 'COMPLETED';

  // Check whether user has pending debts to reimburse
  const hasDebtsToPay = settlementsSummary?.totalOwed > 0;

  return (
    <section className="space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-[#171426] via-[#120f21] to-[#0c0a16] border border-white/5 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#a66bff]/10 rounded-full blur-[110px] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold tracking-widest text-[#a66bff] uppercase px-2 py-0.5 rounded-full bg-[#a66bff]/10 border border-[#a66bff]/20">
              COLLABORATIVE LEDGER & POOL
            </span>
            {activeGroup?.name && (
              <span className="text-xs text-[#94A3B8]">
                • {activeGroup.name} ({activeGroup.members?.length || 1} members)
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F3F6F6] font-['Plus_Jakarta_Sans'] tracking-tight">
            Group Financial Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-1 max-w-xl">
            Confirmed contributions, available pool balance, personal advances, and real PayPal Sandbox settlements.
          </p>
        </div>

        {/* Quick Payment Action Buttons */}
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          {hasDebtsToPay && (
            <button
              type="button"
              className="px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 hover:brightness-110 shadow-lg cursor-pointer transition-all"
              onClick={onOpenSettlements}
            >
              <ArrowDownLeft className="w-4 h-4 text-amber-400" />
              <span>Settle Debts ({formatUSD(settlementsSummary.totalOwed)} USD)</span>
            </button>
          )}

          <button
            type="button"
            className="px-6 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#a66bff] via-[#8b43f6] to-[#6125c8] text-white hover:brightness-110 shadow-[0_0_25px_rgba(166,107,255,0.4)] active:scale-98 transition-all cursor-pointer"
            onClick={() => onPayNow({ groupId: activeGroup?._id, amount: 25.0, purpose: "GROUP_CONTRIBUTION" })}
            disabled={paymentLoading}
          >
            {paymentLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Connecting to PayPal...</span>
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4" />
                <span>Deposit to Pool</span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-white/20 text-white">
                  Sandbox
                </span>
                <ArrowUpRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Target Progress & Available Pool Balance Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 p-6 rounded-3xl bg-[#100d1d]/90 backdrop-blur-md border border-white/5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-[#94A3B8] tracking-wider uppercase">
                Contribution Target Collection Progress
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#F3F6F6] font-['Plus_Jakarta_Sans']">
                  {formatUSD(totalPool)}
                </span>
                <span className="text-xs sm:text-sm text-[#94A3B8]">
                  USD confirmed deposits of {formatUSD(targetAmount)} target
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1 rounded-xl text-sm font-extrabold text-[#a66bff] bg-[#a66bff]/10 border border-[#a66bff]/25">
                {percentage}% Collected
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden p-0.5 border border-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#a66bff] via-[#8b43f6] to-[#00E5D4] transition-all duration-700 shadow-[0_0_15px_rgba(166,107,255,0.6)]"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-[#94A3B8] pt-1">
            <span>{formatUSD(remaining)} USD remaining to target</span>
            <span className="font-semibold text-[#F3F6F6]">
              {percentage >= 100 ? '🎉 Collection Goal Reached!' : 'Target collection in progress'}
            </span>
          </div>
        </div>

        {/* Available Pool Spending Capacity Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#131b2e] via-[#0f172a] to-[#0b1120] border border-emerald-500/20 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
              <span>AVAILABLE POOL BALANCE</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-3xl font-extrabold text-[#F3F6F6] font-mono mt-2">
              {formatUSD(availablePoolBalance)}
            </div>
            <p className="text-xs text-[#94A3B8] mt-1.5">
              Net unspent group funds ready for pool-funded expenses.
            </p>
          </div>

          <div className="pt-4 border-t border-white/10 text-[11px] text-[#94A3B8] flex justify-between items-center">
            <span>Pool = Deposits − Pool Expenses</span>
            <span className="font-semibold text-emerald-300">Live Enforced</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          label="Confirmed Deposits"
          amount={formatUSD(totalPool)}
          description={`${percentage}% of group goal`}
          icon="♧"
          accent
        />

        <StatCard
          label="Target Amount"
          amount={formatUSD(targetAmount)}
          description={`${activeGroup?.members?.length || 1} crew members`}
          icon="◎"
        />

        <StatCard
          label="Total Group Expenses"
          amount={formatUSD(totalExpenses)}
          description="Pool expenses + advances"
          icon="◈"
        />

        <StatCard
          label="Your Net Settlements"
          amount={formatUSD(Math.abs(settlementsSummary?.netBalance || 0))}
          description={
            (settlementsSummary?.netBalance || 0) >= 0
              ? `You are owed ${formatUSD(settlementsSummary?.totalOwedToUser || 0)}`
              : `You owe ${formatUSD(settlementsSummary?.totalOwed || 0)}`
          }
          icon="⇄"
          badge={(settlementsSummary?.netBalance || 0) >= 0 ? "CREDITOR" : "DEBTOR"}
        />
      </div>
    </section>
  );
}
