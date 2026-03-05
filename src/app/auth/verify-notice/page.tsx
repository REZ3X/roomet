"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { authAPI } from "@/lib/api-client";
import { FaEnvelope, FaRedo, FaSignOutAlt, FaCheck } from "@/components/Icons";
import ThemeToggle from "@/components/ThemeToggle";

export default function VerifyEmailPage() {
  const { user, token, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleResend = async () => {
    if (!token) return;
    setSending(true);
    setError("");
    try {
      await authAPI.resendVerification(token);
      setSent(true);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to resend");
    } finally {
      setSending(false);
    }
  };

  const handleCheckStatus = async () => {
    await refreshUser();
    if (user?.emailVerified) {
      router.push("/dashboard");
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg-base)]">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[400px] text-center">
        <div className="w-12 h-12 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center mx-auto mb-5">
          <FaEnvelope size={20} className="text-[var(--accent)]" />
        </div>

        <h1 className="text-[22px] font-semibold text-[var(--text-primary)] mb-2 tracking-tight">
          Verify your email
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mb-1">
          We sent a verification link to
        </p>
        <p className="text-[var(--text-primary)] font-medium text-sm mb-6">
          {user?.email || "your email address"}
        </p>

        <div className="bg-[var(--bg-elevated)] rounded-lg p-5 mb-4 text-left">
          <p className="text-[var(--text-secondary)] text-[13px] mb-4 leading-relaxed">
            Click the link in the email to verify your account. Check your spam
            folder if you don&apos;t see it.
          </p>

          {error && (
            <div className="mb-3 px-3 py-2 bg-[var(--accent-coral)]/8 border border-[var(--accent-coral)]/15 rounded-md text-[var(--accent-coral)] text-[13px]">
              {error}
            </div>
          )}

          {sent ? (
            <div className="mb-3 px-3 py-2 bg-[var(--accent-green)]/8 border border-[var(--accent-green)]/15 rounded-md text-[var(--accent-green)] text-[13px] flex items-center justify-center gap-2">
              <FaCheck size={11} /> Email sent! Check your inbox.
            </div>
          ) : null}

          <div className="space-y-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={sending || sent}
              className="w-full py-[9px] btn-primary text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FaRedo size={11} />
              {sending
                ? "Sending..."
                : sent
                  ? "Email Sent"
                  : "Resend verification email"}
            </button>

            <button
              type="button"
              onClick={handleCheckStatus}
              className="w-full py-[9px] bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-primary)] text-sm rounded-md hover:bg-[var(--bg-hover)] transition-colors"
            >
              I&apos;ve verified — continue
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="text-[13px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors flex items-center gap-1.5 mx-auto"
        >
          <FaSignOutAlt size={11} /> Sign out
        </button>
      </div>
    </div>
  );
}
