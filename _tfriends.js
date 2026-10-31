/* 回归：人设卡「TA 的好友列表」
   ① parseSocial 识别更准（关系：名字 / 名字（关系）/ 同事 小王、小李；整段是关系类别时不乱造人名）
   ② autoGenFriends 按关系网生成 3-5 个好友，字段齐全
   ③ personaFriends：有列表用列表，没列表退回关系网
   ④ 好友会同步进联系人（wxNet），并出现在查手机的会话里
   ⑤ 人设卡里有好友列表这一块 UI（可加 / 可改 / 可删）
   ⑥ 好友圈：虚拟图显示成「正在加载」，点开才看到描述 */
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

let pass = 0, fail = 0;
function ok(c, m){ if(c){ pass++; } else { fail++; console.log('  ✗ ' + m); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async function(){
  try {
    w.eval(scripts);

    // ---------- ① 关系网识别 ----------
    let r = w.parseSocial('妈妈：李慧');
    ok(r.length === 1 && r[0].name === '李慧' && r[0].rel === '妈妈', '①「妈妈：李慧」→ 李慧 / 妈妈');

    r = w.parseSocial('李慧（妈妈）');
    ok(r.length === 1 && r[0].name === '李慧' && r[0].rel === '妈妈', '①「李慧（妈妈）」→ 李慧 / 妈妈');

    r = w.parseSocial('同事：小王、小李');
    ok(r.length === 2 && r[0].rel === '同事' && r[1].rel === '同事', '①「同事：小王、小李」→ 两个同事');

    r = w.parseSocial('家人：父母、妹妹');
    ok(r.length === 0, '① 只写了关系类别（父母 / 妹妹）时，不乱造人名');

    r = w.parseSocial('他从小一起长大的好朋友 张伟，现在在外地工作');
    ok(r.length === 1 && r[0].name === '张伟', '① 半句话里的真名能被挑出来，整句不会被当人名');
    ok(r[0].rel === '好友' || r[0].rel === '朋友', '① 顺带认出关系');

    r = w.parseSocial('同事小陈');
    ok(r.length === 1 && r[0].name === '陈' || (r[0] && r[0].rel === '同事'), '①「同事小陈」→ 关系 + 名字拆开');

    // ---------- ② 自动生成 ----------
    const fakeP = { id:'p:test', name:'测试', social:'妈妈：李慧\n同事：小王、小李\n闺蜜：周岚\n养了一只猫', friends:[] };
    const gen = w.autoGenFriends(fakeP);
    ok(gen.length >= 3 && gen.length <= 5, '② 生成 3-5 个好友（实际 ' + gen.length + '）');
    ok(gen.every(f => f.name && f.rel && f.gender && f.age && f.note), '② 每个好友都有 姓名/关系/性别/年龄/介绍');
    ok(gen.some(f => f.name === '李慧'), '② 关系网里有真名的直接用真名');
    ok(new Set(gen.map(f => f.name)).size === gen.length, '② 生成的名字不重复');

    // 关系网空着也要能给够 3 个
    const gen2 = w.autoGenFriends({ id:'p:empty', social:'', friends:[] });
    ok(gen2.length === 3 && gen2.every(f => f.name && f.rel), '② 关系网空着也生成 3 个兜底好友');

    // ---------- ③ personaFriends ----------
    const p3 = { id:'p:3', social:'妈妈：李慧', friends:[{id:'f1', name:'自定义', rel:'朋友', gender:'女', age:'30', note:'说明'}] };
    ok(w.personaFriends(p3)[0].name === '自定义', '③ 有好友列表时优先用列表');
    const p4 = { id:'p:4', social:'妈妈：李慧', friends:[] };
    ok(w.personaFriends(p4)[0].name === '李慧', '③ 没有列表时退回关系网识别');

    // ---------- ④ 同步进联系人 / 查手机 ----------
    w.go('call'); w.ensureWx(); w.ensurePersonas(); w.ensureIdentities();
    const cur = w.state.persona;
    cur.friends = [
      {id:'fa', name:'林知夏', rel:'同事', gender:'女', age:'28', note:'同组，午饭常一起吃'},
      {id:'fb', name:'顾行',   rel:'哥哥', gender:'男', age:'33', note:'从小罩着他'},
      {id:'fc', name:'周砚',   rel:'好友', gender:'男', age:'30', note:'认识很多年'}
    ];
    w.save('personas');
    w.syncNet();
    const net = w.wxNet();
    ok(net.some(n => n.name === '林知夏') && net.some(n => n.name === '顾行'), '④ 好友同步进「来自关系网」的联系人');
    ok(net.filter(n => n.name === '林知夏')[0].gender === '女', '④ 同步时带上性别等资料');

    const d = w.buildCheckData(cur.name || '他', 'p:' + cur.id);
    const chatNames = d.chats.map(c => c.n).join('|');
    ok(/林知夏|顾行|周砚/.test(chatNames), '④ 查手机的会话里出现好友列表里的人');

    // ---------- ⑤ 人设卡 UI ----------
    w.go('persona'); await sleep(20);
    const body = w.document.getElementById('personaBody').innerHTML;
    ok(/TA 的好友列表/.test(body), '⑤ 人设卡里有「TA 的好友列表」这一块');
    ok(/data-pfedit=/.test(body) && /data-pfdel=/.test(body), '⑤ 每位好友都能单独改 / 删');
    ok(/id="pfAdd"/.test(body) && /id="pfAuto"/.test(body), '⑤ 有「手动加一个」和「按关系网自动生成」');

    // ---------- ⑥ 好友圈虚拟图 ----------
    w.state.wx.posts = [{
      id:'post1', identityId:(w.curIdentity() || {}).id || '_', pid:cur.id, nid:'',
      text:'下班路上拐去买了个冰淇淋，天气刚好。', virtual:true, vdesc:'路边的树影，夕阳把地面照成蜜色',
      likes:0, comments:[], ts:Date.now()
    }];
    w.renderWxCircle();
    const cir = w.document.getElementById('wxCircleBody').innerHTML;
    ok(/class="pl-img wide"/.test(cir) && /Image loading/.test(cir), '⑥ 好友圈虚拟图显示成「正在加载」');
    ok(cir.indexOf('路边的树影') < 0, '⑥ 好友圈的图描述默认收着');
    const cp = w.document.querySelector('[data-cpost="post1"]');
    ok(!!cp, '⑥ 好友圈的图可以点');
    if(cp){
      cp.dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
      await sleep(10);
      const cir2 = w.document.getElementById('wxCircleBody').innerHTML;
      ok(cir2.indexOf('路边的树影') > 0, '⑥ 点开后看到这张图的描述');
    }

    console.log('\n通过 ' + pass + ' 项' + (fail ? '，失败 ' + fail + ' 项' : ''));
  } catch(e){
    console.log('FATAL', e && e.stack || e);
    fail++;
  }
  process.exit(fail ? 1 : 0);
})();
