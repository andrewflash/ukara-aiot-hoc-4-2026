const mqtt = require('mqtt');
const { randomUUID } = require('node:crypto');
const scenario = process.argv[2] || 'cycle';
if (!['cycle', 'normal', 'anomaly'].includes(scenario)) throw new Error('Use cycle, normal or anomaly');
const device = process.env.DEVICE_ID || 'esp32-01';
const topic = `${process.env.MQTT_PREFIX || 'ukara/aiot/hoc3/vibration'}/${device}`;
const client = mqtt.connect(`mqtt://${process.env.MQTT_HOST || 'broker.hivemq.com'}:${process.env.MQTT_PORT || 1883}`);
const boot = randomUUID(); const started = Date.now(); let seq = 0; let timer;
client.on('connect', () => {
  console.log(`SIMULASI ${scenario} -> ${topic}`);
  clearInterval(timer);
  timer = setInterval(() => {
    if (!client.connected) return;
    const high = scenario === 'anomaly' || (scenario === 'cycle' && seq % 16 >= 6 && seq % 16 < 11);
    const anomaly = high ? 0.72 : 0.08;
    client.publish(topic, JSON.stringify({ device, boot_id: boot, seq: ++seq, uptime: Date.now() - started,
      simulated: true, anomaly, threshold: 0.3, status: high ? 'ANOMALI' : 'NORMAL',
      label: high ? 'getar-kasar' : 'getar-normal', confidence: 0.94,
      classes: [{ label: 'getar-normal', value: high ? 0.06 : 0.94 }, { label: 'getar-kasar', value: high ? 0.94 : 0.06 }],
      timing: { dsp: 6, classification: 2, anomaly: 1 }, heap: { free: 190000, total: 327680 }
    }), { retain: false });
  }, 1000);
});
client.on('error', error => console.error(error.message));
process.on('SIGINT', () => { clearInterval(timer); client.end(); });
