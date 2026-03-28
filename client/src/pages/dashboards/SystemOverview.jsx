import { useState } from "react";
import "../../styles/Dashboards.css";
import { useAnalytics } from "../../hooks/useAnalytics";
import Layout from "../../components/Layout";
import Topbar from "../../components/Topbar";
import { StatCard, ChartCard, LineChart, BarChart, Loader } from "../../components/Charts";
import { downloadCSV, downloadZIP, getSystemFiles } from "../../utils/downloadUtils";

export default function SystemOverview() {
  const { data, loading, error, lastUpdated } = useAnalytics("system");

  const [dlState, setDlState] = useState(null);

  const handleCSV = () => {
    if (!data) return;
    setDlState("csv");
    downloadCSV(data.monthlyTable, ["month","ideas","votes","comments"], "system_overview.csv");
    setTimeout(() => setDlState(null), 800);
  };

  const handleZIP = () => {
    if (!data) return;
    setDlState("zip");
    downloadZIP(getSystemFiles(data), "system_overview.zip");
    setTimeout(() => setDlState(null), 1000);
  };

  return (
    <Layout>
      <Topbar title="System Overview" />
      <main className="flex-1 p-6 bg-slate-50 overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">System Overview</h1>
            <p className="text-sm text-slate-500 mt-1">Real-time platform health and activity metrics.</p>
          </div>
          <div className="dash-header-right">
            {lastUpdated && (
              <div className="dash-live-badge">
                <span className="dash-live-dot" />
                Live · {lastUpdated.toLocaleTimeString()}
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

        {loading ? <Loader /> : error ? <Error msg={error} /> : (
          <>
            <div className="grid grid-cols-6 gap-4 mb-6">
              <StatCard icon="👥" label="Total Staff"      value={data.stats.totalStaff}     color="#3B82F6" />
              <StatCard icon="🎓" label="Total Students"   value={data.stats.totalStudents}   color="#10B981" />
              <StatCard icon="💡" label="Total Ideas"      value={data.stats.totalIdeas}      color="#F59E0B" delta="+real" />
              <StatCard icon="👍" label="Total Votes"      value={data.stats.totalVotes}      color="#8B5CF6" />
              <StatCard icon="💬" label="Total Comments"   value={data.stats.totalComments}   color="#EF4444" />
              <StatCard icon="❤️" label="Total Reactions"  value={data.stats.totalReactions}  color="#F97316" />
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="col-span-2">
                <ChartCard title="Activity Trend" subtitle="Ideas submitted per month (last 6 months)">
                  <LineChart data={data.activityTrend} color="#3B82F6" height={180} />
                </ChartCard>
              </div>
              <ChartCard title="Votes Trend" subtitle="Total votes per month">
                <LineChart data={data.votesTrend} color="#8B5CF6" height={180} />
              </ChartCard>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <ChartCard title="Ideas by Topic" subtitle="Academic vs Support">
                <BarChart data={data.byTopic} colors={["#3B82F6","#10B981"]} height={160} />
              </ChartCard>
              <div className="col-span-2">
                <ChartCard title="Monthly Activity Summary">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {["Month","Ideas","Votes","Comments"].map(h => (
                          <th key={h} className="text-left text-xs font-semibold text-slate-400 pb-3 pr-6">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.monthlyTable.map((row, i) => (
                        <tr key={i} className="border-b border-slate-50">
                          <td className="py-2.5 pr-6 text-slate-600 font-medium">{row.month}</td>
                          <td className="py-2.5 pr-6 font-bold text-blue-600">{row.ideas}</td>
                          <td className="py-2.5 pr-6 font-bold text-purple-600">{row.votes}</td>
                          <td className="py-2.5 pr-6 font-bold text-rose-500">{row.comments}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ChartCard>
              </div>
            </div>
          </>
        )}
      </main>
    </Layout>
  );
}

function Error({ msg }) {
  return <div className="text-center py-20 text-red-400">⚠ {msg}</div>;
}
