import { useState } from "react";
import "../../styles/Dashboards.css";
import { useAnalytics } from "../../hooks/useAnalytics";
import Layout from "../../components/common/Layout";
import Topbar from "../../components/navigation/Topbar";
import { StatCard, ChartCard, HBarChart, LineChart, Loader } from "../../components/common/Charts";
import { downloadCSV, downloadZIP, getEngagementFiles } from "../../utils/downloadUtils";

export default function IdeaEngagement() {
  const { data, loading, error, lastUpdated } = useAnalytics("engagement");

  const [dlState, setDlState] = useState(null);

  const handleCSV = () => {
    if (!data) return;
    setDlState("csv");
    downloadCSV(data.topEngaged, ["title","author","topicType","votes","views","comments","reactions","score"], "idea_engagement.csv");
    setTimeout(() => setDlState(null), 800);
  };

  const handleZIP = () => {
    if (!data) return;
    setDlState("zip");
    downloadZIP(getEngagementFiles(data), "idea_engagement.zip");
    setTimeout(() => setDlState(null), 1000);
  };

  return (
    <Layout>
      <Topbar title="Idea Engagement Dashboard" />
      <main className="flex-1 p-6 bg-slate-50 overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Idea Engagement Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Real-time engagement metrics — votes, views, comments, reactions.</p>
          </div>
          <div className="dash-header-right">
          {lastUpdated && (
              <div className="text-xs text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-full">
                🟢 Live · {lastUpdated.toLocaleTimeString()}
              </div>
            )}
            {data && (
              <div className="dash-actions">
                <button onClick={handleCSV} disabled={!!dlState} className={`dash-btn-csv${dlState==="csv"?" downloading":""}`}>
                  {dlState==="csv" ? "⏳ Downloading..." : "📥 Download CSV"}
                </button>
                <button onClick={handleZIP} disabled={!!dlState} className={`dash-btn-zip${dlState==="zip"?" zipping":""}`}>
                  {dlState==="zip" ? "⏳ Zipping..." : "📦 Download ZIP"}
                </button>
              </div>
            )}
          </div>
        </div>

        {loading ? <Loader /> : error ? <Err msg={error} /> : (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <StatCard icon="👍" label="Total Votes"      value={data.stats.totalVotes}     color="#3B82F6" />
              <StatCard icon="👁"  label="Total Views"      value={data.stats.totalViews}     color="#10B981" />
              <StatCard icon="💬" label="Total Comments"   value={data.stats.totalComments}  color="#EF4444" />
              <StatCard icon="❤️" label="Total Reactions"  value={data.stats.totalReactions} color="#F97316" />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <ChartCard title="Most Voted Ideas" subtitle="Top ideas by vote count — real data">
                {data.mostVoted.filter(d=>d.value>0).length>0
                  ? <HBarChart data={data.mostVoted.map(d=>({ label:d.title.length>22?d.title.slice(0,20)+"..":d.title, value:d.value }))} color="#3B82F6" />
                  : <Empty />
                }
              </ChartCard>
              <ChartCard title="Comment Activity" subtitle="Ideas with the most comments — real data">
                {data.mostCommented.filter(d=>d.value>0).length>0
                  ? <HBarChart data={data.mostCommented.filter(d=>d.value>0).map(d=>({ label:d.title.length>22?d.title.slice(0,20)+"..":d.title, value:d.value }))} color="#EF4444" />
                  : <Empty />
                }
              </ChartCard>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <ChartCard title="Reaction Trend" subtitle="Likes & reactions per month (last 6 months)">
                <LineChart data={data.reactionTrend} color="#EF4444" height={180} />
              </ChartCard>
              <ChartCard title="View Trend" subtitle="Total views per month (last 6 months)">
                <LineChart data={data.viewTrend} color="#10B981" height={180} />
              </ChartCard>
            </div>

            <ChartCard title="Top Engaged Ideas" subtitle="Combined score = votes×3 + comments×4 + views + reactions×2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["#","Idea","Type","Votes","Views","Comments","Reactions","Score"].map(h=>(
                      <th key={h} className="text-left text-xs font-semibold text-slate-400 pb-3 pr-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.topEngaged.map((idea,i)=>(
                    <tr key={idea.id} className="border-b border-slate-50">
                      <td className="py-2.5 pr-3 text-slate-400 text-xs font-medium">{i+1}</td>
                      <td className="py-2.5 pr-3 max-w-[180px]">
                        <div className="font-medium text-slate-800 truncate">{idea.title}</div>
                        <div className="text-xs text-slate-400">{idea.author}</div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${idea.topicType==="Academic"?"bg-blue-50 text-blue-600":"bg-emerald-50 text-emerald-600"}`}>{idea.topicType}</span>
                      </td>
                      <td className="py-2.5 pr-3 font-semibold text-blue-600">{idea.votes}</td>
                      <td className="py-2.5 pr-3 font-semibold text-emerald-600">{idea.views}</td>
                      <td className="py-2.5 pr-3 font-semibold text-rose-500">{idea.comments}</td>
                      <td className="py-2.5 pr-3 font-semibold text-orange-500">{idea.reactions}</td>
                      <td className="py-2.5 pr-3"><span className="bg-blue-50 text-blue-600 text-xs font-bold px-2.5 py-1 rounded-full">{idea.score}</span></td>
                    </tr>
                  ))}
                  {data.topEngaged.length===0&&<tr><td colSpan={8} className="text-center py-8 text-slate-300">No ideas yet</td></tr>}
                </tbody>
              </table>
            </ChartCard>
          </>
        )}
      </main>
    </Layout>
  );
}
function LiveBadge({ time }) { return <div className="text-xs text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-full">🟢 Live · {time.toLocaleTimeString()}</div>; }
function Err({ msg }) { return <div className="text-center py-20 text-red-400">⚠ {msg}</div>; }
function Empty() { return <div className="text-center py-10 text-slate-300 text-sm">No data yet</div>; }
