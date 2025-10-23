/* secureCrypto.ts
 *
 * Updated to implement the "mnemonic-first" wallet-based flow for Spectra Chat.
 * Key decisions implemented here:
 *  - Mnemonic is generated first (BIP-39 24 words) and deterministically derives the salt.
 *  - Encrypted envelopes store *only* the salt (NOT the wallet secret). This keeps the
 *    wallet secret strictly tied to the user's connected wallet and never persisted.
 *  - Exports helper for turning a wallet address into the secret (hashed, hex-encoded).
 *
 * Backwards-incompatible API changes (see migration notes in README):
 *  - decryptEnvelope(...) returns { salt } (no secret). Code that previously relied on
 *    decryptData(...).secret must instead obtain the secret from the connected wallet.
 *
 * Uses WebCrypto (browser / Node 18+) and bip39.
 */

import * as bip39 from "bip39";
import { sha3_256 } from "js-sha3";
import { toBufferSource } from "../utils/helper";
import { logger } from "./logger";


/* ---------- Types ---------- */
type Bytes = Uint8Array;

export interface EnvelopeSaltOnly {
  v: number;
  kdf: { name: "pbkdf2"; salt: string; iter: number; hash: string };
  hkdfInfo: string; // base64url
  iv: string; // base64url
  aad?: string; // base64url
  ct: string; // base64url
  meta: { envelopeSha3: string; mnemonicSha3?: string };
}

export interface DecryptedEnvelope {
  salt: string; // hex (lowercase, no 0x)
}

/* ---------- Constants ---------- */
const VERSION = 1;
const ENC_ALG = "AES-GCM";
const PBKDF2_HASH = "SHA-256";
const HKDF_HASH = "SHA-256";

export const DEFAULT_PBKDF2_ITER = 310_000;
export const SALT_BYTES = 32;
export const IV_BYTES = 12;

const HKDF_INFO_ENC = "app:enc:v1";
const HKDF_INFO_MNEMONIC = "app:mnemonic:v1"; // used to derive salt from mnemonic

/* ---------- Encoding helpers ---------- */
function utf8ToBytes(s: string): Bytes {
  return new TextEncoder().encode(s);
}
function bytesToUtf8(b: Bytes): string {
  return new TextDecoder().decode(b);
}
function b64urlEncode(bytes: Bytes): string {
  const b64 = typeof Buffer !== "undefined" ? Buffer.from(bytes).toString("base64") : btoa(String.fromCharCode(...Array.from(bytes)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): Bytes {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const full = b64 + pad;
  if (typeof Buffer !== "undefined") return Uint8Array.from(Buffer.from(full, "base64"));
  const bin = atob(full);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
function randomBytes(len: number): Bytes {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return arr;
}
function toHex(u: Uint8Array): string {
  return Array.from(u).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ---------- Constant-time comparison ---------- */
function equalConstTime(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ---------- KDF / key derivation ---------- */
async function deriveRootKeyPBKDF2(password: string, salt: Bytes, iterations = DEFAULT_PBKDF2_ITER): Promise<CryptoKey> {
  const pwBytes = utf8ToBytes(password);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    toBufferSource(pwBytes),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  // derive 256 bits
  const derivedBits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: toBufferSource(salt), iterations, hash: PBKDF2_HASH }, baseKey, 256);

  return crypto.subtle.importKey("raw", toBufferSource(new Uint8Array(derivedBits)), { name: "HKDF" }, false, ["deriveKey", "deriveBits"]);
}

async function deriveAesGcmKey(rootKey: CryptoKey, info: Bytes): Promise<CryptoKey> {
  const hkdfSalt = new Uint8Array(0);
  return crypto.subtle.deriveKey({ name: "HKDF", hash: HKDF_HASH, salt: toBufferSource(hkdfSalt), info: toBufferSource(info) }, rootKey, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

/* ---------- Envelope: encrypt / decrypt (salt-only) ---------- */
/**
 * Create an encrypted envelope that stores only the salt (hex string). Returns JSON string.
 * This is the recommended API for the "mnemonic-first" flow: the wallet secret is NOT stored.
 */
export async function encryptEnvelope(saltHex: string, password: string, opts?: { iter?: number; hkdfInfo?: string; aad?: string }): Promise<string> {
  if (typeof saltHex !== "string") throw new TypeError("salt must be a hex string");
  if (!password) throw new Error("password required");

  // Normalize payload: only salt
  const payload = JSON.stringify({ salt: saltHex });
  const saltBytes = randomBytes(SALT_BYTES); // PBKDF2 salt (envelope-level)
  const iv = randomBytes(IV_BYTES);
  const iter = opts?.iter ?? DEFAULT_PBKDF2_ITER;
  const hkdfInfoStr = opts?.hkdfInfo ?? HKDF_INFO_ENC;
  const aadBytes = opts?.aad ? utf8ToBytes(opts.aad) : undefined;

  const rootKey = await deriveRootKeyPBKDF2(password, saltBytes, iter);
  const aesKey = await deriveAesGcmKey(rootKey, utf8ToBytes(hkdfInfoStr));

  const alg: AesGcmParams = { name: ENC_ALG, iv: toBufferSource(iv) };
  if (aadBytes) alg.additionalData = toBufferSource(aadBytes);

  const ctBuf = await crypto.subtle.encrypt(
    alg,
    aesKey,
    toBufferSource(utf8ToBytes(payload))
  );
  logger.info("[secureCrypto] encryptEnvelope", {
    saltPreview: saltHex.slice(0, 6) + "...",
    iter,
    aad: !!aadBytes,
    ivHex: toHex(iv).slice(0, 8) + "..."
  });



  const envelope: EnvelopeSaltOnly = {
    v: VERSION,
    kdf: { name: "pbkdf2", salt: b64urlEncode(saltBytes), iter, hash: PBKDF2_HASH },
    hkdfInfo: b64urlEncode(utf8ToBytes(hkdfInfoStr)),
    iv: b64urlEncode(iv),
    aad: aadBytes ? b64urlEncode(aadBytes) : undefined,
    ct: b64urlEncode(new Uint8Array(ctBuf)),
    meta: { envelopeSha3: "" },
  };

  const fingerprint = sha3_256(JSON.stringify({ ...envelope, meta: undefined }));
  envelope.meta.envelopeSha3 = fingerprint;

  return JSON.stringify(envelope);
}

/**
 * Decrypt an encrypted envelope (created by encryptEnvelope) and return { salt }.
 */
export async function decryptEnvelope(envelopeStr: string, password: string): Promise<DecryptedEnvelope> {
  if (!password) throw new Error("password required");

  let env: EnvelopeSaltOnly;
  try {
    env = JSON.parse(envelopeStr) as EnvelopeSaltOnly;
  } catch {
    throw new Error("ERR_CORRUPT_BLOB");
  }

  if (!env || env.v !== VERSION || env.kdf?.name !== "pbkdf2") {
    throw new Error("ERR_UNSUPPORTED_VERSION");
  }

  const computed = sha3_256(JSON.stringify({ ...env, meta: undefined }));
  if (!env.meta || !equalConstTime(computed, env.meta.envelopeSha3)) {
    throw new Error("ERR_TAMPERED_OR_CORRUPT");
  }

  try {
    const saltBytes = b64urlDecode(env.kdf.salt);
    const hkdfInfo = b64urlDecode(env.hkdfInfo);
    const iv = b64urlDecode(env.iv);
    const aad = env.aad ? b64urlDecode(env.aad) : undefined;
    const ct = b64urlDecode(env.ct);

    const rootKey = await deriveRootKeyPBKDF2(password, saltBytes, env.kdf.iter);
    const aesKey = await deriveAesGcmKey(rootKey, hkdfInfo);

    const alg: AesGcmParams = { name: ENC_ALG, iv: toBufferSource(iv) };
    if (aad) alg.additionalData = toBufferSource(aad);
      
    const plainBuf = await crypto.subtle.decrypt(
      alg,
      aesKey,
      toBufferSource(ct)
    );
    logger.info("[secureCrypto] decryptEnvelope", {
      ivLen: iv.length,
      aad: !!aad,
      ctLen: ct.length
    });


    const parsed = JSON.parse(bytesToUtf8(new Uint8Array(plainBuf)));
    if (!parsed || typeof parsed.salt !== "string") throw new Error("ERR_MALFORMED_PLAINTEXT");

    return { salt: parsed.salt };
  } catch {
    throw new Error("ERR_BAD_PASSWORD_OR_CORRUPT");
  }
}

/* ---------- Mnemonic helpers (BIP-39) ---------- */

/** Generate a 24-word BIP-39 mnemonic (256 bits entropy). */
export function generateRecoveryPhrase(): string {
  return bip39.generateMnemonic(256);
}

/**
 * Deterministically derive salt (16 bytes) from mnemonic (and optional passphrase).
 * Returns lowercase hex (no 0x). This function *only* derives the salt — the wallet
 * secret must still be obtained from the connected wallet.
 */
export async function recoverSaltFromMnemonic(phrase: string, passphrase = ""): Promise<string> {
  if (!bip39.validateMnemonic(phrase)) throw new Error("ERR_INVALID_MNEMONIC");

  const seedBuf = await bip39.mnemonicToSeed(phrase, passphrase);
  const seedBytes = new Uint8Array(seedBuf);

  const seedKey = await crypto.subtle.importKey("raw", toBufferSource(seedBytes), { name: "HKDF" }, false, ["deriveBits"]);

  // Derive 16 bytes (128 bits) salt
  const derivedBits = await crypto.subtle.deriveBits({ name: "HKDF", hash: HKDF_HASH, salt: toBufferSource(new Uint8Array(0)), info: toBufferSource(utf8ToBytes(HKDF_INFO_MNEMONIC)) }, seedKey, 128);
  const derived = new Uint8Array(derivedBits);
  return toHex(derived);
}

/* ---------- Wallet secret helper ---------- */
/**
 * Turn a wallet address (e.g. 0xAbc...) into the secret hex string used by circuits.
 * Normalizes address to lowercase, removes 0x, and returns sha3_256(addr) as 32-byte hex.
 * Use this in the frontend after the user connects MetaMask. The secret is not stored.
 */
export function walletSecretFromAddress(address: string): string {
  if (!address || typeof address !== "string") throw new TypeError("address required");
  const canonical = address.trim().toLowerCase();
  const no0x = canonical.startsWith("0x") ? canonical.slice(2) : canonical;
  const h = sha3_256(no0x);
  // sha3_256 returns 32 bytes -> 64 hex chars
  return h;
}

/* ---------- Exports (facade) ---------- */
const SecureCrypto = {
  encryptEnvelope,
  decryptEnvelope,
  generateRecoveryPhrase,
  recoverSaltFromMnemonic,
  walletSecretFromAddress,
};

export default SecureCrypto;

