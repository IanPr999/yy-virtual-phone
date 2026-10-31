const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync('小手机.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n;\n');
const vc=new VirtualConsole(); const errs=[];
vc.on('jsdomError',e=>{ if(!/Not implemented/.test(e.message)) errs.push('JSDOM_ERR '+e.message); });
const dom=new JSDOM(html,{url:'http://localhost:8080/',virtualConsole:vc,runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;
w.requestAnimationFrame=cb=>setTimeout(()=>cb(Date.now()),0);
w.scrollTo=()=>{}; w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
w.indexedDB={open(){const r={onsuccess:null};setTimeout(()=>r.onsuccess&&r.onsuccess({target:{result:{objectStore(){return{createIndex(){}};}}}}),0);return r;}};
w.URL.createObjectURL=()=>'blob:x';
w.eval(scripts);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  await sleep(30);
  w.ensureRecipes(); w.ensureHealth(); w.ensureLayout();
  console.log('桌面有「食谱」图标：', w.state.layout.apps.some(a=>a.id==='recipe') ? '✓' : '✗');
  console.log('桌面仍有「健康」：',   w.state.layout.apps.some(a=>a.id==='health') ? '✓' : '✗');
  const screens=['home','call','health','recipe','beauty','notes','memory','diary','plans','album','music','shop','check','wallet','backup','settings','api','persona','world','dates','study','create','growth','map','card','helper','quiet','sleep','video'];
  for(const style of ['frost','liquid','liquid-dark']){
    w.state.settings.uiStyle=style; w.applyUiStyle();
    const bad=[];
    for(const s of screens){ try{ w.go(s); }catch(e){ bad.push(s+':'+e.message); } }
    console.log('风格 '+style.padEnd(12)+' 逐屏渲染：'+(bad.length? '✗ '+bad.join(' | ') : '✓ 全部 '+screens.length+' 屏正常'));
  }
  w.state.settings.uiStyle='frost'; w.applyUiStyle();
  w.state.recipes.items=[];
  w.rCreate({name:'红烧肉',ing:[{n:'五花肉',q:'500',u:'g'}],steps:['焯水','炒糖色','炖一小时']});
  await sleep(10);
  let okDetail=true,msg='';
  try{ w.rOpenDetail(w.state.recipes.items[0].id); await sleep(10); }catch(e){ okDetail=false; msg=e.message; }
  console.log('食谱详情页渲染：', okDetail?'✓':'✗ '+msg);
  console.log('运行期错误：'+(errs.length? errs.slice(0,5).join(' | ') : '无'));
  process.exit(0);
})();
