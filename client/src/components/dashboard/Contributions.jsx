import React from "react";
import { Users, CheckCircle2, Clock, ArrowRight, Shield, Wallet, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatUSD } from "../../utils/currency";

export default function Contributions({
  contributions = [],
  onPayNow,
  onApproveSplit,
  paymentLoading,
  paymentCompleted,
  currentUserId,
  onOpenSettlements,
}) {
  return (
    <div className="p-6 rounded-3xl bg-[#100d1d]/90 backdrop-blur-md border border-white/5 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-5 border-b border-white/5">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-[#a66bff] uppercase">
              CREW LEDGER & SHARES
            </span>
            <h2 className="text-xl font-bold text-[#F3F6F6] font-['Plus_Jakarta_Sans'] mt-0.5">
              Member Financial Status
            </h2>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold text-[#94A3B8] bg-white/5 border border-white/5">
            {contributions.length} MEMBERS
          </span>
        </div>

        {contributions.length === 0 ? (
          <div className="py-12 text-center text-[#94A3B8] space-y-2">
            <Users className="w-10 h-10 mx-auto text-[#a66bff]/40" />
            <h3 className="text-base font-semibold text-[#F3F6F6]">
              No crew members yet
            </h3>
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

              const userDeposited = Number(member.userDeposited ?? member.paidAmount ?? 0);
              const allocatedShare = Number(member.allocatedShare ?? member.totalOwed ?? 0);
              const personallyPaid = Number(member.personallyPaid ?? 0);
              const owes = Number(member.owes ?? 0);
              const owed = Number(member.owed ?? 0);

              const isPaid = owes === 0 && (member.pendingAmount === 0 || userDeposited > 0);

              return (
                <div
                  key={member.id || member.name}
                  className="py-4 space-y-2.5 transition-colors rounded-xl px-2 hover:bg-white/[0.02]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#a66bff]/30 via-[#8b43f6]/20 to-[#6125c8]/30 border border-[#a66bff]/30 flex items-center justify-center font-bold text-sm text-[#F3F6F6] shadow-sm shrink-0">
                        {member.initials || "U"}
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

                        {/* Breakdown pills */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-[#94A3B8]">
                          <span>
                            Deposited: <strong className="text-emerald-400 font-mono">{formatUSD(userDeposited)}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Share: <strong className="text-white font-mono">{formatUSD(allocatedShare)}</strong>
                          </span>
                          {personallyPaid > 0 && (
                            <>
                              <span>•</span>
                              <span>
                                Advances: <strong className="text-[#c49cff] font-mono">{formatUSD(personallyPaid)}</strong>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {owes > 0 ? (
                        <div>
                          <span className="text-[10px] text-amber-400 block font-semibold">Owes Members</span>
                          <span className="text-sm font-bold text-amber-300 font-mono">
                            {formatUSD(owes)} USD
                          </span>
                        </div>
                      ) : owed > 0 ? (
                        <div>
                          <span className="text-[10px] text-emerald-400 block font-semibold">Owed by Crew</span>
                          <span className="text-sm font-bold text-emerald-300 font-mono">
                            +{formatUSD(owed)} USD
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs font-bold text-emerald-400">Settled</span>
                          <span className="text-[10px] text-[#94A3B8] block">No debt</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Action for Current User if owes money */}
                  {isCurrentUser && owes > 0 && onOpenSettlements && (
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={onOpenSettlements}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        <span>Settle {formatUSD(owes)} Debt</span>
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
