'use strict';
const { DatabaseSync } = require('node:sqlite');
const { randomUUID } = require('node:crypto');
const ID = /^[A-Za-z0-9_-]{1,64}$/;
function positive(value, fallback) {
  const n = Number(value ?? fallback);
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error('Invalid rule configuration');
  return n;
}
function validate(raw, topic, prefix) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Payload must be an object');
  if (typeof raw.device !== 'string' || !ID.test(raw.device)) throw new Error('Invalid device ID');
  if (topic !== `${prefix}/${raw.device}`) throw new Error('Topic/device mismatch');
  for (const field of ['uptime', 'confidence', 'anomaly', 'threshold']) {
    if (typeof raw[field] !== 'number' || !Number.isFinite(raw[field])) throw new Error(`Invalid ${field}`);
  }
  if (raw.uptime < 0 || raw.confidence < 0 || raw.confidence > 1 || raw.threshold <= 0) throw new Error('Out-of-range value');
  if (typeof raw.label !== 'string' || raw.label.length < 1 || raw.label.length > 80) throw new Error('Invalid label');
  if (!Array.isArray(raw.classes) || raw.classes.length < 1 || raw.classes.length > 20) throw new Error('Invalid classes');
  const seen = new Set();
  for (const c of raw.classes) {
    if (!c || typeof c.label !== 'string' || !c.label.length || c.label.length > 80 || seen.has(c.label) ||
        typeof c.value !== 'number' || !Number.isFinite(c.value) || c.value < 0 || c.value > 1) throw new Error('Invalid class');
    seen.add(c.label);
  }
  const status = raw.anomaly > raw.threshold ? 'ANOMALI' : 'NORMAL';
  if (raw.status !== status) throw new Error('Status does not match anomaly/threshold');
  if (raw.boot_id !== undefined && (typeof raw.boot_id !== 'string' || !ID.test(raw.boot_id))) throw new Error('Invalid boot ID');
  if (raw.seq !== undefined && (!Number.isSafeInteger(raw.seq) || raw.seq < 0)) throw new Error('Invalid sequence');
  return { ...raw, status, simulated: raw.simulated === true };
}
class Workshop {
  constructor(filename, options = {}) {
    this.prefix = options.prefix || process.env.MQTT_PREFIX || 'ukara/aiot/hoc3/vibration';
    this.rule = {
      alarmWindows: positive(options.alarmWindows ?? process.env.ALARM_WINDOWS, 3),
      recoveryWindows: positive(options.recoveryWindows ?? process.env.RECOVERY_WINDOWS, 3),
      cooldownMs: positive(options.cooldownMs ?? process.env.COOLDOWN_MS, 60000),
      staleMs: positive(options.staleMs ?? process.env.STALE_MS, 10000)
    };
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS telemetry (id INTEGER PRIMARY KEY, device TEXT NOT NULL, received_at INTEGER NOT NULL, payload TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS telemetry_device_time ON telemetry(device, received_at);
      CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, device TEXT NOT NULL, received_at INTEGER NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS events_device_time ON events(device, received_at);
      CREATE TABLE IF NOT EXISTS device_state (device TEXT PRIMARY KEY, state TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS deliveries (id INTEGER PRIMARY KEY, event_id TEXT NOT NULL, channel TEXT NOT NULL, status TEXT NOT NULL, detail TEXT, received_at INTEGER NOT NULL);
    `);
  }
  close() { this.db.close(); }
  validate(raw, topic) { return validate(raw, topic, this.prefix); }
  // One transaction persists the inference, per-device rule state, and event.
  ingest(raw, topic, now = Date.now(), retained = false) {
    const data = this.validate(raw, topic);
    if (retained) return { accepted: false, reason: 'Retained message: not a new inference' };
    const record = this.db.prepare('SELECT state FROM device_state WHERE device=?').get(data.device);
    const s = record ? JSON.parse(record.state) : { high: 0, low: 0, active: false, lastAlert: 0, retiredBoots: [] };
    s.retiredBoots ||= [];
    const gap = s.lastSeen !== undefined && now - s.lastSeen > this.rule.staleMs;
    if (data.boot_id && s.retiredBoots.includes(data.boot_id)) return { accepted: false, reason: 'Old boot session' };
    const newBoot = data.boot_id && s.boot && data.boot_id !== s.boot;
    // Legacy firmware has no boot_id: after a quiet gap, allow uptime reset.
    const legacyRestart = !data.boot_id && gap && data.uptime < s.uptime;
    if (!newBoot && !legacyRestart && s.uptime !== undefined && data.uptime <= s.uptime) return { accepted: false, reason: 'Duplicate or out-of-order uptime' };
    if (!newBoot && data.seq !== undefined && s.seq !== undefined && data.seq <= s.seq) return { accepted: false, reason: 'Duplicate sequence' };
    if (newBoot) s.retiredBoots = [...s.retiredBoots, s.boot].slice(-20);
    if (newBoot || legacyRestart || gap) { s.high = 0; s.low = 0; }
    s.high = data.status === 'ANOMALI' ? s.high + 1 : 0;
    s.low = data.status === 'NORMAL' ? s.low + 1 : 0;
    let kind;
    if (s.high >= this.rule.alarmWindows && (!s.active || now - s.lastAlert >= this.rule.cooldownMs)) {
      // Even re-entry to alarm respects the previous alert cooldown.
      if (!s.lastAlert || now - s.lastAlert >= this.rule.cooldownMs) {
        kind = s.active ? 'REMINDER' : 'ALARM'; s.lastAlert = now;
      }
      s.active = true;
    } else if (s.active && s.low >= this.rule.recoveryWindows) { kind = 'RECOVERY'; s.active = false; }
    Object.assign(s, { lastSeen: now, uptime: data.uptime, boot: data.boot_id, seq: data.seq });
    const event = kind ? { id: randomUUID(), device: data.device, received_at: now, kind,
      anomaly: data.anomaly, threshold: data.threshold, label: data.label,
      confidence: data.confidence, simulated: data.simulated } : null;
    this.db.exec('BEGIN');
    try {
      this.db.prepare('INSERT INTO telemetry(device,received_at,payload) VALUES(?,?,?)').run(data.device, now, JSON.stringify(data));
      this.db.prepare('INSERT INTO device_state(device,state) VALUES(?,?) ON CONFLICT(device) DO UPDATE SET state=excluded.state').run(data.device, JSON.stringify(s));
      if (event) this.db.prepare('INSERT INTO events VALUES(?,?,?,?,?)').run(event.id, data.device, now, kind, JSON.stringify(event));
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    return { accepted: true, data, received_at: now, event };
  }
  query(kind, device, limit = 100) {
    if (!ID.test(device || '')) throw new Error('Use a valid device query parameter');
    const n = Number(limit);
    if (!Number.isInteger(n) || n < 1 || n > 500) throw new Error('limit must be 1..500');
    if (!['telemetry', 'events'].includes(kind)) throw new Error('Invalid resource');
    const rows = this.db.prepare(`SELECT * FROM ${kind} WHERE device=? ORDER BY received_at DESC, rowid DESC LIMIT ?`).all(device, n);
    return rows.map(r => ({ id: r.id, received_at: r.received_at, ...JSON.parse(r.payload),
      ...(kind === 'events' ? { deliveries: this.db.prepare('SELECT channel,status,detail,received_at FROM deliveries WHERE event_id=? ORDER BY id').all(r.id) } : {}) }));
  }
  devices(now = Date.now()) {
    return this.db.prepare('SELECT device,state FROM device_state ORDER BY device').all().map(r => {
      const s = JSON.parse(r.state);
      return { device: r.device, received_at: s.lastSeen, stale: now - s.lastSeen > this.rule.staleMs, alarm_active: s.active };
    });
  }
  delivery(event, channel, status, detail = '') {
    this.db.prepare('INSERT INTO deliveries(event_id,channel,status,detail,received_at) VALUES(?,?,?,?,?)')
      .run(event.id, channel, status, String(detail).slice(0, 160), Date.now());
  }
}
module.exports = { Workshop, validate };
