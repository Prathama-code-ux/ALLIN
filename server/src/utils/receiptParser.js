const VALID_CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
  "Bills",
  "Health",
  "Travel",
  "Other",
];

export const ALLOWED_RECEIPT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const MAX_RECEIPT_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

const toCents = (val) => {
  const num = Number(val);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100);
};

const round2 = (val) => Number(Number(val).toFixed(2));

/**
 * Normalize image/jpg to standard image/jpeg and validate allowed receipt MIME types.
 */
export function normalizeReceiptMimeType(mimeType) {
  if (!mimeType || typeof mimeType !== "string") return null;
  const cleaned = mimeType.trim().toLowerCase().split(";")[0];
  const normalized = cleaned === "image/jpg" ? "image/jpeg" : cleaned;
  return ALLOWED_RECEIPT_MIME_TYPES.includes(normalized) ? normalized : null;
}

/**
 * Verify image buffer signature (magic bytes) matches the declared MIME type.
 */
function matchesImageMagicBytes(buffer, mimeType) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;

  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  if (mimeType === "image/webp") {
    const riff = buffer.subarray(0, 4).toString("ascii");
    const webp = buffer.subarray(8, 12).toString("ascii");
    return riff === "RIFF" && webp === "WEBP";
  }

  return false;
}

/**
 * Decode a base64 receipt image, enforce size & MIME constraints, and check magic bytes.
 */
export function decodeAndValidateReceiptImage({ imageBase64, mimeType }) {
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return {
      ok: false,
      status: 400,
      message: "Receipt image data is required.",
    };
  }

  let declaredMime = mimeType;
  let rawBase64 = imageBase64.trim();

  const dataUrlMatch = rawBase64.match(
    /^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/s,
  );
  if (dataUrlMatch) {
    if (!declaredMime) {
      declaredMime = dataUrlMatch[1];
    }
    rawBase64 = dataUrlMatch[2].replace(/\s+/g, "");
  } else {
    rawBase64 = rawBase64.replace(/\s+/g, "");
  }

  const normalizedMime = normalizeReceiptMimeType(declaredMime);
  if (!normalizedMime) {
    return {
      ok: false,
      status: 400,
      message: "Unsupported image format. Please upload a JPG, JPEG, PNG, or WebP receipt.",
    };
  }

  if (!rawBase64 || !/^[A-Za-z0-9+/]+=*$/.test(rawBase64)) {
    return {
      ok: false,
      status: 400,
      message: "Invalid base64 image payload.",
    };
  }

  const buffer = Buffer.from(rawBase64, "base64");
  if (buffer.length === 0) {
    return {
      ok: false,
      status: 400,
      message: "Uploaded receipt image is empty.",
    };
  }

  if (buffer.length > MAX_RECEIPT_IMAGE_BYTES) {
    return {
      ok: false,
      status: 413,
      message: "Receipt image exceeds the 5 MB size limit.",
    };
  }

  if (!matchesImageMagicBytes(buffer, normalizedMime)) {
    return {
      ok: false,
      status: 400,
      message: "Uploaded file contents do not match a valid JPG, PNG, or WebP image.",
    };
  }

  return {
    ok: true,
    mimeType: normalizedMime,
    base64Data: buffer.toString("base64"),
    byteLength: buffer.length,
  };
}

function parseOptionalNonNegativeNumber(value, { allowNegativeMagnitude = false } = {}) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  if (num < 0) {
    return allowNegativeMagnitude ? round2(Math.abs(num)) : null;
  }
  return round2(num);
}

function parseOptionalIsoDate(value) {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed.toISOString().slice(0, 10) !== trimmed) return null;
  return trimmed;
}

function parseRawAiJson(rawInput) {
  if (rawInput && typeof rawInput === "object" && !Array.isArray(rawInput)) {
    return rawInput;
  }
  if (typeof rawInput !== "string") {
    return null;
  }

  const stripped = rawInput
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(stripped);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

/**
 * Validate and normalize Gemini Vision receipt JSON without inventing missing values
 * or trusting AI-side arithmetic.
 */
export function validateAndNormalizeReceipt(rawAiOutput) {
  const raw = parseRawAiJson(rawAiOutput);
  if (!raw) {
    return {
      ok: false,
      status: 502,
      message: "AI returned an unreadable response. Please retry or enter the expense manually.",
    };
  }

  if (raw.isReceipt === false) {
    return {
      ok: false,
      status: 422,
      message:
        (typeof raw.unreadableReason === "string" && raw.unreadableReason.trim()) ||
        "This image does not appear to be a readable receipt. Please upload a clearer photo or enter the expense manually.",
    };
  }

  const merchantName =
    typeof raw.merchantName === "string" && raw.merchantName.trim()
      ? raw.merchantName.trim().slice(0, 120)
      : null;

  const receiptDate = parseOptionalIsoDate(raw.receiptDate);

  const currency =
    typeof raw.currency === "string" && /^[A-Za-z]{3}$/.test(raw.currency.trim())
      ? raw.currency.trim().toUpperCase()
      : null;

  const suggestedCategory =
    typeof raw.suggestedCategory === "string" &&
    VALID_CATEGORIES.includes(raw.suggestedCategory.trim())
      ? raw.suggestedCategory.trim()
      : null;

  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  const items = [];
  let droppedItemsCount = 0;

  for (const entry of rawItems.slice(0, 100)) {
    if (!entry || typeof entry !== "object") {
      droppedItemsCount += 1;
      continue;
    }

    const name = typeof entry.name === "string" ? entry.name.trim().slice(0, 120) : "";
    const totalPrice = parseOptionalNonNegativeNumber(entry.totalPrice);
    const unitPrice = parseOptionalNonNegativeNumber(entry.unitPrice);
    const qtyNum = Number(entry.quantity);
    const quantity = Number.isFinite(qtyNum) && qtyNum > 0 ? round2(qtyNum) : null;

    if (!name || totalPrice === null) {
      droppedItemsCount += 1;
      continue;
    }

    items.push({
      name,
      quantity,
      unitPrice,
      totalPrice,
    });
  }

  const subtotal = parseOptionalNonNegativeNumber(raw.subtotal);
  const tax = parseOptionalNonNegativeNumber(raw.tax);
  const tip = parseOptionalNonNegativeNumber(raw.tip);
  const discount = parseOptionalNonNegativeNumber(raw.discount, {
    allowNegativeMagnitude: true,
  });
  const total = parseOptionalNonNegativeNumber(raw.total);

  if (items.length === 0 && total === null) {
    return {
      ok: false,
      status: 422,
      message:
        "No receipt line items or total could be clearly extracted. Try a sharper image or switch to manual entry.",
    };
  }

  const confidenceNotes = Array.isArray(raw.confidenceNotes)
    ? raw.confidenceNotes
        .filter((n) => typeof n === "string" && n.trim())
        .map((n) => n.trim().slice(0, 200))
        .slice(0, 8)
    : [];

  if (droppedItemsCount > 0) {
    confidenceNotes.push(
      `${droppedItemsCount} unclear line item(s) could not be read cleanly and were omitted.`,
    );
  }

  // Deterministic integer-cent verification (never trust AI arithmetic)
  const itemsSumCents = items.reduce((sum, item) => sum + (toCents(item.totalPrice) || 0), 0);
  const taxCents = toCents(tax) || 0;
  const tipCents = toCents(tip) || 0;
  const discountCents = toCents(discount) || 0;
  const calculatedTotalCents =
    items.length > 0 ? itemsSumCents - discountCents + taxCents + tipCents : null;
  const extractedTotalCents = toCents(total);

  const totalDifferenceCents =
    calculatedTotalCents !== null && extractedTotalCents !== null
      ? extractedTotalCents - calculatedTotalCents
      : null;

  const hasTotalMismatch =
    totalDifferenceCents !== null && Math.abs(totalDifferenceCents) > 0;

  return {
    ok: true,
    receipt: {
      merchantName,
      receiptDate,
      currency,
      suggestedCategory,
      items,
      subtotal,
      tax,
      tip,
      discount,
      total,
      confidenceNotes,
      diagnostics: {
        itemsSum: items.length > 0 ? Number((itemsSumCents / 100).toFixed(2)) : null,
        calculatedTotal:
          calculatedTotalCents !== null
            ? Number((calculatedTotalCents / 100).toFixed(2))
            : null,
        totalDifference:
          totalDifferenceCents !== null
            ? Number((totalDifferenceCents / 100).toFixed(2))
            : null,
        hasTotalMismatch,
        hasItems: items.length > 0,
      },
    },
  };
}

