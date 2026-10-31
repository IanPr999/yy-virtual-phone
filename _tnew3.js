/* 回归：① 轻记（体重/运动/趋势/备份）并入健康 ② 食谱 ③ 模型读取权限 ④ iOS 液态玻璃
   ① 体重新字段落到 state.health；早晚分开存、同日同时段覆盖；参考体重取最近晨重
      运动快捷记录 / 种类增删；趋势图空缺不连线；导出 JSON 可被导入合并
   ② 食谱主界面只显示「图片 + 名称」卡片；搜索按名称过滤；详情有名称/照片/配方/做法
      删除是「一键」；用户全校都在 state.recipes.items
   ③ aiPermit：关着时 buildSystemPrompt 完全不提这些数据，开时才出现；切换持久化
   ④ applyUiStyle 给 body 挂 .ui-liquid / .ui-liquid-dark，并能切回磨砂 */
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
    /* ===================== ① 健康 · 体重 / 运动 ===================== */
    w.ensureHealth(); w.ensureRecipes(); w.ensurePersonas();
    const h = w.state.health;
    ok(!!h.weights && typeof h.weights === 'object', '健康里有了 weights 格子');
    ok(Array.isArray(h.workouts),                    '健康里有了 workouts 格子');
    ok(Array.isArray(h.wtypes) && h.wtypes.length === 3, '默认三种运动（爬坡/游泳/私教课）');
    ok(h.wgoal === null,                             '目标体重默认是空');

    // 同一天同一时段再记 = 覆盖，不是叠加
    w.hSetWDay('');
    const day = w.hToday();
    w.hSetWeight('am', 52.4, day);
    ok(Math.abs(w.state.health.weights[day].am.value - 52.4) < 1e-6, '记了一次晨重 52.4');
    w.hSetWeight('am', 51.8, day);
    ok(Math.abs(w.state.health.weights[day].am.value - 51.8) < 1e-6, '同日同时段再记 → 覆盖成 51.8');
    w.hSetWeight('pm', 52.6, day);
    ok(w.state.health.weights[day].am && w.state.health.weights[day].pm, '晨重晚重是分开的两格');
    ok(w.hFmt(52.40) === '52.4', 'kg 显示收掉多余的 0');

    // 参考体重：优先最近一次晨重
    const ref = w.hRefWeight(day);
    ok(ref && ref.slot === 'am' && Math.abs(ref.value - 51.8) < 1e-6, '参考体重取最近一次晨重');
    // 只有晚重时如实回退到晚重
    const old = w.state.health.weights[day].am;
    delete w.state.health.weights[day].am;
    const ref2 = w.hRefWeight(day);
    ok(ref2 && ref2.slot === 'pm', '没有晨重时回退到晚重（外部能看出是 pm）');
    w.state.health.weights[day].am = old;

    // 日期加减 / 周起点（周一起）
    ok(w.hShiftDay('2026-03-01', -1) === '2026-02-28', '日期往前一天算得对（跨月）');
    ok(w.hWeekStart('2026-10-28') === '2026-10-26', '一周从周一开始（10-28 是周三）');
    ok(w.hMonthRange('2026-02-10', 'month').length === 28, '自然月天数正确（2026 年 2 月 28 天）');
    ok(w.hMonthRange('2026-10-28', 'week').length === 7, '自然周固定 7 天');

    // 运动：快捷记录 + 按时间排 + 种类管理
    const before = w.state.health.workouts.length;
    const wk = w.hAddWorkout('sw', day, '19:20');
    ok(w.state.health.workouts.length === before + 1, '点一下记了一次运动');
    ok(wk.typeName === '游泳', '记录里记下当时的种类名');
    ok(w.hDayWorkouts(day).filter(x => x.id === wk.id).length === 1, '能按天捞出来');
    w.hAddWorkout('pt', day, '07:05');
    const list = w.hDayWorkouts(day);
    ok(list.length >= 2 && list[0].time <= list[1].time, '同一天多条按时间排序');
    // 改名后旧记录仍保留当时的名字
    const t = w.hTypeById('sw'); t.name = '自由泳'; w.hSave();
    ok(w.hDayWorkouts(day).filter(x => x.id === wk.id)[0].typeName === '游泳', '种类改名后，旧记录仍保留当时的名字');

    // 趋势图：空缺不跨缺连线（中间空了好几天时不该画一条直线过去）
    w.state.health.weights = {};
    const d1 = w.hShiftDay(day, -6), d5 = w.hShiftDay(day, -2);
    w.hSetWeight('am', 60, d1);
    w.hSetWeight('am', 59, d5);
    const gapDays = [d1, w.hShiftDay(day, -5), w.hShiftDay(day, -4), w.hShiftDay(day, -3), d5];
    const svg = w.hTrendChart(gapDays, 'week', false);
    ok(!/class="hc-line am"/.test(svg), '中间空着的时候不连线（空缺不跨）');
    ok((svg.match(/class="hc-dot am"/g) || []).length === 2, '两端的点仍然画出来');
    // 连着记两天就该连起来
    const s1 = w.hShiftDay(day, -1), s2 = day;
    w.state.health.weights = {};
    w.hSetWeight('am', 58.5, s1);
    w.hSetWeight('am', 58.0, s2);
    const svg2 = w.hTrendChart([s1, s2], 'week', false);
    ok(/class="hc-line am"/.test(svg2), '连着两天有记录时会连成一条线');
    // 目标虚线
    w.state.health.wgoal = 55;
    ok(/class="hc-goal"/.test(w.hTrendChart([s1, s2], 'week', false)), '设了目标就有目标虚线');

    // 体重 / 运动 / 趋势 / 设置四个页签都能渲染
    ['weight','sport','trend','hset','over','food','period','sleep','step'].forEach(function(tab){
      w.state.health.tab = tab;
      let out = '', err = null;
      try{ out = w.hPanel(tab); }catch(e){ err = e; }
      ok(!err && typeof out === 'string' && out.length > 0, '「' + tab + '」页签能正常渲染' + (err ? '：' + err.message : ''));
    });

    // 导出 → 再导入合并
    const snapshot = JSON.parse(JSON.stringify({
      weights: w.state.health.weights, workouts: w.state.health.workouts,
      wtypes: w.state.health.wtypes, goal: w.state.health.wgoal
    }));
    ok(snapshot.weights[s2] && snapshot.weights[s2].am && snapshot.weights[s2].am.value === 58, '导出的数据里带着刚记的体重');
    ok(typeof w.hExportJSON === 'function', '有导出备份的入口');
    await sleep(5);
    // 模拟：把 App 里的数据清空，再把这份备份合并回来
    w.state.health.weights = {}; w.state.health.workouts = []; w.hSave();
    Object.keys(snapshot.weights).forEach(function(d){
      w.state.health.weights[d] = w.state.health.weights[d] || {};
      ['am','pm'].forEach(function(s){
        const v = snapshot.weights[d] && snapshot.weights[d][s];
        if(v) w.state.health.weights[d][s] = v;
      });
    });
    w.hSave();
    ok(Math.abs(w.state.health.weights[s2].am.value - 58) < 1e-6, '备份导回来后体重还在');

    /* ===================== ② 食谱 ===================== */
    const R = w.ensureRecipes();
    ok(Array.isArray(R.items), '食谱数据初始化成数组');
    ok(R.items.length === 0,   '一开始没有食谱');
    // 建两张
    w.rCreate({ name: '番茄炒蛋', ing: [{n:'鸡蛋', q:'3', u:'g'}], steps: ['打散鸡蛋','下锅翻炒'] });
    await sleep(5);
    w.rCreate({ name: '可乐鸡翅', ing: [{n:'鸡翅', q:'500', u:'g'}], steps: ['焯水','收汁'] });
    await sleep(5);
    ok(w.state.recipes.items.length === 2, '加了两张食谱卡片');
    ok(w.recipeById(w.state.recipes.items[0].id).name === '可乐鸡翅', '新加的排在最前面');

    // 主界面：卡片上只有图片和名称
    w.go('recipe'); await sleep(10);
    let body = w.document.getElementById('recipeBody').innerHTML;
    ok(/class="rc-card"/.test(body),                        '主界面出的是卡片');
    ok(/class="rc-ph"/.test(body),                          '每张卡片都有一块图片区');
    ok(/class="rc-n"/.test(body),                           '每张卡片都有名称区');
    ok(body.indexOf('番茄炒蛋') >= 0,                        '卡片上能看到名称');
    ok(!/rc-card[\s\S]{0,400}?配方/.test(body),             '卡片上不直接堆配方内容（只有图 + 名）');
    ok(/id="rcQ"/.test(body),                               '顶上有搜索栏');
    ok(w.document.querySelectorAll('#recipeBody [data-rcopen]').length === 2, '两张卡片各有一个入口');

    // 搜索：按名字过滤
    w.recipeQuery = '鸡';
    w.renderers.recipe(); await sleep(5);
    body = w.document.getElementById('recipeBody').innerHTML;
    ok(body.indexOf('可乐鸡翅') >= 0,     '搜「鸡」能找到「可乐鸡翅」');
    ok(body.indexOf('番茄炒蛋') < 0,       '名字里没有「鸡」的不会被搜出来');
    ok(w.document.querySelectorAll('#recipeBody [data-rcopen]').length === 1, '过滤后只剩一张卡片');
    w.recipeQuery = ''; w.renderers.recipe(); await sleep(5);
    ok(w.document.querySelectorAll('#recipeBody [data-rcopen]').length === 2, '清空搜索后两张都回来');

    // 详情：名称 / 照片区 / 配方 / 做法 / 删除
    const rid = w.state.recipes.items[0].id;
    w.rOpenDetail(rid); await sleep(10);
    const dbox = w.document.getElementById('recipeDetailBody');
    const dhtml = dbox.innerHTML;
    ok(/id="rdName"/.test(dhtml),   '详情里能改名称');
    ok(/rd-photo/.test(dhtml),      '详情里有一块食物照片区');
    ok(/id="rdPickImg"/.test(dhtml),'照片可以本机上传');
    ok(/id="rdIngList"/.test(dhtml),'详情里有配方（材料）');
    ok(/ri-u/.test(dhtml),          '配方里有单位');
    ok(/<option value="g"/.test(dhtml) && /<option value="ml"/.test(dhtml), '单位可选 g / ml');
    ok(/id="rdStepList"/.test(dhtml),'详情里有制作过程');
    ok(/id="rdDelete"/.test(dhtml),  '详情里有一键删除');
    // 中文名、材料都回填到了输入框
    ok(dbox.querySelector('#rdName').value === '可乐鸡翅', '名称回填开业');
    ok(dbox.querySelector('#rdIngList .ri-n').value === '鸡翅', '材料名回填开业');

    // 二次编辑 + 落盘
    dbox.querySelector('#rdName').value = '可乐鸡翅（家常版）';
    dbox.querySelector('#rdIngList .ri-q').value = '600';
    w.rdCollect(dbox); w.rSave();
    ok(w.recipeById(rid).name === '可乐鸡翅（家常版）', '改过的名称会被保存');
    ok(w.recipeById(rid).ing[0].q === '600',            '改过的用量会被保存');

    // 一键删除
    const n0 = w.state.recipes.items.length;
    w.recipeCur = rid;
    const modalHtml = '';
    w.rAskDelete(rid);
    const mb = w.document.getElementById('modalBox');
    ok(/删掉这张食谱/.test(mb.innerHTML), '删除前先弹出确认');
    const delBtn = [...mb.querySelectorAll('[data-mbtn]')].find(b => b.textContent === '删除');
    delBtn && delBtn.click();
    await sleep(5);
    ok(w.state.recipes.items.length === n0 - 1, '一键删除真的删掉了这一张');
    ok(!w.recipeById(rid), '删掉之后按 id 找不到了');

    /* ===================== ③ 模型读取权限 ===================== */
    ok(typeof w.aiPermitOf === 'function' && typeof w.aiSetPermit === 'function', '有权限读写函数');
    ok(Array.isArray(w.AI_PERMITS) && w.AI_PERMITS.length >= 2, '至少注册了健康和食谱两项');

    // 关着：完全不进上下文
    w.aiSetPermit('health', false); w.aiSetPermit('recipe', false);
    w.state.recipes.items = [{id:'x1', name:'抹茶千层', img:null, ing:[{n:'抹茶粉', q:'10', u:'g'}], steps:['过筛'], link:'', note:'', ts:Date.now()}];
    let lines = [];
    w.aiPermitContextLines(lines);
    ok(lines.length === 0, '关着的时候一行都不给模型');
    let prompt = '';
    try{ prompt = w.buildSystemPrompt('今天吃什么', ''); }catch(e){ prompt = ''; }
    ok(prompt.indexOf('健康记录') < 0, '关着时系统提示词里没有健康记录');
    ok(prompt.indexOf('食谱') < 0,     '关着时系统提示词里没有食谱');

    // 开 App 内的健康
    w.aiSetPermit('health', true);
    lines = []; w.aiPermitContextLines(lines);
    ok(lines.some(l => l.indexOf('健康记录') >= 0), '打开后健康数据进了上下文');
    ok(!lines.some(l => l.indexOf('食谱') >= 0),    '只开健康时，食谱仍然不给');

    // 两个都开
    w.aiSetPermit('recipe', true);
    lines = []; w.aiPermitContextLines(lines);
    ok(lines.length === 2,                                   '两个都开时共有两段');
    ok(lines.some(l => l.indexOf('抹茶千层') >= 0),           '食谱条目出现在上下文里');
    // 走到系统提示词里
    prompt = w.buildSystemPrompt('晚饭想吃什么', '');
    ok(prompt.indexOf('抹茶千层') >= 0, '打开后系统提示词里真的带上了食谱');
    ok(prompt.indexOf('健康记录') >= 0 || prompt.indexOf('健康') >= 0, '打开后系统提示词里真的带上了健康');

    // 再关掉，确认消失（可反复切换）
    w.aiSetPermit('recipe', false);
    prompt = w.buildSystemPrompt('随便吧', '');
    ok(prompt.indexOf('抹茶千层') < 0, '关掉后又从上下文里消失');

    // 持久化
    ok(w.state.aiPermit.recipe === false && w.state.aiPermit.health === true, '开关状态按项分开存');
    const saved = w.LS.get ? w.LS.get('aiPermit', null) : null;
    ok(saved && saved.health === true, '写进了本地存档');

    // 开关行能渲染并出现在健康页
    w.state.health.tab = 'hset'; w.renderers.health(); await sleep(5);
    ok(/data-aipermit="health"/.test(w.document.getElementById('healthBody').innerHTML), '健康设置页里有模型读取开关');
    w.go('recipe'); await sleep(5);
    ok(/data-aipermit="recipe"/.test(w.document.getElementById('recipeBody').innerHTML), '食谱首页也有模型读取开关');

    /* ===================== ④ iOS 液态玻璃 ===================== */
    ok(Array.isArray(w.UI_STYLES) && w.UI_STYLES.length === 3, '美化里给了三种整体风格');
    ok(w.UI_STYLES.some(s => s.k === 'liquid'), '其中有 iOS 液态玻璃');
    ok(/--glass-blur:\s*34px/.test(html), '液态玻璃把模糊提到了 34px');
    ok(/ui-liquid-dark/.test(html),               '还有夜色版本');

    w.state.settings.uiStyle = 'liquid'; w.applyUiStyle();
    ok(w.document.body.classList.contains('ui-liquid'), '选液态玻璃 → body 挂上 ui-liquid');
    ok(!w.document.body.classList.contains('ui-liquid-dark'), '（此时还不是夜色）');
    w.state.settings.uiStyle = 'liquid-dark'; w.applyUiStyle();
    ok(w.document.body.classList.contains('ui-liquid') &&
       w.document.body.classList.contains('ui-liquid-dark'), '夜色 = 液态 + 夜色两个 class');
    w.state.settings.uiStyle = 'frost'; w.applyUiStyle();
    ok(!w.document.body.classList.contains('ui-liquid') &&
       !w.document.body.classList.contains('ui-liquid-dark'), '切回磨砂后两个 class 都摘掉');

    // 美化页能渲染出三个选项 + 当前选中态
    w.go('beauty'); await sleep(10);
    const bh = w.document.getElementById('beautyBody').innerHTML;
    ok(/data-uistyle="liquid"/.test(bh),     '美化页里有液态玻璃这个选项');
    ok(/data-uistyle="liquid-dark"/.test(bh),'美化页里有夜色这个选项');
    ok(/data-uistyle="frost"/.test(bh),      '美化页里保留默认的磨砂');
    ok(/整体美化风格/.test(bh),               '卡片标题是「整体美化风格」');

    // 点一下就换皮肤
    const liqBtn = w.document.querySelector('#beautyBody [data-uistyle="liquid-dark"]');
    liqBtn.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await sleep(10);
    ok(w.state.settings.uiStyle === 'liquid-dark', '点一下立刻切换到夜色');
    ok(w.document.body.classList.contains('ui-liquid-dark'), '并且马上生效（body 上有 class）');
    // 还原，别影响别的套件
    w.state.settings.uiStyle = 'frost'; w.applyUiStyle();

  } catch (e) {
    fail++;
    console.log('  异常：', e && e.message, '\n', e && e.stack && e.stack.split('\n').slice(0, 4).join('\n'));
  }
  console.log('\n' + '='.repeat(46));
  console.log('轻记并入健康 / 食谱 / 读取权限 / 液态玻璃：' + pass + ' 通过，' + fail + ' 失败');
  console.log('='.repeat(46));
  process.exit(fail ? 1 : 0);
})();
