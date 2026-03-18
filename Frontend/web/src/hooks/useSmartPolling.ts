"use client";
import { useEffect, useRef, useCallback } from "react";

/**
 * Smart polling hook with browser visibility awareness.
 * - Polls every `intervalMs` (default 10s) when tab is visible
 * - Stops completely when tab is hidden
 * - Resumes immediately when tab becomes visible again
 * - Cleans up on unmount
 */
export function useSmartPolling(fetchFn: () => Promise<void>, intervalMs = 10000) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchRef = useRef(fetchFn);

  // Always keep the latest fetchFn ref
  fetchRef.current = fetchFn;

  const start = useCallback(() => {
    // Clear any existing timer first
    if (timerRef.current) clearInterval(timerRef.current);
    // Don't start if tab is hidden
    if (document.visibilityState === "hidden") return;
    timerRef.current = setInterval(() => {
      fetchRef.current();
    }, intervalMs);
  }, [intervalMs]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchRef.current();

    // Start polling
    start();

    // Visibility change handler
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchRef.current(); // Fetch immediately on tab focus
        start();
      } else {
        stop();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [start, stop]);
}
