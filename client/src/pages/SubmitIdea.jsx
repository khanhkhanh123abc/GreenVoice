import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, AlertCircle, CheckCircle2, Info } from "lucide-react";
import api from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Topbar from "../components/Topbar";
import { toast } from "react-toastify";

export default function SubmitIdea() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Khởi tạo các biến chứa dữ liệu từ Backend
  const [categories, setCategories] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Khởi tạo các biến của Form đăng bài
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [topicType, setTopicType] = useState(user?.role === "Support Staff" ? "Support" : "Academic");
  const [categoryId, setCategoryId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [files, setFiles] = useState([]);
  const [termsAgreed, setTermsAgreed] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 1. Tải danh sách Category và Chiến dịch (Campaign) khi vừa mở trang
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [catRes, campRes] = await Promise.all([
          api.get("/categories"),
          api.get("/campaigns/active") // Gọi API lấy chiến dịch đang mở
        ]);
        setCategories(catRes.data.categories || []);
        setCampaigns(campRes.data || []);
      } catch (err) {
        console.error("Lỗi tải dữ liệu:", err);
        toast.error("Không thể kết nối đến máy chủ.");
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  // Xử lý khi chọn file đính kèm
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 5) {
      toast.error("Bạn chỉ được tải lên tối đa 5 tệp.");
      return;
    }
    setFiles(selectedFiles);
  };

  // 2. Gửi dữ liệu Đăng bài
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!termsAgreed) {
      setError("Bạn phải đồng ý với Điều khoản và Thể lệ trước khi đăng bài.");
      return;
    }

    setSubmitting(true);
    try {
      // Vì có chứa File, nên phải dùng FormData thay vì JSON thường
      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      formData.append("topicType", topicType);
      formData.append("categoryId", categoryId);
      formData.append("campaignId", campaignId); // Gửi ID chiến dịch xuống Backend
      formData.append("isAnonymous", isAnonymous);

      files.forEach((file) => {
        formData.append("documents", file);
      });

      await api.post("/ideas", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Đăng bài thành công!");
      navigate("/ideas"); // Chuyển về trang danh sách

    } catch (err) {
      setError(err.response?.data?.message || "Đã xảy ra lỗi khi đăng bài.");
      toast.error("Đăng bài thất bại!");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <Topbar title="Đóng góp Ý tưởng" />

      <main className="flex-1 p-6 lg:p-10 overflow-y-auto bg-slate-50">
        <div className="max-w-4xl mx-auto">

          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Thêm Ý Tưởng Mới</h1>
            <p className="text-slate-500 mt-2">Chia sẻ ý tưởng của bạn để góp phần xây dựng trường học tốt hơn.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p className="font-medium text-sm">{error}</p>
            </div>
          )}

          {/* CẢNH BÁO NẾU KHÔNG CÓ CHIẾN DỊCH NÀO ĐANG MỞ */}
          {!loadingData && campaigns.length === 0 && (
            <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4">
              <Info size={28} className="text-amber-500 shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-amber-800">Hệ thống đang đóng</h3>
                <p className="text-amber-700 mt-1">Hiện tại nhà trường không có Chiến dịch thu thập ý tưởng nào đang mở. Bạn vui lòng quay lại sau khi có thông báo mới nhé!</p>
                <button onClick={() => navigate('/ideas')} className="mt-4 px-4 py-2 bg-amber-100 text-amber-800 font-bold rounded-lg hover:bg-amber-200 transition-colors">
                  Quay lại Trang chủ
                </button>
              </div>
            </div>
          )}

          <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-opacity ${campaigns.length === 0 && !loadingData ? 'opacity-50 pointer-events-none grayscale-[50%]' : ''}`}>
            
            {loadingData ? (
              <div className="p-16 text-center text-slate-500 font-medium">Đang tải dữ liệu biểu mẫu...</div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
                
                {/* 1. Chọn Chiến dịch (Cực kỳ quan trọng) */}
                <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <label className="block text-sm font-bold text-blue-900 mb-2">Chiến dịch thu thập (Campaign) <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                    className="w-full bg-white border border-blue-200 rounded-lg px-4 py-3 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  >
                    <option value="" disabled>-- Hãy chọn một chiến dịch đang mở --</option>
                    {campaigns.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.name} (Hạn chót: {new Date(c.closureDate).toLocaleDateString('vi-VN')})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-blue-600 mt-2 flex items-center gap-1.5"><Info size={14}/> Ý tưởng của bạn sẽ được gộp vào chiến dịch này.</p>
                </div>

                {/* 2. Tiêu đề và Nội dung */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Tiêu đề ý tưởng <span className="text-red-500">*</span></label>
                    <input
                      required
                      type="text"
                      placeholder="Tóm tắt ý tưởng của bạn trong một câu..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nội dung chi tiết <span className="text-red-500">*</span></label>
                    <textarea
                      required
                      rows="6"
                      placeholder="Mô tả chi tiết ý tưởng, lý do và lợi ích..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-y"
                    ></textarea>
                  </div>
                </div>

                {/* 3. Phân loại */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Topic Type <span className="text-red-500">*</span></label>
                    <select
                      value={topicType}
                      onChange={(e) => setTopicType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
                    >
                      {user?.role === "Support Staff" ? (
                        <option value="Support">Support (Dành riêng cho Support Staff)</option>
                      ) : (
                        <>
                          <option value="Academic">Academic</option>
                          <option value="Support">Support</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Danh mục (Category) <span className="text-red-500">*</span></label>
                    <select
                      required
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="" disabled>-- Chọn một danh mục --</option>
                      {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* 4. Đính kèm File */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Tài liệu đính kèm (Tùy chọn)</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors relative">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload size={32} className="mx-auto text-slate-400 mb-3" />
                    <p className="text-sm font-bold text-slate-700">Kéo thả tệp vào đây hoặc Click để chọn</p>
                    <p className="text-xs text-slate-500 mt-1">Hỗ trợ JPG, PNG, PDF, DOCX (Tối đa 5 tệp)</p>
                  </div>
                  {files.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {files.map((f, i) => (
                        <div key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-md border border-blue-200 flex items-center gap-2">
                          <CheckCircle2 size={14} /> {f.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <hr className="border-slate-200" />

                {/* 5. Tùy chọn Ẩn danh & Điều khoản */}
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={isAnonymous} 
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" 
                    />
                    <div>
                      <span className="font-bold text-slate-800 block">Đăng bài Ẩn danh (Anonymous)</span>
                      <span className="text-xs text-slate-500">Tên của bạn sẽ bị ẩn với mọi người (Trừ Ban Quản trị).</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <input 
                      type="checkbox" 
                      required
                      checked={termsAgreed} 
                      onChange={(e) => setTermsAgreed(e.target.checked)}
                      className="w-5 h-5 mt-0.5 text-blue-600 rounded focus:ring-blue-500" 
                    />
                    <div className="text-sm">
                      <span className="font-bold text-slate-800 block mb-1">Tôi đồng ý với Điều khoản và Thể lệ <span className="text-red-500">*</span></span>
                      <span className="text-slate-600">Bằng việc đăng ý tưởng này, tôi xác nhận rằng nội dung của tôi không vi phạm các tiêu chuẩn cộng đồng của nhà trường và tôi chịu trách nhiệm hoàn toàn về nội dung đã chia sẻ.</span>
                    </div>
                  </label>
                </div>

                {/* NÚT SUBMIT */}
                <div className="flex justify-end gap-4 pt-4">
                  <button type="button" onClick={() => navigate('/ideas')} className="px-6 py-3 font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">
                    Hủy bỏ
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting || campaigns.length === 0} 
                    className="px-8 py-3 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {submitting ? "Đang gửi..." : "Đăng ý tưởng"}
                  </button>
                </div>

              </form>
            )}
          </div>
        </div>
      </main>
    </Layout>
  );
}