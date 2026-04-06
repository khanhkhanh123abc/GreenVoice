import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GraduationCap, Users, ArrowLeft, Mail, BookOpen, AlertCircle } from "lucide-react";
import api from "../../api/axiosInstance";
import Layout from "../../components/common/Layout";
import Topbar from "../../components/navigation/Topbar";
import { useAuth } from "../../context/AuthContext";

export default function StaffClassView() {
  const { id } = useParams(); // present when navigating from notification
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cls, setCls] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchClass = async () => {
      try {
        setLoading(true);
        if (id) {
          // Came from notification — fetch specific class by ID
          const { data } = await api.get(`/classes/${id}`);
          setCls(data.class);
        } else {
          // Came from sidebar — find class assigned to current staff
          const { data } = await api.get("/classes");
          const userId = user?._id || user?.id;
          const myClass = (data.classes || []).find(
            c => c.academicStaff?._id === userId ||
                 c.academicStaff?._id?.toString() === userId?.toString()
          );
          if (myClass) {
            setCls(myClass);
          } else {
            setError("You have not been assigned to any class yet.");
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load class.");
      } finally {
        setLoading(false);
      }
    };
    fetchClass();
  }, [id, user]);

  return (
    <Layout>
      <Topbar title="My Assigned Class" />
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-slate-50">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : error ? (
            <div className="bg-amber-50 border border-amber-200 p-8 rounded-2xl text-center">
              <AlertCircle size={36} className="mx-auto mb-3 text-amber-400" />
              <p className="font-semibold text-amber-700">{error}</p>
              <p className="text-sm text-amber-500 mt-1">Please contact your Administrator or QA Coordinator.</p>
            </div>
          ) : cls ? (
            <>
              {/* Class Info Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-sm">
                    {cls.name.charAt(0)}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">{cls.name}</h1>
                    <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                      <GraduationCap size={14} />
                      Teacher: <span className="font-semibold text-slate-700">{cls.academicStaff?.name || "Not assigned"}</span>
                    </p>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center gap-3">
                    <Users size={20} className="text-indigo-600" />
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{cls.students?.length || 0}</p>
                      <p className="text-xs text-slate-500 font-medium">Total Students</p>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
                    <BookOpen size={20} className="text-blue-600" />
                    <div>
                      <p className="text-sm font-bold text-slate-900">{cls.name}</p>
                      <p className="text-xs text-slate-500 font-medium">Class Code</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Student List */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                  <Users size={18} className="text-slate-500" />
                  <h2 className="font-bold text-slate-900">
                    Student List
                    <span className="ml-2 text-sm font-semibold text-slate-400">
                      ({cls.students?.length || 0})
                    </span>
                  </h2>
                </div>

                {!cls.students || cls.students.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Users size={36} className="mb-3 opacity-30" />
                    <p className="font-medium">No students in this class yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {cls.students.map((student, idx) => (
                      <div key={student._id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                        {/* Index */}
                        <span className="text-sm font-bold text-slate-300 w-6 text-center">{idx + 1}</span>

                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {student.name?.charAt(0)?.toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{student.name}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail size={11} />
                            {student.email}
                          </p>
                        </div>

                        {/* Department */}
                        {student.department && (
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                            {student.department}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </main>
    </Layout>
  );
}