require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const uploadRoutes = require('./routes/upload');
const chatRoutes = require('./routes/chat');
const documentsRoutes = require('./routes/documents');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory session store
const sessions = new Map();
app.locals.sessions = sessions;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/documents', documentsRoutes);

// Session management
app.post('/api/session/create', (req, res) => {
  const { v4: uuidv4 } = require('uuid');
  const sessionId = uuidv4();
  sessions.set(sessionId, {
    id: sessionId,
    projectData: null,
    headers: [],
    rawDataText: '',
    documents: [],
    chatHistory: [],
    insights: null,
    createdAt: new Date()
  });
  res.json({ sessionId });
});

app.get('/api/session/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({
    hasData: !!session.projectData,
    headers: session.headers,
    rowCount: session.projectData ? session.projectData.length : 0,
    documentCount: session.documents.length,
    insights: session.insights
  });
});

app.delete('/api/session/:sessionId', (req, res) => {
  sessions.delete(req.params.sessionId);
  res.json({ message: 'Session cleared' });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 PMPilot is running at http://localhost:${PORT}\n`);
});
// updated Mon Apr  6 20:37:15 EDT 2026
