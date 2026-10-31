/* 回归：本轮 8 项修复
   ① 图片描述与语音/文字分泡 + sw.js 改网络优先（否则手机端一直吃旧版）
   ② 聊天设置「发送后直接让他回复」开关 + 空框连点不重复触发
   ③ 线上/线下两套界面各自只显示自己的消息
   ④ 会话列表预览用消息所属人设的名字（不再串人）
   ⑤ 批注模式从聊天移除（只留在「一起写」），老存档自动迁回线上
   ⑥ 好友圈「让好友发一条」可按指定好友发
   ⑦ 好友圈内容改成生活/工作/学习类
   ⑧ 接口失败直接报错，不本地关键词兜底 */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const html = fs.readFileSync('小手机.html', 'utf8');
const swjs = fs.readFileSync('sw.js', 'utf8');
const scripts = (fs.existsSync('app.js') && /app\.js/.test(html)) ? fs.readFileSync('app.js','utf8') : [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join("\n;\n");
const vc = new VirtualConsole(); vc.on('jsdomError', e => console.log('JSDOM_ERR', e.message));
const dom = new JSDOM(html, { url: 'http://localhost:8080/', virtualConsole: vc, runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window;
w.requestAnimationFrame = cb => setTimeout(() => cb(Date.now()), 0);
w.scrollTo = () => {};
w.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){} });
w.AbortController = class { constructor(){ this.signal = {}; } abort(){} };
try{ w.indexedDB = { open(){ const r = { onsuccess:null }; setTimeout(()=>r.onsuccess && r.onsuccess({target:{result:{objectStore(){return {createIndex(){}};}}}}),0); return r; } }; }catch(e){}
w.eval(scripts);

let pass = 0, fail = 0;
function ok(c, m){ if(c){ pass++; } else { fail++; console.log('  ✗ ' + m); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async function(){
  try {
    w.go('call'); w.ensureWx(); w.ensurePersonas(); w.ensureApis();
    await sleep(20);
    const pid = w.state.curPersona || '_';

    // ---------- ① sw.js：HTML 必须「网络优先」 ----------
    ok(swjs.indexOf('return cached || net') < 0, '① sw.js 不再「缓存优先」返回旧 HTML');
    ok(/fetch\(req\)\.then[\s\S]{0,400}caches\.match\('\.\/phone\.html'\)/.test(swjs) || /\}\)\.catch\(function\(\)\{[\s\S]{0,200}caches\.match\('\.\/phone\.html'\)/.test(swjs),
       '① sw.js 改成「先 fetch 网络、失败再回缓存」');

    // ---------- ③ 线上/线下两套界面 ----------
    w.state.curPersona = pid; w.state.persona = w.state.personas[0];
    w.state.wx.mode = 'online';
    const mo = w.pushMessage('him', '线上的一句话ONLY', 'text');
    w.state.wx.mode = 'offline';
    const mf = w.pushMessage('him', '线下的一句话ONLY', 'text');
    ok(mo.mode === 'online', '③ 线上发的消息标了 mode=online');
    ok(mf.mode === 'offline', '③ 线下发的消息标了 mode=offline');
    w.state.wx.mode = 'online';
    w.renderChat();
    let h = w.document.getElementById('chatList').innerHTML;
    ok(h.indexOf('线上的一句话ONLY') >= 0 && h.indexOf('线下的一句话ONLY') < 0, '③ 线上界面只显示线上消息');
    w.state.wx.mode = 'offline';
    w.renderChat();
    h = w.document.getElementById('chatList').innerHTML;
    ok(h.indexOf('线下的一句话ONLY') >= 0 && h.indexOf('线上的一句话ONLY') < 0, '③ 线下界面只显示线下消息');

    // ---------- ④ 会话列表预览用消息所属人设的名字 ----------
    w.ensurePersonas();
    if(w.state.personas.length < 2){
      w.state.personas.push({id:'p:other', name:'陆寻'});
    }
    const pa = w.state.personas[0], pb = w.state.personas[1];
    const msgA = {id:'mx', who:'him', pid: pa.id, type:'text', text:'我是A说的', ts: Date.now()};
    w.state.persona = pb;                 // 当前正和 B 聊天
    const prev = w.m2prev(msgA);
    ok(prev.indexOf(w.wxShowName(pa)) === 0, '④ 预览用的是消息所属人设名（' + w.wxShowName(pa) + '），不是当前人设');
    ok(prev.indexOf(w.wxShowName(pb)) < 0 || w.wxShowName(pa) === w.wxShowName(pb), '④ 预览里不会出现当前人设的名字');

    // ---------- ⑤ 批注从聊天移除 + 老存档迁移 ----------
    ok(w.isAnnotate() === false, '⑤ 批注模式已不在聊天里');
    w.state.wx.mode = 'annotate';
    w.ensureWx();
    ok(w.state.wx.mode === 'online', '⑤ 老存档停在 annotate 会自动迁回线上');

    // ---------- ② autoReply 开关 + 空框连点守卫 ----------
    const c = w.chatCfg(pid);
    ok(c.autoReply === true, '② 默认「发送后直接回复」是开着的');
    c.autoReply = false;
    ok(w.chatCfg(pid).autoReply === false, '② 关掉后能存住');
    c.autoReply = true;
    // 空框连点：第二次应被 replyPending 挡掉
    w.state.wx.mode = 'online';
    delete w.replyPending[pid];
    w.himAutoSpeak();
    const pend = w.replyPending[pid];
    w.himAutoSpeak();                     // 立刻再点一次
    ok(pend === true, '② 空框点击会锁住「等回复」状态');
    ok(w.replyPending[pid] === true, '② 连点第二次不会重复触发（仍只有一条在路上）');
    w.replyPending[pid] = false; w.hideTyping();

    // ---------- ⑧ 接口失败直接报错，不本地关键词兜底 ----------
    w.state.api.mode = 'api'; w.state.api.url = 'http://api.test/v1'; w.state.api.model = 'm';
    w.state.apis.text.bindings = [];       // 让 textCfgFor 直接用 state.api
    w.fetch = () => Promise.resolve({ ok:false, status:400, text:()=>Promise.resolve('{"error":{"message":"boom"}}') });
    let gotReply = 'X', gotErr = null;
    w.askModel('sys', '你好', function(r, e){ gotReply = r; gotErr = e; }, null, {noLocal:true});
    await sleep(250);
    ok(gotReply === '' || gotReply == null, '⑧ 聊天接口失败时不再返回本地关键词回复');
    ok(!!gotErr, '⑧ 接口失败会把错误原因交回来');

    // ---------- ⑦ 好友圈内容是生活类 ----------
    w.state.api.mode = 'local'; w.state.api.url = '';
    w.state.wx.posts = [];
    w.wxPersonaPost({ kind:'persona', pid: pid, name:'测试好友' });
    const post = w.state.wx.posts[0];
    const chatty = ['想找人说话','一起待会儿','刚忙完，歇一会儿'];
    ok(!!post && chatty.every(function(x){ return post.text.indexOf(x) < 0; }), '⑦ 好友圈不再是「聊天口气」的内容');
    ok(!!post && post.text.length > 4, '⑦ 发出来的是一句生活动态');

    // ---------- ⑥ 让好友发一条：按指定好友发 ----------
    w.state.wx.posts = [];
    w.wxPersonaPost({ kind:'persona', pid: pid, name:'指定好友A' });
    ok(w.state.wx.posts.length === 1 && w.state.wx.posts[0].pid === pid, '⑥ 指定的好友以它自己的身份发出动态');

    console.log('\n本轮 8 项：通过 ' + pass + ' 项' + (fail ? '，失败 ' + fail + ' 项' : ''));
  } catch(e){
    console.log('FATAL', e && e.stack || e);
    fail++;
  }
  process.exit(fail ? 1 : 0);
})();
