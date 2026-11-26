// Tinatanggap ang SMS mula sa MacroDroid at ipinapadala ang OTP bilang push (FCM).
// Hindi sine-save o nilo-log ang OTP.
const crypto = require('crypto');
const admin = require('firebase-admin');

function init() {
  if (admin.apps.length) return;
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    })
  });
}

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

const reply = (statusCode, text) => ({ statusCode, headers: { 'content-type': 'text/plain' }, body: text });

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return reply(405, 'method');
  if (!process.env.SECRET_TOKEN) return reply(500, 'SECRET_TOKEN not set');

  const headers = event.headers || {};
  if (!safeEqual(headers['x-token'] || '', process.env.SECRET_TOKEN)) return reply(401, 'unauthorized');

  // Plain text ang body (buong SMS, may newline). Kung JSON na may "msg", tanggap din.
  let msg = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');
  if (msg.trim().startsWith('{')) {
    try { msg = String(JSON.parse(msg).msg || ''); } catch (e) {}
  }

  // SSS OTP lang ang pinapayagan.
  const m = msg.match(/Your SSS OTP is\s+(\d{6})/i);
  if (!m) return reply(200, 'ignored');
  const otp = m[1];
  const ts = String(Date.now());

  try {
    init();
    const db = admin.firestore();
    const snap = await db.collection('devices').get();
    if (snap.empty) return reply(200, 'no devices');

    const results = await Promise.allSettled(
      snap.docs.map((doc) =>
        admin.messaging().send({
          token: doc.get('token'),
          data: { otp, ts },
          webpush: { headers: { Urgency: 'high', TTL: '300' } } // 5 min lang, para hindi dumating ang lumang OTP
        })
      )
    );

    // Tanggalin ang mga patay na token.
    const dead = [];
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        const code = (r.reason && r.reason.code) || '';
        if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
          dead.push(snap.docs[i].ref.delete());
        }
      }
    });
    await Promise.allSettled(dead);

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    return reply(200, 'sent ' + sent + '/' + snap.size);
  } catch (e) {
    console.error('sms failed:', e.code || e.message); // walang OTP sa log
    return reply(500, 'server');
  }
};
