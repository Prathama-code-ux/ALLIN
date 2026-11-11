import React from 'react';
import { Users, CheckCircle2, Clock, ArrowRight, Shield } from 'lucide-react';

const formatMoney = (amount) => `$${Number(amount || 0).toFixed(2)}`;

export default function Contributions({
  contributions = [],
  onPayNow,
  onApproveSplit,
  paymentLoading,
  paymentCompleted,
  currentUserId,
}) {
  return (
    <div className="p-6 rounded-3xl bg-[#100d1d]/90 backdrop-blur-md border border-white/5 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-5 border-b border-white/5">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-[#a66bff] uppercase">
              CREW SPLITS & SHARES
            </span>
            <h2 className="text-xl font-bold text-[#F3F6F6] font-['Plus_Jakarta_Sans'] mt-0.5">
              Group Contributions
            </h2>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold text-[#94A3B8] bg-white/5 border border-white/5">
            {contributions.length} MEMBERS
          </span>
        </div>

        {contributions.length === 0 ? (
          <div className="py-12 text-center text-[#94A3B8] space-y-2">
            <Users className="w-10 h-10 mx-auto text-[#a66bff]/40" />
            <h3 className="text-base font-semibold text-[#F3F6F6]">No crew members yet</h3>
            <p className="text-xs max-w-xs mx-auto">
              Share your group invite code from the "My Groups" tab to add friends and split payments.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 mt-2">
            {contributions.map((member) => {
              const isCurrentUser =
                currentUserId &&
                (member.userId === currentUserId || member.id === currentUserId);

              const isPaid =
                member.status === 'COMPLETED' ||
                (isCurrentUser && paymentCompleted);

              const splits = member.splits || [];
              const pendingSplits = member.pendingSplits || [];

              return (
                <div
                  key={member.id || member.name}
                  className="py-4 space-y-3 transition-colors rounded-xl px-2 hover:bg-white/[0.02]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#a66bff]/30 via-[#8b43f6]/20 to-[#6125c8]/30 border border-[#a66bff]/30 flex items-center justify-center font-bold text-sm text-[#F3F6F6] shadow-sm">
                        {member.initials || 'U'}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-semibold text-[#F3F6F6]">
                            {member.name}
                          </strong>
                          {isCurrentUser && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#a66bff]/20 text-[#c49cff] border border-[#a66bff]/30">
                              You
                            </span>
                          )}
                          <span className="text-[10px] text-[#94A3B8] uppercase">
                            • {member.role}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="w-24 sm:w-32 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#a66bff] to-[#00E5D4]"
                              style={{
                                width: `${isPaid ? 100 : member.percentage}%`,
                              }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-[#94A3B8]">
                            {isPaid ? 100 : member.percentage}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-[#F3F6F6]">
                        {formatMoney(member.amount)}
                      </div>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isPaid
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                        }`}
                      >
                        {isPaid ? 'PAID' : 'PENDING'}
                      </span>
                    </div>
                  </div>

                  {/* Individual Split Breakdown & Actions for Current User */}
                  {splits.length > 0 && (
                    <div className="pt-2 pl-12 space-y-2">
                      {splits.map((s, idx) => {
                        const splitPaid = s.status === 'paid' || (isCurrentUser && paymentCompleted);
                        const splitApproved = s.status === 'approved';

                        return (
                          <div
                            key={s.expenseId || idx}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[#94A3B8] font-medium">
                                {s.expenseTitle || 'Shared Expense'}
                              </span>
                              <span className="font-bold text-[#F3F6F6]">
                                {formatMoney(s.amount)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {splitPaid ? (
                                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Paid via PayPal</span>
                                </span>
                              ) : isCurrentUser ? (
                                <>
                                  {!splitApproved && onApproveSplit && (
                                    <button
                                      type="button"
                                      onClick={() => onApproveSplit(s.expenseId)}
                                      disabled={paymentLoading}
                                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#c49cff] bg-[#a66bff]/15 hover:bg-[#a66bff]/25 border border-[#a66bff]/30 transition-all cursor-pointer"
                                    >
                                      Approve Share
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      onPayNow({
                                        expenseId: s.expenseId,
                                        amount: s.amount,
                                      })
                                    }
                                    disabled={paymentLoading}
                                    className="px-3 py-1 rounded-lg text-[11px] font-bold text-white bg-gradient-to-r from-[#a66bff] to-[#8b43f6] hover:brightness-110 shadow-sm transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <span>Pay ({formatMoney(s.amount)})</span>
                                    <span className="text-[9px] uppercase opacity-75">Sandbox</span>
                                  </button>
                                </>
                              ) : (
                                <span className="text-[11px] font-medium text-amber-400 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>{s.status === 'approved' ? 'Approved' : 'Pending Review'}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Fallback Pay Button for user when no split breakdown is detailed */}
                  {splits.length === 0 && !isPaid && isCurrentUser && onPayNow && (
                    <div className="pt-1 pl-12 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onPayNow(member.amount)}
                        disabled={paymentLoading}
                        className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#a66bff] to-[#8b43f6] hover:brightness-110 shadow-[0_0_15px_rgba(166,107,255,0.3)] transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <span>Pay via PayPal Sandbox</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
