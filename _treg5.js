/* 回归：本轮 5 项修复
   ① Dock 拖动图标不再变透明（CSS：拖动时关掉 backdrop-filter + 不透明底色兜底）
   ② Dock 长按编辑 / 拖完之后，dock-hover 高亮框会被清掉，不再残留成「边框变色」
   ③ 好友圈标题绝对居中（DOM 里那段标题容器是 absolute 居中）
   ④ 好友圈作者头像同步联系人头像（circleAvatarHTML 走 wxAvaHTML，已设头像就出图）
   ⑤ 老存档里新增的「查手机」等接入项目会被 ensureApis 自动补进绑定列表 */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const html = fs.readFileSync('小手机.html', 'utf8');
const scripts = (fs.existsSync('app.js') && /app\.js/.test(html)) ? fs.readFileSync('app.js','utf8') : [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join("\n;\n");
const vc = new VirtualConsole(); vc.on('jsdomError', e => console.log('JSDOM_ERR', e.message));
const dom = new JSDOM(html, { url: 'http://localhost:8080/', virtualConsole: vc, runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window;
w.requestAnimationFrame = cb => setTimeout(() => cb(Date.now()), 0);
w.scrollTo = () => {};
w.AbortController = class { constructor(){ this.signal = {}; } abort(){} };

let pass = 0, fail = 0;
function ok(c, m){ if(c){ pass++; } else { fail++; console.log('  ✗ ' + m); } }

(async function(){
  try {
    w.eval(scripts);

    // ① CSS 兜底：拖动时 .ico 关掉 backdrop-filter + 不透明底色（在样式表里写了）
    const css = html;
    ok(/\.app\.dragging \.ico[^{]*\{[^}]*backdrop-filter:none/.test(css) ||
        /\.app\.dragging \.ico,\s*\.widget\.dragging \.ico\{/.test(css), '① 拖动时 .ico 关 backdrop-filter');
    ok(/background-color:rgba\(245,246,250,\.96\)/.test(css), '① 拖动时给不透明底色兜底');

    // ② homeDragCleanup 清掉 dock-hover
    const dk = w.document.getElementById('homeDock');
    dk.classList.add('dock-hover');
    // 制造一个最小 HD（el 随便给个存在元素）
    const el = w.document.querySelector('#homeDock .app') || w.document.createElement('div');
    w.HD = { el: el };
    w.homeDragCleanup();
    ok(!dk.classList.contains('dock-hover'), '② 拖完 dock-hover 高亮被清掉（不残留边框）');
    w.HD = null;

    // ③ 好友圈标题容器是绝对居中（topbar 里那段 inline style 含 position:absolute）
    ok(/position:absolute;left:0;right:0;top:0;bottom:0;display:flex;flex-direction:column;align-items:center/.test(html),
       '③ 微信顶栏标题改为 absolute 横向居中');
    ok(/#call \.topbar > \.tb-btn\{position:relative;z-index:2;/.test(html), '③ 左右按钮浮在标题之上');

    // ④ circleAvatarHTML：设了联系人头像就出 img，否则回退字母
    w.ensureWx(); w.ensurePersonas(); w.ensureIdentities();
    const pid = (w.state.personas[0] || {id:'p:test'}).id;
    // 没设头像 → 字母头像（含 avatar 类）
    let ah = w.circleAvatarHTML({pid:pid}, 32);
    ok(/class="avatar"/.test(ah), '④ 没设头像时回退默认字母头像');
    // 设了头像 → 出 img.ava-img
    w.state.wx.ava = w.state.wx.ava || {me:{}, him:{}};
    w.state.wx.ava.him = w.state.wx.ava.him || {};
    w.imgCache = w.imgCache || {};
    w.imgCache['img:x'] = 'data:image/png;base64,AAAA';
    w.state.wx.ava.him[pid] = 'img:x';
    ah = w.circleAvatarHTML({pid:pid}, 32);
    ok(/class="ava-img"/.test(ah), '④ 设了联系人头像后好友圈出同步头像图');
    // 自己的动态 → me 头像
    const mid = (w.curIdentity() || {id:'_'}).id || '_';
    w.state.wx.ava.me = w.state.wx.ava.me || {};
    w.state.wx.ava.me[mid] = 'img:x';
    ah = w.circleAvatarHTML({}, 32);
    ok(/class="ava-img"/.test(ah), '④ 自己的动态出「我」的同步头像');

    // ⑤ 老存档缺 checkphone → ensureApis 自动补上
    w.state.apis = {
      text:{ configs:[{id:'c1',name:'默认',url:'http://api',key:'k',compatible:'openai',models:[],model:'m',params:{},enabled:true,mode:'api'}],
             sel:'c1',
             bindings:[{key:'wechat',name:'微信聊天',on:true,configId:'c1'}] },
      image:{configs:[{id:'i1'}],sel:'i1',bindings:[{key:'wechatAuto',on:false,configId:'i1'}]},
      video:{configs:[{id:'v1'}],sel:'v1',bindings:[{key:'wechatStory',on:false,configId:'v1'}]},
      voice:{configs:[{id:'g1'}],sel:'g1',bindings:[{key:'wechatVoice',on:false,configId:'g1'}]}
    };
    w.state.api = w.state.apis.text.configs[0];
    w.ensureApis();
    const keys = w.state.apis.text.bindings.map(b => b.key);
    ok(keys.indexOf('checkphone') >= 0, '⑤ 老存档自动补上「查手机」绑定');
    ok(keys.indexOf('wechat') >= 0 && w.state.apis.text.bindings.length === w.TEXT_BINDINGS.length,
       '⑤ 补完后的绑定与权威清单一致（不丢旧项）');

  } catch(e){ console.log('EXCEPTION', e && e.stack || e); fail++; }
  console.log('\n通过 ' + pass + ' 条，失败 ' + fail + ' 条');
  process.exit(fail ? 1 : 0);
})();
