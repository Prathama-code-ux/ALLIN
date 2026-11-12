// Gemini Vision receipt extraction service

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

const RECEIPT_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    isReceipt: { type: "BOOLEAN" },
    unreadableReason: { type: "STRING", nullable: true },
    merchantName: { type: "STRING", nullable: true },
    receiptDate: { type: "STRING", nullable: true },
    currency: { type: "STRING", nullable: true },
    suggestedCategory: {
      type: "STRING",
      nullable: true,
      enum: [
        "Food",
        "Transport",
        "Shopping",
        "Entertainment",
        "Bills",
        "Health",
        "Travel",
        "Other",
      ],
    },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          quantity: { type: "NUMBER", nullable: true },
          unitPrice: { type: "NUMBER", nullable: true },
          totalPrice: { type: "NUMBER" },
        },
        required: ["name", "totalPrice"],
      },
    },
    subtotal: { type: "NUMBER", nullable: true },
    tax: { type: "NUMBER", nullable: true },
    tip: { type: "NUMBER", nullable: true },
    discount: { type: "NUMBER", nullable: true },
    total: { type: "NUMBER", nullable: true },
    confidenceNotes: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
  },
  required: ["isReceipt", "items", "confidenceNotes"],
};

const RECEIPT_EXTRACTION_PROMPT = [
  "You are a precision receipt parser for an expense-splitting app.",
  "Inspect the attached image and extract ONLY what is clearly printed on the receipt.",
  "Rules:",
  "1. If the image is NOT a receipt/invoice or is too blurry, cropped, or dark to read line items or total reliably, set isReceipt to false and provide a concise explanation in unreadableReason.",
  "2. NEVER invent, guess, or fabricate missing values. Use null for any field (merchantName, receiptDate, currency, subtotal, tax, tip, discount, total, quantity, unitPrice) that is absent or illegible.",
  "3. Format receiptDate as YYYY-MM-DD only when day, month, and year are clearly legible; otherwise null.",
  "4. Use 3-letter ISO currency code (e.g. USD, EUR, GBP, INR) only if clearly shown or unambiguous from currency text/symbols; otherwise null.",
  "5. List each purchased line item separately in items with its printed name and line totalPrice (positive number). Do NOT include subtotal, tax, tip, discount, or payment tender lines inside items.",
  "6. For discount, return the positive discount magnitude (e.g. 5.00 for a -$5.00 promo). Leave null if no discount is shown.",
  "7. Add short notes in confidenceNotes only if part of the receipt is faint, truncated, or ambiguous.",
].join("\n");

export class GeminiServiceError extends Error {
  constructor(message, status = 502, code = "AI_EXTRACTION_FAILED") {
    super(message);
    this.name = "GeminiServiceError";
    this.status = status;
    this.code = code;
  }
}

export const extractReceiptData = async ({ base64Data, mimeType }) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiServiceError(
      "AI receipt scanning is not configured on the server yet (missing GEMINI_API_KEY). You can still enter the expense manually.",
      503,
      "AI_NOT_CONFIGURED",
    );
  }

  const model = (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          { text: RECEIPT_EXTRACTION_PROMPT },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: RECEIPT_RESPONSE_SCHEMA,
    },
  };

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw new GeminiServiceError(
        "Receipt analysis timed out. Please retry or enter the expense manually.",
        504,
        "AI_TIMEOUT",
      );
    }
    throw new GeminiServiceError(
      "Unable to reach Gemini Vision service. Please try again or enter the expense manually.",
      502,
      "AI_NETWORK_ERROR",
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new GeminiServiceError(
      "Received an invalid response from Gemini Vision.",
      502,
      "AI_BAD_RESPONSE",
    );
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new GeminiServiceError(
        "AI receipt scanner rate limit reached. Please wait a moment or enter the expense manually.",
        429,
        "AI_RATE_LIMITED",
      );
    }
    const upstreamMsg = payload?.error?.message || "Gemini Vision request failed.";
    throw new GeminiServiceError(upstreamMsg, 502, "AI_UPSTREAM_ERROR");
  }

  const candidate = payload?.candidates?.[0];
  const textOutput = candidate?.content?.parts
    ?.map((part) => part?.text || "")
    .join("")
    .trim();

  if (!textOutput) {
    throw new GeminiServiceError(
      "Gemini Vision did not return any extracted receipt text.",
      422,
      "AI_EMPTY_OUTPUT",
    );
  }

  return textOutput;
};

export const geminiService = {
  extractReceiptData,
};

export default geminiService;

