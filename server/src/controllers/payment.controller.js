import paypalService, { createOrder, captureOrder, verifyWebhookSignature } from "../services/paypal.service.js";
import Payment from "../models/payment.js";
import Expense from "../models/expense.js";
import Group from "../models/Group.js";
import Settlement from "../models/settlement.js";
import Transaction from "../models/transaction.js";
import WebhookEvent from "../models/webhookEvent.js";
import mongoose from "mongoose";

// Create PayPal checkout order for GROUP_CONTRIBUTION, EXPENSE_ADVANCE, or REIMBURSEMENT
export const createPaymentOrder = async (req, res) => {
    try {
        const {
            expenseId,
            groupId,
            settlementId,
            purpose,
            amount,
            currency,
            description
        } = req.body;
        const userId = req.user._id;

        let paymentPurpose = purpose;
        let finalAmount;
        let finalGroupId = groupId || null;
        let finalExpenseId = null;
        let finalSettlementId = null;
        let counterpartyId = null;
        let finalDescription = description || "ALLIN Group Payment";
        const orderCurrency = currency || "USD";

        // Case 1: REIMBURSEMENT of a personal advance settlement
        if (settlementId || paymentPurpose === "REIMBURSEMENT") {
            if (!settlementId || !mongoose.Types.ObjectId.isValid(settlementId)) {
                return res.status(400).json({
                    success: false,
                    message: "Valid settlement ID is required for reimbursements"
                });
            }

            const settlement = await Settlement.findById(settlementId)
                .populate("creditor", "name email")
                .populate("group", "name status deletedAt");

            if (!settlement) {
                return res.status(404).json({
                    success: false,
                    message: "Settlement obligation not found"
                });
            }

            if (!settlement.debtor.equals(userId)) {
                return res.status(403).json({
                    success: false,
                    message: "You are not the designated debtor for this settlement"
                });
            }

            const remainingOwed = Math.max(0, Number((settlement.amount - (settlement.settledAmount || 0)).toFixed(2)));

            if (remainingOwed <= 0 || settlement.status === "completed") {
                return res.status(400).json({
                    success: false,
                    message: "This settlement obligation is already fully settled"
                });
            }

            const requestedAmount = amount ? Number(Number(amount).toFixed(2)) : remainingOwed;

            if (requestedAmount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "A positive payment amount is required"
                });
            }

            if (requestedAmount > remainingOwed + 0.01) {
                return res.status(400).json({
                    success: false,
                    message: `Payment amount ($${requestedAmount.toFixed(2)}) cannot exceed remaining debt ($${remainingOwed.toFixed(2)})`
                });
            }

            paymentPurpose = "REIMBURSEMENT";
            finalAmount = requestedAmount;
            finalSettlementId = settlement._id;
            finalGroupId = settlement.group?._id || settlement.group || finalGroupId;
            finalExpenseId = settlement.expense || null;
            counterpartyId = settlement.creditor?._id || settlement.creditor;
            finalDescription = `Reimbursement to ${settlement.creditor?.name || "Member"}`;
        }
        // Case 2: Paying an individual expense share or initiating a personal expense advance
        else if (expenseId) {
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

            if (expense.group) {
                const group = await Group.findOne({
                    _id: expense.group._id || expense.group,
                    deletedAt: null
                });

                if (!group) {
                    return res.status(404).json({
                        success: false,
                        message: "Group not found"
                    });
                }

                if (group.status !== "active") {
                    return res.status(400).json({
                        success: false,
                        message: "Cannot initiate payments for a closed group"
                    });
                }

                const isMember = group.members.some((member) => member.equals(userId));
                if (!isMember) {
                    return res.status(403).json({
                        success: false,
                        message: "You are not an authorized member of this group"
                    });
                }
            }

            // Check if paying for full expense advance vs individual split
            if (paymentPurpose === "EXPENSE_ADVANCE" || expense.paidBy.equals(userId)) {
                paymentPurpose = "EXPENSE_ADVANCE";
                finalAmount = Number(expense.amount.toFixed(2));
                finalDescription = `Personal Advance: ${expense.title}`;
            } else {
                // Individual split payment (compatible with previous test cases)
                const userSplit = expense.splits?.find((s) => s.user.equals(userId));

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

                paymentPurpose = "EXPENSE_ADVANCE";
                finalAmount = Number(userSplit.amount.toFixed(2));
                finalDescription = `Share for: ${expense.title}`;
            }

            // Invalidate stale in-flight pending orders
            await Payment.updateMany(
                {
                    expense: finalExpenseId,
                    user: userId,
                    status: "pending",
                    createdAt: { $lt: new Date() }
                },
                { status: "voided" }
            );
        }
        // Case 3: Direct Group Pool Contribution
        else {
            paymentPurpose = "GROUP_CONTRIBUTION";

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

                const group = await Group.findOne({
                    _id: finalGroupId,
                    deletedAt: null
                });

                if (!group) {
                    return res.status(404).json({
                        success: false,
                        message: "Group not found"
                    });
                }

                if (group.status !== "active") {
                    return res.status(400).json({
                        success: false,
                        message: "Cannot contribute to a closed group"
                    });
                }

                const isMember = group.members.some((m) => m.equals(userId));
                if (!isMember) {
                    return res.status(403).json({
                        success: false,
                        message: "You are not an authorized member of this group"
                    });
                }

                finalDescription = `Group Contribution to ${group.name}`;
            }
        }

        // Call PayPal API to create order with fixed purpose
        const order = await (paypalService.createOrder || createOrder)(
            finalAmount,
            orderCurrency,
            finalSettlementId || finalExpenseId || finalGroupId,
            finalDescription
        );

        const approvalURL = order.links?.find((link) => link.rel === "approve")?.href;

        if (!approvalURL) {
            return res.status(502).json({
                success: false,
                message: "PayPal did not return an approval checkout URL"
            });
        }

        // Persist pending payment with fixed purpose in MongoDB
        const paymentRecord = await Payment.create({
            paymentPurpose,
            amount: finalAmount,
            currency: orderCurrency,
            status: "pending",
            paypalOrderId: order.id,
            user: userId,
            counterparty: counterpartyId,
            group: finalGroupId,
            expense: finalExpenseId,
            settlement: finalSettlementId,
            description: finalDescription
        });

        return res.status(200).json({
            success: true,
            message: "PayPal checkout order created successfully",
            orderId: order.id,
            approvalURL,
            approveUrl: approvalURL,
            amount: finalAmount,
            currency: orderCurrency,
            purpose: paymentPurpose,
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

// Capture payment order with strict purpose enforcement and idempotency
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

        // 1. Locate payment record
        const existingPayment = await Payment.findOne({ paypalOrderId: orderId });

        if (existingPayment) {
            // Verify payment ownership
            if (existingPayment.user && !existingPayment.user.equals(userId)) {
                return res.status(403).json({
                    success: false,
                    message: "You are not authorized to capture this payment order"
                });
            }

            // Idempotency: Return existing captured record immediately if already processed
            if (existingPayment.status === "captured") {
                return res.status(200).json({
                    success: true,
                    message: "Payment was already captured successfully",
                    payment: existingPayment,
                    record: existingPayment,
                    alreadyProcessed: true
                });
            }
        }

        // 2. Capture payment via PayPal API
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

        // Amount & currency verification against database record
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

        const purpose = existingPayment?.paymentPurpose || "GROUP_CONTRIBUTION";

        // Update Payment record
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
                paymentPurpose: purpose,
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

        // 3. Process Purpose-Specific Financial Side Effects
        if (purpose === "GROUP_CONTRIBUTION") {
            // A. Group contribution: updates group pool balance and total confirmed deposits
            if (updatedPayment.group) {
                await Group.updateOne(
                    { _id: updatedPayment.group },
                    {
                        $inc: {
                            poolBalance: capturedAmount,
                            collectedAmount: capturedAmount
                        }
                    }
                );
            }

            // Create Transaction audit log
            await Transaction.create({
                type: "CONTRIBUTION",
                amount: capturedAmount,
                currency: capturedCurrency,
                user: userId,
                group: updatedPayment.group || null,
                payment: updatedPayment._id,
                status: "COMPLETED",
                description: `Group contribution via PayPal Sandbox`,
                date: new Date(),
                paypalOrderId: orderId,
                paypalCaptureId: captureId,
                idempotencyKey: `contrib-${orderId}`
            });
        } else if (purpose === "REIMBURSEMENT") {
            // B. Reimbursement: updates settlement obligation and counterparty debt
            if (updatedPayment.settlement) {
                const settlement = await Settlement.findById(updatedPayment.settlement);
                if (settlement) {
                    const newSettledAmount = Number(((settlement.settledAmount || 0) + capturedAmount).toFixed(2));
                    const isFullySettled = newSettledAmount >= settlement.amount - 0.01;

                    settlement.settledAmount = newSettledAmount;
                    settlement.status = isFullySettled ? "completed" : "partial";
                    if (isFullySettled) {
                        settlement.settledAt = new Date();
                    }
                    await settlement.save();

                    // If linked to an expense split, mark split as paid if settlement is complete
                    if (settlement.expense && isFullySettled) {
                        await Expense.updateOne(
                            { _id: settlement.expense, "splits.user": settlement.debtor },
                            {
                                $set: {
                                    "splits.$.status": "paid",
                                    "splits.$.paidAt": new Date()
                                }
                            }
                        );
                    }

                    // Create Transaction audit log
                    await Transaction.create({
                        type: "REIMBURSEMENT",
                        amount: capturedAmount,
                        currency: capturedCurrency,
                        user: userId,
                        counterparty: settlement.creditor,
                        group: settlement.group,
                        expense: settlement.expense,
                        settlement: settlement._id,
                        payment: updatedPayment._id,
                        status: "COMPLETED",
                        description: `Reimbursement settled via PayPal Sandbox`,
                        date: new Date(),
                        paypalOrderId: orderId,
                        paypalCaptureId: captureId,
                        idempotencyKey: `reimburse-${orderId}`
                    });
                }
            }
        } else if (purpose === "EXPENSE_ADVANCE") {
            // C. Personal advance: marks expense paid, generates settlements for other members
            if (updatedPayment.expense) {
                const expense = await Expense.findById(updatedPayment.expense);
                if (expense) {
                    // Update user's split status or mark entire expense paid
                    const isPayer = String(expense.paidBy) === String(userId);

                    if (isPayer) {
                        expense.status = "paid";
                        expense.paidAt = new Date();

                        // Mark payer's split as paid/approved
                        expense.splits.forEach((s) => {
                            if (String(s.user) === String(userId)) {
                                s.status = "approved";
                                s.paidAt = new Date();
                            }
                        });
                        await expense.save();

                        // Generate settlements for all other members in splits
                        if (expense.group && expense.splits && expense.splits.length > 0) {
                            for (const split of expense.splits) {
                                if (String(split.user) !== String(userId) && split.amount > 0) {
                                    const existingSettlement = await Settlement.findOne({
                                        group: expense.group,
                                        expense: expense._id,
                                        debtor: split.user,
                                        creditor: userId
                                    });

                                    if (!existingSettlement) {
                                        await Settlement.create({
                                            group: expense.group,
                                            expense: expense._id,
                                            debtor: split.user,
                                            creditor: userId,
                                            amount: Number(split.amount.toFixed(2)),
                                            settledAmount: 0,
                                            currency: expense.currency || "USD",
                                            status: "pending"
                                        });
                                    }
                                }
                            }
                        }

                        // Create Transaction audit log
                        await Transaction.create({
                            type: "PERSONAL_ADVANCE",
                            amount: capturedAmount,
                            currency: capturedCurrency,
                            user: userId,
                            group: expense.group,
                            expense: expense._id,
                            payment: updatedPayment._id,
                            status: "COMPLETED",
                            description: `Personal advance paid for: ${expense.title}`,
                            date: new Date(),
                            paypalOrderId: orderId,
                            paypalCaptureId: captureId,
                            idempotencyKey: `advance-${orderId}`
                        });
                    } else {
                        // Non-payer paying their share directly
                        await Expense.updateOne(
                            { _id: expense._id, "splits.user": userId },
                            {
                                $set: {
                                    "splits.$.status": "paid",
                                    "splits.$.paidAt": new Date()
                                }
                            }
                        );

                        // If a settlement existed for this split, mark it completed
                        if (expense.group) {
                            await Settlement.updateOne(
                                {
                                    group: expense.group,
                                    expense: expense._id,
                                    debtor: userId,
                                    creditor: expense.paidBy
                                },
                                {
                                    $set: {
                                        settledAmount: capturedAmount,
                                        status: "completed",
                                        settledAt: new Date()
                                    }
                                }
                            );
                        }

                        await Transaction.create({
                            type: "REIMBURSEMENT",
                            amount: capturedAmount,
                            currency: capturedCurrency,
                            user: userId,
                            counterparty: expense.paidBy,
                            group: expense.group,
                            expense: expense._id,
                            payment: updatedPayment._id,
                            status: "COMPLETED",
                            description: `Share paid for ${expense.title}`,
                            date: new Date(),
                            paypalOrderId: orderId,
                            paypalCaptureId: captureId,
                            idempotencyKey: `share-${orderId}`
                        });
                    }
                }
            }
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
                    { paypalOrderId: req.params.orderId, status: "pending" },
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

// PayPal Webhook listener
export const handlePayPalWebhook = async (req, res) => {
    let eventRecord = null;

    try {
        const verification = await (
            paypalService.verifyWebhookSignature ||
            verifyWebhookSignature
        )(req.headers, req.body);

        if (verification.verification_status !== "SUCCESS") {
            console.error("Invalid PayPal webhook signature");
            return res.status(400).json({
                success: false,
                message: "Webhook signature verification failed"
            });
        }

        const event = req.body;
        if (!event.id || !event.event_type) {
            return res.status(400).json({
                success: false,
                message: "Invalid PayPal webhook event"
            });
        }

        try {
            eventRecord = await WebhookEvent.create({
                eventId: event.id,
                eventType: event.event_type,
                status: "processing"
            });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(200).json({ received: true, duplicate: true });
            }
            throw error;
        }

        const eventType = event.event_type;
        const resource = event.resource;

        if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
            const captureId = resource.id;
            const orderId = resource.supplementary_data?.related_ids?.order_id;

            const payment = await Payment.findOne({
                $or: [
                    ...(orderId ? [{ paypalOrderId: orderId }] : []),
                    { paypalCaptureId: captureId }
                ]
            });

            if (payment && payment.status !== "captured") {
                payment.status = "captured";
                payment.paypalCaptureId = captureId;
                payment.paidAt = new Date();
                await payment.save();
            }
        }

        await WebhookEvent.updateOne(
            { _id: eventRecord._id },
            {
                $set: {
                    status: "processed",
                    processedAt: new Date()
                }
            }
        );

        return res.status(200).json({ received: true, eventType });
    } catch (error) {
        console.error("PayPal webhook processing error:", error);
        if (eventRecord) {
            await WebhookEvent.deleteOne({ _id: eventRecord._id }).catch(() => {});
        }
        return res.status(500).json({
            success: false,
            message: "Webhook processing error"
        });
    }
};

// Get transaction history from Transaction model
export const getTransactions = async (req, res) => {
    try {
        const query = {};
        if (req.query.groupId) {
            query.group = req.query.groupId;
        }

        // Fetch transactions from dedicated Transaction collection
        let txns = await Transaction.find(query)
            .populate("user", "name email")
            .populate("counterparty", "name email")
            .populate("group", "name")
            .populate("expense", "title category")
            .sort({ createdAt: -1 })
            .limit(50);

        // Fallback: If no transactions yet, read completed payments
        if (txns.length === 0) {
            const payments = await Payment.find(query)
                .populate("user", "name email")
                .populate("counterparty", "name email")
                .populate("group", "name")
                .populate("expense", "title category")
                .sort({ createdAt: -1 })
                .limit(50);

            const transactions = payments.map((p, idx) => {
                const userName = p.user?.name || p.payerName || "Contributor";
                const initials = (userName || "U")
                    .split(" ")
                    .map((part) => part[0])
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
                    currency: p.currency || "USD",
                    date: dateStr,
                    status: (p.status || "COMPLETED").toUpperCase(),
                    type: p.paymentPurpose === "REIMBURSEMENT" ? "REIMBURSEMENT" : "CONTRIBUTION",
                    paypalOrderId: p.paypalOrderId,
                    paypalCaptureId: p.paypalCaptureId,
                    expenseTitle: p.expense?.title || null,
                    groupName: p.group?.name || null,
                    counterpartyName: p.counterparty?.name || null,
                    description: p.description,
                    createdAt: p.createdAt
                };
            });

            return res.status(200).json({
                success: true,
                count: transactions.length,
                transactions
            });
        }

        const transactions = txns.map((t, idx) => {
            const userName = t.user?.name || "Member";
            const initials = (userName || "U")
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "M";

            const dateStr = t.date
                ? new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
                : new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

            return {
                id: t.paypalCaptureId || t.paypalOrderId || `TXN-${String(idx + 1).padStart(3, "0")}`,
                _id: t._id,
                name: userName,
                initials,
                amount: t.amount,
                currency: t.currency || "USD",
                date: dateStr,
                status: (t.status || "COMPLETED").toUpperCase(),
                type: t.type,
                paypalOrderId: t.paypalOrderId,
                paypalCaptureId: t.paypalCaptureId,
                expenseTitle: t.expense?.title || null,
                groupName: t.group?.name || null,
                counterpartyName: t.counterparty?.name || null,
                description: t.description,
                createdAt: t.createdAt
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
