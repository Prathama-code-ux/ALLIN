import React, { useEffect, useCallback } from 'react';
import { Check, AlertCircle } from 'lucide-react';

export default function SplitCalculator({
  members = [],
  totalAmount = 0,
  splitType = 'equal',
  onSplitTypeChange,
  splits = [],
  onSplitsChange,
}) {
  const numericTotal = Number(totalAmount) || 0;

  // Calculate equal splits cleanly
  const recalculateEqualSplits = useCallback(
    (currentSplits) => {
      if (numericTotal <= 0) return currentSplits;

      const activeUserIds = currentSplits
        .filter((s) => s.included !== false)
        .map((s) => s.user._id || s.user.id || s.user);

      if (activeUserIds.length === 0) return currentSplits;

      const shareEach = Math.floor((numericTotal / activeUserIds.length) * 100) / 100;
      const totalAllocated = shareEach * activeUserIds.length;
      const remainder = Math.round((numericTotal - totalAllocated) * 100) / 100;

      return currentSplits.map((split) => {
        const uId = split.user._id || split.user.id || split.user;
        const isIncluded = activeUserIds.includes(uId);

        if (!isIncluded) {
          return { ...split, amount: 0, included: false };
        }

        // Add remainder cents to the first included member
        const isFirstActive = activeUserIds[0] === uId;
        const finalAmount = isFirstActive
          ? Math.round((shareEach + remainder) * 100) / 100
          : shareEach;

        return {
          ...split,
          amount: finalAmount,
          included: true,
        };
      });
    },
    [numericTotal]
  );

  // Initialize splits when members change
  useEffect(() => {
    if (members.length > 0 && splits.length === 0) {
      const initial = members.map((m) => ({
        user: m,
        amount: 0,
        status: 'pending',
        included: true,
      }));
      onSplitsChange(recalculateEqualSplits(initial));
    }
  }, [members, splits.length, onSplitsChange, recalculateEqualSplits]);

  // When totalAmount or splitType changes to equal, re-distribute
  useEffect(() => {
    if (splitType === 'equal' && splits.length > 0) {
      const updated = recalculateEqualSplits(splits);
      onSplitsChange(updated);
    }
  }, [numericTotal, splitType, recalculateEqualSplits, splits, onSplitsChange]);

  const handleToggleMember = (userId) => {
    const updated = splits.map((s) => {
      const uId = s.user._id || s.user.id || s.user;
      if (uId === userId) {
        return { ...s, included: !s.included };
      }
      return s;
    });

    if (splitType === 'equal') {
      onSplitsChange(recalculateEqualSplits(updated));
    } else {
      onSplitsChange(updated);
    }
  };

  const handleCustomAmountChange = (userId, newAmount) => {
    const updated = splits.map((s) => {
      const uId = s.user._id || s.user.id || s.user;
      if (uId === userId) {
        return { ...s, amount: Math.max(0, Number(newAmount) || 0) };
      }
      return s;
    });
    onSplitsChange(updated);
  };

  // Custom split tally
  const currentSum = splits.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
  const roundedSum = Math.round(currentSum * 100) / 100;
  const remaining = Math.round((numericTotal - roundedSum) * 100) / 100;
  const isBalanced = Math.abs(remaining) < 0.01 && numericTotal > 0;

  return (
    <div className="space-y-4 text-left">
      {/* Split Type Selector */}
      <div>
        <label className="block text-xs font-semibold tracking-wider text-[#94A3B8] uppercase mb-2">
          Split Type
        </label>
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#080B0D] border border-white/8">
          <button
            type="button"
            onClick={() => onSplitTypeChange('equal')}
            className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              splitType === 'equal'
                ? 'bg-[#00E5D4] text-[#080B0D] shadow-[0_0_15px_rgba(0,229,212,0.3)]'
                : 'text-[#94A3B8] hover:text-[#F3F6F6]'
            }`}
          >
            Equal Split
          </button>
          <button
            type="button"
            onClick={() => onSplitTypeChange('custom')}
            className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              splitType === 'custom'
                ? 'bg-[#00E5D4] text-[#080B0D] shadow-[0_0_15px_rgba(0,229,212,0.3)]'
                : 'text-[#94A3B8] hover:text-[#F3F6F6]'
            }`}
          >
            Custom Split
          </button>
        </div>
      </div>

      {/* Participants Selection & Breakdown */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold tracking-wider text-[#94A3B8] uppercase">
            Participants ({splits.filter((s) => s.included !== false).length} of {members.length})
          </label>
          <span className="text-[11px] text-[#64748B]">Click checkbox to toggle</span>
        </div>

        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {splits.map((split) => {
            const memberObj = split.user;
            const uId = memberObj._id || memberObj.id || memberObj;
            const name = memberObj.name || 'Member';
            const email = memberObj.email || '';
            const isIncluded = split.included !== false;

            return (
              <div
                key={uId}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isIncluded
                    ? 'bg-[#111719] border-white/10'
                    : 'bg-white/[0.01] border-white/5 opacity-40'
                }`}
              >
                {/* Participant identity checkbox */}
                <div
                  onClick={() => handleToggleMember(uId)}
                  className="flex items-center gap-2.5 cursor-pointer select-none flex-1 min-w-0"
                >
                  <div
                    className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${
                      isIncluded
                        ? 'bg-[#00E5D4] border-[#00E5D4] text-[#080B0D]'
                        : 'border-white/20 bg-transparent'
                    }`}
                  >
                    {isIncluded && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#F3F6F6] truncate">{name}</p>
                    {email && (
                      <p className="text-[10px] text-[#64748B] font-mono truncate">{email}</p>
                    )}
                  </div>
                </div>

                {/* Amount display / input */}
                <div className="shrink-0 ml-3">
                  {splitType === 'equal' ? (
                    <span className="text-xs font-mono font-semibold text-[#00E5D4] bg-[#00E5D4]/10 px-2.5 py-1 rounded-lg border border-[#00E5D4]/20">
                      ${Number(split.amount || 0).toFixed(2)}
                    </span>
                  ) : (
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#94A3B8]">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={!isIncluded}
                        value={split.amount || ''}
                        onChange={(e) => handleCustomAmountChange(uId, e.target.value)}
                        placeholder="0.00"
                        className="w-24 bg-[#080B0D] text-xs font-mono text-right text-[#F3F6F6] rounded-lg pl-6 pr-2.5 py-1.5 border border-white/15 focus:border-[#00E5D4] focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Balance Summary for Custom Split */}
      {splitType === 'custom' && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
            isBalanced
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-1.5">
            {isBalanced ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400" />
            )}
            <span>
              {isBalanced ? 'Splits are balanced perfectly' : `Remaining: $${remaining.toFixed(2)}`}
            </span>
          </div>
          <span className="font-mono font-semibold">
            ${roundedSum.toFixed(2)} / ${numericTotal.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
