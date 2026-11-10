
import "dotenv/config";
import app from "./app.js";

console.log("Environment check:", {
    clientId: !!process.env.PAYPAL_CLIENT_ID,
    clientSecret: !!process.env.PAYPAL_CLIENT_SECRET,
    baseUrl: process.env.PAYPAL_BASE_URL
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});