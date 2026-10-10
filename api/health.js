// GET /api/health -> depolama bağlı mı? (gizli bilgi döndürmez)
import { store, ENV_NAMES } from './_lib.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  let write = false;
  if (store.usingRedis) {
    try { await store.incr('circle:health'); write = true; } catch (e) { write = false; }
  }
  res.status(200).json({ storage: store.usingRedis ? 'upstash-redis' : 'YOK (bellek)', write_ok: write, env_names: ENV_NAMES, at: new Date().toISOString() });
}
