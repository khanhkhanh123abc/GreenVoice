import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Idea from '../models/Idea.js';
import Comment from '../models/Comment.js';
import User from '../models/User.js';
import Feedback from '../models/Feedback.js';

const router = express.Router();
const QA_ROLES = ["QA Manager", "Administrator"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function monthlyTrend(items, months = 6, valueFn = null) {
  const now = new Date();
  return Array.from({ length: months }, (_, i) => {
    const d    = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const bucket = items.filter(item => { const c = new Date(item.createdAt); return c >= d && c < next; });
    return {
      label: MONTHS[d.getMonth()],
      value: valueFn ? valueFn(bucket) : bucket.length,
    };
  });
}

// ── Existing summary (unchanged) ─────────────────────────────
router.get('/summary', protect, async (req, res) => {
  try {
    const totalIdeas    = await Idea.countDocuments();
    const totalComments = await Comment.countDocuments();
    const ideas         = await Idea.find({}, 'views topicType');
    const totalViews    = ideas.reduce((s, i) => s + (i.views || 0), 0);
    res.json({
      summary: { totalIdeas, totalComments, totalViews },
      categoryData: [
        { name: 'Academic', value: ideas.filter(i => i.topicType === 'Academic').length },
        { name: 'Support',  value: ideas.filter(i => i.topicType === 'Support').length },
      ],
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── System Overview ───────────────────────────────────────────
router.get('/system', protect, authorize(...QA_ROLES), async (req, res) => {
  try {
    const [ideas, totalComments, users] = await Promise.all([
      Idea.find().populate('authorId', 'name role department').lean(),
      Comment.countDocuments(),
      User.find({}, 'role department name').lean(),
    ]);
    const now = new Date();
    const monthlyTable = Array.from({ length: 6 }, (_, i) => {
      const d    = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const m = ideas.filter(idea => { const c = new Date(idea.createdAt); return c >= d && c < next; });
      return { month: MONTHS[d.getMonth()], ideas: m.length, votes: m.reduce((s,i)=>s+(i.votes||0),0), comments: m.reduce((s,i)=>s+(i.comments?.length||0),0) };
    });
    res.json({
      stats: {
        totalStaff:     users.filter(u => ["Academic Staff","Support Staff"].includes(u.role)).length,
        totalStudents:  users.filter(u => u.role === "Student").length,
        totalIdeas:     ideas.length,
        totalVotes:     ideas.reduce((s,i)=>s+(i.votes||0),0),
        totalComments,
        totalReactions: ideas.reduce((s,i)=>s+(i.reactions||0)+(i.likes?.length||0),0),
      },
      activityTrend: monthlyTrend(ideas, 6),
      votesTrend:    monthlyTrend(ideas, 6, b => b.reduce((s,i)=>s+(i.votes||0),0)),
      byTopic: Object.entries(ideas.reduce((acc,i)=>{ acc[i.topicType]=(acc[i.topicType]||0)+1; return acc; },{})).map(([label,value])=>({label,value})),
      monthlyTable,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Teaching Quality  (dùng Feedback.rating thật) ────────────
router.get('/teaching', protect, authorize(...QA_ROLES), async (req, res) => {
  try {
    const [feedbacks, ideas] = await Promise.all([
      Feedback.find()
        .populate('staffId',   'name department role')
        .populate('studentId', 'name')
        .lean(),
      Idea.find().populate('authorId', 'name department').lean(),
    ]);

    // ── Per-staff metrics from REAL feedback ratings ──
    const staffMap = {};
    feedbacks.forEach(fb => {
      if (!fb.staffId?._id) return;
      const id = fb.staffId._id.toString();
      if (!staffMap[id]) staffMap[id] = {
        name: fb.staffId.name,
        dept: fb.staffId.department || '—',
        ratings: [], comments: [], periods: new Set(),
      };
      staffMap[id].ratings.push(fb.rating);
      if (fb.comment) staffMap[id].comments.push(fb.comment);
      staffMap[id].periods.add(fb.period);
    });

    // Merge idea counts into staffMap
    ideas.forEach(idea => {
      if (idea.isAnonymous || !idea.authorId?._id) return;
      const id = idea.authorId._id.toString();
      if (!staffMap[id]) staffMap[id] = {
        name: idea.authorId.name,
        dept: idea.authorId.department || '—',
        ratings: [], comments: [], periods: new Set(),
      };
      staffMap[id].ideasCount = (staffMap[id].ideasCount || 0) + 1;
      staffMap[id].totalVotes = (staffMap[id].totalVotes || 0) + (idea.votes || 0);
    });

    const lecturerRating = Object.entries(staffMap).map(([id, d]) => {
      const totalRatings  = d.ratings.length;
      const avgRating     = totalRatings > 0
        ? parseFloat((d.ratings.reduce((s, r) => s + r, 0) / totalRatings).toFixed(2))
        : null; // null = no real feedback yet
      return {
        id, name: d.name, dept: d.dept,
        ideasCount:    d.ideasCount || 0,
        totalVotes:    d.totalVotes || 0,
        totalFeedbacks: totalRatings,
        activePeriods: d.periods.size,
        avgRating,
        // Rating breakdown per star
        stars: [5,4,3,2,1].map(s => ({ star: s, count: d.ratings.filter(r => r === s).length })),
      };
    }).sort((a, b) => (b.avgRating ?? -1) - (a.avgRating ?? -1));

    // ── Real rating distribution across ALL feedbacks ──
    const ratingDist = [5,4,3,2,1].map(s => ({
      label: `${s} star${s>1?'s':''}`,
      value: feedbacks.filter(f => f.rating === s).length,
    }));

    // ── Feedback trend per month (real feedback count) ──
    const feedbackTrend = monthlyTrend(feedbacks, 6);

    // ── Avg rating trend per month ──
    const now = new Date();
    const ratingTrend = Array.from({ length: 6 }, (_, i) => {
      const d    = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const bucket = feedbacks.filter(f => { const c = new Date(f.createdAt); return c >= d && c < next; });
      const avg = bucket.length > 0 ? parseFloat((bucket.reduce((s,f)=>s+f.rating,0)/bucket.length).toFixed(2)) : 0;
      return { label: MONTHS[d.getMonth()], value: avg };
    });

    const globalAvg = feedbacks.length > 0
      ? parseFloat((feedbacks.reduce((s,f)=>s+f.rating,0)/feedbacks.length).toFixed(2))
      : null;

    res.json({
      lecturerRating, ratingDist, feedbackTrend, ratingTrend,
      avgRating: globalAvg,
      totalFeedbacks: feedbacks.length,
      totalLecturers: lecturerRating.filter(l => l.totalFeedbacks > 0).length,
      totalIdeas: ideas.length,
      dataSource: feedbacks.length > 0 ? 'real_feedback' : 'no_feedback_yet',
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Staff Contribution ────────────────────────────────────────
router.get('/staff-contribution', protect, authorize(...QA_ROLES), async (req, res) => {
  try {
    const ideas = await Idea.find().populate('authorId','name role department').lean();
    const byDept = {}, byContrib = {};
    ideas.forEach(idea => {
      const dept = idea.authorId?.department || idea.authorId?.role || 'Unknown';
      byDept[dept] = (byDept[dept]||0) + 1;
      if (!idea.isAnonymous && idea.authorId?.name) {
        const n = idea.authorId.name;
        if (!byContrib[n]) byContrib[n] = { count:0, votes:0, dept: idea.authorId.department||'—', role: idea.authorId.role||'—' };
        byContrib[n].count += 1;
        byContrib[n].votes += idea.votes||0;
      }
    });
    const byTopic = ideas.reduce((acc,i)=>{ acc[i.topicType]=(acc[i.topicType]||0)+1; return acc; },{});
    res.json({
      byDept: Object.entries(byDept).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value),
      byTopic: [{ label:'Academic Topics', value:byTopic['Academic']||0 },{ label:'Support Topics', value:byTopic['Support']||0 }],
      topContributors: Object.entries(byContrib).map(([name,d])=>({name,...d})).sort((a,b)=>b.count-a.count),
      totalIdeas: ideas.length,
      totalContributors: Object.keys(byContrib).length,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Idea Engagement ───────────────────────────────────────────
router.get('/engagement', protect, authorize(...QA_ROLES), async (req, res) => {
  try {
    const ideas = await Idea.find().populate('authorId','name').lean();
    const withScore = ideas.map(i => ({
      ...i,
      totalReact: (i.reactions||0)+(i.likes?.length||0),
      score: (i.votes||0)*3 + (i.views||0) + (i.comments?.length||0)*4 + ((i.reactions||0)+(i.likes?.length||0))*2,
    }));
    res.json({
      stats: {
        totalVotes:     ideas.reduce((s,i)=>s+(i.votes||0),0),
        totalViews:     ideas.reduce((s,i)=>s+(i.views||0),0),
        totalComments:  ideas.reduce((s,i)=>s+(i.comments?.length||0),0),
        totalReactions: ideas.reduce((s,i)=>s+(i.reactions||0)+(i.likes?.length||0),0),
      },
      mostVoted:    [...ideas].sort((a,b)=>b.votes-a.votes).slice(0,10).map(i=>({ title:i.title, value:i.votes })),
      mostCommented:[...ideas].sort((a,b)=>(b.comments?.length||0)-(a.comments?.length||0)).slice(0,10).map(i=>({ title:i.title, value:i.comments?.length||0 })),
      reactionTrend: monthlyTrend(withScore, 6, b => b.reduce((s,i)=>s+i.totalReact,0)),
      viewTrend:     monthlyTrend(ideas, 6, b => b.reduce((s,i)=>s+(i.views||0),0)),
      topEngaged: [...withScore].sort((a,b)=>b.score-a.score).slice(0,10).map(i=>({
        id:i._id, title:i.title, topicType:i.topicType,
        author: i.isAnonymous?'Anonymous':i.authorId?.name,
        votes:i.votes, views:i.views, comments:i.comments?.length||0,
        reactions:i.totalReact, score:i.score,
      })),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Staff Performance  (kết hợp Idea + Feedback thật) ─────────
router.get('/performance', protect, authorize(...QA_ROLES), async (req, res) => {
  try {
    const [ideas, feedbacks] = await Promise.all([
      Idea.find().populate('authorId','name role department').lean(),
      Feedback.find().populate('staffId','name department').lean(),
    ]);

    // Build idea map by staff name
    const ideaMap = {};
    ideas.forEach(idea => {
      if (idea.isAnonymous || !idea.authorId?.name) return;
      const n = idea.authorId.name;
      if (!ideaMap[n]) ideaMap[n] = { ideas:[], dept: idea.authorId.department||'—' };
      ideaMap[n].ideas.push(idea);
    });

    // Build feedback map by staffId
    const fbMap = {};
    feedbacks.forEach(fb => {
      if (!fb.staffId?._id) return;
      const n = fb.staffId.name;
      if (!fbMap[n]) fbMap[n] = { ratings:[], dept: fb.staffId.department||'—' };
      fbMap[n].ratings.push(fb.rating);
    });

    // Merge all staff (union of idea authors + feedback recipients)
    const allStaff = new Set([...Object.keys(ideaMap), ...Object.keys(fbMap)]);

    const calcScore = (myIdeas, myRatings) => {
      // Idea contribution component (max 40)
      const ideaScore = Math.min(myIdeas.length * 8, 40);
      // Vote component (max 20)
      const voteScore = Math.min(myIdeas.reduce((s,i)=>s+(i.votes||0),0) * 0.4, 20);
      // Engagement component (max 15)
      const engScore  = Math.min(myIdeas.reduce((s,i)=>s+(i.views||0)+(i.reactions||0)+(i.likes?.length||0)+(i.comments?.length||0),0) * 0.05, 15);
      // Student feedback component (max 25) — REAL DATA
      const fbScore   = myRatings.length > 0
        ? Math.round((myRatings.reduce((s,r)=>s+r,0) / myRatings.length) / 5 * 25)
        : 0;
      return Math.min(Math.round(ideaScore + voteScore + engScore + fbScore + (myIdeas.length > 0 ? 5 : 0)), 100);
    };

    const staffList = [...allStaff].map(name => {
      const myIdeas   = ideaMap[name]?.ideas   || [];
      const myRatings = fbMap[name]?.ratings   || [];
      const dept      = ideaMap[name]?.dept || fbMap[name]?.dept || '—';
      const votes     = myIdeas.reduce((s,i)=>s+(i.votes||0),0);
      const avgRating = myRatings.length > 0
        ? parseFloat((myRatings.reduce((s,r)=>s+r,0)/myRatings.length).toFixed(2))
        : null;
      const score = calcScore(myIdeas, myRatings);
      return {
        name, dept,
        ideas:    myIdeas.length,
        votes,
        views:    myIdeas.reduce((s,i)=>s+(i.views||0),0),
        comments: myIdeas.reduce((s,i)=>s+(i.comments?.length||0),0),
        reactions:myIdeas.reduce((s,i)=>s+(i.reactions||0)+(i.likes?.length||0),0),
        totalFeedbacks: myRatings.length,
        avgRating,
        score,
        // Score breakdown for stacked bar
        ideaComponent:     Math.min(myIdeas.length * 8, 40),
        voteComponent:     Math.min(votes * 0.4, 20),
        engageComponent:   Math.min(myIdeas.reduce((s,i)=>s+(i.views||0)+(i.reactions||0)+(i.likes?.length||0)+(i.comments?.length||0),0)*0.05,15),
        feedbackComponent: myRatings.length > 0 ? Math.round((myRatings.reduce((s,r)=>s+r,0)/myRatings.length)/5*25) : 0,
      };
    }).sort((a,b) => b.score - a.score);

    // Performance trend per month
    const now = new Date();
    const perfTrend = Array.from({ length: 6 }, (_, i) => {
      const d    = new Date(now.getFullYear(), now.getMonth()-5+i, 1);
      const next = new Date(d.getFullYear(), d.getMonth()+1, 1);
      const activeNames = [...new Set(
        ideas.filter(idea => { const c=new Date(idea.createdAt); return c>=d&&c<next&&!idea.isAnonymous&&idea.authorId?.name; })
          .map(idea => idea.authorId.name)
      )];
      const avg = activeNames.length > 0
        ? Math.round(activeNames.reduce((s,n) => {
            const mi = ideaMap[n]?.ideas||[];
            const mr = fbMap[n]?.ratings||[];
            return s + calcScore(mi, mr);
          }, 0) / activeNames.length)
        : 0;
      return { label: MONTHS[d.getMonth()], value: avg };
    });

    res.json({
      staffList,
      perfTrend,
      scatterData: staffList.filter(s => s.avgRating !== null).map(s => ({
        name: s.name.split(' ')[0],
        x: s.ideas,
        y: s.avgRating,
      })),
      avgScore: staffList.length > 0 ? Math.round(staffList.reduce((s,st)=>s+st.score,0)/staffList.length) : 0,
      scoreFormula: "Ideas(40) + Votes(20) + Engagement(15) + Student Feedback(25) + Bonus(5)",
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
