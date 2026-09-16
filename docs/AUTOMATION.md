# Day 3 — Automasi berbasis output AI

Ini bagian implementasi Day 3. Durasi aktivitas adalah saran yang disesuaikan kelas. Day 4 hanya presentasi project.

## Aturan bawaan

Per perangkat: 3 hasil inferensi ANOMALI berturut-turut menghasilkan ALARM. Kondisi tetap anomali menghasilkan REMINDER paling cepat 60 detik sejak alert sebelumnya. 3 hasil NORMAL berturut-turut menghasilkan RECOVERY. Jeda data lebih dari 10 detik mereset hitungan berturut-turut, tetapi tidak menyatakan alarm pulih. Threshold mengikuti field firmware (bawaan 0.3).

Ubah `ALARM_WINDOWS`, `RECOVERY_WINDOWS`, `COOLDOWN_MS`, `STALE_MS` di `.env`, lalu restart Node-RED. Pilih STALE_MS lebih panjang daripada interval inferensi perangkat. State disimpan di database, bukan browser. Restart setelah jeda panjang tetap membutuhkan rangkaian inferensi baru.

## 1. Uji tanpa mengirim pesan (25 menit)

Jalankan `npm run simulate -- anomaly`. Lihat event ALARM setelah 3 window; tidak ada alert baru setiap detik. Jalankan ulang simulator dengan `normal`, amati RECOVERY. Lihat kolom pengiriman `preview: DRY_RUN`. Ini membuktikan logika sebelum memasukkan akun pribadi.

## 2. Telegram (30 menit)

1. Buat bot melalui @BotFather, simpan token di `BACKEND/.env`, jangan di dashboard/git/prompt AI.
2. Kirim `/start` ke bot dari akun penerima. Untuk grup, tambahkan bot dan beri izin mengirim pesan.
3. Dapatkan chat_id melalui Bot API getUpdates setelah interaksi, menggunakan klien API lokal. Jangan membagikan URL yang berisi token.
4. Isi konfigurasi:

```dotenv
NOTIFICATIONS_ENABLED=true
TELEGRAM_BOT_TOKEN=TOKEN_BOT_ANDA
TELEGRAM_CHAT_ID=CHAT_ID_ANDA
# Hanya aktifkan jika memang ingin mengirim notifikasi dari simulator:
NOTIFY_SIMULATION=true
```

5. Restart Node-RED dan picu anomali baru. Periksa event dan status `telegram: SENT` atau `FAILED`.

`SENT` berarti API menerima pesan, bukan bahwa operator sudah membaca. Cooldown sebelumnya masih berlaku setelah restart; tunggu atau picu kembali setelah durasinya lewat. Notifikasi tidak otomatis dikirim ulang untuk event lama.

## 3. Email opsional (15 menit)

Isi `.env`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`, `EMAIL_TO`. Port 465 biasanya memakai secure=true; port 587 biasanya secure=false dan STARTTLS. Ikuti dokumentasi penyedia; akun yang mewajibkan OAuth tidak didukung konfigurasi username/password sederhana ini. Jangan menonaktifkan verifikasi sertifikat untuk melewati error.

Implementasi menggunakan Nodemailer di service Node-RED. Telegram dan email bisa aktif bersamaan. Error satu kanal tidak menghalangi hasil kanal lain; hasil masing-masing disimpan sebagai delivery.

## 4. Demonstrasi end-to-end (30 menit)

Gerakkan sensor atau simulator hingga anomali → lihat dashboard → tunjukkan event di SQLite → tunjukkan pesan Telegram → kembali normal → tunjukkan RECOVERY. Tutup browser dan ulangi: backend tetap berjalan. Hentikan Node-RED: jelaskan bahwa automasi server ikut berhenti.

## 5. Tugas pengembangan (20 menit)

- Pesan alert berisi nama alat dan lokasi (metadata harus berasal dari konfigurasi yang dipercaya).
- Aturan khusus untuk label warning, terpisah dari skor anomaly.
- Notifikasi perangkat tidak mengirim data, terpisah dari alarm getaran (belum disediakan).
- LED/buzzer melalui topic command + acknowledgment (belum disediakan; mulai dengan simulator, jangan motor/relay berbahaya).

Kriteria lulus: tidak ada spam tiap pesan, label simulasi jelas, alarm pulih hanya berdasarkan data normal, dan token tidak berada di frontend.

Sumber: [Telegram Bot API](https://core.telegram.org/bots/api), [Node-RED Function](https://nodered.org/docs/user-guide/writing-functions), [Nodemailer SMTP](https://nodemailer.com/smtp).
