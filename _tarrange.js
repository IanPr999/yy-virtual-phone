const fs=require("fs");const {JSDOM,VirtualConsole}=require("jsdom");
const html=fs.readFileSync("小手机.html","utf8");
const scripts = (fs.existsSync('app.js') && /app\.js/.test(html)) ? fs.readFileSync('app.js','utf8') : [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join("\n;\n");
const vc=new VirtualConsole();const logs=[];vc.on("jsdomError",e=>logs.push(e.message));vc.on("error",(...a)=>logs.push(a.join(" ")));
const dom=new JSDOM(html,{url:"http://localhost:8080/",virtualConsole:vc,runScripts:"outside-only"});
const w=dom.window;
w.requestAnimationFrame=cb=>setTimeout(()=>cb(Date.now()),0);w.scrollTo=()=>{};
w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
w.indexedDB={open(){const r={onsuccess:null,onerror:null,onupgradeneeded:null};setTimeout(()=>r.onsuccess&&r.onsuccess({target:{result:{objectStore(){return{createIndex(){}}}}}}),0);return r;}};
w.URL.createObjectURL=()=>"blob:x";
w.fetch=()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({}),text:()=>Promise.resolve("{}"),blob:()=>Promise.resolve(new w.Blob(["x"]))});
w.eval(scripts);
let pass=0,fail=0;const ok=(c,m)=>{console.log((c?"  PASS ":"  FAIL ")+m);if(c)pass++;else fail++;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  // ---------- 1. 拖动不再出现方形边框（CSS 修复） ----------
  ok(html.indexOf("-webkit-tap-highlight-color:transparent")>=0,
     "桌面图标/组件已关闭移动端点按高亮（消除方形半透明高亮框）");
  // 需求变更：拖动时不再要任何额外描边/阴影/放大，只显示图标本体且跟手无偏差
  ok(/\.app\.dragging,\s*\.widget\.dragging\{[\s\S]*?box-shadow:none[^}]*border:none[^}]*outline:none/.test(html),
     ".app.dragging 已去掉阴影/描边/聚焦框（拖动不显示额外边框）");
  ok(/\.app\.dragging,\s*\.widget\.dragging\{[\s\S]*?transform:none/.test(html),
     ".app.dragging 已去掉 transform 缩放（图标不会被放大、不产生跟手偏差）");
  ok(!/\.app\.dragging\{opacity[\s\S]{0,40}scale\(/.test(html),
     "没有遗留的重复 .app.dragging scale 规则");

  // ---------- 2. 一键排列：只重排图标、填空白、组件不动 ----------
  w.go("home");
  w.ensureLayout();
  // 放一个 2×2 组件占 cell 0（左上），用于验证「组件位置不被影响」
  w.state.layout.widgets = [{id:"wX",type:"text",size:"2x2",page:0,cell:0,title:"W",content:""}];
  w.homeEdit=true;
  w.renderers.home();
  ok(w.document.getElementById("btnHomeArrange").style.display==="inline-block","编辑模式下「一键排列」按钮可见（必须为明确可见值，不能是回退到 CSS 的空串）");

  // 取本页真实图标（排除底部 Dock 固定图标；Dock 图标不进网格、不参与排列）
  const page0Apps = w.state.layout.apps.filter(a=>(a.page||0)===0 && !a.hide && !w.isDockApp(a.id));
  ok(page0Apps.length>=4,"本页存在可排列的图标（不含 Dock）");
  const wBefore = w.state.layout.widgets[0].cell;
  // 人为制造「空白」：把本页图标坐标清掉，模拟用户拖乱后留下的空格
  const appBefore = page0Apps.map(a=>a.cell);
  page0Apps.forEach(a=>{ a.cell = null; });

  w.document.getElementById("btnHomeArrange").click();
  await sleep(20);

  ok(w.state.layout.widgets[0].cell===wBefore,"一键排列后组件坐标不变（不碰组件）");
  const appAfter = w.state.layout.apps.filter(a=>(a.page||0)===0 && !a.hide && !w.isDockApp(a.id)).map(a=>a.cell);
  ok(appAfter.every(c=>typeof c==="number"),"一键排列后所有本页图标都有新坐标（无残留 null）");
  ok(appAfter.some((c,i)=>c!==appBefore[i]),"一键排列后图标坐标确实被重新排列了");

  // 验证：组件占的 4 格与图标不重叠，且图标紧密回填组件之外的所有空格
  const cols=4, rows=6;
  const occ={};
  const cr=Math.floor(wBefore/cols), cc=wBefore%cols;
  for(let y=cr;y<cr+2;y++) for(let x=cc;x<cc+2;x++) occ[y*cols+x]=true; // 组件 2x2
  let overlap=false;
  appAfter.forEach(c=>{ if(occ[c]) overlap=true; });
  ok(!overlap,"图标没有落在组件占用的格子上（组件位置未被影响）");

  const freeCells=[];
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){ const idx=r*cols+c; if(!occ[idx]) freeCells.push(idx); }
  const sortedApps=[...appAfter].sort((a,b)=>a-b);
  const tight = sortedApps.every((c,i)=>c===freeCells[i]);
  ok(tight,"图标被紧密回填到组件之外的所有空格（从上到下、从左到右，填满空白）");

  // 非编辑态按钮隐藏
  w.homeEdit=false; w.renderers.home();
  ok(w.document.getElementById("btnHomeArrange").style.display==="none","非编辑模式下「一键排列」按钮隐藏");

  ok(logs.length===0,"无脚本报错："+logs.join(" | "));
  console.log("\n==== "+pass+" 通过 / "+fail+" 失败 ====");
  process.exit(fail?1:0);
})();
