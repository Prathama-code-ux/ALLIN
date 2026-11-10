import React, { useState } from 'react';
import { Receipt, Calendar, User, ChevronDown, ChevronUp, CreditCard } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import useAuth from '../../context/useAuth';

const CATEGORY_ICONS = {
  Food: '🍔',
  Transport: '🚕',
  Shopping: '🛍',
  Entertainment: '🎬',
  Bills: '📄',
  Health: '💊',
  Travel: '✈️',
  Other: '📦',
};

export default function ExpenseCard({
  expense,
  members = [],
  onPaySplit,
}) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);

  // Find member name by ID
  const getMemberName = (userId) => {
    const found = members.find((m) => (m._id || m.id || m) === userId);
    return found?.name || 'Member';
  };

  const paidByName = getMemberName(expense.paidBy);
  const isPaidByMe = expense.paidBy === user?.id;

  const splits = expense.splits || [];
  // Find current user's split if any
  const mySplit = splits.find(
    (s) => (s.user._id || s.user.id || s.user) === user?.id
  );

  const formattedDate = expense.createdAt
    ? new Date(expense.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const categoryEmoji = CATEGORY_ICONS[expense.category] || null;

  return (
    <Card className="p-4 sm:p-5 transition-all">
      {/* Top summary row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#00E5D4]/10 border border-[#00E5D4]/20 flex items-center justify-center text-[#00E5D4] shrink-0 mt-0.5 text-base">
            {categoryEmoji ? <span>{categoryEmoji}</span> : <Receipt className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm sm:text-base font-bold text-[#F3F6F6] truncate">
                {expense.title}
              </h4>
              {expense.category && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-[#94A3B8]">
                  {expense.category}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-[#94A3B8]">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3 text-[#64748B]" />
                <span>
                  Paid by <strong className="text-[#F3F6F6]">{isPaidByMe ? 'You' : paidByName}</strong>
                </span>
              </span>
              {formattedDate && (
                <>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="flex items-center gap-1 text-[#64748B]">
                    <Calendar className="w-3 h-3" /> {formattedDate}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Amount & Split Type Badge */}
        <div className="text-right shrink-0">
          <div className="text-base sm:text-lg font-bold font-mono text-[#00E5D4]">
            ${Number(expense.totalAmount).toFixed(2)}
          </div>
          <Badge
            variant={expense.splitType === 'equal' ? 'cyan' : 'slate'}
            size="sm"
            className="mt-1 uppercase tracking-wider text-[9px]"
          >
            {expense.splitType || 'equal'}
          </Badge>
        </div>
      </div>

      {/* Your Share alert & Pay CTA if pending and not paid by user */}
      {mySplit && !isPaidByMe && (
        <div className="mt-3.5 pt-3 border-t border-white/5 flex items-center justify-between text-xs bg-[#080B0D]/60 p-2.5 rounded-xl border border-white/5">
          <div>
            <span className="text-[#94A3B8]">Your share: </span>
            <span className="font-mono font-bold text-amber-400">
              ${Number(mySplit.amount).toFixed(2)}
            </span>
            <Badge
              variant={mySplit.status === 'paid' ? 'emerald' : 'amber'}
              size="sm"
              className="ml-2"
            >
              {mySplit.status}
            </Badge>
          </div>

          {mySplit.status === 'pending' && onPaySplit && (
            <Button
              variant="outline"
              size="sm"
              icon={CreditCard}
              onClick={() => onPaySplit(expense, mySplit)}
              className="text-[11px] py-1 h-7.5"
            >
              Settle Share
            </Button>
          )}
        </div>
      )}

      {/* Expand / Collapse splits toggle */}
      <div className="mt-3 pt-2 flex items-center justify-between text-xs text-[#64748B]">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 hover:text-[#00E5D4] transition-colors cursor-pointer"
        >
          <span>{splits.length} member splits</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded Split Breakdown */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-white/5 space-y-2 animate-fadeIn">
          {splits.map((s, idx) => {
            const memberId = s.user._id || s.user.id || s.user;
            const name = getMemberName(memberId);
            const isMe = memberId === user?.id;

            return (
              <div
                key={memberId || idx}
                className="flex items-center justify-between p-2 rounded-lg bg-[#080B0D]/50 text-xs border border-white/5"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#161E21] flex items-center justify-center text-[10px] text-[#94A3B8] font-bold">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[#F3F6F6] font-medium">
                    {name} {isMe ? '(You)' : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[#F3F6F6] font-semibold">
                    ${Number(s.amount).toFixed(2)}
                  </span>
                  <Badge
                    variant={s.status === 'paid' ? 'emerald' : 'amber'}
                    size="sm"
                  >
                    {s.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
