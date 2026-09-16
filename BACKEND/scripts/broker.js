// Classroom-only broker. No authentication; bind to loopback by default.
const net = require('node:net');
const aedes = require('aedes')();
aedes.on('subscribe', (subscriptions) => console.log('SUBSCRIBED ' + subscriptions.map(s => s.topic).join(', ')));
const { WebSocketServer, createWebSocketStream } = require('ws');
const host = process.env.BROKER_BIND || '127.0.0.1';
const tcp = net.createServer(aedes.handle);
const ws = new WebSocketServer({ host, port: Number(process.env.MQTT_WS_PORT || 9001), path: '/mqtt' });
ws.on('connection', socket => { const stream = createWebSocketStream(socket); stream.on('error', () => {}); aedes.handle(stream); });
tcp.listen(Number(process.env.MQTT_PORT || 1883), host, () => console.log(`Broker TCP ${host}:${process.env.MQTT_PORT || 1883}; WS ${process.env.MQTT_WS_PORT || 9001}/mqtt (trusted local demo only)`));
for (const server of [tcp, ws]) server.on('error', error => { console.error(error.message); process.exitCode = 1; });
process.on('SIGINT', () => { ws.close(); tcp.close(); aedes.close(() => process.exit()); });
