# Backend Day 3

Node-RED menjalankan ingest MQTT, database SQLite, aturan per perangkat, notifikasi, API, dan dua pilihan dashboard. Inferensi model tetap di ESP32. Ikuti [README utama](../README.md) untuk quickstart.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm.cmd ci` | Pasang dependency sesuai lockfile |
| `npm.cmd run broker:public` | Atur HiveMQ + prefix unik, pertahankan kredensial; stop Node-RED dahulu |
| `npm.cmd run broker` | Cadangan offline saja, TCP 1883 / WebSocket 9001 |
| `npm.cmd start` | Backend dan kedua UI, port 1880 |
| `npm.cmd run simulate` | Publisher demo siklus normal/anomali/normal |
| `npm.cmd test` | Tes lokal, tidak mengirim notifikasi nyata |
| `npm.cmd run build:flows` | Bangun template flows.json dari scripts; tidak mengubah runtime |
| `npm.cmd run dashboard:install` | Tambah tab dashboard ke runtime lama; hentikan Node-RED dahulu |

## File dan state

- `settings.js`: binding localhost, konfigurasi route, service global SQLite/notifikasi.
- `flows.json`: template distribusi; disalin ke runtime hanya saat belum ada flow runtime.
- `scripts/build-flows.js`: sumber flow MQTT/API/automasi.
- `scripts/dashboard-flow.js`: sumber flow read-only FlowFuse Dashboard.
- `runtime/flows.json`: flow kerja editor. Export/backup sebelum mengubah; jangan mengganti dengan template untuk memperbarui UI tanpa meninjau edit sendiri.
- `data/workshop.sqlite`: telemetry, events, device_state, deliveries. Tidak ada retensi otomatis; backup setelah backend dihentikan.
- `.env`: konfigurasi lokal dan kredensial, tidak masuk git. Jangan menimpa dengan .env.example jika sudah dikonfigurasi.

Custom UI: `/`. Node-RED UI: `/api/dashboard/monitor`. Editor: `/red/`. API: `/api/health`, `/api/devices`, `/api/history`, `/api/events`.

Function nodes bergantung pada `settings.js` dan `lib/`; mengimpor flows.json ke instalasi Node-RED lain saja tidak cukup. Library frontend dilayani lokal. FlowFuse memakai widget standar dan satu DEVICE_ID bersama semua pengunjung.

Lihat [kontrak data](../docs/DATA-CONTRACT.md), [panduan dashboard Node-RED](../docs/NODE-RED-DASHBOARD.md) dan [automasi Day 3](../docs/AUTOMATION.md). Nama teknis lama `day34` dipertahankan pada sebagian ID/file untuk kompatibilitas; bukan sesi praktik Day 4.
