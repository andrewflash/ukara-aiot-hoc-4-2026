/* Day 3/4: model Day 2 tetap berjalan di ESP32, hasilnya dikirim ke MQTT.
 * Install library model Day 2, Adafruit MPU6050, Adafruit Unified Sensor,
 * PubSubClient dan ArduinoJson v7. Salin secrets.example.h menjadi secrets.h.
 * Demo jaringan lokal tepercaya. Bukan firmware kendali mesin produksi.
 */
#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>
#include "secrets.h"
// Gunakan header yang sesuai dengan library hasil export model peserta.
#include "DemoVibration_inferencing.h"

#if !EI_CLASSIFIER_HAS_ANOMALY
#error "Demo ini membutuhkan model dengan anomaly detection. Export kembali model Day 2."
#endif
static_assert(EI_CLASSIFIER_RAW_SAMPLES_PER_FRAME == 3, "Model harus menerima accX, accY, accZ");

constexpr float ANOMALY_THRESHOLD = 0.3f;
Adafruit_MPU6050 mpu;
WiFiClient network;
PubSubClient mqtt(network);
static float features[EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE];
static size_t featureIndex = 0;
static unsigned long lastSample = 0, lastReconnect = 0;
static uint32_t sequence = 0;
static char bootId[17];
static const char* topic = MQTT_PREFIX "/" DEVICE_ID;

void inferAndPublish() {
  signal_t signal;
  numpy::signal_from_buffer(features, EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE, &signal);
  ei_impulse_result_t result = {0};
  if (run_classifier(&signal, &result, false) != EI_IMPULSE_OK) {
    Serial.println("Inferensi gagal"); return;
  }
  size_t top = 0;
  for (size_t i = 1; i < EI_CLASSIFIER_LABEL_COUNT; ++i)
    if (result.classification[i].value > result.classification[top].value) top = i;
  JsonDocument doc;
  doc["device"] = DEVICE_ID; doc["boot_id"] = bootId;
  doc["seq"] = ++sequence; doc["uptime"] = millis(); doc["simulated"] = false;
  doc["label"] = result.classification[top].label;
  doc["confidence"] = result.classification[top].value;
  doc["anomaly"] = result.anomaly; doc["threshold"] = ANOMALY_THRESHOLD;
  doc["status"] = result.anomaly > ANOMALY_THRESHOLD ? "ANOMALI" : "NORMAL";
  JsonArray classes = doc["classes"].to<JsonArray>();
  for (size_t i = 0; i < EI_CLASSIFIER_LABEL_COUNT; ++i) {
    JsonObject item = classes.add<JsonObject>();
    item["label"] = result.classification[i].label; item["value"] = result.classification[i].value;
  }
  doc["timing"]["dsp"] = result.timing.dsp;
  doc["timing"]["classification"] = result.timing.classification;
  doc["timing"]["anomaly"] = result.timing.anomaly;
  doc["heap"]["free"] = ESP.getFreeHeap(); doc["heap"]["total"] = ESP.getHeapSize();
  char payload[2048];
  if (measureJson(doc) >= sizeof(payload)) { Serial.println("Payload terlalu besar"); return; }
  size_t length = serializeJson(doc, payload, sizeof(payload));
  Serial.println(payload);
  if (!mqtt.connected() || !mqtt.publish(topic, reinterpret_cast<const uint8_t*>(payload), length, false))
    Serial.println("MQTT belum siap/gagal publish; inferensi lokal tetap berjalan");
}

void setup() {
  Serial.begin(115200); Wire.begin(21, 22);
  if (!mpu.begin()) { Serial.println("MPU6050 tidak terdeteksi"); while (true) delay(1000); }
  mpu.setAccelerometerRange(MPU6050_RANGE_2_G);
  mpu.setFilterBandwidth(MPU6050_BAND_44_HZ);
  snprintf(bootId, sizeof(bootId), "%08lx%08lx", (unsigned long)esp_random(), (unsigned long)esp_random());
  WiFi.mode(WIFI_STA); WiFi.setAutoReconnect(true); WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  mqtt.setServer(MQTT_HOST, MQTT_PORT); mqtt.setBufferSize(2304); mqtt.setSocketTimeout(1);
  Serial.println("Day 3/4 - Inferensi lokal + MQTT");
}

void loop() {
  mqtt.loop();
  // Reconnect hanya di batas window: jeda jaringan tidak mencemari window sensor.
  // mqtt.connect() tetap bisa blocking sampai socket timeout; bukan hard real-time.
  if (featureIndex == 0 && WiFi.status() == WL_CONNECTED && !mqtt.connected() && millis() - lastReconnect >= 5000) {
    lastReconnect = millis();
    String clientId = String("ukara-") + DEVICE_ID + "-" + bootId;
    mqtt.connect(clientId.c_str());
    lastSample = millis();
  }
  if (millis() - lastSample < (unsigned long)EI_CLASSIFIER_INTERVAL_MS) return;
  lastSample = millis();
  sensors_event_t accel, gyro, temperature;
  mpu.getEvent(&accel, &gyro, &temperature);
  features[featureIndex++] = accel.acceleration.x;
  features[featureIndex++] = accel.acceleration.y;
  features[featureIndex++] = accel.acceleration.z;
  if (featureIndex >= EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE) {
    inferAndPublish(); featureIndex = 0; lastSample = millis();
  }
}
