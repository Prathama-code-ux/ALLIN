import React, { useState } from "react";

const formatMoney = (amount) => `$${Number(amount || 0).toFixed(2)}`;

export default function Transactions({ transactions = [], paymentCompleted }) {
  const [search, setSearch] = useState("");

  const filtered = transactions.filter((txn) => {
    const q = search.toLowerCase();

    return (
      String(txn.name || "")
        .toLowerCase()
        .includes(q) ||
      String(txn.id || txn._id || "")
        .toLowerCase()
        .includes(q) ||
      String(txn.status || "")
        .toLowerCase()
        .includes(q)
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
          <p>Approved PayPal payments and contributions will appear here.</p>
        </div>
      ) : (
        <div className="transactions-list">
          {filtered.map((txn) => {
            const status = String(txn.status || "")
              .trim()
              .toUpperCase();

            // Only successfully captured payments are completed.
            const isCompleted = ["COMPLETED", "CAPTURED"].includes(status);

            const isFailed = ["FAILED", "CANCELLED", "CANCELED"].includes(
              status,
            );

            const displayStatus = isCompleted
              ? "COMPLETED"
              : isFailed
                ? "FAILED"
                : "PENDING";

            return (
              <div key={txn.id || txn._id} className="txn-row">
                <div className="txn-left">
                  <div className="txn-avatar">{txn.initials || "TX"}</div>

                  <div className="txn-info">
                    <div className="flex items-center gap-2">
                      <strong className="text-sm text-[#F3F6F6]">
                        {txn.name || "Payment"}
                      </strong>

                      <span className="txn-id font-mono text-[11px] text-[#7E8B99]">
                        {txn.id || txn._id}
                      </span>
                    </div>

                    <span className="txn-date text-xs text-[#7E8B99]">
                      {txn.date || "Date unavailable"}
                    </span>
                  </div>
                </div>

                <div className="txn-right">
                  <span className="txn-amount text-sm font-semibold text-[#F3F6F6]">
                    +{formatMoney(txn.amount)}
                  </span>

                  <span
                    className={`status-pill ${
                      isCompleted
                        ? "status-completed"
                        : isFailed
                          ? "status-failed"
                          : "status-pending"
                    }`}
                  >
                    {displayStatus}
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
