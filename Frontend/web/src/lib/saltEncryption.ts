// Utility for encrypting/decrypting registration salt with user password
// Uses PBKDF2 + AES-GCM. Output is a base64-encoded JSON bundle.

function toBase64(buf: ArrayBuffer | Uint8Array): string {
  const uint8Array = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...uint8Array));
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new Uint8Array(arr.buffer.slice(0));
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export interface EncryptedSaltBundle {
  kdfSalt: string; // base64
  iv: string; // base64
  ct: string; // base64 ciphertext
  version: number; // for future migration
}

export async function encryptSaltHex(saltHex: string, password: string): Promise<string> {
  if (!saltHex || !password) throw new Error("saltHex & password required");
  const kdfSalt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, kdfSalt);
  const plaintext = new TextEncoder().encode(saltHex);
  const ctBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  const bundle: EncryptedSaltBundle = {
    kdfSalt: toBase64(kdfSalt),
    iv: toBase64(iv),
    ct: toBase64(ctBuf),
    version: 1,
  };
  return btoa(JSON.stringify(bundle));
}

export async function decryptSaltHex(encrypted: string, password: string): Promise<string> {
  if (!encrypted || !password) throw new Error("encrypted & password required");
  let raw: EncryptedSaltBundle;
  try {
    raw = JSON.parse(atob(encrypted));
  } catch (e) {
    throw new Error("Invalid encrypted salt format");
  }
  const kdfSalt = fromBase64(raw.kdfSalt);
  const iv = fromBase64(raw.iv);
  const ct = fromBase64(raw.ct);
  const key = await deriveKey(password, kdfSalt);
  try {
    const ptBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return new TextDecoder().decode(ptBuf);
  } catch (e) {
    throw new Error("Failed to decrypt salt (wrong password?)");
  }
}
