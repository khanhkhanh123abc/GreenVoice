import { useState, useEffect } from "react";
import { Monitor, Users, Lightbulb, ThumbsUp, MessageCircle, Heart } from "lucide-react";
import api from "../../api/axiosInstance";
import Layout from "../../components/Layout";
import Topbar from "../../components/Topbar";
import { StatCard, ChartCard, LineChart, BarChart, Loader } from "../../components/Charts";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function SystemOverview() {
  const [ideas, setIdeas]   = useState([]);
  const [users, setUsers]   = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/ideas?limit=500").catch(() => ({ data: { ideas: [] } })),
      api.get("/user").catch(() => ({ data: [] })),
      api.get("/analytics/summary").catch(() => ({ data: null })),
    ]).then(([iRes, uRes, sRes]) => {
      setIdeas(iRes.data.ideas || []);
      setUsers(Array.isArray(uRes.data) ? uRes.data : []);
      setSummary(sRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const totalStaff    = users.filter(u => ["Academic Staff","Support Staff"].includes(u.role)).length;
  const totalStudents = users.filter(u => u.role === "Student").length;
  const totalIdeas    = summary?.summary?.totalIdeas ?? ideas.length;
  const totalVotes    = ideas.reduce((s, i) => s + (i.votes || 0), 0);
  const totalComments = summary?.summary?.totalComments ?? ideas.reduce((s, i) => s + (i.comments?.length || 0), 0);
  const totalReactions= ideas.reduce((s, i) => s + (i.reactions || 0) + (i.likes?.length || 0), 0);

  const now = new Date();
  const activityTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return {
      label: MONTHS[d.getMonth()],
      value: ideas.filter(idea => {
        const c = new Date(idea.createdAt);
        return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear();
      }).length,
    };
  });

  const votesTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return {
      label: MONTHS[d.getMonth()],
      value: ideas.filter(idea => {
        const c = new Date(idea.createdAt);
        return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear();
      }).reduce((s, idea) => s + (idea.votes || 0), 0),
    };
  });

  const byTopic = Object.entries(
    ideas.reduce((acc, i) => { acc[i.topicType] = (acc[i.topicType] || 0) + 1; return acc; }, {})
  ).map(([label, value]) => ({ label, value }));

  const stats = [
    { icon: "👥", label: "Total Staff",      value: totalStaff,     color: "#3B82F6" },
    { icon: "🎓", label: "Total Students",   value: totalStudents,  color: "#10B981" },
    { icon: "💡", label: "Total Ideas",      value: totalIdeas,     color: "#F59E0B", delta: "+12%" },
    { icon: "👍", label: "Total Votes",      value: totalVotes,     color: "#8B5CF6", delta: "+8%" },
    { icon: "💬", label: "Total Comments",   value: totalComments,  color: "#EF4444" },
    { icon: "❤️", label: "Total Reactions",  value: totalReactions, color: "#F97316" },
  ];

  return (
    <Layout>
      <Topbar title="System Overview" />
      <main className="flex-1 p-6 bg-slate-50 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">System Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time platform health and activity metrics.</p>
        </div>

        {loading ? <Loader /> : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-6 gap-4 mb-6">
              {stats.map(s => <StatCard key={s.label} {...s} />)}
            </div>

            {/* Charts row 1 */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="col-span-2">
                <ChartCard title="Activity Trend" subtitle="Ideas submitted per month (last 6 months)">
                  <LineChart data={activityTrend} color="#3B82F6" height={180} />
                </ChartCard>
              </div>
              <ChartCard title="Votes Trend" subtitle="Total votes per month">
                <LineChart data={votesTrend} color="#8B5CF6" height={180} />
              </ChartCard>
            </div>

            {/* Charts row 2 */}
            <div className="grid grid-cols-3 gap-4">
              <ChartCard title="Ideas by Topic" subtitle="Academic vs Support">
                <BarChart data={byTopic} colors={["#3B82F6","#10B981"]} height={160} />
              </ChartCard>
              <div className="col-span-2">
                <ChartCard title="Monthly Activity Summary" subtitle="Side-by-side comparison">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          {["Month","Ideas","Votes","Comments"].map(h => (
                            <th key={h} className="text-left text-xs font-semibold text-slate-400 pb-3 pr-6">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activityTrend.map((row, i) => (
                          <tr key={i} className="border-b border-slate-50">
                            <td className="py-2.5 pr-6 text-slate-600">{row.label}</td>
                            <td className="py-2.5 pr-6 font-semibold text-blue-600">{row.value}</td>
                            <td className="py-2.5 pr-6 font-semibold text-purple-600">{votesTrend[i]?.value || 0}</td>
                            <td className="py-2.5 pr-6 font-semibold text-rose-500">
                              {ideas.filter(idea => {
                                const now2 = new Date();
                                const d2 = new Date(now2.getFullYear(), now2.getMonth() - 5 + i, 1);
                                const c = new Date(idea.createdAt);
                                return c.getMonth() === d2.getMonth() && c.getFullYear() === d2.getFullYear();
                              }).reduce((s, idea) => s + (idea.comments?.length || 0), 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ChartCard>
              </div>
            </div>
          </>
        )}
      </main>
    </Layout>
  );
}