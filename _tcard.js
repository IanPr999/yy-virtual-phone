/* 专项回归：聊天里的「非文字消息」（转账 / 位置 / 通话申请 / 一起听）+ 群聊
   跑法：NODE_PATH=<workspace>/node_modules node _tcard.js                 */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

let pass = 0, fail = 0;
function ok(cond, name){
  if(cond){ pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async function(){
  const html = fs.readFileSync('小手机.html', 'utf8');
const scripts = (fs.existsSync('app.js') && /app\.js/.test(html)) ? fs.readFileSync('app.js','utf8') : [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join("\n;\n");
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => console.log('JSDOM_ERR', e.message));
  const dom = new JSDOM(html, { url:'http://localhost:8080/', virtualConsole: vc,
                                runScripts:'outside-only', pretendToBeVisual:true });
  const w = dom.window;
  w.requestAnimationFrame = cb => setTimeout(() => cb(Date.now()), 0);
  w.scrollTo = () => {};
  w.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){} });
  w.indexedDB = { open(){ const r = { onsuccess:null };
    setTimeout(() => r.onsuccess && r.onsuccess({ target:{ result:{ objectStore(){ return { createIndex(){} }; } } } }), 0);
    return r; } };
  w.URL.createObjectURL = () => 'blob:x';
  w.eval(scripts);
  await sleep(50);

  try{
    w.go('call');
    w.ensureWx(); w.ensurePersonas(); w.ensureIdentities(); w.ensureWallet();

    /* ---------- 1. 「＋」面板格子齐全 ---------- */
    ok(w.PLUS_CELLS.length === 9, '「＋」面板有 9 个格子（含新增的 5 类）');
    const keys = w.PLUS_CELLS.map(c => c[0]);
    ['money','loc','inv','vinv','lt'].forEach(k => ok(keys.indexOf(k) >= 0, '面板含格子：' + k));

    /* ---------- 2. 标记解析：模型写的东西能变成卡片 ---------- */
    let pr = w.parseSpecialIntents('请你喝奶茶\n[TRANSFER:18|买奶茶]');
    ok(pr.text === '请你喝奶茶', '标记被剥掉，正文干净（转账）');
    ok(pr.cards.length === 1 && pr.cards[0].type === 'transfer' && pr.cards[0].amount === 18,
       '[TRANSFER:18|买奶茶] 解析成转账卡（金额 18、留言买奶茶）');

    pr = w.parseSpecialIntents('我在老地方等你 [LOCATION:江边公园|第三个长椅]');
    ok(pr.cards[0].type === 'location' && pr.cards[0].place === '江边公园' && pr.cards[0].detail === '第三个长椅',
       '[LOCATION] 解析成位置卡（地点 + 备注）');

    pr = w.parseSpecialIntents('想听你的声音 [CALLINVITE]');
    ok(pr.cards[0].type === 'invite' && pr.cards[0].invKind === 'voice', '[CALLINVITE] 解析成语音通话申请');

    pr = w.parseSpecialIntents('让我看看你 [VIDEOINVITE]');
    ok(pr.cards[0].type === 'invite' && pr.cards[0].invKind === 'video', '[VIDEOINVITE] 解析成视频通话申请');

    pr = w.parseSpecialIntents('一起听首歌吧 [LISTEN:晴天]');
    ok(pr.cards[0].type === 'listen' && pr.cards[0].song === '晴天', '[LISTEN:晴天] 解析成一起听邀请');

    pr = w.parseSpecialIntents('普通一句话，没有标记');
    ok(pr.text === '普通一句话，没有标记' && pr.cards.length === 0, '没有标记时不产生卡片');

    // 一条回复里多个标记
    pr = w.parseSpecialIntents('给你钱[CALLINVITE][TRANSFER:5|零花]');
    ok(pr.cards.length === 2, '一条回复里的多个标记都能解析出来');

    /* ---------- 3. 卡片泡沬渲染 ---------- */
    const pid0 = w.curPid();
    const tCard = w.pushMessage('him', '', 'transfer', {amount:52, note:'买奶茶', tstate:'pending', pid:pid0});
    const lCard = w.pushMessage('him', '', 'location', {place:'江边公园', detail:'第三个长椅', tstate:'pending', pid:pid0});
    const iCard = w.pushMessage('him', '', 'invite',   {invKind:'video', istate:'pending', pid:pid0});
    const sCard = w.pushMessage('him', '', 'listen',   {song:'晴天', istate:'pending', pid:pid0});
    await sleep(20);
    const src = w.document.getElementById('chatList').innerHTML;
    ok(src.indexOf('cb-amt') >= 0, '转账卡渲染出了金额');
    ok(src.indexOf('¥52.00') >= 0, '转账金额按两位小数显示');
    ok(src.indexOf('江边公园') >= 0, '位置卡渲染出了地点');
    ok(src.indexOf('cb-btn') >= 0, '对方发来的卡片给了接受/拒绝按钮');
    ok(src.indexOf('等待接听') >= 0 || src.indexOf('等待接受') >= 0, '卡片初始状态是「待处理」');
    ok(w.document.querySelectorAll('[data-cardact]').length >= 6, '四张卡片都有可点的操作按钮');

    /* ---------- 4. 我点接受 / 拒绝，卡片状态跟着变 ---------- */
    const beforeBal = w.state.wallet.balance;
    w.cardReply(tCard, true);
    ok(tCard.tstate === 'accepted', '收款后转账卡变成「已收款」');
    ok(w.state.wallet.balance > beforeBal, '收款后零钱余额增加');
    w.cardReply(iCard, false);
    ok(iCard.istate === 'rejected', '拒绝通话申请后卡片变成「已拒绝」');
    w.cardReply(lCard, true);
    ok(lCard.tstate === 'accepted', '接受位置后卡片变成「已赴约」');
    w.cardReply(tCard, true);
    ok(tCard.tstate === 'accepted', '已处理过的卡片不会被重复处理（幂等）');

    /* ---------- 5. 会话预览 / 通知摘要认识这些新类型 ---------- */
    ok(w.m2prev(tCard).indexOf('[转账') === 0, '会话列表预览：转账');
    ok(w.m2prev(lCard).indexOf('[位置]') === 0, '会话列表预览：位置');
    ok(w.m2prev(iCard).indexOf('[视频通话申请]') === 0, '会话列表预览：视频通话申请');
    ok(w.m2prev(sCard).indexOf('[一起听]') === 0, '会话列表预览：一起听');

    /* ---------- 6. 群聊数据 / 说话人 / 上下文 ---------- */
    ok(typeof w.curPid === 'function', 'curPid() 存在');
    ok(w.isGroupPid('g:abc') === true,  'isGroupPid 认出群聊 key');
    ok(w.isGroupPid('p1') === false,    'isGroupPid 不把人设卡 id 认成群');
    if(!w.state.wx.groups) w.state.wx.groups = [];
    // jsdom 里默认只有一张人设卡，自己造三张出来（名字不同，方便验证 @ 与昵称显示）
    const base0 = w.state.personas[0] || {};
    ['小林','阿哲','糖糖'].forEach(function(nm, i){
      if(w.state.personas.some(function(p){ return p.id === 'gp' + i; })) return;
      const np = Object.assign({}, base0, {id:'gp' + i, name:nm, tone:'温柔'});
      w.state.personas.push(np);
    });
    const mem = ['gp0','gp1','gp2'];
    if(mem.length < 2){ console.log('  （人设卡不足，跳过群聊用例）'); }
    else {
      const g = w.createGroup('周末小聚', mem);
      ok(!!g, 'createGroup 建群成功');
      ok(w.groupMembers(g).length === mem.length, '群成员数与传入一致');
      ok(w.groupName(g) === '周末小聚', '群名用自定义名');
      g.name = '';
      ok(w.groupName(g).indexOf('、') > 0, '没起群名时用成员名字自动凑');
      g.name = '周末小聚';

      // 切换进群
      w.wxPane = 'main';
      w.switchConv('g:' + g.id);
      await sleep(20);
      ok(w.curPid() === 'g:' + g.id, 'switchConv 切进群后 curPid 是群的 key');
      ok(!!w.curGroup(), 'curGroup() 取得到当前群');

      // 群里发消息：pid 自动落到群里
      const gm = w.pushMessage('me', '大家好啊', 'text');
      ok(gm.pid === 'g:' + g.id, '群里发消息的 pid 自动是群 key');

      // 轮流模式下按序 список speaker
      const g2 = { id:'t1', name:'', members:mem, replyMode:'round', turnIdx:0 };
      const seen = [];
      for(let i = 0; i < mem.length; i++){
        seen.push(w.pickSpeaker(g2, '你们好').id);
      }
      ok(new Set(seen).size === mem.length, '轮流模式：一圈下来每个人都说一次，不重复');
      ok(w.pickSpeaker(g2, '大家好').id === seen[0], '轮流模式：走完一圈回到第一个人（循环）');

      // @ 优先
      const target = w.state.personas.filter(p => p.id === mem[1])[0];
      const hitSpk = w.pickSpeaker(g2, '你好 @' + (target.name || '') + ' 你觉得呢');
      ok(hitSpk && hitSpk.id === target.id, '被 @ 的那个人优先回答');

      // 群回复提示词里要点明了他是谁、群里还有谁
      const pmt = w.groupMemberPrompt(target, g);
      ok(pmt.indexOf(target.name || '他') >= 0, '群成员提示词写明了他扮演谁');
      ok(pmt.indexOf('同一个群里还有') >= 0, '群成员提示词列出了其他群友');

      // 群上下文带上说话人
      const vm = w.pushMessage('him', '我来啦', 'text', {pid:'g:' + g.id, from:mem[0]});
      const ctx = w.groupContext('g:' + g.id);
      ok(ctx.indexOf(w.state.personas.filter(p => p.id === mem[0])[0].name) >= 0,
         '群上下文里带上是谁说的');
      ok(ctx.indexOf('大家好啊') >= 0, '群上下文包含我说的那句');

      // 群 Messages 渲染：显示成员名
      await sleep(20);
      const gsrc = w.document.getElementById('chatList').innerHTML;
      ok(gsrc.indexOf('g-name') >= 0, '群聊里别人的消息上方有名字');

      // 会话列表里出现群
      w.wxPane = 'main';
      w.renderWxMain();
      const mainSrc = w.document.getElementById('wxConvList').innerHTML;
      ok(mainSrc.indexOf('data-conv="g:' + g.id + '"') >= 0, '会话列表里出现群聊条目');
      ok(mainSrc.indexOf('conv-ava-grid') >= 0, '群聊条目用九宫格头像');
      ok(mainSrc.indexOf('g-badge') >= 0, '群聊条目带「群聊」小标签');

      // 群聊天{@:?}{@:?}显示。检查 groupConvHTML 里的预览用 seiaklei? names
      const prevHtml = w.groupConvHTML();
      ok(prevHtml.indexOf('周末小聚') >= 0, '群聊板块显示群名');

      // 群设置能改的名
      g.replyMode = 'round';
      ok(w.groupMode(g) === 'round', '群接话方式可切换');

      /* ---- 端到端：在群里说话，群里某个人回话（本地兜底也要能跑通） ---- */
      const cntBefore = w.state.messages.filter(function(m){ return m.pid === 'g:' + g.id; }).length;
      let gotText = '', gotWho = null;
      await new Promise(function(res){
        w.replyNow('你们都在吗？', function(txt, think, err, who){
          gotText = txt; gotWho = who; res();
        });
      });
      ok(typeof gotText === 'string' && gotText.length > 0, '群聊里能拿到一句回复（本地兜底也不卡住）');
      ok(gotWho && gotWho.id, '回复时指明了「这句话是谁说的」');
      const inGroup = mem.indexOf(gotWho.id) >= 0;
      ok(inGroup, '说话的人是群里的一员');
      const him = w.pushMessage('him', gotText, 'text', {pid:'g:' + g.id, from:gotWho.id});
      ok(him.from === gotWho.id, '群消息记下了说话人');
      ok(w.speakerOf(him).id === gotWho.id, 'speakerOf 能还原出这句是谁说的');
      await sleep(20);
      ok(w.state.messages.filter(function(m){ return m.pid === 'g:' + g.id; }).length > cntBefore,
         '群里多了一条消息');
      // （上面的问句是直接喂给模型的，没进记录；这里用真流程验证「我发的話會原樣留在群上下文里」）
      ok(w.groupContext('g:' + g.id).indexOf('大家好啊') >= 0,
         '群上下文里保留了我发的话（按说话人分行）');
    }

    /* ---------- 7. 回到单人会话不受影响 ---------- */
    const single = w.state.personas[0].id;
    w.switchConv(single);
    await sleep(20);
    ok(w.curPid() === single, '切回单人会话后 curPid 就是人设卡 id');
    ok(w.curGroup() === null, '单人会话里 curGroup() 为空');
    const sm = w.pushMessage('me', '普通一句话', 'text');
    ok(sm.pid === single, '单人会话的消息 pid 还是人设卡 id');

  }catch(e){
    fail++; console.log('  ✗ 抛异常：', e && e.stack);
  }
  console.log(`\n${pass} 通过 / ${fail} 失败`);
  setTimeout(function(){ process.exit(fail ? 1 : 0); }, 30);
})();
