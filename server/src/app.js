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