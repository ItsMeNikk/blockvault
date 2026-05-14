"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { hashPassword, verifyPassword, encryptPassword, decryptPassword } from "@/lib/crypto";

// ── Types ───────────────────────────────────────────────────────────────────

type Credential = {
  id: string;
  website: string;
  username: string;
  password: string;
  notes: string | null;
  created_at: string;
};

type VaultSettings = {
  master_password_hash: string;
};

// ── Utilities ────────────────────────────────────────────────────────────────

function generatePassword(length = 20): string {
  const lowers = "abcdefghijklmnopqrstuvwxyz";
  const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const symbols = "!@#$%^&*";
  const all = lowers + uppers + digits + symbols;
  let password = "";
  password += lowers[Math.floor(Math.random() * lowers.length)];
  password += uppers[Math.floor(Math.random() * uppers.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  return password.split("").sort(() => Math.random() - 0.5).join("");
}

// ── Lock Screen ────────────────────────────────────────────────────────────

function LockScreen({
  supabase,
  onUnlock,
}: {
  supabase: ReturnType<typeof createClient>;
  onUnlock: (masterPassword: string) => void;
}) {
  const [mode, setMode] = useState<"loading" | "setup" | "unlock">("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Check if user already has a master password set
  useEffect(() => {
    async function checkSettings() {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return;

      const { data } = await supabase
        .from("vault_settings")
        .select("master_password_hash")
        .eq("user_id", userId)
        .single();

      setMode(data ? "unlock" : "setup");
    }
    checkSettings();
  }, [supabase]);

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Master password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) { setSubmitting(false); return; }

    const hash = await hashPassword(password);
    const { error: saveError } = await supabase.from("vault_settings").insert({
      user_id: userId,
      master_password_hash: hash,
    });

    if (saveError) {
      setError("Failed to save. Please try again.");
    } else {
      onUnlock(password);
    }
    setSubmitting(false);
  }

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) { setSubmitting(false); return; }

    const { data: settings } = await supabase
      .from("vault_settings")
      .select("master_password_hash")
      .eq("user_id", userId)
      .single() as { data: VaultSettings | null };

    if (!settings) {
      setMode("setup");
      setSubmitting(false);
      return;
    }

    const isValid = await verifyPassword(password, settings.master_password_hash);
    if (isValid) {
      onUnlock(password);
    } else {
      setError("Incorrect master password. Please try again.");
    }
    setSubmitting(false);
  }

  if (mode === "loading") {
    return (
      <div className="min-h-screen bg-[#111110] flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-[#E8834A] border-t-transparent animate-spin" />
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
            <h1 className="text-xl font-semibold text-[#F0EDE6] tracking-tight">
              {mode === "setup" ? "Create Master Password" : "Unlock Vault"}
            </h1>
            <p className="mt-1.5 text-sm text-[#8A8880]">
              {mode === "setup"
                ? "Set a separate password to protect your vault."
                : "Enter your master password to access your vault."}
            </p>
          </div>
        </div>

        {/* Card */}
        <form
          onSubmit={mode === "setup" ? handleSetup : handleUnlock}
          noValidate
          className="rounded-xl border border-[#282824] bg-[#181817] px-6 py-7"
        >
          {error && (
            <div className="mb-4 rounded-xl border border-[#B4533B]/30 bg-[#B4533B]/10 px-4 py-3">
              <p className="text-sm text-[#D1A89E]">{error}</p>
            </div>
          )}

          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-medium text-[#9A9690]">
              Master Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="w-full rounded-xl border border-[#303030] bg-[#1F1F1E] px-4 py-3 pr-11 text-sm text-[#F0EDE6] placeholder-[#52504D] outline-none transition-all duration-200 focus:border-[#E8834A] focus:ring-2 focus:ring-[#E8834A]/25"
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
          </div>

          {mode === "setup" && (
            <div className="mb-6">
              <label className="mb-1.5 block text-sm font-medium text-[#9A9690]">
                Confirm Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-xl border border-[#303030] bg-[#1F1F1E] px-4 py-3 text-sm text-[#F0EDE6] placeholder-[#52504D] outline-none transition-all duration-200 focus:border-[#E8834A] focus:ring-2 focus:ring-[#E8834A]/25"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !password}
            className="mb-4 w-full rounded-xl bg-[#E8834A] py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#D4723E] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting
              ? "Please wait..."
              : mode === "setup"
                ? "Create Master Password"
                : "Unlock Vault"}
          </button>

          {/* Security note */}
          <div className="flex items-start gap-2 rounded-xl border border-[#282824] bg-[#1F1F1E] px-3 py-2.5">
            <svg className="mt-0.5 shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#52504D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z" />
            </svg>
            <p className="text-xs text-[#52504D] leading-relaxed">
              {mode === "setup"
                ? "Your master password is hashed with SHA-256 and stored securely. It cannot be recovered if forgotten."
                : "Your vault is protected with your master password. Supabase auth handles identity — this password unlocks your vault."}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────

function ConfirmDialog({
  title, message, confirmLabel, onConfirm, onCancel, danger,
}: {
  title: string; message: string; confirmLabel: string;
  onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl border border-[#282824] bg-[#181817] shadow-2xl shadow-black/50">
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <h2 className="text-base sm:text-lg font-semibold text-[#F0EDE6] tracking-tight">{title}</h2>
          <p className="mt-2 text-xs sm:text-sm text-[#8A8880]">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-2.5 border-t border-[#282824] px-5 py-3.5 sm:px-6 sm:py-4">
          <button onClick={onCancel} className="rounded-lg border border-[#282824] px-4 py-2 text-xs sm:text-sm font-medium text-[#9A9690] hover:bg-[#282824] transition-colors duration-150">
            Cancel
          </button>
          <button onClick={onConfirm} className={`rounded-lg px-5 py-2 text-xs sm:text-sm font-medium transition-colors duration-150 ${danger ? "bg-[#B4533B] text-white hover:bg-[#9A4433]" : "bg-[#E8834A] text-white hover:bg-[#D4723E]"}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Credential Modal ───────────────────────────────────────────────────

function CredentialModal({
  initial, onSave, onClose, saving, title,
}: {
  initial?: Credential;
  onSave: (website: string, username: string, password: string, notes: string) => Promise<void>;
  onClose: () => void; saving: boolean; title: string;
}) {
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [username, setUsername] = useState(initial?.username ?? "");
  const [password, setPassword] = useState(initial?.password ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSave() {
    if (!website.trim() || !username.trim() || !password.trim()) return;
    await onSave(website.trim(), username.trim(), password.trim(), notes.trim());
    onClose();
  }

  function handleGenerate() {
    setPassword(generatePassword(20));
    setShowPassword(true);
  }

  const isValid = website.trim() && username.trim() && password.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-h-[90vh] sm:max-h-none overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[#282824] bg-[#181817] shadow-2xl shadow-black/50 sm:max-w-md">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#282824] bg-[#181817] px-5 py-4 sm:px-6 sm:py-5">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-[#F0EDE6] tracking-tight">{title}</h2>
            <p className="mt-0.5 text-xs sm:text-sm text-[#8A8880] hidden sm:block">Securely store login information.</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#52504D] hover:bg-[#282824] hover:text-[#9A9690] transition-colors duration-150">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:gap-4 px-5 py-5 sm:px-6 sm:py-6">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#6A6864]">Website / App Name</label>
            <input type="text" placeholder="GitHub" value={website} onChange={(e) => setWebsite(e.target.value)} className="w-full rounded-lg border border-[#282824] bg-[#111110] px-3.5 py-2.5 text-sm text-[#F0EDE6] placeholder-[#52504D] outline-none transition-colors duration-150 focus:border-[#E8834A]" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#6A6864]">Username or Email</label>
            <input type="text" placeholder="alex@studio.com" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-lg border border-[#282824] bg-[#111110] px-3.5 py-2.5 text-sm text-[#F0EDE6] placeholder-[#52504D] outline-none transition-colors duration-150 focus:border-[#E8834A]" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#6A6864]">Password</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-[#282824] bg-[#111110] px-3.5 py-2.5 pr-10 text-sm text-[#F0EDE6] placeholder-[#52504D] outline-none transition-colors duration-150 focus:border-[#E8834A] font-mono tracking-wide" />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52504D] hover:text-[#9A9690] transition-colors duration-150">
                  {showPassword ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
              <button type="button" onClick={handleGenerate} className="shrink-0 rounded-lg border border-[#282824] bg-[#111110] px-3 py-2 text-xs font-medium text-[#9A9690] hover:border-[#E8834A] hover:text-[#E8834A] transition-colors duration-150 whitespace-nowrap">Generate</button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#6A6864]">Notes (optional)</label>
            <textarea placeholder="Extra info..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full resize-none rounded-lg border border-[#282824] bg-[#111110] px-3.5 py-2.5 text-sm text-[#F0EDE6] placeholder-[#52504D] outline-none transition-colors duration-150 focus:border-[#E8834A]" />
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2.5 border-t border-[#282824] bg-[#181817] px-5 py-3.5 sm:px-6 sm:py-4">
          <button onClick={onClose} className="rounded-lg border border-[#282824] px-4 py-2 text-xs sm:text-sm font-medium text-[#9A9690] hover:bg-[#282824] transition-colors duration-150">Cancel</button>
          <button onClick={handleSave} disabled={!isValid || saving} className="rounded-lg bg-[#E8834A] px-5 py-2 text-xs sm:text-sm font-medium text-white hover:bg-[#D4723E] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150">{saving ? "Saving..." : "Save Credential"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Credential Row ─────────────────────────────────────────────────────

function CredentialRow({
  cred, isLast, onCopy, onDelete, onEdit,
}: {
  cred: Credential; isLast: boolean;
  onCopy: (text: string) => void;
  onDelete: (cred: Credential) => void;
  onEdit: (cred: Credential) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopy(text: string) {
    onCopy(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-[#1F1F1E] transition-colors duration-100 ${!isLast ? "border-b border-[#282824]/50" : ""}`}>
      <div className="flex items-center gap-2 min-w-0 flex-1 sm:w-auto sm:flex-[2]">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#282824] text-xs font-semibold text-[#9A9690]">{cred.website[0]}</div>
        <p className="text-sm font-medium text-[#C0BDB8] truncate">{cred.website}</p>
      </div>
      <div className="w-full sm:flex-[2] min-w-0 pl-9 sm:pl-0">
        <p className="text-sm text-[#9A9690] truncate">{cred.username}</p>
      </div>
      <div className="pl-9 sm:pl-0 w-full sm:w-auto sm:flex-1 flex items-center gap-2">
        <span className="text-sm text-[#52504D] tracking-widest font-mono flex-1 sm:flex-none truncate sm:truncate-none">{revealed ? cred.password : "••••••••"}</span>
        <button onClick={() => setRevealed((v) => !v)} onTouchEnd={(e) => { e.preventDefault(); setRevealed((v) => !v); }} className="flex h-8 w-8 sm:h-7 sm:w-7 items-center justify-center rounded-md text-[#52504D] hover:bg-[#282824] hover:text-[#9A9690] active:bg-[#303030] transition-colors duration-100 touch-manipulation select-none" title={revealed ? "Hide" : "Reveal"}>
          {revealed ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
          )}
        </button>
      </div>
      <div className="flex items-center gap-0.5 pl-9 sm:pl-0 sm:ml-auto">
        <button onClick={() => handleCopy(cred.password)} className="flex h-8 w-8 sm:h-7 sm:w-7 items-center justify-center rounded-md text-[#52504D] hover:bg-[#282824] hover:text-[#9A9690] active:bg-[#303030] transition-colors duration-100 touch-manipulation select-none" title="Copy">
          {copied ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>}
        </button>
        <button onClick={() => onEdit(cred)} className="flex h-8 w-8 sm:h-7 sm:w-7 items-center justify-center rounded-md text-[#52504D] hover:bg-[#282824] hover:text-[#9A9690] active:bg-[#303030] transition-colors duration-100 touch-manipulation select-none" title="Edit">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
        </button>
        <button onClick={() => onDelete(cred)} className="flex h-8 w-8 sm:h-7 sm:w-7 items-center justify-center rounded-md text-[#52504D] hover:bg-[#B4533B]/20 hover:text-[#B4533B] active:bg-[#B4533B]/30 transition-colors duration-100 touch-manipulation select-none" title="Delete">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
        </button>
      </div>
    </div>
  );
}

// ── Mobile Sidebar ────────────────────────────────────────────────────

function MobileSidebar({
  userEmail, userInitial, onClose, onSignOut,
}: {
  userEmail: string; userInitial: string; onClose: () => void; onSignOut: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside className="relative w-64 h-full bg-[#181817] border-r border-[#282824] flex flex-col py-6 pl-4 pr-6 animate-slide-in">
        <div className="flex items-center gap-2 mb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8834A] shrink-0">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="3" y="8" width="14" height="10" rx="2" stroke="white" strokeWidth="1.5" /><path d="M6.5 8V5.5a3.5 3.5 0 0 1 7 0V8" stroke="white" strokeWidth="1.5" strokeLinecap="round" /><circle cx="10" cy="13" r="1.2" fill="white" /></svg>
          </div>
          <span className="text-sm font-bold text-[#F0EDE6] tracking-tight">BlockVault</span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {[
            { label: "Vault", active: true, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg> },
          ].map((item) => (
            <button key={item.label} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 text-left w-full ${item.active ? "bg-[#E8834A]/10 text-[#E8834A]" : "text-[#6A6864] hover:text-[#9A9690] hover:bg-[#1F1F1E]"}`}>
              <span className={item.active ? "text-[#E8834A]" : "text-[#5A5854]"}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-5 border-t border-[#282824]">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#303030] text-xs font-semibold text-[#9A9690]">{userInitial}</div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#9A9690] leading-tight truncate">{userEmail}</p>
              <p className="text-xs text-[#52504D]">Signed in</p>
            </div>
          </div>
          <button onClick={onSignOut} className="flex items-center gap-1.5 text-xs text-[#52504D] hover:text-[#9A9690] transition-colors duration-150">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            Sign out
          </button>
        </div>
      </aside>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<unknown>(null);
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [masterPassword, setMasterPassword] = useState<string | null>(null);
  const [decryptError, setDecryptError] = useState(false);
  const [search, setSearch] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editCred, setEditCred] = useState<Credential | undefined>(undefined);
  const [deleteCred, setDeleteCred] = useState<Credential | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  // Auth guard
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/");
      } else {
        setUser(data.session.user);
        setLoading(false);
      }
    });
  }, [supabase, router]);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) router.replace("/");
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase, router]);

  async function fetchCredentials(key: string) {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from("credentials")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      setError("Failed to load credentials.");
      return;
    }

    // Decrypt all credentials using the master password
    const decrypted = (data ?? []).map((cred: Credential) => {
      const password = decryptPassword(cred.password, key);
      if (password === null) {
        setDecryptError(true);
        return { ...cred, password: "" };
      }
      return { ...cred, password };
    });

    setCredentials(decrypted);
  }

  async function handleSaveCredential(website: string, username: string, password: string, notes: string) {
    if (!masterPassword) return;
    setSaving(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) { setSaving(false); return; }

    const encryptedPassword = encryptPassword(password, masterPassword);

    if (editCred) {
      const { error } = await supabase.from("credentials").update({ website, username, password: encryptedPassword, notes: notes || null }).eq("id", editCred.id);
      if (!error) setCredentials((prev) => prev.map((c) => c.id === editCred.id ? { ...c, website, username, password, notes: notes || null } : c));
    } else {
      const { error } = await supabase.from("credentials").insert({ user_id: userId, website, username, password: encryptedPassword, notes: notes || null });
      if (!error) fetchCredentials(masterPassword);
    }
    setSaving(false);
  }

  async function handleConfirmDelete() {
    if (!deleteCred) return;
    const { error } = await supabase.from("credentials").delete().eq("id", deleteCred.id);
    if (!error) setCredentials((prev) => prev.filter((c) => c.id !== deleteCred.id));
    setDeleteCred(undefined);
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/");
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
  }

  const userEmail = (user as { email?: string } | null)?.email ?? "";
  const userInitial = userEmail[0]?.toUpperCase() ?? "A";

  const filtered = search.trim()
    ? credentials.filter((c) => c.website.toLowerCase().includes(search.toLowerCase()) || c.username.toLowerCase().includes(search.toLowerCase()))
    : credentials;

  // ── Not authenticated yet ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#111110] flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-[#E8834A] border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── Vault locked — show lock screen ──
  if (!vaultUnlocked) {
    return (
      <LockScreen supabase={supabase} onUnlock={(masterPw) => { setMasterPassword(masterPw); fetchCredentials(masterPw); setVaultUnlocked(true); }} />
    );
  }

  // ── Vault unlocked — show dashboard ──

  return (
    <div className="min-h-screen bg-[#111110]">

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-52 flex-col border-r border-[#282824] bg-[#181817] px-4 py-6">
        <div className="flex items-center gap-2 px-2 mb-10">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8834A] shrink-0">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="3" y="8" width="14" height="10" rx="2" stroke="white" strokeWidth="1.5" /><path d="M6.5 8V5.5a3.5 3.5 0 0 1 7 0V8" stroke="white" strokeWidth="1.5" strokeLinecap="round" /><circle cx="10" cy="13" r="1.2" fill="white" /></svg>
          </div>
          <span className="text-sm font-bold text-[#F0EDE6] tracking-tight">BlockVault</span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {[
            { label: "Vault", active: true, icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg> },
          ].map((item) => (
            <button key={item.label} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 text-left w-full ${item.active ? "bg-[#E8834A]/10 text-[#E8834A]" : "text-[#6A6864] hover:text-[#9A9690] hover:bg-[#1F1F1E]"}`}>
              <span className={item.active ? "text-[#E8834A]" : "text-[#5A5854]"}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-5 border-t border-[#282824]">
          <div className="flex items-center gap-2.5 px-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#303030] text-xs font-semibold text-[#9A9690]">{userInitial}</div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#9A9690] leading-tight truncate">{userEmail}</p>
              <p className="text-xs text-[#52504D]">Signed in</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-h-screen lg:ml-52 flex flex-col">

        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#282824] bg-[#111110]/90 backdrop-blur-sm px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5">
          <button onClick={() => setShowSidebar(true)} className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg text-[#9A9690] hover:bg-[#282824] transition-colors duration-150">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
          <div className="relative flex-1 max-w-48 sm:max-w-64">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52504D]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <input type="search" placeholder="Search vault..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-[#282824] bg-[#181817] pl-8 sm:pl-9 pr-3 py-2 text-xs sm:text-sm text-[#F0EDE6] placeholder-[#52504D] outline-none transition-colors duration-150 focus:border-[#E8834A]" />
          </div>
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 rounded-lg bg-[#E8834A] px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white transition-colors duration-150 hover:bg-[#D4723E] shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              <span className="hidden sm:inline">Add</span>
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#282824] text-xs font-semibold text-[#9A9690] shrink-0">{userInitial}</div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 max-w-5xl">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-semibold text-[#F0EDE6] tracking-tight leading-tight">Your Vault</h1>
            <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm text-[#8A8880]">Securely stored credentials and sensitive information.</p>
          </div>

          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <div className="flex items-center gap-2 rounded-lg border border-[#282824] bg-[#181817] px-3 sm:px-4 py-1.5 sm:py-2">
              <span className="text-xs sm:text-sm text-[#6A6864]">{credentials.length} credentials</span>
            </div>
          </div>

          {/* Credential list */}
          <div className="rounded-xl border border-[#282824] overflow-hidden bg-[#181817]">
            <div className="hidden md:flex items-center gap-4 border-b border-[#282824] px-5 py-2.5">
              <span className="text-xs font-medium text-[#52504D] uppercase tracking-wider w-40">Name</span>
              <span className="text-xs font-medium text-[#52504D] uppercase tracking-wider flex-1">Username / Email</span>
              <span className="text-xs font-medium text-[#52504D] uppercase tracking-wider w-24 text-right">Password</span>
              <span className="w-24" />
            </div>
            {error && (
              <div className="flex items-center justify-center py-12"><p className="text-sm text-[#D1A89E]">{error}</p></div>
            )}
            {!error && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3A3A38" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                <p className="mt-3 text-sm text-[#52504D]">No credentials yet</p>
                <p className="mt-1 text-xs text-[#3A3A38]">Click Add to store your first credential</p>
              </div>
            )}
            {filtered.length > 0 && filtered.map((cred, i) => (
              <CredentialRow key={cred.id} cred={cred} isLast={i === filtered.length - 1} onCopy={handleCopy} onDelete={setDeleteCred} onEdit={setEditCred} />
            ))}
          </div>

          {/* Footer */}
          <div className="mt-4 sm:mt-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3A3A38" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z" /></svg>
              <p className="text-xs text-[#404040]">AES-256 encrypted &nbsp;&middot;&nbsp; All data stays on your device</p>
            </div>
            <button onClick={handleSignOut} disabled={signingOut} className="flex items-center gap-1.5 text-xs text-[#52504D] hover:text-[#9A9690] transition-colors duration-150 disabled:opacity-50">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </main>
      </div>

      {/* Mobile sidebar */}
      {showSidebar && <MobileSidebar userEmail={userEmail} userInitial={userInitial} onClose={() => setShowSidebar(false)} onSignOut={handleSignOut} />}

      {/* Modals */}
      {showAddModal && <CredentialModal onClose={() => setShowAddModal(false)} onSave={handleSaveCredential} saving={saving} title="Add Credential" />}
      {editCred && <CredentialModal initial={editCred} onClose={() => setEditCred(undefined)} onSave={handleSaveCredential} saving={saving} title={`Edit — ${editCred.website}`} />}
      {deleteCred && <ConfirmDialog title={`Delete "${deleteCred.website}"?`} message="This credential will be permanently removed from your vault. This action cannot be undone." confirmLabel="Delete" danger onConfirm={handleConfirmDelete} onCancel={() => setDeleteCred(undefined)} />}
    </div>
  );
}