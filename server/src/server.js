import "dotenv/config";

import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();

    console.log("Environment check:", {
        clientId: !!process.env.PAYPAL_CLIENT_ID,
        clientSecret: !!process.env.PAYPAL_CLIENT_SECRET,
        baseUrl: process.env.PAYPAL_BASE_URL,
    });

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`ALLIN running at http://localhost:${PORT}`);
    });
};

startServer();
