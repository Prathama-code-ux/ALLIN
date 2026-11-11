import { createOrder, captureOrder } from "../services/paypal.service.js";
import Payment from "../models/payment.js";

// Create payment order
export const createPaymentOrder = async (req, res) => {
    try {
        const { amount, currency, groupId, description } = req.body;

        console.log("Create order request:", { amount, currency, groupId });

        if (
            amount === undefined ||
            amount === null ||
            isNaN(amount) ||
            Number(amount) <= 0 ||
            !Number.isFinite(Number(amount))
        ) {
            return res.status(400).json({
                success: false,
                message: "A valid positive payment amount is required"
            });
        }

        const numericAmount = Number(Number(amount).toFixed(2));
        const orderCurrency = currency || "USD";

        // Call PayPal API
        const order = await createOrder(numericAmount, orderCurrency);

        console.log("PayPal order created:", order.id);

        const approvalURL = order.links?.find(link => link.rel === "approve")?.href;

        // Persist pending payment in MongoDB
        try {
            await Payment.create({
                amount: numericAmount,
                currency: orderCurrency,
                status: "pending",
                paypalOrderId: order.id,
                user: req.user?._id || null,
                group: groupId || null,
                description: description || "Group contribution"
            });
        } catch (dbError) {
            console.warn("Could not pre-record pending payment in DB:", dbError.message);
        }

        return res.status(200).json({
            success: true,
            message: "Order created successfully",
            order,
            orderId: order.id,
            approvalURL
        });

    } catch (error) {
        console.error("PAYPAL CREATE ORDER ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create payment order"
        });
    }
};

// Capture payment order (with idempotency check)
export const capturePaymentOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Order ID is required"
            });
        }

        // Idempotency check: see if order was already captured
        const existingPayment = await Payment.findOne({ paypalOrderId: orderId });
        if (existingPayment && existingPayment.status === "captured") {
            console.log(`Payment for order ${orderId} was already captured (idempotent response).`);
            return res.status(200).json({
                success: true,
                message: "Payment was already captured successfully",
                payment: existingPayment,
                alreadyProcessed: true
            });
        }

        // Capture payment via PayPal API
        const result = await captureOrder(orderId);

        console.log("Payment capture result:", result.id, result.status);

        const captureDetails = result.purchase_units?.[0]?.payments?.captures?.[0];
        const captureId = captureDetails?.id || result.id;
        const payerEmail = result.payer?.email_address;
        const payerName = result.payer?.name ? `${result.payer.name.given_name || ""} ${result.payer.name.surname || ""}`.trim() : null;

        // Update or create Payment record in MongoDB
        let updatedPayment;
        if (existingPayment) {
            existingPayment.status = "captured";
            existingPayment.paypalCaptureId = captureId;
            existingPayment.paidAt = new Date();
            if (payerName) existingPayment.payerName = payerName;
            if (payerEmail) existingPayment.payerEmail = payerEmail;
            if (req.user?._id && !existingPayment.user) existingPayment.user = req.user._id;
            updatedPayment = await existingPayment.save();
        } else {
            updatedPayment = await Payment.create({
                amount: captureDetails?.amount?.value ? Number(captureDetails.amount.value) : 0,
                currency: captureDetails?.amount?.currency_code || "USD",
                status: "captured",
                paypalOrderId: orderId,
                paypalCaptureId: captureId,
                payerName,
                payerEmail,
                paidAt: new Date(),
                user: req.user?._id || null
            });
        }

        return res.status(200).json({
            success: true,
            message: "Payment captured successfully",
            payment: result,
            record: updatedPayment
        });

    } catch (error) {
        console.error("Error capturing payment order:", error);

        // Update status to failed if record exists
        if (req.params.orderId) {
            try {
                await Payment.updateOne(
                    { paypalOrderId: req.params.orderId },
                    { status: "failed" }
                );
            } catch (ignore) {}
        }

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to capture payment order"
        });
    }
};

// Get transaction history
export const getTransactions = async (req, res) => {
    try {
        const query = {};
        if (req.query.groupId) {
            query.group = req.query.groupId;
        }

        const payments = await Payment.find(query)
            .populate("user", "name email")
            .populate("group", "name")
            .sort({ createdAt: -1 })
            .limit(50);

        // Map to standard transaction format expected by frontend
        const transactions = payments.map((p, idx) => {
            const userName = p.user?.name || p.payerName || "Contributor";
            const initials = userName
                .split(" ")
                .map(part => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "C";

            const dateStr = p.paidAt
                ? new Date(p.paidAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
                : p.status === "pending"
                ? "Awaiting payment"
                : new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

            return {
                id: p.paypalCaptureId || p.paypalOrderId || `TXN-${String(idx + 1).padStart(3, "0")}`,
                _id: p._id,
                name: userName,
                initials,
                amount: p.amount,
                date: dateStr,
                status: p.status.toUpperCase(),
                paypalOrderId: p.paypalOrderId,
                createdAt: p.createdAt
            };
        });

        return res.status(200).json({
            success: true,
            count: transactions.length,
            transactions
        });

    } catch (error) {
        console.error("Get transactions error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve transactions"
        });
    }
};
