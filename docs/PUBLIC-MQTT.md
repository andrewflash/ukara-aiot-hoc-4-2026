# Demo Day 3 — HiveMQ publik, server lokal

```text
ESP32 / Simulator -- MQTT TCP 1883 --> broker.hivemq.com (internet)
                                         |                 |
                                      MQTT TCP           WSS 8884
                                         |                 |
                                Node-RED lokal       HTML/JS lokal
                                  |    |    |              |
                               SQLite  |  API histori -----+
                                  | Telegram/email
                           FlowFuse Dashboard lokal
```

## Setup

Hentikan Node-RED sebelum mengubah konfigurasi. Di BACKEND:

```powershell
npm.cmd ci
npm.cmd run broker:public
```

Perintah kedua mengatur `.env` ke HiveMQ, mempertahankan kredensial dan konfigurasi lain, serta membuat backup. Prefix bawaan diganti prefix acak unik; prefix kustom tetap dipertahankan. Baca nilai MQTT_PREFIX di `.env`, lalu samakan pada firmware ESP32. Backup `.env.*.bak` mengandung rahasia yang sama: jangan dibagikan/di-commit.

Konfigurasi efektif:

```dotenv
MQTT_HOST=broker.hivemq.com
MQTT_PORT=1883
MQTT_WS_URL=wss://broker.hivemq.com:8884/mqtt
MQTT_PREFIX=ukara/aiot/sep2026/ID_UNIK_KELOMPOK/vibration
DEVICE_ID=esp32-01
```

Nilai ID_UNIK_KELOMPOK di atas hanya contoh; gunakan prefix aktual dari `.env`. Topic perangkat adalah `MQTT_PREFIX/DEVICE_ID`. Node-RED subscribe `MQTT_PREFIX/+`. Jangan gunakan `#` pada broker publik.

## Langkah demo siap slide

1. **Siapkan broker publik:** pilih HiveMQ, samakan host dan prefix unik pada backend/ESP32.
2. **Jalankan server lokal:** `npm.cmd start` dari BACKEND. Tidak perlu `npm run broker`.
3. **Kirim data:** nyalakan ESP32, atau terminal kedua `npm.cmd run simulate`. Jangan memakai ID yang sama untuk dua sumber sekaligus.
4. **Buka dan bandingkan dashboard:** custom `http://127.0.0.1:1880/` (Hubungkan); Node-RED `http://127.0.0.1:1880/api/dashboard/monitor` (otomatis).
5. **Tunjukkan database:** refresh browser; histori dari SQLite tetap tersedia.
6. **Uji automasi:** tiga hasil anomali → ALARM; tiga normal → RECOVERY. Default DRY_RUN. Aktifkan Telegram mengikuti [panduan automasi](AUTOMATION.md), restart backend, lalu picu event baru.
7. **Uji data terlambat:** hentikan simulator/perangkat; setelah STALE_MS status bukan lagi data normal baru. Alarm tidak otomatis pulih karena koneksi terputus.

Editor tetap di `http://127.0.0.1:1880/red/`. ESP32 tidak harus satu LAN dengan laptop; keduanya memerlukan internet yang mengizinkan MQTT outbound 1883. Tidak perlu membuka inbound port laptop. Hanya satu proses lokal diperlukan bila memakai ESP32; simulator adalah sumber data opsional.

## Keamanan dan keterbatasan

- Broker publik tanpa autentikasi: siapa pun dapat subscribe/publish, termasuk memalsukan data valid yang memicu Telegram. Prefix acak mengurangi bentrok, **bukan autentikasi**.
- TCP 1883 dari ESP32/Node-RED tidak terenkripsi. WSS hanya mengenkripsi koneksi browser, tidak membuat topic privat.
- Jangan kirim token/password/data pribadi. Jangan gunakan untuk aktuator atau sistem keselamatan. Pertahankan notifikasi DRY_RUN sampai siap menguji.
- HiveMQ public berbeda dari HiveMQ Cloud privat yang memerlukan TLS/autentikasi. Firmware saat ini memakai WiFiClient, bukan WiFiClientSecure.
- Broker publik tidak menjamin uptime atau pesan tersimpan. Histori/automasi hanya berjalan saat Node-RED hidup dan menerima pesan. Internet putus: halaman lokal dapat tetap terbuka, tetapi tidak ada data MQTT baru.
- Laptop memakai binding localhost; dashboard belum diekspos ke LAN/internet.

## Cadangan offline

Hentikan backend/simulator; set `.env`: MQTT_HOST=127.0.0.1, MQTT_PORT=1883, MQTT_WS_URL=ws://127.0.0.1:9001/mqtt. Jalankan broker lokal dengan `npm.cmd run broker`, lalu backend/simulator. Untuk ESP32 lokal gunakan IP LAN laptop, BROKER_BIND=0.0.0.0 dan jaringan tepercaya. Tes otomatis selalu memakai broker lokal pada port acak, tidak memakai HiveMQ.

Referensi: [HiveMQ public broker](https://www.hivemq.com/mqtt/public-mqtt-broker/), [endpoint public broker](https://hivemq.mqtt-dashboard.com/).
