"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { FaCheck } from "@/components/Icons";
import ThemeToggle from "@/components/ThemeToggle";

function VerifiedInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithToken } = useAuth();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      loginWithToken(token);
    }
  }, [searchParams, loginWithToken]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/dashboard");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg-base)]">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[400px] text-center">
        <div className="w-12 h-12 rounded-lg bg-[var(--accent-green)]/10 flex items-center justify-center mx-auto mb-4">
          <FaCheck size={20} className="text-[var(--accent-green)]" />
        </div>
        <h1 className="text-[22px] font-semibold text-[var(--text-primary)] mb-2 tracking-tight">
          Email verified!
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mb-6">
          Your account is now fully activated. Redirecting to dashboard in{" "}
          <span className="font-semibold text-[var(--accent)]">
            {countdown}s
          </span>
          ...
        </p>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-2 px-5 py-[9px] btn-primary text-sm font-medium"
        >
          Go to Dashboard Now
        </button>
      </div>
    </div>
  );
}

export default function VerifiedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
          <div className="w-5 h-5 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VerifiedInner />
    </Suspense>
  );
}
