import { useState, useEffect } from "react";
import api from "../../api/axiosInstance";
import Layout from "../../components/Layout";
import Topbar from "../../components/Topbar";
import { StatCard, ChartCard, BarChart, DonutChart, HBarChart, RankBadge, Loader } from "../../components/Charts";

export default function StaffContribution() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/ideas?limit=500")
      .then(({ data }) => setIdeas(data.ideas || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Ideas by Department
  const byDept = ideas.reduce((acc, idea) => {
    const dept = idea.authorId?.department || idea.authorId?.role || "Unknown";
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});
  const deptData = Object.entries(byDept)
    .map(([label, value]) => ({ label: label.length > 14 ? label.slice(0, 12) + ".." : label, value }))
    .sort((a, b) => b.value - a.value).slice(0, 8);

  // Ideas by Topic
  const byTopic = ideas.reduce((acc, i) => { acc[i.topicType] = (acc[i.topicType] || 0) + 1; return acc; }, {});
  const topicData = [
    { label: "Academic Topics", value: byTopic["Academic"] || 0, color: "#3B82F6" },
    { label: "Support Topics",  value: byTopic["Support"]  || 0, color: "#10B981" },
  ];

  // Top contributors
  const byContrib = ideas.reduce((acc, idea) => {
    if (idea.isAnonymous || !idea.authorId?.name) return acc;
    const name = idea.authorId.name;
    if (!acc[name]) acc[name] = { count: 0, votes: 0, dept: idea.authorId?.department || "—" };
    acc[name].count += 1;
    acc[name].votes += idea.votes || 0;
    return acc;
  }, {});
  const topContrib = Object.entries(byContrib)
    .map(([name, d]) => ({ label: name, value: d.count, votes: d.votes, dept: d.dept }))
    .sort((a, b) => b.value - a.value).slice(0, 8);

  const totalContribs = Object.keys(byContrib).length;
  const avgIdeas = totalContribs > 0 ? (ideas.length / totalContribs).toFixed(1) : 0;
  const topDept = deptData[0]?.label || "—";

  return (
    <Layout>
      <Topbar title="Staff Contribution Dashboard" />
      <main className="flex-1 p-6 bg-slate-50 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Staff Contribution Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Track staff idea contributions and engagement across departments.</p>
        </div>

        {loading ? <Loader /> : (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <StatCard icon="💡" label="Total Ideas"        value={ideas.length}    color="#3B82F6" />
              <StatCard icon="👥" label="Contributors"       value={totalContribs}   color="#10B981" />
              <StatCard icon="📊" label="Avg Ideas / Staff"  value={avgIdeas}        color="#F59E0B" />
              <StatCard icon="🏆" label="Top Department"     value={topDept}         color="#8B5CF6" />
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="col-span-2">
                <ChartCard title="Ideas by Department" subtitle="Number of ideas submitted per department">
                  <BarChart data={deptData} colors={["#3B82F6","#60A5FA","#93C5FD","#BFDBFE","#1D4ED8","#1E40AF","#6366F1","#818CF8"]} height={180} />
                </ChartCard>
              </div>
              <ChartCard title="Ideas by Topic Type" subtitle="Academic vs Support distribution">
                <DonutChart data={topicData} size={150} />
              </ChartCard>
            </div>

            <div className="mb-4">
              <ChartCard title="Top Idea Contributors" subtitle="Staff ranked by ideas submitted">
                {topContrib.length > 0
                  ? <HBarChart data={topContrib.map(d => ({ label: d.label, value: d.value }))} color="#3B82F6" />
                  : <div className="text-center py-10 text-slate-300 text-sm">No data yet</div>
                }
              </ChartCard>
            </div>

            <ChartCard title="Contributor Details" subtitle="Full list of contributing staff">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Rank","Staff","Department","Ideas","Votes Received","Topic"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-400 pb-3 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topContrib.map((c, i) => {
                    const staffIdeas = ideas.filter(idea => idea.authorId?.name === c.label);
                    const topTopic = Object.entries(
                      staffIdeas.reduce((acc, idea) => { acc[idea.topicType] = (acc[idea.topicType] || 0) + 1; return acc; }, {})
                    ).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
                    return (
                      <tr key={c.label} className="border-b border-slate-50">
                        <td className="py-3 pr-4"><RankBadge rank={i + 1} /></td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold flex items-center justify-center">{c.label[0]}</div>
                            <span className="font-medium text-slate-800">{c.label}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-slate-500 text-xs">{c.dept}</td>
                        <td className="py-3 pr-4 font-bold text-blue-600">{c.value}</td>
                        <td className="py-3 pr-4 font-semibold text-amber-500">{c.votes}</td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${topTopic === "Academic" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"}`}>
                            {topTopic}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {topContrib.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-8 text-slate-300">No data yet</td></tr>
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