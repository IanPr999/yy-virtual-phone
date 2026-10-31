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
w.go("home");
w.state.layout.widgets=[];                                  // 去掉小组件，网格干净
const apps0 = w.state.layout.apps.filter(a=>(a.page||0)===0 && !w.isDockApp(a.id));
ok(apps0.length>=3, "首页至少有 3 个真实图标");
const A=apps0[0], B=apps0[1];
// 只留 A、B 在首页；其余全部挪到其它页，用来验证「留空隙」
w.state.layout.apps.forEach(a=>{ a.page = (a===A||a===B)?0:1; });
A.cell=0; B.cell=23;                                        // 显式放到首格与末格
w.renderers.home();
const grid=w.document.getElementById("homeGrid");
function cellOf(el){ const gc=parseInt(el.style.gridColumn,10), gr=parseInt(el.style.gridRow,10); const cols=w.state.settings.homeCols||4; return (gr-1)*cols+(gc-1); }
const cellMap={}; [...grid.querySelectorAll('.app')].forEach(el=>{ cellMap[cellOf(el)]=el.getAttribute('data-app'); });
ok(Object.keys(cellMap).length===2, "首页只渲染出 2 个图标（其余已分到其它页）");
ok(cellMap[0]===A.id, "图标 A 落在第 0 格（显式坐标生效）");
ok(cellMap[23]===B.id, "图标 B 落在第 23 格（显式坐标生效）");
const gap=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22].filter(c=>!cellMap[c]);
ok(gap.length===22, "第 1~22 格全部留空（证明可「放空格 / 留空隙」，不再强制紧凑填充）");
// 越界坐标安全降级
A.cell=999; w.renderers.home();
ok(grid.querySelector('[data-app="'+A.id+'"]').style.gridColumn!=="", "越界 cell 安全降级为自动填空（无异常）");
ok(['bindHomeItem','beginHomeDrag','homeDragMove','homeDragEnd','homeCellUnderPointer','homePlaceDraggedAt','enterHomeEdit'].every(f=>typeof w[f]==='function'),"拖动相关函数均已定义");
w.enterHomeEdit(); ok(w.homeEdit===true, "enterHomeEdit() 把 homeEdit 置为 true");
ok(logs.length===0,"无脚本报错");
console.log("\n==== "+pass+" 通过 / "+fail+" 失败 ====");
process.exit(fail?1:0);
