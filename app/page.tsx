"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

function getEmailError(email: string) {
  const trimmed = email.trim();
  if (!trimmed) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Enter a valid email address.";
  return null;
}

function getPasswordError(password: string) {
  if (!password) return "Master password is required.";
  if (password.length < 8) return "Master password must be at least 8 characters.";
  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "forgot" | "reset_sent">("login");

  const emailError = touchedEmail ? getEmailError(email) : null;
  const passwordError = touchedPassword ? getPasswordError(password) : null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.push("/dashboard");
      }
    });
  }, [supabase, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) setAuthError(err);
  }, []);

  async function handleEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTouchedEmail(true);
    setTouchedPassword(true);
    setAuthError(null);
    if (getEmailError(email) || getPasswordError(password)) return;
    setIsSubmitting(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (!signInError) {
        router.push("/dashboard");
        router.refresh();
        setIsSubmitting(false);
        return;
      }

      const msg = signInError?.message?.toLowerCase() ?? "";

      if (msg.includes("invalid login credentials")) {
        // Two cases: wrong password, or Google-only account.
        // Always attempt sign-up as fallback — handles new accounts cleanly.
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (!signUpError) {
          router.push("/dashboard");
          router.refresh();
          setIsSubmitting(false);
          return;
        }
        const upMsg = signUpError.message.toLowerCase();
        // "Already registered" = Google-only account. Otherwise it's a wrong password.
        setAuthError(
          upMsg.includes("already") || upMsg.includes("registered") || upMsg.includes("duplicate")
            ? "No password found for this account. Try signing in with Google."
            : "Incorrect password."
        );
      } else if (msg.includes("not confirmed")) {
        setAuthError("Please verify your email address before signing in.");
      } else if (msg.includes("no user")) {
        setAuthError("No account found with this email. Create a free account below.");
        // Attempt sign-up so the user can register with one click
        await supabase.auth.signUp({ email, password });
      } else {
        setAuthError(signInError?.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      setAuthError("Connection failed. Please check your internet and try again.");
    }

    setIsSubmitting(false);
  }

  async function handleGoogleSignIn() {
    setAuthError(null);
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) {
        setAuthError(error.message);
        setIsSubmitting(false);
        return;
      }
      if (data?.url) window.location.href = data.url;
    } catch {
      setAuthError("Connection failed. Please try again.");
      setIsSubmitting(false);
    }
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouchedEmail(true);
    setAuthError(null);
    if (getEmailError(email)) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) setAuthError(error.message);
      else setAuthMode("reset_sent");
    } catch {
      setAuthMode("reset_sent");
    }

    setIsSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-[#111110] flex items-center justify-center p-4 sm:p-6 md:p-8">

      {/* Decorative shapes */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 sm:w-[500px] sm:h-[500px] md:w-[600px] md:h-[600px] rounded-full bg-[#E8834A]/[0.04]" />
        <div className="absolute -bottom-32 -left-32 w-72 h-72 sm:w-[400px] sm:h-[400px] md:w-[500px] md:h-[500px] rounded-full bg-[#F5C99A]/[0.04]" />
      </div>

      {/* Main container */}
      <div className="relative w-full max-w-[380px] sm:max-w-[420px]">

        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center px-2">
          <div className="mb-4 sm:mb-6 flex items-center justify-center gap-2 sm:gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-[#E8834A]">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="8" width="14" height="10" rx="2" stroke="white" strokeWidth="1.5" />
                <path d="M6.5 8V5.5a3.5 3.5 0 0 1 7 0V8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="10" cy="13" r="1.2" fill="white" />
              </svg>
            </div>
            <span className="text-lg sm:text-xl font-bold text-[#F0EDE6] tracking-tight">BlockVault</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#F0EDE6] leading-tight tracking-tight">
            Sign in to
            <br />
            your vault.
          </h1>
          <p className="mt-2 sm:mt-3 text-sm sm:text-base text-[#8A8880] leading-relaxed">
            Welcome back. Enter your credentials below.
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-xl sm:rounded-2xl border border-[#282824] bg-[#181817] px-5 py-6 sm:px-7 sm:py-7 md:px-8 md:py-8">

          {/* Auth error banner */}
          {authError && (
            <div className="mb-4 sm:mb-5 rounded-xl border border-[#B4533B]/30 bg-[#B4533B]/10 px-3 sm:px-4 py-2.5 sm:py-3">
              <p className="text-xs sm:text-sm text-[#D1A89E]">{authError}</p>
            </div>
          )}

          {/* ── LOGIN ── */}
          {authMode === "login" && (
            <form onSubmit={handleEmailSubmit} noValidate>
              <div className="mb-4 sm:mb-5">
                <label htmlFor="email" className="mb-1.5 sm:mb-2 block text-xs sm:text-sm font-medium text-[#9A9690]">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouchedEmail(true)}
                  autoComplete="email"
                  className={`w-full rounded-lg sm:rounded-xl border bg-[#1F1F1E] px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-[#F0EDE6] placeholder-[#52504D] outline-none transition-all duration-200 focus:ring-2 focus:ring-[#E8834A]/25 ${
                    emailError
                      ? "border-[#B4533B] focus:border-[#B4533B]"
                      : "border-[#303030] focus:border-[#E8834A]"
                  }`}
                />
                {emailError && (
                  <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-[#D1A89E]">{emailError}</p>
                )}
              </div>

              <div className="mb-4 sm:mb-5">
                <label htmlFor="password" className="mb-1.5 sm:mb-2 block text-xs sm:text-sm font-medium text-[#9A9690]">
                  Master password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouchedPassword(true)}
                    autoComplete="current-password"
                    className={`w-full rounded-lg sm:rounded-xl border bg-[#1F1F1E] px-3.5 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 text-sm text-[#F0EDE6] placeholder-[#52504D] outline-none transition-all duration-200 focus:ring-2 focus:ring-[#E8834A]/25 ${
                      passwordError
                        ? "border-[#B4533B] focus:border-[#B4533B]"
                        : "border-[#303030] focus:border-[#E8834A]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-[#666460] hover:text-[#9A9690] transition-colors duration-200"
                    aria-label={showPassword ? "Hide password" : "Show password"}
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
                  <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-[#D1A89E]">{passwordError}</p>
                )}
              </div>

              <div className="mb-5 sm:mb-6 flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 sm:h-5 sm:w-5 accent-[#E8834A]"
                  />
                  <span className="text-xs sm:text-sm text-[#6A6864]">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => { setAuthError(null); setAuthMode("forgot"); }}
                  className="text-xs sm:text-sm text-[#9A9690] hover:text-[#E8834A] transition-colors duration-150"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mb-4 sm:mb-5 w-full rounded-xl bg-[#E8834A] py-3 sm:py-3.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#D4723E] disabled:opacity-60"
              >
                {isSubmitting ? "Please wait..." : "Unlock Vault"}
              </button>

              <div className="mb-4 sm:mb-5 flex items-center gap-2 sm:gap-3">
                <div className="h-px flex-1 bg-[#2A2A28]" />
                <span className="text-xs text-[#52504D]">or continue with</span>
                <div className="h-px flex-1 bg-[#2A2A28]" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 sm:gap-3 rounded-xl border border-[#2E2E2C] py-3 sm:py-3.5 text-sm font-medium text-[#9A9690] transition-colors duration-150 hover:border-[#404040] hover:bg-[#1F1F1E] disabled:opacity-60"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>
            </form>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {authMode === "forgot" && (
            <form onSubmit={handleForgotSubmit} noValidate>
              <div className="mb-1 text-center">
                <div className="mb-3 sm:mb-4 mx-auto flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-[#E8834A]/10">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8834A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-[#F0EDE6] tracking-tight">Reset your password</h2>
                <p className="mt-2 text-xs sm:text-sm text-[#8A8880] leading-relaxed">
                  Enter your email and we'll send you a secure link to reset your master password.
                </p>
              </div>

              <div className="mt-5 sm:mt-6">
                <label htmlFor="reset-email" className="mb-1.5 sm:mb-2 block text-xs sm:text-sm font-medium text-[#9A9690]">
                  Email address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouchedEmail(true)}
                  autoComplete="email"
                  className={`w-full rounded-lg sm:rounded-xl border bg-[#1F1F1E] px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-[#F0EDE6] placeholder-[#52504D] outline-none transition-all duration-200 focus:ring-2 focus:ring-[#E8834A]/25 ${
                    emailError
                      ? "border-[#B4533B] focus:border-[#B4533B]"
                      : "border-[#303030] focus:border-[#E8834A]"
                  }`}
                />
                {emailError && (
                  <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-[#D1A89E]">{emailError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-4 sm:mt-5 w-full rounded-xl bg-[#E8834A] py-3 sm:py-3.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#D4723E] disabled:opacity-60"
              >
                {isSubmitting ? "Sending..." : "Send Reset Link"}
              </button>

              <button
                type="button"
                onClick={() => { setAuthError(null); setAuthMode("login"); setTouchedEmail(false); }}
                className="mt-2 sm:mt-3 w-full rounded-xl border border-[#282824] py-3 sm:py-3.5 text-sm font-medium text-[#9A9690] transition-colors duration-150 hover:bg-[#1F1F1E]"
              >
                Back to sign in
              </button>
            </form>
          )}

          {/* ── RESET SENT ── */}
          {authMode === "reset_sent" && (
            <div className="text-center">
              <div className="mb-3 sm:mb-4 mx-auto flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-[#E8834A]/10">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8834A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.82 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.72 1.16h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z" />
                </svg>
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-[#F0EDE6] tracking-tight">Check your inbox</h2>
              <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-[#8A8880] leading-relaxed">
                We sent a password reset link to{" "}
                <span className="text-[#F0EDE6] font-medium">{email}</span>.
                Click the link to set a new master password.
              </p>
              <div className="mt-4 sm:mt-5 rounded-xl border border-[#282824] bg-[#1F1F1E] px-3 sm:px-4 py-2.5 sm:py-3">
                <p className="text-xs sm:text-sm text-[#6A6864] leading-relaxed">
                  Didn't get it? Check your spam folder, or{" "}
                  <button
                    type="button"
                    onClick={() => { setAuthError(null); setAuthMode("forgot"); }}
                    className="text-[#E8834A] hover:underline"
                  >
                    try again
                  </button>
                  .
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setAuthError(null); setAuthMode("login"); setTouchedEmail(false); }}
                className="mt-3 sm:mt-4 w-full rounded-xl border border-[#282824] py-3 sm:py-3.5 text-sm font-medium text-[#9A9690] transition-colors duration-150 hover:bg-[#1F1F1E]"
              >
                Back to sign in
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 sm:mt-6 flex items-center justify-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3A3A38" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z" />
          </svg>
          <p className="text-xs text-[#52504D]">AES-256 encrypted &nbsp;&middot;&nbsp; Zero knowledge</p>
        </div>
      </div>
    </div>
  );
}