import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
// In production, this MUST be a 32-character (256-bit) string in process.env.ENCRYPTION_KEY
const KEY = process.env.ENCRYPTION_KEY 
  ? Buffer.from(process.env.ENCRYPTION_KEY, "hex") 
  : Buffer.from("d0b5e4c2f1a3b4e5d6c7a8b9e0f1d2c3b4a5e6f7d8c9b0a1e2f3d4c5b6a7e8f9", "hex");

/**
 * Encrypts a string using AES-256-GCM.
 * Output format: iv:ciphertext:tag (all hex)
 */
export function encrypt(text: string | null | undefined): string | null {
  if (!text) return null;
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const tag = cipher.getAuthTag().toString("hex");
  
  return `${iv.toString("hex")}:${encrypted}:${tag}`;
}

/**
 * Decrypts a string using AES-256-GCM.
 * Input format: iv:ciphertext:tag (all hex)
 */
export function decrypt(encryptedText: string | null | undefined): string | null {
  if (!encryptedText) return null;
  
  try {
    const [ivHex, encrypted, tagHex] = encryptedText.split(":");
    if (!ivHex || !encrypted || !tagHex) return null;
    
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (err) {
    console.error("Decryption failed:", err);
    return null;
  }
}

/**
 * Masks a sensitive string, showing only the last 4 characters.
 */
export function maskSensitive(text: string | null | undefined): string {
  if (!text) return "";
  if (text.length <= 4) return "****";
  return `****${text.slice(-4)}`;
}
