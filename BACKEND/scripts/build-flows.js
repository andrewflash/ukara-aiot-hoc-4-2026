// Deterministic flow serialization; editable source for the shipped flows.json.
const fs = require('node:fs');
const path = require('node:path');
const tab = 'day34';
const flow = [{ id: tab, type: 'tab', label: 'Day 3-4 | MQTT - SQLite - Automasi', disabled: false, info: 'Start via npm start with supplied settings.js. Service uses Node built-in SQLite; see lib/workshop.js.' }];
function add(id, type, name, x, y, wires, extra = {}) { flow.push({ id, type, z: tab, name, x, y, wires, ...extra }); }
function fn(id, name, x, y, wires, func, outputs = 1) { add(id, 'function', name, x, y, wires, { func, outputs, noerr: 0, initialize: '', finalize: '', libs: [] }); }
add('input', 'mqtt in', 'Hasil inferensi ESP32 / simulator', 180, 100, [['json']], { topic: '${MQTT_TOPIC}', qos: '0', datatype: 'auto-detect', broker: 'broker', nl: false, rap: true, rh: 0, inputs: 0 });
add('json', 'json', 'Parse JSON', 430, 100, [['validate']], { property: 'payload', action: 'obj', pretty: false });
fn('validate', 'Validasi kontrak', 640, 100, [['persist']], `try { global.get('workshop').validate(msg.payload, msg.topic); return msg; } catch(e) { node.warn(e.message); return null; }`);
fn('persist', 'SQLite + aturan per perangkat', 270, 200, [['event']], `try { const result = global.get('workshop').ingest(msg.payload, msg.topic, Date.now(), msg.retain === true); if (!result.accepted) return null; msg.payload = result; return msg; } catch(e) { node.error(e.message, msg); return null; }`);
fn('event', 'Hanya event alarm / recovery', 550, 200, [['notify']], `if (!msg.payload.event) return null; msg.payload = msg.payload.event; return msg;`);
fn('notify', 'Telegram / Email atau DRY_RUN', 850, 200, [['debug']], `global.get('notify')(msg.payload, global.get('workshop')).then(() => { node.send({payload: {event_id: msg.payload.id, result: 'Lihat delivery status di API events'}}); node.done(); }).catch(() => { node.error('Notification processing failed'); node.done(); }); return;`);
add('debug', 'debug', 'Hasil automasi', 1110, 200, [], { active: true, tosidebar: true, console: false, complete: 'payload', targetType: 'msg' });
for (const [i, resource] of ['health', 'devices', 'history', 'events'].entries()) {
  add(`http-${resource}`, 'http in', `GET /api/${resource}`, 190, 340 + i * 65, [[`api-${resource}`]], { url: `/${resource}`, method: 'get', upload: false, swaggerDoc: '' });
  fn(`api-${resource}`, resource === 'health' ? 'Health / konfigurasi publik' : `Baca ${resource}`, 560, 340 + i * 65, [['response']],
    `const svc = global.get('workshop'); msg.headers = {'Content-Type':'application/json','Cache-Control':'no-store'}; try { ${resource === 'health' ? `msg.payload = {ok:true, rule:svc.rule, mqttPrefix:svc.prefix, device:env.get('DEVICE_ID') || 'esp32-01', mqttWsUrl:'ws://127.0.0.1:'+(env.get('MQTT_WS_PORT') || '9001')+'/mqtt', notificationsEnabled:env.get('NOTIFICATIONS_ENABLED') === 'true'};` : resource === 'devices' ? `msg.payload = svc.devices();` : `msg.payload = svc.query('${resource === 'history' ? 'telemetry' : 'events'}', msg.req.query.device, msg.req.query.limit || 100);`} msg.statusCode = 200; } catch(e) { msg.statusCode = 400; msg.payload = {error:e.message}; } return msg;`);
}
add('response', 'http response', 'JSON response', 970, 430, [], { statusCode: '', headers: {} });
add('errors', 'catch', 'Flow errors', 210, 650, [['error-log']], { scope: null, uncaught: false });
fn('error-log', 'Pesan error tanpa payload/kredensial', 590, 650, [['debug']], `return {payload: {error: msg.error?.message || 'Flow error'}};`);
flow.push({ id: 'broker', type: 'mqtt-broker', name: 'Broker kelas (lihat .env)', broker: '${MQTT_HOST}', port: '${MQTT_PORT}', clientid: '', autoConnect: true, usetls: false, protocolVersion: '4', keepalive: '60', cleansession: true, autoUnsubscribe: true, birthTopic: '', birthQos: '0', birthPayload: '', closeTopic: '', closeQos: '0', closePayload: '', willTopic: '', willQos: '0', willPayload: '' });
// Publish the browser endpoint independently of TCP host/port.
const health = flow.find(n => n.id === 'api-health');
health.func = health.func.replace("'ws://127.0.0.1:'+(env.get('MQTT_WS_PORT') || '9001')+'/mqtt'", "env.get('MQTT_WS_URL')");
flow[0].label = 'Day 3 | MQTT - SQLite - Automasi';
flow.push(...require('./dashboard-flow')());
fs.writeFileSync(path.join(__dirname, '../flows.json'), JSON.stringify(flow, null, 2) + '\n');
