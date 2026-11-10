import groupRoutes from "./routes/groupRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";

const app = express();

//security middleware
app.use(helmet());

app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:5173"
    })
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);

app.get("/health", (req, res) => {
    res.status(200).json({
        service: "ALLIN",
        status: "healthy",
        message:"ALLIN backend is running"
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

app.use((req, res) => {
    res.status(404).json({
        message: "404 not found"
    });
});

app.use((err, req, res, next) => {
    console.error(err);

    if (res.headersSent){
        return next(err);
    }

    return res.status(500).json({
        message: "internal server error"
    });
});
export default app;
import express from "express";
import helmet from "helmet";
import cors from "cors";
import paymentRoutes from "./routes/payment.route.js";

const app = express();
app.use(helmet());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
app.use(express.json());
app.use("/api/payments", paymentRoutes);
app.get("/", (req, res) => {
    res.json({ message: "paypal server is running" });
});
app.get("/api/health", (req, res) => {
    res.status(200).json({ message: "Server is healthy" });
});
export default app;
