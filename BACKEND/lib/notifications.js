'use strict';
const nodemailer = require('nodemailer');
function message(event) {
  return `${event.simulated ? '[SIMULASI] ' : ''}${event.kind}: ${event.device}\nLabel: ${event.label}\nAnomaly score: ${event.anomaly}\nThreshold: ${event.threshold}\nWaktu server: ${new Date(event.received_at).toISOString()}\nID: ${event.id}`;
}
async function notify(event, service, env = process.env, request = fetch) {
  if (env.NOTIFICATIONS_ENABLED !== 'true' || (event.simulated && env.NOTIFY_SIMULATION !== 'true')) {
    service.delivery(event, 'preview', 'DRY_RUN', 'Tidak ada pesan eksternal dikirim');
    return;
  }
  const tasks = [];
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) tasks.push((async () => {
    try {
      const response = await request(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: message(event) }),
        signal: AbortSignal.timeout(10000)
      });
      const body = await response.json();
      if (!response.ok || body.ok !== true) throw new Error('Provider rejected message');
      service.delivery(event, 'telegram', 'SENT', 'Diterima API Telegram');
    } catch { service.delivery(event, 'telegram', 'FAILED', 'Pengiriman gagal; periksa kredensial/jaringan'); }
  })());
  if (env.SMTP_HOST && env.EMAIL_FROM && env.EMAIL_TO) tasks.push((async () => {
    try {
      const transport = nodemailer.createTransport({ host: env.SMTP_HOST, port: Number(env.SMTP_PORT || 587),
        secure: env.SMTP_SECURE === 'true', connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 10000,
        ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } } : {}) });
      const result = await transport.sendMail({ from: env.EMAIL_FROM, to: env.EMAIL_TO,
        subject: `AIoT ${event.kind} - ${event.device}`, text: message(event) });
      service.delivery(event, 'email', result.rejected?.length ? 'FAILED' : 'SENT', 'Respons server SMTP diterima; bukan konfirmasi dibaca');
    } catch { service.delivery(event, 'email', 'FAILED', 'Pengiriman gagal; periksa SMTP/jaringan'); }
  })());
  if (!tasks.length) service.delivery(event, 'configuration', 'SKIPPED', 'Belum ada kanal yang dikonfigurasi');
  await Promise.all(tasks);
}
module.exports = { notify, message };
