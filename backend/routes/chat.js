const express = require('express');
const router = express.Router();
const { chatWithData, generateStatusReport } = require('../utils/gemini');

router.post('/', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    if (!sessionId || !message) return res.status(400).json({ error: 'Session ID and message required' });

    const sessions = req.app.locals.sessions;
    const session = sessions.get(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (!session.projectData) {
      return res.json({
        reply: "I don't have any project data to analyze yet. Please upload a CSV or Excel file first, and then I can answer your questions about it!"
      });
    }

    const reply = await chatWithData(
      message,
      session.rawDataText,
      session.headers,
      session.chatHistory
    );

    // Save to chat history
    session.chatHistory.push({ role: 'user', content: message });
    session.chatHistory.push({ role: 'assistant', content: reply });

    // Keep history manageable
    if (session.chatHistory.length > 20) {
      session.chatHistory = session.chatHistory.slice(-20);
    }

    res.json({ reply });

  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Failed to get AI response. Please check your API key.' });
  }
});

router.post('/report', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const sessions = req.app.locals.sessions;
    const session = sessions.get(sessionId);

    if (!session || !session.projectData) {
      return res.status(400).json({ error: 'No project data found. Please upload data first.' });
    }

    const report = await generateStatusReport(session.rawDataText, session.headers);
    res.json({ report });

  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

router.delete('/history/:sessionId', (req, res) => {
  const sessions = req.app.locals.sessions;
  const session = sessions.get(req.params.sessionId);
  if (session) {
    session.chatHistory = [];
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

module.exports = router;
