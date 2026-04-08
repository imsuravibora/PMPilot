const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

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
  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: PM_SYSTEM_PROMPT },
      { role: 'user', content: `Analyze the following project data and provide a structured PM insights report.

COLUMNS: ${headers.join(', ')}

DATA SAMPLE:
${dataText}

Please provide:
1. **Project Health Summary** (1-2 sentences)
2. **Key Metrics** (important numbers from the data)
3. **Risk Flags** (use 🔴 🟡 🟢 indicators)
4. **Top 3 Recommendations** (actionable next steps)
5. **Items Needing Immediate Attention**

Keep it practical and concise.` }
    ],
    max_tokens: 1024
  });
  return response.choices[0].message.content;
}

async function chatWithData(message, dataText, headers, chatHistory) {
  const historyMessages = chatHistory.slice(-6).map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content
  }));

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: PM_SYSTEM_PROMPT + `\n\nThe project manager has uploaded the following project data:\nCOLUMNS: ${headers.join(', ')}\nDATA:\n${dataText}` },
      ...historyMessages,
      { role: 'user', content: message }
    ],
    max_tokens: 1024
  });
  return response.choices[0].message.content;
}

async function generateStatusReport(dataText, headers) {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: PM_SYSTEM_PROMPT },
      { role: 'user', content: `Generate a professional project status report based on this data.

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

Make it professional, ready to send to a stakeholder or team.` }
    ],
    max_tokens: 1500
  });
  return response.choices[0].message.content;
}

async function summarizeDocument(documentText, filename) {
  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: PM_SYSTEM_PROMPT },
      { role: 'user', content: `Summarize the following project document: "${filename}"

DOCUMENT CONTENT:
${documentText.substring(0, 8000)}

Provide:
1. **Document Type** (Meeting Notes / Risk Log / Project Charter / Report / Other)
2. **Key Points** (5 bullet points max)
3. **Action Items** (if any)
4. **Important Dates/Deadlines** (if mentioned)

Keep the summary concise and useful for a project manager.` }
    ],
    max_tokens: 800
  });
  return response.choices[0].message.content;
}

module.exports = { generateInsights, chatWithData, generateStatusReport, summarizeDocument };
