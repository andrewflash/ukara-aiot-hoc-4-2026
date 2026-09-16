const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Workshop } = require('../lib/workshop');
const { notify } = require('../lib/notifications');
const prefix = 'ukara/aiot/hoc3/vibration';
function sample(seq, anomaly = 0.7, device = 'esp32-01') {
  return { device, uptime: seq * 1000, seq, boot_id: 'boot-a', simulated: true, label: 'getar', confidence: 0.9,
    anomaly, threshold: 0.3, status: anomaly > 0.3 ? 'ANOMALI' : 'NORMAL', classes: [{label:'getar',value:0.9}] };
}
test('per-device consecutive windows, cooldown, recovery, duplicate, stale and retained', () => {
  const s = new Workshop(':memory:');
  const send = (seq, anomaly = 0.7, device = 'esp32-01', now = 100000 + seq * 1000) => s.ingest(sample(seq, anomaly, device), `${prefix}/${device}`, now);
  assert.equal(send(1).event, null);
  assert.equal(send(1, 0.7, 'esp32-02').event, null);
  assert.equal(send(2).event, null);
  assert.equal(send(2).accepted, false);
  const alarm = send(3).event; assert.equal(alarm.kind, 'ALARM');
  assert.equal(send(4).event, null);
  send(5, 0.1); send(6, 0.1);
  assert.equal(send(7, 0.1).event.kind, 'RECOVERY');
  send(8); send(9); assert.equal(send(10).event, null);
  // A gap invalidates the consecutive counter; 3 new windows are required.
  assert.equal(send(70).event, null); assert.equal(send(71).event, null);
  assert.equal(send(72).event.kind, 'REMINDER');
  assert.equal(s.ingest(sample(73), `${prefix}/esp32-01`, 173000, true).accepted, false);
  assert.equal(s.query('events', 'esp32-02').length, 0);
  assert.equal(s.devices(999999).every(d => d.stale), true);
  s.close();
});
test('reject malformed, inconsistent, topic mismatch and unsafe query input', () => {
  const s = new Workshop(':memory:'); const p = sample(1);
  for (const patch of [{anomaly:null}, {anomaly:'0.7'}, {confidence:2}, {threshold:0}, {status:'NORMAL'}, {classes:[]}]) {
    assert.throws(() => s.ingest({...p,...patch}, `${prefix}/esp32-01`));
  }
  assert.throws(() => s.ingest(p, `${prefix}/other`));
  assert.throws(() => s.query('telemetry', "x' OR 1=1 --"));
  assert.throws(() => s.query('telemetry', 'esp32-01', 501));
  assert.equal(s.query('telemetry', 'esp32-01').length, 0); s.close();
});
test('history and rule state persist across restart; new boot resets sequence', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiot-db-test-'));
  const file = path.join(dir, 'test.sqlite'); let s = new Workshop(file);
  s.ingest(sample(1), `${prefix}/esp32-01`, 1000);
  s.ingest(sample(2), `${prefix}/esp32-01`, 2000); s.close();
  s = new Workshop(file);
  assert.equal(s.ingest(sample(3), `${prefix}/esp32-01`, 3000).event.kind, 'ALARM');
  assert.equal(s.query('telemetry', 'esp32-01').length, 3);
  assert.equal(s.ingest({...sample(1), boot_id:'boot-b'}, `${prefix}/esp32-01`, 4000).accepted, true);
  assert.equal(s.ingest(sample(9), `${prefix}/esp32-01`, 5000).accepted, false);
  s.close();
  // Leave isolated temp directory for inspection; never touch user databases.
});
test('legacy uptime restart after stale gap is accepted', () => {
  const s = new Workshop(':memory:');
  const p = sample(50); delete p.boot_id; delete p.seq;
  s.ingest(p, `${prefix}/esp32-01`, 10000);
  assert.equal(s.ingest({...p, uptime:1000}, `${prefix}/esp32-01`, 11000).accepted, false);
  assert.equal(s.ingest({...p, uptime:1000}, `${prefix}/esp32-01`, 30000).accepted, true);
  s.close();
});
test('notifications dry-run, simulation opt-in, provider rejection and successful mocked delivery', async () => {
  const rows = []; const service = { delivery: (...args) => rows.push(args) };
  const e = {id:'e1', device:'esp32-01', received_at:Date.now(),kind:'ALARM',anomaly:0.7,threshold:0.3,label:'getar',simulated:true};
  const deniedFetch = () => { throw new Error('Must not perform network request'); };
  await notify(e, service, {}, deniedFetch);
  await notify(e, service, {NOTIFICATIONS_ENABLED:'true'}, deniedFetch);
  assert.equal(rows.every(r => r[2] === 'DRY_RUN'), true);
  const env = {NOTIFICATIONS_ENABLED:'true',NOTIFY_SIMULATION:'true',TELEGRAM_BOT_TOKEN:'test-token',TELEGRAM_CHAT_ID:'123'};
  await notify(e, service, env, async () => ({ok:false,json:async()=>({ok:false})}));
  assert.equal(rows.at(-1)[2], 'FAILED');
  await notify(e, service, env, async (url, options) => { assert.equal(JSON.parse(options.body).chat_id,'123'); return {ok:true,json:async()=>({ok:true})}; });
  assert.equal(rows.at(-1)[2], 'SENT');
  assert.equal(JSON.stringify(rows).includes('test-token'), false);
});
