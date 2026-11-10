import { useState, useEffect, useRef } from "react";
import "./App.css";

import {
  createPaymentOrder,
  capturePaymentOrder,
} from "./services/paymentApi.js";

// SAMPLE CONTRIBUTION DATA
const initialContributions = [
  {
    name: "Alex",
    initials: "A",
    role: "Admin",
    amount: 73.8,
    percentage: 40,
    status: "COMPLETED",
  },
  {
    name: "Sarah M.",
    initials: "SM",
    role: "Member",
    amount: 55.35,
    percentage: 30,
    status: "COMPLETED",
  },
  {
    name: "Liam K.",
    initials: "LK",
    role: "Member",
    amount: 55.35,
    percentage: 30,
    status: "PENDING",
  },
];

// SAMPLE TRANSACTION DATA
const transactions = [
  {
    id: "TXN-001",
    name: "Alex",
    initials: "A",
    amount: 73.8,
    date: "Nov 08, 2026",
    status: "COMPLETED",
  },
  {
    id: "TXN-002",
    name: "Sarah M.",
    initials: "SM",
    amount: 55.35,
    date: "Nov 08, 2026",
    status: "COMPLETED",
  },
  {
    id: "TXN-003",
    name: "Liam K.",
    initials: "LK",
    amount: 55.35,
    date: "Awaiting payment",
    status: "PENDING",
  },
];

// SAMPLE EXPENSE DATA
const initialExpenses = [
  {
    id: 1,
    title: "Dinner at restaurant",
    category: "Food",
    amount: 85.5,
    date: "2026-11-08",
    description: "Friday group dinner",
  },
  {
    id: 2,
    title: "Cab booking",
    category: "Transport",
    amount: 24.0,
    date: "2026-11-08",
    description: "Travel to restaurant",
  },
  {
    id: 3,
    title: "Event decorations",
    category: "Shopping",
    amount: 32.5,
    date: "2026-11-07",
    description: "Group event supplies",
  },
  {
    id: 4,
    title: "Movie tickets",
    category: "Entertainment",
    amount: 42.0,
    date: "2026-11-06",
    description: "Weekend movie",
  },
];

const expenseCategories = [
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
  "Bills",
  "Health",
  "Travel",
  "Other",
];

const categoryIcons = {
  Food: "🍔",
  Transport: "🚕",
  Shopping: "🛍",
  Entertainment: "🎬",
  Bills: "📄",
  Health: "💊",
  Travel: "✈️",
  Other: "📦",
};

const formatMoney = (amount) => `$${Number(amount || 0).toFixed(2)}`;

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

// SIDEBAR
function Sidebar({ activePage, setActivePage, mobileOpen, setMobileOpen }) {
  const navigation = [
    { name: "Overview", icon: "◫" },
    { name: "Transactions", icon: "⇄" },
    { name: "Contributions", icon: "♧" },
    { name: "Expense Tracker", icon: "◈" },
  ];

  return (
    <>
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">A</div>

          <div>
            <h2>ALLIN</h2>
            <span>PAYMENTS & CREW</span>
          </div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="navigation">
          {navigation.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${activePage === item.name ? "active" : ""}`}
              onClick={() => {
                setActivePage(item.name);
                setMobileOpen(false);
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="environment-card">
            <span className="environment-dot" />

            <div>
              <strong>Sandbox Mode</strong>
              <p>Test environment active</p>
            </div>
          </div>

          <div className="profile">
            <div className="avatar">A</div>

            <div>
              <strong>Alex</strong>
              <p>Group Admin</p>
            </div>

            <span className="profile-more">···</span>
          </div>
        </div>
      </aside>
    </>
  );
}

// HEADER
function Header({ setMobileOpen }) {
  return (
    <header className="topbar">
      <div className="mobile-brand">
        <button
          className="menu-button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
        >
          ☰
        </button>

        <span>ALLIN</span>
      </div>

      <div className="breadcrumb">
        <span>Workspace</span>
        <span>/</span>
        <strong>Friday Dinner & Crew</strong>
      </div>

      <div className="topbar-right">
        <span className="sandbox-tag">● SANDBOX</span>

        <button className="notification-button" aria-label="Notifications">
          ♧
        </button>
      </div>
    </header>
  );
}

// STAT CARD
function StatCard({ label, amount, description, icon, accent }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span className="stat-icon">{icon}</span>
        <span className="stat-label">{label}</span>
      </div>

      <h2 className={accent ? "accent-text" : ""}>{amount}</h2>

      <p>{description}</p>
    </div>
  );
}

// PAYMENT OVERVIEW
function PaymentOverview({ onPayNow, paymentLoading, paymentCompleted }) {
  const collected = paymentCompleted ? 184.5 : 129.15;
  const pending = paymentCompleted ? 0 : 55.35;
  const percentage = paymentCompleted ? 100 : 70;

  return (
    <section className="overview-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">PAYMENT OVERVIEW</span>

          <h1>Split Rules & Payments</h1>

          <p>Track contributions and keep your group payments in sync.</p>
        </div>

        <span className="live-indicator">
          <span /> SANDBOX ACTIVE
        </span>
      </div>

      <div className="stats-grid">
        <StatCard
          label="TOTAL BILL"
          amount="$184.50"
          description="Friday dinner · Table 14"
          icon="◈"
        />

        <StatCard
          label="COLLECTED"
          amount={formatMoney(collected)}
          description={
            paymentCompleted ? "3 of 3 members paid" : "2 of 3 members paid"
          }
          icon="↗"
          accent
        />

        <StatCard
          label="PENDING"
          amount={formatMoney(pending)}
          description={
            paymentCompleted
              ? "All contributions completed"
              : "Awaiting 1 contribution"
          }
          icon="◷"
        />
      </div>

      <div className="payment-action">
        <div>
          <span className="eyebrow">
            {paymentCompleted ? "PAYMENT COMPLETED" : "READY TO SETTLE?"}
          </span>

          <h3>
            {paymentCompleted
              ? "Your contribution is complete"
              : "Complete your contribution"}
          </h3>

          <p>
            {paymentCompleted
              ? "Your payment has been captured successfully."
              : "Pay your pending contribution securely through PayPal."}
          </p>

          <h2 className="accent-text">$55.35</h2>
        </div>

        <button
          type="button"
          className="pay-now-button"
          onClick={onPayNow}
          disabled={paymentLoading || paymentCompleted}
        >
          {paymentCompleted
            ? "Payment Completed ✓"
            : paymentLoading
              ? "Connecting to PayPal..."
              : "Pay $55.35 →"}
        </button>
      </div>

      <div className="collection-card">
        <div className="collection-header">
          <div>
            <span className="eyebrow">COLLECTION PROGRESS</span>
            <h3>Group payment status</h3>
          </div>

          <strong className="collection-percentage">{percentage}%</strong>
        </div>

        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${percentage}%` }} />
        </div>

        <div className="progress-footer">
          <span>
            {paymentCompleted ? "3 members completed" : "2 members completed"}
          </span>

          <span>
            {paymentCompleted ? "No pending payments" : "1 member pending"}
          </span>
        </div>
      </div>
    </section>
  );
}

// CONTRIBUTIONS
function Contributions({ onPayNow, paymentLoading, paymentCompleted }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">GROUP ALLOCATION</span>
          <h2>Member Contributions</h2>
        </div>

        <span className="member-count">3 MEMBERS</span>
      </div>

      <div className="contribution-list">
        {initialContributions.map((person) => {
          const personPaid =
            person.name === "Liam K."
              ? paymentCompleted
              : person.status === "COMPLETED";

          const currentStatus = personPaid ? "COMPLETED" : person.status;

          return (
            <div className="contribution-row" key={person.name}>
              <div className="member-info">
                <div className="avatar member-avatar">{person.initials}</div>

                <div>
                  <strong>{person.name}</strong>

                  <span>
                    {person.role} · {person.percentage}% share
                  </span>
                </div>
              </div>

              <div className="contribution-amount">
                <strong>{formatMoney(person.amount)}</strong>

                <span className={`status ${currentStatus.toLowerCase()}`}>
                  <i />
                  {currentStatus}
                </span>

                {person.name === "Liam K." && !personPaid && (
                  <button
                    type="button"
                    className="pay-now-button"
                    onClick={onPayNow}
                    disabled={paymentLoading}
                  >
                    {paymentLoading ? "Processing..." : "Pay Now"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="demo-note">
        Contribution information is sample data. Liam's status updates during
        this session after successful payment.
      </p>
    </section>
  );
}

// TRANSACTIONS
function Transactions({ paymentCompleted }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">PAYMENT ACTIVITY</span>
          <h2>Recent Transactions</h2>
        </div>

        <span className="member-count">3 RECORDS</span>
      </div>

      <div className="transaction-list">
        {transactions.map((transaction) => {
          const isPaid = transaction.name === "Liam K." && paymentCompleted;

          const currentStatus = isPaid ? "COMPLETED" : transaction.status;

          const currentDate = isPaid
            ? new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric",
              })
            : transaction.date;

          return (
            <div className="transaction-row" key={transaction.id}>
              <div className="transaction-person">
                <div className="avatar member-avatar">
                  {transaction.initials}
                </div>

                <div>
                  <strong>{transaction.name}</strong>
                  <span>{transaction.id}</span>
                </div>
              </div>

              <div className="transaction-date">{currentDate}</div>

              <div className="transaction-right">
                <strong>{formatMoney(transaction.amount)}</strong>

                <span className={`status ${currentStatus.toLowerCase()}`}>
                  <i />
                  {currentStatus}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="demo-note">
        Transaction history is currently sample data, not database records.
      </p>
    </section>
  );
}

// EXPENSE TRACKER
function ExpenseTracker({ expenses, setExpenses }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const emptyForm = {
    title: "",
    category: "Food",
    amount: "",
    date: new Date().toLocaleDateString("en-CA"),
    description: "",
  };

  const [formData, setFormData] = useState(emptyForm);

  const totalExpenses = expenses.reduce(
    (total, expense) => total + Number(expense.amount),
    0,
  );

  const categoryTotals = expenseCategories
    .map((category) => ({
      name: category,
      amount: expenses
        .filter((expense) => expense.category === category)
        .reduce((sum, expense) => sum + Number(expense.amount), 0),
    }))
    .filter((category) => category.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const filteredExpenses = expenses
    .filter((expense) => {
      const matchesSearch =
        expense.title.toLowerCase().includes(search.toLowerCase()) ||
        expense.description.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        selectedCategory === "All" || expense.category === selectedCategory;

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const openAddForm = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (expense) => {
    setEditingId(expense.id);
    setFormData({
      title: expense.title,
      category: expense.category,
      amount: String(expense.amount),
      date: expense.date,
      description: expense.description,
    });
    setShowForm(true);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const amount = Number(formData.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Please enter a valid expense amount.");
      return;
    }

    const expenseData = {
      ...formData,
      amount,
      title: formData.title.trim(),
      description: formData.description.trim(),
    };

    if (editingId !== null) {
      setExpenses((previous) =>
        previous.map((expense) =>
          expense.id === editingId ? { ...expense, ...expenseData } : expense,
        ),
      );
    } else {
      setExpenses((previous) => [
        {
          id: Date.now(),
          ...expenseData,
        },
        ...previous,
      ]);
    }

    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleDelete = (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this expense?",
    );

    if (!confirmed) return;

    setExpenses((previous) => previous.filter((expense) => expense.id !== id));
  };

  const maximumCategoryAmount = Math.max(
    ...categoryTotals.map((category) => category.amount),
    1,
  );

  return (
    <section className="expense-page">
      <div className="section-heading expense-heading">
        <div>
          <span className="eyebrow">MONEY MANAGEMENT</span>
          <h1>Expense Tracker</h1>
          <p>Keep track of where your group's money goes.</p>
        </div>

        <button className="add-expense-button" onClick={openAddForm}>
          + Add Expense
        </button>
      </div>

      {/* EXPENSE STATISTICS */}

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
            expenses.length ? totalExpenses / expenses.length : 0,
          )}
          description="Average per recorded expense"
          icon="◈"
        />

        <StatCard
          label="CATEGORIES USED"
          amount={String(categoryTotals.length)}
          description="Different spending categories"
          icon="▦"
        />
      </div>

      {/* CATEGORY BREAKDOWN */}

      <div className="panel category-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">SPENDING ANALYSIS</span>
            <h2>Expenses by Category</h2>
          </div>

          <span className="member-count">BREAKDOWN</span>
        </div>

        {categoryTotals.length === 0 ? (
          <p className="empty-expenses">
            No expenses recorded yet. Add your first expense!
          </p>
        ) : (
          <div className="category-breakdown">
            {categoryTotals.map((category) => (
              <div className="category-item" key={category.name}>
                <div className="category-info">
                  <span className="category-emoji">
                    {categoryIcons[category.name]}
                  </span>

                  <strong>{category.name}</strong>
                  <span className="category-amount">
                    {formatMoney(category.amount)}
                  </span>
                </div>

                <div className="category-progress">
                  <div
                    style={{
                      width: `${
                        (category.amount / maximumCategoryAmount) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EXPENSE FORM */}

      {showForm && (
        <div className="expense-form-overlay">
          <div className="expense-form-card">
            <div className="expense-form-heading">
              <div>
                <span className="eyebrow">
                  {editingId !== null ? "UPDATE RECORD" : "NEW RECORD"}
                </span>

                <h2>{editingId !== null ? "Edit Expense" : "Add Expense"}</h2>
              </div>

              <button
                type="button"
                className="close-form-button"
                onClick={() => setShowForm(false)}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="expense-form-grid">
                <label className="expense-field full-width">
                  Expense Title
                  <input
                    type="text"
                    name="title"
                    placeholder="e.g. Dinner, Transport..."
                    value={formData.title}
                    onChange={handleFormChange}
                    required
                  />
                </label>

                <label className="expense-field">
                  Amount ($)
                  <input
                    type="number"
                    name="amount"
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    value={formData.amount}
                    onChange={handleFormChange}
                    required
                  />
                </label>

                <label className="expense-field">
                  Category
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                  >
                    {expenseCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="expense-field full-width">
                  Date
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleFormChange}
                    required
                  />
                </label>

                <label className="expense-field full-width">
                  Description
                  <textarea
                    name="description"
                    placeholder="Add some details about this expense..."
                    rows="3"
                    value={formData.description}
                    onChange={handleFormChange}
                  />
                </label>
              </div>

              <div className="expense-form-actions">
                <button
                  type="button"
                  className="cancel-expense-button"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>

                <button type="submit" className="add-expense-button">
                  {editingId !== null ? "Save Changes" : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXPENSE HISTORY */}

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

        <div className="expense-filters">
          <input
            type="search"
            placeholder="Search expenses..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
          >
            <option value="All">All Categories</option>

            {expenseCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="empty-expenses">
            <span>◈</span>
            <h3>No expenses found</h3>
            <p>Try changing your search or add a new expense.</p>
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
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>
                      <div className="expense-title-cell">
                        <strong>{expense.title}</strong>
                        <span>{expense.description || "No description"}</span>
                      </div>
                    </td>

                    <td>
                      <span className="expense-category-tag">
                        {categoryIcons[expense.category]} {expense.category}
                      </span>
                    </td>

                    <td>{formatDate(expense.date)}</td>

                    <td className="expense-amount">
                      {formatMoney(expense.amount)}
                    </td>

                    <td>
                      <div className="expense-actions">
                        <button
                          type="button"
                          className="edit-expense"
                          onClick={() => openEditForm(expense)}
                          aria-label={`Edit ${expense.title}`}
                          title="Edit expense"
                        >
                          ✎
                        </button>

                        <button
                          type="button"
                          className="delete-expense"
                          onClick={() => handleDelete(expense.id)}
                          aria-label={`Delete ${expense.title}`}
                          title="Delete expense"
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="demo-note">
          These are temporary frontend records. They will be stored in your
          shared database once the backend integration is ready.
        </p>
      </div>
    </section>
  );
}

// DASHBOARD
function Dashboard({
  activePage,
  onPayNow,
  paymentLoading,
  paymentCompleted,
  expenses,
  setExpenses,
}) {
  return (
    <main className="main-content">
      {activePage === "Overview" && (
        <>
          <PaymentOverview
            onPayNow={onPayNow}
            paymentLoading={paymentLoading}
            paymentCompleted={paymentCompleted}
          />

          <div className="dashboard-grid">
            <Contributions
              onPayNow={onPayNow}
              paymentLoading={paymentLoading}
              paymentCompleted={paymentCompleted}
            />

            <Transactions paymentCompleted={paymentCompleted} />
          </div>
        </>
      )}

      {activePage === "Contributions" && (
        <>
          <div className="page-heading">
            <span className="eyebrow">GROUP MANAGEMENT</span>
            <h1>Contributions</h1>
            <p>Track each member's payment share.</p>
          </div>

          <Contributions
            onPayNow={onPayNow}
            paymentLoading={paymentLoading}
            paymentCompleted={paymentCompleted}
          />
        </>
      )}

      {activePage === "Transactions" && (
        <>
          <div className="page-heading">
            <span className="eyebrow">PAYMENT RECORDS</span>
            <h1>Transactions</h1>
            <p>Monitor your group's payment activity.</p>
          </div>

          <Transactions paymentCompleted={paymentCompleted} />
        </>
      )}

      {activePage === "Expense Tracker" && (
        <ExpenseTracker expenses={expenses} setExpenses={setExpenses} />
      )}

      <footer className="footer">
        <span>© 2026 ALLIN</span>
        <span>Built for better group payments.</span>
      </footer>
    </main>
  );
}

// MAIN APP
function App() {
  const [activePage, setActivePage] = useState("Overview");
  const [mobileOpen, setMobileOpen] = useState(false);

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  // TEMPORARY EXPENSE STATE
  const [expenses, setExpenses] = useState(initialExpenses);

  const captureStarted = useRef(false);

  // CREATE PAYPAL ORDER
  const handlePayNow = async () => {
    if (paymentLoading || paymentCompleted) return;

    console.log("Pay Now button clicked");

    try {
      setPaymentLoading(true);
      setPaymentError("");
      setPaymentMessage("Connecting to PayPal Sandbox...");

      console.log("Creating PayPal order...");

      const result = await createPaymentOrder(55.35, "USD");

      console.log("PayPal order created:", result);

      if (!result.approvalURL) {
        throw new Error("PayPal approval URL was not returned.");
      }

      console.log("Redirecting to:", result.approvalURL);

      window.location.assign(result.approvalURL);
    } catch (error) {
      console.error("Payment initiation failed:", error);

      setPaymentError(error.message || "Unable to initiate payment.");
      setPaymentMessage("");
      setPaymentLoading(false);
    }
  };

  // HANDLE PAYPAL REDIRECT AND CAPTURE
  useEffect(() => {
    const pathname = window.location.pathname;
    const currentUrl = new URL(window.location.href);

    // PAYMENT CANCELLED
    if (pathname === "/payment/cancel") {
      setPaymentMessage("Payment was cancelled. No payment was captured.");

      window.history.replaceState({}, document.title, "/");
      return;
    }

    // ONLY PROCESS SUCCESS URL
    if (pathname !== "/payment/success") return;

    const orderId = currentUrl.searchParams.get("token");

    if (!orderId) {
      setPaymentError("PayPal returned without an order ID.");

      window.history.replaceState({}, document.title, "/");
      return;
    }

    if (captureStarted.current) return;

    captureStarted.current = true;

    const capturePayment = async () => {
      try {
        setPaymentMessage("Verifying and capturing your payment...");
        setPaymentError("");

        console.log("Capturing PayPal order:", orderId);

        const result = await capturePaymentOrder(orderId);

        console.log("Capture response:", result);

        const capture =
          result.payment?.purchase_units?.[0]?.payments?.captures?.[0];

        if (capture?.status !== "COMPLETED") {
          throw new Error(
            `Payment was not completed. Status: ${
              capture?.status || "Unknown"
            }`,
          );
        }

        setPaymentCompleted(true);

        setPaymentMessage(
          `Payment successful! Captured $${capture.amount.value}.`,
        );
      } catch (error) {
        console.error("Payment capture failed:", error);

        setPaymentError(error.message || "Payment capture failed.");
        setPaymentMessage("");
      } finally {
        window.history.replaceState({}, document.title, "/");
      }
    };

    capturePayment();
  }, []);

  return (
    <div className="app-layout">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="app-main">
        <Header setMobileOpen={setMobileOpen} />

        <div className="payment-feedback">
          {paymentMessage && (
            <div
              className={paymentCompleted ? "payment-success" : "payment-info"}
            >
              {paymentMessage}
            </div>
          )}

          {paymentError && (
            <div className="payment-error">Payment error: {paymentError}</div>
          )}
        </div>

        <Dashboard
          activePage={activePage}
          onPayNow={handlePayNow}
          paymentLoading={paymentLoading}
          paymentCompleted={paymentCompleted}
          expenses={expenses}
          setExpenses={setExpenses}
        />
      </div>
    </div>
  );
}

export default App;
