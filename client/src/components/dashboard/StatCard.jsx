import React from 'react';

export default function StatCard({
  label,
  amount,
  description,
  icon,
  accent = false,
  badge,
}) {
  return (
    <div className={`stat-card ${accent ? 'stat-card-accent' : ''}`}>
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
        {icon && <span className="stat-icon">{icon}</span>}
      </div>

      <div className="stat-amount">{amount}</div>

      <div className="stat-footer">
        {description && <span className="stat-desc">{description}</span>}
        {badge && <span className="stat-badge">{badge}</span>}
      </div>
    </div>
  );
}
