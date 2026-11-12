import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  FileImage,
  Loader2,
  Plus,
  Receipt,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import aiService from "../../services/aiService";
import { formatUSD } from "../../utils/currency";
import {
  CATEGORY_ICONS,
  buildReceiptDescription,
  calculateItemizedReceiptSplits,
  getMemberId,
} from "../../utils/expenseSplits";

const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
  "Bills",
  "Health",
  "Travel",
  "Other",
];

const ALLOWED_FILE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const getTodayISO = () => new Date().toISOString().split("T")[0];

const getMemberLabel = (member) => {
  if (!member) return "Member";
  if (typeof member === "string") return `Member (${member.slice(-4)})`;
  return member.name || member.email || `Member (${getMemberId(member).slice(-4)})`;
};

const readFileAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const commaIdx = result.indexOf(",");
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error("Could not read the selected image file."));
    reader.readAsDataURL(file);
  });

export default function ReceiptScannerModal({
  isOpen,
  onClose,
  groups = [],
  defaultGroupId = "",
  onConfirmExpense,
  onSwitchToManual,
}) {
  const fileInputRef = useRef(null);
  const cameraCaptureInputRef = useRef(null);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const nextItemIdRef = useRef(1);

  const [step, setStep] = useState("upload"); // 'upload' | 'assign' | 'preview'
  const [selectedGroupId, setSelectedGroupId] = useState(defaultGroupId || "");

  // Image upload & camera state
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");

  // Extraction progress & errors
  const [scanning, setScanning] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [scanError, setScanError] = useState("");

  // Extracted + editable receipt data
  const [extractedMeta, setExtractedMeta] = useState(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Food");
  const [receiptDate, setReceiptDate] = useState(getTodayISO());
  const [dateWasMissing, setDateWasMissing] = useState(false);
  const [items, setItems] = useState([]);
  const [taxInput, setTaxInput] = useState("");
  const [tipInput, setTipInput] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const stopCameraStream = () => {
    const stream = mediaStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  // Reset modal state cleanly whenever opened/closed
  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });
      return;
    }

    setStep("upload");
    setSelectedGroupId(defaultGroupId || "");
    setSelectedFile(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setScanError("");
    setCameraError("");
    setScanning(false);
    setUploadProgress(0);
    setExtractedMeta(null);
    setTitle("");
    setCategory("Food");
    setReceiptDate(getTodayISO());
    setDateWasMissing(false);
    setItems([]);
    setTaxInput("");
    setTipInput("");
    setDiscountInput("");
    setDescriptionInput("");
    setSubmitError("");
    setSubmitting(false);
    nextItemIdRef.current = 1;
  }, [isOpen, defaultGroupId]);

  // Attach live webcam stream after video element renders
  useEffect(() => {
    if (cameraActive && videoRef.current && mediaStreamRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
    }
  }, [cameraActive]);

  // Revoke object URL on change/unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const selectedGroup = useMemo(() => {
    if (!selectedGroupId) return null;
    return groups.find((g) => getMemberId(g) === String(selectedGroupId)) || null;
  }, [groups, selectedGroupId]);

  const groupMembers = useMemo(
    () => (Array.isArray(selectedGroup?.members) ? selectedGroup.members : []),
    [selectedGroup],
  );

  const memberIdsOrder = useMemo(
    () => groupMembers.map(getMemberId).filter(Boolean),
    [groupMembers],
  );

  const itemizedSplit = useMemo(() => {
    const mappedItems = items.map((item) => ({
      id: item.id,
      name: item.name,
      amount: item.amount,
      assignedMemberIds: item.assignedMemberIds,
    }));

    return calculateItemizedReceiptSplits({
      items: mappedItems,
      tax: taxInput === "" ? 0 : taxInput,
      tip: tipInput === "" ? 0 : tipInput,
      discount: discountInput === "" ? 0 : discountInput,
      memberOrder: memberIdsOrder,
    });
  }, [items, taxInput, tipInput, discountInput, memberIdsOrder]);

  const personalTotal = useMemo(() => {
    const itemsSumCents = items.reduce((sum, item) => {
      const n = Number(item.amount);
      return Number.isFinite(n) && n > 0 ? sum + Math.round(n * 100) : sum;
    }, 0);
    const taxCents = Math.max(0, Math.round(Number(taxInput || 0) * 100) || 0);
    const tipCents = Math.max(0, Math.round(Number(tipInput || 0) * 100) || 0);
    const discCents = Math.max(0, Math.round(Number(discountInput || 0) * 100) || 0);
    return Number((Math.max(0, itemsSumCents - discCents + taxCents + tipCents) / 100).toFixed(2));
  }, [items, taxInput, tipInput, discountInput]);

  if (!isOpen) return null;

  const createItemId = () => {
    const id = `receipt-item-${nextItemIdRef.current}`;
    nextItemIdRef.current += 1;
    return id;
  };

  const handleSelectFile = (file) => {
    setScanError("");
    if (!file) return;

    const normalizedType = String(file.type || "").toLowerCase();
    const validExt = /\.(jpe?g|png|webp)$/i.test(file.name || "");
    if (!ALLOWED_FILE_TYPES.has(normalizedType) && !validExt) {
      setScanError(
        "Unsupported file type. Please choose a JPG, JPEG, PNG, or WebP receipt image.",
      );
      return;
    }

    if (file.size <= 0) {
      setScanError("The selected image file is empty.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setScanError(
        `Image is ${(file.size / (1024 * 1024)).toFixed(2)} MB, which exceeds the 5 MB limit.`,
      );
      return;
    }

    stopCameraStream();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const startCameraCapture = async () => {
    setCameraError("");
    setScanError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      // Fallback to native mobile camera file input
      cameraCaptureInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      mediaStreamRef.current = stream;
      setCameraActive(true);
    } catch {
      setCameraError(
        "Camera permission is unavailable. Upload a receipt image file instead.",
      );
    }
  };

  const capturePhotoFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("Camera feed is still initializing. Please try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError("Could not capture image frame from camera.");
          return;
        }
        const photoFile = new File([blob], `receipt-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        handleSelectFile(photoFile);
      },
      "image/jpeg",
      0.92,
    );
  };

  const handleGroupSwitchInScanner = (newGroupId) => {
    setSelectedGroupId(newGroupId);
    const nextGroup = groups.find((g) => getMemberId(g) === String(newGroupId));
    const nextMemberIds = Array.isArray(nextGroup?.members)
      ? nextGroup.members.map(getMemberId).filter(Boolean)
      : [];

    setItems((prev) =>
      prev.map((item) => {
        const preserved = item.assignedMemberIds.filter((id) =>
          nextMemberIds.includes(id),
        );
        return {
          ...item,
          assignedMemberIds: preserved.length > 0 ? preserved : [...nextMemberIds],
        };
      }),
    );
  };

  const handleAnalyzeReceipt = async () => {
    if (!selectedFile || scanning) return;

    setScanError("");
    setScanning(true);
    setUploadProgress(5);

    try {
      const base64Data = await readFileAsBase64(selectedFile);
      const mimeType =
        selectedFile.type && ALLOWED_FILE_TYPES.has(selectedFile.type.toLowerCase())
          ? selectedFile.type.toLowerCase()
          : /\.png$/i.test(selectedFile.name)
            ? "image/png"
            : /\.webp$/i.test(selectedFile.name)
              ? "image/webp"
              : "image/jpeg";

      const result = await aiService.parseReceipt({
        imageBase64: base64Data,
        mimeType,
        fileName: selectedFile.name,
        groupId: selectedGroupId || null,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.min(
              90,
              Math.round((progressEvent.loaded / progressEvent.total) * 90),
            );
            setUploadProgress(pct);
          }
        },
      });

      setUploadProgress(100);
      const receipt = result?.receipt;
      if (!receipt) {
        throw new Error("Receipt extraction returned empty data.");
      }

      setExtractedMeta(receipt);
      setTitle(receipt.merchantName || "Scanned Receipt");
      setCategory(receipt.suggestedCategory || "Other");
      setDateWasMissing(!receipt.receiptDate);
      setReceiptDate(receipt.receiptDate || getTodayISO());
      setTaxInput(receipt.tax !== null && receipt.tax !== undefined ? String(receipt.tax) : "");
      setTipInput(receipt.tip !== null && receipt.tip !== undefined ? String(receipt.tip) : "");
      setDiscountInput(
        receipt.discount !== null && receipt.discount !== undefined
          ? String(receipt.discount)
          : "",
      );

      const defaultAssigned = [...memberIdsOrder];
      const extractedItems = Array.isArray(receipt.items) ? receipt.items : [];

      if (extractedItems.length > 0) {
        setItems(
          extractedItems.map((it) => ({
            id: createItemId(),
            name: it.name || "",
            quantity: it.quantity !== null && it.quantity !== undefined ? String(it.quantity) : "1",
            amount: Number(it.totalPrice || 0).toFixed(2),
            assignedMemberIds: [...defaultAssigned],
          })),
        );
      } else if (receipt.total !== null && receipt.total !== undefined) {
        setItems([
          {
            id: createItemId(),
            name: receipt.merchantName || "Receipt Total",
            quantity: "1",
            amount: Number(receipt.total).toFixed(2),
            assignedMemberIds: [...defaultAssigned],
          },
        ]);
      } else {
        setItems([]);
      }

      setStep("assign");
    } catch (error) {
      const serverMessage =
        error.response?.data?.message ||
        error.message ||
        "Could not analyze this receipt. Try another photo or enter the expense manually.";
      setScanError(serverMessage);
    } finally {
      setScanning(false);
    }
  };

  const handleUpdateItemField = (itemId, field, value) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
    );
  };

  const handleToggleItemMember = (itemId, memberId) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const exists = item.assignedMemberIds.includes(memberId);
        return {
          ...item,
          assignedMemberIds: exists
            ? item.assignedMemberIds.filter((id) => id !== memberId)
            : [...item.assignedMemberIds, memberId],
        };
      }),
    );
  };

  const handleSetItemMembers = (itemId, ids) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, assignedMemberIds: [...ids] } : item,
      ),
    );
  };

  const handleAddEmptyItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: createItemId(),
        name: "",
        quantity: "1",
        amount: "",
        assignedMemberIds: [...memberIdsOrder],
      },
    ]);
  };

  const handleRemoveItem = (itemId) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleAssignAllEvenly = () => {
    setItems((prev) =>
      prev.map((item) => ({ ...item, assignedMemberIds: [...memberIdsOrder] })),
    );
  };

  const handleApplyPrintedTotalDifference = () => {
    const printedTotal = Number(extractedMeta?.total);
    if (!Number.isFinite(printedTotal)) return;
    const diff = Number((printedTotal - itemizedSplit.finalTotal).toFixed(2));
    if (Math.abs(diff) < 0.01) return;

    if (diff > 0) {
      setItems((prev) => [
        ...prev,
        {
          id: createItemId(),
          name: "Service / Receipt Adjustment",
          quantity: "1",
          amount: diff.toFixed(2),
          assignedMemberIds: [...memberIdsOrder],
        },
      ]);
    } else {
      const currentDisc = Number(discountInput || 0);
      setDiscountInput(Number((currentDisc + Math.abs(diff)).toFixed(2)).toString());
    }
  };

  const canProceedToPreview = () => {
    if (!title.trim()) return false;
    if (selectedGroupId && groupMembers.length > 0) {
      return itemizedSplit.isValid;
    }
    return personalTotal > 0 && items.every((it) => String(it.name || "").trim() && Number(it.amount) > 0);
  };

  const handleProceedToPreview = () => {
    setSubmitError("");
    if (!title.trim()) {
      setSubmitError("Please enter a merchant or expense title.");
      return;
    }

    if (selectedGroupId && groupMembers.length > 0) {
      if (!itemizedSplit.isValid) {
        setSubmitError(
          itemizedSplit.error || "Please resolve all item assignments before continuing.",
        );
        return;
      }
    } else if (personalTotal <= 0) {
      setSubmitError("Total amount must be greater than $0.00.");
      return;
    }

    const activeTotal =
      selectedGroupId && groupMembers.length > 0
        ? itemizedSplit.finalTotal
        : personalTotal;

    setDescriptionInput(
      buildReceiptDescription({
        merchantName: title.trim(),
        items: items.map((it) => ({
          name: it.name.trim(),
          amount: Number(it.amount || 0),
        })),
        tax: Number(taxInput || 0),
        tip: Number(tipInput || 0),
        discount: Number(discountInput || 0),
        finalTotal: activeTotal,
        currency: extractedMeta?.currency,
      }),
    );

    setStep("preview");
  };

  const handleFinalSubmit = async () => {
    if (submitting) return;
    setSubmitError("");
    setSubmitting(true);

    try {
      const hasGroupSplits = Boolean(selectedGroupId && groupMembers.length > 0);
      const finalAmount = hasGroupSplits ? itemizedSplit.finalTotal : personalTotal;

      const payload = {
        title: title.trim(),
        category,
        amount: finalAmount,
        date: receiptDate || getTodayISO(),
        description: descriptionInput.trim(),
        groupId: selectedGroupId || null,
        splitType: hasGroupSplits ? "custom" : "none",
        splits: hasGroupSplits ? itemizedSplit.splits : [],
      };

      await onConfirmExpense(payload);
      onClose();
    } catch (err) {
      setSubmitError(
        err.response?.data?.message ||
          err.message ||
          "Could not save receipt expense.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    stopCameraStream();
    onClose();
  };

  const printedTotalNum = Number(extractedMeta?.total);
  const showPrintedTotalMismatch =
    extractedMeta?.total !== null &&
    extractedMeta?.total !== undefined &&
    Number.isFinite(printedTotalNum) &&
    Math.abs(printedTotalNum - itemizedSplit.finalTotal) > 0.009;

  return (
    <div className="expense-modal-backdrop" onClick={handleCloseModal}>
      <div
        className="expense-modal-card receipt-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="expense-modal-header">
          <div>
            <span className="eyebrow receipt-eyebrow">
              <Sparkles className="w-3.5 h-3.5" /> GEMINI VISION AI
            </span>
            <h3>
              {step === "upload"
                ? "Scan Receipt with AI"
                : step === "assign"
                  ? "Assign Receipt Items"
                  : "Confirm Split & Create Expense"}
            </h3>
          </div>
          <button
            type="button"
            className="close-modal-button"
            onClick={handleCloseModal}
            aria-label="Close AI receipt scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="receipt-steps-bar" aria-label="Scanner progress">
          <span className={`receipt-step-pill ${step === "upload" ? "active" : "done"}`}>
            1. Upload
          </span>
          <span className={`receipt-step-pill ${step === "assign" ? "active" : step === "preview" ? "done" : ""}`}>
            2. Assign Items
          </span>
          <span className={`receipt-step-pill ${step === "preview" ? "active" : ""}`}>
            3. Confirm
          </span>
        </div>

        {/* STEP 1: UPLOAD / PHOTOGRAPH */}
        {step === "upload" && (
          <div className="receipt-step-content">
            <div className="form-group">
              <label htmlFor="receipt-group-select">Group / Crew</label>
              <select
                id="receipt-group-select"
                className="receipt-select-input"
                value={selectedGroupId}
                onChange={(e) => handleGroupSwitchInScanner(e.target.value)}
              >
                <option value="">Personal Expense (No Group)</option>
                {groups.map((group) => {
                  const gid = getMemberId(group);
                  return (
                    <option key={gid} value={gid}>
                      {group.name} ({group.members?.length || 1} members)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Camera live preview if active */}
            {cameraActive && (
              <div className="receipt-camera-box">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="receipt-camera-video"
                />
                <div className="receipt-camera-actions">
                  <button
                    type="button"
                    className="receipt-secondary-btn"
                    onClick={stopCameraStream}
                  >
                    Cancel Camera
                  </button>
                  <button
                    type="button"
                    className="receipt-primary-btn"
                    onClick={capturePhotoFrame}
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Photo</span>
                  </button>
                </div>
              </div>
            )}

            {/* Drag-and-drop & file selection zone */}
            {!cameraActive && (
              <div
                className={`receipt-dropzone ${isDragging ? "dragging" : ""} ${
                  previewUrl ? "has-preview" : ""
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped) handleSelectFile(dropped);
                }}
              >
                {previewUrl ? (
                  <div className="receipt-preview-wrap">
                    <img
                      src={previewUrl}
                      alt="Selected receipt preview"
                      className="receipt-preview-img"
                    />
                    <div className="receipt-preview-meta">
                      <span className="receipt-file-name">
                        <FileImage className="w-4 h-4 text-[#c49cff] shrink-0" />
                        <span>{selectedFile?.name}</span>
                      </span>
                      <span className="receipt-file-size">
                        {selectedFile
                          ? `${(selectedFile.size / 1024).toFixed(0)} KB`
                          : ""}
                      </span>
                      <button
                        type="button"
                        className="receipt-change-btn"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={scanning}
                      >
                        Choose Different Image
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="receipt-dropzone-empty">
                    <div className="receipt-dropzone-icon">
                      <Receipt className="w-7 h-7 text-[#c49cff]" />
                    </div>
                    <p className="receipt-dropzone-title">
                      Drop a receipt photo here, or upload/snap one
                    </p>
                    <p className="receipt-dropzone-sub">
                      Supports JPG, JPEG, PNG, WebP up to 5 MB
                    </p>
                    <div className="receipt-upload-buttons">
                      <button
                        type="button"
                        className="receipt-secondary-btn"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4" />
                        <span>Upload Image</span>
                      </button>
                      <button
                        type="button"
                        className="receipt-secondary-btn"
                        onClick={startCameraCapture}
                      >
                        <Camera className="w-4 h-4" />
                        <span>Take Photo</span>
                      </button>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) handleSelectFile(file);
                  }}
                />
                <input
                  ref={cameraCaptureInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) handleSelectFile(file);
                  }}
                />
              </div>
            )}

            {cameraError && (
              <div className="expense-form-error" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

            {scanError && (
              <div className="expense-form-error" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <div className="receipt-error-body">
                  <span>{scanError}</span>
                  {onSwitchToManual && (
                    <button
                      type="button"
                      className="receipt-inline-fallback"
                      onClick={() => {
                        handleCloseModal();
                        onSwitchToManual();
                      }}
                    >
                      Enter Expense Manually Instead
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Upload + AI Processing Progress Bar */}
            {scanning && (
              <div className="receipt-progress-box" aria-live="polite">
                <div className="receipt-progress-header">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#c49cff]" />
                    {uploadProgress < 90
                      ? `Uploading receipt (${uploadProgress}%)...`
                      : "Extracting items with Gemini Vision..."}
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="receipt-progress-track">
                  <div
                    className="receipt-progress-fill"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="receipt-footer-actions">
              {onSwitchToManual && (
                <button
                  type="button"
                  className="cancel-expense-button"
                  onClick={() => {
                    handleCloseModal();
                    onSwitchToManual();
                  }}
                  disabled={scanning}
                >
                  Manual Entry
                </button>
              )}

              <button
                type="button"
                className="add-expense-button"
                disabled={!selectedFile || scanning}
                onClick={handleAnalyzeReceipt}
              >
                {scanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    Extract Receipt Items
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: EDIT ITEMS & ASSIGN MEMBERS */}
        {step === "assign" && (
          <div className="receipt-step-content">
            {/* Warnings for missing currency/date or AI confidence notes */}
            {extractedMeta?.currency && extractedMeta.currency !== "USD" && (
              <div className="receipt-warning-banner">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Detected currency <strong>{extractedMeta.currency}</strong> on receipt.
                  ALLIN records expenses in USD — review item amounts in USD before saving.
                </span>
              </div>
            )}

            {dateWasMissing && (
              <div className="receipt-info-banner">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Receipt date was not clearly printed and defaulted to today — verify below.
                </span>
              </div>
            )}

            {extractedMeta?.confidenceNotes?.length > 0 && (
              <div className="receipt-info-banner">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>AI Notes: {extractedMeta.confidenceNotes.join(" • ")}</span>
              </div>
            )}

            {showPrintedTotalMismatch && (
              <div className="receipt-warning-banner">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <div className="receipt-mismatch-body">
                  <span>
                    Printed receipt total is <strong>{formatUSD(printedTotalNum)}</strong>, while
                    current items + tax + tip − discount equal{" "}
                    <strong>{formatUSD(itemizedSplit.finalTotal)}</strong>.
                  </span>
                  <button
                    type="button"
                    className="receipt-inline-action"
                    onClick={handleApplyPrintedTotalDifference}
                  >
                    Match Printed Total ({formatUSD(printedTotalNum)})
                  </button>
                </div>
              </div>
            )}

            {/* Metadata Fields */}
            <div className="receipt-meta-grid">
              <div className="form-group">
                <label htmlFor="receipt-title">Merchant / Title *</label>
                <input
                  id="receipt-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Merchant or receipt title"
                />
              </div>

              <div className="form-group">
                <label htmlFor="receipt-category">Category *</label>
                <select
                  id="receipt-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_ICONS[cat] || "📦"} {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="receipt-date">Date *</label>
                <input
                  id="receipt-date"
                  type="date"
                  value={receiptDate}
                  onChange={(e) => {
                    setReceiptDate(e.target.value);
                    setDateWasMissing(false);
                  }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="receipt-assign-group">Group</label>
                <select
                  id="receipt-assign-group"
                  value={selectedGroupId}
                  onChange={(e) => handleGroupSwitchInScanner(e.target.value)}
                >
                  <option value="">Personal Expense (No Group)</option>
                  {groups.map((group) => {
                    const gid = getMemberId(group);
                    return (
                      <option key={gid} value={gid}>
                        {group.name} ({group.members?.length || 1} members)
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Extracted Items Section */}
            <div className="receipt-items-section">
              <div className="receipt-section-header">
                <div>
                  <h4>Receipt Line Items ({items.length})</h4>
                  <p>Edit names/prices and tap members sharing each item.</p>
                </div>
                <div className="receipt-section-actions">
                  {selectedGroupId && memberIdsOrder.length > 0 && items.length > 0 && (
                    <button
                      type="button"
                      className="split-even-button"
                      onClick={handleAssignAllEvenly}
                    >
                      Share All Equally
                    </button>
                  )}
                  <button
                    type="button"
                    className="split-even-button"
                    onClick={handleAddEmptyItem}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>
              </div>

              <div className="receipt-items-list">
                {items.map((item, idx) => {
                  const isUnassigned =
                    selectedGroupId &&
                    groupMembers.length > 0 &&
                    item.assignedMemberIds.length === 0;
                  const isInvalid =
                    !String(item.name || "").trim() || !(Number(item.amount) > 0);

                  return (
                    <div
                      key={item.id}
                      className={`receipt-item-card ${
                        isUnassigned || isInvalid ? "needs-attention" : ""
                      }`}
                    >
                      <div className="receipt-item-inputs">
                        <input
                          type="text"
                          className="receipt-item-name"
                          aria-label={`Item ${idx + 1} name`}
                          placeholder="Item name"
                          value={item.name}
                          onChange={(e) =>
                            handleUpdateItemField(item.id, "name", e.target.value)
                          }
                        />

                        <div className="receipt-item-num-wrap" title="Quantity">
                          <span>Qty</span>
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            aria-label={`Item ${idx + 1} quantity`}
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateItemField(item.id, "quantity", e.target.value)
                            }
                          />
                        </div>

                        <div className="receipt-item-num-wrap amount" title="Line total (USD)">
                          <span>$</span>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="0.00"
                            aria-label={`Item ${idx + 1} amount`}
                            value={item.amount}
                            onChange={(e) =>
                              handleUpdateItemField(item.id, "amount", e.target.value)
                            }
                          />
                        </div>

                        <button
                          type="button"
                          className="receipt-remove-item-btn"
                          onClick={() => handleRemoveItem(item.id)}
                          aria-label={`Remove ${item.name || `item ${idx + 1}`}`}
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {selectedGroupId && groupMembers.length > 0 && (
                        <div className="receipt-item-members">
                          <div className="receipt-member-pills">
                            {groupMembers.map((member) => {
                              const mid = getMemberId(member);
                              const active = item.assignedMemberIds.includes(mid);
                              return (
                                <button
                                  key={mid}
                                  type="button"
                                  className={`receipt-member-pill ${active ? "selected" : ""}`}
                                  onClick={() => handleToggleItemMember(item.id, mid)}
                                >
                                  {getMemberLabel(member)}
                                </button>
                              );
                            })}
                          </div>
                          <div className="receipt-item-quick-assign">
                            <button
                              type="button"
                              onClick={() =>
                                handleSetItemMembers(item.id, memberIdsOrder)
                              }
                            >
                              All
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetItemMembers(item.id, [])}
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Discount, Tax & Tip */}
            <div className="receipt-charges-grid">
              <div className="form-group">
                <label htmlFor="receipt-discount">Discount ($)</label>
                <input
                  id="receipt-discount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="receipt-tax">Tax ($)</label>
                <input
                  id="receipt-tax"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={taxInput}
                  onChange={(e) => setTaxInput(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="receipt-tip">Tip ($)</label>
                <input
                  id="receipt-tip"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={tipInput}
                  onChange={(e) => setTipInput(e.target.value)}
                />
              </div>
            </div>

            {/* Live Deterministic Breakdown */}
            <div className="receipt-breakdown-card">
              <div className="receipt-totals-summary">
                <div>
                  <span>Items Subtotal</span>
                  <strong>{formatUSD(itemizedSplit.itemsSubtotal)}</strong>
                </div>
                {itemizedSplit.discountAmount > 0 && (
                  <div>
                    <span>Discount</span>
                    <strong className="text-emerald-400">
                      -{formatUSD(itemizedSplit.discountAmount)}
                    </strong>
                  </div>
                )}
                <div>
                  <span>Tax (proportional)</span>
                  <strong>{formatUSD(itemizedSplit.taxAmount)}</strong>
                </div>
                <div>
                  <span>Tip (proportional)</span>
                  <strong>{formatUSD(itemizedSplit.tipAmount)}</strong>
                </div>
                <div className="receipt-final-total-row">
                  <span>Final Total</span>
                  <strong>
                    {formatUSD(
                      selectedGroupId && groupMembers.length > 0
                        ? itemizedSplit.finalTotal
                        : personalTotal,
                    )}{" "}
                    USD
                  </strong>
                </div>
              </div>

              {selectedGroupId && groupMembers.length > 0 && (
                <div className="receipt-member-breakdown-list">
                  <span className="receipt-breakdown-heading">
                    <Users className="w-3.5 h-3.5 text-[#a66bff]" />
                    Live Member Contributions
                  </span>
                  {groupMembers.map((member) => {
                    const mid = getMemberId(member);
                    const b = itemizedSplit.memberBreakdown?.[mid];
                    return (
                      <div key={mid} className="receipt-member-breakdown-row">
                        <div className="receipt-member-breakdown-left">
                          <strong>{getMemberLabel(member)}</strong>
                          {b && b.totalCents > 0 ? (
                            <small>
                              Items {formatUSD(b.itemsAmount)}
                              {b.discountAmount > 0
                                ? ` − Disc ${formatUSD(b.discountAmount)}`
                                : ""}
                              {b.taxAmount > 0 ? ` + Tax ${formatUSD(b.taxAmount)}` : ""}
                              {b.tipAmount > 0 ? ` + Tip ${formatUSD(b.tipAmount)}` : ""}
                            </small>
                          ) : (
                            <small>No items assigned</small>
                          )}
                        </div>
                        <span className="receipt-member-breakdown-total">
                          {formatUSD(b?.totalAmount || 0)}
                        </span>
                      </div>
                    );
                  })}

                  <div
                    className={`split-summary-bar ${
                      itemizedSplit.isValid ? "valid" : "invalid"
                    }`}
                  >
                    {itemizedSplit.isValid ? (
                      <div className="split-summary-ok">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          Exact split verified: {formatUSD(itemizedSplit.allocatedTotal)} USD
                          across {itemizedSplit.splits.length}{" "}
                          {itemizedSplit.splits.length === 1 ? "member" : "members"}
                        </span>
                      </div>
                    ) : (
                      <div className="split-summary-err">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{itemizedSplit.error}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {submitError && (
              <div className="expense-form-error" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="receipt-footer-actions">
              <button
                type="button"
                className="cancel-expense-button"
                onClick={() => setStep("upload")}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Rescan Image
              </button>
              <button
                type="button"
                className="add-expense-button"
                disabled={!canProceedToPreview()}
                onClick={handleProceedToPreview}
              >
                Preview & Confirm
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: EXPLICIT CONFIRMATION PREVIEW */}
        {step === "preview" && (
          <div className="receipt-step-content">
            <div className="receipt-confirm-card">
              <div className="receipt-confirm-top">
                <div>
                  <span className="expense-category-tag">
                    {CATEGORY_ICONS[category] || "📦"} {category}
                  </span>
                  <h4>{title.trim()}</h4>
                  <p className="receipt-confirm-meta">
                    {receiptDate} •{" "}
                    {selectedGroup ? selectedGroup.name : "Personal Expense (No Group)"}
                  </p>
                </div>
                <div className="receipt-confirm-amount">
                  <span>TOTAL</span>
                  <strong>
                    {formatUSD(
                      selectedGroupId && groupMembers.length > 0
                        ? itemizedSplit.finalTotal
                        : personalTotal,
                    )}{" "}
                    USD
                  </strong>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="receipt-description">Expense Description / Audit Summary</label>
                <textarea
                  id="receipt-description"
                  rows="3"
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                />
              </div>

              {selectedGroupId && groupMembers.length > 0 && (
                <div className="receipt-confirm-splits">
                  <span className="detail-label">
                    Final Custom Splits ({itemizedSplit.splits.length})
                  </span>
                  {itemizedSplit.splits.map((s) => {
                    const memberObj = groupMembers.find((m) => getMemberId(m) === s.userId);
                    return (
                      <div key={s.userId} className="receipt-confirm-split-row">
                        <span>{getMemberLabel(memberObj || s.userId)}</span>
                        <strong>{formatUSD(s.amount)} USD</strong>
                      </div>
                    );
                  })}
                  <p className="receipt-confirm-note">
                    Splits will be saved under {selectedGroup?.name} so members can review,
                    approve, and settle via PayPal.
                  </p>
                </div>
              )}
            </div>

            {submitError && (
              <div className="expense-form-error" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="receipt-footer-actions">
              <button
                type="button"
                className="cancel-expense-button"
                onClick={() => setStep("assign")}
                disabled={submitting}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Edit
              </button>
              <button
                type="button"
                className="add-expense-button"
                onClick={handleFinalSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Saving Expense...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Confirm & Create Expense
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
