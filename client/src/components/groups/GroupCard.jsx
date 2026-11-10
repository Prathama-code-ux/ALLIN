import React, { useState } from 'react';
import { Copy, Check, ChevronRight, Calendar } from 'lucide-react';
import Card from '../common/Card';

export default function GroupCard({ group, onSelect }) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = (e) => {
    e.stopPropagation();
    if (!group?.inviteCode) return;
    navigator.clipboard.writeText(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const members = group.members || [];
  const groupId = group._id || group.id;

  // Format creation date
  const formattedDate = group.createdAt
    ? new Date(group.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <Card
      variant="interactive"
      onClick={() => onSelect && onSelect(groupId)}
      className="p-5 flex flex-col justify-between group h-full"
    >
      <div>
        {/* Top line: Name and invite code pill */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-[#F3F6F6] truncate group-hover:text-[#00E5D4] transition-colors">
              {group.name}
            </h3>
            {formattedDate && (
              <span className="flex items-center gap-1 text-[11px] text-[#64748B] mt-0.5">
                <Calendar className="w-3 h-3" /> Created {formattedDate}
              </span>
            )}
          </div>

          {/* Invite Code Pill */}
          {group.inviteCode && (
            <button
              onClick={handleCopyCode}
              title="Click to copy invite code"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-[#00E5D4]/15 border border-white/10 hover:border-[#00E5D4]/30 text-xs font-mono font-semibold text-[#00E5D4] transition-all cursor-pointer shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 text-[11px]">Copied</span>
                </>
              ) : (
                <>
                  <span>{group.inviteCode}</span>
                  <Copy className="w-3 h-3 text-[#94A3B8]" />
                </>
              )}
            </button>
          )}
        </div>

        {/* Members Avatars preview */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
          <div className="flex -space-x-2 overflow-hidden">
            {members.slice(0, 4).map((m, idx) => {
              const name = typeof m === 'object' ? m?.name : `Member ${idx + 1}`;
              const initial = name ? name.charAt(0).toUpperCase() : 'M';
              return (
                <div
                  key={m._id || m.id || idx}
                  title={name}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#161E21] border-2 border-[#111719] text-[10px] font-bold text-[#F3F6F6] ring-1 ring-white/10"
                >
                  {initial}
                </div>
              );
            })}
            {members.length > 4 && (
              <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#087E78]/40 border-2 border-[#111719] text-[10px] font-bold text-[#00E5D4]">
                +{members.length - 4}
              </div>
            )}
          </div>

          <span className="text-xs text-[#94A3B8] font-medium ml-1">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </span>
        </div>
      </div>

      {/* Bottom action indicator */}
      <div className="mt-4 pt-3 flex items-center justify-between text-xs text-[#64748B] group-hover:text-[#00E5D4] transition-colors border-t border-white/5">
        <span className="font-medium">View Group & Splits</span>
        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Card>
  );
}
