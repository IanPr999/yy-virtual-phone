/* 回归：语音 / 视频通话窗口 + 人设串台修复
   ① 从「＋」发起语音通话 → 弹窗（深灰底 + 头像 + 微信名 + 接通/挂断）并自动接通
   ② 通话中可加字幕（他说 / 我说），挂断后窗口关闭并写入通话记录
   ③ 视频通话：有人设外貌参考图且未接视频模型 → 背景显示参考图；有视频模型则走生成
   ④ 来电（role=in）只亮「接通」，不会自动接通，需手动 answerCall
   ⑤ 人设串台修复：buildSystemPrompt 按 pid 取人设，不会用当前选中的另一张卡 */
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
const cls = () => w.document.getElementById('callWin').className;

(async function(){
  try {
    w.go('call'); w.ensureWx(); w.ensurePersonas(); w.ensureApis();
    await sleep(20);

    // ---------- ① 语音通话弹窗 + 自动接通 ----------
    if(!w.state.persona) w.ensurePersonas();
    w.state.persona.name = '阿测';
    const callsBefore = w.state.calls.length;
    w.startCall('voice');
    await sleep(10);
    ok(cls().includes('show'),        '语音通话：窗口弹出（show）');
    ok(cls().includes('voice'),        '语音通话：窗口是语音模式');
    ok(cls().includes('ringing'),      '语音通话：初始为响铃（未接通）');
    ok(w.document.getElementById('cwName').textContent === '阿测', '窗口显示微信名 = 人设名');
    ok(/avatar|img/i.test(w.document.getElementById('cwFace').innerHTML), '窗口显示他的头像');
    w.connectCall();                   // 手动触发接通，跳过自动计时
    await sleep(10);
    ok(cls().includes('connected') && !cls().includes('ringing'), '接通后：connected 且不再 ringing');

    // ---------- ② 字幕 + 挂断 ----------
    w.appendCallSub('him', '在呢，怎么了');
    w.appendCallSub('me', '想你了');
    const subs = w.document.getElementById('cwSubs');
    ok([...subs.querySelectorAll('.cw-line')].some(e => e.textContent === '在呢，怎么了'), '字幕：他说的话出现');
    ok([...subs.querySelectorAll('.cw-line.me')].some(e => e.textContent === '想你了'), '字幕：我说的话出现（me 样式）');
    w.endCall();
    await sleep(10);
    ok(!cls().includes('show'),        '挂断后：窗口关闭（无 show）');
    ok(w.state.calls.length === callsBefore + 1, '挂断后：写入一条通话记录');
    ok(w.state.calls[0].type === '语音通话', '通话记录类型 = 语音通话');

    // ---------- ③ 视频通话 + 参考图背景 ----------
    w.ensurePersonas();
    w.state.persona.refImgs = ['rTest'];
    w.imgCache['rTest'] = 'data:image/png;base64,AAAA';
    w.startCall('video');
    await sleep(10);
    ok(cls().includes('video'),        '视频通话：窗口是视频模式');
    const bg = w.document.getElementById('cwBg');
    ok((bg.style.backgroundImage || '').includes('data:image/png'), '视频通话：未接视频模型时背景显示参考图');
    w.endCall();
    await sleep(10);

    // ---------- ④ 来电：只亮接通，不自动接通 ----------
    w.openCallWin('voice', 'in', w.state.persona, null);
    await sleep(10);
    ok(cls().includes('ringing') && !cls().includes('connected'), '来电：初始响铃、未接通');
    w.answerCall();
    await sleep(10);
    ok(cls().includes('connected'),    '来电：点接通后进入 connected');
    w.endCall();

    // ---------- ⑤ 人设串台修复 ----------
    w.ensurePersonas();
    const pa = w.state.personas[0] || w.state.persona;
    const pb = (w.state.personas[1]) || (function(){ const n = {id:'__pb', name:'乙同学', tone:'专属B语气'}; w.state.personas.push(n); return n; })();
    pa.tone = '专属A语气'; pb.tone = '专属B语气';
    const sysB = w.buildSystemPrompt('', pb.id);
    ok(sysB.includes('专属B语气'),     'buildSystemPrompt(按 pid)：含目标人设语气');
    ok(!sysB.includes('专属A语气'),    'buildSystemPrompt(按 pid)：不含另一张卡的语气（不再串台）');
    // recentContext 也按 pid 过滤
    const rc = w.recentContext(pb.id);
    ok(typeof rc === 'string',         'recentContext(pid) 返回字符串');

    // ---------- ⑥ 通话中输入框发送（callSay）：文字出现 / 输入框清空 / 触发模型回话 ----------
    w.ensurePersonas();
    w.startCall('voice');
    await sleep(10);
    w.connectCall();
    await sleep(10);
    const inp6 = w.document.getElementById('cwInput');
    const say6 = w.document.getElementById('cwSay');
    ok(!!inp6 && !!say6, '通话：输入框与发送按钮存在');
    // cwSay 指向的是发送按钮（不再与「一起看」状态 div 的 id 撞车）
    ok(say6 && say6.tagName === 'BUTTON', '通话：cwSay 确实是按钮（无重复 id 串台）');
    inp6.value = '喂，你在干嘛';
    say6.dispatchEvent(new w.Event('click'));   // 点「说」发送
    await sleep(20);
    const subs6 = w.document.getElementById('cwSubs');
    ok([...subs6.querySelectorAll('.cw-line.me')].some(e => e.textContent === '喂，你在干嘛'), '通话：用户输入的文字出现在字幕（me）');
    ok(inp6.value === '', '通话：发送后输入框清空');
    w.endCall();
    await sleep(10);

    // ---------- ⑦ 不再自动刷屏：接通后干坐着，他不会自己一直说 ----------
    w.ensurePersonas();
    w.startCall('voice');
    await sleep(10);
    w.connectCall();
    await sleep(30);
    const subs7 = w.document.getElementById('cwSubs');
    const n7a = subs7.querySelectorAll('.cw-line').length;
    ok(n7a >= 1, '通话：接通后有一句开场白');
    ok(!(w.callState && w.callState.talkTimer), '通话：接通后不再挂自动对答计时器（不自我循环）');
    await sleep(1200);
    const n7b = subs7.querySelectorAll('.cw-line').length;
    ok(n7b === n7a, '通话：停留 1.2s 没有新增重复对话（n=' + n7a + '→' + n7b + '）');

    // ---------- ⑧ 空输入点「说」＝ 让他说一句，只回一条 ----------
    const inp8 = w.document.getElementById('cwInput');
    const say8 = w.document.getElementById('cwSay');
    inp8.value = '';
    say8.dispatchEvent(new w.Event('click'));
    await sleep(40);
    const n8a = subs7.querySelectorAll('.cw-line').length;
    ok(n8a === n7b + 1, '通话：空输入点「说」→ 他多说了一句（' + n7b + '→' + n8a + '）');
    await sleep(1200);
    const n8b = subs7.querySelectorAll('.cw-line').length;
    ok(n8b === n8a, '通话：空输入只触发一次，不会连环刷屏');

    // ---------- ⑨ 「说」按钮是线性图标 ----------
    if(w.fillIcons) w.fillIcons();
    ok(say8.querySelector('svg.ln'), '通话：发送按钮是线性 SVG 图标');
    ok(say8.textContent.trim() === '', '通话：发送按钮不再显示「说」字');
    inp8.value = '有字了';
    inp8.dispatchEvent(new w.Event('input'));
    ok(say8.getAttribute('title') === '发送', '通话：输入框有字时图标切到「发送」');
    inp8.value = '';
    inp8.dispatchEvent(new w.Event('input'));
    ok(say8.getAttribute('title') === '让他说一句', '通话：输入框清空后图标切回「让他说一句」');

    // ---------- ⑩ 挂断 → 聊天里留一条「你们结束了语音通话」 ----------
    const msgCountBefore = w.state.messages.length;
    w.endCall();
    await sleep(10);
    const tail = w.state.messages[w.state.messages.length - 1];
    ok(w.state.messages.length === msgCountBefore + 1, '挂断：聊天里新增一条系统提示');
    ok(tail && tail.who === 'sys' && tail.text === '（你们结束了语音通话）', '挂断：提示文案 =「（你们结束了语音通话）」');

    // ---------- ⑪ 视频通话挂断 →「你们结束了视频通话」 ----------
    w.startCall('video');
    await sleep(10);
    w.connectCall();
    await sleep(20);
    w.endCall();
    await sleep(10);
    const tail2 = w.state.messages[w.state.messages.length - 1];
    ok(tail2 && tail2.who === 'sys' && tail2.text === '（你们结束了视频通话）', '视频挂断：提示文案 =「（你们结束了视频通话）」');

    // ---------- ⑫ 头像不再有白色方框（真凶＝说话脉冲的 12px box-shadow 扩散环） ----------
    const faceEl = w.document.getElementById('cwFace');
    const cs = w.getComputedStyle(faceEl);
    const bgc = cs.backgroundColor || '';
    ok(bgc === 'transparent' || bgc === 'rgba(0, 0, 0, 0)' || bgc === '', '头像：容器没有浅色底（白框已去掉）');
    ok(cs.borderRadius === '50%', '头像：容器仍为正圆');
    ok(cs.overflow === 'hidden', '头像：容器 overflow 裁切');
    // 关键：容器绝对不能有 box-shadow —— iOS Safari 不会按圆角裁这颗阴影，12px 扩散环会画成方形
    ok(!cs.boxShadow || cs.boxShadow === 'none', '头像：容器没有 box-shadow（方形边框的真正来源已移除）');
    // clip-path 硬裁圆，比单靠 border-radius + overflow 更可靠（jsdom 不解析 clip-path，改查源码）
    const src = fs.readFileSync('小手机.html', 'utf8');
    ok(/\.cw-face\{[^}]*clip-path:circle/.test(src.replace(/\r/g, '')), '头像：容器用 clip-path 裁成正圆');
    // 说话脉冲必须是 transform，不能再用 box-shadow 做扩散环
    const pulseBlock = (src.match(/@keyframes cwPulse\{[\s\S]*?\}\s*\n/) || [''])[0];
    ok(/transform\s*:\s*scale/.test(pulseBlock), '头像：说话脉冲改用 transform:scale');
    ok(!/box-shadow/.test(pulseBlock), '头像：说话脉冲不再用 box-shadow 扩散环');
    // cw-face 整段样式（含 img / avatar / 脉冲）里不得再出现任何 box-shadow
    const faceCss = (src.replace(/\r/g, '').match(/#callWin \.cw-face\{[\s\S]*?@keyframes cwPulse\{[\s\S]*?\}\n/) || [''])[0];
    ok(faceCss && !/box-shadow/.test(faceCss), '头像：cw-face 相关样式里没有任何 box-shadow');

    // ---------- ⑬ 语音通话只写「听得到」的内容，不写看得见的动作 ----------
    const vp = w.callSystemPrompt(w.state.persona, 'voice');
    ok(/语音通话中/.test(vp) && /看不见对方/.test(vp), '语音提示词：明确「只能听见声音、看不见对方」');
    ok(/悉悉索索|嘈杂|窗外|雨声|呼吸声|椅子/.test(vp), '语音提示词：允许声音旁白（悉悉索索 / 嘈杂 …）');
    ok(/不要写.*神态|不要写.*表情/.test(vp), '语音提示词：禁止神态 / 表情等视觉描写');
    const videoP = w.callSystemPrompt(w.state.persona, 'video');
    ok(/视频通话中/.test(videoP), '视频提示词：仍走「视频通话」分支');
    // 安全网：视觉旁白整段删，声音旁白保留
    const t1 = w.voiceTextOnly('（屏幕那头的金发少年愣了一下，耳尖红透，对着镜头凑近）Babe 你在吗？');
    ok(t1 === 'Babe 你在吗？' || t1 === 'Babe你在吗？', '语音清洗：视觉描写（耳尖红透/镜头）被删干净，只留对话');
    const t2 = w.voiceTextOnly('（那头传来悉悉索索翻找东西的声响）稍等我一下');
    ok(/悉悉索索/.test(t2), '语音清洗：声音旁白（悉悉索索）完整保留');
    const t3 = w.voiceTextOnly('（周围有点嘈杂）（椅子挪动了一下）听得到吗');
    ok(/嘈杂/.test(t3) && /椅子/.test(t3), '语音清洗：环境声描写保留');

  } catch(e){ fail++; console.log('  ✗ 异常：' + (e && e.stack || e)); }

  console.log('\n通话/人设 回归：' + pass + ' 通过，' + fail + ' 失败');
  process.exit(fail ? 1 : 0);
})();
