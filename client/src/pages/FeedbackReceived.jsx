import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import axiosInstance from "../api/axiosInstance";
import { Star, MessageCircle, TrendingUp, Calendar, Users } from "lucide-react";

function StarDisplay({ value }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={14}
          className={star <= value ? "text-yellow-400 fill-yellow-400" : "text-slate-200 fill-slate-200"}
        />
      ))}
    </div>
  );
}

const ratingLabel = ["", "Rất tệ", "Tệ", "Trung bình", "Tốt", "Xuất sắc"];
const ratingColor = ["", "red", "orange", "yellow", "blue", "green"];

export default function FeedbackReceived() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState({ total: 0, avgRating: 0 });
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState("");

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/classes/feedback/my-received");
      setFeedbacks(res.data.feedbacks || []);
      setStats(res.data.stats || { total: 0, avgRating: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Lấy danh sách period unique để filter
  const periods = [...new Set(feedbacks.map((f) => f.period))].sort().reverse();

  const filtered = filterPeriod
    ? feedbacks.filter((f) => f.period === filterPeriod)
    : feedbacks;

  // Tính phân bố rating
  const ratingDist = [5, 4, 3, 2, 1].map((r) => ({
    star: r,
    count: feedbacks.filter((f) => f.rating === r).length,
    pct: feedbacks.length
      ? Math.round((feedbacks.filter((f) => f.rating === r).length / feedbacks.length) * 100)
      : 0,
  }));

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
            <Star className="text-yellow-500" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Feedback từ học sinh</h1>
            <p className="text-sm text-slate-500">Đánh giá của học sinh về bạn</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Star size={16} className="text-yellow-500" />
                  </div>
                  <span className="text-sm font-semibold text-slate-500">Điểm TB</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.avgRating || "–"}</p>
                <p className="text-xs text-slate-400 mt-1">/ 5.0 sao</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <MessageCircle size={16} className="text-blue-500" />
                  </div>
                  <span className="text-sm font-semibold text-slate-500">Tổng đánh giá</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-400 mt-1">lượt đánh giá</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp size={16} className="text-green-500" />
                  </div>
                  <span className="text-sm font-semibold text-slate-500">Tháng đánh giá</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">{periods.length}</p>
                <p className="text-xs text-slate-400 mt-1">tháng khác nhau</p>
              </div>
            </div>

            {/* Rating distribution */}
            {feedbacks.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
                <h3 className="font-bold text-slate-900 mb-4">Phân bố đánh giá</h3>
                <div className="space-y-2">
                  {ratingDist.map(({ star, count, pct }) => (
                    <div key={star} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-16 shrink-0">
                        <span className="text-sm font-medium text-slate-600">{star}</span>
                        <Star size={12} className="text-yellow-400 fill-yellow-400" />
                      </div>
                      <div className="flex-1 bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 w-12 text-right">{count} ({pct}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filter by period */}
            {periods.length > 1 && (
              <div className="flex items-center gap-3 mb-4">
                <label className="text-sm font-semibold text-slate-600">Lọc theo tháng:</label>
                <select
                  value={filterPeriod}
                  onChange={(e) => setFilterPeriod(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">Tất cả</option>
                  {periods.map((p) => (
                    <option key={p} value={p}>Tháng {p}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Feedback list */}
            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <Star size={48} className="mx-auto text-slate-200 mb-3" />
                <p className="text-slate-400 font-medium">Chưa có đánh giá nào</p>
                <p className="text-sm text-slate-400 mt-1">Học sinh sẽ đánh giá bạn mỗi tháng</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((fb) => (
                  <div key={fb._id} className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600 text-sm">
                          {fb.studentId?.name?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{fb.studentId?.name}</p>
                          <p className="text-xs text-slate-400">{fb.classId?.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end mb-1">
                          <StarDisplay value={fb.rating} />
                          <span className="text-sm font-bold text-slate-700">{fb.rating}/5</span>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold
                            ${fb.rating >= 4 ? "bg-green-100 text-green-700" :
                              fb.rating === 3 ? "bg-yellow-100 text-yellow-700" :
                              "bg-red-100 text-red-700"}`}
                        >
                          {ratingLabel[fb.rating]}
                        </span>
                      </div>
                    </div>

                    {fb.comment && (
                      <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 leading-relaxed">
                        "{fb.comment}"
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        Tháng {fb.period}
                      </span>
                      <span>·</span>
                      <span>{new Date(fb.createdAt).toLocaleDateString("vi-VN")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}