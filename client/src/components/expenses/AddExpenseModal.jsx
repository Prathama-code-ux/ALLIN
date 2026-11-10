import React, { useState } from 'react';
import { Receipt, DollarSign, Plus, AlertCircle, Tag } from 'lucide-react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import SplitCalculator from './SplitCalculator';
import expenseService from '../../services/expenseService';
import useAuth from '../../context/useAuth';

const EXPENSE_CATEGORIES = [
  { name: 'Food', icon: '🍔' },
  { name: 'Transport', icon: '🚕' },
  { name: 'Shopping', icon: '🛍' },
  { name: 'Entertainment', icon: '🎬' },
  { name: 'Bills', icon: '📄' },
  { name: 'Health', icon: '💊' },
  { name: 'Travel', icon: '✈️' },
  { name: 'Other', icon: '📦' },
];

export default function AddExpenseModal({
  isOpen,
  onClose,
  group,
  onSuccess,
}) {
  const { user } = useAuth();
  const members = group?.members || [];

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Food');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidBy, setPaidBy] = useState(() => user?.id || members[0]?._id || members[0]?.id || '');
  const [splitType, setSplitType] = useState('equal');
  const [splits, setSplits] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numericAmount = Number(totalAmount);

    if (!title.trim()) {
      setError('Please provide an expense title');
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      setError('Please enter a valid expense amount');
      return;
    }

    const includedSplits = splits.filter((s) => s.included !== false);
    if (includedSplits.length === 0) {
      setError('Please select at least one participant');
      return;
    }

    if (splitType === 'custom') {
      const currentSum = includedSplits.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
      if (Math.abs(currentSum - numericAmount) > 0.01) {
        setError(`Custom splits sum ($${currentSum.toFixed(2)}) must equal total ($${numericAmount.toFixed(2)})`);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        group: group._id || group.id,
        title: title.trim(),
        category,
        totalAmount: numericAmount,
        paidBy: paidBy || user?.id,
        splitType,
        splits: includedSplits.map((s) => ({
          user: s.user._id || s.user.id || s.user,
          amount: Number(s.amount),
          status: 'pending',
        })),
      };

      const result = await expenseService.createExpense(payload);
      handleReset();
      onClose();
      if (onSuccess) {
        onSuccess(result.expense);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create expense');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTitle('');
    setCategory('Food');
    setTotalAmount('');
    setSplitType('equal');
    setSplits([]);
    setError(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Add Expense to ${group?.name || 'Group'}`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Title */}
        <Input
          label="Expense Title"
          placeholder="e.g. Flight tickets, Groceries, Dinner"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError(null);
          }}
          icon={Receipt}
          autoFocus
          required
        />

        {/* Category selector */}
        <div>
          <label className="block text-xs font-semibold tracking-wider text-[#94A3B8] uppercase mb-1.5 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" /> Category
          </label>
          <div className="flex flex-wrap gap-1.5">
            {EXPENSE_CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setCategory(cat.name)}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  category === cat.name
                    ? 'bg-[#00E5D4]/20 text-[#00E5D4] border border-[#00E5D4]/40 shadow-[0_0_12px_rgba(0,229,212,0.2)]'
                    : 'bg-[#080B0D] text-[#94A3B8] hover:text-[#F3F6F6] border border-white/5'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Amount & Paid By */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Total Amount ($)"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={totalAmount}
            onChange={(e) => {
              setTotalAmount(e.target.value);
              if (error) setError(null);
            }}
            icon={DollarSign}
            required
          />

          <div>
            <label className="block text-xs font-semibold tracking-wider text-[#94A3B8] uppercase mb-1.5">
              Paid By
            </label>
            <div className="relative">
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full bg-[#111719] text-[#F3F6F6] text-xs rounded-xl px-3.5 py-3 border border-white/10 hover:border-white/20 focus:border-[#00E5D4] focus:outline-none cursor-pointer"
              >
                {members.map((m) => {
                  const mId = m._id || m.id || m;
                  const mName = m.name || 'Member';
                  const isYou = mId === user?.id;
                  return (
                    <option key={mId} value={mId} className="bg-[#111719] text-[#F3F6F6]">
                      {mName} {isYou ? '(You)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Split Calculator */}
        <div className="pt-2 border-t border-white/5">
          <SplitCalculator
            members={members}
            totalAmount={totalAmount}
            splitType={splitType}
            onSplitTypeChange={setSplitType}
            splits={splits}
            onSplitsChange={setSplits}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/5">
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            icon={Plus}
            className="shadow-[0_0_20px_rgba(0,229,212,0.3)]"
          >
            Save Expense
          </Button>
        </div>
      </form>
    </Modal>
  );
}
