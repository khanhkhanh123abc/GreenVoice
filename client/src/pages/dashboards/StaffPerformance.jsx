import { useState } from "react";
import "../../styles/Dashboards.css";
import { useAnalytics } from "../../hooks/useAnalytics";
import Layout from "../../components/common/Layout";
import Topbar from "../../components/navigation/Topbar";
import { StatCard, ChartCard, HBarChart, LineChart, StackedBarChart, ScatterChart, RankBadge, Loader } from "../../components/common/Charts";
import { downloadCSV, downloadZIP, getPerformanceFiles } from "../../utils/downloadUtils";

function getGrade(score) {
  if (score >= 90) return { label: "A+", cls: "bg-emerald-50 text-emerald-700" };
  if (score >= 80) return { label: "A",  cls: "bg-blue-50 text-blue-700" };
  if (score >= 70) return { label: "B",  cls: "bg-yellow-50 text-yellow-700" };
  if (score >= 60) return { label: "C",  cls: "bg-orange-50 text-orange-700" };
  return               { label: "D",  cls: "bg-red-50 text-red-700" };
}

export default function StaffPerformance() {
  const { data, loading, error, lastUpdated } = useAnalytics("performance");

  const [dlState, setDlState] = useState(null);

  const handleCSV = () => {
    if (!data) return;
    setDlState("csv");
    downloadCSV(data.staffList, ["name","dept","ideas","votes","views","comments","totalFeedbacks","avgRating","score"], "staff_performance.csv");
    setTimeout(() => setDlState(null), 800);
  };

  const handleZIP = () => {
    if (!data) return;
    setDlState("zip");
    downloadZIP(getPerformanceFiles(data), "staff_performance.zip");
    setTimeout(() => setDlState(null), 1000);
  };

  return (
    <Layout>
      <Topbar title="Staff Performance Evaluation" />
      <main className="flex-1 p-6 bg-slate-50 overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Staff Performance Evaluation</h1>
            <p className="text-sm text-slate-500 mt-1">
              Real-time performance evaluation based on contributions, engagement and student feedback.
            </p>
          </div>
          <div className="dash-header-right">
            {lastUpdated && (
              <div className="text-xs text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-full">
                🟢 Live · {lastUpdated.toLocaleTimeString()}
              </div>
            )}
            {data && (
              <div className="dash-actions">
                <button
                  onClick={handleCSV}
                  disabled={!!dlState}
                  className={`dash-btn-csv${dlState==="csv"?" downloading":""}`}
                >
                  {dlState === "csv" ? "⏳ Downloading..." : "📥 Download CSV"}
                </button>
                <button
                  onClick={handleZIP}
                  disabled={!!dlState}
                  className={`dash-btn-zip${dlState==="zip"?" zipping":""}`}
                >
                  {dlState === "zip" ? "⏳ Zipping..." : "📦 Download ZIP"}
                </button>
              </div>
            )}
          </div>
        </div>

        {loading ? <Loader /> : error ? <Err msg={error} /> : (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <StatCard icon="🏆" label="Top Performer"   value={data.staffList[0]?.name?.split(" ").slice(0,2).join(" ") || "—"} color="#F59E0B" />
              <StatCard icon="📊" label="Avg Score"       value={`${data.avgScore}/100`}  color="#3B82F6" />
              <StatCard icon="👥" label="Staff Evaluated" value={data.staffList.length}    color="#10B981" />
              <StatCard icon="💬" label="With Feedback"   value={data.staffList.filter(s => s.totalFeedbacks > 0).length} color="#8B5CF6" />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <ChartCard title="Performance Ranking" subtitle="Overall score out of 100">
                {data.staffList.length > 0 ? (
                  <HBarChart
                    data={data.staffList.slice(0, 8).map(s => ({ label: s.name.split(" ")[0], value: s.score }))}
                    color="#3B82F6"
                  />
                ) : <Empty />}
              </ChartCard>
              <ChartCard title="Performance Trend" subtitle="Avg team score per month">
                <LineChart data={data.perfTrend} color="#10B981" height={200} />
              </ChartCard>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <ChartCard title="Score Breakdown" subtitle="Components: Ideas · Votes · Engagement · Student Feedback">
                {data.staffList.length > 0 ? (
                  <StackedBarChart
                    data={data.staffList.slice(0, 8).map(s => ({
                      label:      s.name.split(" ")[0],
                      "Ideas":    s.ideaComponent,
                      "Votes":    s.voteComponent,
                      "Engage":   s.engageComponent,
                      "Feedback": s.feedbackComponent,
                    }))}
                    keys={["Ideas","Votes","Engage","Feedback"]}
                    colors={["#3B82F6","#F59E0B","#10B981","#8B5CF6"]}
                    height={180}
                  />
                ) : <Empty />}
              </ChartCard>
              <ChartCard title="Contribution vs Rating" subtitle="Ideas submitted vs real student rating">
                {data.scatterData.length > 0 ? (
                  <ScatterChart data={data.scatterData} xLabel="Ideas Submitted" yLabel="Avg Rating (real)" color="#8B5CF6" />
                ) : (
                  <div className="text-center py-10 text-slate-300 text-sm">
                    No student feedback submitted yet — ratings will appear here once students rate their staff
                  </div>
                )}
              </ChartCard>
            </div>

            {/* Full performance table */}
            <ChartCard title="Full Performance Table" subtitle="Detailed breakdown for all evaluated staff">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Rank","Staff","Ideas","Votes","Engagement","Feedbacks","Avg Rating","Score","Grade"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-400 pb-3 pr-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.staffList.map((st, i) => {
                    const grade = getGrade(st.score);
                    return (
                      <tr key={st.name} className="border-b border-slate-50">
                        <td className="py-3 pr-3"><RankBadge rank={i + 1} /></td>
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 text-xs font-bold flex items-center justify-center">
                              {st.name[0]}
                            </div>
                            <div>
                              <div className="font-medium text-slate-800">{st.name}</div>
                              <div className="text-xs text-slate-400">{st.dept}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-3 font-semibold text-blue-600">{st.ideas}</td>
                        <td className="py-3 pr-3 font-semibold text-amber-500">{st.votes}</td>
                        <td className="py-3 pr-3 font-semibold text-emerald-500">{st.views + st.comments + st.reactions}</td>
                        <td className="py-3 pr-3 font-semibold text-slate-600">{st.totalFeedbacks}</td>
                        <td className="py-3 pr-3">
                          {st.avgRating !== null ? (
                            <span className="bg-yellow-50 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">
                              {st.avgRating} ★
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">No feedback</span>
                          )}
                        </td>
                        <td className="py-3 pr-3">
                          <div className="dash-score-cell">
                            <span className="font-bold text-slate-900">{st.score}</span>
                            <div className="dash-score-bar-track">
                              <div className="dash-score-bar-fill" style={{ width: `${st.score}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${grade.cls}`}>{grade.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {data.staffList.length === 0 && (
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
function Err({ msg }) { return <div className="text-center py-20 text-red-400">⚠ {msg}</div>; }
function Empty() { return <div className="text-center py-10 text-slate-300 text-sm">No data yet</div>; }
