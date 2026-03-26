import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Topbar from "../components/Topbar";
import {
  Flag, Plus, CheckCircle, XCircle, Clock, ChevronDown,
  ChevronUp, Trash2, X, ChevronLeft, ChevronRight
} from "lucide-react";
import {
  getAllReports, createReport, approveReport,
  rejectReport, deleteReport
} from "../api/reportAPI";

const STATUS_CONFIG = {
  pending: { label: "Pending", bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200", icon: <Clock size={12} /> },
  approved: { label: "Approved", bg: "bg-green-50", text: "text-green-600", border: "border-green-200", icon: <CheckCircle size={12} /> },
  rejected: { label: "Rejected", bg: "bg-red-50", text: "text-red-600", border: "border-red-200", icon: <XCircle size={12} /> },
};
const REPORT_TYPES = ["idea", "user", "comment", "learning_material", "other"];

export default function Reports() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Administrator";
  const isQAC = user?.role === "QA Coordinator";

  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [expanded, setExpanded] = useState(null);

  const [modal, setModal] = useState(null); // "create" | "action" | "delete"
  const [selected, setSelected] = useState(null);
  const [actionType, setActionType] = useState(""); // "approve" | "reject"
  const [adminNote, setAdminNote] = useState("");
  const [form, setForm] = useState({ title: "", content: "", type: "idea", targetId: "" });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchReports = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (filterStatus) params.status = filterStatus;
      const { data } = await getAllReports(params);
      setReports(data.reports || []);
      setPagination({ ...data.pagination, page });
    } catch { setReports([]); }
    finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { fetchReports(1); }, [fetchReports]);

  const closeModal = () => { setModal(null); setSelected(null); setFormError(""); setAdminNote(""); };

  const handleCreate = async (e) => {
    e.preventDefault(); setFormError(""); setFormLoading(true);
    try {
      const payload = { title: form.title, content: form.content, type: form.type };
      if (form.targetId.trim()) payload.targetId = form.targetId.trim();
      await createReport(payload);
      closeModal(); fetchReports(1);
    } catch (err) { setFormError(err.response?.data?.message || "Failed to submit report."); }
    finally { setFormLoading(false); }
  };

  const handleAction = async () => {
    setFormLoading(true);
    try {
      if (actionType === "approve") await approveReport(selected._id, adminNote);
      else await rejectReport(selected._id, adminNote);
      closeModal(); fetchReports(pagination.page);
    } catch (err) { setFormError(err.response?.data?.message || "Action failed."); }
    finally { setFormLoading(false); }
  };

  const handleDelete = async () => {
    setFormLoading(true);
    try {
      await deleteReport(selected._id);
      closeModal(); fetchReports(1);
    } catch (err) { setFormError(err.response?.data?.message || "Failed to delete."); }
    finally { setFormLoading(false); }
  };

  const openAction = (report, type) => { setSelected(report); setActionType(type); setAdminNote(""); setFormError(""); setModal("action"); };

  const totalPages = Math.ceil((pagination.total || 0) / 10);

  const timeAgo = (date) => {
    const d = Math.floor((Date.now() - new Date(date)) / 1000);
    if (d < 3600) return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    return `${Math.floor(d / 86400)}d ago`;
  };

  const stats = {
    total: pagination.total,
    pending: reports.filter(r => r.status === "pending").length,
    approved: reports.filter(r => r.status === "approved").length,
    rejected: reports.filter(r => r.status === "rejected").length,
  };

  return (
    <Layout>
      <Topbar
        title="Reports"
        onSearch={() => {}}
        showNewIdea={isQAC}
        onNewIdea={() => { setForm({ title: "", content: "", type: "idea", targetId: "" }); setFormError(""); setModal("create"); }}
      />

      <main className="flex-1 p-8 overflow-y-auto">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total", value: stats.total, color: "text-slate-700", bg: "bg-slate-50", border: "border-slate-200" },
            { label: "Pending", value: stats.pending, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
            { label: "Approved", value: stats.approved, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
            { label: "Rejected", value: stats.rejected, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-4`}>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{s.label}</p>
              <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-sm font-semibold text-slate-500">Status:</span>
          {["", "pending", "approved", "rejected"].map(s => {
            const cfg = s ? STATUS_CONFIG[s] : null;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${filterStatus === s ? (s ? `${cfg.bg} ${cfg.text} ${cfg.border}` : "bg-blue-600 text-white border-blue-600") : "bg-white text-slate-500 border-slate-300 hover:border-slate-400"}`}
              >
                {cfg?.icon}
                {s ? STATUS_CONFIG[s].label : "All"}
              </button>
            );
          })}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-1/3 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-slate-400">
            <Flag size={48} className="mb-4 opacity-30" />
            <p className="font-semibold text-lg">No reports found</p>
            {isQAC && <p className="text-sm mt-1">Submit a report using the button above.</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reports.map(report => {
              const cfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;
              const isOpen = expanded === report._id;
              const isOwner = report.senderId?._id === user?._id || report.senderId === user?._id;

              return (
                <div key={report._id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* Row */}
                  <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => setExpanded(isOpen ? null : report._id)}>
                    {/* Status dot */}
                    <div className={`w-2 h-2 rounded-full shrink-0 ${report.status === "pending" ? "bg-amber-400" : report.status === "approved" ? "bg-green-500" : "bg-red-500"}`} />

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-bold text-slate-900 truncate">{report.title}</h3>
                        <span className={`shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                          {cfg.icon}{cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        By <span className="font-semibold text-slate-500">{report.senderId?.name || "?"}</span>
                        {" · "}{timeAgo(report.createdAt)}
                        {" · "}<span className="capitalize bg-slate-100 px-1.5 py-0.5 rounded font-medium">{report.type}</span>
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      {isAdmin && report.status === "pending" && (
                        <>
                          <button onClick={() => openAction(report, "approve")} className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 border border-green-200 text-xs font-bold rounded-lg hover:bg-green-100 transition-colors">
                            <CheckCircle size={12} /> Approve
                          </button>
                          <button onClick={() => openAction(report, "reject")} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors">
                            <XCircle size={12} /> Reject
                          </button>
                        </>
                      )}
                      {(isAdmin || (isOwner && report.status === "pending")) && (
                        <button onClick={() => { setSelected(report); setFormError(""); setModal("delete"); }} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                      <div className="text-slate-300">{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
                    </div>
                  </div>

                  {/* Expanded */}
                  {isOpen && (
                    <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap mb-3">{report.content}</p>
                      {report.targetId && (
                        <p className="text-xs text-slate-400 mb-2">Target ID: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">{report.targetId}</code></p>
                      )}
                      {report.adminNote && (
                        <div className={`text-xs p-3 rounded-lg border ${report.status === "approved" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                          <span className="font-bold">Admin note: </span>{report.adminNote}
                        </div>
                      )}
                      {report.resolvedBy && (
                        <p className="text-xs text-slate-400 mt-2">
                          Resolved by <span className="font-semibold">{report.resolvedBy?.name}</span> · {timeAgo(report.resolvedAt)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-sm text-slate-500 font-medium">
              {(pagination.page - 1) * 10 + 1}–{Math.min(pagination.page * 10, pagination.total)} of {pagination.total}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => fetchReports(pagination.page - 1)} disabled={pagination.page <= 1} className="w-8 h-8 flex items-center justify-center border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors">
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => fetchReports(p)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${p === pagination.page ? "bg-blue-600 text-white border border-blue-600" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{p}</button>
              ))}
              <button onClick={() => fetchReports(pagination.page + 1)} disabled={pagination.page >= totalPages} className="w-8 h-8 flex items-center justify-center border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── CREATE REPORT MODAL ── */}
      {modal === "create" && (
        <Overlay onClose={closeModal}>
          <ModalHeader title="Submit Report" onClose={closeModal} />
          {formError && <ErrorBanner msg={formError} />}
          <form onSubmit={handleCreate} className="space-y-4 mt-4">
            <Field label="Title *">
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="Brief description of the issue" className={inputCls} />
            </Field>
            <Field label="Report Type *">
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={inputCls}>
                {REPORT_TYPES.map(t => (
                  <option key={t} value={t}>{t.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </Field>
            <Field label="Target ID (optional)">
              <input value={form.targetId} onChange={e => setForm({ ...form, targetId: e.target.value })} placeholder="Paste the ID of the item being reported..." className={inputCls} />
            </Field>
            <Field label="Detailed Description *">
              <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required rows={5} placeholder="Describe the issue in detail..." className={`${inputCls} resize-y`} />
            </Field>
            <ModalActions onCancel={closeModal} loading={formLoading} label="Submit Report" color="bg-red-600 hover:bg-red-700" />
          </form>
        </Overlay>
      )}

      {/* ── APPROVE / REJECT MODAL ── */}
      {modal === "action" && (
        <Overlay onClose={closeModal}>
          <ModalHeader title={actionType === "approve" ? "Approve Report" : "Reject Report"} onClose={closeModal} />
          {formError && <ErrorBanner msg={formError} />}
          <div className="mt-4">
            <p className="text-sm text-slate-600 mb-4">
              {actionType === "approve"
                ? <>You are about to <strong className="text-green-600">approve</strong> the report: <strong>"{selected?.title}"</strong></>
                : <>You are about to <strong className="text-red-600">reject</strong> the report: <strong>"{selected?.title}"</strong></>
              }
            </p>
            <Field label="Admin Note (optional)">
              <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={3} placeholder="Add a note for the QAC..." className={`${inputCls} resize-none`} />
            </Field>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
              <button onClick={closeModal} className="px-5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleAction} disabled={formLoading} className={`px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 transition-colors ${actionType === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>
                {formLoading ? "Processing..." : actionType === "approve" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── DELETE MODAL ── */}
      {modal === "delete" && (
        <Overlay onClose={closeModal}>
          <ModalHeader title="Delete Report" onClose={closeModal} />
          {formError && <ErrorBanner msg={formError} />}
          <p className="text-sm text-slate-600 mt-4 mb-6">
            Are you sure you want to delete <strong>"{selected?.title}"</strong>?
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={closeModal} className="px-5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={handleDelete} disabled={formLoading} className="px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
              {formLoading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </Overlay>
      )}
    </Layout>
  );
}

// ── SHARED UI ──
const inputCls = "w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white";

function Overlay({ children, onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {children}
      </div>
    </div>
  );
}
function ModalHeader({ title, onClose }) {
  return (
    <div className="flex items-center justify-between mb-1">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"><X size={18} /></button>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
function ErrorBanner({ msg }) {
  return <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg mt-3">{msg}</div>;
}
function ModalActions({ onCancel, loading, label, color = "bg-blue-600 hover:bg-blue-700" }) {
  return (
    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
      <button type="button" onClick={onCancel} className="px-5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
      <button type="submit" disabled={loading} className={`px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 transition-colors ${color}`}>
        {loading ? "Saving..." : label}
      </button>
    </div>
  );
}