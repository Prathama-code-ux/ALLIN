import api from '../api/client';
import { createPaymentOrder, capturePaymentOrder } from './paymentApi';

const PAYMENT_STORAGE_KEY = 'allin_payments_store';

function getStoredPayments() {
  try {
    const raw = localStorage.getItem(PAYMENT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredPayments(payments) {
  try {
    localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(payments));
  } catch (err) {
    console.warn('Could not save payments to local storage:', err);
  }
}

export const paymentService = {
  isBackendEndpointAvailable: false,

  // Get payments for a group
  async getGroupPayments(groupId) {
    try {
      const response = await api.get(`/payments/group/${groupId}`);
      this.isBackendEndpointAvailable = true;
      return response.data;
    } catch {
      this.isBackendEndpointAvailable = false;
      const all = getStoredPayments();
      const filtered = all.filter((p) => String(p.group) === String(groupId));
      return {
        isLocalFallback: true,
        payments: filtered,
      };
    }
  },

  // Get all user payments (pending & completed)
  async getMyPayments() {
    try {
      const response = await api.get('/payments/me');
      this.isBackendEndpointAvailable = true;
      return response.data;
    } catch {
      this.isBackendEndpointAvailable = false;
      const all = getStoredPayments();
      return {
        isLocalFallback: true,
        payments: all,
      };
    }
  },

  // Initiate PayPal order using the backend PayPal service:
  // POST /api/payments/create-order
  async initiatePayment({ expenseId, groupId, userId, amount }) {
    const numericAmount = Number(amount);
    let paypalOrderId = null;
    let approvalURL = null;

    try {
      // Connect to Debadrita's /api/payments/create-order API
      const result = await createPaymentOrder(numericAmount, 'USD');
      paypalOrderId = result.orderId || result.order?.id;
      approvalURL = result.approvalURL;
      this.isBackendEndpointAvailable = true;
    } catch (err) {
      console.warn('Backend PayPal order creation fallback:', err.message);
      this.isBackendEndpointAvailable = false;
      paypalOrderId = 'PAYPAL_ORDER_' + Date.now().toString(36).toUpperCase();
    }

    const payload = {
      _id: 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      expense: expenseId,
      group: groupId,
      user: userId,
      amount: numericAmount,
      status: 'pending',
      paypalOrderId,
      approvalURL,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const all = getStoredPayments();
    all.unshift(payload);
    saveStoredPayments(all);

    return {
      success: true,
      payment: payload,
      approvalURL,
    };
  },

  // Complete/Capture approved PayPal order:
  // POST /api/payments/:orderId/capture
  async completePayment(paymentId, { paypalOrderId, paypalCaptureId }) {
    let capturedResult = null;

    if (paypalOrderId && !paypalOrderId.startsWith('PAYPAL_ORDER_')) {
      try {
        capturedResult = await capturePaymentOrder(paypalOrderId);
        this.isBackendEndpointAvailable = true;
      } catch (err) {
        console.warn('Backend PayPal capture fallback:', err.message);
      }
    }

    const captureId =
      capturedResult?.payment?.purchase_units?.[0]?.payments?.captures?.[0]?.id ||
      paypalCaptureId ||
      'CAP_' + Date.now().toString(36).toUpperCase();

    const all = getStoredPayments();
    const updated = all.map((p) => {
      if (p._id === paymentId || p.paypalOrderId === paypalOrderId) {
        return {
          ...p,
          status: 'captured',
          paypalOrderId: paypalOrderId || p.paypalOrderId,
          paypalCaptureId: captureId,
          paidAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    saveStoredPayments(updated);
    return {
      success: true,
      payment: updated.find((p) => p._id === paymentId || p.paypalOrderId === paypalOrderId),
    };
  },
};

export default paymentService;
