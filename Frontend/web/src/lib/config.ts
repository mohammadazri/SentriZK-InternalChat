// src/lib/config.ts

// Log env vars to verify loading
console.log("NEXT_PUBLIC_LOGIN_WASM:", process.env.NEXT_PUBLIC_LOGIN_WASM);
console.log("NEXT_PUBLIC_LOGIN_ZKEY:", process.env.NEXT_PUBLIC_LOGIN_ZKEY);
console.log("NEXT_PUBLIC_REG_WASM:", process.env.NEXT_PUBLIC_REG_WASM);
console.log("NEXT_PUBLIC_REG_ZKEY:", process.env.NEXT_PUBLIC_REG_ZKEY);
console.log("NEXT_PUBLIC_API_URL:", process.env.NEXT_PUBLIC_API_URL);

export const config = {
  loginWasm: process.env.NEXT_PUBLIC_LOGIN_WASM!,
  loginZkey: process.env.NEXT_PUBLIC_LOGIN_ZKEY!,
  regWasm: process.env.NEXT_PUBLIC_REG_WASM!,
  regZkey: process.env.NEXT_PUBLIC_REG_ZKEY!,
  apiUrl: process.env.NEXT_PUBLIC_API_URL!,
};

