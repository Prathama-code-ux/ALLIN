import {createOrder, captureOrder} from "../services/paypal.service.js";

//create payment order

export const createPaymentOrder = async (req, res) => {
    try {
        const { amount, currency } = req.body;

        console.log("Create order request:", { amount, currency });

        if (
            !amount ||
            isNaN(amount) ||
            Number(amount) <= 0 ||
            !Number.isFinite(Number(amount))
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid amount"
            });
        }

        const order = await createOrder(amount, currency || "USD");

        console.log("PayPal order created:", order.id);

        return res.status(200).json({
            success: true,
            message: "Order created successfully",
            order,
            orderId: order.id,
            approvalURL: order.links.find(
                link => link.rel === "approve"
            )?.href
        });

    } catch (error) {
        console.error("PAYPAL CREATE ORDER ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create payment order"
        });
    }
};



export const capturePaymentOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Order ID is required"
            });
        }

        // Capture the payment and store the response
        const result = await captureOrder(orderId);

        console.log("Payment capture result:", result);

        return res.status(200).json({
            success: true,
            message: "Payment captured successfully",
            payment: result
        });

    } catch (error) {
        console.error("Error capturing payment order:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to capture payment order"
        });
    }
};
