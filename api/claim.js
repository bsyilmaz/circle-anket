// POST /api/claim {password}: sonuç şifresi henüz yoksa belirler (yalnızca bir kez).
// GET /api/claim -> { claimed: true|false }
import { store, readBody, hashPw } from './_lib.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return res.status(200).json({ claimed: !!(await store.get('circle:admin')) });
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const pw = String(readBody(req).password || '');
  if (pw.length < 8) return res.status(400).json({ error: 'short' });
  const ok = await store.setnx('circle:admin', hashPw(pw));
  res.status(ok ? 200 : 409).json(ok ? { ok: true } : { error: 'already_claimed' });
}
