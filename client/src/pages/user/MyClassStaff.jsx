import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Users, ChevronRight, BookOpen } from "lucide-react";
import api from "../../api/axiosInstance";
import Layout from "../../components/common/Layout";
import Topbar from "../../components/navigation/Topbar";
import { useAuth } from "../../context/AuthContext";

export default function MyClassStaff() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/classes");
        const userId = user?._id || user?.id || "";
        const mine = (data.classes || []).filter(c =>
          c.academicStaff?._id === userId ||
          c.academicStaff?._id?.toString() === userId?.toString()
        );
        setClasses(mine);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetch();
  }, [user]);

  return (
    <Layout>
      <Topbar title="My Classes" />
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-slate-50">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Header stats */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <GraduationCap size={24} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">My Classes</h2>
              <p className="text-sm text-slate-500">
                {loading ? "Loading..." : `You are assigned to ${classes.length} class${classes.length !== 1 ? "es" : ""}`}
              </p>
            </div>
          </div>

          {/* Class list */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
            </div>
          ) : classes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <GraduationCap size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="font-semibold text-slate-500">You have not been assigned to any class yet.</p>
              <p className="text-sm text-slate-400 mt-1">Please contact your Administrator or QA Coordinator.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {classes.map(cls => (
                <div
                  key={cls._id}
                  onClick={() => navigate(`/staff-class/${cls._id}`)}
                  className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all duration-200 group"
                >
                  {/* Class avatar */}
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0">
                    {cls.name.charAt(0)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {cls.name}
                    </h3>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Users size={12} />
                        {cls.students?.length || 0} students
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <BookOpen size={12} />
                        {cls.name}
                      </span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}