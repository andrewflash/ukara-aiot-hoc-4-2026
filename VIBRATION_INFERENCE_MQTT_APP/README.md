# Firmware MQTT Day 3

Varian baru; firmware Day 2 di VIBRATION_INFERENCE_APP tidak diubah. Mengirim satu payload per window inferensi. Tidak menerima command aktuator pada versi ini.

Materi/model terbaru pengajar berada di `../../Day2/` (di luar repo). Sesuaikan include header dengan library hasil export model yang benar; jangan mencampur model antar sesi.

1. Arduino IDE: pasang board ESP32 dan library Adafruit MPU6050, Adafruit Unified Sensor, PubSubClient, ArduinoJson **v7**.
2. Gunakan library Edge Impulse hasil training Day 2. Arsip yang tersedia di `../VIBRATION_INFERENCE_APP/Arduino/VibrationInferenceApp/DemoVibration_inferencing.zip` dapat ditambahkan melalui Sketch → Include Library → Add .ZIP Library jika itu model yang digunakan peserta.
3. Buka `Arduino/VibrationInferenceMqttApp/VibrationInferenceMqttApp.ino`.
4. Sesuaikan include model: default `DemoVibration_inferencing.h`. Firmware lama di repo memakai `TestUkara3_inferencing.h`; jika itu model peserta, ubah include ke nama tersebut. Model harus input 3 axis dan memiliki anomaly detection.
5. Salin `secrets.example.h` menjadi `secrets.h`, isi WiFi, MQTT_HOST=broker.hivemq.com, port 1883, dan DEVICE_ID. Samakan MQTT_PREFIX dengan prefix unik di BACKEND/.env. Jangan commit secrets.h.
6. MPU6050: VCC 3V3, GND GND, SDA GPIO21, SCL GPIO22.
7. Pastikan ESP32 dan laptop punya internet, upload ESP32, monitor serial 115200. Tidak perlu broker lokal atau satu LAN; Node-RED tetap dijalankan di laptop.
8. Pilih topic sesuai device di dashboard dan field Device histori.

Sampling menggunakan interval dari metadata model. Inferensi sinkron dan koneksi MQTT bisa menunda awal window berikutnya; bukan hard real-time. Inferensi tetap berjalan saat WiFi belum terhubung, tetapi hasil tidak dibuffer untuk dikirim ulang.

Firmware menambahkan boot_id acak per boot dan seq. HiveMQ publik memakai TCP 1883 tanpa TLS/autentikasi: topic dapat dibaca/ditiru orang lain. Hanya data demo non-sensitif, bukan produksi. HiveMQ Cloud privat berbeda dan memerlukan WiFiClientSecure serta autentikasi yang belum disediakan varian ini. Lihat [panduan MQTT publik](../docs/PUBLIC-MQTT.md).
