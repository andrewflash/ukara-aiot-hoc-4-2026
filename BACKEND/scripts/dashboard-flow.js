// Standard FlowFuse widgets: this tab only reads SQLite, never re-ingests MQTT.
module.exports = function dashboardFlow() {
  const z = 'nrui-tab';
  const nodes = [
    {id:z,type:'tab',label:'Day 3 | Dashboard Node-RED',info:'Read-only SQLite snapshot every 2 seconds. DEVICE_ID from .env. See docs/NODE-RED-DASHBOARD.md.'},
    {id:'nrui-base',type:'ui-base',name:'AIoT Workshop',path:'/dashboard',includeClientData:true,acceptsClientConfig:[],showPathInSidebar:false,headerContent:'page',navigationStyle:'default',titleBarStyle:'default',showReconnectNotification:true,showDisconnectNotification:true,notificationDisplayTime:3,allowInstall:false},
    {id:'nrui-theme',type:'ui-theme',name:'AIoT Light',colors:{surface:'#ffffff',primary:'#0f766e',bgPage:'#f1f5f9',groupBg:'#ffffff',groupOutline:'#cbd5e1'},sizes:{density:'default',pagePadding:'12px',groupGap:'12px',groupBorderRadius:'12px',widgetGap:'12px'}},
    {id:'nrui-page',type:'ui-page',name:'AIoT | Monitoring Getaran',ui:'nrui-base',path:'/monitor',icon:'monitor-dashboard',layout:'grid',theme:'nrui-theme',order:1,visible:true,disabled:false,breakpoints:[{name:'Mobile',px:0,cols:3},{name:'Tablet',px:576,cols:6},{name:'Desktop',px:1024,cols:12}]}
  ];
  for (const [i,name] of ['Status perangkat','Tren anomali','Histori inferensi','Event automasi'].entries()) nodes.push({id:`nrui-group-${i}`,type:'ui-group',name,page:'nrui-page',width:6,height:1,order:i+1,showTitle:true,visible:true,disabled:false,groupType:'default'});
  const add = (id,type,name,x,y,wires,extra={}) => nodes.push({id:`nrui-${id}`,type,z,name,x,y,wires,...extra});
  add('tick','inject','Baca SQLite setiap 2 detik',190,100,[['nrui-snapshot']],{props:[{p:'payload'}],repeat:'2',once:true,onceDelay:1,payload:'',payloadType:'date'});
  add('snapshot','function','Snapshot perangkat dari DEVICE_ID',490,100,[['nrui-status'],['nrui-score'],['nrui-label'],['nrui-source'],['nrui-chart'],['nrui-history'],['nrui-events']],{
    outputs:7,noerr:0,initialize:'',finalize:'',libs:[],func:`const svc = global.get('workshop');
const device = env.get('DEVICE_ID') || 'esp32-01';
const rows = svc.query('telemetry', device, 40);
const latest = rows[0];
const state = svc.devices().find(d => d.device === device);
const status = !latest ? 'BELUM ADA DATA' : state?.stale ? 'DATA TERLAMBAT — status terbaru tidak diketahui' : latest.status;
const events = svc.query('events', device, 20).map(e => ({Waktu:new Date(e.received_at).toLocaleString('id-ID'),Event:e.kind,Pengiriman:e.deliveries.map(d => d.channel+': '+d.status).join(', ') || 'Belum ada hasil pengiriman'}));
return [
 {payload:device+' | '+status+' | Alarm: '+(state?.alarm_active ? 'AKTIF' : 'tidak aktif')},
 {payload:latest ? 'Skor '+latest.anomaly.toFixed(3)+' / Ambang '+latest.threshold : '—'},
 {payload:latest ? latest.label+' | Confidence '+(latest.confidence*100).toFixed(1)+'%' : '—'},
 {payload:latest ? (latest.simulated ? 'SIMULASI MQTT' : 'PERANGKAT / PAYLOAD NON-SIMULASI')+' | Diterima '+new Date(latest.received_at).toLocaleString('id-ID') : 'Jalankan simulator MQTT atau ESP32. Skor anomali bukan probabilitas kerusakan.'},
 {action:'replace',payload:rows.slice().reverse().flatMap(r => [{series:'Anomali',time:r.received_at,value:r.anomaly},{series:'Ambang',time:r.received_at,value:r.threshold}])},
 {payload:rows.slice(0,10).map(r => ({Waktu:new Date(r.received_at).toLocaleTimeString('id-ID'),Status:r.status,Label:r.label,Anomali:r.anomaly,Ambang:r.threshold,Confidence:(r.confidence*100).toFixed(1)+'%'}))},
 {payload:events}
];`
  });
  for (const [i,[id,label]] of [['status','Kondisi & alarm'],['score','Skor terakhir'],['label','Klasifikasi terakhir'],['source','Sumber & waktu']].entries()) add(id,'ui-text',label,840,100+i*55,[],{group:'nrui-group-0',order:i+1,width:0,height:2,label,format:'{{msg.payload}}',layout:'col-center',style:false,wrapText:true,value:'payload',valueType:'msg'});
  add('chart','ui-chart','Anomali & ambang (40 inferensi)',850,340,[[]],{group:'nrui-group-1',order:1,width:0,height:8,label:'Skor anomali — bukan probabilitas kerusakan',chartType:'line',category:'series',categoryType:'property',xAxisProperty:'time',xAxisPropertyType:'property',xAxisType:'time',xAxisFormatType:'auto',yAxisProperty:'value',yAxisPropertyType:'property',ymin:'',ymax:'',action:'replace',showLegend:true,removeOlder:24,removeOlderUnit:'3600',removeOlderPoints:'80',colors:['#0f766e','#ea580c'],pointRadius:2,interpolation:'linear'});
  for (const [i,id] of ['history','events'].entries()) add(id,'ui-table',i?'Event & hasil pengiriman':'10 inferensi terakhir',850,430+i*70,[[]],{group:`nrui-group-${i+2}`,order:1,width:0,height:0,maxrows:10,autocols:true,showSearch:false,selectionType:'none',passthru:false,action:'replace',mobileBreakpoint:'sm',mobileBreakpointType:'defaults'});
  return nodes;
};
