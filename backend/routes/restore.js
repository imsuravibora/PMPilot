const express = require('express');
const router = express.Router();
const { generateInsights, generateStatusReport } = require('../utils/gemini');
const { dataToText, detectRisks } = require('../utils/dataProcessor');

// Restore session from client localStorage data
router.post('/', async (req, res) => {
  try {
    const { sessionId, fileName, headers, rows, stats } = req.body;
    if (!sessionId || !rows || !headers) {
      return res.status(400).json({ error: 'Missing session data' });
    }

    const sessions = req.app.locals.sessions;
    let session = sessions.get(sessionId);

    if (!session) {
      session = {
        id: sessionId,
        projectData: null,
        headers: [],
        rawDataText: '',
        documents: [],
        chatHistory: [],
        insights: null,
        createdAt: new Date()
      };
    }

    const rawDataText = rows.map(row =>
      Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(' | ')
    ).join('\n');

    const risks = detectRisks(rows, headers);

    session.projectData = rows;
    session.headers = headers;
    session.rawDataText = rawDataText;
    session.fileName = fileName;
    session.stats = stats;
    session.risks = risks;

    // Re-generate insights if missing
    if (!session.insights) {
      try {
        session.insights = await generateInsights(rawDataText, headers);
      } catch (e) {
        session.insights = 'AI insights unavailable. Please check your API key.';
      }
    }

    sessions.set(sessionId, session);
    res.json({ success: true, insights: session.insights, risks });

  } catch (err) {
    console.error('Restore error:', err);
    res.status(500).json({ error: 'Failed to restore session' });
  }
});

// Generate report from restored session
router.post('/report', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const sessions = req.app.locals.sessions;
    const session = sessions.get(sessionId);

    if (!session || !session.projectData) {
      return res.status(400).json({ error: 'No data in session. Please restore first.' });
    }

    const report = await generateStatusReport(session.rawDataText, session.headers);
    res.json({ report });

  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

module.exports = router;
