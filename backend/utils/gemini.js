const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const PM_SYSTEM_PROMPT = `You are PMPilot, an expert AI assistant for project managers and project coordinators.
You analyze project data and documentation to provide clear, actionable insights.

Your expertise includes:
- Risk identification and mitigation strategies
- Schedule and deadline analysis
- Resource allocation and workload management
- Budget tracking and forecasting
- Project health assessment
- Status report generation
- Stakeholder communication

Always respond in a professional, concise tone suited for project managers.
Structure your responses clearly with bullet points or sections when appropriate.
Flag risks using clear indicators: 🔴 HIGH RISK, 🟡 MEDIUM RISK, 🟢 LOW RISK.
Always end with at least one actionable recommendation.`;

async function generateInsights(dataText, headers) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `${PM_SYSTEM_PROMPT}

Analyze the following project data and provide a structured PM insights report.

COLUMNS: ${headers.join(', ')}

DATA SAMPLE:
${dataText}

Please provide:
1. **Project Health Summary** (1-2 sentences)
2. **Key Metrics** (important numbers from the data)
3. **Risk Flags** (use 🔴 🟡 🟢 indicators)
4. **Top 3 Recommendations** (actionable next steps)
5. **Items Needing Immediate Attention**

Keep it practical and concise.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function chatWithData(message, dataText, headers, chatHistory) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const historyContext = chatHistory.length > 0
    ? '\n\nPREVIOUS CONVERSATION:\n' + chatHistory.slice(-6).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')
    : '';

  const prompt = `${PM_SYSTEM_PROMPT}

The project manager has uploaded the following project data:
COLUMNS: ${headers.join(', ')}
DATA:
${dataText}
${historyContext}

PROJECT MANAGER'S QUESTION: ${message}

Provide a helpful, specific answer based on the data provided. Be concise and actionable.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function generateStatusReport(dataText, headers) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const prompt = `${PM_SYSTEM_PROMPT}

Generate a professional project status report based on this data.

COLUMNS: ${headers.join(', ')}
DATA:
${dataText}

Create a formal status report with this structure:

PROJECT STATUS REPORT
Date: ${today}

EXECUTIVE SUMMARY:
[2-3 sentence overview]

OVERALL STATUS: [🟢 ON TRACK / 🟡 AT RISK / 🔴 OFF TRACK]

KEY ACCOMPLISHMENTS THIS PERIOD:
- [bullet points]

UPCOMING MILESTONES:
- [bullet points]

RISKS & ISSUES:
- [bullet points with severity]

RESOURCE STATUS:
[brief summary]

NEXT STEPS:
- [bullet points]

Make it professional, ready to send to a stakeholder or team.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function summarizeDocument(documentText, filename) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `${PM_SYSTEM_PROMPT}

Summarize the following project document: "${filename}"

DOCUMENT CONTENT:
${documentText.substring(0, 8000)}

Provide:
1. **Document Type** (Meeting Notes / Risk Log / Project Charter / Report / Other)
2. **Key Points** (5 bullet points max)
3. **Action Items** (if any)
4. **Important Dates/Deadlines** (if mentioned)

Keep the summary concise and useful for a project manager.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

module.exports = { generateInsights, chatWithData, generateStatusReport, summarizeDocument };
