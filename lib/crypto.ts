import CryptoJS from "crypto-js";

// SHA-256 hashing using Web Crypto API
// Simple, beginner-friendly, browser-native

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(
  enteredPassword: string,
  storedHash: string
): Promise<boolean> {
  const enteredHash = await hashPassword(enteredPassword);
  return enteredHash === storedHash;
}

// AES-256 encryption (portfolio/demo grade)
// Master password is used as the encryption key
// Encrypted strings look like: U2FsdGVkX1...

export function encryptPassword(plaintext: string, key: string): string {
  return CryptoJS.AES.encrypt(plaintext, key).toString();
}

export function decryptPassword(ciphertext: string, key: string): string | null {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    // AES returns empty string on bad key — treat as failure
    if (!decrypted) return null;
    return decrypted;
  } catch {
    return null;
  }
}

// Decrypt all credentials in a list
export function decryptAllCredentials<T extends { password: string }>(
  credentials: T[],
  key: string
): Array<T & { password: string }> {
  return credentials.map((cred) => {
    const decrypted = decryptPassword(cred.password, key);
    return { ...cred, password: decrypted ?? "" };
  });
}

// Check if a ciphertext looks encrypted (starts with AES prefix)
export function isEncrypted(ciphertext: string): boolean {
  return ciphertext.startsWith("U2FsdGVkX1");
}