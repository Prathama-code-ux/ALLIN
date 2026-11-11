
export function parsePaymentQR(rawData) {
  const result = {
    merchantName: '',
    upiId: '',
    amount: '',
    note: '',
    rawData,
  };

  try {
    if (rawData.trim().toLowerCase().startsWith('upi://pay')) {
      const url = new URL(rawData.trim());
      const params = url.searchParams;

      const rawAmount = params.get('am');
      const amount = Number(rawAmount);

      return {
        ...result,
        merchantName: params.get('pn')?.trim() || '',
        upiId: params.get('pa')?.trim() || '',
        amount:
          rawAmount && Number.isFinite(amount) && amount > 0
            ? amount.toFixed(2)
            : '',
        note: params.get('tn')?.trim() || '',
      };
    }
  } catch (error) {
    console.error('QR parsing error:', error);
  }

  return result;
}
