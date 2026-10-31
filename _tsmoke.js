/* 整机冒烟：所有页面 + 微信四个面板 都能渲染且不报错 */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const html = fs.readFileSync('小手机.html', 'utf8');
const scripts = (fs.existsSync('app.js') && /app\.js/.test(html)) ? fs.readFileSync('app.js','utf8') : [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join("\n;\n");

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };

const vc = new VirtualConsole();
const errs = [];
vc.on('jsdomError', e => errs.push('jsdomError: ' + e.message));
const dom = new JSDOM(html, { url: 'http://localhost:8080/', virtualConsole: vc, runScripts: 'outside-only' });
const w = dom.window, d = w.document;
w.requestAnimationFrame = cb => setTimeout(() => cb(Date.now()), 0);
w.scrollTo = () => {};
w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
w.indexedDB = { open() { const r = { onsuccess: null, onerror: null, onupgradeneeded: null }; setTimeout(() => r.onsuccess && r.onsuccess({ target: { result: { objectStore() { return { createIndex() {} }; } } } }), 0); return r; } };
w.URL.createObjectURL = () => 'blob:x';
w.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data: [] }), text: () => Promise.resolve('{}'), blob: () => Promise.resolve(new w.Blob(['x'])) });
try { w.eval(scripts); } catch (e) { errs.push('EVAL: ' + e.message); console.log('EVAL ERR', e.message); }

const pages = ['home', 'lock', 'call', 'persona', 'identity', 'check', 'shop', 'wallet', 'album', 'music', 'diary', 'notes', 'plans', 'dates', 'growth', 'world', 'memory', 'study', 'create', 'cowatch', 'settings', 'api', 'helper'];
pages.forEach(p => {
  try { if (w.renderers[p]) { w.go(p); ok(true); } } catch (e) { ok(false, '页面 ' + p + ' 渲染报错：' + e.message); }
});
['main', 'msg', 'call', 'contact', 'circle', 'set'].forEach(p => {
  try { w.go('call'); w.wxShowPane(p); ok(true); } catch (e) { ok(false, '微信面板 ' + p + ' 报错：' + e.message); }
});
// 查手机：每个应用页都点一遍
try {
  w.state.personas = [{ id: 'PS', name: '阿城', netId: '', social: '家人：妈妈\n同事：小李' }];
  w.state.curPersona = 'PS'; w.state.persona = w.state.personas[0];
  w.ensureWx(); w.syncNpc();
  w.checkState.key = 'p:PS'; w.checkState.name = '阿城';
  ['home', 'photo', 'wx', 'npc', 'net', 'call', 'buy', 'take', 'plan'].forEach(t => {
    try { w.checkState.tab = t; w.renderCheck(); ok(true); } catch (e) { ok(false, '查手机 ' + t + ' 报错：' + e.message); }
  });
} catch (e) { ok(false, '查手机整体报错：' + e.message); }

console.log('\n==== ' + pass + ' 通过 / ' + fail + ' 失败 ====');
if (errs.length) { console.log('控制台错误：'); errs.slice(0, 10).forEach(e => console.log('  - ' + e)); }
process.exit(fail || errs.length ? 1 : 0);
