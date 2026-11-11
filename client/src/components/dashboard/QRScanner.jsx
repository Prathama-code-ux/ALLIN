import React, { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, Upload, ScanLine } from "lucide-react";

export default function QRScanner({ isOpen, onClose, onScanSuccess }) {
  const scannerRef = useRef(null);
  const handledRef = useRef(false);
  const onScanSuccessRef = useRef(onScanSuccess);
  const onCloseRef = useRef(onClose);

  const generatedId = useId().replace(/:/g, "");
  const scannerElementId = `allin-qr-reader-${generatedId}`;

  const [cameraError, setCameraError] = useState("");
  const [cameraLoading, setCameraLoading] = useState(true);
  const [fileLoading, setFileLoading] = useState(false);

  // Keep the latest callbacks without restarting the camera.
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
    onCloseRef.current = onClose;
  }, [onScanSuccess, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const startScanner = async () => {
      handledRef.current = false;
      setCameraError("");
      setCameraLoading(true);

      const scanner = new Html5Qrcode(scannerElementId);
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          async (decodedText) => {
            if (handledRef.current) return;

            handledRef.current = true;

            try {
              if (scanner.isScanning) {
                await scanner.stop();
              }
            } catch (error) {
              console.warn("Could not stop QR camera:", error);
            }

            onScanSuccessRef.current?.(decodedText);
          },
          () => {
            // Ignore normal frames where no QR code is detected.
          },
        );

        if (!cancelled) {
          setCameraLoading(false);
        }
      } catch (error) {
        console.error("QR camera error:", error);

        if (!cancelled) {
          setCameraLoading(false);
          setCameraError(
            "Unable to access the camera. Allow camera permission or upload a QR image instead.",
          );
        }
      }
    };

    startScanner();

    return () => {
      cancelled = true;

      const scanner = scannerRef.current;
      scannerRef.current = null;

      if (scanner) {
        const stopAndClear = async () => {
          try {
            if (scanner.isScanning) {
              await scanner.stop();
            }
          } catch (error) {
            console.warn("Scanner cleanup:", error);
          }

          try {
            await scanner.clear();
          } catch (error) {
            console.warn("Scanner clear:", error);
          }
        };

        stopAndClear();
      }
    };
  }, [isOpen, scannerElementId]);

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];

    // Allow selecting the same image again.
    event.target.value = "";

    if (!file || !scannerRef.current) return;

    setFileLoading(true);
    setCameraError("");

    try {
      const scanner = scannerRef.current;

      if (scanner.isScanning) {
        await scanner.stop();
      }

      handledRef.current = false;

      const decodedText = await scanner.scanFile(file, true);

      if (!handledRef.current) {
        handledRef.current = true;
        onScanSuccessRef.current?.(decodedText);
      }
    } catch (error) {
      console.error("QR image scan failed:", error);
      setCameraError(
        "No readable QR code was found in that image. Try a clearer image.",
      );
    } finally {
      setFileLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-[#a66bff]/25 bg-[#12101e] p-5 sm:p-6 shadow-[0_0_50px_rgba(166,107,255,0.15)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2 text-[#c49cff] text-xs font-bold tracking-widest uppercase">
              <ScanLine className="w-4 h-4" />
              ALLIN QR Scanner
            </div>

            <h2 className="text-xl font-bold text-white mt-2">
              Scan merchant QR or bill
            </h2>

            <p className="text-xs text-[#94A3B8] mt-1">
              Position the QR code inside the scanning area.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-white/10"
            aria-label="Close scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-black min-h-[280px]">
          <div id={scannerElementId} className="w-full" />

          {cameraLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#090810] text-[#c49cff]">
              <Camera className="w-8 h-8 animate-pulse" />
              <p className="text-sm">Starting camera...</p>
            </div>
          )}
        </div>

        {cameraError && (
          <div className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-300">
            {cameraError}
          </div>
        )}

        <div className="mt-5">
          <label className="flex items-center justify-center gap-2 w-full rounded-xl border border-[#a66bff]/30 bg-[#a66bff]/10 px-4 py-3 text-sm font-semibold text-[#c49cff] hover:bg-[#a66bff]/20 cursor-pointer transition">
            <Upload className="w-4 h-4" />
            {fileLoading ? "Reading QR image..." : "Upload QR image instead"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={fileLoading}
            />
          </label>
        </div>

        <p className="text-[11px] leading-relaxed text-[#7E8B99] mt-4 text-center">
          Scanning only reads the QR information. It will not initiate a payment
          or automatically open any links.
        </p>
      </div>
    </div>
  );
}
