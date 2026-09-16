// Stop Node-RED before running. Preserve credentials and teacher-edited flows.
const fs = require('node:fs');
const path = require('node:path');
const {randomBytes} = require('node:crypto');
const root = path.join(__dirname,'..');
const envFile = path.join(root,'.env');
let content = fs.readFileSync(fs.existsSync(envFile) ? envFile : path.join(root,'.env.example'),'utf8');
const stamp = Date.now();
if (fs.existsSync(envFile)) fs.copyFileSync(envFile,envFile+'.'+stamp+'.bak');
function set(key,value) {
  const pattern = new RegExp('^'+key+'=.*$','m');
  content = pattern.test(content) ? content.replace(pattern,key+'='+value) : content+'\n'+key+'='+value+'\n';
}
set('MQTT_HOST','broker.hivemq.com');
set('MQTT_PORT','1883');
set('MQTT_WS_URL','wss://broker.hivemq.com:8884/mqtt');
if (/^MQTT_PREFIX=ukara\/aiot\/hoc3\/vibration\r?$/m.test(content)) {
  set('MQTT_PREFIX','ukara/aiot/sep2026/'+randomBytes(6).toString('hex')+'/vibration');
}
fs.writeFileSync(envFile,content);
const runtime = path.join(process.env.WORKSHOP_RUNTIME || path.join(root,'runtime'),'flows.json');
if (fs.existsSync(runtime)) {
  const flows = JSON.parse(fs.readFileSync(runtime,'utf8'));
  const health = flows.find(n=>n.id==='api-health' && n.type==='function');
  const old = "'ws://127.0.0.1:'+(env.get('MQTT_WS_PORT') || '9001')+'/mqtt'";
  if (health?.func.includes(old)) {
    fs.copyFileSync(runtime,runtime+'.'+stamp+'.bak');
    health.func = health.func.replace(old,"env.get('MQTT_WS_URL')");
    fs.writeFileSync(runtime,JSON.stringify(flows,null,2)+'\n');
  } else if (!health?.func.includes("env.get('MQTT_WS_URL')")) {
    console.warn('Flow health sudah dimodifikasi; periksa mqttWsUrl di editor secara manual.');
  }
}
console.log('HiveMQ configured. Credentials preserved; backup .env may contain secrets, do not share it.');
console.log('Samakan MQTT_PREFIX di firmware dengan .env; restart backend dan refresh dashboard.');
