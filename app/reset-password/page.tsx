"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

function getPasswordError(password: string) {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Must be at least 8 characters.";
  return null;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);
  const [touchedConfirm, setTouchedConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const passwordError = touchedPassword ? getPasswordError(password) : null;
  const confirmError = touchedConfirm
    ? confirm && password !== confirm ? "Passwords do not match." : null
    : null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/");
      } else {
        setLoading(false);
      }
    });
  }, [supabase, router]);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setTouchedPassword(true);
    setTouchedConfirm(true);
    setError(null);

    if (getPasswordError(password) || (confirm && password !== confirm)) return;

    setIsSubmitting(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setTimeout(() => router.push("/"), 2500);
    }

    setIsSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111110] flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-[#E8834A] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#111110] flex items-center justify-center p-4">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-[#E8834A]/[0.04]" />
        </div>
        <div className="relative w-full max-w-[360px] text-center">
          <div className="mb-6 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8834A]/10">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E8834A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
          <h1 className="text-xl font-semibold text-[#F0EDE6] tracking-tight">Password updated</h1>
          <p className="mt-2 text-sm text-[#8A8880]">Redirecting you to sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111110] flex items-center justify-center p-4">
      {/* Decorative shapes */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-[#E8834A]/[0.04]" />
        <div className="absolute -bottom-32 -left-32 w-72 h-72 rounded-full bg-[#F5C99A]/[0.04]" />
      </div>

      <div className="relative w-full max-w-[360px]">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8834A]">
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="8" width="14" height="10" rx="2" stroke="white" strokeWidth="1.5" />
              <path d="M6.5 8V5.5a3.5 3.5 0 0 1 7 0V8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="10" cy="13" r="1.2" fill="white" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-[#F0EDE6] tracking-tight">Set new password</h1>
            <p className="mt-1.5 text-sm text-[#8A8880]">
              Enter a new password for your account.
            </p>
          </div>
        </div>

        {/* Card */}
        <form onSubmit={handleReset} noValidate className="rounded-xl border border-[#282824] bg-[#181817] px-6 py-7">
          {error && (
            <div className="mb-4 rounded-xl border border-[#B4533B]/30 bg-[#B4533B]/10 px-4 py-3">
              <p className="text-sm text-[#D1A89E]">{error}</p>
            </div>
          )}

          {/* New password */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-[#9A9690]">
              New password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouchedPassword(true)}
                autoFocus
                className={`w-full rounded-xl border bg-[#1F1F1E] px-4 py-3 pr-11 text-sm text-[#F0EDE6] placeholder-[#52504D] outline-none transition-all duration-200 focus:ring-2 focus:ring-[#E8834A]/25 ${
                  passwordError ? "border-[#B4533B] focus:border-[#B4533B]" : "border-[#303030] focus:border-[#E8834A]"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#666460] hover:text-[#9A9690] transition-colors duration-150"
              >
                {showPassword ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {passwordError && (
              <p className="mt-1.5 text-xs text-[#D1A89E]">{passwordError}</p>
            )}
          </div>

          {/* Confirm password */}
          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-medium text-[#9A9690]">
              Confirm password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Repeat new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onBlur={() => setTouchedConfirm(true)}
              className={`w-full rounded-xl border bg-[#1F1F1E] px-4 py-3 text-sm text-[#F0EDE6] placeholder-[#52504D] outline-none transition-all duration-200 focus:ring-2 focus:ring-[#E8834A]/25 ${
                confirmError ? "border-[#B4533B] focus:border-[#B4533B]" : "border-[#303030] focus:border-[#E8834A]"
              }`}
            />
            {confirmError && (
              <p className="mt-1.5 text-xs text-[#D1A89E]">{confirmError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !password}
            className="mb-4 w-full rounded-xl bg-[#E8834A] py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#D4723E] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Updating..." : "Update password"}
          </button>

          {/* Security note */}
          <div className="flex items-start gap-2 rounded-xl border border-[#282824] bg-[#1F1F1E] px-3 py-2.5">
            <svg className="mt-0.5 shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#52504D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z" />
            </svg>
            <p className="text-xs text-[#52504D] leading-relaxed">
              Use a strong, unique password you don't use elsewhere.
            </p>
          </div>
        </form>

        {/* Back to sign in */}
        <div className="mt-4 text-center">
          <a
            href="/"
            className="text-xs text-[#52504D] hover:text-[#9A9690] transition-colors duration-150"
          >
            Back to sign in
          </a>
        </div>
      </div>
    </div>
  );
}