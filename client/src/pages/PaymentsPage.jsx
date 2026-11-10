import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Receipt,
  RefreshCw,
} from 'lucide-react';
import paymentService from '../services/paymentService';
import expenseService from '../services/expenseService';
import groupService from '../services/groupService';
import useAuth from '../context/useAuth';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import PayPalModal from '../components/payments/PayPalModal';

export default function PaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'

  const [selectedPayTarget, setSelectedPayTarget] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [payData, expData, grpData] = await Promise.all([
        paymentService.getMyPayments(),
        expenseService.getAllExpenses(),
        groupService.getMyGroups(),
      ]);
      setPayments(payData.payments || []);
      setExpenses(expData.expenses || []);
      setGroups(grpData.groups || []);
    } catch (err) {
      console.warn('Payments load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    Promise.all([
      paymentService.getMyPayments(),
      expenseService.getAllExpenses(),
      groupService.getMyGroups(),
    ])
      .then(([payData, expData, grpData]) => {
        if (!ignore) {
          setPayments(payData.payments || []);
          setExpenses(expData.expenses || []);
          setGroups(grpData.groups || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.warn('Payments fetch error:', err);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Find all pending splits assigned to the current user
  const pendingSplits = [];
  expenses.forEach((expense) => {
    const isPaidByMe = expense.paidBy === user?.id;
    if (isPaidByMe) return;

    (expense.splits || []).forEach((split) => {
      const splitUserId = split.user._id || split.user.id || split.user;
      if (splitUserId === user?.id && split.status === 'pending') {
        const group = groups.find((g) => g._id === expense.group);
        pendingSplits.push({
          expense,
          split,
          group,
        });
      }
    });
  });

  // Calculate metrics
  const totalPendingAmount = pendingSplits.reduce(
    (sum, item) => sum + (Number(item.split.amount) || 0),
    0
  );

  const totalCapturedAmount = payments
    .filter((p) => p.status === 'captured')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F3F6F6] tracking-tight">
            Payments & Settlements
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
            PayPal collaborative transactions and pending debt settlements
          </p>
        </div>

        <button
          onClick={loadData}
          title="Refresh Payments"
          className="p-2 rounded-xl text-[#94A3B8] hover:text-[#00E5D4] hover:bg-white/5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-amber-500/20 bg-[#111719]/95">
          <div className="flex items-center justify-between text-xs text-amber-400 font-medium">
            <span>Pending Settlements</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-400 mt-3">
            ${totalPendingAmount.toFixed(2)}
          </div>
          <span className="text-[11px] text-[#64748B] mt-1 block">
            {pendingSplits.length} pending split {pendingSplits.length === 1 ? 'item' : 'items'}
          </span>
        </Card>

        <Card className="p-5 border-emerald-500/20 bg-[#111719]/95">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
            <span>Total Settled (PayPal)</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400 mt-3">
            ${totalCapturedAmount.toFixed(2)}
          </div>
          <span className="text-[11px] text-[#64748B] mt-1 block">
            {payments.filter((p) => p.status === 'captured').length} captured payments
          </span>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Security & Gateway</span>
            <ShieldCheck className="w-4 h-4 text-[#00E5D4]" />
          </div>
          <div className="text-lg font-bold text-[#F3F6F6] mt-3 flex items-center gap-2">
            <span>PayPal Encrypted</span>
          </div>
          <span className="text-[11px] text-[#64748B] mt-1 block">
            Adheres to backend Payment model lifecycle
          </span>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/8 pb-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-[#00E5D4]/15 text-[#00E5D4] border border-[#00E5D4]/30'
              : 'text-[#94A3B8] hover:text-[#F3F6F6]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pending ({pendingSplits.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-[#00E5D4]/15 text-[#00E5D4] border border-[#00E5D4]/30'
              : 'text-[#94A3B8] hover:text-[#F3F6F6]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Transaction History ({payments.length})</span>
        </button>
      </div>

      {/* Tab 1: Pending Settlements */}
      {activeTab === 'pending' && (
        <div className="space-y-3">
          {pendingSplits.length > 0 ? (
            pendingSplits.map((item, idx) => (
              <Card
                key={idx}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-amber-500/20"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-[#F3F6F6]">
                      {item.expense.title}
                    </h4>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      Group: <span className="text-[#00E5D4] font-medium">{item.group?.name}</span>
                    </p>
                    <span className="text-[11px] text-[#64748B] mt-1 block">
                      Total bill: ${Number(item.expense.totalAmount).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] uppercase text-[#94A3B8] block">Your Owed Share</span>
                    <span className="text-base sm:text-lg font-bold font-mono text-amber-400">
                      ${Number(item.split.amount).toFixed(2)}
                    </span>
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    icon={CreditCard}
                    onClick={() => setSelectedPayTarget(item)}
                    className="text-xs shadow-[0_0_20px_rgba(0,229,212,0.25)]"
                  >
                    Pay with PayPal
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="All caught up!"
              description="You have no pending payments or outstanding split balances."
            />
          )}
        </div>
      )}

      {/* Tab 2: Transaction History */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {payments.length > 0 ? (
            payments.map((p) => {
              const formattedDate = p.paidAt
                ? new Date(p.paidAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Pending settlement';

              return (
                <Card key={p._id} className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[#F3F6F6]">
                            PayPal Capture Settlement
                          </h4>
                          <Badge
                            variant={p.status === 'captured' ? 'emerald' : 'amber'}
                            size="sm"
                            className="uppercase text-[9px]"
                          >
                            {p.status}
                          </Badge>
                        </div>
                        <p className="text-[11px] font-mono text-[#64748B] mt-0.5">
                          Order: <span className="text-[#94A3B8]">{p.paypalOrderId}</span>
                        </p>
                        {p.paypalCaptureId && (
                          <p className="text-[10px] font-mono text-[#64748B]">
                            Capture ID: <span className="text-[#00E5D4]">{p.paypalCaptureId}</span>
                          </p>
                        )}
                        <span className="text-[11px] text-[#64748B] mt-1 block">
                          {formattedDate}
                        </span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <div className="text-lg font-bold font-mono text-emerald-400">
                        ${Number(p.amount).toFixed(2)}
                      </div>
                      <span className="text-[10px] text-[#64748B]">Processed via PayPal</span>
                    </div>
                  </div>
                </Card>
              );
            })
          ) : (
            <EmptyState
              icon={CreditCard}
              title="No payment history"
              description="Transactions completed via PayPal will be logged in this ledger."
            />
          )}
        </div>
      )}

      {/* PayPal Modal */}
      {selectedPayTarget && (
        <PayPalModal
          isOpen={Boolean(selectedPayTarget)}
          onClose={() => setSelectedPayTarget(null)}
          expense={selectedPayTarget.expense}
          split={selectedPayTarget.split}
          group={selectedPayTarget.group}
          onSuccess={() => {
            loadData();
            setSelectedPayTarget(null);
          }}
        />
      )}
    </div>
  );
}
