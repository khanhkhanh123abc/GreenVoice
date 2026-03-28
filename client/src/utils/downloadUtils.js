// ─────────────────────────────────────────────
// Download utilities — CSV & ZIP (no external lib)
// ─────────────────────────────────────────────

/** Convert array of objects → CSV string */
export function toCSV(rows, columns) {
  if (!rows?.length) return "";
  const cols = columns || Object.keys(rows[0]);
  const escape = (val) => {
    const str = String(val ?? "").replace(/"/g, '""');
    return str.includes(",") || str.includes("\n") || str.includes('"') ? `"${str}"` : str;
  };
  return [cols.join(","), ...rows.map(row => cols.map(c => escape(row[c])).join(","))].join("\n");
}

/** Trigger browser download */
function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Download a single CSV file */
export function downloadCSV(rows, columns, filename) {
  triggerDownload("\uFEFF" + toCSV(rows, columns), filename, "text/csv;charset=utf-8;");
}

// ── Minimal ZIP builder (pure JS, no deps) ───
function u16(n) { return [n & 0xff, (n >> 8) & 0xff]; }
function u32(n) { return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]; }

let _crcTable = null;
function getCRCTable() {
  if (_crcTable) return _crcTable;
  _crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    _crcTable[i] = c;
  }
  return _crcTable;
}

function crc32(data) {
  const t = getCRCTable();
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = (crc >>> 8) ^ t[(crc ^ data[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function localHeader(name, size, crc) {
  return new Uint8Array([0x50,0x4b,0x03,0x04, 20,0, 0,0, 0,0, 0,0,0,0,
    ...u32(crc), ...u32(size), ...u32(size), ...u16(name.length), 0,0, ...name]);
}

function centralDir(name, size, crc, offset) {
  return new Uint8Array([0x50,0x4b,0x01,0x02, 20,0, 20,0, 0,0, 0,0, 0,0,0,0,
    ...u32(crc), ...u32(size), ...u32(size), ...u16(name.length), 0,0, 0,0, 0,0, 0,0,0,0,
    ...u32(offset), ...name]);
}

function eocd(count, cdSize, cdOffset) {
  return new Uint8Array([0x50,0x4b,0x05,0x06, 0,0, 0,0,
    ...u16(count), ...u16(count), ...u32(cdSize), ...u32(cdOffset), 0,0]);
}

/** Download multiple CSVs as a single ZIP file
 *  files = [{ name: "file.csv", rows: [...], cols: [...] }]
 */
export function downloadZIP(files, zipName) {
  const enc    = new TextEncoder();
  const parts  = [];
  const dirs   = [];
  let   offset = 0;

  for (const file of files) {
    const csvContent  = toCSV(file.rows, file.cols);
    const nameBytes   = enc.encode(file.name);
    const dataBytes   = enc.encode("\uFEFF" + csvContent);
    const crc         = crc32(dataBytes);
    const lh          = localHeader(nameBytes, dataBytes.length, crc);

    dirs.push(centralDir(nameBytes, dataBytes.length, crc, offset));
    parts.push(lh, dataBytes);
    offset += lh.length + dataBytes.length;
  }

  const cdBytes  = dirs.reduce((s, d) => s + d.length, 0);
  const allParts = [...parts, ...dirs, eocd(files.length, cdBytes, offset)];
  const total    = allParts.reduce((s, p) => s + p.length, 0);
  const zip      = new Uint8Array(total);
  let   pos      = 0;
  for (const p of allParts) { zip.set(p, pos); pos += p.length; }

  triggerDownload(zip, zipName, "application/zip");
}

// ── Data preparers per dashboard ─────────────

export function getAnalyticsFiles(ideas, categories) {
  const topIdeas = [...ideas].sort((a, b) => b.votes - a.votes);
  const byTopic  = ideas.reduce((acc, i) => { acc[i.topicType] = (acc[i.topicType]||0)+1; return acc; }, {});
  return [
    {
      name: "top_ideas.csv",
      rows: topIdeas.map((idea, i) => ({ rank: i+1, title: idea.title, type: idea.topicType, votes: idea.votes, views: idea.views })),
      cols: ["rank","title","type","votes","views"],
    },
    {
      name: "ideas_by_topic.csv",
      rows: Object.entries(byTopic).map(([topic, count]) => ({ topic, count })),
      cols: ["topic","count"],
    },
    {
      name: "categories.csv",
      rows: categories.map(c => ({ name: c.name, description: c.description || "" })),
      cols: ["name","description"],
    },
  ];
}

export function getSystemFiles(data) {
  return [
    { name: "system_stats.csv",     rows: [data.stats],        cols: ["totalStaff","totalStudents","totalIdeas","totalVotes","totalComments","totalReactions"] },
    { name: "monthly_activity.csv", rows: data.monthlyTable,   cols: ["month","ideas","votes","comments"] },
    { name: "activity_trend.csv",   rows: data.activityTrend,  cols: ["label","value"] },
    { name: "votes_trend.csv",      rows: data.votesTrend,     cols: ["label","value"] },
    { name: "ideas_by_topic.csv",   rows: data.byTopic,        cols: ["label","value"] },
  ];
}

export function getTeachingFiles(data) {
  return [
    { name: "lecturer_ratings.csv",    rows: data.lecturerRating, cols: ["name","dept","ideasCount","totalVotes","totalFeedbacks","avgRating"] },
    { name: "rating_distribution.csv", rows: data.ratingDist,     cols: ["label","value"] },
    { name: "feedback_trend.csv",      rows: data.feedbackTrend,  cols: ["label","value"] },
    { name: "rating_trend.csv",        rows: data.ratingTrend || [], cols: ["label","value"] },
  ];
}

export function getContributionFiles(data) {
  return [
    { name: "top_contributors.csv",    rows: data.topContributors, cols: ["name","dept","role","count","votes"] },
    { name: "ideas_by_department.csv", rows: data.byDept,          cols: ["label","value"] },
    { name: "ideas_by_topic.csv",      rows: data.byTopic,         cols: ["label","value"] },
  ];
}

export function getEngagementFiles(data) {
  return [
    { name: "top_engaged_ideas.csv", rows: data.topEngaged,     cols: ["title","author","topicType","votes","views","comments","reactions","score"] },
    { name: "most_voted.csv",        rows: data.mostVoted,      cols: ["title","value"] },
    { name: "most_commented.csv",    rows: data.mostCommented,  cols: ["title","value"] },
    { name: "reaction_trend.csv",    rows: data.reactionTrend,  cols: ["label","value"] },
    { name: "view_trend.csv",        rows: data.viewTrend,      cols: ["label","value"] },
  ];
}

export function getPerformanceFiles(data) {
  return [
    { name: "staff_performance.csv", rows: data.staffList,   cols: ["name","dept","ideas","votes","views","comments","reactions","totalFeedbacks","avgRating","score"] },
    { name: "performance_trend.csv", rows: data.perfTrend,   cols: ["label","value"] },
    { name: "scatter_data.csv",      rows: data.scatterData, cols: ["name","x","y"] },
  ];
}
