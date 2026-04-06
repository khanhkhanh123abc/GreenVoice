import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, AlertCircle, CheckCircle2, Info } from "lucide-react";
import api from "../../api/axiosInstance";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../components/common/Layout";
import Topbar from "../../components/navigation/Topbar";
import { toast } from "react-toastify";

export default function SubmitIdea() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [topicType, setTopicType] = useState(user?.role === "Support Staff" ? "Support" : "Academic");
  const [categoryId, setCategoryId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [files, setFiles] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [catRes, campRes] = await Promise.all([
          api.get("/categories"),
          api.get("/campaigns/active"),
        ]);
        setCategories(catRes.data.categories || []);
        setCampaigns(campRes.data || []);
      } catch (err) {
        console.error("Error loading data:", err);
        toast.error("Unable to connect to server.");
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 5) {
      toast.error("You can upload a maximum of 5 files.");
      return;
    }
    setFiles(selectedFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate title min 10 characters
    if (title.trim().length < 10) {
      setError("Title must be at least 10 characters long.");
      return;
    }

    // Validate content required
    if (!content.trim()) {
      setError("Content is required. Please describe your idea.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      formData.append("topicType", topicType);
      formData.append("categoryId", categoryId);
      formData.append("campaignId", campaignId);
      formData.append("isAnonymous", false);

      files.forEach((file) => {
        formData.append("documents", file);
      });

      await api.post("/ideas", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Idea submitted successfully!");
      navigate("/ideas");
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred while submitting.");
      toast.error("Failed to submit idea!");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <Topbar title="Contribute an Idea" />

      <main className="flex-1 p-6 lg:p-10 overflow-y-auto bg-slate-50">
        <div className="max-w-4xl mx-auto">

          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Add New Idea</h1>
            <p className="text-slate-500 mt-2">Share your idea to help improve the university.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p className="font-medium text-sm">{error}</p>
            </div>
          )}

          {/* WARNING IF NO ACTIVE CAMPAIGN */}
          {!loadingData && campaigns.length === 0 && (
            <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4">
              <Info size={28} className="text-amber-500 shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-amber-800">System Closed</h3>
                <p className="text-amber-700 mt-1">There is currently no active Idea Campaign. Please check back after a new announcement.</p>
                <button onClick={() => navigate('/ideas')} className="mt-4 px-4 py-2 bg-amber-100 text-amber-800 font-bold rounded-lg hover:bg-amber-200 transition-colors">
                  Back to Home
                </button>
              </div>
            </div>
          )}

          <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-opacity ${campaigns.length === 0 && !loadingData ? 'opacity-50 pointer-events-none grayscale-[50%]' : ''}`}>

            {loadingData ? (
              <div className="p-16 text-center text-slate-500 font-medium">Loading form data...</div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">

                {/* 1. Select Campaign */}
                <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <label className="block text-sm font-bold text-blue-900 mb-2">Collection Campaign <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                    className="w-full bg-white border border-blue-200 rounded-lg px-4 py-3 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  >
                    <option value="" disabled>-- Please select an active campaign --</option>
                    {campaigns.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.name} (Deadline: {new Date(c.closureDate).toLocaleDateString('en-GB')})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-blue-600 mt-2 flex items-center gap-1.5"><Info size={14}/> Your idea will be grouped under this campaign.</p>
                </div>

                {/* 2. Title and Content */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Idea Title <span className="text-red-500">*</span>
                      <span className="ml-2 text-xs font-normal text-slate-400">(min 10 characters)</span>
                    </label>
                    <input
                      required
                      type="text"
                      minLength={10}
                      placeholder="Summarise your idea in one sentence..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    />
                    {/* Live character counter */}
                    <p className={`text-xs mt-1 ${title.length > 0 && title.length < 10 ? "text-red-500" : "text-slate-400"}`}>
                      {title.length} / 10 characters minimum
                      {title.length > 0 && title.length < 10 && ` — need ${10 - title.length} more`}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Detailed Content <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows="6"
                      placeholder="Describe your idea in detail, reasons and benefits..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-y"
                    ></textarea>
                    {content.trim() === "" && (
                      <p className="text-xs mt-1 text-slate-400">This field is required.</p>
                    )}
                  </div>
                </div>

                {/* 3. Classification */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Topic Type <span className="text-red-500">*</span></label>
                    <select
                      value={topicType}
                      onChange={(e) => setTopicType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
                    >
                      {user?.role === "Support Staff" ? (
                        <option value="Support">Support (Reserved for Support Staff)</option>
                      ) : (
                        <>
                          <option value="Academic">Academic</option>
                          <option value="Support">Support</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Category <span className="text-red-500">*</span></label>
                    <select
                      required
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="" disabled>-- Select a category --</option>
                      {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* 4. File Attachment */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Attachments (Optional)</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors relative">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload size={32} className="mx-auto text-slate-400 mb-3" />
                    <p className="text-sm font-bold text-slate-700">Drag & drop files here or Click to select</p>
                    <p className="text-xs text-slate-500 mt-1">Supports JPG, PNG, PDF, DOCX (Max 5 files)</p>
                  </div>
                  {files.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {files.map((f, i) => (
                        <div key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-md border border-blue-200 flex items-center gap-2">
                          <CheckCircle2 size={14} /> {f.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SUBMIT BUTTON */}
                <div className="flex justify-end gap-4 pt-4">
                  <button type="button" onClick={() => navigate('/ideas')} className="px-6 py-3 font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || campaigns.length === 0}
                    className="px-8 py-3 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {submitting ? "Submitting..." : "Submit Idea"}
                  </button>
                </div>

              </form>
            )}
          </div>
        </div>
      </main>
    </Layout>
  );
}