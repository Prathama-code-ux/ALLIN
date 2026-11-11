import React from 'react';
import StatCard from './StatCard';

const formatMoney = (amount) => `$${Number(amount || 0).toFixed(2)}`;

export default function PaymentOverview({
  onPayNow,
  paymentLoading,
  paymentCompleted,
  totalPool = 129.15,
  targetAmount = 200.0,
  totalExpenses = 0,
  userShare = 55.35,
  myPaymentStatus = 'PENDING',
}) {
  const percentage = targetAmount > 0
    ? Math.min(Math.round((totalPool / targetAmount) * 100), 100)
    : 0;

  const remaining = Math.max(0, targetAmount - totalPool);

  return (
    <section className="payment-overview">
      <div className="section-heading">
        <div>
          <span className="eyebrow">COLLABORATIVE POOL</span>
          <h1>Group Payment Overview</h1>
          <p>Real-time pooled payments and contribution progress.</p>
        </div>

        <div className="payment-cta">
          <button
            type="button"
            className={`pay-button ${paymentCompleted || myPaymentStatus === 'COMPLETED' ? 'pay-button-completed' : ''}`}
            onClick={() => onPayNow(userShare)}
            disabled={paymentLoading || paymentCompleted || myPaymentStatus === 'COMPLETED'}
          >
            {paymentLoading ? (
              <>
                <span className="spinner" />
                <span>Connecting PayPal...</span>
              </>
            ) : paymentCompleted || myPaymentStatus === 'COMPLETED' ? (
              <>
                <span>✓</span>
                <span>Share Paid ({formatMoney(userShare)})</span>
              </>
            ) : (
              <>
                <span>Pay Your Share ({formatMoney(userShare)})</span>
                <span className="paypal-tag">Sandbox</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress Card */}
      <div className="panel pool-progress-panel">
        <div className="pool-progress-header">
          <div>
            <span className="pool-progress-title">Target Collection Progress</span>
            <div className="pool-progress-amounts">
              <strong>{formatMoney(totalPool)}</strong>
              <span>collected of {formatMoney(targetAmount)} goal</span>
            </div>
          </div>
          <div className="pool-percentage-badge">
            {percentage}%
          </div>
        </div>

        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="pool-progress-stats">
          <span>{formatMoney(remaining)} remaining to target</span>
          <span>{percentage >= 100 ? 'Goal Reached 🎉' : 'Collection In Progress'}</span>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="stats-grid">
        <StatCard
          label="TOTAL POOL COLLECTED"
          amount={formatMoney(totalPool)}
          description={`${percentage}% of group target reached`}
          icon="♧"
          accent
        />

        <StatCard
          label="TARGET AMOUNT"
          amount={formatMoney(targetAmount)}
          description="Group shared target"
          icon="◎"
        />

        <StatCard
          label="TOTAL GROUP EXPENSES"
          amount={formatMoney(totalExpenses)}
          description="Recorded in Expense Tracker"
          icon="◈"
        />

        <StatCard
          label="YOUR ALLOCATED SHARE"
          amount={formatMoney(userShare)}
          description={
            paymentCompleted || myPaymentStatus === 'COMPLETED'
              ? 'Status: Completed'
              : 'Status: Action Required'
          }
          icon="⇄"
          badge={
            paymentCompleted || myPaymentStatus === 'COMPLETED'
              ? 'PAID'
              : 'PENDING'
          }
        />
      </div>
    </section>
  );
}
