/* =====================================================================
   Chart realtime (Chart.js v4).

   Aturan visual yang dipegang di sini:
   - garis 2px, marker ujung >= 8px dengan ring warna surface
   - area fill = warna seri pada ~10% opacity (wash, bukan blok pekat)
   - gridline hairline solid, tidak pernah putus-putus
   - satu sumbu y saja; garis ambang bukan seri kedua, tapi acuan
   - legend selalu ada untuk >= 2 seri, ditambah direct label di ujung garis
   ===================================================================== */

const Charts = (() => {
  // Slot kategorikal - urutan ini yang membuat palet aman untuk CVD.
  // Warna mengikuti entitas (label model), bukan peringkatnya.
  const SERIES_SLOTS = 6;

  let anomalyChart = null;
  let classChart = null;
  let classKeys = []; // urutan label model, dikunci saat pesan pertama

  function t(name) {
    return Theme.token(name);
  }

  function seriesColor(index) {
    return t(`--series-${(index % SERIES_SLOTS) + 1}`);
  }

  function withAlpha(hex, alpha) {
    const clean = hex.replace("#", "");
    const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
    const num = parseInt(full, 16);
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
  }

  /* ---------- Plugin: hairline vertikal mengikuti hover ---------- */
  const crosshair = {
    id: "crosshair",
    afterDatasetsDraw(chart) {
      const active = chart.tooltip?.getActiveElements?.() ?? [];
      if (!active.length) return;

      const { ctx, chartArea } = chart;
      const x = active[0].element.x;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.lineWidth = 1;
      ctx.strokeStyle = t("--baseline");
      ctx.stroke();
      ctx.restore();
    },
  };

  /* ---------- Plugin: direct label di ujung tiap garis ----------
     Label pakai token teks (bukan warna seri) - identitas dibawa oleh
     garis + titik berwarna tepat di sebelahnya. Label yang bertabrakan
     dilewati, biar tidak menumpuk jadi noise; nilainya tetap terbaca di
     legend, tooltip, dan table view. */
  const endLabels = {
    id: "endLabels",
    afterDatasetsDraw(chart) {
      if (!chart.options.plugins.endLabels?.enabled) return;

      const { ctx, chartArea } = chart;
      const placed = [];

      ctx.save();
      ctx.font = "500 11.5px system-ui, -apple-system, 'Segoe UI', sans-serif";
      ctx.textBaseline = "middle";
      ctx.fillStyle = t("--text-secondary");

      chart.data.datasets.forEach((dataset, i) => {
        const meta = chart.getDatasetMeta(i);
        if (meta.hidden || !meta.data.length) return;

        const point = meta.data[meta.data.length - 1];
        const y = point.y;

        // Lewati kalau terlalu dekat dengan label yang sudah tergambar
        if (placed.some((prev) => Math.abs(prev - y) < 13)) return;
        placed.push(y);

        const text = dataset.label;
        const width = ctx.measureText(text).width;
        if (point.x + 10 + width > chartArea.right + chart.options.layout.padding.right) return;

        ctx.fillText(text, point.x + 10, y);
      });

      ctx.restore();
    },
  };

  /* ---------- Opsi dasar yang dipakai kedua chart ---------- */
  function baseOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      normalized: true,
      interaction: { mode: "index", intersect: false },
      scales: {
        y: {
          min: 0,
          suggestedMax: 1,
          ticks: { color: t("--text-muted"), font: { size: 11 }, padding: 6 },
          grid: { color: t("--grid"), drawTicks: false },
          border: { display: false },
        },
        x: {
          ticks: {
            color: t("--text-muted"),
            font: { size: 11 },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 6,
          },
          grid: { display: false },
          border: { color: t("--baseline") },
        },
      },
      plugins: {
        legend: { display: false }, // legend dibuat sebagai HTML di luar canvas
        tooltip: {
          backgroundColor: t("--surface-1"),
          titleColor: t("--text-primary"),
          bodyColor: t("--text-secondary"),
          borderColor: t("--border"),
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          displayColors: true,
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
        },
      },
    };
  }

  /* ---------- Chart 1: anomaly score ---------- */
  function buildAnomalyChart(threshold) {
    const ctx = document.getElementById("anomalyChart");
    const accent = seriesColor(0);
    const options = baseOptions();

    options.plugins.tooltip.callbacks = {
      label: (item) => `${item.dataset.label}: ${item.parsed.y.toFixed(3)}`,
    };

    anomalyChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Anomaly score",
            data: [],
            borderColor: accent,
            backgroundColor: withAlpha(accent, 0.1),
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            pointRadius: context => context.dataIndex === context.dataset.data.length - 1 ? 3 : 0,
            pointHoverRadius: 5,
            pointHoverBorderWidth: 2,
            pointHoverBorderColor: t("--surface-1"),
            pointHoverBackgroundColor: accent,
          },
          {
            // Acuan ambang, bukan seri data - putus-putus supaya jelas
            // bahwa ini garis batas, dan tidak ikut tooltip
            label: "Ambang anomali",
            data: [],
            borderColor: t("--text-muted"),
            borderWidth: 1.5,
            borderDash: [6, 4],
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
          },
        ],
      },
      options,
      plugins: [crosshair],
    });

    setThreshold(threshold);
  }

  /* ---------- Chart 2: probabilitas tiap kelas ---------- */
  function buildClassChart() {
    const ctx = document.getElementById("classChart");
    const options = baseOptions();

    options.scales.y.max = 1;
    options.scales.y.ticks.callback = (value) => `${Math.round(value * 100)}%`;
    options.layout = { padding: { right: 64 } };
    options.plugins.endLabels = { enabled: true };
    options.plugins.tooltip.callbacks = {
      label: (item) => `${item.dataset.label}: ${(item.parsed.y * 100).toFixed(1)}%`,
    };

    classChart = new Chart(ctx, {
      type: "line",
      data: { labels: [], datasets: [] },
      options,
      plugins: [crosshair, endLabels],
    });
  }

  /* ---------- API publik ---------- */

  function init(threshold) {
    Chart.defaults.font.family = "system-ui, -apple-system, 'Segoe UI', sans-serif";
    buildAnomalyChart(threshold);
    buildClassChart();
    Theme.onChange(retheme);
  }

  // Kunci urutan label saat pesan pertama, lalu warnanya tidak pernah berubah
  function ensureClassSeries(labels) {
    const same = labels.length === classKeys.length && labels.every((l, i) => l === classKeys[i]);
    if (same) return false;

    classKeys = labels.slice();

    // Sisakan ruang kanan selebar label terpanjang supaya direct label di
    // ujung garis tidak pernah terpotong (label yang tidak muat = tidak digambar)
    const ctx = classChart.ctx;
    ctx.save();
    ctx.font = "500 11.5px system-ui, -apple-system, 'Segoe UI', sans-serif";
    const widest = Math.max(0, ...classKeys.map((label) => ctx.measureText(label).width));
    ctx.restore();
    classChart.options.layout.padding.right = Math.min(150, Math.ceil(widest) + 18);

    classChart.data.labels = [];
    classChart.data.datasets = classKeys.map((label, i) => {
      const color = seriesColor(i);
      return {
        label,
        data: [],
        borderColor: color,
        backgroundColor: color,
        borderWidth: 2,
        tension: 0.3,
        fill: false,
        pointRadius: context => context.dataIndex === context.dataset.data.length - 1 ? 3 : 0,
        pointHoverRadius: 5,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: t("--surface-1"),
        pointHoverBackgroundColor: color,
      };
    });
    classChart.update();
    return true;
  }

  function setThreshold(value) {
    if (!anomalyChart) return;
    anomalyChart.$threshold = value;
    const points = anomalyChart.data.labels.length;
    anomalyChart.data.datasets[1].data = new Array(points).fill(value);
  }

  function pushAnomaly(timeLabel, score, maxPoints) {
    const threshold = anomalyChart.$threshold ?? CONFIG.defaultThreshold;

    anomalyChart.data.labels.push(timeLabel);
    anomalyChart.data.datasets[0].data.push(score);
    anomalyChart.data.datasets[1].data.push(threshold);

    while (anomalyChart.data.labels.length > maxPoints) {
      anomalyChart.data.labels.shift();
      anomalyChart.data.datasets.forEach((d) => d.data.shift());
    }

    anomalyChart.update();
  }

  function pushClasses(timeLabel, values, maxPoints) {
    classChart.data.labels.push(timeLabel);
    classChart.data.datasets.forEach((dataset, i) => dataset.data.push(values[i] ?? 0));

    while (classChart.data.labels.length > maxPoints) {
      classChart.data.labels.shift();
      classChart.data.datasets.forEach((d) => d.data.shift());
    }

    classChart.update();
  }

  // Warna chart hidup di canvas, jadi harus disuntik ulang saat tema berubah
  function retheme() {
    [anomalyChart, classChart].forEach((chart) => {
      if (!chart) return;

      chart.options.scales.y.ticks.color = t("--text-muted");
      chart.options.scales.y.grid.color = t("--grid");
      chart.options.scales.x.ticks.color = t("--text-muted");
      chart.options.scales.x.border.color = t("--baseline");

      Object.assign(chart.options.plugins.tooltip, {
        backgroundColor: t("--surface-1"),
        titleColor: t("--text-primary"),
        bodyColor: t("--text-secondary"),
        borderColor: t("--border"),
      });
    });

    if (anomalyChart) {
      const accent = seriesColor(0);
      const line = anomalyChart.data.datasets[0];
      line.borderColor = accent;
      line.backgroundColor = withAlpha(accent, 0.1);
      line.pointHoverBackgroundColor = accent;
      line.pointHoverBorderColor = t("--surface-1");
      anomalyChart.data.datasets[1].borderColor = t("--text-muted");
      anomalyChart.update();
    }

    if (classChart) {
      classChart.data.datasets.forEach((dataset, i) => {
        const color = seriesColor(i);
        dataset.borderColor = color;
        dataset.backgroundColor = color;
        dataset.pointHoverBackgroundColor = color;
        dataset.pointHoverBorderColor = t("--surface-1");
      });
      classChart.update();
    }
  }

  function reset() {
    [anomalyChart, classChart].forEach(chart => {
      chart.data.labels = [];
      chart.data.datasets.forEach(dataset => { dataset.data = []; });
      chart.update('none');
    });
  }
  return { init, reset, ensureClassSeries, setThreshold, pushAnomaly, pushClasses, seriesColor, classKeys: () => classKeys };
})();
