
const PAYPAL_BASE_URL = process.env.PAYPAL_BASE_URL;
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

// Get PayPal access token
export const getAccessToken = async () => {
    if (!PAYPAL_BASE_URL || !CLIENT_ID || !CLIENT_SECRET) {
        throw new Error("PayPal environment variables are missing.");
    }

    const auth = Buffer.from(
        `${CLIENT_ID}:${CLIENT_SECRET}`
    ).toString("base64");

    let response;

    try {
        response = await fetch(
            `${PAYPAL_BASE_URL}/v1/oauth2/token`,
            {
                method: "POST",
                headers: {
                    Authorization: `Basic ${auth}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: "grant_type=client_credentials",
            }
        );
    } catch (error) {
        console.error("PayPal OAuth network error:", error.cause || error);
        throw new Error("Unable to connect to PayPal authentication API.");
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.error_description || data.message || "PayPal authentication failed."
        );
    }

    return data.access_token;
};

// Create PayPal order
export const createOrder = async (amount, currency = "USD") => {
    const accessToken = await getAccessToken();

    let response;

    try {
        console.log("Creating PayPal order...");
        console.log("PayPal API:", PAYPAL_BASE_URL);

        response = await fetch(
            `${PAYPAL_BASE_URL}/v2/checkout/orders`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    intent: "CAPTURE",
                    purchase_units: [
                        {
                            amount: {
                                currency_code: currency,
                                value: Number(amount).toFixed(2),
                            },
                        },
                    ],
                    application_context: {
                        return_url: "http://localhost:5173/payment/success",
                        cancel_url: "http://localhost:5173/payment/cancel",
                    },
                }),
            }
        );
    } catch (error) {
        console.error("PayPal order network error:", error.cause || error);
        throw new Error(
            `Unable to connect to PayPal Orders API: ${
                error.cause?.message || error.message
            }`
        );
    }

    const data = await response.json();

    if (!response.ok) {
        console.error("PayPal order API response:", data);

        throw new Error(
            data.message || "Failed to create PayPal order."
        );
    }

    return data;
};

// Capture approved PayPal order
export const captureOrder = async (orderId) => {
    const accessToken = await getAccessToken();

    const response = await fetch(
        `${PAYPAL_BASE_URL}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
        }
    );

    const data = await response.json();

    if (!response.ok) {
        console.error("PayPal capture API response:", data);

        throw new Error(
            data.message || "Failed to capture PayPal payment."
        );
    }

    return data;
};
