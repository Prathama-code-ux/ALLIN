import api from '../api/client';

// Client adapter integrating with Debadrita's backend PayPal lifecycle API
// Endpoints: POST /api/payments/create-order and POST /api/payments/:orderId/capture

export const createPaymentOrder = async (amount, currency = 'USD') => {
  const response = await api.post('/payments/create-order', {
    amount: Number(amount),
    currency,
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
    throw new Error(data?.message || 'Unable to capture payment order');
  }

  return data;
};

export default {
  createPaymentOrder,
  capturePaymentOrder,
};
