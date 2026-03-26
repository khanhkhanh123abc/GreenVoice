import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import axiosInstance from "../api/axiosInstance";
import {
  GraduationCap, Users, Plus, Pencil, Trash2, X, Check,
  Search, ChevronDown, ChevronUp, UserPlus, UserMinus, AlertCircle
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
  const [classes, setClasses] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedClass, setExpandedClass] = useState(null);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(null); // class obj
  const [showAddStudent, setShowAddStudent] = useState(null); // class obj
  const [deleteConfirm, setDeleteConfirm] = useState(null); // class._id

  // Form
  const [formName, setFormName] = useState("");
  const [formStaffId, setFormStaffId] = useState("");
  const [formStudentId, setFormStudentId] = useState("");
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

  const academicStaffList = allUsers.filter((u) => u.role === "Academic Staff");
  const studentList = allUsers.filter((u) => u.role === "Student");

  const filtered = classes.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.academicStaff?.name?.toLowerCase().includes(search.toLowerCase())
  );

  // ── CREATE ──
  const handleCreate = async () => {
    if (!formName.trim()) { setError("Tên lớp không được để trống"); return; }
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
      setError(err.response?.data?.message || "Tạo lớp thất bại");
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
    if (!formName.trim()) { setError("Tên lớp không được để trống"); return; }
    try {
      setSaving(true); setError("");
      await axiosInstance.put(`/classes/${showEdit._id}`, {
        name: formName.trim(),
        academicStaffId: formStaffId || null,
      });
      setShowEdit(null);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Cập nhật thất bại");
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
    if (!formStudentId) { setError("Vui lòng chọn học sinh"); return; }
    try {
      setSaving(true); setError("");
      await axiosInstance.post(`/classes/${showAddStudent._id}/students`, {
        studentId: formStudentId,
      });
      setShowAddStudent(null);
      setFormStudentId("");
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Thêm học sinh thất bại");
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
              <p className="text-sm text-slate-500">Quản lý lớp học, giáo viên và học sinh</p>
            </div>
          </div>
          <button
            onClick={() => { setShowCreate(true); setFormName(""); setFormStaffId(""); setError(""); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus size={16} /> Tạo lớp mới
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm lớp học hoặc giáo viên..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Tổng số lớp", value: classes.length, color: "indigo" },
            { label: "Có giáo viên", value: classes.filter((c) => c.academicStaff).length, color: "blue" },
            { label: "Tổng học sinh", value: classes.reduce((s, c) => s + (c.students?.length || 0), 0), color: "green" },
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
            <p>Không tìm thấy lớp học nào</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((cls) => {
              const isExpanded = expandedClass === cls._id;
              return (
                <div key={cls._id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  {/* Row chính */}
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
                          <span className="text-amber-500 italic">Chưa có giáo viên</span>
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
                        onClick={() => { setShowAddStudent(cls); setFormStudentId(""); setError(""); }}
                        title="Thêm học sinh"
                        className="p-2 hover:bg-green-50 text-slate-400 hover:text-green-600 rounded-lg transition-colors"
                      >
                        <UserPlus size={16} />
                      </button>
                      <button
                        onClick={() => openEdit(cls)}
                        title="Chỉnh sửa"
                        className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(cls._id)}
                        title="Xóa lớp"
                        className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        onClick={() => setExpandedClass(isExpanded ? null : cls._id)}
                        className="p-2 hover:bg-slate-50 text-slate-400 rounded-lg transition-colors"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded: danh sách học sinh */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                        Danh sách học sinh ({cls.students?.length || 0})
                      </h4>
                      {(!cls.students || cls.students.length === 0) ? (
                        <p className="text-sm text-slate-400 italic">Chưa có học sinh trong lớp</p>
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
                                title="Xóa khỏi lớp"
                                className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-colors"
                              >
                                <UserMinus size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ─── MODAL: Create ─── */}
        {showCreate && (
          <Modal title="Tạo lớp học mới" onClose={() => setShowCreate(false)}>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Tên lớp *</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="VD: COMP1640-A"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Giáo viên phụ trách</label>
                <select
                  value={formStaffId}
                  onChange={(e) => setFormStaffId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Chưa phân công --</option>
                  {academicStaffList.map((s) => (
                    <option key={s._id} value={s._id}>{s.name} ({s.email})</option>
                  ))}
                </select>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                  Hủy
                </button>
                <button onClick={handleCreate} disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  <Check size={15} /> {saving ? "Đang tạo..." : "Tạo lớp"}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* ─── MODAL: Edit ─── */}
        {showEdit && (
          <Modal title="Chỉnh sửa lớp học" onClose={() => setShowEdit(null)}>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Tên lớp *</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Giáo viên phụ trách</label>
                <select
                  value={formStaffId}
                  onChange={(e) => setFormStaffId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Chưa phân công --</option>
                  {academicStaffList.map((s) => (
                    <option key={s._id} value={s._id}>{s.name} ({s.email})</option>
                  ))}
                </select>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowEdit(null)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                  Hủy
                </button>
                <button onClick={handleEdit} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  <Check size={15} /> {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* ─── MODAL: Add Student ─── */}
        {showAddStudent && (
          <Modal title={`Thêm học sinh vào "${showAddStudent.name}"`} onClose={() => setShowAddStudent(null)}>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Chọn học sinh</label>
                <select
                  value={formStudentId}
                  onChange={(e) => setFormStudentId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Chọn học sinh --</option>
                  {studentList
                    .filter((s) => !showAddStudent.students?.some((cs) => cs._id === s._id))
                    .map((s) => (
                      <option key={s._id} value={s._id}>{s.name} ({s.email})</option>
                    ))}
                </select>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddStudent(null)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                  Hủy
                </button>
                <button onClick={handleAddStudent} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  <UserPlus size={15} /> {saving ? "Đang thêm..." : "Thêm vào lớp"}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* ─── MODAL: Delete confirm ─── */}
        {deleteConfirm && (
          <Modal title="Xác nhận xóa lớp" onClose={() => setDeleteConfirm(null)}>
            <div className="space-y-4">
              <p className="text-slate-600 text-sm">
                Bạn có chắc muốn xóa lớp học này? Hành động này không thể hoàn tác và sẽ xóa tất cả dữ liệu liên quan đến lớp.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                  Hủy
                </button>
                <button onClick={handleDelete} disabled={saving} className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                  {saving ? "Đang xóa..." : "Xóa lớp"}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </Layout>
  );
}