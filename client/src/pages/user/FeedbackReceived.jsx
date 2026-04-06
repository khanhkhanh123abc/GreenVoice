import { useState, useEffect } from "react";
import Layout from "../../components/common/Layout";
import axiosInstance from "../../api/axiosInstance";
import { useAuth } from "../../context/AuthContext";
import { Star, MessageCircle, TrendingUp, Calendar, ChevronDown, ChevronUp, GraduationCap, Users, ArrowLeft } from "lucide-react";

function StarDisplay({ value }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} size={13}
          className={star <= value ? "text-yellow-400 fill-yellow-400" : "text-slate-200 fill-slate-200"}
        />
      ))}
    </div>
  );
}

function StarBar({ avg }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1,2,3,4,5].map(s => (
          <Star key={s} size={12}
            className={s <= Math.round(avg) ? "text-yellow-400 fill-yellow-400" : "text-slate-200 fill-slate-200"}
          />
        ))}
      </div>
      <span className="text-sm font-bold text-slate-700">{avg}/5</span>
    </div>
  );
}

const ratingLabel = ["", "Very Poor", "Poor", "Average", "Good", "Excellent"];

// Group feedbacks by staffId → classId
function groupByStaffAndClass(feedbacks) {
  const staffMap = {};
  for (const fb of feedbacks) {
    const staffId = fb.staffId?._id || fb.staffId || "unknown";
    const staffName = fb.staffId?.name || "Unknown Staff";
    const classId = fb.classId?._id || fb.classId || "unknown";
    const className = fb.classId?.name || "Unknown Class";

    if (!staffMap[staffId]) {
      staffMap[staffId] = { staffId, staffName, classes: {} };
    }
    if (!staffMap[staffId].classes[classId]) {
      staffMap[staffId].classes[classId] = { classId, className, feedbacks: [] };
    }
    staffMap[staffId].classes[classId].feedbacks.push(fb);
  }
  return Object.values(staffMap).map(s => ({
    ...s,
    classes: Object.values(s.classes),
  }));
}

function avgRating(feedbacks) {
  if (!feedbacks.length) return 0;
  return Math.round(feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length * 10) / 10;
}

export default function FeedbackReceived() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Administrator";
  const isQAC = user?.role === "QA Coordinator";
  const canViewDetails = isAdmin || isQAC;

  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState({ total: 0, avgRating: 0 });
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState("");

  // Expanded state: { [staffId]: bool, [staffId+classId]: bool }
  const [expandedStaff, setExpandedStaff] = useState({});
  const [expandedClass, setExpandedClass] = useState({});
  const [selectedClass, setSelectedClass] = useState(null); // { classId, className, feedbacks }

  useEffect(() => {
    if (!user) return;
    fetchFeedbacks();
  }, [user]);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const role = user?.role;
      const isQACOrAdmin = role === "Administrator" || role === "QA Coordinator";
      const endpoint = isQACOrAdmin
        ? "/classes/feedback/all"
        : "/classes/feedback/my-received";
      const res = await axiosInstance.get(endpoint);
      setFeedbacks(res.data.feedbacks || []);
      setStats(res.data.stats || { total: 0, avgRating: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const periods = [...new Set(feedbacks.map((f) => f.period))].sort().reverse();
  const filtered = filterPeriod ? feedbacks.filter((f) => f.period === filterPeriod) : feedbacks;

  const ratingDist = [5, 4, 3, 2, 1].map((r) => ({
    star: r,
    count: filtered.filter((f) => f.rating === r).length,
    pct: filtered.length
      ? Math.round((filtered.filter((f) => f.rating === r).length / filtered.length) * 100)
      : 0,
  }));

  // Grouped view for QAC/Admin
  const grouped = groupByStaffAndClass(filtered);

  const toggleStaff = (staffId) =>
    setExpandedStaff(prev => ({ ...prev, [staffId]: !prev[staffId] }));
  const toggleClass = (key) =>
    setExpandedClass(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
            <Star className="text-yellow-500" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Student Feedback</h1>
            <p className="text-sm text-slate-500">
              {canViewDetails
                ? isAdmin ? "Full feedback details and ratings" : "All staff feedback details and ratings"
                : "Overview of student ratings about you"}
            </p>
          </div>
          <span className={`ml-auto text-xs font-bold px-3 py-1.5 rounded-full ${
            isAdmin ? "bg-red-100 text-red-600"
            : isQAC ? "bg-purple-100 text-purple-600"
            : "bg-blue-100 text-blue-600"
          }`}>
            {isAdmin ? "Admin View" : isQAC ? "QAC View" : "Staff View"}
          </span>
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
                  <span className="text-sm font-semibold text-slate-500">Avg. Score</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.avgRating || "–"}</p>
                <p className="text-xs text-slate-400 mt-1">/ 5.0 stars</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <MessageCircle size={16} className="text-blue-500" />
                  </div>
                  <span className="text-sm font-semibold text-slate-500">Total Reviews</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-400 mt-1">reviews</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp size={16} className="text-green-500" />
                  </div>
                  <span className="text-sm font-semibold text-slate-500">
                    {canViewDetails ? "Total Staff" : "Review Months"}
                  </span>
                </div>
                <p className="text-3xl font-bold text-slate-900">
                  {canViewDetails ? grouped.length : periods.length}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {canViewDetails ? "staff members" : "different months"}
                </p>
              </div>
            </div>

            {/* Filter by period */}
            {periods.length > 1 && (
              <div className="flex items-center gap-3 mb-6">
                <label className="text-sm font-semibold text-slate-600">Filter by month:</label>
                <select
                  value={filterPeriod}
                  onChange={(e) => setFilterPeriod(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">All</option>
                  {periods.map((p) => (
                    <option key={p} value={p}>Month {p}</option>
                  ))}
                </select>
              </div>
            )}

            {/* ── QAC / Admin: Grouped by Staff → Class ── */}
            {canViewDetails ? (
              <>
                {grouped.length === 0 ? (
                  <div className="text-center py-20">
                    <Star size={48} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-slate-400 font-medium">No feedback yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {grouped.map((staff) => {
                      const staffAvg = avgRating(staff.classes.flatMap(c => c.feedbacks));
                      const totalReviews = staff.classes.flatMap(c => c.feedbacks).length;
                      const isStaffOpen = expandedStaff[staff.staffId] !== false; // default open

                      return (
                        <div key={staff.staffId} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                          {/* Staff header */}
                          <button
                            onClick={() => toggleStaff(staff.staffId)}
                            className="w-full flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors text-left"
                          >
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base shrink-0">
                              {staff.staffName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-900">{staff.staffName}</p>
                              <div className="flex items-center gap-3 mt-0.5">
                                <StarBar avg={staffAvg} />
                                <span className="text-xs text-slate-400">{totalReviews} reviews · {staff.classes.length} class{staff.classes.length > 1 ? "es" : ""}</span>
                              </div>
                            </div>
                            {isStaffOpen ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
                          </button>

                          {/* Classes under this staff */}
                          {isStaffOpen && (
                            <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 space-y-3">
                              {staff.classes.map((cls) => {
                                const clsAvg = avgRating(cls.feedbacks);
                                const classKey = `${staff.staffId}-${cls.classId}`;
                                const isClassOpen = expandedClass[classKey];

                                return (
                                  <div key={cls.classId} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                    {/* Class header */}
                                    <button
                                      onClick={() => toggleClass(classKey)}
                                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                                    >
                                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                        <GraduationCap size={13} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800">{cls.className}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <StarBar avg={clsAvg} />
                                          <span className="text-xs text-slate-400">{cls.feedbacks.length} review{cls.feedbacks.length > 1 ? "s" : ""}</span>
                                        </div>
                                      </div>
                                      {isClassOpen
                                        ? <ChevronUp size={14} className="text-slate-400 shrink-0" />
                                        : <ChevronDown size={14} className="text-slate-400 shrink-0" />}
                                    </button>

                                    {/* Feedback list under this class */}
                                    {isClassOpen && (
                                      <div className="border-t border-slate-100 px-4 py-3 space-y-2">
                                        {cls.feedbacks.map((fb) => (
                                          <div key={fb._id} className="bg-slate-50 rounded-lg p-3">
                                            <div className="flex items-start justify-between mb-1.5">
                                              <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                                                  {fb.studentId?.name?.charAt(0) || "?"}
                                                </div>
                                                <p className="text-xs font-semibold text-slate-700">{fb.studentId?.name || "Unknown"}</p>
                                              </div>
                                              <div className="flex items-center gap-1.5">
                                                <StarDisplay value={fb.rating} />
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                                                  fb.rating >= 4 ? "bg-green-100 text-green-700"
                                                  : fb.rating === 3 ? "bg-yellow-100 text-yellow-700"
                                                  : "bg-red-100 text-red-700"
                                                }`}>
                                                  {ratingLabel[fb.rating]}
                                                </span>
                                              </div>
                                            </div>
                                            {fb.comment && (
                                              <p className="text-xs text-slate-500 italic ml-8">"{fb.comment}"</p>
                                            )}
                                            <p className="text-[10px] text-slate-400 ml-8 mt-1 flex items-center gap-1">
                                              <Calendar size={9} /> Month {fb.period} · {new Date(fb.createdAt).toLocaleDateString("en-GB")}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              /* ── Academic Staff: Step 1 = class list, Step 2 = class feedback ── */
              <>
                {feedbacks.length === 0 ? (
                  <div className="text-center py-20">
                    <Star size={48} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-slate-400 font-medium">No feedback received yet.</p>
                  </div>
                ) : selectedClass ? (
                  /* ── Step 2: Feedback detail for selected class ── */
                  <div className="space-y-4">
                    {/* Back button + class header */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedClass(null)}
                        className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                      >
                        <ArrowLeft size={16} /> Back to Classes
                      </button>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0">
                        {selectedClass.className.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">{selectedClass.className}</h2>
                        <div className="flex items-center gap-3 mt-0.5">
                          <StarBar avg={avgRating(selectedClass.feedbacks)} />
                          <span className="text-xs text-slate-400">{selectedClass.feedbacks.length} review{selectedClass.feedbacks.length !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                    </div>

                    {/* Feedback list */}
                    <div className="space-y-3">
                      {selectedClass.feedbacks.map(fb => (
                        <div key={fb._id} className="bg-white border border-slate-200 rounded-2xl p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                                {fb.studentId?.name?.charAt(0) || "?"}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">{fb.studentId?.name || "Anonymous"}</p>
                                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Calendar size={10} /> Month {fb.period} · {new Date(fb.createdAt).toLocaleDateString("en-GB")}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <StarDisplay value={fb.rating} />
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                fb.rating >= 4 ? "bg-green-100 text-green-700"
                                : fb.rating === 3 ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                              }`}>
                                {ratingLabel[fb.rating]}
                              </span>
                            </div>
                          </div>
                          {fb.comment && (
                            <p className="text-sm text-slate-500 italic bg-slate-50 rounded-xl px-4 py-3">"{fb.comment}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* ── Step 1: Class list ── */
                  <>
                    {/* Rating Distribution */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
                      <h3 className="font-bold text-slate-900 mb-4">Rating Distribution</h3>
                      <div className="space-y-2">
                        {ratingDist.map(({ star, count, pct }) => (
                          <div key={star} className="flex items-center gap-3">
                            <div className="flex items-center gap-1 w-16 shrink-0">
                              <span className="text-sm font-medium text-slate-600">{star}</span>
                              <Star size={12} className="text-yellow-400 fill-yellow-400" />
                            </div>
                            <div className="flex-1 bg-slate-100 rounded-full h-2">
                              <div className="bg-yellow-400 h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-slate-500 w-12 text-right">{count} ({pct}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Class cards */}
                    <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <GraduationCap size={18} className="text-indigo-500" />
                      Select a Class to View Feedback
                    </h3>
                    <div className="space-y-3">
                      {(() => {
                        const classMap = {};
                        for (const fb of filtered) {
                          const cId = fb.classId?._id || fb.classId || "unknown";
                          const cName = fb.classId?.name || "Unknown Class";
                          if (!classMap[cId]) classMap[cId] = { classId: cId, className: cName, feedbacks: [] };
                          classMap[cId].feedbacks.push(fb);
                        }
                        return Object.values(classMap).map(cls => (
                          <div
                            key={cls.classId}
                            onClick={() => setSelectedClass(cls)}
                            className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all duration-200 group"
                          >
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0">
                              {cls.className.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{cls.className}</h3>
                              <div className="flex items-center gap-3 mt-1">
                                <StarBar avg={avgRating(cls.feedbacks)} />
                                <span className="text-xs text-slate-400">{cls.feedbacks.length} review{cls.feedbacks.length !== 1 ? "s" : ""}</span>
                              </div>
                            </div>
                            <ChevronDown size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0 -rotate-90" />
                          </div>
                        ));
                      })()}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}