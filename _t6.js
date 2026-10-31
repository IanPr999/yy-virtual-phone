/* 本轮 6 项需求的回归测试 */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const html = fs.readFileSync('小手机.html', 'utf8');
const scripts = (fs.existsSync('app.js') && /app\.js/.test(html)) ? fs.readFileSync('app.js','utf8') : [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join("\n;\n");

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } }
function sec(t) { console.log('\n[' + t + ']'); }

function boot(pre) {
  const vc = new VirtualConsole();
  const logs = [];
  vc.on('jsdomError', e => logs.push('jsdomError: ' + e.message));
  vc.on('error', (...a) => logs.push('error: ' + a.join(' ')));
  const dom = new JSDOM(html, { url: 'http://localhost:8080/', virtualConsole: vc, runScripts: 'outside-only' });
  const w = dom.window, d = w.document;
  w.requestAnimationFrame = cb => setTimeout(() => cb(Date.now()), 0);
  w.scrollTo = () => {};
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  const store = {};
  w.indexedDB = {
    open() {
      const r = { onsuccess: null, onerror: null, onupgradeneeded: null };
      setTimeout(() => { r.onsuccess && r.onsuccess({ target: { result: { objectStore() { return { createIndex() {} }; } } } }); }, 0);
      return r;
    }
  };
  w.URL.createObjectURL = () => 'blob:test';
  w.URL.revokeObjectURL = () => {};
  for (const k in (pre || {})) w.localStorage.setItem('xp.' + k, JSON.stringify(pre[k]));
  w.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}), text: () => Promise.resolve('{}'), blob: () => Promise.resolve(new w.Blob(['x'], { type: 'image/png' })) });
  try { w.eval(scripts); } catch (e) { logs.push('EVAL: ' + e.message); }
  return { w, d, logs };
}

/* ============ 1. 查手机：真机比例 + 定高 ============ */
sec('1. 查手机仿真手机比例');
{
  const css = html.match(/\/\* 查手机[\s\S]*?\/\* 购物：商品卡 \*\//)[0];
  ok(/aspect-ratio:9\/19\.5/.test(css), '.cp-screen 用了 9:19.5 的真机比例');
  ok(/\.cp-content\{flex:1 1 auto;min-height:0;/.test(css), '.cp-content 吃掉剩余高度并可滚动');
  ok(!/max-height:min\(46vh/.test(css), '不再用随视口变化的 max-height（高度不跟内容走）');
  ok(/\.cp-dev\{[^}]*box-sizing:border-box/.test(css.replace(/\s*\n\s*/g, '')), '.cp-dev 带 box-sizing');

  const { w, logs } = boot();
  // 造一个联系人，进查手机
  try {
    w.go('check');
    if (!w.wxAllFriends().length) {
      w.state.personas.push({ id: 'PT1', name: '阿城', netId: '', social: '', gender: '男', age: 26, wxName: '城懿' });
      w.state.curPersona = 'PT1'; w.state.persona = w.state.personas[0];
      w.ensureWx();
      w.state.wx.friends = [{ pid: 'PT1', remark: '', ts: Date.now() }];
      w.wxSave();
      w.go('check');
    }
    w.checkState.key = 'p:PT1'; w.checkState.name = '阿城'; w.checkState.tab = 'home';
    w.renderCheck();
    const scr = w.document.querySelector('.cp-screen');
    ok(!!scr, '渲染出了 .cp-screen');
    ok(!!w.document.querySelector('.cp-dev'), '有手机外壳 .cp-dev');
    ok(!!w.document.querySelector('.cp-notch'), '有听筒');
    ok(!!w.document.querySelector('.cp-homebar'), '有底部 home 条');
    // 内容再长，机身结构也不变：切到内容最多的「微信」页
    w.checkState.tab = 'wx'; w.renderCheck();
    ok(!!w.document.querySelector('.cp-screen'), '切到微信页后屏幕仍在');
    const c = w.document.querySelector('.cp-content');
    ok(!!c && /overflow-y:auto/.test(html.match(/\.cp-content\{[^}]*\}/)[0]), '内容在屏幕内滚动');
    ok(logs.filter(l => /EVAL|jsdomError/.test(l)).length === 0, '渲染无报错');
  } catch (e) { ok(false, '查手机渲染抛错：' + e.message); }
}

/* ============ 2. 聊天「＋」发图 / 表情包 ============ */
sec('2. 聊天输入框的「＋」');
{
  const { w, d, logs } = boot();
  ok(!!d.getElementById('chatPlus'), 'DOM 里有 #chatPlus 按钮');
  ok(!!d.getElementById('chatPlusPanel'), 'DOM 里有 #chatPlusPanel');
  const css = html;
  ok(/#chatPlusPanel\.show\{display:block/.test(css), '面板有 show 样式');
  ok(/body\.kb-on #wxDock\{display:none;\}/.test(css), '键盘弹出时功能条也收起');
  // 点「＋」展开
  w.go('call'); w.wxShowPane('msg');
  const plus = d.getElementById('chatPlus');
  plus.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const panel = d.getElementById('chatPlusPanel');
  ok(panel.classList.contains('show'), '点「＋」后面板展开');
  const cells = panel.querySelectorAll('[data-cplus]');
  ok(cells.length === 9, '面板里有 9 个格子（图片/相册/表情包/拍一张/转账/位置/语音通话/视频通话/一起听），实际 ' + cells.length);
  // 再点一次收起
  plus.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ok(!panel.classList.contains('show'), '再点一次「＋」收起');
  // 发图：直接验证消息类型与渲染
  w.state.curPersona = 'PIDX';
  const m = w.pushMessage('me', '', 'pic', { img: 'IMG1', cap: '照片' });
  ok(m.type === 'pic' && m.img === 'IMG1', '消息带上了图片 id');
  w.imgCache['IMG1'] = 'blob:fake';
  w.renderChat();
  ok(/<img class="cimg"/.test(d.getElementById('chatList').innerHTML), '带图的 pic 渲染成真图片 <img class="cimg">');
  // 没有 img 的 pic 还是虚拟图（渲染成「正在加载」占位块，不与文字混泡）
  w.pushMessage('me', '', 'pic', { cap: '一张图' });
  w.renderChat();
  ok(/pl-img|Image loading/.test(d.getElementById('chatList').innerHTML), '不带 img 的 pic 渲染成「正在加载」占位块（虚拟图）');
  // 表情包入口
  w.ensureWx();
  w.state.wx.stickers = [{ id: 'S1', name: '日常篇', items: ['STK1'], allow: {} }];
  w.imgCache['STK1'] = 'blob:stk';
  w.openStickerPicker();
  ok(/cpstk/.test(d.getElementById('modalBox').innerHTML), '表情包选择器列出了图');
  ok(logs.filter(l => /EVAL|jsdomError/.test(l)).length === 0, '无脚本报错');
}

async function t3() {
  /* ============ 3. 存图到「他的相册」 ============ */
  sec('3. 聊天图片存进他的相册');
  {
  const { w, d, logs } = boot();
  w.state.curPersona = 'P9';
  w.imgCache['IMG9'] = 'blob:nine';
  const m = w.pushMessage('me', '', 'pic', { img: 'IMG9', cap: '晚饭' });
  await (async function () {
    w.saveMsgToHisAlbum(m);
    await new Promise(res => setTimeout(res, 60));
    const list = (w.state.hisPics && w.state.hisPics['P9']) || [];
    ok(list.length === 1, '存进去后他的相册多了一张，实际 ' + list.length);
    ok(String(list[0]).indexOf('__hisp_') === 0, '存的图带 __hisp_ 前缀（不会混进我的相册）');
    // 查手机 → 图片 里能看到
    w.ensureWx();
    w.state.personas = [{ id: 'P9', name: '阿城', netId: '', social: '' }];
    w.checkState.key = 'p:P9'; w.checkState.name = '阿城'; w.checkState.tab = 'photo';
    w.renderCheck();
    const root = d.getElementById('checkRoot').innerHTML;
    ok(/他存下来的/.test(root), '查手机相册里有「他存下来的」这一块');
    ok(/class="cp-pic"><img/.test(root), '存的图在相册里显示成真图');
    // 气泡菜单里有「存进他的相册」
    w.openBubbleMenu(d.getElementById('chatList') || d.body, m);
    ok(/data-bact="save"/.test(d.getElementById('bubbleMenu').innerHTML), '气泡菜单有「存进他的相册」按钮');
    ok(logs.filter(l => /EVAL|jsdomError/.test(l)).length === 0, '无脚本报错');
  })();
  }
}

/* ============ 4. 查手机桌面可编辑 ============ */
sec('4. 查手机桌面可换（相册 / 模型生成）');
{
  const { w, d, logs } = boot();
  w.state.personas = [{ id: 'PW', name: '阿城', netId: '', social: '' }];
  w.checkState.key = 'p:PW'; w.checkState.name = '阿城'; w.checkState.tab = 'home';
  w.renderCheck();
  ok(!!d.getElementById('ckWall'), '有「换他的桌面」按钮');
  // 样式：有 wallImg 时用真图
  const d0 = w.checkData('p:PW', '阿城');
  ok(/background:/.test(w.checkWallStyle(d0)), '默认还是渐变背景');
  w.imgCache['WID'] = 'blob:wall';
  d0.wallImg = 'WID';
  ok(/background-image:url\('blob:wall'\)/.test(w.checkWallStyle(d0)), '设了 wallImg 后用真图铺满');
  // 打开编辑器
  w.openCheckWallEditor();
  const mb = d.getElementById('modalBox').innerHTML;
  ok(/ckWallPrompt/.test(mb), '编辑器里有提示词输入框');
  ok(/ckWallGen/.test(mb), '编辑器里有「生成一张」');
  ok(/从他的相册选/.test(mb), '编辑器里有「从他的相册选」');
  ok(/恢复默认/.test(mb), '编辑器里有「恢复默认」');
  // 恢复默认
  w.setCheckWall('');
  ok(!w.checkData('p:PW', '阿城').wallImg, '恢复默认后 wallImg 被清掉');
  // 用相册选
  w.state.hisPics = { PW: ['WID'] };
  w.openCheckWallAlbum(['WID']);
  ok(/name="ckw"/.test(d.getElementById('modalBox').innerHTML), '相册选择器列出了他的图');
  // 模型生成：没填地址时给出提示，不报错
  let toasted = [];
  const ot = w.toast; w.toast = m => toasted.push(m);
  w.genCheckWall('一张壁纸');
  w.toast = ot;
  ok(toasted.some(t => /接口/.test(t)), '没配图片模型时提示去填接口，不静默失败');
  ok(logs.filter(l => /EVAL|jsdomError/.test(l)).length === 0, '无脚本报错');
}

/* ============ 5. 好友圈红点 ============ */
sec('5. 好友圈红点');
{
  const { w, d, logs } = boot();
  w.ensureWx();
  w.localStorage.removeItem('xp.wxCircleSeen');
  const now = Date.now();
  const myId = (w.curIdentity() || {}).id || '_';
  w.state.wx.posts = [{ id: 'P1', ts: now - 60000, text: '新动态', identityId: myId, likes: 0, comments: [] }];
  w.wxSave();
  w.go('call'); w.wxShowPane('main');
  w.renderWxDots();
  ok(d.getElementById('wxDotCircle').className.indexOf('on') >= 0, '有新动态时红点亮着');
  // 点进好友圈
  w.wxShowPane('circle');
  ok(d.getElementById('wxDotCircle').className.indexOf('on') < 0, '点进好友圈后红点消失');
  // 之后又来一条新的 → 红点再亮
  w.state.wx.posts.unshift({ id: 'P2', ts: Date.now(), text: '更新的', identityId: myId, likes: 0, comments: [] });
  w.renderWxDots();
  ok(d.getElementById('wxDotCircle').className.indexOf('on') >= 0, '看完之后又有新动态 → 红点再亮');
  // 再点进去 → 又消失
  w.wxShowPane('circle');
  ok(d.getElementById('wxDotCircle').className.indexOf('on') < 0, '再点进去又消失');
  ok(logs.filter(l => /EVAL|jsdomError/.test(l)).length === 0, '无脚本报错');
}

/* ============ 6. 输入法弹出时收起底部功能条 ============ */
sec('6. 输入法弹出时收起底部功能条');
{
  const { w, d, logs } = boot();
  ok(/body\.kb-focus #wxDock\{display:none;\}/.test(html), 'CSS 里有 kb-focus 收起功能条的规则');
  w.go('call'); w.wxShowPane('msg');
  const ta = d.getElementById('chatText');
  ok(!d.body.classList.contains('kb-focus'), '一开始没有 kb-focus');
  ta.dispatchEvent(new w.FocusEvent('focusin', { bubbles: true }));
  ok(d.body.classList.contains('kb-focus'), '输入框聚焦 → body 挂上 kb-focus（功能条收起）');
  ta.dispatchEvent(new w.FocusEvent('focusout', { bubbles: true }));
  ok(!d.body.classList.contains('kb-focus'), '失焦 → kb-focus 移除，功能条回来');
  // 量不出键盘高度时也有兜底：只认触摸设备
  w.APP_H = 800; w.kbFocus = true;
  Object.defineProperty(w.navigator, 'maxTouchPoints', { value: 5, configurable: true });
  w.updateKeyboardInset();
  ok(w.KB_H > 0, '量不到键盘时在触摸设备上给了兜底高度，实际 ' + w.KB_H);
  w.kbFocus = false;
  Object.defineProperty(w.navigator, 'maxTouchPoints', { value: 0, configurable: true });
  w.updateKeyboardInset();
  ok(w.KB_H === 0, '没聚焦时不会乱给键盘高度（桌面端不受影响）');
  ok(logs.filter(l => /EVAL|jsdomError/.test(l)).length === 0, '无脚本报错');
}

(async function () {
  await t3();
  console.log('\n==== ' + pass + ' 通过 / ' + fail + ' 失败 ====');
  process.exit(fail ? 1 : 0);
})();
