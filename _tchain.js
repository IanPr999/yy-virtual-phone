/* 回归：聊天设置 → 高级 → 思维链（默认 / 线下两套 + 多套勾选增删改）
   ① 出厂默认：def 含一份以 docx 模板为默认提示词的「默认思维链」
   ② 高级页渲染出 #chainListDef / #chainListOff 两个列表
   ③ 编辑 / 新增 / 读取 / 取消勾选 / 恢复默认 都生效，且未勾选的套不进入 activeChainText */
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
    w.go('call'); w.ensureWx(); w.ensurePersonas(); w.ensureApis();
    const pid = w.state.curPersona || '_';
    const c = w.chatCfg(pid);

    // ---------- ① 出厂默认 ----------
    const sets = w.chainSetsOf(c);
    ok(Array.isArray(sets.def) && sets.def.length >= 1, 'chainSetsOf：默认存在一套默认思维链');
    ok(Array.isArray(sets.off) && sets.off.length >= 1, 'chainSetsOf：默认存在一套线下思维链');
    ok((sets.def[0].text||'').includes('角色扮演思考链（CoT）标准模板'), '默认思维链默认提示词来自 docx 模板');

    // ---------- ② 高级页渲染 ----------
    w.openChatSetting('adv');
    await sleep(20);
    const defList = w.document.getElementById('chainListDef');
    const offList = w.document.getElementById('chainListOff');
    ok(!!defList && !!offList, '高级页渲染出默认/线下两套思维链列表');
    ok(defList.querySelectorAll('.chain-row').length >= 1, '默认思维链至少有一条');
    ok(offList.querySelectorAll('.chain-row').length >= 1, '线下思维链至少有一条');

    // ---------- ③ 编辑 + 新增 + 读取 ----------
    const firstDef = defList.querySelector('.chain-row');
    firstDef.querySelector('.chain-name').value = '我的测试链';
    firstDef.querySelector('.chain-text').value = '测试提示词内容一二三';
    w.chainAddRow('def');
    await sleep(5);
    const rowsAfter = defList.querySelectorAll('.chain-row');
    const newRow = rowsAfter[rowsAfter.length - 1];
    newRow.querySelector('.chain-name').value = '新增链';
    newRow.querySelector('.chain-text').value = '新增的提示词内容';
    ok(defList.querySelectorAll('.chain-row').length >= 2, '加一套后默认思维链变为两条');
    const read = w.chainReadInputs('def');
    ok(read.length >= 2, 'chainReadInputs 读回两条');
    ok(read.some(r => r.name === '我的测试链' && r.text === '测试提示词内容一二三'), '编辑过的内容被正确读回');
    ok(read.some(r => r.name === '新增链' && r.text === '新增的提示词内容'), '新增套内容被正确读回');

    // ---------- ④ 未勾选的套不进入 activeChainText ----------
    const rows = defList.querySelectorAll('.chain-row');
    const last = rows[rows.length - 1];
    last.querySelector('.chain-name').value = '临时链';
    last.querySelector('.chain-text').value = 'ZZZ_UNIQUE_MARKER_999';
    last.querySelector('.chain-on').checked = false;
    w.csCollect(c);
    const at = w.activeChainText(pid);
    ok(!at.includes('ZZZ_UNIQUE_MARKER_999'), '未勾选的套不进入 activeChainText');

    // ---------- ⑤ 恢复默认 ----------
    w.document.getElementById('chainResetDef').dispatchEvent(new w.Event('click'));
    await sleep(5);
    ok(defList.querySelectorAll('.chain-row').length === 1, '恢复默认后默认思维链回到一套');
    ok((defList.querySelector('.chain-text').value||'').includes('角色扮演思考链'), '恢复默认后重新载入 docx 默认提示词');

    w.closeSheet && w.closeSheet();
  } catch(e){ fail++; console.log('  ✗ 异常：' + (e && e.stack || e)); }

  console.log('\n思维链 UI 回归：' + pass + ' 通过，' + fail + ' 失败');
  process.exit(fail ? 1 : 0);
})();
