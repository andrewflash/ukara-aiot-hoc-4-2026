const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {spawnSync} = require('node:child_process');
test('public broker configuration preserves secrets and custom prefixes; migrates legacy health only',()=>{
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'aiot-public-config-'));
  fs.mkdirSync(path.join(root,'scripts')); fs.mkdirSync(path.join(root,'runtime'));
  const script = path.join(root,'scripts/use-public-broker.js');
  fs.copyFileSync(path.join(__dirname,'../scripts/use-public-broker.js'),script);
  const envFile = path.join(root,'.env');
  fs.writeFileSync(envFile,'MQTT_HOST=127.0.0.1\nMQTT_PREFIX=ukara/aiot/hoc3/vibration\nTELEGRAM_BOT_TOKEN=fake-test-token\nNOTIFICATIONS_ENABLED=false\n');
  const runtime = path.join(root,'runtime/flows.json');
  fs.writeFileSync(runtime,JSON.stringify([{id:'teacher',label:'Keep me'},{id:'api-health',type:'function',func:"msg.payload={mqttWsUrl:'ws://127.0.0.1:'+(env.get('MQTT_WS_PORT') || '9001')+'/mqtt'};"}]));
  function run() { const r=spawnSync(process.execPath,[script],{env:{...process.env,WORKSHOP_RUNTIME:path.join(root,'runtime')},encoding:'utf8',windowsHide:true}); assert.equal(r.status,0,r.stderr); }
  run();
  const env = fs.readFileSync(envFile,'utf8');
  assert.match(env,/MQTT_HOST=broker.hivemq.com/);
  assert.match(env,/MQTT_WS_URL=wss:\/\/broker.hivemq.com:8884\/mqtt/);
  assert.match(env,/MQTT_PREFIX=ukara\/aiot\/sep2026\/[a-f0-9]{12}\/vibration/);
  assert.match(env,/TELEGRAM_BOT_TOKEN=fake-test-token/);
  assert.match(env,/NOTIFICATIONS_ENABLED=false/);
  const flow=JSON.parse(fs.readFileSync(runtime,'utf8'));
  assert.equal(flow[0].label,'Keep me'); assert.match(flow[1].func,/env.get\('MQTT_WS_URL'\)/);
  assert.ok(fs.readdirSync(root).some(f=>f.startsWith('.env.')&&f.endsWith('.bak')));
  run(); assert.equal(fs.readFileSync(envFile,'utf8'),env,'unique prefix survives reconfiguration');
});
