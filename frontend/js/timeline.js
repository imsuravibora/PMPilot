// =============================================
// PMPilot — Timeline Estimator
// =============================================

let timelineCharts = [];

function handleTimelineDrop(e) {
  e.preventDefault();
  document.getElementById('timeline-upload-zone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) analyseTimeline(file);
}

function handleTimelineSelect(e) {
  const file = e.target.files[0];
  if (file) analyseTimeline(file);
  e.target.value = '';
}

async function analyseTimeline(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['csv', 'xlsx', 'xls'].includes(ext)) {
    showToast('Only CSV and Excel files are supported', 'error');
    return;
  }

  document.getElementById('timeline-results').style.display = 'none';
  document.getElementById('timeline-loading').style.display = 'block';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('sessionId', SESSION_ID);

  try {
    const res = await fetch(`${API}/timeline/analyse`, { method: 'POST', body: formData });
    const data = await res.json();

    document.getElementById('timeline-loading').style.display = 'none';

    if (!res.ok) {
      showToast(data.error || 'Analysis failed', 'error');
      return;
    }

    renderTimelineResults(data);
    showToast('Timeline analysed successfully!', 'success');

  } catch (err) {
    document.getElementById('timeline-loading').style.display = 'none';
    showToast('Analysis failed. Is the server running?', 'error');
  }
}

function renderTimelineResults(data) {
  const { timeline, aiInsights } = data;

  // Destroy old charts
  timelineCharts.forEach(c => c.destroy());
  timelineCharts = [];

  // --- Stat Cards ---
  document.getElementById('timeline-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon blue">⏱</div>
      <div class="stat-info">
        <span class="stat-value">${timeline.weeksNeeded}</span>
        <span class="stat-label">Weeks Estimated</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon purple">📅</div>
      <div class="stat-info">
        <span class="stat-value">${timeline.monthsNeeded}</span>
        <span class="stat-label">Months Estimated</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon green">📊</div>
      <div class="stat-info">
        <span class="stat-value">Q${Math.ceil(timeline.quartersNeeded)}</span>
        <span class="stat-label">Quarters Needed</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon red">⚡</div>
      <div class="stat-info">
        <span class="stat-value">${timeline.totalEstimatedHours}</span>
        <span class="stat-label">Total Hours</span>
      </div>
    </div>
  `;

  const members = timeline.memberList.filter(m => m.totalEstimatedHours > 0);
  const labels = members.map(m => m.name.split(' ')[0]); // First name only

  // --- Chart 1: Hours per member ---
  const memberCtx = document.getElementById('timeline-member-chart').getContext('2d');
  timelineCharts.push(new Chart(memberCtx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Estimated Work (hrs)',
          data: members.map(m => m.totalEstimatedHours),
          backgroundColor: '#3b82f6',
          borderRadius: 6,
        },
        {
          label: 'Weekly Capacity (hrs)',
          data: members.map(m => Math.round(m.hoursPerWeek * timeline.weeksNeeded)),
          backgroundColor: '#e2e8f0',
          borderRadius: 6,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } },
      scales: {
        y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
        x: { grid: { display: false } }
      }
    }
  }));

  // --- Chart 2: Utilization % ---
  const utilCtx = document.getElementById('timeline-util-chart').getContext('2d');
  const utilData = timeline.bottlenecks.filter(m => m.totalEstimatedHours > 0);
  timelineCharts.push(new Chart(utilCtx, {
    type: 'doughnut',
    data: {
      labels: utilData.map(m => m.name.split(' ')[0]),
      datasets: [{
        data: utilData.map(m => m.totalEstimatedHours),
        backgroundColor: [
          '#3b82f6','#10b981','#f59e0b','#ef4444',
          '#8b5cf6','#ec4899','#06b6d4','#f97316'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { font: { size: 11 }, padding: 10 } }
      }
    }
  }));

  // --- Chart 3: Gantt-style horizontal bar ---
  const ganttCtx = document.getElementById('timeline-gantt-chart').getContext('2d');
  const ganttMembers = timeline.bottlenecks.filter(m => m.totalEstimatedHours > 0);
  timelineCharts.push(new Chart(ganttCtx, {
    type: 'bar',
    data: {
      labels: ganttMembers.map(m => `${m.name} (${m.role})`),
      datasets: [{
        label: 'Weeks to Complete',
        data: ganttMembers.map(m => parseFloat(m.weeksToComplete.toFixed(1))),
        backgroundColor: ganttMembers.map(m => {
          if (m.weeksToComplete > timeline.weeksNeeded * 1.2) return '#ef4444';
          if (m.weeksToComplete > timeline.weeksNeeded * 0.9) return '#f59e0b';
          return '#10b981';
        }),
        borderRadius: 4,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.raw} weeks (${Math.round(ctx.raw * 4.33 * 10) / 10} months)`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: '#f1f5f9' },
          title: { display: true, text: 'Weeks', font: { size: 11 } },
          ticks: { callback: v => v + 'w' }
        },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } }
      }
    }
  }));

  // --- AI Insights ---
  document.getElementById('timeline-ai-text').textContent = aiInsights;

  document.getElementById('timeline-results').style.display = 'block';
  document.getElementById('timeline-results').scrollIntoView({ behavior: 'smooth' });
}
