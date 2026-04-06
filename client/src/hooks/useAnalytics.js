import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import api from "../api/axiosInstance";

const SOCKET_URL = "http://localhost:3000";
const REFRESH_INTERVAL = 1000; // 30 seconds

/**
 * Hook to fetch real-time analytics data
 * - Fetch ngay khi mount
 * - Socket.io listens for "analyticsUpdate" event from server → re-fetch
 * - Fallback polling every 30 seconds
 */
export function useAnalytics(endpoint) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const socketRef = useRef(null);
  const timerRef  = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: res } = await api.get(`/analytics/${endpoint}`);
      setData(res);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    // 1. Fetch immediately on first load
    fetchData();

    // 2. Connect Socket.io
    const socket = io(SOCKET_URL, { transports: ["websocket"], reconnectionAttempts: 3 });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("📡 Analytics socket connected");
    });

    // When server emits "analyticsUpdate" → re-fetch
    socket.on("analyticsUpdate", () => {
      fetchData();
    });

    socket.on("connect_error", () => {
      // Socket failed to connect → no worries, polling still runs
    });

    // 3. Polling fallback every 30 seconds
    timerRef.current = setInterval(fetchData, REFRESH_INTERVAL);

    return () => {
      socket.disconnect();
      clearInterval(timerRef.current);
    };
  }, [fetchData]);

  return { data, loading, error, lastUpdated, refresh: fetchData };
}