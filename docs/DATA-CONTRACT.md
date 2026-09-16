# Kontrak data

Topic inferensi: `ukara/aiot/hoc3/vibration/<device>`. Field device harus sama dengan segmen topic terakhir. Backend subscribe `prefix/+`; frontend memakai satu topic spesifik. Publish non-retained.

```json
{
  "device": "esp32-01",
  "boot_id": "c20f11a1",
  "seq": 10,
  "uptime": 20000,
  "simulated": false,
  "label": "getar-normal",
  "confidence": 0.94,
  "anomaly": 0.08,
  "threshold": 0.3,
  "status": "NORMAL",
  "classes": [{"label":"getar-normal","value":0.94},{"label":"getar-kasar","value":0.06}],
  "timing": {"dsp":6,"classification":2,"anomaly":1},
  "heap": {"free":190000,"total":327680}
}
```

- `uptime`: milidetik sejak boot, bukan Unix timestamp.
- `confidence`, `classes[].value`: nilai 0..1.
- `anomaly`: skor model, bukan probabilitas; dapat melebihi 1.
- `status`: ANOMALI jika anomaly > threshold, selain itu NORMAL. Label klasifikasi dapat bernama warning tanpa mengubah arti status anomaly ini.
- `boot_id`, `seq`: tambahan Day 3; membantu menolak duplikat/urutan lama. Firmware Day 2 tanpa kedua field ini tetap didukung dengan keterbatasan restart uptime.
- `simulated`: true hanya simulator. Mode UI lokal tidak memublikasikan payload.
- `received_at`: ditambahkan backend, Unix epoch dalam milidetik UTC. Browser menampilkan WIB.

## API read-only

| Endpoint | Respons |
| --- | --- |
| GET /api/health | Ketersediaan service dan konfigurasi publik (bukan status broker) |
| GET /api/devices | Device, last received, stale, status alarm |
| GET /api/history?device=esp32-01&limit=50 | Inferensi terbaru, urutan paling baru dahulu |
| GET /api/events?device=esp32-01&limit=20 | ALARM/REMINDER/RECOVERY dan daftar delivery |

Limit 1..500; default 100. Device hanya huruf, angka, dash, underscore (1..64 karakter). Query invalid mendapat HTTP 400. Tidak ada endpoint untuk menjalankan SQL arbitrary, mengubah token atau memublikasikan command.

## Database

`BACKEND/data/workshop.sqlite` otomatis dibuat. Tabel: `telemetry`, `events`, `device_state`, `deliveries`. Mode WAL; saat mengarsipkan file database, hentikan Node-RED lebih dahulu. Jangan menyalin hanya file utama saat database sedang aktif.

Status delivery: DRY_RUN (tidak dikirim), SENT (diterima provider), FAILED, SKIPPED (kanal belum diisi). Event tanpa delivery belum mempunyai bukti pengiriman. Tidak ada retry otomatis setelah crash.
