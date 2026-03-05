"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { FaGoogle, FaEye, FaEyeSlash } from "@/components/Icons";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError((err as Error).message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg-base)]">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[340px]">
        <div className="text-center mb-7">
          <h1 className="text-[28px] font-semibold text-[var(--text-primary)] tracking-tight">
            Log in to Roomet
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-1.5">
            Welcome back
          </p>
        </div>

        <div>
          {error && (
            <div className="mb-4 px-3 py-2.5 bg-[var(--accent-coral)]/8 border border-[var(--accent-coral)]/15 rounded-md text-[var(--accent-coral)] text-[13px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full input-base px-3 py-[9px] text-sm"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full input-base px-3 py-[9px] text-sm pr-9"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  {showPassword ? (
                    <FaEyeSlash size={14} />
                  ) : (
                    <FaEye size={14} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-[9px] btn-primary text-sm disabled:opacity-50 mt-1"
            >
              {loading ? "Signing in..." : "Continue"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-[var(--text-muted)]">or</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <a
            href="/api/auth/google"
            className="flex items-center justify-center gap-2 w-full py-[9px] bg-[var(--bg-base)] border border-[var(--border)] rounded-md text-[var(--text-primary)] text-sm hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <FaGoogle size={14} className="text-[var(--text-secondary)]" />
            Continue with Google
          </a>

          <p className="text-center text-[13px] text-[var(--text-muted)] mt-6">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/register"
              className="text-[var(--accent)] hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
