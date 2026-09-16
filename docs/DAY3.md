# Day 3 — Dashboard, database, dan automasi

Praktik terdiri dari blok dashboard/database berikut dan [blok automasi](AUTOMATION.md). Alokasi waktu adalah saran latihan yang disesuaikan durasi kelas, bukan penambahan sesi Day 4. Day 4 khusus presentasi project.

## 1. Lanjutkan Day 2 (15 menit)

Periksa label dan anomaly score dari ESP32 melalui serial. Jalankan varian firmware MQTT, atau mulai simulator sesuai README. Jangan mengganti label model menjadi suhu/RPM; tampilkan data yang benar-benar dikirim.

Target: peserta dapat menjelaskan perbedaan `label`, `confidence`, `anomaly`, dan `status`. `confidence` adalah skor kelas terpilih, bukan kemungkinan mesin akan rusak.

## 2. Kenali dashboard (25 menit)

Buka dashboard dari server Node-RED, pilih topic satu perangkat, klik Hubungkan. Identifikasi metrik utama, garis ambang grafik, label sumber dan status koneksi. Ubah tema dan coba lebar layar ponsel.

Ada dua mode latihan:

- **Simulasi UI saja**: data dibuat di browser, tidak tersimpan dan tidak memicu backend.
- **Simulator MQTT**: `npm run simulate`, melewati broker, Node-RED, SQLite dan aturan automasi. Ditandai `simulated: true`.

Jangan menjalankan simulator dan ESP32 dengan device ID yang sama secara bersamaan. Saat pindah sumber, buffer realtime direset; histori SQLite tidak dihapus.

Buka juga `/api/dashboard/monitor` dan bandingkan UI widget Node-RED dengan custom. Ikuti [panduan Node-RED Dashboard](NODE-RED-DASHBOARD.md) untuk melihat Page → Group → Widget dan mengubah layout melalui editor. Samakan DEVICE_ID dengan topic/filter custom.

## 3. Modifikasi dengan AI (25 menit)

Gunakan prompt di PROMPTS.md. Tugas peserta: susun ulang kartu agar status, anomaly score, threshold, dan confidence mudah dibaca. Pertahankan ID elemen HTML yang dipakai JavaScript. Jangan menambah metrik palsu atau mengubah kontrak JSON.

## 4. Data masuk database (30 menit)

Di editor `/red/`, telusuri:

`MQTT in → Parse JSON → Validasi kontrak → SQLite + aturan per perangkat`

SQLite service memakai parameter SQL, bukan penggabungan string dari payload. Buka Function node untuk melihat pemanggilan service; buka `lib/workshop.js` untuk mempelajari transaksi dan query.

Lihat `GET /api/history?device=esp32-01&limit=10`. Bandingkan uptime perangkat (durasi sejak boot) dan received_at (waktu penerimaan server). Refresh halaman: tabel histori harus tetap berisi data. Restart Node-RED: histori tetap ada.

## 5. Uji kegagalan (25 menit)

| Skenario | Hasil yang diharapkan |
| --- | --- |
| Simulator dihentikan | Data perangkat terlambat setelah 10 detik; histori tetap tersedia |
| Koneksi internet/broker terputus | Data terlambat atau koneksi terputus, bukan status mesin normal baru |
| Topic kelompok lain dipilih | Hanya perangkat yang cocok yang ditampilkan |
| Payload invalid | Backend menolak, tidak menyimpan angka 0 sebagai pengganti |
| Simulasi UI dinyalakan | Sumber jelas berlabel simulasi UI; tidak menambah database |

Lanjutkan [automasi Day 3](AUTOMATION.md): validasi ALARM/RECOVERY dalam dry-run, baru aktifkan Telegram/email secara sengaja.

Deliverable: screenshot kedua dashboard, contoh JSON, bukti histori bertahan setelah refresh, dan event automasi tanpa spam. Siapkan [presentasi Day 4](DAY4.md).
