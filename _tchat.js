/* 回归：微信聊天设置分页 + 通知横幅 + 冷落主动 / 表情包授权 / 语音合成 / 心声排版
   ① 聊天设置拆成四个分类页，切换即重绘、每页各自保存
   ② 切换标签时不丢未保存的改动；跨页保存不互相抹掉字段
   ③ 收到他的消息（不在该会话）会弹通知条，读过后自动收起
   ④ 好友圈新动态也会弹通知，进了圈子就消
   ⑤ pickSticker 只在「已选合集」里挑图
   ⑥ 线下模式把「心声：」拆出来单独排版
   ⑦ 沉寂超时他会主动开口
   ⑧ 有音频的语音消息可以点「播放他的声音」 */
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
    await sleep(20);
    const pid = w.state.curPersona || '_';
    const bodyEl = () => w.document.getElementById('sheetBody');

    // ---------- ① 聊天设置分页 ----------
    w.openChatSetting();
    await sleep(20);
    ok(!!w.document.getElementById('csSpeed'),     '第 1 页「基本」：有回复速度');
    ok(!!w.document.getElementById('csStyleSel'),  '第 1 页「基本」：有文风下拉');
    ok(!!w.document.getElementsByName('csFirst').length, '第 1 页「基本」：有谁先开口');
    ok(!w.document.getElementById('csIdleMin'),    '第 1 页不再堆着「主动」页的字段');
    ok(!w.document.getElementById('csBgUrl'),      '第 1 页不再堆着「外观」页的字段');
    ok(!w.document.getElementById('csAutoSum'),    '第 1 页不再堆着「高级」页的字段');
    ok(w.document.querySelectorAll('[data-cstab]').length === 4, '顶部有 4 个分类标签');

    const clickTab = async t => {
      const b = [...w.document.querySelectorAll('[data-cstab]')].find(x => x.getAttribute('data-cstab') === t);
      b.click(); await sleep(20);
    };
    await clickTab('act');
    ok(!!w.document.getElementById('csSenseTime'),    '第 2 页「主动」：有感知现实时间');
    ok(!!w.document.getElementById('csSenseWeather'), '第 2 页「主动」：有感知现实天气');
    ok(!!w.document.getElementById('csIdleOn'),       '第 2 页「主动」：有冷落后主动开口开关');
    ok(!!w.document.getElementById('csIdleMin'),      '第 2 页「主动」：有「多少分钟」输入框');
    ok(!!w.document.getElementById('csStk'),          '第 2 页「主动」：有用表情包开关');

    await clickTab('look');
    ok(!!w.document.getElementById('csBgUrl'),   '第 3 页「外观与声音」：有专属聊天背景');
    ok(!!w.document.getElementById('csVoice'),   '第 3 页「外观与声音」：有专属音色');
    ok(!!w.document.getElementById('csVoiceLang'), '第 3 页「外观与声音」：有所说语言');
    ok(!!w.document.getElementById('csRead'),    '第 3 页「外观与声音」：有已读/未读开关');

    await clickTab('adv');
    ok(!!w.document.getElementById('csAutoSum'),     '第 4 页「高级」：有自动总结记忆');
    ok(!!w.document.getElementById('chainListDef'),  '第 4 页「高级」：有默认思维链列表');
    ok(!!w.document.getElementById('chainListOff'),  '第 4 页「高级」：有线下思维链列表');
    ok(!!w.document.getElementById('chainAddDef'),   '第 4 页「高级」：默认思维链可加一套');
    ok(!!w.document.getElementById('pokeList'),      '第 4 页「高级」：有戳一下回复列表');
    ok(!w.document.getElementById('csAnnOpen'),      '第 4 页「高级」：批注模式入口已移除');

    // ---------- ② 切标签不丢改动 / 跨页保存不互相抹 ----------
    await clickTab('look');
    w.document.getElementById('csVoice').value = 'nova';
    w.document.getElementById('csBgUrl').value = 'https://x.com/a.jpg';
    await clickTab('act');                              // 不点保存直接换页
    await clickTab('look');
    ok(w.document.getElementById('csVoice').value === 'nova', '换标签来回切，未保存的改动不会丢（切换时先存档）');

    await clickTab('act');
    w.document.getElementById('csSenseWeather').checked = false;
    w.document.getElementById('csIdleMin').value = '9';
    w.document.getElementById('csIdleOn').checked = true;
    w.document.getElementById('csSave').click();
    await sleep(20);
    await clickTab('look');
    w.document.getElementById('csBgUrl').value = 'https://x.com/a.jpg';
    w.document.getElementById('csSave').click();
    await sleep(20);
    const c = w.chatCfg(pid);
    ok(c.senseWeather === false, '「主动」页存下来的：关掉了感知天气');
    ok(c.idleMin === 9,          '「主动」页存下来的：冷落 9 分钟');
    ok(c.idleOn === true,        '「主动」页存下来的：开通冷落主动开口');
    ok(c.bg && c.bg.value === 'https://x.com/a.jpg', '「外观」页存下来的：专属聊天背景');
    ok(c.voice === 'nova',       '「外观」页存下来的：专属音色 nova');
    ok(typeof c.senseTime === 'boolean' && c.senseTime === true, '切到别的页不会把默认开启的感知时间抹掉');

    // ---------- ③ 聊天通知横幅 ----------
    w.currentScreen = 'home';            // 离开微信聊天页，才算「没在读」
    w.state.wx.unread = {};
    w.pushMessage('him', '在干嘛呢', 'text');
    await sleep(30);
    const layer = w.document.getElementById('notifyLayer');
    ok(layer.children.length === 1, '收到他的消息会弹出一条通知横幅');
    ok(w.state.wx.unread[pid] === 1, '未读计数 +1');
    const card = layer.querySelector('.notify-card');
    ok(!!card && card.textContent.indexOf('在干嘛呢') >= 0, '通知条上显示消息内容');
    // 阅读后提示关闭
    w.clearUnread(pid);
    await sleep(400);
    ok(layer.children.length === 0, '读过之后通知横幅自动消失');
    ok(w.state.wx.unread[pid] === 0, '未读红点也清掉了');
    // 正在该会话里：不打扰
    w.currentScreen = 'call'; w.wxPane = 'msg';
    w.pushMessage('him', '看到了吗', 'text');
    await sleep(30);
    ok(layer.children.length === 0, '正看着这段聊天时不弹通知');
    ok(!w.state.wx.unread[pid], '正看着这段聊天时不计未读');
    // 图片 / 语音 / 转账 等特殊消息也有可读预览
    w.currentScreen = 'home';
    w.pushMessage('him', '', 'voice', {dur:5});
    await sleep(30);
    ok(layer.children.length === 1 && layer.querySelector('.n-d').textContent.indexOf('[语音') >= 0,
       '语音消息在通知条上显示「[语音 5″]」');
    w.clearUnread(pid); await sleep(400);

    // ---------- ④ 好友圈通知 ----------
    w.currentScreen = 'call'; w.wxPane = 'main';
    w.wxPersonaPost({kind:'persona', pid:pid, name:''});
    await sleep(30);
    ok(layer.children.length === 1, '好友圈有新动态会弹通知');
    ok(layer.querySelector('.n-t').textContent.indexOf('好友圈') >= 0, '通知条上标了「好友圈」');
    w.wxMarkCircleSeen();
    await sleep(400);
    ok(layer.children.length === 0, '点开好友圈看过之后通知消失');

    // ---------- ⑤ 表情包只从已授权的合集里挑 ----------
    w.state.wx.stickers = [
      {id:'p1', name:'日常篇', items:['i1','i2'], allow:{[pid]:true}},
      {id:'p2', name:'限定篇', items:['i3'],     allow:{[pid]:true}}
    ];
    const c3 = w.chatCfg(pid);
    c3.stickerPacks = ['p1'];
    let hits = {};
    for(let i = 0; i < 40; i++){ hits[w.pickSticker(pid)] = 1; }
    ok(Object.keys(hits).every(k => (k === 'i1' || k === 'i2' || k === '')), '只从勾选的那套里挑，没勾的那套绝不会被调用');
    c3.stickerPacks = null;
    hits = {};
    for(let i = 0; i < 60; i++){ hits[w.pickSticker(pid)] = 1; }
    ok(Object.keys(hits).length >= 2, '不限制（全部勾选）时两套都能用');
    c3.stickerPacks = [];
    ok(w.pickSticker(pid) === '', '一个合集都没勾时他不调用表情包');
    // 没授权给这张卡的合集也不能用
    c3.stickerPacks = null;
    w.state.wx.stickers[1].allow = {};
    hits = {};
    for(let i = 0; i < 40; i++){ hits[w.pickSticker(pid)] = 1; }
    ok(Object.keys(hits).every(k => (k === 'i1' || k === 'i2' || k === '')), '没在「设置→表情包」授权给他的合集也一样不调用');

    // ---------- ⑥ 线下模式「心声」单独排版 ----------
    const mm = {text:'（把杯子推过去）\n喝点热的。\n心声：其实看到你这样，我很心疼。'};
    w.splitThought(mm);
    ok(mm.thought === '其实看到你这样，我很心疼。', '心声那一行被拆了出来');
    ok(mm.text.indexOf('心声：') < 0, '正文里不再残留「心声：」那一行');
    ok(mm.text.indexOf('（把杯子推过去）') >= 0, '动作描写留在正文里');
    const mm2 = {text:'就想问一句，还好吗？'};
    w.splitThought(mm2);
    ok(mm2.thought === undefined, '模型没写心声时不做处理');

    w.state.wx.mode = 'offline';
    w.pushMessage('him', '（低下头）\n没事。\n心声：嘴上说没事，其实很想你陪着。', 'text');
    await sleep(30);
    const chat = w.document.getElementById('chatList') || w.document.getElementById('chatBody');
    ok(chat.innerHTML.indexOf('class="thought"') >= 0, '线下模式渲染出独立的心声区块');
    ok(chat.innerHTML.indexOf('嘴上说没事') >= 0, '心声内容显示出来了');
    ok(chat.innerHTML.indexOf('心声：嘴上说没事') < 0, '心声不会连着「心声：」前缀一起显示');
    ok(/<span class="th-badge">心声<\/span>/.test(chat.innerHTML), '心声区块带「心声」小标签');
    ok(html.indexOf('.thought{') >= 0, '心声用了单独的样式（换字体 + 斜体 + 淡底色）');
    w.state.wx.mode = 'online';

    // ---------- ⑦ 沉寂超时他会主动开口 ----------
    const c4 = w.chatCfg(pid);
    c4.idleOn = true; c4.idleMin = 1;
    w.LS.set('idleLast_' + pid, 0);
    w.state.messages.forEach(m => { m.ts = 1; });      // 全部变成很久以前
    const before = w.state.messages.length;
    w.maybeIdleNudge();
    await sleep(40);
    ok(w.state.messages.length > before, '冷落超过设定时长后，他主动开口发了一条');
    // 同一段沉寂不会连环轰炸
    const after = w.state.messages.length;
    w.state.messages.forEach(m => { m.ts = 1; });
    w.maybeIdleNudge();
    await sleep(30);
    ok(w.state.messages.length === after, '同一个沉寂段里不会反复来消息');
    // 关掉开关就不再主动
    c4.idleOn = false;
    const b2 = w.state.messages.length;
    w.state.messages.forEach(m => { m.ts = 1; });
    w.maybeIdleNudge();
    await sleep(30);
    ok(w.state.messages.length === b2, '关掉「冷落后主动开口」开关后不再打扰');

    // ---------- ⑧ 有音频的语音消息可以直接播 ----------
    w.state.wx.mode = 'online';
    w.currentScreen = 'call'; w.wxPane = 'msg';
    const vm = w.pushMessage('him', '我先去洗个澡', 'voice', {dur:6});
    vm.tts = 'blob:abc123';
    w.renderChat();
    await sleep(20);
    ok(!!w.document.querySelector('[data-vplay]'), '语音气泡上出现「播放他的声音」按钮');
    ok(!!w.document.querySelector('[data-vtext]'), '同时保留「转文字」入口');
    ok(typeof w.playVoiceMsg === 'function', 'playVoiceMsg（播放他的语音）已提供');
    const vm2 = w.pushMessage('him', '嗯好', 'text');
    ok(w.voiceUrlOf(vm2) === '', '没有音频的消息不会显示播放按钮');

    // ---------- ⑨ 聊天设置「基本」里的「英文自动翻译成中文」 ----------
    ok(w.chatCfg(pid).autoTransEn === false, '这个开关默认是关着的（老存档也兼容成 false）');
    // 判定逻辑
    ok(w.looksEnglish('Sure. Whatever you say.') === true,  '整句是英文 → 判为英文');
    ok(w.looksEnglish('今天有点累') === false,               '中文消息 → 不判为英文');
    ok(w.looksEnglish('（笑）好啊') === false,              '几乎没有拉丁字母 → 不判为英文');
    ok(w.looksEnglish('OK') === false,                      '只有两个字母的短词不算英文段');
    ok(w.looksEnglish('（笑了一下）Sure, whatever you say.') === true, '带一点动作描写的英文句仍判为英文');
    // 开关出现在「基本」页上
    w.openChatSetting('basic');
    await sleep(20);
    const trBox = w.document.getElementById('csAutoTrEn');
    ok(!!trBox, '第 1 页「基本」：有「英文自动翻译成中文」开关');
    ok(trBox.checked === false, '开关初始是关的');
    trBox.checked = true;
    w.document.getElementById('csSave').click();
    await sleep(30);
    ok(w.chatCfg(pid).autoTransEn === true, '勾上并保存后，这个对话框记住了设置');
    // 换一张人设卡不受影响
    const otherPid = (w.state.personas[1] && w.state.personas[1].id) || '_other';
    ok(w.chatCfg(otherPid).autoTransEn === false, '别的对话框不受影响（按人设卡分别存）');
    // 翻译：stub 掉接口，只看流程
    const realTr = w.translateEn2Cn;
    w.translateEn2Cn = (t, cb) => cb('【中】' + t);
    const em = w.pushMessage('him', 'Sure. Whatever you say.', 'text');
    w.maybeTranslate(em);
    await sleep(20);
    ok(em.translated === '【中】Sure. Whatever you say.', '他发来的英文被自动翻成中文');
    ok(w.showTranslated[em.id] === true, '自动翻完默认显示中文（不用再点一下）');
    const cm = w.pushMessage('him', '今天有点累', 'text');
    w.maybeTranslate(cm);
    await sleep(20);
    ok(!cm.translated, '中文消息不会被送去翻译');
    const mym = w.pushMessage('me', 'I am fine, thanks.', 'text');
    w.maybeTranslate(mym);
    await sleep(20);
    ok(!mym.translated, '我自己发的英文不会被翻译（只翻「他」的）');
    // 关掉开关
    w.chatCfg(pid).autoTransEn = false;
    const em2 = w.pushMessage('him', 'Leave me alone, please.', 'text');
    w.maybeTranslate(em2);
    await sleep(20);
    ok(!em2.translated, '关掉开关之后不再自动翻译');
    // 补翻：打开开关时把最近几句英文也翻一遍
    w.chatCfg(pid).autoTransEn = true;
    em2.translated = ''; w.showTranslated[em2.id] = false;
    w.backfillTransEn(5);
    await sleep(30);
    ok(em2.translated === '【中】Leave me alone, please.', '刚打开开关时会把最近的英文消息补翻一遍');
    w.translateEn2Cn = realTr;
    w.chatCfg(pid).autoTransEn = false;
    // 翻不出来（接口没配）时不要把错误文案塞进气泡
    w.translateEn2Cn = (t, cb) => cb('');
    const em3 = w.pushMessage('him', 'Nothing much, honestly.', 'text');
    w.chatCfg(pid).autoTransEn = true;
    w.maybeTranslate(em3);
    await sleep(20);
    ok(!em3.translated, '翻不出来时保持原文，不往气泡里塞「翻译失败」');
    w.translateEn2Cn = realTr;
    // 这一项开着时不再走全局「翻成某语言」，否则同一句话会被两套规则来回翻
    w.state.settings.translateOn = true; w.state.settings.lang = 'English';
    w.chatCfg(pid).autoTransEn = true;
    const zh2 = w.pushMessage('him', '今天有点累', 'text');
    w.maybeTranslate(zh2);
    await sleep(20);
    ok(!zh2.translated, '开了「英文→中文」就不再套用全局的「翻成英文」');
    w.chatCfg(pid).autoTransEn = false;

    // ---------- ⑩ 对方发的英文双引号不能显示成 &quot;（转义了两次） ----------
    w.state.settings.translateOn = false;
    w.state.messages.length = 0;
    const qm = w.pushMessage('him', 'He said "wait" & left', 'text');
    w.renderChat();
    await sleep(20);
    const qb = w.document.querySelector('.bubble[data-mid="' + qm.id + '"]');
    ok(!!qb, '气泡渲染出来了');
    ok(qb.innerHTML.indexOf('&amp;quot;') < 0, '气泡里不会出现 &amp;quot;（不再被转义两次）');
    ok(qb.innerHTML.indexOf('&amp;amp;') < 0, '气泡里也不会出现 &amp;amp;');
    ok(qb.textContent.indexOf('"wait"') >= 0, '英文双引号原样显示');
    ok(qb.textContent.indexOf('&') >= 0, '& 原样显示');
    // 我的消息走另一条渲染分支，同样要正确
    const qm2 = w.pushMessage('me', '我说 "好的" & 走了', 'text');
    w.renderChat();
    await sleep(20);
    const qb2 = w.document.querySelector('.bubble[data-mid="' + qm2.id + '"]');
    ok(qb2.textContent.indexOf('"好的"') >= 0, '我自己发的消息引号也正常');
    // 译文（自动翻出来的中文）里的引号同样不受影响
    qm.translated = '他说"等等"就走了';
    w.showTranslated[qm.id] = true;
    w.renderChat();
    await sleep(20);
    const qb3 = w.document.querySelector('.bubble[data-mid="' + qm.id + '"]');
    ok(qb3.textContent.indexOf('"等等"') >= 0, '译文里的引号也正常');
    w.showTranslated[qm.id] = false;

    // ---------- ⑪ 我发出去的：自动翻译成别的语言 ----------
    const ot0 = w.chatCfg(pid).outTrans;
    ok(ot0 && ot0.on === false && ot0.from === '自动' && ot0.to === 'English', '「我发出去」默认关、源语言自动、目标 English');
    w.openChatSetting('basic');
    await sleep(20);
    const otBox = w.document.getElementById('csOutTr');
    ok(!!otBox, '第 1 页「基本」：有「我说的话先翻译」开关');
    const fromSel = w.document.getElementById('csOutFrom');
    const toSel   = w.document.getElementById('csOutTo');
    ok(!!fromSel && [...fromSel.options].some(o => o.value === '自动'), '源语言下拉里有「自动」');
    ok(!!toSel && toSel.options.length >= 5, '目标语言下拉列出了多种语言');
    otBox.checked = true;
    fromSel.value = '中文'; toSel.value = 'English';
    w.document.getElementById('csSave').click();
    await sleep(30);
    const ot1 = w.chatCfg(pid).outTrans;
    ok(ot1.on === true && ot1.from === '中文' && ot1.to === 'English', '勾上并保存后记住了：中文 → English');

    // 真发一条：气泡先出原文，译文回来后默认显示译文，且送给模型的是译文
    w.go('chat');
    await sleep(20);
    w.chatCfg(pid).speed = 'fast';
    const realOut = w.translateOut, realReply = w.replyNow;
    let seenOut = null, replyGot = null;
    w.translateOut = (t, from, to, cb) => { seenOut = [t, from, to]; cb('Are you free tonight?'); };
    w.replyNow = (t, cb) => { replyGot = t; };
    w.state.messages.length = 0;
    const inp = w.document.getElementById('chatText');
    inp.value = '你今晚有空吗';
    w.sendMyMessage();
    await sleep(700);
    ok(!!seenOut && seenOut[0] === '你今晚有空吗' && seenOut[1] === '中文' && seenOut[2] === 'English',
       '发送时把这句按「中文 → English」送去翻译');
    const mym2 = w.state.messages.filter(m => m.who === 'me')[0];
    ok(mym2.text === '你今晚有空吗', '气泡上先按原文上屏（不等接口）');
    ok(mym2.translated === 'Are you free tonight?', '译文回来后挂在消息上');
    ok(w.showTranslated[mym2.id] === true, '默认显示译文（点「看原文」能切回中文）');
    ok(replyGot === 'Are you free tonight?', '他收到的是译文，不是原文');
    // 译文没回来（接口不通）时照原文发，不能卡住
    replyGot = null; seenOut = null;
    w.translateOut = (t, from, to, cb) => cb('');
    w.state.messages.length = 0;
    inp.value = '明天见';
    w.sendMyMessage();
    await sleep(700);
    const mym3 = w.state.messages.filter(m => m.who === 'me')[0];
    ok(mym3.text === '明天见' && !mym3.translated, '翻不出来时保留原文');
    ok(replyGot === '明天见', '翻不出来时照样把原话发给他，不会卡住不回');
    w.translateOut = realOut; w.replyNow = realReply;
    // 关掉之后不再翻译
    w.chatCfg(pid).outTrans.on = false;
    seenOut = null; replyGot = null;
    w.translateOut = (t, from, to, cb) => cb('should not happen');
    w.state.messages.length = 0;
    inp.value = '后天见';
    w.sendMyMessage();
    await sleep(700);
    ok(seenOut === null, '关掉开关后不再调翻译');
    const mym4 = w.state.messages.filter(m => m.who === 'me')[0];
    ok(!mym4.translated, '关掉开关后气泡不再挂译文');
    w.translateOut = realOut;

    // ---------- ⑫ 没接图片生成模型：他发的图也是一张「带文字描述的图」 ----------
    w.go('chat'); await sleep(20);
    w.state.messages.length = 0;
    // 模拟「接好了文字模型、但没接图片生成模型」的情况
    w.ensureApis();
    w.state.api.mode = 'api'; w.state.api.url = 'https://api.test/v1'; w.state.api.model = 'm';
    w.state.apis.text.bindings.forEach(b => { b.on = true; });
    const realAskStrict = w.askModelStrict;
    let descSys = '';
    w.askModelStrict = (sys, usr, cb) => { descSys = sys; cb('照片里：傍晚的江边，橘色的天，长椅上趴着两只猫'); };
    // 测试期间不让页面真的联网（下面会针对每种情况换上不同的假接口）
    w.fetch = () => Promise.resolve({ok:false, status:400, text: () => Promise.resolve('{"error":{"message":"stub"}}')});
    const pm = w.pushHisPic('刚看到的');
    await sleep(60);
    ok(pm.type === 'pic' && pm.who === 'him', '他要发图：先出一条图片消息');
    ok(!!pm.desc, '没有图片生成模型时，也生成了画面描述文字');
    ok(pm.desc.indexOf('照片里') !== 0, '描述里多余的「照片里」开头被去掉了');
    ok(/江边/.test(pm.desc), '描述内容本身保留下来');
    ok(/一句话/.test(descSys) && /画面/.test(descSys), '让文字模型写的是「一句话画面描述」');
    w.askModelStrict = realAskStrict;
    w.renderChat();
    const h12 = w.document.getElementById('chatList').innerHTML;
    ok(/class="pl-img"/.test(h12) && /Image loading/.test(h12), '没接图片模型时：图显示成一张「正在加载」的占位图（不再画 canvas 占位卡）');
    ok(h12.indexOf(pm.desc) < 0, '描述默认收着（点图片才展开），不混在图里也不单独冒泡');
    pm.descOpen = true;                 // 相当于用户点了一下图片
    w.renderChat();
    const h12b = w.document.getElementById('chatList').innerHTML;
    ok(h12b.indexOf('class="bubble pic-cap"') >= 0 && h12b.indexOf(pm.desc) > h12b.indexOf('class="bubble pic-cap"'), '点开图片后：描述落在独立的「图说」气泡里');
    // 没接文字模型：用现成的描述兜底，气泡不至于空着
    const pm2 = w.pushMessage('him', '', 'pic', {cap:'给你看看'});
    w.fillHisPic(pm2);
    await sleep(30);
    ok(!!pm2.desc, '连文字模型也没接时，用现成描述兜底');
    // 已经补过图的消息不会再重复生成
    const keepImg = '__x1';
    pm2.img = keepImg; pm2.desc = '旧描述';
    w.fillHisPic(pm2);
    ok(pm2.img === keepImg && pm2.desc === '旧描述', '已经有图的消息不会被重复处理');
    w.state.api.mode = 'local';        // 后面的几段不依赖接口模式，别让页面自己发请求

    // ---------- ⑬ 语音气泡 ↔ 文字：点一下转文字，再点一下转回语音气泡 ----------
    w.state.messages.length = 0;
    const vmv = w.pushMessage('him', '我到楼下了，你慢慢来', 'voice', {dur:5});
    await sleep(20);
    w.renderChat();
    let hv = w.document.getElementById('chatList');
    ok(!!hv.querySelector('[data-voice="' + vmv.id + '"]'), '先显示成语音气泡');
    hv.querySelector('[data-voice="' + vmv.id + '"]').click();
    await sleep(20);
    ok(vmv.open === true, '点语音气泡 → 展开成文字');
    w.renderChat();
    hv = w.document.getElementById('chatList');
    ok(hv.innerHTML.indexOf('我到楼下了') >= 0, '展开后能看到文字内容');
    const backEl = hv.querySelector('[data-vback="' + vmv.id + '"]');
    ok(!!backEl, '展开后的气泡上有「转回语音气泡」');
    backEl.click();
    await sleep(20);
    ok(vmv.open === false, '再点一下 → 变回语音气泡');
    w.renderChat();
    ok(!!w.document.getElementById('chatList').querySelector('[data-voice="' + vmv.id + '"]'), '确实又变回语音气泡了');

    // ---------- ⑭ 接口 400：自动换写法重试，不再一失败就放弃 ----------
    const tcfg = {url:'https://api.test.com/v1', key:'k', model:'m1',
                  params:{temperature:0.8, topP:1, frequencyPenalty:0}};
    const msgs14 = [{role:'system', content:'你是他，性格温柔'}, {role:'user', content:'在吗'}];
    // ① 接口不认 temperature / top_p / frequency_penalty：去掉这些参数就能通
    let calls = [];
    w.fetch = (url, opt) => {
      const b = JSON.parse(opt.body);
      calls.push(b);
      if('temperature' in b){
        return Promise.resolve({ok:false, status:400,
          text: () => Promise.resolve('{"error":{"message":"Unknown parameter: frequency_penalty"}}')});
      }
      return Promise.resolve({ok:true, status:200, json: () => Promise.resolve({choices:[{message:{content:'在呢，怎么了？'}}]})});
    };
    let got14 = null, err14 = null;
    w.callAPI(tcfg, msgs14, (e, t) => { err14 = e; got14 = t; });
    await sleep(80);
    ok(err14 === null && got14 === '在呢，怎么了？', '第一次 400（接口不认参数）→ 自动换写法重试，这次通了');
    ok(calls.length === 2 && !('temperature' in calls[1]) && !('frequency_penalty' in calls[1]),
       '重试时去掉了 temperature / top_p / frequency_penalty 这些可选参数');
    ok(w.API_LOG && w.API_LOG.status === '200' && /降级|才通/.test(w.API_LOG.note || w.API_LOG.msg || ''),
       '接口页的「最近一次请求」记下了这次降级');
    // ② 全都失败：报错里带上接口给的原因，而不是干巴巴一个 400
    calls = [];
    w.fetch = (u, o) => { calls.push(JSON.parse(o.body));
      return Promise.resolve({ok:false, status:400,
        text: () => Promise.resolve('{"error":{"message":"prompt is too long"}}')}); };
    err14 = null;
    w.callAPI(tcfg, msgs14, (e) => { err14 = e; });
    await sleep(80);
    ok(/HTTP 400/.test(String(err14)) && /prompt is too long/.test(String(err14)),
       '报错里带上接口返回的真实原因（HTTP 400 + 原文）');
    ok(calls.length >= 2, '400 会换几种写法重试（不是一次就放弃） calls=' + calls.length);
    ok(calls[calls.length - 1].messages[0].role === 'user', '最后一招：不要 system 角色，全部塞进 user');
    // ③ 鉴权类错误不重试（换了写法也一样错，白等）
    calls = [];
    w.fetch = (u, o) => { calls.push(JSON.parse(o.body));
      return Promise.resolve({ok:false, status:401, text: () => Promise.resolve('no key')}); };
    err14 = null;
    w.callAPI(tcfg, msgs14, (e) => { err14 = e; });
    await sleep(60);
    ok(calls.length === 1, '401（钥匙不对）不重试，直接报');
    // ④ 内容里的半个代理项不会把 JSON 弄坏（老浏览器上会直接 400）
    const bad = w.jsonSafe('你好\uD83D下午');
    ok(bad.indexOf('\uD83D') < 0 && bad === '你好下午', '孤立的半个代理项被清掉了');
    ok(w.safeMsgs([{role:'user', content:''}])[0].content === '（空）', '空内容不会被原样发出去');

    // ---------- ⑮ 同样的接口报错不再一条一个弹窗 ----------
    let toastN = 0;
    const realToast = w.toast;
    w.toast = () => { toastN++; };
    w.noteApiError('接口没通：HTTP 400（bad request）');
    w.noteApiError('接口没通：HTTP 400（bad request）');
    w.noteApiError('接口没通：HTTP 400（bad request）');
    ok(toastN === 1, '同一个报错只弹一次（两分钟内不重复刷屏）');
    w.noteApiError('接口没通：HTTP 401（no key）');
    ok(toastN === 2, '换了一种错才会再弹一次');
    w.toast = realToast;
  } catch(e){ fail++; console.log('  ✗ 抛异常：', e && e.message, e && e.stack && e.stack.split('\n')[1]); }
  console.log('\n==== ' + pass + ' 通过 / ' + fail + ' 失败 ====');
  process.exit(fail ? 1 : 0);
})();
