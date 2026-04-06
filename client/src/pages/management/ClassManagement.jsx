import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../components/common/Layout";
import axiosInstance from "../../api/axiosInstance";
import {
  GraduationCap, Users, Plus, Pencil, Trash2, X, Check,
  Search, ChevronDown, ChevronUp, UserPlus, UserMinus, AlertCircle,
  Star, MessageCircle, Calendar
} from "lucide-react";

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 text-lg">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function ClassManagement() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Administrator";

  const [classes, setClasses] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedClass, setExpandedClass] = useState(null);
  const [expandedTab, setExpandedTab] = useState({}); // { [classId]: "students" | "feedback" }
  const [feedbackData, setFeedbackData] = useState({}); // { [classId]: { feedbacks, loading } }

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(null); // class obj
  const [showAddStudent, setShowAddStudent] = useState(null); // class obj
  const [deleteConfirm, setDeleteConfirm] = useState(null); // class._id

  // Form
  const [formName, setFormName] = useState("");
  const [formStaffId, setFormStaffId] = useState("");
  const [formStudentIds, setFormStudentIds] = useState(new Set());
  const [staffSearch, setStaffSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [clsRes, userRes] = await Promise.all([
        axiosInstance.get("/classes"),
        axiosInstance.get("/user"),
      ]);
      setClasses(clsRes.data.classes || []);
      setAllUsers(userRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedback = async (classId) => {
    setFeedbackData(prev => ({ ...prev, [classId]: { feedbacks: [], loading: true } }));
    try {
      const res = await axiosInstance.get(`/classes/${classId}/feedback`);
      const feedbacks = res.data.feedbacks || [];
      setFeedbackData(prev => ({ ...prev, [classId]: { feedbacks, loading: false } }));
    } catch {
      setFeedbackData(prev => ({ ...prev, [classId]: { feedbacks: [], loading: false } }));
    }
  };

  const handleToggleExpand = (classId) => {
    if (expandedClass === classId) {
      setExpandedClass(null);
    } else {
      setExpandedClass(classId);
      // Default tab = students, load feedback if not yet loaded
      if (!expandedTab[classId]) {
        setExpandedTab(prev => ({ ...prev, [classId]: "students" }));
      }
    }
  };

  const handleSwitchTab = (classId, tab) => {
    setExpandedTab(prev => ({ ...prev, [classId]: tab }));
    if (tab === "feedback" && !feedbackData[classId]) {
      fetchFeedback(classId);
    }
  };
  const studentList = allUsers.filter((u) => u.role === "Student");
  const academicStaffList = allUsers.filter((u) => u.role === "Academic Staff");

  const filtered = classes.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.academicStaff?.name?.toLowerCase().includes(search.toLowerCase())
  );

  // ── CREATE ──
  const handleCreate = async () => {
    if (!formName.trim()) { setError("Class name cannot be empty"); return; }
    try {
      setSaving(true); setError("");
      await axiosInstance.post("/classes", {
        name: formName.trim(),
        academicStaffId: formStaffId || undefined,
      });
      setShowCreate(false);
      setFormName(""); setFormStaffId("");
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create class");
    } finally { setSaving(false); }
  };

  // ── EDIT ──
  const openEdit = (cls) => {
    setShowEdit(cls);
    setFormName(cls.name);
    setFormStaffId(cls.academicStaff?._id || "");
    setError("");
  };

  const handleEdit = async () => {
    if (!formName.trim()) { setError("Class name cannot be empty"); return; }
    try {
      setSaving(true); setError("");
      await axiosInstance.put(`/classes/${showEdit._id}`, {
        name: formName.trim(),
        academicStaffId: formStaffId || null,
      });
      setShowEdit(null);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update class");
    } finally { setSaving(false); }
  };

  // ── DELETE ──
  const handleDelete = async () => {
    try {
      setSaving(true);
      await axiosInstance.delete(`/classes/${deleteConfirm}`);
      setDeleteConfirm(null);
      fetchAll();
    } catch (err) {
      console.error(err);
    } finally { setSaving(false); }
  };

  // ── ADD STUDENT ──
  const handleAddStudent = async () => {
    if (formStudentIds.size === 0) { setError("Please select at least one student"); return; }
    try {
      setSaving(true); setError("");
      // Add all selected students sequentially
      await Promise.all([...formStudentIds].map(studentId =>
        axiosInstance.post(`/classes/${showAddStudent._id}/students`, { studentId })
      ));
      setShowAddStudent(null);
      setFormStudentIds(new Set());
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add students");
    } finally { setSaving(false); }
  };

  // ── REMOVE STUDENT ──
  const handleRemoveStudent = async (classId, studentId) => {
    try {
      await axiosInstance.delete(`/classes/${classId}/students/${studentId}`);
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <GraduationCap className="text-indigo-600" size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Class Management</h1>
              <p className="text-sm text-slate-500">Manage classes, teachers and students</p>
            </div>
          </div>
          <button
            onClick={() => { setShowCreate(true); setFormName(""); setFormStaffId(""); setError(""); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus size={16} /> Create New Class
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for class or teacher..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total Classes", value: classes.length, color: "indigo" },
            { label: "Has Teacher", value: classes.filter((c) => c.academicStaff).length, color: "blue" },
            { label: "Total Students", value: classes.reduce((s, c) => s + (c.students?.length || 0), 0), color: "green" },
          ].map((stat) => (
            <div key={stat.label} className={`bg-${stat.color}-50 border border-${stat.color}-100 rounded-xl p-4`}>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-500 font-medium mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Class list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <GraduationCap size={40} className="mx-auto mb-3 opacity-40" />
            <p>No classes found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((cls) => {
              const isExpanded = expandedClass === cls._id;
              return (
                <div key={cls._id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  {/* Main Row */}
                  <div className="flex items-center gap-4 p-5">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                      {cls.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900">{cls.name}</h3>
                      <p className="text-sm text-slate-500">
                        {cls.academicStaff ? (
                          <span className="flex items-center gap-1">
                            <GraduationCap size={12} />
                            {cls.academicStaff.name}
                          </span>
                        ) : (
                          <span className="text-amber-500 italic">No teacher assigned</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Users size={14} />
                      <span>{cls.students?.length || 0}</span>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setShowAddStudent(cls); setFormStudentIds(new Set()); setError(""); }}
                        title="Add Student"
                        className="p-2 hover:bg-green-50 text-slate-400 hover:text-green-600 rounded-lg transition-colors"
                      >
                        <UserPlus size={16} />
                      </button>
                      <button
                        onClick={() => openEdit(cls)}
                        title="Edit"
                        className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => setDeleteConfirm(cls._id)}
                          title="Delete Class"
                          className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleExpand(cls._id)}
                        className="p-2 hover:bg-slate-50 text-slate-400 rounded-lg transition-colors"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded: tabs for Students and Feedback */}
                  {isExpanded && (() => {
                    const activeTab = expandedTab[cls._id] || "students";
                    const fb = feedbackData[cls._id];

                    // Compute avg rating
                    const avgRating = fb?.feedbacks?.length
                      ? (fb.feedbacks.reduce((s, f) => s + f.rating, 0) / fb.feedbacks.length).toFixed(1)
                      : null;

                    return (
                      <div className="border-t border-slate-100 bg-slate-50">
                        {/* Tab switcher */}
                        <div className="flex gap-1 px-5 pt-4 pb-2">
                          <button
                            onClick={() => handleSwitchTab(cls._id, "students")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              activeTab === "students"
                                ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            <Users size={12} /> Students ({cls.students?.length || 0})
                          </button>
                          <button
                            onClick={() => handleSwitchTab(cls._id, "feedback")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              activeTab === "feedback"
                                ? "bg-white text-yellow-600 shadow-sm border border-slate-200"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            <Star size={12} /> Feedback
                          </button>
                        </div>

                        <div className="px-5 pb-4">
                          {/* ── STUDENTS TAB ── */}
                          {activeTab === "students" && (
                            <>
                              {(!cls.students || cls.students.length === 0) ? (
                                <p className="text-sm text-slate-400 italic">No students in this class</p>
                              ) : (
                                <div className="space-y-2">
                                  {cls.students.map((s) => (
                                    <div key={s._id} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-slate-200">
                                      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600 text-sm">
                                        {s.name.charAt(0)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-700">{s.name}</p>
                                        <p className="text-xs text-slate-400">{s.email}</p>
                                      </div>
                                      <button
                                        onClick={() => handleRemoveStudent(cls._id, s._id)}
                                        title="Remove from class"
                                        className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-colors"
                                      >
                                        <UserMinus size={14} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          )}

                          {/* ── FEEDBACK TAB ── */}
                          {activeTab === "feedback" && (
                            <>
                              {fb?.loading ? (
                                <div className="flex justify-center py-6">
                                  <div className="animate-spin w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full" />
                                </div>
                              ) : !fb?.feedbacks?.length ? (
                                <div className="text-center py-6 text-slate-400">
                                  <Star size={28} className="mx-auto mb-2 opacity-30" />
                                  <p className="text-sm font-medium">No feedback yet for this class</p>
                                </div>
                              ) : (
                                <>
                                  {/* Overview stats */}
                                  <div className="flex items-center gap-4 mb-4 p-3 bg-white rounded-xl border border-slate-200">
                                    <div className="flex items-center gap-1.5">
                                      <Star size={16} className="text-yellow-400 fill-yellow-400" />
                                      <span className="text-lg font-bold text-slate-900">{avgRating}</span>
                                      <span className="text-xs text-slate-400">/ 5.0</span>
                                    </div>
                                    <div className="h-4 w-px bg-slate-200" />
                                    <div className="flex items-center gap-1.5 text-slate-500">
                                      <MessageCircle size={14} />
                                      <span className="text-sm font-semibold">{fb.feedbacks.length} reviews</span>
                                    </div>
                                  </div>

                                  {/* Feedback list */}
                                  <div className="space-y-2">
                                    {fb.feedbacks.map((f) => (
                                      <div key={f._id} className="bg-white rounded-xl p-4 border border-slate-200">
                                        <div className="flex items-start justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600 text-xs">
                                              {f.studentId?.name?.charAt(0) || "?"}
                                            </div>
                                            <div>
                                              <p className="text-xs font-semibold text-slate-700">{f.studentId?.name || "Unknown"}</p>
                                              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                                <Calendar size={9} /> Month {f.period}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            {[1,2,3,4,5].map(s => (
                                              <Star key={s} size={11}
                                                className={s <= f.rating ? "text-yellow-400 fill-yellow-400" : "text-slate-200 fill-slate-200"}
                                              />
                                            ))}
                                            <span className="text-xs font-bold text-slate-600 ml-1">{f.rating}/5</span>
                                          </div>
                                        </div>
                                        {f.comment && (
                                          <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 leading-relaxed">
                                            "{f.comment}"
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}

        {/* ─── MODAL: Create ─── */}
        {showCreate && (
          <Modal title="Create New Class" onClose={() => setShowCreate(false)}>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Class Name *</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="VD: COMP1640-A"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Assigned Teacher</label>
                <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50">
                    <Search size={14} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search teacher..."
                      value={staffSearch}
                      onChange={e => setStaffSearch(e.target.value)}
                      className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder-slate-400"
                    />
                    {staffSearch && <button onClick={() => setStaffSearch("")} className="text-slate-400 hover:text-slate-600"><X size={13}/></button>}
                  </div>
                  <div className="max-h-44 overflow-y-auto">
                    <div
                      onClick={() => { setFormStaffId(""); setStaffSearch(""); }}
                      className={`px-3 py-2 text-sm cursor-pointer transition-colors ${!formStaffId ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                      -- Not assigned --
                    </div>
                    {academicStaffList
                      .filter(s => s.name.toLowerCase().includes(staffSearch.toLowerCase()) || s.email.toLowerCase().includes(staffSearch.toLowerCase()))
                      .map(s => (
                        <div
                          key={s._id}
                          onClick={() => { setFormStaffId(s._id); setStaffSearch(""); }}
                          className={`px-3 py-2 text-sm cursor-pointer transition-colors flex items-center justify-between ${formStaffId === s._id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'hover:bg-slate-50 text-slate-700'}`}
                        >
                          <span>{s.name}</span>
                          <span className="text-xs text-slate-400">{s.email}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
                {formStaffId && (
                  <p className="text-xs text-indigo-600 mt-1 font-medium">
                    ✓ Selected: {academicStaffList.find(s => s._id === formStaffId)?.name}
                  </p>
                )}
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleCreate} disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  <Check size={15} /> {saving ? "Creating..." : "Create Class"}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* ─── MODAL: Edit ─── */}
        {showEdit && (
          <Modal title="Edit Class" onClose={() => setShowEdit(null)}>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Class Name *</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Assigned Teacher</label>
                <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50">
                    <Search size={14} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search teacher..."
                      value={staffSearch}
                      onChange={e => setStaffSearch(e.target.value)}
                      className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder-slate-400"
                    />
                    {staffSearch && <button onClick={() => setStaffSearch("")} className="text-slate-400 hover:text-slate-600"><X size={13}/></button>}
                  </div>
                  <div className="max-h-44 overflow-y-auto">
                    <div
                      onClick={() => { setFormStaffId(""); setStaffSearch(""); }}
                      className={`px-3 py-2 text-sm cursor-pointer transition-colors ${!formStaffId ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                      -- Not assigned --
                    </div>
                    {academicStaffList
                      .filter(s => s.name.toLowerCase().includes(staffSearch.toLowerCase()) || s.email.toLowerCase().includes(staffSearch.toLowerCase()))
                      .map(s => (
                        <div
                          key={s._id}
                          onClick={() => { setFormStaffId(s._id); setStaffSearch(""); }}
                          className={`px-3 py-2 text-sm cursor-pointer transition-colors flex items-center justify-between ${formStaffId === s._id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'hover:bg-slate-50 text-slate-700'}`}
                        >
                          <span>{s.name}</span>
                          <span className="text-xs text-slate-400">{s.email}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
                {formStaffId && (
                  <p className="text-xs text-indigo-600 mt-1 font-medium">
                    ✓ Selected: {academicStaffList.find(s => s._id === formStaffId)?.name}
                  </p>
                )}
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowEdit(null)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleEdit} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  <Check size={15} /> {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* ─── MODAL: Add Student ─── */}
        {showAddStudent && (
          <Modal title={`Add students to "${showAddStudent.name}"`} onClose={() => setShowAddStudent(null)}>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-slate-700">Select Students</label>
                  {formStudentIds.size > 0 && (
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      {formStudentIds.size} selected
                    </span>
                  )}
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-green-500">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50">
                    <Search size={14} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search student..."
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder-slate-400"
                    />
                    {studentSearch && <button onClick={() => setStudentSearch("")} className="text-slate-400 hover:text-slate-600"><X size={13}/></button>}
                  </div>

                  {/* Select All / Deselect All */}
                  {(() => {
                    const available = studentList
                      .filter(s => !showAddStudent.students?.some(cs => cs._id === s._id))
                      .filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase()));
                    const allSelected = available.length > 0 && available.every(s => formStudentIds.has(s._id));
                    return available.length > 0 ? (
                      <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <span className="text-xs text-slate-500">{available.length} available</span>
                        <button
                          onClick={() => {
                            if (allSelected) {
                              const next = new Set(formStudentIds);
                              available.forEach(s => next.delete(s._id));
                              setFormStudentIds(next);
                            } else {
                              const next = new Set(formStudentIds);
                              available.forEach(s => next.add(s._id));
                              setFormStudentIds(next);
                            }
                          }}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          {allSelected ? "Deselect All" : "Select All"}
                        </button>
                      </div>
                    ) : null;
                  })()}

                  <div className="max-h-52 overflow-y-auto">
                    {(() => {
                      const available = studentList
                        .filter(s => !showAddStudent.students?.some(cs => cs._id === s._id))
                        .filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase()));
                      if (available.length === 0) return (
                        <p className="px-3 py-4 text-sm text-slate-400 text-center">
                          {studentSearch ? "No matching students" : "All students already added"}
                        </p>
                      );
                      return available.map(s => {
                        const isChecked = formStudentIds.has(s._id);
                        return (
                          <div
                            key={s._id}
                            onClick={() => {
                              const next = new Set(formStudentIds);
                              isChecked ? next.delete(s._id) : next.add(s._id);
                              setFormStudentIds(next);
                            }}
                            className={`px-3 py-2.5 text-sm cursor-pointer transition-colors flex items-center gap-3 ${isChecked ? 'bg-green-50' : 'hover:bg-slate-50'}`}
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isChecked ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>
                              {isChecked && <Check size={10} className="text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className={`font-medium ${isChecked ? 'text-green-700' : 'text-slate-700'}`}>{s.name}</span>
                            </div>
                            <span className="text-xs text-slate-400 shrink-0">{s.email}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddStudent(null)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleAddStudent} disabled={saving || formStudentIds.size === 0} className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  <UserPlus size={15} /> {saving ? "Adding..." : `Add ${formStudentIds.size > 0 ? `(${formStudentIds.size})` : ""} to Class`}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* ─── MODAL: Delete confirm ─── */}
        {isAdmin && deleteConfirm && (
          <Modal title="Confirm Delete Class" onClose={() => setDeleteConfirm(null)}>
            <div className="space-y-4">
              <p className="text-slate-600 text-sm">
                Are you sure you want to delete this class? This action cannot be undone and will remove all related class data.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={saving} className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                  {saving ? "Deleting..." : "Delete Class"}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </Layout>
  );
}