// src/lib/config.ts
function getEnvVar(key: string): string {
  const value = process.env[`NEXT_PUBLIC_${key}`];
  if (!value) {
    throw new Error(`Missing environment variable: NEXT_PUBLIC_${key}`);
  }
  return value;
}

export const config = {
  loginWasm: process.env.NEXT_PUBLIC_LOGIN_WASM!,
  loginZkey: process.env.NEXT_PUBLIC_LOGIN_ZKEY!,
  regWasm: process.env.NEXT_PUBLIC_REG_WASM!,
  regZkey: process.env.NEXT_PUBLIC_REG_ZKEY!,
  apiUrl: process.env.NEXT_PUBLIC_API_URL!,
};

