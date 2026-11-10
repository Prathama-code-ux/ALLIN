import api from '../api/client';

// Local storage key prefix for isolated client-side persistence of expenses
const EXPENSE_STORAGE_KEY = 'allin_expenses_store';

function getStoredExpenses() {
  try {
    const raw = localStorage.getItem(EXPENSE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredExpenses(expenses) {
  try {
    localStorage.setItem(EXPENSE_STORAGE_KEY, JSON.stringify(expenses));
  } catch (err) {
    console.warn('Could not save expenses to local storage:', err);
  }
}

export const expenseService = {
  isBackendEndpointAvailable: false,

  // Get expenses for a specific group
  async getGroupExpenses(groupId) {
    try {
      const response = await api.get(`/expenses/group/${groupId}`);
      this.isBackendEndpointAvailable = true;
      return response.data;
    } catch {
      this.isBackendEndpointAvailable = false;
      const all = getStoredExpenses();
      const filtered = all.filter((e) => String(e.group) === String(groupId));
      return {
        isLocalFallback: true,
        expenses: filtered,
        count: filtered.length,
      };
    }
  },

  // Get all expenses across user's groups
  async getAllExpenses() {
    try {
      const response = await api.get('/expenses');
      this.isBackendEndpointAvailable = true;
      return response.data;
    } catch {
      this.isBackendEndpointAvailable = false;
      const all = getStoredExpenses();
      return {
        isLocalFallback: true,
        expenses: all,
        count: all.length,
      };
    }
  },

  // Create an expense
  async createExpense({ group, title, totalAmount, paidBy, splitType, splits }) {
    const payload = {
      group,
      title: title.trim(),
      totalAmount: Number(totalAmount),
      paidBy,
      splitType,
      splits: splits.map((s) => ({
        user: s.user,
        amount: Number(s.amount),
        status: s.status || 'pending',
      })),
    };

    try {
      const response = await api.post('/expenses', payload);
      this.isBackendEndpointAvailable = true;
      return response.data;
    } catch {
      this.isBackendEndpointAvailable = false;
      const localExpense = {
        _id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const all = getStoredExpenses();
      all.unshift(localExpense);
      saveStoredExpenses(all);

      return {
        isLocalFallback: true,
        message: 'Expense saved to local storage (Backend /api/expenses endpoint not yet mounted)',
        expense: localExpense,
      };
    }
  },

  // Delete an expense
  async deleteExpense(expenseId) {
    try {
      const response = await api.delete(`/expenses/${expenseId}`);
      return response.data;
    } catch {
      const all = getStoredExpenses();
      const filtered = all.filter((e) => e._id !== expenseId);
      saveStoredExpenses(filtered);
      return { isLocalFallback: true, success: true };
    }
  },
};

export default expenseService;
