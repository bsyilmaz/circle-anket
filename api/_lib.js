// Ortak yardımcılar: depolama (Upstash Redis), IP özeti, limitler.
import { createHash } from 'node:crypto';

// Upstash bağlantısı hangi önekle eklenmiş olursa olsun bulunur
// (KV_REST_API_URL, UPSTASH_REDIS_REST_URL, XYZ_KV_REST_API_URL ...).
function findRedisEnv() {
  const env = process.env;
  for (const k of Object.keys(env)) {
    if (!k.endsWith('REST_API_URL') && !k.endsWith('REDIS_REST_URL')) continue;
    const t = k.replace(/URL$/, 'TOKEN');
    if (env[k] && env[t]) return { url: env[k], token: env[t] };
  }
  return { url: null, token: null };
}
const { url: URL, token: TOKEN } = findRedisEnv();
// Sonuç indirme şifresi: ADMIN_KEY verilmediyse Redis token'ı kullanılır
// (Vercel > Storage > veritabanı > .env.local sekmesinde görünür).
export const ADMIN_KEY = process.env.ADMIN_KEY || TOKEN || null;

// Aynı IP'den kaç yanıt kabul edilir. Varsayılan 1.
export const MAX_PER_IP = Math.max(1, parseInt(process.env.MAX_PER_IP || '1', 10));
// Anketin bir insan tarafından doldurulduğunu varsaydığımız en kısa süre (sn).
export const MIN_SECONDS = parseInt(process.env.MIN_SECONDS || '15', 10);

let redis = null;
if (URL && TOKEN) {
  const { Redis } = await import('@upstash/redis');
  redis = new Redis({ url: URL, token: TOKEN });
}

// Redis yoksa (yerel deneme) bellek içi yedek. Üretimde KULLANILMAZ.
const mem = { kv: new Map(), lists: new Map() };
export const store = {
  usingRedis: !!redis,
  async incr(k) {
    if (redis) return redis.incr(k);
    const v = (mem.kv.get(k) || 0) + 1; mem.kv.set(k, v); return v;
  },
  async decr(k) {
    if (redis) return redis.decr(k);
    const v = (mem.kv.get(k) || 0) - 1; mem.kv.set(k, v); return v;
  },
  async get(k) {
    if (redis) return redis.get(k);
    return mem.kv.get(k) ?? null;
  },
  async push(list, value) {
    if (redis) return redis.rpush(list, JSON.stringify(value));
    if (!mem.lists.has(list)) mem.lists.set(list, []);
    mem.lists.get(list).push(JSON.stringify(value));
  },
  async all(list) {
    const raw = redis ? await redis.lrange(list, 0, -1) : (mem.lists.get(list) || []);
    return raw.map((r) => (typeof r === 'string' ? JSON.parse(r) : r));
  },
};

// Vercel, istemci IP'sini x-forwarded-for / x-real-ip başlığına kendisi yazar.
export function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

// IP'yi açık saklamıyoruz: gizli tuzla SHA-256 özeti (KVKK: veri minimizasyonu).
export function ipKey(req) {
  const salt = process.env.IP_SALT || TOKEN || 'yerel-deneme-tuzu';
  const h = createHash('sha256').update(salt + '|' + clientIp(req)).digest('hex').slice(0, 32);
  return 'circle:ip:' + h;
}

export function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}
