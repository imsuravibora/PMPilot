// =============================================
// PMPilot — Charts & Visualizations
// =============================================

const CHART_COLORS = {
  blue:   '#3b82f6',
  green:  '#10b981',
  red:    '#ef4444',
  yellow: '#f59e0b',
  purple: '#8b5cf6',
  pink:   '#ec4899',
  cyan:   '#06b6d4',
  orange: '#f97316',
};

const STATUS_COLORS = {
  'completed':    '#10b981',
  'in progress':  '#3b82f6',
  'not started':  '#94a3b8',
  'blocked':      '#ef4444',
  'overdue':      '#f97316',
  'on track':     '#10b981',
  'at risk':      '#f59e0b',
  'delayed':      '#ef4444',
};

const PRIORITY_COLORS = {
  'critical': '#ef4444',
  'high':     '#f97316',
  'medium':   '#f59e0b',
  'low':      '#10b981',
};

let activeCharts = [];

function destroyCharts() {
  activeCharts.forEach(c => c.destroy());
  activeCharts = [];
}

function renderChartsPage() {
  const emptyEl = document.getElementById('charts-empty');
  const contentEl = document.getElementById('charts-content');
  const data = window.__uploadData;

  if (!data || !data.preview || data.preview.length === 0) {
    emptyEl.style.display = 'block';
    contentEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  contentEl.style.display = 'block';

  destroyCharts();

  const rows = data.preview;
  const headers = data.headers;
  const grid = document.getElementById('charts-grid');
  grid.innerHTML = '';

  // Detect columns
  const statusCol   = headers.find(h => /status/i.test(h));
  const priorityCol = headers.find(h => /priority/i.test(h));
  const progressCol = headers.find(h => /progress|complete|%/i.test(h));
  const deptCol     = headers.find(h => /dept|department|team/i.test(h));
  const assignedCol = headers.find(h => /assigned|owner|member/i.test(h));
  const budgetCol   = headers.find(h => /budget/i.test(h));
  const spentCol    = headers.find(h => /spent|actual|cost/i.test(h));
  const taskCol     = headers.find(h => /task|name|title/i.test(h));

  // 1. Status Distribution (Donut)
  if (statusCol) {
    const counts = countValues(rows, statusCol);
    addChart(grid, 'status-chart', 'Task Status Distribution', 'Overview of all task statuses', () => {
      return new Chart(document.getElementById('status-chart'), {
        type: 'doughnut',
        data: {
          labels: Object.keys(counts),
          datasets: [{
            data: Object.values(counts),
            backgroundColor: Object.keys(counts).map(k => STATUS_COLORS[k.toLowerCase()] || CHART_COLORS.blue),
            borderWidth: 2,
            borderColor: '#fff',
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { font: { size: 12 }, padding: 12 } }
          }
        }
      });
    });
  }

  // 2. Priority Breakdown (Bar)
  if (priorityCol) {
    const counts = countValues(rows, priorityCol);
    addChart(grid, 'priority-chart', 'Priority Breakdown', 'Number of tasks by priority level', () => {
      return new Chart(document.getElementById('priority-chart'), {
        type: 'bar',
        data: {
          labels: Object.keys(counts),
          datasets: [{
            label: 'Tasks',
            data: Object.values(counts),
            backgroundColor: Object.keys(counts).map(k => PRIORITY_COLORS[k.toLowerCase()] || CHART_COLORS.blue),
            borderRadius: 6,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f1f5f9' } },
            x: { grid: { display: false } }
          }
        }
      });
    });
  }

  // 3. Tasks by Department (Horizontal Bar)
  if (deptCol) {
    const counts = countValues(rows, deptCol);
    addChart(grid, 'dept-chart', 'Tasks by Department', 'Workload distribution across departments', () => {
      return new Chart(document.getElementById('dept-chart'), {
        type: 'bar',
        data: {
          labels: Object.keys(counts),
          datasets: [{
            label: 'Tasks',
            data: Object.values(counts),
            backgroundColor: Object.values(CHART_COLORS),
            borderRadius: 6,
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f1f5f9' } },
            y: { grid: { display: false } }
          }
        }
      });
    });
  }

  // 4. Tasks by Assignee (Bar)
  if (assignedCol) {
    const counts = countValues(rows, assignedCol);
    addChart(grid, 'assignee-chart', 'Tasks by Team Member', 'Individual workload distribution', () => {
      return new Chart(document.getElementById('assignee-chart'), {
        type: 'bar',
        data: {
          labels: Object.keys(counts),
          datasets: [{
            label: 'Tasks',
            data: Object.values(counts),
            backgroundColor: CHART_COLORS.purple,
            borderRadius: 6,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f1f5f9' } },
            x: { grid: { display: false }, ticks: { maxRotation: 30 } }
          }
        }
      });
    });
  }

  // 5. Budget vs Spent (Grouped Bar) — full width
  if (budgetCol && spentCol) {
    const groupCol = deptCol || assignedCol || taskCol;
    if (groupCol) {
      const groups = {};
      rows.forEach(r => {
        const key = r[groupCol] || 'Unknown';
        const budget = parseFloat(r[budgetCol]) || 0;
        const spent  = parseFloat(r[spentCol])  || 0;
        if (!groups[key]) groups[key] = { budget: 0, spent: 0 };
        groups[key].budget += budget;
        groups[key].spent  += spent;
      });

      const labels = Object.keys(groups).slice(0, 12);
      addChart(grid, 'budget-chart', 'Budget vs Actual Spend', `By ${groupCol}`, () => {
        return new Chart(document.getElementById('budget-chart'), {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label: 'Budget ($)',
                data: labels.map(l => groups[l].budget),
                backgroundColor: CHART_COLORS.blue,
                borderRadius: 4,
              },
              {
                label: 'Spent ($)',
                data: labels.map(l => groups[l].spent),
                backgroundColor: CHART_COLORS.orange,
                borderRadius: 4,
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } },
            scales: {
              y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
              x: { grid: { display: false }, ticks: { maxRotation: 30 } }
            }
          }
        });
      }, true); // full width
    }
  }

  // 6. Progress Tracking (Horizontal Bar) — full width
  if (progressCol && taskCol) {
    const taskData = rows
      .map(r => ({ task: r[taskCol], progress: parseFloat(r[progressCol]) || 0 }))
      .filter(r => r.task)
      .slice(0, 20);

    addChart(grid, 'progress-chart', 'Task Progress Tracker', 'Completion % per task', () => {
      return new Chart(document.getElementById('progress-chart'), {
        type: 'bar',
        data: {
          labels: taskData.map(t => truncate(t.task, 30)),
          datasets: [{
            label: 'Progress %',
            data: taskData.map(t => t.progress),
            backgroundColor: taskData.map(t =>
              t.progress >= 100 ? CHART_COLORS.green :
              t.progress >= 50  ? CHART_COLORS.blue  :
              t.progress >= 20  ? CHART_COLORS.yellow :
                                  CHART_COLORS.red
            ),
            borderRadius: 4,
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, max: 100, grid: { color: '#f1f5f9' }, ticks: { callback: v => v + '%' } },
            y: { grid: { display: false }, ticks: { font: { size: 11 } } }
          }
        }
      });
    }, true); // full width
  }
}

// --- Helpers ---

function addChart(grid, id, title, subtitle, createFn, fullWidth = false) {
  const card = document.createElement('div');
  card.className = `chart-card${fullWidth ? ' full-width' : ''}`;
  card.innerHTML = `
    <h3>${title}</h3>
    <div class="chart-subtitle">${subtitle}</div>
    <div class="chart-wrapper${fullWidth ? ' tall' : ''}">
      <canvas id="${id}"></canvas>
    </div>
  `;
  grid.appendChild(card);
  const chart = createFn();
  activeCharts.push(chart);
}

function countValues(rows, col) {
  const counts = {};
  rows.forEach(r => {
    const val = (r[col] || 'Unknown').trim();
    counts[val] = (counts[val] || 0) + 1;
  });
  return Object.fromEntries(
    Object.entries(counts).sort((a, b) => b[1] - a[1])
  );
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n) + '...' : str;
}
