import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import axiosInstance from "../api/axiosInstance";
import {
  GraduationCap, Users, ArrowLeft, Star, Send,
  CheckCircle, AlertCircle, MessageCircle, Calendar, Mail
} from "lucide-react";

function StarRating({ value, onChange, readonly = false }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange && onChange(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={`transition-all duration-100 ${readonly ? "cursor-default" : "cursor-pointer"}`}
        >
          <Star
            size={readonly ? 16 : 28}
            className={
              star <= (hovered || value)
                ? "text-yellow-400 fill-yellow-400"
                : "text-slate-200 fill-slate-200"
            }
          />
        </button>
      ))}
    </div>
  );
}

export default function ClassDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [cls, setCls] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("members");

  // Feedback form
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState(null); // {type:'success'|'error', msg}

  // My feedbacks
  const [myFeedbacks, setMyFeedbacks] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  useEffect(() => {
    fetchClass();
  }, [id]);

  useEffect(() => {
    if (activeTab === "feedback") {
      fetchMyFeedback();
    }
  }, [activeTab]);

  const fetchClass = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/classes/${id}/members`);
      setCls(res.data.class);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyFeedback = async () => {
    try {
      setFeedbackLoading(true);
      const res = await axiosInstance.get(`/classes/${id}/feedback`);
      setMyFeedbacks(res.data.feedbacks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!rating) {
      setFeedbackResult({ type: "error", msg: "Vui lòng chọn số sao đánh giá." });
      return;
    }
    try {
      setSubmitting(true);
      setFeedbackResult(null);
      await axiosInstance.post(`/classes/${id}/feedback`, { rating, comment });
      setFeedbackResult({
        type: "success",
        msg: "Đã gửi đánh giá thành công! Bạn có thể đánh giá lại vào tháng sau.",
      });
      setRating(0);
      setComment("");
      fetchMyFeedback();
    } catch (err) {
      setFeedbackResult({
        type: "error",
        msg: err.response?.data?.message || "Gửi đánh giá thất bại.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Kiểm tra tháng hiện tại đã feedback chưa
  const currentPeriod = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  })();
  const alreadyFeedbackThisMonth = myFeedbacks.some((f) => f.period === currentPeriod);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (!cls) {
    return (
      <Layout>
        <div className="p-8 text-center text-slate-500">Không tìm thấy lớp học.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto">
        {/* Back */}
        <button
          onClick={() => navigate("/my-classes")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} /> Quay lại danh sách lớp
        </button>

        {/* Class Header */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-2xl font-bold">
              {cls.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{cls.name}</h1>
              <p className="text-blue-200 text-sm mt-1">
                {cls.students?.length || 0} học sinh
              </p>
            </div>
          </div>

          {/* Staff info */}
          {cls.academicStaff && (
            <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <GraduationCap size={16} />
              </div>
              <div>
                <p className="text-xs text-blue-200">Giáo viên phụ trách</p>
                <p className="font-semibold">{cls.academicStaff.name}</p>
              </div>
              <div className="ml-auto text-xs text-blue-200 flex items-center gap-1">
                <Mail size={12} />
                {cls.academicStaff.email}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
          {[
            { key: "members", label: "Thành viên lớp", icon: <Users size={15} /> },
            ...(user.role === "Student" && cls.academicStaff
              ? [{ key: "feedback", label: "Đánh giá giáo viên", icon: <Star size={15} /> }]
              : []),
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB: Members */}
        {activeTab === "members" && (
          <div className="space-y-4">
            {/* Academic Staff */}
            {cls.academicStaff && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Giáo viên
                </h3>
                <div className="bg-white border border-blue-100 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                    {cls.academicStaff.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{cls.academicStaff.name}</p>
                    <p className="text-sm text-slate-500">{cls.academicStaff.email}</p>
                  </div>
                  <span className="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-semibold">
                    Academic Staff
                  </span>
                </div>
              </div>
            )}

            {/* Students */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                Học sinh ({cls.students?.length || 0})
              </h3>
              {cls.students?.length === 0 ? (
                <p className="text-slate-400 text-sm py-4 text-center">Chưa có học sinh nào</p>
              ) : (
                <div className="space-y-2">
                  {cls.students.map((s) => (
                    <div
                      key={s._id}
                      className={`bg-white border rounded-xl p-4 flex items-center gap-4 ${
                        s._id === user._id || s._id === user.id
                          ? "border-blue-300 bg-blue-50"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600 text-sm">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">
                          {s.name}
                          {(s._id === user._id || s._id === user.id) && (
                            <span className="ml-2 text-xs text-blue-500 font-medium">(Bạn)</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">{s.email}</p>
                      </div>
                      <span className="ml-auto text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-medium">
                        Student
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: Feedback */}
        {activeTab === "feedback" && user.role === "Student" && (
          <div className="space-y-6">
            {/* Form đánh giá */}
            {!alreadyFeedbackThisMonth ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h3 className="font-bold text-slate-900 mb-1">
                  Đánh giá giáo viên tháng này
                </h3>
                <p className="text-sm text-slate-500 mb-5">
                  Mỗi tháng bạn có thể đánh giá 1 lần cho{" "}
                  <strong>{cls.academicStaff?.name}</strong>.
                </p>

                {/* Rating stars */}
                <div className="mb-4">
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">
                    Điểm đánh giá *
                  </label>
                  <StarRating value={rating} onChange={setRating} />
                  {rating > 0 && (
                    <p className="text-sm text-slate-500 mt-1">
                      {["", "Rất tệ", "Tệ", "Trung bình", "Tốt", "Xuất sắc"][rating]}
                    </p>
                  )}
                </div>

                {/* Comment */}
                <div className="mb-5">
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">
                    Nhận xét (không bắt buộc)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    placeholder="Nhập nhận xét về giáo viên..."
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <p className="text-xs text-slate-400 text-right">{comment.length}/2000</p>
                </div>

                {/* Result message */}
                {feedbackResult && (
                  <div
                    className={`flex items-start gap-2 p-3 rounded-xl mb-4 text-sm ${
                      feedbackResult.type === "success"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {feedbackResult.type === "success" ? (
                      <CheckCircle size={16} className="mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    )}
                    {feedbackResult.msg}
                  </div>
                )}

                <button
                  onClick={handleSubmitFeedback}
                  disabled={submitting}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  <Send size={15} />
                  {submitting ? "Đang gửi..." : "Gửi đánh giá"}
                </button>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-3">
                <CheckCircle className="text-green-500 shrink-0" size={22} />
                <div>
                  <p className="font-semibold text-green-800">
                    Bạn đã đánh giá giáo viên tháng này rồi!
                  </p>
                  <p className="text-sm text-green-600">
                    Bạn có thể đánh giá lại vào tháng tiếp theo.
                  </p>
                </div>
              </div>
            )}

            {/* Lịch sử feedback */}
            <div>
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <MessageCircle size={16} />
                Lịch sử đánh giá của bạn
              </h3>
              {feedbackLoading ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
              ) : myFeedbacks.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6">
                  Bạn chưa có đánh giá nào
                </p>
              ) : (
                <div className="space-y-3">
                  {myFeedbacks.map((fb) => (
                    <div key={fb._id} className="bg-white border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <StarRating value={fb.rating} readonly />
                          <span className="text-sm font-semibold text-slate-700">
                            {fb.rating}/5
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar size={11} />
                          Tháng {fb.period}
                        </span>
                      </div>
                      {fb.comment && (
                        <p className="text-sm text-slate-600 mt-2 bg-slate-50 rounded-lg p-3">
                          {fb.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}