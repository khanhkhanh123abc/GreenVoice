import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../components/common/Layout";
import axiosInstance from "../../api/axiosInstance";
import {
  GraduationCap, Users, ChevronRight, BookOpen, Star,
  Calendar, MessageCircle, Search
} from "lucide-react";

export default function MyClasses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchMyClasses();
  }, []);

  const fetchMyClasses = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/classes/my-classes");
      setClasses(res.data.classes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = classes.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.academicStaff?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <GraduationCap className="text-blue-600" size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">My Classes</h1>
              <p className="text-sm text-slate-500">Your class list</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for class or teacher..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <GraduationCap size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">
              {search ? "No matching classes found" : "You are not enrolled in any class"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((cls) => (
              <div
                key={cls._id}
                onClick={() => navigate(`/my-classes/${cls._id}`)}
                className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all duration-200 group"
              >
                {/* Class name */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                      {cls.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">
                        {cls.name}
                      </h2>
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-slate-300 group-hover:text-blue-500 transition-colors mt-1"
                  />
                </div>

                {/* Academic Staff */}
                <div className="flex items-center gap-2 mb-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                    <GraduationCap size={14} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Teacher</p>
                    <p className="text-sm font-semibold text-slate-700">
                      {cls.academicStaff?.name || (
                        <span className="text-slate-400 italic">Not assigned</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Users size={14} />
                    {cls.students?.length || 0} students
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    {new Date(cls.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>

                {/* Action hints */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Users size={11} /> View Members
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Star size={11} /> Rate Teacher
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <BookOpen size={11} /> Materials
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}