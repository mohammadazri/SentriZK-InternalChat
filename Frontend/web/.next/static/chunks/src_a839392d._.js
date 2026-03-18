(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/utils/helper.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// utils/helper.ts
__turbopack_context__.s([
    "toBufferSource",
    ()=>toBufferSource
]);
function toBufferSource(bytes) {
    // Force conversion into a true ArrayBuffer (not SharedArrayBuffer)
    return new Uint8Array(bytes).buffer;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/logger.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// src/lib/logger.ts
__turbopack_context__.s([
    "logger",
    ()=>logger
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
const isProd = ("TURBOPACK compile-time value", "development") === "production";
const logger = {
    info: function() {
        for(var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++){
            args[_key] = arguments[_key];
        }
        if ("TURBOPACK compile-time truthy", 1) {
            console.info("[INFO]", ...args);
        }
    },
    warn: function() {
        for(var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++){
            args[_key] = arguments[_key];
        }
        if ("TURBOPACK compile-time truthy", 1) {
            console.warn("[WARN]", ...args);
        }
    },
    error: function() {
        for(var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++){
            args[_key] = arguments[_key];
        }
        if ("TURBOPACK compile-time truthy", 1) {
            console.error("[ERROR]", ...args);
        }
    // In production, forward to a monitoring tool instead of console
    // Example: Sentry.captureException(args[0]);
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/secureCrypto.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

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
 */ __turbopack_context__.s([
    "DEFAULT_PBKDF2_ITER",
    ()=>DEFAULT_PBKDF2_ITER,
    "IV_BYTES",
    ()=>IV_BYTES,
    "SALT_BYTES",
    ()=>SALT_BYTES,
    "decryptEnvelope",
    ()=>decryptEnvelope,
    "default",
    ()=>__TURBOPACK__default__export__,
    "encryptEnvelope",
    ()=>encryptEnvelope,
    "generateRecoveryPhrase",
    ()=>generateRecoveryPhrase,
    "recoverSaltFromMnemonic",
    ()=>recoverSaltFromMnemonic,
    "walletSecretFromAddress",
    ()=>walletSecretFromAddress
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$buffer$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/compiled/buffer/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bip39$2f$src$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/bip39/src/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$sha3$2f$src$2f$sha3$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/js-sha3/src/sha3.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$helper$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/utils/helper.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$logger$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/logger.ts [app-client] (ecmascript)");
;
;
;
;
/* ---------- Constants ---------- */ const VERSION = 1;
const ENC_ALG = "AES-GCM";
const PBKDF2_HASH = "SHA-256";
const HKDF_HASH = "SHA-256";
const DEFAULT_PBKDF2_ITER = 310_000;
const SALT_BYTES = 32;
const IV_BYTES = 12;
const HKDF_INFO_ENC = "app:enc:v1";
const HKDF_INFO_MNEMONIC = "app:mnemonic:v1"; // used to derive salt from mnemonic
/* ---------- Encoding helpers ---------- */ function utf8ToBytes(s) {
    return new TextEncoder().encode(s);
}
function bytesToUtf8(b) {
    return new TextDecoder().decode(b);
}
function b64urlEncode(bytes) {
    const b64 = typeof __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$buffer$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Buffer"] !== "undefined" ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$buffer$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Buffer"].from(bytes).toString("base64") : btoa(String.fromCharCode(...Array.from(bytes)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s) {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - b64.length % 4);
    const full = b64 + pad;
    if (typeof __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$buffer$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Buffer"] !== "undefined") return Uint8Array.from(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$buffer$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Buffer"].from(full, "base64"));
    const bin = atob(full);
    return Uint8Array.from(bin, (c)=>c.charCodeAt(0));
}
function randomBytes(len) {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return arr;
}
function toHex(u) {
    return Array.from(u).map((b)=>b.toString(16).padStart(2, "0")).join("");
}
/* ---------- Constant-time comparison ---------- */ function equalConstTime(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for(let i = 0; i < a.length; i++)diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}
/* ---------- KDF / key derivation ---------- */ async function deriveRootKeyPBKDF2(password, salt) {
    let iterations = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : DEFAULT_PBKDF2_ITER;
    const pwBytes = utf8ToBytes(password);
    const baseKey = await crypto.subtle.importKey("raw", (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$helper$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toBufferSource"])(pwBytes), {
        name: "PBKDF2"
    }, false, [
        "deriveBits",
        "deriveKey"
    ]);
    // derive 256 bits
    const derivedBits = await crypto.subtle.deriveBits({
        name: "PBKDF2",
        salt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$helper$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toBufferSource"])(salt),
        iterations,
        hash: PBKDF2_HASH
    }, baseKey, 256);
    return crypto.subtle.importKey("raw", (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$helper$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toBufferSource"])(new Uint8Array(derivedBits)), {
        name: "HKDF"
    }, false, [
        "deriveKey",
        "deriveBits"
    ]);
}
async function deriveAesGcmKey(rootKey, info) {
    const hkdfSalt = new Uint8Array(0);
    return crypto.subtle.deriveKey({
        name: "HKDF",
        hash: HKDF_HASH,
        salt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$helper$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toBufferSource"])(hkdfSalt),
        info: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$helper$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toBufferSource"])(info)
    }, rootKey, {
        name: "AES-GCM",
        length: 256
    }, false, [
        "encrypt",
        "decrypt"
    ]);
}
async function encryptEnvelope(saltHex, password, opts) {
    if (typeof saltHex !== "string") throw new TypeError("salt must be a hex string");
    if (!password) throw new Error("password required");
    // Normalize payload: only salt
    const payload = JSON.stringify({
        salt: saltHex
    });
    const saltBytes = randomBytes(SALT_BYTES); // PBKDF2 salt (envelope-level)
    const iv = randomBytes(IV_BYTES);
    var _opts_iter;
    const iter = (_opts_iter = opts === null || opts === void 0 ? void 0 : opts.iter) !== null && _opts_iter !== void 0 ? _opts_iter : DEFAULT_PBKDF2_ITER;
    var _opts_hkdfInfo;
    const hkdfInfoStr = (_opts_hkdfInfo = opts === null || opts === void 0 ? void 0 : opts.hkdfInfo) !== null && _opts_hkdfInfo !== void 0 ? _opts_hkdfInfo : HKDF_INFO_ENC;
    const aadBytes = (opts === null || opts === void 0 ? void 0 : opts.aad) ? utf8ToBytes(opts.aad) : undefined;
    const rootKey = await deriveRootKeyPBKDF2(password, saltBytes, iter);
    const aesKey = await deriveAesGcmKey(rootKey, utf8ToBytes(hkdfInfoStr));
    const alg = {
        name: ENC_ALG,
        iv: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$helper$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toBufferSource"])(iv)
    };
    if (aadBytes) alg.additionalData = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$helper$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toBufferSource"])(aadBytes);
    const ctBuf = await crypto.subtle.encrypt(alg, aesKey, (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$helper$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toBufferSource"])(utf8ToBytes(payload)));
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$logger$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["logger"].info("[secureCrypto] encryptEnvelope", {
        saltPreview: saltHex.slice(0, 6) + "...",
        iter,
        aad: !!aadBytes,
        ivHex: toHex(iv).slice(0, 8) + "..."
    });
    const envelope = {
        v: VERSION,
        kdf: {
            name: "pbkdf2",
            salt: b64urlEncode(saltBytes),
            iter,
            hash: PBKDF2_HASH
        },
        hkdfInfo: b64urlEncode(utf8ToBytes(hkdfInfoStr)),
        iv: b64urlEncode(iv),
        aad: aadBytes ? b64urlEncode(aadBytes) : undefined,
        ct: b64urlEncode(new Uint8Array(ctBuf)),
        meta: {
            envelopeSha3: ""
        }
    };
    const fingerprint = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$sha3$2f$src$2f$sha3$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sha3_256"])(JSON.stringify({
        ...envelope,
        meta: undefined
    }));
    envelope.meta.envelopeSha3 = fingerprint;
    return JSON.stringify(envelope);
}
async function decryptEnvelope(envelopeStr, password) {
    var _env_kdf;
    if (!password) throw new Error("password required");
    let env;
    try {
        env = JSON.parse(envelopeStr);
    } catch (e) {
        throw new Error("ERR_CORRUPT_BLOB");
    }
    if (!env || env.v !== VERSION || ((_env_kdf = env.kdf) === null || _env_kdf === void 0 ? void 0 : _env_kdf.name) !== "pbkdf2") {
        throw new Error("ERR_UNSUPPORTED_VERSION");
    }
    const computed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$sha3$2f$src$2f$sha3$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sha3_256"])(JSON.stringify({
        ...env,
        meta: undefined
    }));
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
        const alg = {
            name: ENC_ALG,
            iv: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$helper$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toBufferSource"])(iv)
        };
        if (aad) alg.additionalData = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$helper$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toBufferSource"])(aad);
        const plainBuf = await crypto.subtle.decrypt(alg, aesKey, (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$helper$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toBufferSource"])(ct));
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$logger$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["logger"].info("[secureCrypto] decryptEnvelope", {
            ivLen: iv.length,
            aad: !!aad,
            ctLen: ct.length
        });
        const parsed = JSON.parse(bytesToUtf8(new Uint8Array(plainBuf)));
        if (!parsed || typeof parsed.salt !== "string") throw new Error("ERR_MALFORMED_PLAINTEXT");
        return {
            salt: parsed.salt
        };
    } catch (e) {
        throw new Error("ERR_BAD_PASSWORD_OR_CORRUPT");
    }
}
function generateRecoveryPhrase() {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bip39$2f$src$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["generateMnemonic"](256);
}
async function recoverSaltFromMnemonic(phrase) {
    let passphrase = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "";
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bip39$2f$src$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["validateMnemonic"](phrase)) throw new Error("ERR_INVALID_MNEMONIC");
    const seedBuf = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bip39$2f$src$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mnemonicToSeed"](phrase, passphrase);
    const seedBytes = new Uint8Array(seedBuf);
    const seedKey = await crypto.subtle.importKey("raw", (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$helper$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toBufferSource"])(seedBytes), {
        name: "HKDF"
    }, false, [
        "deriveBits"
    ]);
    // Derive 16 bytes (128 bits) salt
    const derivedBits = await crypto.subtle.deriveBits({
        name: "HKDF",
        hash: HKDF_HASH,
        salt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$helper$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toBufferSource"])(new Uint8Array(0)),
        info: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$helper$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toBufferSource"])(utf8ToBytes(HKDF_INFO_MNEMONIC))
    }, seedKey, 128);
    const derived = new Uint8Array(derivedBits);
    return toHex(derived);
}
function walletSecretFromAddress(address) {
    if (!address || typeof address !== "string") throw new TypeError("address required");
    const canonical = address.trim().toLowerCase();
    const no0x = canonical.startsWith("0x") ? canonical.slice(2) : canonical;
    const h = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$sha3$2f$src$2f$sha3$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sha3_256"])(no0x);
    // sha3_256 returns 32 bytes -> 64 hex chars
    return h;
}
/* ---------- Exports (facade) ---------- */ const SecureCrypto = {
    encryptEnvelope,
    decryptEnvelope,
    generateRecoveryPhrase,
    recoverSaltFromMnemonic,
    walletSecretFromAddress
};
const __TURBOPACK__default__export__ = SecureCrypto;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/saltEncryption.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Utility for encrypting/decrypting registration salt with user password
// Uses PBKDF2 + AES-GCM. Output is a base64-encoded JSON bundle.
__turbopack_context__.s([
    "decryptSaltHex",
    ()=>decryptSaltHex,
    "encryptSaltHex",
    ()=>encryptSaltHex
]);
function toBase64(buf) {
    const uint8Array = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    return btoa(String.fromCharCode(...uint8Array));
}
function fromBase64(b64) {
    const bin = atob(b64);
    const arr = Uint8Array.from(bin, (c)=>c.charCodeAt(0));
    return new Uint8Array(arr.buffer.slice(0));
}
async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey("raw", enc.encode(password), {
        name: "PBKDF2"
    }, false, [
        "deriveKey"
    ]);
    return crypto.subtle.deriveKey({
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
    }, baseKey, {
        name: "AES-GCM",
        length: 256
    }, false, [
        "encrypt",
        "decrypt"
    ]);
}
async function encryptSaltHex(saltHex, password) {
    if (!saltHex || !password) throw new Error("saltHex & password required");
    const kdfSalt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, kdfSalt);
    const plaintext = new TextEncoder().encode(saltHex);
    const ctBuf = await crypto.subtle.encrypt({
        name: "AES-GCM",
        iv
    }, key, plaintext);
    const bundle = {
        kdfSalt: toBase64(kdfSalt),
        iv: toBase64(iv),
        ct: toBase64(ctBuf),
        version: 1
    };
    return btoa(JSON.stringify(bundle));
}
async function decryptSaltHex(encrypted, password) {
    if (!encrypted || !password) throw new Error("encrypted & password required");
    let raw;
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
        const ptBuf = await crypto.subtle.decrypt({
            name: "AES-GCM",
            iv
        }, key, ct);
        return new TextDecoder().decode(ptBuf);
    } catch (e) {
        throw new Error("Failed to decrypt salt (wrong password?)");
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/config.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// src/lib/config.ts
// Log env vars to verify loading
__turbopack_context__.s([
    "config",
    ()=>config
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
console.log("NEXT_PUBLIC_LOGIN_WASM:", ("TURBOPACK compile-time value", "/circuits/login.wasm"));
console.log("NEXT_PUBLIC_LOGIN_ZKEY:", ("TURBOPACK compile-time value", "/circuits/login_final.zkey"));
console.log("NEXT_PUBLIC_REG_WASM:", ("TURBOPACK compile-time value", "/circuits/registration.wasm"));
console.log("NEXT_PUBLIC_REG_ZKEY:", ("TURBOPACK compile-time value", "/circuits/registration_final.zkey"));
console.log("NEXT_PUBLIC_API_URL:", ("TURBOPACK compile-time value", "https://backend.a4innovation.shop"));
const config = {
    loginWasm: ("TURBOPACK compile-time value", "/circuits/login.wasm"),
    loginZkey: ("TURBOPACK compile-time value", "/circuits/login_final.zkey"),
    regWasm: ("TURBOPACK compile-time value", "/circuits/registration.wasm"),
    regZkey: ("TURBOPACK compile-time value", "/circuits/registration_final.zkey"),
    apiUrl: ("TURBOPACK compile-time value", "https://backend.a4innovation.shop")
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/zkp.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "generateProof",
    ()=>generateProof
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/config.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$logger$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/logger.ts [app-client] (ecmascript)");
;
;
/** Resolve circuit files (wasm + zkey) depending on type */ function getCircuitFiles(circuit) {
    switch(circuit){
        case "login":
            return {
                wasm: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["config"].loginWasm,
                zkey: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["config"].loginZkey
            };
        case "registration":
            return {
                wasm: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["config"].regWasm,
                zkey: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["config"].regZkey
            };
        default:
            throw new Error("Unknown circuit type: ".concat(circuit));
    }
}
async function generateProof(input, circuit) {
    if (!input || Object.keys(input).length === 0) {
        throw new TypeError("Invalid input: expected a non-empty object with signal values.");
    }
    try {
        // Dynamic import
        const snarkjsModule = await __turbopack_context__.A("[project]/node_modules/snarkjs/build/browser.esm.js [app-client] (ecmascript, async loader)");
        const snarkjs = snarkjsModule;
        const { wasm, zkey } = getCircuitFiles(circuit);
        if (!wasm || !zkey) throw new Error("Missing artifacts for ".concat(circuit));
        const result = await snarkjs.groth16.fullProve(input, wasm, zkey);
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$logger$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["logger"].info("[ZKP] ".concat(circuit, " proof generated"), {
            signals: result.publicSignals.length
        });
        return result;
    } catch (err) {
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$logger$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["logger"].error("[ZKP] ".concat(circuit, " proof generation failed"), err);
        throw new Error("Failed to generate ".concat(circuit, " proof. Check inputs & circuit files."));
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/auth/api.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "checkServerHealth",
    ()=>checkServerHealth,
    "checkUsername",
    ()=>checkUsername,
    "getCommitment",
    ()=>getCommitment,
    "loginUser",
    ()=>loginUser,
    "registerUser",
    ()=>registerUser
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/axios/lib/axios.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/config.ts [app-client] (ecmascript)");
;
;
const API = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["config"].apiUrl;
async function checkUsername(username) {
    const resp = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get("".concat(API, "/check-username/").concat(username));
    return resp.data.available;
}
async function getCommitment(username) {
    const resp = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get("".concat(API, "/commitment/").concat(username));
    return resp.data;
}
async function registerUser(username, proofBundle) {
    const payload = {
        username,
        proof: proofBundle.proof,
        publicSignals: proofBundle.publicSignals
    };
    const resp = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post("".concat(API, "/register"), payload);
    return resp.data; // { status: "ok", username, commitment }
}
async function loginUser(username, proofBundle) {
    const payload = {
        username,
        proof: proofBundle.proof,
        publicSignals: proofBundle.publicSignals
    };
    const resp = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post("".concat(API, "/login"), payload);
    return resp.data; // { status: "ok", message: "Login successful", session }
}
async function checkServerHealth() {
    try {
        const resp = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get("".concat(API, "/health"));
        return resp.data.ok === true;
    } catch (e) {
        return false;
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/auth/registerLogic.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "prepareRegistration",
    ()=>prepareRegistration,
    "submitRegistration",
    ()=>submitRegistration
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$secureCrypto$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/secureCrypto.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$saltEncryption$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/saltEncryption.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$zkp$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/zkp.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$auth$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/auth/api.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$sha3$2f$src$2f$sha3$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/js-sha3/src/sha3.js [app-client] (ecmascript)");
;
;
;
;
;
function normalizeUsername(uname) {
    return uname.trim().toLowerCase();
}
function unameHashToDecimal(username) {
    const canonical = normalizeUsername(username);
    const h = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$sha3$2f$src$2f$sha3$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sha3_256"])(canonical);
    return BigInt("0x" + h).toString();
}
async function prepareRegistration(username, walletAddress, password) {
    if (!username || !walletAddress || !password) throw new Error("username, walletAddress, password required");
    // 1) Generate mnemonic
    const mnemonic = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$secureCrypto$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["generateRecoveryPhrase"])();
    // 2) Derive salt
    const saltHex = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$secureCrypto$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["recoverSaltFromMnemonic"])(mnemonic);
    const saltDecimal = BigInt('0x' + saltHex).toString();
    // 3) Wallet secret
    const secretHex = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$secureCrypto$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["walletSecretFromAddress"])(walletAddress);
    const secretDecimal = BigInt('0x' + secretHex).toString();
    // 4) Encrypt salt with user password (store encrypted on mobile)
    const encryptedSalt = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$saltEncryption$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["encryptSaltHex"])(saltHex, password);
    // Keep plain envelope internally if needed
    const envelopePlain = {
        saltHex
    };
    // 5) Public input
    const unameHashDecimal = unameHashToDecimal(username);
    // 6) Generate ZKP
    const input = {
        secret: secretDecimal,
        salt: saltDecimal,
        unameHash: unameHashDecimal
    };
    const proofBundle = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$zkp$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["generateProof"])(input, "registration");
    // 7) Commitment
    const commitment = String(proofBundle.publicSignals[0]);
    return {
        mnemonic,
        encryptedSalt,
        envelopePlain,
        proofBundle,
        publicSignals: proofBundle.publicSignals,
        commitment
    };
}
async function submitRegistration(username, proofBundle) {
    if (!username || !proofBundle) throw new Error("username and proofBundle required");
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$auth$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["registerUser"])(username, proofBundle);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/WalletConnector.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "checkPulse": "WalletConnector-module__vO-GLG__checkPulse",
  "checkmark": "WalletConnector-module__vO-GLG__checkmark",
  "connectBtn": "WalletConnector-module__vO-GLG__connectBtn",
  "connectCard": "WalletConnector-module__vO-GLG__connectCard",
  "connectedAddress": "WalletConnector-module__vO-GLG__connectedAddress",
  "connectedCard": "WalletConnector-module__vO-GLG__connectedCard",
  "connectedInfo": "WalletConnector-module__vO-GLG__connectedInfo",
  "connectedLabel": "WalletConnector-module__vO-GLG__connectedLabel",
  "connectedType": "WalletConnector-module__vO-GLG__connectedType",
  "container": "WalletConnector-module__vO-GLG__container",
  "deviceBadge": "WalletConnector-module__vO-GLG__deviceBadge",
  "disconnectBtn": "WalletConnector-module__vO-GLG__disconnectBtn",
  "error": "WalletConnector-module__vO-GLG__error",
  "fadeInScale": "WalletConnector-module__vO-GLG__fadeInScale",
  "float": "WalletConnector-module__vO-GLG__float",
  "slideInScale": "WalletConnector-module__vO-GLG__slideInScale",
  "slideInShake": "WalletConnector-module__vO-GLG__slideInShake",
  "slideInUp": "WalletConnector-module__vO-GLG__slideInUp",
  "spin": "WalletConnector-module__vO-GLG__spin",
  "spinner": "WalletConnector-module__vO-GLG__spinner",
  "walletIcon": "WalletConnector-module__vO-GLG__walletIcon",
});
}),
"[project]/src/components/WalletConnector.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>WalletConnector
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$sha3$2f$src$2f$sha3$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/js-sha3/src/sha3.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$WalletConnector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/src/components/WalletConnector.module.css [app-client] (css module)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function WalletConnector(param) {
    let { onWalletConnected } = param;
    _s();
    const [connectedAddress, setConnectedAddress] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isConnecting, setIsConnecting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [deviceId, setDeviceId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // Extract a device identifier (passed by mobile optionally as 'device' param)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "WalletConnector.useEffect": ()=>{
            const params = new URLSearchParams(window.location.search);
            const d = params.get('device');
            if (d) setDeviceId(d);
        }
    }["WalletConnector.useEffect"], []);
    function deterministicAddress(id) {
        // Hash device id and format like an Ethereum-style address
        const h = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$sha3$2f$src$2f$sha3$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sha3_256"])(id);
        return '0x' + h.slice(0, 40);
    }
    async function connectWallet() {
        setError(null);
        setIsConnecting(true);
        try {
            // Simulate delay / animation
            await new Promise((r)=>setTimeout(r, 1200));
            const idSource = deviceId || 'demo-device';
            const addr = deterministicAddress(idSource);
            setConnectedAddress(addr);
            onWalletConnected(addr);
        } catch (e) {
            setError('Failed to connect');
        } finally{
            setIsConnecting(false);
        }
    }
    function disconnect() {
        setConnectedAddress(null);
    }
    if (connectedAddress) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$WalletConnector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].container,
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$WalletConnector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].connectedCard,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$WalletConnector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].checkmark,
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                width: "24",
                                height: "24",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                        cx: "12",
                                        cy: "12",
                                        r: "10",
                                        fill: "#10b981"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/WalletConnector.tsx",
                                        lineNumber: 57,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        d: "M9 12L11 14L15 10",
                                        stroke: "white",
                                        strokeWidth: "2",
                                        strokeLinecap: "round",
                                        strokeLinejoin: "round"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/WalletConnector.tsx",
                                        lineNumber: 58,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/WalletConnector.tsx",
                                lineNumber: 56,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/WalletConnector.tsx",
                            lineNumber: 55,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$WalletConnector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].connectedInfo,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$WalletConnector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].connectedLabel,
                                    children: "Wallet Connected"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/WalletConnector.tsx",
                                    lineNumber: 62,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$WalletConnector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].connectedAddress,
                                    children: [
                                        connectedAddress.slice(0, 6),
                                        "•••",
                                        connectedAddress.slice(-6)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/WalletConnector.tsx",
                                    lineNumber: 63,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$WalletConnector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].connectedType,
                                    children: "Deterministic • Device-Bound"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/WalletConnector.tsx",
                                    lineNumber: 66,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/WalletConnector.tsx",
                            lineNumber: 61,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/WalletConnector.tsx",
                    lineNumber: 54,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    onClick: disconnect,
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$WalletConnector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].disconnectBtn,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                            width: "20",
                            height: "20",
                            viewBox: "0 0 20 20",
                            fill: "none",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                d: "M13 7L7 13M7 7L13 13",
                                stroke: "currentColor",
                                strokeWidth: "2",
                                strokeLinecap: "round"
                            }, void 0, false, {
                                fileName: "[project]/src/components/WalletConnector.tsx",
                                lineNumber: 71,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/WalletConnector.tsx",
                            lineNumber: 70,
                            columnNumber: 11
                        }, this),
                        "Disconnect"
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/WalletConnector.tsx",
                    lineNumber: 69,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/WalletConnector.tsx",
            lineNumber: 53,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$WalletConnector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].container,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$WalletConnector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].connectCard,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$WalletConnector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].walletIcon,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                            width: "48",
                            height: "48",
                            viewBox: "0 0 48 48",
                            fill: "none",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                    x: "8",
                                    y: "12",
                                    width: "32",
                                    height: "24",
                                    rx: "4",
                                    fill: "url(#walletGrad)",
                                    stroke: "#e2e8f0",
                                    strokeWidth: "2"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/WalletConnector.tsx",
                                    lineNumber: 84,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                    x: "12",
                                    y: "20",
                                    width: "12",
                                    height: "8",
                                    rx: "2",
                                    fill: "white"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/WalletConnector.tsx",
                                    lineNumber: 85,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                    cx: "30",
                                    cy: "24",
                                    r: "2",
                                    fill: "white"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/WalletConnector.tsx",
                                    lineNumber: 86,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("linearGradient", {
                                        id: "walletGrad",
                                        x1: "8",
                                        y1: "12",
                                        x2: "40",
                                        y2: "36",
                                        gradientUnits: "userSpaceOnUse",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                                stopColor: "#6366f1"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/WalletConnector.tsx",
                                                lineNumber: 89,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                                offset: "1",
                                                stopColor: "#8b5cf6"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/WalletConnector.tsx",
                                                lineNumber: 90,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/WalletConnector.tsx",
                                        lineNumber: 88,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/WalletConnector.tsx",
                                    lineNumber: 87,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/WalletConnector.tsx",
                            lineNumber: 83,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/WalletConnector.tsx",
                        lineNumber: 82,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        children: "Device Wallet"
                    }, void 0, false, {
                        fileName: "[project]/src/components/WalletConnector.tsx",
                        lineNumber: 95,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        children: "Your device will generate a unique deterministic address based on this device ID"
                    }, void 0, false, {
                        fileName: "[project]/src/components/WalletConnector.tsx",
                        lineNumber: 96,
                        columnNumber: 9
                    }, this),
                    deviceId && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$WalletConnector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].deviceBadge,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                width: "16",
                                height: "16",
                                viewBox: "0 0 16 16",
                                fill: "none",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                        width: "16",
                                        height: "16",
                                        rx: "3",
                                        fill: "#10b981"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/WalletConnector.tsx",
                                        lineNumber: 100,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        d: "M11 5L7 9L5 7",
                                        stroke: "white",
                                        strokeWidth: "2",
                                        strokeLinecap: "round",
                                        strokeLinejoin: "round"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/WalletConnector.tsx",
                                        lineNumber: 101,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/WalletConnector.tsx",
                                lineNumber: 99,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "Device Detected"
                            }, void 0, false, {
                                fileName: "[project]/src/components/WalletConnector.tsx",
                                lineNumber: 103,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/WalletConnector.tsx",
                        lineNumber: 98,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/WalletConnector.tsx",
                lineNumber: 81,
                columnNumber: 7
            }, this),
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$WalletConnector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].error,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                        width: "20",
                        height: "20",
                        viewBox: "0 0 20 20",
                        fill: "none",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                cx: "10",
                                cy: "10",
                                r: "9",
                                stroke: "currentColor",
                                strokeWidth: "2"
                            }, void 0, false, {
                                fileName: "[project]/src/components/WalletConnector.tsx",
                                lineNumber: 110,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                d: "M10 6V11M10 14V14.5",
                                stroke: "currentColor",
                                strokeWidth: "2",
                                strokeLinecap: "round"
                            }, void 0, false, {
                                fileName: "[project]/src/components/WalletConnector.tsx",
                                lineNumber: 111,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/WalletConnector.tsx",
                        lineNumber: 109,
                        columnNumber: 11
                    }, this),
                    error
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/WalletConnector.tsx",
                lineNumber: 108,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: connectWallet,
                disabled: isConnecting,
                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$WalletConnector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].connectBtn,
                children: isConnecting ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$WalletConnector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].spinner
                        }, void 0, false, {
                            fileName: "[project]/src/components/WalletConnector.tsx",
                            lineNumber: 123,
                            columnNumber: 13
                        }, this),
                        "Connecting..."
                    ]
                }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        "Connect Wallet",
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                            width: "20",
                            height: "20",
                            viewBox: "0 0 20 20",
                            fill: "none",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                d: "M7 10H13M13 10L10 7M13 10L10 13",
                                stroke: "currentColor",
                                strokeWidth: "2",
                                strokeLinecap: "round",
                                strokeLinejoin: "round"
                            }, void 0, false, {
                                fileName: "[project]/src/components/WalletConnector.tsx",
                                lineNumber: 130,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/WalletConnector.tsx",
                            lineNumber: 129,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true)
            }, void 0, false, {
                fileName: "[project]/src/components/WalletConnector.tsx",
                lineNumber: 116,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/WalletConnector.tsx",
        lineNumber: 80,
        columnNumber: 5
    }, this);
}
_s(WalletConnector, "98ujZYl0onK5KgbbxP2Y8OSbktc=");
_c = WalletConnector;
var _c;
__turbopack_context__.k.register(_c, "WalletConnector");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/register/register.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "accessDenied": "register-module__jUGYdG__accessDenied",
  "actions": "register-module__jUGYdG__actions",
  "active": "register-module__jUGYdG__active",
  "authCheck": "register-module__jUGYdG__authCheck",
  "brandLogo": "register-module__jUGYdG__brandLogo",
  "brandName": "register-module__jUGYdG__brandName",
  "brandTagline": "register-module__jUGYdG__brandTagline",
  "card": "register-module__jUGYdG__card",
  "complete": "register-module__jUGYdG__complete",
  "container": "register-module__jUGYdG__container",
  "content": "register-module__jUGYdG__content",
  "error": "register-module__jUGYdG__error",
  "fadeIn": "register-module__jUGYdG__fadeIn",
  "fadeInScale": "register-module__jUGYdG__fadeInScale",
  "float": "register-module__jUGYdG__float",
  "footer": "register-module__jUGYdG__footer",
  "form": "register-module__jUGYdG__form",
  "gradientMove": "register-module__jUGYdG__gradientMove",
  "header": "register-module__jUGYdG__header",
  "hint": "register-module__jUGYdG__hint",
  "indicator": "register-module__jUGYdG__indicator",
  "indicatorIcon": "register-module__jUGYdG__indicatorIcon",
  "input": "register-module__jUGYdG__input",
  "inputGroup": "register-module__jUGYdG__inputGroup",
  "instructions": "register-module__jUGYdG__instructions",
  "lockIcon": "register-module__jUGYdG__lockIcon",
  "logoGradient": "register-module__jUGYdG__logoGradient",
  "primaryBtn": "register-module__jUGYdG__primaryBtn",
  "processing": "register-module__jUGYdG__processing",
  "processingCircle": "register-module__jUGYdG__processingCircle",
  "processingIcon": "register-module__jUGYdG__processingIcon",
  "processingMessage": "register-module__jUGYdG__processingMessage",
  "progress": "register-module__jUGYdG__progress",
  "progressBar": "register-module__jUGYdG__progressBar",
  "progressFill": "register-module__jUGYdG__progressFill",
  "progressStep": "register-module__jUGYdG__progressStep",
  "progressSteps": "register-module__jUGYdG__progressSteps",
  "rotate": "register-module__jUGYdG__rotate",
  "secondaryBtn": "register-module__jUGYdG__secondaryBtn",
  "securityBadges": "register-module__jUGYdG__securityBadges",
  "securityIndicators": "register-module__jUGYdG__securityIndicators",
  "shimmer": "register-module__jUGYdG__shimmer",
  "slideInShake": "register-module__jUGYdG__slideInShake",
  "spin": "register-module__jUGYdG__spin",
  "spinner": "register-module__jUGYdG__spinner",
  "stepCircle": "register-module__jUGYdG__stepCircle",
  "stepTitle": "register-module__jUGYdG__stepTitle",
  "walletBadge": "register-module__jUGYdG__walletBadge",
});
}),
"[project]/src/components/theme-toggle.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ThemeToggle",
    ()=>ThemeToggle
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next-themes/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sun$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sun$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/sun.js [app-client] (ecmascript) <export default as Sun>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$moon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Moon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/moon.js [app-client] (ecmascript) <export default as Moon>");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function ThemeToggle() {
    _s();
    const { theme, setTheme } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"])();
    const [mounted, setMounted] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](false);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "ThemeToggle.useEffect": ()=>{
            setMounted(true);
        }
    }["ThemeToggle.useEffect"], []);
    if (!mounted) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                width: 40,
                height: 40
            }
        }, void 0, false, {
            fileName: "[project]/src/components/theme-toggle.tsx",
            lineNumber: 16,
            columnNumber: 16
        }, this);
    }
    const isDark = theme === "dark" || theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        onClick: ()=>setTheme(isDark ? "light" : "dark"),
        style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "1px solid var(--border-subtle)",
            background: "var(--surface)",
            color: "var(--text-primary)",
            cursor: "pointer",
            position: "absolute",
            top: 24,
            right: 24,
            zIndex: 100,
            transition: "all 0.2s ease"
        },
        title: "Toggle theme",
        children: isDark ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sun$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sun$3e$__["Sun"], {
            size: 20
        }, void 0, false, {
            fileName: "[project]/src/components/theme-toggle.tsx",
            lineNumber: 43,
            columnNumber: 23
        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$moon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Moon$3e$__["Moon"], {
            size: 20
        }, void 0, false, {
            fileName: "[project]/src/components/theme-toggle.tsx",
            lineNumber: 43,
            columnNumber: 43
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/theme-toggle.tsx",
        lineNumber: 22,
        columnNumber: 9
    }, this);
}
_s(ThemeToggle, "uGU5l7ciDSfqFDe6wS7vfMb29jQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"]
    ];
});
_c = ThemeToggle;
var _c;
__turbopack_context__.k.register(_c, "ThemeToggle");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/register/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>RegisterPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$auth$2f$registerLogic$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/auth/registerLogic.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$WalletConnector$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/WalletConnector.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/src/app/register/register.module.css [app-client] (css module)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/lock.js [app-client] (ecmascript) <export default as Lock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wallet$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Wallet$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/wallet.js [app-client] (ecmascript) <export default as Wallet>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$key$2d$round$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__KeyRound$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/key-round.js [app-client] (ecmascript) <export default as KeyRound>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-alert.js [app-client] (ecmascript) <export default as AlertCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shield.js [app-client] (ecmascript) <export default as Shield>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$hexagon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Hexagon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/hexagon.js [app-client] (ecmascript) <export default as Hexagon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-left.js [app-client] (ecmascript) <export default as ArrowLeft>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$theme$2d$toggle$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/theme-toggle.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
function RegisterPage() {
    _s();
    const [username, setUsername] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [password, setPassword] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [confirmPassword, setConfirmPassword] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [walletAddress, setWalletAddress] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [busy, setBusy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [message, setMessage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [currentStep, setCurrentStep] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(1);
    const [isAuthorized, setIsAuthorized] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isCheckingAuth, setIsCheckingAuth] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [sessionTimeout, setSessionTimeout] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // Check for Mobile Access Token on mount
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "RegisterPage.useEffect": ()=>{
            const checkAuthorization = {
                "RegisterPage.useEffect.checkAuthorization": ()=>{
                    const params = new URLSearchParams(window.location.search);
                    const mat = params.get("mat");
                    if (!mat) {
                        setIsAuthorized(false);
                        setError("Access Denied: This page can only be accessed from the SentriApp mobile application.");
                        setIsCheckingAuth(false);
                        return;
                    }
                    // Check if this MAT has already been used
                    const usedKey = "mat_used_".concat(mat);
                    if (sessionStorage.getItem(usedKey)) {
                        setIsAuthorized(false);
                        setError("This link has already been used. Please request a new link from the mobile app.");
                        setIsCheckingAuth(false);
                        return;
                    }
                    // Set authorized
                    setIsAuthorized(true);
                    setIsCheckingAuth(false);
                    // Set timeout to redirect after 5 minutes
                    const timeout = setTimeout({
                        "RegisterPage.useEffect.checkAuthorization.timeout": ()=>{
                            setError("Session expired. Please reopen from the mobile app.");
                            setIsAuthorized(false);
                        }
                    }["RegisterPage.useEffect.checkAuthorization.timeout"], 5 * 60 * 1000);
                    setSessionTimeout(timeout);
                }
            }["RegisterPage.useEffect.checkAuthorization"];
            checkAuthorization();
            // Mark MAT as used when user navigates away or closes tab
            const handleBeforeUnload = {
                "RegisterPage.useEffect.handleBeforeUnload": ()=>{
                    const params = new URLSearchParams(window.location.search);
                    const mat = params.get("mat");
                    if (mat && isAuthorized) {
                        sessionStorage.setItem("mat_used_".concat(mat), "true");
                    }
                }
            }["RegisterPage.useEffect.handleBeforeUnload"];
            window.addEventListener('beforeunload', handleBeforeUnload);
            return ({
                "RegisterPage.useEffect": ()=>{
                    if (sessionTimeout) clearTimeout(sessionTimeout);
                    window.removeEventListener('beforeunload', handleBeforeUnload);
                    // Mark as used on cleanup
                    handleBeforeUnload();
                }
            })["RegisterPage.useEffect"];
        }
    }["RegisterPage.useEffect"], [
        isAuthorized
    ]);
    const handleWalletConnected = (address)=>{
        setWalletAddress(address);
        setCurrentStep(2);
    };
    const validateForm = ()=>{
        // Alphanumeric and underscores only, 3-20 chars, no spaces
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!username || !usernameRegex.test(username)) {
            setError("Username must be 3-20 characters and contain only letters, numbers, and underscores (no spaces).");
            return false;
        }
        if (!password || password.length < 8) {
            setError("Password must be at least 8 characters");
            return false;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return false;
        }
        if (!walletAddress) {
            setError("Please connect your wallet first");
            return false;
        }
        setError(null);
        return true;
    };
    async function onRegister(e) {
        e.preventDefault();
        if (!validateForm()) return;
        setBusy(true);
        setMessage(null);
        setError(null);
        setCurrentStep(3);
        try {
            // 0️⃣ Check username availability first
            setMessage("Checking username availability...");
            const { checkUsername } = await __turbopack_context__.A("[project]/src/auth/api.ts [app-client] (ecmascript, async loader)");
            const available = await checkUsername(username);
            if (!available) {
                setError('Username "'.concat(username, '" is already taken. Please choose another.'));
                setBusy(false);
                setCurrentStep(2);
                return;
            }
            // 1️⃣ Prepare registration
            setMessage("Generating zero-knowledge proof...");
            const prep = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$auth$2f$registerLogic$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["prepareRegistration"])(username, walletAddress, password);
            // 2️⃣ Submit registration
            setMessage("Submitting registration to server...");
            const resp = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$auth$2f$registerLogic$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["submitRegistration"])(username, prep.proofBundle);
            if (!resp.token) throw new Error("Registration failed: no token received");
            // 3️⃣ Encrypt mnemonic for safe transport (simple base64)
            const encryptedMnemonic = btoa(prep.mnemonic);
            // 4️⃣ Mark MAT as used to prevent reuse
            const params = new URLSearchParams(window.location.search);
            const mat = params.get("mat");
            if (mat) {
                sessionStorage.setItem("mat_used_".concat(mat), "true");
            }
            // 5️⃣ Construct deep link URL
            setMessage("Registration successful! Redirecting to app...");
            const redirectUri = "sentriapp://auth-callback";
            const queryParams = new URLSearchParams({
                token: resp.token,
                username,
                encryptedSalt: prep.encryptedSalt,
                mnemonic: encryptedMnemonic
            }).toString();
            // Small delay to show success message
            await new Promise((resolve)=>setTimeout(resolve, 1500));
            // 6️⃣ Redirect automatically
            if (/android/i.test(navigator.userAgent)) {
                const intentUrl = "intent://auth-callback?".concat(queryParams, "#Intent;scheme=sentriapp;package=com.example.mobile;end");
                window.location.href = intentUrl;
            } else {
                const redirectUrl = "".concat(redirectUri, "?").concat(queryParams);
                window.location.href = redirectUrl; // iOS / fallback
            }
            // 7️⃣ Close the tab after redirect attempt
            setTimeout(()=>{
                window.close();
                // Fallback: if window.close() doesn't work, replace with blank page
                if (!window.closed) {
                    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center;"><div><h2>✅ Registration Complete</h2><p>You can now close this tab and return to the app.</p></div></div>';
                }
            }, 500);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setCurrentStep(2); // Go back to form
        } finally{
            setBusy(false);
        }
    }
    // Show loading screen while checking authorization
    if (isCheckingAuth) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].container,
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$theme$2d$toggle$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ThemeToggle"], {}, void 0, false, {
                    fileName: "[project]/src/app/register/page.tsx",
                    lineNumber: 198,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].authCheck,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].spinner
                        }, void 0, false, {
                            fileName: "[project]/src/app/register/page.tsx",
                            lineNumber: 200,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            children: "Verifying access..."
                        }, void 0, false, {
                            fileName: "[project]/src/app/register/page.tsx",
                            lineNumber: 201,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/register/page.tsx",
                    lineNumber: 199,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/register/page.tsx",
            lineNumber: 197,
            columnNumber: 7
        }, this);
    }
    // Show access denied screen if not authorized
    if (!isAuthorized) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].container,
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$theme$2d$toggle$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ThemeToggle"], {}, void 0, false, {
                    fileName: "[project]/src/app/register/page.tsx",
                    lineNumber: 211,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].accessDenied,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__["Lock"], {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].lockIcon,
                            color: "#94a3b8"
                        }, void 0, false, {
                            fileName: "[project]/src/app/register/page.tsx",
                            lineNumber: 213,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            children: "Access Restricted"
                        }, void 0, false, {
                            fileName: "[project]/src/app/register/page.tsx",
                            lineNumber: 214,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            children: error
                        }, void 0, false, {
                            fileName: "[project]/src/app/register/page.tsx",
                            lineNumber: 215,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].instructions,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    children: "How to Register:"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/register/page.tsx",
                                    lineNumber: 217,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ol", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            children: "Open the SentriApp mobile application"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/register/page.tsx",
                                            lineNumber: 219,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            children: 'Tap on "Open Web Registration"'
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/register/page.tsx",
                                            lineNumber: 220,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            children: "Complete the registration process"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/register/page.tsx",
                                            lineNumber: 221,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/register/page.tsx",
                                    lineNumber: 218,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/register/page.tsx",
                            lineNumber: 216,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/register/page.tsx",
                    lineNumber: 212,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/register/page.tsx",
            lineNumber: 210,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].container,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$theme$2d$toggle$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ThemeToggle"], {}, void 0, false, {
                fileName: "[project]/src/app/register/page.tsx",
                lineNumber: 231,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].card,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].header,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].brandLogo,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].logoGradient,
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                        width: "48",
                                        height: "48",
                                        viewBox: "0 0 48 48",
                                        fill: "none",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                d: "M24 4L42 14V34L24 44L6 34V14L24 4Z",
                                                fill: "url(#grad1)",
                                                stroke: "white",
                                                strokeWidth: "2"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/register/page.tsx",
                                                lineNumber: 237,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                                cx: "24",
                                                cy: "24",
                                                r: "8",
                                                fill: "white"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/register/page.tsx",
                                                lineNumber: 238,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("linearGradient", {
                                                    id: "grad1",
                                                    x1: "6",
                                                    y1: "4",
                                                    x2: "42",
                                                    y2: "44",
                                                    gradientUnits: "userSpaceOnUse",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                                            stopColor: "#6366f1"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/register/page.tsx",
                                                            lineNumber: 241,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                                            offset: "1",
                                                            stopColor: "#8b5cf6"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/register/page.tsx",
                                                            lineNumber: 242,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/register/page.tsx",
                                                    lineNumber: 240,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/register/page.tsx",
                                                lineNumber: 239,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/register/page.tsx",
                                        lineNumber: 236,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/app/register/page.tsx",
                                    lineNumber: 235,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].brandName,
                                            children: "SentriZK"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/register/page.tsx",
                                            lineNumber: 248,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].brandTagline,
                                            children: "Zero-Knowledge Authentication"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/register/page.tsx",
                                            lineNumber: 249,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/register/page.tsx",
                                    lineNumber: 247,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/register/page.tsx",
                            lineNumber: 234,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/register/page.tsx",
                        lineNumber: 233,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].progress,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].progressBar,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].progressFill,
                                    style: {
                                        width: "".concat(currentStep / 3 * 100, "%")
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/src/app/register/page.tsx",
                                    lineNumber: 256,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/register/page.tsx",
                                lineNumber: 255,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].progressSteps,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "".concat(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].progressStep, " ").concat(currentStep >= 1 ? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].active : '', " ").concat(currentStep > 1 ? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].complete : ''),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].stepCircle,
                                                children: currentStep > 1 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                                    size: 20
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/register/page.tsx",
                                                    lineNumber: 261,
                                                    columnNumber: 36
                                                }, this) : '1'
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/register/page.tsx",
                                                lineNumber: 260,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: "Connect"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/register/page.tsx",
                                                lineNumber: 263,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/register/page.tsx",
                                        lineNumber: 259,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "".concat(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].progressStep, " ").concat(currentStep >= 2 ? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].active : '', " ").concat(currentStep > 2 ? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].complete : ''),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].stepCircle,
                                                children: currentStep > 2 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                                    size: 20
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/register/page.tsx",
                                                    lineNumber: 267,
                                                    columnNumber: 36
                                                }, this) : '2'
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/register/page.tsx",
                                                lineNumber: 266,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: "Register"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/register/page.tsx",
                                                lineNumber: 269,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/register/page.tsx",
                                        lineNumber: 265,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "".concat(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].progressStep, " ").concat(currentStep >= 3 ? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].active : ''),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].stepCircle,
                                                children: "3"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/register/page.tsx",
                                                lineNumber: 272,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: "Complete"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/register/page.tsx",
                                                lineNumber: 273,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/register/page.tsx",
                                        lineNumber: 271,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/register/page.tsx",
                                lineNumber: 258,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/register/page.tsx",
                        lineNumber: 254,
                        columnNumber: 9
                    }, this),
                    currentStep === 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].content,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].stepTitle,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        children: "Connect Your Wallet"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/register/page.tsx",
                                        lineNumber: 281,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        children: "Your device will generate a unique deterministic wallet address"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/register/page.tsx",
                                        lineNumber: 282,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/register/page.tsx",
                                lineNumber: 280,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$WalletConnector$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                onWalletConnected: handleWalletConnected
                            }, void 0, false, {
                                fileName: "[project]/src/app/register/page.tsx",
                                lineNumber: 284,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/register/page.tsx",
                        lineNumber: 279,
                        columnNumber: 11
                    }, this),
                    currentStep === 2 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].content,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].stepTitle,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        children: "Create Your Account"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/register/page.tsx",
                                        lineNumber: 291,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        children: "Secure your identity with zero-knowledge proof encryption"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/register/page.tsx",
                                        lineNumber: 292,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/register/page.tsx",
                                lineNumber: 290,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].walletBadge,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wallet$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Wallet$3e$__["Wallet"], {
                                        size: 20,
                                        color: "#38bdf8"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/register/page.tsx",
                                        lineNumber: 296,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: [
                                            "Connected: ",
                                            walletAddress.slice(0, 6),
                                            "...",
                                            walletAddress.slice(-4)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/register/page.tsx",
                                        lineNumber: 297,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/register/page.tsx",
                                lineNumber: 295,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                                onSubmit: onRegister,
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].form,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].inputGroup,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                htmlFor: "username",
                                                children: "Username"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/register/page.tsx",
                                                lineNumber: 302,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                id: "username",
                                                type: "text",
                                                value: username,
                                                onChange: (e)=>setUsername(e.target.value),
                                                placeholder: "Enter your username",
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].input,
                                                disabled: busy,
                                                required: true,
                                                minLength: 3
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/register/page.tsx",
                                                lineNumber: 303,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].hint,
                                                children: "Minimum 3 characters"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/register/page.tsx",
                                                lineNumber: 314,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/register/page.tsx",
                                        lineNumber: 301,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].inputGroup,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                htmlFor: "password",
                                                children: "Password"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/register/page.tsx",
                                                lineNumber: 318,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                id: "password",
                                                type: "password",
                                                value: password,
                                                onChange: (e)=>setPassword(e.target.value),
                                                placeholder: "Create a strong password",
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].input,
                                                disabled: busy,
                                                required: true,
                                                minLength: 8
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/register/page.tsx",
                                                lineNumber: 319,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].hint,
                                                children: "Minimum 8 characters"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/register/page.tsx",
                                                lineNumber: 330,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/register/page.tsx",
                                        lineNumber: 317,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].inputGroup,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                htmlFor: "confirmPassword",
                                                children: "Confirm Password"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/register/page.tsx",
                                                lineNumber: 334,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                id: "confirmPassword",
                                                type: "password",
                                                value: confirmPassword,
                                                onChange: (e)=>setConfirmPassword(e.target.value),
                                                placeholder: "Re-enter your password",
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].input,
                                                disabled: busy,
                                                required: true
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/register/page.tsx",
                                                lineNumber: 335,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/register/page.tsx",
                                        lineNumber: 333,
                                        columnNumber: 15
                                    }, this),
                                    error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].error,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                                                size: 20
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/register/page.tsx",
                                                lineNumber: 349,
                                                columnNumber: 19
                                            }, this),
                                            error
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/register/page.tsx",
                                        lineNumber: 348,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].actions,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "submit",
                                                disabled: busy,
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].primaryBtn,
                                                children: busy ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].spinner
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/register/page.tsx",
                                                            lineNumber: 358,
                                                            columnNumber: 23
                                                        }, this),
                                                        "Processing..."
                                                    ]
                                                }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                    children: [
                                                        "Create Account",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                            width: "20",
                                                            height: "20",
                                                            viewBox: "0 0 20 20",
                                                            fill: "none",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                                d: "M7 10H13M13 10L10 7M13 10L10 13",
                                                                stroke: "currentColor",
                                                                strokeWidth: "2",
                                                                strokeLinecap: "round",
                                                                strokeLinejoin: "round"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/register/page.tsx",
                                                                lineNumber: 365,
                                                                columnNumber: 25
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/register/page.tsx",
                                                            lineNumber: 364,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/register/page.tsx",
                                                lineNumber: 355,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                onClick: ()=>setCurrentStep(1),
                                                disabled: busy,
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].secondaryBtn,
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__["ArrowLeft"], {
                                                        size: 16
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/register/page.tsx",
                                                        lineNumber: 376,
                                                        columnNumber: 19
                                                    }, this),
                                                    " Change Wallet"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/register/page.tsx",
                                                lineNumber: 370,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/register/page.tsx",
                                        lineNumber: 354,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/register/page.tsx",
                                lineNumber: 300,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/register/page.tsx",
                        lineNumber: 289,
                        columnNumber: 11
                    }, this),
                    currentStep === 3 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].content,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].processing,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].processingIcon,
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                        width: "64",
                                        height: "64",
                                        viewBox: "0 0 64 64",
                                        fill: "none",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                                cx: "32",
                                                cy: "32",
                                                r: "30",
                                                stroke: "url(#grad2)",
                                                strokeWidth: "4",
                                                strokeDasharray: "188",
                                                strokeDashoffset: "0",
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].processingCircle
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/register/page.tsx",
                                                lineNumber: 388,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("linearGradient", {
                                                    id: "grad2",
                                                    x1: "0",
                                                    y1: "0",
                                                    x2: "64",
                                                    y2: "64",
                                                    gradientUnits: "userSpaceOnUse",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                                            stopColor: "#6366f1"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/register/page.tsx",
                                                            lineNumber: 391,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                                            offset: "1",
                                                            stopColor: "#8b5cf6"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/register/page.tsx",
                                                            lineNumber: 392,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/register/page.tsx",
                                                    lineNumber: 390,
                                                    columnNumber: 21
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/register/page.tsx",
                                                lineNumber: 389,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/register/page.tsx",
                                        lineNumber: 387,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/app/register/page.tsx",
                                    lineNumber: 386,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    children: "Creating Your Account"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/register/page.tsx",
                                    lineNumber: 397,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].processingMessage,
                                    children: message || 'Processing...'
                                }, void 0, false, {
                                    fileName: "[project]/src/app/register/page.tsx",
                                    lineNumber: 398,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].securityIndicators,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].indicator,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$key$2d$round$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__KeyRound$3e$__["KeyRound"], {
                                                    size: 24,
                                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].indicatorIcon
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/register/page.tsx",
                                                    lineNumber: 401,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Generating ZK Proof"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/register/page.tsx",
                                                    lineNumber: 402,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/register/page.tsx",
                                            lineNumber: 400,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].indicator,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__["Lock"], {
                                                    size: 24,
                                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].indicatorIcon
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/register/page.tsx",
                                                    lineNumber: 405,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Encrypting Credentials"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/register/page.tsx",
                                                    lineNumber: 406,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/register/page.tsx",
                                            lineNumber: 404,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].indicator,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                                    size: 24,
                                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].indicatorIcon
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/register/page.tsx",
                                                    lineNumber: 409,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Finalizing Registration"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/register/page.tsx",
                                                    lineNumber: 410,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/register/page.tsx",
                                            lineNumber: 408,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/register/page.tsx",
                                    lineNumber: 399,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/register/page.tsx",
                            lineNumber: 385,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/register/page.tsx",
                        lineNumber: 384,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].footer,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$register$2f$register$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].securityBadges,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__["Lock"], {
                                            size: 14
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/register/page.tsx",
                                            lineNumber: 419,
                                            columnNumber: 19
                                        }, this),
                                        " End-to-End Encrypted"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/register/page.tsx",
                                    lineNumber: 419,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"], {
                                            size: 14
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/register/page.tsx",
                                            lineNumber: 420,
                                            columnNumber: 19
                                        }, this),
                                        " Zero-Knowledge"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/register/page.tsx",
                                    lineNumber: 420,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$hexagon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Hexagon$3e$__["Hexagon"], {
                                            size: 14
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/register/page.tsx",
                                            lineNumber: 421,
                                            columnNumber: 19
                                        }, this),
                                        " Mobile Protected"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/register/page.tsx",
                                    lineNumber: 421,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/register/page.tsx",
                            lineNumber: 418,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/register/page.tsx",
                        lineNumber: 417,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/register/page.tsx",
                lineNumber: 232,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/register/page.tsx",
        lineNumber: 230,
        columnNumber: 5
    }, this);
}
_s(RegisterPage, "/Lv+WVo6WPtjGsivV9Qx+L08dsw=");
_c = RegisterPage;
var _c;
__turbopack_context__.k.register(_c, "RegisterPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_a839392d._.js.map