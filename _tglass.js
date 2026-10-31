/* 回归：美化里的「玻璃透明度」滑条
   —— 之前两个毛病：
      ① 数字乱跳：rgba(255,255,255,0.23) 被整串抠数字，算成 255255255023；
      ② 拖了没反应：卡片/顶栏/按钮/输入框/图标底板/气泡里一堆硬编码的 rgba(.42/.72/.66)，
         液态玻璃和夜色预设还直接用写死的渐变盖掉了 --c-glass。
   现在统一成一个数 --glass-alpha，所有玻璃件都从它派生。 */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const html = fs.readFileSync('小手机.html', 'utf8');
const scripts = (fs.existsSync('app.js') && /app\.js/.test(html)) ? fs.readFileSync('app.js','utf8') : [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join("\n;\n");
const vc = new VirtualConsole(); vc.on('jsdomError', e => console.log('JSDOM_ERR', e.message));
const dom = new JSDOM(html, { url: 'http://localhost:8080/', virtualConsole: vc, runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window;
w.requestAnimationFrame = cb => setTimeout(() => cb(Date.now()), 0);
w.scrollTo = () => {};
w.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){} });
w.indexedDB = { open(){ const r = { onsuccess: null }; setTimeout(() => r.onsuccess && r.onsuccess({ target: { result: { objectStore(){ return { createIndex(){} }; } } } }), 0); return r; } };
w.URL.createObjectURL = () => 'blob:x';
w.eval(scripts);

let pass = 0, fail = 0;
function ok(c, m){ if(c){ pass++; } else { fail++; console.log('  ✗ ' + m); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rootVar = n => w.document.documentElement.style.getPropertyValue(n).trim();

(async function(){
  try {
    await sleep(20);

    /* ---------- ① 浓度解析：只认 alpha，不再把 255 也算进去 ---------- */
    const A = w.alphaOf;
    ok(typeof A === 'function', '有 alphaOf 统一解析浓度');
    ok(Math.abs(A('rgba(255,255,255,0.23)', 58) - 0.23) < 1e-6, 'rgba(255,255,255,0.23) → 0.23');
    ok(Math.abs(A('rgba(255,255,255,.4)', 58) - 0.4) < 1e-6,     'rgba(255,255,255,.4) → 0.4');
    ok(Math.abs(A('rgba(255,255,255,0.58)', 58) - 0.58) < 1e-6,  'rgba(...0.58) → 0.58');
    ok(Math.abs(A('58', 58) - 0.58) < 1e-6,   '纯数字 58 → 0.58');
    ok(Math.abs(A('58%', 58) - 0.58) < 1e-6,  '百分数 58% → 0.58');
    ok(Math.abs(A('0.58', 58) - 0.58) < 1e-6, '小数 0.58 原样');
    ok(Math.abs(A('', 58) - 0.58) < 1e-6,     '空值走默认 0.58');
    ok(Math.abs(A('rgba(255,255,255,calc(0.58 * 1))', 58) - 0.58) < 1e-6, '拿到的 calc() 写法也兜得住');
    ok(A('rgba(255,255,255,3)', 58) === 1,    '超过 1 的夹回 1');
    ok(A('rgba(255,255,255,-1)', 58) === 0,   '负数夹回 0');
    ok(A(undefined, 58) === 0.58,             'undefined 不炸');
    ok(String(Math.round(A('rgba(255,255,255,0.23)', 58) * 100)) === '23', '不会再冒出 255255255023 这种数');

    /* ---------- ② 老皮肤（存的是 rgba）也能正确读出来 ---------- */
    w.state.beauty['--c-glass'] = 'rgba(255,255,255,0.37)';
    w.applyBeauty();
    ok(Math.abs(parseFloat(rootVar('--glass-alpha')) - 0.37) < 1e-6, '老皮肤的 rgba 被换算成 --glass-alpha');
    ok(!rootVar('--c-glass'), '不再把整串 rgba 直接写到 --c-glass 上');

    /* ---------- ③ 美化页：滑条显示的是百分数，且在 15~90 之间 ---------- */
    w.state.beauty['--c-glass'] = 'rgba(255,255,255,0.23)';
    w.go('beauty');
    await sleep(10);
    const body = w.document.getElementById('beautyBody');
    const inp = body.querySelector('[data-bv="--c-glass"]');
    ok(!!inp, '美化页里有玻璃透明度滑条');
    const shown = body.querySelector('[data-bt="--c-glass"]').textContent.trim();
    ok(shown === '23', '滑条右边显示 23（实际 ' + shown + '）');
    ok(inp.value === '23', '滑条本身的 value 也是 23（实际 ' + inp.value + '）');
    ok(inp.getAttribute('min') === '0' && inp.getAttribute('max') === '100',
       '滑条范围是 0%~100%（实际 ' + inp.getAttribute('min') + '~' + inp.getAttribute('max') + '）');
    ok(Number(inp.value) >= 0 && Number(inp.value) <= 100, '滑条值落在 min~max 里');

    // 脏数据也别显示超范围
    w.state.beauty['--c-glass'] = 'rgba(255,255,255,4)';
    w.go('beauty'); await sleep(5);
    const shown2 = w.document.querySelector('[data-bt="--c-glass"]').textContent.trim();
    ok(Number(shown2) === 100, '超过上限时显示夹到 100（实际 ' + shown2 + '）');
    w.state.beauty['--c-glass'] = 'rgba(255,255,255,0.02)';
    w.go('beauty'); await sleep(5);
    const shown3 = w.document.querySelector('[data-bt="--c-glass"]').textContent.trim();
    ok(Number(shown3) === 2, '低浓度如实显示 2（不再被夹到 15）');
    // 0% 是合法值：不能因为 0 是 falsy 就被兜回 58%
    ok(Math.abs(A('rgba(255,255,255,0)', 58) - 0) < 1e-9, 'rgba(...,0) → 0，不会被当成空值');
    w.state.beauty['--c-glass'] = 'rgba(255,255,255,0)';
    w.applyBeauty();
    w.go('beauty'); await sleep(5);
    const shown4 = w.document.querySelector('[data-bt="--c-glass"]').textContent.trim();
    ok(Number(shown4) === 0, '0% 如实显示 0（实际 ' + shown4 + '）');
    ok(Math.abs(parseFloat(rootVar('--glass-alpha'))) === 0, '0% 时 --glass-alpha 真的是 0');

    /* ---------- ④ 拖滑条：写的是 --glass-alpha，全部玻璃件都跟着变 ---------- */
    w.state.beauty['--c-glass'] = 'rgba(255,255,255,0.58)';
    w.go('beauty'); await sleep(5);
    const s = w.document.querySelector('[data-bv="--c-glass"]');
    s.value = '30';
    s.dispatchEvent(new w.Event('input'));
    ok(Math.abs(parseFloat(rootVar('--glass-alpha')) - 0.30) < 1e-6, '拖到 30 → --glass-alpha:0.3');
    ok(!rootVar('--c-glass'), '没有再把 rgba 写到 --c-glass 上（那会把派生关系打断）');
    ok(/rgba\(255,255,255,0?\.3\)/.test(w.state.beauty['--c-glass']), 'state 里存成 rgba，导出的皮肤还是老写法');
    ok(w.document.querySelector('[data-bt="--c-glass"]').textContent.trim() === '30', '读数实时跟着变');

    // 拖到两端：0% 和 100% 都要真的写进去（0 不能跳回 58）
    s.value = '0'; s.dispatchEvent(new w.Event('input'));
    ok(rootVar('--glass-alpha') === '0', '拖到 0% → --glass-alpha:0（不会跳回 .58）');
    ok(/rgba\(255,255,255,0\)/.test(w.state.beauty['--c-glass']), '0% 存成 rgba(...,0)');
    s.value = '100'; s.dispatchEvent(new w.Event('input'));
    ok(Math.abs(parseFloat(rootVar('--glass-alpha')) - 1) < 1e-9, '拖到 100% → --glass-alpha:1');
    ok(w.document.querySelector('[data-bt="--c-glass"]').textContent.trim() === '100', '100% 读数正确');

    /* ---------- ⑤ 样式层：所有玻璃件都从同一个数派生 ---------- */
    const css = html;
    ok(/--glass-alpha:\s*\.58/.test(css),                       '出厂值 --glass-alpha:.58');
    ok(/--c-glass:rgba\(var\(--glass-rgb\),var\(--g\)\)/.test(css.replace(/\s+/g, '')), '--c-glass 由 --g 派生');
    ok(/--c-glass-s:rgba\(var\(--glass-rgb\),/.test(css),       '幽灵按钮 / 顶栏按钮用 --c-glass-s');
    ok(/--c-glass-in:rgba/.test(css),                           '输入框用 --c-glass-in');
    ok(/--ico-fill:rgba\(var\(--glass-rgb\),/.test(css),        '图标底板 --ico-fill 由 --g 派生');
    ok(/--bub-a:calc/.test(css),                                '气泡有 --bub-a');
    ok(/--glass-rgb:\s*255,255,255/.test(css),                  '玻璃体色默认是白');
    ok(/--glass-rgb:\s*52,72,94/.test(css),                     '夜色的玻璃体色换成深色，拉满时字才看得清');
    ok(/--g-solid:/.test(css) && /--gmp:/.test(css),            '有「实心化」变量：拉满时薄底板也推成实心');
    ok(/--gm:calc\(var\(--glass-alpha\) \/ \.58\)/.test(css.replace(/\s+/g, ' ')), '磨砂强度倍率 --gm 由浓度派生');
    ok(/blur\(calc\((var\(--glass-blur\)|\d+px) \* var\(--gm\)\)\)/.test(css), '模糊半径跟着浓度走（0% 时完全没有磨砂）');
    ok(/saturate\(calc\(100% \+/.test(css),                     '饱和度也跟着浓度走');
    ok(/color-mix\(in srgb, var\(--c-bubble-him\)/.test(css),   '他的气泡按 --bub-a 调透明');
    ok(/color-mix\(in srgb, var\(--c-bubble-me\)/.test(css),    '我的气泡按 --bub-a 调透明');

    // 三处「拖了没反应」的硬骨头：不能再写死
    const bodyCss = css.slice(css.indexOf('.btn.ghost'), css.indexOf('.btn.ghost') + 300);
    ok(!/rgba\(255,255,255,\.42\)/.test(bodyCss), '幽灵按钮不再写死 rgba(...,.42)');
    const inputCss = css.slice(css.indexOf('input[type=text],input[type=number]'), css.indexOf('input[type=text],input[type=number]') + 500);
    ok(!/rgba\(255,255,255,\.72\)/.test(inputCss), '输入框不再写死 rgba(...,.72)');
    ok(/var\(--c-glass-in\)/.test(inputCss),       '输入框用派生色');

    // 液态 / 夜色：改成乘系数，而不是直接盖掉 --c-glass
    const liquid = css.slice(css.indexOf('body.ui-liquid{'), css.indexOf('body.ui-liquid{') + 400);
    ok(/--glass-mul:\.78/.test(liquid),      '液态玻璃用 --glass-mul 调浓度');
    ok(!/--c-glass:rgba/.test(liquid),        '液态玻璃不再直接覆盖 --c-glass');
    ok(/body\.ui-liquid \.glass[\s\S]{0,600}calc\(var\(--g\)/.test(css), '液态玻璃的渐变层也按 --g 走');
    const dark = css.slice(css.indexOf('body.ui-liquid.ui-liquid-dark{'), css.indexOf('body.ui-liquid.ui-liquid-dark{') + 500);
    ok(/--glass-mul:\.24/.test(dark), '夜色版用 --glass-mul 压暗');
    ok(!/--c-glass:rgba/.test(dark),  '夜色版不再直接覆盖 --c-glass');

    /* ---------- ⑥ 恢复默认：连 --glass-alpha 一起清掉 ---------- */
    w.state.beauty['--c-glass'] = 'rgba(255,255,255,0.4)';
    w.applyBeauty();
    w.go('beauty'); await sleep(5);
    w.document.getElementById('bReset').click();
    await sleep(5);
    ok(!rootVar('--glass-alpha'), '恢复默认后 --glass-alpha 被清掉');
    ok(!w.state.beauty['--c-glass'], 'state 里也清空了');

    /* ---------- ⑦ 风格切换不影响用户调好的浓度 ---------- */
    w.state.settings.uiStyle = 'liquid'; w.applyUiStyle(); w.applyBeauty();
    ok(/ui-liquid/.test(w.document.body.className), '切到液态玻璃');
    w.state.beauty['--c-glass'] = 'rgba(255,255,255,0.44)'; w.applyBeauty();
    ok(Math.abs(parseFloat(rootVar('--glass-alpha')) - 0.44) < 1e-6, '液态玻璃下用户设的浓度照旧生效');
    w.state.settings.uiStyle = 'frost'; w.applyUiStyle();

    await sleep(10);
  } catch (e) {
    fail++; console.log('  ✗ 异常: ' + (e && e.stack || e));
  }
  console.log('\n玻璃透明度：' + pass + ' 通过，' + fail + ' 失败');
  process.exit(fail ? 1 : 0);
})();
