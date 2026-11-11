import api from '../api/client';

export const expenseService = {
  async getExpenses(params = {}) {
    const response = await api.get('/expenses', { params });
    return response.data;
  },

  async getExpenseSummary(groupId) {
    const response = await api.get('/expenses/summary', {
      params: groupId ? { groupId } : {},
    });
    return response.data;
  },

  async createExpense(expenseData) {
    const response = await api.post('/expenses', expenseData);
    return response.data;
  },

  async updateExpense(id, expenseData) {
    const response = await api.put(`/expenses/${id}`, expenseData);
    return response.data;
  },

  async deleteExpense(id) {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
  },

  async approveSplit(id) {
    const response = await api.patch(`/expenses/${id}/splits/approve`);
    return response.data;
  },
};

export default expenseService;
