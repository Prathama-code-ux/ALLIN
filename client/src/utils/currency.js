export const CURRENCY_CODE = "USD";
export const CURRENCY_SYMBOL = "$";

/**
 * Format a numeric value consistently as USD with two decimal places (e.g. "$12.50").
 */
export function formatUSD(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num) || num === 0) {
    return "$0.00";
  }
  const fixed = Math.abs(num).toFixed(2);
  return num < 0 ? `-$${fixed}` : `$${fixed}`;
}

/**
 * Validate that a user-entered monetary value is a finite positive number (> 0).
 */
export function validatePositiveAmount(rawValue, label = "Amount") {
  if (
    rawValue === undefined ||
    rawValue === null ||
    String(rawValue).trim() === ""
  ) {
    return {
      valid: false,
      value: null,
      error: `${label} is required.`,
    };
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return {
      valid: false,
      value: null,
      error: `${label} must be a positive number greater than 0.`,
    };
  }

  return {
    valid: true,
    value: Number(parsed.toFixed(2)),
    error: "",
  };
}

