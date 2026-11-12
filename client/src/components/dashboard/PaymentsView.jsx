import React, { useState } from 'react';
import { 
  CreditCard, 
  ShieldCheck, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowDownLeft,
  Users,
  Wallet,
  Receipt
} from 'lucide-react';
import { formatUSD } from '../../utils/currency';

export default function PaymentsView({
  activeGroup,
  contributions = [],
  poolData = { totalPool: 0, targetAmount: 0, availablePoolBalance: 0, remaining: 0 },
  settlements = { debts: [], credits: [], summary: { totalOwed: 0, totalOwedToUser: 0, netBalance: 0 } },
  onPayNow,
  paymentLoading,
  paymentCompleted,
  myPaymentStatus,
  userShare = 0,
  currentUserId,
}) {
  const [activeTab, setActiveTab] = useState('settlements'); // 'settlements' | 'pool'
  const [customAmount, setCustomAmount] = useState(25.0);

  const percentage = poolData.targetAmount > 0
    ? Math.min(Math.round((poolData.totalPool / poolData.targetAmount) * 100), 100)
    : 0;

  const handleDepositToPool = () => {
    const amt = Number(customAmount);
    if (!amt || amt <= 0) return;
    onPayNow({
      groupId: activeGroup?._id,
      amount: amt,
      purpose: "GROUP_CONTRIBUTION"
    });
  };

  const handleSettleDebt = (debt) => {
    onPayNow({
      settlementId: debt.id || debt._id,
      groupId: debt.groupId || activeGroup?._id,
      amount: debt.remainingAmount || debt.amount,
      purpose: "REIMBURSEMENT"
    });
  };

  const debts = settlements.debts || [];
  const credits = settlements.credits || [];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-br from-[#171426] via-[#151224] to-[#0d0b17] border border-white/5 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#a66bff]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10">
          <span className="text-[11px] font-bold tracking-widest text-[#a66bff] uppercase">
            PAYMENT MANAGEMENT & SETTLEMENTS
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F3F6F6] mt-1 font-['Plus_Jakarta_Sans']">
            PayPal Payment & Settlement Hub
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1 max-w-xl">
            Reimburse personal advances directly to crew members, or deposit into the shared pool via PayPal Sandbox.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] text-xs font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>Sandbox Certified</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('settlements')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'settlements'
              ? 'bg-[#a66bff] text-white shadow-[0_0_15px_rgba(166,107,255,0.4)]'
              : 'bg-white/[0.04] text-[#94A3B8] hover:text-white border border-white/5'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Reimbursements & Debts</span>
          {debts.filter(d => d.status !== 'completed').length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pool')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'pool'
              ? 'bg-[#a66bff] text-white shadow-[0_0_15px_rgba(166,107,255,0.4)]'
              : 'bg-white/[0.04] text-[#94A3B8] hover:text-white border border-white/5'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Deposit to Group Pool</span>
        </button>
      </div>

      {/* TAB 1: SETTLEMENTS & REIMBURSEMENTS */}
      {activeTab === 'settlements' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Debts Owed by You */}
          <div className="p-6 rounded-3xl bg-[#171426] border border-white/5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                  YOUR OUTSTANDING DEBTS
                </span>
                <h2 className="text-lg font-bold text-[#F3F6F6] mt-0.5">Whom You Owe</h2>
                <p className="text-xs text-[#94A3B8]">
                  Personal advances members paid for you. Settle via PayPal Sandbox.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#94A3B8] block">Total Owed</span>
                <strong className="text-lg font-bold text-amber-400 font-mono">
                  {formatUSD(settlements.summary?.totalOwed || 0)} USD
                </strong>
              </div>
            </div>

            {debts.length === 0 ? (
              <div className="py-12 text-center text-[#94A3B8] space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400/40 mx-auto" />
                <h3 className="text-sm font-semibold text-[#F3F6F6]">You have no outstanding debts!</h3>
                <p className="text-xs max-w-xs mx-auto">
                  All personal advances for your shares are settled.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 space-y-3">
                {debts.map((debt) => {
                  const isCompleted = debt.status === 'completed';
                  return (
                    <div
                      key={debt.id}
                      className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-semibold text-[#F3F6F6]">
                            Pay to {debt.creditor?.name}
                          </strong>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isCompleted
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-amber-500/15 text-amber-400'
                          }`}>
                            {debt.status}
                          </span>
                        </div>
                        <div className="text-xs text-[#94A3B8] mt-1">
                          <span>For: <strong className="text-white">{debt.expenseTitle || 'Group Expense'}</strong></span>
                          <span className="mx-1.5">•</span>
                          <span>Crew: {debt.groupName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <div className="text-right">
                          <strong className="text-base font-bold text-amber-300 font-mono block">
                            {formatUSD(debt.remainingAmount || debt.amount)}
                          </strong>
                          <small className="text-[10px] text-[#94A3B8]">
                            of {formatUSD(debt.amount)}
                          </small>
                        </div>

                        {!isCompleted && (
                          <button
                            type="button"
                            onClick={() => handleSettleDebt(debt)}
                            disabled={paymentLoading}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white font-bold text-xs shadow-md hover:brightness-110 flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <span>Reimburse</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Credits Owed to You */}
          <div className="p-6 rounded-3xl bg-[#171426] border border-white/5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                  CREDITS OWED TO YOU
                </span>
                <h2 className="text-lg font-bold text-[#F3F6F6] mt-0.5">Who Owes You</h2>
                <p className="text-xs text-[#94A3B8]">
                  Reimbursements you are waiting to receive for your personal advances.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#94A3B8] block">Total Incoming</span>
                <strong className="text-lg font-bold text-emerald-400 font-mono">
                  {formatUSD(settlements.summary?.totalOwedToUser || 0)} USD
                </strong>
              </div>
            </div>

            {credits.length === 0 ? (
              <div className="py-12 text-center text-[#94A3B8] space-y-2">
                <Clock className="w-10 h-10 text-[#a66bff]/30 mx-auto" />
                <h3 className="text-sm font-semibold text-[#F3F6F6]">No pending credits</h3>
                <p className="text-xs max-w-xs mx-auto">
                  When you personally pay for a group expense, other members' obligations will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 space-y-3">
                {credits.map((credit) => (
                  <div
                    key={credit.id}
                    className="pt-3 flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-semibold text-[#F3F6F6]">
                          {credit.debtor?.name} owes you
                        </strong>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          credit.status === 'completed'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}>
                          {credit.status}
                        </span>
                      </div>
                      <div className="text-xs text-[#94A3B8] mt-1">
                        <span>For: <strong className="text-white">{credit.expenseTitle || 'Group Expense'}</strong></span>
                        <span className="mx-1.5">•</span>
                        <span>{credit.groupName}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <strong className="text-base font-bold text-emerald-300 font-mono block">
                        +{formatUSD(credit.remainingAmount || credit.amount)} USD
                      </strong>
                      <small className="text-[10px] text-[#94A3B8]">
                        {credit.status === 'completed' ? 'Fully settled' : `Settled: ${formatUSD(credit.settledAmount || 0)}`}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GROUP POOL DEPOSIT */}
      {activeTab === 'pool' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 sm:p-8 rounded-3xl bg-[#171426] border border-[#a66bff]/30 backdrop-blur-xl relative overflow-hidden shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5 mb-6">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-[#a66bff] uppercase">
                  SHARED GROUP POOL
                </span>
                <h2 className="text-xl font-bold text-[#F3F6F6] mt-0.5">
                  Deposit to {activeGroup?.name || 'Group Pool'}
                </h2>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Deposits increase the available group pool balance for joint spending.
                </p>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                Available: {formatUSD(poolData.availablePoolBalance || 0)} USD
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <label className="text-xs font-semibold text-[#94A3B8]">
                Deposit Amount (USD)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-[#7E8B99] font-mono">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 rounded-2xl bg-[#090810] border border-[#a66bff]/40 text-xl font-bold text-[#F3F6F6] font-mono focus:outline-none focus:border-[#a66bff] transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                {[10, 25, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCustomAmount(preset)}
                    className="px-3 py-1 rounded-xl bg-white/[0.04] hover:bg-white/10 text-xs text-[#c49cff] font-semibold border border-white/5 transition-all cursor-pointer"
                  >
                    +${preset}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={paymentLoading || !customAmount || Number(customAmount) <= 0}
              onClick={handleDepositToPool}
              className="w-full py-4 px-6 rounded-2xl text-sm font-bold flex items-center justify-center gap-3 transition-all cursor-pointer bg-gradient-to-r from-[#a66bff] via-[#8b43f6] to-[#6125c8] text-white hover:brightness-110 shadow-[0_0_25px_rgba(166,107,255,0.4)] disabled:opacity-50"
            >
              {paymentLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Connecting to PayPal Sandbox...</span>
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4" />
                  <span>Deposit {formatUSD(Number(customAmount) || 0)} USD via PayPal</span>
                  <ArrowUpRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Right 1 Col: Pool Status */}
          <div className="p-6 rounded-3xl bg-[#100d1d]/90 border border-white/5 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-[10px] font-bold tracking-widest text-[#94A3B8] uppercase">
                POOL RECONCILIATION
              </span>
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                  <span className="text-xs text-[#94A3B8]">Target Collection:</span>
                  <strong className="text-sm font-mono text-[#F3F6F6]">{formatUSD(poolData.targetAmount)}</strong>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                  <span className="text-xs text-[#94A3B8]">Confirmed Deposits:</span>
                  <strong className="text-sm font-mono text-emerald-400">+{formatUSD(poolData.totalPool)}</strong>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                  <span className="text-xs text-[#94A3B8]">Pool Expenses Paid:</span>
                  <strong className="text-sm font-mono text-rose-400">-{formatUSD(poolData.poolFundedExpenses || 0)}</strong>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300">Available Pool Balance:</span>
                  <strong className="text-lg font-mono text-emerald-400">{formatUSD(poolData.availablePoolBalance || 0)}</strong>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#94A3B8] pt-4 border-t border-white/5">
              Available balance enforces spending limits so the group can never spend more than has been collected.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
