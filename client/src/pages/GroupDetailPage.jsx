import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Copy,
  Check,
  Users,
  Plus,
  Receipt,
  DollarSign,
  TrendingUp,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import groupService from '../services/groupService';
import expenseService from '../services/expenseService';
import useAuth from '../context/useAuth';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import AddExpenseModal from '../components/expenses/AddExpenseModal';
import PayPalModal from '../components/payments/PayPalModal';
import ExpenseCard from '../components/expenses/ExpenseCard';
import EmptyState from '../components/common/EmptyState';

export default function GroupDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [selectedSplitForPay, setSelectedSplitForPay] = useState(null);

  const loadGroupAndExpenses = async () => {
    setLoading(true);
    setError(null);
    try {
      const groupData = await groupService.getGroupById(id);
      setGroup(groupData.group);

      const expenseData = await expenseService.getGroupExpenses(id);
      setExpenses(expenseData.expenses || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    Promise.all([
      groupService.getGroupById(id),
      expenseService.getGroupExpenses(id),
    ])
      .then(([groupData, expenseData]) => {
        if (!ignore) {
          setGroup(groupData.group);
          setExpenses(expenseData.expenses || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.response?.data?.message || 'Failed to load group details');
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [id]);

  const handleCopyCode = () => {
    if (!group?.inviteCode) return;
    navigator.clipboard.writeText(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculations
  const members = group?.members || [];
  const createdBy = group?.createdBy;

  const totalSpent = expenses.reduce((sum, e) => sum + (Number(e.totalAmount) || 0), 0);

  // Calculate user's personal share across all group expenses
  const myTotalShare = expenses.reduce((sum, e) => {
    const mySplit = (e.splits || []).find(
      (s) => (s.user._id || s.user.id || s.user) === user?.id
    );
    return sum + (mySplit ? Number(mySplit.amount) || 0 : 0);
  }, 0);

  // Settlement progress: total paid splits / total splits
  const allSplits = expenses.flatMap((e) => e.splits || []);
  const paidSplits = allSplits.filter((s) => s.status === 'paid');
  const settlementPercentage =
    allSplits.length > 0 ? Math.round((paidSplits.length / allSplits.length) * 100) : 100;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-32 bg-[#111719] rounded-xl" />
        <div className="h-44 bg-[#111719] rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-28 bg-[#111719] rounded-2xl" />
          <div className="h-28 bg-[#111719] rounded-2xl" />
          <div className="h-28 bg-[#111719] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-[#F3F6F6]">Group Unavailable</h2>
        <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
          {error || "Could not retrieve the requested group's details."}
        </p>
        <Link to="/groups">
          <Button variant="secondary" icon={ArrowLeft}>
            Back to Groups
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <Link
          to="/groups"
          className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#00E5D4] transition-colors py-1.5 px-3 rounded-xl hover:bg-white/5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Groups</span>
        </Link>

        <button
          onClick={loadGroupAndExpenses}
          title="Refresh Group"
          className="p-2 rounded-xl text-[#94A3B8] hover:text-[#00E5D4] hover:bg-white/5 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Group Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#111719] via-[#161E21] to-[#0A1214] border border-[#00E5D4]/20 p-6 sm:p-8 shadow-[0_0_35px_rgba(0,229,212,0.08)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-[#00E5D4] tracking-wider uppercase font-semibold">
                Fintech Squad
              </span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span className="text-xs text-[#94A3B8]">
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F3F6F6] tracking-tight">
              {group.name}
            </h1>

            {/* Invite code pill */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs text-[#94A3B8]">Invite Code:</span>
              <button
                onClick={handleCopyCode}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#080B0D] hover:bg-[#00E5D4]/10 border border-white/10 hover:border-[#00E5D4]/30 text-xs font-mono font-bold text-[#00E5D4] transition-all cursor-pointer shadow-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied to clipboard!</span>
                  </>
                ) : (
                  <>
                    <span>{group.inviteCode}</span>
                    <Copy className="w-3.5 h-3.5 text-[#94A3B8]" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action button */}
          <div className="shrink-0">
            <Button
              variant="primary"
              size="lg"
              icon={Plus}
              onClick={() => setIsAddExpenseOpen(true)}
              className="shadow-[0_0_20px_rgba(0,229,212,0.3)] w-full sm:w-auto"
            >
              Add Expense
            </Button>
          </div>
        </div>

        {/* Payment Progress Bar */}
        <div className="mt-6 pt-6 border-t border-white/5">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-[#94A3B8] font-medium flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#00E5D4]" /> Settlement Progress
            </span>
            <span className="font-mono font-bold text-[#00E5D4]">
              {settlementPercentage}% Settled
            </span>
          </div>
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00E5D4] to-[#087E78] rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(0,229,212,0.5)]"
              style={{ width: `${settlementPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Total Group Spend</span>
            <Receipt className="w-4 h-4 text-[#00E5D4]" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-[#F3F6F6] mt-3">
            ${totalSpent.toFixed(2)}
          </div>
          <span className="text-[11px] text-[#64748B] mt-1 block">
            Across {expenses.length} recorded items
          </span>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Your Personal Share</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-400 mt-3">
            ${myTotalShare.toFixed(2)}
          </div>
          <span className="text-[11px] text-[#64748B] mt-1 block">
            Calculated across all splits
          </span>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Active Members</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-3">
            {members.length}
          </div>
          <span className="text-[11px] text-[#64748B] mt-1 block">
            Connected in this squad
          </span>
        </Card>
      </div>

      {/* Members Bar */}
      <Card className="p-5">
        <h3 className="text-xs font-semibold tracking-wider text-[#94A3B8] uppercase mb-3">
          Group Members ({members.length})
        </h3>
        <div className="flex flex-wrap gap-2.5">
          {members.map((m) => {
            const mId = m._id || m.id || m;
            const name = m.name || 'Member';
            const email = m.email || '';
            const isCreator = (createdBy?._id || createdBy) === mId;
            const isMe = mId === user?.id;

            return (
              <div
                key={mId}
                title={email}
                className="flex items-center gap-2 py-1.5 px-3 rounded-xl bg-[#080B0D] border border-white/8 text-xs"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#00E5D4]/30 to-[#087E78]/30 text-[#00E5D4] flex items-center justify-center font-bold text-[10px]">
                  {name.charAt(0).toUpperCase()}
                </div>
                <span className="text-[#F3F6F6] font-medium">
                  {name} {isMe ? '(You)' : ''}
                </span>
                {isCreator && (
                  <Badge variant="cyan" size="sm" className="text-[9px]">
                    Admin
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Expense History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#F3F6F6]">Expense History</h2>
          <Button
            variant="outline"
            size="sm"
            icon={Plus}
            onClick={() => setIsAddExpenseOpen(true)}
            className="text-xs"
          >
            Add Expense
          </Button>
        </div>

        {expenses.length > 0 ? (
          <div className="space-y-3">
            {expenses.map((expense) => (
              <ExpenseCard
                key={expense._id}
                expense={expense}
                members={members}
                onPaySplit={(exp, split) => {
                  setSelectedSplitForPay({ expense: exp, split });
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Receipt}
            title="No expenses logged yet"
            description="Start adding expenses to split trip costs, dinner checks, or bills with your group members."
            actionText="Add First Expense"
            actionIcon={Plus}
            onAction={() => setIsAddExpenseOpen(true)}
          />
        )}
      </div>

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        group={group}
        onSuccess={loadGroupAndExpenses}
      />

      {/* PayPal Settlement Modal */}
      {selectedSplitForPay && (
        <PayPalModal
          isOpen={Boolean(selectedSplitForPay)}
          onClose={() => setSelectedSplitForPay(null)}
          expense={selectedSplitForPay.expense}
          split={selectedSplitForPay.split}
          group={group}
          onSuccess={() => {
            loadGroupAndExpenses();
            setSelectedSplitForPay(null);
          }}
        />
      )}
    </div>
  );
}
