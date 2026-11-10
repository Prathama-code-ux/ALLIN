import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, Home } from 'lucide-react';
import paymentService from '../services/paymentService';
import Button from '../components/common/Button';
import Card from '../components/common/Card';

export default function PaymentReturnPage({ isCancel = false }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');
  const orderId = searchParams.get('orderId') || token;

  const [loading, setLoading] = useState(() => !isCancel && Boolean(orderId));
  const [error, setError] = useState(() => {
    if (isCancel) return null;
    return orderId ? null : 'No PayPal order reference was found in redirect URL.';
  });
  const [orderDetails, setOrderDetails] = useState(null);

  useEffect(() => {
    if (isCancel || !orderId) return;

    let isMounted = true;
    paymentService
      .completePayment(null, { paypalOrderId: orderId })
      .then((res) => {
        if (isMounted) {
          setOrderDetails(res.payment);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Could not complete PayPal capture');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isCancel, orderId]);

  if (isCancel) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-4">
        <Card className="max-w-md w-full p-8 border-amber-500/20 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#F3F6F6]">Payment Cancelled</h2>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            The PayPal transaction was cancelled. No charges were made to your account.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link to="/payments">
              <Button variant="secondary" icon={ArrowRight}>
                Back to Payments
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-4 border-white/10">
        {loading ? (
          <div className="py-8 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#00E5D4]/10 border border-[#00E5D4]/30 flex items-center justify-center text-[#00E5D4] mx-auto animate-pulse">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <h3 className="text-base font-bold text-[#F3F6F6]">
              Finalizing PayPal Settlement...
            </h3>
            <p className="text-xs text-[#94A3B8]">
              Capturing authorization and logging confirmation in group ledger.
            </p>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-[#F3F6F6]">Capture Unsuccessful</h3>
            <p className="text-xs text-rose-300">{error}</p>
            <Button variant="secondary" onClick={() => navigate('/payments')}>
              Back to Payments
            </Button>
          </div>
        ) : (
          <div className="space-y-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#F3F6F6]">Settlement Complete!</h3>
            <p className="text-xs text-[#94A3B8]">
              Your PayPal transaction has been captured successfully.
            </p>

            {orderDetails && (
              <div className="p-3.5 rounded-xl bg-[#080B0D] border border-white/5 text-left text-xs font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Order ID:</span>
                  <span className="text-[#00E5D4]">{orderDetails.paypalOrderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Capture ID:</span>
                  <span className="text-emerald-400">{orderDetails.paypalCaptureId}</span>
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button
                variant="primary"
                fullWidth
                icon={Home}
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
