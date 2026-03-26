import { useState, useEffect } from "react";
import api from "../../api/axiosInstance";
import Layout from "../../components/Layout";
import Topbar from "../../components/Topbar";
import { StatCard, ChartCard, HBarChart, LineChart, Loader } from "../../components/Charts";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function IdeaEngagement() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/ideas?limit=500")
      .then(({ data }) => setIdeas(data.ideas || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const mostVoted = [...ideas]
    .sort((a, b) => b.votes - a.votes).slice(0, 8)
    .map(i => ({ label: i.title.length > 22 ? i.title.slice(0, 20) + ".." : i.title, value: i.votes }));

  const mostCommented = [...ideas]
    .sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0)).slice(0, 8)
    .map(i => ({ label: i.title.length > 22 ? i.title.slice(0, 20) + ".." : i.title, value: i.comments?.length || 0 }));

  const now = new Date();
  const reactionTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return {
      label: MONTHS[d.getMonth()],
      value: ideas.filter(idea => {
        const c = new Date(idea.createdAt);
        return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear();
      }).reduce((s, idea) => s + (idea.reactions || 0) + (idea.likes?.length || 0), 0),
    };
  });

  const viewTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return {
      label: MONTHS[d.getMonth()],
      value: ideas.filter(idea => {
        const c = new Date(idea.createdAt);
        return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear();
      }).reduce((s, idea) => s + (idea.views || 0), 0),
    };
  });

  const totalVotes     = ideas.reduce((s, i) => s + (i.votes || 0), 0);
  const totalViews     = ideas.reduce((s, i) => s + (i.views || 0), 0);
  const totalReactions = ideas.reduce((s, i) => s + (i.reactions || 0) + (i.likes?.length || 0), 0);
  const totalComments  = ideas.reduce((s, i) => s + (i.comments?.length || 0), 0);
  const avgVotes       = ideas.length > 0 ? (totalVotes / ideas.length).toFixed(1) : 0;

  const topIdeas = [...ideas]
    .map(i => ({ ...i, score: (i.votes || 0) * 3 + (i.views || 0) + (i.reactions || 0) * 2 + (i.likes?.length || 0) * 2 + (i.comments?.length || 0) * 4 }))
    .sort((a, b) => b.score - a.score).slice(0, 10);

  return (
    <Layout>
      <Topbar title="Idea Engagement Dashboard" />
      <main className="flex-1 p-6 bg-slate-50 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Idea Engagement Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Measure discussion levels and community interest in submitted ideas.</p>
        </div>

        {loading ? <Loader /> : (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <StatCard icon="👍" label="Total Votes"      value={totalVotes}     color="#3B82F6" delta="+8%" />
              <StatCard icon="👁" label="Total Views"      value={totalViews}     color="#10B981" />
              <StatCard icon="💬" label="Total Comments"   value={totalComments}  color="#EF4444" />
              <StatCard icon="❤️" label="Total Reactions"  value={totalReactions} color="#F97316" />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <ChartCard title="Most Voted Ideas" subtitle="Top ideas ranked by votes received">
                {mostVoted.length > 0
                  ? <HBarChart data={mostVoted} color="#3B82F6" />
                  : <div className="text-center py-10 text-slate-300 text-sm">No data yet</div>
                }
              </ChartCard>
              <ChartCard title="Comment Activity" subtitle="Ideas with the most comments">
                {mostCommented.filter(d => d.value > 0).length > 0
                  ? <HBarChart data={mostCommented.filter(d => d.value > 0)} color="#EF4444" />
                  : <div className="text-center py-10 text-slate-300 text-sm">No comments yet</div>
                }
              </ChartCard>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <ChartCard title="Reaction Trend" subtitle="Likes & reactions per month (last 6 months)">
                <LineChart data={reactionTrend} color="#EF4444" height={180} />
              </ChartCard>
              <ChartCard title="View Trend" subtitle="Total views per month (last 6 months)">
                <LineChart data={viewTrend} color="#10B981" height={180} />
              </ChartCard>
            </div>

            <ChartCard title="Top Engaged Ideas" subtitle="Ranked by combined engagement score (votes×3 + comments×4 + views + reactions×2)">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["#","Idea","Type","Votes","Views","Comments","Reactions","Score"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-400 pb-3 pr-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topIdeas.map((idea, i) => (
                    <tr key={idea._id} className="border-b border-slate-50">
                      <td className="py-2.5 pr-3 text-slate-400 text-xs">{i + 1}</td>
                      <td className="py-2.5 pr-3 max-w-[180px]">
                        <div className="font-medium text-slate-800 truncate">{idea.title}</div>
                        <div className="text-xs text-slate-400">{idea.isAnonymous ? "Anonymous" : idea.authorId?.name}</div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${idea.topicType === "Academic" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"}`}>
                          {idea.topicType}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 font-semibold text-blue-600">{idea.votes}</td>
                      <td className="py-2.5 pr-3 font-semibold text-emerald-600">{idea.views}</td>
                      <td className="py-2.5 pr-3 font-semibold text-rose-500">{idea.comments?.length || 0}</td>
                      <td className="py-2.5 pr-3 font-semibold text-orange-500">{(idea.reactions || 0) + (idea.likes?.length || 0)}</td>
                      <td className="py-2.5 pr-3">
                        <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2.5 py-1 rounded-full">{idea.score}</span>
                      </td>
                    </tr>
                  ))}
                  {topIdeas.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-8 text-slate-300">No ideas yet</td></tr>
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