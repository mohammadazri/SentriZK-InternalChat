"use client";
import { useEffect, useRef } from "react";

/**
 * Enterprise-grade Server-Sent Events (SSE) stream hook.
 * Replaces dumb polling with a real-time, zero-spam connection.
 */
export function useAdminStream(fetchFn: () => Promise<void>) {
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  useEffect(() => {
    // 1. Initial manual fetch on mount
    fetchRef.current();

    const token = sessionStorage.getItem("adminToken");
    if (!token) return;

    let eventSource: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout;

    const connect = () => {
      // Pass token via query param because EventSource strictly forbids custom headers
      eventSource = new EventSource(`/api/admin/stream?token=${encodeURIComponent(token)}`);

      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === "UPDATE") {
            // Backend signaled an update; silently refetch the precise data
            fetchRef.current();
          }
        } catch {}
      };

      eventSource.onerror = (err) => {
        console.warn("SSE Connection lost. Reconnecting in 5s...", err);
        eventSource?.close();
        reconnectTimer = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      if (eventSource) eventSource.close();
      clearTimeout(reconnectTimer);
    };
  }, []);
}
