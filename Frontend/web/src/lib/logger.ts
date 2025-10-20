// src/lib/logger.ts

const isProd = process.env.NODE_ENV === "production";

type LogArgs = unknown[];

export const logger = {
  info: (...args: LogArgs) => {
    if (!isProd) {
      console.info("[INFO]", ...args);
    }
  },

  warn: (...args: LogArgs) => {
    if (!isProd) {
      console.warn("[WARN]", ...args);
    }
  },

  error: (...args: LogArgs) => {
    if (!isProd) {
      console.error("[ERROR]", ...args);
    }
    // In production, forward to a monitoring tool instead of console
    // Example: Sentry.captureException(args[0]);
  },
};
