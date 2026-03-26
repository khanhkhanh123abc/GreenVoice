import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Topbar from '../components/Topbar';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { socket } from "../App"; // Import socket chuẩn
import { Heart, MessageCircle, Eye, Share2, ArrowLeft, Download, FileText, Send, Loader2, Trash2 } from 'lucide-react';

const TOPIC_COLORS = {
    Academic: { bg: "bg-blue-50", text: "text-blue-600" },
    Support: { bg: "bg-green-50", text: "text-green-600" },
    "Campus Life": { bg: "bg-yellow-50", text: "text-yellow-600" },
    Facilities: { bg: "bg-emerald-50", text: "text-emerald-700" },
};

export default function IdeaDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [idea, setIdea] = useState(null);
    const [loading, setLoading] = useState(true);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);

    const [commentText, setCommentText] = useState("");
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [comments, setComments] = useState([]);

    const fetchIdeaDetail = async () => {
        try {
            const res = await api.get(`/ideas/${id}`);
            const fetchedIdea = res.data.idea || res.data;
            setIdea(fetchedIdea);
            setComments(fetchedIdea.comments || []);
            setLikeCount(fetchedIdea.votes || 0);

            if (fetchedIdea.likes && user) {
                const currentUserId = user._id || user.id;
                setLiked(fetchedIdea.likes.includes(currentUserId));
            }
            setLoading(false);
        } catch (err) {
            console.error("Lỗi khi tải chi tiết bài viết:", err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIdeaDetail();
    }, [id]);

    // 🚀 BỘ THU SÓNG REAL-TIME TOÀN CẦU
    useEffect(() => {
        // 1. Cập nhật bình luận thời gian thực
        socket.on("global_update_comments", (data) => {
            if (data.ideaId === id) {
                // Kiểm tra tránh trùng lặp nếu chính mình vừa post
                setComments(prev => {
                    const exists = prev.find(c => c._id === data.newComment._id);
                    return exists ? prev : [...prev, data.newComment];
                });
            }
        });

        // 2. Cập nhật số Tim thời gian thực cho tất cả mọi người
        socket.on("global_update_likes", (data) => {
            if (data.ideaId === id) {
                setLikeCount(data.newVotes);
                // Tự động cập nhật màu tim nếu mình là người vừa bấm ở tab khác
                if (user) {
                    const currentUserId = user._id || user.id;
                    setLiked(data.likes.includes(currentUserId));
                }
            }
        });

        return () => {
            socket.off("global_update_comments");
            socket.off("global_update_likes");
        };
    }, [id, user]);

    const handlePostComment = async () => {
        if (!commentText.trim()) return;
        setIsSubmittingComment(true);
        try {
            await api.post(`/ideas/${id}/comments`, {
                content: commentText,
                isAnonymous: isAnonymous
            });
            setCommentText("");
            setIsAnonymous(false);
            // Không cần gọi fetchIdeaDetail() nữa vì socket sẽ tự lo việc đẩy comment mới vào list
        } catch (error) {
            console.error("Lỗi khi gửi bình luận:", error);
            alert("Không thể gửi bình luận!");
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa bình luận này không?")) return;
        try {
            await api.delete(`/ideas/${id}/comments/${commentId}`);
            setComments(prev => prev.filter(c => c._id !== commentId));
        } catch (error) {
            console.error("Lỗi khi xóa bình luận:", error);
        }
    };

    const handleLike = async () => {
        // Optimistic UI: Nhảy số trước cho sướng tay
        const originalLiked = liked;
        const originalCount = likeCount;
        setLiked(!liked);
        setLikeCount(prev => liked ? prev - 1 : prev + 1);

        try {
            await api.put(`/ideas/${id}/like`);
            // Thành công thì không cần làm gì, Socket sẽ báo lại số chuẩn sau
        } catch (error) {
            setLiked(originalLiked);
            setLikeCount(originalCount);
        }
    };

    const timeAgo = (date) => {
        const d = Math.floor((Date.now() - new Date(date)) / 1000);
        if (d < 60) return "Vừa xong";
        if (d < 3600) return `${Math.floor(d / 60)} phút trước`;
        if (d < 86400) return `${Math.floor(d / 3600)} giờ trước`;
        return `${Math.floor(d / 86400)} ngày trước`;
    };

    if (loading) return (
        <Layout>
            <Topbar title="Idea Detail" />
            <div className="flex-1 flex items-center justify-center bg-slate-50">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        </Layout>
    );

    if (!idea) return (
        <Layout>
            <Topbar title="Idea Detail" />
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-500">
                <h2 className="text-2xl font-bold mb-2">Không tìm thấy bài viết!</h2>
                <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">Quay lại</button>
            </div>
        </Layout>
    );

    const tc = TOPIC_COLORS[idea.topicType] || { bg: "bg-gray-100", text: "text-gray-600" };

    return (
        <Layout>
            <Topbar title="Idea Detail" />
            <main className="flex-1 p-8 overflow-y-auto bg-slate-50">
                <div className="max-w-4xl mx-auto">
                    <button onClick={() => navigate('/ideas')} className="flex items-center gap-2 mb-6 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                        <ArrowLeft size={18} /> Quay lại danh sách
                    </button>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold border-2 border-white shadow-md">
                                    {(idea.isAnonymous ? "A" : (idea.authorId?.name?.[0] || "U")).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 leading-tight">
                                        {idea.isAnonymous ? "Anonymous User" : (idea.authorId?.name || "Unknown Author")}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-0.5">{new Date(idea.createdAt).toLocaleString()}</p>
                                </div>
                            </div>
                            <span className={`px-4 py-1.5 text-sm font-bold rounded-full ${tc.bg} ${tc.text}`}>{idea.topicType}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mb-6">
                            <h1 className="text-3xl font-extrabold text-slate-900 leading-snug">
                                {idea.title}
                            </h1>
                            {idea.campaignId?.name && (
                                <span className="px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-purple-700 bg-purple-100 border border-purple-200 rounded-lg flex items-center shadow-sm translate-y-[2px]">
                                    🚀 {idea.campaignId.name}
                                </span>
                            )}
                        </div>

                        <p className="text-base text-slate-700 leading-relaxed whitespace-pre-wrap mb-10">{idea.content}</p>

                        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                            <div className="flex items-center gap-8">
                                <button onClick={handleLike} className="flex items-center gap-2.5 group transition-colors">
                                    <Heart size={26} className={`transition-all duration-300 ${liked ? 'fill-red-500 text-red-500 scale-110' : 'text-slate-400 group-hover:text-red-500'}`} />
                                    <span className={`text-base font-bold ${liked ? 'text-red-500' : 'text-slate-500 group-hover:text-red-500'}`}>
                                        {likeCount}
                                    </span>
                                </button>
                                <div className="flex items-center gap-2.5 text-slate-400">
                                    <MessageCircle size={26} />
                                    <span className="text-base font-bold">{comments.length}</span>
                                </div>
                                <div className="flex items-center gap-2.5 text-slate-400">
                                    <Eye size={26} />
                                    <span className="text-base font-bold">{idea.views || 0}</span>
                                </div>
                            </div>
                            <button className="flex items-center gap-2 text-slate-500 font-semibold hover:text-blue-600 bg-slate-50 px-4 py-2 rounded-xl transition-colors"><Share2 size={18} /> Share</button>
                        </div>
                    </div>

                    <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <MessageCircle className="text-blue-500" />
                            Bình luận ({comments.length})
                        </h3>

                        <div className="flex gap-4 mb-8">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 border border-blue-200">
                                {(user?.name?.[0] || "U").toUpperCase()}
                            </div>
                            <div className="flex-1 flex flex-col gap-3">
                                <div className="relative group">
                                    <textarea
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        placeholder="Viết bình luận của bạn mang tính xây dựng..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-14 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all shadow-sm"
                                        rows="2"
                                        disabled={isSubmittingComment}
                                    ></textarea>
                                    <button
                                        onClick={handlePostComment}
                                        disabled={!commentText.trim() || isSubmittingComment}
                                        className="absolute bottom-2.5 right-2.5 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md"
                                    >
                                        {isSubmittingComment ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                                    </button>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer w-max ml-1 group">
                                    <input
                                        type="checkbox"
                                        checked={isAnonymous}
                                        onChange={(e) => setIsAnonymous(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span className="text-sm font-medium text-slate-500 group-hover:text-slate-800 transition-colors">Bình luận ẩn danh</span>
                                </label>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {comments.map((comment, idx) => (
                                <div key={comment._id || idx} className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold shrink-0 border border-slate-200 shadow-sm">
                                        {(comment.authorId?.name?.[0] || "U").toUpperCase()}
                                    </div>
                                    <div className="flex-1 bg-slate-50 rounded-2xl rounded-tl-none p-4 border border-slate-100">
                                        <div className="flex flex-wrap items-center justify-between mb-2 gap-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-slate-800 text-sm">{comment.authorId?.name || "Unknown User"}</span>
                                                {comment.authorId?.role && <span className="text-xs text-slate-500 font-medium border-l border-slate-300 pl-2">{comment.authorId.role}</span>}
                                                {comment.isAnonymous && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">Chế độ ẩn danh</span>}
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="text-xs text-slate-400 font-medium">{timeAgo(comment.createdAt)}</span>
                                                {(user?.role === "Administrator" || comment.authorId?._id === (user?._id || user?.id)) && (
                                                    <button onClick={() => handleDeleteComment(comment._id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-700 leading-relaxed">{comment.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </Layout>
    );
}