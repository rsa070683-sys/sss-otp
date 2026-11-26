// Tinatanggap ang PIN + FCM token ng device ng bookkeeper at sine-save sa Firestore.
// Ang token lang ang sine-save, hindi ang OTP.
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

const json = (statusCode, obj) => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(obj)
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method' });
  if (!process.env.APP_PIN) return json(500, { error: 'APP_PIN not set' });

  let body = {};
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');
    body = JSON.parse(raw || '{}');
  } catch (e) {
    return json(400, { error: 'bad json' });
  }

  const { pin, token } = body;
  if (typeof pin !== 'string' || !safeEqual(pin, process.env.APP_PIN)) {
    await new Promise((r) => setTimeout(r, 1500)); // pabagalin ang panghuhula ng PIN
    return json(401, { error: 'pin' });
  }
  if (typeof token !== 'string' || token.length < 50 || token.length > 4096) {
    return json(400, { error: 'token' });
  }

  try {
    init();
    const id = crypto.createHash('sha256').update(token).digest('hex');
    await admin.firestore().collection('devices').doc(id).set({
      token,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return json(200, { ok: true });
  } catch (e) {
    console.error('register failed:', e.code || e.message);
    return json(500, { error: 'server' });
  }
};
