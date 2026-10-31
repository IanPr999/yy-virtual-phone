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
let pass=0,fail=0;
const ok=(c,m)=>{console.log((c?"  PASS ":"  FAIL ")+m);if(c)pass++;else fail++;};
w.go("home");
const grid=w.document.getElementById("homeGrid");
// 模拟滑动翻页成功后残留的位移（旧逻辑 bug）
grid.style.transform="translateX(-360px)";
grid.style.transition="transform .24s ease";
w.renderers.home();
ok(grid.style.transform==="","renderers.home() 后清除了残留 transform（图标回到原位）");
ok(grid.style.transition==="","renderers.home() 后清除了残留 transition");
ok(grid.querySelectorAll(".app").length>0,"重渲染后本页图标数量 > 0（图标可见，未消失）");
// 多页：翻到第 2 页也能正常渲染
const pages=w.pageCount();
if(pages>1){
  w.homePage=1; w.renderers.home();
  const g2=w.document.getElementById("homeGrid");
  ok(g2.querySelectorAll(".app").length>0 || !!g2.querySelector(".empty"),"第 2 页重渲染有图标或空态提示");
  ok(g2.style.transform==="","第 2 页 transform 也已归零");
}else{
  console.log("  (只有 1 页，跳过多页断言)");
}
ok(logs.length===0,"无脚本报错");
console.log("\n==== " + pass + " 通过 / " + fail + " 失败 ====");
process.exit(fail?1:0);
