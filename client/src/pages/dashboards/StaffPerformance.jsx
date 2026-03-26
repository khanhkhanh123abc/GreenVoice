import { useState, useEffect } from "react";
import api from "../../api/axiosInstance";
import Layout from "../../components/Layout";
import Topbar from "../../components/Topbar";
import { StatCard, ChartCard, HBarChart, LineChart, StackedBarChart, ScatterChart, RankBadge, Loader } from "../../components/Charts";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function calcScore(myIdeas) {
  const ideaScore   = Math.min(myIdeas.length * 8, 40);
  const voteScore   = Math.min(myIdeas.reduce((s, i) => s + (i.votes || 0), 0) * 0.5, 30);
  const engageScore = Math.min(myIdeas.reduce((s, i) => s + (i.views || 0) + (i.reactions || 0) + (i.likes?.length || 0) + (i.comments?.length || 0), 0) * 0.08, 20);
  const bonus       = myIdeas.length > 0 ? 10 : 0;
  return Math.min(Math.round(ideaScore + voteScore + engageScore + bonus), 100);
}

function getGrade(score) {
  if (score >= 90) return { label: "A+", cls: "bg-emerald-50 text-emerald-700" };
  if (score >= 80) return { label: "A",  cls: "bg-blue-50 text-blue-700" };
  if (score >= 70) return { label: "B",  cls: "bg-yellow-50 text-yellow-700" };
  if (score >= 60) return { label: "C",  cls: "bg-orange-50 text-orange-700" };
  return              { label: "D",  cls: "bg-red-50 text-red-700" };
}

export default function StaffPerformance() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/ideas?limit=500")
      .then(({ data }) => setIdeas(data.ideas || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const staffMap = ideas.reduce((acc, idea) => {
    if (idea.isAnonymous || !idea.authorId?.name) return acc;
    const name = idea.authorId.name;
    if (!acc[name]) acc[name] = [];
    acc[name].push(idea);
    return acc;
  }, {});

  const staffList = Object.entries(staffMap).map(([name, myIdeas]) => ({
    name,
    ideas: myIdeas.length,
    votes: myIdeas.reduce((s, i) => s + (i.votes || 0), 0),
    views: myIdeas.reduce((s, i) => s + (i.views || 0), 0),
    reactions: myIdeas.reduce((s, i) => s + (i.reactions || 0) + (i.likes?.length || 0), 0),
    comments: myIdeas.reduce((s, i) => s + (i.comments?.length || 0), 0),
    score: calcScore(myIdeas),
    rating: Math.min(5, (myIdeas.reduce((s,i)=>s+(i.votes||0),0)/myIdeas.length*0.4+3)).toFixed(1),
  })).sort((a, b) => b.score - a.score);

  const top8 = staffList.slice(0, 8);

  const rankingData = top8.map(s => ({ label: s.name.split(" ")[0], value: s.score }));

  const stackedData = top8.map(s => ({
    label: s.name.split(" ")[0],
    "Ideas": Math.min(s.ideas * 8, 40),
    "Votes": Math.min(s.votes * 0.5, 30),
    "Engagement": Math.min((s.views + s.reactions + s.comments) * 0.08, 20),
  }));

  const scatterData = staffList.map(s => ({
    label: s.name.split(" ")[0],
    x: s.ideas,
    y: parseFloat(s.rating),
  }));

  const now = new Date();
  const perfTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const monthIdeas = ideas.filter(idea => {
      const c = new Date(idea.createdAt);
      return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear() && !idea.isAnonymous && idea.authorId?.name;
    });
    const authorScores = [...new Set(monthIdeas.map(i => i.authorId?.name))].map(name => {
      const all = staffMap[name] || [];
      return calcScore(all);
    });
    return {
      label: MONTHS[d.getMonth()],
      value: authorScores.length > 0 ? Math.round(authorScores.reduce((s, v) => s + v, 0) / authorScores.length) : 0,
    };
  });

  const avgScore = staffList.length > 0
    ? Math.round(staffList.reduce((s, st) => s + st.score, 0) / staffList.length) : 0;
  const topPerformer = staffList[0]?.name?.split(" ").slice(0, 2).join(" ") || "—";

  return (
    <Layout>
      <Topbar title="Staff Performance Evaluation" />
      <main className="flex-1 p-6 bg-slate-50 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Staff Performance Evaluation</h1>
          <p className="text-sm text-slate-500 mt-1">Evaluate staff based on idea contributions, ratings, and engagement.</p>
        </div>

        {loading ? <Loader /> : (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <StatCard icon="🏆" label="Top Performer"   value={topPerformer}       color="#F59E0B" />
              <StatCard icon="📊" label="Avg Performance" value={`${avgScore}/100`}  color="#3B82F6" />
              <StatCard icon="👥" label="Staff Evaluated" value={staffList.length}   color="#10B981" />
              <StatCard icon="💡" label="Total Ideas"     value={ideas.length}       color="#8B5CF6" />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <ChartCard title="Performance Ranking" subtitle="Staff ranked by overall performance score (out of 100)">
                {rankingData.length > 0
                  ? <HBarChart data={rankingData} color="#3B82F6" />
                  : <div className="text-center py-10 text-slate-300 text-sm">No data yet</div>
                }
              </ChartCard>
              <ChartCard title="Performance Trend" subtitle="Average team performance score per month">
                <LineChart data={perfTrend} color="#10B981" height={200} />
              </ChartCard>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <ChartCard title="Performance Score Breakdown" subtitle="Ideas + Votes + Engagement components">
                {stackedData.length > 0
                  ? <StackedBarChart
                      data={stackedData}
                      keys={["Ideas","Votes","Engagement"]}
                      colors={["#3B82F6","#F59E0B","#10B981"]}
                      height={180}
                    />
                  : <div className="text-center py-10 text-slate-300 text-sm">No data yet</div>
                }
              </ChartCard>
              <ChartCard title="Contribution vs Rating" subtitle="Idea count vs teaching quality scatter">
                {scatterData.length > 0
                  ? <ScatterChart data={scatterData} xLabel="Ideas Submitted" yLabel="Rating" color="#8B5CF6" />
                  : <div className="text-center py-10 text-slate-300 text-sm">No data yet</div>
                }
              </ChartCard>
            </div>

            <ChartCard title="Full Performance Table" subtitle="Detailed breakdown for all evaluated staff">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Rank","Staff","Ideas","Votes","Views","Comments","Rating","Score","Grade"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-400 pb-3 pr-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staffList.map((st, i) => {
                    const grade = getGrade(st.score);
                    return (
                      <tr key={st.name} className="border-b border-slate-50">
                        <td className="py-3 pr-3"><RankBadge rank={i + 1} /></td>
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 text-xs font-bold flex items-center justify-center">{st.name[0]}</div>
                            <span className="font-medium text-slate-800">{st.name}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-3 font-semibold text-blue-600">{st.ideas}</td>
                        <td className="py-3 pr-3 font-semibold text-amber-500">{st.votes}</td>
                        <td className="py-3 pr-3 font-semibold text-emerald-600">{st.views}</td>
                        <td className="py-3 pr-3 font-semibold text-rose-500">{st.comments}</td>
                        <td className="py-3 pr-3">
                          <span className="bg-yellow-50 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">{st.rating} ★</span>
                        </td>
                        <td className="py-3 pr-3 font-bold text-slate-900">{st.score}</td>
                        <td className="py-3 pr-3">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${grade.cls}`}>{grade.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {staffList.length === 0 && (
                    <tr><td colSpan={9} className="text-center py-8 text-slate-300">No staff data yet</td></tr>
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