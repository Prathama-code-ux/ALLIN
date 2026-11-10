import express from "express";
import { createPaymentOrder, capturePaymentOrder } from "../controllers/payment.controller.js";
const router = express.Router();

//create paypal order
router.post("/create-order", createPaymentOrder);

//capture paypal order
router.post("/:orderId/capture", capturePaymentOrder);

export default router;