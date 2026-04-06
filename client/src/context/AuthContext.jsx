import { createContext, useContext, useState, useCallback } from "react";
import api from "../api/axiosInstance";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  
  const [user, setUser] = useState(() => {
    try { 
      const storedUser = localStorage.getItem("user");
      return storedUser ? JSON.parse(storedUser) : null; 
    }
    catch { 
      return null; 
    }
  });

  const login = useCallback(async (email, password) => {
    // 1. Clear any residual old session data before calling the API
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    
    const { data } = await api.post("/auth/login", { email, password });
    
    // 2. Save the new token and user info
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    
    // 3. Update global State
    setToken(data.token);
    setUser(data.user);
    
    return data;
  }, []);

  const logout = useCallback(() => {
    // 4. Use clear() to completely wipe all stale data from LocalStorage
    localStorage.clear(); 
    
    setToken(null);
    setUser(null);
    
    // Force browser reload to fully reset React memory
    // (Ensures no old post data or stale sockets remain)
    window.location.href = '/login'; 
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/profile");
      localStorage.setItem("user", JSON.stringify(data));
      setUser(data);
      return data;
    } catch (error) {
      // 5. ON ERROR (e.g. Token expired, Backend key changed): Auto logout immediately
      console.warn("Invalid session, auto cleaning up...");
      localStorage.clear();
      setToken(null);
      setUser(null);
      window.location.href = '/login';
    }
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, refreshUser, isLoggedIn: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}