# Prompt praktik AI

Seluruh implementasi dilakukan pada Day 3; Day 4 untuk presentasi. Untuk latihan low-code, lihat juga [prompt dan panduan Node-RED Dashboard](NODE-RED-DASHBOARD.md).

## Desain ulang UI

> Pelajari DASHBOARD/index.html, css/style.css, dan js/app.js. Rancang ulang tampilan untuk operator pemula. Prioritaskan status, anomaly score, threshold, dan confidence klasifikasi. Gunakan warna dengan ikon/teks. Pertahankan ID elemen dan kontrak MQTT. Jangan menambah suhu, RPM, atau risiko kerusakan yang tidak tersedia. Implementasikan responsif, uji lebar 360 px dan jelaskan perubahan.

## Telusuri alur data

> Baca BACKEND/flows.json dan lib/workshop.js. Jelaskan satu payload dari MQTT hingga tersimpan di SQLite, lalu menghasilkan ALARM. Jelaskan mengapa confidence bukan probabilitas kerusakan dan bagaimana cooldown per device mencegah spam.

## Tambah fitur histori

> Gunakan API read-only /api/history dan /api/events. Tambahkan pilihan perangkat pada panel histori tanpa mencampur data antarperangkat. Tampilkan keadaan loading, kosong, error, dan data terlambat. Gunakan textContent untuk data luar. Jangan membaca database langsung dari browser.

## Ubah aturan automasi

> Pelajari aturan dan tes yang tersedia. Tambahkan aturan warning dari label model yang saya tentukan. Pertahankan aturan anomaly score dan beri event berbeda. Semua state harus per perangkat. Uji duplikasi, reconnect, restart, dan recovery. Jangan mengirim pesan Telegram/email sungguhan saat pengujian.

## Debug

> Berikut pesan error dan langkah reproduksi: [isi]. Cari penyebab pada kode yang relevan. Perbaiki perubahan terkecil, jalankan pengujian yang sesuai, laporkan hasil nyata dan batas verifikasi. Jangan meminta token atau password di prompt.
