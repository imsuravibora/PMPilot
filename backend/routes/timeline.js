const express = require('express');
const multer = require('multer');
const router = express.Router();
const { parseCSV, parseExcel } = require('../utils/dataProcessor');
const Groq = require('groq-sdk');

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

function calcTimeline(teamData) {
  // Group by member to get unique members and their total weekly hours
  const members = {};
  teamData.forEach(row => {
    const name = row['Member'] || row['Name'] || row['member'] || Object.values(row)[0];
    const hoursPerWeek = parseFloat(row['Hours Per Week'] || row['HoursPerWeek'] || row['hours_per_week'] || 40);
    const availability = parseFloat(row['Availability %'] || row['Availability'] || 100) / 100;
    const estimatedHours = parseFloat(row['Estimated Hours'] || row['Task Hours Estimate'] || row['estimated_hours'] || 0);
    const task = row['Task'] || row['Tasks Assigned'] || row['task'] || 'General work';
    const role = row['Role'] || row['role'] || 'Team Member';
    const dept = row['Department'] || row['dept'] || 'General';

    if (!members[name]) {
      members[name] = {
        name, role, dept,
        hoursPerWeek: hoursPerWeek * availability,
        totalEstimatedHours: 0,
        tasks: []
      };
    }
    members[name].totalEstimatedHours += estimatedHours;
    if (task) members[name].tasks.push({ task, hours: estimatedHours });
  });

  const memberList = Object.values(members);
  const totalTeamHoursPerWeek = memberList.reduce((sum, m) => sum + m.hoursPerWeek, 0);
  const totalEstimatedHours = memberList.reduce((sum, m) => sum + m.totalEstimatedHours, 0);

  const weeksNeeded = totalEstimatedHours > 0 ? totalEstimatedHours / totalTeamHoursPerWeek : 0;
  const monthsNeeded = weeksNeeded / 4.33;
  const quartersNeeded = monthsNeeded / 3;

  // Find bottlenecks — members with most hours relative to capacity
  const bottlenecks = memberList
    .filter(m => m.totalEstimatedHours > 0)
    .map(m => ({
      ...m,
      weeksToComplete: m.totalEstimatedHours / m.hoursPerWeek,
      utilizationPct: Math.round((m.totalEstimatedHours / (m.hoursPerWeek * weeksNeeded)) * 100)
    }))
    .sort((a, b) => b.weeksToComplete - a.weeksToComplete);

  return {
    memberList,
    totalTeamHoursPerWeek: Math.round(totalTeamHoursPerWeek),
    totalEstimatedHours: Math.round(totalEstimatedHours),
    weeksNeeded: Math.ceil(weeksNeeded),
    monthsNeeded: parseFloat(monthsNeeded.toFixed(1)),
    quartersNeeded: parseFloat(quartersNeeded.toFixed(1)),
    bottlenecks
  };
}

async function getAITimelineInsights(teamData, timeline) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const teamSummary = timeline.memberList.map(m =>
    `${m.name} (${m.role}): ${m.hoursPerWeek} hrs/week available, ${m.totalEstimatedHours} hrs of work assigned`
  ).join('\n');

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: 'You are PMPilot, an expert AI project manager assistant.' },
      { role: 'user', content: `Analyze this team capacity and project timeline data:

TEAM CAPACITY:
${teamSummary}

CALCULATED TIMELINE:
- Total team capacity: ${timeline.totalTeamHoursPerWeek} hours/week
- Total estimated work: ${timeline.totalEstimatedHours} hours
- Estimated duration: ${timeline.weeksNeeded} weeks (${timeline.monthsNeeded} months / ${timeline.quartersNeeded} quarters)

Provide:
1. **TIMELINE SUMMARY** — Plain English summary
2. **TEAM CAPACITY ANALYSIS** — Who has too much work, who has capacity
3. **TOP 3 BOTTLENECKS** — Biggest risks to the timeline
4. **RECOMMENDATIONS** — How to finish faster
5. **QUARTER BREAKDOWN** — What should be done in Q1, Q2, etc.

Use 🔴 🟡 🟢 for risk levels.` }
    ],
    max_tokens: 1024
  });
  return response.choices[0].message.content;
}

router.post('/analyse', upload.single('file'), async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = req.file.originalname.toLowerCase().split('.').pop();
    let teamData;

    if (ext === 'csv') {
      teamData = await parseCSV(req.file.buffer);
    } else {
      teamData = parseExcel(req.file.buffer);
    }

    if (!teamData || teamData.length === 0) {
      return res.status(400).json({ error: 'File is empty or unreadable' });
    }

    const timeline = calcTimeline(teamData);

    let aiInsights = '';
    try {
      aiInsights = await getAITimelineInsights(teamData, timeline);
    } catch (e) {
      aiInsights = 'AI insights unavailable. Please check your API key.\n\nCalculated estimate: ' +
        `${timeline.weeksNeeded} weeks / ${timeline.monthsNeeded} months / ${timeline.quartersNeeded} quarters`;
    }

    res.json({ success: true, timeline, aiInsights, fileName: req.file.originalname });

  } catch (err) {
    console.error('Timeline error:', err);
    res.status(500).json({ error: err.message || 'Analysis failed' });
  }
});

module.exports = router;
