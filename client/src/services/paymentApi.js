import api from '../api/client';

export const createPaymentOrder = async (amount, currency = 'USD', groupId = null) => {
  const response = await api.post('/payments/create-order', {
    amount,
    currency,
    groupId,
  });

  const data = response.data;
  if (!data || !data.success) {
    throw new Error(data?.message || 'Unable to create payment order');
  }

  if (!data.approvalURL) {
    throw new Error('PayPal approval URL was not returned');
  }

  return data;
};

export const capturePaymentOrder = async (orderId) => {
  const response = await api.post(`/payments/${encodeURIComponent(orderId)}/capture`);
  const data = response.data;

  if (!data || !data.success) {
    throw new Error(data?.message || 'Unable to capture payment');
  }

  return data;
};

export const getTransactions = async (groupId = null) => {
  const response = await api.get('/payments/transactions', {
    params: groupId ? { groupId } : {},
  });
  return response.data;
};

export default {
  createPaymentOrder,
  capturePaymentOrder,
  getTransactions,
};
