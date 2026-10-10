// POST /api/submit -> yanıtı kaydeder; aynı IP'den MAX_PER_IP'den fazlasını reddeder.
import { store, ipKey, readBody, MAX_PER_IP, MIN_SECONDS } from './_lib.js';

const KEY_RE = /^[a-z_]{2,24}$/;
const clean = (v) => {
  if (Array.isArray(v)) return v.slice(0, 12).map((x) => String(x).slice(0, 80));
  return String(v ?? '').slice(0, 1200);
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });

  const body = readBody(req);
  // Bot önlemleri: görünmez tuzak alanı + çok hızlı doldurma.
  if (body.website) return res.status(200).json({ ok: true });
  const seconds = Number(body.seconds || 0);
  const screenedOut = body.answers && body.answers.rol === 'hicbiri';
  if (!(seconds >= (screenedOut ? 4 : MIN_SECONDS))) return res.status(422).json({ error: 'too_fast' });
  if (!body.answers || typeof body.answers !== 'object') return res.status(400).json({ error: 'empty' });
  const name = String(body.answers?.ad_soyad || '').trim();
  if (name.length < 3) return res.status(400).json({ error: 'name' });
  if (body.consent !== true) return res.status(400).json({ error: 'consent' });

  const key = ipKey(req);
  const count = await store.incr(key);
  if (count > MAX_PER_IP) {
    await store.decr(key);
    return res.status(409).json({ error: 'already_answered' });
  }

  const answers = {};
  for (const [k, v] of Object.entries(body.answers)) if (KEY_RE.test(k)) answers[k] = clean(v);

  // İletişim bilgisi yanıttan AYRI listede tutulur; yanıtlar anonim kalır.
  const contact = body.contact && body.contact.consent === true
    ? { value: String(body.contact.value || '').slice(0, 120), at: new Date().toISOString() }
    : null;
  delete answers.iletisim_bilgi;

  await store.push('responses', {
    at: new Date().toISOString(),
    seconds: Math.round(seconds),
    ref: String(body.ref || '').slice(0, 40),
    answers,
  });
  if (contact && contact.value) await store.push('contacts', contact);

  res.status(200).json({ ok: true });
}
