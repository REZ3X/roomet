"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { FaGoogle, FaEye, FaEyeSlash } from "@/components/Icons";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    displayName: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      router.push("/auth/verify-notice");
    } catch (err: unknown) {
      setError((err as Error).message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg-base)]">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[340px]">
        <div className="text-center mb-7">
          <h1 className="text-[28px] font-semibold text-[var(--text-primary)] tracking-tight">
            Create an account
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-1.5">
            Join Roomet to start chatting
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
                Display Name
              </label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => update("displayName", e.target.value)}
                className="w-full input-base px-3 py-[9px] text-sm"
                placeholder="How others see you"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1">
                Username
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) =>
                  update(
                    "username",
                    e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                  )
                }
                required
                className="w-full input-base px-3 py-[9px] text-sm"
                placeholder="unique_username"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
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
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  required
                  minLength={6}
                  className="w-full input-base px-3 py-[9px] text-sm pr-9"
                  placeholder="Min. 6 characters"
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
              {loading ? "Creating account..." : "Continue"}
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
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-[var(--accent)] hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
