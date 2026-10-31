/* 回归测试：Dock 玻璃质感不能在 #homeDock 本体上带 backdrop-filter，
   否则 #homeDock 会成为 position:fixed 的包含块，从 Dock 拖出的图标会被定位到 Dock
   而非视口，飞出屏幕消失。修复方式：把 blur 放到 #homeDock::before 上。 */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const html = fs.readFileSync('小手机.html', 'utf8');
const vc = new VirtualConsole();
let fails = 0;
function ok(c, m){ if(!c){ fails++; console.log('  ✗ ' + m); } else { console.log('  ✓ ' + m); } }

const dom = new JSDOM(html, { url:'http://localhost:8080/', virtualConsole:vc, pretendToBeVisual:true });
const w = dom.window;

// 收集所有 <style> 里的规则
function findRule(sel){
  const out = [];
  for(const ss of w.document.styleSheets){
    let rules;
    try { rules = ss.cssRules; } catch(e){ continue; }
    if(!rules) continue;
    for(const r of rules){
      if(r.selectorText && r.selectorText.replace(/\s+/g,'') === sel.replace(/\s+/g,'')) out.push(r);
    }
  }
  return out;
}

const dockRules = findRule('#homeDock');
ok(dockRules.length >= 1, '找到 #homeDock 规则');
let dockHasBF = false;
dockRules.forEach(r => { if(/backdrop-filter/i.test(r.cssText)) dockHasBF = true; });
ok(!dockHasBF, '#homeDock 本体不带 backdrop-filter（否则拖出图标会消失）');

const beforeRules = findRule('#homeDock::before');
ok(beforeRules.length >= 1, '找到 #homeDock::before 规则');
let beforeHasBF = false;
beforeRules.forEach(r => { if(/backdrop-filter/i.test(r.cssText)) beforeHasBF = true; });
ok(beforeHasBF, '#homeDock::before 承载玻璃 blur');

console.log(fails ? ('\n失败 ' + fails + ' 条') : '\n通过 4 条，失败 0 条');
process.exit(fails ? 1 : 0);
