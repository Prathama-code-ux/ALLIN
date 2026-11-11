import React from 'react';

const formatMoney = (amount) => `$${Number(amount || 0).toFixed(2)}`;

export default function Contributions({
  contributions = [],
  onPayNow,
  paymentLoading,
  paymentCompleted,
  currentUserId,
}) {
  return (
    <div className="panel contributions-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">CREW SPLITS</span>
          <h2>Group Contributions</h2>
        </div>
        <span className="member-count">{contributions.length} MEMBERS</span>
      </div>

      {contributions.length === 0 ? (
        <div className="empty-state-card">
          <span>👥</span>
          <h3>No members in this crew yet</h3>
          <p>Share your crew invite code to add members and split payments.</p>
        </div>
      ) : (
        <div className="contributions-list">
          {contributions.map((member) => {
            const isCurrentUser =
              currentUserId &&
              (member.userId === currentUserId || member.id === currentUserId);

            const isPaid =
              member.status === 'COMPLETED' ||
              (isCurrentUser && paymentCompleted);

            return (
              <div key={member.id || member.name} className="contribution-item">
                <div className="contribution-member">
                  <div className="member-avatar">{member.initials || 'U'}</div>

                  <div className="member-details">
                    <div className="member-name-row">
                      <strong>{member.name}</strong>
                      {isCurrentUser && (
                        <span className="you-tag">You</span>
                      )}
                      <span className="member-role">{member.role}</span>
                    </div>

                    <div className="member-progress-row">
                      <div className="member-progress-bar">
                        <div
                          className="member-progress-fill"
                          style={{
                            width: `${isPaid ? Math.max(member.percentage, 100) : member.percentage}%`,
                          }}
                        />
                      </div>
                      <span className="member-percentage">
                        {isPaid ? 100 : member.percentage}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="contribution-action">
                  <span className="contribution-amount">
                    {formatMoney(member.amount)}
                  </span>

                  <div className="status-and-pay">
                    <span
                      className={`status-pill ${
                        isPaid ? 'status-completed' : 'status-pending'
                      }`}
                    >
                      {isPaid ? 'COMPLETED' : 'PENDING'}
                    </span>

                    {!isPaid && isCurrentUser && onPayNow && (
                      <button
                        type="button"
                        onClick={() => onPayNow(member.amount)}
                        disabled={paymentLoading}
                        className="quick-pay-btn"
                        title="Pay via PayPal Sandbox"
                      >
                        {paymentLoading ? '...' : 'Pay'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
