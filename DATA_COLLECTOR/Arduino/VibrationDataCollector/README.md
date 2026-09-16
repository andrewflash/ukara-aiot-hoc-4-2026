# Vibration Data Collector - Arduino IDE

Arduino IDE port dari project PlatformIO di `pio/`.

Sketch ini membaca accelerometer MPU6050 pada ESP32 DevKit V1 dan mengirim data CSV lewat serial pada baud `115200`:

```text
accX,accY,accZ
```

## Board

- Board package: `esp32` by Espressif Systems
- Board menu: `ESP32 Dev Module`
- Upload speed: `921600`
- Serial monitor baud: `115200`

## Library

Install dari Arduino IDE Library Manager:

- `Adafruit MPU6050`
- `Adafruit Unified Sensor`

Arduino IDE biasanya ikut memasang dependency Adafruit lain yang dibutuhkan, seperti `Adafruit BusIO`.

## Wiring

MPU6050 memakai I2C default ESP32:

| ESP32 DevKit V1 | MPU6050 |
| --- | --- |
| 3V3 | VCC |
| GND | GND |
| GPIO21 | SDA |
| GPIO22 | SCL |

Gunakan `3V3`, bukan `5V`.

## Cara Pakai

1. Buka `VibrationDataCollector.ino` di Arduino IDE.
2. Pilih board `ESP32 Dev Module`.
3. Install library di atas.
4. Upload sketch.
5. Buka Serial Monitor pada baud `115200`.
6. Tutup Serial Monitor sebelum menjalankan Edge Impulse Data Forwarder:

```bash
edge-impulse-data-forwarder
```

Saat Data Forwarder meminta nama axis, gunakan:

```text
accX, accY, accZ
```
