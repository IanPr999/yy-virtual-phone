// 跨屏拖动回归测试：验证翻页后图标仍「贴着指尖」而不是被吸附到自动填空格
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
const wait=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
w.go("home"); w.enterHomeEdit();
w.state.layout.widgets=[];
// 制造至少两页：page0 放一个被拖图标，page1 留一个让第 2 页真实存在
const all=w.state.layout.apps.filter(a=>!w.isDockApp(a.id));
const A=all[0]; A.page=0; A.cell=0; A.hide=false;
all.forEach(a=>{ if(a!==A) a.page=1; });
w.renderers.home();
ok(w.homePage===0, "初始在第 1 页");
const el0=w.document.querySelector('[data-app="'+A.id+'"]');
ok(!!el0, "被拖图标已渲染在第 1 页");

// 抓起来：模拟手指在 (100,100) 处按住（jsdom 下 getBoundingClientRect 返回 0，gx/gy=100）
w.beginHomeDrag(el0,{clientX:100,clientY:100,preventDefault(){}});
const oldGx=w.HD.gx, oldGy=w.HD.gy;
ok(oldGx===100&&oldGy===100, "抓取瞬间指尖偏移被记录 (gx,gy)=(100,100)");

// 拖到屏幕右边缘 → 触发 +1 翻页
w.homeDragMove({clientX:1000,clientY:100,preventDefault(){}});
ok(w.HD.lastX===1000&&w.HD.lastY===100, "移动到右边缘时更新了指针坐标");
ok(w.homePage===0, "翻页定时器触发前仍停留在第 1 页");

await wait(500);  // 等过 360ms 翻页定时器

ok(w.homePage===1, "翻页后已切到第 2 页");
ok(!!w.HD, "翻页后拖动会话（HD）重新接管、未丢失");
ok(w.HD.gx===oldGx&&w.HD.gy===oldGy, "翻页后「指尖偏移」被沿用，没被新格重算覆盖（不跟手的根因）");
const nel=w.document.querySelector('[data-app="'+A.id+'"]');
ok(!!nel, "翻页后被拖图标在新页重新渲染");
ok(parseInt(nel.style.left,10)===(1000-oldGx)&&parseInt(nel.style.top,10)===(100-oldGy), "翻页后图标重新贴回指尖 (left="+(1000-oldGx)+", top="+(100-oldGy)+")，而非吸附到格子");

// 继续移动：必须仍精确跟手
w.homeDragMove({clientX:1010,clientY:90,preventDefault(){}});
ok(parseInt(nel.style.left,10)===(1010-oldGx)&&parseInt(nel.style.top,10)===(90-oldGy), "翻页后继续拖动仍精确跟手 (left="+(1010-oldGx)+", top="+(90-oldGy)+")");

// 收尾：结束拖动，清掉可能挂起的二次翻页定时器
w.homeDragEnd();
ok(w.HD===null, "结束拖动后会话释放");
ok(logs.length===0,"无脚本报错");
console.log("\n==== "+pass+" 通过 / "+fail+" 失败 ====");
process.exit(fail?1:0);
})();
