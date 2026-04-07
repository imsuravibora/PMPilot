const express = require('express');
const multer = require('multer');
const router = express.Router();
const { parseCSV, parseExcel, generateStats, dataToText, detectRisks } = require('../utils/dataProcessor');
const { generateInsights } = require('../utils/gemini');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const ext = file.originalname.toLowerCase().split('.').pop();
    if (['csv', 'xlsx', 'xls'].includes(ext)) cb(null, true);
    else cb(new Error('Only CSV and Excel files are allowed'));
  }
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'Session ID required' });

    const sessions = req.app.locals.sessions;
    let session = sessions.get(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = req.file.originalname.toLowerCase().split('.').pop();
    let data;

    if (ext === 'csv') {
      data = await parseCSV(req.file.buffer);
    } else {
      data = parseExcel(req.file.buffer);
    }

    if (!data || data.length === 0) {
      return res.status(400).json({ error: 'File appears to be empty or unreadable' });
    }

    const headers = Object.keys(data[0]);
    const stats = generateStats(data, headers);
    const risks = detectRisks(data, headers);
    const rawDataText = dataToText(data);

    // Update session
    session.projectData = data;
    session.headers = headers;
    session.rawDataText = rawDataText;
    session.fileName = req.file.originalname;
    session.stats = stats;
    session.risks = risks;
    session.insights = null; // will be generated next

    // Generate AI insights
    try {
      const aiInsights = await generateInsights(rawDataText, headers);
      session.insights = aiInsights;
    } catch (aiErr) {
      console.error('AI insights error:', aiErr.message);
      session.insights = 'AI insights unavailable. Please check your API key.';
    }

    sessions.set(sessionId, session);

    res.json({
      success: true,
      fileName: req.file.originalname,
      totalRows: stats.totalRows,
      totalColumns: stats.totalColumns,
      headers,
      stats,
      risks,
      insights: session.insights,
      preview: data.slice(0, 5)
    });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

module.exports = router;
