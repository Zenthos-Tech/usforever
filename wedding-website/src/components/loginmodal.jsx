import { useEffect, useMemo, useRef, useState } from "react";
import Colors from "../theme/colors";

import indiaFlag from "../assets/india-flag.svg";
import crossIcon from "../assets/close.svg";
import pencilIcon from "../assets/pencil.svg";
console.log("ENV:", import.meta.env.VITE_API_URL);
const OTP_LEN = 4;

// ✅ VITE ONLY (prevents "process is not defined" white screen)
const API_URL = (import.meta?.env?.VITE_API_URL || "").replace(/\/$/, ""); // remove trailing /

const LoginModal = ({ open, onClose, onSuccess }) => {
  const [step, setStep] = useState("phone"); // "phone" | "otp"
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(Array(OTP_LEN).fill(""));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const otpRefs = useRef([]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setStep("phone");
    setPhone("");
    setOtp(Array(OTP_LEN).fill(""));
    setLoading(false);
    setErr("");
  }, [open]);

  useEffect(() => {
    if (step !== "otp") return;
    setTimeout(() => otpRefs.current?.[0]?.focus?.(), 0);
  }, [step]);

  const cssVars = useMemo(
    () => ({
      "--pink": Colors.primaryPink,
    }),
    []
  );

  if (!open) return null;

  const clean10 = (val) => String(val || "").replace(/\D/g, "").slice(0, 10);

  const digits = clean10(phone);
  const displayPhone = digits ? `+91 ${digits}` : "+91";

  const safeClose = () => {
    if (loading) return;
    onClose?.();
  };

  const sendOtpApi = async (contact_no) => {
    if (!API_URL) throw new Error("Missing VITE_API_URL in .env. Restart npm run dev.");

    const res = await fetch(`${API_URL}/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_no }),
    });

    const raw = await res.text();
    let json = null;
    try {
      json = raw ? JSON.parse(raw) : null;
    } catch {
      json = { message: raw };
    }

    if (!res.ok) {
      throw new Error(json?.error?.message || json?.message || "Failed to send OTP");
    }

    return json;
  };

  const verifyOtpApi = async (contact_no, otpCode) => {
    if (!API_URL) throw new Error("Missing VITE_API_URL in .env. Restart npm run dev.");

    const res = await fetch(`${API_URL}/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_no, otp: otpCode }),
    });

    const raw = await res.text();
    let json = null;
    try {
      json = raw ? JSON.parse(raw) : null;
    } catch {
      json = { message: raw };
    }

    if (!res.ok) {
      throw new Error(json?.error?.message || json?.message || "Invalid OTP");
    }

    return json;
  };

  const submitPhone = async () => {
    setErr("");
    const d = clean10(phone);
    if (d.length !== 10) return;

    try {
      setLoading(true);

      // ✅ debug once (remove later)
      console.log("API_URL =", API_URL);

      await sendOtpApi(d);
      setStep("otp");
    } catch (e) {
      setErr(e?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setErr("");
    const d = clean10(phone);
    if (d.length !== 10) return;

    try {
      setLoading(true);
      await sendOtpApi(d);
      setOtp(Array(OTP_LEN).fill(""));
      setTimeout(() => otpRefs.current?.[0]?.focus?.(), 0);
    } catch (e) {
      setErr(e?.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  const setOtpAt = (index, value) => {
    const v = String(value || "").replace(/\D/g, "").slice(0, 1);
    setOtp((prev) => {
      const next = [...prev];
      next[index] = v;
      return next;
    });
    if (v && index < OTP_LEN - 1) otpRefs.current?.[index + 1]?.focus?.();
  };

  const onOtpKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        setOtpAt(index, "");
      } else if (index > 0) {
        otpRefs.current?.[index - 1]?.focus?.();
        setOtpAt(index - 1, "");
      }
    }
    if (e.key === "ArrowLeft" && index > 0) otpRefs.current?.[index - 1]?.focus?.();
    if (e.key === "ArrowRight" && index < OTP_LEN - 1) otpRefs.current?.[index + 1]?.focus?.();
    if (e.key === "Enter") submitOtp();
  };

  const onOtpPaste = (e) => {
    const txt = (e.clipboardData?.getData("text") || "").replace(/\D/g, "").slice(0, OTP_LEN);
    if (!txt) return;
    e.preventDefault();

    const arr = Array(OTP_LEN).fill("");
    for (let i = 0; i < txt.length; i++) arr[i] = txt[i];
    setOtp(arr);

    const last = Math.min(txt.length, OTP_LEN) - 1;
    setTimeout(() => otpRefs.current?.[Math.max(0, last)]?.focus?.(), 0);
  };

  const submitOtp = async () => {
    setErr("");
    const d = clean10(phone);
    const code = otp.join("");
    if (d.length !== 10) return;
    if (code.length !== OTP_LEN) return;

    try {
      setLoading(true);
      await verifyOtpApi(d, code);
      onSuccess?.();
    } catch (e) {
      setErr(e?.message || "Verification failed");
      setOtp(Array(OTP_LEN).fill(""));
      setTimeout(() => otpRefs.current?.[0]?.focus?.(), 0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="login-modal-overlay"
      style={{
        ...cssVars,
        background: "rgba(0,0,0,0.58)", // ✅ less transparent
      }}
      onClick={safeClose}
    >
      <div className="login-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="login-modal-close" onClick={safeClose} aria-label="Close" disabled={loading}>
          <img src={crossIcon} />
        </button>

        {step === "phone" ? (
          <>
            <div className="login-modal-title">LOGIN</div>

            <div className="login-modal-inputRow">
              <img src={indiaFlag} alt="India" className="login-modal-flag" />
              <div className="login-modal-code">+91</div>

              <input
                className="login-modal-input"
                placeholder="1234567890"
                value={phone}
                onChange={(e) => setPhone(clean10(e.target.value))}
                inputMode="numeric"
                maxLength={10}
                disabled={loading}
              />
            </div>

            {!!err && <div className="login-modal-error">{err}</div>}

            <button className="login-modal-btn" onClick={submitPhone} disabled={loading || clean10(phone).length !== 10}>
              {loading ? "SENDING..." : "SEND OTP"}
            </button>

            <div className="login-modal-foot">
              By continuing, you trust us to care for your
              <br />
              <b>memories and your data.</b>
            </div>
          </>
        ) : (
          <>
            <div className="login-modal-title">LOGIN</div>

            <div className="otp-row" onPaste={onOtpPaste}>
              {otp.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => (otpRefs.current[i] = el)}
                  className="otp-box"
                  value={d}
                  onChange={(e) => setOtpAt(i, e.target.value)}
                  onKeyDown={(e) => onOtpKeyDown(i, e)}
                  inputMode="numeric"
                  maxLength={1}
                  disabled={loading}
                />
              ))}
            </div>

            <div className="otp-phoneRow">
              <div className="otp-phoneText">{displayPhone}</div>

              <button
                type="button"
                className="otp-editBtn"
                aria-label="Edit number"
                disabled={loading}
                onClick={() => {
                  setStep("phone");
                  setOtp(Array(OTP_LEN).fill(""));
                  setErr("");
                }}
              >
                <img src={pencilIcon} alt="Edit" />
              </button>
            </div>

            <button type="button" className="otp-resend" onClick={resendOtp} disabled={loading}>
              {loading ? "PLEASE WAIT..." : "Resend OTP"}
            </button>

            {!!err && <div className="login-modal-error">{err}</div>}

            <button className="login-modal-btn" onClick={submitOtp} disabled={loading || otp.join("").length !== OTP_LEN}>
              {loading ? "VERIFYING..." : "CONFIRM"}
            </button>

            <div className="login-modal-foot">
              By continuing, you trust us to care for your
              <br />
              <b>memories and your data.</b>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginModal;
