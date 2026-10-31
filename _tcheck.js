/* 回归：查手机接入模型（项目⑥）
   ① TEXT_BINDINGS 里要有「查手机」一项
   ② applyCheckGen 能把模型给的内容合并进本地数据（只换文字，保留时间/价格/未读等结构）
   ③ 没接模型时 checkData 不报错、不尝试打接口，本地数据照常生成
   ④ 接了模型时 checkData 会异步用模型内容覆盖、成功后写回缓存 */
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
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async function(){
  try {
    w.eval(scripts);

    // ①
    ok(w.TEXT_BINDINGS.some(b => b.key === 'checkphone'), '① 绑定列表里有「查手机」');

    // ② applyCheckGen：造一份本地数据，再用模型输出来覆盖
    const d = w.buildCheckData('阿强', 'p:abc');
    const gen = {
      photos:['窗边的猫','雨后的街','深夜加班','周末爬山','一顿火锅','路边的花','旧书店','海边的风','电梯自拍'],
      chats:[{n:'同事小李',last:'文件发你了'},{n:'房东',last:'房租晚两天'},{n:'表姐',last:'周末来吃饭'},{n:'教练',last:'明天照常练'},{n:'快递',last:'放门口了'}],
      calls:[{n:'妈妈'},{n:'大学室友'},{n:'客户'},{n:'物业'}],
      buys:[{n:'机械键盘'},{n:'咖啡豆'},{n:'充电宝'},{n:'书'}],
      takes:[{n:'黄焖鸡米饭'},{n:'麻辣烫'},{n:'寿司'},{n:'奶茶'}],
      plans:[{n:''},{ti:'部门周会'},{ti:'体检'},{ti:'剪头发'},{ti:'看展'},{ti:'回老家'}]
    };
    const beforeLast = d.chats[0].last;
    const okMerge = w.applyCheckGen(d, gen);
    ok(okMerge === true, '② applyCheckGen 返回 true');
    ok(d.photos[0].d === '窗边的猫', '② 照片说明被模型内容覆盖');
    ok(d.chats[0].n === '同事小李' && d.chats[0].last === '文件发你了', '② 聊天的「对方/末句」被覆盖');
    ok(d.buys[0].n === '机械键盘', '② 购物项被覆盖');
    ok(d.plans[1].ti === '部门周会', '② 日程标题被覆盖');
    ok(d.calls[0].type && d.chats[0].t, '② 时间/类型等结构字段保留');
    ok(d.modelGen === true, '② 标记 modelGen=true（不再重复生成）');

    // ③ 没接模型：checkData 不报错、modelTried 不应被置为 true（不会去打接口）
    w.state.check = {}; w.state.api.mode = 'local';
    const cd = w.checkData('p:xyz', '测试人');
    ok(cd && cd.photos && cd.photos.length === 9, '③ 离线时本地数据照常生成');
    ok(!cd.modelTried, '③ 离线时不标记 modelTried（不发起模型请求）');

    // ④ 接了模型（在「勾选接入项目」里打开「查手机」）：给个会成功的 fetch，确认 checkData 异步覆盖并写回
    w.state.check = {};
    w.state.api.mode = 'api'; w.state.api.url = 'http://api.test/v1';
    // 走真实结构：找到 checkphone 绑定并打开（默认是关的，要用户勾选）
    w.ensureApis && w.ensureApis();
    var tb = w.state.apis.text;
    var b = tb.bindings.filter(function(x){ return x.key === 'checkphone'; })[0];
    if(!b){ b = { key:'checkphone', on:false }; tb.bindings.push(b); }
    b.on = true;
    w.fetch = function(url, opts){
      const body = JSON.parse(opts.body);
      const out = { photos:['甲','乙','丙','丁','戊','己','庚','辛','壬'],
        chats:[{n:'A',last:'a'},{n:'B',last:'b'},{n:'C',last:'c'},{n:'D',last:'d'},{n:'E',last:'e'}],
        calls:[{n:'F'},{n:'G'},{n:'H'},{n:'I'}], buys:[{n:'J'},{n:'K'},{n:'L'},{n:'M'}],
        takes:[{n:'N'},{n:'O'},{n:'P'},{n:'Q'}], plans:[{ti:'R'},{ti:'S'},{ti:'T'},{ti:'U'},{ti:'V'}] };
      return Promise.resolve({ ok:true, status:200, json:()=>Promise.resolve({ choices:[{ message:{ content: JSON.stringify(out) } }] }) });
    };
    w.checkData('p:qwe', '模型人');
    await sleep(150);   // 等异步模型回调
    const cd2 = w.state.check['p:qwe'];
    ok(cd2 && cd2.modelGen === true, '④ 接模型后标记 modelGen=true');
    ok(cd2 && cd2.photos[0].d === '甲', '④ 模型内容已覆盖本地（photos[0]）');
    ok(cd2 && cd2.chats[0].n === 'A', '④ 模型内容已覆盖本地（chats[0].n）');

    console.log('\n查手机回归：' + pass + ' 通过 / ' + fail + ' 失败');
    process.exit(fail ? 1 : 0);
  } catch(e){
    console.log('测试异常：', e && e.stack || e);
    process.exit(2);
  }
})();
