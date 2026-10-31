/* 回归：底部 Dock 的「拖进 / 拖出 / 重排」逻辑
   主要验证：dock 数组增删、容量上限、以及 homeDragEnd 对 网格↔Dock 落点的判定。
   （jsdom 无布局，落点坐标用桩函数模拟；DOM 顺序由 renderers.home 重新渲染验证。） */
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

(async function(){
  try {
    w.go('home'); w.ensureLayout(); w.homeEdit = true; w.renderers.home();
    await sleep(20);

    // 1) 初始 Dock
    ok(JSON.stringify(w.state.layout.dock) === JSON.stringify(['call','api','world']), '初始 Dock = 微信/模型/世界书');

    // 2) 网格图标拖进 Dock（插到 index 1）
    w.pointerInDock = () => ({ idx: 1 });
    const beforeLen = w.state.layout.dock.length;
    const okAdd = w.addToDock('album', 1);
    ok(okAdd && w.state.layout.dock[1] === 'album', 'addToDock 把 album 插到 Dock 第 1 位');
    ok(w.state.layout.dock.length === beforeLen + 1, 'Dock 长度 +1');

    // 3) Dock 容量上限 4（已满后再加应失败）
    const okFull = w.addToDock('beauty', 0);
    ok(okFull === false && w.state.layout.dock.indexOf('beauty') < 0, 'Dock 满 4 个后拒绝再放入（上限保护）');

    // 4) 重排 Dock
    w.reorderDock('call', 2);
    ok(w.state.layout.dock[2] === 'call', 'reorderDock 把 call 移到第 2 位');
    ok(w.isDockApp('call') && w.isDockApp('album'), 'isDockApp 正确反映 Dock 成员');

    // 5) 移除 Dock
    w.removeFromDock('api');
    ok(w.state.layout.dock.indexOf('api') < 0, 'removeFromDock 移除了 api');

    // 6) 模拟「网格图标拖到 Dock」的落点判定（homeDragEnd）
    w.state.layout.dock = ['call','world'];          // 重置成未满
    ok(w.appEntry('album'), 'appEntry 能取到网格图标 album 的数据（不会被漏删）');
    w.HD = { el: w.document.createElement('div'), id: 'album', isWidget: false, fromDock: false, lastX: 0, lastY: 0 };
    w.pointerInDock = () => ({ idx: 1 });
    w.homeDragEnd();
    await sleep(20);
    ok(w.state.layout.dock.indexOf('album') >= 0, 'homeDragEnd：网格图标被收进 Dock');
    ok(!!w.document.querySelector('#homeDock [data-app="album"]'), '重渲染后 Dock DOM 含 album');
    ok(!w.document.querySelector('#homeGrid [data-app="album"]'), '重渲染后网格 DOM 不再含 album');
    ok(!!w.appEntry('album'), 'saveDragOrder 后仍保留 album 的 app 数据（Dock 图标不丢数据）');

    // 7) 模拟「Dock 图标拖出到网格」的落点判定
    w.HD = { el: w.document.createElement('div'), id: 'call', isWidget: false, fromDock: true, lastX: 0, lastY: 0 };
    w.pointerInDock = () => null;                    // 松手在 Dock 外（网格上）
    const callPage = w.homePage;
    w.homeDragEnd();
    await sleep(20);
    ok(w.state.layout.dock.indexOf('call') < 0, 'homeDragEnd：Dock 图标被拖出（离开 Dock 数组）');
    ok(!w.isDockApp('call'), 'isDockApp(call) 变为 false（已不在 Dock）');
    ok(w.appEntry('call').page === callPage, '拖出后图标落在当前页网格');
    ok(!!w.document.querySelector('#homeGrid [data-app="call"]'), '重渲染后网格 DOM 含 call');

    // 8) 模拟「Dock 内重排」：拖到 Dock 内某位置
    w.state.layout.dock = ['call','api','world'];
    w.HD = { el: w.document.createElement('div'), id: 'call', isWidget: false, fromDock: true, lastX: 0, lastY: 0 };
    w.pointerInDock = () => ({ idx: 2 });           // 拖到末尾
    w.homeDragEnd();
    await sleep(20);
    ok(w.state.layout.dock[2] === 'call', 'homeDragEnd：Dock 内重排把 call 移到末尾');

    // 9) 组件不能进 Dock：拖组件到 Dock 上方应保持原位、且不在 Dock
    w.state.layout.dock = ['call','api','world'];
    const wEl = w.document.querySelector('#homeGrid > .widget');
    ok(!!wEl, '存在可拖的组件');
    if(wEl){
      w.HD = { el: wEl, id: wEl.getAttribute('data-widget'), isWidget: true, fromDock: false, lastX: 0, lastY: 0 };
      w.pointerInDock = () => ({ idx: 0 });
      const wid = wEl.getAttribute('data-widget');
      w.homeDragEnd();
      await sleep(20);
      ok(w.state.layout.dock.indexOf(wid) < 0, '组件拖到 Dock 上方不会被收进 Dock');
    }
  } catch(e){ fail++; console.log('  ✗ 抛异常：', e && e.message); }

  console.log('\n==== ' + pass + ' 通过 / ' + fail + ' 失败 ====');
  process.exit(fail ? 1 : 0);
})();
