// GET /api/results?key=ADMIN_KEY[&format=json|csv][&list=contacts]
// Yalnızca ADMIN_KEY bilen ekip üyeleri sonuçları indirebilir.
import { store } from './_lib.js';

const esc = (v) => {
  const s = Array.isArray(v) ? v.join(' | ') : String(v ?? '');
  return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const url = new URL(req.url, 'http://x');
  const key = url.searchParams.get('key');
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) return res.status(401).json({ error: 'key' });

  const list = url.searchParams.get('list') === 'contacts' ? 'contacts' : 'responses';
  const rows = await store.all(list);
  if (url.searchParams.get('format') === 'json') return res.status(200).json({ count: rows.length, rows });

  let cols, flat;
  if (list === 'contacts') {
    cols = ['at', 'value'];
    flat = rows;
  } else {
    const qs = new Set();
    rows.forEach((r) => Object.keys(r.answers || {}).forEach((k) => qs.add(k)));
    qs.delete('ad_soyad');
    cols = ['at', 'ad_soyad', 'seconds', 'ref', ...qs];
    flat = rows.map((r) => ({ at: r.at, seconds: r.seconds, ref: r.ref, ...r.answers }));
  }
  const csv = '﻿' + [cols.join(','), ...flat.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${list}.csv"`);
  res.status(200).send(csv);
}
