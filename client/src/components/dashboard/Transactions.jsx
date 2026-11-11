import React, { useState } from 'react';

const formatMoney = (amount) => `$${Number(amount || 0).toFixed(2)}`;

export default function Transactions({ transactions = [], paymentCompleted }) {
  const [search, setSearch] = useState('');

  const filtered = transactions.filter((txn) => {
    const q = search.toLowerCase();
    return (
      (txn.name && txn.name.toLowerCase().includes(q)) ||
      (txn.id && txn.id.toLowerCase().includes(q)) ||
      (txn.status && txn.status.toLowerCase().includes(q))
    );
  });

  return (
    <div className="panel transactions-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">ACTIVITY LOG</span>
          <h2>Recent Transactions</h2>
        </div>
        <span className="member-count">{filtered.length} TRANSACTIONS</span>
      </div>

      <div className="txn-filter-bar">
        <input
          type="search"
          placeholder="Filter transactions by name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="txn-search-input"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state-card">
          <span>⇄</span>
          <h3>No transactions recorded yet</h3>
          <p>Approved PayPal payments and contributions will appear here in real time.</p>
        </div>
      ) : (
        <div className="transactions-list">
          {filtered.map((txn) => {
            const isCompleted =
              txn.status === 'COMPLETED' || (txn.isRecent && paymentCompleted);

            return (
              <div key={txn.id || txn._id} className="txn-row">
                <div className="txn-left">
                  <div className="txn-avatar">{txn.initials || 'TX'}</div>
                  <div className="txn-info">
                    <div className="flex items-center gap-2">
                      <strong className="text-sm text-[#F3F6F6]">{txn.name}</strong>
                      <span className="txn-id font-mono text-[11px] text-[#7E8B99]">
                        {txn.id}
                      </span>
                    </div>
                    <span className="txn-date text-xs text-[#7E8B99]">{txn.date}</span>
                  </div>
                </div>

                <div className="txn-right">
                  <span className="txn-amount text-sm font-semibold text-[#F3F6F6]">
                    +{formatMoney(txn.amount)}
                  </span>
                  <span
                    className={`status-pill ${
                      isCompleted
                        ? 'status-completed'
                        : txn.status === 'FAILED'
                        ? 'status-failed'
                        : 'status-pending'
                    }`}
                  >
                    {isCompleted ? 'COMPLETED' : txn.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
