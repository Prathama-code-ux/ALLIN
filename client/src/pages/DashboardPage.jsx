import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Plus,
  KeyRound,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Receipt,
  Sparkles,
} from 'lucide-react';
import useAuth from '../context/useAuth';
import groupService from '../services/groupService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import GroupCard from '../components/groups/GroupCard';
import CreateGroupModal from '../components/groups/CreateGroupModal';
import JoinGroupModal from '../components/groups/JoinGroupModal';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await groupService.getMyGroups();
      setGroups(data.groups || []);
    } catch (err) {
      console.warn('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    groupService
      .getMyGroups()
      .then((data) => {
        if (!ignore) {
          setGroups(data.groups || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.warn('Dashboard fetch error:', err);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Derived metrics
  const groupCount = groups.length;
  // Get all members count across unique groups
  const totalCollaborators = new Set(
    groups.flatMap((g) => (g.members || []).map((m) => (typeof m === 'object' ? m._id : m)))
  ).size;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Hero / Personalized Greeting Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#111719] via-[#161E21] to-[#0A1214] border border-[#00E5D4]/20 p-6 sm:p-8 shadow-[0_0_35px_rgba(0,229,212,0.1)]">
        {/* Ambient Cyan Sheen Blob */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#00E5D4]/10 rounded-full blur-[90px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00E5D4]/10 border border-[#00E5D4]/30 text-[#00E5D4] text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Collaborative Payments Hub
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#F3F6F6] tracking-tight">
              Welcome, <span className="text-[#00E5D4]">{user?.name || 'Member'}</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1.5 max-w-lg leading-relaxed">
              Track shared expenses, organize group trips, and settle payments smoothly together.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              variant="secondary"
              size="md"
              icon={KeyRound}
              onClick={() => setIsJoinOpen(true)}
              className="text-xs border-white/10 hover:border-[#00E5D4]/30"
            >
              Join Group
            </Button>

            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => setIsCreateOpen(true)}
              className="text-xs shadow-[0_0_20px_rgba(0,229,212,0.3)]"
            >
              Create Group
            </Button>
          </div>
        </div>
      </div>

      {/* Fintech Overview Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Groups */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Active Groups</span>
            <div className="w-8 h-8 rounded-xl bg-[#00E5D4]/10 flex items-center justify-center text-[#00E5D4]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#F3F6F6]">
              {loading ? '—' : groupCount}
            </div>
            <span className="text-[11px] text-[#64748B] mt-1 block">
              {totalCollaborators} collaborative members
            </span>
          </div>
        </Card>

        {/* Total Expenses */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Total Expenses</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#F3F6F6]">
              $0.00
            </div>
            <span className="text-[11px] text-[#64748B] mt-1 block">
              Logged across all groups
            </span>
          </div>
        </Card>

        {/* Pending Payments */}
        <Card className="p-5 flex flex-col justify-between border-amber-500/20 bg-[#111719]/95">
          <div className="flex items-center justify-between text-xs text-amber-400 font-medium">
            <span>Pending Payments</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-400">
              $0.00
            </div>
            <span className="text-[11px] text-[#64748B] mt-1 block">
              No outstanding balances
            </span>
          </div>
        </Card>

        {/* Amount Paid */}
        <Card className="p-5 flex flex-col justify-between border-emerald-500/20 bg-[#111719]/95">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
            <span>Settled / Paid</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">
              $0.00
            </div>
            <span className="text-[11px] text-[#64748B] mt-1 block">
              100% up to date
            </span>
          </div>
        </Card>
      </div>

      {/* Main Grid: My Groups & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: My Groups */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#F3F6F6]">My Groups</h2>
              {!loading && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-[#94A3B8]">
                  {groupCount}
                </span>
              )}
            </div>
            {groupCount > 0 && (
              <Link
                to="/groups"
                className="text-xs font-semibold text-[#00E5D4] hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-44 rounded-2xl bg-[#111719]/60 border border-white/5 animate-pulse"
                />
              ))}
            </div>
          ) : groupCount > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {groups.slice(0, 4).map((group) => (
                <GroupCard
                  key={group._id || group.id}
                  group={group}
                  onSelect={(groupId) => navigate(`/groups/${groupId}`)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="No groups joined yet"
              description="Create a group or ask a teammate for their 8-character invite code to get started."
              actionText="Create Group"
              actionIcon={Plus}
              onAction={() => setIsCreateOpen(true)}
            />
          )}
        </div>

        {/* Right Column: Recent Activity Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#F3F6F6]">Recent Activity</h2>
            <Link
              to="/activity"
              className="text-xs font-semibold text-[#00E5D4] hover:underline"
            >
              See all
            </Link>
          </div>

          <Card className="p-5 space-y-4">
            {groupCount > 0 ? (
              <div className="space-y-3.5">
                {groups.slice(0, 3).map((g) => (
                  <div
                    key={g._id || g.id}
                    className="flex items-start gap-3 pb-3 border-b border-white/5 last:border-0 last:pb-0"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#00E5D4]/10 border border-[#00E5D4]/20 flex items-center justify-center text-[#00E5D4] shrink-0 mt-0.5">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                      <p className="text-[#F3F6F6] font-medium truncate">
                        Joined <span className="text-[#00E5D4]">{g.name}</span>
                      </p>
                      <p className="text-[#64748B] text-[11px] mt-0.5">
                        Code: <span className="font-mono text-[#94A3B8]">{g.inviteCode}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-[#64748B]">
                <Clock className="w-8 h-8 mx-auto text-[#64748B]/50 mb-2" />
                <p>No recent transactions or activity.</p>
                <p className="mt-1 text-[11px]">Activity will appear when you split expenses.</p>
              </div>
            )}
          </Card>

          {/* Quick Tip / Security Note */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-[#94A3B8] flex items-start gap-3">
            <TrendingUp className="w-4 h-4 text-[#00E5D4] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#F3F6F6]">Collaborative Splits:</span> Every
              expense logged is transparently calculated among members with real-time auditability.
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateGroupModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={loadData}
      />

      <JoinGroupModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
}
