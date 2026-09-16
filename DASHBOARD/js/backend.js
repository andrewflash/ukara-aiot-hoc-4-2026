// Same-origin read-only API. No Telegram token or SMTP password in the browser.
(() => {
  const el = id => document.getElementById(id);
  let busy = false;
  const time = value => new Date(value).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  function table(id, rows, columns) {
    const body = el(id); body.replaceChildren();
    if (!rows.length) {
      const tr = document.createElement('tr'), td = document.createElement('td');
      td.colSpan = columns.length; td.textContent = 'Belum ada data untuk perangkat ini.';
      tr.append(td); body.append(tr); return;
    }
    for (const row of rows) {
      const tr = document.createElement('tr');
      for (const column of columns) { const td = document.createElement('td'); td.textContent = column(row); tr.append(td); }
      body.append(tr);
    }
  }
  async function json(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000), cache: 'no-store' });
    if (!response.ok) throw new Error(`API ${response.status}`);
    return response.json();
  }
  async function refresh() {
    if (busy) return;
    const device = el('historyDevice').value.trim();
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(device)) { el('backendStatus').textContent = 'Device ID tidak valid.'; return; }
    busy = true;
    try {
      const query = encodeURIComponent(device);
      const [history, events, devices] = await Promise.all([
        json(`/api/history?device=${query}&limit=50`), json(`/api/events?device=${query}&limit=20`), json('/api/devices')
      ]);
      if (device !== el('historyDevice').value.trim()) return;
      const selected = devices.find(d => d.device === device);
      el('backendStatus').textContent = `Backend aktif | ${!selected ? 'Belum menerima perangkat' : selected.stale ? 'Data perangkat terlambat' : 'Data perangkat terbaru'} | Histori dimuat ${time(Date.now())}`;
      table('savedHistory', history, [r => time(r.received_at), r => r.simulated ? 'Simulasi' : 'ESP32', r => r.label, r => r.anomaly.toFixed(3), r => r.threshold, r => r.status]);
      table('savedEvents', events, [r => time(r.received_at), r => r.kind, r => r.simulated ? 'Simulasi' : 'ESP32', r => r.anomaly.toFixed(3), r => r.deliveries.length ? r.deliveries.map(d => `${d.channel}: ${d.status}`).join(' | ') : 'Belum diproses / tertunda']);
    } catch { el('backendStatus').textContent = 'Backend tidak tersedia. Histori yang terlihat belum diperbarui; jalankan npm start di BACKEND.'; }
    finally { busy = false; }
  }
  async function init() {
    try {
      const health = await json('/api/health');
      el('historyDevice').value = health.device;
      el('topicInput').value = `${health.mqttPrefix}/${health.device}`;
      el('brokerInput').value = health.mqttWsUrl;
      el('ruleSummary').textContent = `${health.rule.alarmWindows} anomali berurutan; ${health.rule.recoveryWindows} normal untuk pulih; jeda alert ${health.rule.cooldownMs / 1000} detik. Notifikasi: ${health.notificationsEnabled ? 'diaktifkan (cek konfigurasi kanal)' : 'DRY_RUN, tidak mengirim pesan'}.`;
    } catch { /* Refresh below provides a readable error. */ }
    await refresh();
  }
  el('refreshHistory').addEventListener('click', refresh);
  el('historyDevice').addEventListener('change', refresh);
  setInterval(() => { if (!document.hidden) refresh(); }, 5000);
  init();
})();
