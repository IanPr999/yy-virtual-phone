const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync('小手机.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join("\n;\n");
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>errs.push(e.message));
const dom=new JSDOM(html,{url:'http://localhost/',virtualConsole:vc,runScripts:'outside-only'});
const w=dom.window,d=w.document;
w.requestAnimationFrame=cb=>setTimeout(()=>cb(Date.now()),0);w.scrollTo=()=>{};
w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
w.indexedDB={open(){const r={onsuccess:null,onerror:null,onupgradeneeded:null};setTimeout(()=>r.onsuccess&&r.onsuccess({target:{result:{objectStore(){return{createIndex(){}}}}}}),0);return r;}};
w.URL.createObjectURL=()=>'blob:x';
w.fetch=()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({data:[]}),text:()=>Promise.resolve('{}'),arrayBuffer:()=>Promise.resolve(new ArrayBuffer(8))});
w.eval(scripts);
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:(fail++,console.log('  x '+m));};
w.state.personas=[{id:'P1',name:'阿城'}];w.state.curPersona='P1';w.state.persona=w.state.personas[0];
w.ensureWx();w.ensureIdentities();
// 无语音模型：应走「只出字幕」路径
w.openCallWin('voice','out',w.state.persona,null);
w.connectCall();
setTimeout(()=>{
  const real=errs.filter(function(e){return !/HTMLMediaElement/.test(e);});
  const subs=d.getElementById('cwSubs');
  ok(subs && subs.children.length>0,'无语音模型时也出字幕（'+ (subs?subs.children.length:0) +' 行）');
  // 静音时也不该合成
  w.callState.muted=true;
  const before=subs.children.length;
  w.speakCallLine('（轻轻叹了口气）我没事。你呢？');
  ok(subs.children.length===before+1,'静音时只出一行字幕，不合成');
  // 造一轮真实播放任务（无语音模型时会直接失败，但状态对象会建起来）
  w.callState.muted=false;
  w.callAudioTurn([{show:'我没事。',speech:'我没事。',zh:''},{show:'你呢？',speech:'你呢？',zh:''}], '', null, null);
  ok(!!w.callAudio,'播放状态对象已建立');
  ok(w.callAudio.units.length===2,'两句话进了播放队列');
  // 挂断清理
  w.endCall();
  ok(!w.callState,'挂断后 callState 清空');
  ok(w.callAudio && w.callAudio.canceled===true,'挂断后置 canceled');
  ok(w.callAudio && w.callAudio.units.length===0,'挂断后队列清空');
  console.log('断言 '+pass+' / 失败 '+fail+' / err '+real.length);
  if(real.length)console.log(real.slice(0,3));
  process.exit(fail||real.length?1:0);
},120);
