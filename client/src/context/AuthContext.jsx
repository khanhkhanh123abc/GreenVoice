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
    // 1. Quét sạch tàn dư của phiên đăng nhập cũ trước khi gọi API
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    
    const { data } = await api.post("/auth/login", { email, password });
    
    // 2. Lưu thẻ từ (token) và thông tin user mới tinh vào
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    
    // 3. Cập nhật State cho toàn hệ thống
    setToken(data.token);
    setUser(data.user);
    
    return data;
  }, []);

  const logout = useCallback(() => {
    // 4. Dùng lệnh clear() để diệt tận gốc mọi rác thừa trong LocalStorage
    localStorage.clear(); 
    
    setToken(null);
    setUser(null);
    
    // Ép trình duyệt tải lại trang để reset hoàn toàn bộ nhớ RAM của React
    // (Đảm bảo không còn dữ liệu bài viết cũ hay socket cũ bị kẹt lại)
    window.location.href = '/login'; 
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/profile");
      localStorage.setItem("user", JSON.stringify(data));
      setUser(data);
      return data;
    } catch (error) {
      // 5. NẾU LỖI (Ví dụ: Token hết hạn, Backend đổi key): Tự động đăng xuất ngay lập tức
      console.warn("Phiên đăng nhập không hợp lệ, tự động dọn dẹp...");
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