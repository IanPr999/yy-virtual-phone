/* StarHub 实时语音通话 SPEC v1 —— 浏览器侧实现的单元测试 */
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
w.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data: [] }), text: () => Promise.resolve('{}'), arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) });
try { w.eval(scripts); } catch (e) { errs.push('EVAL: ' + e.message); console.log('EVAL ERR', e.message); }

/* ---- 1 稳定句切分 ---- */
const U = w.callSplitUnits('第一句。第二句！第三句？');
ok(U.length === 3 && U[0] === '第一句。' && U[2] === '第三句？', '按句末标点切成 3 句：' + JSON.stringify(U));

// 未闭合的括号不能把句子切开（括号里出现句号也不算成句）
const U2 = w.callSplitUnits('他说（那头有声音。很吵）。然后说完了。');
ok(U2.length === 2 && U2[0].indexOf('很吵') >= 0 && U2[0].indexOf('然后') < 0,
   '括号内的句号不切句：' + JSON.stringify(U2));

// 结尾不成句的残尾也要放出来（不能吞掉）
const U3 = w.callSplitUnits('这一句没有标点');
ok(U3.length === 1 && U3[0] === '这一句没有标点', '无标点残尾照常发布');

// 英文句点 + 空格才算断句，小数点不能被切开
const U4 = w.callSplitUnits('It costs 3.50 dollars. Next one.');
ok(U4.length === 2 && U4[0].indexOf('3.50') >= 0, '小数点不误切：' + JSON.stringify(U4));

// 换行也算句边界
const U5 = w.callSplitUnits('第一行\n第二行');
ok(U5.length === 2, '换行切句');

/* ---- 2 双语 EN/ZH 解析（规格第 8 节） ---- */
function feedAll(text) {
  const p = new w.CallPairParser();
  return p.feed(text).concat(p.finish());
}
const P = feedAll('EN: Take your time.\nZH: 慢慢来。\nEN: I am listening.\nZH: 我在听。\n');
ok(P.length === 2 && P[0].en === 'Take your time.' && P[0].zh === '慢慢来。' &&
   P[1].en === 'I am listening.' && P[1].zh === '我在听。', '成对解析 EN/ZH：' + JSON.stringify(P));

// 半行不能提前发布：只有读到下一条完整 EN 行才释放前一组
const p2 = new w.CallPairParser();
const half = p2.feed('EN: Take your time.\nZH: 慢慢');
ok(half.length === 0, 'ZH 未写完时不发布');
const rest = p2.feed('来。\n');
ok(rest.length === 0, 'ZH 补齐后仍要等下一条 EN 才释放前一组：' + rest.length);
const last = p2.finish();
ok(last.length === 1 && last[0].zh === '慢慢来。', 'finish 时释放最后一组：' + JSON.stringify(last));

// 缺 ZH 必须显式失败，不能静默猜测
let threw = false;
try { const p3 = new w.CallPairParser(); p3.feed('EN: A\nEN: B\nZH: b\n'); p3.finish(); }
catch (e) { threw = true; }
ok(threw, '缺少 ZH 时协议错误显式失败');

// finish 只能调用一次
const p4 = new w.CallPairParser(); p4.feed('EN: a\nZH: 甲\n'); p4.finish();
ok(p4.finish().length === 0, 'finish 只能调用一次');

/* ---- 3 合成文本 speech_text（旁白不念） ---- */
const S = w.callSpeechText('（那头传来悉悉索索的声响）我在找耳机。');
ok(S === '我在找耳机。' && S.indexOf('悉悉索索') < 0, '旁白不进合成：' + S);
ok(w.callSpeechText('[laugh]你好啊') === '你好啊', '声音标签不进合成');

/* ---- 4 单元构造 ---- */
const UZ = w.callUnitsOf('（轻轻叹了口气）我没事。你呢？', 'zh');
ok(UZ.length === 2 && UZ[0].show.indexOf('轻轻叹了口气') >= 0 && UZ[0].speech.indexOf('轻轻叹了口气') < 0,
   '字幕保留旁白、合成去掉旁白：' + JSON.stringify(UZ.map(u => [u.show, u.speech])));

const UB = w.callUnitsOf('EN: Take your time.\nZH: 慢慢来。\n', 'bi');
ok(UB.length === 1 && UB[0].speech === 'Take your time.' && UB[0].zh === '慢慢来。',
   '双语：只合成 EN，ZH 只当释义：' + JSON.stringify(UB));

// 双语协议不对 → 退回普通切句，不静默猜测
const UBad = w.callUnitsOf('这是一段没有标记的话。第二句。', 'bi');
ok(UBad.length === 2 && !UBad[0].zh, '双语格式不对时退回普通切句');

/* ---- 5 背压：最多领先已播完两句（wait_credit） ---- */
const A = w.callAudioGet();
A.canceled = false; A.turn++; A.units = [1,2,3,4,5].map(i => ({ show:'s'+i, speech:'s'+i, zh:'' }));
A.idx = 0; A.acked = 0; A.inflight = 0; A.done = {};
let started = [];
const realOne = w.callAudioOne;
w.callAudioOne = function(a, k, u) { started.push(k); a.idx = Math.max(a.idx, k); a.inflight++; };
w.callAudioPump(A);
ok(started.length === 2 && started[0] === 1 && started[1] === 2, 'ack=0 时只放行到第 2 句（credit=2）：' + JSON.stringify(started));
started = [];
A.acked = 2; A.inflight = 0;   // 前两句已播完、合成任务也已结束
w.callAudioPump(A);
ok(started.join(',') === '3,4', 'ack=2 后放行到第 4 句：' + JSON.stringify(started));
w.callAudioOne = realOne;

/* ---- 6 已播完确认只能单调前进，不能回退 ---- */
A.done = {}; A.acked = 0;
A.done[2] = true; w.callAudioAckAdvance(A);
ok(A.acked === 0, '跳号（第 2 句先到）不推进 acked');
A.done[1] = true; w.callAudioAckAdvance(A);
ok(A.acked === 2, '补齐第 1 句后一次性推进到 2：' + A.acked);

/* ---- 6b 合成返回顺序颠倒时也要按句号顺序上时间轴 ---- */
const B = w.callAudioGet();
B.canceled = false; B.turn++; B.units = [{show:'a',speech:'a'},{show:'b',speech:'b'}];
B.idx = 2; B.acked = 0; B.inflight = 0; B.done = {}; B.nextK = 1; B.ready = {};
let seq = [];
const realSched = w.callAudioSchedule;
w.callAudioSchedule = function(a, k) { seq.push(k); };
B.ready[2] = {}; w.callAudioFlush(B);          // 第 2 句先合成好
ok(seq.length === 0, '第 2 句先好也不抢播（等第 1 句）：' + JSON.stringify(seq));
B.ready[1] = {}; w.callAudioFlush(B);          // 第 1 句到齐
ok(seq.join(',') === '1,2', '补齐后严格按 1→2 排程：' + JSON.stringify(seq));
w.callAudioSchedule = realSched;

/* ---- 7 挂断取消：置 canceled、迟到回调作废 ---- */
w.callAudioCancel();
ok(A.canceled === true && A.nodes.length === 0 && A.units.length === 0 && A.pending === 0,
   '挂断后清空播放状态');
const turnBefore = A.turn;
w.callAudioCancel();
ok(A.turn === turnBefore + 1, '每次取消都会作废一轮（turn++）');

/* ---- 8 语言快照：本轮开始时定下来 ---- */
ok(typeof w.callLangOf() === 'string' && w.callLangOf().length > 0, 'callLangOf 返回语言');
w.state.settings.callLang = 'bi';
ok(w.callLangInstruction().indexOf('EN:') >= 0 && w.callLangInstruction().indexOf('ZH:') >= 0, '双语时给出 EN/ZH 行标记格式');
w.state.settings.callLang = 'en';
ok(w.callLangInstruction().indexOf('英文') >= 0, '英文时给出输出语言指令');
w.state.settings.callLang = 'zh';
ok(w.callLangInstruction() === '', '中文时不加额外语言指令');

/* ---- 9 自然人声合成规范（第 10 节） ---- */
w.state.settings.callVoiceSpec = true;
const ins = w.callVoiceInstructions({ age: 24, likes: '温柔' });
ok(ins.indexOf('换气') >= 0 && ins.indexOf('停顿') >= 0 && ins.indexOf('声调') >= 0, '发音指导含换气/停顿/声调：' + ins.slice(0, 40));
w.state.settings.callVoiceSpec = false;
ok(w.callVoiceInstructions({}) === '', '关掉后不送发音指导');

/* ---- 10 字幕不再重复：连接通话时只由 speakCallLine 负责字幕 ---- */
ok(/speakCallLine\(line\);\s*\/\/ 字幕/.test(scripts) || scripts.split('speakCallLine(line);').length >= 3,
   '通话三处入口都改走 speakCallLine');

console.log('断言 ' + pass + ' / 失败 ' + fail + ' / jsdom 错误 ' + errs.length);
if (errs.length) console.log(errs.slice(0, 5));
process.exit(fail || errs.length ? 1 : 0);
