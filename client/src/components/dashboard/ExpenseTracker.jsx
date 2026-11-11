import React, { useState } from 'react';
import StatCard from './StatCard';
import { Plus, Edit2, Trash2, Search, X } from 'lucide-react';

const expenseCategories = [
  'Food',
  'Transport',
  'Shopping',
  'Entertainment',
  'Bills',
  'Health',
  'Travel',
  'Other',
];

const categoryIcons = {
  Food: '🍔',
  Transport: '🚕',
  Shopping: '🛍',
  Entertainment: '🎬',
  Bills: '📄',
  Health: '💊',
  Travel: '✈️',
  Other: '📦',
};

const formatMoney = (amount) => `$${Number(amount || 0).toFixed(2)}`;

const formatDate = (date) => {
  if (!date) return '—';
  try {
    const d = new Date(date.includes('T') ? date : `${date}T00:00:00`);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  } catch {
    return date;
  }
};

const emptyForm = {
  title: '',
  category: 'Food',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  description: '',
};

export default function ExpenseTracker({
  expenses = [],
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  loading = false,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const totalExpenses = expenses.reduce(
    (total, exp) => total + Number(exp.amount || 0),
    0
  );

  const categoryTotals = expenseCategories
    .map((category) => ({
      name: category,
      amount: expenses
        .filter((e) => e.category === category)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0),
    }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const filteredExpenses = expenses
    .filter((expense) => {
      const q = search.toLowerCase();
      const matchesSearch =
        (expense.title && expense.title.toLowerCase().includes(q)) ||
        (expense.description && expense.description.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === 'All' || expense.category === selectedCategory;

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  const openAddForm = () => {
    setEditingId(null);
    setFormData({
      ...emptyForm,
      date: new Date().toISOString().split('T')[0],
    });
    setShowForm(true);
  };

  const openEditForm = (expense) => {
    setEditingId(expense.id || expense._id);
    setFormData({
      title: expense.title,
      category: expense.category,
      amount: String(expense.amount),
      date: expense.date ? expense.date.split('T')[0] : new Date().toISOString().split('T')[0],
      description: expense.description || '',
    });
    setShowForm(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const amount = Number(formData.amount);

    if (!formData.title.trim()) {
      alert('Please enter an expense title.');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        category: formData.category,
        amount,
        date: formData.date,
        description: formData.description.trim(),
      };

      if (editingId !== null) {
        await onUpdateExpense(editingId, payload);
      } else {
        await onAddExpense(payload);
      }

      setShowForm(false);
      setEditingId(null);
      setFormData(emptyForm);
    } catch (err) {
      alert(err.message || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, title) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the expense "${title}"?`
    );
    if (!confirmed) return;

    try {
      await onDeleteExpense(id);
    } catch (err) {
      alert(err.message || 'Failed to delete expense');
    }
  };

  const maxCategoryAmount = Math.max(
    ...categoryTotals.map((c) => c.amount),
    1
  );

  return (
    <section className="expense-page">
      <div className="section-heading expense-heading">
        <div>
          <span className="eyebrow">MONEY MANAGEMENT</span>
          <h1>Expense Tracker</h1>
          <p>Persist, categorize, and track shared crew expenses in MongoDB Atlas.</p>
        </div>

        <button
          type="button"
          className="add-expense-button flex items-center gap-2"
          onClick={openAddForm}
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Expense Statistics */}
      <div className="stats-grid expense-stats">
        <StatCard
          label="TOTAL EXPENSES"
          amount={formatMoney(totalExpenses)}
          description={`${expenses.length} recorded expenses`}
          icon="↘"
          accent
        />

        <StatCard
          label="AVERAGE EXPENSE"
          amount={formatMoney(
            expenses.length ? totalExpenses / expenses.length : 0
          )}
          description="Average per recorded expense"
          icon="◈"
        />

        <StatCard
          label="CATEGORIES USED"
          amount={String(categoryTotals.length)}
          description="Distinct spending categories"
          icon="🛍"
        />
      </div>

      {/* Categories Breakdown */}
      <div className="panel expense-categories-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">SPENDING ANALYSIS</span>
            <h2>Expenses by Category</h2>
          </div>
          <span className="member-count">BREAKDOWN</span>
        </div>

        {categoryTotals.length === 0 ? (
          <p className="empty-expenses">
            No expenses recorded yet. Click &quot;Add Expense&quot; to log your first payment!
          </p>
        ) : (
          <div className="categories-list">
            {categoryTotals.map((cat) => (
              <div key={cat.name} className="category-item">
                <div className="category-meta">
                  <span className="category-title">
                    {categoryIcons[cat.name]} {cat.name}
                  </span>
                  <span className="category-amount">{formatMoney(cat.amount)}</span>
                </div>

                <div className="category-bar">
                  <div
                    className="category-fill"
                    style={{
                      width: `${Math.round((cat.amount / maxCategoryAmount) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Form for Add/Edit Expense */}
      {showForm && (
        <div className="expense-modal-backdrop" onClick={() => setShowForm(false)}>
          <div
            className="expense-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="expense-modal-header">
              <h3>{editingId !== null ? 'Edit Expense' : 'Add New Expense'}</h3>
              <button
                type="button"
                className="close-modal-button"
                onClick={() => setShowForm(false)}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="expense-form">
              <div className="form-group">
                <label htmlFor="expense-title">Expense Title *</label>
                <input
                  id="expense-title"
                  type="text"
                  name="title"
                  required
                  placeholder="e.g. Dinner at restaurant"
                  value={formData.title}
                  onChange={handleFormChange}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="expense-category">Category *</label>
                  <select
                    id="expense-category"
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                  >
                    {expenseCategories.map((c) => (
                      <option key={c} value={c}>
                        {categoryIcons[c]} {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="expense-amount">Amount ($) *</label>
                  <input
                    id="expense-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    name="amount"
                    required
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="expense-date">Date *</label>
                <input
                  id="expense-date"
                  type="date"
                  name="date"
                  required
                  value={formData.date}
                  onChange={handleFormChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="expense-desc">Description (Optional)</label>
                <textarea
                  id="expense-desc"
                  name="description"
                  rows={3}
                  placeholder="Notes about this expense..."
                  value={formData.description}
                  onChange={handleFormChange}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-expense-button"
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="add-expense-button"
                  disabled={submitting}
                >
                  {submitting
                    ? 'Saving to DB...'
                    : editingId !== null
                    ? 'Save Changes'
                    : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense History Table */}
      <div className="panel expense-history-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">RECORD MANAGEMENT</span>
            <h2>Expense History</h2>
          </div>

          <span className="member-count">
            {filteredExpenses.length} RECORDS
          </span>
        </div>

        {/* Filters */}
        <div className="expense-filters">
          <div className="expense-search-wrapper">
            <Search className="w-4 h-4 text-[#7E8B99]" />
            <input
              type="search"
              placeholder="Search expenses by title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            {expenseCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="empty-expenses">
            <div className="spinner" />
            <p>Loading expenses from MongoDB...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="empty-expenses">
            <span>◈</span>
            <h3>No expenses found</h3>
            <p>Try changing your search query or add a new expense above.</p>
          </div>
        ) : (
          <div className="expense-table-wrapper">
            <table className="expense-table">
              <thead>
                <tr>
                  <th>EXPENSE</th>
                  <th>CATEGORY</th>
                  <th>DATE</th>
                  <th>AMOUNT</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id || exp._id}>
                    <td>
                      <div className="expense-title-cell">
                        <strong>{exp.title}</strong>
                        <span>{exp.description || 'No description provided'}</span>
                      </div>
                    </td>

                    <td>
                      <span className="expense-category-tag">
                        {categoryIcons[exp.category]} {exp.category}
                      </span>
                    </td>

                    <td>{formatDate(exp.date)}</td>

                    <td className="expense-amount">
                      {formatMoney(exp.amount)}
                    </td>

                    <td>
                      <div className="expense-actions">
                        <button
                          type="button"
                          className="edit-expense"
                          onClick={() => openEditForm(exp)}
                          aria-label={`Edit ${exp.title}`}
                          title="Edit expense"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          className="delete-expense"
                          onClick={() =>
                            handleDelete(exp.id || exp._id, exp.title)
                          }
                          aria-label={`Delete ${exp.title}`}
                          title="Delete expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
