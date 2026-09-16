/* =====================================================================
   Logika dashboard: koneksi MQTT, parsing payload, dan update UI.
   ===================================================================== */

(() => {
  /* ---------- Referensi elemen ---------- */
  const el = (id) => document.getElementById(id);

  const ui = {
    connPill: el("connPill"),
    connText: el("connText"),
    themeToggle: el("themeToggle"),
    connForm: el("connForm"),
    brokerInput: el("brokerInput"),
    topicInput: el("topicInput"),
    connectBtn: el("connectBtn"),
    demoToggle: el("demoToggle"),

    statusCard: el("statusCard"),
    statusValue: el("statusValue"),
    statusIcon: el("statusIcon"),
    deviceId: el("deviceId"),
    lastSeen: el("lastSeen"),

    topLabel: el("topLabel"),
    topConfidence: el("topConfidence"),

    anomalyValue: el("anomalyValue"),
    anomalyFill: el("anomalyFill"),
    anomalyMark: el("anomalyMark"),
    anomalyMeter: el("anomalyMeter"),
    thresholdText: el("thresholdText"),

    totalTiming: el("totalTiming"),
    dspTiming: el("dspTiming"),
    clsTiming: el("clsTiming"),
    anomTiming: el("anomTiming"),

    classBars: el("classBars"),
    classLegend: el("classLegend"),

    anomalyTableBody: el("anomalyTableBody"),
    classTableHead: el("classTableHead"),
    classTableBody: el("classTableBody"),

    uptime: el("uptime"),
    heapUsed: el("heapUsed"),
    heapFree: el("heapFree"),
    msgCount: el("msgCount"),
    msgRate: el("msgRate"),
    activeTopic: el("activeTopic"),

    rawPayload: el("rawPayload"),
    eventLog: el("eventLog"),
  };

  /* ---------- State ---------- */
  const state = {
    client: null,
    demoTimer: null,
    threshold: CONFIG.defaultThreshold,
    messages: 0,
    lastMessageAt: 0,
    firstMessageAt: 0,
    history: [], // baris untuk table view
  };

  const ICONS = {
    waiting: '<circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" />',
    normal: '<circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" />',
    anomali: '<path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" />',
  };

  /* ---------- Utilitas format ---------- */

  function clockLabel(date = new Date()) {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  function formatDuration(ms) {
    if (!Number.isFinite(ms)) return "—";
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h} jam ${m} mnt`;
    if (m > 0) return `${m} mnt ${s} dtk`;
    return `${s} dtk`;
  }

  function logEvent(message, kind = "info") {
    const li = document.createElement("li");
    li.dataset.kind = kind;
    li.innerHTML = `<span class="log__time">${clockLabel()}</span><span class="log__msg"></span>`;
    li.querySelector(".log__msg").textContent = message;

    ui.eventLog.prepend(li);
    while (ui.eventLog.children.length > CONFIG.maxLogRows) {
      ui.eventLog.lastElementChild.remove();
    }
  }

  function setConnection(kind, text) {
    ui.connPill.className = `pill pill--${kind}`;
    ui.connText.textContent = text;
  }

  /* ---------- Normalisasi payload ----------
     Firmware mengirim classes sebagai array supaya urutan label terjaga.
     Bentuk object tetap diterima agar dashboard tidak pecah kalau payload
     diubah peserta saat latihan. */

  function normalize(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Payload harus berupa object');
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(raw.device || '')) throw new Error('Device tidak valid');
    for (const key of ['uptime', 'confidence', 'anomaly', 'threshold']) {
      if (typeof raw[key] !== 'number' || !Number.isFinite(raw[key])) throw new Error(`Field ${key} tidak valid`);
    }
    if (raw.uptime < 0 || raw.confidence < 0 || raw.confidence > 1 || raw.threshold <= 0) throw new Error('Nilai di luar rentang');
    if (!['NORMAL', 'ANOMALI'].includes(raw.status) || raw.status !== (raw.anomaly > raw.threshold ? 'ANOMALI' : 'NORMAL')) throw new Error('Status tidak konsisten');
    if (!Array.isArray(raw.classes) || !raw.classes.length || raw.classes.length > 20 || raw.classes.some(c => !c || typeof c.label !== 'string' || typeof c.value !== 'number' || !Number.isFinite(c.value) || c.value < 0 || c.value > 1)) throw new Error('Classes tidak valid');
    let classes = [];

    if (Array.isArray(raw.classes)) {
      classes = raw.classes
        .filter((c) => c && typeof c.label === "string")
        .map((c) => ({ label: c.label, value: Number(c.value) || 0 }));
    } else if (raw.classes && typeof raw.classes === "object") {
      classes = Object.entries(raw.classes).map(([label, value]) => ({
        label,
        value: Number(value) || 0,
      }));
    }

    const threshold = Number.isFinite(raw.threshold) ? raw.threshold : state.threshold;
    const anomaly = Number(raw.anomaly) || 0;

    let top = classes[0] ?? null;
    for (const item of classes) {
      if (!top || item.value > top.value) top = item;
    }

    return {
      device: raw.device || "unknown",
      uptime: Number(raw.uptime),
      label: raw.label || top?.label || "—",
      confidence: Number.isFinite(raw.confidence) ? raw.confidence : top?.value ?? 0,
      anomaly,
      threshold,
      status: (raw.status || (anomaly > threshold ? "ANOMALI" : "NORMAL")).toUpperCase(),
      classes,
      timing: raw.timing || {},
      heap: raw.heap || {},
    };
  }

  /* ---------- Update UI ---------- */

  function renderStatus(data) {
    const key = data.status === "ANOMALI" ? "anomali" : "normal";

    ui.statusCard.dataset.status = key;
    ui.statusValue.textContent = data.status;
    ui.statusIcon.querySelector("svg").innerHTML = ICONS[key];
    ui.deviceId.textContent = data.device;
    ui.lastSeen.textContent = clockLabel();
  }

  function renderTopClass(data) {
    ui.topLabel.textContent = data.label;
    ui.topConfidence.textContent = `${(data.confidence * 100).toFixed(1)}%`;
  }

  function renderAnomaly(data) {
    // Skala meter dibuat relatif terhadap ambang supaya bar tidak langsung
    // mentok saat skor anomaly model melewati 1.0
    const scaleMax = Math.max(1, data.threshold * 3);
    const ratio = Math.min(1, Math.max(0, data.anomaly / scaleMax));

    let severity = "--status-good";
    if (data.anomaly > data.threshold) severity = "--status-critical";
    else if (data.anomaly > data.threshold * 0.66) severity = "--status-warning";

    ui.anomalyValue.textContent = data.anomaly.toFixed(3);
    ui.anomalyMeter.style.setProperty("--meter-color", `var(${severity})`);
    ui.anomalyFill.style.width = `${ratio * 100}%`;
    ui.anomalyMark.style.left = `${(data.threshold / scaleMax) * 100}%`;
    ui.anomalyMeter.setAttribute(
      "aria-label",
      `Anomaly score ${data.anomaly.toFixed(3)} dari ambang ${data.threshold.toFixed(2)}`
    );
    ui.thresholdText.textContent = data.threshold.toFixed(2);
  }

  function renderTiming(data) {
    const dsp = Number(data.timing.dsp) || 0;
    const cls = Number(data.timing.classification) || 0;
    const anom = Number(data.timing.anomaly) || 0;

    ui.totalTiming.textContent = `${dsp + cls + anom} ms`;
    ui.dspTiming.textContent = `${dsp} ms`;
    ui.clsTiming.textContent = `${cls} ms`;
    ui.anomTiming.textContent = `${anom} ms`;
  }

  // Bar list = direct label untuk tiap kelas. Ini juga yang memenuhi
  // "relief rule": nilai selalu terbaca sebagai teks, bukan lewat warna saja.
  function renderClassBars(data) {
    if (!data.classes.length) return;

    const topValue = Math.max(...data.classes.map((c) => c.value));

    ui.classBars.innerHTML = data.classes
      .map((item, i) => {
        const percent = (item.value * 100).toFixed(1);
        return `
        <div class="bar-row" data-top="${item.value === topValue}" style="--c: ${Charts.seriesColor(i)}">
          <div class="bar-row__head">
            <span class="bar-row__dot" aria-hidden="true"></span>
            <span class="bar-row__label">${escapeHtml(item.label)}</span>
            <span class="bar-row__value">${percent}%</span>
          </div>
          <div class="bar-row__track">
            <span class="bar-row__fill" style="width:${percent}%"></span>
          </div>
        </div>`;
      })
      .join("");
  }

  function renderClassLegend(labels) {
    ui.classLegend.innerHTML = labels
      .map(
        (label, i) =>
          `<span class="key__item"><span class="key__swatch" style="--c: ${Charts.seriesColor(
            i
          )}"></span> ${escapeHtml(label)}</span>`
      )
      .join("");
  }

  function renderDeviceInfo(data) {
    ui.uptime.textContent = formatDuration(data.uptime);
    ui.msgCount.textContent = String(state.messages);

    const free = Number(data.heap.free);
    const total = Number(data.heap.total);
    ui.heapFree.textContent = formatBytes(free);
    ui.heapUsed.textContent = Number.isFinite(free) && Number.isFinite(total)
      ? `${formatBytes(total - free)} / ${formatBytes(total)}`
      : "—";

    if (state.messages > 1) {
      const span = state.lastMessageAt - state.firstMessageAt;
      ui.msgRate.textContent = `${Math.round(span / (state.messages - 1))} ms`;
    }
  }

  function renderTables(data, timeLabel) {
    state.history.unshift({ time: timeLabel, data });
    state.history.length = Math.min(state.history.length, CONFIG.maxTableRows);

    ui.anomalyTableBody.innerHTML = state.history
      .map(
        (row) => `<tr>
          <td>${row.time}</td>
          <td>${row.data.anomaly.toFixed(3)}</td>
          <td>${row.data.status}</td>
        </tr>`
      )
      .join("");

    const labels = data.classes.map((c) => c.label);
    ui.classTableHead.innerHTML =
      `<th scope="col">Waktu</th>` +
      labels.map((label) => `<th scope="col">${escapeHtml(label)}</th>`).join("");

    ui.classTableBody.innerHTML = state.history
      .map(
        (row) =>
          `<tr><td>${row.time}</td>` +
          labels
            .map((label) => {
              const found = row.data.classes.find((c) => c.label === label);
              return `<td>${found ? (found.value * 100).toFixed(1) + "%" : "—"}</td>`;
            })
            .join("") +
          `</tr>`
      )
      .join("");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[ch]);
  }

  /* ---------- Pipeline satu pesan ---------- */

  function handlePayload(raw, topic) {
    const data = normalize(raw);
    if (topic !== 'demo/local' && topic.split('/').pop() !== data.device) throw new Error('Topic dan device berbeda');
    const legacyRestart = !raw.boot_id && Date.now() - state.lastMessageAt > CONFIG.staleAfterMs && data.uptime < state.lastUptime;
    if (!legacyRestart && state.lastDevice === data.device && state.lastBoot === raw.boot_id && data.uptime <= state.lastUptime) return;
    state.lastDevice = data.device; state.lastBoot = raw.boot_id; state.lastUptime = data.uptime;
    el('dataSource').textContent = topic === 'demo/local' ? 'SIMULASI UI - tidak tersimpan di backend' : raw.simulated ? 'SIMULASI MQTT - diproses backend' : 'Data perangkat ESP32';
    const now = Date.now();
    const timeLabel = clockLabel();

    state.messages += 1;
    if (state.messages === 1) state.firstMessageAt = now;
    state.lastMessageAt = now;
    state.threshold = data.threshold;

    renderStatus(data);
    renderTopClass(data);
    renderAnomaly(data);
    renderTiming(data);
    renderClassBars(data);
    renderDeviceInfo(data);
    renderTables(data, timeLabel);

    if (topic) ui.activeTopic.textContent = topic;
    ui.rawPayload.textContent = JSON.stringify(raw, null, 2);

    const labels = data.classes.map((c) => c.label);
    if (Charts.ensureClassSeries(labels)) {
      renderClassLegend(labels);
      logEvent(`Label model terdeteksi: ${labels.join(", ")}`);
    }

    Charts.setThreshold(data.threshold);
    Charts.pushAnomaly(timeLabel, data.anomaly, CONFIG.maxPoints);
    Charts.pushClasses(timeLabel, data.classes.map((c) => c.value), CONFIG.maxPoints);

    setConnection("live", `Menerima data · ${data.device}`);
  }

  /* ---------- MQTT ---------- */

  function disconnect() {
    if (state.client) {
      state.client.end(true);
      state.client = null;
    }
  }

  function connect() {
    const url = ui.brokerInput.value.trim();
    const topic = ui.topicInput.value.trim();

    if (!url || !topic) {
      logEvent("Broker dan topic tidak boleh kosong", "error");
      return;
    }
    if (/[+#]/.test(topic)) { logEvent('Gunakan topic satu perangkat, tanpa wildcard.', 'error'); return; }

    disconnect();
    stopDemo();
    resetSession();

    setConnection("wait", "Menghubungkan…");
    logEvent(`Menghubungkan ke ${url}`);

    const client = mqtt.connect(url, {
      clientId: "ukara-dashboard-" + Math.random().toString(16).slice(2, 10),
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: 4000,
    });

    client.on("connect", () => {
      if (state.client !== client) return;
      setConnection("wait", "Terhubung · memasang subscription");
      logEvent(`Terhubung ke broker, subscribe ${topic}`);
      ui.activeTopic.textContent = topic;
      client.subscribe(topic, (err) => {
        if (err) logEvent(`Gagal subscribe: ${err.message}`, "error");
        else if (state.client === client) setConnection('wait', 'Terhubung · menunggu data');
      });
    });

    client.on("message", (msgTopic, message, packet) => {
      if (state.client !== client) return;
      if (packet?.retain) { logEvent('Pesan retained diabaikan: bukan inferensi baru.'); return; }
      try {
        handlePayload(JSON.parse(message.toString()), msgTopic);
      } catch (e) {
        logEvent(`Data ditolak: ${e.message}`, "error");
      }
    });

    client.on("error", (err) => {
      setConnection("error", "Error koneksi");
      logEvent(`MQTT error: ${err.message}`, "error");
    });

    client.on("reconnect", () => setConnection("wait", "Menyambung ulang…"));

    client.on("close", () => {
      if (state.client === client) {
        setConnection("idle", "Terputus");
        ui.statusValue.textContent = 'TIDAK TERHUBUNG'; ui.statusCard.dataset.status = 'waiting';
      }
    });

    state.client = client;
    ui.connectBtn.textContent = "Sambung ulang";
  }

  /* ---------- Mode demo ----------
     Data palsu supaya dashboard tetap bisa dipakai latihan saat hardware
     atau jaringan belum siap. Bentuk payload persis sama dengan firmware. */

  function startDemo() {
    disconnect();
    stopDemo();
    resetSession();
    setConnection("live", "Mode demo (data simulasi)");
    logEvent("Mode demo aktif — data tidak berasal dari perangkat");

    const labels = ["diam", "getar-normal", "getar-kasar"];
    let phase = 0;
    let anomaly = 0.08;
    const startedAt = Date.now();

    state.demoTimer = setInterval(() => {
      phase += 0.12;

      const spike = Math.sin(phase / 6) > 0.85;
      anomaly = Math.max(0.01, anomaly * 0.75 + (spike ? 0.55 : 0.06) * Math.random());

      const weights = labels.map((_, i) =>
        Math.max(0.01, Math.sin(phase + i * 2.1) * 0.5 + 0.5 + Math.random() * 0.15)
      );
      const sum = weights.reduce((a, b) => a + b, 0);
      const classes = labels.map((label, i) => ({ label, value: weights[i] / sum }));
      const top = classes.reduce((a, b) => (b.value > a.value ? b : a));

      handlePayload({
        device: "demo-esp32",
        uptime: Date.now() - startedAt,
        label: top.label,
        confidence: top.value,
        anomaly: Number(anomaly.toFixed(4)),
        threshold: CONFIG.defaultThreshold,
        status: anomaly > CONFIG.defaultThreshold ? "ANOMALI" : "NORMAL",
        classes: classes.map((c) => ({ label: c.label, value: Number(c.value.toFixed(4)) })),
        timing: { dsp: 6, classification: 2, anomaly: 1 },
        heap: { free: 198000 + Math.round(Math.random() * 4000), total: 327680 },
      }, "demo/local");
    }, CONFIG.demoIntervalMs);
  }

  function stopDemo() {
    if (state.demoTimer) {
      clearInterval(state.demoTimer);
      state.demoTimer = null;
    }
  }

  /* ---------- Deteksi device diam ---------- */

  setInterval(() => {
    if (!state.lastMessageAt || state.demoTimer || !state.client?.connected) return;
    if (Date.now() - state.lastMessageAt > CONFIG.staleAfterMs) {
      setConnection("wait", "Tidak ada data baru");
      ui.statusValue.textContent = 'DATA TERLAMBAT';
      ui.statusCard.dataset.status = 'waiting';
    }
  }, 2000);

  function resetSession() {
    state.history = []; state.messages = 0; state.firstMessageAt = 0; state.lastMessageAt = 0;
    state.lastDevice = null; state.lastBoot = null; state.lastUptime = -1;
    Charts.reset();
    ui.anomalyTableBody.replaceChildren(); ui.classTableBody.replaceChildren();
    ui.statusValue.textContent = 'MENUNGGU'; ui.topLabel.textContent = '-';
    ui.topConfidence.textContent = '-'; ui.anomalyValue.textContent = '-';
    ui.statusCard.dataset.status = 'waiting'; ui.deviceId.textContent = '-'; ui.lastSeen.textContent = '-';
    ui.classBars.replaceChildren(); ui.msgCount.textContent = '0';
    ui.rawPayload.textContent = '{}';
  }
  /* ---------- Wiring ---------- */

  ui.brokerInput.value = CONFIG.brokerUrl;
  ui.topicInput.value = CONFIG.topic;
  ui.thresholdText.textContent = CONFIG.defaultThreshold.toFixed(2);

  Charts.init(CONFIG.defaultThreshold);

  ui.connForm.addEventListener("submit", (event) => {
    event.preventDefault();
    ui.demoToggle.checked = false;
    connect();
  });

  ui.themeToggle.addEventListener("click", () => Theme.toggle());

  ui.demoToggle.addEventListener("change", () => {
    if (ui.demoToggle.checked) {
      startDemo();
    } else {
      stopDemo();
      setConnection("idle", "Mode demo berhenti");
      logEvent("Mode demo dimatikan");
    }
  });

  // Tombol "Tabel" pada tiap chart — pasangan yang bisa dibaca tanpa warna
  document.querySelectorAll("[data-table-toggle]").forEach((button) => {
    const target = document.getElementById(button.dataset.tableToggle);
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      const showing = !target.hidden;
      target.hidden = showing;
      button.setAttribute("aria-pressed", String(!showing));
    });
  });

  logEvent("Dashboard siap. Klik Hubungkan atau aktifkan mode demo.");
})();
