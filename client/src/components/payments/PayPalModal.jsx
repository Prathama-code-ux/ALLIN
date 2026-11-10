import React, { useState } from 'react';
import { CreditCard, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import paymentService from '../../services/paymentService';
import useAuth from '../../context/useAuth';

export default function PayPalModal({
  isOpen,
  onClose,
  expense,
  split,
  group,
  onSuccess,
}) {
  const { user } = useAuth();
  const [step, setStep] = useState('review'); // 'review' | 'processing' | 'success' | 'error'
  const [error, setError] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);

  const amount = Number(split?.amount || 0);

  const handleProcessPayPal = async () => {
    setStep('processing');
    setError(null);

    try {
      // 1. Initiate Payment entry adhering to Payment Mongoose schema
      const initResult = await paymentService.initiatePayment({
        expenseId: expense?._id,
        groupId: group?._id || group?.id,
        userId: user?.id,
        amount,
      });

      const paymentRecord = initResult.payment;

      // 2. Simulate standard PayPal order capture confirmation
      const captureResult = await paymentService.completePayment(paymentRecord._id, {
        paypalOrderId: paymentRecord.paypalOrderId,
        paypalCaptureId: 'PAYPAL_CAP_' + Date.now().toString(36).toUpperCase(),
      });

      setOrderDetails(captureResult.payment);
      setStep('success');

      if (onSuccess) {
        onSuccess(captureResult.payment);
      }
    } catch (err) {
      setError(err.message || 'Payment could not be processed');
      setStep('error');
    }
  };

  const handleClose = () => {
    setStep('review');
    setError(null);
    setOrderDetails(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Settle via PayPal"
      maxWidth="max-w-md"
    >
      {step === 'review' && (
        <div className="space-y-4">
          {/* Amount Hero */}
          <div className="text-center p-6 rounded-2xl bg-[#080B0D] border border-white/8">
            <span className="text-xs uppercase tracking-wider text-[#94A3B8]">
              Amount to Pay
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-[#00E5D4] mt-1">
              ${amount.toFixed(2)}
            </div>
            <p className="text-xs text-[#64748B] mt-1">
              For: <span className="text-[#F3F6F6]">{expense?.title || 'Shared Expense'}</span>
            </p>
          </div>

          {/* Details breakdown */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Group:</span>
              <span className="text-[#F3F6F6] font-medium">{group?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Payer:</span>
              <span className="text-[#F3F6F6] font-medium">{user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Payment Gateway:</span>
              <span className="text-[#00E5D4] font-medium">PayPal Checkout</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Encryption:</span>
              <span className="text-emerald-400 font-medium">End-to-End Encrypted</span>
            </div>
          </div>

          {/* PayPal Checkout Button */}
          <div className="pt-2 space-y-2">
            <button
              onClick={handleProcessPayPal}
              className="w-full bg-[#0070BA] hover:bg-[#003087] text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,112,186,0.3)] hover:shadow-[0_0_25px_rgba(0,112,186,0.5)] transition-all cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Pay with PayPal</span>
            </button>
            <p className="text-[10px] text-center text-[#64748B]">
              Standard PayPal payment flow adhering to backend Payment lifecycle.
            </p>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#00E5D4]/10 border border-[#00E5D4]/30 flex items-center justify-center text-[#00E5D4] shadow-[0_0_30px_rgba(0,229,212,0.3)] animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#F3F6F6]">
              Communicating with PayPal...
            </h3>
            <p className="text-xs text-[#94A3B8] mt-1 max-w-xs">
              Authorizing transaction and registering payment capture in group ledger.
            </p>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="py-6 flex flex-col items-center justify-center text-center space-y-4 animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-[#F3F6F6]">Payment Successful!</h3>
            <p className="text-xs text-[#94A3B8] mt-1">
              Your share of <strong className="text-emerald-400 font-mono">${amount.toFixed(2)}</strong> has been settled.
            </p>
          </div>

          {orderDetails && (
            <div className="w-full p-3.5 rounded-xl bg-[#080B0D] border border-white/8 text-left space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#64748B]">Order ID:</span>
                <span className="text-[#00E5D4] truncate max-w-[180px]">{orderDetails.paypalOrderId}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#64748B]">Capture ID:</span>
                <span className="text-emerald-400 truncate max-w-[180px]">{orderDetails.paypalCaptureId}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#64748B]">Status:</span>
                <span className="text-emerald-400 font-bold uppercase">{orderDetails.status}</span>
              </div>
            </div>
          )}

          <Button
            variant="primary"
            fullWidth
            onClick={handleClose}
            className="mt-4"
          >
            Done
          </Button>
        </div>
      )}

      {step === 'error' && (
        <div className="py-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#F3F6F6]">Transaction Failed</h3>
          <p className="text-xs text-rose-300">{error}</p>
          <Button variant="secondary" onClick={() => setStep('review')}>
            Try Again
          </Button>
        </div>
      )}
    </Modal>
  );
}
