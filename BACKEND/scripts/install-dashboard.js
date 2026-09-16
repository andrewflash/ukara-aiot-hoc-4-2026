// Run with Node-RED STOPPED. Preserve edited flows and back up before adding a tab.
const fs = require('node:fs');
const path = require('node:path');
const runtime = process.env.WORKSHOP_RUNTIME || path.join(__dirname,'../runtime');
const filename = path.join(runtime,'flows.json');
if (!fs.existsSync(filename)) {
  console.log('Belum ada runtime; npm start akan memakai template lengkap.');
} else {
  const source = fs.readFileSync(filename,'utf8');
  const current = JSON.parse(source);
  const additions = require('./dashboard-flow')();
  if (!Array.isArray(current)) throw new Error('Format runtime tidak dikenali; gunakan Import di editor.');
  if (current.some(n => additions.some(a => a.id === n.id))) {
    console.log('ID dashboard sudah ada. Tidak mengubah flow; periksa tab Dashboard di editor.');
  } else {
    const backup = filename+'.before-dashboard-'+Date.now()+'.bak';
    fs.writeFileSync(backup,source,{flag:'wx'});
    fs.writeFileSync(filename,JSON.stringify([...current,...additions],null,2)+'\n');
    console.log('Dashboard ditambahkan. Backup: '+backup);
  }
}
