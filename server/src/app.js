import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./routes/authRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import paymentRoutes from "./routes/payment.route.js";
import register, { httpRequestDuration } from "./config/metrics.js";

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration supporting credentials
const allowedOrigins = [
    process.env.CLIENT_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000"
].filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps, curl, Postman)
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
                return callback(null, true);
            }
            callback(new Error("Not allowed by CORS"));
        },
        credentials: true
    })
);

app.use(express.json());

// Prometheus HTTP request duration tracking middleware
app.use((req, res, next) => {
    const start = process.hrtime();
    res.on("finish", () => {
        const diff = process.hrtime(start);
        const durationInSeconds = diff[0] + diff[1] / 1e9;
        const routePath = req.baseUrl ? `${req.baseUrl}${req.path}` : req.path;
        httpRequestDuration.observe(
            {
                method: req.method,
                route: routePath,
                status_code: res.statusCode
            },
            durationInSeconds
        );
    });
    next();
});

// Prometheus scraping endpoint
app.get("/metrics", async (req, res) => {
    try {
        res.set("Content-Type", register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        res.status(500).end(err.message);
    }
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/payments", paymentRoutes);

// Health check endpoints (both /health and /api/health for compatibility)
app.get(["/health", "/api/health"], (req, res) => {
    res.status(200).json({
        service: "ALLIN",
        status: "healthy",
        message: "ALLIN backend is running"
    });
});

// Welcome root route
app.get("/", (req, res) => {
    res.status(200).json({
        message: "Welcome to ALLIN",
        status: "success"
    });
});

// Test route
app.post("/test", (req, res) => {
    res.status(200).json({
        received: req.body
    });
});

// Error testing endpoint
app.get("/test-error", (req, res, next) => {
    next(new Error("Something went wrong"));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        message: "404 not found"
    });
});

// Global centralized error handling middleware
app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    console.error("Internal server error:", err);

    return res.status(err.status || 500).json({
        success: false,
        message: err.message || "internal server error"
    });
});

export default app;
