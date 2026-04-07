const csv = require('csv-parser');
const XLSX = require('xlsx');
const { Readable } = require('stream');

async function parseCSV(buffer) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(buffer.toString());
    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function generateStats(data, headers) {
  const stats = {
    totalRows: data.length,
    totalColumns: headers.length,
    columns: {}
  };

  headers.forEach(header => {
    const values = data.map(row => row[header]).filter(v => v !== '' && v !== null && v !== undefined);
    const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));

    stats.columns[header] = {
      nonEmpty: values.length,
      empty: data.length - values.length,
      isNumeric: numericValues.length > values.length * 0.5
    };

    if (numericValues.length > 0) {
      const sum = numericValues.reduce((a, b) => a + b, 0);
      stats.columns[header].min = Math.min(...numericValues);
      stats.columns[header].max = Math.max(...numericValues);
      stats.columns[header].avg = parseFloat((sum / numericValues.length).toFixed(2));
    }
  });

  return stats;
}

function dataToText(data, maxRows = 100) {
  if (!data || data.length === 0) return '';
  const sample = data.slice(0, maxRows);
  return sample.map(row => Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(' | ')).join('\n');
}

function detectRisks(data, headers) {
  const risks = [];

  // Look for common PM risk indicators
  const statusCol = headers.find(h => h.toLowerCase().includes('status'));
  const priorityCol = headers.find(h => h.toLowerCase().includes('priority'));
  const dueDateCol = headers.find(h => h.toLowerCase().includes('due') || h.toLowerCase().includes('deadline') || h.toLowerCase().includes('date'));
  const progressCol = headers.find(h => h.toLowerCase().includes('progress') || h.toLowerCase().includes('%') || h.toLowerCase().includes('complete'));

  if (statusCol) {
    const blocked = data.filter(r => String(r[statusCol]).toLowerCase().includes('block') || String(r[statusCol]).toLowerCase().includes('stuck'));
    if (blocked.length > 0) risks.push({ level: 'high', message: `${blocked.length} task(s) are blocked` });

    const overdue = data.filter(r => String(r[statusCol]).toLowerCase().includes('overdue') || String(r[statusCol]).toLowerCase().includes('late'));
    if (overdue.length > 0) risks.push({ level: 'high', message: `${overdue.length} task(s) are overdue` });
  }

  if (priorityCol) {
    const critical = data.filter(r => String(r[priorityCol]).toLowerCase().includes('critical') || String(r[priorityCol]).toLowerCase().includes('urgent'));
    if (critical.length > 0) risks.push({ level: 'medium', message: `${critical.length} task(s) marked as critical/urgent priority` });
  }

  if (progressCol) {
    const stalled = data.filter(r => {
      const val = parseFloat(r[progressCol]);
      return !isNaN(val) && val < 20;
    });
    if (stalled.length > 3) risks.push({ level: 'medium', message: `${stalled.length} tasks have less than 20% progress` });
  }

  if (dueDateCol) {
    const today = new Date();
    const soonDue = data.filter(r => {
      const d = new Date(r[dueDateCol]);
      if (isNaN(d)) return false;
      const diffDays = (d - today) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 7;
    });
    if (soonDue.length > 0) risks.push({ level: 'medium', message: `${soonDue.length} task(s) due within the next 7 days` });
  }

  return risks;
}

module.exports = { parseCSV, parseExcel, generateStats, dataToText, detectRisks };
