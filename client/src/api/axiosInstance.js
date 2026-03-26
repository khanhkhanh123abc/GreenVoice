import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api', // Hoặc URL Backend của bạn
});

// BỘ ĐÁNH CHẶN REQUEST: Luôn lấy Token nóng hổi nhất
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// BỘ ĐÁNH CHẶN RESPONSE: Xử lý tự động văng ra ngoài nếu Token hết hạn hoặc sai
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Nếu phát hiện Token tạch, tự động dọn rác để không bị kẹt
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Nếu không phải đang ở trang login thì mới báo lỗi
            if (window.location.pathname !== '/login') {
                console.warn("Phiên đăng nhập có vấn đề, yêu cầu đăng nhập lại.");
                // window.location.href = '/login'; // Mở comment dòng này nếu muốn ép đá văng ra login
            }
        }
        return Promise.reject(error);
    }
);

export default api;