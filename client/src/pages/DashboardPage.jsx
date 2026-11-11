import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/useAuth";
import {
  createPaymentOrder,
  capturePaymentOrder,
  getTransactions,
} from "../services/paymentApi";
import groupService from "../services/groupService";
import expenseService from "../services/expenseService";

import Sidebar from "../components/dashboard/Sidebar";
import Header from "../components/dashboard/Header";
import PaymentOverview from "../components/dashboard/PaymentOverview";
import Contributions from "../components/dashboard/Contributions";
import Transactions from "../components/dashboard/Transactions";
import ExpenseTracker from "../components/dashboard/ExpenseTracker";
import GroupModal from "../components/dashboard/GroupModal";
import QRScanner from "../components/dashboard/QRScanner";

// Unified sub-views
import GroupsView from "../components/dashboard/GroupsView";
import PaymentsView from "../components/dashboard/PaymentsView";
import ProfileView from "../components/dashboard/ProfileView";

export default function DashboardPage() {
  const { user } = useAuth();

  // Navigation: 'Overview' | 'My Groups' | 'Expenses' | 'Payments' | 'Transactions' | 'Profile'
  const [activePage, setActivePage] = useState("Overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  // Group & Contributions State
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [poolData, setPoolData] = useState({
    totalPool: 0,
    targetAmount: 200,
    remaining: 200,
  });

  // Expenses State (Loaded from MongoDB)
  const [expenses, setExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [pendingExpense, setPendingExpense] = useState(null);
  const [pendingExpenseGroup, setPendingExpenseGroup] = useState(null);
  const [pendingExpenseError, setPendingExpenseError] = useState("");
  const [savingPendingExpense, setSavingPendingExpense] = useState(false);

  // Transactions State (Loaded from MongoDB)
  const [transactions, setTransactions] = useState([]);

  // PayPal Flow State
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  //QR Scanner State
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [scannedQRData, setScannedQRData] = useState("");

  const handleQRScanSuccess = (decodedText) => {
    setScannedQRData(decodedText);
    setQrScannerOpen(false);
    setActivePage("Expenses");
  };
  const clearScannedQRData = useCallback(() => {
    setScannedQRData("");
  }, []);

  const captureStarted = useRef(false);

  // 1. Fetch user's groups
  const loadGroups = useCallback(async () => {
    try {
      const data = await groupService.getMyGroups();
      const userGroups = data.groups || [];
      setGroups(userGroups);

      if (userGroups.length > 0 && !activeGroup) {
        setActiveGroup(userGroups[0]);
      }
    } catch (err) {
      console.warn("Could not load groups:", err.message);
    }
  }, [activeGroup]);

  // 2. Fetch contributions for active group
  const loadGroupContributions = useCallback(async (groupId) => {
    if (!groupId) return;
    try {
      const data = await groupService.getGroupContributions(groupId);
      if (data.success) {
        setContributions(data.contributions || []);
        setPoolData({
          totalPool: data.totalPool || 0,
          targetAmount: data.targetAmount || 200,
          remaining: data.remaining || 0,
        });
      }
    } catch (err) {
      console.warn("Could not load contributions:", err.message);
    }
  }, []);

  // 3. Fetch expenses from MongoDB
  const loadExpenses = useCallback(async (groupId) => {
    setExpensesLoading(true);
    try {
      const data = await expenseService.getExpenses({ groupId });
      setExpenses(data.expenses || []);
    } catch (err) {
      console.warn("Could not load expenses:", err.message);
    } finally {
      setExpensesLoading(false);
    }
  }, []);

  // 4. Fetch transactions from MongoDB
  const loadTransactions = useCallback(async (groupId) => {
    try {
      const data = await getTransactions(groupId);
      setTransactions(data.transactions || []);
    } catch (err) {
      console.warn("Could not load transactions:", err.message);
    }
  }, []);

  // Refresh all dashboard data
  const refreshAllData = useCallback(async () => {
    setRefreshing(true);
    await loadGroups();
    if (activeGroup?._id) {
      await Promise.all([
        loadGroupContributions(activeGroup._id),
        loadExpenses(activeGroup._id),
        loadTransactions(activeGroup._id),
      ]);
    }
    setRefreshing(false);
  }, [
    loadGroups,
    activeGroup,
    loadGroupContributions,
    loadExpenses,
    loadTransactions,
  ]);

  // Initial load
  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Reload data when active group changes
  useEffect(() => {
    if (activeGroup?._id) {
      loadGroupContributions(activeGroup._id);
      loadExpenses(activeGroup._id);
      loadTransactions(activeGroup._id);
    }
  }, [activeGroup, loadGroupContributions, loadExpenses, loadTransactions]);

  // 5. Handle PayPal redirect / callback lifecycle
  useEffect(() => {
    const pathname = window.location.pathname;
    const currentUrl = new URL(window.location.href);

    // Cancelled payment callback
    if (
      pathname === "/payment/cancel" ||
      currentUrl.searchParams.get("cancel") === "true"
    ) {
      setPaymentMessage("Payment was cancelled. No charges were made.");
      setPaymentError("");
      window.history.replaceState({}, document.title, "/dashboard");
      return;
    }

    // Success capture callback
    if (
      pathname === "/payment/success" ||
      currentUrl.searchParams.has("token")
    ) {
      const orderId = currentUrl.searchParams.get("token");

      if (!orderId) {
        setPaymentError("PayPal returned without a valid order token.");
        window.history.replaceState({}, document.title, "/dashboard");
        return;
      }

      if (captureStarted.current) return;
      captureStarted.current = true;

      const capturePayment = async () => {
        try {
          setPaymentLoading(true);
          setPaymentMessage("Verifying and capturing your PayPal payment...");
          setPaymentError("");

          console.log("Capturing PayPal order:", orderId);
          const result = await capturePaymentOrder(orderId);
          console.log("Capture response:", result);

          setPaymentCompleted(true);
          const capturedAmount =
            result.payment?.purchase_units?.[0]?.payments?.captures?.[0]?.amount
              ?.value ||
            result.record?.amount ||
            "55.35";

          setPaymentMessage(
            `Payment successful! Captured $${capturedAmount} via PayPal Sandbox.`,
          );

          // Refresh live contributions and transaction log immediately
          if (activeGroup?._id) {
            await Promise.all([
              loadGroupContributions(activeGroup._id),
              loadTransactions(activeGroup._id),
            ]);
          }
        } catch (error) {
          console.error("Payment capture failed:", error);
          setPaymentError(error.message || "Payment capture failed.");
          setPaymentMessage("");
        } finally {
          setPaymentLoading(false);
          window.history.replaceState({}, document.title, "/dashboard");
        }
      };

      capturePayment();
    }
  }, [activeGroup, loadGroupContributions, loadTransactions, loadExpenses]);

  // Initiate PayPal order creation for an expense split or group pool
  const handlePayNow = async (payTarget) => {
    if (paymentLoading || paymentCompleted) return;

    try {
      setPaymentLoading(true);
      setPaymentError("");
      setPaymentMessage("Connecting to PayPal Sandbox...");

      let payload = {};

      if (typeof payTarget === "object" && payTarget !== null) {
        payload = {
          expenseId: payTarget.expenseId || null,
          groupId: payTarget.groupId || activeGroup?._id || null,
          amount: payTarget.amount || undefined,
          currency: "USD",
        };
      } else {
        // If a number was passed directly
        payload = {
          amount: Number(payTarget || 55.35),
          currency: "USD",
          groupId: activeGroup?._id || null,
        };
      }

      const result = await createPaymentOrder(payload);

      if (!result.approvalURL) {
        throw new Error("PayPal approval URL was not returned by server.");
      }

      console.log("Redirecting to PayPal approval:", result.approvalURL);
      window.location.assign(result.approvalURL);
    } catch (error) {
      console.error("Payment initiation failed:", error);
      setPaymentError(error.message || "Unable to initiate payment.");
      setPaymentMessage("");
      setPaymentLoading(false);
    }
  };

  // Review and approve an individual expense split
  const handleApproveSplit = async (expenseId) => {
    try {
      setPaymentMessage("Reviewing and approving your split share...");
      setPaymentError("");
      await expenseService.approveSplit(expenseId);
      setPaymentMessage(
        "Your split has been approved! Ready for PayPal Sandbox payment.",
      );

      if (activeGroup?._id) {
        await Promise.all([
          loadGroupContributions(activeGroup._id),
          loadExpenses(activeGroup._id),
        ]);
      }
    } catch (error) {
      console.error("Split approval failed:", error);
      setPaymentError(
        error.response?.data?.message ||
          error.message ||
          "Unable to approve split.",
      );
      setPaymentMessage("");
    }
  };

  // Expense CRUD Handlers
  const handleAddExpense = async (expenseData) => {
    try {
      const groupId = expenseData.groupId || null;

      const result = await expenseService.createExpense({
        ...expenseData,
        groupId,
        currency: "INR",
      });

      // Switch to the selected crew, if applicable.
      if (groupId) {
        const selectedGroup = groups.find(
          (group) => String(group._id || group.id) === String(groupId),
        );

        if (selectedGroup) {
          setActiveGroup(selectedGroup);
          await Promise.all([
            loadGroupContributions(groupId),
            loadExpenses(groupId),
            loadTransactions(groupId),
          ]);
        } else {
          await loadExpenses(groupId);
        }
      } else {
        // Personal expense: no crew association.
        setActiveGroup(null);
        setContributions([]);
        setTransactions([]);
        setPoolData({
          totalPool: 0,
          targetAmount: 200,
          remaining: 200,
        });

        await Promise.all([loadExpenses(null), loadTransactions(null)]);
      }

      return result;
    } catch (error) {
      console.error("Expense creation failed:", error);

      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Could not create expense.",
      );
    }
  };

  const savePendingExpenseToGroup = async (group) => {
    if (!pendingExpense || !group) return;

    const groupId = group._id || group.id;

    if (!groupId) {
      setPendingExpenseError("The newly created group has no valid ID.");
      return;
    }

    if (savingPendingExpense) return;

    try {
      setSavingPendingExpense(true);
      setPendingExpenseError("");

      const res = await expenseService.createExpense({
        ...pendingExpense,
        groupId,
        currency: "INR",
      });

      // Make the newly created group active.
      setActiveGroup(group);

      // Update the group list without duplicating the group.
      setGroups((prev) => [
        group,
        ...prev.filter((item) => item._id !== groupId),
      ]);

      // Clear the saved draft.
      setPendingExpense(null);
      setPendingExpenseGroup(null);

      // Display the new group's payment overview.
      setActivePage("Overview");

      // Load data belonging only to this group.
      await Promise.all([
        loadGroupContributions(groupId),
        loadExpenses(groupId),
        loadTransactions(groupId),
      ]);
    } catch (err) {
      console.error("Could not save expense under new group:", err);

      // Preserve the draft and group so the expense can be retried.
      setPendingExpenseGroup(group);
      setPendingExpenseError(
        err.message || "Group created, but the expense could not be saved.",
      );
    } finally {
      setSavingPendingExpense(false);
    }
  };
  const handleNewGroupCreated = async (newGroup) => {
    setActiveGroup(newGroup);

    setGroups((prev) => [
      newGroup,
      ...prev.filter((group) => group._id !== newGroup._id),
    ]);

    if (pendingExpense) {
      await savePendingExpenseToGroup(newGroup);
    } else {
      await loadGroups();
    }
  };

  const handleUpdateExpense = async (id, expenseData) => {
    const res = await expenseService.updateExpense(id, expenseData);
    setExpenses((prev) =>
      prev.map((e) => ((e.id || e._id) === id ? res.expense : e)),
    );
  };

  const handleDeleteExpense = async (id) => {
    await expenseService.deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => (e.id || e._id) !== id));
  };

  const handleCloseGroup = async (groupId) => {
    const confirmed = window.confirm(
      "Are you sure you want to close this group? Members will no longer be able to create new expenses or join it.",
    );

    if (!confirmed) return;

    try {
      const result = await groupService.closeGroup(groupId);

      // Fetch the updated group from the backend.
      const data = await groupService.getGroupById(groupId);
      const updatedGroup = data.group || data;

      setGroups((prev) =>
        prev.map((group) => (group._id === groupId ? updatedGroup : group)),
      );

      setActiveGroup((prev) => (prev?._id === groupId ? updatedGroup : prev));

      await loadGroupContributions(groupId);

      setPaymentMessage(result.message || "Group closed successfully.");
      setPaymentError("");
    } catch (error) {
      console.error("Group closure failed:", error);

      setPaymentError(
        error.response?.data?.message ||
          error.message ||
          "Unable to close group.",
      );
      setPaymentMessage("");
    }
  };

  const handleDeleteGroup = async (groupId) => {
    await groupService.deleteGroup(groupId);

    if (activeGroup?._id === groupId) {
      setActiveGroup(null);
      setContributions([]);
      setExpenses([]);
      setTransactions([]);
    }

    await loadGroups();
  };

  // Check if current user has completed payment
  const currentUserContribution = contributions.find(
    (c) => c.userId === user?.id || c.id === user?.id,
  );
  const myPendingSplits = currentUserContribution?.pendingSplits || [];
  const nextPendingSplit = myPendingSplits[0] || null;

  const myPaymentStatus =
    currentUserContribution?.status === "COMPLETED" || paymentCompleted
      ? "COMPLETED"
      : "PENDING";

  const userShare =
    currentUserContribution?.pendingAmount !== undefined &&
    currentUserContribution?.pendingAmount > 0
      ? currentUserContribution.pendingAmount
      : currentUserContribution?.amount || 55.35;

  const totalExpenseSum = expenses.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0,
  );

  return (
    <div className="app-layout min-h-screen flex bg-[#090810] text-[#F3F6F6] font-['Plus_Jakarta_Sans']">
      {pendingExpense && pendingExpenseGroup && (
        <div className="mb-5 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
          <p className="text-sm font-semibold text-amber-300">
            Your group was created, but the expense is not saved yet.
          </p>

          {pendingExpenseError && (
            <p className="text-xs text-amber-200 mt-1">{pendingExpenseError}</p>
          )}

          <button
            type="button"
            onClick={() => savePendingExpenseToGroup(pendingExpenseGroup)}
            disabled={savingPendingExpense}
            className="mt-3 px-4 py-2 rounded-lg bg-[#a66bff] text-white text-sm font-semibold disabled:opacity-50"
          >
            {savingPendingExpense ? "Saving..." : "Retry Saving Expense"}
          </button>
        </div>
      )}
      {/* Sidebar Navigation */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        activeGroup={activeGroup}
        groups={groups}
        onOpenGroupModal={() => setGroupModalOpen(true)}
      />
      <div className="app-main flex-1 flex flex-col min-w-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(166,107,255,0.08),transparent_40%)]">
        {/* Top Header Bar */}
        <Header
          activePage={activePage}
          setActivePage={setActivePage}
          setMobileOpen={setMobileOpen}
          activeGroup={activeGroup}
          groups={groups}
          onOpenGroupModal={() => setGroupModalOpen(true)}
          onRefresh={refreshAllData}
          refreshing={refreshing}
        />

        {/* Payment Feedback Banner */}
        {(paymentMessage || paymentError) && (
          <div className="payment-feedback px-4 sm:px-6 pt-4">
            {paymentMessage && (
              <div
                className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-medium border ${
                  paymentCompleted
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                    : "bg-[#a66bff]/10 border-[#a66bff]/25 text-[#c49cff]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold">
                    {paymentCompleted ? "✓" : "ℹ"}
                  </span>
                  <span>{paymentMessage}</span>
                </div>
                <button
                  type="button"
                  className="text-xs hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 cursor-pointer"
                  onClick={() => setPaymentMessage("")}
                >
                  ✕
                </button>
              </div>
            )}

            {paymentError && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-medium flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(244,63,94,0.15)]">
                <div className="flex items-center gap-2">
                  <span>⚠</span>
                  <span>Payment notice: {paymentError}</span>
                </div>
                <button
                  type="button"
                  className="text-xs hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 cursor-pointer"
                  onClick={() => setPaymentError("")}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}

        {/* Main Content Area */}
        <main className="main-content flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto">
          {/* VIEW 1: Central Overview */}
          {activePage === "Overview" && (
            <>
              {/* Top Welcome / Status Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-[#171426] via-[#1b172e] to-[#12101e] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-widest text-[#a66bff] uppercase">
                      FINTECH COMMAND CENTER
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#F3F6F6] mt-0.5">
                    Welcome back, {user?.name?.split(" ")[0] || "Member"}
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    Managing {groups.length} active crew
                    {groups.length > 1 ? "s" : ""} • Current workspace:{" "}
                    <span className="text-[#c49cff] font-semibold">
                      {activeGroup?.name || "Default Squad"}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePage("Payments")}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#a66bff] to-[#8b43f6] hover:brightness-110 shadow-[0_0_15px_rgba(166,107,255,0.4)] transition-all cursor-pointer"
                  >
                    Manage Payments
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePage("Expenses")}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#c49cff] bg-[#171426] hover:bg-[#1f1a34] border border-[#a66bff]/30 transition-all cursor-pointer"
                  >
                    Track Expenses
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrScannerOpen(true)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#c49cff] bg-[#171426] hover:bg-[#1f1a34] border border-[#a66bff]/30 transition-all cursor-pointer"
                  >
                    Scan Bill / QR
                  </button>
                </div>
              </div>

              {/* Pool & Contribution Stats */}
              <PaymentOverview
                onPayNow={(target) => {
                  if (target) {
                    handlePayNow(target);
                  } else if (nextPendingSplit) {
                    handlePayNow({
                      expenseId: nextPendingSplit.expenseId,
                      groupId: activeGroup?._id,
                    });
                  } else {
                    handlePayNow({
                      groupId: activeGroup?._id,
                      amount: userShare,
                    });
                  }
                }}
                paymentLoading={paymentLoading}
                paymentCompleted={paymentCompleted}
                totalPool={poolData.totalPool}
                targetAmount={poolData.targetAmount}
                totalExpenses={totalExpenseSum}
                userShare={userShare}
                myPaymentStatus={myPaymentStatus}
                nextPendingSplit={nextPendingSplit}
                onApproveSplit={handleApproveSplit}
                activeGroup={activeGroup}
              />

              {/* Split & Transactions Grid */}
              <div className="dashboard-grid grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Contributions
                  contributions={contributions}
                  onPayNow={handlePayNow}
                  onApproveSplit={handleApproveSplit}
                  paymentLoading={paymentLoading}
                  paymentCompleted={paymentCompleted}
                  currentUserId={user?.id}
                />

                <Transactions
                  transactions={transactions}
                  paymentCompleted={paymentCompleted}
                />
              </div>
            </>
          )}

          {/* VIEW 2: My Groups */}
          {activePage === "My Groups" && (
            <GroupsView
              groups={groups}
              activeGroup={activeGroup}
              poolData={poolData}
              currentUserId={user?._id || user?.id}
              onSelectGroup={(grp) => setActiveGroup(grp)}
              onCloseGroup={handleCloseGroup}
              onDeleteGroup={handleDeleteGroup}
              onGroupUpdated={async (updatedGroup) => {
                setActiveGroup(updatedGroup);
                await loadGroups();
              }}
              onRefresh={loadGroups}
            />
          )}

          {/* VIEW 3: Expenses Tracker */}
          {activePage === "Expenses" && (
            <ExpenseTracker
              expenses={expenses}
              groups={groups}
              activeGroup={activeGroup}
              onAddExpense={handleAddExpense}
              onUpdateExpense={handleUpdateExpense}
              onDeleteExpense={handleDeleteExpense}
              loading={expensesLoading}
              onOpenQRScanner={() => setQrScannerOpen(true)}
              scannedQRData={scannedQRData}
              onQRDataHandled={clearScannedQRData}
            />
          )}

          {/* VIEW 4: Payments Hub */}
          {activePage === "Payments" && (
            <PaymentsView
              activeGroup={activeGroup}
              contributions={contributions}
              poolData={poolData}
              onPayNow={handlePayNow}
              paymentLoading={paymentLoading}
              paymentCompleted={paymentCompleted}
              myPaymentStatus={myPaymentStatus}
              userShare={userShare}
              currentUserId={user?.id}
            />
          )}

          {/* VIEW 5: Transactions History */}
          {activePage === "Transactions" && (
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-gradient-to-br from-[#171426] via-[#151224] to-[#0d0b17] border border-white/5 relative overflow-hidden shadow-xl">
                <span className="text-[11px] font-bold tracking-widest text-[#a66bff] uppercase">
                  PAYMENT RECORDS
                </span>
                <h1 className="text-2xl font-extrabold text-[#F3F6F6] mt-1 font-['Plus_Jakarta_Sans']">
                  Transaction History & Audit Log
                </h1>
                <p className="text-sm text-[#94A3B8] mt-1">
                  Full ledger of all PayPal Sandbox captures, orders, and group
                  settlements.
                </p>
              </div>

              <Transactions
                transactions={transactions}
                paymentCompleted={paymentCompleted}
              />
            </div>
          )}

          {/* VIEW 6: Profile & Security */}
          {activePage === "Profile" && (
            <ProfileView
              groups={groups}
              activeGroup={activeGroup}
              contributions={contributions}
              transactions={transactions}
            />
          )}

          {/* Global Footer */}
          <footer className="pt-8 pb-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-[#7E8B99] gap-2">
            <span>
              © 2026 ALLIN Financial Technologies Inc. All rights reserved.
            </span>
            <div className="flex items-center gap-4">
              <span>PayPal Sandbox Verified</span>
              <span>•</span>
              <span>Encrypted Sessions</span>
            </div>
          </footer>
        </main>
      </div>
      {/* Crew / Group Modal for quick switching */}
      <GroupModal
        isOpen={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        groups={groups}
        activeGroup={activeGroup}
        onSelectGroup={(grp) => setActiveGroup(grp)}
        initialTab={pendingExpense ? "create" : "switch"}
        onGroupCreated={handleNewGroupCreated}
        onGroupUpdated={async (updatedGroup) => {
          setActiveGroup(updatedGroup);
          await loadGroups();
        }}
      />
      <QRScanner
        isOpen={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
        onScanSuccess={handleQRScanSuccess}
      />
    </div>
  );
}
