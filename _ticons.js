/* 图标库体检：不同功能不许共用一个图形、不许有画到画布外的线、不许有空图 */
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

const IC = w.LN_ICONS || {};
const names = Object.keys(IC);

/* ---------- 库本身 ---------- */
ok(names.length > 60, '图标库里有一整套图标（' + names.length + ' 个）');
ok(names.every(n => typeof IC[n] === 'string' && IC[n].length > 4), '每个图标都有路径数据');

// 不同功能不许共用同一个图形（完全一样的 path 直接判重复）
const byPath = {};
names.forEach(n => { (byPath[IC[n]] = byPath[IC[n]] || []).push(n); });
const dups = Object.values(byPath).filter(v => v.length > 1);
ok(dups.length === 0, '没有两个图标共用同一条路径' + (dups.length ? '：' + JSON.stringify(dups) : ''));

// 相似但不重复的同族（挂断/静音、上锁/解锁）允许，这里只卡死「一模一样」

/* ---------- 路径合法 ---------- */
function nums(str) { return (str.match(/-?\d*\.?\d+/g) || []).map(Number); }
const bad = [];
names.forEach(n => {
  const d = IC[n];
  if (/NaN|undefined/.test(d)) bad.push(n + ' 含非法字符');
});
ok(bad.length === 0, '路径里没有非法字符' + (bad.length ? '：' + bad.join('，') : ''));

// 坐标不许跑到 24×24 画布外面（会被裁掉，看着像断线）
const outside = [];
names.forEach(n => {
  const cmds = IC[n].match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) || [];
  let x = 0, y = 0, rel = false;
  cmds.forEach(seg => {
    const cmd = seg[0];
    const args = nums(seg.slice(1));
    rel = cmd === cmd.toLowerCase();
    const up = cmd.toUpperCase();
    for (let i = 0; i < args.length; ) {
      if (up === 'A') {   // rx ry rot laf sf x y —— 终点也要跟着走，否则后面的相对坐标全算错
        x = rel ? x + args[i + 5] : args[i + 5];
        y = rel ? y + args[i + 6] : args[i + 6];
        i += 7;
        continue;
      }
      let nx = x, ny = y;
      if (up === 'H') { nx = rel ? x + args[i] : args[i]; i += 1; }
      else if (up === 'V') { ny = rel ? y + args[i] : args[i]; i += 1; }
      else if (up === 'Z') { nx = 0; ny = 0; i = args.length; }
      else if (up === 'C') { nx = rel ? x + args[i + 4] : args[i + 4]; ny = rel ? y + args[i + 5] : args[i + 5]; i += 6; }
      else if (up === 'S' || up === 'Q') { nx = rel ? x + args[i + 2] : args[i + 2]; ny = rel ? y + args[i + 3] : args[i + 3]; i += 4; }
      else if (up === 'T') { nx = rel ? x + args[i] : args[i]; ny = rel ? y + args[i + 1] : args[i + 1]; i += 2; }
      else { nx = rel ? x + args[i] : args[i]; ny = rel ? y + args[i + 1] : args[i + 1]; i += 2; }
      x = nx; y = ny;
      if (x < -0.6 || x > 24.6 || y < -0.6 || y > 24.6) outside.push(n);
    }
  });
});
ok(outside.length === 0, '没有图标画到 24×24 画布外面' + (outside.length ? '：' + [...new Set(outside)].join('，') : ''));

/* ---------- 引用完整性 ---------- */
const used = new Set();
[...html.matchAll(/lnIcon\('([a-zA-Z0-9]+)'/g)].forEach(m => used.add(m[1]));
[...html.matchAll(/data-ico="([a-zA-Z0-9]+)"/g)].forEach(m => used.add(m[1]));
[...html.matchAll(/ico:'([a-zA-Z0-9]+)'/g)].forEach(m => used.add(m[1]));
const missing = [...used].filter(n => !IC[n]);
ok(missing.length === 0, '用到的图标在库里都存在' + (missing.length ? '：' + missing.join('，') : ''));

/* ---------- 桌面功能各用各的 ---------- */
try {
  const icoOf = {};
  w.APPS.forEach(a => { (icoOf[a.ico] = icoOf[a.ico] || []).push(a.name); });
  const shared = Object.values(icoOf).filter(v => v.length > 1);
  ok(shared.length === 0, '桌面每个功能用自己的图标' + (shared.length ? '：' + JSON.stringify(shared) : ''));
  ok(IC[w.APPS.filter(a => a.id === 'album')[0].ico] !== IC.image, '相册不再和「图片」用同一个图标');
  ok(IC[w.APPS.filter(a => a.id === 'call')[0].ico] !== IC.chat, '微信不再和「聊天」用同一个图标');
} catch (e) { ok(false, '桌面图标检查报错：' + e.message); }

/* ---------- 生成出来的 SVG ---------- */
try {
  const svg = w.lnIcon('heart', 20);
  ok(svg.indexOf('<svg') === 0 && svg.indexOf('viewBox="0 0 24 24"') > 0, '生成的是 24×24 的 SVG');
  ok(svg.indexOf('fill') < 0 || svg.indexOf('d="') > 0, '带路径数据');
  ok(w.lnIcon('不存在的图标').indexOf('M5 5h14v14H5z') > 0, '找不到名字时退回方框，不报错');
} catch (e) { ok(false, 'SVG 生成报错：' + e.message); }

console.log('\n==== ' + pass + ' 通过 / ' + fail + ' 失败 ====');
if (errs.length) { console.log('页面报错：'); errs.slice(0, 5).forEach(e => console.log('  ' + e)); }
process.exit(fail ? 1 : 0);
