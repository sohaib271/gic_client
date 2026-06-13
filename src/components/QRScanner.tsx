// QRScanner.tsx — full updated component
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MapPin,
  CheckCircle,
  AlertCircle,
  Camera,
  Clock,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import TeacherAttendanceService from "@/services/teacherAttendanceService";

interface Props {
  onClose: () => void;
}

type ScanState =
  | "loading"
  | "idle"
  | "scanning"
  | "getting-location"
  | "submitting"
  | "success"
  | "error";

const formatTime = (isoStr: string) => {
  const d = new Date(isoStr);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};

const QRScanner = ({ onClose }: Props) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanState, setScanState] = useState<ScanState>("loading");
  const [attendType, setAttendType] = useState<"check-in" | "check-out">(
    "check-in",
  );
  const [resultMsg, setResultMsg] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);

  // ✅ Today's status
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [hasCheckedOut, setHasCheckedOut] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);

  // ── Load today's status on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await TeacherAttendanceService.getTodayStatus();
        if (res?.success) {
          setHasCheckedIn(res.hasCheckedIn);
          setHasCheckedOut(res.hasCheckedOut);
          setCheckInTime(res.checkInTime);
          setCheckOutTime(res.checkOutTime);
          // ✅ Auto-select the appropriate type
          if (!res.hasCheckedIn) setAttendType("check-in");
          else if (!res.hasCheckedOut) setAttendType("check-out");
        }
      } catch {
        /* silently fail — still allow manual selection */
      } finally {
        setScanState("idle");
      }
    };
    load();
  }, []);

  const stopScanner = async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }
    } catch {
      /* ignore */
    }
  };

  const startScanner = async () => {
    // ✅ Block if both already done
    if (hasCheckedIn && hasCheckedOut) {
      toast.error(
        "You have already completed check-in and check-out for today",
      );
      return;
    }
    // ✅ Block duplicate type
    if (attendType === "check-in" && hasCheckedIn) {
      toast.error("You have already checked in today");
      return;
    }
    if (attendType === "check-out" && hasCheckedOut) {
      toast.error("You have already checked out today");
      return;
    }
    // ✅ Block check-out without check-in
    if (attendType === "check-out" && !hasCheckedIn) {
      toast.error("You must check in first");
      return;
    }

    setCameraError(null);
    setScanState("scanning");
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
        () => {
          /* ignore frame errors */
        },
      );
    } catch {
      setCameraError("Camera access denied. Please allow camera permission.");
      setScanState("idle");
    }
  };

  const handleScannedQR = async (rawText: string) => {
    setScanState("getting-location");
    try {
      // ✅ Parse and validate QR payload
      const payload = JSON.parse(rawText);

      if (payload.exp && Date.now() > payload.exp) {
        setScanState("error");
        setResultMsg("QR code has expired. Ask admin to regenerate.");
        return;
      }

      // ✅ Get device MAC address (fallback if not available)
      let macAddress = "unknown";
      try {
        const response = await fetch(
          "https://api.macaddress.io/v1?output=json",
          {
            headers: { Accept: "application/json" },
          },
        ).catch(() => null);

        if (response && response.ok) {
          const data = await response.json();
          macAddress = data.mac || "unknown";
        }
      } catch {
        // Use fallback if MAC fetch fails
        macAddress =
          (navigator as any).userAgentData
            ?.getHighEntropyValues?.(["macAddress"])
            ?.then((res: any) => res.macAddress)
            ?.catch(() => "unknown") || "unknown";
      }

      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          });
        },
      );

      setScanState("submitting");

      const res = await TeacherAttendanceService.markTeacherAttendanceByQR({
        type: attendType,
        gps: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        qrPayload: rawText, // ✅ Send raw QR payload
        qrSignature: payload.sig, // ✅ Send signature for validation
        macAddress: macAddress, // ✅ Send MAC address
      });

      if (!res.success) {
        setScanState("error");
        // ✅ Surface backend duplicate/ordering errors clearly
        setResultMsg(res?.message ?? "Failed to mark attendance");
        return;
      }

      // ✅ Update local status so UI reflects the change immediately
      if (attendType === "check-in") {
        setHasCheckedIn(true);
        setCheckInTime(new Date().toISOString());
      } else {
        setHasCheckedOut(true);
        setCheckOutTime(new Date().toISOString());
      }

      setScanState("success");
      setResultMsg(
        res.message ??
          `${attendType === "check-in" ? "Checked in" : "Checked out"} successfully!`,
      );
    } catch (err: any) {
      setScanState("error");
      if (err?.code === 1) setResultMsg("Location access denied. Enable GPS.");
      else if (err instanceof SyntaxError)
        setResultMsg("Invalid QR code. Please scan the correct attendance QR.");
      else setResultMsg(err?.message ?? "Something went wrong");
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  const bothDone = hasCheckedIn && hasCheckedOut;
  const typeBlocked =
    (attendType === "check-in" && hasCheckedIn) ||
    (attendType === "check-out" && hasCheckedOut) ||
    (attendType === "check-out" && !hasCheckedIn);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-modal overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h3 className="font-display text-base font-bold text-foreground">
                Scan Attendance QR
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Point camera at admin's screen
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* ✅ Today's status bar */}
            {(hasCheckedIn || hasCheckedOut) && scanState !== "success" && (
              <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 space-y-1.5">
                <p className="text-xs font-semibold text-foreground">
                  Today's Status
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-xs">
                    <div
                      className={`h-2 w-2 rounded-full ${hasCheckedIn ? "bg-green-500" : "bg-muted-foreground/30"}`}
                    />
                    <span
                      className={
                        hasCheckedIn
                          ? "text-green-700"
                          : "text-muted-foreground"
                      }
                    >
                      Check-in {checkInTime ? formatTime(checkInTime) : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <div
                      className={`h-2 w-2 rounded-full ${hasCheckedOut ? "bg-blue-500" : "bg-muted-foreground/30"}`}
                    />
                    <span
                      className={
                        hasCheckedOut
                          ? "text-blue-700"
                          : "text-muted-foreground"
                      }
                    >
                      Check-out {checkOutTime ? formatTime(checkOutTime) : "—"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Loading state */}
            {scanState === "loading" && (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
              </div>
            )}

            {/* Both done */}
            {bothDone && scanState === "idle" && (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-sm font-semibold text-green-700 text-center">
                  All done for today!
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  You have completed both check-in and check-out.
                </p>
                <button
                  onClick={handleClose}
                  className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                >
                  Close
                </button>
              </div>
            )}

            {/* Check-in / Check-out toggle */}
            {!bothDone &&
              (scanState === "idle" || scanState === "scanning") && (
                <div className="flex gap-2">
                  {(["check-in", "check-out"] as const).map((t) => {
                    const isDone =
                      t === "check-in" ? hasCheckedIn : hasCheckedOut;
                    const isBlocked =
                      isDone || (t === "check-out" && !hasCheckedIn);
                    return (
                      <button
                        key={t}
                        onClick={() => !isBlocked && setAttendType(t)}
                        disabled={isBlocked}
                        className={`flex-1 rounded-lg border py-2 text-xs font-semibold capitalize transition-colors relative ${
                          isDone
                            ? "border-green-300 bg-green-50 text-green-600 cursor-not-allowed"
                            : attendType === t
                              ? "bg-primary text-primary-foreground border-primary"
                              : isBlocked
                                ? "border-border text-muted-foreground/40 cursor-not-allowed bg-secondary/30"
                                : "border-border text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        {t}
                        {isDone && (
                          <span className="ml-1.5 text-[10px] font-normal opacity-80">
                            ✓ done
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

            {/* Scanner */}
            {scanState === "scanning" && (
              <div className="relative">
                <div
                  id="qr-scanner-container"
                  className="w-full rounded-xl overflow-hidden border border-border"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="h-44 w-44 border-2 border-primary rounded-lg opacity-70" />
                </div>
                <p className="text-center text-xs text-muted-foreground mt-2">
                  Align QR code within the frame
                </p>
                <button
                  onClick={() => {
                    stopScanner();
                    setScanState("idle");
                  }}
                  className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Idle — Start Camera button */}
            {!bothDone && scanState === "idle" && (
              <div className="flex flex-col items-center gap-3">
                {cameraError && (
                  <p className="text-xs text-destructive text-center">
                    {cameraError}
                  </p>
                )}
                {/* ✅ Show why button is disabled */}
                {typeBlocked && !bothDone && (
                  <p className="text-xs text-amber-600 text-center bg-amber-50 rounded-lg px-3 py-2 w-full">
                    {attendType === "check-in" && hasCheckedIn
                      ? "Already checked in today"
                      : attendType === "check-out" && !hasCheckedIn
                        ? "Check in first before checking out"
                        : "Already checked out today"}
                  </p>
                )}
                <button
                  onClick={startScanner}
                  disabled={typeBlocked}
                  className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera className="h-4 w-4" />
                  Start Camera
                </button>
              </div>
            )}

            {/* Loading states */}
            {(scanState === "getting-location" ||
              scanState === "submitting") && (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {scanState === "getting-location" ? (
                    <>
                      <MapPin className="h-4 w-4" /> Getting your location...
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4" /> Marking attendance...
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Success */}
            {scanState === "success" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-sm font-semibold text-green-700 text-center">
                  {resultMsg}
                </p>
                {/* ✅ Offer to scan again for check-out if just checked in */}
                {attendType === "check-in" && !hasCheckedOut && (
                  <button
                    onClick={() => {
                      setAttendType("check-out");
                      setScanState("idle");
                      setResultMsg("");
                    }}
                    className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    Also mark check-out?
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                >
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
                <p className="text-sm text-destructive text-center">
                  {resultMsg}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setScanState("idle");
                      setResultMsg("");
                    }}
                    className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={handleClose}
                    className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
                  >
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
