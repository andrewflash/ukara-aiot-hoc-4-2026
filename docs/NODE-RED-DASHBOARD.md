# Day 3 — Dashboard Node-RED sebagai pembanding

Pakai **FlowFuse Dashboard** (`@flowfuse/node-red-dashboard`), bukan paket lama `node-red-dashboard`. Dependensi sudah tercantum di BACKEND/package.json. Ini instalasi lokal; tidak perlu akun atau langganan FlowFuse Cloud.

## Menjalankan

1. Ikuti quickstart README: gunakan HiveMQ publik, jalankan backend lokal dan simulator MQTT/ESP32. Tidak perlu menjalankan broker lokal.
2. Buka **http://127.0.0.1:1880/api/dashboard/monitor**. Tidak perlu tombol Hubungkan: backend sudah menerima MQTT.
3. Buka dashboard custom **http://127.0.0.1:1880/** di tab kedua, klik Hubungkan, lalu bandingkan data perangkat yang sama.
4. Editor **http://127.0.0.1:1880/red/** → tab **Day 3 | Dashboard Node-RED**.

URL memiliki `/api` karena konfigurasi `httpNodeRoot` backend, ditambah base `/dashboard` dan page `/monitor`. `/red/` adalah editor, bukan dashboard peserta.

Jika pernah menjalankan versi backend sebelum dashboard ditambahkan: hentikan Node-RED, jalankan `npm.cmd ci` dan `npm.cmd run dashboard:install` dari BACKEND, lalu `npm.cmd start`. Installer menambahkan tab tanpa mengganti flow lama, membuat file backup runtime, dan tidak mengubah database. Jika ID dashboard sudah ada, installer tidak menimpa modifikasi. Jangan menjalankan installer saat Node-RED aktif.

## Alur yang dipelajari

```text
ESP32 / simulator → MQTT → validasi → SQLite + aturan → notifikasi
                                       ↓
Inject setiap 2 detik → Function snapshot SQLite → ui-text / ui-chart / ui-table
```

Dashboard hanya membaca data. Tidak ada MQTT subscriber kedua yang menyimpan ulang pesan atau menjalankan aturan dua kali. Riwayat dimuat dari SQLite setelah restart, bukan dianggap persisten hanya karena widget masih terlihat.

## Mengenal widget dan layout

| Elemen | Konfigurasi demo | Latihan peserta |
| --- | --- | --- |
| UI Base | `/dashboard` | Kenali alamat aplikasi |
| UI Page | `/monitor`, grid responsif | Susun halaman |
| UI Group | Status, tren, histori, event | Pindahkan urutan grup |
| `ui-text` | Status, skor, label, confidence, sumber | Ubah judul dan ukuran |
| `ui-chart` | 40 inferensi, seri Anomali dan Ambang | Ubah warna; jangan ubah skor menjadi persen |
| `ui-table` | 10 inferensi dan hingga 20 event | Baca hasil DRY_RUN/SENT/FAILED |

Langkah latihan: pilih node dari palette Dashboard → buat/pilih Group → atur label dan lebar → hubungkan keluaran Function → Deploy → periksa browser. Menambah widget tidak otomatis membuat database atau aturan: sumber datanya tetap harus disambungkan.

Contoh paling sederhana untuk memahami widget: Inject angka `0.7` → Change set `msg.payload` → `ui-text`. Gunakan group latihan tersendiri dan beri label **SIMULASI UI**, jangan hubungkan angka buatan ke ingest/automasi produksi.

## Perangkat dan kesegaran data

Dashboard Node-RED demo menggunakan **satu DEVICE_ID dari BACKEND/.env** untuk semua pengunjung. Ubah ID, restart backend, refresh. Tidak ada selector perangkat per browser pada versi ini. Default `esp32-01`. Filter custom realtime dan histori juga harus disamakan untuk perbandingan.

Setiap 2 detik, snapshot mengganti isi chart/table (bukan menambahkan riwayat yang sama). Setelah STALE_MS tanpa pesan, status menjadi **DATA TERLAMBAT**; skor terakhir tetap ditampilkan sebagai histori. Alarm aktif tidak otomatis pulih karena perangkat terputus. Banner koneksi FlowFuse menunjukkan ketika browser kehilangan backend.

## Perbandingan

| Aspek | Custom HTML/CSS/JS | Node-RED + FlowFuse Dashboard |
| --- | --- | --- |
| Membuat UI | Edit kode, bisa dibantu AI | Susun node, page dan group |
| Kebebasan desain | Tinggi | Mengikuti widget/layout yang tersedia |
| Data realtime | Browser MQTT WebSocket | Snapshot backend setiap 2 detik via koneksi Dashboard |
| Histori/event | API SQLite, refresh 5 detik | Baca SQLite di Function, refresh 2 detik |
| Pilihan perangkat demo | Form topic dan filter histori | DEVICE_ID server, bersama semua browser |
| Simulasi UI lokal | Ada, tidak masuk DB | Tidak disediakan; gunakan simulator MQTT |
| Database/automasi | Backend Node-RED yang sama | Backend Node-RED yang sama |
| Cocok untuk | Belajar frontend dan desain khusus | Prototipe cepat dan belajar alur data |

Mulai dari Node-RED untuk memahami alur, kemudian custom untuk latihan generate/refine UI dengan AI. Keduanya bisa dibuka bersamaan. Tidak ada yang otomatis production-ready: autentikasi, TLS, hak akses, retensi dan deployment perlu ditambahkan.

## Prompt latihan AI

> Saya memakai Node-RED dengan @flowfuse/node-red-dashboard. Bantu jelaskan flow Inject → Function snapshot → ui-text/ui-chart/ui-table pada repo ini. Tampilkan anomaly score, threshold, label dan confidence dari satu DEVICE_ID. Jangan menambah data sensor palsu atau menyamakan anomaly score dengan probabilitas kerusakan. Jangan menjalankan ulang ingest atau notifikasi dari UI. Berikan langkah perubahan layout melalui editor serta checklist uji status stale, histori setelah restart, dan sumber simulasi.

Referensi: [FlowFuse Dashboard getting started](https://dashboard.flowfuse.com/getting-started.html), [ui-chart](https://dashboard.flowfuse.com/nodes/widgets/ui-chart.html), [ui-table](https://dashboard.flowfuse.com/nodes/widgets/ui-table.html).
