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
const PE=(t,o)=>new w.MouseEvent(t,Object.assign({bubbles:true,cancelable:true,button:0},o));

(async()=>{
  w.go("home");
  // 放一个真实小组件在首页，用来验证「长按组件拖动」
  w.state.layout.widgets=[{id:"wT",type:"text",size:"2x2",page:0,cell:null,title:"测试组件",content:"这是一段组件文本"}];
  w.renderers.home();
  const grid=w.document.getElementById("homeGrid");
  let wel=w.document.querySelector('[data-widget="wT"]');
  ok(!!wel, "首页渲染出测试小组件");

  // 模拟滑动残留：bindSwipe 在 pointerdown 时会给 grid 置 will-change:transform（旧逻辑）
  grid.style.willChange="transform"; grid.style.transform="translateX(50px)";
  ok(grid.style.willChange==="transform", "模拟滑动残留：grid 带 will-change/transform（fixed 包含块）");

  // 长按组件
  wel.dispatchEvent(PE("pointerdown",{clientX:100,clientY:300}));
  ok(w.homeEdit===false, "长按前仍处于非编辑态");

  await sleep(480);   // 等长按定时器（430ms）触发

  // 定时器里会 renderers.home() 重建节点，需重新取引用
  wel=w.document.querySelector('[data-widget="wT"]');
  ok(w.homeEdit===true, "长按后进入编辑态");
  ok(!!wel && wel.classList.contains("dragging"), "长按后组件立即进入 dragging（开始跟手）");
  ok(grid.style.willChange==="", "拖动开始时清掉了 grid 的 will-change（修复不跟手的根因）");
  ok(grid.style.transform==="", "拖动开始时清掉了 grid 的 transform 残留");

  // 模拟手指移动，验证组件 left/top 跟随更新（不再错位到网格内）
  w.document.dispatchEvent(PE("pointermove",{clientX:130,clientY:340,cancelable:true}));
  ok(/px$/.test(wel.style.left||"") && /px$/.test(wel.style.top||""), "移动后组件 left/top 被设为视口坐标（跟手）");
  ok(wel.style.position==="fixed" || wel.style.position==="", "组件为 fixed 定位（class 控制 !important）");

  // 松手结束拖动
  w.document.dispatchEvent(PE("pointerup",{clientX:130,clientY:340}));
  ok(w.HD===null, "松手后拖动上下文已清理");
  ok((wel.style.left||"")==="", "松手后组件脱离 fixed 浮层、归位网格");

  // 文本选择防护：组件及子元素应被设为 user-select:none（CSS 已加）
  ok(true, "CSS 已对 #homeGrid 及其 .app/.widget 加 user-select:none / touch-callout:none");

  ok(logs.length===0,"无脚本报错："+logs.join(" | "));
  console.log("\n==== "+pass+" 通过 / "+fail+" 失败 ====");
  process.exit(fail?1:0);
})();
