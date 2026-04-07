const express = require('express');
const multer = require('multer');
const router = express.Router();
const { summarizeDocument } = require('../utils/gemini');
const { v4: uuidv4 } = require('uuid');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.toLowerCase().split('.').pop();
    if (['pdf', 'txt', 'md'].includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, TXT, and MD files are supported'));
  }
});

async function extractText(buffer, ext) {
  if (ext === 'txt' || ext === 'md') {
    return buffer.toString('utf-8');
  }
  if (ext === 'pdf') {
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      return data.text;
    } catch (e) {
      return 'PDF text extraction failed. Please use a TXT version.';
    }
  }
  return '';
}

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'Session ID required' });

    const sessions = req.app.locals.sessions;
    const session = sessions.get(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = req.file.originalname.toLowerCase().split('.').pop();
    const text = await extractText(req.file.buffer, ext);

    let summary = 'Generating summary...';
    try {
      summary = await summarizeDocument(text, req.file.originalname);
    } catch (e) {
      summary = 'AI summary unavailable. Please check your API key.';
    }

    const doc = {
      id: uuidv4(),
      name: req.file.originalname,
      type: ext.toUpperCase(),
      size: req.file.size,
      summary,
      uploadedAt: new Date().toISOString(),
      textPreview: text.substring(0, 300)
    };

    session.documents.push(doc);
    res.json({ success: true, document: doc });

  } catch (err) {
    console.error('Document upload error:', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

router.get('/:sessionId', (req, res) => {
  const sessions = req.app.locals.sessions;
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({ documents: session.documents });
});

router.delete('/:sessionId/:docId', (req, res) => {
  const sessions = req.app.locals.sessions;
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  session.documents = session.documents.filter(d => d.id !== req.params.docId);
  res.json({ success: true });
});

module.exports = router;
