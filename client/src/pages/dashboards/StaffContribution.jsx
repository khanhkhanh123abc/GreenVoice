import { useState } from "react";
import "../../styles/Dashboards.css";
import { useAnalytics } from "../../hooks/useAnalytics";
import Layout from "../../components/Layout";
import Topbar from "../../components/Topbar";
import { StatCard, ChartCard, BarChart, DonutChart, HBarChart, RankBadge, Loader } from "../../components/Charts";
import { downloadCSV, downloadZIP, getContributionFiles } from "../../utils/downloadUtils";

export default function StaffContribution() {
  const { data, loading, error, lastUpdated } = useAnalytics("staff-contribution");

  const [dlState, setDlState] = useState(null);

  const handleCSV = () => {
    if (!data) return;
    setDlState("csv");
    downloadCSV(data.topContributors, ["name","dept","role","count","votes"], "staff_contribution.csv");
    setTimeout(() => setDlState(null), 800);
  };

  const handleZIP = () => {
    if (!data) return;
    setDlState("zip");
    downloadZIP(getContributionFiles(data), "staff_contribution.zip");
    setTimeout(() => setDlState(null), 1000);
  };

  return (
    <Layout>
      <Topbar title="Staff Contribution Dashboard" />
      <main className="flex-1 p-6 bg-slate-50 overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Staff Contribution Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Real-time tracking of staff idea contributions across departments.</p>
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
              <StatCard icon="💡" label="Total Ideas"        value={data.totalIdeas}         color="#3B82F6" />
              <StatCard icon="👥" label="Contributors"       value={data.totalContributors}  color="#10B981" />
              <StatCard icon="📊" label="Avg Ideas / Staff"  value={data.totalContributors>0?(data.totalIdeas/data.totalContributors).toFixed(1):0} color="#F59E0B" />
              <StatCard icon="🏆" label="Top Department"     value={data.byDept[0]?.label||"—"} color="#8B5CF6" />
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="col-span-2">
                <ChartCard title="Ideas by Department" subtitle="Number of ideas submitted per department — real data">
                  <BarChart data={data.byDept.slice(0,8)} colors={["#3B82F6","#60A5FA","#93C5FD","#BFDBFE","#1D4ED8","#1E40AF","#6366F1","#818CF8"]} height={180} />
                </ChartCard>
              </div>
              <ChartCard title="Ideas by Topic Type" subtitle="Academic vs Support">
                <DonutChart data={data.byTopic.filter(d=>d.value>0)} size={150} />
              </ChartCard>
            </div>

            <div className="mb-4">
              <ChartCard title="Top Idea Contributors" subtitle="Staff ranked by total ideas submitted">
                {data.topContributors.length>0
                  ? <HBarChart data={data.topContributors.slice(0,8).map(d=>({ label:d.name, value:d.count }))} color="#3B82F6" />
                  : <div className="text-center py-10 text-slate-300 text-sm">No data yet</div>
                }
              </ChartCard>
            </div>

            <ChartCard title="Contributor Details" subtitle="Full list of contributing staff — from database">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Rank","Staff","Department","Role","Ideas","Votes"].map(h=>(
                      <th key={h} className="text-left text-xs font-semibold text-slate-400 pb-3 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.topContributors.map((c,i)=>(
                    <tr key={c.name} className="border-b border-slate-50">
                      <td className="py-3 pr-4"><RankBadge rank={i+1} /></td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold flex items-center justify-center">{c.name[0]}</div>
                          <span className="font-medium text-slate-800">{c.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-500 text-xs">{c.dept}</td>
                      <td className="py-3 pr-4 text-slate-500 text-xs">{c.role}</td>
                      <td className="py-3 pr-4 font-bold text-blue-600">{c.count}</td>
                      <td className="py-3 pr-4 font-semibold text-amber-500">{c.votes}</td>
                    </tr>
                  ))}
                  {data.topContributors.length===0&&<tr><td colSpan={6} className="text-center py-8 text-slate-300">No data yet</td></tr>}
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
