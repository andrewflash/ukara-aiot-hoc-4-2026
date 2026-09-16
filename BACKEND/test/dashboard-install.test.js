const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

test('dashboard installer preserves edited runtime, backs up, and is idempotent', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'aiot-dashboard-install-'));
  const filename = path.join(dir,'flows.json');
  const run = () => {
    const result = spawnSync(process.execPath,[path.join(__dirname,'../scripts/install-dashboard.js')],{env:{...process.env,WORKSHOP_RUNTIME:dir},encoding:'utf8',windowsHide:true});
    assert.equal(result.status,0,result.stderr);
  };
  run();
  assert.equal(fs.existsSync(filename),false,'first start still uses template');
  const custom = [{id:'teacher-flow',type:'tab',label:'User changes'}];
  fs.writeFileSync(filename,JSON.stringify(custom));
  run();
  const installed = fs.readFileSync(filename,'utf8');
  assert.deepEqual(JSON.parse(installed)[0],custom[0]);
  assert.ok(JSON.parse(installed).some(n=>n.id==='nrui-tab'));
  const backups = fs.readdirSync(dir).filter(n=>n.endsWith('.bak'));
  assert.equal(backups.length,1);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,backups[0]),'utf8')),custom);
  run();
  assert.equal(fs.readFileSync(filename,'utf8'),installed);
  assert.equal(fs.readdirSync(dir).filter(n=>n.endsWith('.bak')).length,1);
});
