/* Headless deadline-day sims for Couch To Front Office v10.3.
   Does not modify game logic. Builds a temporary index.html with an observe-only hook.
   Usage: node sims/deadline-sim.js [--probe] [--only N]
*/
const fs = require('fs');
const path = require('path');
const http = require('http');
const puppeteer = require('/tmp/simdeps/node_modules/puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const GAME = path.join(ROOT, 'game');
const OUT = path.join(ROOT, 'sims');
const RAW = path.join(OUT, 'raw');
const PORT = 8796;
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';

const SPECS = [];
// 14 opening-season deadlines, 8 year-2, 6 year-3, 4 year-4. 32 franchises.
[101,102,103,104,105,106,107,108,109,110,111,112,113,114].forEach(s => SPECS.push({ seed: s, seasons: 1 }));
[201,202,203,204,205,206,207,208].forEach(s => SPECS.push({ seed: s, seasons: 2 }));
[301,302,303,304,305,306].forEach(s => SPECS.push({ seed: s, seasons: 3 }));
[401,402,403,404].forEach(s => SPECS.push({ seed: s, seasons: 4 }));

function serve(dir) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
  return http.createServer((req, res) => {
    const u = decodeURIComponent((req.url || '/').split('?')[0]);
    let p = path.join(dir, u === '/' ? 'index.html' : u);
    if (!p.startsWith(dir)) { res.writeHead(403); res.end('no'); return; }
    fs.readFile(p, (err, buf) => {
      if (err) { res.writeHead(404); res.end('missing'); return; }
      res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(buf);
    });
  });
}

function buildSimHtml() {
  const src = fs.readFileSync(path.join(GAME, 'index.html'), 'utf8');
  const hook = fs.readFileSync(path.join(OUT, 'page-hook.js'), 'utf8');
  const anchor = "  try{init();}catch(e){var box=$('fatal-message');box.hidden=false;$('fatal-detail').textContent='Startup error: '+e.message;}\n})();";
  if (!src.includes(anchor)) throw new Error('index.html anchor missing; rebuild from parts first');
  const html = src.replace(anchor, '\n' + hook + '\n' + anchor);
  const destDir = '/tmp/ctfo-sim';
  fs.mkdirSync(destDir, { recursive: true });
  for (const name of fs.readdirSync(GAME)) {
    if (name === 'index.html' || name.startsWith('index.html.part')) continue;
    const target = path.join(destDir, name);
    try { fs.unlinkSync(target); } catch (e) {}
    try { fs.symlinkSync(path.join(GAME, name), target); } catch (e) {}
  }
  fs.writeFileSync(path.join(destDir, 'index.html'), html);
  return destDir;
}

async function runOne(browser, spec, n) {
  const page = await browser.newPage();
  page.setDefaultTimeout(600000);
  page.setDefaultNavigationTimeout(180000);
  const errors = [];
  page.on('pageerror', e => { if (errors.length < 12) errors.push(String(e.message || e).slice(0, 300)); });
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/Failed to load resource|net::ERR|CORS|404/.test(t)) return;
    if (errors.length < 12) errors.push(t.slice(0, 300));
  });
  await page.setRequestInterception(true);
  page.on('request', r => {
    const u = r.url();
    if (u.startsWith('http://127.0.0.1') || u.startsWith('http://localhost') || u.startsWith('data:') || u.startsWith('blob:')) r.continue();
    else r.abort();
  });
  await page.evaluateOnNewDocument(() => {
    try {
      Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get() { return false; } });
      Object.defineProperty(Document.prototype, 'visibilityState', { configurable: true, get() { return 'visible'; } });
    } catch (e) {}
  });
  const t0 = Date.now();
  await page.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__SIM && window.__SIM.start, { timeout: 60000 });
  const started = await page.evaluate(seed => window.__SIM.start(seed), spec.seed);
  const years = [];
  for (let y = 1; y < spec.seasons; y++) {
    const step = await page.evaluate(() => window.__SIM.finishSeason());
    years.push(step);
    if (!step || !step.ok) break;
  }
  const failedYear = years.find(y => !y.ok);
  let deadline = null;
  if (!failedYear) deadline = await page.evaluate(() => window.__SIM.deadline());
  const out = {
    n, seed: spec.seed, seasons: spec.seasons, started, years, deadline, errors,
    ms: Date.now() - t0
  };
  fs.writeFileSync(path.join(RAW, 'sim-' + String(n).padStart(3, '0') + '.json'), JSON.stringify(out));
  await page.close();
  return out;
}

async function main() {
  const probe = process.argv.includes('--probe');
  const onlyArg = process.argv.indexOf('--only');
  const only = onlyArg >= 0 ? Number(process.argv[onlyArg + 1]) : null;
  fs.mkdirSync(RAW, { recursive: true });
  const dir = buildSimHtml();
  const server = serve(dir);
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    protocolTimeout: 600000,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-extensions']
  });
  const list = probe ? [SPECS[0], SPECS[14]] : SPECS;
  const results = [];
  try {
    for (let i = 0; i < list.length; i++) {
      const spec = list[i];
      const n = only != null ? only : (probe ? i : i + 1);
      if (only != null && i + 1 !== only) continue;
      process.stdout.write('SIM ' + (i + 1) + '/' + list.length + ' seed=' + spec.seed + ' seasons=' + spec.seasons + '\n');
      const out = await runOne(browser, spec, probe ? (i === 0 ? 1 : 15) : i + 1);
      const trades = (out.deadline && out.deadline.trades || []).length + (out.deadline && out.deadline.earlierTrades || []).length;
      const calls = (out.deadline && out.deadline.calls || []).length;
      process.stdout.write('  ok=' + !!(out.deadline && out.deadline.ok) + ' trades=' + trades + ' calls=' + calls + ' ms=' + out.ms + ' err=' + out.errors.length + '\n');
      if (out.years && out.years.length) process.stdout.write('  years=' + JSON.stringify(out.years) + '\n');
      if (out.deadline && out.deadline.note) process.stdout.write('  note=' + out.deadline.note + '\n');
      if (out.errors.length) process.stdout.write('  errors=' + JSON.stringify(out.errors.slice(0, 3)) + '\n');
      results.push({ n: out.n, seed: out.seed, seasons: out.seasons, ok: !!(out.deadline && out.deadline.ok), trades, calls, ms: out.ms });
    }
  } finally {
    await browser.close();
    server.close();
  }
  fs.writeFileSync(path.join(OUT, 'sim-index.json'), JSON.stringify(results, null, 1));
  console.log('DONE', results.length);
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
