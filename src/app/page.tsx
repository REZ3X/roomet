"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import {
  FaGamepad,
  FaUsers,
  FaArrowRight,
  FaLock,
  FaTrophy,
  FaComments,
  FaStar,
  FaShieldAlt,
  FaBolt,
} from "@/components/Icons";

export default function Home() {
  const { user, loading } = useAuth();
  const isLoggedIn = !loading && !!user;

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {/* Nav */}
      <nav className="sticky top-0 z-30 bg-[var(--bg-base)]/80 backdrop-blur-md border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-11">
          <Link
            href="/"
            className="flex items-center gap-2 text-[15px] font-semibold text-[var(--text-primary)]"
          >
            <div className="w-6 h-6 rounded-md bg-[var(--accent)] flex items-center justify-center">
              <FaComments size={11} className="text-white" />
            </div>
            Roomet
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/leaderboard"
              className="hidden sm:inline-flex px-3 py-1.5 text-[13px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors"
            >
              Leaderboard
            </Link>
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="px-4 py-1.5 text-[13px] font-medium bg-[var(--accent)] text-white rounded-md hover:bg-[var(--accent-hover)] transition-colors flex items-center gap-1.5"
              >
                Go to Dashboard <FaArrowRight size={10} />
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="px-3 py-1.5 text-[13px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-1.5 text-[13px] font-medium bg-[var(--accent)] text-white rounded-md hover:bg-[var(--accent-hover)] transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
        {/* Hero */}
        <div className="text-center pt-16 sm:pt-24 pb-16 sm:pb-24">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-full text-[11px] text-[var(--text-muted)] mb-6 shadow-[var(--shadow-xs)]">
            <FaShieldAlt size={9} className="text-[var(--accent-green)]" />
            End-to-End Encrypted Conversations
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[var(--text-primary)] mb-5 leading-[1.1] tracking-tight">
            Where conversations
            <br />
            <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-coral)] bg-clip-text text-transparent">
              come alive
            </span>
          </h1>
          <p className="text-[15px] sm:text-base text-[var(--text-secondary)] max-w-lg mx-auto mb-8 leading-relaxed">
            Chat rooms with XP progression, achievements, and end-to-end
            encryption. A social space designed for real connection.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-6 py-2.5 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-all shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] flex items-center justify-center gap-2 text-[14px]"
              >
                Go to Dashboard <FaArrowRight size={12} />
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/register"
                  className="w-full sm:w-auto px-6 py-2.5 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-all shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] flex items-center justify-center gap-2 text-[14px]"
                >
                  Start chatting <FaArrowRight size={12} />
                </Link>
                <Link
                  href="/auth/login"
                  className="w-full sm:w-auto px-6 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] font-medium rounded-lg hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all shadow-[var(--shadow-xs)] text-[14px] text-center"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Visual divider */}
        <div className="flex items-center gap-4 mb-14 px-4">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-widest font-medium">
            Features
          </span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-16">
          {[
            {
              icon: <FaLock size={15} />,
              title: "Encrypted",
              desc: "RSA + AES end-to-end encryption on every message. Your data stays yours.",
              color: "var(--accent)",
            },
            {
              icon: <FaGamepad size={15} />,
              title: "Room Types",
              desc: "Chat, discuss, study, hang out — each with unique features and vibes.",
              color: "var(--accent-coral)",
            },
            {
              icon: <FaTrophy size={15} />,
              title: "Progression",
              desc: "Earn XP, level up, unlock achievements, and climb the leaderboard.",
              color: "var(--accent-amber)",
            },
            {
              icon: <FaUsers size={15} />,
              title: "Social",
              desc: "Follow friends, send invites, and build your community together.",
              color: "var(--accent-green)",
            },
          ].map((feat) => (
            <div
              key={feat.title}
              className="group bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 hover:bg-[var(--bg-hover)] hover:border-[var(--border-active)] transition-all shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)]"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-105"
                style={{
                  background: `color-mix(in srgb, ${feat.color} 12%, transparent)`,
                  color: feat.color,
                }}
              >
                {feat.icon}
              </div>
              <h3 className="text-[var(--text-primary)] font-semibold text-[14px] mb-1">
                {feat.title}
              </h3>
              <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">
                {feat.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Highlights banner */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 sm:p-8 mb-16 shadow-[var(--shadow-xs)]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 text-center">
            {[
              {
                icon: (
                  <FaBolt size={14} className="text-[var(--accent-amber)]" />
                ),
                label: "Real-time",
                sub: "Socket.io powered instant messaging",
              },
              {
                icon: (
                  <FaStar size={14} className="text-[var(--accent-coral)]" />
                ),
                label: "Achievements",
                sub: "20+ unlockable badges and milestones",
              },
              {
                icon: (
                  <FaShieldAlt
                    size={14}
                    className="text-[var(--accent-green)]"
                  />
                ),
                label: "Private",
                sub: "Password-protected & invite-only rooms",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-1.5"
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center mb-1">
                  {item.icon}
                </div>
                <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                  {item.label}
                </span>
                <span className="text-[11px] text-[var(--text-muted)] leading-snug">
                  {item.sub}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        {!isLoggedIn && (
          <div className="text-center pb-20">
            <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)] mb-3">
              Ready to join?
            </h2>
            <p className="text-[13px] text-[var(--text-muted)] mb-5">
              Create an account in seconds. No credit card needed.
            </p>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-all shadow-[var(--shadow-sm)] text-[14px]"
            >
              Get Started <FaArrowRight size={11} />
            </Link>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--bg-card)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
            <div className="w-5 h-5 rounded bg-[var(--accent)] flex items-center justify-center">
              <FaComments size={8} className="text-white" />
            </div>
            Roomet
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">
            Built with Next.js, Prisma & Socket.io
          </span>
        </div>
      </footer>
    </div>
  );
}
