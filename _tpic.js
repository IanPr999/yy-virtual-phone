/* 回归：没接图片模型时，ta 发的虚拟图 = 一张「正在加载」的占位图，
   文字 / 语音气泡与图片分开；点一下图片才展开这张图的文字描述。
   接了图片模型 / 真图片则直接显示图，不出现描述气泡。 */
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
w.AbortController = class { constructor(){ this.signal = {}; } abort(){} };
w.eval(scripts);

let pass = 0, fail = 0;
function ok(c, m){ if(c){ pass++; } else { fail++; console.log('  ✗ ' + m); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async function(){
  try {
    w.go('call'); w.ensureWx(); w.ensurePersonas(); w.ensureApis();
    await sleep(20);
    const pid = w.state.curPersona || '_';

    // ---------- A：虚拟图（没接图片模型）——先是一张「正在加载」的图，描述默认收着 ----------
    w.imgCache = w.imgCache || {};
    const m1 = { id:'mp1', who:'him', pid:pid, type:'pic', text:'', cap:'给你看看',
                 desc:'夕阳下的海边，浪花轻轻拍岸', virtual:true, ts:Date.now() };
    w.state.messages = [m1];
    w.renderChat();
    let html1 = w.document.getElementById('chatList').innerHTML;
    ok(/class="pl-img"/.test(html1), 'A 虚拟图渲染成「正在加载」的占位块');
    ok(/Image loading/.test(html1), 'A 占位块上写着 Image loading…');
    ok(html1.indexOf('class="bubble pic-cap"') < 0, 'A 描述默认不显示（要点击才展开）');
    ok(html1.indexOf('夕阳下的海边') < 0, 'A 描述文字没混进图片 / 文字气泡里');

    // 点一下图片 → 展开描述，且落在独立的「图说」气泡里
    const pl = w.document.querySelector('[data-picopen="mp1"]');
    ok(!!pl, 'A 占位块可点击');
    if(pl){
      pl.dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
      await sleep(10);
      const msg = w.state.messages.filter(x => x.id === 'mp1')[0];
      ok(msg && msg.descOpen === true, 'A 点击后记下「已展开」');
      let html1b = w.document.getElementById('chatList').innerHTML;
      const iCap = html1b.indexOf('class="bubble pic-cap"');
      const iDesc = html1b.indexOf('夕阳下的海边');
      ok(iCap > 0, 'A 展开后出现独立的「图说」气泡');
      ok(iDesc > iCap, 'A 描述落在「图说」气泡里');
      // 图说气泡和图片气泡不是同一个
      ok(html1b.indexOf('class="bubble nobub"') < iCap, 'A 图片气泡与图说气泡是两个独立气泡');
    }

    // ---------- B：真图片（相册 / 设备）——直接出图，不出现描述气泡 ----------
    w.imgCache['__timg'] = 'data:image/png;base64,AAAA';
    const m2 = { id:'mp2', who:'him', pid:pid, type:'pic', text:'', cap:'随手拍的',
                 desc:'雪后的山顶，云海在脚下翻涌', img:'__timg', ts:Date.now() };
    w.state.messages = [m2];
    w.renderChat();
    let html2 = w.document.getElementById('chatList').innerHTML;
    ok(/<img class="cimg" src="data:image\/png;base64,AAAA"/.test(html2), 'B 真图片直接渲染成图');
    ok(/class="pl-img"/.test(html2) === false, 'B 真图片不显示「正在加载」占位块');
    ok(html2.indexOf('class="bubble pic-cap"') < 0, 'B 真图片不额外冒描述气泡');

    // ---------- C：文字气泡与图片气泡是两条独立消息（不混在同一个气泡） ----------
    const m3 = { id:'mt3', who:'him', pid:pid, type:'text', text:'你看这个景', ts:Date.now() };
    const m4 = { id:'mp4', who:'him', pid:pid, type:'pic', text:'', cap:'送你一张',
                 desc:'城市夜景，霓虹倒映在江面', virtual:true, descOpen:true, ts:Date.now() + 1 };
    w.state.messages = [m3, m4];
    w.renderChat();
    let html3 = w.document.getElementById('chatList').innerHTML;
    ok(/你看这个景/.test(html3) && /城市夜景/.test(html3), 'C 文字与图片描述都在');
    ok(html3.indexOf('你看这个景') < html3.indexOf('class="bubble pic-cap"'), 'C 文字气泡在图说气泡之前、二者分离');

    // ---------- D：用户自己发的虚拟图（＋ → 用文字描述一张图） ----------
    const mine = w.pushMessage('me', '', 'pic', { virtual:true, desc:'窗台的绿植，叶子被光照得透亮', cap:'一张图' });
    await sleep(5);
    w.renderChat();
    let html4 = w.document.getElementById('chatList').innerHTML;
    ok(/class="pl-img"/.test(html4), 'D 用户的虚拟图也显示成「正在加载」');
    const plMine = w.document.querySelector('[data-picopen="' + mine.id + '"]');
    ok(!!plMine, 'D 用户的虚拟图也能点开');
    if(plMine){
      plMine.dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
      await sleep(5);
      ok(w.document.getElementById('chatList').innerHTML.indexOf('窗台的绿植') > 0, 'D 点开后看到自己写的描述');
    }

    console.log('\n通过 ' + pass + ' 项' + (fail ? '，失败 ' + fail + ' 项' : ''));
  } catch(e){
    console.log('FATAL', e && e.stack || e);
    fail++;
  }
  process.exit(fail ? 1 : 0);
})();
