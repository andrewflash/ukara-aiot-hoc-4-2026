#pragma once
#define WIFI_SSID "GANTI_SSID"
#define WIFI_PASSWORD "GANTI_PASSWORD"
// PUBLIC demo broker, TCP unencrypted. Never send secrets or sensitive data.
#define MQTT_HOST "broker.hivemq.com"
#define MQTT_PORT 1883
#define DEVICE_ID "esp32-01"
// Replace with the SAME unique prefix configured in BACKEND/.env.
#define MQTT_PREFIX "ukara/aiot/hoc3/vibration"
