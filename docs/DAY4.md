# Day 4 — Presentasi project

Day 4 bukan sesi implementasi tambahan. Dashboard, database dan automasi disiapkan pada [Day 3](DAY3.md), termasuk [Telegram/email](AUTOMATION.md).

## Checklist demonstrasi peserta

- Jelaskan masalah, sensor, lokasi inferensi (cloud atau ESP32), dan batas model.
- Tunjukkan diagram sensor → inferensi → transport → dashboard/database → automasi.
- Demonstrasikan normal → anomali → ALARM → normal → RECOVERY.
- Jelaskan pilihan dashboard custom atau Node-RED dan trade-off-nya.
- Tunjukkan histori setelah refresh dan respons saat sumber berhenti.
- Bedakan simulasi dari perangkat, serta DRY_RUN dari pengiriman nyata.
- Jangan tampilkan token, password, atau `.env` pada layar presentasi.

Jika perangkat/jaringan bermasalah, gunakan simulator MQTT dengan label simulasi yang jelas. Model dan aturan demo bukan sistem keselamatan atau prediksi kegagalan tervalidasi.
