# Dashboard Custom — Day 3

Dashboard HTML/CSS/JavaScript untuk inferensi MPU6050 + ESP32. Jalankan melalui backend Node-RED, **bukan double-click index.html**, karena library frontend dan API kini dilayani lokal.

Ikuti [quickstart](../README.md): gunakan HiveMQ publik, jalankan Node-RED lokal dan simulator/ESP32. Tidak perlu broker lokal. Buka http://127.0.0.1:1880/, kemudian klik Hubungkan.

Alternatif low-code: http://127.0.0.1:1880/api/dashboard/monitor. Lihat [tutorial dan perbandingan Node-RED Dashboard](../docs/NODE-RED-DASHBOARD.md). Keduanya memakai backend yang sama; folder ini khusus UI custom.

## Fitur

- Status NORMAL/ANOMALI, label model, confidence klasifikasi, skor anomali dan threshold.
- Grafik bounded, tema terang/gelap, tabel alternatif grafik.
- Sumber simulasi ditandai jelas. Anomaly score bukan probabilitas kerusakan.
- Koneksi MQTT langsung melalui WebSocket, satu perangkat per topic.
- Histori SQLite dan event automasi melalui API Node-RED; pemuatan ulang setiap 5 detik.
- Status notifikasi DRY_RUN, SENT, FAILED atau SKIPPED.
- Validasi payload, penolakan retained dan duplikasi uptime, buffer reset saat berpindah sumber.

## Konfigurasi

Default browser broker wss://broker.hivemq.com:8884/mqtt. Topic aktual mengikuti MQTT_PREFIX/DEVICE_ID dari backend. Jalankan `npm.cmd run broker:public` untuk konfigurasi awal dengan prefix unik; samakan dengan firmware.
Backend /api/health mengisi default dari .env ketika halaman dibuka. Topic dan broker bisa diubah lewat form. Untuk histori pilih Device histori yang sesuai; histori dan layar realtime memiliki filter tersendiri.

Simulasi UI saja hanya mengubah browser. Gunakan npm run simulate di BACKEND untuk menguji seluruh pipeline.

## File

- index.html: struktur dan ID elemen.
- css/style.css: tema asli; css/day34.css: tambahan panel histori.
- js/app.js: realtime MQTT dan simulasi UI.
- js/backend.js: read-only API histori/event.
- js/charts.js: Chart.js.
- js/config.js: default tampilan saat API belum tersedia.
- js/theme.js: pilihan tema.

Jangan menyimpan token Telegram atau password SMTP di frontend. Data API ditampilkan menggunakan textContent. Untuk browser HTTPS gunakan broker WSS; ws:// dipakai hanya untuk server HTTP lokal.

## Troubleshooting

| Gejala | Pemeriksaan |
| --- | --- |
| Grafik/library tidak termuat | Jalankan npm ci dan npm start; buka URL server, bukan file:// |
| Histori kosong | Backend harus aktif saat pesan dipublikasikan; cek Device histori |
| Mode UI demo tidak masuk database | Memang lokal; jalankan simulator MQTT |
| Tidak menerima data | Internet aktif, host/port benar, topic sesuai prefix unik perangkat |
| Alert DRY_RUN | Default latihan; konfigurasi backend di docs/AUTOMATION.md |
| Dua perangkat tampak tercampur | Pakai satu topic tanpa # atau +; setiap perangkat harus punya ID unik |
