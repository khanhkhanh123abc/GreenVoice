import { useState, useEffect } from "react";
import api from "../../api/axiosInstance";
import Layout from "../../components/Layout";
import Topbar from "../../components/Topbar";
import { StatCard, ChartCard, HBarChart, DonutChart, LineChart, RankBadge, Loader } from "../../components/Charts";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function TeachingQuality() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/ideas?limit=500")
      .then(({ data }) => setIdeas(data.ideas || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Group by author → avg votes as rating proxy
  const byAuthor = ideas.reduce((acc, idea) => {
    if (idea.isAnonymous || !idea.authorId?.name) return acc;
    const name = idea.authorId.name;
    if (!acc[name]) acc[name] = { votes: 0, count: 0, likes: 0 };
    acc[name].votes += idea.votes || 0;
    acc[name].count += 1;
    acc[name].likes += idea.likes?.length || 0;
    return acc;
  }, {});

  const lecturerRating = Object.entries(byAuthor)
    .map(([label, d]) => ({
      label,
      value: parseFloat(Math.min(5, (d.votes / d.count * 0.4 + 3)).toFixed(1)),
      raw: d,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Rating distribution from votes
  const ratingDist = [
    { label: "⭐⭐⭐⭐⭐ 5 stars", value: ideas.filter(i => i.votes >= 10).length },
    { label: "⭐⭐⭐⭐ 4 stars",  value: ideas.filter(i => i.votes >= 6 && i.votes < 10).length },
    { label: "⭐⭐⭐ 3 stars",   value: ideas.filter(i => i.votes >= 3 && i.votes < 6).length },
    { label: "⭐⭐ 2 stars",    value: ideas.filter(i => i.votes >= 1 && i.votes < 3).length },
    { label: "⭐ 1 star",      value: ideas.filter(i => i.votes === 0).length },
  ].filter(d => d.value > 0);

  // Feedback trend (ideas per month)
  const now = new Date();
  const feedbackTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return {
      label: MONTHS[d.getMonth()],
      value: ideas.filter(idea => {
        const c = new Date(idea.createdAt);
        return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear();
      }).length,
    };
  });

  const avgRating = lecturerRating.length
    ? (lecturerRating.reduce((s, d) => s + d.value, 0) / lecturerRating.length).toFixed(1)
    : "—";

  return (
    <Layout>
      <Topbar title="Teaching Quality Dashboard" />
      <main className="flex-1 p-6 bg-slate-50 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Teaching Quality Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Evaluate teaching quality based on idea contributions and peer engagement.</p>
        </div>

        {loading ? <Loader /> : (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <StatCard icon="⭐" label="Avg Rating Score"  value={avgRating}             color="#F59E0B" />
              <StatCard icon="👨‍🏫" label="Active Lecturers" value={lecturerRating.length}  color="#3B82F6" />
              <StatCard icon="💡" label="Total Feedbacks"   value={ideas.length}           color="#10B981" />
              <StatCard icon="🏆" label="5-Star Feedbacks"  value={ratingDist[0]?.value || 0} color="#8B5CF6" />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <ChartCard title="Lecturer Rating" subtitle="Ranked by average engagement score (out of 5.0)">
                <HBarChart
                  data={lecturerRating.map(d => ({ label: d.label, value: Math.round(d.value * 10) / 10 }))}
                  color="#3B82F6"
                />
              </ChartCard>
              <ChartCard title="Rating Distribution" subtitle="Breakdown of all idea quality ratings">
                {ratingDist.length > 0
                  ? <DonutChart data={ratingDist} size={150} />
                  : <div className="text-center py-10 text-slate-300 text-sm">No rating data yet</div>
                }
              </ChartCard>
            </div>

            <div className="mb-4">
              <ChartCard title="Student Feedback Trend" subtitle="Number of ideas/feedbacks submitted per month (last 6 months)">
                <LineChart data={feedbackTrend} color="#10B981" height={180} />
              </ChartCard>
            </div>

            {/* Detail table */}
            <ChartCard title="Lecturer Detail" subtitle="Full metrics per lecturer">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Rank","Lecturer","Ideas","Total Votes","Likes","Avg Rating"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-400 pb-3 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lecturerRating.map(({ label, value, raw }, i) => (
                    <tr key={label} className="border-b border-slate-50">
                      <td className="py-3 pr-4"><RankBadge rank={i + 1} /></td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center">{label[0]}</div>
                          <span className="font-medium text-slate-800">{label}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 font-semibold text-blue-600">{raw.count}</td>
                      <td className="py-3 pr-4 font-semibold text-amber-500">{raw.votes}</td>
                      <td className="py-3 pr-4 font-semibold text-rose-500">{raw.likes}</td>
                      <td className="py-3 pr-4">
                        <span className="bg-yellow-50 text-yellow-700 text-xs font-bold px-2.5 py-1 rounded-full">{value} ★</span>
                      </td>
                    </tr>
                  ))}
                  {lecturerRating.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-8 text-slate-300">No lecturer data yet</td></tr>
                  )}
                </tbody>
              </table>
            </ChartCard>
          </>
        )}
      </main>
    </Layout>
  );
}