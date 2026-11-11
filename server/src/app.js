import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import groupRoutes from "./routes/groupRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import paymentRoutes from "./routes/payment.route.js";

const app = express();

// Security middleware
app.use(helmet());

app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true
    })
);

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/payments", paymentRoutes);

app.get("/health", (req, res) => {
    res.status(200).json({
        service: "ALLIN",
        status: "healthy",
        message: "ALLIN backend is running"
    });
});

app.get("/api/health", (req, res) => {
    res.status(200).json({
        service: "ALLIN",
        status: "healthy",
        message: "ALLIN backend is running"
    });
});

app.get("/", (req, res) => {
    res.status(200).json({
        message: "Welcome to ALLIN",
        purpose: "collaborative payments made simple"
    });
});

app.post("/test", (req, res) => {
    res.status(200).json({
        received: req.body
    });
});

app.get("/test-error", (req, res, next) => {
    next(new Error("Something went wrong"));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        message: "404 not found"
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err);

    if (res.headersSent) {
        return next(err);
    }

    return res.status(500).json({
        message: "internal server error"
    });
});

export default app;
