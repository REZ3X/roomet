"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Suspense } from "react";

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokenFromCallback, user, loading } = useAuth();
  const [tokenSet, setTokenSet] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setTokenFromCallback(token);
      setTokenSet(true);
    } else {
      router.push("/auth/login?error=no_token");
    }
  }, [searchParams, setTokenFromCallback, router]);

  useEffect(() => {
    if (!tokenSet) return;
    if (!loading && user) {
      router.push("/dashboard");
    } else if (!loading && !user) {
      router.push("/auth/login?error=auth_failed");
    }
  }, [tokenSet, loading, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
      <div className="text-center">
        <div className="w-5 h-5 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[var(--text-muted)] text-[13px]">
          Signing you in...
        </p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
          <div className="w-5 h-5 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
