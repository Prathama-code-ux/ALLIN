import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Users,
  ScanLine,
  PieChart,
  AlertCircle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { parsePaymentQR } from "../../utils/parsePaymentQR";
import { formatUSD, validatePositiveAmount } from "../../utils/currency";
import {
  CATEGORY_ICONS,
  getMemberId,
  calculateEqualSplits,
  calculatePercentageSplits,
  validateFixedSplits,
  buildEvenPercentages,
  computeSpendingStats,
} from "../../utils/expenseSplits";

const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
  "Bills",
  "Health",
  "Travel",
  "Other",
];

const SPLIT_MODES = [
  { id: "none", label: "No Split" },
  { id: "equal", label: "Equal" },
  { id: "percentage", label: "Percentage (%)" },
  { id: "fixed", label: "Fixed ($)" },
];

const formatDate = (date) => {
  if (!date) return "—";
  try {
    const str = String(date);
    const d = new Date(str.includes("T") ? str : `${str}T00:00:00`);
    if (Number.isNaN(d.getTime())) return str;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return String(date);
  }
};

const getMemberLabel = (member) => {
  if (!member) return "Group Member";
  if (typeof member === "string") return `Member (${member.slice(-4)})`;
  return member.name || member.email || `Member (${getMemberId(member).slice(-4)})`;
};

const summarizeExpensePaymentStatus = (splits = []) => {
  if (!Array.isArray(splits) || splits.length === 0) {
    return null;
  }

  const paidCount = splits.filter(
    (s) => String(s.status || "").toLowerCase() === "paid",
  ).length;
  const approvedCount = splits.filter(
    (s) => String(s.status || "").toLowerCase() === "approved",
  ).length;

  if (paidCount === splits.length) {
    return { label: "Paid", tone: "paid" };
  }
  if (paidCount > 0) {
    return { label: `Partial (${paidCount}/${splits.length} paid)`, tone: "partial" };
  }
  if (approvedCount === splits.length) {
    return { label: "Ready to Pay", tone: "approved" };
  }
  if (approvedCount > 0) {
    return { label: `Approved (${approvedCount}/${splits.length})`, tone: "approved" };
  }
  return { label: "Pending Approval", tone: "pending" };
};

const getTodayISO = () => new Date().toISOString().split("T")[0];

const getEmptyForm = (defaultGroupId = "") => ({
  title: "",
  category: "Food",
  amount: "",
  date: getTodayISO(),
  description: "",
  groupId: defaultGroupId,
  paymentSource: "personal",
});

export default function ExpenseTracker({
  expenses = [],
  groups = [],
  activeGroup,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  loading = false,
  onOpenQRScanner,
  scannedQRData = "",
  onQRDataHandled,
  poolData = { availablePoolBalance: 0 },
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingHasPaidSplit, setEditingHasPaidSplit] = useState(false);
  const [formData, setFormData] = useState(() => getEmptyForm(""));
  const [qrDetails, setQrDetails] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Split allocation state
  const [splitMode, setSplitMode] = useState("none"); // 'none' | 'equal' | 'percentage' | 'fixed'
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [percentagesByMember, setPercentagesByMember] = useState({});
  const [fixedAmountsByMember, setFixedAmountsByMember] = useState({});

  // History filters & expanded rows
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const openGroups = useMemo(
    () =>
      groups.filter(
        (group) => group.status !== "closed" && !group.deletedAt,
      ),
    [groups],
  );

  const defaultOpenGroupId = useMemo(() => {
    const activeId = getMemberId(activeGroup);
    if (
      activeId &&
      openGroups.some((g) => getMemberId(g) === activeId)
    ) {
      return activeId;
    }
    return "";
  }, [activeGroup, openGroups]);

  const selectedGroup = useMemo(() => {
    if (!formData.groupId) return null;
    return (
      groups.find((g) => getMemberId(g) === String(formData.groupId)) || null
    );
  }, [groups, formData.groupId]);

  const groupMembers = useMemo(
    () => (Array.isArray(selectedGroup?.members) ? selectedGroup.members : []),
    [selectedGroup],
  );

  const initializeSplitStateForGroup = (groupObj, preferredMode = "equal") => {
    if (!groupObj || !Array.isArray(groupObj.members) || groupObj.members.length === 0) {
      setSplitMode("none");
      setSelectedMemberIds([]);
      setPercentagesByMember({});
      setFixedAmountsByMember({});
      return;
    }

    const memberIds = groupObj.members.map(getMemberId).filter(Boolean);
    setSelectedMemberIds(memberIds);
    setSplitMode(preferredMode);
    setPercentagesByMember(buildEvenPercentages(memberIds));
    setFixedAmountsByMember({});
  };

  // Autofill form from scanned QR payment payload
  useEffect(() => {
    if (!scannedQRData) return;

    const parsed = parsePaymentQR(scannedQRData);
    setQrDetails(parsed);

    const descriptionParts = [];
    if (parsed.upiId) descriptionParts.push(`Payee ID: ${parsed.upiId}`);
    if (parsed.note) descriptionParts.push(`Note: ${parsed.note}`);

    const grp = openGroups.find((g) => getMemberId(g) === defaultOpenGroupId);
    setFormData({
      title: parsed.merchantName || "Scanned QR Expense",
      category: "Other",
      amount: parsed.amount || "",
      date: getTodayISO(),
      description: descriptionParts.join(" | "),
      groupId: defaultOpenGroupId,
    });

    initializeSplitStateForGroup(
      grp,
      grp && grp.members?.length > 0 ? "equal" : "none",
    );

    setEditingId(null);
    setEditingHasPaidSplit(false);
    setFormError("");
    setShowForm(true);
    onQRDataHandled?.();
  }, [scannedQRData, onQRDataHandled, defaultOpenGroupId, openGroups]);

  const openAddForm = () => {
    const grp = openGroups.find((g) => getMemberId(g) === defaultOpenGroupId);
    setEditingId(null);
    setEditingHasPaidSplit(false);
    setQrDetails(null);
    setFormData(getEmptyForm(defaultOpenGroupId));
    initializeSplitStateForGroup(
      grp,
      grp && grp.members?.length > 0 ? "equal" : "none",
    );
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = (expense) => {
    const expenseGroupId =
      typeof expense.group === "object"
        ? getMemberId(expense.group)
        : String(expense.group || "");
    const targetGroup =
      groups.find((g) => getMemberId(g) === expenseGroupId) || null;
    const hasPaidSplit =
      Array.isArray(expense.splits) &&
      expense.splits.some(
        (s) => String(s.status || "").toLowerCase() === "paid",
      );

    setEditingId(expense.id || expense._id);
    setEditingHasPaidSplit(hasPaidSplit);
    setQrDetails(null);
    setFormData({
      title: expense.title || "",
      category: expense.category || "Food",
      amount: String(expense.amount ?? ""),
      date: expense.date || getTodayISO(),
      description: expense.description || "",
      groupId: expenseGroupId,
      paymentSource: expense.paymentSource || "personal",
    });

    const existingSplits = Array.isArray(expense.splits) ? expense.splits : [];
    if (expenseGroupId && existingSplits.length > 0) {
      const ids = existingSplits
        .map((s) => String(s.userId || s.user || ""))
        .filter(Boolean);
      const amtMap = {};
      const pctMap = {};
      const expTotal = Number(expense.amount || 0);

      existingSplits.forEach((s) => {
        const uid = String(s.userId || s.user || "");
        if (!uid) return;
        amtMap[uid] = Number(s.amount || 0).toFixed(2);
        pctMap[uid] =
          expTotal > 0
            ? Number(((Number(s.amount || 0) / expTotal) * 100).toFixed(1))
            : 0;
      });

      setSelectedMemberIds(ids);
      setFixedAmountsByMember(amtMap);
      setPercentagesByMember(
        Object.keys(pctMap).length > 0 ? pctMap : buildEvenPercentages(ids),
      );
      setSplitMode(expense.splitType === "custom" ? "fixed" : "equal");
    } else if (expenseGroupId && targetGroup?.members?.length > 0) {
      const ids = targetGroup.members.map(getMemberId).filter(Boolean);
      setSelectedMemberIds(ids);
      setPercentagesByMember(buildEvenPercentages(ids));
      setFixedAmountsByMember({});
      setSplitMode(expense.splitType === "none" ? "none" : "equal");
    } else {
      setSelectedMemberIds([]);
      setPercentagesByMember({});
      setFixedAmountsByMember({});
      setSplitMode("none");
    }

    setFormError("");
    setShowForm(true);
  };

  const handleGroupSelectionChange = (newGroupId) => {
    setFormData((prev) => ({ ...prev, groupId: newGroupId }));
    setFormError("");

    const grp = openGroups.find((g) => getMemberId(g) === String(newGroupId));
    initializeSplitStateForGroup(
      grp,
      grp && grp.members?.length > 0 ? "equal" : "none",
    );
  };

  const handleSplitModeChange = (nextMode) => {
    setSplitMode(nextMode);
    setFormError("");

    if (nextMode === "percentage" && selectedMemberIds.length > 0) {
      const hasAnyValue = selectedMemberIds.some(
        (id) => Number(percentagesByMember[id] || 0) > 0,
      );
      if (!hasAnyValue) {
        setPercentagesByMember(buildEvenPercentages(selectedMemberIds));
      }
    }

    if (nextMode === "fixed" && selectedMemberIds.length > 0) {
      const hasAnyFixed = selectedMemberIds.some(
        (id) => Number(fixedAmountsByMember[id] || 0) > 0,
      );
      const amtNum = Number(formData.amount);
      if (!hasAnyFixed && Number.isFinite(amtNum) && amtNum > 0) {
        const equalRes = calculateEqualSplits(amtNum, selectedMemberIds);
        if (equalRes.isValid) {
          const initialFixed = {};
          Object.entries(equalRes.sharesByMember).forEach(([id, val]) => {
            initialFixed[id] = val.toFixed(2);
          });
          setFixedAmountsByMember(initialFixed);
        }
      }
    }
  };

  const handleToggleMember = (memberId) => {
    setFormError("");
    setSelectedMemberIds((prev) => {
      const exists = prev.includes(memberId);
      const next = exists
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId];

      if (splitMode === "percentage") {
        setPercentagesByMember((prevPct) => {
          const updated = { ...prevPct };
          if (exists) {
            delete updated[memberId];
          } else {
            return buildEvenPercentages(next);
          }
          return updated;
        });
      }
      return next;
    });
  };

  const handleDistributeEvenly = () => {
    setFormError("");
    if (selectedMemberIds.length === 0) return;

    if (splitMode === "percentage") {
      setPercentagesByMember(buildEvenPercentages(selectedMemberIds));
    } else if (splitMode === "fixed") {
      const amtNum = Number(formData.amount);
      if (Number.isFinite(amtNum) && amtNum > 0) {
        const eq = calculateEqualSplits(amtNum, selectedMemberIds);
        if (eq.isValid) {
          const nextFixed = {};
          Object.entries(eq.sharesByMember).forEach(([id, val]) => {
            nextFixed[id] = val.toFixed(2);
          });
          setFixedAmountsByMember(nextFixed);
        }
      }
    }
  };

  // Live split evaluation
  const splitEvaluation = useMemo(() => {
    if (!formData.groupId || splitMode === "none" || editingHasPaidSplit) {
      return {
        isValid: true,
        apiSplitType: "none",
        splits: [],
        sharesByMember: {},
        error: "",
      };
    }

    const totalNum = Number(formData.amount);

    if (splitMode === "equal") {
      const res = calculateEqualSplits(totalNum, selectedMemberIds);
      return {
        ...res,
        apiSplitType: "equal",
      };
    }

    if (splitMode === "percentage") {
      const res = calculatePercentageSplits(
        totalNum,
        percentagesByMember,
        selectedMemberIds,
      );
      return {
        ...res,
        apiSplitType: "custom",
      };
    }

    const res = validateFixedSplits(
      totalNum,
      fixedAmountsByMember,
      selectedMemberIds,
    );
    return {
      ...res,
      apiSplitType: "custom",
    };
  }, [
    formData.groupId,
    formData.amount,
    splitMode,
    editingHasPaidSplit,
    selectedMemberIds,
    percentagesByMember,
    fixedAmountsByMember,
  ]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.title.trim()) {
      setFormError("Please enter an expense title.");
      return;
    }

    const amountCheck = validatePositiveAmount(formData.amount, "Amount");
    if (!amountCheck.valid && !editingHasPaidSplit) {
      setFormError(amountCheck.error);
      return;
    }

    if (formData.groupId && formData.paymentSource === "pool" && !editingHasPaidSplit) {
      const avail = Number(poolData?.availablePoolBalance || 0);
      if (amountCheck.value > avail) {
        setFormError(
          `Pool balance insufficient ($${avail.toFixed(2)} available). Please contribute to pool or select Personal Advance.`
        );
        return;
      }
    }

    if (formData.groupId && splitMode !== "none" && !editingHasPaidSplit) {
      if (!splitEvaluation.isValid) {
        setFormError(
          splitEvaluation.error || "Please resolve invalid split allocations.",
        );
        return;
      }
    }

    setSubmitting(true);

    try {
      const basePayload = {
        title: formData.title.trim(),
        category: formData.category,
        date: formData.date,
        description: formData.description.trim(),
        paymentSource: formData.groupId ? (formData.paymentSource || "personal") : "personal",
      };

      if (editingId !== null) {
        const updatePayload = editingHasPaidSplit
          ? basePayload
          : {
              ...basePayload,
              amount: amountCheck.value,
              ...(formData.groupId
                ? {
                    splitType: splitEvaluation.apiSplitType,
                    splits:
                      splitMode === "none" ? [] : splitEvaluation.splits,
                  }
                : {}),
            };
        await onUpdateExpense(editingId, updatePayload);
      } else {
        const createPayload = {
          ...basePayload,
          amount: amountCheck.value,
          groupId: formData.groupId || null,
          ...(formData.groupId
            ? {
                splitType: splitEvaluation.apiSplitType,
                splits:
                  splitMode === "none" ? [] : splitEvaluation.splits,
              }
            : { splitType: "none", splits: [] }),
        };
        await onAddExpense(createPayload);
      }

      setShowForm(false);
      setEditingId(null);
      setEditingHasPaidSplit(false);
      setFormData(getEmptyForm(defaultOpenGroupId));
      setQrDetails(null);
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
          err.message ||
          "Could not save expense.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, event) => {
    event?.stopPropagation();
    try {
      await onDeleteExpense(id);
    } catch (err) {
      console.error("Failed to delete expense:", err);
      window.alert(
        err.response?.data?.message ||
          err.message ||
          "Unable to delete expense.",
      );
    }
  };

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Spending analytics (strictly computed from real backend expense data)
  const spendingStats = useMemo(
    () => computeSpendingStats(expenses),
    [expenses],
  );

  // Filtered history list (search by title or description + category)
  const filteredExpenses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return expenses.filter((exp) => {
      const matchesSearch =
        !query ||
        String(exp.title || "").toLowerCase().includes(query) ||
        String(exp.description || "").toLowerCase().includes(query);
      const matchesCategory =
        filterCategory === "All" || exp.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchQuery, filterCategory]);

  const filteredTotal = useMemo(
    () =>
      filteredExpenses.reduce(
        (sum, exp) => sum + Number(exp.amount || 0),
        0,
      ),
    [filteredExpenses],
  );

  const resetFilters = () => {
    setSearchQuery("");
    setFilterCategory("All");
  };

  return (
    <div className="expense-page">
      {/* Header Banner */}
      <div className="panel expense-hero-panel">
        <div>
          <span className="eyebrow">EXPENSE MANAGEMENT</span>
          <h2>Expense Tracker & Splits</h2>
          <p className="muted">
            Record expenses in USD, divide costs with crew members, and analyze
            spending by category.
          </p>
        </div>

        <div className="expense-hero-actions">
          {onOpenQRScanner && (
            <button
              type="button"
              className="scan-qr-button"
              onClick={onOpenQRScanner}
            >
              <ScanLine className="w-4 h-4" />
              <span>Scan Bill / QR</span>
            </button>
          )}
          <button
            type="button"
            className="add-expense-button"
            onClick={openAddForm}
          >
            <Plus className="w-4 h-4" />
            <span>Add New Expense</span>
          </button>
        </div>
      </div>

      {/* Spending Analysis Panel */}
      <section className="panel expense-categories-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">SPENDING ANALYSIS</span>
            <h2>Category Breakdown & Insights</h2>
            <p className="spending-subtitle">
              Real-time USD spending breakdown across recorded expenses.
            </p>
          </div>
          {spendingStats.count > 0 && (
            <span className="expense-count-pill">
              <PieChart className="w-3.5 h-3.5" />
              {spendingStats.categoriesBreakdown.length}{" "}
              {spendingStats.categoriesBreakdown.length === 1
                ? "Category"
                : "Categories"}
            </span>
          )}
        </div>

        {/* 4 Summary Cards */}
        <div className="spending-summary-grid">
          <div className="spending-summary-card spending-total-card">
            <span>TOTAL RECORDED EXPENSES</span>
            <strong>{formatUSD(spendingStats.totalExpenses)}</strong>
            <small>Total in USD</small>
          </div>

          <div className="spending-summary-card">
            <span>NUMBER OF EXPENSES</span>
            <strong>{spendingStats.count}</strong>
            <small>
              {spendingStats.count === 1
                ? "1 recorded entry"
                : `${spendingStats.count} recorded entries`}
            </small>
          </div>

          <div className="spending-summary-card">
            <span>HIGHEST-SPENDING CATEGORY</span>
            <strong>
              {spendingStats.topCategory
                ? `${spendingStats.topCategory.icon} ${spendingStats.topCategory.name}`
                : "None"}
            </strong>
            <small>
              {spendingStats.topCategory
                ? `${formatUSD(spendingStats.topCategory.amount)} spent`
                : "No expenses recorded"}
            </small>
          </div>

          <div className="spending-summary-card">
            <span>TOP CATEGORY SHARE</span>
            <strong>{spendingStats.topCategoryPercentage.toFixed(1)}%</strong>
            <small>Of total recorded spending</small>
          </div>
        </div>

        {spendingStats.categoriesBreakdown.length === 0 ? (
          <div className="spending-empty">
            <span className="spending-empty-icon">◈</span>
            <h3>No Spending Data Yet</h3>
            <p>
              Add an expense above or scan a payment QR code to generate
              category analytics.
            </p>
          </div>
        ) : (
          <div className="spending-category-list">
            {spendingStats.categoriesBreakdown.map((cat) => {
              const pct = Number(cat.percentage || 0);
              return (
                <div key={cat.name} className="spending-category-item">
                  <div className="spending-category-top">
                    <div className="spending-category-name">
                      <span className="spending-category-icon">
                        {cat.icon}
                      </span>
                      <div>
                        <strong>{cat.name}</strong>
                        <small>
                          {cat.count}{" "}
                          {cat.count === 1 ? "expense" : "expenses"}
                        </small>
                      </div>
                    </div>

                    <div className="spending-category-values">
                      <span className="spending-category-amount">
                        {formatUSD(cat.amount)} USD
                      </span>
                      <span className="spending-category-pct">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="spending-progress-track">
                    <div
                      className="spending-progress-fill"
                      style={{
                        width: `${Math.min(100, Math.max(0, pct)).toFixed(2)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add / Edit Expense Modal */}
      {showForm && (
        <div
          className="expense-modal-backdrop"
          onClick={() => setShowForm(false)}
        >
          <div
            className="expense-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="expense-modal-header">
              <div>
                <span className="eyebrow">
                  {editingId !== null ? "EDIT EXPENSE" : "ADD NEW EXPENSE"}
                </span>
                <h3>
                  {editingId !== null ? "Update Expense" : "New Expense (USD)"}
                </h3>
              </div>
              <button
                type="button"
                className="close-modal-button"
                onClick={() => setShowForm(false)}
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editingId === null && onOpenQRScanner && (
              <div className="expense-modal-qr-row">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    onOpenQRScanner();
                  }}
                  className="expense-qr-trigger"
                >
                  <ScanLine className="w-4 h-4" />
                  <span>Scan Bill / Merchant QR</span>
                </button>
              </div>
            )}

            {qrDetails && (
              <div className="expense-qr-banner">
                <p className="expense-qr-banner-title">
                  Autofilled from scanned QR
                </p>
                {qrDetails.merchantName && (
                  <p className="expense-qr-banner-line">
                    Merchant: <span>{qrDetails.merchantName}</span>
                  </p>
                )}
                {qrDetails.upiId && (
                  <p className="expense-qr-banner-line">
                    Payee ID: <span>{qrDetails.upiId}</span>
                  </p>
                )}
                {qrDetails.note && (
                  <p className="expense-qr-banner-line">
                    Note: <span>{qrDetails.note}</span>
                  </p>
                )}
              </div>
            )}

            {editingHasPaidSplit && (
              <div className="expense-lock-notice">
                <Lock className="w-4 h-4 shrink-0" />
                <span>
                  Amount and splits are locked because one or more member
                  shares have already been paid. You can still update title,
                  category, date, and description.
                </span>
              </div>
            )}

            {formError && (
              <div className="expense-form-error" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="expense-form">
              <div className="form-group">
                <label htmlFor="expense-title">Title *</label>
                <input
                  id="expense-title"
                  type="text"
                  placeholder="e.g. Team dinner at Harbor Grill"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>

              {editingId === null ? (
                <div className="form-group">
                  <label htmlFor="expense-group">Group / Crew</label>
                  <select
                    id="expense-group"
                    value={formData.groupId}
                    onChange={(e) => handleGroupSelectionChange(e.target.value)}
                  >
                    <option value="">Personal Expense (No Group)</option>
                    {openGroups.map((group) => {
                      const gid = getMemberId(group);
                      return (
                        <option key={gid} value={gid}>
                          {group.name} ({group.members?.length || 1} members)
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                selectedGroup && (
                  <div className="form-group">
                    <label>Group / Crew</label>
                    <div className="expense-readonly-field">
                      <Users className="w-4 h-4 text-[#a66bff]" />
                      <span>{selectedGroup.name}</span>
                    </div>
                  </div>
                )
              )}

              {formData.groupId && (
                <div className="form-group">
                  <label className="text-xs font-semibold text-[#94A3B8]">Payment Source *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1.5">
                    <button
                      type="button"
                      disabled={editingHasPaidSplit}
                      onClick={() => setFormData({ ...formData, paymentSource: "personal" })}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        (formData.paymentSource || "personal") === "personal"
                          ? "bg-[#a66bff]/15 border-[#a66bff] shadow-[0_0_15px_rgba(166,107,255,0.2)] text-white"
                          : "bg-white/[0.03] border-white/10 text-[#94A3B8] hover:border-white/20"
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center gap-1.5 text-[#F3F6F6]">
                        <span>👤 Personal Advance</span>
                      </div>
                      <p className="text-[11px] text-[#94A3B8] mt-1">
                        You pay upfront. Members reimburse you their shares.
                      </p>
                    </button>

                    <button
                      type="button"
                      disabled={editingHasPaidSplit}
                      onClick={() => setFormData({ ...formData, paymentSource: "pool" })}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        formData.paymentSource === "pool"
                          ? "bg-emerald-500/15 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)] text-white"
                          : "bg-white/[0.03] border-white/10 text-[#94A3B8] hover:border-white/20"
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center justify-between text-[#F3F6F6]">
                        <span>🏦 Group Pool Funds</span>
                        <span className="text-[11px] font-mono font-bold text-emerald-400">
                          ${(poolData?.availablePoolBalance || 0).toFixed(2)} avail
                        </span>
                      </div>
                      <p className="text-[11px] text-[#94A3B8] mt-1">
                        Deducts from shared pool balance. No member debts created.
                      </p>
                    </button>
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="expense-category">Category *</label>
                  <select
                    id="expense-category"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_ICONS[cat] || "📦"} {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="expense-amount">Amount (USD $) *</label>
                  <input
                    id="expense-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    disabled={editingHasPaidSplit}
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="expense-date">Date *</label>
                <input
                  id="expense-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="expense-description">Description</label>
                <textarea
                  id="expense-description"
                  rows="3"
                  placeholder="Optional receipt notes or expense details..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              {/* Group Member Splitting Controls */}
              {formData.groupId && groupMembers.length > 0 && !editingHasPaidSplit && (
                <div className="expense-split-panel">
                  <div className="expense-split-header">
                    <div>
                      <span className="expense-split-title">
                        <Users className="w-4 h-4 text-[#a66bff]" />
                        Split Among Group Members
                      </span>
                      <p className="expense-split-subtitle">
                        Choose how to allocate this USD expense across crew
                        members.
                      </p>
                    </div>

                    {(splitMode === "percentage" || splitMode === "fixed") &&
                      selectedMemberIds.length > 0 && (
                        <button
                          type="button"
                          className="split-even-button"
                          onClick={handleDistributeEvenly}
                        >
                          Split Evenly
                        </button>
                      )}
                  </div>

                  {/* Mode Switcher */}
                  <div className="split-mode-tabs" role="tablist">
                    {SPLIT_MODES.map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        role="tab"
                        aria-selected={splitMode === mode.id}
                        className={`split-mode-tab ${
                          splitMode === mode.id ? "active" : ""
                        }`}
                        onClick={() => handleSplitModeChange(mode.id)}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  {splitMode !== "none" && (
                    <div className="split-member-list">
                      {groupMembers.map((member) => {
                        const memberId = getMemberId(member);
                        const isSelected = selectedMemberIds.includes(memberId);
                        const share =
                          splitEvaluation.sharesByMember?.[memberId] ?? 0;
                        const pctValue = percentagesByMember[memberId] ?? 0;
                        const fixedValue = fixedAmountsByMember[memberId] ?? "";

                        return (
                          <div
                            key={memberId}
                            className={`split-member-row ${
                              isSelected ? "selected" : "unselected"
                            }`}
                          >
                            <label className="split-member-check">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleMember(memberId)}
                              />
                              <span className="split-member-name">
                                {getMemberLabel(member)}
                              </span>
                            </label>

                            {isSelected ? (
                              <div className="split-member-controls">
                                {splitMode === "percentage" && (
                                  <div className="split-pct-inputs">
                                    <input
                                      type="range"
                                      min="0"
                                      max="100"
                                      step="0.5"
                                      aria-label={`Percentage slider for ${getMemberLabel(member)}`}
                                      value={Number(pctValue) || 0}
                                      onChange={(e) =>
                                        setPercentagesByMember((prev) => ({
                                          ...prev,
                                          [memberId]: e.target.value,
                                        }))
                                      }
                                    />
                                    <div className="split-number-wrap">
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        aria-label={`Percentage for ${getMemberLabel(member)}`}
                                        value={pctValue}
                                        onChange={(e) =>
                                          setPercentagesByMember((prev) => ({
                                            ...prev,
                                            [memberId]: e.target.value,
                                          }))
                                        }
                                      />
                                      <span>%</span>
                                    </div>
                                  </div>
                                )}

                                {splitMode === "fixed" && (
                                  <div className="split-number-wrap fixed-amount-wrap">
                                    <span>$</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      placeholder="0.00"
                                      aria-label={`Fixed amount for ${getMemberLabel(member)}`}
                                      value={fixedValue}
                                      onChange={(e) =>
                                        setFixedAmountsByMember((prev) => ({
                                          ...prev,
                                          [memberId]: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                )}

                                <span className="split-calculated-share">
                                  {formatUSD(share)}
                                </span>
                              </div>
                            ) : (
                              <span className="split-excluded-tag">
                                Excluded
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {/* Split Allocation Summary Bar */}
                      <div
                        className={`split-summary-bar ${
                          splitEvaluation.isValid ? "valid" : "invalid"
                        }`}
                      >
                        {splitEvaluation.isValid ? (
                          <div className="split-summary-ok">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>
                              Allocated:{" "}
                              <strong>
                                {formatUSD(splitEvaluation.totalAssigned)} USD
                              </strong>{" "}
                              across {selectedMemberIds.length}{" "}
                              {selectedMemberIds.length === 1
                                ? "member"
                                : "members"}
                              {splitMode === "percentage" &&
                                ` (${Number(splitEvaluation.totalPercentage || 100).toFixed(1)}%)`}
                            </span>
                          </div>
                        ) : (
                          <div className="split-summary-err">
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                            <span>{splitEvaluation.error}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-expense-button"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="add-expense-button"
                  disabled={submitting}
                >
                  {submitting
                    ? "Saving..."
                    : editingId !== null
                      ? "Update Expense"
                      : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense History Panel */}
      <section className="panel expense-history-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">EXPENSE HISTORY</span>
            <h2>Recorded Expenses & Splits</h2>
          </div>
          <span className="expense-history-summary-chip">
            {filteredExpenses.length}{" "}
            {filteredExpenses.length === 1 ? "item" : "items"} •{" "}
            {formatUSD(filteredTotal)} USD
          </span>
        </div>

        {/* Search & Category Filters */}
        <div className="expense-filters">
          <div className="expense-search-wrapper">
            <Search className="w-4 h-4 text-[#7E8B99] shrink-0" />
            <input
              type="search"
              placeholder="Search expenses by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            aria-label="Filter by category"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="empty-expenses">Loading expenses...</div>
        ) : expenses.length === 0 ? (
          <div className="empty-expenses">
            <span>◈</span>
            <h3>No Expenses Recorded Yet</h3>
            <p>
              Click &ldquo;Add New Expense&rdquo; or scan a payment QR code to
              start tracking USD expenses.
            </p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="empty-expenses">
            <span>⌕</span>
            <h3>No Matching Expenses</h3>
            <p>Try adjusting your search query or category filter.</p>
            <button
              type="button"
              className="reset-filters-button"
              onClick={resetFilters}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="expense-history-list">
            {filteredExpenses.map((exp) => {
              const expId = exp.id || exp._id;
              const isExpanded = expandedIds.has(expId);
              const splits = Array.isArray(exp.splits) ? exp.splits : [];
              const paymentStatus = summarizeExpensePaymentStatus(splits);
              const hasLegacyCurrency =
                exp.currency && exp.currency !== "USD";

              const groupIdStr =
                typeof exp.group === "object"
                  ? getMemberId(exp.group)
                  : String(exp.group || "");
              const groupObj = groupIdStr
                ? groups.find((g) => getMemberId(g) === groupIdStr)
                : null;
              const groupLabel =
                (typeof exp.group === "object" && exp.group?.name) ||
                groupObj?.name ||
                null;

              return (
                <article
                  key={expId}
                  className={`expense-history-card ${
                    isExpanded ? "expanded" : ""
                  }`}
                >
                  <div
                    className="expense-history-row"
                    onClick={() => toggleExpand(expId)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleExpand(expId);
                      }
                    }}
                    aria-expanded={isExpanded}
                  >
                    <div className="expense-history-main">
                      <div className="expense-title-line">
                        <span className="expense-category-tag">
                          {CATEGORY_ICONS[exp.category] || "📦"} {exp.category}
                        </span>
                        <strong className="expense-item-title">
                          {exp.title}
                        </strong>
                      </div>

                      <div className="expense-meta-line">
                        <span>{formatDate(exp.date)}</span>
                        {exp.paymentSource === "pool" ? (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400 font-semibold">🏦 Pool Funded</span>
                          </>
                        ) : exp.group ? (
                          <>
                            <span>•</span>
                            <span className="text-[#c49cff] font-medium">👤 Personal Advance</span>
                          </>
                        ) : null}
                        {exp.paidBy && (
                          <>
                            <span>•</span>
                            <span>Paid by {exp.paidBy}</span>
                          </>
                        )}
                        {groupLabel && (
                          <>
                            <span>•</span>
                            <span>{groupLabel}</span>
                          </>
                        )}
                        {splits.length > 0 && (
                          <>
                            <span>•</span>
                            <span>
                              {exp.splitType === "custom" ? "Custom" : "Equal"}{" "}
                              split ({splits.length}{" "}
                              {splits.length === 1 ? "share" : "shares"})
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="expense-history-right">
                      {paymentStatus && (
                        <span
                          className={`expense-status-pill tone-${paymentStatus.tone}`}
                        >
                          {paymentStatus.label}
                        </span>
                      )}

                      <div className="expense-amount-block">
                        <span className="expense-amount">
                          {formatUSD(exp.amount)}
                        </span>
                        <span className="expense-currency-code">
                          {exp.currency || "USD"}
                        </span>
                        {hasLegacyCurrency && (
                          <span
                            className="expense-legacy-currency-badge"
                            title="Recorded prior to USD standardization"
                          >
                            Legacy {exp.currency}
                          </span>
                        )}
                      </div>

                      <div
                        className="expense-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="expand-expense-btn"
                          onClick={() => toggleExpand(expId)}
                          title={isExpanded ? "Hide details" : "View details"}
                          aria-label={
                            isExpanded
                              ? `Hide details for ${exp.title}`
                              : `View details for ${exp.title}`
                          }
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          className="edit-expense"
                          onClick={() => openEditForm(exp)}
                          title="Edit expense"
                          aria-label={`Edit ${exp.title}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="delete-expense"
                          onClick={(e) => handleDelete(expId, e)}
                          title="Delete expense"
                          aria-label={`Delete ${exp.title}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Expense Details */}
                  {isExpanded && (
                    <div className="expense-history-details">
                      <div className="expense-detail-meta-grid">
                        <div>
                          <span className="detail-label">Description</span>
                          <p className="detail-value">
                            {exp.description || "No description provided."}
                          </p>
                        </div>
                        <div>
                          <span className="detail-label">Split Method</span>
                          <p className="detail-value capitalize">
                            {splits.length > 0
                              ? `${exp.splitType || "equal"} split`
                              : "Not split (Personal)"}
                          </p>
                        </div>
                        {exp.paidBy && (
                          <div>
                            <span className="detail-label">Recorded By</span>
                            <p className="detail-value">{exp.paidBy}</p>
                          </div>
                        )}
                      </div>

                      {splits.length > 0 && (
                        <div className="expense-detail-splits">
                          <span className="detail-label">
                            Member Shares ({splits.length})
                          </span>
                          <div className="expense-split-chips">
                            {splits.map((s, idx) => {
                              const sStatus = String(
                                s.status || "pending",
                              ).toLowerCase();
                              const sharePct =
                                Number(exp.amount || 0) > 0
                                  ? (
                                      (Number(s.amount || 0) /
                                        Number(exp.amount)) *
                                      100
                                    ).toFixed(1)
                                  : "0.0";

                              return (
                                <div
                                  key={s.userId || idx}
                                  className="expense-split-detail-row"
                                >
                                  <div className="split-detail-member">
                                    <strong>{s.name || "Member"}</strong>
                                    <span>({sharePct}%)</span>
                                  </div>
                                  <div className="split-detail-right">
                                    <span className="split-detail-amount">
                                      {formatUSD(s.amount)} USD
                                    </span>
                                    <span
                                      className={`split-detail-status status-${sStatus}`}
                                    >
                                      {sStatus === "paid"
                                        ? "Paid"
                                        : sStatus === "approved"
                                          ? "Approved"
                                          : "Pending"}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
