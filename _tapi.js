/* 回归：接口降级（400 静默重试）
   ① 接口拒绝 system 角色（首试 400）：应静默换「合并进 user」写法重试并成功，不把 400 抛给用户
   ② 连「合并进 user」都因太长被拒：应再压短系统提示后合并重试并成功
   ③ 接口真的全挂（一直 400）：应回调错误，而不是卡死 / 返回空 */
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

// 模拟接口：opt.rejectSystem=拒绝带 system 角色的请求；opt.maxLen=超过此长度（字符）的请求回 400
function makeFetch(opt){
  return function(url, opts2){
    let body;
    try { body = JSON.parse(opts2.body); } catch(e){ body = { messages: [] }; }
    const hasSys = (body.messages || []).some(m => m.role === 'system');
    const len = JSON.stringify(body).length;
    let bad = false;
    if(opt.rejectSystem && hasSys) bad = true;
    if(opt.maxLen && len > opt.maxLen) bad = true;
    if(bad){
      return Promise.resolve({ ok:false, status:400, text:()=>Promise.resolve(JSON.stringify({error:{message:'mock 400'}})) });
    }
    return Promise.resolve({ ok:true, status:200, json:()=>Promise.resolve({ choices:[{ message:{ content:'MOCK_OK' } }] }) });
  };
}

const cfg = { url:'http://api.test/v1', model:'m', params:{ temperature:0.8, topP:1, frequencyPenalty:0 }, key:'', compatible:'openai' };
const msgs = [{ role:'system', content:'SYS_PROMPT' }, { role:'user', content:'HI' }];

(async function(){
  try {
    w.eval(scripts);

    // ① 拒绝 system 角色、但对「合并进 user」的短请求放行
    w.fetch = makeFetch({ rejectSystem:true, maxLen:0 });
    await new Promise(res => {
      w.callAPI(cfg, msgs, function(err, text){
        ok(!err, '① 拒绝 system 时应成功（无 err），实际 err=' + err);
        ok(text === 'MOCK_OK', '① 应拿到模型回复 MOCK_OK，实际=' + text);
        res();
      });
    });

    // ② 拒绝 system + 超过 2500 字符就拒；系统提示很长，合并后仍然超 → 压短系统后合并才过
    const longSys = 'X'.repeat(3000);
    w.fetch = makeFetch({ rejectSystem:true, maxLen:2500 });
    const longMsgs = [{ role:'system', content:longSys }, { role:'user', content:'HI' }];
    await new Promise(res => {
      w.callAPI(cfg, longMsgs, function(err, text){
        ok(!err, '② 长提示+超长应靠「压短后合并」成功（无 err），实际 err=' + err);
        ok(text === 'MOCK_OK', '② 应拿到 MOCK_OK，实际=' + text);
        res();
      });
    });

    // ③ 接口真的全挂
    w.fetch = makeFetch({ rejectSystem:true, maxLen:1 }); // 任何请求都超长 → 必 400
    await new Promise(res => {
      w.callAPI(cfg, msgs, function(err, text){
        ok(!!err, '③ 全挂时应回调错误，实际 err=' + err);
        ok(text === undefined || text === null, '③ 全挂时不应返回文本');
        res();
      });
    });

    // ④ 多模态（看图）：图片段要原样发出去，不能被转成字符串
    let seenBody = null;
    w.fetch = function(url, opts2){
      try{ seenBody = JSON.parse(opts2.body); }catch(e){ seenBody = null; }
      return Promise.resolve({ ok:true, status:200, json:()=>Promise.resolve({ choices:[{ message:{ content:'看见了一只猫' } }] }) });
    };
    await new Promise(res => {
      w.callAPI(cfg, [{ role:'system', content:'SYS' },
        { role:'user', content:[{ type:'text', text:'看看这张' }, { type:'image_url', image_url:{ url:'data:image/png;base64,AAAA' } }] }],
        function(err, text){
          ok(!err && text === '看见了一只猫', '④ 多模态请求能正常发出并拿到回复');
          const u = seenBody && seenBody.messages && seenBody.messages[1];
          ok(u && Array.isArray(u.content) && u.content[1] && u.content[1].type === 'image_url', '④ 图片段原样保留（没有被 JSON 化成一坨字符串）');
          res();
        });
    });

    // ⑤ 多模态退回到「合并成一条 user」时：图片段要丢掉、只留文字（否则拼出 [object Object]）
    const merged = w.mergeMsgs([{ role:'system', content:'SYS' },
      { role:'user', content:[{ type:'text', text:'看看这张' }, { type:'image_url', image_url:{ url:'data:x' } }] }]);
    ok(/看看这张/.test(merged) && merged.indexOf('[object Object]') < 0, '⑤ 降级合并时图片段被丢掉，只剩文字');

    console.log('\n接口降级回归：' + pass + ' 通过 / ' + fail + ' 失败');
    process.exit(fail ? 1 : 0);
  } catch(e){
    console.log('测试异常：', e && e.stack || e);
    process.exit(2);
  }
})();
