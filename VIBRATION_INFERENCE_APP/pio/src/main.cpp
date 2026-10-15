/*
 * Vibration Data Collector - Arduino IDE version
 * ESP32 DevKit V1 + MPU6050
 *
 * Membaca percepatan sumbu X, Y, Z dari MPU6050 lalu mengirim
 * lewat serial (115200) dalam format CSV: accX,accY,accZ
 * Data dibaca oleh Edge Impulse Data Forwarder.
 */

#include <Arduino.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>

// Frekuensi sampling 100 Hz -> 10 ms per sampel
#define SAMPLE_INTERVAL_MS 10

Adafruit_MPU6050 mpu;
unsigned long lastSample = 0;

void setup() {
  Serial.begin(115200);

  Wire.begin();  // ESP32 default: SDA=GPIO21, SCL=GPIO22

  if (!mpu.begin()) {
    Serial.println("MPU6050 tidak terdeteksi, cek wiring!");
    while (1) {
      delay(1000);
    }
  }

  mpu.setAccelerometerRange(MPU6050_RANGE_2_G);
  mpu.setFilterBandwidth(MPU6050_BAND_44_HZ);
}

void loop() {
  if (millis() - lastSample < SAMPLE_INTERVAL_MS) {
    return;
  }
  lastSample = millis();

  sensors_event_t accel, gyro, temp;
  mpu.getEvent(&accel, &gyro, &temp);

  // Kirim CSV: accX,accY,accZ (satuan m/s^2)
  Serial.print(millis());
  Serial.print(',');
  Serial.print(accel.acceleration.x, 4);
  Serial.print(',');
  Serial.print(accel.acceleration.y, 4);
  Serial.print(',');
  Serial.println(accel.acceleration.z, 4);
}
