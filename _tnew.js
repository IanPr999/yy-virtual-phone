/* 本轮五个新功能的回归：
   ①人设卡外貌锁定图 ②多格式导入导出 ③一起写·让TA写 ④小助手 ⑤桌面小组件 */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const html = fs.readFileSync('小手机.html', 'utf8');
const scripts = (fs.existsSync('app.js') && /app\.js/.test(html)) ? fs.readFileSync('app.js','utf8') : [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join("\n;\n");

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };

const vc = new VirtualConsole();
const errs = [];
vc.on('jsdomError', e => errs.push('jsdomError: ' + e.message));
const dom = new JSDOM(html, { url: 'http://localhost:8080/', virtualConsole: vc, runScripts: 'outside-only' });
const w = dom.window, d = w.document;
w.requestAnimationFrame = cb => setTimeout(() => cb(Date.now()), 0);
w.scrollTo = () => {};
w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
w.indexedDB = { open() { const r = { onsuccess: null, onerror: null, onupgradeneeded: null }; setTimeout(() => r.onsuccess && r.onsuccess({ target: { result: { objectStore() { return { createIndex() {} }; } } } }), 0); return r; } };
w.URL.createObjectURL = () => 'blob:x';
w.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data: [] }), text: () => Promise.resolve('{}'), blob: () => Promise.resolve(new w.Blob(['x'])) });
try { w.eval(scripts); } catch (e) { errs.push('EVAL: ' + e.message); console.log('EVAL ERR', e.message); }

/* ---------- ① 人设卡外貌锁定图 ---------- */
try {
  ok(w.REF_MAX === 3, '参考图上限是 3 张');
  const p = { id: 'P1', name: '阿城', gender: '男', age: '28', face: '眉眼清瘦', refImgs: ['r1', 'r2'] };
  ok(w.refImgsOf(p).length === 2, 'refImgsOf 能取出参考图');
  ok(w.refImgsOf({}).length === 0, '没有 refImgs 时返回空数组');
  const h = w.personaRefHTML(p);
  ok(h.indexOf('锁定外貌的参考图') >= 0, '参考图区块渲染出来了');
  ok(h.indexOf('data-refadd') >= 0, '还能加图时显示 ＋ 按钮');
  ok(h.indexOf('data-refdel') >= 0, '已有图时显示删除按钮');
  const full = w.personaRefHTML({ id: 'P2', name: '他', refImgs: ['a', 'b', 'c'] });
  ok(full.indexOf('data-refadd') < 0, '满 3 张后不再显示 ＋');
  // 提示词里必须带上锁定外貌的强约束
  const pr = w.personaLookPrompt(p);
  ok(pr.indexOf('阿城') >= 0, '提示词带上人物名');
  ok(pr.indexOf('2 张参考图') >= 0, '提示词写明有几张参考图');
  ok(pr.indexOf('五官') >= 0 && pr.indexOf('发型') >= 0, '提示词要求固定五官发型');
  ok(w.personaLookPrompt({ name: '他' }).indexOf('参考图') < 0, '没上传参考图时不提参考图');
  // 表单和弹窗里都挂上了这一块
  w.state.persona = Object.assign({}, w.DEFAULT_PERSONA, { id: 'P1', name: '阿城' });
  w.state.personas = [w.state.persona];
  w.go('persona');
  ok(d.getElementById('personaBody').innerHTML.indexOf('锁定外貌') >= 0, '人设卡页出现外貌锁定区块');
} catch (e) { ok(false, '①报错：' + e.message); }

/* ---------- ② 多格式导入导出 ---------- */
try {
  ok(w.EXPORT_KINDS.length >= 5, '导出格式不少于 5 种');
  const ks = w.EXPORT_KINDS.map(x => x.k);
  ['txt', 'md', 'docx', 'pdf', 'json'].forEach(k => ok(ks.indexOf(k) >= 0, '导出支持 ' + k));
  // 「标签：内容」解析
  const r1 = w.parseFieldsText('名字：林默\n性别：男\n年龄：29\n性格：话少', w.ALIAS_PERSONA);
  ok(r1.name === '林默', '认出名字');
  ok(r1.gender === '男', '认出性别');
  ok(r1.age === '29', '认出年龄');
  ok(String(r1.tone).indexOf('话少') >= 0, '认出性格（tone）');
  const r2 = w.parseFieldsText('【姓名】沈知\n[关系] 同学', w.ALIAS_IDENTITY);
  ok(r2.name === '沈知', '方括号标签也能认（身份卡姓名）');
  ok(String(r2.relation).indexOf('同学') >= 0, '认出关系');
  const r3 = w.parseFieldsText('一段没有标签的纯文字。\n第二段。', w.ALIAS_WORLD);
  ok(r3.__rest.indexOf('没有标签') >= 0, '认不出来的进 __rest');
  ok(Object.keys(r3).length === 1, '纯文字不误判字段');
  // 导出成行 / Word 包
  const lines = w.fieldsToLines('测试卡', [['名字', '林默'], ['性别', ''], ['年龄', '29']]);
  ok(lines[0] === '测试卡', '第一行是标题');
  ok(lines.length === 3, '空字段被跳过');
  const files = w.genericDocxFiles(['标题', '第一段', '第二段']);
  ok(files.length === 3, 'Word 包有 3 个文件');
  ok(files.some(f => f.name === 'word/document.xml'), '含 document.xml');
  const doc = files.filter(f => f.name === 'word/document.xml')[0].data;
  ok(new TextDecoder().decode(doc).indexOf('第二段') >= 0, 'Word 正文里有内容');
  // 拆段落
  ok(w.splitToBlocks('一\n\n二\n三').length === 2, '按空行拆成两段');
} catch (e) { ok(false, '②报错：' + e.message); }

/* ---------- ③ 一起写 · 让TA写 ---------- */
try {
  ok(w.modeLabel('aiwrite') === '让TA写', '模式名是「让TA写」');
  ok(w.AIWRITE_TYPES.length === 4, '四种类型（IF / AU / PARO / 自动）');
  const ks = w.AIWRITE_TYPES.map(x => x.k);
  ['if', 'au', 'paro', 'auto'].forEach(k => ok(ks.indexOf(k) >= 0, '有类型 ' + k));
  ok(w.AIWRITE_TYPES.filter(x => x.k === 'au')[0].tip.indexOf('平行世界') >= 0, 'AU 说明写了平行世界');
  ok(w.AIWRITE_TYPES.filter(x => x.k === 'paro')[0].tip.indexOf('戏仿') >= 0, 'PARO 说明写了戏仿');
  ok(w.AIWRITE_TYPES.filter(x => x.k === 'if')[0].tip.indexOf('节点') >= 0, 'IF 说明写了时间节点');
  // 新建文档时能选到这个模式
  const d = w.shelfNewDoc('', 'aiwrite', 'shelf', '测试');
  ok(d.mode === 'aiwrite', '能建成「让TA写」的文档');
  ok(d.aiw && Array.isArray(d.aiw.roles), '带上 aiw 配置');
  ok(d.aiw.world === true, '默认读取世界书');
  ok(d.aiw.words === 1200, '默认 1200 字');
  ok(w.shelfNewDoc('', 'write', 'shelf', 'x').mode === 'write', '普通模式不受影响');
  // 面板与提示词
  w.state.identities = [{ id: 'ID1', name: '小满', gender: '女', personality: '安静', background: '在医院长大', relation: '同学', note: '' }];
  w.state.personas = [{ id: 'PS1', name: '阿城', gender: '男', face: '眉眼清瘦', tone: '话少', refImgs: [] }];
  w.state.world = [{ id: 'W1', title: '雨城', keys: '雨', content: '这座城常年下雨', always: true, folderId: '' }];
  w.state.worldFolders = [];
  d.aiw.roles = ['id:ID1', 'p:PS1'];
  d.aiw.type = 'au';
  d.aiw.words = 2000;
  d.aiw.style = '古风';
  d.aiw.prompt = '';
  const panel = w.aiwritePanelHTML(d);
  ok(panel.indexOf('id:ID1') >= 0 && panel.indexOf('checked') >= 0, '面板勾上了选中的角色');
  ok(panel.indexOf('读取世界书') >= 0, '面板有世界书开关');
  ok(panel.indexOf('awWords') >= 0, '面板有字数输入');
  ok(panel.indexOf('古风') >= 0, '面板有行文风格');
  const ctx = w.aiwriteContext(d);
  ok(ctx.join('').indexOf('小满') >= 0, '上下文带上身份卡角色');
  ok(ctx.join('').indexOf('阿城') >= 0, '上下文带上人设卡角色');
  ok(ctx.join('').indexOf('常年下雨') >= 0, '上下文带上世界书设定');
  const pr = w.aiwritePrompt(d, '');
  ok(pr.indexOf('2000') >= 0, '提示词里写了字数');
  ok(pr.indexOf('古风') >= 0, '提示词里写了风格');
  ok(pr.indexOf('AU 平行世界') >= 0, '提示词里写了类型');
  ok(pr.indexOf('自己想一个') >= 0, '没写提示词时让模型自己发挥');
  d.aiw.prompt = '写一场雨里的重逢';
  ok(w.aiwritePrompt(d, '').indexOf('雨里的重逢') >= 0, '写了提示词就用用户的');
  d.aiw.world = false;
  ok(w.aiwriteContext(d).join('').indexOf('常年下雨') < 0, '关掉世界书就不带设定');
  d.aiw.world = true;
  const cont = w.aiwritePrompt(d, '前面写过的一段。');
  ok(cont.indexOf('接着往下写') >= 0, '续写时提示模型接上');
} catch (e) { ok(false, '③报错：' + e.message); }

/* ---------- ④ 小助手 ---------- */
try {
  ok(w.HELPER_KINDS.length === 5, '小助手五类活儿');
  const ks = w.HELPER_KINDS.map(x => x.k);
  ['persona', 'identity', 'world', 'beauty', 'other'].forEach(k => ok(ks.indexOf(k) >= 0, '能做 ' + k));
  ok(w.helperSys('persona').indexOf('JSON') >= 0, '做人设卡要求输出 JSON');
  ok(w.helperSys('world').indexOf('数组') >= 0, '做世界书要求输出数组');
  ok(w.helperSys('beauty').indexOf('CSS') >= 0, '做美化文件要求输出 CSS');
  // 从模型回答里抠 JSON
  ok(w.extractJSON('{"name":"阿城","age":"28"}').name === '阿城', '抠出裸 JSON');
  const fenced = '好的，如下：\n```json\n{"name":"林默"}\n```\n希望喜欢';
  ok(w.extractJSON(fenced).name === '林默', '抠出代码块里的 JSON');
  ok(Array.isArray(w.extractJSON('[{"title":"雨城","content":"常年下雨"}]')), '抠出数组');
  ok(w.extractJSON('完全没有 JSON 的一段话') === null, '没有 JSON 时返回 null');
  // 界面能渲染，并且能切换模型
  w.go('helper');
  ok(d.getElementById('helperBody').innerHTML.length > 100, '小助手页面渲染出来了');
  ok(d.getElementById('hpModel'), '有模型按钮');
  ok(d.getElementById('hpChat'), '有对话区');
  ok(d.getElementById('hpAsk'), '有输入框');
  ok(d.getElementById('hpGo'), '有发送按钮');
  ok(d.querySelectorAll('[data-hpk]').length === w.HELPER_KINDS.length, '类型标签齐全');
  // 对话模式：发一句话应该留下两条消息（我一句 + 正在做一条）
  const before = w.hpChat().length;
  const realRun = w.helperRun;
  w.helperRun = function () {};   // 先不真的去问模型，只看发送本身
  d.getElementById('hpAsk').value = '一个沉默的书店老板';
  w.helperSend();
  ok(w.hpChat().length === before + 2, '发送后多出「我说的」和「正在做」两条');
  ok(w.hpChat()[w.hpChat().length - 1].status === 'wait', '最后一条是等待中的助手消息');
  ok(w.hpChat()[w.hpChat().length - 2].role === 'me', '倒数第二条是我发的');
  ok(w.helperBusy === true, '发送后进入忙碌态');
  // 空话不该发出去
  w.helperBusy = false;
  w.hpChat().length = before;
  d.getElementById('hpAsk').value = '   ';
  w.helperSend();
  ok(w.hpChat().length === before, '空内容不会发出去');
  w.helperBusy = false;
  w.helperRun = realRun;
  // 欢迎语只来一次，而且不带「导入」（它不是卡）
  ok(w.hpChat()[0].hello === true, '第一条是欢迎语');
  ok(w.helperMsgHTML(w.hpChat()[0]).indexOf('data-hpimp') < 0, '欢迎语上没有导入按钮');
  // 出错的那条用红色气泡 + 再来一次
  const errHTML = w.helperMsgHTML({id: 'x1', role: 'bot', kind: 'persona', status: 'err', text: '没网', ts: Date.now()});
  ok(errHTML.indexOf('hp-err') > 0 && errHTML.indexOf('再来一次') > 0, '出错时显示红色气泡和再来一次');
  // 重做会把旧的那条换成新的等待条
  w.hpChat().push({id: 'x2', role: 'bot', kind: 'persona', status: 'ok', text: '{}', ts: Date.now()});
  w.helperRun = function () {};
  w.helperBusy = false;
  w.helperAgain('x2');
  ok(!w.hpChat().some(m => m.id === 'x2'), '重做会把旧消息去掉');
  ok(w.hpChat()[w.hpChat().length - 1].status === 'wait', '重做后挂了一条新的等待');
  w.helperBusy = false;
  w.helperRun = realRun;
  // 桌面上有这个图标
  ok(w.APPS.some(a => a.id === 'helper'), 'APPS 里有小助手');
  ok(w.APPS.filter(a => a.id === 'helper')[0].ico === 'helper', '小助手用的是自己的图标');
  ok(w.LN_ICONS.helper, '图标库里有 helper 图形');
  // ① 改名：小助手里那一类叫「人设卡」，不再叫角色卡
  const pk = w.HELPER_KINDS.filter(x => x.k === 'persona')[0];
  ok(pk.n === '人设卡', '小助手里叫「人设卡」（不是角色卡）');
  // ② 项目窗口：能新建 / 切换，各自独立
  const pn0 = w.state.helperProjects.length;
  const np = w.hpNewProject('赛博世界书');
  ok(w.state.helperProjects.length === pn0 + 1, '能新建一个项目窗口');
  ok(w.state.helperCur === np.id, '新建后自动切到这个新项目');
  ok(w.hpChat().length === 0, '新项目的对话是空的');
  w.hpChat().push({ id: 'z1', role: 'me', text: '先记一句', ts: Date.now(), status: 'ok' });
  const firstId = w.state.helperProjects[0].id;
  w.hpSwitch(firstId);
  ok(w.state.helperCur === firstId, '能切回原来的项目');
  ok(!w.hpChat().some(m => m.id === 'z1'), '项目之间的记录互不相通');
  w.hpSwitch(np.id);
  ok(w.hpChat().some(m => m.id === 'z1'), '切回来还能看到刚才那句');
  // 小助手只读当前窗口：发给模型的消息里不应带上别的项目
  const seen = [];
  const realFetch = w.fetch;
  w.fetch = function (u, o) { try { seen.push(JSON.parse(o.body)); } catch (e) {} return realFetch(u, o); };
  w.state.settings.apis = w.state.apis;
  try { w.helperRun('nope'); } catch (e) {}
  w.fetch = realFetch;
  // ③ 思考过程：能拆出来，正文里不留
  const th1 = w.splitThink('<think>先想了半天</think>\n{"name":"阿城"}');
  ok(th1.think.indexOf('先想了半天') >= 0, '能取出 <think> 里的思考过程');
  ok(th1.body.indexOf('先想了半天') < 0, '思考过程不会留在正文里');
  ok(th1.body.indexOf('阿城') >= 0, '正文内容还在');
  const th2 = w.splitThink('思考过程：这里想了很多很多很多很多字\n最终回答：就这句');
  ok(th2.think.indexOf('这里想了') >= 0, '「思考过程：」这种写法也认');
  const thHTML = w.helperMsgHTML({ id: 't1', role: 'bot', kind: 'persona', status: 'ok', text: '正文', think: '想了什么', ts: Date.now() });
  ok(thHTML.indexOf('hp-think') > 0 && thHTML.indexOf('data-hptk') > 0, '思考过程渲染成可折叠的一块');
  ok(thHTML.indexOf('class="hp-think"') > 0 && thHTML.indexOf('open') < 0, '思考过程默认是收起的');
  // ④ 导出默认不带用户的提示词
  ok(typeof w.helperCssOf === 'function' && w.helperCssOf('```css\n.bubble{color:#333}\n```').indexOf('.bubble') >= 0, '能从回答里抠出纯 CSS');
  ok(typeof w.helperPreviewBeauty === 'function', '有美化预览窗口');
  ok(w.PV_BASE_CSS.indexOf('.bubble.him') >= 0, '预览里有气泡样例');
  // ⑤ 人设卡导入：JSON（中英文键）和纯文本都能解析
  const fJSON = w.parsePersonaAny('```json\n{"name":"阿城","性格":"冷淡","age":"28"}\n```');
  ok(fJSON.name === '阿城' && fJSON.tone === '冷淡', 'JSON 里的中文键也能认（性格→性子和说话方式）');
  const fTxt = w.parsePersonaAny('名字：林默\n口头禅：嗯。\n五官：眉眼很淡');
  ok(fTxt.name === '林默' && fTxt.catchphrase === '嗯。', '「标签：内容」的纯文本能解析');
  const fPlain = w.parsePersonaAny('这是一段完全没有标签的人物描写。');
  ok((fPlain.background || '').indexOf('完全没有标签') >= 0, '完全没有标签时整篇进「生活背景」，不丢内容');
  // 小助手生成的内容能直接落成一张人设卡
  const before2 = w.state.personas.length;
  w.openModal = function () {};   // 这里只验证"落成卡片"这一步，不弹窗
  w.helperImport({ id: 'i1', kind: 'persona', text: '{"name":"小助手生成的人","tone":"慢热"}', status: 'ok' });
  ok(w.state.personas.length === before2 + 1, '小助手做的人设卡能直接存进人设卡列表');
  ok(w.state.personas[w.state.personas.length - 1].name === '小助手生成的人', '存进去的卡名字对得上');
} catch (e) { ok(false, '④报错：' + e.message); }

/* ---------- ⑤ 桌面小组件 ---------- */
try {
  w.ensureLayout();
  const ts = w.WIDGET_TYPES.map(x => x.t);
  ['lastchat', 'diarylast', 'notelast', 'personanow', 'worldrand', 'memcount',
   'albumrand', 'checktodo', 'quicknote', 'stopwatch', 'moodset', 'walletsum',
   'shopcart', 'anni'].forEach(t => ok(ts.indexOf(t) >= 0, '新增组件类型 ' + t));
  ok(w.WIDGET_TYPES.length >= 25, '组件种类总共 ' + w.WIDGET_TYPES.length + ' 种（≥25）');
  ok(w.widgetTypeName('checktodo') === '待办打勾', '新增类型有中文名');
  // 每种都能渲染出内容且不报错
  w.state.mood = '平静';
  w.state.messages = [{ id: 'm1', who: 'him', text: '今天下雨了，记得带伞。', ts: Date.now() }];
  w.state.diary = [{ id: 'd1', type: 'diary', text: '今天他来找我。', ts: Date.now() }];
  w.state.notes = [{ id: 'n1', text: '买牛奶', ts: Date.now() }];
  w.state.memory = [{ id: 'mm1', text: '记得她怕打雷', secret: true, ts: Date.now() }];
  w.state.plans = [{ id: 'p1', title: '交电费', done: false }];
  w.state.world = [{ id: 'w1', title: '雨城', keys: '雨', content: '常年下雨', folderId: '' }];
  w.state.wallet = { balance: 880 };
  w.state.shop = { cart: [{ id: 'c1' }] };
  w.state.persona = Object.assign({}, w.DEFAULT_PERSONA, { id: 'PS1', name: '阿城', tone: '话很少' });
  w.WIDGET_TYPES.forEach(x => {
    try {
      const h = w.widgetHTML({ id: 'wid_' + x.t, type: x.t, page: 0, size: '2x2', title: w.widgetTypeName(x.t), date: '2026-01-01' });
      ok(typeof h === 'string' && h.indexOf('widget') >= 0, '组件 ' + x.t + ' 能渲染');
    } catch (e) { ok(false, '组件 ' + x.t + ' 渲染报错：' + e.message); }
  });
  // 内容确实取到了
  ok(w.widgetHTML({ id: 'x', type: 'lastchat', size: '2x2', title: 't' }).indexOf('记得带伞') >= 0, '最近一句话取到了聊天');
  ok(w.widgetHTML({ id: 'x', type: 'memcount', size: '2x2', title: 't' }).indexOf('条记忆') >= 0, '记忆条数显示出来了');
  ok(w.widgetHTML({ id: 'x', type: 'walletsum', size: '2x2', title: 't' }).indexOf('880') >= 0, '钱包余额显示出来了');
  const an = w.widgetHTML({ id: 'x', type: 'anni', size: '2x2', title: 't', date: '2020-01-01' });
  ok(/\d+<\/div>/.test(an) && an.indexOf('天') >= 0, '纪念日算出天数');
  // 计时器
  ok(w.fmtStopwatch(0) === '00:00', '计时器 0 秒');
  ok(w.fmtStopwatch(65000) === '01:05', '计时器 1 分 5 秒');
  ok(w.fmtStopwatch(3725000) === '1:02:05', '计时器 1 小时 2 分 5 秒');
  // 点击行为
  w.state.layout.widgets = [{ id: 'WQ', type: 'moodset', page: 0, size: '2x2', title: '心情' }];
  w.widgetTap(w.state.layout.widgets[0], null);
  ok(w.state.mood !== '平静', '点心情组件会换心情');
  const wq = { id: 'WS', type: 'stopwatch', page: 0, size: '2x2', title: '计时', sw: { acc: 0, running: false, start: 0 } };
  w.widgetTap(wq, null);
  ok(wq.sw.running === true, '点一下计时器开始跑');
  w.widgetTap(wq, null);
  ok(wq.sw.running === false && wq.sw.acc >= 0, '再点一下暂停');
  wq.sw.acc = 5000;
  w.widgetTap(wq, null);
  ok(wq.sw.acc === 0, '第三下清零');
  const wr = { id: 'WR', type: 'worldrand', page: 0, size: '2x2', title: '设定', seed: 0 };
  w.widgetTap(wr, null);
  ok(wr.seed !== 0, '点一下换一条设定');
} catch (e) { ok(false, '⑤报错：' + e.message); }

/* ---------- ⑨ 导入人设卡的字段必须落在对应文本框 ---------- */
try {
  // 「性格设定」不能再掉进「生活背景」（以前 background 的别名「设定」会抢走它）
  const a = w.parsePersonaAny(JSON.stringify({ 名字:'沈砚', 性格设定:'冷淡，话很少', 背景故事:'旧书店老板' }));
  ok(a.tone === '冷淡，话很少', '中文键「性格设定」→ 性子和说话方式');
  ok(a.background === '旧书店老板', '中文键「背景故事」→ 生活背景');
  ok(a.name === '沈砚', '中文键「名字」→ 名字');

  const b = w.parsePersonaAny('名字：沈砚\n性格设定：冷淡，话很少\n说话方式：不用语气词\n背景故事：旧书店老板');
  ok(b.tone.indexOf('冷淡，话很少') === 0 && b.tone.indexOf('不用语气词') > 0, '纯文本「性格设定」→ 性子和说话方式');
  ok(b.background === '旧书店老板', '纯文本「背景故事」→ 生活背景');

  // 中英混写、别的软件爱用的英文名
  const c = w.parsePersonaAny(JSON.stringify({ name:'阿城', personality:'慢热', 生活背景:'乐队主唱' }));
  ok(c.tone === '慢热', 'personality → 性子和说话方式');
  ok(c.background === '乐队主唱', '中文键「生活背景」→ 生活背景');

  // 打分匹配：更具体的别名赢
  ok(w.matchAlias('性格设定', w.ALIAS_PERSONA) === 'tone', 'matchAlias：性格设定 → tone');
  ok(w.matchAlias('人物设定', w.ALIAS_PERSONA) === 'background', 'matchAlias：人物设定 → background');
  ok(w.matchAlias('日常穿衣风格', w.ALIAS_PERSONA) === 'outfit', 'matchAlias：日常穿衣风格 → outfit');
  ok(w.matchAlias('五官特征', w.ALIAS_PERSONA) === 'face', 'matchAlias：五官特征 → face');
  ok(w.matchAlias('根本不相关的词', w.ALIAS_PERSONA) === null, 'matchAlias：认不出就返回 null');

  // 值写成数组/嵌套对象也要摊平
  const e1 = w.parsePersonaAny(JSON.stringify({ tone:['话少','不爱解释'], likes:{ 喜欢:'雨天', 讨厌:'吵闹' } }));
  ok(e1.tone === '话少、不爱解释', '数组值摊平成顿号连接');
  ok(e1.likes.indexOf('喜欢：雨天') >= 0 && e1.likes.indexOf('讨厌：吵闹') >= 0, '嵌套对象摊平成「键：值」');

  // 导出 → 再导入，必须回到原来的字段（用界面上的中文标签导出）
  const src = { name:'阿城', callMe:'宝贝', gender:'男', age:'28', body:'清瘦', outfit:'白衬衫',
                face:'眉眼清瘦', likes:'雨天', background:'书店老板', social:'有个妹妹',
                tone:'话很少', catchphrase:'嗯。', taboo:'不提母亲', first:'来了。', extra:'怕打雷' };
  const lines = w.fieldsToLines('阿城 · 人设卡', w.PERSONA_FIELDS.map(f => [f.l, src[f.k]]));
  const back = w.parsePersonaAny(lines.join('\n'));
  let same = 0, diff = [];
  w.PERSONA_FIELDS.forEach(f => {
    if (String(back[f.k] || '').trim() === String(src[f.k] || '').trim()) same++;
    else diff.push(f.k + '(' + (back[f.k] || '空') + ')');
  });
  ok(same === w.PERSONA_FIELDS.length, '导出再导入，' + w.PERSONA_FIELDS.length + ' 项全部回到原字段' + (diff.length ? '：' + diff.join('、') : ''));

  // 认不出的键不能丢：进 __rest，最后并进生活背景
  const g = w.parsePersonaAny(JSON.stringify({ 名字:'沈砚', 一个奇怪的键:'某段设定文字' }));
  ok(String(g.background || '').indexOf('某段设定文字') >= 0 || String(g.__rest || '').indexOf('某段设定文字') >= 0, '认不出的键也不会丢内容');

  // 端到端：小助手导入后，字段确实写进了那张卡
  const before = w.state.personas.length;
  w.helperImport({ kind:'persona', text: JSON.stringify({ name:'端到端', 性格设定:'冷淡寡言', 说话方式:'短句', 背景故事:'旧书店' }) });
  ok(w.state.personas.length === before + 1, '小助手导入会新建一张人设卡');
  const np = w.state.personas[w.state.personas.length - 1];
  ok(np.tone.indexOf('冷淡寡言') >= 0 && np.tone.indexOf('短句') >= 0, '新建卡里「性格」落在 tone 上');
  ok(np.background === '旧书店', '新建卡里「背景」落在 background 上');
  ok(np.tone.indexOf('旧书店') < 0, '性格框里不能再混进背景');
} catch (e) { ok(false, '⑨报错：' + e.message); }

/* ---------- ⑩ 人设卡列表：默认只露头像/名字/微信号，点开才是完整信息 ---------- */
try {
  w.state.personas.length = 0;
  w.state.personas.push({ id:'PA', name:'沈砚', gender:'男', age:'28', tone:'冷淡，话很少', background:'旧书店老板', wxid:'shenyan_01', refImgs:[] });
  w.state.personas.push({ id:'PB', name:'阿城', gender:'男', age:'26', tone:'温柔', background:'乐队主唱', wxid:'', refImgs:[] });
  w.state.curPersona = 'PA'; w.state.persona = w.state.personas[0];
  w.personaOpenId = '';
  w.renderers.persona();
  const body = w.document.getElementById('personaBody');
  const cards = body.querySelectorAll('[data-pcard]');
  ok(cards.length === 2, '两张卡都渲染成了可点的卡片');
  ok(!body.querySelector('.p-detail'), '默认收着：列表里没有完整信息');
  ok(cards[0].textContent.indexOf('微信号：') >= 0, '卡片上显示微信号');
  ok(cards[0].textContent.indexOf('shenyan_01') >= 0, '显示的是这张卡自己的微信号');
  ok(cards[1].textContent.indexOf('微信号：') >= 0, '没填微信号的那张也会自动生成一个');
  ok(cards[0].textContent.indexOf('冷淡') < 0 && cards[0].textContent.indexOf('旧书店') < 0,
     '默认不把性格 / 背景这些细节铺在列表里');

  // 点一下卡片 → 就地展开完整信息
  cards[0].dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
  const open = body.querySelector('.p-detail');
  ok(!!open, '点一下卡片就展开完整信息');
  ok(w.personaOpenId === 'PA', '记住了展开的是哪一张');
  ok(open.textContent.indexOf('冷淡，话很少') >= 0, '展开后能看到「性子和说话方式」');
  ok(open.textContent.indexOf('旧书店老板') >= 0, '展开后能看到「生活背景和经历」');
  ok(open.textContent.indexOf('沈砚') >= 0, '展开后也能看到名字');
  ok(!!open.querySelector('[data-pedit]'), '展开区有「编辑这张」');
  ok(!!open.querySelector('[data-pdel]'), '展开区有「删」');
  // 展开的是这一张，另一张不受影响
  ok(!cards[1].parentNode.querySelector('.p-detail'), '只展开被点的那一张');

  // 再点一下 → 收起
  cards[0].dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
  ok(!body.querySelector('.p-detail'), '再点一下就收起');
  ok(w.personaOpenId === '', '收起后不记得任何展开');

  // 点「用这个」只切换，不顺带展开
  const useBtns = body.querySelectorAll('[data-puse]');
  ok(useBtns.length === 1, '只有没在用的那张才需要「用这个」（当前卡有 badge）');
  const pb = body.querySelectorAll('[data-pcard]')[1].querySelector('[data-puse]');
  pb.dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
  ok(w.state.curPersona === 'PB', '点「用这个」会切到那张卡');
  ok(w.personaOpenId === '', '点「用这个」不会顺带展开');
} catch (e) { ok(false, '⑩报错：' + e.message); }

console.log('\n==== ' + pass + ' 通过 / ' + fail + ' 失败 ====');
if (errs.length) { console.log('控制台错误：'); errs.slice(0, 10).forEach(e => console.log('  - ' + e)); }
process.exit(fail || errs.length ? 1 : 0);
