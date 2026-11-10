
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export const createPaymentOrder = async (amount, currency = "USD") => {
  const response = await fetch(
    `${API_BASE_URL}/api/payments/create-order`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount, currency }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Unable to create payment order");
  }

  if (!data.approvalURL) {
    throw new Error("PayPal approval URL was not returned");
  }

  return data;
};

export const capturePaymentOrder = async (orderId) => {
  const response = await fetch(
    `${API_BASE_URL}/api/payments/${encodeURIComponent(orderId)}/capture`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Unable to capture payment");
  }

  return data;
};
