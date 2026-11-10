import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Filter, RefreshCw } from 'lucide-react';
import expenseService from '../services/expenseService';
import groupService from '../services/groupService';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import ExpenseCard from '../components/expenses/ExpenseCard';
import AddExpenseModal from '../components/expenses/AddExpenseModal';
import PayPalModal from '../components/payments/PayPalModal';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState('all');

  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [selectedSplitForPay, setSelectedSplitForPay] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [expData, groupData] = await Promise.all([
        expenseService.getAllExpenses(),
        groupService.getMyGroups(),
      ]);
      setExpenses(expData.expenses || []);
      setGroups(groupData.groups || []);
    } catch (err) {
      console.warn('Expenses page data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    Promise.all([
      expenseService.getAllExpenses(),
      groupService.getMyGroups(),
    ])
      .then(([expData, groupData]) => {
        if (!ignore) {
          setExpenses(expData.expenses || []);
          setGroups(groupData.groups || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.warn('Expenses page fetch error:', err);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const filteredExpenses =
    selectedGroupId === 'all'
      ? expenses
      : expenses.filter((e) => String(e.group) === String(selectedGroupId));

  const allMembers = groups.flatMap((g) => g.members || []);

  const selectedGroup =
    selectedGroupId !== 'all' ? groups.find((g) => g._id === selectedGroupId) : groups[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F3F6F6] tracking-tight">
            Expenses
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
            Global ledger of group expenses and split calculations
          </p>
        </div>

        {groups.length > 0 && (
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={() => setIsAddExpenseOpen(true)}
            className="text-xs shadow-[0_0_20px_rgba(0,229,212,0.25)] shrink-0"
          >
            Add Expense
          </Button>
        )}
      </div>

      {/* Filter and Group Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#64748B]" />
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="bg-[#111719] text-xs text-[#F3F6F6] rounded-xl px-3.5 py-2.5 border border-white/8 focus:border-[#00E5D4]/40 focus:outline-none cursor-pointer"
          >
            <option value="all">All Groups ({groups.length})</option>
            {groups.map((g) => (
              <option key={g._id || g.id} value={g._id || g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={loadData}
          title="Refresh"
          className="p-2 rounded-xl text-[#94A3B8] hover:text-[#00E5D4] hover:bg-white/5 transition-colors cursor-pointer self-end sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Expenses List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-[#111719]/60 border border-white/5 animate-pulse"
            />
          ))}
        </div>
      ) : filteredExpenses.length > 0 ? (
        <div className="space-y-3">
          {filteredExpenses.map((expense) => {
            const expenseGroup = groups.find((g) => g._id === expense.group);
            return (
              <ExpenseCard
                key={expense._id}
                expense={expense}
                members={allMembers}
                onPaySplit={(exp, split) => {
                  setSelectedSplitForPay({ expense: exp, split, group: expenseGroup });
                }}
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Receipt}
          title={selectedGroupId === 'all' ? 'No expenses recorded yet' : 'No expenses in this group'}
          description="Log expenses to split shared meals, bookings, or costs transparently."
          actionText={groups.length > 0 ? 'Create Expense' : undefined}
          actionIcon={Plus}
          onAction={groups.length > 0 ? () => setIsAddExpenseOpen(true) : undefined}
        />
      )}

      {/* Modals */}
      {selectedGroup && (
        <AddExpenseModal
          isOpen={isAddExpenseOpen}
          onClose={() => setIsAddExpenseOpen(false)}
          group={selectedGroup}
          onSuccess={loadData}
        />
      )}

      {selectedSplitForPay && (
        <PayPalModal
          isOpen={Boolean(selectedSplitForPay)}
          onClose={() => setSelectedSplitForPay(null)}
          expense={selectedSplitForPay.expense}
          split={selectedSplitForPay.split}
          group={selectedSplitForPay.group}
          onSuccess={() => {
            loadData();
            setSelectedSplitForPay(null);
          }}
        />
      )}
    </div>
  );
}
