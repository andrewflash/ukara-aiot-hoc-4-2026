/* =====================================================================
   Konfigurasi dashboard.
   Peserta training cukup mengubah file ini (atau isian di control bar).
   ===================================================================== */

const CONFIG = {
  // Public demo broker. /api/health overrides this from BACKEND/.env.
  brokerUrl: "wss://broker.hivemq.com:8884/mqtt",

  // Satu topic perangkat; jangan gunakan wildcard pada tampilan satu mesin.
  topic: "ukara/aiot/hoc3/vibration/esp32-01",

  // Jumlah titik yang ditahan di chart & tabel
  maxPoints: 40,
  maxTableRows: 10,

  // Baris log koneksi yang disimpan
  maxLogRows: 40,

  // Dipakai sebelum firmware mengirim field "threshold"
  defaultThreshold: 0.3,

  // Device dianggap offline kalau tidak ada pesan selama ini (ms)
  staleAfterMs: 10000,

  // Interval publish data palsu saat mode demo aktif (ms)
  demoIntervalMs: 1000,
};
