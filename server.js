// Wake Legends '03 - friends multiplayer server.
// Serves the game and passes messages between players (positions, tricks, chat, towing, voice-chat setup).
// No accounts, no database: everyone who opens your link is in the same session.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
// optional voice-chat relay for friends on strict networks: set TURN_URL, TURN_USERNAME, TURN_PASSWORD on Render
const TURN = process.env.TURN_URL ? [{ urls: process.env.TURN_URL.split(',').map(u => u.trim()).filter(Boolean), username: process.env.TURN_USERNAME || '', credential: process.env.TURN_PASSWORD || '' }] : [];
const MAX_PLAYERS = 16;

// find the game file wherever it was uploaded (public/index.html, index.html, or any *.html)
function findGame() {
  const tries = [path.join(__dirname, 'public', 'index.html'), path.join(__dirname, 'index.html')];
  for (const f of tries) if (fs.existsSync(f)) return f;
  for (const dir of [path.join(__dirname, 'public'), __dirname]) {
    if (!fs.existsSync(dir)) continue;
    const h = fs.readdirSync(dir).filter(f => /\.html?$/i.test(f)).sort((a, b) => fs.statSync(path.join(dir, b)).size - fs.statSync(path.join(dir, a)).size)[0];
    if (h) return path.join(dir, h);
  }
  return null;
}
const GAME = findGame();
let page = null;
function getPage() {
  if (page) return page;
  if (!GAME) return null;
  page = fs.readFileSync(GAME, 'utf8').replace('<!--MP-->', '<script>window.MP_ON=true;window.ICE_X=' + JSON.stringify(TURN).replace(/</g, '\\u003c') + '</script>');
  return page;
}
console.log(GAME ? 'Serving the game from ' + path.relative(__dirname, GAME) : '!!! Could not find the game html file - put index.html in the public folder');

const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok ' + players.size); return; }
  if (url === '/' || url === '/index.html') {
    const p = getPage();
    if (!p) { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('Game file not found. Upload index.html into the public folder.'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }); res.end(p); return;
  }
  res.writeHead(404); res.end('not found');
});

const wss = new WebSocketServer({ server, maxPayload: 64 * 1024 });
const players = new Map();
let nextId = 1;
const num = v => (typeof v === 'number' && isFinite(v) ? v : 0);
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, '').slice(0, n);
const send = (ws, o) => { if (ws.readyState === 1) ws.send(typeof o === 'string' ? o : JSON.stringify(o)); };
const toAll = (o, except) => { const m = JSON.stringify(o); for (const p of players.values()) if (p !== except && p.hi) send(p.ws, m); };
const LOCS = new Set(['menu', 'island', 'sunset', 'river', 'mountain', 'park', 'tropical', 'urban']);
const pub = p => ({ id: p.id, name: p.name, lvl: p.lvl, look: p.look, boat: p.boat, paint: p.paint, loc: p.loc });

wss.on('connection', ws => {
  if (players.size >= MAX_PLAYERS) { send(ws, { t: 'full' }); ws.close(); return; }
  const p = { id: nextId++, ws, name: 'RIDER', lvl: 1, look: null, boat: 'pro', paint: null, loc: 'menu', role: 'menu', hi: false, last: Date.now() };
  players.set(p.id, p);
  ws.on('message', raw => {
    let d; try { d = JSON.parse(raw); } catch (e) { return; }
    if (!d || typeof d !== 'object') return;
    p.last = Date.now();
    if (d.t === 'hi' || d.t === 'look') {
      p.name = str(d.name, 14).toUpperCase() || 'RIDER'; p.lvl = Math.max(1, Math.min(99, Math.trunc(num(d.lvl)) || 1));
      p.look = d.look && typeof d.look === 'object' ? JSON.parse(JSON.stringify(d.look).slice(0, 4000)) : null;
      p.boat = str(d.boat, 24) || 'pro'; p.paint = Array.isArray(d.paint) ? d.paint.slice(0, 4).map(num) : null;
      if (d.t === 'hi' && !p.hi) {
        p.hi = true;
        send(ws, { t: 'welcome', id: p.id, ice: TURN, peers: [...players.values()].filter(q => q !== p && q.hi).map(pub) });
        toAll(Object.assign({ t: 'join' }, pub(p)), p);
        console.log(p.name + ' joined (' + [...players.values()].filter(q => q.hi).length + ' online)');
      } else if (p.hi) toAll(Object.assign({ t: 'look' }, pub(p)), p);
      return;
    }
    if (!p.hi) return;
    if (d.t === 'st') {
      const loc = str(d.loc, 16); if (!LOCS.has(loc)) return;
      p.loc = loc; p.role = d.w ? 'island' : d.dv ? 'drive' : d.tb ? 'towed' : loc === 'menu' ? 'menu' : 'ride';
      d.id = p.id; delete d.t;
      toAll(Object.assign({ t: 'st' }, d), p);
    } else if (d.t === 'ev') {
      toAll({ t: 'ev', id: p.id, kind: str(d.kind, 16), data: d.data && typeof d.data === 'object' ? JSON.parse(JSON.stringify(d.data).slice(0, 600)) : null }, p);
    } else if (d.t === 'chat') {
      const text = str(d.text, 120).trim(); if (!text) return;
      toAll({ t: 'chat', id: p.id, name: p.name, text });
    } else if (d.t === 'tow' || d.t === 'duel') {
      const q = players.get(Math.trunc(num(d.to))); if (!q || q === p) return;
      send(q.ws, { t: d.t, from: p.id, a: str(d.a, 12) });
    } else if (d.t === 'rtc') {
      const q = players.get(Math.trunc(num(d.id))); if (!q || q === p) return;
      const m = { t: 'rtc', from: p.id };
      if (d.sdp && typeof d.sdp === 'object') m.sdp = { type: str(d.sdp.type, 10), sdp: String(d.sdp.sdp || '').slice(0, 20000) };
      if (d.ice && typeof d.ice === 'object') m.ice = d.ice;
      send(q.ws, m);
    }
  });
  ws.on('close', () => {
    players.delete(p.id);
    if (p.hi) { toAll({ t: 'bye', id: p.id }); console.log(p.name + ' left'); }
  });
  ws.on('error', () => {});
});

// everyone gets the friends list (who is where, doing what) every couple of seconds
setInterval(() => {
  const now = Date.now();
  for (const p of players.values()) if (now - p.last > 60000) { try { p.ws.terminate(); } catch (e) {} }
  toAll({ t: 'list', p: [...players.values()].filter(q => q.hi).map(q => ({ id: q.id, name: q.name, loc: q.loc, role: q.role })) });
}, 2000);

server.listen(PORT, () => console.log('Wake Legends online on port ' + PORT));
