const path = require('node:path');
const fs = require('node:fs');
const { Workshop } = require('./lib/workshop');
const { notify } = require('./lib/notifications');
for (const [key, value] of Object.entries({ MQTT_HOST: 'broker.hivemq.com', MQTT_PORT: '1883', MQTT_PREFIX: 'ukara/aiot/hoc3/vibration' })) {
  process.env[key] ||= value;
}
process.env.MQTT_TOPIC = `${process.env.MQTT_PREFIX}/+`;
process.env.MQTT_WS_URL ||= process.env.MQTT_HOST === 'broker.hivemq.com'
  ? 'wss://broker.hivemq.com:8884/mqtt'
  : `ws://${process.env.MQTT_HOST}:${process.env.MQTT_WS_PORT || '9001'}/mqtt`;
const dataDir = process.env.WORKSHOP_DATA_DIR || path.join(__dirname, 'data');
const runtimeDir = process.env.WORKSHOP_RUNTIME || path.join(__dirname, 'runtime');
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(runtimeDir, { recursive: true });
const runtimeFlow = path.join(runtimeDir, 'flows.json');
if (!fs.existsSync(runtimeFlow)) fs.copyFileSync(path.join(__dirname, 'flows.json'), runtimeFlow);
const service = new Workshop(path.join(dataDir, 'workshop.sqlite'));
module.exports = {
  uiPort: Number(process.env.PORT || 1880), uiHost: '127.0.0.1',
  flowFile: runtimeFlow,
  httpAdminRoot: '/red', httpNodeRoot: '/api',
  httpStatic: [
    { path: path.join(__dirname, 'node_modules/mqtt/dist'), root: '/vendor/mqtt' },
    { path: path.join(__dirname, 'node_modules/chart.js/dist'), root: '/vendor/chart' },
    { path: path.join(__dirname, '../DASHBOARD'), root: '/' }
  ],
  flowFilePretty: true, functionExternalModules: false,
  functionGlobalContext: { workshop: service, notify },
  logging: { console: { level: 'info', metrics: false, audit: false } }
};
