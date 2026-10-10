// GET /api/check -> bu IP daha önce yanıt verdi mi?
import { store, ipKey, MAX_PER_IP } from './_lib.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const n = Number((await store.get(ipKey(req))) || 0);
  res.status(200).json({ answered: n >= MAX_PER_IP });
}
