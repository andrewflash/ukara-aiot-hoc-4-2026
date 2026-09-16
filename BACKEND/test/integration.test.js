const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawn } = require('node:child_process');
const mqtt = require('mqtt');
const { chromium } = require('playwright-core');
const root = path.resolve(__dirname, '..');
async function freePort() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port;
}
async function until(fn, timeout = 20000) {
  const deadline = Date.now() + timeout; let last;
  while (Date.now() < deadline) { try { const result = await fn(); if (result) return result; } catch(e) { last = e; } await new Promise(r => setTimeout(r, 100)); }
  throw last || new Error('Timed out');
}
test('real MQTT -> Node-RED -> SQLite -> API -> browser, no external notifications', { timeout: 90000 }, async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiot-integration-'));
  const [tcpPort, wsPort, httpPort] = await Promise.all([freePort(), freePort(), freePort()]);
  const env = { ...process.env, PORT:String(httpPort), MQTT_HOST:'127.0.0.1', MQTT_PORT:String(tcpPort), MQTT_WS_PORT:String(wsPort),
    MQTT_WS_URL:`ws://127.0.0.1:${wsPort}/mqtt`,
    MQTT_PREFIX:'ukara/aiot/hoc3/vibration', BROKER_BIND:'127.0.0.1', DEVICE_ID:'integration-01',
    WORKSHOP_DATA_DIR:path.join(dir,'data'), WORKSHOP_RUNTIME:path.join(dir,'runtime'),
    NOTIFICATIONS_ENABLED:'false', NOTIFY_SIMULATION:'false', ALARM_WINDOWS:'3', RECOVERY_WINDOWS:'3', COOLDOWN_MS:'60000', STALE_MS:'2000' };
  let logs = ''; const processes = [];
  function start(args) {
    const child = spawn(process.execPath, args, {cwd:root,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
    child.stdout.on('data', b => { logs += b; }); child.stderr.on('data', b => { logs += b; }); processes.push(child); return child;
  }
  t.after(async () => {
    for (const child of processes) {
      if (child.exitCode === null) { const closed = new Promise(r => child.once('exit',r)); child.kill(); await closed; }
    }
  });
  start(['scripts/broker.js']);
  start(['node_modules/node-red/red.js','--userDir',path.join(dir,'runtime'),'--settings',path.join(root,'settings.js')]);
  const base = `http://127.0.0.1:${httpPort}`;
  try {
    await until(async () => (await fetch(base+'/api/health')).ok);
    assert.equal((await fetch(base+'/api/health').then(r=>r.json())).mqttWsUrl,env.MQTT_WS_URL);
    const client = await mqtt.connectAsync(`mqtt://127.0.0.1:${tcpPort}`);
    t.after(() => client.endAsync(true));
    await until(() => logs.includes('SUBSCRIBED ' + env.MQTT_PREFIX + '/+'));
    const topic = env.MQTT_PREFIX+'/integration-01';
    let seq = 0;
    async function publish(high) {
      const payload = {device:'integration-01',boot_id:'test-boot',seq:++seq,uptime:seq*1000,simulated:true,
        label:'getar',confidence:0.9,anomaly:high?0.7:0.1,threshold:0.3,status:high?'ANOMALI':'NORMAL',classes:[{label:'getar',value:0.9}],timing:{dsp:1},heap:{free:10,total:20}};
      await client.publishAsync(topic, JSON.stringify(payload)); return payload;
    }
    const history = () => fetch(base+'/api/history?device=integration-01').then(r=>r.json());
    const events = () => fetch(base+'/api/events?device=integration-01').then(r=>r.json());
    await publish(true); await publish(true); const third = await publish(true);
    await until(async () => (await events())[0]?.deliveries[0]?.status === 'DRY_RUN');
    assert.equal((await events())[0].kind,'ALARM');
    await client.publishAsync(topic,JSON.stringify(third));
    await client.publishAsync(topic,'{"device":"integration-01","anomaly":null}');
    await until(async () => (await history()).length === 3);
    assert.equal((await fetch(base+'/api/history?device=x&limit=9999')).status,400);
    for (let i=0;i<3;i++) await publish(false);
    await until(async () => (await events())[0]?.kind === 'RECOVERY');
    assert.equal((await history()).length,6);
    for (const url of ['/', '/vendor/mqtt/mqtt.min.js','/vendor/chart/chart.umd.js','/red/','/api/dashboard/monitor']) assert.equal((await fetch(base+url)).status,200,url);
    const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
    if (fs.existsSync(chrome)) {
      const browser = await chromium.launch({executablePath:chrome,headless:true});
      t.after(()=>browser.close());
      const page = await browser.newPage({viewport:{width:1440,height:1000}});
      const errors = []; page.on('pageerror', e=>errors.push(e.message));
      await page.goto(base); await page.waitForFunction(()=>document.querySelector('#savedHistory').children.length === 6);
      await page.click('#connectBtn');
      await page.waitForFunction(()=>document.querySelector('#connText').textContent.includes('menunggu data'));
      await until(() => logs.includes('SUBSCRIBED ' + topic));
      await publish(false);
      await page.waitForFunction(()=>document.querySelector('#statusValue').textContent === 'NORMAL');
      assert.match(await page.locator('#dataSource').innerText(), /SIMULASI MQTT/);
      await page.screenshot({path:path.join(dir,'dashboard-desktop.png'),fullPage:true});
      await page.reload(); await page.waitForFunction(()=>document.querySelector('#savedHistory').children.length >= 7);
      await page.locator('label.switch').click(); await page.waitForFunction(()=>document.querySelector('#dataSource').textContent.startsWith('SIMULASI UI'));
      assert.equal(await page.isChecked('#demoToggle'), true);
      await page.locator('label.switch').click();
      assert.equal(await page.isChecked('#demoToggle'), false);
      await page.setViewportSize({width:360,height:800});
      await page.screenshot({path:path.join(dir,'dashboard-mobile.png'),fullPage:true});
      const overflow = await page.evaluate(()=>({width:document.documentElement.scrollWidth, offenders:[...document.querySelectorAll('body > *, .grid > *')].filter(e=>e.getBoundingClientRect().right > innerWidth+1).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width}))}));
      assert.equal(overflow.width <= 361,true,JSON.stringify(overflow));
      assert.deepEqual(errors,[]);
      await page.setViewportSize({width:1440,height:1000});
      await page.goto(base+'/api/dashboard/monitor');
      await page.getByText('SIMULASI MQTT', {exact:false}).waitFor();
      await page.getByText('RECOVERY',{exact:true}).waitFor();
      await page.getByText('DATA TERLAMBAT',{exact:false}).waitFor();
      assert.ok(await page.locator('canvas').count() > 0, 'Node-RED chart rendered');
      await page.screenshot({path:path.join(dir,'node-red-desktop.png'),fullPage:true});
      await page.reload();
      await page.getByText('RECOVERY',{exact:true}).waitFor();
      await page.setViewportSize({width:360,height:800});
      await page.screenshot({path:path.join(dir,'node-red-mobile.png'),fullPage:true});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=361),'Node-RED mobile overflow');
      assert.deepEqual(errors,[]);
      t.diagnostic(`Browser screenshots: ${dir}`);
      await browser.close();
    } else t.diagnostic('Browser test skipped: set CHROME_PATH to a local Chrome binary');
    await until(async () => (await fetch(base+'/api/devices').then(r=>r.json()))[0].stale);
    t.diagnostic('MQTT, API, persistence, dry-run alarm/recovery and stale status verified.');
  } catch(e) { t.diagnostic(logs.slice(-10000)); throw e; }
});
