# VibrationInferenceApp - Arduino IDE

Arduino IDE port of the PlatformIO vibration inference demo.

## Board

- Board package: ESP32 by Espressif Systems
- Board: ESP32 Dev Module
- Upload speed: 921600
- Serial monitor: 115200 baud

## Required Arduino Libraries

Install these from Library Manager:

- Adafruit MPU6050
- Adafruit Unified Sensor

The Edge Impulse model is bundled locally under `src/DemoVibration_inferencing`, so it does not need to be installed globally.

## Wiring

- MPU6050 VCC -> ESP32 3V3
- MPU6050 GND -> ESP32 GND
- MPU6050 SDA -> ESP32 GPIO21
- MPU6050 SCL -> ESP32 GPIO22

## Run

Open `VibrationInferenceApp.ino`, select `ESP32 Dev Module`, upload, then open Serial Monitor at `115200`.
