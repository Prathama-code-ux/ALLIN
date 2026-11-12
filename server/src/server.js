import dns from "node:dns";
import "dotenv/config";

// Setup Google DNS fallback for environments with problematic ISP DNS resolving MongoDB Atlas SRV
try {
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (err) {
    console.warn("Could not set custom DNS servers:", err.message);
}

import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 4000;

console.log("Environment check:", {
    port: PORT,
    hasMongoUri: !!process.env.MONGO_URI,
    hasPaypalClientId: !!process.env.PAYPAL_CLIENT_ID,
    hasPaypalClientSecret: !!process.env.PAYPAL_CLIENT_SECRET,
    paypalBaseUrl: process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com"
});

const startServer = async () => {
    try {
        await connectDB();

        const server = app.listen(PORT, "0.0.0.0", () => {
            console.log(`ALLIN running at http://localhost:${PORT}`);
        });

        const shutdown = () => {
            console.log("Shutting down server gracefully...");
            server.close(() => {
                console.log("ALLIN server stopped.");
                process.exit(0);
            });
        };

        process.on("SIGTERM", shutdown);
        process.on("SIGINT", shutdown);
    } catch (error) {
        console.error("Fatal startup error:", error);
        process.exit(1);
    }
};

startServer();
