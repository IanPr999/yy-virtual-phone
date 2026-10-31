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
  // ---------- 1. Dock ----------
  w.go("home");
  w.ensureLayout();
  ok(Array.isArray(w.state.layout.dock)&&w.state.layout.dock.length===3,"Dock 默认三项");
  ok(w.state.layout.dock.join(",")==="call,api,world","Dock 默认顺序：微信/模型/世界书");
  w.renderers.home();
  const dock=w.document.getElementById("homeDock");
  ok(dock&&dock.children.length===3,"Dock 渲染出 3 个图标（当前渲染）");
  ok(!!dock.querySelector('[data-app="call"]')&&!!dock.querySelector('[data-app="api"]')&&!!dock.querySelector('[data-app="world"]'),"Dock 含 微信/模型/世界书");
  // 网格里不应再重复出现这三个（iOS 风格：只放 Dock）
  const grid=w.document.getElementById("homeGrid");
  ok(!grid.querySelector('[data-app="call"]')&&!grid.querySelector('[data-app="api"]')&&!grid.querySelector('[data-app="world"]'),"Dock 应用不再重复出现在网格");
  ok(w.isDockApp("call")===true&&w.isDockApp("album")===false,"isDockApp 判定正确");

  // Dock 应用编辑器：应禁用「在桌面隐藏」（删不掉）
  w.openAppModal("call");
  let box=w.document.getElementById("modalBox");
  ok(!box.querySelector("#apHide"),"Dock 应用的图标编辑器不含「在桌面隐藏」勾选框（删不掉）");
  // 普通应用：仍保留隐藏勾选框
  w.openAppModal("album");
  box=w.document.getElementById("modalBox");
  ok(!!box.querySelector("#apHide"),"普通应用图标编辑器仍含隐藏勾选框");
  // 即便强行勾选/保存，Dock 应用也不会被隐藏
  w.openAppModal("call");
  box=w.document.getElementById("modalBox");
  const saveBtn=[...box.querySelectorAll('[data-mbtn]')].map((b,i)=>({b,i})).find(x=>x.b.textContent==="保存");
  box.querySelector("#apName").value="微信改名";
  saveBtn.b.click();
  const callApp=w.state.layout.apps.find(a=>a.id==="call");
  ok(callApp.hide===false,"Dock 应用保存后 hide 仍为 false（保护）");
  ok(callApp.name==="微信改名","Dock 应用可正常改名（编辑外观）");

  // ---------- 2. 微信设置 tab 顺序 ----------
  w.renderWxSetting("identity");
  let sbody=w.document.getElementById("wxSetBody");
  const btns=[...sbody.querySelectorAll("button")];
  ok(btns.length>=3&&btns[0].id==="wxTabId"&&btns[1].id==="wxTabPay","微信设置 tab 顺序：身份在最左，其次支付");
  ok(w.wxSetTab==="identity","微信设置默认 tab 为 identity");
  // 默认渲染身份内容
  ok(!!sbody.querySelector("#wxTabId"),"身份 tab 存在");

  // ---------- 3&4. 组件背景上传：独立浮层 + 保存按钮 + 不破坏父弹窗 ----------
  w.state.layout.widgets=[{id:"wA",type:"text",size:"2x2",page:0,title:"t",content:""}];
  w.openWidgetModal(w.state.layout.widgets[0]);
  box=w.document.getElementById("modalBox");
  ok(!!box.querySelector("#wgPickBg"),"组件编辑弹窗含背景上传按钮");
  box.querySelector("#wgPickBg").click();   // 触发 pickImageGeneric
  const ov=w.document.querySelector("#imgSave") ? w.document.querySelector("#imgSave").closest("div[style]") : null;
  ok(!!w.document.querySelector("#imgSave"),"pickImageGeneric 使用独立浮层（含保存按钮，不占用 #modalBox）");
  ok(!!w.document.querySelector("#imgUseUrl"),"浮层含「用这个地址」按钮");
  ok(!!box.querySelector("#wgBgName"),"父弹窗（组件编辑）表单未被覆盖、仍完好");
  ok(box.innerHTML.indexOf("组件背景图")>=0,"父弹窗仍保留组件表单内容");

  // 模拟选本地图片
  w.pickFile=function(accept,multi,cb){ cb([{name:"a.png"}]); };
  w.idbPut=function(){ return Promise.resolve(true); };
  w.refreshAlbum=function(cb2){ if(cb2) cb2(); };
  w.document.querySelector("#imgFile").click();
  await sleep(30);
  ok(w.document.querySelector("#imgSave").style.display!=="none","选完本地图片后「保存」按钮出现");
  w.document.querySelector("#imgSave").click();
  const wgt=w.state.layout.widgets[0];
  ok(wgt.bg&&wgt.bg.value,"保存后组件背景写入成功（w.bg.value 有值）");
  ok(box.querySelector("#wgBgName").textContent.indexOf("已选")>=0,"父弹窗背景名更新，未因找不到节点报错");

  ok(logs.length===0,"无脚本报错："+logs.join(" | "));
  console.log("\n==== "+pass+" 通过 / "+fail+" 失败 ====");
  process.exit(fail?1:0);
})();
