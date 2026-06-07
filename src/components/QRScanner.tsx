// components/QRScanner.tsx
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, CheckCircle, AlertCircle, Camera } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import TeacherAttendanceService from "@/services/teacherAttendanceService";


interface Props {
  onClose: () => void;
}

type ScanState = "idle" | "scanning" | "getting-location" | "submitting" | "success" | "error";

const QRScanner = ({ onClose }: Props) => {
  const scannerRef    = useRef<Html5Qrcode | null>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const [scanState,   setScanState]   = useState<ScanState>("idle");
  const [attendType,  setAttendType]  = useState<"check-in" | "check-out">("check-in");
  const [resultMsg,   setResultMsg]   = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopScanner = async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }
    } catch { /* ignore */ }
  };

  const startScanner = async () => {
    setCameraError(null);
    setScanState("scanning");

    // ✅ Small delay to ensure DOM element is mounted
    await new Promise((r) => setTimeout(r, 100));

    const scanner = new Html5Qrcode("qr-scanner-container");
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          await stopScanner();
          await handleScannedQR(decodedText);
        },
        () => { /* ignore frame errors */ }
      );
    } catch (err: any) {
      setCameraError("Camera access denied. Please allow camera permission.");
      setScanState("idle");
    }
  };

  const handleScannedQR = async (rawText: string) => {
    setScanState("getting-location");
    try {
      // 1. Parse QR payload
      const payload = JSON.parse(rawText);

      // 2. Check expiry
      if (payload.exp && Date.now() > payload.exp) {
        setScanState("error");
        setResultMsg("QR code has expired. Ask admin to regenerate.");
        return;
      }

      // 3. Get GPS location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      setScanState("submitting");

      // 4. Submit attendance
      const res = await TeacherAttendanceService.markTeacherAttendanceByQR({
        type: attendType,
        gps: {
          latitude:  position.coords.latitude,
          longitude: position.coords.longitude,
        },
      });

      if (!res.success) {
        setScanState("error");
        setResultMsg(res?.message ?? "Failed to mark attendance");
        return;
      }

      setScanState("success");
      setResultMsg(`${attendType === "check-in" ? "Checked in" : "Checked out"} successfully!`);
      toast.success(resultMsg || "Attendance marked!");

    } catch (err: any) {
      setScanState("error");
      if (err?.code === 1) {
        setResultMsg("Location access denied. Enable GPS to mark attendance.");
      } else if (err instanceof SyntaxError) {
        setResultMsg("Invalid QR code. Please scan the correct attendance QR.");
      } else {
        setResultMsg(err?.message ?? "Something went wrong");
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        onClick={handleClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-modal overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h3 className="font-display text-base font-bold text-foreground">Scan Attendance QR</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Point camera at admin's screen</p>
            </div>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Check-in / Check-out toggle */}
            {(scanState === "idle" || scanState === "scanning") && (
              <div className="flex gap-2">
                {(["check-in", "check-out"] as const).map((t) => (
                  <button key={t} onClick={() => setAttendType(t)}
                    className={`flex-1 rounded-lg border py-2 text-xs font-semibold capitalize transition-colors ${
                      attendType === t
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:bg-secondary"
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            )}

            {/* Scanner container */}
            {scanState === "scanning" && (
              <div className="relative">
                <div id="qr-scanner-container" ref={containerRef}
                  className="w-full rounded-xl overflow-hidden border border-border" />
                {/* Overlay guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="h-44 w-44 border-2 border-primary rounded-lg opacity-70" />
                </div>
                <p className="text-center text-xs text-muted-foreground mt-2">
                  Align QR code within the frame
                </p>
              </div>
            )}

            {/* Idle state */}
            {scanState === "idle" && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera className="h-10 w-10 text-primary" />
                </div>
                {cameraError && (
                  <p className="text-xs text-destructive text-center">{cameraError}</p>
                )}
                <button onClick={startScanner}
                  className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                  Start Camera
                </button>
              </div>
            )}

            {/* Loading states */}
            {(scanState === "getting-location" || scanState === "submitting") && (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {scanState === "getting-location"
                    ? <><MapPin className="h-4 w-4" /> Getting your location...</>
                    : "Marking attendance..."}
                </div>
              </div>
            )}

            {/* Success */}
            {scanState === "success" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-sm font-semibold text-green-700 text-center">{resultMsg}</p>
                <button onClick={handleClose}
                  className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors">
                  Done
                </button>
              </div>
            )}

            {/* Error */}
            {scanState === "error" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <p className="text-sm text-destructive text-center">{resultMsg}</p>
                <div className="flex gap-2">
                  <button onClick={() => { setScanState("idle"); setResultMsg(""); }}
                    className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors">
                    Try Again
                  </button>
                  <button onClick={handleClose}
                    className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default QRScanner;