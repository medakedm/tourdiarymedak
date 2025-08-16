// dashboard-webhook.js
class DashboardWebhookHandler {
  constructor(csvUrl) {
    this.csvUrl = csvUrl;
    this.initializePolling();
  }

  initializePolling() {
    setInterval(() => this.checkForUpdates(), 30000);
    this.checkForUpdates();
  }

  async checkForUpdates() {
    try {
      const response = await fetch(this.csvUrl);
      const csvData = await response.text();
      const lastUpdate = localStorage.getItem('lastDashboardUpdate');
      const currentUpdate = this.getLatestTimestamp(csvData);
      if (!lastUpdate || currentUpdate > lastUpdate) {
        console.log('🔄 New data detected, updating dashboard...');
        this.updateDashboardData(csvData);
        localStorage.setItem('lastDashboardUpdate', currentUpdate);
      }
    } catch (e) {
      console.error('Polling failed:', e);
    }
  }

  getLatestTimestamp(csvData) {
    const lines = csvData.trim().split('\n');
    const lastLine = lines[lines.length - 1];
    return lastLine.split(',')[0];
  }

  updateDashboardData(csvData) {
    const data = this.parseCSV(csvData);
    if (window.officerChart) this.updateOfficerChart(data);
    if (window.coverageChart) this.updateCoverageChart(data);
    this.updateKPICards(data);
    this.updateDataTable(data);
  }

  parseCSV(csv) {
    const [header, ...rows] = csv.split('\n');
    const keys = header.split(',');
    return rows.map(r => {
      const vals = r.split(',');
      return keys.reduce((obj, k, i) => {
        obj[k.trim()] = vals[i]?.trim() || '';
        return obj;
      }, {});
    });
  }

  updateOfficerChart(data) {
    const counts = {};
    data.forEach(r => {
      const name = r['Officer_Name_Clean'] || r['Name of the Officer'];
      counts[name] = (counts[name] || 0) + 1;
    });
    window.officerChart.data.labels = Object.keys(counts);
    window.officerChart.data.datasets[0].data = Object.values(counts);
    window.officerChart.update();
  }

  updateCoverageChart(data) {
    const counts = {};
    data.forEach(r => {
      const key = `${r['Mandal Name']}–${r['Panchayat_Clean'] || r['Panchayat Name']}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    window.coverageChart.data.labels = Object.keys(counts);
    window.coverageChart.data.datasets[0].data = Object.values(counts);
    window.coverageChart.update();
  }

  updateKPICards(data) {
    const total = data.length;
    const attached = data.filter(r => r['Attachments']).length;
    document.querySelector('#total-tours').textContent = total;
    document.querySelector('#perc-attachments').textContent = `${Math.round(attached/total*100)}%`;
  }

  updateDataTable(data) {
    const tbody = document.querySelector('#data-table tbody');
    tbody.innerHTML = '';
    data.slice(-20).reverse().forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r['Timestamp']}</td>
        <td>${r['Officer_Name_Clean'] || r['Name of the Officer']}</td>
        <td>${r['Department_Clean'] || r['Department']}</td>
        <td>${r['Mandal Name']}</td>
        <td>${r['Panchayat_Clean'] || r['Panchayat Name']}</td>
        <td>${r['Purpose of Visit']}</td>
        <td>${r['Key observations/Outcomes']}</td>
      `;
      tbody.appendChild(tr);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Replace with your published sheet CSV URL:
  const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRXnedc4Q4j1BnytlbJut2IOV6OcctQgCurlyFPDu6YgN1QNs9RrhlxaC-3dI2BVBQhq6uQJnaH6Ds5/pubhtml?gid=1958057995&single=true';
  window.dashboardWebhook = new DashboardWebhookHandler(csvUrl);
});
