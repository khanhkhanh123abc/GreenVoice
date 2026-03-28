import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import api from "../api/axiosInstance";

const SOCKET_URL = "http://localhost:5000";
const REFRESH_INTERVAL = 1000; // 30 giây

/**
 * Hook lấy data analytics real-time
 * - Fetch ngay khi mount
 * - Socket.io lắng nghe event "analyticsUpdate" từ server → re-fetch
 * - Fallback polling mỗi 30 giây
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
    // 1. Fetch ngay lần đầu
    fetchData();

    // 2. Kết nối Socket.io
    const socket = io(SOCKET_URL, { transports: ["websocket"], reconnectionAttempts: 3 });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("📡 Analytics socket connected");
    });

    // Khi server emit "analyticsUpdate" → fetch lại
    socket.on("analyticsUpdate", () => {
      fetchData();
    });

    socket.on("connect_error", () => {
      // Socket không kết nối được → không sao, polling vẫn chạy
    });

    // 3. Polling fallback mỗi 30 giây
    timerRef.current = setInterval(fetchData, REFRESH_INTERVAL);

    return () => {
      socket.disconnect();
      clearInterval(timerRef.current);
    };
  }, [fetchData]);

  return { data, loading, error, lastUpdated, refresh: fetchData };
}
