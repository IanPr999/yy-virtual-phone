/* 回归测试：操作提示框（toast）美化后的硬性要求
   1) 从屏幕顶端出现（#toast 用 top 而非 bottom）
   2) 无高光质感（.toast-item 不含 inset 高光、不含 backdrop-filter 磨砂）
   3) 横向尺寸统一（.toast-item 有固定 width，不随文字长短变化） */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const html = fs.readFileSync('小手机.html', 'utf8');
const vc = new VirtualConsole();
let fails = 0;
function ok(c, m){ if(!c){ fails++; console.log('  ✗ ' + m); } else { console.log('  ✓ ' + m); } }

const dom = new JSDOM(html, { url:'http://localhost:8080/', virtualConsole:vc, pretendToBeVisual:true });
const w = dom.window;

function findRule(sel){
  const out = [];
  for(const ss of w.document.styleSheets){
    let rules; try { rules = ss.cssRules; } catch(e){ continue; }
    if(!rules) continue;
    for(const r of rules){
      if(r.selectorText && r.selectorText.replace(/\s+/g,'') === sel.replace(/\s+/g,'')) out.push(r);
    }
  }
  return out;
}

const toastRules = findRule('#toast');
ok(toastRules.length >= 1, '找到 #toast 规则');
let usesTop = false;
toastRules.forEach(r => { if(/top\s*:/.test(r.cssText) && !/bottom\s*:/.test(r.cssText)) usesTop = true; });
ok(usesTop, '#toast 用 top 定位（从屏幕顶端出现，不用 bottom）');

const itemRules = findRule('.toast-item');
ok(itemRules.length >= 1, '找到 .toast-item 规则');
let hasWidth = false, noGloss = true, noBlur = true;
itemRules.forEach(r => {
  if(/width\s*:/.test(r.cssText)) hasWidth = true;
  if(/box-shadow[^;]*inset/.test(r.cssText)) noGloss = false; // inset 高光
  if(/backdrop-filter/.test(r.cssText)) noBlur = false;        // 磨砂玻璃
});
ok(hasWidth, '.toast-item 有固定 width（横向尺寸统一）');
ok(noGloss, '.toast-item 无 inset 高光质感');
ok(noBlur, '.toast-item 无 backdrop-filter 磨砂');

console.log(fails ? ('\n失败 ' + fails + ' 条') : '\n通过 5 条，失败 0 条');
process.exit(fails ? 1 : 0);
