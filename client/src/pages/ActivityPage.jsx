import React, { useState, useEffect } from 'react';
import { Activity, Users, Receipt, CreditCard, Clock, RefreshCw } from 'lucide-react';
import groupService from '../services/groupService';
import expenseService from '../services/expenseService';
import paymentService from '../services/paymentService';
import Card from '../components/common/Card';
import EmptyState from '../components/common/EmptyState';

export default function ActivityPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'groups' | 'expenses' | 'payments'

  const formatEvents = (groupsData, expensesData, paymentsData) => {
    const events = [];

    // Groups events
    (groupsData.groups || []).forEach((g) => {
      events.push({
        id: `grp_${g._id}`,
        type: 'group',
        title: `Created / Joined Group`,
        description: `Group "${g.name}" with code ${g.inviteCode}`,
        timestamp: g.createdAt || new Date().toISOString(),
        icon: Users,
        color: 'text-[#00E5D4]',
        bgColor: 'bg-[#00E5D4]/10',
        borderColor: 'border-[#00E5D4]/20',
      });
    });

    // Expenses events
    (expensesData.expenses || []).forEach((e) => {
      events.push({
        id: `exp_${e._id}`,
        type: 'expense',
        title: `Expense Logged: ${e.title}`,
        description: `Total $${Number(e.totalAmount).toFixed(2)} (${e.splitType} split among ${e.splits?.length || 0} members)`,
        timestamp: e.createdAt || new Date().toISOString(),
        icon: Receipt,
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/10',
        borderColor: 'border-cyan-500/20',
      });
    });

    // Payments events
    (paymentsData.payments || []).forEach((p) => {
      events.push({
        id: `pay_${p._id}`,
        type: 'payment',
        title: `PayPal Settlement Completed`,
        description: `Captured $${Number(p.amount).toFixed(2)} (Order ${p.paypalOrderId})`,
        timestamp: p.paidAt || p.createdAt || new Date().toISOString(),
        icon: CreditCard,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
      });
    });

    // Sort newest first
    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return events;
  };

  const loadActivities = async () => {
    setLoading(true);
    try {
      const [groupsData, expensesData, paymentsData] = await Promise.all([
        groupService.getMyGroups(),
        expenseService.getAllExpenses(),
        paymentService.getMyPayments(),
      ]);
      setActivities(formatEvents(groupsData, expensesData, paymentsData));
    } catch (err) {
      console.warn('Activity load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    Promise.all([
      groupService.getMyGroups(),
      expenseService.getAllExpenses(),
      paymentService.getMyPayments(),
    ])
      .then(([groupsData, expensesData, paymentsData]) => {
        if (!ignore) {
          setActivities(formatEvents(groupsData, expensesData, paymentsData));
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.warn('Activity fetch error:', err);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const filteredEvents =
    filter === 'all' ? activities : activities.filter((a) => a.type === filter);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F3F6F6] tracking-tight">
            Activity Timeline
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
            Real-time audit log of groups, splits, and settlements
          </p>
        </div>

        <button
          onClick={loadActivities}
          title="Refresh Activity"
          className="p-2 rounded-xl text-[#94A3B8] hover:text-[#00E5D4] hover:bg-white/5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'all', label: 'All Events' },
          { key: 'groups', label: 'Groups' },
          { key: 'expenses', label: 'Expenses' },
          { key: 'payments', label: 'Payments' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filter === tab.key
                ? 'bg-[#00E5D4]/15 text-[#00E5D4] border border-[#00E5D4]/30'
                : 'text-[#94A3B8] hover:text-[#F3F6F6] bg-[#111719]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Timeline items */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-2xl bg-[#111719]/60 border border-white/5 animate-pulse"
            />
          ))}
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="space-y-3 relative before:absolute before:inset-0 before:left-6 before:w-0.5 before:bg-white/5 before:hidden sm:before:block">
          {filteredEvents.map((event) => {
            const Icon = event.icon;
            const formattedTime = new Date(event.timestamp).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <Card
                key={event.id}
                className="p-4 sm:p-5 flex items-start gap-4 transition-all hover:border-white/15"
              >
                <div
                  className={`w-10 h-10 rounded-2xl ${event.bgColor} ${event.borderColor} border flex items-center justify-center ${event.color} shrink-0`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-[#F3F6F6]">{event.title}</h4>
                    <span className="text-[11px] text-[#64748B] flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formattedTime}
                    </span>
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-1">{event.description}</p>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Activity}
          title="No activity recorded"
          description="Actions like creating a group, logging an expense, or settling a payment will appear here."
        />
      )}
    </div>
  );
}
