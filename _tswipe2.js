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
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function fire(el,type,x,y){const e=new w.MouseEvent(type,{clientX:x,clientY:y,bubbles:true,cancelable:true});el.dispatchEvent(e);}

(async()=>{
  w.go("home");
  // 确保至少有两页：把一个图标挪到第 2 页
  const apps=w.state.layout.apps;
  if(apps.length){ apps[0].page=1; }
  w.renderers.home();
  const pages=w.pageCount();
  ok(pages>=2,"当前布局至少有 2 页（pageCount="+pages+"），可测翻页");

  // ---- 编辑模式下：按空白（.body）可左右翻页 ----
  w.enterHomeEdit();
  ok(w.homeEdit===true,"已进入编辑模式");
  const body=w.document.querySelector("#home .body");
  const before=w.homePage;
  fire(body,"pointerdown",300,400);
  fire(body,"pointermove",300-420,400);   // 向左滑一大段 -> 应去下一页
  fire(body,"pointerup",300-420,400);
  await wait(320);
  ok(w.homePage===before+1,"编辑模式下在空白区域左滑成功翻到第 "+(before+1)+" 页（homePage="+w.homePage+"）");

  // 翻回上一页
  fire(body,"pointerdown",100,400);
  fire(body,"pointermove",100+420,400);    // 向右滑 -> 回上一页
  fire(body,"pointerup",100+420,400);
  await wait(320);
  ok(w.homePage===before,"编辑模式下右滑翻回第 "+before+" 页（homePage="+w.homePage+"）");

  // ---- 编辑模式下：按在图标上不应触发翻页（交给拖动处理） ----
  const grid=w.document.getElementById("homeGrid");
  const appEl=grid.querySelector(".app");
  if(appEl){
    const p0=w.homePage;
    fire(appEl,"pointerdown",300,300);
    fire(appEl,"pointermove",300-500,300);
    fire(appEl,"pointerup",300-500,300);
    await wait(320);
    ok(w.homePage===p0,"编辑模式下按在图标上滑动不会翻页（homePage 仍为 "+p0+"）");
  }else{
    console.log("  (本页无图标，跳过「按图标不翻页」断言)");
  }

  // ---- 非编辑模式下翻页仍正常（回归） ----
  w.homeEdit=false;
  const nb=w.homePage;
  fire(body,"pointerdown",300,400);
  fire(body,"pointermove",300-420,400);
  fire(body,"pointerup",300-420,400);
  await wait(320);
  ok(w.homePage===nb+1 || pages<2,"非编辑模式下左滑仍可翻页（homePage="+w.homePage+"）");

  ok(logs.length===0,"无脚本报错");
  console.log("\n==== "+pass+" 通过 / "+fail+" 失败 ====");
  process.exit(fail?1:0);
})();
