import api from '../api/client';

export const createPaymentOrder = async (amountOrParams, currency = 'USD', groupId = null) => {
  let payload;
  if (typeof amountOrParams === 'object' && amountOrParams !== null) {
    payload = amountOrParams;
  } else {
    payload = {
      amount: amountOrParams,
      currency,
      groupId,
    };
  }

  const response = await api.post('/payments/create-order', payload);

  const data = response.data;
  if (!data || !data.success) {
    throw new Error(data?.message || 'Unable to create payment order');
  }

  const approveUrl = data.approvalURL || data.approveUrl;
  if (!approveUrl) {
    throw new Error('PayPal approval URL was not returned');
  }

  data.approvalURL = approveUrl;
  data.approveUrl = approveUrl;

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
