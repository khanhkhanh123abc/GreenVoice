import { useState } from "react";
import "../../styles/Dashboards.css";
import { useAnalytics } from "../../hooks/useAnalytics";
import Layout from "../../components/common/Layout";
import Topbar from "../../components/navigation/Topbar";
import { StatCard, ChartCard, HBarChart, DonutChart, LineChart, RankBadge, Loader } from "../../components/common/Charts";
import { downloadCSV, downloadZIP, getTeachingFiles } from "../../utils/downloadUtils";

function StarRow({ value, max = 5 }) {
  return (
    <div className="dash-star-row">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < Math.round(value) ? "dash-star-filled" : "dash-star-empty"}>★</span>
      ))}
    </div>
  );
}

function DataBadge({ isReal }) {
  return (
    <span className={`dash-data-badge ${isReal ? "real" : "no-data"}`}>
      {isReal ? "✓ Real feedback data" : "⚠ No feedback yet"}
    </span>
  );
}

export default function TeachingQuality() {
  const { data, loading, error, lastUpdated } = useAnalytics("teaching");

  const [dlState, setDlState] = useState(null);

  const handleCSV = () => {
    if (!data) return;
    setDlState("csv");
    downloadCSV(data.lecturerRating, ["name","dept","ideasCount","totalVotes","totalFeedbacks","avgRating"], "teaching_quality.csv");
    setTimeout(() => setDlState(null), 800);
  };

  const handleZIP = () => {
    if (!data) return;
    setDlState("zip");
    downloadZIP(getTeachingFiles(data), "teaching_quality.zip");
    setTimeout(() => setDlState(null), 1000);
  };

  return (
    <Layout>
      <Topbar title="Teaching Quality Dashboard" />
      <main className="flex-1 p-6 bg-slate-50 overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Teaching Quality Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">
              Ratings from real student feedback · Ideas & engagement metrics
            </p>
          </div>
          <div className="dash-header-right">
            {lastUpdated && (
              <div className="dash-live-badge">
                <span className="dash-live-dot" />
                Live · {lastUpdated.toLocaleTimeString()}
              </div>
            )}
            {data && <DataBadge isReal={data.dataSource === "real_feedback"} />}
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
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <StatCard
                icon="⭐"
                label="Avg Rating (Real)"
                value={data.avgRating !== null ? `${data.avgRating} / 5` : "No data"}
                color="#F59E0B"
              />
              <StatCard icon="💬" label="Total Feedbacks"   value={data.totalFeedbacks}  color="#3B82F6" />
              <StatCard icon="👨‍🏫" label="Lecturers Rated"  value={data.totalLecturers}   color="#10B981" />
              <StatCard icon="💡" label="Total Ideas"       value={data.totalIdeas}       color="#8B5CF6" />
            </div>

            {/* Charts row 1 */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <ChartCard
                title="Lecturer Rating"
                subtitle={data.dataSource === "real_feedback"
                  ? "⭐ Average rating from real student feedback (1–5)"
                  : "⚠ No student feedback yet — submit feedback to see real ratings"}
              >
                {data.lecturerRating.filter(l => l.avgRating !== null).length > 0 ? (
                  <HBarChart
                    data={data.lecturerRating
                      .filter(l => l.avgRating !== null)
                      .slice(0, 8)
                      .map(l => ({ label: l.name, value: l.avgRating }))}
                    color="#F59E0B"
                  />
                ) : (
                  <div className="text-center py-10 text-slate-300 text-sm">
                    No student feedback submitted yet
                  </div>
                )}
              </ChartCard>

              <ChartCard
                title="Rating Distribution"
                subtitle="Real star ratings from students (1–5)"
              >
                {data.ratingDist.filter(d => d.value > 0).length > 0 ? (
                  <DonutChart
                    data={data.ratingDist.filter(d => d.value > 0).map((d, i) => ({
                      label: d.label,
                      value: d.value,
                      color: ["#10B981","#3B82F6","#F59E0B","#F97316","#EF4444"][i],
                    }))}
                    size={150}
                  />
                ) : (
                  <div className="text-center py-10 text-slate-300 text-sm">No rating data yet</div>
                )}
              </ChartCard>
            </div>

            {/* Charts row 2 */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <ChartCard
                title="Student Feedback Count"
                subtitle="Number of feedbacks submitted per month"
              >
                <LineChart data={data.feedbackTrend} color="#3B82F6" height={160} />
              </ChartCard>

              <ChartCard
                title="Avg Rating Trend"
                subtitle="Monthly average star rating from students"
              >
                <LineChart data={data.ratingTrend} color="#F59E0B" height={160} />
              </ChartCard>
            </div>

            {/* Lecturer detail table */}
            <ChartCard
              title="Lecturer Detail"
              subtitle="Combined: real student rating + idea contributions"
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Rank","Lecturer","Dept","Ideas","Votes","Feedbacks","Avg Rating","Rating Breakdown"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-400 pb-3 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.lecturerRating.map((l, i) => (
                    <tr key={l.id || l.name} className="border-b border-slate-50">
                      <td className="py-3 pr-4"><RankBadge rank={i + 1} /></td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center">
                            {l.name[0]}
                          </div>
                          <span className="font-medium text-slate-800">{l.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-400 text-xs">{l.dept}</td>
                      <td className="py-3 pr-4 font-semibold text-blue-600">{l.ideasCount}</td>
                      <td className="py-3 pr-4 font-semibold text-purple-500">{l.totalVotes}</td>
                      <td className="py-3 pr-4 font-semibold text-slate-600">{l.totalFeedbacks}</td>
                      <td className="py-3 pr-4">
                        {l.avgRating !== null ? (
                          <div className="dash-rating-cell">
                            <span className="bg-yellow-50 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">
                              {l.avgRating} ★
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">No feedback</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {l.stars && l.totalFeedbacks > 0 ? (
                          <div className="dash-star-breakdown">
                            {l.stars.filter(s => s.count > 0).map(s => (
                              <div key={s.star} className="dash-star-item">
                                <span className="dash-star-item-label">{s.star}★</span>
                                <div className="dash-star-track">
                                  <div className="dash-star-fill" style={{ width: `${(s.count / l.totalFeedbacks) * 100}%` }} />
                                </div>
                                <span className="dash-star-count">{s.count}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {data.lecturerRating.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-8 text-slate-300">No data yet</td></tr>
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
