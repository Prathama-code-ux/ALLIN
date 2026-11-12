import React, { useState } from 'react';
import { History, Search, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { formatUSD } from '../../utils/currency';

export default function Transactions({ transactions = [] }) {
  const [search, setSearch] = useState('');

  const filtered = transactions.filter((txn) => {
    const q = search.toLowerCase();
    return (
      String(txn.name || '').toLowerCase().includes(q) ||
      String(txn.id || txn._id || '').toLowerCase().includes(q) ||
      String(txn.status || '').toLowerCase().includes(q) ||
      String(txn.type || '').toLowerCase().includes(q) ||
      String(txn.expenseTitle || '').toLowerCase().includes(q) ||
      String(txn.counterpartyName || '').toLowerCase().includes(q)
    );
  });

  const getTypeBadge = (type) => {
    switch (type) {
      case 'CONTRIBUTION':
        return { label: 'Contribution', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' };
      case 'POOL_EXPENSE':
        return { label: 'Pool Expense', color: 'bg-rose-500/15 text-rose-400 border-rose-500/25' };
      case 'PERSONAL_ADVANCE':
        return { label: 'Personal Advance', color: 'bg-[#a66bff]/15 text-[#c49cff] border-[#a66bff]/25' };
      case 'REIMBURSEMENT':
        return { label: 'Reimbursement', color: 'bg-amber-500/15 text-amber-400 border-amber-500/25' };
      default:
        return { label: type || 'Payment', color: 'bg-white/10 text-white border-white/20' };
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-[#100d1d]/90 backdrop-blur-md border border-white/5 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/5">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-[#a66bff] uppercase">
              ACTIVITY & SETTLEMENTS
            </span>
            <h2 className="text-xl font-bold text-[#F3F6F6] font-['Plus_Jakarta_Sans'] mt-0.5">
              Financial Audit Ledger
            </h2>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold text-[#94A3B8] bg-white/5 border border-white/5 self-start sm:self-auto">
            {filtered.length} TRANSACTIONS
          </span>
        </div>

        {/* Filter Input */}
        <div className="relative my-4">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="search"
            placeholder="Search by name, ID, expense, or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-[#F3F6F6] placeholder-[#94A3B8] focus:outline-none focus:border-[#a66bff]/60 focus:ring-1 focus:ring-[#a66bff]/40 transition-all"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-[#94A3B8] space-y-2">
            <History className="w-10 h-10 mx-auto text-[#a66bff]/40" />
            <h3 className="text-base font-semibold text-[#F3F6F6]">No transactions recorded</h3>
            <p className="text-xs max-w-xs mx-auto">
              Completed PayPal Sandbox payments, pool expenses, and settlements will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 max-h-[380px] overflow-y-auto pr-1">
            {filtered.map((txn) => {
              const status = String(txn.status || '').trim().toUpperCase();
              const isCompleted = ['COMPLETED', 'CAPTURED'].includes(status);
              const isFailed = ['FAILED', 'CANCELLED', 'CANCELED'].includes(status);
              const badge = getTypeBadge(txn.type);
              const isOutflow = txn.type === 'POOL_EXPENSE';

              return (
                <div
                  key={txn.id || txn._id}
                  className="py-3.5 flex items-center justify-between gap-3 px-2 rounded-xl transition-colors hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                          : isFailed
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                      }`}
                    >
                      {txn.initials || 'TX'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs sm:text-sm font-semibold text-[#F3F6F6] truncate">
                          {txn.name || 'Member Payment'}
                        </strong>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-[#94A3B8] mt-0.5">
                        <span>{txn.date || 'Recent'}</span>
                        {txn.counterpartyName && (
                          <span>• To: <strong className="text-white">{txn.counterpartyName}</strong></span>
                        )}
                        {txn.expenseTitle && (
                          <span className="truncate max-w-[140px] text-[#c49cff]">
                            • {txn.expenseTitle}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`text-xs sm:text-sm font-bold font-mono ${isOutflow ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {isOutflow ? '-' : '+'}{formatUSD(txn.amount)} USD
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        isCompleted
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                          : isFailed
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>COMPLETED</span>
                        </>
                      ) : isFailed ? (
                        <>
                          <XCircle className="w-2.5 h-2.5" />
                          <span>FAILED</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-2.5 h-2.5" />
                          <span>PENDING</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
