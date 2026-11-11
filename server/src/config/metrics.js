import client from "prom-client";

// Create Prometheus Register
const register = new client.Registry();

// Enable collection of default Node.js runtime metrics
client.collectDefaultMetrics({
    app: "allin-server",
    prefix: "allin_",
    timeout: 10000,
    register
});

// Custom HTTP request duration histogram
export const httpRequestDuration = new client.Histogram({
    name: "allin_http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});
register.registerMetric(httpRequestDuration);

// Custom PayPal and expense transaction counter
export const paymentsCounter = new client.Counter({
    name: "allin_payments_total",
    help: "Total count of payment operations",
    labelNames: ["operation", "status"]
});
register.registerMetric(paymentsCounter);

export const expensesCounter = new client.Counter({
    name: "allin_expenses_total",
    help: "Total count of expense creations and split approvals",
    labelNames: ["action", "category"]
});
register.registerMetric(expensesCounter);

export { register };
export default register;

