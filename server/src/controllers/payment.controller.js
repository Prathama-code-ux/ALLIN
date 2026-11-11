import paypalService, { createOrder, captureOrder, verifyWebhookSignature } from "../services/paypal.service.js";
import Payment from "../models/payment.js";
import Expense from "../models/expense.js";
import Group from "../models/Group.js";
import mongoose from "mongoose";

// Create payment order with strict server-side derived split amount
export const createPaymentOrder = async (req, res) => {
    try {
        const { expenseId, groupId, amount, currency, description } = req.body;
        const userId = req.user._id;

        let finalAmount;
        let finalGroupId = groupId || null;
        let finalExpenseId = null;
        let finalDescription = description || "ALLIN Group Payment";
        const orderCurrency = currency || "USD";

        // Case A: Paying for an individual expense split
        if (expenseId) {
            if (!mongoose.Types.ObjectId.isValid(expenseId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid expense ID"
                });
            }

            const expense = await Expense.findById(expenseId).populate("group");

            if (!expense) {
                return res.status(404).json({
                    success: false,
                    message: "Expense not found"
                });
            }

            finalExpenseId = expense._id;
            finalGroupId = expense.group?._id || expense.group || finalGroupId;

            // Group membership authorization
            if (expense.group) {
                const group = await Group.findById(expense.group);
                if (group) {
                    const isMember = group.members.some(m => m.equals(userId));
                    if (!isMember) {
                        return res.status(403).json({
                            success: false,
                            message: "You are not an authorized member of this group"
                        });
                    }
                }
            }

            // Find user's split in the expense
            const userSplit = expense.splits?.find(s => s.user.equals(userId));

            if (!userSplit) {
                return res.status(403).json({
                    success: false,
                    message: "You do not have an assigned split in this expense"
                });
            }

            if (userSplit.status === "paid") {
                return res.status(400).json({
                    success: false,
                    message: "Your split for this expense has already been paid"
                });
            }

            // Strictly derive the payment amount from the stored split
            finalAmount = Number(userSplit.amount.toFixed(2));
            finalDescription = `Share for: ${expense.title}`;

            // Check for in-flight pending payment created within the last 15 minutes to avoid duplicates
            const recentPending = await Payment.findOne({
                expense: finalExpenseId,
                user: userId,
                status: "pending",
                createdAt: { $gt: new Date(Date.now() - 15 * 60 * 1000) }
            });

            if (recentPending && recentPending.paypalOrderId) {
                // If existing pending order exists, invalidate it or create a new order
                await Payment.updateOne({ _id: recentPending._id }, { status: "voided" });
            }
        } 
        // Case B: Direct group pool contribution
        else {
            if (!amount || isNaN(amount) || Number(amount) <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "A valid positive payment amount is required"
                });
            }

            finalAmount = Number(Number(amount).toFixed(2));

            if (finalGroupId) {
                if (!mongoose.Types.ObjectId.isValid(finalGroupId)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid group ID"
                    });
                }

                const group = await Group.findById(finalGroupId);
                if (!group) {
                    return res.status(404).json({
                        success: false,
                        message: "Group not found"
                    });
                }

                const isMember = group.members.some(m => m.equals(userId));
                if (!isMember) {
                    return res.status(403).json({
                        success: false,
                        message: "You are not an authorized member of this group"
                    });
                }
            }
        }

        // Call PayPal API to create order
        const order = await (paypalService.createOrder || createOrder)(
            finalAmount,
            orderCurrency,
            finalExpenseId || finalGroupId,
            finalDescription
        );

        const approvalURL = order.links?.find(link => link.rel === "approve")?.href;

        if (!approvalURL) {
            return res.status(502).json({
                success: false,
                message: "PayPal did not return an approval checkout URL"
            });
        }

        // Persist pending payment in MongoDB
        const paymentRecord = await Payment.create({
            amount: finalAmount,
            currency: orderCurrency,
            status: "pending",
            paypalOrderId: order.id,
            user: userId,
            group: finalGroupId,
            expense: finalExpenseId,
            description: finalDescription
        });

        return res.status(200).json({
            success: true,
            message: "PayPal checkout order created successfully",
            orderId: order.id,
            approvalURL,
            amount: finalAmount,
            currency: orderCurrency,
            paymentId: paymentRecord._id
        });

    } catch (error) {
        console.error("Create payment order error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create payment order"
        });
    }
};

// Capture payment order with amount/status verification and split updating
export const capturePaymentOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user._id;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Order ID is required"
            });
        }

        // Find existing payment record in MongoDB
        const existingPayment = await Payment.findOne({ paypalOrderId: orderId });

        if (existingPayment) {
            // Verify payment ownership
            if (existingPayment.user && !existingPayment.user.equals(userId)) {
                return res.status(403).json({
                    success: false,
                    message: "You are not authorized to capture this payment order"
                });
            }

            // Idempotency: Return existing captured record if already finalized
            if (existingPayment.status === "captured") {
                return res.status(200).json({
                    success: true,
                    message: "Payment was already captured successfully",
                    payment: existingPayment,
                    alreadyProcessed: true
                });
            }
        }

        // Capture payment via PayPal API
        const result = await (paypalService.captureOrder || captureOrder)(orderId);

        if (result.status !== "COMPLETED") {
            return res.status(400).json({
                success: false,
                message: `PayPal capture was not completed. Status: ${result.status}`
            });
        }

        const captureDetails = result.purchase_units?.[0]?.payments?.captures?.[0];
        const captureId = captureDetails?.id || result.id;
        const capturedAmount = Number(captureDetails?.amount?.value || 0);
        const capturedCurrency = captureDetails?.amount?.currency_code || "USD";

        // Amount and currency verification against database record
        if (existingPayment) {
            if (Math.abs(capturedAmount - existingPayment.amount) > 0.01) {
                console.error(`Amount mismatch: expected $${existingPayment.amount}, captured $${capturedAmount}`);
                return res.status(400).json({
                    success: false,
                    message: "Payment capture amount does not match expected amount"
                });
            }

            if (capturedCurrency !== existingPayment.currency) {
                return res.status(400).json({
                    success: false,
                    message: "Payment capture currency mismatch"
                });
            }
        }

        const payerEmail = result.payer?.email_address || null;
        const payerName = result.payer?.name 
            ? `${result.payer.name.given_name || ""} ${result.payer.name.surname || ""}`.trim() 
            : null;

        // If payment was tied to an expense, update the split status to "paid"
        if (existingPayment?.expense) {
            await Expense.updateOne(
                { _id: existingPayment.expense, "splits.user": userId },
                {
                    $set: {
                        "splits.$.status": "paid",
                        "splits.$.paidAt": new Date()
                    }
                }
            );
        }

        // Update or create Payment record in MongoDB
        let updatedPayment;
        if (existingPayment) {
            existingPayment.status = "captured";
            existingPayment.paypalCaptureId = captureId;
            existingPayment.paidAt = new Date();
            if (payerName) existingPayment.payerName = payerName;
            if (payerEmail) existingPayment.payerEmail = payerEmail;
            if (!existingPayment.user) existingPayment.user = userId;
            updatedPayment = await existingPayment.save();
        } else {
            updatedPayment = await Payment.create({
                amount: capturedAmount,
                currency: capturedCurrency,
                status: "captured",
                paypalOrderId: orderId,
                paypalCaptureId: captureId,
                payerName,
                payerEmail,
                paidAt: new Date(),
                user: userId
            });
        }

        return res.status(200).json({
            success: true,
            message: "Payment captured successfully",
            payment: result,
            record: updatedPayment
        });

    } catch (error) {
        console.error("Capture payment error:", error);

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

// PayPal Webhook listener for asynchronous events
export const handlePayPalWebhook = async (req, res) => {
    try {
        const verification = await (paypalService.verifyWebhookSignature || verifyWebhookSignature)(req.headers, req.body);

        if (verification.verification_status !== "SUCCESS") {
            return res.status(400).json({
                success: false,
                message: "Webhook signature verification failed"
            });
        }

        const event = req.body;
        const eventType = event.event_type;

        if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
            const capture = event.resource;
            const captureId = capture.id;
            const customId = capture.custom_id;

            const payment = await Payment.findOne({
                $or: [{ paypalCaptureId: captureId }, { paypalOrderId: capture.id }]
            });

            if (payment && payment.status !== "captured") {
                payment.status = "captured";
                payment.paypalCaptureId = captureId;
                payment.paidAt = new Date();
                await payment.save();

                if (payment.expense && payment.user) {
                    await Expense.updateOne(
                        { _id: payment.expense, "splits.user": payment.user },
                        { $set: { "splits.$.status": "paid", "splits.$.paidAt": new Date() } }
                    );
                }
            }
        }

        return res.status(200).json({ received: true });

    } catch (error) {
        console.error("PayPal webhook error:", error);
        return res.status(500).json({ success: false, message: "Webhook processing error" });
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
            .populate("expense", "title category")
            .sort({ createdAt: -1 })
            .limit(50);

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
                paypalCaptureId: p.paypalCaptureId,
                expenseTitle: p.expense?.title || null,
                groupName: p.group?.name || null,
                description: p.description,
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
