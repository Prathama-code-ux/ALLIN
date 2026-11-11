// PayPal Sandbox / Live Service Integration

// Get PayPal access token via OAuth client credentials
export const getAccessToken = async () => {
    const baseUrl = process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!baseUrl || !clientId || !clientSecret) {
        throw new Error("PayPal environment variables (PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET) are missing.");
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    let response;
    try {
        response = await fetch(`${baseUrl}/v1/oauth2/token`, {
            method: "POST",
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
        });
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
export const createOrder = async (amount, currency = "USD", customId = null, description = "ALLIN Shared Payment") => {
    const baseUrl = process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const accessToken = await getAccessToken();

    let response;
    try {
        const payload = {
            intent: "CAPTURE",
            purchase_units: [
                {
                    amount: {
                        currency_code: currency,
                        value: Number(amount).toFixed(2),
                    },
                    description: String(description || "ALLIN Payment").slice(0, 127),
                    custom_id: customId ? String(customId) : undefined
                },
            ],
            application_context: {
                return_url: `${clientUrl}/payment/success`,
                cancel_url: `${clientUrl}/payment/cancel`,
                user_action: "PAY_NOW",
                brand_name: "ALLIN Payments",
            },
        };

        response = await fetch(`${baseUrl}/v2/checkout/orders`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error("PayPal order network error:", error.cause || error);
        throw new Error(`Unable to connect to PayPal Orders API: ${error.cause?.message || error.message}`);
    }

    const data = await response.json();

    if (!response.ok) {
        console.error("PayPal order API response:", data);
        throw new Error(data.message || "Failed to create PayPal order.");
    }

    return data;
};

// Capture approved PayPal order
export const captureOrder = async (orderId) => {
    const baseUrl = process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
    const accessToken = await getAccessToken();

    let response;
    try {
        response = await fetch(`${baseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
        });
    } catch (error) {
        console.error("PayPal capture network error:", error.cause || error);
        throw new Error(`Unable to connect to PayPal Capture API: ${error.cause?.message || error.message}`);
    }

    const data = await response.json();

    if (!response.ok) {
        console.error("PayPal capture API response:", data);
        throw new Error(data.message || "Failed to capture PayPal payment.");
    }

    return data;
};

// Verify PayPal webhook signature
export const verifyWebhookSignature = async (headers, body) => {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    
    // Never accept an unverified webhook
    if (!webhookId) {
        throw new Error("PAYPAL_WEBHOOK_ID is missing. Webhook verification cannot proceed.");
    }
    
    // if (!webhookId) {
    //     console.warn("PAYPAL_WEBHOOK_ID is not configured in environment. Skipping cryptographic verification.");
    //     return { verification_status: "SUCCESS" };
    // }


    const requiredHeaders = [
        "paypal-auth-algo",
        "paypal-cert-url",
        "paypal-transmission-id",
        "paypal-transmission-sig",
        "paypal-transmission-time"
    ];

    for (const header of requiredHeaders) {
        if (!headers[header]) {
            throw new Error(`Missing PayPal webhook header: ${header}`);
        }
    }

    const baseUrl = process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
    const accessToken = await getAccessToken();

    const payload = {
        auth_algo: headers["paypal-auth-algo"],
        cert_url: headers["paypal-cert-url"],
        transmission_id: headers["paypal-transmission-id"],
        transmission_sig: headers["paypal-transmission-sig"],
        transmission_time: headers["paypal-transmission-time"],
        webhook_id: webhookId,
        webhook_event: body,
    };

    const response = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("PayPal webhook verification API error:", data);
        throw new Error(
            data.message || "PayPal webhook verification API failed"
        );
    }

    return data;
};

export const paypalService = {
    getAccessToken,
    createOrder,
    captureOrder,
    verifyWebhookSignature
};

export default paypalService;
