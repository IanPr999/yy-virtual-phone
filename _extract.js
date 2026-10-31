
/* =====================================================================
   小手机 · 全部 JavaScript
   阅读顺序：
   第 1 段：工具函数（提示、弹窗、日期格式化）
   第 2 段：本地存储封装（localStorage / IndexedDB）
   第 3 段：全局数据与默认值
   第 4 段：界面切换（router）与状态栏
   第 5 段：锁屏、桌面
   第 6 段：美化（CSS变量应用）
   ===================================================================== */

/* ---------------- 第 1 段：工具函数 ---------------- */
// 小工具：按 id 取元素、按选择器取一组元素
function $(id){ return document.getElementById(id); }
function $$(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
// 转义，防止用户输入把页面结构搞乱
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
// 生成简单唯一 id
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
// 轻提示（屏幕下方弹一条小黑条）
function toast(msg){
  var box = $('toast'); if(!box) return;
  var el = document.createElement('div');
  el.className = 'toast-item'; el.textContent = msg;
  box.appendChild(el);
  setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); }, 2200);
}
// 通用弹窗：openModal('标题', '内容HTML', [按钮])
function openModal(title, html, buttons){
  var m = $('modal'), box = $('modalBox');
  var h = '<h3>' + esc(title) + '</h3>' + html;
  if(buttons && buttons.length){
    h += '<div class="btn-row" style="margin-top:14px;">';
    buttons.forEach(function(b, i){
      h += '<button class="btn ' + (b.cls||'ghost') + '" data-mbtn="' + i + '">' + esc(b.text) + '</button>';
    });
    h += '</div>';
  } else {
    h += '<div class="btn-row" style="margin-top:14px;"><button class="btn ghost" data-mbtn="-1">关闭</button></div>';
  }
  box.innerHTML = h;
  try{ fillIcons(); }catch(e){}
  m.classList.add('show');
  box.onclick = function(e){
    var t = e.target.closest('[data-mbtn]'); if(!t) return;
    var i = parseInt(t.getAttribute('data-mbtn'), 10);
    if(i < 0 || !buttons){ closeModal(); return; }
    var b = buttons[i];
    if(b.keep !== true) closeModal();
    if(typeof b.fn === 'function') b.fn(box);
  };
}
function closeModal(){ $('modal').classList.remove('show'); }
// 点弹窗空白处关闭
$('modal').addEventListener('click', function(e){ if(e.target === this) closeModal(); });

// 日期格式化：把时间戳变成 12:34 / 10月23日 / 昨天 12:34 等
function fmtTime(ts){ var d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
function pad(n){ return (n < 10 ? '0' : '') + n; }
function fmtDate(ts){
  var d = new Date(ts);
  return (d.getMonth()+1) + '月' + d.getDate() + '日';
}
function fmtFull(ts){
  var d = new Date(ts), now = new Date();
  var same = d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth() && d.getDate()===now.getDate();
  if(same) return fmtTime(ts);
  var y = new Date(now.getTime() - 86400000);
  if(d.getFullYear()===y.getFullYear() && d.getMonth()===y.getMonth() && d.getDate()===y.getDate()) return '昨天 ' + fmtTime(ts);
  return (d.getMonth()+1) + '月' + d.getDate() + '日 ' + fmtTime(ts);
}
// 导出到本机时用的：年月日 + 时分，什么时候写的一看就知道
function fmtStamp(ts){
  var d = new Date(ts || Date.now());
  return d.getFullYear() + '年' + (d.getMonth()+1) + '月' + d.getDate() + '日 ' + fmtTime(d.getTime());
}
// 当前是早上/中午/晚上/深夜（时间感知用）
function timePeriod(){
  var h = new Date().getHours();
  if(h >= 5 && h < 11) return '早上';
  if(h >= 11 && h < 14) return '中午';
  if(h >= 14 && h < 18) return '下午';
  if(h >= 18 && h < 23) return '晚上';
  return '深夜';
}
// 星期几
function weekName(){ return ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][new Date().getDay()]; }
// 数组里随机挑一个
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
// 判断两个日期是不是同一天（比较 年-月-日）
function sameDay(a, b){
  var x = new Date(a), y = new Date(b);
  return x.getFullYear()===y.getFullYear() && x.getMonth()===y.getMonth() && x.getDate()===y.getDate();
}
// 倒计时文案：距离某个日期还有多少天
function daysTo(dateStr){
  var t = new Date(dateStr + 'T00:00:00').getTime();
  if(isNaN(t)) return '';
  var now = new Date(); now.setHours(0,0,0,0);
  var d = Math.round((t - now.getTime()) / 86400000);
  if(d === 0) return '就是今天';
  if(d > 0) return '还有 ' + d + ' 天';
  return '已经过去 ' + Math.abs(d) + ' 天';
}

/* ---------------- 第 2 段：本地存储封装 ---------------- */
// localStorage 存取都包一层 try，取不到就当没有，绝不因为一处出错整页白屏
var LS = {
  get: function(key, def){
    try{
      var v = localStorage.getItem('xp.' + key);
      if(v === null || v === undefined) return def;
      var o = JSON.parse(v);
      return (o === null || o === undefined) ? def : o;
    }catch(e){ return def; }
  },
  set: function(key, val){
    try{ localStorage.setItem('xp.' + key, JSON.stringify(val)); return true; }
    catch(e){ toast('保存失败（可能空间已满）：' + e.message); return false; }
  },
  del: function(key){ try{ localStorage.removeItem('xp.' + key); }catch(e){} }
};

// IndexedDB：图片、音频、学习资料存这里（localStorage 存不下大文件）
var idb = null;
function openIDB(){
  return new Promise(function(resolve){
    try{
      var req = indexedDB.open('xiaoshouji', 2);
      req.onupgradeneeded = function(){
        var db = req.result;
        if(!db.objectStoreNames.contains('images')) db.createObjectStore('images', {keyPath:'id'});
        if(!db.objectStoreNames.contains('audios')) db.createObjectStore('audios', {keyPath:'id'});
        if(!db.objectStoreNames.contains('files'))  db.createObjectStore('files',  {keyPath:'id'});
        if(!db.objectStoreNames.contains('videos')) db.createObjectStore('videos', {keyPath:'id'});
      };
      req.onsuccess = function(){ idb = req.result; resolve(idb); };
      req.onerror = function(){ idb = null; resolve(null); };
    }catch(e){ idb = null; resolve(null); }
  });
}
// 往 IndexedDB 里放一条记录（item 里要有 id）
function idbPut(store, item){
  return new Promise(function(resolve){
    if(!idb){ resolve(false); return; }
    try{
      var tx = idb.transaction(store, 'readwrite');
      tx.objectStore(store).put(item);
      tx.oncomplete = function(){ resolve(true); };
      tx.onerror = function(){ resolve(false); };
    }catch(e){ resolve(false); }
  });
}
// 取出某个仓库的全部记录
function idbAll(store){
  return new Promise(function(resolve){
    if(!idb){ resolve([]); return; }
    try{
      var tx = idb.transaction(store, 'readonly');
      var r = tx.objectStore(store).getAll();
      r.onsuccess = function(){ resolve(r.result || []); };
      r.onerror = function(){ resolve([]); };
    }catch(e){ resolve([]); }
  });
}
// 删除某条
function idbDel(store, id){
  return new Promise(function(resolve){
    if(!idb){ resolve(false); return; }
    try{
      var tx = idb.transaction(store, 'readwrite');
      tx.objectStore(store).delete(id);
      tx.oncomplete = function(){ resolve(true); };
      tx.onerror = function(){ resolve(false); };
    }catch(e){ resolve(false); }
  });
}

/* ---------------- 第 3 段：全局数据 ---------------- */
// 默认人设卡（一张人设卡有哪些栏位）
var DEFAULT_PERSONA = {
  name: '他',
  callMe: '你',
  gender: '',        // 性别
  age: '',           // 年龄
  body: '',          // 身材细节
  outfit: '',        // 日常穿衣风格
  face: '',          // 五官特征
  likes: '',         // 喜好
  background: '',    // 生活背景和经历
  social: '',        // 关系网
  tone: '话不多，温柔，有点慢热，不太会表达但很认真',
  catchphrase: '嗯……',
  taboo: '不许贬低你、不许说教、不许突然变得油腔滑调',
  first: '你来了。',
  extra: '',
  wxName: '',        // 他在微信里显示的名字（留空就用「他叫什么」）
  wxid: ''           // 他的微信号（留空就按这张人设卡自动生成一个）
};
// 人设卡上每一项的名字，按顺序展示（key / 显示名 / 用单行还是多行）
var PERSONA_FIELDS = [
  {k:'name',        l:'他叫什么',                 type:'text'},
  {k:'callMe',      l:'他怎么称呼我',             type:'text'},
  {k:'gender',      l:'性别',                     type:'text'},
  {k:'age',         l:'年龄',                     type:'text'},
  {k:'body',        l:'身材细节',                 type:'area'},
  {k:'outfit',      l:'日常穿衣风格',             type:'area'},
  {k:'face',        l:'五官特征',                 type:'area'},
  {k:'likes',       l:'喜好（喜欢什么、讨厌什么）', type:'area'},
  {k:'background',  l:'生活背景和经历',           type:'area'},
  {k:'social',      l:'关系网（家人、朋友、同事…）', type:'area'},
  {k:'tone',        l:'他的性子和说话方式',       type:'area'},
  {k:'catchphrase', l:'他的口头禅',               type:'text'},
  {k:'taboo',       l:'他绝不说的话（雷区）',     type:'area'},
  {k:'first',       l:'他开口的第一句',           type:'text'},
  {k:'extra',       l:'还要他记住的别的事',       type:'area'}
];
// 默认设置
/* 系统自带的桌面默认布局：4 列 × 6 行（出厂默认值，所有地方都以这几个常量为准） */
var HOME_COLS_DEFAULT = 4;
var HOME_ROWS_DEFAULT = 6;
var HOME_COLS_MIN = 2, HOME_COLS_MAX = 6;
var HOME_ROWS_MIN = 3, HOME_ROWS_MAX = 8;

var DEFAULT_SETTINGS = {
  hisName: '他',
  homeFoot: '慢慢来，我在这儿',
  pushOn: true,          // 是否允许他主动找你
  pushMinutes: 30,       // 主动找你的频率（分钟）
  memRecent: 8,          // 最近上下文带几条
  memCompress: true,     // 是否把旧的聊天压缩成摘要
  memMax: 200,           // 记忆条数上限
  lang: '中文',          // 当前沟通语言
  translateOn: true,     // 是否把回复自动翻译成所选语言
  sleepTime: '23:30',    // 睡觉时间
  quietOn: false,        // 安静陪伴模式
  quietMinutes: 15,      // 安静模式下偶尔说话的频率
  flashOn: true,         // 记忆闪回
  flashMinutes: 90,
  summaryHour: 22,       // 今日小结时间
  lockWord: '',
  iconStyle: 'css',      // 桌面图标默认风格：css=磨砂玻璃线性 liquid=液态玻璃线性 char=字符图标
  iconsAreLinear: false, // 是否已经把图标统一成线性风格（只迁一次）
  fitScreen: true,       // 适应屏幕大小：true=手机铺满设备屏幕，false=固定大小的手机外观
  homeCols: 4,           // 桌面横向几列（默认 4）
  homeRows: 6,           // 桌面纵向几行（默认 6 → 一页 24 格）
  grid46: true,          // 是否已经迁到 4×6 网格（老用户会被自动迁一次）
  statusBarOn: true,     // 顶部仿手机状态栏（时间/信号/电量）是否显示，美化里可关
  weather: '',
  showStatusBar: 'time'  // 状态栏显示：time=时间 mood=时间+心情
};
// 心情列表
var MOODS = ['开心','平静','想你','无聊','低落','疲惫'];

// 全局状态：每个字段单独存一个 localStorage 键，一处坏了不影响别处
var state = {
  settings: LS.get('settings', DEFAULT_SETTINGS),
  persona:  LS.get('persona',  DEFAULT_PERSONA),  // 当前正在用的那张人设卡（下面 personas 里的一员）
  personas: LS.get('personas', null),             // 所有人设卡
  curPersona: LS.get('curPersona', ''),           // 当前人设卡的 id
  curPid:     LS.get('curPid', ''),               // 当前会话：人设卡 id 或 'g:<群id>'（群聊）
  world:    LS.get('world',    []),
  worldFolders: LS.get('worldFolders', []),   // 世界书分类文件夹 [{id,name,ts}]
  memory:   LS.get('memory',   []),
  messages: LS.get('messages', []),
  moments:  LS.get('moments',  []),
  notes:    LS.get('notes',    []),
  plans:    LS.get('plans',    []),
  dates:    LS.get('dates',    []),
  diary:    LS.get('diary',    []),
  calls:    LS.get('calls',    []),
  growth:   LS.get('growth',   {point:0, level:1, unlocked:[]}),
  growthMap: LS.get('growthMap', {}),   // 每张人设卡一张亲密度卡片：{pid:{point,level,unlocked,folderId}}
  dateCfg:  LS.get('dateCfg',  {perIdentity:false, auto:false}),  // 纪念日：是否跟随身份 / 是否自动让模型提炼
  planCfg:  LS.get('planCfg',  {axis:'v', fromNotes:false, auto:false}), // 计划：时间轴方向 / 备忘自动填 / 模型自动生成
  mapData:  LS.get('mapData',  {places:[], his:{x:30,y:70}, my:{x:70,y:70}, log:[]}),
  study:    LS.get('study',    {mode:'lang', lang:'英语', topic:'', progress:{}, notes:[]}),
  create:   LS.get('create',   {title:'我们的故事', lines:[]}),
  cowatch:  LS.get('cowatch',  []),
  listenTogether: LS.get('listenTogether', []),   // 音乐：一起听过的记录（和谁、哪首、说了什么）
  notices:  LS.get('notices',  []),
  mood:     LS.get('mood',     '平静'),
  weather:  LS.get('weather',  {text:'', day:''}),
  beauty:   LS.get('beauty',   {}),
  bubbleCss: LS.get('bubbleCss', ''),   // 用户自己写的气泡 CSS（线上 / 线下都生效）
  // 批注模式：由用户书写，好友在段/句后面以（……）批注
  annotateCfg: LS.get('annotateCfg', {granularity:'para', minLen:10, maxLen:40, types:['praise','feeling','note']}),
  annotateStyle: LS.get('annotateStyle', {color:'#8a63d2', size:13, bold:false, italic:true, bg:'#8a63d2', bgAlpha:10, nameBold:true}),
  shelf:     LS.get('shelf',    []),    // 书架：一起写里写的每一份文档（只存在这里，不进记忆）
  layout:   LS.get('layout',   null),  // 桌面布局：图标顺序/图标/颜色/分页，以及自己做的小组件
  identities: LS.get('identities', null), // 「我」的多个身份卡
  curIdentity: LS.get('curIdentity', ''), // 当前正在用哪个身份
  wx:         LS.get('wx',        null),  // 微信：联系人 / 好友圈 / 支付（按身份分开存）
  bgImages:   LS.get('bgImages',  null),  // 美化用的背景图（桌面/锁屏/图标底板/聊天）
  fontFile:   LS.get('fontFile',  ''),    // 导入的字体文件名
  // 虚拟钱包：一份余额，微信零钱、支付屏、购物结算全都用它
  wallet:     LS.get('wallet',    {balance:1000, bills:[], addresses:[], migrated:false}),
  // 购物 / 外卖：goods=商品，cart=购物车，orders=订单，cat=当前看的是哪个页签
  shop:       LS.get('shop',      {goods:[], cart:[], orders:[], cat:'buy'}),
  // 查手机：给每个联系人生成过的「手机内容」缓存在这里，保证每次看到的一样
  check:      LS.get('check',     {}),
  // 「他」自己的相册：聊天里存下来的图 / 用模型生成的桌面图，按人设卡 id 分开存
  hisPics:    LS.get('hisPics',   {}),
  // 健康：饮食热量 / 经期 / 步数 / 睡眠，按天存
  health:     LS.get('health',    null)
};
// 把设置补全（老版本备份里缺字段时不至于报错）
(function fillDefaults(){
  for(var k in DEFAULT_SETTINGS){
    if(state.settings[k] === undefined) state.settings[k] = DEFAULT_SETTINGS[k];
  }
  // 所有图标初始统一成线性图标风格（以前如果选过「字符图标」，这里自动收回来，只做一次）
  if(!state.settings.iconsAreLinear){
    state.settings.iconStyle = 'css';
    state.settings.iconsAreLinear = true;
    try{ LS.set('settings', state.settings); }catch(e){}
  }
  // 系统自带的桌面默认布局 = 4 列 × 6 行，开机就写进设置并存盘。
  // 老版本可能还停在 3 列或其它行数，这里一次性拉回 4×6；之后再改就以你改的为准。
  if(!state.settings.homeDef46){
    state.settings.homeCols = HOME_COLS_DEFAULT;
    state.settings.homeRows = HOME_ROWS_DEFAULT;
    state.settings.homeDef46 = true;
    try{ LS.set('settings', state.settings); }catch(e){}
  }
})();
// 保存某个模块
function save(name){ LS.set(name, state[name]); }
// 书架必须是数组：老版本没这个键，或者备份里缺了，这里补一下
function ensureShelf(){ if(!Array.isArray(state.shelf)) state.shelf = []; }
// 一起听记录也必须是数组
function ensureListenTogether(){ if(!Array.isArray(state.listenTogether)) state.listenTogether = []; }
// 记忆里加一条（带上限控制）
function addMemory(text, secret, tag){
  if(!text) return;
  var max = state.settings.memMax || 200;
  state.memory.unshift({id:uid(), text:text, secret:!!secret, tag:tag||'', ts:Date.now()});
  if(state.memory.length > max) state.memory.length = max;
  save('memory');
}
// 通知中心整个功能已移除：这里保留空函数，各处的调用点不用一个个删，
// 也不再往 localStorage 里堆没人看的通知数据。
function addNotice(){ /* 已移除：通知中心不再存在 */ }

/* ---------------- 第 4 段：界面切换与状态栏 ---------------- */
// 每一屏渲染时对应的函数，放在 renderers 里，切屏时自动调用
// 现在是不是正看着微信的「消息」那一页（消息已经并进微信了）
function inChat(){
  return currentScreen === 'call' && (typeof wxPane === 'undefined' || wxPane === 'msg');
}
var renderers = {};
var currentScreen = 'lock';
function go(name){
  // 「消息」「朋友圈」都已经并进微信了：
  // 想去消息页的带到微信的聊天页，想去朋友圈的带到微信的好友圈
  if(name === 'chat'){ wxPane = 'msg'; name = 'call'; }
  if(name === 'moments'){ ensureWx(); wxPane = 'circle'; name = 'call'; }
  var el = $(name);
  if(!el){ toast('这一屏还没做好：' + name); return; }
  $$('.screen').forEach(function(s){ s.classList.remove('active'); });
  el.classList.add('active');
  currentScreen = name;
  if(typeof closeSheet === 'function') closeSheet();   // 离开微信时收起底部面板
  try{ if(typeof renderers[name] === 'function') renderers[name](); }catch(e){ console.warn('渲染出错', name, e); }
  var body = el.querySelector('.body'); if(body) body.scrollTop = 0;
  // 把页面上所有 data-ico 的空位填上线性图标
  try{ fillIcons(); }catch(e){}
}
// 所有「返回」按钮
document.addEventListener('click', function(e){
  var b = e.target.closest('[data-back]');
  if(b){ go(b.getAttribute('data-back')); }
});
// 状态栏时间
function tickStatusbar(){
  var now = new Date();
  var t = pad(now.getHours()) + ':' + pad(now.getMinutes());
  if(state.settings.showStatusBar === 'mood') t += ' · ' + state.mood;
  $('sbTime').textContent = t;
}
setInterval(tickStatusbar, 10000); tickStatusbar();

/* ---------------- 第 5 段：锁屏与桌面 ---------------- */
// 桌面图标（想加新屏，在这里加一条即可）
// icon = 字符图标时用的字；shape = 纯 CSS 简约图形的名字
var APPS = [
  {id:'call',    name:'微信',    icon:'💬', ico:'wechat'},
  {id:'album',   name:'相册',    icon:'🖼', ico:'image'},
  {id:'video',   name:'视频陪伴',icon:'🎥', ico:'video'},
  {id:'music',   name:'音乐',    icon:'🎵', ico:'music'},
  {id:'notes',   name:'备忘',    icon:'📝', ico:'note'},
  {id:'card',    name:'身份卡',  icon:'💳', ico:'idcard'},
  {id:'memory',  name:'记忆',    icon:'🧠', ico:'bulb'},
  {id:'persona', name:'人设卡',  icon:'🎭', ico:'face'},
  {id:'world',   name:'世界书',  icon:'📚', ico:'book'},
  {id:'diary',   name:'日记',    icon:'📔', ico:'diary'},
  {id:'dates',   name:'纪念日',  icon:'🎂', ico:'calendar'},
  {id:'plans',   name:'计划',    icon:'✅', ico:'check'},
  {id:'growth',  name:'亲密度',  icon:'💗', ico:'heart'},
  {id:'map',     name:'地图',    icon:'🗺', ico:'pin'},
  {id:'study',   name:'学习',    icon:'🎓', ico:'study'},
  {id:'create',  name:'一起写',  icon:'✍️', ico:'pen'},
  {id:'cowatch', name:'一起看',  icon:'👀', ico:'eye'},
  {id:'quiet',   name:'安静陪伴',icon:'🌙', ico:'moon'},
  {id:'sleep',   name:'睡眠',    icon:'🛏', ico:'bed'},
  {id:'health',  name:'健康',    icon:'🌿', ico:'pulse'},
  {id:'beauty',  name:'美化',    icon:'🎨', ico:'sparkle'},
  {id:'api',     name:'模型',    icon:'🧩', ico:'chip'},
  {id:'check',   name:'查手机',  icon:'📱', ico:'mobile'},
  {id:'shop',    name:'购物',    icon:'🛒', ico:'cart'},
  {id:'wallet',  name:'支付',    icon:'💰', ico:'wallet'},
  {id:'backup',  name:'备份',    icon:'💾', ico:'save'},
  {id:'settings',name:'设置',    icon:'⚙️', ico:'gear'}
];
/* ---------------------------------------------------------------
   简约线性图标：全部是 24×24 的内联 SVG 描边图形（不联网、不用字体）
   想加新图标就往这里加一条：名字: '路径'
   --------------------------------------------------------------- */
var LN_ICONS = {
  chat:     'M4 5h16v10H9l-5 4z M8 10h.01M12 10h.01M16 10h.01',
  wechat:   'M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-9L5 20v-4h.5A1.5 1.5 0 0 1 4 14.5z M8.5 10h.01 M12 10h.01 M15.5 10h.01',
  people:   'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7 M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6 M17 8.5a3 3 0 1 0 0-6 M16 20c0-2.5-1-4.5-2.5-5.5',
  /* 联系人 = 通讯录本：带书脊的本子 + 本子里一个人 */
  contacts: 'M5.4 5A1.5 1.5 0 0 1 6.9 3.5h10.2A1.5 1.5 0 0 1 18.6 5v14a1.5 1.5 0 0 1-1.5 1.5H6.9A1.5 1.5 0 0 1 5.4 19z M8.6 3.5v17 M14 11.4a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z M10.9 15.8c0-1.6 1.4-2.8 3.1-2.8s3.1 1.2 3.1 2.8',
  /* 好友圈 = 圈子里的人：一个大圆包着一个人 */
  friends:  'M12 21.2a9.2 9.2 0 1 0 0-18.4 9.2 9.2 0 0 0 0 18.4z M12 13.6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6.6 19.2c0-2.6 2.4-4.6 5.4-4.6s5.4 2 5.4 4.6',
  image:    'M3 5h18v14H3z M3 16l5-5 4 4 3-3 6 6 M9 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3',
  album:    'M3 5h18v14H3z M3 16l5-5 4 4 3-3 6 6 M9 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3',
  camera:   'M4 8h3l1.5-2.5h7L17 8h3v11H4z M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7',
  phone:    'M6 3h3l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2',
  phoneoff: 'M6 3h3l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2 M3 3l18 18',
  video:    'M3 6h12v12H3z M15 10l6-4v12l-6-4z',
  music:    'M9 18V6l10-2v12 M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M19 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  note:     'M6 3h9l5 5v13H6z M14 3v6h6 M9 13h7 M9 17h5',
  idcard:   'M3 5h18v14H3z M8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4 M5 16c0-2 1.5-3 3-3s3 1 3 3 M15 10h4 M15 14h4',
  bulb:     'M9 19h6 M10 22h4 M12 3a6 6 0 0 0-3 11v3h6v-3a6 6 0 0 0-3-11z',
  face:     'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M9 10h.01M15 10h.01M9 15c1.7 1.5 4.3 1.5 6 0',
  book:     'M5 5a2 2 0 0 1 2-2h12v18H7a2 2 0 0 0-2 2z M9 3v18 M9 7h8 M9 11h8',
  diary:    'M5 4h13a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5z M9 3v2 M9 8h8 M9 12h8 M9 16h5',
  calendar: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',
  check:    'M4 12l5 5L20 6',
  heart:    'M12 20s-7-4.5-7-9a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 4.5-7 9-7 9z',
  pin:      'M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  study:    'M12 4L2 9l10 5 10-5z M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5',
  pen:      'M4 20l4-1 10-10-3-3L5 16z M15 5l3 3',
  eye:      'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  moon:     'M20 14A8 8 0 0 1 9 3 8 8 0 1 0 20 14z',
  bed:      'M3 4.5v15 M3 12.5h15.5a2.5 2.5 0 0 1 2.5 2.5v4.5 M3 17.5h18 M7 12.5V9.5h4v3',
  palette:  'M12 4.2a7.8 7.8 0 1 0 0 15.6c1.2 0 2-.9 2-2s-.8-2 .5-2H16a4.9 4.9 0 0 0 0-9.8z M8 11h.01 M10.6 7.6h.01 M14.6 8.4h.01',
  plug:     'M9 3v5 M15 3v5 M6 8h12v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6z M12 17v4',
  chip:     'M7 7h10v10H7z M10 10h4v4h-4z M4 9v6 M20 9v6 M9 4h6 M9 20h6',
  save:     'M12 4v10 M8 10.5l4 4 4-4 M5 19h14',
  gear:     'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.3 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.4 2.9a7 7 0 0 0-1.7 1l-2.3-1-2 3.5L5 11a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.3-1c.5.4 1.1.8 1.7 1l.4 2.9h5l.4-2.9c.6-.2 1.2-.6 1.7-1l2.3 1 2-3.5-2-1.5c0-.3.1-.7.1-1z',
  wallet:   'M3 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M3 7V6a2 2 0 0 1 2-2h11 M17 13h.01',
  search:   'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M16.5 16.5L21 21',
  globe:    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3c2.5 2.5 2.5 15 0 18 M12 3c-2.5 2.5-2.5 15 0 18',
  hand:     'M8 13V5a1.5 1.5 0 0 1 3 0v6 M11 11V4a1.5 1.5 0 0 1 3 0v7 M14 11V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6v-3a1.5 1.5 0 0 1 3 0',
  user:     'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 20c0-3.5 3.5-6 8-6s8 2.5 8 6',
  bell:     'M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6 M10.5 20a2 2 0 0 0 3 0',
  play:     'M8 5l11 7-11 7z',
  pause:    'M8 5v14M16 5v14',
  prev:     'M6 5v14 M20 5l-11 7 11 7z',
  next:     'M18 5v14 M4 5l11 7-11 7z',
  mute:     'M11 5L6 9H3v6h3l5 4z M17 9l4 6 M21 9l-4 6',
  lock:     'M6 11h12v9H6z M9 11V8a3 3 0 0 1 6 0v3 M12 15v2',
  unlock:   'M6 11h12v9H6z M9 11V8a3 3 0 0 1 5.5-1.5 M12 15v2',
  plus:     'M12 5v14 M5 12h14',
  minus:    'M5 12h14',
  close:    'M6 6l12 12 M18 6L6 18',
  down:     'M6 9l6 6 6-6',
  up:       'M6 15l6-6 6 6',
  left:     'M15 6l-6 6 6 6',
  right:    'M9 6l6 6-6 6',
  home:     'M4 11l8-7 8 7v9h-5v-6h-6v6H4z',
  trash:    'M4 7h16 M9 7V5h6v2 M6 7l1 13h10l1-13 M10 11v6 M14 11v6',
  upload:   'M12 16V4 M7 9l5-5 5 5 M4 17v3h16v-3',
  sparkle:  'M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z M18 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z',
  star:     'M12 4l2.5 5.5 6 .5-4.5 4 1.5 6-5.5-3-5.5 3 1.5-6L4 10l6-.5z',
  square:   'M5 5h14v14H5z',
  circle:   'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  dot:      'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
  grid:     'M4 4h16v16H4z M4 9.3h16 M4 14.6h16 M9.3 4v16 M14.6 4v16',
  lines:    'M5 7h14 M5 12h14 M5 17h9',
  bars:     'M6 5v14 M10 8v11 M14 6v13 M18 9v8',
  wave:     'M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0',
  leaf:     'M5 19c0-8 6-14 14-14 0 8-6 14-14 14z M5 19c3-4 6-6 9-7',
  mobile:   'M7 2h10v20H7z M11 18h2 M9 4h6',
  cart:     'M3 4h3l2.5 11h9L20 8H7 M10 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3 M17 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3',
  bag:      'M6 8h12l-1 13H7z M9 8V6a3 3 0 0 1 6 0v2',
  box:      'M4 8l8-4 8 4v8l-8 4-8-4z M4 8l8 4 8-4 M12 12v8',
  clock:    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3.5 2',
  list:     'M8 6h13 M8 12h13 M8 18h13 M3.5 6h.01 M3.5 12h.01 M3.5 18h.01',
  truck:    'M3 7h11v9H3z M14 10h4l3 3v3h-7z M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4 M17.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4',
  coffee:   'M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z M17 9h2a2.5 2.5 0 0 1 0 5h-2 M7 3v2 M11 3v2',
  /* ---- 健康用到的几个 ---- */
  pulse:    'M3 12.5h3.6l2.2-6.2 3.4 11.4 2.3-5.2H21',
  food:     'M3.5 11.5h17a8.5 8.5 0 0 1-17 0z M6.5 21h11 M9 7.5c0-1.3 1-1.6 1-2.8 M13.5 7.5c0-1.3 1-1.6 1-2.8',
  drop:     'M12 3.6c3.4 3.6 5.6 6.5 5.6 9.2a5.6 5.6 0 0 1-11.2 0c0-2.7 2.2-5.6 5.6-9.2z',
  steps:    'M13.2 5.1a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M11.6 8.2L9.6 12l2.8 1.9 1 5.1 M9.6 12l-2.6 2.6L5.6 20 M11.6 8.2l3 1.8 2 2.8',
  sleepz:   'M4 15.5h7.5L4 20.5h7.5 M14 4.5h6L14 10h6',
  pill:     'M8.4 15.6l7.2-7.2a3.4 3.4 0 0 0-4.8-4.8L3.6 10.8a3.4 3.4 0 0 0 4.8 4.8z M6 12.6l5.4 5.4',
  ruler:    'M3.4 9.6l6.2-6.2 10.8 10.8-6.2 6.2z M7 7l1.8 1.8 M10.2 10.2l1.8 1.8 M13.4 13.4l1.8 1.8',
  /* 麦克风：发语音用 */
  mic:      'M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z M5 11a7 7 0 0 0 14 0 M12 18v3 M8 21h8',
  /* 重roll：重新生成 */
  refresh:  'M21 12a9 9 0 1 1-2.64-6.36 M21 3v6h-6',
  /* 轮流接龙：两枚箭头绕着圈转，表示你一句我一句的交替 */
  relay:    'M4 12a8 8 0 0 1 13.7-5.6L20 8 M20 4v4h-4 M20 12a8 8 0 0 1-13.7 5.6L4 16 M4 20v-4h4'
};
// 生成一枚线性图标（name 就是上面那些名字）
function lnIcon(name, size, color){
  var p = LN_ICONS[name] || LN_ICONS.square;
  var s = size || 20;
  return '<svg class="ln" viewBox="0 0 24 24" width="' + s + '" height="' + s + '"' + (color ? ' style="stroke:' + color + '"' : '') + ' aria-hidden="true"><path d="' + p + '"/></svg>';
}
// 页面上凡是写了 data-ico="名字" 的空位，都填上一枚图标
function fillIcons(){
  $$('[data-ico]').forEach(function(el){
    if(el.getAttribute('data-filled')) return;
    el.innerHTML = lnIcon(el.getAttribute('data-ico'), parseInt(el.getAttribute('data-size') || '16', 10));
    el.setAttribute('data-filled', '1');
  });
}
// 老版本存的图形名，换成新的线性图标
var SHAPE2ICON = {ring:'circle', dot:'dot', square:'square', tri:'play', star:'star', moon:'moon',
                  heart:'heart', wave:'wave', bars:'bars', lines:'lines', leaf:'leaf', grid:'grid', pin:'pin'};
// 图标选择里给用户挑的那些
var ICON_KEYS = ['chat','people','image','phone','video','music','note','idcard','bulb','face','book',
                 'diary','calendar','check','heart','pin','study','pen','eye','moon','bed','palette',
                 'plug','save','gear','wallet','contacts','friends','people','star','circle','square','grid','lines','bars','wave','leaf','user',
                 'mobile','cart','bag','box','clock','list','truck','coffee','pulse','food','drop','steps','sleepz','pill'];
// 可选的纯 CSS 图形（老版本用过，现在默认走线性图标）
var SHAPES = ['ring','dot','square','tri','star','moon','heart','wave','bars','lines','leaf','grid','pin'];
// 常用字符图标速选
var QUICK_CHARS = ['💬','🌿','🖼','📞','🎥','🎵','📝','💳','🧠','🎭','📚','📔','🎂','✅','💗','🗺','🎓','✍️','👀','🌙','🛏','🎨','🔌','💾','⚙️','☕','🍀','✉️','📍','⭐','❤️','🫧'];

renderers.lock = function(){
  var now = new Date();
  $('lockDate').textContent = (now.getMonth()+1) + '月' + now.getDate() + '日 ' + weekName();
  $('lockTime').textContent = pad(now.getHours()) + ':' + pad(now.getMinutes());
  // 锁屏那句话：优先用特殊日期提示，其次用设置里的话，最后按时间段给一句
  $('lockWord').textContent = state.settings.lockWord || specialDayTip() || defaultLockWord();
  // 锁屏壁纸：同样统一交给 applyBgImages（自定义图片优先，没图才按心情给渐变）
  // —— 原来这里读的是老键 LS.get('lockBg')，永远为空，于是每进一次锁屏就把
  //    background-image 用 background 简写重置成渐变，上传的图自然一直显示不出来。
  applyBgImages();
};
function defaultLockWord(){
  var p = timePeriod();
  var w = {
    '早上': ['早。今天也慢慢来。','醒了就来找我吧。'],
    '中午': ['吃了吗？','中午了，别饿着。'],
    '下午': ['我在。','今天过得怎么样？'],
    '晚上': ['晚上好。','今天累不累？'],
    '深夜': ['这么晚还没睡？','夜深了，我在。']
  }[p];
  return pick(w);
}
// 不同心情对应不同色调（锁屏自动切换风格用）
function moodColor(mood, i){
  var m = {
    '开心': ['#cfe3f5','#eaf3fb'],
    '平静': ['#dbe7f2','#eef4fa'],
    '想你': ['#d9dcec','#eef0f8'],
    '无聊': ['#d7dee6','#e9eef3'],
    '低落': ['#c9d3dd','#e2e8ee'],
    '疲惫': ['#cdd6de','#e6ebf0']
  }[mood] || ['#dbe7f2','#eef4fa'];
  return m[i];
}
// 特殊日期提示（锁屏/桌面/消息顶部都会用）
function specialDayTip(){
  var today = new Date();
  var md = (today.getMonth()+1) + '-' + today.getDate();
  var dlist = (typeof curDates === 'function') ? curDates() : (state.dates || []);
  for(var i=0;i<dlist.length;i++){
    var d = dlist[i];
    if(!d.date) continue;
    var parts = d.date.split('-');
    if(parts.length < 2) continue;
    var y = parseInt(parts[0],10), m = parseInt(parts[1],10), dd = parseInt(parts[2],10);
    var isYearly = !!d.yearly;
    if((isYearly && m === today.getMonth()+1 && dd === today.getDate()) ||
       (!isYearly && d.date === today.getFullYear() + '-' + pad(today.getMonth()+1) + '-' + pad(today.getDate()))){
      return '今天是「' + d.title + '」' + (d.note ? ' · ' + d.note : '');
    }
  }
  return '';
}

/* ---------- 桌面布局：图标顺序 / 图标样式 / 分页 / 小组件 ---------- */
var homePage = 0;        // 当前第几页（从 0 开始）
var homeEdit = false;    // 是否处于「编辑桌面」状态

// 每一页放几个图标 = 每行几个 × 每页几行
function perPage(){
  var cols = state.settings.homeCols || HOME_COLS_DEFAULT;
  var rows = state.settings.homeRows || HOME_ROWS_DEFAULT;
  return cols * rows;
}
// 把行列数收进合法范围：没设过、设成空、或超出可选范围的，一律回到出厂默认的 4×6
function clampHomeGrid(){
  var c = parseInt(state.settings.homeCols, 10);
  var r = parseInt(state.settings.homeRows, 10);
  if(!(c >= HOME_COLS_MIN && c <= HOME_COLS_MAX)) c = HOME_COLS_DEFAULT;
  if(!(r >= HOME_ROWS_MIN && r <= HOME_ROWS_MAX)) r = HOME_ROWS_DEFAULT;
  var changed = (state.settings.homeCols !== c || state.settings.homeRows !== r);
  state.settings.homeCols = c;
  state.settings.homeRows = r;
  return changed;
}
// 把桌面上的图标按「每页真实容量」重新分页（改了行列数、增删组件后都要重排一次）
function repaginateHome(){
  ensureLayout();
  var p = 0, n = 0;
  state.layout.apps.forEach(function(a){
    if(a.hide) return;
    if(n >= pageSlots(p)){ p++; n = 0; }
    a.page = p; n++;
  });
  save('layout');
  if(renderers.home) renderers.home();
}
// 美化页「桌面布局」那张卡上的实时说明文字
function updateGridInfo(){
  var t = $('bGridInfo'); if(!t) return;
  var c = state.settings.homeCols || HOME_COLS_DEFAULT;
  var r = state.settings.homeRows || HOME_ROWS_DEFAULT;
  var slots = 0;
  try { slots = pageSlots(0); } catch(e){ slots = c * r; }
  t.textContent = '当前 ' + c + ' 列 × ' + r + ' 行 = 一页 ' + (c * r) + ' 格。'
    + '第 1 页的小组件占 ' + (c * r - slots) + ' 格，还能放 ' + slots + ' 个图标。'
    + '（出厂默认是 4 列 × 6 行）';
}
// 某一页实际能放几个图标 = 总格数 − 这一页的小组件占掉的格数。
// 以前一律按 24 个分页，但桌面上的组件会占位，于是第一页排 24 个图标却只放得下 14 个，
// 多出来的被反复往后页挤 —— 分页必须按真实容量算。
function pageSlots(p){
  var total = perPage();
  var used = state.layout.widgets.filter(function(w){ return (w.page || 0) === p; })
    .reduce(function(s, w){ var sz = WIDGET_SIZES[widgetSizeKey(w.size)]; return s + sz.c * sz.r; }, 0);
  return Math.max(1, total - used);
}
// 系统自带的桌面默认布局：固定按 4 列 × 6 行生成，不受当前设置影响
function defaultLayout(){
  var widgets = [
    // 默认三件套都用 iOS 里最紧凑的档位：两个 2×2 小组件 + 一条 2×1 横条，
    // 合起来只占 10 格（24 格里的一小半），一页能放 14 个图标，和 iOS 桌面密度一致
    {id:uid(), type:'mood',  page:0, size:'2x2', title:'他的心情'},
    {id:uid(), type:'quote', page:0, size:'2x2', title:'今日一句'},
    {id:uid(), type:'countdown', page:0, size:'2x1', title:'倒计时', date:''}
  ];
  // 第 1 页要扣掉组件占的格，后面几页没有组件，一页 24 格
  var CELLS = {'2x1':2, '2x2':4, '4x2':8, '4x4':16};
  var total = HOME_COLS_DEFAULT * HOME_ROWS_DEFAULT;
  var used  = widgets.reduce(function(s, w){ return s + (CELLS[w.size] || 4); }, 0);
  var p = 0, n = 0;
  var apps = APPS.map(function(a){
    var cap = (p === 0) ? (total - used) : total;
    if(n >= cap){ p++; n = 0; }
    n++;
    return {id:a.id, name:a.name, icon:a.icon, ico:a.ico, shape:a.shape, type:'', color:'',
            page:p, hide:false};
  });
  return {apps:apps, widgets:widgets, dock:['call','api','world']};
}
// 保证布局里有全部应用（以后版本新增屏幕也不会丢），缺的补到最后一页
/* 小组件尺寸表：iOS 标准四档（横向几列 × 纵向几行，1 格 = 1 个图标的位置） */
var WIDGET_SIZES = {
  '2x1':{c:2, r:1, n:'2×1 小横条（两列一行，最紧凑）'},
  '2x2':{c:2, r:2, n:'2×2 小组件（两列两行）'},
  '4x2':{c:4, r:2, n:'4×2 中组件（四列两行，横贯一行）'},
  '4x4':{c:4, r:4, n:'4×4 大组件（四列四行）'}
};
function widgetSizeKey(size){ return WIDGET_SIZES[size] ? size : '2x2'; }
// 把过于占地方的组件收敛一下：iOS 桌面上组件一般只占半屏以内，其余留给图标。
// 超过半屏就从最大的开始缩（4×4→2×2、4×2→2×1、2×2→2×1），直到总占格不超过半屏。
function tidyWidgetSizes(){
  var CELLS = {'2x1':2, '2x2':4, '4x2':8, '4x4':16};
  var STEP  = {'4x4':'2x2', '4x2':'2x1', '2x2':'2x1'};
  function totalCells(){
    return state.layout.widgets.reduce(function(s, w){
      var sz = WIDGET_SIZES[widgetSizeKey(w.size)];
      return s + sz.c * sz.r;
    }, 0);
  }
  var limit = Math.ceil(perPage() / 2), n = 0, guard = 0;
  while(totalCells() > limit && guard++ < 12){
    var big = null, bigCells = 0;
    state.layout.widgets.forEach(function(w){
      var k = widgetSizeKey(w.size), c = CELLS[k];
      if(STEP[k] && c > bigCells){ big = w; bigCells = c; }
    });
    if(!big) break;
    big.size = STEP[widgetSizeKey(big.size)];
    n++;
  }
  return n;
}

function ensureLayout(){
  if(!state.layout || !state.layout.apps || !state.layout.widgets) state.layout = defaultLayout();
  // 底部 Dock：固定常驻的快捷栏（微信 / 模型 / 世界书），删不掉
  if(!state.layout.dock || !Array.isArray(state.layout.dock) || !state.layout.dock.length){
    state.layout.dock = ['call','api','world'];
  }
  // 兜一层：没设过、设成空、或超出可选范围的一律回到出厂默认的 4×6
  if(clampHomeGrid()) save('settings');
  // 小组件尺寸统一成 iOS 四档 2×1 / 2×2 / 4×2 / 4×4
  // （老版本的 2x4 就是「四列两行」，直接归入 4x2；half / full 一律按 2x2）
  state.layout.widgets.forEach(function(w){
    if(w.size === '2x4') w.size = '4x2';
    else if(!WIDGET_SIZES[w.size]) w.size = '2x2';
  });
  // 一次性：按「每页真实容量」重新分一次页。
  // 以前不管组件占多少格，一律按 24 个图标分一页，结果第一页排了 24 个却只放得下 14 个，
  // 多出来的图标被反复挤到后面、桌面看着又空又乱。这里按新容量重排一次就够了。
  if(!state.settings.iosDensity){
    state.settings.iosDensity = true;
    // 先把过于占地方的组件收敛到半屏以内（4×4→2×2、4×2→2×1），
    // 再把图标按每页真实容量重新分一次，桌面就不会再又空又乱了
    tidyWidgetSizes();
    var p = 0, n = 0;
    state.layout.apps.forEach(function(a){
      if(a.hide) return;
      if(n >= pageSlots(p)){ p++; n = 0; }
      a.page = p; n++;
    });
    save('settings'); save('layout');
  }
  var maxPage = 0;
  state.layout.apps.forEach(function(a){ maxPage = Math.max(maxPage, a.page || 0); });
  // 老版本里这两个屏改过名，顺手把桌面上的名字也换掉
  state.layout.apps.forEach(function(x){
    if(x.id === 'card' && (x.name === '名片' || !x.name)) x.name = '身份卡';
    if(x.id === 'call' && (x.name === '通话' || !x.name)){ x.name = '微信'; x.ico = 'wechat'; }
  });
  // 「消息」「朋友圈」都已经并进微信，桌面上的旧图标收掉
  state.layout.apps = state.layout.apps.filter(function(x){
    return x.id !== 'chat' && x.id !== 'moments' && APPS.some(function(a){ return a.id === x.id; });
  });
  // 补上线性图标名字（老布局只有老的图形名）
  state.layout.apps.forEach(function(x){
    if(!x.ico){ var p = APPS.filter(function(a){ return a.id === x.id; })[0]; x.ico = (p && p.ico) || SHAPE2ICON[x.shape] || 'square'; }
    // 统一线性图标风格：老布局里存成字符图标的，收回来
    if(x.type === 'char' && state.settings.iconsAreLinear) x.type = '';
    // 「美化」换成更清楚的星芒图案（老的调色板在桌面上容易看成一团）
    if(x.id === 'beauty' && x.ico === 'palette') x.ico = 'sparkle';
  });
  APPS.forEach(function(a){
    var has = state.layout.apps.some(function(x){ return x.id === a.id; });
    if(!has){
      // 按这一页的真实容量分页（组件占掉的格数要扣掉），别再一股脑塞满 24 个
      var cnt = state.layout.apps.filter(function(x){ return (x.page||0) === maxPage && !x.hide; }).length;
      if(cnt >= pageSlots(maxPage)) maxPage++;
      state.layout.apps.push({id:a.id, name:a.name, icon:a.icon, ico:a.ico, shape:a.shape,
                              type:'', color:'', page:maxPage, hide:false});
    }
  });
  save('layout');
}
// 取某个应用在自己那一页里的排序（就是数组里的先后顺序）
function pageApps(p){
  return state.layout.apps.filter(function(a){ return !a.hide && (a.page || 0) === p; });
}
function pageCount(){
  var max = 0;
  state.layout.apps.forEach(function(a){ if(!a.hide) max = Math.max(max, (a.page||0) + 1); });
  state.layout.widgets.forEach(function(w){ max = Math.max(max, (w.page||0) + 1); });
  return Math.max(1, max);
}
// 图标里画什么：相册图片 / 简约线性图标 / 字符
function iconHTML(a){
  if(a.type === 'image'){
    var u = a.image ? (imgCache[a.image] || '') : '';
    if(u) return '<img src="' + u + '" alt="" style="width:100%;height:100%;object-fit:cover;">';
    // 图还没从库里读回来（或者没选图）时先画线性图标，别留一个空框
    return lnIcon(a.ico || SHAPE2ICON[a.shape] || 'square', 26);
  }
  if(a.type === 'char' || (!a.type && state.settings.iconStyle === 'char')){
    return '<span class="glyph">' + (a.icon || '◻') + '</span>';
  }
  // 默认：简约线性图标（a.ico 是新名字，a.shape 是老版本存的图形名，会自动换算）
  var name = a.ico || SHAPE2ICON[a.shape] || 'square';
  return lnIcon(name, 26);
}
// 图标底色：用户选了颜色就用它，否则用磨砂玻璃默认样式
function iconStyle(a){
  if(a.color){
    var c = a.color;
    return ' style="background:linear-gradient(150deg,' + c + 'F2,' + c + 'A6);color:#fff;border-color:rgba(255,255,255,.55);"';
  }
  return '';
}
// 算出某个图标最终用的风格：image / char / liquid / css（跟随全局时取 settings.iconStyle）
function effectiveIconStyle(a){
  if(!a) return (state.settings.iconStyle || 'css');
  if(a.type === 'image')  return 'image';
  if(a.type === 'char')   return 'char';
  if(a.type === 'liquid') return 'liquid';
  if(a.type === 'css')    return 'css';
  return (state.settings.iconStyle || 'css');   // 跟随全局
}
// 全局图标风格对应的中文名（给「跟随全局」下拉提示用）
function iconStyleLabel(){
  var s = state.settings.iconStyle || 'css';
  return s === 'liquid' ? '液态玻璃' : (s === 'char' ? '字符' : '简约图形');
}
function appHTML(a){
  var es = effectiveIconStyle(a);
  var icoCls = 'ico' + (es === 'liquid' ? ' style-liquid' : '');
  return '<div class="app' + (homeEdit ? ' editmode' : '') + '" data-app="' + a.id + '">'
    + '<div class="' + icoCls + '"' + iconStyle(a) + '>' + iconHTML(a) + '</div>'
    + '<span>' + esc(a.name) + '</span>'
    + '<div class="edit-dot" data-editapp="' + a.id + '">' + lnIcon('pen', 14) + '</div>'
    + '</div>';
}

// 小组件：每种类型显示什么
function widgetBgURL(w){
  if(!w || !w.bg || !w.bg.value) return '';
  return w.bg.type === 'url' ? w.bg.value : (imgCache[w.bg.value] || '');
}
function widgetHTML(w){
  var t = w.type, title = esc(w.title || widgetTypeName(t)), body = '';
  if(t === 'mood'){
    body = '<div class="row between"><div><div class="wv">' + esc(state.mood) + '</div>'
         + '<div class="hint">' + timePeriod() + '</div></div><div class="wbig">' + moodEmoji(state.mood) + '</div></div>';
  } else if(t === 'quote'){
    body = '<div class="wv">' + esc(dailyQuote()) + '</div>';
  } else if(t === 'countdown'){
    var d = w.date ? {title:w.title || '那天', date:w.date} : nextSpecialDate();
    body = d ? '<div class="wv">' + esc(d.title) + '</div><div class="hint">' + daysTo(d.date) + '</div>'
             : '<div class="hint">去「特殊日期」里加一个日子</div>';
  } else if(t === 'text'){
    body = '<div class="wv">' + esc(w.content || '（还没写）') + '</div>';
  } else if(t === 'todo'){
    var un = state.plans.filter(function(p){ return !p.done; });
    body = '<div class="wv">' + (un.length ? ('还有 ' + un.length + ' 件事') : '都做完了') + '</div>'
         + '<div class="hint">' + esc(un.length ? un[0].title : '去「共享计划」加一条') + '</div>';
  } else if(t === 'photo'){
    body = w.image && imgCache[w.image]
      ? '<img src="' + imgCache[w.image] + '" alt="">'
      : '<div class="hint">（还没选照片）</div>';
  } else if(t === 'link'){
    body = '<div class="wv">去「' + esc(appNameOf(w.target)) + '」</div>';
  } else if(t === 'growth'){
    var g = state.growth, inLv = (g.point || 0) % 60;
    body = '<div class="wv">亲密度 ' + g.level + ' 级</div>'
         + '<div class="bar" style="margin-top:6px;"><i style="width:' + Math.round(inLv/60*100) + '%;"></i></div>';
  } else if(t === 'memory'){
    var mem = state.memory.filter(function(m){ return !m.secret; })[0];
    body = '<div class="wv">' + esc(mem ? mem.text.slice(0,40) : '（还没有记忆）') + '</div>';
  } else if(t === 'clock'){
    var now = new Date();
    body = '<div class="wv" style="font-size:22px;">' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + '</div>'
         + '<div class="hint">' + (now.getMonth()+1) + '月' + now.getDate() + '日 ' + weekName() + '</div>';
  } else if(t === 'custom'){
    body = (w.big ? '<div class="wbig">' + esc(w.big) + '</div>' : '')
          + '<div class="wv">' + esc(w.content || '（还没写）') + '</div>'
          + (w.sub ? '<div class="hint">' + esc(w.sub) + '</div>' : '');
  }
  var emoji = (w.emoji && w.emoji.trim()) ? '<span class="wemoji">' + esc(w.emoji) + '</span>' : '';
  var bgurl = widgetBgURL(w);
  var wbg = bgurl ? '<div class="wbg" style="background-image:url(' + bgurl + ');opacity:' + ((w.bg.opacity != null ? w.bg.opacity : 60) / 100) + ';filter:blur(' + (w.bg.blur || 0) + 'px);"></div>' : '';
  var wszKey = widgetSizeKey(w.size);
  return '<div class="card glass widget wsz-' + wszKey + (homeEdit ? ' editmode' : '') + '" data-widget="' + w.id + '" data-wsz="' + wszKey + '">'
    + wbg
    + '<div class="wcontent">'
    + '<div class="wt"><span>' + emoji + title + '</span>'
    + '<span><button class="wbtn wedit" data-wedit="' + w.id + '">改</button>'
    + '<button class="wbtn wedit" data-wdel="' + w.id + '">删</button></span></div>'
    + body + '</div></div>';
}
function widgetTypeName(t){
  var m = WIDGET_TYPES.filter(function(x){ return x.t === t; })[0];
  return m ? m.n : '小组件';
}
function appNameOf(id){
  var a = state.layout.apps.filter(function(x){ return x.id === id; })[0];
  if(a) return a.name;
  var b = APPS.filter(function(x){ return x.id === id; })[0];
  return b ? b.name : '（选一个）';
}

renderers.home = function(){
  ensureLayout();
  var pages = pageCount();
  if(homePage > pages - 1) homePage = pages - 1;
  if(homePage < 0) homePage = 0;
  // 本页的小组件（和图标共用同一个 4×6 网格，排在最前面）
  var ws = state.layout.widgets.filter(function(w){ return (w.page || 0) === homePage; });
  $('homeWidgets').innerHTML = '';       // 组件已并进 #homeGrid，这个老容器留空
  $('homeWidgets').className = homeEdit ? 'editmode' : '';
  // 本页的图标（Dock 里的固定快捷图标只放在底部 Dock，不在网格里重复出现，模仿 iOS）
  var apps = pageApps(homePage).filter(function(a){ return !isDockApp(a.id); });
  var grid = $('homeGrid');
  // 清掉上一次滑动翻页残留的 inline 位移/过渡，否则重渲染后图标会被留在屏幕外（看起来"不显示"）
  grid.style.transition = '';
  grid.style.transform = '';
  grid.style.setProperty('--home-cols', state.settings.homeCols || HOME_COLS_DEFAULT);
  grid.style.setProperty('--home-rows', state.settings.homeRows || HOME_ROWS_DEFAULT);
  var wHTML = ws.length ? ws.map(widgetHTML).join('') : '';
  var aHTML = apps.length ? apps.map(appHTML).join('') : '';
  // 组件先落格（2×2 / 2×4），图标再顺着填满剩下的格子
  grid.innerHTML = wHTML + aHTML
    || '<div class="empty">这一页是空的，去「美化」里把图标移过来</div>';
  placeHomeGrid();
  sizeHomeIcons();
  // 分页圆点
  $('homePager').innerHTML = (function(){
    var h = '';
    for(var i=0;i<pages;i++) h += '<i data-page="' + i + '" class="' + (i === homePage ? 'on' : '') + '"></i>';
    return h;
  })();
  $$('#homePager i').forEach(function(el){
    el.addEventListener('click', function(){ homePage = parseInt(el.getAttribute('data-page'), 10); renderers.home(); });
  });
  // 图标：长按进入编辑 / 拖动；非编辑态点一下打开应用
  $$('#homeGrid .app').forEach(function(el){
    el.addEventListener('click', function(e){
      if(homeDragSuppressClick){ return; }                 // 刚拖完，忽略这次误触
      if(homeSwipeSuppress){ homeSwipeSuppress = false; return; }  // 刚滑完，忽略这次误触
      var id = el.getAttribute('data-app');
      if(homeEdit && e.target.closest('[data-editapp]')){ openAppModal(id); return; }
      if(homeEdit) return;             // 编辑模式下不进应用，方便拖动
      go(id);
    });
    bindHomeItem(el);                  // 始终绑定：长按进编辑并拖动（内部自判 homeEdit）
  });
  // 小组件：长按进入编辑 / 拖动（和 iOS 一样，挪开一个后面的会自动补位）
  $$('#homeGrid > .widget').forEach(function(el){
    bindHomeItem(el);
  });
  // 点「快捷入口」小组件直接跳过去
  $$('[data-widget]').forEach(function(el){
    el.addEventListener('click', function(){
      if(homeEdit) return;
      var w = state.layout.widgets.filter(function(x){ return x.id === el.getAttribute('data-widget'); })[0];
      if(w && w.type === 'link' && w.target) go(w.target);
    });
  });
  // 底部 Dock（iOS 式固定快捷栏）：微信 / 模型 / 世界书，永远在、删不掉；编辑模式可改外观
  (function(){
    var dockIds = state.layout.dock || [];
    var items = dockIds.map(function(id){
      return state.layout.apps.filter(function(a){ return a.id === id; })[0]
          || APPS.filter(function(a){ return a.id === id; })[0];
    }).filter(Boolean);
    var dk = $('homeDock');
    dk.innerHTML = items.map(appHTML).join('');
    $$('#homeDock .app').forEach(function(el){
      var id = el.getAttribute('data-app');
      el.addEventListener('click', function(e){
        if(homeDragSuppressClick) return;
        if(homeEdit && e.target.closest('[data-editapp]')){ openAppModal(id); return; }
        if(homeEdit) return;             // 编辑模式下不进应用
        go(id);
      });
      bindDockApp(el, id);               // 长按 = 编辑这个图标（不拖动、不会被删）
    });
  })();
  // 小组件的改 / 删
  $$('[data-wedit]').forEach(function(el){
    el.addEventListener('click', function(e){
      e.stopPropagation();
      var w = state.layout.widgets.filter(function(x){ return x.id === el.getAttribute('data-wedit'); })[0];
      if(w) openWidgetModal(w);
    });
  });
  $$('[data-wdel]').forEach(function(el){
    el.addEventListener('click', function(e){
      e.stopPropagation();
      var id = el.getAttribute('data-wdel');
      state.layout.widgets = state.layout.widgets.filter(function(x){ return x.id !== id; });
      save('layout'); renderers.home();
    });
  });
  // 右上角「编辑 / 完成」
  $('btnHomeEdit').textContent = homeEdit ? '完成' : '编辑';
  // 「一键排列」只在编辑模式出现；必须用明确可见值（inline-block），
  // 不能写 '' —— '' 会回退到 CSS 的 display:none，导致编辑模式下也看不见
  $('btnHomeArrange').style.display = homeEdit ? 'inline-block' : 'none';
  $('homeFoot').textContent = state.settings.homeFoot || '';
  // 桌面背景：统一交给 applyBgImages（自定义图片优先，没图才用渐变兜底）
  // —— 以前这里读的是老键 LS.get('homeBg')，永远读到空，于是执行
  //    el.style.background = 'linear-gradient(...)' 把 background-image 一起重置掉，
  //    这就是「上传了背景图却始终不显示」的原因。
  applyBgImages();
  setTimeout(sizeHomeIcons, 30);   // 布局稳定后再量一次格子（旋转 / 键盘收起时会变）
};

/* =====================================================================
   iOS 式网格放置引擎
   —— 组件和图标按「组件在前、图标在后」的统一顺序依次落格，
      每一个都找「从上到下、从左到右第一个能放下的空位」。
      所以调组件大小、拖动换位置、增删组件之后，后面的元素会自动往后让位，
      和 iOS 主屏幕的行为一致；行高由 minmax(0,1fr) 严格锁死，
      横纵缝宽永远相等，绝不会挤压相邻图标的间距。
   ===================================================================== */
// 由 DOM 元素反查它对应的布局数据（图标 / 组件）
function entryOf(el){
  if(!el) return null;
  if(el.classList.contains('widget')){
    return state.layout.widgets.filter(function(w){ return w.id === el.getAttribute('data-widget'); })[0] || null;
  }
  return state.layout.apps.filter(function(a){ return a.id === el.getAttribute('data-app'); })[0] || null;
}
// 单个元素占几格（图标 1×1；组件按四档尺寸，比网格窄时自动收窄）
function homeItemSize(el){
  if(el.classList.contains('widget')){
    var sz = WIDGET_SIZES[widgetSizeKey(el.getAttribute('data-wsz'))];
    var cols = state.settings.homeCols || HOME_COLS_DEFAULT;
    var rows = state.settings.homeRows || HOME_ROWS_DEFAULT;
    return {w:Math.min(sz.c, cols), h:Math.min(sz.r, rows)};
  }
  return {w:1, h:1};
}
/* 网格放置引擎（支持「拖到指定空格 / 留空隙」的显式坐标）：
   —— 每个图标 / 组件都记住自己落在哪一格（layout 里的 .cell，0 起）；
      有显式坐标的优先落在该格（这就是能把图标放进页面留空位置、也能留出空隙的原因）；
      没有坐标的按「从上到下、从左到右」自动填充，保证首次进入 / 改行列数 / 增删后都能排满。
   —— 两个 pass：先放所有带坐标的，再让剩下的自动填空，互不重叠。 */
function placeHomeGrid(){
  var grid = $('homeGrid'); if(!grid) return;
  var cols = state.settings.homeCols || HOME_COLS_DEFAULT;
  var rows = state.settings.homeRows || HOME_ROWS_DEFAULT;
  var items = $$('#homeGrid > .app, #homeGrid > .widget', grid);
  if(!items.length) return;
  var occ = [];
  for(var r=0;r<rows;r++) occ.push(new Array(cols).fill(false));
  function fits(r,c,w,h){
    if(c+w>cols || r+h>rows) return false;
    for(var y=r;y<r+h;y++) for(var x=c;x<c+w;x++) if(occ[y][x]) return false;
    return true;
  }
  function take(r,c,w,h){ for(var y=r;y<r+h;y++) for(var x=c;x<c+w;x++) occ[y][x]=true; }
  var placedMap = {};
  function placeAt(el, en, r, c, w, h){
    take(r,c,w,h);
    el.style.gridColumn = (c+1) + ' / span ' + w;
    el.style.gridRow    = (r+1) + ' / span ' + h;
    en.cell = r*cols + c;                 // 写回坐标，落点稳定、可被拖动读取
    placedMap[(el.getAttribute('data-app')||el.getAttribute('data-widget'))] = true;
  }
  // pass 1：带显式坐标的优先落格
  items.forEach(function(el){
    var en = entryOf(el); if(!en) return;
    if(typeof en.cell === 'number' && en.cell >= 0){
      var sz = homeItemSize(el);
      var cr = Math.floor(en.cell/cols), cc = en.cell % cols;
      if(fits(cr,cc,sz.w,sz.h)) placeAt(el, en, cr, cc, sz.w, sz.h);
    }
  });
  // pass 2：剩下的按「从上到下、从左到右」自动填空
  var overflow = [];
  items.forEach(function(el){
    var key = (el.getAttribute('data-app')||el.getAttribute('data-widget'));
    if(placedMap[key]) return;
    var en = entryOf(el); if(!en){ return; }
    var sz = homeItemSize(el), placed = false;
    for(var r=0; r+sz.h<=rows && !placed; r++){
      for(var c=0; c+sz.w<=cols && !placed; c++){
        if(fits(r,c,sz.w,sz.h)){ placeAt(el, en, r, c, sz.w, sz.h); placed = true; }
      }
    }
    if(!placed){ el.style.gridColumn=''; el.style.gridRow=''; overflow.push(el); }
  });
  if(overflow.length){
    // 本页实在放不下了：按 iOS 的做法自动挪到下一页，绝不挤压、绝不重叠
    var moved = [];
    overflow.forEach(function(el){
      var en = entryOf(el);
      if(en){ en.page = (en.page||0) + 1; moved.push(el.classList.contains('widget') ? '组件' : '图标'); }
    });
    save('layout');
    toast('这一页放不下了，' + moved.length + ' 个元素已自动挪到第 ' + (homePage+2) + ' 页');
    renderers.home();   // 重渲染后新页上只有它们，一定放得下
  }
}

// 按网格实测每一格的宽高，算出图标该画多大（iOS 风格：图标比格子小一圈，
// 名字排在正下方，四列六行看起来和系统桌面一样均匀）。
// 取「格子装得下的尺寸」和「美化里设置的桌面图标大小」里较小的那个，
// 所以滑块终于又能控制桌面图标大小了，小屏也会自动缩小。
function sizeHomeIcons(){
  var g = $('homeGrid'); if(!g) return;
  var cols = state.settings.homeCols || HOME_COLS_DEFAULT;
  var rows = state.settings.homeRows || HOME_ROWS_DEFAULT;
  var r = g.getBoundingClientRect();
  if(!r.width || !r.height) return;
  var gap = 12;
  var cw = (r.width - gap * (cols - 1)) / cols;
  var ch = (r.height - gap * (rows - 1)) / rows;
  var fit = Math.min(cw - 6, ch - 26);                                    // 格子容得下的最大值
  var pref = parseInt(getComputedStyle(g).getPropertyValue('--icon'), 10) || 54;  // 美化里的设置
  var s = Math.min(fit, pref);
  if(s < 26) s = Math.max(20, Math.min(26, cw - 4));   // 屏幕特别矮时别把图标压没了
  g.style.setProperty('--ico-cell', Math.round(s) + 'px');
}
// 编辑 / 完成 按钮
$('btnHomeEdit').addEventListener('click', function(){
  homeEdit = !homeEdit;
  renderers.home();
  toast(homeEdit ? '编辑模式：点笔改图标，按住拖动换位置' : '已保存桌面');
});

// 一键排列：只清掉「当前页图标」的显式坐标，组件坐标一字不动；
// 交给 placeHomeGrid 把图标按 从上到下、从左到右 重新填空 → 填满所有空白区域，
// 且整个过程绝不触碰组件的位置（组件保持原 cell，仅在 pass1 占位）。
$('btnHomeArrange').addEventListener('click', function(){
  if(!homeEdit) return;
  var before = state.layout.apps.filter(function(a){ return (a.page||0) === homePage; })
                                 .map(function(a){ return a.cell; });
  state.layout.apps.forEach(function(a){
    if((a.page||0) === homePage && !isDockApp(a.id)) a.cell = null;   // 仅清空本页图标的固定坐标（Dock 固定图标不进网格），组件不动
  });
  placeHomeGrid();                                // 复用放置引擎：组件原样占位，图标补空
  save('layout');
  var moved = state.layout.apps.filter(function(a){ return (a.page||0) === homePage; })
                               .filter(function(a, i){ return a.cell !== before[i]; }).length;
  toast(moved ? ('已重新排列，填满 ' + moved + ' 个空格（组件位置不变）') : '当前页已经排满了');
});

/* ---------- 桌面图标 / 组件：长按进入编辑 + 浮层拖动（iOS 式，跟手、可落任意空格） ---------- */
var HD = null;                 // 当前正在拖动的上下文
var homeDragSuppressClick = false;
function enterHomeEdit(){
  if(!homeEdit){
    homeEdit = true;
    var g = $('homeGrid'); if(g) g.classList.add('editmode');
    var hw = $('homeWidgets'); if(hw) hw.classList.add('editmode');
  }
}

// 每个图标 / 组件都绑这个：在非编辑态长按进入编辑并直接开拖；在编辑态移动即开拖
function bindHomeItem(el){
  var isWidget = el.classList.contains('widget');
  el.addEventListener('pointerdown', function(e){
    if(e.button && e.button !== 0) return;
    var id = isWidget ? el.getAttribute('data-widget') : el.getAttribute('data-app');
    var sx = e.clientX, sy = e.clientY, moved = false, longTimer = null, longFired = false;
    function clearT(){ if(longTimer){ clearTimeout(longTimer); longTimer = null; } }
    if(!homeEdit){
      // 非编辑态：长按进入编辑并直接开始拖动（iOS 式）
      longTimer = setTimeout(function(){
        longFired = true; clearT(); enterHomeEdit();
        renderers.home();   // 重渲染让抖动/铅笔与 .editmode 类生效（也清掉滑动残留的 transform）
        var nel = isWidget ? document.querySelector('[data-widget="'+id+'"]') : document.querySelector('[data-app="'+id+'"]');
        if(nel) beginHomeDrag(nel, e);
      }, 430);
    }
    function mv(ev){
      var dx = ev.clientX - sx, dy = ev.clientY - sy;
      if(!moved && Math.hypot(dx, dy) > 7){ moved = true; if(!homeEdit) clearT(); }
      if(homeEdit && !HD && moved) beginHomeDrag(el, ev);   // 编辑态：移动即拖
    }
    function up(){
      clearT();
      document.removeEventListener('pointermove', mv);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
    }
    document.addEventListener('pointermove', mv, {passive:false});
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  });
  // 长按会触发系统右键 / 选择菜单，挡住拖动：直接吃掉它
  el.addEventListener('contextmenu', function(ev){ ev.preventDefault(); });
}

// Dock 里的图标：既能拖进拖出（和桌面图标一样长按/移动即拖），也能长按编辑外观
function isDockApp(id){ return (state.layout.dock || []).indexOf(id) >= 0; }
function bindDockApp(el, id){
  el.addEventListener('pointerdown', function(e){
    if(e.button && e.button !== 0) return;
    var sx = e.clientX, sy = e.clientY, moved = false, longTimer = null, longFired = false;
    function clearT(){ if(longTimer){ clearTimeout(longTimer); longTimer = null; } }
    // 非编辑态长按 430ms → 打开图标编辑器（编辑外观）；编辑态里移动直接拖动
    longTimer = setTimeout(function(){
      longFired = true; clearT();
      try{ var sel = window.getSelection(); if(sel && sel.removeAllRanges) sel.removeAllRanges(); }catch(_){}
      homeDragSuppressClick = true;             // 吞掉紧随其后的 click，别又打开应用
      setTimeout(function(){ homeDragSuppressClick = false; }, 220);
      openAppModal(id);
    }, 430);
    function mv(ev){
      var dx = ev.clientX - sx, dy = ev.clientY - sy;
      if(!moved && Math.hypot(dx, dy) > 7){ moved = true; clearT(); if(!HD) beginHomeDrag(el, ev); }
    }
    function up(){
      clearT();
      document.removeEventListener('pointermove', mv);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
    }
    document.addEventListener('pointermove', mv, {passive:false});
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  });
  // 吃掉右键 / 系统菜单，避免长按冒出选区或菜单
  el.addEventListener('contextmenu', function(ev){ ev.preventDefault(); });
}

// 开始拖动：把元素从网格里「拎起来」浮到最上层，精确跟着手指走（不再跳回格子）
function beginHomeDrag(el, ev){
  if(HD) return;
  var isWidget = el.classList.contains('widget');
  var fromDock = !!(el.closest && el.closest('#homeDock'));
  var id = isWidget ? el.getAttribute('data-widget') : el.getAttribute('data-app');
  var rect = el.getBoundingClientRect();
  var gx = ev.clientX - rect.left, gy = ev.clientY - rect.top;
  el.classList.add('dragging');
  // 清掉滑动残留的 will-change / transform：否则它们会生成 fixed 的包含块，
  // 让被拖元素定位到网格里、不跟手（长按进编辑时尤其明显）
  var grid = $('homeGrid'); if(grid){ grid.style.willChange = ''; grid.style.transform = ''; }
  // 长按可能已冒出文本选区，先清掉，避免继续抢手势
  try{ var sel = window.getSelection(); if(sel && sel.removeAllRanges) sel.removeAllRanges(); }catch(_){}
  el.style.width = rect.width + 'px';
  el.style.height = rect.height + 'px';
  el.style.left = (ev.clientX - gx) + 'px';
  el.style.top  = (ev.clientY - gy) + 'px';
  document.body.style.userSelect = 'none';
  homeDragSuppressClick = true;
  HD = {el:el, id:id, isWidget:isWidget, fromDock:fromDock, gx:gx, gy:gy, lastX:ev.clientX, lastY:ev.clientY, edge:0, edgeTimer:null};
  document.addEventListener('pointermove', homeDragMove, {passive:false});
  document.addEventListener('pointerup', homeDragEnd);
  document.addEventListener('pointercancel', homeDragEnd);
}

// 指针落在网格的哪一格（0 起的格序号），超出网格返回 null
function homeCellUnderPointer(x, y){
  var grid = $('homeGrid'); if(!grid) return null;
  var r = grid.getBoundingClientRect();
  if(x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
  var cols = state.settings.homeCols || HOME_COLS_DEFAULT;
  var rows = state.settings.homeRows || HOME_ROWS_DEFAULT;
  var gap = parseFloat(getComputedStyle(grid).gap) || 12;
  var cw = (r.width - gap*(cols-1)) / cols, ch = (r.height - gap*(rows-1)) / rows;
  var col = Math.floor((x - r.left) / (cw + gap)); if(col < 0) col = 0; if(col >= cols) col = cols - 1;
  var row = Math.floor((y - r.top) / (ch + gap));  if(row < 0) row = 0; if(row >= rows) row = rows - 1;
  return {col:col, row:row, idx:row*cols + col};
}

// 把被拖元素放到目标格：覆盖到的其它元素会被挤到别处自动填空；落点自动收进网格内
function homePlaceDraggedAt(idx){
  var el = HD.el, en = entryOf(el); if(!en) return;
  var cols = state.settings.homeCols || HOME_COLS_DEFAULT;
  var rows = state.settings.homeRows || HOME_ROWS_DEFAULT;
  var sz = homeItemSize(el);
  var cr = Math.floor(idx/cols), cc = idx % cols;
  if(cc + sz.w > cols) cc = cols - sz.w;
  if(cr + sz.h > rows) cr = rows - sz.h;
  if(cc < 0) cc = 0; if(cr < 0) cr = 0;
  // 被新位置覆盖到的同页其它元素：清掉它们的显式坐标，交给自动填空让位（实现「放空格 / 留空隙」）
  state.layout.apps.concat(state.layout.widgets).forEach(function(o){
    if(o === en || (o.page||0) !== homePage || typeof o.cell !== 'number') return;
    var osz = (o.size) ? (function(){ var s=WIDGET_SIZES[widgetSizeKey(o.size)]; return {w:Math.min(s.c,cols), h:Math.min(s.r,rows)}; })() : {w:1,h:1};
    var or0 = Math.floor(o.cell/cols), oc0 = o.cell % cols;
    if(!(or0 >= cr+sz.h || or0+osz.h <= cr || oc0 >= cc+sz.w || oc0+osz.w <= cc)) o.cell = null;
  });
  en.cell = cr*cols + cc;
  placeHomeGrid();
}

function homeDragMove(ev){
  if(!HD) return;
  if(ev.cancelable) ev.preventDefault();
  HD.lastX = ev.clientX; HD.lastY = ev.clientY;
  var el = HD.el;
  el.style.left = (ev.clientX - HD.gx) + 'px';
  el.style.top  = (ev.clientY - HD.gy) + 'px';
  // Dock 高亮：拖动时如果指针悬在 Dock 上方，点亮它（提示松手会放进/留在快捷栏；组件不允许进 Dock 不高亮）
  var inDock = pointerInDock(ev.clientX, ev.clientY, HD.id);
  var dk = $('homeDock');
  if(dk){ if(inDock && !HD.isWidget) dk.classList.add('dock-hover'); else dk.classList.remove('dock-hover'); }
  // 来自 Dock 的拖动还没进网格，不参与网格内实时填空；其余（网格图标 / 组件）照常
  if(!HD.fromDock){
    var t = homeCellUnderPointer(ev.clientX, ev.clientY);
    if(t){
      var en = entryOf(el);
      var cols = state.settings.homeCols || HOME_COLS_DEFAULT;
      var rows = state.settings.homeRows || HOME_ROWS_DEFAULT;
      var sz = homeItemSize(el);
      var cr = Math.floor(t.idx / cols), cc = t.idx % cols;
      if(cc + sz.w > cols) cc = cols - sz.w;
      if(cr + sz.h > rows) cr = rows - sz.h;
      var finalIdx = cr*cols + cc;
      if(finalIdx !== (en.cell == null ? -1 : en.cell)) homePlaceDraggedAt(t.idx);
    }
  }
  homeEdgeFlip(ev.clientX);   // 拖到屏幕左右边缘停顿一下就翻页（跨页拖动）
}

function homeEdgeFlip(x){
  if(!HD) return;
  var W = (window.innerWidth || document.documentElement.clientWidth) || 360;
  var M = 34;
  if(x < M){ if(homePage > 0) scheduleFlip(-1); else clearFlip(); }
  else if(x > W - M){ scheduleFlip(1); }
  else clearFlip();
}
function scheduleFlip(dir){
  if(!HD || HD.edge === dir) return;
  HD.edge = dir;
  clearTimeout(HD.edgeTimer);
  HD.edgeTimer = setTimeout(function(){
    if(!HD) return;
    var en = entryOf(HD.el); if(!en) return;
    var newPage = homePage + dir;
    if(newPage < 0) return;
    var id = HD.id, isWidget = HD.isWidget, lx = HD.lastX, ly = HD.lastY;
    // 跨屏前先记下「指尖相对图标左上角」的偏移：图标尺寸不变，这个偏移是恒定的，
    // 翻页后必须沿用它，否则图标会被重新吸附到新页的自动填空格子里、偏离指尖（这就是之前跨屏不跟手的根源）
    var keepGx = HD.gx, keepGy = HD.gy;
    en.page = newPage; en.cell = null;     // 新页重新自动填空
    homeDragCleanup();
    HD = null;
    save('layout');
    homePage = newPage;
    renderers.home();
    var nel = isWidget ? document.querySelector('[data-widget="'+id+'"]') : document.querySelector('[data-app="'+id+'"]');
    if(nel){
      beginHomeDrag(nel, {clientX:lx, clientY:ly, preventDefault:function(){}});
      // 接管 beginHomeDrag 内部按「新格」重算的偏移，把图标重新贴回指尖，保证跨屏全程跟手
      HD.gx = keepGx; HD.gy = keepGy;
      nel.style.left = (lx - keepGx) + 'px';
      nel.style.top  = (ly - keepGy) + 'px';
      homeEdgeFlip(lx);   // 翻页后若指尖仍在边缘，立刻续接下一次翻页（拖很远时连翻多页也跟手）
    }
  }, 360);
}
function clearFlip(){ if(HD){ HD.edge = 0; clearTimeout(HD.edgeTimer); } }

function homeDragCleanup(){
  if(!HD) return;
  var el = HD.el;
  el.classList.remove('dragging');
  el.style.position = ''; el.style.left = ''; el.style.top = '';
  el.style.width = ''; el.style.height = ''; el.style.zIndex = '';
  document.removeEventListener('pointermove', homeDragMove);
  document.removeEventListener('pointerup', homeDragEnd);
  document.removeEventListener('pointercancel', homeDragEnd);
  document.body.style.userSelect = '';
  clearTimeout(HD.edgeTimer);
}
/* ---------- Dock（底部快捷栏）拖进拖出所需的小工具 ---------- */
var DOCK_MAX = 4;     // iOS 式：Dock 最多放 4 个
function appEntry(id){ return state.layout.apps.filter(function(a){ return a.id === id; })[0] || null; }
// 指针是否落在 Dock 上方：是则返回插入序号（按当前 Dock 子项、排除被拖的那个算）
function pointerInDock(x, y, excludeId){
  var dk = $('homeDock'); if(!dk) return null;
  var r = dk.getBoundingClientRect();
  if(x < r.left - 24 || x > r.right + 24 || y < r.top - 24 || y > r.bottom + 24) return null;
  var kids = Array.prototype.slice.call(dk.querySelectorAll('#homeDock .app'))
    .filter(function(k){ return k.getAttribute('data-app') !== excludeId; });
  var idx = kids.length;
  for(var i=0;i<kids.length;i++){
    var kr = kids[i].getBoundingClientRect();
    if(x < kr.left + kr.width/2){ idx = i; break; }
  }
  return {idx:idx};
}
function addToDock(id, idx){
  var d = (state.layout.dock || []).slice();
  if(d.indexOf(id) >= 0) return true;
  if(d.length >= DOCK_MAX) return false;          // 满了就放不进
  if(idx === undefined || idx > d.length) idx = d.length;
  if(idx < 0) idx = 0;
  d.splice(idx, 0, id);
  state.layout.dock = d;
  return true;
}
function removeFromDock(id){
  var d = (state.layout.dock || []).slice();
  var i = d.indexOf(id); if(i >= 0) d.splice(i, 1);
  state.layout.dock = d;
}
function reorderDock(id, idx){
  var d = (state.layout.dock || []).slice();
  var cur = d.indexOf(id); if(cur >= 0) d.splice(cur, 1);
  if(idx === undefined || idx > d.length) idx = d.length;
  if(idx < 0) idx = 0;
  d.splice(idx, 0, id);
  state.layout.dock = d;
}
// 把 1×1 图标放进某个格，并清掉被它压住的「同页其它图标」的坐标（交给 placeHomeGrid 自动填空让位）
function resolveAppCell(en, idx){
  var cols = state.settings.homeCols || HOME_COLS_DEFAULT;
  var rows = state.settings.homeRows || HOME_ROWS_DEFAULT;
  var cr = Math.floor(idx / cols), cc = idx % cols;
  if(cr < 0) cr = 0; if(cc < 0) cc = 0;
  if(cc >= cols) cc = cols - 1; if(cr >= rows) cr = rows - 1;
  state.layout.apps.forEach(function(o){
    if(o === en || (o.page || 0) !== homePage || typeof o.cell !== 'number') return;
    var or0 = Math.floor(o.cell / cols), oc0 = o.cell % cols;
    if(!(or0 >= cr + 1 || or0 + 1 <= cr || oc0 >= cc + 1 || oc0 + 1 <= cc)) o.cell = null;
  });
  en.cell = cr * cols + cc;
}
function homeDragEnd(){
  if(!HD) return;
  clearFlip();
  var id = HD.id, fromDock = HD.fromDock, isWidget = HD.isWidget;
  var lx = HD.lastX, ly = HD.lastY;
  homeDragCleanup();
  HD = null;
  var inDock = pointerInDock(lx, ly, id);
  if(isWidget){
    // 组件不能进 Dock：原地归位（移动时 homePlaceDraggedAt 已定好格）
  } else if(fromDock){
    if(inDock){
      reorderDock(id, inDock.idx);                 // 在 Dock 内重排顺序
    } else {
      // 拖出 Dock → 进当前页网格（有精确落点就用落点，否则自动填空）
      removeFromDock(id);
      var en = appEntry(id);
      if(en){
        en.page = homePage; en.hide = false;
        var t = homeCellUnderPointer(lx, ly);
        if(t) resolveAppCell(en, t.idx); else en.cell = null;
      }
    }
  } else {
    // 来自网格的图标：拖到 Dock 上方 → 收进快捷栏；否则保持网格（移动时已处理）
    if(inDock){
      var ok = addToDock(id, inDock.idx);
      if(!ok){ toast('Dock 最多放 ' + DOCK_MAX + ' 个'); }
      else { var e2 = appEntry(id); if(e2) e2.cell = null; }
    }
  }
  saveDragOrder();   // 保存坐标 + 顺序 + 重渲染归位
  setTimeout(function(){ homeDragSuppressClick = false; }, 80);
}
// 拖完之后，按屏幕上的新顺序写回数据（图标和组件分别记），再重新放置
function saveDragOrder(){
  var p = homePage;
  // 图标顺序
  var els = $$('#homeGrid .app');
  var ids = els.map(function(e){ return e.getAttribute('data-app'); });
  var mine = ids.map(function(id){ return state.layout.apps.filter(function(a){ return a.id === id; })[0]; }).filter(Boolean);
  // 保留全部现有图标：当前页网格里出现过的按 DOM 新顺序排（mine），其余原样保留（others）。
  // 注意：不能用「page!==p || hide || isDockApp」来筛 others —— 刚从 Dock 拖进网格的图标此刻还没进网格 DOM，
  // 而它已不在 Dock（isDockApp 为 false、page 又是当前页），会被错误丢弃；这里直接用「不在 mine 里」兜底，绝不丢图标。
  var others = state.layout.apps.filter(function(a){ return mine.indexOf(a) < 0; });
  state.layout.apps = mine.concat(others);
  // 组件顺序
  var wels = $$('#homeGrid .widget');
  var wids = wels.map(function(e){ return e.getAttribute('data-widget'); });
  var wothers = state.layout.widgets.filter(function(w){ return (w.page||0) !== p; });
  var wmine = wids.map(function(id){ return state.layout.widgets.filter(function(w){ return w.id === id; })[0]; }).filter(Boolean);
  state.layout.widgets = wmine.concat(wothers);
  save('layout');
  renderers.home();
}
/* ---------- 左右滑动翻页（跟手 + 回弹，更顺滑） ---------- */
var homeSwipeSuppress = false;   // 刚滑完，抑制接下来那次误触的「打开应用」
(function bindSwipe(){
  var el = $('home').querySelector('.body');
  var grid = $('homeGrid');
  var sx = 0, sy = 0, st = 0, tracking = false, locked = false;
  var W = function(){ return (el && el.clientWidth) || 360; };
  el.addEventListener('pointerdown', function(e){
    homeSwipeSuppress = false;   // 新的一次手势，清掉上一次残留的抑制标记
    // 编辑模式下：按在图标 / 组件上由「拖动」接管，这里不抢手势；
    // 按在空白（网格 / 页面背景）才允许左右翻页，和 iOS 桌面一致。
    if(homeEdit && e.target.closest && e.target.closest('.app, .widget')) return;
    tracking = true; locked = false; sx = e.clientX; sy = e.clientY; st = Date.now();
    grid.style.transition = 'none';
    // 注意：这里不要预先置 will-change，否则长按进编辑时它会成为 fixed 的包含块，
    // 让拖动元素错位、不跟手；等真正判定为横向滑动时再开（见下方 locked 分支）。
  });
  el.addEventListener('pointermove', function(e){
    if(!tracking) return;
    if(HD){ tracking = false; return; }  // 一旦开始拖动图标，滑动立即让位
    var dx = e.clientX - sx, dy = e.clientY - sy;
    if(!locked){
      if(Math.abs(dx) < 8 && Math.abs(dy) < 8) return;   // 还没决定方向
      if(Math.abs(dx) > Math.abs(dy)){ locked = true; grid.style.willChange = 'transform'; }   // 横向：归我们处理
      else { tracking = false; return; }                  // 纵向：交给浏览器滚动
    }
    if(e.cancelable) e.preventDefault();                  // 别让浏览器横向回弹/刷新
    // 到头了就加一点阻尼，避免滑出界显得生硬
    var pages = pageCount();
    var d = dx;
    if((homePage === 0 && dx > 0) || (homePage === pages - 1 && dx < 0)) d = dx * 0.32;
    grid.style.transform = 'translateX(' + d + 'px)';
  }, {passive:false});
  function finish(e){
    if(!tracking) return;
    tracking = false;
    if(HD) return;                       // 拖动接管的手势，不翻页
    grid.style.willChange = '';
    var dx = (e ? e.clientX : sx) - sx;
    var ok = locked && Math.abs(dx) > Math.min(60, W() * 0.22) && (Date.now() - st) < 900;
    if(ok){
      var pages = pageCount();
      var next = homePage + (dx < 0 ? 1 : -1);
      if(next < 0) next = 0; if(next > pages - 1) next = pages - 1;
      // 让当前页顺着手指滑出，再换页
      grid.style.transition = 'transform .24s ease';
      grid.style.transform = 'translateX(' + (dx < 0 ? -W() : W()) + 'px)';
      homeSwipeSuppress = true;
      var dir = dx < 0 ? 1 : -1;                 // 去下一页从右进，去上一页从左进
      var swWidth = W();
      setTimeout(function(){
        homePage = next;
        renderers.home();                        // 内部已清残留 transform，新页先落在原位
        var g = $('homeGrid');
        g.style.transition = 'none';
        g.style.transform = 'translateX(' + (dir * swWidth) + 'px)';
        void g.offsetWidth;                      // 强制重排，确保从外侧开始滑入
        g.style.transition = 'transform .24s ease';
        g.style.transform = 'translateX(0)';
      }, 240);
    } else {
      grid.style.transition = 'transform .22s ease';
      grid.style.transform = 'translateX(0)';
    }
  }
  el.addEventListener('pointerup', finish);
  el.addEventListener('pointercancel', finish);
})();

/* ---------- 图标编辑弹窗 ---------- */
function openAppModal(id){
  var a = state.layout.apps.filter(function(x){ return x.id === id; })[0];
  if(!a) return;
  var pages = pageCount();
  var pageOpts = '';
  for(var i=0;i<Math.max(pages, (a.page||0)+1);i++){
    pageOpts += '<option value="' + i + '"' + (i === (a.page||0) ? ' selected' : '') + '>第 ' + (i+1) + ' 页</option>';
  }
  var html = ''
    + '<label class="fld">名字</label><input type="text" id="apName" value="' + esc(a.name) + '">'
    + '<label class="fld">图标类型</label><select id="apType">'
    + '<option value=""' + (!a.type ? ' selected' : '') + '>跟随全局（当前：' + iconStyleLabel() + '）</option>'
    + '<option value="css"' + (a.type === 'css' ? ' selected' : '') + '>磨砂玻璃 · 简约线性图标</option>'
    + '<option value="liquid"' + (a.type === 'liquid' ? ' selected' : '') + '>液态玻璃 · 简约线性图标</option>'
    + '<option value="char"' + (a.type === 'char' ? ' selected' : '') + '>字符图标</option>'
    + '<option value="image"' + (a.type === 'image' ? ' selected' : '') + '>相册里的图片</option>'
    + '</select>'
    + '<div id="apShapeBox" style="display:none;">'
    + '<label class="fld">选一个图标</label><div class="row" style="flex-wrap:wrap;gap:6px;">'
    + ICON_KEYS.map(function(k){
        return '<div data-icon="' + k + '" style="width:40px;height:40px;border-radius:12px;border:1px solid var(--c-border);background:rgba(255,255,255,.5);display:flex;align-items:center;justify-content:center;color:var(--c-text);cursor:pointer;'
          + (k === (a.ico || SHAPE2ICON[a.shape] || 'square') ? 'outline:2px solid var(--c-primary);' : '') + '">'
          + lnIcon(k, 22) + '</div>';
      }).join('')
    + '</div></div>'
    + '<div id="apCharBox" style="display:none;">'
    + '<label class="fld">字符</label><input type="text" id="apChar" value="' + esc(a.icon || '') + '">'
    + '<div class="row" style="flex-wrap:wrap;gap:6px;margin-top:6px;">'
    + QUICK_CHARS.map(function(c){ return '<button class="btn small ghost" data-char="' + c + '" style="min-height:32px;padding:0 8px;">' + c + '</button>'; }).join('')
    + '</div></div>'
    + '<div id="apImgBox" style="display:none;">'
    + '<div class="btn-row"><button class="btn small" id="apUploadImg">从本机上传图片</button>'
    + '<button class="btn small ghost" id="apPickImg">从相册选一张</button>'
    + '<button class="btn small ghost" id="apClearImg">清除图片</button></div>'
    + '<div class="row" style="gap:10px;margin-top:8px;align-items:center;">'
    + '<img class="ap-thumb" id="apImgThumb" alt="" src="' + (a.image && imgCache[a.image] ? esc(imgCache[a.image]) : '') + '"'
    + (a.image && imgCache[a.image] ? '' : ' style="display:none;"') + '>'
    + '<div class="hint" id="apImgName">' + (a.image ? '已选一张图片' : '还没选：上传一张图，图标就直接换成它（会自动存下来，关掉再打开还在）') + '</div>'
    + '</div></div>'
    + '<label class="fld">图标底色（不选就是磨砂玻璃）</label>'
    + '<div class="row"><input type="color" id="apColor" value="' + esc(a.color || '#7fa3c8') + '">'
    + '<button class="btn small ghost" id="apColorClear">用默认玻璃</button></div>'
    + '<label class="fld">放在第几页</label><select id="apPage">' + pageOpts + '</select>'
    + (isDockApp(a.id)
        ? '<div class="hint" style="margin-top:10px;">这个图标在底部 Dock 里常驻，不能从主界面删除。</div>'
        : '<label class="row" style="margin-top:10px;font-size:13px;"><input type="checkbox" id="apHide" style="width:auto;"' + (a.hide ? ' checked' : '') + '> 在桌面隐藏（可在「美化 → 桌面图标」里恢复）</label>');
  openModal('编辑图标', html, [
    {text:'保存', fn:function(box){
      a.name = box.querySelector('#apName').value || a.name;
      a.type = box.querySelector('#apType').value;
      a.icon = box.querySelector('#apChar') ? box.querySelector('#apChar').value : a.icon;
      a.page = parseInt(box.querySelector('#apPage').value, 10);
      a.hide = isDockApp(a.id) ? false : (box.querySelector('#apHide') ? box.querySelector('#apHide').checked : false);
      a.color = box.querySelector('#apColor').dataset.off ? '' : box.querySelector('#apColor').value;
      save('layout'); renderers.home();
      if(currentScreen === 'beauty') renderers.beauty();
      toast('已保存');
    }},
    {text:'取消', cls:'ghost'}
  ]);
  // 弹窗里的小交互
  var box = $('modalBox');
  var sel = box.querySelector('#apType');
  function sync(){
    box.querySelector('#apShapeBox').style.display = (sel.value === 'css' || sel.value === 'liquid' || (!sel.value && state.settings.iconStyle !== 'char')) ? '' : 'none';
    box.querySelector('#apCharBox').style.display = (sel.value === 'char' || (!sel.value && state.settings.iconStyle === 'char')) ? '' : 'none';
    box.querySelector('#apImgBox').style.display = sel.value === 'image' ? '' : 'none';
  }
  sel.addEventListener('change', sync); sync();
  $$('[data-icon]', box).forEach(function(el){
    el.addEventListener('click', function(){
      a.ico = el.getAttribute('data-icon');
      $$('[data-icon]', box).forEach(function(x){ x.style.outline = ''; });
      el.style.outline = '2px solid var(--c-primary)';
    });
  });
  $$('[data-char]', box).forEach(function(el){
    el.addEventListener('click', function(){ box.querySelector('#apChar').value = el.getAttribute('data-char'); });
  });
  box.querySelector('#apColorClear').addEventListener('click', function(){
    box.querySelector('#apColor').dataset.off = '1';
    toast('恢复默认磨砂玻璃');
  });
  box.querySelector('#apUploadImg').addEventListener('click', function(){
    pickFile('image/*', false, function(files){
      var f = files[0]; if(!f) return;
      var iid = '__app_' + a.id;
      idbPut('images', {id:iid, name:f.name, blob:f, ts:Date.now()}).then(function(){
        // 先塞进缓存，保证马上就能看到；refreshAlbum 之后也会从 IDB 重新读到
        try{ imgCache[iid] = URL.createObjectURL(f); }catch(e){}
        a.image = iid; a.type = 'image';
        save('layout');
        var th = box.querySelector('#apImgThumb');
        if(th){ th.src = imgCache[iid] || ''; th.style.display = ''; }
        box.querySelector('#apImgName').textContent = '已上传：' + f.name;
        var selImg = box.querySelector('#apType');
        if(selImg){ selImg.value = 'image'; sync(); }
        refreshAlbum();
        toast('图标已换成这张图');
      });
    });
  });
  box.querySelector('#apClearImg').addEventListener('click', function(){
    a.image = ''; a.type = 'css'; save('layout');
    var th = box.querySelector('#apImgThumb');
    if(th){ th.style.display = 'none'; th.src = ''; }
    box.querySelector('#apImgName').textContent = '已清除，先用线性图标';
    var selImg = box.querySelector('#apType');
    if(selImg){ selImg.value = 'css'; sync(); }
    toast('已清除图片图标');
  });
  box.querySelector('#apPickImg').addEventListener('click', function(){
    refreshAlbum(function(list){
      if(!list.length){ toast('相册还是空的'); return; }
      var opts = list.map(function(i){ return '<option value="' + i.id + '">' + esc(i.name) + '</option>'; }).join('');
      openModal('选一张图', '<select id="pickImgSel">' + opts + '</select>',
        [{text:'就用这张', fn:function(b2){
          a.image = b2.querySelector('#pickImgSel').value;
          box.querySelector('#apImgName').textContent = '已选好';
        }}]);
    });
  });
}

/* ---------- 小组件：可自己制作 ---------- */
var WIDGET_TYPES = [
  {t:'mood',      n:'他的心情', f:[]},
  {t:'quote',     n:'今日一句', f:[]},
  {t:'countdown', n:'倒计时',   f:[{k:'date', l:'目标日期', type:'date'}]},
  {t:'text',      n:'文字便签', f:[{k:'content', l:'内容', type:'textarea'}]},
  {t:'todo',      n:'待办清单', f:[]},
  {t:'photo',     n:'一张照片', f:[{k:'image', l:'照片', type:'album'}]},
  {t:'link',      n:'快捷入口', f:[{k:'target', l:'跳到哪一屏', type:'screen'}]},
  {t:'growth',    n:'亲密度',   f:[]},
  {t:'memory',    n:'记忆一条', f:[]},
  {t:'clock',     n:'时钟',     f:[]},
  {t:'custom',    n:'自定义',   f:[{k:'big', l:'大标题（可选）', type:'text'},{k:'content', l:'主内容（可多行）', type:'textarea'},{k:'sub', l:'小字说明（可选）', type:'text'}]}
];
function openWidgetModal(w){
  var isNew = !w || w._new === true;
  if(!w){
    // 先选类型
    openModal('新建小组件', '<label class="fld">想做一个什么</label><select id="wTypeSel">'
      + WIDGET_TYPES.map(function(t){ return '<option value="' + t.t + '">' + t.n + '</option>'; }).join('')
      + '</select><div class="hint" style="margin-top:8px;">做好的小组件会出现在桌面上方预留的位置。</div>',
      [{text:'下一步', fn:function(b){
        var t = b.querySelector('#wTypeSel').value;
        // _new 标记一下：这一条是刚做的，保存时才 push 进列表
        openWidgetModal({id:uid(), type:t, page:homePage, size:'2x2', title:widgetTypeName(t), _new:true});
      }}]);
    return;
  }
  var meta = WIDGET_TYPES.filter(function(x){ return x.t === w.type; })[0] || {f:[]};
  var pages = pageCount();
  var pageOpts = '';
  for(var i=0;i<pages;i++) pageOpts += '<option value="' + i + '"' + (i === (w.page||0) ? ' selected' : '') + '>第 ' + (i+1) + ' 页</option>';
  var html = '<label class="fld">标题</label><input type="text" id="wgTitle" value="' + esc(w.title || '') + '">';
  meta.f.forEach(function(f){
    if(f.type === 'textarea'){
      html += '<label class="fld">' + f.l + '</label><textarea id="wg_' + f.k + '">' + esc(w[f.k] || '') + '</textarea>';
    } else if(f.type === 'date'){
      html += '<label class="fld">' + f.l + '</label><input type="date" id="wg_' + f.k + '" value="' + esc(w[f.k] || '') + '">';
    } else if(f.type === 'screen'){
      html += '<label class="fld">' + f.l + '</label><select id="wg_' + f.k + '">'
        + APPS.map(function(a){ return '<option value="' + a.id + '"' + (a.id === w[f.k] ? ' selected' : '') + '>' + esc(a.name) + '</option>'; }).join('')
        + '</select>';
    } else if(f.type === 'album'){
      html += '<label class="fld">' + f.l + '</label><div class="btn-row"><button class="btn small ghost" id="wgPickImg">从相册选</button></div>'
        + '<div class="hint" id="wgImgName" style="margin-top:6px;">' + (w.image ? '已选一张' : '还没选') + '</div>';
    } else {
      html += '<label class="fld">' + f.l + '</label><input type="text" id="wg_' + f.k + '" value="' + esc(w[f.k] || '') + '">';
    }
  });
  html += '<label class="fld">装饰表情（可选）</label><input type="text" id="wgEmoji" value="' + esc(w.emoji || '') + '" placeholder="例如 🌟 或 💌" maxlength="4">';
  var _wb = w.bg || {type:'', value:'', opacity:60, blur:6};
  html += '<label class="fld">组件背景图（可选）</label>'
    + '<div class="btn-row"><button class="btn small ghost" id="wgPickBg">选图片</button>'
    + '<button class="btn small ghost" id="wgClearBg">清除背景</button></div>'
    + '<div class="hint" id="wgBgName" style="margin:6px 0;">' + (_wb.value ? '已选一张' : '未设置') + '</div>'
    + '<div style="margin:6px 0;"><div class="row between"><span style="font-size:12px;">不透明度(%)</span><span class="hint" id="wgBgOpV">' + (_wb.opacity != null ? _wb.opacity : 60) + '</span></div>'
    + '<input type="range" id="wgBgOp" min="0" max="100" value="' + (_wb.opacity != null ? _wb.opacity : 60) + '"></div>'
    + '<div style="margin:6px 0;"><div class="row between"><span style="font-size:12px;">模糊度(px)</span><span class="hint" id="wgBgBlurV">' + (_wb.blur || 0) + '</span></div>'
    + '<input type="range" id="wgBgBlur" min="0" max="20" value="' + (_wb.blur || 0) + '"></div>';
  html += '<label class="fld">大小（跟着桌面 4×6 网格，和 iOS 同一套尺寸）</label><select id="wgSize">'
    + Object.keys(WIDGET_SIZES).map(function(k){
        return '<option value="' + k + '"' + (widgetSizeKey(w.size) === k ? ' selected' : '') + '>' + WIDGET_SIZES[k].n + '</option>';
      }).join('')
    + '</select>'
    + '<label class="fld">放在第几页</label><select id="wgPage">' + pageOpts + '</select>';
  openModal(isNew ? '新建小组件' : '改小组件', html, [
    {text:'保存', fn:function(box){
      w.title = box.querySelector('#wgTitle').value;
      w.size = widgetSizeKey(box.querySelector('#wgSize').value);
      w.page = parseInt(box.querySelector('#wgPage').value, 10);
      meta.f.forEach(function(f){
        var el = box.querySelector('#wg_' + f.k);
        if(el) w[f.k] = el.value;
      });
      w.emoji = (box.querySelector('#wgEmoji').value || '').trim();
      var _b = w.bg || {type:'', value:'', opacity:60, blur:6};
      var _op = box.querySelector('#wgBgOp'), _bl = box.querySelector('#wgBgBlur');
      if(_op) _b.opacity = parseInt(_op.value, 10);
      if(_bl) _b.blur = parseInt(_bl.value, 10);
      w.bg = _b.value ? _b : {type:'', value:''};
      if(isNew){ delete w._new; state.layout.widgets.push(w); }
      save('layout'); renderers.home();
      if(currentScreen === 'beauty') renderers.beauty();
      toast('已保存');
    }},
    {text:'取消', cls:'ghost'}
  ]);
  var box = $('modalBox');
  var pick = box.querySelector('#wgPickImg');
  if(pick){
    pick.addEventListener('click', function(){
      refreshAlbum(function(list){
        if(!list.length){ toast('相册还是空的'); return; }
        openModal('选一张图', '<select id="pickImgSel">' + list.map(function(i){ return '<option value="' + i.id + '">' + esc(i.name) + '</option>'; }).join('') + '</select>',
          [{text:'就用这张', fn:function(b2){ w.image = b2.querySelector('#pickImgSel').value; box.querySelector('#wgImgName').textContent = '已选好'; }}]);
      });
    });
  }
  // 组件背景图：选图片 / 清除 / 实时显示不透明度与模糊度
  var pbg = box.querySelector('#wgPickBg');
  if(pbg){
    pbg.addEventListener('click', function(){
      pickImageGeneric(function(res){
        w.bg = Object.assign(w.bg || {opacity:60, blur:6}, res);
        if(!res.value) w.bg = {type:'', value:''};
        box.querySelector('#wgBgName').textContent = res.value ? '已选一张' : '未设置';
      });
    });
  }
  var cbg = box.querySelector('#wgClearBg');
  if(cbg){
    cbg.addEventListener('click', function(){
      w.bg = {type:'', value:''};
      box.querySelector('#wgBgName').textContent = '未设置';
    });
  }
  var opS = box.querySelector('#wgBgOp'), blS = box.querySelector('#wgBgBlur');
  if(opS) opS.oninput = function(){ var v = box.querySelector('#wgBgOpV'); if(v) v.textContent = this.value; };
  if(blS) blS.oninput = function(){ var v = box.querySelector('#wgBgBlurV'); if(v) v.textContent = this.value; };
}
function moodEmoji(m){
  return {'开心':'😊','平静':'😌','想你':'💭','无聊':'🫧','低落':'🌧','疲惫':'😴'}[m] || '🙂';
}
function dailyQuote(){
  var seed = new Date().getDate();
  var arr = [
    '今天也要慢慢来。',
    '不用着急，我在这儿。',
    '想说什么都可以跟我说。',
    '你今天已经很努力了。',
    '有些事，说出来会轻一点。',
    '我一直都在，不用特意找我。'
  ];
  return arr[seed % arr.length];
}
function nextSpecialDate(){
  var dlist = (typeof curDates === 'function') ? curDates() : (state.dates || []);
  if(!dlist.length) return null;
  var today = new Date(); today.setHours(0,0,0,0);
  var best = null, bestDiff = 1e12;
  dlist.forEach(function(d){
    if(!d.date) return;
    var t = new Date(d.date + 'T00:00:00').getTime();
    if(isNaN(t)) return;
    if(d.yearly){ // 每年都过的：换到今年
      var y = new Date(d.date + 'T00:00:00');
      y.setFullYear(today.getFullYear());
      if(y.getTime() < today.getTime()) y.setFullYear(today.getFullYear()+1);
      t = y.getTime();
    }
    var diff = t - today.getTime();
    if(diff >= 0 && diff < bestDiff){ bestDiff = diff; best = d; }
  });
  return best;
}
// 点锁屏进入桌面
$('lockBody').addEventListener('click', function(){
  // 首次进入时，如果人设卡没改过，让他说第一句话
  if(state.messages.length === 0 && state.persona.first){
    pushMessage('him', state.persona.first, 'text');
  }
  go('home');
});

/* ---------------- 第 6 段：美化（把 CSS 变量写进页面） ---------------- */
// beauty 里存的是用户改过的变量，例如 {'--c-primary':'#88aacc'}
function applyBeauty(){
  var b = state.beauty || {};
  for(var k in b){
    if(!b[k]) continue;
    document.documentElement.style.setProperty(k, b[k]);
  }
  applyBgImages();
}
applyBeauty();
// 适应屏幕大小：把「是否铺满设备」反映到 body 的类上（CSS 据此切换手机外观 / 满屏）
function applyFitScreen(){ document.body.classList.toggle('fit-screen', !!(state.settings && state.settings.fitScreen)); }
applyFitScreen();
// 顶部仿手机状态栏：美化里可以关掉（关掉后顶端那条较深的颜色和刘海安全高度照旧保留）
function applyStatusBar(){
  var on = !(state.settings && state.settings.statusBarOn === false);
  document.body.classList.toggle('sb-off', !on);
}
applyStatusBar();

/* =====================================================================
   第 7 段：聊天屏
   ===================================================================== */
// 接口设置（本地模式 / 接口模式）—— 作为文字板块「默认」配置，后面会被并入 state.apis
state.api = LS.get('api', {mode:'local', url:'', model:'gpt-4o-mini', key:'', temp:0.8});

/* =====================================================================
   模型 / 接口管理：文字模型 / 图片生成模型 / 视频生成模型 三个板块
   每个板块可存多份「接口配置」（URL + APIKey + 拉取的模型 + 参数），
   快速切换；并把板块接入到具体项目（如微信聊天、日记、朋友圈…）。
   每个板块 = { configs:[配置…], sel:当前选中配置id, bindings:[项目接入…] }；
   文字板块选中的配置就是 state.api（聊天引擎共用）。
   ===================================================================== */
state.apis = LS.get('apis', null);
function genId(prefix){ return (prefix||'c') + Math.random().toString(36).slice(2,9); }
function num(v, d){ var n = parseFloat(v); return isNaN(n) ? d : n; }
function cloneCfg(c){
  try{ return JSON.parse(JSON.stringify(c)); }
  catch(e){ return mkCfg('c'); }   // 存了奇怪东西（循环引用等）也别让整个页面崩掉
}
// 取接口「根地址」（后面拼 /models、/chat/completions …）
//   https://api.openai.com              → https://api.openai.com/v1      （只填域名，按界面提示自动补 /v1）
//   https://api.openai.com/v1           → https://api.openai.com/v1
//   https://x.com/v1/chat/completions   → https://x.com/v1               （末尾的具体端点会被截掉）
//   https://open.bigmodel.cn/api/paas/v4/... → https://open.bigmodel.cn/api/paas/v4（自定义前缀原样保留）
function baseURL(u){
  u = (u || '').trim(); if(!u) return '';
  if(!/^https?:\/\//i.test(u)) u = 'https://' + u;
  u = u.replace(/\/+$/, '');   // 去掉末尾多余的斜杠
  // 末尾带了具体端点的，先截掉
  u = u.replace(/\/(chat\/completions|completions|images\/generations|videos\/generations|models)$/i, '');
  var m = u.match(/^(https?:\/\/[^\/]+)(.*)$/i);
  if(!m){ try{ return new URL(u).origin; }catch(e){ return ''; } }
  var origin = m[1], path = m[2] || '';
  if(!path) return origin + '/v1';      // 只填了域名 → 自动补 /v1
  return origin + path;                 // 有路径就原样保留（/v1、/v1beta、/api/paas/v4 …）
}
function authHeaders(cfg){ var h = {'Content-Type':'application/json'}; if(cfg && cfg.key) h['Authorization'] = 'Bearer ' + cfg.key; return h; }
// 三个板块各自有哪些项目能接入
var TEXT_BINDINGS = [
  {key:'wechat',  name:'微信聊天'},
  {key:'diary',   name:'日记'},
  {key:'moments', name:'朋友圈文案'},
  {key:'create',  name:'一起写'},
  {key:'cowatch', name:'一起看'},
  {key:'study',   name:'学习'},
  {key:'quiet',   name:'安静陪伴'}
];
function mkCfg(p){
  var c = {id:genId(p), name:'默认', url:'', key:'', compatible:'openai', models:[], model:'', params:{temperature:0.8, topP:1, frequencyPenalty:0}, enabled:false};
  if(p === 'v') c.endpoint = '/v1/videos/generations';
  if(p === 'g') c.endpoint = '/v1/audio/speech';      // 语音生成（TTS）
  return c;
}
// 把一份配置的字段补齐（老存档可能存的是半成品，缺字段会让整个接口页渲染不出来）
function ensureCfg(c, fallbackId){
  if(!c || typeof c !== 'object') c = {};
  if(!c.id) c.id = fallbackId || genId('c');
  if(!c.name) c.name = '默认';
  if(typeof c.url !== 'string') c.url = '';
  if(typeof c.key !== 'string') c.key = '';
  if(!c.compatible) c.compatible = 'openai';
  if(!Array.isArray(c.models)) c.models = [];
  if(typeof c.model !== 'string') c.model = '';
  if(!c.params || typeof c.params !== 'object') c.params = {};
  if(typeof c.params.temperature !== 'number') c.params.temperature = 0.8;
  if(typeof c.params.topP !== 'number') c.params.topP = 1;
  if(typeof c.params.frequencyPenalty !== 'number') c.params.frequencyPenalty = 0;
  if(c.mode === undefined) c.mode = 'local';
  if(c.endpoint !== undefined && typeof c.endpoint !== 'string') delete c.endpoint;
  return c;
}
function isBoard(b){ return !!(b && typeof b === 'object' && Array.isArray(b.configs) && b.configs.length); }
function newBoard(cfgs, binds, on){
  var c0 = cfgs[0];
  return { configs:cfgs, sel:c0.id,
    bindings:(binds||[]).map(function(b){ return {key:b.key, name:b.name, on:!!on, configId:c0.id}; }) };
}
// 保证 state.apis 三个板块齐全且每份配置字段完整，缺哪块补哪块（不会丢已有配置）
function ensureApis(){
  var a0 = (state.api && typeof state.api === 'object') ? state.api : {};
  ensureCfg(a0, genId('t'));
  var apiOn = (a0.mode === 'api' && !!a0.url);
  var apis = (state.apis && typeof state.apis === 'object') ? state.apis : null;
  if(!apis || typeof apis !== 'object') apis = {};
  // 老存档里常见的坑：只存了文字板块，或某板块的 configs 是空的 / 被存成了别的形状。
  // 以前只要 .text.configs 存在就直接放行，image / video 缺失也不会被发现，
  // 于是一切换到图片、视频板块就会抛错 —— 接口页直接白屏、按钮点了没反应。
  if(!isBoard(apis.text))  apis.text  = newBoard([a0], TEXT_BINDINGS, apiOn);
  if(!isBoard(apis.image)) apis.image = newBoard([mkCfg('i')], [{key:'wechatAuto', name:'微信自动配图'}], false);
  if(!isBoard(apis.video)){
    var v = mkCfg('v');
    apis.video = newBoard([v], [{key:'wechatStory', name:'微信视频 / 朋友圈视频'}], false);
  }
  if(!isBoard(apis.voice)) apis.voice = newBoard([mkCfg('g')], [{key:'wechatVoice', name:'微信语音消息'}], false);
  state.apis = apis;
  // 逐份配置补字段；选中的 id 失效就指回第一份
  ['text','image','video','voice'].forEach(function(b){
    var bd = state.apis[b];
    bd.configs = bd.configs.filter(function(c){ return c && typeof c === 'object'; });
    if(!bd.configs.length) bd.configs = [mkCfg(b[0] === 'v' ? 'v' : (b === 'voice' ? 'g' : b[0]))];
    bd.configs.forEach(function(c){
      ensureCfg(c, genId(b[0]));
      if(b === 'video' && !c.endpoint) c.endpoint = '/v1/videos/generations';
      if(b === 'voice' && !c.endpoint) c.endpoint = '/v1/audio/speech';
    });
    if(!bd.configs.some(function(c){ return c.id === bd.sel; })) bd.sel = bd.configs[0].id;
    if(!Array.isArray(bd.bindings)) bd.bindings = [];
    bd.bindings.forEach(function(x){
      if(typeof x !== 'object' || !x) return;
      if(!bd.configs.some(function(c){ return c.id === x.configId; })) x.configId = bd.sel;
    });
  });
  state.api = selectedCfg('text');   // 选中文字配置即聊天引擎配置
  save('apis');
}
function boardConfigs(board){ return state.apis[board].configs; }
function boardSel(board){ return state.apis[board].sel; }
function selectedCfg(board){ return boardConfigs(board).filter(function(c){ return c.id === boardSel(board); })[0] || boardConfigs(board)[0]; }
// 当前正在编辑 / 使用的配置对象（文字板块即 state.api）
function boardActive(board){ return selectedCfg(board); }
function boardBindings(board){ return state.apis[board].bindings; }
function saveApis(){ save('apis'); save('api'); }
// 选中某份配置（快速切换）
function selectConfig(board, id){
  var cfgs = boardConfigs(board);
  if(!cfgs.some(function(c){ return c.id === id; })) return;
  state.apis[board].sel = id;
  if(board === 'text') state.api = selectedCfg('text');
  saveApis();
}
// 把当前选中的配置另存为一份新配置（并选中它）
function snapshotActive(board, name){
  var c = cloneCfg(selectedCfg(board));
  c.id = genId(board[0]); c.name = name || ('配置 ' + (boardConfigs(board).length + 1));
  boardConfigs(board).push(c);
  state.apis[board].sel = c.id;
  if(board === 'text') state.api = c;
  saveApis();
}
// 删除当前选中的配置（至少保留一份）
function deleteConfig(board, id){
  var cfgs = boardConfigs(board);
  if(cfgs.length <= 1) return;
  var i = -1; cfgs.forEach(function(c, idx){ if(c.id === id) i = idx; });
  if(i < 0) return;
  cfgs.splice(i, 1);
  if(state.apis[board].sel === id) state.apis[board].sel = cfgs[0].id;
  if(board === 'text') state.api = selectedCfg('text');
  boardBindings(board).forEach(function(b){ if(b.configId === id) b.configId = state.apis[board].sel; });
  saveApis();
}
// 拉取可用模型（GET /v1/models）
function fetchModels(board, cfg, cb){
  var base = baseURL(cfg.url);
  if(!base){ cb('请先填写接口地址'); return; }
  var url = base + '/models';
  var ctrl = new AbortController();
  var timer = setTimeout(function(){ ctrl.abort(); }, 20000);   // 20 秒算超时，别一直挂着
  fetch(url, { headers: authHeaders(cfg), signal: ctrl.signal })
    .then(function(r){
      clearTimeout(timer);
      if(!r.ok) return r.text().then(function(t){ throw new Error('HTTP ' + r.status + ' ' + (t||'').slice(0,160)); });
      return r.json();
    })
    .then(function(j){
      clearTimeout(timer);
      var list = (j && j.data) ? j.data.map(function(x){ return x.id || x.name || String(x); }) : [];
      if(!list.length) throw new Error('返回里没有 data[]（确认这是 OpenAI 兼容的 .../models）');
      cb(null, list);
    })
    .catch(function(e){
      clearTimeout(timer);
      if(e && e.name === 'AbortError') return cb('请求超时（20 秒没响应，检查地址能不能访问）');
      var m = (e && e.message) || '';
      // 浏览器级别的失败（CORS / 地址错 / 断网）都长这样，给出能照着排查的说法
      if(/failed to fetch|networkerror|load failed/i.test(m)){
        return cb('请求发不出去：这个接口多半不允许网页直接跨域调用（CORS），也可能是地址写错或网络不通。'
          + '可以换成支持浏览器直连的中转地址，并确认以 https:// 开头。');
      }
      cb(m || '获取失败');
    });
}
// 测试模型是否可用（按板块发不同的请求，返回可用信息或不可用原因）
function testModel(board, cfg, prompt, cb){
  var base = baseURL(cfg.url);
  if(!base){ cb('请先填写接口地址'); return; }
  var url, body;
  prompt = prompt || '用一句话介绍你自己';
  if(board === 'text'){
    url = base + '/chat/completions';
    body = { model: cfg.model || 'gpt-4o-mini', messages:[{role:'user', content:prompt}], temperature:num(cfg.params.temperature,0.8), top_p:num(cfg.params.topP,1), frequency_penalty:num(cfg.params.frequencyPenalty,0) };
  } else if(board === 'image'){
    url = base + '/images/generations';
    body = { model: cfg.model || '', prompt: prompt, n:1, size:'512x512' };
  } else {
    url = base + (cfg.endpoint || '/v1/videos/generations');
    body = { model: cfg.model || '', prompt: prompt, n:1 };
  }
  var ctrl = new AbortController(); var timer = setTimeout(function(){ ctrl.abort(); }, 30000);
  fetch(url, { method:'POST', headers: authHeaders(cfg), body:JSON.stringify(body), signal:ctrl.signal })
    .then(function(r){
      if(!r.ok) return r.text().then(function(t){ throw new Error('HTTP ' + r.status + ' ' + (t||'').slice(0,160)); });
      return r.json().catch(function(){ return r.text().then(function(t){ return {_raw:t}; }); });
    })
    .then(function(j){
      clearTimeout(timer);
      if(board === 'text'){
        var c = j && j.choices && j.choices[0] && (j.choices[0].message || j.choices[0].delta);
        var text = c ? (c.content || '') : (j && j.content ? j.content : '');
        if(!text) return cb('接口返回里没有内容（choices[0].message.content 为空，确认是 OpenAI 兼容的对话接口）');
        cb(null, '他回：「' + String(text).slice(0,80) + '」');
      } else if(board === 'image'){
        var d = j && j.data && j.data[0];
        if(!d) return cb('接口返回里没有图片数据（data[0] 为空）');
        cb(null, '返回了图片' + (d.url ? (' 地址：' + String(d.url).slice(0,60)) : (d.b64 ? '（base64）' : '')));
      } else {
        cb(null, 'HTTP 200，返回：' + JSON.stringify(j).slice(0,140));
      }
    })
    .catch(function(e){ clearTimeout(timer); cb(e && e.name === 'AbortError' ? '请求超时（30 秒）' : (e.message || '未知错误')); });
}
// 文字模型：按「项目」取要用的配置（没接入就返回 null → 走本地）
function textCfgFor(projectKey){
  if(state.api.mode !== 'api' || !state.api.url) return null;
  var bind = state.apis.text.bindings.filter(function(b){ return b.key === projectKey; })[0];
  if(bind && !bind.on) return null;
  var id = bind ? (bind.configId || '__active__') : '__active__';
  var cfg = null;
  if(id !== '__active__') cfg = state.apis.text.configs.filter(function(c){ return c.id === id; })[0];
  return cfg || state.api;
}
var lastSeen = LS.get('lastSeen', Date.now());
var chatSearch = '';        // 聊天搜索关键词
var showTranslated = {};    // 哪些消息当前显示的是译文

// 往聊天记录里加一条；type: text | voice | system
function pushMessage(who, text, type, extra){
  var m = {id:uid(), who:who, text:text, ts:Date.now(), type:type||'text'};
  if(extra){ for(var k in extra) m[k] = extra[k]; }
  // 记下这条是在哪个会话里说的：单人聊天按人设卡分开，群聊按群分开
  if(!m.pid) m.pid = curPid();
  // 群里他发的消息：记下这句话到底是谁说的，界面上才能显示他的名字和头像
  if(m.who === 'him' && isGroupPid(m.pid) && !m.from && state.lastGroupSpeaker) m.from = state.lastGroupSpeaker;
  if(type === 'voice' && !m.dur) m.dur = 2 + Math.floor(Math.random()*13); // 假的语音时长（秒）
  if(who === 'him' && bumpUnread(m.pid)) notifyIncoming(m);
  // 接了语音生成模型、又给他设了专属音色：他发来的语音是真念出来的，不是假气泡
  if(who === 'him' && type === 'voice') synthVoiceFor(m);
  // 线下模式：把回复末尾的「心声：……」拆成独立字段，界面上单独排版
  if(who === 'him' && isOffline()) splitThought(m);
  state.messages.push(m);
  if(state.messages.length > 3000) state.messages = state.messages.slice(-3000);
  save('messages');
  if(who === 'him'){ lastSeen = Date.now(); LS.set('lastSeen', lastSeen); }
  renderChat();
  // 聊天设置里开了「自动总结记忆」：他每条回完都计一次数，够了就整理一段记忆
  if(who === 'him'){ maybeAutoSummary(m.pid); }
  // 正看着微信主界面的话，会话列表上的最后一句也得跟着变
  try{ if(currentScreen === 'call' && typeof wxPane !== 'undefined' && wxPane === 'main') renderWxMain(); }catch(e){}
  return m;
}
// 聊天设置里开启「自动总结记忆」后，每聊够 N 条就把最近这段对话整理成一段记忆写进记忆里
// 下次聊天 / 其他互动时，模型会先读这些记忆再开口，省 token
function maybeAutoSummary(pid){
  if(!pid) return;
  try{
    var c = chatCfg(pid);
    if(!c.autoSummary) return;
    var every = Math.max(5, c.summaryEvery || 20);
    c.sumCount = (c.sumCount || 0) + 1;
    if(c.sumCount < every){ wxSave(); return; }
    c.sumCount = 0; wxSave();
    // 取这条人设卡最近 every 条「正常」消息（不要文稿/旁白/系统提示）
    var msgs = state.messages.filter(function(m){
      return (m.pid || '_') === pid && (m.type || 'text') !== 'article'
        && m.who !== 'sys' && m.who !== 'narration';
    }).slice(-every);
    if(msgs.length < 2) return;
    var hp = state.personas.filter(function(x){ return x.id === pid; })[0] || state.persona;
    var hisName = hp ? (hp.name || '他') : '他';
    var convo = msgs.map(function(m){ return (m.who === 'me' ? '我' : hisName) + '：' + (m.text || '（图片/语音）'); }).join('\n');
    function store(text){
      if(!text || text.trim().length < 4) return;
      addMemory(text.trim(), false, 'auto');
      try{ if(currentScreen === 'memory') renderers.memory(); }catch(e){}
      toast('已自动总结一段记忆');
    }
    function fallback(){
      var pick = msgs.slice(-6).map(function(m){ return (m.who === 'me' ? '我' : hisName) + '：' + (m.text || '').slice(0, 40); }).join('；');
      store('【自动记忆】与' + hisName + '最近的对话片段：' + pick);
    }
    var cfg = textCfgFor('wechat');
    if(cfg && cfg.url){
      var sys = '你是「记忆整理助手」。下面是一段聊天记录，请把它浓缩成 2-4 条简短、冷静、第三人称的要点，'
        + '方便以后回忆这段关系里发生的事与对方在意的东西。只输出要点本身，不要解释、不要寒暄、不要加引号。每条以「·」开头。';
      askModel(sys, convo, function(r, err){
        if(err || !r || r.trim().length < 4) fallback(); else store(r.trim());
      });
    } else {
      fallback();
    }
  }catch(e){ /* 总结失败不影响正常聊天 */ }
}

// 转账 / 位置 / 通话申请 / 一起听：都长成一张卡片，右下角显示当前状态
// 对方发来且还没处理的，底下给你「接受 / 拒绝」两个按钮
function cardBubbleHTML(m){
  var who = (m.who === 'me');
  var ico, title, body = '', st = '', acts = '';
  var pending = false, accepted = false;
  if(m.type === 'transfer'){
    ico = 'wallet';
    title = '转账';
    body = '<div class="cb-amt">¥' + (Number(m.amount) || 0).toFixed(2) + '</div>'
         + (m.note ? '<div class="cb-sub">' + esc(m.note) + '</div>' : '');
    var ts = m.tstate || 'pending';
    pending = (ts === 'pending'); accepted = (ts === 'accepted');
    st = pending ? '等待处理' : (accepted ? '已收款' : (ts === 'refunded' ? '已退还' : '已拒收'));
    if(!who && pending) acts = '<div class="cb-acts"><button class="cb-btn" data-card="' + m.id + '" data-cardact="1">收款</button>'
                             + '<button class="cb-btn ghost" data-card="' + m.id + '" data-cardact="0">退还</button></div>';
  } else if(m.type === 'location'){
    ico = 'pin';
    title = '位置';
    body = '<div class="cb-title2">' + esc(m.place || '某处') + '</div>'
         + (m.detail ? '<div class="cb-sub">' + esc(m.detail) + '</div>' : '');
    var ls = m.tstate || 'pending';
    pending = (ls === 'pending'); accepted = (ls === 'accepted');
    st = pending ? '等你回应' : (accepted ? '已赴约' : '已忽略');
    if(!who && pending) acts = '<div class="cb-acts"><button class="cb-btn" data-card="' + m.id + '" data-cardact="1">去这儿</button>'
                             + '<button class="cb-btn ghost" data-card="' + m.id + '" data-cardact="0">忽略</button></div>';
  } else if(m.type === 'invite'){
    var isV = (m.invKind === 'video');
    ico = isV ? 'video' : 'phone';
    title = isV ? '视频通话' : '语音通话';
    body = '<div class="cb-title2">' + esc(m.title || ((state.persona.name || '他') + '的通话邀请')) + '</div>'
         + (m.note ? '<div class="cb-sub">' + esc(m.note) + '</div>' : '');
    var is2 = m.istate || 'pending';
    pending = (is2 === 'pending'); accepted = (is2 === 'accepted');
    st = pending ? '等待接听' : (accepted ? '已接通' : '已拒绝');
    if(!who && pending) acts = '<div class="cb-acts"><button class="cb-btn" data-card="' + m.id + '" data-cardact="1">接听</button>'
                             + '<button class="cb-btn ghost" data-card="' + m.id + '" data-cardact="0">拒绝</button></div>';
  } else {
    ico = 'music';
    title = '一起听';
    body = '<div class="cb-title2">' + esc(m.song || '一首歌') + '</div>'
         + '<div class="cb-sub">邀你一起听这首歌</div>';
    var ls2 = m.istate || 'pending';
    pending = (ls2 === 'pending'); accepted = (ls2 === 'accepted');
    st = pending ? '等待接受' : (accepted ? '正在一起听' : '已拒绝');
    if(!who && pending) acts = '<div class="cb-acts"><button class="cb-btn" data-card="' + m.id + '" data-cardact="1">一起听</button>'
                             + '<button class="cb-btn ghost" data-card="' + m.id + '" data-cardact="0">算了</button></div>';
  }
  var cls = 'card-bub' + (pending ? ' pending' : (accepted ? ' ok' : ' no'));
  return '<div class="bubble ' + cls + '" data-card="' + m.id + '" data-mid="' + m.id + '">'
       + '<div class="cb-row"><span class="cb-ico" data-ico="' + ico + '"></span>'
       + '<span class="cb-t">' + esc(title) + '</span></div>'
       + body
       + '<div class="cb-state">' + esc(st) + '</div>'
       + acts
       + '</div>';
}
// 渲染聊天列表
function renderChat(){
  var box = $('chatList'); if(!box) return;
  closeBubbleMenu();
  var p = state.persona;
  var _grp3 = curGroup();
  if(_grp3){
    // 群聊：标题是群名 + 人数，中间那行列出群里都有谁
    var _ms = groupMembers(_grp3);
    $('chatName').textContent = groupName(_grp3);
    $('chatMeta').innerHTML = '<span class="g-badge">群聊</span> ' + _ms.length + ' 人：'
      + esc(_ms.map(function(x){ return x.name || '某人'; }).join('、'));
  } else {
    $('chatName').textContent = wxShowName(p);   // 备注 > 微信名称 > 人设卡名字
    var _rm = friendRemark(state.curPersona || '_');
    $('chatMeta').innerHTML = '微信号：' + esc(pWxid(p))
      + (_rm ? ' &nbsp;·&nbsp; <b style="color:var(--c-primary);">备注：' + esc(_rm) + '</b>' : '')
      + (p.wxName && p.wxName !== p.name ? ' &nbsp;·&nbsp; 昵称：' + esc(p.name || '他') : '');
  }
  $('chatStatus').textContent = statusText();
  // 顶部工具条上显示当前身份，点它可以换
  var bi = $('btnIdentity');
  if(bi) bi.innerHTML = lnIcon('user', 14) + ' ' + esc(meName());
  var bp = $('btnPersona');
  if(bp) bp.innerHTML = lnIcon('face', 14) + ' ' + esc(p.name || '他');
  // 群聊时工具条上多一个「群设置」：改群名、加减成员、换接话方式
  var bgs = $('btnGroupSet');
  if(bgs){
    bgs.style.display = _grp3 ? 'inline-block' : 'none';
    bgs.onclick = function(){ if(_grp3) openGroupSetting(_grp3.id); };
  }
  var list = state.messages;
  // 每个会话一段：只显示这个会话里的消息（单人按人设卡分，群聊按群分）
  var curPidVal = curPid();
  var c = chatCfg(curPidVal);     // 这段会话的显示设置（已读/未读、时间等）
  list = list.filter(function(m){ return (m.pid || curPidVal) === curPidVal; });
  // 批注模式是另一种模式：这里只看「文稿」（自己写的文章），其余模式只看普通聊天记录
  var ann = isAnnotate();
  list = list.filter(function(m){
    if(m.who === 'sys') return true;
    var isArt = (m.type === 'article');
    return ann ? isArt : !isArt;
  });
  // 搜索：按关键词过滤
  if(chatSearch){
    var kw = chatSearch.toLowerCase();
    list = list.filter(function(m){
      return (m.text || '').toLowerCase().indexOf(kw) >= 0 || fmtDate(m.ts).indexOf(chatSearch) >= 0;
    });
  }
  if(!list.length){
    box.innerHTML = '<div class="empty">' + (chatSearch ? '没找到相关消息'
      : (ann ? '还没有写过东西。在下面写一段，写完会变成一篇文稿，可以请好友来批注。' : '还没有聊天，说句话试试')) + '</div>';
    return;
  }
  var html = '', lastTs = 0;
  list.forEach(function(m){
    // 系统提示（比如「接口没通」）单独一行居中显示
    if(m.who === 'sys'){ html += '<div class="time-split">' + esc(m.text) + '</div>'; return; }
    // 批注模式的文稿：整篇 + 每段后面的（批注），跟气泡是完全不同的两套东西
    if(m.type === 'article'){
      if(m.ts - lastTs > 600000) html += '<div class="time-split">' + fmtFull(m.ts) + '</div>';
      lastTs = m.ts;
      // 正文和批注都存在「书架」的那篇文档上：这里只是把它显示出来
      var ref = (m.docId && shelfDocById(m.docId)) ? m.docId : m.id;
      html += '<div class="msg ann-msg" data-msel="' + m.id + '"><div class="mbwrap">' + annDocHTML(ref) + '</div></div>';
      return;
    }
    // 旁白：线下模式里加的场景 / 动作描述，居中斜体显示，不算聊天
    if(m.type === 'narration'){
      html += '<div class="msg narr"><div class="narr-line">' + esc(m.text || '') + '</div></div>';
      return;
    }
    // 间隔超过 10 分钟就插一条时间
    if(m.ts - lastTs > 600000){
      html += '<div class="time-split">' + fmtFull(m.ts) + '</div>';
    }
    lastTs = m.ts;
    var grp = isGroupPid();                  // 群聊：每条都要显示「是谁说的」
    var spk = grp ? speakerOf(m) : state.persona;
    var name = (m.who === 'me') ? meName() : (grp ? (spk.name || '某人') : wxShowName(state.persona));
    var off = isOffline() && !grp;   // 线下模式：居中大气泡（群聊里不用线上/线下的差别排版）
    var ava = off ? '' : ((m.who === 'me')
      ? wxAvaHTML('me', curIdentity() || {name:'我'}, 36)
      : wxAvaHTML('him', spk, 36));
    // 群里别人发的消息：气泡上方带一行小名字，一眼看出是哪位说的
    var gNameHtml = (grp && m.who !== 'me') ? '<div class="g-name">' + esc(name) + '</div>' : '';
    var inner;
    if(m.type === 'transfer' || m.type === 'location' || m.type === 'invite' || m.type === 'listen'){
      // 转账 / 位置 / 通话申请 / 一起听：统一做成一张小卡片，底下带结果和操作
      inner = cardBubbleHTML(m);
    } else if(m.type === 'pic'){
      // 带 img 的是真图片（用户发的 / 表情包来源的图）；没有 img 才是纯 CSS 画的虚拟图
      var pu = m.img ? (imgCache[m.img] || '') : '';
      if(pu){
        inner = '<div class="bubble nobub" data-mid="' + m.id + '">'
              + '<img class="cimg" src="' + esc(pu) + '" alt="' + esc(m.cap || '图片') + '"></div>';
      } else {
        inner = '<div class="bubble nobub" data-mid="' + m.id + '"><div class="vpic">' + lnIcon('image', 34, 'rgba(70,100,130,.55)')
              + '<div class="vcap">' + esc(m.cap || '一张图') + '</div></div></div>';
      }
    } else if(m.type === 'sticker'){
      // 表情包：用的是用户在设置里上传的图
      var su = m.img ? (imgCache[m.img] || '') : '';
      inner = '<div class="bubble nobub" data-mid="' + m.id + '">'
            + (su ? '<img class="stk" src="' + su + '" alt="表情">' : '<div class="hint">（表情包图片没了）</div>') + '</div>';
    } else if(m.type === 'voice' && !m.open){
      // 语音气泡：点一下才展开成文字（多选模式下这一下用来勾选，不展开）
      var hasAudio = !!voiceUrlOf(m);
      inner = '<div class="bubble' + (selMode ? ' sel-mode' : '') + '" data-voice="' + m.id + '"><div class="voice">'
            + '<span class="wave">' + '<i style="animation-delay:0s"></i><i style="animation-delay:.1s"></i><i style="animation-delay:.2s"></i><i style="animation-delay:.3s"></i><i style="animation-delay:.4s"></i></span>'
            + '<span class="vdur">' + (m.dur||3) + '″</span></div>'
            + (hasAudio
                ? '<div class="hint vbar" style="font-size:11px;margin-top:4px;">'
                  + '<span class="vlink" data-vplay="' + m.id + '">▶ 播放他的声音</span>'
                  + '<span class="vlink" data-vtext="' + m.id + '">转文字</span></div>'
                : '<div class="hint" style="font-size:11px;margin-top:4px;">点一下转文字</div>')
            + '</div>';
    } else {
      var txt = esc(m.text || '');
      // 译文显示
      if(m.translated && showTranslated[m.id]) txt = esc(m.translated);
      // 线下模式：居中大气泡（约占屏 90%）；他的气泡上半段是思维链（可收起），下半段正文
      if(off){
        var tcollapsed = (m.thinkOpen === false) ? ' collapsed' : '';
        var headAva = (m.who === 'me')
          ? wxAvaHTML('me', curIdentity() || {name:'我'}, 24)
          : wxAvaHTML('him', state.persona, 24);
        // 他的头像可点（看心里话）；我的头像只是个标记
        var headHtml = '<div class="bb-head">'
          + '<span class="bb-ava"' + (m.who === 'him' ? ' data-bbava="1" title="看他的心里话"' : '') + '>' + headAva + '</span>'
          + '<span>' + esc(name) + '</span></div>';
        var bodyHtml = '';
        if(m.who === 'him' && m.think){
          bodyHtml += '<div class="think' + tcollapsed + '" data-think="' + m.id + '">'
            + '<div class="think-hd" data-thinktoggle="' + m.id + '"><span class="think-arrow">▾</span> 思维链</div>'
            + '<div class="think-body">' + withAction(m.think) + '</div>'
            + '</div>';
        }
        var rb = (m.translated && showTranslated[m.id]) ? esc(m.translated) : withAction(m.text || '');
        if(m.type === 'action' || m.type === 'actionmix'){
          rb = ((m.type === 'action') ? withAction(m.text || '', true) : withAction(m.text || ''));
          rb = '<span class="act-tag">动作</span>' + rb;
        }
        bodyHtml += '<div class="reply-body">' + rb;
        if(m.translated) bodyHtml += '<div class="swap" data-swap="' + m.id + '">' + (showTranslated[m.id] ? '看原文' : '看译文') + '</div>';
        if(m.note) bodyHtml += '<div class="hint" style="font-size:11px;margin-top:4px;color:#b07a7a;">' + esc(m.note) + '</div>';
        bodyHtml += '</div>';
        // 心声：没说出口的那句话，用另一种字体 + 斜体 + 淡底色单独显示，跟动作/语言区分开
        if(m.who === 'him' && m.thought){
          bodyHtml += '<div class="thought"><span class="th-badge">心声</span>'
                    + esc(m.thought).replace(/\n/g, '<br>') + '</div>';
        }
        inner = '<div class="bubble big-bubble" data-mid="' + m.id + '">' + headHtml + bodyHtml + '</div>';
      } else if(m.type === 'action' || m.type === 'actionmix'){
        // 我发的「动作 / 动作+语言」：括号内动作体美化
        var aTxt = (m.type === 'action') ? withAction(m.text || '', true) : withAction(m.text || '');
        inner = '<div class="bubble action-bubble" data-mid="' + m.id + '">'
          + '<span class="act-tag">动作</span>' + aTxt;
        if(m.note) inner += '<div class="hint" style="font-size:11px;margin-top:4px;color:#b07a7a;">' + esc(m.note) + '</div>';
        inner += '</div>';
      } else {
        // 普通气泡：他发的消息把（……）动作描写美化一下
        var shown = (m.who === 'him') ? withAction(txt) : txt;
        inner = '<div class="bubble" data-mid="' + m.id + '">' + shown;
        if(m.translated){
          inner += '<div class="swap" data-swap="' + m.id + '">' + (showTranslated[m.id] ? '看原文' : '看译文') + '</div>';
        }
        if(m.type === 'voice') inner += '<div class="hint" style="font-size:11px;">（语音 ' + (m.dur||3) + '″）</div>';
        if(m.note) inner += '<div class="hint" style="font-size:11px;margin-top:4px;color:#b07a7a;">' + esc(m.note) + '</div>';
        inner += '</div>';
      }
    }
    var flag = '';
    if(c.showRead && m.who === 'me' && m.read) flag = '<div class="readflag">已读 ' + fmtTime(m.read) + '</div>';
    // 发送时间（按聊天设置决定显隐与位置）
    var tIn = '', tAfter = '';
    if(c.showTime){
      var tStr = fmtTime(m.ts);
      if(c.timePos === 'bubble') tIn = '<div class="m-time-in">' + tStr + '</div>';
      else tAfter = '<div class="m-time-after ' + (m.who === 'me' ? 'me' : 'him') + '">' + tStr + '</div>';
    }
    // 多选模式：每行加一个勾选框 + 气泡右上角打勾，整行可点选
    if(selMode) inner += '<span class="bcheck">✓</span>';
    var ck = selMode ? '<div class="sel-ck' + (selSet.has(m.id) ? ' on' : '') + '"></div>' : '';
    html += '<div class="msg ' + (off ? 'offline-msg ' : '') + (m.who === 'me' ? 'me' : '') + (selMode ? ' sel' : '') + (selMode && selSet.has(m.id) ? ' on' : '') + '" data-msel="' + m.id + '">' + ava + '<div class="mbwrap">' + gNameHtml + tIn + inner + tAfter + '</div>' + ck + '</div>' + flag;
  });
  box.innerHTML = html;
  // 绑定语音气泡点击
  $$('[data-voice]', box).forEach(function(el){
    el.addEventListener('click', function(){
      if(selMode) return;                 // 多选模式下不展开，交给整行勾选
      var id = el.getAttribute('data-voice');
      state.messages.forEach(function(m){ if(m.id === id) m.open = true; });
      save('messages'); renderChat();
    });
  });
  // 卡片消息（转账 / 位置 / 通话 / 一起听）：点接受 / 拒绝，别让它冒泡到「弹操作菜单」
  $$('[data-cardact]', box).forEach(function(el){
    el.addEventListener('click', function(e){
      e.stopPropagation();
      if(selMode) return;
      var mm = byId(el.getAttribute('data-card'));
      if(!mm) return;
      cardReply(mm, el.getAttribute('data-cardact') === '1');
    });
  });
  // 语音：真的合成过音频的话，可以直接点「播放他的声音」；“转文字”仍是展开成文字
  $$('[data-vplay]', box).forEach(function(el){
    el.addEventListener('click', function(e){
      e.stopPropagation();                 // 别再冒泡到整条气泡上，否则会顺手展开成文字
      if(selMode) return;
      var mm = state.messages.filter(function(x){ return x.id === el.getAttribute('data-vplay'); })[0];
      var u = voiceUrlOf(mm);
      if(!u){ toast('这条语音还没有音频文件'); return; }
      playVoiceMsg(u);
    });
  });
  $$('[data-vtext]', box).forEach(function(el){
    el.addEventListener('click', function(e){
      e.stopPropagation();
      if(selMode) return;
      var id = el.getAttribute('data-vtext');
      state.messages.forEach(function(m){ if(m.id === id) m.open = true; });
      save('messages'); renderChat();
    });
  });
  // 绑定原文/译文切换
  $$('[data-swap]', box).forEach(function(el){
    el.addEventListener('click', function(e){
      if(selMode) return;                 // 多选模式下不切换
      var id = el.getAttribute('data-swap');
      showTranslated[id] = !showTranslated[id];
      renderChat();
    });
  });
  // 绑定思维链「收起 / 展开」（小箭头）
  $$('[data-thinktoggle]', box).forEach(function(el){
    el.addEventListener('click', function(e){
      if(selMode) return;
      e.stopPropagation();                 // 不要顺手把气泡菜单也打开
      var id = el.getAttribute('data-thinktoggle');
      var m = byId(id); if(!m) return;
      m.thinkOpen = (m.thinkOpen === false);   // 默认展开，点一下收起，再点展开
      var think = el.parentNode;
      if(think) think.classList.toggle('collapsed', !m.thinkOpen);
      save('messages');
    });
  });
  // 批注模式：点「＋批注」→ 选人生成；点段落本体也一样
  $$('[data-annadd]', box).forEach(function(el){
    el.addEventListener('click', function(e){
      e.stopPropagation();
      if(selMode) return;
      var v = String(el.getAttribute('data-annadd')).split('|');
      openAnnotPicker(v[0], parseInt(v[1], 10));
    });
  });
  $$('[data-annseg]', box).forEach(function(el){
    el.addEventListener('click', function(){
      if(selMode) return;
      var v = String(el.getAttribute('data-annseg')).split('|');
      openAnnotPicker(v[0], parseInt(v[1], 10));
    });
  });
  // 点一条批注 → 改文字 / 改样式 / 重新生成 / 删除
  $$('[data-annitem]', box).forEach(function(el){
    el.addEventListener('click', function(e){
      e.stopPropagation();
      if(selMode) return;
      var v = String(el.getAttribute('data-annitem')).split('|');
      openAnnotItemMenu(v[0], parseInt(v[1], 10), v[2]);
    });
  });
  // 点气泡（非语音未展开）= 弹出这条消息的操作菜单
  $$('[data-mid]', box).forEach(function(el){
    el.addEventListener('click', function(e){
      if(selMode) return;                 // 多选模式下交给整行勾选
      var id = el.getAttribute('data-mid');
      var m = byId(id);
      if(m && m.type === 'voice' && !m.open) return;  // 未展开的语音先展开，不弹菜单
      if(m) openBubbleMenu(el, m);
    });
  });
  // 点「他」的头像：单击看「他的心里话」小窗；双击=戳一下（只在线上模式有戳一下）
  $$('.msg:not(.me) > .avatar, .msg:not(.me) > .ava-img', box).forEach(function(el){
    bindAvatarThoughts(el);
  });
  // 线下模式：大气泡里的小头像同样可以点开「他的心里话」
  $$('[data-bbava]', box).forEach(function(el){ bindAvatarThoughts(el); });
  // 多选模式：整行点选
  if(selMode){
    $$('.msg.sel', box).forEach(function(el){
      el.addEventListener('click', function(){
        onMsgSelect(el.getAttribute('data-msel'), el);
      });
    });
  }
  // 线下模式没有语音格式；批注模式是写文章，也不走语音
  var cv = $('chatVoice'); if(cv) cv.style.display = (isOffline() || isAnnotate()) ? 'none' : '';
  var om = $('offlineMode');
  if(om) om.classList.toggle('show', isOffline() && !isGroupPid());
  // 输入框提示语跟着模式变
  var ph = $('chatText');
  if(ph){
    ph.placeholder = ann ? '写点什么…（写完点发送，就变成一篇可以请好友批注的文稿）'
      : (isOffline() ? (offlineSendMode === 'action' ? '写一个动作（会自动包进括号）'
                      : offlineSendMode === 'actionmix' ? '（动作）想说的话' : '说点什么…')
                     : '说点什么…');
  }
  // 「批注设置」按钮只在批注模式的聊天页出现
  var abs2 = $('btnAnnSet');
  if(abs2) abs2.style.display = ann ? '' : 'none';
  var body = $('chatBody'); if(body) body.scrollTop = body.scrollHeight;
  try{ fillIcons(); }catch(e){}
}
// 顶部状态：刚刚在线 / X分钟前在线 等（用本地时间模拟）
function statusText(){
  var diff = Date.now() - lastSeen;
  if(diff < 60000) return '刚刚在线';
  if(diff < 3600000) return Math.floor(diff/60000) + ' 分钟前在线';
  if(sameDay(lastSeen, Date.now())) return '今天 ' + fmtTime(lastSeen) + ' 在线';
  var y = Date.now() - 86400000;
  if(sameDay(lastSeen, y)) return '昨天 ' + fmtTime(lastSeen) + ' 在线';
  return fmtDate(lastSeen) + ' 在线';
}
// 聊天顶部那行：特殊日期 > 心情 + 在线状态
function renderChatStatusLine(){
  var tip = specialDayTip();
  var line = tip ? tip : (statusText() + (state.mood ? ' · ' + state.mood : ''));
  if($('chatStatus')) $('chatStatus').textContent = line;
}

// 发送按钮
$('chatSend').addEventListener('click', sendMyMessage);
// 语音发送按钮：把当前输入框里的文字发成一个「语音」气泡
$('chatVoice').addEventListener('click', function(){ sendMyMessage('voice'); });

/* ---- 输入框左边的「＋」：发图片 / 表情包 / 转账 / 位置 / 通话申请 / 一起听 ---- */
var PLUS_CELLS = [
  ['dev',   'image',   '图片',   '从这台设备上挑一张'],
  ['album', 'album',   '相册',   '从已经存进来的图里选'],
  ['stk',   'heart',   '表情包', '用你做好的表情包套组'],
  ['shot',  'camera',  '拍一张', '调用相机拍了直接发'],
  ['money', 'wallet',  '转账',   '转一笔虚拟零钱给他'],
  ['loc',   'pin',     '位置',   '发一个虚拟定位过去'],
  ['inv',   'phone',   '语音通话', '发起语音通话申请'],
  ['vinv',  'video',   '视频通话', '发起视频通话申请'],
  ['lt',    'music',   '一起听', '约他一起听一首歌']
];
function renderPlusPanel(){
  var box = $('chatPlusPanel'); if(!box) return;
  box.innerHTML = '<div class="cplus-grid">' + PLUS_CELLS.map(function(c){
    return '<div class="cplus-cell" data-cplus="' + c[0] + '"><i><span data-ico="' + c[1] + '"></span></i>'
      + '<span>' + c[2] + '</span></div>';
  }).join('') + '</div>'
    + '<div class="hint" style="margin-top:8px;text-align:center;">点上面的格子发东西；再点一次「＋」收起。</div>';
  try{ fillIcons(); }catch(e){}
  $$('[data-cplus]', box).forEach(function(el){
    el.addEventListener('click', function(){
      var k = el.getAttribute('data-cplus');
      closePlusPanel();
      if(k === 'dev')        sendChatImage('device');
      else if(k === 'album') sendChatImage('album');
      else if(k === 'shot')  sendChatImage('shot');
      else if(k === 'stk')   openStickerPicker();
      else if(k === 'money') sendTransferPanel();
      else if(k === 'loc')   sendLocationPanel();
      else if(k === 'inv')   sendCallInvitePanel('voice');
      else if(k === 'vinv')  sendCallInvitePanel('video');
      else if(k === 'lt')    sendListenInvitePanel();
    });
  });
}
function togglePlusPanel(){
  var box = $('chatPlusPanel'); if(!box) return;
  if(box.classList.contains('show')){ closePlusPanel(); return; }
  renderPlusPanel();
  box.classList.add('show');
}
function closePlusPanel(){
  var box = $('chatPlusPanel'); if(box) box.classList.remove('show');
}
$('chatPlus').addEventListener('click', togglePlusPanel);
// 点面板以外的地方就收起
document.addEventListener('click', function(e){
  var box = $('chatPlusPanel');
  if(!box || !box.classList.contains('show')) return;
  if(box.contains(e.target) || (e.target.closest && e.target.closest('#chatPlus'))) return;
  closePlusPanel();
});
// 发一张真图片（type 仍是 pic，但带上 img → 渲染成真图而不是虚拟图）
function sendChatImage(from){
  if(from === 'album'){
    refreshAlbum(function(list){
      if(!list.length){ toast('相册还是空的，先用「图片」从设备上传一张'); return; }
      openModal('发一张图', '<div class="hint" style="margin-bottom:8px;">选中一张发出去：</div>'
        + '<div class="cp-pics" style="grid-template-columns:repeat(3,1fr);">'
        + list.slice(0, 24).map(function(it){
            return '<label class="cp-pic" style="cursor:pointer;display:block;">'
              + '<input type="radio" name="cpimg" value="' + esc(it.id) + '" style="position:absolute;opacity:0;">'
              + '<img src="' + esc(imgCache[it.id] || '') + '" alt="">'
              + '<span>' + esc(it.name || '图') + '</span></label>';
          }).join('') + '</div>',
        [{text:'发送', keep:true, fn:function(b){
            var r = b.querySelector('input[name=cpimg]:checked');
            if(!r){ toast('先选一张'); return; }
            pushMessage('me', '', 'pic', {img:r.value, cap:'照片'});
            closeModal(); toast('已发送');
          }}, {text:'取消', cls:'ghost'}]);
    });
    return;
  }
  // 相机：capture 让手机直接调起拍照，不给选相册的机会
  var accept = (from === 'shot') ? 'image/*' : 'image/*';
  var inp = document.createElement('input');
  inp.type = 'file'; inp.accept = accept;
  if(from === 'shot') inp.setAttribute('capture', 'environment');
  inp.style.position = 'fixed'; inp.style.left = '-9999px';
  document.body.appendChild(inp);
  inp.addEventListener('change', function(){
    var f = (inp.files || [])[0];
    try{ inp.parentNode.removeChild(inp); }catch(e){}
    if(!f) return;
    var iid = uid();
    try{ imgCache[iid] = URL.createObjectURL(f); }catch(e){}
    idbPut('images', {id:iid, name:f.name || '图片', blob:f, ts:Date.now()})
      .then(function(){ pushMessage('me', '', 'pic', {img:iid, cap:f.name || '照片'}); toast('已发送'); })
      .catch(function(){ pushMessage('me', '', 'pic', {img:iid, cap:f.name || '照片'}); toast('已发送'); });
  });
  inp.addEventListener('cancel', function(){ try{ inp.parentNode.removeChild(inp); }catch(e){} });
  inp.click();
}

/* =====================================================================
   聊天里「除了文字以外的那些东西」：转账 / 虚拟定位 / 通话申请 / 一起听
   双方都能发 —— 你从「＋」里发，他由模型按标记发（见 parseSpecialIntents）
   状态：pending（等你处理） → accepted（接受了）/ rejected（拒绝了）/ expired（没理会）
   ===================================================================== */
// 你也知道的几个常用地点，发定位时可以一键选（虚拟的，不是真定位）
var VIRTUAL_PLACES = ['家里','公司 / 学校','常去的那家咖啡店','江边公园','地铁站','超市','便利店','书店','医院','你说的那个地方'];
function sendTransferPanel(){
  ensureWallet();
  var bal = (state.wallet.balance || 0).toFixed(2);
  openModal('转账',
      '<div class="hint" style="margin-bottom:8px;">当前零钱余额：<b>¥' + bal + '</b>（虚拟货币，只在这台手机里流通）</div>'
    + '<label class="fld">金额</label><input type="number" id="trAmt" min="0.01" step="0.01" placeholder="52.00">'
    + '<label class="fld">留言</label><input type="text" id="trNote" placeholder="买奶茶">'
    + '<div class="btn-row" style="margin-top:8px;">'
    + ['6.66','52','88','131.4','520'].map(function(v){
        return '<button class="btn small ghost" data-trquick="' + v + '">' + v + '</button>';
      }).join('') + '</div>',
    [{text:'转账', fn:function(b){
        var amt = parseFloat(b.querySelector('#trAmt').value);
        if(!(amt > 0)){ toast('填个正确的金额'); return; }
        amt = Math.round(amt * 100) / 100;
        if(amt > (state.wallet.balance || 0) + 0.0001){ toast('零钱不够了'); return; }
        var note = (b.querySelector('#trNote').value || '').trim() || '转账';
        walletBill(-amt, '转给' + (state.persona.name || '他') + '（' + note + '）');
        closeModal();
        var m = pushMessage('me', '', 'transfer', {amount:amt, note:note, tstate:'pending'});
        himHandleMyCard(m);
      }}, {text:'取消', cls:'ghost'}]);
  // 快捷金额
  var box = $('modalBox');
  $$('[data-trquick]', box).forEach(function(el){
    el.addEventListener('click', function(){ $('trAmt').value = el.getAttribute('data-trquick'); });
  });
}
function sendLocationPanel(){
  openModal('发一个位置',
      '<div class="hint" style="margin-bottom:8px;">虚拟定位：随便写一个你们都知道的地方，或者从下面挑一个。</div>'
    + '<label class="fld">地点</label><input type="text" id="lcPlace" placeholder="江边公园">'
    + '<label class="fld">备注（可不填）</label><input type="text" id="lcDetail" placeholder="我在第三个长椅这儿等你">'
    + '<div class="btn-row" style="margin-top:8px;flex-wrap:wrap;">'
    + VIRTUAL_PLACES.map(function(v){
        return '<button class="btn small ghost" data-lcquick="' + esc(v) + '">' + esc(v) + '</button>';
      }).join('') + '</div>',
    [{text:'发送', fn:function(b){
        var place = (b.querySelector('#lcPlace').value || '').trim();
        if(!place){ toast('写个地点'); return; }
        var detail = (b.querySelector('#lcDetail').value || '').trim();
        closeModal();
        var m = pushMessage('me', '', 'location', {place:place, detail:detail, tstate:'pending'});
        himHandleMyCard(m);
      }}, {text:'取消', cls:'ghost'}]);
  var box = $('modalBox');
  $$('[data-lcquick]', box).forEach(function(el){
    el.addEventListener('click', function(){ $('lcPlace').value = el.getAttribute('data-lcquick'); });
  });
}
// 语音 / 视频通话申请：发出去后由他「接受 / 拒绝」
function sendCallInvitePanel(kind){
  var nm = (state.persona.name || '他');
  openModal(kind === 'video' ? '视频通话' : '语音通话',
      '<div class="hint" style="margin-bottom:8px;">给他发一个' + (kind === 'video' ? '视频' : '语音') + '通话申请，他会自己决定接不接。</div>'
    + '<label class="fld">想说的话（可不填）</label><input type="text" id="ivNote" placeholder="有空吗？想听听你的声音">',
    [{text:'发起申请', fn:function(b){
        var note = (b.querySelector('#ivNote').value || '').trim();
        closeModal();
        var m = pushMessage('me', '', 'invite', {invKind:kind, note:note, istate:'pending', title:nm + ' 的' + (kind === 'video' ? '视频' : '语音') + '通话'});
        himHandleMyCard(m);
      }}, {text:'取消', cls:'ghost'}]);
}
// 一起听申请：选一首歌约他
function sendListenInvitePanel(){
  var songs = ['晴天 — 周杰伦','起风了 — 买辣椒也用券','富士山下 — 陈奕迅','小半 — 陈粒',
               '突然好想你 — 五月天','江南 — 林俊杰','海阔天空 — Beyond','安静 — 周杰伦'];
  openModal('约他一起听',
      '<div class="hint" style="margin-bottom:8px;">挑一首歌（也可以自己写歌名），他会回你接不接受。</div>'
    + '<label class="fld">歌名</label><input type="text" id="ltSong" placeholder="晴天 — 周杰伦">'
    + '<div class="btn-row" style="margin-top:8px;flex-wrap:wrap;">'
    + songs.map(function(s){ return '<button class="btn small ghost" data-ltq="' + esc(s) + '">' + esc(s.split(' — ')[0]) + '</button>'; }).join('')
    + '</div>',
    [{text:'发起邀请', fn:function(b){
        var song = (b.querySelector('#ltSong').value || '').trim();
        if(!song){ toast('写个歌名'); return; }
        closeModal();
        var m = pushMessage('me', '', 'listen', {song:song, istate:'pending'});
        himHandleMyCard(m);
      }}, {text:'取消', cls:'ghost'}]);
  var box = $('modalBox');
  $$('[data-ltq]', box).forEach(function(el){
    el.addEventListener('click', function(){ $('ltSong').value = el.getAttribute('data-ltq'); });
  });
}
/* --------------------------------------------------------------------
   你发出去的「卡片」由他来处理：
   他（模型）看完你的转账 / 定位 / 申请后，决定接受还是拒绝，并把卡片状态改掉，
   再附一句话说出来。所以dialogue 里这条气泡会自己「变色 + 显示结果」。
   -------------------------------------------------------------------- */
function himHandleMyCard(m){
  if(!m) return;
  var kindMap = {
    transfer:'对方给你转了一笔钱',
    location:'对方发来一个位置',
    invite:  '对方发来' + (m.invKind === 'video' ? '视频' : '语音') + '通话申请',
    listen:  '对方邀请你一起听歌'
  };
  var ask = (kindMap[m.type] || '对方发来一条特殊消息')
          + '。你可以选择接受或拒绝，并一句话说出你的反应。'
          + '先在第一行写「接受」或「拒绝」两个字，换行后再写你想说的话（一两句，短一点）。';
  // 群聊里用群的方式回（群里某个人接话），单人聊天照旧
  showTyping();
  var cfg = chatCfg();
  var base = SPEED_MS[cfg.speed] || SPEED_MS.normal;
  setTimeout(function(){
    hideTyping();
    replyNow(ask, function(reply, think, errInfo, who){
      var t = String(reply || '');
      var accepted = /接受|好啊|好的|来吧|收下|没问题|走吧|答应/i.test(t.slice(0, 12)) || /^\s*接受/.test(t);
      if(/拒绝|算了|不了|不要|不太方便|下次/i.test(t.slice(0, 12))) accepted = false;
      // 第一行是「接受/拒绝」，去掉后剩下的才是要说的话
      var say = t.replace(/^\s*(接受|拒绝)\s*[：:，,。.\n]*/, '').trim();
      if(!say && !who) return;               // 他没话说就别发空气泡
      cardResolve(m, accepted, say, who && who.id);
      // 接受了才真的动账
      if(m.type === 'transfer' && accepted){
        walletBill(m.amount || 0, '收到' + (state.persona.name || '他') + '退回/转来的钱（' + (m.note || '转账') + '）');
      }
      if(m.type === 'invite' && accepted){
        pushMessage('sys', '（' + (state.persona.name || '他') + '接受了你的' + (m.invKind === 'video' ? '视频' : '语音') + '通话申请）', 'text');
      }
    }, m.pid || state.curPersona || '_');
  }, Math.round(base * (0.6 + Math.random() * 0.5)));
}
// 把一张卡片结算掉：改状态 + 写一句话（from 用于群聊里标明是谁答的）
function cardResolve(m, accepted, say, from){
  if(!m) return;
  if(m.type === 'transfer' || m.type === 'location') m.tstate = accepted ? 'accepted' : 'rejected';
  if(m.type === 'invite' || m.type === 'listen')     m.istate = accepted ? 'accepted' : 'rejected';
  save('messages');
  if(say) pushMessage('him', say, 'text', withFrom(null, from));
  else renderChat();
}
// 反过来：他发给你的卡片，你来点接受 / 拒绝
function cardReply(m, accept){
  if(!m) return;
  if(m.istate && m.istate !== 'pending') return;
  if(m.tstate && m.tstate !== 'pending') return;
  if(m.type === 'transfer'){
    if(!accept){ m.tstate = 'refunded'; save('messages'); renderChat(); toast('已退还'); return; }
    walletBill(m.amount || 0, '收下' + (state.persona.name || '他') + '的转账（' + (m.note || '转账') + '）');
    m.tstate = 'accepted';
    save('messages'); renderChat();
    toast('已收款 ¥' + (m.amount || 0).toFixed(2));
    // 他知道了也会回一句
    setTimeout(function(){
      var say = pick(['收到了，谢谢。','嗯，收下啦。','钱收到了。','好，我收下了。']);
      pushMessage('him', say, 'text', withFrom(null, m.from));
    }, 900);
    return;
  }
  if(m.type === 'location'){
    m.tstate = accept ? 'accepted' : 'rejected';
    save('messages'); renderChat();
    toast(accept ? '你接受了这个位置' : '你忽略了这个位置');
    return;
  }
  if(m.type === 'invite'){
    m.istate = accept ? 'accepted' : 'rejected';
    save('messages'); renderChat();
    if(accept){
      toast(m.invKind === 'video' ? '你接受了视频通话' : '你接受了语音通话');
      pushMessage('sys', '（你接受了' + (state.persona.name || '他') + '的' + (m.invKind === 'video' ? '视频' : '语音') + '通话申请）', 'text');
      var cfg = chatCfg();
      showTyping();
      setTimeout(function(){
        hideTyping();
        replyNow('（对方接了你的通话申请，你们正在通话中，请用一两句话开始）', function(r, think, err, who){
          if(r) pushMessage('him', r, 'text', withFrom(null, who && who.id));
        });
      }, Math.round((SPEED_MS[cfg.speed] || SPEED_MS.normal) * 0.6));
    } else {
      toast('你拒绝了这次通话');
      pushMessage('sys', '（你拒绝了' + (state.persona.name || '他') + '的通话申请）', 'text');
    }
    return;
  }
  if(m.type === 'listen'){
    m.istate = accept ? 'accepted' : 'rejected';
    save('messages'); renderChat();
    if(accept){
      toast('你们开始一起听《' + (m.song || '') + '》');
      pushMessage('sys', '（你和他正在一起听《' + (m.song || '') + '》）', 'text');
      setTimeout(function(){
        // 接着用「一起听」那条会话：把这句随感说出来
        replyNow('（你们正在一起听《' + (m.song || '') + '》，就这首歌说一句真实的随感，简短）', function(r, think, err, who){
          if(!r) return;
          pushMessage('him', r, 'text', withFrom(null, who && who.id));
          try{
            ensureListenTogether();
            state.listenTogether.unshift({id:uid(), friendName:(who ? (who.name) : (state.persona.name || '他')),
              song:m.song || '', ts:Date.now(), line:r});
            save('listenTogether');
          }catch(e){}
        });
      }, 1400);
    } else {
      toast('你拒绝了这次一起听');
    }
  }
}

/* =====================================================================
   他（模型）也能发这些东西：
   回复里出现这些「标记」时，除了正文外再生成对应的卡片消息。
   标记写在句首或句尾都行，会被原样从正文里剥掉。
     [TRANSFER:金额|留言]     他转钱给你
     [LOCATION:地点|备注]     他发个位置给你
     [CALLINVITE]            他想跟你语音通话
     [VIDEOINVITE]           他想跟你视频通话
     [LISTEN:歌名]           他想跟你一起听
   ===================================================================== */
var SPECIAL_TAGS = /\[(TRANSFER|LOCATION|CALLINVITE|VIDEOINVITE|LISTEN)\s*:?([^\]]*)\]/g;
function parseSpecialIntents(text, pid){
  var out = {text:String(text || '').trim(), cards:[]};
  var found = [];
  out.text = out.text.replace(SPECIAL_TAGS, function(all, tag, arg){
    var v = String(arg || '').trim();
    if(tag === 'TRANSFER'){
      var parts = v.split('|');
      var amt = parseFloat(parts[0]);
      if(amt > 0) found.push({type:'transfer', amount:Math.round(amt*100)/100, note:(parts[1]||'他给你的转账').trim()});
    } else if(tag === 'LOCATION'){
      var lp = v.split('|');
      if(lp[0]) found.push({type:'location', place:lp[0].trim(), detail:(lp[1]||'').trim()});
    } else if(tag === 'CALLINVITE'){
      found.push({type:'invite', invKind:'voice'});
    } else if(tag === 'VIDEOINVITE'){
      found.push({type:'invite', invKind:'video'});
    } else if(tag === 'LISTEN'){
      if(v) found.push({type:'listen', song:v});
    }
    return '';
  });
  out.text = out.text.replace(/\s{2,}/g, ' ').trim();
  out.cards = found;
  return out;
}
// 他回完话之后：如果有卡片，把卡片也补进聊天里
// from：群聊时标记这张卡片是哪个成员发出的
function pushSpecialCards(cards, pid, from){
  (cards || []).forEach(function(cd){
    var extra = {};
    if(cd.type === 'transfer'){ extra = {amount:cd.amount, note:cd.note, tstate:'pending'}; }
    else if(cd.type === 'location'){ extra = {place:cd.place, detail:cd.detail, tstate:'pending'}; }
    else if(cd.type === 'invite'){ extra = {invKind:cd.invKind, istate:'pending',
              title:(state.persona.name || '他') + ' 的' + (cd.invKind === 'video' ? '视频' : '语音') + '通话'}; }
    else if(cd.type === 'listen'){ extra = {song:cd.song, istate:'pending'}; }
    if(pid) extra.pid = pid;
    if(from) extra.from = from;
    pushMessage('him', '', cd.type, extra);
  });
}
// 表情包：列出所有套组里的图，点一张发出去
function openStickerPicker(){
  ensureWx();
  var pks = state.wx.stickers || [];
  var all = [];
  pks.forEach(function(pk){ (pk.items || []).forEach(function(i){ all.push({pk:pk.name || '套组', id:i}); }); });
  if(!all.length){
    openModal('还没有表情包', '<div class="hint">去「微信 → 设置 → 表情包」里建一个套组、上传几张图，就能在这里直接发。</div>',
      [{text:'知道了', cls:'ghost'}]);
    return;
  }
  openModal('发个表情包', '<div class="cp-pics" style="grid-template-columns:repeat(3,1fr);max-height:300px;overflow-y:auto;">'
    + all.map(function(it, i){
        return '<label class="cp-pic" style="cursor:pointer;display:block;">'
          + '<input type="radio" name="cpstk" value="' + esc(it.id) + '" style="position:absolute;opacity:0;">'
          + '<img src="' + esc(imgCache[it.id] || '') + '" alt="">'
          + '<span>' + esc(it.pk) + '</span></label>';
      }).join('') + '</div>',
    [{text:'发送', keep:true, fn:function(b){
        var r = b.querySelector('input[name=cpstk]:checked');
        if(!r){ toast('先选一张'); return; }
        pushMessage('me', '', 'sticker', {img:r.value});
        closeModal(); toast('已发送');
      }}, {text:'取消', cls:'ghost'}]);
}
$('chatText').addEventListener('keydown', function(e){
  if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendMyMessage(); }
});
$('chatText').addEventListener('input', function(){
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 110) + 'px';
});
$('chatBody').addEventListener('scroll', closeBubbleMenu);
// 线下模式发消息方式：纯语言 / 动作 / 动作+语言
(function(){
  var om = $('offlineMode'); if(!om) return;
  om.addEventListener('click', function(e){
    var opt = e.target.closest('[data-om]'); if(!opt) return;
    offlineSendMode = opt.getAttribute('data-om');
    $$('.om-opt', om).forEach(function(o){ o.classList.toggle('on', o === opt); });
    var ph = $('chatText');
    if(ph){
      ph.placeholder = offlineSendMode === 'action' ? '写一个动作（会自动包进括号）'
                     : offlineSendMode === 'actionmix' ? '（动作）想说的话' : '说点什么…';
    }
  });
})();

/* --------------------------------------------------------------------
   和他聊天时，偶尔会「刷到」他和别人的聊天
   翻到的那一段会存进查手机里，之后去「查手机 → 微信」就能反复看
   -------------------------------------------------------------------- */
var peekCd = {};
function maybePeekChat(){
  try{
    var p = state.persona || {};
    var pid = state.curPersona || '_';
    if(!pid) return;
    if(Math.random() > 0.3) return;                       // 大概三成的机会
    var now = Date.now();
    if(peekCd[pid] && now - peekCd[pid] < 5 * 60 * 1000) return;   // 同一个人五分钟内最多一次
    var targets = parseSocial(p.social).slice();
    // 关系网里加进来的人：拿「他原本认识的那个人」当对象
    if(!targets.length){
      var n = wxNet().filter(function(x){ return x.pid === pid; })[0];
      var src = n ? state.personas.filter(function(x){ return x.id === n.from; })[0] : null;
      if(src){
        if(src.name && src.name !== p.name) targets.push({name:src.name, rel:'原来就认识'});
        parseSocial(src.social).forEach(function(o){ if(o.name !== p.name) targets.push(o); });
      }
    }
    if(!targets.length) return;
    // 去掉已经翻过的，避免重复
    targets = targets.filter(function(t){ return t && t.name; });
    if(!targets.length) return;
    var d = checkData('p:' + pid, p.name || '他');
    if(!d.leaks) d.leaks = [];
    targets = targets.filter(function(t){ return !d.leaks.some(function(x){ return x.withName === t.name; }); });
    if(!targets.length) return;
    var target = pick(targets);
    var msgs = buildCheckThread('p:' + pid, d.name, target.name, 'leak');
    d.leaks.unshift({id:uid(), withName:target.name, ts:now, msgs:msgs});
    save('check');
    peekCd[pid] = now;
    pushMessage('sys', '（屏幕上闪过一段聊天——是他和「' + target.name + '」的。去「查手机」里能翻到）', 'text');
    addNotice('msg', '翻到了他和「' + target.name + '」的聊天');
    toast('你翻到了他和「' + target.name + '」的聊天');
  }catch(e){ console.warn('偷看聊天出错', e); }
}

// 发送按钮：可发文字（默认）或语音（forceType==='voice'）
function sendMyMessage(forceType){
  var el = $('chatText');
  var text = (el.value || '').trim();
  // 输入框是空的：
  //  - 点语音按钮却没打字 → 提示先输入文字
  //  - 点发送却没打字 → 对面主动来一句（自动生成对话）
  if(!text){
    if(forceType === 'voice'){ toast('先输入要转成语音的文字'); return; }
    // 批注模式下发送键空着点没意义，给个提示
    if(isAnnotate()){ toast('先写下你想写的一段话'); return; }
    himAutoSpeak();
    return;
  }
  el.value = ''; el.style.height = 'auto';
  // 批注模式：这一段是「我写的文章」，不是聊天消息，所以他不会回话；
  // 存成一篇文稿后，点段落上的「＋批注」就能请好友来读。
  if(isAnnotate()){
    // 写下来的每一段都存成书架上的一篇文档（只进书架，不进记忆）
    var d = shelfNewDoc(text, 'annotate', 'chat');
    var am = pushMessage('me', text, 'article', {docId:d.id, title:d.title});
    save('messages');
    renderChat();
    toast('存到书架了：' + d.title);
    return;
  }
  var type = forceType || 'text';
  // 线下模式：按用户选的「纯语言 / 动作 / 动作+语言」发送
  if(isOffline() && !forceType && offlineSendMode !== 'text'){
    type = offlineSendMode;
  }
  var my = pushMessage('me', text, type);
  // 亲密度 +1
  addGrowth(1);
  // 模拟「已读」延迟：1~4 秒后显示已读
  setTimeout(function(){
    state.messages.forEach(function(m){ if(m.id === my.id) m.read = Date.now(); });
    save('messages');
    if(inChat()) renderChat();
  }, 1000 + Math.random()*3000);
  // 聊天里说「记住……」自动存成记忆
  autoRemember(text);
  // 更新心情（情绪同步）
  updateMoodByText(text);
  // 让他回复：先显示「正在输入…」
  showTyping();
  var cfg = chatCfg();                                   // 回复速度按聊天设置来
  var base = SPEED_MS[cfg.speed] || SPEED_MS.normal;
  var delay = Math.round(base * (0.7 + Math.random() * 0.6));
  setTimeout(function(){
    hideTyping();
    replyNow(text, function(reply, think, errInfo, who){
      // 他可以在回复里写 [TRANSFER:..] / [CALLINVITE] 这类标记，这里把标记剥出来换成真卡片
      var pr = parseSpecialIntents(reply);
      // 群聊里大家只发文字（语音/虚拟图属于一对一的场景）
      var rType = isOffline() ? 'text' : ((Math.random() < 0.18) ? 'voice' : 'text');
      if(pr.cards.length || isGroupPid()) rType = 'text';
      var extra = errInfo ? {note:errInfo} : null;
      if(isOffline() && !isGroupPid() && think){ extra = extra || {}; extra.think = think; extra.thinkOpen = true; }
      extra = withFrom(extra, who && who.id);
      if(pr.text){
        var m = pushMessage('him', pr.text, rType, extra);
        if(errInfo){ toast(errInfo); addNotice('system', errInfo); } // 界面上写清楚为什么没通
        maybeTranslate(m); // 需要的话把回复翻成当前语言
      }
      if(pr.cards.length) pushSpecialCards(pr.cards, curPid(), who && who.id);
      afterHisReply(cfg); // 要不要跟着来张虚拟图片 / 甩个表情包
      maybePeekChat();    // 偶尔会刷到他和别人的聊天
    });
  }, delay);
}

// 用户没打字就点了发送：对面主动来一句，让对话动起来
function himAutoSpeak(){
  if(!state.curPersona) return;
  if($('typingRow')) return;            // 已经在输入了，别重复触发
  showTyping();
  var cfg = chatCfg();
  var base = SPEED_MS[cfg.speed] || SPEED_MS.normal;
  var delay = Math.round(base * (0.7 + Math.random() * 0.6));
  setTimeout(function(){
    hideTyping();
    replyNow('', function(reply, think, errInfo, who){
      var pr = parseSpecialIntents(reply);
      var rType = isOffline() ? 'text' : ((Math.random() < 0.18) ? 'voice' : 'text');
      if(pr.cards.length || isGroupPid()) rType = 'text';
      var extra = errInfo ? {note:errInfo} : null;
      if(isOffline() && !isGroupPid() && think){ extra = extra || {}; extra.think = think; extra.thinkOpen = true; }
      extra = withFrom(extra, who && who.id);
      if(pr.text){
        var m = pushMessage('him', pr.text, rType, extra);
        if(errInfo){ toast(errInfo); addNotice('system', errInfo); }
        maybeTranslate(m);
      }
      if(pr.cards.length) pushSpecialCards(pr.cards, curPid(), who && who.id);
      afterHisReply(cfg);
      maybePeekChat();
    });
  }, delay);
}

/* --------------------------------------------------------------------
   聊天消息：长按/点气泡 → 操作菜单（多选 / 重roll / 删除 / 收藏）
   · 多选：勾选多条后可「生成聊天对话截图」
   · 重roll：删掉这一条生成的内容，按上下文重新生成一条
   · 删除：直接删掉选中的消息
   · 收藏：把选中内容整理后写进他的记忆
   -------------------------------------------------------------------- */
var selMode = false;          // 是否处于多选模式
var selSet = new Set();       // 已勾选的消息 id
var offlineSendMode = 'text';  // 线下模式发消息的方式：text=纯语言 action=纯动作 actionmix=动作+语言

// 当前屏幕上能看到的、可操作的消息（和 renderChat 的过滤一致）
function visibleMsgs(){
  var curPid = state.curPersona || '_';
  var list = state.messages.filter(function(m){ return (m.pid || curPid) === curPid; });
  if(chatSearch){
    var kw = chatSearch.toLowerCase();
    list = list.filter(function(m){ return (m.text || '').toLowerCase().indexOf(kw) >= 0 || fmtDate(m.ts).indexOf(chatSearch) >= 0; });
  }
  return list.filter(function(m){ return m.who !== 'sys' && m.type !== 'narration'; });
}
function byId(id){ return state.messages.filter(function(m){ return m.id === id; })[0]; }
function selIds(){ return Array.from(selSet); }
function updateSelCount(){ var e = $('selCount'); if(e) e.textContent = selSet.size; }

// 点一条气泡 → 在气泡右上角弹出它的小操作图标（不再从右侧整屏弹出）
var bubbleMenuId = null;
function openBubbleMenu(el, m){
  if(!m || !el) return;
  closeBubbleMenu();
  bubbleMenuId = m.id;
  var menu = $('bubbleMenu');
  var rollable = (m.who === 'him');
  // 带图的消息（自己发的照片 / 表情包）才能存进他的相册
  var savable = !!m.img;
  menu.innerHTML =
      '<button data-bact="multi" title="多选"><span data-ico="check"></span></button>'
    + '<button data-bact="roll"' + (rollable ? '' : ' class="disabled"') + ' title="重roll（重新生成）"><span data-ico="refresh"></span></button>'
    + '<button data-bact="save"' + (savable ? '' : ' class="disabled"') + ' title="存进他的相册"><span data-ico="save"></span></button>'
    + '<button data-bact="del" title="删除"><span data-ico="trash"></span></button>'
    + '<button data-bact="fav" title="收藏到他的记忆"><span data-ico="star"></span></button>';
  try{ fillIcons(); }catch(e){}
  // 先显示再量尺寸，定位才准
  menu.classList.add('show');
  var pane = $('wxPaneMsg'), pr = pane.getBoundingClientRect(), br = el.getBoundingClientRect();
  var w = menu.offsetWidth || 166, h = menu.offsetHeight || 46;
  var left = br.right - pr.left - w - 2;
  var top = br.top - pr.top - h - 6;
  if(top < 2) top = br.bottom - pr.top + 6;          // 顶部放不下就放到气泡下方
  if(left < 2) left = 2;
  menu.style.left = left + 'px';
  menu.style.top = top + 'px';
  setTimeout(function(){ document.addEventListener('click', bubbleMenuOutside, true); }, 0);
}
function bubbleMenuOutside(e){
  var menu = $('bubbleMenu');
  if(menu && menu.classList.contains('show') && !menu.contains(e.target)) closeBubbleMenu();
}
function closeBubbleMenu(){
  var menu = $('bubbleMenu');
  if(menu) menu.classList.remove('show');
  bubbleMenuId = null;
  document.removeEventListener('click', bubbleMenuOutside, true);
}
$('bubbleMenu').addEventListener('click', function(e){
  var b = e.target.closest('[data-bact]'); if(!b) return;
  if(b.classList.contains('disabled')) return;
  var act = b.getAttribute('data-bact');
  var id = bubbleMenuId;            // 先记下，closeBubbleMenu 会把它清空
  closeBubbleMenu();
  if(act === 'multi') enterSelMode(id);
  else if(act === 'roll') rerollMessage(byId(id));
  else if(act === 'save') saveMsgToHisAlbum(byId(id));
  else if(act === 'del') deleteMessage(id);
  else if(act === 'fav') collectMessages([id]);
});
/* ---- 把聊天里的图存进「他」自己的相册（查手机 → 图片 里能看到） ---- */
function hisPicsOf(pid){
  if(!state.hisPics) state.hisPics = {};
  if(!state.hisPics[pid]) state.hisPics[pid] = [];
  return state.hisPics[pid];
}
function hisAddPic(pid, iid, name){
  if(!iid) return;
  hisPicsOf(pid).unshift(iid);
  save('hisPics');
}
// 把「生成截图」画出来的那张图存进他的相册（dataURL → blob）
function saveShotToHisAlbum(url){
  if(!url){ return; }
  try{
    var parts = String(url).split(',');
    var b64 = parts[1] || '';
    var mime = (/data:([^;]+)/.exec(String(url)) || [])[1] || 'image/png';
    var blob = base64ToBlob(b64, mime);
    var iid = '__hisp_' + uid();
    imgCache[iid] = url;
    idbPut('images', {id:iid, name:'聊天截图', blob:blob, ts:Date.now()})
      .then(function(){ hisAddPic(state.curPersona || '_', iid); toast('存进他的相册了'); })
      .catch(function(){ hisAddPic(state.curPersona || '_', iid); toast('存进他的相册了'); });
  }catch(e){ toast('这张图存不下来'); }
}
function saveMsgToHisAlbum(m){
  if(!m){ return; }
  var pid = m.pid || state.curPersona || '_';
  var src = m.img ? (imgCache[m.img] || '') : '';
  if(!src){ toast('这条消息里没有可以保存的图片'); return; }
  // 表情包也算图，一并存进去
  fetch(src).then(function(r){ return r.blob(); }).then(function(blob){
    var iid = '__hisp_' + uid();
    try{ imgCache[iid] = URL.createObjectURL(blob); }catch(e){}
    idbPut('images', {id:iid, name:(m.cap || '聊天里的图'), blob:blob, ts:Date.now()})
      .then(function(){ hisAddPic(pid, iid); toast('存进他的相册了'); })
      .catch(function(){ hisAddPic(pid, iid); toast('存进他的相册了'); });
  }).catch(function(){ toast('这张图取不下来，存不了'); });
}

// 进入 / 退出多选模式
function enterSelMode(seedId){
  selMode = true; selSet = new Set();
  if(seedId) selSet.add(seedId);
  var sb = $('selBar'); if(sb) sb.classList.add('show');
  var cb = $('chatBody'); if(cb) cb.style.paddingBottom = '128px';
  renderChat(); updateSelCount();
}
function exitSelMode(){
  selMode = false; selSet.clear();
  var sb = $('selBar'); if(sb) sb.classList.remove('show');
  var cb = $('chatBody'); if(cb) cb.style.paddingBottom = '70px';
  renderChat();
}
function onMsgSelect(id, rowEl){
  if(selSet.has(id)){ selSet.delete(id); if(rowEl) rowEl.classList.remove('on'); }
  else { selSet.add(id); if(rowEl) rowEl.classList.add('on'); }
  updateSelCount();
}
// 全选 / 取消全选
function selAll(){
  var vis = visibleMsgs();
  var allOn = vis.length > 0 && vis.every(function(m){ return selSet.has(m.id); });
  if(allOn) selSet.clear(); else vis.forEach(function(m){ selSet.add(m.id); });
  renderChat(); updateSelCount();
}
// 多选栏按钮（全局委托一次）
$('selBar').addEventListener('click', function(e){
  var b = e.target.closest('[data-selact]'); if(!b) return;
  var act = b.getAttribute('data-selact');
  if(act === 'shot') selScreenshot();
  else if(act === 'collect') collectMessages(selIds());
  else if(act === 'del') selDelete();
  else if(act === 'all') selAll();
  else if(act === 'exit') exitSelMode();
});

// 删除单条
function deleteMessage(id){
  state.messages = state.messages.filter(function(m){ return m.id !== id; });
  save('messages'); renderChat(); toast('已删除');
}
// 多选删除
function selDelete(){
  if(!selSet.size){ toast('先勾选要删的消息'); return; }
  var ids = selIds(), n = ids.length;
  state.messages = state.messages.filter(function(m){ return ids.indexOf(m.id) < 0; });
  save('messages');
  exitSelMode();
  toast('已删除 ' + n + ' 条');
}
// 重roll：删掉这条生成的内容，按上下文重新生成一条
function rerollMessage(m){
  if(!m || m.who !== 'him'){ toast('只能重roll他发的消息'); return; }
  var curPid = state.curPersona || '_';
  var prompt = '';
  for(var i = state.messages.length - 1; i >= 0; i--){
    var x = state.messages[i];
    if(x.id === m.id) continue;
    if((x.pid || curPid) !== curPid) continue;
    if(x.who === 'me' && x.text){ prompt = x.text; break; }
    if(x.who === 'him') break;        // 上一条也是他发的，没有可用上下文
  }
  state.messages = state.messages.filter(function(x){ return x.id !== m.id; });
  save('messages'); renderChat();
  showTyping();
  var cfg = chatCfg();
  var base = SPEED_MS[cfg.speed] || SPEED_MS.normal;
  var delay = Math.round(base * (0.7 + Math.random() * 0.6));
  setTimeout(function(){
    hideTyping();
    offlineReply(prompt, function(reply, think, errInfo){
      var rType = isOffline() ? 'text' : ((m.type === 'voice' && Math.random() < 0.5) ? 'voice' : (Math.random() < 0.18 ? 'voice' : 'text'));
      var extra = errInfo ? {note:errInfo} : null;
      if(isOffline() && think){ extra = extra || {}; extra.think = think; extra.thinkOpen = true; }
      var nm = pushMessage('him', reply, rType, extra);
      if(errInfo){ toast(errInfo); addNotice('system', errInfo); }
      maybeTranslate(nm); afterHisReply(cfg); maybePeekChat();
    });
  }, delay);
  toast('已重新生成');
}
// 收藏：把选中内容整理后写进他的记忆
function collectMessages(ids){
  if(!ids || !ids.length){ toast('先选要收藏的'); return; }
  var msgs = ids.map(byId).filter(Boolean).sort(function(a, b){ return a.ts - b.ts; });
  if(!msgs.length) return;
  var whoName = (state.persona.name || '他');
  var lines = msgs.map(function(m){
    var who = (m.who === 'me') ? '我' : whoName;
    var txt = (m.type === 'voice' ? '（语音 ' + (m.dur || 3) + '″）' : '') + (m.text || '');
    return who + '：' + txt;
  });
  addMemory('聊天收藏（' + whoName + '）：\n' + lines.join('\n'), false, '聊天收藏');
  toast('已收藏 ' + msgs.length + ' 条到他的记忆');
  if(selMode) exitSelMode();
}
// 多选栏「生成聊天对话截图」：把勾选的消息画成一张微信风格 PNG
function selScreenshot(){
  var ids = selIds();
  if(!ids.length){ toast('先勾选要截图的消息'); return; }
  var msgs = ids.map(byId).filter(Boolean).sort(function(a, b){ return a.ts - b.ts; });
  var url = genChatScreenshot(msgs);
  if(url){
    openModal('聊天对话截图',
      '<div style="text-align:center;"><img class="shot-img" src="' + url + '" alt="聊天截图"></div>',
      [{text:'下载图片', cls:'', fn:function(){ var a = document.createElement('a'); a.href = url; a.download = '聊天截图.png'; document.body.appendChild(a); a.click(); document.body.removeChild(a); }},
       {text:'存进他的相册', cls:'ghost', keep:true, fn:function(){ saveShotToHisAlbum(url); }},
       {text:'关闭', cls:'ghost', fn:function(){}}]);
  } else {
    // 当前环境拿不到 canvas（如某些无头环境）：退而求其次列出内容
    openModal('聊天对话截图',
      '<div class="hint">当前环境不支持生成图片，已为你列出所选内容：</div>'
      + '<div class="shot-list">' + msgs.map(function(m){ return esc((m.who === 'me' ? '我' : (state.persona.name || '他')) + '：' + (m.text || (m.type === 'voice' ? '（语音）' : ''))); }).join('<br>') + '</div>',
      [{text:'关闭', cls:'ghost', fn:function(){}}]);
  }
}
// 把一组消息画成微信聊天截图，返回 PNG 的 dataURL；不支持 canvas 时返回 null
function genChatScreenshot(msgs){
  var cv = document.createElement('canvas');
  var ctx = cv.getContext ? cv.getContext('2d') : null;
  if(!ctx) return null;
  var W = 380, padX = 14, padY = 14, ava = 38, gap = 10, maxBubble = 246;
  var fontSize = 15, lineH = 22, radius = 10, topBar = 46;
  var FONT = fontSize + 'px -apple-system,"PingFang SC","Microsoft YaHei",sans-serif';
  var FONT_B = '600 15px -apple-system,"PingFang SC","Microsoft YaHei",sans-serif';
  ctx.font = FONT;
  function wrap(text, maxw){
    var out = [], paras = (text || '').split('\n');
    paras.forEach(function(p){
      if(p === ''){ out.push(''); return; }
      var cur = '';
      for(var i = 0; i < p.length; i++){
        var ch = p[i], test = cur + ch;
        if(ctx.measureText(test).width > maxw && cur){ out.push(cur); cur = ch; }
        else cur = test;
      }
      if(cur) out.push(cur);
    });
    return out;
  }
  var rows = msgs.map(function(m){
    var who = (m.who === 'me') ? 'me' : 'him';
    var text = (m.type === 'voice' ? '（语音 ' + (m.dur || 3) + '″）' : '') + (m.text || '');
    if(m.note) text += '（' + m.note + '）';
    var lines = wrap(text, maxBubble);
    return {who:who, lines:lines, bh:lines.length * lineH + 16, text:text};
  });
  var contentH = 0; rows.forEach(function(r){ contentH += r.bh + gap; });
  var H = topBar + padY * 2 + contentH + 8;
  var dpr = Math.min((window.devicePixelRatio || 1), 2);
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  ctx.scale(dpr, dpr);
  // 背景与顶栏
  ctx.fillStyle = '#ededed'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#f7f7f7'; ctx.fillRect(0, 0, W, topBar);
  ctx.fillStyle = '#222'; ctx.font = '600 16px -apple-system,"PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText((state.persona.name || '他'), W / 2, topBar / 2);
  ctx.textAlign = 'left';
  // 圆角矩形
  function rr(x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  var y = topBar + padY;
  rows.forEach(function(r){
    var isMe = (r.who === 'me');
    var ax = isMe ? (W - padX - ava) : padX;
    // 头像
    ctx.fillStyle = isMe ? '#c3d3e0' : '#9be08a';
    ctx.beginPath(); ctx.arc(ax + ava / 2, y + ava / 2, ava / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = FONT_B; ctx.textAlign = 'center';
    var initial = isMe ? meName().slice(0, 1) : (state.persona.name || '他').slice(0, 1);
    ctx.fillText(initial, ax + ava / 2, y + ava / 2 + 1);
    ctx.textAlign = 'left';
    // 气泡
    var bw = 0; r.lines.forEach(function(l){ bw = Math.max(bw, ctx.measureText(l).width); });
    bw = Math.min(bw, maxBubble) + 22;
    var bx = isMe ? (ax - gap - bw) : (ax + ava + gap);
    rr(bx, y, bw, r.bh, radius);
    ctx.fillStyle = isMe ? '#ffffff' : '#95ec69'; ctx.fill();
    ctx.fillStyle = '#1a1a1a'; ctx.font = FONT;
    r.lines.forEach(function(l, i){ ctx.fillText(l, bx + 11, y + 13 + i * lineH); });
    y += r.bh + gap;
  });
  try { return cv.toDataURL('image/png'); } catch(e){ return null; }
}
// 他回完之后：按聊天设置决定要不要自动来张虚拟图片 / 用你上传的表情包
function afterHisReply(cfg){  cfg = cfg || chatCfg();
  if(cfg.autoImage && Math.random() < 0.35){
    setTimeout(function(){
      pushMessage('him', '', 'pic', {cap: pick(['刚看到的','送你一张','随手拍的','这个有点像你','给你看看'])});
    }, 900 + Math.random() * 1200);
  }
  if(cfg.useSticker){
    var sid = pickSticker(state.curPersona || '_');   // 只用授权给他的那几套
    if(sid && Math.random() < 0.4){
      setTimeout(function(){ pushMessage('him', '', 'sticker', {img:sid}); }, 700 + Math.random() * 900);
    }
  }
}
// 输入中的三个点
function showTyping(){
  hideTyping();
  var d = document.createElement('div');
  d.className = 'msg'; d.id = 'typingRow';
  d.innerHTML = '<div class="avatar">' + esc((state.persona.name||'他').slice(0,1)) + '</div>'
              + '<div class="bubble typing"><i></i><i></i><i></i></div>';
  $('chatList').appendChild(d);
  var body = $('chatBody'); body.scrollTop = body.scrollHeight;
}
function hideTyping(){ var t = $('typingRow'); if(t && t.parentNode) t.parentNode.removeChild(t); }

// 「记住……」自动存记忆
function autoRemember(text){
  var m = text.match(/记住(.{1,120})/);
  if(m && m[1] && m[1].trim()){
    addMemory(m[1].trim(), false, '聊天自动记的');
    toast('已经记住了：' + m[1].trim().slice(0,14));
    renderers.memory && (currentScreen === 'memory') && renderers.memory();
  }
}

/* ---- 他的语音：接了语音生成模型 + 设了专属音色，就把这句话真的念出来 ---- */
var voiceAudioEl = null;
function playVoiceMsg(url){
  try{
    if(!voiceAudioEl) voiceAudioEl = new Audio();
    voiceAudioEl.pause(); voiceAudioEl.src = url;
    try{ voiceAudioEl.currentTime = 0; }catch(e){}
    var pr = voiceAudioEl.play();
    if(pr && pr.catch) pr.catch(function(){ toast('这条语音放不出来'); });
  }catch(e){ toast('这条语音放不出来'); }
}
// 消息对象 → 能播的音频地址（优先存下来的文件，其次本次生成的临时链接）
function voiceUrlOf(m){
  if(!m) return '';
  try{ if(m.audioId && audioCache[m.audioId]) return audioCache[m.audioId]; }catch(e){}
  return m.tts || '';
}
function synthVoiceFor(m){
  var c = chatCfg(m.pid || '_');
  if(!c || !c.voice) return;                     // 没设专属音色就别多花这一次请求
  if(typeof askVoice !== 'function' || typeof selectedCfg !== 'function') return;
  var vcfg = null;
  try{ vcfg = selectedCfg('voice'); }catch(e){ return; }
  if(!vcfg || !vcfg.url) return;
  var txt = (m.text || '').trim();
  if(!txt) return;
  askVoice(txt, {voice:c.voice, lang:c.voiceLang || ''}, function(url, err){
    if(err || !url) return;
    try{
      m.tts = url;                               // 本次会话就能播（临时 blob 链接）
      save('messages');
      if(inChat() && currentScreen === 'call') renderChat();
    }catch(e){}
    // 再转存一份到音频库，重开应用也还能听
    try{
      fetch(url).then(function(r){ return r.blob(); }).then(function(bl){
        var aid = uid();
        return idbPut('audios', {id:aid, name:'他的语音', blob:bl, ts:Date.now()}).then(function(){
          audioCache[aid] = audioCache[aid] || URL.createObjectURL(bl);
          m.audioId = aid; save('messages');
        });
      }).catch(function(){});
    }catch(e){}
  });
}
// 聊天搜索
$('btnSearch').addEventListener('click', function(){
  openModal('搜索聊天记录',
    '<input type="text" id="searchInput" placeholder="关键词，或日期如 10月23日">',
    [
      {text:'搜索', cls:'', fn:function(box){
        chatSearch = (box.querySelector('#searchInput').value || '').trim();
        renderChat();
      }},
      {text:'清空', cls:'ghost', fn:function(){ chatSearch = ''; renderChat(); }}
    ]);
});

// 语言切换按钮
var LANGS = ['中文','English','日本語','한국어','Français','Español','Deutsch','Русский'];
$('btnLang').addEventListener('click', function(){
  var opts = LANGS.map(function(l){
    return '<option value="' + l + '"' + (l === state.settings.lang ? ' selected' : '') + '>' + l + '</option>';
  }).join('');
  openModal('沟通语言',
    '<label class="fld">他回复时使用的语言</label><select id="langSel">' + opts + '</select>'
    + '<label class="row" style="margin-top:10px;font-size:13px;"><input type="checkbox" id="langTr" style="width:auto;"'
    + (state.settings.translateOn ? ' checked' : '') + '> 自动把他的回复翻译成这个语言（可切换看原文）</label>'
    + '<div class="hint" style="margin-top:8px;">开启接口模式后，翻译会用接口来翻；本地模式只能翻译少量常用语。</div>',
    [{text:'保存', fn:function(box){
      state.settings.lang = box.querySelector('#langSel').value;
      state.settings.translateOn = box.querySelector('#langTr').checked;
      save('settings'); toast('已切换为：' + state.settings.lang);
    }}]);
});

/* ---- 单击他的头像：弹出小窗看「他此刻心里的想法」 ---- */
// 单击 = 心里话小窗；双击 = 戳一下（线下模式没有戳一下）
function bindAvatarThoughts(el){
  if(!el) return;
  el.style.cursor = 'pointer';
  el.title = isOffline() ? '看他的心里话' : '单击看他的心里话 · 双击戳一下';
  var clickTimer = null;
  el.addEventListener('click', function(e){
    if(selMode) return;
    e.stopPropagation();
    if(clickTimer) return;               // 已经是双击的第一下，等 dblclick 处理
    clickTimer = setTimeout(function(){
      clickTimer = null;
      openThoughtsWindow(el);
    }, 230);
  });
  el.addEventListener('dblclick', function(e){
    if(selMode) return;
    e.stopPropagation();
    if(clickTimer){ clearTimeout(clickTimer); clickTimer = null; }
    if(isOffline()) return;              // 线下模式已经没有戳一下了
    pokeHim();
  });
}
// 小窗：显示他此刻心里的想法（可以是一句短语，也可以是一小段话）
function openThoughtsWindow(anchorEl){
  var win = $('thoughtsWin'); if(!win) return;
  var p = state.persona || {};
  var pane = $('wxPaneMsg'); if(!pane) return;
  // 先摆位置再填内容
  win.classList.add('show');
  win.innerHTML = '<div class="tw-hd"><b>' + esc(p.name || '他') + ' 的心里话</b><span class="tw-close">✕</span></div>'
    + '<div class="tw-body tw-loading">他正在想……</div>';
  var pr = pane.getBoundingClientRect(), ar = anchorEl.getBoundingClientRect();
  var left = ar.left - pr.left, top = ar.bottom - pr.top + 6;
  if(left + 250 > pr.width) left = pr.width - 250;
  if(left < 4) left = 4;
  if(top + 130 > pr.height) top = Math.max(4, ar.top - pr.top - 130);
  win.style.left = left + 'px';
  win.style.top = top + 'px';
  win.querySelector('.tw-close').addEventListener('click', function(){ win.classList.remove('show'); });
  // 找一句你最近说的话，让他「接着你想」
  var lastMe = '';
  for(var i = state.messages.length - 1; i >= 0; i--){
    if(state.messages[i].who === 'me' && state.messages[i].text){ lastMe = state.messages[i].text; break; }
  }
  var sys = '你现在扮演「' + (p.name || '他') + '」，性格和说话方式：' + (p.tone || '温柔、自然') + '。'
    + '当前心情：' + (state.mood || '平静') + '，现在是' + timePeriod() + '，你们' + (isOffline() ? '在一起（线下相处）' : '在手机上聊天') + '。'
    + (lastMe ? ('对方刚说了：「' + lastMe + '」。') : '')
    + '请用第一人称写出你此刻心里真实的想法：可以只是一句短语，也可以是一小段话（两到三句）。'
    + '自然、不矫情、不做作，不要加引号，不要解释，不要写「我在想」这种开头，直接是想法本身。';
  var cfg = textCfgFor('wechat');
  if(cfg && cfg.url){
    askModelStrict(sys, '（写出你此刻心里的想法）', function(res, err){
      var body = win.querySelector('.tw-body');
      if(!body) return;
      body.classList.remove('tw-loading');
      body.textContent = (res && res.trim()) ? res.trim() : pick(DEFAULT_INNER);
    });
  } else {
    var body2 = win.querySelector('.tw-body');
    if(body2){ body2.classList.remove('tw-loading'); body2.textContent = pick(DEFAULT_INNER); }
  }
}

// 戳一下（虚拟触碰）：线上模式双击「他」的头像触发
// 戳一下：现在改成点「他」的头像就能戳（不再在聊天顶端点按钮）
// 回复内容可在「聊天设置」里编辑，按人设卡分别存（c.pokes），没有就回落到默认
var DEFAULT_POKES = ['嗯？','怎么了','哎，你戳我','干嘛呀','在呢。'];
// 模型思维链：模型生成正文「之前」的分析思考过程（不是内心想法）
// 它会综合：人设卡 / 世界书 / 记忆 / 上文 / 你刚发的话，先归纳分析，再据此生成正文。
// 提示词可在「聊天设置 → 模型思维链」里自己改，按人设卡分别存 c.chain.prompt
var DEFAULT_CHAIN_PROMPT = [
  '【思考步骤】在写回复正文之前，先完成一次分析，并把这段分析单独输出（它只作为思考过程展示，不算回复内容）：',
  '1. 归纳：对方这句话 / 这个动作在表达什么，情绪和需求是什么；',
  '2. 检索：从【你自己是什么样的人】（人设卡）、【要一直记着的事】（记忆）、【世界书】的设定和【最近对话】里，挑出这次真正用得上的信息；',
  '3. 权衡：以你的人设、当前心情和亲密度，决定用什么语气、称呼和远近分寸回应，避开雷区；',
  '4. 决定：这一句要达到什么效果（安抚 / 陪聊 / 推进 / 留白），然后再据此写正文。',
  '要求：只输出这段分析思考过程，用平实的口吻，1~4 句；不要写成回复正文，不要加「思考：」这类标题，不要复述上面的步骤。'
].join('\n');
// 单击头像看到的「他心里的想法」兜底池（短语 / 一小段话）
var DEFAULT_INNER = [
  '其实我有点想你了，只是没说。',
  '他今天看起来有点累，我想多陪陪他。',
  '有些话到了嘴边，又咽回去了。',
  '和他在一起的时候，时间好像过得特别快。',
  '我一直在想，上次那句话是不是说重了。',
  '如果可以，我真想就这么待着，什么都不用管。',
  '他笑起来的样子，我记了很久。',
  '有时候不说话，也能懂对方在想什么，真好。'
];
function pokeHim(){
  var c = chatCfg(state.curPersona || '_');
  var words = (c.pokes && c.pokes.length) ? c.pokes : DEFAULT_POKES;
  pushMessage('me', '（戳了戳你）', 'text');
  showTyping();
  setTimeout(function(){ hideTyping(); pushMessage('him', pick(words), 'text'); }, 900);
}
// 戳一下回复编辑：把数组渲染成可编辑的输入框列表
function pokeRowsHTML(arr){
  return (arr || []).map(function(t, i){
    return '<div class="poke-row"><input type="text" class="poke-in" data-pi="' + i + '" value="' + esc(t) + '" placeholder="一句戳一下后的回复">'
      + '<button class="poke-del" data-pdel="' + i + '" title="删除这句">✕</button></div>';
  }).join('');
}
// 读取当前输入框里的内容（保留用户正在敲的字）
function pokeReadInputs(){
  var arr = [];
  $$('#pokeList .poke-in').forEach(function(inp){ arr.push(inp.value); });
  return arr;
}
// 重新渲染列表并绑定删除
function pokeRefresh(arr){
  var box = $('pokeList');
  if(!box) return;
  box.innerHTML = pokeRowsHTML(arr);
  $$('[data-pdel]', box).forEach(function(b){
    b.addEventListener('click', function(){
      var i = +b.getAttribute('data-pdel');
      var a = pokeReadInputs(); a.splice(i, 1);
      pokeRefresh(a);
    });
  });
}

// 是否开启了「思维链」
function chainOn(){
  var c = chatCfg();
  return !!(c.chain && c.chain.on !== false);
}
// 拼给模型的思维链提示词：人设 + 世界书 + 记忆 + 上文 + 对方刚说的话，再加用户改过的思考步骤
function buildChainPrompt(userText){
  var c = chatCfg();
  var p = (c.chain && c.chain.prompt) ? c.chain.prompt : DEFAULT_CHAIN_PROMPT;
  return buildSystemPrompt(userText) + '\n【最近对话】\n' + recentContext() + '\n' + p;
}
// 本地（没接接口）时，用真实数据拼一段「分析过程」兜底：同样是人设/世界书/记忆/上文/这句话
function localChain(userText){
  try{
    var p = state.persona || {}, bits = [];
    var said = (userText || '').trim();
    bits.push(said ? ('归纳：对方说的是「' + said.slice(0, 30) + '」') : '归纳：对方没说话，只是待着');
    // 检索：人设卡
    var who = [];
    if(p.tone) who.push('语气' + p.tone);
    if(p.catchphrase) who.push('口头禅「' + p.catchphrase + '」');
    if(p.taboo) who.push('要避开' + p.taboo.slice(0, 12));
    if(who.length) bits.push('人设：' + who.join('、'));
    // 检索：世界书命中的设定
    var wb = (state.world || []).filter(worldForCurrent);
    var hitW = wb.filter(function(w){ return w.always || hitKeyword(w, userText || ''); });
    if(hitW.length) bits.push('世界书命中：' + hitW.slice(0, 2).map(function(w){ return w.title; }).join('、'));
    // 检索：记忆
    var mem = (state.memory || []).filter(function(m){ return !m.secret; });
    if(mem.length) bits.push('记忆里挑相关的（共 ' + mem.length + ' 条）');
    // 检索：上文
    var last = '';
    for(var i = state.messages.length - 1; i >= 0; i--){
      var x = state.messages[i];
      if(x.who === 'me' && x.text && x.text !== said){ last = x.text; break; }
    }
    if(last) bits.push('接着上文「' + last.slice(0, 18) + '」');
    // 权衡：心情 / 时间 / 亲密度
    bits.push('权衡：当前心情' + (state.mood || '平静') + '，' + timePeriod() + '，亲密度' + (state.growth.level || 1) + '级');
    bits.push('决定：按这个分寸回一句。');
    return bits.join('；');
  }catch(e){ return '（先把这句话接住，再回。）'; }
}
// 生成思维链：接了接口就让模型真的分析一遍；没接口 / 失败就用本地拼的分析兜底
function genChain(userText, cb){
  if(!chainOn()){ cb(''); return; }
  var cfg = textCfgFor('wechat');
  if(cfg && cfg.url){
    askModelStrict(buildChainPrompt(userText), userText || '（对方没有说话，你看着办）', function(res, err){
      if(err || !res){ cb(localChain(userText)); return; }
      cb(String(res).trim());
    });
  } else {
    cb(localChain(userText));
  }
}
// 线下模式：先出思维链，再「照着思维链」生成正文（思考后才生成文本）
function offlineReply(userText, cb){
  if(!isOffline()){ getReply(userText, function(r, e){ cb(r, '', e); }); return; }
  genChain(userText, function(think){
    getReply(userText, function(r, e){ cb(r, think || '', e); }, think);
  });
}
// 线下模式生成「他」的回复时附带思维链（用于主动消息 / 闪回这类不走 offlineReply 的地方）
// 线下不生成语音格式的消息
function offlineThinkExtra(type, extra, userText){
  if(isOffline() && type !== 'voice' && type !== 'pic' && type !== 'sticker' && type !== 'narration'){
    extra = extra || {};
    if(chainOn()){ extra.think = localChain(userText || ''); extra.thinkOpen = true; }
  }
  return extra;
}
// 把文字里的（……）动作描写渲染成特殊样式；纯动作消息会整体包进（）
// 线下模式：模型会在正文之后另起一行写「心声：……」。
// 把它从正文里拆出来单独存，界面上用另一种字体 + 倾斜 + 淡底色显示，跟动作/语言明显区分开。
function splitThought(m){
  if(!m || typeof m.text !== 'string' || !m.text) return;
  var lines = m.text.split(/\r?\n/);
  var keep = [], th = [];
  lines.forEach(function(ln){
    var t = ln.trim();
    if(/^(心声|心里话)\s*[：:]\s*/.test(t)) th.push(t.replace(/^(心声|心里话)\s*[：:]\s*/, '').trim());
    else keep.push(ln);
  });
  if(!th.length) return;
  m.thought = th.join('\n');
  m.text = keep.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
function withAction(text, forceWrap){
  var t = esc(text || '');
  if(forceWrap && t.indexOf('（') < 0 && t.indexOf('(') < 0){
    t = '（' + t + '）';
  }
  // 全角与半角括号都算动作
  t = t.replace(/（([^）]*)）/g, '<span class="act">（$1）</span>')
       .replace(/\(([^)]*)\)/g, '<span class="act">($1)</span>');
  return t;
}

/* ---- 模型思维链：见上方的 genChain / localChain / buildChainPrompt ---- */

// 回忆卡片：选几条聊天，生成一张纯 CSS 的假截图
$('btnRecall').addEventListener('click', function(){
  var recent = state.messages.slice(-30);
  if(!recent.length){ toast('还没有聊天记录'); return; }
  var html = '<div class="hint" style="margin-bottom:8px;">勾选要放进卡片的消息：</div><div style="max-height:240px;overflow-y:auto;">';
  recent.forEach(function(m){
    html += '<label class="row" style="padding:5px 0;font-size:13px;align-items:flex-start;">'
          + '<input type="checkbox" data-pick="' + m.id + '" style="width:auto;margin-top:3px;">'
          + '<span><b>' + (m.who === 'me' ? esc(meName()) : esc(state.persona.name)) + '：</b>' + esc((m.text||'').slice(0,40)) + '</span></label>';
  });
  html += '</div>';
  openModal('生成回忆卡片', html, [
    {text:'生成', fn:function(box){ showMemoryCard(box); }},
    {text:'取消', cls:'ghost'}
  ]);
});
function showMemoryCard(box){
  var ids = $$('[data-pick]', box).filter(function(i){ return i.checked; }).map(function(i){ return i.getAttribute('data-pick'); });
  if(!ids.length){ toast('至少选一条'); return; }
  var picked = state.messages.filter(function(m){ return ids.indexOf(m.id) >= 0; });
  var html = '<div id="memoryCardBox">'
    + '<div class="mc-head"><div class="avatar" style="width:28px;height:28px;font-size:12px;">' + esc((state.persona.name||'他').slice(0,1)) + '</div>'
    + '<div><b>' + esc(state.persona.name||'他') + '</b><div class="hint" style="font-size:11px;">' + fmtDate(picked[0].ts) + ' 的回忆</div></div></div>';
  picked.forEach(function(m){
    html += '<div class="mc-msg ' + (m.who==='me'?'me':'him') + '">' + esc(m.text||'') + '</div>';
  });
  html += '<div class="mc-foot">— 记录于 ' + fmtDate(Date.now()) + ' · ' + esc(state.persona.name||'他') + ' —</div></div>';
  openModal('回忆卡片', html, [
    {text:'下载成图片', fn:function(){ downloadCard(picked); }},
    {text:'复制文字', cls:'ghost', fn:function(){ copyText(picked.map(function(m){ return (m.who==='me'?meName():state.persona.name) + '：' + m.text; }).join('\n')); }},
    {text:'存进记忆', cls:'ghost', fn:function(){
      addMemory('回忆（' + fmtDate(Date.now()) + '）：' + picked.map(function(m){ return m.text; }).join(' / ').slice(0,120), false, '回忆卡片');
      toast('已存进记忆');
    }}
  ]);
}
// 把卡片画到 canvas 再导出成图片（不依赖任何外部库）
function downloadCard(picked){
  try{
    var w = 360, pad = 18, lh = 22, y = 60;
    var c = document.createElement('canvas');
    c.width = w; c.height = 120 + picked.length * 40;
    var g = c.getContext('2d');
    g.fillStyle = '#f2f7fc'; g.fillRect(0,0,c.width,c.height);
    g.fillStyle = '#33424f'; g.font = 'bold 16px sans-serif';
    g.fillText((state.persona.name||'他') + ' · 的回忆', pad, 34);
    g.font = '14px sans-serif';
    picked.forEach(function(m){
      var txt = (m.who==='me'?meName():(state.persona.name||'他')) + '：' + (m.text||'');
      txt = txt.slice(0, 22);
      g.fillStyle = m.who==='me' ? '#5d7f9e' : '#33424f';
      g.fillText(txt, pad, y);
      y += lh + 14;
    });
    g.fillStyle = '#7d8fa0'; g.font = '12px sans-serif';
    g.fillText('— ' + fmtDate(Date.now()) + ' —', pad, c.height - 18);
    var a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = '回忆卡片_' + fmtDate(Date.now()) + '.png';
    a.click();
    toast('已下载');
  }catch(e){ toast('导出失败：' + e.message); }
}
function copyText(t){
  try{
    var ta = document.createElement('textarea');
    ta.value = t; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    toast('已复制');
  }catch(e){ toast('复制失败'); }
}

/* =====================================================================
   第 8 段：回复引擎（提示词拼装 / 接口 / 本地关键词兜底）
   ===================================================================== */

// 把「只填了域名」的地址补全成常见的接口路径
function normalizeURL(u){
  u = (u || '').trim();
  if(!u) return '';
  if(!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try{
    var url = new URL(u);
    if(!url.pathname || url.pathname === '/') u = u.replace(/\/$/, '') + '/v1/chat/completions';
    return u;
  }catch(e){ return u; } // 解析不了就原样用，让请求自己报错
}

// 统一的模型提问入口：接口模式走网络，本地模式走关键词表
// cb(回答, 错误信息) —— 错误信息为 null 表示一切正常
function askModel(systemPrompt, userText, cb, projectKey){
  var cfg = textCfgFor(projectKey || 'wechat');
  if(cfg && cfg.url){
    var msgs = [{role:'system', content:systemPrompt}, {role:'user', content:userText}];
    callAPI(cfg, msgs, function(err, text){
      if(err){ cb(localReply(userText), '接口没通：' + err + '（先用本地关键词回话）'); }
      else{ cb(text, null); }
    });
  } else {
    setTimeout(function(){ cb(localReply(userText), null); }, 200);
  }
}
// 真正发请求的那一步（只有这里会联网）—— cfg 决定用哪份接口配置
function callAPI(cfg, messages, cb){
  var base = baseURL(cfg.url);
  var url = base + '/chat/completions';
  var p = cfg.params || {};
  var body = {
    model: cfg.model || 'gpt-4o-mini',
    messages: messages,
    temperature: num(p.temperature, 0.8),
    top_p: num(p.topP, 1),
    frequency_penalty: num(p.frequencyPenalty, 0)
  };
  var ctrl = new AbortController();
  var timer = setTimeout(function(){ ctrl.abort(); }, 30000); // 30 秒算超时
  fetch(url, {
    method: 'POST',
    headers: authHeaders(cfg),
    body: JSON.stringify(body),
    signal: ctrl.signal
  }).then(function(r){
    if(!r.ok) return r.text().then(function(t){ throw new Error('HTTP ' + r.status + ' ' + t.slice(0,120)); });
    return r.json();
  }).then(function(j){
    clearTimeout(timer);
    var c = j && j.choices && j.choices[0] && (j.choices[0].message || j.choices[0].delta);
    var text = c ? (c.content || '') : (j && j.content ? j.content : '');
    if(!text) throw new Error('接口返回里没有内容');
    cb(null, String(text).trim());
  }).catch(function(e){
    clearTimeout(timer);
    cb(e && e.name === 'AbortError' ? '请求超时（30秒）' : (e.message || '未知错误'));
  });
}

/* 语音生成（TTS）：走「接口 → 语音生成模型」那份配置。
   cb(音频地址, 错误信息) —— 地址可直接放进 <audio src> 播放（临时 blob 链接）。
   opts: {voice:音色名, model:模型名, speed:语速}；没填就用配置里选的模型。 */
function askVoice(text, opts, cb){
  opts = opts || {};
  try{
    ensureApis();
    var cfg = selectedCfg('voice');
    if(!cfg || !cfg.url){ cb(null, '还没接语音生成模型（去「接口 → 语音生成模型」填地址和钥匙）'); return; }
    var ep = cfg.endpoint || '/v1/audio/speech';
    if(ep.charAt(0) !== '/') ep = '/' + ep;
    var body = { model: opts.model || cfg.model || 'tts-1', input: text };
    if(opts.voice) body.voice = opts.voice;
    if(opts.speed) body.speed = opts.speed;
    // 「所说语言」：标准的 /v1/audio/speech 不认这个参数，只有自定义端点才带上，免得被接口判成多余字段而报错
    if(opts.lang && ep !== '/v1/audio/speech') body.lang = opts.lang;
    var ctrl = new AbortController();
    var timer = setTimeout(function(){ try{ ctrl.abort(); }catch(e){} }, 30000);
    fetch(baseURL(cfg.url) + ep, {
      method:'POST', headers: authHeaders(cfg), body: JSON.stringify(body), signal: ctrl.signal
    }).then(function(r){
      if(!r.ok) return r.text().then(function(t){ throw new Error('HTTP ' + r.status + ' ' + String(t).slice(0,120)); });
      return r.arrayBuffer();
    }).then(function(ab){
      clearTimeout(timer);
      try{ cb(URL.createObjectURL(new Blob([ab], {type:'audio/mpeg'})), null); }
      catch(e){ cb(null, '拿到音频但放不出来：' + (e.message || e)); }
    }).catch(function(e){
      clearTimeout(timer);
      cb(null, (e && e.name === 'AbortError') ? '语音生成超时（30秒）' : ((e && e.message) || '未知错误'));
    });
  }catch(e){ cb(null, (e && e.message) || e); }
}

// 拼装送给他（模型）的提示词：人设 + 心情 + 时间 + 长期记忆 + 世界书 + 最近一小段聊天
function buildSystemPrompt(userText){
  var p = state.persona, s = state.settings;
  var lines = [];
  var me = curIdentity();
  lines.push('你现在扮演「' + (p.name||'他') + '」，在和一个真实的人用聊天软件聊天。');
  lines.push('你称呼对方为「' + (p.callMe || (me && me.name) || '你') + '」。');
  // 他自己的外形、喜好、经历、关系网（人设卡上新加的那些栏位）
  var pf = [];
  if(p.gender)     pf.push('性别：' + p.gender);
  if(p.age)        pf.push('年龄：' + p.age);
  if(p.body)       pf.push('身材细节：' + p.body);
  if(p.outfit)     pf.push('日常穿衣风格：' + p.outfit);
  if(p.face)       pf.push('五官特征：' + p.face);
  if(p.likes)      pf.push('喜好：' + p.likes);
  if(p.background) pf.push('生活背景和经历：' + p.background);
  if(p.social)     pf.push('关系网：' + p.social);
  if(pf.length)    lines.push('【你自己是什么样的人】' + pf.join('；') + '。聊天时如果要提到这些，要和这里一致。');
  // 把「我」现在用的身份告诉他：姓名、性别、性格、背景经历……
  if(me){
    var who = [];
    if(me.name) who.push('姓名：' + me.name);
    if(me.gender) who.push('性别：' + me.gender);
    if(me.age) who.push('年龄：' + me.age);
    if(me.personality) who.push('性格：' + me.personality);
    if(me.background) who.push('背景经历：' + me.background);
    if(me.relation) who.push('你们的关系：' + me.relation);
    if(who.length) lines.push('【现在和你聊天的人】' + who.join('；') + '。说话要符合对方这个身份，别串到别的身份上去。');
  }
  lines.push('你的性格和说话方式：' + (p.tone||'温柔、自然'));
  if(p.catchphrase) lines.push('你的口头禅：' + p.catchphrase);
  if(p.taboo) lines.push('绝对不要说、不要做的事（雷区）：' + p.taboo);
  // 聊天设置（文风、是否感知时间/天气等）—— 要在这里就取好，后面几行要用
  var cfg = chatCfg();
  lines.push('当前心情：' + state.mood + (cfg.senseTime !== false ? '。当前时间：' + timePeriod() + ' ' + fmtTime(Date.now()) + '。' : '。'));
  // 现实天气：只在他被允许「感知天气」时才告诉他（关掉后他不会提天气）
  if(state.weather.text && cfg.senseWeather !== false) lines.push('今天的天气：' + state.weather.text);
  lines.push('亲密度等级：' + state.growth.level + '（越高越亲近，称呼可以更亲昵）。');
  if(s.lang && s.lang !== '中文') lines.push('请使用' + s.lang + '回复。');
  // 聊天设置里选的文风 → 换成那一小段精简提示词一起送给模型（模型因此知道怎么拿捏语气）
  var sp = stylePromptOf(cfg.style, '');
  if(sp) lines.push('【这一段的说话风格】' + sp);
  // 线上聊天 / 线下相处：两种模式下的写法不一样
  if(state.wx.mode === 'offline'){
    lines.push('【现在是线下相处】你们此刻在一起，不在手机两头。可以描写动作、神态、环境、心里活动，动作和神态用「（……）」括起来；'
             + '旁白里写到的场景你要当成真实发生的来接。');
    lines.push('要求：像真人当面相处。你可以用「纯动作」回应（整句只写（……）动作描写，不说话），也可以用「动作+语言」回应（（……）动作里夹一两句自然的话）。'
             + '一次只说一两句，短一点自然一点，不要写长段、不要用列表。');
    // 线下模式要把「没说出口的心里话」一起写出来（界面上会用另一种字体/颜色显示）
    lines.push('另外：如果这一刻你有没说出口的想法或情绪，在正文之后另起一行，以「心声：」开头写出来（例如「心声：其实看到你这样，我很心疼。」）。'
             + '没有就不写这一行。心声是内心独白，不要重复正文里已经说过的话，也不要描写动作。');
  } else {
    lines.push('要求：像真人发微信，一次只说一两句，短一点自然一点，不要用列表、不要写长段。');
  }
  // 除了文字，你也可以发这些「东西」：在回复末尾（或任意位置）单独用一行写下方括号标记，
  // 程序会把标记换成真正的卡片气泡（标记本身不会显示给用户），同一条回复里可以用多个。
  // 这些都是你主动发起的，看当下的气氛自然决定用不用，不要每句都发。
  lines.push('【你也能发这些】想发的话，在回复末尾另起一行写下方括号标记（可以有多个，标记本身不会显示）：');
  lines.push('- 转一笔钱：[TRANSFER:金额|留言]　例：[TRANSFER:52|拿去买奶茶]');
  lines.push('- 发个位置：[LOCATION:地点|备注]　例：[LOCATION:江边公园|我在第三个长椅这儿]');
  lines.push('- 发起语音通话：[CALLINVITE]　视频通话：[VIDEOINVITE]');
  lines.push('- 约对方一起听歌：[LISTEN:歌名]　例：[LISTEN:晴天 — 周杰伦]');
  lines.push('注意：只在你真的想这么做时才加标记；金额用数字，别写单位的汉字。');

  // 长期记忆（不含秘密）
  var mem = state.memory.filter(function(m){ return !m.secret; }).slice(0, 40);
  if(mem.length){
    lines.push('【要一直记着的事】');
    mem.forEach(function(m){ lines.push('- ' + m.text); });
  }
  // 秘密记忆：只有当前这句话里出现了相关关键词才临时带上
  var secrets = state.memory.filter(function(m){ return m.secret && (userText || '').indexOf(m.text.slice(0,2)) >= 0; });
  if(secrets.length){
    lines.push('【秘密记忆（只在被提到时才想起来）】');
    secrets.forEach(function(m){ lines.push('- ' + m.text); });
  }
  // 世界书：只看跟当前这张人设卡有关的
  // · 常驻的每次都带；和人设卡绑定的（专属设定）也算「一直跟着这个角色」，不被关键词门槛卡掉；其余的命中关键词才带
  var myWorld = state.world.filter(worldForCurrent);
  var curP = state.curPersona || '_';
  var always = myWorld.filter(function(w){ return w.always; });
  var scoped = myWorld.filter(function(w){ return !w.always && w.personaId === curP; });
  var hit = myWorld.filter(function(w){ return !w.always && w.personaId !== curP && hitKeyword(w, userText || ''); });
  var worldShow = always.concat(scoped, hit).slice(0, 24);
  if(worldShow.length){
    lines.push('【世界书设定】');
    worldShow.forEach(function(w){ lines.push('- ' + w.title + '：' + w.content); });
  }
  // 最近记忆引用（学习进度等）
  if(state.study.topic) lines.push('最近一起学习的东西：' + state.study.topic);
  return lines.join('\n');
}
// 针对某个具体好友（联系人列表里的人）拼系统提示词：一起听 / 一起看时用
function friendSystemPrompt(f){
  ensurePersonas(); ensureIdentities();
  var p = (f && f.pid) ? (state.personas.filter(function(x){ return x.id === f.pid; })[0] || null) : (state.persona || null);
  var nm = (f && f.name) || (p && p.name) || '他';
  var L = [];
  L.push('你现在扮演「' + nm + '」，在和一个真实的人用聊天软件聊天。');
  if(p){
    var pf = [];
    if(p.gender)     pf.push('性别：' + p.gender);
    if(p.age)        pf.push('年龄：' + p.age);
    if(p.body)       pf.push('身材细节：' + p.body);
    if(p.outfit)     pf.push('日常穿衣风格：' + p.outfit);
    if(p.face)       pf.push('五官特征：' + p.face);
    if(p.likes)      pf.push('喜好：' + p.likes);
    if(p.background) pf.push('生活背景和经历：' + p.background);
    if(p.social)     pf.push('关系网：' + p.social);
    if(pf.length)    L.push('【你自己是什么样的人】' + pf.join('；') + '。聊天时如果要提到这些，要和这里一致。');
    L.push('你的性格和说话方式：' + (p.tone || '温柔、自然'));
    if(p.catchphrase) L.push('你的口头禅：' + p.catchphrase);
    if(p.taboo)       L.push('绝对不要说、不要做的事（雷区）：' + p.taboo);
  }
  // 「我」的身份卡：让对方说话时符合你这个身份
  var me = curIdentity();
  if(me){
    var who = [];
    if(me.name) who.push('姓名：' + me.name);
    if(me.gender) who.push('性别：' + me.gender);
    if(me.age) who.push('年龄：' + me.age);
    if(me.personality) who.push('性格：' + me.personality);
    if(me.background) who.push('背景经历：' + me.background);
    if(me.relation) who.push('你们的关系：' + me.relation);
    if(who.length) L.push('【现在和你聊天的人】' + who.join('；') + '。说话要符合对方这个身份。');
  }
  // 世界书：常驻 + 这个角色专属的设定，一起带进去（和主聊天保持一致）
  var myWorld = (state.world || []).filter(worldForCurrent);
  var wsel = myWorld.filter(function(w){ return w.always || (p && w.personaId === (p.id || state.curPersona)); }).slice(0, 16);
  if(wsel.length){
    L.push('【世界书设定】');
    wsel.forEach(function(w){ L.push('- ' + w.title + '：' + w.content); });
  }
  L.push('要求：像真人发微信，一次只说一两句，短一点自然一点，不要用列表、不要写长段。');
  return L.join('\n');
}
// 判断一条世界书有没有被聊天内容触发
function hitKeyword(w, text){
  var ks = (w.keys || '').split(/[,，\s]+/).filter(function(x){ return x; });
  for(var i=0;i<ks.length;i++){ if(text.indexOf(ks[i]) >= 0) return true; }
  return false;
}
// 最近上下文：只取最后 N 条（N 在设置里可调）
// 群聊里要把「谁说的」带上，模型才知道自己在跟哪几个人说话
function recentContext(){
  ensureWx();
  var n = state.settings.memRecent || 8;
  var pid = curPid();
  var pool = state.messages.filter(function(m){
    return m.who !== 'sys' && !m.hidden && (m.pid || '_') === pid;
  });
  var arr = pool.slice(-n);
  var out = arr.map(function(m){
    var who = (m.who === 'me')
      ? meName()
      : (isGroupPid(pid) ? (speakerOf(m).name || '某人') : (state.persona.name || '他'));
    return who + '：' + (m.text || '');
  });
  // 如果开了「压缩旧聊天」，把更早的内容压成一句摘要放在前面
  if(state.settings.memCompress && pool.length > n){
    var older = pool.slice(0, -n);
    var heads = older.filter(function(m){ return m.who === 'me'; }).slice(-6).map(function(m){ return (m.text||'').slice(0,16); });
    if(heads.length) out.unshift('（更早聊过的大概是：' + heads.join('、') + '）');
  }
  return out.join('\n');
}
// 他回复的入口；chainText 是刚才那一步的思维链（有的话会作为「已经想过的东西」一起送进去）
function getReply(userText, cb, chainText){
  var sys = buildSystemPrompt(userText) + '\n【最近对话】\n' + recentContext();
  if(chainText){
    sys += '\n【你刚才的思考过程（照着它来回这一句，正文里不要复述思考）】\n' + chainText;
  }
  askModel(sys, userText, function(reply, err){
    // 本地模式或接口失败时，给回复加点「他」的味道
    cb(reply, err);
  });
}

// 本地关键词对照表（不联网时用这个回话）
var KEYWORDS = [
  {k:['你好','您好','hi','hello','嗨','在吗','在不在'], r:['嗯，我在。','嗨，正想找你。','在呢，怎么了？']},
  {k:['吃饭','吃了','饿','午饭','晚饭','早餐','外卖'], r:['吃了吗？别对付。','记得好好吃饭。','要不要先去吃点东西，我等你。']},
  {k:['累','疲惫','加班','困','想睡','好忙'], r:['累的话就歇会儿，我不着急。','别撑着，慢慢来。','要不要先躺一会儿？我在这儿。']},
  {k:['难过','哭','伤心','委屈','难受','痛苦','烦','焦虑'], r:['……过来，我在这儿。','不想说就不说，我陪着你。','你已经很努力了，真的。']},
  {k:['喜欢','爱你','想你','在乎'], r:['……嗯，我也是。','突然说这个，我会不好意思。','我知道。']},
  {k:['谢谢','感谢','多谢'], r:['不用谢。','跟我还客气什么。']},
  {k:['再见','拜拜','走了','先去'], r:['好，去吧。','记得回来找我。','嗯，我在这儿等你。']},
  {k:['天气','下雨','晴天','好热','好冷'], r:['这种天气，适合待着。','出门记得带伞。','别着凉。']},
  {k:['在干嘛','干什么','做什么'], r:['刚刚在想你。','没什么，就待着。','正想找你说话。']},
  {k:['起床','醒了','早上'], r:['早。今天也慢慢来。','刚起就找我啊。','早，昨晚睡得好吗？']},
  {k:['晚安','睡了','要睡'], r:['晚安，好梦。','睡吧，我守着。','晚安，明天见。']},
  {k:['？','?','吗'], r:['嗯？你说。','我想想……你先说你的。','什么？']}
];
var DEFAULT_REPLIES = ['嗯。','我在听。','然后呢？','是这样啊。','我懂你意思。','……嗯，我知道了。','你想说什么都可以。'];
function localReply(text){
  var t = (text || '').toLowerCase();
  var hit = null;
  for(var i=0;i<KEYWORDS.length;i++){
    for(var j=0;j<KEYWORDS[i].k.length;j++){
      if(t.indexOf(KEYWORDS[i].k[j].toLowerCase()) >= 0){ hit = KEYWORDS[i]; break; }
    }
    if(hit) break;
  }
  var base = hit ? pick(hit.r) : pick(DEFAULT_REPLIES);
  // 加上心情和时间的味道
  var m = state.mood;
  var pre = {'开心':'（语气轻快）','低落':'（声音低低的）','想你':'（有点黏人）','无聊':'（懒懒的）','疲惫':'（轻轻的）','平静':''}[m] || '';
  var tail = '';
  var r = Math.random();
  if(r < 0.16) tail = '　' + (state.persona.catchphrase || '');
  if(timePeriod() === '深夜' && r > 0.9) tail += '　这么晚还没睡？';
  return (pre + base + tail).trim();
}

// 翻译：接口模式用接口翻，本地模式只有很少的常用语对照
var MINI_DICT = {
  '你好':{'English':'Hello','日本語':'こんにちは','한국어':'안녕'},
  '我在':{'English':"I'm here",'日本語':'ここにいるよ','한국어':'여기 있어'},
  '晚安':{'English':'Good night','日本語':'おやすみ','한국어':'잘 자'},
  '想你':{'English':'I miss you','日本語':'会いたい','한국어':'보고 싶어'},
  '早安':{'English':'Good morning','日本語':'おはよう','한국어':'좋은 아침'}
};
function translateText(text, lang, cb){
  if(!text){ cb(''); return; }
  if(lang === '中文'){ cb(text); return; }
  if(state.api.mode === 'api' && state.api.url){
    var sys = '你是翻译器。把用户输入的内容翻译成' + lang + '，只输出译文，不要解释，保持原来的语气。';
    askModelStrict(sys, text, function(res, err){
      if(err) cb('（翻译失败：' + err + '）'); else cb(res);
    });
  } else {
    var d = MINI_DICT[text.trim()];
    cb(d && d[lang] ? d[lang] + '（本地小词典）' : '（本地模式翻不了，去「接口」里开启接口后才能翻译）');
  }
}
// 需要的时候自动翻译他的一条回复（结果存在消息上，界面可切换原文/译文）
function maybeTranslate(m){
  if(!m || !m.text) return;
  var lang = state.settings.lang;
  if(!state.settings.translateOn) return;
  if(!lang || lang === '中文') return;
  translateText(m.text, lang, function(res){
    if(res && res.indexOf('失败') < 0){
      m.translated = res;
      save('messages');
      if(inChat()) renderChat();
    }
  });
}
// 手动翻译某条消息（长按气泡或在语言弹窗里用）
function translateMessageById(id){
  var m = state.messages.filter(function(x){ return x.id === id; })[0];
  if(!m){ return; }
  var lang = state.settings.lang;
  if(!lang || lang === '中文'){ toast('先在「语言」里选一个外文'); return; }
  toast('翻译中…');
  translateText(m.text, lang, function(res){
    m.translated = res; save('messages'); renderChat();
  });
}
// 翻译专用：不使用本地兜底（翻译失败就该如实说）
function askModelStrict(systemPrompt, userText, cb){
  var cfg = textCfgFor('wechat');
  if(cfg && cfg.url){
    callAPI(cfg, [{role:'system', content:systemPrompt}, {role:'user', content:userText}], function(err, text){
      cb(err ? null : text, err);
    });
  } else { cb(null, 'local'); }
}

/* =====================================================================
   第 9 段：心情 / 亲密度 / 时间感知 / 主动消息
   ===================================================================== */
// 根据你说话的语气调他的心情（情绪同步）
function updateMoodByText(text){
  var t = text || '';
  var pos = ['开心','哈哈','喜欢','爱你','真好','不错','成功','赢了','谢谢','高兴'].some(function(w){ return t.indexOf(w) >= 0; });
  var neg = ['难过','累','烦','哭','伤心','难受','崩溃','压力','焦虑','失败','生气'].some(function(w){ return t.indexOf(w) >= 0; });
  var miss = ['想你','在吗','陪我','一个人','孤单'].some(function(w){ return t.indexOf(w) >= 0; });
  var newMood = state.mood;
  if(pos) newMood = '开心';
  else if(neg) newMood = (Math.random() < 0.5 ? '低落' : '疲惫');
  else if(miss) newMood = '想你';
  else if(Math.random() < 0.15) newMood = pick(MOODS); // 偶尔自己变一变
  if(newMood !== state.mood){ state.mood = newMood; save('mood'); }
}
/* ---- 亲密度卡片：每张人设卡一张 ----
   state.growthMap = { 人设卡id: {point, level, unlocked:[], folderId} }
   state.growth 仍然指向「当前这张人设卡」的那张卡，老代码照常用它。 */
function ensureGrowthCards(){
  ensurePersonas();
  if(!state.growthMap || typeof state.growthMap !== 'object') state.growthMap = {};
  var pid = state.curPersona || ((state.personas[0] || {}).id) || '_';
  // 老数据迁移：以前只有一份亲密度，就当成是当前这张人设卡的
  if(!state.growthMap[pid] && state.growth && (state.growth.point || state.growth.level > 1)){
    state.growthMap[pid] = {point:state.growth.point || 0, level:state.growth.level || 1,
                            unlocked:state.growth.unlocked || [], folderId:''};
  }
  (state.personas || []).forEach(function(p){
    if(!state.growthMap[p.id]){
      state.growthMap[p.id] = {point:0, level:1, unlocked:[], folderId:''};
    }
    var c = state.growthMap[p.id];
    if(typeof c.point !== 'number') c.point = 0;
    if(typeof c.level !== 'number') c.level = 1;
    if(!c.unlocked || Object.prototype.toString.call(c.unlocked) !== '[object Array]') c.unlocked = [];
    if(c.folderId === undefined) c.folderId = '';
  });
  // 让 state.growth 指向当前这张卡（引用同一个对象，改哪个都一样）
  state.growth = state.growthMap[pid] || {point:0, level:1, unlocked:[], folderId:''};
  state.growthMap[pid] = state.growth;
  save('growthMap'); save('growth');
}
// 某张人设卡的亲密度卡片
function growthCard(pid){
  ensureGrowthCards();
  return state.growthMap[pid] || {point:0, level:1, unlocked:[], folderId:''};
}
// 换人时把 state.growth 指到那张卡上
function syncGrowthToPersona(){
  ensureGrowthCards();
  var pid = state.curPersona || ((state.personas[0] || {}).id) || '_';
  state.growth = state.growthMap[pid] || state.growth;
}
// 亲密度：每说一句话加一点，到一定值解锁新东西
function addGrowth(n){
  syncGrowthToPersona();
  var g = state.growth;
  g.point = (g.point || 0) + n;
  g.level = g.level || 1;
  if(!g.unlocked) g.unlocked = [];
  var lv = Math.min(10, Math.floor(g.point / 60) + 1);
  if(lv > g.level){
    g.level = lv;
    var gift = growthGift(lv);
    if(gift){ g.unlocked.push(gift); addNotice('system', '亲密度升到 ' + lv + ' 级，解锁：' + gift); }
  }
  save('growth'); save('growthMap');
  if(currentScreen === 'growth' || currentScreen === 'growthFolder' || currentScreen === 'growthCard'){
    try{ renderers[currentScreen](); }catch(e){}
  }
}
function growthGift(lv){
  var gifts = {
    2:'更亲昵的称呼',
    3:'新口头禅：傻瓜',
    4:'他会主动说想你',
    5:'解锁一条隐藏设定（世界书）',
    6:'他会记得更多细节',
    7:'更长的晚安仪式',
    8:'专属昵称',
    9:'他会主动写日记给你',
    10:'他会说「我在这儿，一直都在」'
  };
  return gifts[lv] || '';
}

// 他主动找你：按时间段 / 最近记忆发一句
function proactiveMessage(force){
  var s = state.settings;
  if(!force && (!s.pushOn || inChat())) return;
  if(!force && isAnnotate()) return;           // 批注模式是安静的写作区，不让他插话
  var cfg0 = chatCfg();
  if(!force && !cfg0.proactive) return;          // 聊天设置里关掉了「主动发消息」
  // 开了「主动打电话」的话，有时候直接是一通电话
  if(!force && cfg0.call && Math.random() < 0.4){ proactiveCall(); return; }
  var period = timePeriod();
  var pool = {
    '早上': ['早，起床了吗？','今天有什么打算？','早上好，慢慢来。'],
    '中午': ['吃午饭了吗？','中午了，歇一会儿。','别只顾着忙。'],
    '下午': ['在干嘛呢？','突然想找你说句话。','今天过得怎么样？'],
    '晚上': ['晚上好，今天累吗？','要不要聊会儿天？','我在。'],
    '深夜': ['这么晚还没睡？','夜深了，早点休息。','睡不着的话，陪你待会儿。']
  }[period];
  var line = pick(pool);
  // 有记忆的话，偶尔提一句记忆里的事
  if(state.memory.length && Math.random() < 0.35){
    var m = pick(state.memory.slice(0,10));
    line = '突然想起你说过「' + m.text.slice(0,18) + '」，' + pick(['还好吗？','现在怎么样了？','我一直记着。']);
  }
  if(state.api.mode === 'api' && state.api.url){
    askModel(buildSystemPrompt(''), '（你现在主动给对方发一句话，简短自然，符合当前时间段）', function(r){
      pushMessage('him', r || line, 'text', offlineThinkExtra('text', null));
    });
  } else {
    pushMessage('him', line, 'text', offlineThinkExtra('text', null));
  }
  addNotice('msg', (state.persona.name||'他') + '：' + line.slice(0,20));
}
/* 冷落了他一阵子 → 他主动开口（聊天设置「主动」页里开关 + 设定分钟数）。
   真的超过设定时长没新对话，才调一次模型生成消息；同一个沉寂段里只会来一次，
   不会每半分钟烦你一条。 */
function maybeIdleNudge(){
  try{
    ensureWx();
    if(typeof isAnnotate === 'function' && isAnnotate()) return;   // 批注模式是安静区
    if(isGroupPid()) return;                                       // 群聊不主动挑起（避免群里刷屏）
    var pid = state.curPersona || '_';
    var c = chatCfg(pid);
    if(!c || !c.idleOn) return;
    var mins = Math.max(1, c.idleMin || 5);
    var msgs = state.messages.filter(function(m){ return (m.pid || '_') === pid; });
    if(!msgs.length) return;                       // 从没聊过就别突然冒出来一句话
    var lastTs = msgs[msgs.length - 1].ts || 0;
    var now = Date.now();
    if(now - lastTs < mins * 60000) return;        // 还没有冷落到设定时长
    var lastNudge = LS.get('idleLast_' + pid, 0);
    if(now - lastNudge < mins * 60000) return;     // 这段沉寂他已经开口过了，再给它一个周期
    LS.set('idleLast_' + pid, now);
    proactiveMessage(true);
  }catch(e){}
}
// 他主动给你打了个电话（聊天设置里打开「主动打电话」才会有）
function proactiveCall(){
  if(isGroupPid()) return;           // 群聊里没有「他打给你」这种一对一来电
  var p = state.persona;
  var dur = 30 + Math.floor(Math.random() * 200);
  state.calls.unshift({id:uid(), type:'来电', dur:dur, ts:Date.now(), note:'他主动打来的'});
  save('calls');
  pushMessage('him', '（给你打了个电话，聊了' + Math.ceil(dur/60) + '分钟）', 'text');
  addNotice('msg', (p.name||'他') + ' 给你打来了电话');
  if(currentScreen === 'call') renderCallLog();
  toast((p.name||'他') + ' 给你打来了电话');
}
// 记忆闪回：他突然提起过去
function flashback(){
  if(!state.settings.flashOn) return;
  if(isAnnotate()) return;                     // 批注模式不插话
  var src = state.memory.concat(state.messages.filter(function(m){ return m.who === 'me' && m.text; }));
  if(!src.length) return;
  var item = pick(src);
  var text = '突然想起那天你说' + '「' + (item.text||'').slice(0,24) + '」' + pick(['……那时候真好。','现在还记得。','嗯，就是那次。']);
  pushMessage('him', text, 'text', offlineThinkExtra('text', null));
  addNotice('msg', '记忆闪回：' + text.slice(0,20));
}
// 今日小结：总结今天聊了什么
function dailySummary(manual){
  var today = state.messages.filter(function(m){ return sameDay(m.ts, Date.now()) && m.text; });
  if(!today.length && !manual){ return; }
  var heads = today.slice(0, 40).filter(function(m){ return m.who === 'me'; }).map(function(m){ return (m.text||'').slice(0,14); });
  var text;
  if(state.api.mode === 'api' && state.api.url){
    askModel(buildSystemPrompt(''), '（请用一两句简短的话总结今天你们聊过的重点，并加上一点你自己的感受）', function(r){
      if(r) saveSummary(r);
    });
    return;
  }
  text = '今天你说了这些：' + (heads.slice(0,5).join('、') || '（没说太多）') + '。我觉得' + pick(['挺好的。','你今天也很努力了。','能陪着你就好。']);
  saveSummary(text);
  if(manual) toast('小结已生成');
}
function saveSummary(text){
  state.diary.unshift({id:uid(), type:'summary', text:text, ts:Date.now()});
  save('diary');
  addMemory('今日小结（' + fmtDate(Date.now()) + '）：' + text.slice(0,60), false, '小结');
  addNotice('system', '今日小结已生成');
  if(currentScreen === 'diary') renderers.diary();
}
// 小习惯陪伴：记忆里标了「习惯」的条目，会在合适时间轻轻提一句
function habitNudge(){
  var hs = state.memory.filter(function(m){ return (m.tag||'').indexOf('习惯') >= 0; });
  if(!hs.length) return;
  var h = pick(hs);
  var line = '你说过「' + h.text.slice(0,20) + '」，' + pick(['现在还好吗？','记得照顾自己。','我一直记着这事。']);
  pushMessage('him', line, 'text');
  addNotice('msg', '习惯提醒：' + line.slice(0,20));
}
// 到点问「要睡了吗」
function sleepCheck(){
  var s = state.settings;
  if(!s.sleepTime) return;
  var now = new Date();
  var hm = pad(now.getHours()) + ':' + pad(now.getMinutes());
  if(hm === s.sleepTime){
    pushMessage('him', '要睡了吗？', 'text');
    addNotice('system', (state.persona.name||'他') + '问你要睡了吗');
    LS.set('lastSleepAsk', Date.now());
  }
}
// 第二天关心昨晚睡得怎么样
function morningCare(){
  var last = LS.get('lastSleepAsk', 0);
  if(!last) return;
  if(Date.now() - last > 3600000 * 4 && Date.now() - last < 3600000 * 16){
    var h = new Date().getHours();
    if(h >= 6 && h <= 11){
      pushMessage('him', '昨晚睡得怎么样？', 'text');
      LS.set('lastSleepAsk', 0);
    }
  }
}

// 一个总定时器：每 30 秒检查一次该不该说话
setInterval(function(){
  var now = Date.now();
  var s = state.settings;
  // 主动找你
  var lastPush = LS.get('lastPush', 0);
  if(s.pushOn && now - lastPush > (s.pushMinutes||30) * 60000){
    LS.set('lastPush', now);
    proactiveMessage();
  }
  // 记忆闪回
  var lastFlash = LS.get('lastFlash', 0);
  if(s.flashOn && now - lastFlash > (s.flashMinutes||90) * 60000){
    LS.set('lastFlash', now);
    if(Math.random() < 0.5) flashback();
  }
  // 今日小结
  var lastSum = LS.get('lastSummary', 0);
  if(new Date().getHours() === (s.summaryHour || 22) && now - lastSum > 3600000 * 20){
    LS.set('lastSummary', now);
    dailySummary(false);
  }
  // 小习惯
  var lastHabit = LS.get('lastHabit', 0);
  if(now - lastHabit > 3600000 * 6){
    LS.set('lastHabit', now);
    if(Math.random() < 0.4) habitNudge();
  }
  // 沉寂了太久（聊天设置里自己定的分钟数）：他调一次模型主动开口
  maybeIdleNudge();
  sleepCheck();
  morningCare();
  // 微信：好友偶尔发条好友圈（只发在当前身份的圈子里）
  var lastWx = LS.get('lastWxPost', 0);
  if(now - lastWx > 600000 && Math.random() < 0.25){
    LS.set('lastWxPost', now);
    ensureWx(); ensurePersonas();
    syncNpc();
    // 三成概率让 npc 发（TA 所属的 char 会去互动），其余让好友发
    var npcs = state.personas.filter(isNpcCard);
    if(npcs.length && Math.random() < 0.35){
      var np = pick(npcs);
      wxPersonaPost({kind:'persona', pid:np.id, name:np.name});
    } else {
      var fs = wxFriends();
      if(fs.length && Math.random() < 0.7){
        var f = pick(fs);
        wxPersonaPost({kind:'persona', pid:f.pid, name:''});
      }
    }
  }
  if(currentScreen === 'call') renderWxDots();
  // 安静陪伴模式下的偶尔一句
  if(s.quietOn && currentScreen === 'quiet'){
    var lastQ = LS.get('lastQuiet', 0);
    if(now - lastQ > (s.quietMinutes||15) * 60000){
      LS.set('lastQuiet', now);
      var el = $('quietLine');
      if(el) el.textContent = pick(['我在。','慢慢来。','不着急。','我在这儿陪你。']);
    }
  }
}, 30000);

/* =====================================================================
   第 10 段：文件选择小工具 + 朋友圈 / 相册 / 通话 / 视频 / 音乐 / 备忘 / 名片
   ===================================================================== */
// 弹出系统文件选择框（选图片、音频、资料都用它）
function pickFile(accept, multi, cb){
  var inp = document.createElement('input');
  inp.type = 'file'; inp.accept = accept || ''; inp.multiple = !!multi;
  // 手机端（尤其 iOS Safari）对 display:none / 远移出屏的 input 会拒绝弹出选文件框。
  // 这里用“透明、铺满屏幕”的方式：既不可见，又能被代码正常 click 触发。
  inp.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;opacity:0;z-index:99999;pointer-events:none;';
  document.body.appendChild(inp);
  var cleaned = false, timer = 0;
  function has(){ return !!(inp.files && inp.files.length); }
  function cleanup(){
    clearTimeout(timer);
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('pageshow', onFocus);
    document.removeEventListener('visibilitychange', onVis);
    if(inp.parentNode) inp.parentNode.removeChild(inp);
  }
  function done(){
    if(cleaned) return; cleaned = true;
    var fs = Array.prototype.slice.call(inp.files || []);
    cleanup();
    cb(fs);
  }
  // 取消检测：绝不能再用「固定 1.2 秒」这种定时 —— 手机上挑一张照片往往要十几秒，
  // 定时器会先把 input 摘掉并回调一个空数组，用户真正选完时 change 已经没人接了（表现就是点了没反应）。
  // 改成：页面重新可见 / 重新获得焦点后再等 2 秒，仍然没有文件才算用户取消。
  function maybeCancel(delay){
    setTimeout(function(){ if(!cleaned && !has()) done(); }, delay);
  }
  function onFocus(){ maybeCancel(2000); }
  function onVis(){ if(!document.hidden) maybeCancel(2000); }
  window.addEventListener('focus', onFocus);
  window.addEventListener('pageshow', onFocus);
  document.addEventListener('visibilitychange', onVis);
  // 兜底：万一焦点事件都没来，2 分钟后把它收掉，别一直盖在屏幕上
  timer = setTimeout(function(){ if(!cleaned && !has()) done(); }, 120000);
  inp.addEventListener('change', done);
  inp.click();
}
// 统一的头像落库：把一张图片设成某个对象的头像
// who='him'（人设卡 / NPC，key=人设卡 id）或 who='me'（身份卡，key=身份 id）
function applyAvatar(who, key, file, cb){
  if(!key){ if(cb) cb(false); return; }
  var iid = '__ava_' + who + '_' + key;
  function finish(){
    ensureWx();
    if(!state.wx.ava[who]) state.wx.ava[who] = {};
    state.wx.ava[who][key] = iid;
    wxSave();
    if(cb) cb(true);
  }
  // 先建好预览地址：哪怕 IndexedDB 不可用，这一趟会话里也能立刻看到新头像
  try{ imgCache[iid] = URL.createObjectURL(file); }catch(e){}
  idbPut('images', {id:iid, name:file.name || '头像', blob:file, ts:Date.now(), avatar:1})
    .then(function(ok){ finish(); if(!ok) toast('头像已换，但没能存进本地库（刷新后可能回到默认）'); })
    .catch(function(){ finish(); });
}
function clearAvatar(who, key){
  ensureWx();
  if(state.wx.ava[who]) delete state.wx.ava[who][key];
  wxSave();
}
// 图片缓存：IndexedDB 里存的是文件，显示时转成临时地址
var imgCache = {}, albumCache = [];
function refreshAlbum(cb){
  idbAll('images').then(function(list){
    list.sort(function(a,b){ return (b.ts||0) - (a.ts||0); });
    list.forEach(function(it){
      if(!imgCache[it.id] && it.blob) imgCache[it.id] = URL.createObjectURL(it.blob);
      if(!imgCache[it.id] && it.url) imgCache[it.id] = it.url;   /* 用网址导入的图 */
    });
    // 以 __ 开头的是壁纸 / 背景图，不算相册里的照片
    albumCache = list.filter(function(it){ return String(it.id).indexOf('__') !== 0; });
    applyBgImages();
    if(cb) cb(albumCache);
  });
}
// 音频缓存
var audioCache = {}, songCache = [];
function refreshSongs(cb){
  idbAll('audios').then(function(list){
    songCache = list.sort(function(a,b){ return (b.ts||0) - (a.ts||0); });
    songCache.forEach(function(it){
      if(!audioCache[it.id] && it.blob) audioCache[it.id] = URL.createObjectURL(it.blob);
    });
    if(cb) cb(songCache);
  });
}
// 视频缓存（一起看里上传的视频文件存这里）
var videoCache = {};
function refreshVideos(cb){
  idbAll('videos').then(function(list){
    list.sort(function(a,b){ return (b.ts||0) - (a.ts||0); });
    list.forEach(function(it){ if(!videoCache[it.id] && it.blob) videoCache[it.id] = URL.createObjectURL(it.blob); });
    if(cb) cb(list);
  });
}
// 上传一个视频文件到 idb（返回 {id,name,blob}）
function uploadVideo(cb){
  pickFile('video/*', false, function(files){
    var f = files[0]; if(!f) return;
    var item = {id:uid(), name:f.name, blob:f, ts:Date.now()};
    idbPut('videos', item).then(function(ok){
      if(ok){ videoCache[item.id] = URL.createObjectURL(f); }
      if(cb) cb(ok ? item : null);
    });
  });
}

/* ---------- 美化用：背景图 / 图片导入（图片地址 或 直接上传） ---------- */
// 四个可以放图片的位置：桌面、锁屏、图标底板、聊天背景
var BG_SLOTS = [
  {k:'home', n:'桌面背景',    id:'__bg_home'},
  {k:'lock', n:'锁屏背景',    id:'__bg_lock'},
  {k:'icon', n:'图标底板图',  id:'__bg_icon'},
  {k:'chat', n:'聊天背景',    id:'__bg_chat'}
];
function ensureBgImages(){
  if(!state.bgImages) state.bgImages = {};
  if(typeof BG_SLOTS === 'undefined' || !BG_SLOTS) return;   // 页面刚加载、这一段还没读到时先跳过
  BG_SLOTS.forEach(function(s){ if(!state.bgImages[s.k]) state.bgImages[s.k] = {type:'', value:''}; });
}
// 聊天背景的样子：不打码高层 PT = 不透明度(%)，模糊(px)。按「这一张人设卡」分别存。
var DEFAULT_CHAT_BG_FX = {opacity:100, blur:0};
function chatBgFx(c){
  c = c || {};
  var bg = c.bg || {};
  return {
    opacity: (bg.opacity === undefined || bg.opacity === null || isNaN(Number(bg.opacity)))
               ? DEFAULT_CHAT_BG_FX.opacity : clampNum(Number(bg.opacity), 10, 100),
    blur: clampNum(Number(bg.blur) || 0, 0, 20)
  };
}
function clampNum(v, lo, hi){ v = Number(v); if(isNaN(v)) v = lo; return Math.max(lo, Math.min(hi, v)); }
// 把存好的背景图贴到界面上
// 聊天背景：优先用「这个对话框」的专属背景，没有就用「美化 → 主屏幕美化 → 聊天背景」里的全局那张
function applyChatBg(){
  try{
    ensureWx();
    var url = '';
    var c = state.wx.chatCfg[state.curPersona || '_'];
    if(c && c.bg && c.bg.value) url = (c.bg.type === 'url') ? c.bg.value : (imgCache[c.bg.value] || '');
    if(!url){
      try{ ensureBgImages(); }catch(e){}
      var g = state.bgImages && state.bgImages.chat;
      if(g && g.value) url = (g.type === 'url') ? g.value : (imgCache[g.value] || '');
    }
    var fx = chatBgFx(c);
    var rs = document.documentElement.style;
    rs.setProperty('--chat-bg', url ? 'url("' + url + '")' : '');
    rs.setProperty('--chat-bg-opacity', fx.opacity / 100);
    rs.setProperty('--chat-bg-blur', fx.blur + 'px');
  }catch(e){}
  try{ applyChatBubble(); }catch(e){}
}
/* 气泡外观：可以每个对话框各一套（聊天设置 → 外观与声音）。
   没单独调过就删掉内联变量，继续沿用「美化」里的全局那套。 */
var CHAT_BUBBLE_VARS = [
  ['me',    '--c-bubble-me'],
  ['him',   '--c-bubble-him'],
  ['meT',   '--c-bubble-me-text'],
  ['himT',  '--c-bubble-him-text'],
  ['radius','--r-bubble'],
  ['gap',   '--bubble-gap']
];
function applyChatBubble(){
  var el = $('wxPaneMsg');
  if(!el) return;
  ensureWx();
  var c = state.wx.chatCfg[state.curPersona || '_'] || {};
  var b = c.bubble || null;
  CHAT_BUBBLE_VARS.forEach(function(p){
    var v = b ? b[p[0]] : '';
    if(v === '' || v === undefined || v === null) el.style.removeProperty(p[1]);
    else el.style.setProperty(p[1], (p[0] === 'radius' || p[0] === 'gap') ? (v + 'px') : v);
  });
}
function applyBgImages(){
  ensureBgImages();
  if(typeof BG_SLOTS === 'undefined' || !BG_SLOTS) return;
  BG_SLOTS.forEach(function(s){
    var it = state.bgImages[s.k];
    var url = '';
    if(it && it.value) url = (it.type === 'url') ? it.value : (imgCache[it.value] || '');
    if(s.k === 'home'){
      var hb = $('homeBg'); if(!hb) return;
      // 有图就只动 background-image 这几个长写属性；没图才用 background 简写铺渐变。
      // 千万别在有图的时候用 background 简写，它会把刚设好的图重置掉。
      if(url){
        hb.style.backgroundImage = 'url("' + url + '")';
        hb.style.backgroundSize = 'cover';
        hb.style.backgroundPosition = 'center';
        hb.style.backgroundRepeat = 'no-repeat';
      } else {
        var grad = 'linear-gradient(170deg,var(--c-bg1),var(--c-bg3) 60%)';
        hb.style.backgroundImage = 'none';   // 先把旧图清掉，再用简写铺渐变
        hb.style.background = grad;
      }
    } else if(s.k === 'lock'){
      var lb = $('lockBg'); if(!lb) return;
      if(url){
        lb.style.backgroundImage = 'url("' + url + '")';
        lb.style.backgroundSize = 'cover';
        lb.style.backgroundPosition = 'center';
        lb.style.backgroundRepeat = 'no-repeat';
      } else {
        var lgrad = 'linear-gradient(170deg,' + moodColor(state.mood, 0) + ',' + moodColor(state.mood, 1) + ')';
        lb.style.backgroundImage = 'none';   // 同上
        lb.style.background = lgrad;
      }
    } else if(s.k === 'icon'){
      document.documentElement.style.setProperty('--icon-bg', url ? 'url(' + url + ')' : '');
    } else if(s.k === 'chat'){
      document.documentElement.style.setProperty('--chat-bg', url ? 'url(' + url + ')' : '');
    }
  });
}
// 导入图片：可以填图片地址，也可以直接从手机/电脑里选一张
function pickImageOrURL(slotKey, done){
  ensureBgImages();
  openModal('导入图片',
      '<div class="hint" style="margin-bottom:8px;">方式一：粘贴图片网址，填完点下面「用这个地址」</div>'
    + '<input type="text" id="imgUrl" placeholder="https://....jpg">'
    + '<div class="hint" style="margin:10px 0 8px;">方式二：从本机选一张图片——<b>选完会自动保存并应用</b>，不需要再点保存</div>'
    + '<div class="btn-row"><button class="btn small ghost" id="imgFile">选择图片</button>'
    + '<button class="btn small ghost" id="imgClear">清除图片</button></div>',
    [
      {text:'用这个地址', fn:function(box){
        var u = (box.querySelector('#imgUrl').value || '').trim();
        if(!u){ toast('地址是空的'); return; }
        state.bgImages[slotKey] = {type:'url', value:u};
        save('bgImages'); applyBgImages(); closeModal(); toast('已保存并应用');
        if(done) done();
      }},
      {text:'关闭', cls:'ghost'}
    ]);
  $('imgFile').onclick = function(){
    pickFile('image/*', false, function(files){
      var f = files[0]; if(!f) return;
      var slot = BG_SLOTS.filter(function(x){ return x.k === slotKey; })[0];
      idbPut('images', {id:slot.id, name:f.name, blob:f, ts:Date.now()}).then(function(){
        // 立刻把这张图塞进缓存并应用，不等 refreshAlbum 的异步回填，保证马上能看见
        try { imgCache[slot.id] = URL.createObjectURL(f); } catch(e){}
        state.bgImages[slotKey] = {type:'idb', value:slot.id};
        save('bgImages'); applyBgImages(); refreshAlbum();
        closeModal();                 // 上传成功即保存：关掉弹窗，给一个明确反馈
        toast('已保存，图片已应用');
        if(done) done();
      });
    });
  };
  $('imgClear').onclick = function(){
    state.bgImages[slotKey] = {type:'', value:''};
    save('bgImages'); applyBgImages(); closeModal(); toast('已清除');
    if(done) done();
  };
}
// 通用图片导入（回调式）：用于小组件背景图等，不直接写进 bgImages
// 通用图片导入（回调式）：用于小组件背景图等，不直接写进 bgImages。
// 关键：必须用一个「独立浮层」，绝不能复用 openModal —— 因为调用方（组件编辑弹窗）本身就在 #modalBox 里，
//      openModal 会把父弹窗的表单整个覆盖掉，选完图后再去更新父弹窗的控件就会找不到而报错（上传背景提示出错的根因）。
function pickImageGeneric(cb){
  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;'
    + 'background:rgba(30,45,65,.45);padding:16px;box-sizing:border-box;';
  ov.innerHTML = '<div style="width:88%;max-height:80%;overflow:auto;padding:18px;background:var(--c-bg3);'
    + 'border-radius:20px;box-shadow:0 12px 40px rgba(40,70,100,.3);">'
    + '<h3>导入图片</h3>'
    + '<div class="hint" style="margin-bottom:8px;">方式一：粘贴图片网址，填完点下面「用这个地址」</div>'
    + '<input type="text" id="imgUrl" placeholder="https://....jpg">'
    + '<div class="hint" style="margin:10px 0 8px;">方式二：从本机选一张图片</div>'
    + '<div class="btn-row"><button class="btn small ghost" id="imgFile">选择图片</button>'
    + '<button class="btn small ghost" id="imgClear">清除图片</button></div>'
    + '<div id="imgPreview" class="hint" style="margin-top:8px;">还没选本地图片</div>'
    + '<div class="btn-row" style="margin-top:14px;">'
    + '<button class="btn" id="imgSave" style="display:none;">保存</button>'
    + '<button class="btn ghost" id="imgUseUrl">用这个地址</button>'
    + '<button class="btn ghost" id="imgClose">关闭</button>'
    + '</div></div>';
  document.body.appendChild(ov);
  var pending = null;   // 待保存的本地图片结果 {type, value}
  function close(){ if(ov.parentNode) ov.parentNode.removeChild(ov); }
  function showPreview(txt){ var p = ov.querySelector('#imgPreview'); if(p) p.textContent = txt; }
  function showSave(){ var s = ov.querySelector('#imgSave'); if(s) s.style.display = ''; }
  // 方式一：网址 —— 立即交给调用方
  ov.querySelector('#imgUseUrl').onclick = function(){
    var u = (ov.querySelector('#imgUrl').value || '').trim();
    if(!u){ toast('地址是空的'); return; }
    cb({type:'url', value:u}); close(); toast('已保存');
  };
  // 方式二：本地图片 —— 选完先暂存，出现「保存」按钮，用户确认后才生效（解决没有保存按钮的问题）
  ov.querySelector('#imgFile').onclick = function(){
    pickFile('image/*', false, function(files){
      var f = files[0]; if(!f) return;
      var id = '__wbg_' + uid();
      function stage(){
        try{ imgCache[id] = URL.createObjectURL(f); }catch(e){}
        pending = {type:'idb', value:id};
        showPreview('已选好 1 张，点「保存」生效');
        showSave();
      }
      idbPut('images', {id:id, name:f.name, blob:f, ts:Date.now()}).then(function(){
        refreshAlbum(stage);
      }).catch(function(){ stage(); toast('图片没能存进本地库，但这一趟仍可用'); });
    });
  };
  // 清除：暂存一个空结果，确认保存后清掉背景
  ov.querySelector('#imgClear').onclick = function(){
    pending = {type:'', value:''};
    showPreview('将清除背景，点「保存」生效');
    showSave();
  };
  // 保存：把暂存的本地图片结果交给调用方（父弹窗表单完好，可正常更新）
  ov.querySelector('#imgSave').onclick = function(){
    cb(pending || {type:'', value:''});
    close(); toast(pending && pending.value ? '已保存，图片已应用' : '已清除');
  };
  ov.querySelector('#imgClose').onclick = close;
  ov.addEventListener('click', function(e){ if(e.target === this) close(); });
}
// 文字美化：可以导入字体文件（ttf / otf / woff / woff2）
function importFontFile(done){
  pickFile('.ttf,.otf,.woff,.woff2', false, function(files){
    var f = files[0]; if(!f) return;
    var name = 'UserFont' + Date.now().toString(36);
    try{
      var face = new FontFace(name, 'url(' + URL.createObjectURL(f) + ')');
      face.load().then(function(loaded){
        document.fonts.add(loaded);
        state.beauty['--font-family'] = '"' + name + '", sans-serif';
        state.fontFile = f.name;
        save('beauty'); save('fontFile');
        document.documentElement.style.setProperty('--font-family', '"' + name + '", sans-serif');
        toast('字体已应用：' + f.name);
        // 存一份，下次打开还在
        idbPut('files', {id:'__font', name:f.name, blob:f, ts:Date.now()});
        if(done) done();
      }).catch(function(e){ toast('这个字体读不了：' + (e.message || e)); });
    }catch(e){ toast('这个浏览器不支持导入字体'); }
  });
}
// 启动时把上次导入的字体重新加载出来
function loadFontFile(){
  if(!state.fontFile) return;
  idbAll('files').then(function(list){
    var f = list.filter(function(x){ return x.id === '__font'; })[0];
    if(!f || !f.blob) return;
    try{
      var name = 'UserFontSaved';
      var face = new FontFace(name, 'url(' + URL.createObjectURL(f.blob) + ')');
      face.load().then(function(loaded){
        document.fonts.add(loaded);
        document.documentElement.style.setProperty('--font-family', '"' + name + '", sans-serif');
      }).catch(function(){});
    }catch(e){}
  });
}
// 文字美化：导入一个文字方案文件（json / css / txt 都行）
function importTextStyleFile(done){
  pickFile('.json,.css,.txt', false, function(files){
    var f = files[0]; if(!f) return;
    var r = new FileReader();
    r.onload = function(){
      var txt = String(r.result || '');
      var n = 0;
      try{
        var o = JSON.parse(txt);
        for(var k in o){ if(k.indexOf('--') === 0){ state.beauty[k] = o[k]; n++; } }
      }catch(e){
        // 不是 json 就按一行一条来读：--fs:16 或 font-size:16px 这样的写法都可以
        txt.split(/[\r\n;]+/).forEach(function(line){
          var m = line.match(/(--[a-z-]+)\s*[:：]\s*([^;]+)/i);
          if(!m) return;
          var k = m[1], v = m[2].trim().replace(/;$/, '');
          state.beauty[k] = v; n++;
        });
      }
      if(!n){ toast('这个文件里没找到文字设置'); return; }
      save('beauty'); applyBeauty(); toast('应用了 ' + n + ' 项文字设置');
      if(done) done();
    };
    r.readAsText(f);
  });
}

/* ---------- 朋友圈 ----------
   这一屏已经并进微信的「好友圈」里了，桌面上的图标也收掉了。
   state.moments 里老的动态没有丢，会在微信 → 好友圈 里和新的动态排在一起显示。
--------------------------------------------------------------- */
// 在好友圈里发一条（发到老的「朋友圈」数据里，这样两边都能看到）
function postLegacyMoment(text, image){
  state.moments = state.moments || [];
  state.moments.unshift({id:uid(), text:text, image:image || '', likes:0, comments:[], ts:Date.now()});
  save('moments');
}

/* ---------- 相册 ---------- */
renderers.album = function(){
  refreshAlbum(function(list){
    $('albumEmpty').style.display = list.length ? 'none' : 'block';
    $('albumGrid').innerHTML = list.map(function(it){
      return '<img src="' + imgCache[it.id] + '" data-album="' + it.id + '" alt="">';
    }).join('');
    $$('[data-album]', $('albumGrid')).forEach(function(el){
      el.addEventListener('click', function(){
        var id = el.getAttribute('data-album');
        openModal('照片', '<img src="' + imgCache[id] + '" style="width:100%;border-radius:12px;">', [
          {text:'删除这张', cls:'danger', fn:function(){
            idbDel('images', id).then(function(){ delete imgCache[id]; refreshAlbum(); renderers.album(); toast('已删除'); });
          }},
          {text:'关闭', cls:'ghost'}
        ]);
      });
    });
  });
};
$('btnAddPhoto').addEventListener('click', function(){
  pickFile('image/*', true, function(files){
    if(!files.length) return;
    var n = 0;
    files.forEach(function(f){
      idbPut('images', {id:uid(), name:f.name, blob:f, ts:Date.now()}).then(function(ok){
        if(ok) n++;
        if(n === files.length){ toast('导入了 ' + n + ' 张'); refreshAlbum(); renderers.album(); }
      });
    });
  });
});

/* ---------- 微信：六个页面（main / msg / call / contact / circle / set） ----------
   底部功能条上的四个键直接切页：微信=main、联系人=contact、好友圈=circle、设置=set
   聊天(msg) 和通话(call) 不常驻，要从主界面或联系人里点进去
---------------------------------------------------------------------------------- */
var callTick = null, callSec = 0, callOn = false;
var wxPane = 'main';
var wxSetTab = 'identity';      // 设置页里当前看的是「身份 / 支付 / 表情包」，默认身份在最左
// 顶栏标题：每一页显示什么
var WX_TITLES = {main:'微信', contact:'联系人', circle:'好友圈', set:'设置'};
// 切换微信里的页面；顶栏上的按钮和内容都跟着变
function wxShowPane(p){
  wxPane = p;
  var isMain = (p === 'main'), isMsg = (p === 'msg'), isCall = (p === 'call');
  var isContact = (p === 'contact'), isCircle = (p === 'circle'), isSet = (p === 'set');
  var bar = (p === 'msg' || p === 'call') ? 'main' : p;   // 聊天/通话页的功能条还停在主界面
  ['main','msg','call','contact','circle','set'].forEach(function(k){
    var el = $('wxPane' + k.charAt(0).toUpperCase() + k.slice(1));
    if(el) el.classList.toggle('active', (k === p));
  });
  // 顶栏：主界面/联系人/好友圈/设置显示大标题；聊天页显示他的名字 + 在线状态 + 模式小字
  $('wxMainTitle').style.display = isMsg || isCall ? 'none' : '';
  $('wxMainTitle').textContent = WX_TITLES[p] || '微信';
  $('chatName').style.display = isMsg ? '' : 'none';
  $('chatMeta').style.display = isMsg ? '' : 'none';       // 微信号 + 备注
  $('chatSub').style.display = isMsg ? 'flex' : 'none';    // 在线状态 + 线上/线下那行小字
  $('btnChatSet').style.display = isMsg ? '' : 'none';     // 聊天设置只在聊天页右上角
  $('btnCallLang').style.display = isCall ? '' : 'none';
  if(isGroupPid()){
    // 群聊里没有「线下相处 / 批注」这回事，把模式小字和旁白按钮都收起来
    $('chatSub').style.display = 'none';
    var nb0 = $('btnNarrate'); if(nb0) nb0.style.display = 'none';
    var abs0 = $('btnAnnSet'); if(abs0) abs0.style.display = 'none';
    var cv0 = $('chatVoice'); if(cv0) cv0.style.display = '';   // 群里也允许发语音
  }
  // 聊天页中间上方那行小字：点一下在「线上聊天 / 线下相处 / 批注模式」之间循环切
  var ml = $('chatModeLine');
  if(ml && !isGroupPid()){
    var off = isOffline(), ann = isAnnotate();
    ml.textContent = ann ? '批注模式 · 切回线上' : (off ? '线下相处 · 切到批注' : '线上聊天 · 切到线下');
    ml.className = 'mode-line ' + ((off || ann) ? 'off' : '');
    // 线下模式才给「旁白」按钮；批注模式才给「批注设置」
    var nb = $('btnNarrate');
    if(nb) nb.style.display = (isMsg && off) ? '' : 'none';
    var abs = $('btnAnnSet');
    if(abs) abs.style.display = (isMsg && ann) ? '' : 'none';
  }
  // 底部功能条高亮
  $$('.wx-tab').forEach(function(t){
    t.classList.toggle('on', (t.getAttribute('data-wx') === bar));
  });
  try{
    if(isMain) renderWxMain();
    else if(isMsg){ clearUnread(curPid()); renderChat(); renderChatStatusLine(); }
    else if(isCall) renderCallPane();
    else if(isContact) renderWxContact();
    else if(isCircle){ wxMarkCircleSeen(); renderWxCircle(); }
    else if(isSet) renderWxSetting(wxSetTab);
  }catch(e){ console.warn(e); }
  renderWxDots();
  fillIcons();
}
// 点开好友圈 = 看过了，红点就该消失，好友圈的通知横幅也一并收掉
function wxMarkCircleSeen(){
  LS.set('wxCircleSeen', Date.now());
  try{ clearNotices('', 'circle'); renderWxDots(); }catch(e){}
}
renderers.call = function(){ ensureWx(); wxShowPane(wxPane || 'main'); };  // 记住上次看的是哪一页
renderers.chat = function(){ wxShowPane('msg'); };
// 返回：聊天 / 通话 / 联系人 / 好友圈 / 设置 都先回到微信主界面，已经在主界面才回桌面
$('wxBack').addEventListener('click', function(){
  if(wxPane === 'main'){ go('home'); }
  else { wxShowPane('main'); }
});
// 顶栏那行小字：点一下在「线上聊天 / 线下相处 / 批注模式」之间循环切
$('chatModeLine').addEventListener('click', function(){
  ensureWx();
  var cur = state.wx.mode || 'online';
  state.wx.mode = (cur === 'online') ? 'offline' : (cur === 'offline' ? 'annotate' : 'online');
  wxSave();
  toast('已切到' + modeName(state.wx.mode));
  // 切换时留一条痕迹，之后看记录不会搞混
  pushMessage('sys', '（切到' + modeName(state.wx.mode) + '）', 'text');
  wxShowPane('msg');
});
// 当前是不是线下模式
function isOffline(){
  ensureWx();
  return state.wx.mode === 'offline';
}
// 当前是不是批注模式（第三种模式：由用户书写，好友来批注）
function isAnnotate(){
  ensureWx();
  return state.wx.mode === 'annotate';
}
// 模式的中文名，界面上到处都要用
function modeName(m){ return m === 'annotate' ? '批注模式' : (m === 'offline' ? '线下相处' : '线上聊天'); }

/* ============================================================================
   批注模式（第三种模式）：由用户书写，写完后请已加好友在段落 / 句子后面
   以（……）的形式批注。批注的样式（颜色、字号、粗斜体、背景）可随时改，
   也能删掉重新生成；批注的长度、方向都由用户设定。
   数据挂在消息上：m.type='article'，m.annots = {"段索引":[批注, ...]}
   ========================================================================== */
var ANNOT_TYPES = [
  {k:'praise',   l:'赞美（夸这一段写得好）'},
  {k:'feeling',  l:'读后感受（看完心里在想什么）'},
  {k:'note',     l:'补充说明（补一点相关的信息）'},
  {k:'question', l:'提出疑问（好奇、想追问）'},
  {k:'relate',   l:'联想到的事（想到自己 / 你们之间）'}
];
var ANNOT_GRAN = {para:'按段落', sentence:'按句子'};
var DEFAULT_ANN_CFG   = {granularity:'para', minLen:10, maxLen:40, types:['praise','feeling','note']};
var DEFAULT_ANN_STYLE = {color:'#8a63d2', size:13, bold:false, italic:true, bg:'#8a63d2', bgAlpha:10, nameBold:true};
var ANN_LOCAL = {
  praise:  ['这段写得真好，我读了两遍','你这句说到我心里去了','看得出你很用心，我很喜欢这句','这句话比我想说的还准'],
  feeling: ['读完有点想你','读到这行，心里软了一下','我不知道怎么接，就是觉得很好','看完安静了一会儿'],
  note:    ['这里我记得，是那天的事','如果补一句当时的天气会更好','这句背后那件事我也记得','读到这里想起你说过的另一句'],
  question:['这里为什么会这么想？','后来呢，然后发生了什么？','这句话是在说那天吗？','还想听你多写一点'],
  relate:  ['像是把我们那天的路又走了一遍','这让我想起你也说过类似的话','我们好像都这样','这句让我想起你当时的表情']
};
function annTypeLabel(k){
  var t = ANNOT_TYPES.filter(function(x){ return x.k === k; })[0];
  return t ? String(t.l).split('（')[0] : '随感';
}
function ensureAnn(){
  if(!state.annotateCfg)   state.annotateCfg   = JSON.parse(JSON.stringify(DEFAULT_ANN_CFG));
  if(!state.annotateStyle) state.annotateStyle = JSON.parse(JSON.stringify(DEFAULT_ANN_STYLE));
}
function annCfg(){
  ensureAnn();
  var c = state.annotateCfg;
  if(!c.types || !c.types.length) c.types = DEFAULT_ANN_CFG.types.slice();
  return c;
}
function annDefStyle(){
  ensureAnn();
  var s = state.annotateStyle;
  if(!s.color) s.color = DEFAULT_ANN_STYLE.color;
  if(!s.size)  s.size  = DEFAULT_ANN_STYLE.size;
  // 底色必须是 #rrggbb，取色器才认得；老数据里存的 rgba 直接换回默认
  if(!/^#[0-9a-fA-F]{6}$/.test(String(s.bg || ''))) s.bg = DEFAULT_ANN_STYLE.bg;
  if(s.bgAlpha === undefined) s.bgAlpha = DEFAULT_ANN_STYLE.bgAlpha;
  if(s.nameBold === undefined) s.nameBold = DEFAULT_ANN_STYLE.nameBold;
  return s;
}
function cloneStyle(s){
  s = s || {};
  return {color:s.color || DEFAULT_ANN_STYLE.color, size:s.size || DEFAULT_ANN_STYLE.size,
          bold:!!s.bold, italic:!!s.italic,
          bg:(s.bg === undefined ? DEFAULT_ANN_STYLE.bg : s.bg),
          bgAlpha:(s.bgAlpha === undefined ? DEFAULT_ANN_STYLE.bgAlpha : s.bgAlpha),
          nameBold:(s.nameBold === undefined ? true : !!s.nameBold)};
}
// 单条批注的样式：自带就用自带的，没有就跟着全局默认
function annStyleOf(a){
  var d = annDefStyle();
  var s = (a && a.style) ? a.style : null;
  if(!s) return cloneStyle(d);
  return {color:s.color || d.color, size:s.size || d.size,
          bold:!!s.bold, italic:!!s.italic,
          bg:(s.bg === undefined ? d.bg : s.bg),
          bgAlpha:(s.bgAlpha === undefined ? d.bgAlpha : s.bgAlpha),
          nameBold:(s.nameBold === undefined ? d.nameBold : !!s.nameBold)};
}
function hexToRgba(hex, a){
  hex = String(hex || '').replace('#','');
  if(hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  if(hex.length !== 6) return '';
  var r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + (Math.max(0, Math.min(100, a)) / 100) + ')';
}
function annStyleCSS(s){
  var css = 'color:' + s.color + ';font-size:' + s.size + 'px;'
          + 'font-weight:' + (s.bold ? '600' : '400') + ';'
          + 'font-style:' + (s.italic ? 'italic' : 'normal') + ';';
  css += (s.bg && s.bgAlpha > 0) ? ('background:' + hexToRgba(s.bg, s.bgAlpha) + ';') : 'background:transparent;';
  return ' style="' + css + '"';
}
// 把一篇文稿切成「段」或「句」，批注就挂在这些片段后面
function splitSegments(text, gran){
  var t = String(text || '').replace(/\r/g, '');
  if(gran === 'sentence'){
    var brk = '。！？!?；;', out = [], buf = '';
    for(var i = 0; i < t.length; i++){
      var ch = t.charAt(i);
      if(ch === '\n'){ if(buf.trim()) out.push(buf.trim()); buf = ''; continue; }
      buf += ch;
      if(brk.indexOf(ch) >= 0 && (i === t.length - 1 || brk.indexOf(t.charAt(i+1)) < 0)){
        if(buf.trim()) out.push(buf.trim());
        buf = '';
      }
    }
    if(buf.trim()) out.push(buf.trim());
    return out.length ? out : (t.trim() ? [t.trim()] : []);
  }
  var ps = t.split('\n').map(function(s){ return s.trim(); }).filter(function(s){ return s.length; });
  return ps.length ? ps : (t.trim() ? [t.trim()] : []);
}
// 批注内容变了：把正在看的那一屏刷新一下（聊天页 / 文档页）
function annRefresh(){
  try{ if(typeof currentScreen !== 'undefined' && currentScreen === 'docwrite') renderDocBody(); }catch(e){}
  if(typeof inChat === 'function' && inChat()) renderChat();
}
// 按 id 找书架上的文档
function shelfDocById(id){
  if(!id) return null;
  return (state.shelf || []).filter(function(d){ return d.id === id; })[0] || null;
}
// 批注的数据容器有两种：聊天里的「文稿消息」，和书架上的「文档」。
// 统一用 id 找（两套 id 不重复），外面就不用关心它到底在哪儿。
function annObj(ref){
  if(!ref) return null;
  var m = byId(ref); if(m) return m;
  return shelfDocById(ref);
}
// 改完立刻存：在书架上的就存书架，在聊天里的就存聊天记录
function annSaveObj(o){
  if(!o) return;
  if((state.shelf || []).indexOf(o) >= 0) save('shelf');
  else { save('messages'); syncDocToMsg(o); }
}
// 书架文档改完，把聊天里那条预览也跟着改（只同步原文字，批注各自保管）
function syncDocToMsg(d){
  if(!d) return;
  (state.messages || []).forEach(function(m){
    if(m.docId === d.id && m.text !== d.text) m.text = String(d.text || '');
  });
}
function annSegsOf(m){ return splitSegments(m ? m.text : '', annCfg().granularity); }
function annListOf(m, i){
  var all = (m && m.annots) || {};
  return all[String(i)] || [];
}
function annSetList(m, i, arr){
  if(!m) return;
  if(!m.annots) m.annots = {};
  m.annots[String(i)] = arr;
}
// 可以用来批注的人：人设卡好友 + 关系网好友
function annFriendList(){
  var out = [];
  try{
    out = wxAllFriends().map(function(f){
      return {key:(f.kind === 'net' ? 'n:' : 'p:') + (f.kind === 'net' ? f.nid : f.pid),
              kind:f.kind, pid:f.pid || '', nid:f.nid || '', name:f.name || '他', sub:f.sub || ''};
    });
  }catch(e){ out = []; }
  return out;
}
function annFriendByKey(key){
  return annFriendList().filter(function(f){ return f.key === key; })[0] || null;
}
// 把这位联系人的人设压成一小段，喂给模型当「你是谁」
function annPersonaDesc(f){
  if(!f) return '';
  if(f.kind === 'persona'){
    var p = (state.personas || []).filter(function(x){ return x.id === f.pid; })[0];
    if(!p) return '';
    return ['名字：' + (p.name || ''),
            (p.gender || p.age) ? ('性别年龄：' + [p.gender, p.age].filter(Boolean).join(' · ')) : '',
            p.tone ? ('说话方式：' + p.tone) : '',
            p.catchphrase ? ('口头禅：' + p.catchphrase) : '',
            p.background ? ('经历：' + String(p.background).slice(0, 160)) : '',
            p.likes ? ('喜好：' + String(p.likes).slice(0, 160)) : '',
            p.taboo ? ('绝不说：' + p.taboo) : ''].filter(Boolean).join('\n');
  }
  var id = (curIdentity() || {}).id || '_';
  var n = ((state.wx && state.wx.net && state.wx.net[id]) || []).filter(function(x){ return x.id === f.nid; })[0];
  if(!n) return '';
  var from = (state.personas || []).filter(function(x){ return x.id === n.from; })[0];
  return ['名字：' + (n.name || ''),
          n.rel ? ('和「我」的关系：' + n.rel) : '',
          from ? ('来自「' + (from.name || '?') + '」的关系网') : ''].filter(Boolean).join('\n');
}
function annLocalLine(typeKey){
  var p = ANN_LOCAL[typeKey] || ANN_LOCAL.feeling;
  return pick(p);
}
// 生成一条批注：接了模型就让模型写，没接就用本地的话兜底
// ref 既可以是聊天里那条文稿消息的 id，也可以是书架上一篇文档的 id
function annGen(ref, segIndex, friend, typeKey, cb){
  var m = annObj(ref);
  if(!m){ cb(''); return; }
  var segs = annSegsOf(m), seg = segs[segIndex] || '';
  var cfg = annCfg();
  var mn = Math.max(2, Math.min(parseInt(cfg.minLen, 10) || 10, parseInt(cfg.maxLen, 10) || 40));
  var mx = Math.max(mn, parseInt(cfg.maxLen, 10) || 40);
  var tl = ANNOT_TYPES.filter(function(x){ return x.k === typeKey; })[0];
  if(!hasTextModel()){ setTimeout(function(){ cb(annLocalLine(typeKey)); }, 60); return; }
  var desc = annPersonaDesc(friend);
  var sys = '你现在是「' + (friend.name || '朋友') + '」，正在读「我」写的一段文字。\n'
    + (desc ? ('【你是谁】\n' + desc + '\n') : '')
    + '【任务】针对我指定给你的那一小段，写一条批注（页面上会显示成句子后面括号里的小字）。\n'
    + '【批注方向】' + (tl ? tl.l : '读到什么说什么') + '\n'
    + '【要求】\n'
    + '1. 用你自己的语气写，像真的在读一个你在意的人写的东西。\n'
    + '2. 字数控制在 ' + mn + ' 到 ' + mx + ' 字之间。\n'
    + '3. 要具体落到那句话本身，不要复述原文，不要客套空话。\n'
    + '4. 只输出批注本身这一句或这一小段，不要加引号、不要自带括号、不要解释。\n';
  var usr = '【整篇原文】\n' + String(m.text || '').slice(0, 1200) + '\n\n【我要你批注的是这一段】\n' + seg;
  askModel(sys, usr, function(r){
    var t = String(r || '').trim().replace(/^[（(]/, '').replace(/[）)]$/, '').trim();
    cb(t || annLocalLine(typeKey));
  }, 'wechat');
}
// 往某一段上加一条批注
function annAdd(ref, segIndex, friend, typeKey, text){
  var m = annObj(ref); if(!m) return null;
  var list = annListOf(m, segIndex).slice();
  var a = {id:uid(), key:friend.key, kind:friend.kind, pid:friend.pid || '', nid:friend.nid || '',
           name:friend.name || '他', type:typeKey, text:text, style:cloneStyle(annDefStyle()), ts:Date.now()};
  list.push(a);
  annSetList(m, segIndex, list);
  annSaveObj(m);
  return a;
}
// 批量生成（多个好友 × 多个段，每条随机挑一个方向）
function annBatch(ref, segIdxList, friends, types, done){
  var jobs = [];
  (segIdxList || []).forEach(function(si){
    (friends || []).forEach(function(f){ jobs.push({si:si, f:f}); });
  });
  var i = 0, made = 0;
  function next(){
    if(i >= jobs.length){ var o = annObj(ref); if(o) annSaveObj(o); annRefresh(); if(done) done(made); return; }
    var job = jobs[i++], tk = pick(types);
    annGen(ref, job.si, job.f, tk, function(t){
      var txt = String(t || '').trim();
      annAdd(ref, job.si, job.f, tk, txt || annLocalLine(tk));
      made++;
      annRefresh();   // 一条条冒出来，看得见进度
      setTimeout(next, 0);
    });
  }
  next();
}
// 一篇文稿渲染成「卡片 + 段落 + 括号批注」
// ref：聊天里那条文稿消息的 id，或书架上一篇文档的 id（也可以直接传对象）
function annDocHTML(ref, opt){
  opt = opt || {};
  var m = (ref && typeof ref === 'object') ? ref : annObj(ref);
  if(!m) return '';
  var cfg = annCfg(), segs = annSegsOf(m), total = 0;
  var isDoc = (state.shelf || []).indexOf(m) >= 0;
  // 标题：书架上的文档用它自己的标题；聊天里的文稿按时间来
  var head = isDoc
    ? ('<b>' + esc(m.title || '没有标题') + '</b><span class="ann-meta">' + esc(fmtFull(m.updated || m.ts)) + '</span>')
    : ('<b>我写的 · ' + esc(fmtFull(m.ts)) + '</b><span class="ann-meta">' + esc(ANNOT_GRAN[cfg.granularity] || '按段落') + '</span>');
  var html = '<div class="ann-doc' + (isDoc ? ' sh-docbox' : '') + '">'
    + '<div class="ann-hd">' + head + '</div>';
  if(!segs.length) html += '<div class="hint">（这篇还是空的，先写点什么吧）</div>';
  segs.forEach(function(seg, i){
    var list = annListOf(m, i);
    var key = m.id + '|' + i;
    html += '<div class="ann-seg' + (list.length ? ' has' : '') + '" data-annseg="' + key + '">' + esc(seg)
         + '<span class="ann-add" data-annadd="' + key + '">＋批注</span></div>';
    if(list.length){
      html += '<div class="ann-list">';
      list.forEach(function(a){
        total++;
        var st = annStyleOf(a);
        html += '<span class="ann-item" data-annitem="' + key + '|' + a.id + '"' + annStyleCSS(st) + '>'
          + '<span class="ann-name" style="font-weight:' + (st.nameBold ? '700' : '400') + ';">' + esc(a.name) + '：</span>'
          + '（' + esc(a.text) + '）'
          + '<span class="ann-type">' + esc(annTypeLabel(a.type)) + '</span>'
          + '</span>';
      });
      html += '</div>';
    }
  });
  html += '<div class="ann-tip">' + (total ? ('共 ' + total + ' 条批注 · ') : '')
       + '点段落上的「＋批注」请好友来读；点批注本身可以改文字 / 改样式 / 重新生成 / 删除。</div>';
  html += '</div>';
  return html;
}
// 选人 + 选方向 + 字数 → 生成批注
function openAnnotPicker(ref, segIndex, opts){
  opts = opts || {};
  var m = annObj(ref); if(!m) return;
  var segs = annSegsOf(m), seg = segs[segIndex] || '';
  var fs = annFriendList();
  if(!fs.length){ toast('还没有好友，先去「联系人」里加人'); return; }
  var cfg = annCfg();
  var fHtml = fs.map(function(f){
    return '<label class="row" style="font-size:13px;padding:5px 0;align-items:flex-start;">'
      + '<input type="checkbox" class="an-fri" value="' + esc(f.key) + '" style="width:auto;margin-top:3px;"> '
      + '<span>' + esc(f.name) + (f.sub ? '<span class="hint" style="margin-left:4px;">' + esc(f.sub) + '</span>' : '') + '</span></label>';
  }).join('');
  var tHtml = ANNOT_TYPES.map(function(t){
    return '<label class="row" style="font-size:13px;padding:4px 0;"><input type="checkbox" class="an-ty" value="' + t.k + '" style="width:auto;"'
      + (cfg.types.indexOf(t.k) >= 0 ? ' checked' : '') + '> ' + esc(t.l) + '</label>';
  }).join('');
  openModal(opts.all ? '请谁来读这一整篇' : '请谁来读这一段',
      '<label class="fld">' + (opts.all ? '整篇' : '这一段') + '</label>'
    + '<div class="hint" style="line-height:1.7;max-height:88px;overflow:auto;">'
    + esc((opts.all ? String(m.text || '') : seg).slice(0, 200)) + ((opts.all ? String(m.text || '') : seg).length > 200 ? '…' : '') + '</div>'
    + '<label class="fld" style="margin-top:10px;">请谁来读（可多选）</label>' + fHtml
    + '<label class="fld" style="margin-top:10px;">批注方向（可多选，每条随机挑一个）</label>' + tHtml
    + '<div class="row" style="gap:10px;margin-top:10px;">'
    + '<label class="fld" style="flex:1;">字数 从 <input type="number" id="anMin" value="' + (cfg.minLen || 10) + '" min="2" max="200"></label>'
    + '<label class="fld" style="flex:1;">到 <input type="number" id="anMax" value="' + (cfg.maxLen || 40) + '" min="2" max="300"></label></div>'
    + '<label class="fld" style="margin-top:8px;">范围</label>'
    + '<select id="anScope">'
    + '<option value="one"' + (opts.all ? '' : ' selected') + '>只批注这一段</option>'
    + '<option value="all"' + (opts.all ? ' selected' : '') + '>整篇每段都批注（最多 12 段）</option></select>'
    + (hasTextModel() ? '' : '<div class="hint" style="margin-top:8px;color:#b07a7a;">没接文字模型，会先用本地的话来批注。想让他们说自己的话，去「模型」里接一个。</div>'),
    [{text:'生成批注', fn:function(box){
        var keys = [], tys = [];
        $$('.an-fri', box).forEach(function(i){ if(i.checked) keys.push(i.value); });
        $$('.an-ty', box).forEach(function(i){ if(i.checked) tys.push(i.value); });
        if(!keys.length){ toast('至少选一个人'); return; }
        if(!tys.length){ toast('至少选一个批注方向'); return; }
        var mn = Math.max(2, parseInt(box.querySelector('#anMin').value, 10) || 10);
        var mx = Math.max(mn, parseInt(box.querySelector('#anMax').value, 10) || 40);
        cfg.minLen = mn; cfg.maxLen = mx; cfg.types = tys; save('annotateCfg');
        var scope = box.querySelector('#anScope').value;
        var targets = (scope === 'all')
          ? Object.keys(segs).map(Number).slice(0, 12)
          : [segIndex];
        var friends = keys.map(function(k){ return annFriendByKey(k); }).filter(Boolean);
        closeModal();
        toast('正在让 ' + friends.length + ' 位好友读…');
        annBatch(m.id, targets, friends, tys, function(made){
          toast('生成了 ' + made + ' 条批注');
        });
      }},
     {text:'取消', cls:'ghost'}]);
}
// 点某一条批注：改文字 / 改样式 / 重新生成 / 删除
function openAnnotItemMenu(ref, segIndex, aid){
  var m = annObj(ref); if(!m) return;
  var list = annListOf(m, segIndex);
  var a = list.filter(function(x){ return x.id === aid; })[0]; if(!a) return;
  openModal(a.name + ' 的批注',
      '<textarea id="anTxt" style="min-height:76px;">' + esc(a.text) + '</textarea>'
    + '<div class="hint" style="margin-top:6px;">' + esc(annTypeLabel(a.type)) + ' · ' + esc(fmtFull(a.ts)) + '</div>'
    + '<div class="hint" style="margin-top:4px;">括号是自动加的，这里只写括号里要说的话。</div>',
    [{text:'保存这版文字', fn:function(box){
        var v = (box.querySelector('#anTxt').value || '').trim();
        if(v) a.text = v;
        annSaveObj(m); closeModal(); annRefresh();
      }},
     {text:'换个样式', cls:'ghost', fn:function(){ closeModal(); setTimeout(function(){ openAnnotStyleBox(a, m, segIndex); }, 80); }},
     {text:'重新生成', cls:'ghost', fn:function(){
        closeModal();
        var f = annFriendByKey(a.key) || {key:a.key, kind:a.kind, pid:a.pid, nid:a.nid, name:a.name};
        toast('正在重新生成…');
        annGen(ref, segIndex, f, a.type, function(t){
          a.text = String(t || '').trim() || annLocalLine(a.type);
          a.ts = Date.now(); a.style = cloneStyle(annStyleOf(a));
          annSaveObj(m); annRefresh(); toast('已重新生成');
        });
      }},
     {text:'删掉这条', cls:'danger', fn:function(){
        annSetList(m, segIndex, list.filter(function(x){ return x.id !== aid; }));
        annSaveObj(m); closeModal(); annRefresh();
      }},
     {text:'取消', cls:'ghost'}]);
}
// 批注样式：颜色 / 字号 / 粗斜体 / 背景与不透明度
// a 为空 = 改全局默认；传了 a 就只改这一条（owner/segIndex 用来知道往哪儿存）
function openAnnotStyleBox(a, owner, segIndex){
  var st = a ? cloneStyle(annStyleOf(a)) : cloneStyle(annDefStyle());
  var html = ''
    + '<label class="fld">文字颜色</label><input type="color" id="anColor" value="' + esc(st.color) + '">'
    + '<label class="fld">字号 <span class="sliderv" id="anSizeV">' + st.size + '</span> px</label>'
    + '<input type="range" id="anSize" min="10" max="22" step="1" value="' + st.size + '">'
    + '<label class="row" style="font-size:13px;padding:3px 0;"><input type="checkbox" id="anBold" style="width:auto;"' + (st.bold ? ' checked' : '') + '> 加粗</label>'
    + '<label class="row" style="font-size:13px;padding:3px 0;"><input type="checkbox" id="anItalic" style="width:auto;"' + (st.italic ? ' checked' : '') + '> 斜体</label>'
    + '<label class="row" style="font-size:13px;padding:3px 0;"><input type="checkbox" id="anNameBold" style="width:auto;"' + (st.nameBold ? ' checked' : '') + '> 名字加粗</label>'
    + '<label class="fld" style="margin-top:8px;">底色</label><input type="color" id="anBg" value="' + esc(st.bg || DEFAULT_ANN_STYLE.bg) + '">'
    + '<label class="fld">底色不透明度 <span class="sliderv" id="anBgAV">' + st.bgAlpha + '</span>%</label>'
    + '<input type="range" id="anBgA" min="0" max="100" step="5" value="' + st.bgAlpha + '">'
    + '<div class="fld" style="margin-top:10px;">预览</div>'
    + '<div class="hint" style="line-height:1.8;">今天的天很好。<span class="ann-item" id="anPrev">'
    + '<span class="ann-name">名字：</span>（这是批注的样子，点下面保存）</span></div>';
  openModal(a ? ('「' + a.name + '」这条批注的样式') : '批注默认样式', html,
    [{text:'保存', fn:function(box){
        var s = readAnnStyle(box);
        if(a){ a.style = s; if(owner) annSaveObj(owner); }
        else { state.annotateStyle = s; }
        save('annotateStyle'); save('messages'); save('shelf'); closeModal();
        annRefresh();
        toast('样式已保存');
      }},
     {text:'应用到所有批注', cls:'ghost', fn:function(box){
        var s = readAnnStyle(box);
        // 连带把「默认样式」也一起改了，之后新生成的批注就是这个样子
        state.annotateStyle = cloneStyle(s);
        if(a){ a.style = cloneStyle(s); }
        // 聊天里的文稿 + 书架上的文档，两边的批注都换一遍
        [(state.messages || []), (state.shelf || [])].forEach(function(arr){
          arr.forEach(function(m){
            if(!m.annots) return;
            for(var k in m.annots){
              (m.annots[k] || []).forEach(function(x){ x.style = cloneStyle(s); });
            }
          });
        });
        save('annotateStyle'); save('messages'); save('shelf'); closeModal();
        annRefresh();
        toast('已应用到所有批注');
      }},
     {text:'取消', cls:'ghost'}]);
  var box = $('modalBox');
  function sync(){
    var s = readAnnStyle(box);
    var pv = $('anPrev');
    if(pv) pv.setAttribute('style', annStyleCSS(s).slice(8, -1));
    var nm = pv ? pv.querySelector('.ann-name') : null;
    if(nm) nm.setAttribute('style', 'font-weight:' + (s.nameBold ? '700' : '400') + ';');
    var sv = $('anSizeV'); if(sv) sv.textContent = s.size;
    var av = $('anBgAV'); if(av) av.textContent = s.bgAlpha;
  }
  ['anSize','anBgA','anColor','anBg','anBold','anItalic','anNameBold'].forEach(function(id){
    var el = box.querySelector('#' + id);
    if(el) el.addEventListener('input', sync);
  });
  sync();
}
function readAnnStyle(box){
  return {
    color:(box.querySelector('#anColor') || {}).value || DEFAULT_ANN_STYLE.color,
    size:parseInt((box.querySelector('#anSize') || {}).value, 10) || DEFAULT_ANN_STYLE.size,
    bold:!!(box.querySelector('#anBold') || {}).checked,
    italic:!!(box.querySelector('#anItalic') || {}).checked,
    bg:(box.querySelector('#anBg') || {}).value || DEFAULT_ANN_STYLE.bg,
    bgAlpha:parseInt((box.querySelector('#anBgA') || {}).value, 10) || 0,
    nameBold:!!(box.querySelector('#anNameBold') || {}).checked
  };
}
// 批注模式的总设置（聊天页工具条「批注设置」、聊天设置里都用它）
function openAnnotSettings(){
  ensureAnn();
  var cfg = annCfg();
  var html = ''
    + '<label class="fld">批注挂在什么后面</label>'
    + '<select id="anGran">'
    + '<option value="para"' + (cfg.granularity === 'sentence' ? '' : ' selected') + '>' + ANNOT_GRAN.para + '（一段一批注）</option>'
    + '<option value="sentence"' + (cfg.granularity === 'sentence' ? ' selected' : '') + '>' + ANNOT_GRAN.sentence + '（一句一批注）</option>'
    + '</select>'
    + '<div class="row" style="gap:10px;margin-top:10px;">'
    + '<label class="fld" style="flex:1;">字数 从 <input type="number" id="anMin" value="' + (cfg.minLen || 10) + '" min="2" max="200"></label>'
    + '<label class="fld" style="flex:1;">到 <input type="number" id="anMax" value="' + (cfg.maxLen || 40) + '" min="2" max="300"></label></div>'
    + '<label class="fld" style="margin-top:10px;">默认带上的批注方向</label>'
    + ANNOT_TYPES.map(function(t){
        return '<label class="row" style="font-size:13px;padding:4px 0;"><input type="checkbox" class="an-ty" value="' + t.k + '" style="width:auto;"'
          + (cfg.types.indexOf(t.k) >= 0 ? ' checked' : '') + '> ' + esc(t.l) + '</label>';
      }).join('')
    + '<div class="hint" style="margin-top:10px;line-height:1.8;">批注的颜色、字号、斜体、底色在「批注默认样式」里改，改完还能一键应用到所有批注上。</div>';
  openModal('批注模式设置', html,
    [{text:'保存', fn:function(box){
        cfg.granularity = box.querySelector('#anGran').value;
        var mn = Math.max(2, parseInt(box.querySelector('#anMin').value, 10) || 10);
        var mx = Math.max(mn, parseInt(box.querySelector('#anMax').value, 10) || 40);
        cfg.minLen = mn; cfg.maxLen = mx;
        cfg.types = [];
        $$('.an-ty', box).forEach(function(i){ if(i.checked) cfg.types.push(i.value); });
        if(!cfg.types.length) cfg.types = DEFAULT_ANN_CFG.types.slice();
        save('annotateCfg'); closeModal(); annRefresh();
        toast('已保存');
      }},
     {text:'批注默认样式', cls:'ghost', fn:function(){ closeModal(); setTimeout(function(){ openAnnotStyleBox(null); }, 80); }},
     {text:'取消', cls:'ghost'}]);
}
$('btnAnnSet').addEventListener('click', function(){ openAnnotSettings(); });

// 通话那一页的内容
function renderCallPane(){
  ensureWx();
  $('callName').textContent = state.persona.name || '他';
  $('callFace').textContent = (state.persona.name || '他').slice(0,1);
  $('callLangTip').textContent = '当前语言：' + state.settings.lang;
  renderCallLog();
  renderWxDots();
}

/* ---- 微信主界面：当前身份 + 会话列表 ---- */
function renderWxMain(){
  ensureWx(); ensureIdentities(); ensurePersonas();
  var me = curIdentity();
  var id = (me && me.id) || '_';
  // 上面一张：只交代「我现在用的是哪个身份」，聊天 / 通话都从下面的会话列表进，这里不再放重复的按钮
  var p = state.persona;
  var g0 = curGroup();
  $('wxMainMe').innerHTML =
      '<div class="wx-me">'
    + wxAvaHTML('me', me, 46)
    + '<div class="wx-me-i">'
    + '<div class="wx-me-n">' + esc(meName()) + '</div>'
    + '<div class="wx-me-s">' + esc([me && me.gender, me && me.age].filter(Boolean).join(' · ') || '我的身份') + '</div>'
    + '<div class="wx-me-s">'
    + (g0 ? ('正在的群聊：<b>' + esc(groupName(g0)) + '</b>')
          : ('正在和他聊天：<b>' + esc(wxShowName(p)) + '</b>'))
    + (state.wx.mode === 'offline' ? '（线下相处中）' : (state.wx.mode === 'annotate' ? '（批注模式中）' : ''))
    + '</div></div></div>';
  // 会话列表：一个好友一条 + 群聊一条，各自显示最后一条消息
  var fs = wxFriends();
  var box = $('wxConvList');
  var gList = (state.wx.groups || []);
  var gHtml = groupConvHTML();
  if(!fs.length && !gList.length){
    box.innerHTML = '<div class="empty">还没有会话。去「联系人」里加个好友吧。</div>';
    return;
  }
  // 有小标题时才出现标题；没有会话就把整块留空，不摆一个空标题占地方
  var html = (gList.length ? '<div class="wx-sec-t">群聊</div>' + gHtml : '')
    + (fs.length ? '<div class="wx-sec-t">会话</div>' : '');
  fs.forEach(function(f){
    var pp = state.personas.filter(function(x){ return x.id === f.pid; })[0] || {name:'（已删除的人设）'};
    var last = null;
    for(var i = state.messages.length - 1; i >= 0; i--){
      var m = state.messages[i];
      if(m.who === 'sys') continue;
      // 老消息没有记 pid，就当成是跟当前这张人设卡聊的
      if((m.pid || state.curPersona || '_') !== f.pid) continue;
      last = m; break;
    }
    var prev = last ? (m2prev(last)) : '还没有聊过';
    var isCur = state.curPersona === f.pid;
    var unread = (state.wx.unread || {})[f.pid] || 0;
    html += '<div class="conv" data-conv="' + f.pid + '">'
      + '<div style="position:relative;flex:0 0 auto;">' + wxAvaHTML('him', pp, 40)
      + (unread ? '<span class="cv-dot">' + (unread > 99 ? '99+' : unread) + '</span>' : '') + '</div>'
      + '<div class="cvt"><div class="row between"><span class="n">' + esc(wxShowName(pp)) + (isCur ? ' <span class="badge">当前</span>' : '') + '</span>'
      + '<span class="tm">' + (last ? fmtTime(last.ts) : '') + '</span></div>'
      + '<div class="p">' + esc(prev) + '</div></div>'
      + '<div class="cvcall" data-convcall="' + f.pid + '" title="打电话"><span data-ico="phone" data-size="18"></span></div></div>';
  });
  box.innerHTML = html;
  $$('[data-conv]', box).forEach(function(el){
    el.addEventListener('click', function(e){
      if(e.target.closest('[data-convcall]')) return;   // 点的是电话按钮，不当成进聊天
      switchConv(el.getAttribute('data-conv'));
    });
  });
  $$('[data-convcall]', box).forEach(function(el){
    el.addEventListener('click', function(e){
      e.stopPropagation();
      switchConv(el.getAttribute('data-convcall'));
      wxShowPane('call');
    });
  });
}
// 当前的会话 key：单人聊天是人设卡 id，群聊是 'g:<群id>'。所有按会话分的数据都用它。
function curPid(){ return state.curPid || state.curPersona || '_'; }
// 群聊会话的 key 长这样：g:xxxxx（前面加 g: 是为了和人设卡 id 区分开）
function isGroupPid(pid){
  pid = pid || curPid();
  return typeof pid === 'string' && pid.indexOf('g:') === 0;
}
function groupById(gid){
  ensureWx();
  if(!gid) return null;
  return (state.wx.groups || []).filter(function(g){ return g.id === gid; })[0] || null;
}
function curGroup(){ return isGroupPid() ? groupById(String(curPid()).slice(2)) : null; }
// 会话里「他/她」到底是谁：单人聊天就是当前人设卡，群聊则看这条消息是哪个成员发的
function speakerOf(m){
  ensurePersonas();
  var id = (m && m.from) || null;
  if(!id) return state.persona || {name:'他'};
  return state.personas.filter(function(x){ return x.id === id; })[0] || {name:'（已不存在的人）'};
}
// 会话列表里显示的消息预览
function m2prev(m){
  if(!m) return '';
  if(m.type === 'voice') return '[语音]';
  if(m.type === 'narration') return '[旁白] ' + (m.text || '');
  if(m.type === 'pic') return '[图片] ' + (m.cap || '');
  if(m.type === 'sticker') return '[表情包]';
  if(m.type === 'invite') return '[' + (m.invKind === 'video' ? '视频' : '语音') + '通话申请]';
  if(m.type === 'listen') return '[一起听] ' + (m.song || '');
  if(m.type === 'transfer') return '[转账 ¥' + (Number(m.amount) || 0).toFixed(2) + '] ' + (m.note || '');
  if(m.type === 'location') return '[位置] ' + (m.place || '');
  var who = (m.who === 'me')
    ? meName()
    : (isGroupPid(m.pid) ? (speakerOf(m).name || '某人') : (state.persona.name || '他'));
  return who + '：' + (m.text || '');
}

/* =====================================================================
   微信：联系人 / 好友圈 / 支付（虚拟货币）
   所有数据都按「当前身份」分开存：换一个身份，看到的就是另一份联系人和好友圈
   ===================================================================== */
// 底部面板：从屏幕下缘升起
function openSheet(title, html){
  $('sheetTitle').textContent = title;
  $('sheetBody').innerHTML = html;
  try{ fillIcons(); }catch(e){}
  $('sheet').classList.add('open');
}
function closeSheet(){ $('sheet').classList.remove('open'); }
$('sheetClose').addEventListener('click', closeSheet);

// 数据：friends[身份id] = [{pid:人设卡id, status:'pending'|'accepted', by:'me'|'him', ts}]
// mode: online=线上聊天 offline=线下相处
// ava: 头像图 {me:{身份id:图片id}, him:{人设id:图片id}}
// stickers: 表情包套组 [{id,name,items:[图片id],allow:{人设id:true}}]
// chatCfg: 每张人设卡的聊天设置 {speed, style, autoImage, proactive, call, useSticker}
function ensureWx(){
  if(!state.wx || !state.wx.friends) state.wx = {friends:{}, posts:[], mode:'online'};
  if(!state.wx.posts) state.wx.posts = [];
  if(!state.wx.mode) state.wx.mode = 'online';
  if(!state.wx.ava) state.wx.ava = {me:{}, him:{}};
  if(!state.wx.ava.me) state.wx.ava.me = {};
  if(!state.wx.ava.him) state.wx.ava.him = {};
  if(!state.wx.stickers) state.wx.stickers = [];
  if(!state.wx.chatCfg) state.wx.chatCfg = {};
  if(!state.wx.net) state.wx.net = {};          // 关系网同步过来的联系人
  if(!state.wx.unread) state.wx.unread = {};    // 每个好友（pid）的未读消息数
  if(!state.wx.groups) state.wx.groups = [];    // 群聊：成员是若干张人设卡（char / npc）
  delete state.wx.pay;                          // 零钱统一放到 state.wallet 里
  ensureWallet();
}
/* --------------------------------------------------------------------
   虚拟钱包：整台手机只有这一份余额
   微信「设置 → 支付」里的零钱、主界面「支付」、购物结算，读写的都是它
   -------------------------------------------------------------------- */
function ensureWallet(){
  if(!state.wallet || typeof state.wallet.balance !== 'number'){
    state.wallet = {balance:1000, bills:[], addresses:[], migrated:false};
  }
  if(!state.wallet.bills) state.wallet.bills = [];
  if(!state.wallet.addresses) state.wallet.addresses = [];
  // 老版本把零钱存在微信里，这里搬过来，只搬一次
  if(!state.wallet.migrated){
    try{
      var old = LS.get('wx', null);
      if(old && old.pay){
        if(typeof old.pay.balance === 'number') state.wallet.balance = old.pay.balance;
        if(old.pay.bills && old.pay.bills.length) state.wallet.bills = old.pay.bills;
      }
    }catch(e){}
    state.wallet.migrated = true;
    save('wallet');
  }
  if(!state.wallet.addresses.length){
    state.wallet.addresses.push({id:uid(), name:'我的家', detail:'虚拟路 1 号 · 3 单元 501', phone:'138****0000', def:true});
  }
}
// 记账：正数是收、负数是花
function walletBill(amount, note){
  ensureWallet();
  state.wallet.balance = (state.wallet.balance || 0) + amount;
  state.wallet.bills.unshift({id:uid(), identityId:(curIdentity() || {}).id || '_',
                              amount:amount, note:note, ts:Date.now()});
  if(state.wallet.bills.length > 300) state.wallet.bills.length = 300;
  save('wallet');
}
// 当前默认的收货地址
function defaultAddress(){
  ensureWallet();
  var list = state.wallet.addresses || [];
  return list.filter(function(a){ return a.def; })[0] || list[0] || null;
}
// 某一张人设卡的聊天设置（没设过就给一份默认值）
function chatCfg(pid){
  ensureWx();
  pid = pid || state.curPersona || '_';
  if(!state.wx.chatCfg[pid]){
    state.wx.chatCfg[pid] = {speed:'normal', style:'', autoImage:false, proactive:true, call:false, useSticker:false, showRead:true, showTime:false, timePos:'after', pokes:DEFAULT_POKES.slice(), chain:{on:true, prompt:DEFAULT_CHAIN_PROMPT}, autoSummary:false, summaryEvery:20, sumCount:0};
  }
  var c = state.wx.chatCfg[pid];
  if(c.proactive === undefined) c.proactive = true;
  if(c.autoImage === undefined) c.autoImage = false;
  if(c.call === undefined) c.call = false;
  if(c.useSticker === undefined) c.useSticker = false;
  if(c.showRead === undefined) c.showRead = true;
  if(c.showTime === undefined) c.showTime = false;
  if(c.timePos !== 'bubble' && c.timePos !== 'after') c.timePos = 'after';
  // --- 以下是按需求新增的聊天级设置（每一项都有默认值，老存档直接兼容） ---
  c.senseTime    = (c.senseTime !== false);          // 他能否感知现实时间
  c.senseWeather = (c.senseWeather !== false);       // 他能否感知现实天气
  c.firstSpeaker = (c.firstSpeaker === 'him') ? 'him' : 'me';   // 谁先开口：me=我，him=他先发一条
  c.idleOn  = !!c.idleOn;                            // 一段时间没聊 → 他主动发消息
  c.idleMin = Math.max(1, parseInt(c.idleMin, 10) || 5);
  // 允许他引用的表情包合集（null = 全部；数组 = 只允许这几套）
  if(c.stickerPacks !== null && !Array.isArray(c.stickerPacks)) c.stickerPacks = state.wx.stickers.map(function(s){ return s.id; });
  // 专属语音 / 语言（需要接入语音生成模型后才生效）
  if(typeof c.voice !== 'string') c.voice = '';
  if(typeof c.voiceLang !== 'string') c.voiceLang = '';
  // 这个对话框的专属聊天背景 {type:'url'|'idb', value:''}
  if(c.bg && typeof c.bg !== 'object') c.bg = null;
  if(!c.pokes || !c.pokes.length) c.pokes = DEFAULT_POKES.slice();
  // 模型思维链：{on:是否显示, prompt:思考步骤提示词}
  if(!c.chain || typeof c.chain !== 'object') c.chain = {on:true, prompt:DEFAULT_CHAIN_PROMPT};
  if(c.chain.on === undefined) c.chain.on = true;
  if(!c.chain.prompt) c.chain.prompt = DEFAULT_CHAIN_PROMPT;
  return c;
}
// 回复速度：慢的让他想久一点
var SPEED_MS = {fast:400, normal:1600, slow:4000, veryslow:9000};
var SPEED_NAME = {fast:'很快（几乎秒回）', normal:'适中', slow:'慢（会想一会儿）', veryslow:'很慢（很久才回）'};
var STYLE_PRESETS = ['（不指定，按人设卡来）','温柔体贴','冷淡克制','活泼跳脱','沉稳成熟','毒舌但关心','书面文艺','口语化、碎碎念','黏人撒娇'];
/* 每种文风配一小段「精简凝练」的提示词：
   在聊天设置里选了某文风，这段就会被拼进系统提示词一起送给模型，
   模型因此知道这句话该怎么「拿捏」（句式、篇幅、用词、标点习惯），而不是只看到四个字的名字。 */
var STYLE_PROMPTS = {
  '温柔体贴':'语气柔软，常先接住对方情绪再说话；多用短句和语气词（嗯、啦、呀），主动关心，句子不长，结尾常带一句安抚或询问。',
  '冷淡克制':'话很少、不解释；能一个字说完就不用三个字，情绪不外露，偶尔才漏出一点在意；少用感叹号，不用语气词。',
  '活泼跳脱':'话多、跳跃、爱用感叹号和省略号，会突然换个话题；常用拟声词和夸张说法，句子碎，节奏快，显得精力过剩。',
  '沉稳成熟':'表达清晰有分寸，句子完整偏长但不啰嗦；先给判断再给理由，情绪稳定，用词克制书面，少用网络语和语气词。',
  '毒舌但关心':'嘴上不饶人，先损一句再补一句关心；用调侃、反讽和反差表达在意，损要轻、要准，收尾留一点善意。',
  '书面文艺':'句式整饬、用词考究，善用比喻和留白；句子可稍长，节奏舒缓，偶有意象化描写，但不要堆砌辞藻。',
  '口语化、碎碎念':'想到哪说到哪，句子短且分段多，常用「就是」「然后」「其实」；会自我修正和重复，像当面嘀咕。',
  '黏人撒娇':'黏着对方、爱撒娇，常问「在干嘛」「理理我」；用叠词和语气词，会示弱也会耍赖，句尾常拖音（～、啊）。'
};
// 取某个文风名字对应的提示词（自定义文风就用用户自己写的那句）
function stylePromptOf(styleName, custom){
  custom = (custom || '').trim();
  if(custom) return custom;
  return STYLE_PROMPTS[styleName] || styleName || '';
}
// 头像：上传过图片就显示图片，否则用首字
function wxAvaHTML(who, obj, size){
  ensureWx();
  var key = (who === 'me') ? ((obj && obj.id) || '_') : ((obj && obj.id) || '_');
  var imgId = (state.wx.ava[who] || {})[key];
  var url = imgId ? (imgCache[imgId] || '') : '';
  var s = size || 40;
  if(url) return '<img class="ava-img" src="' + url + '" style="width:' + s + 'px;height:' + s + 'px;" alt="">';
  var nm = (obj && obj.name) || (who === 'me' ? '我' : '他');
  return '<div class="avatar" style="width:' + s + 'px;height:' + s + 'px;font-size:' + Math.round(s*0.42) + 'px;">' + esc(nm.slice(0,1)) + '</div>';
}
// 当前身份的好友（只要已通过的）
function wxFriends(){
  ensureWx(); ensureIdentities();
  var id = (curIdentity() || {}).id || '_';
  if(!state.wx.friends[id]) state.wx.friends[id] = [];
  return state.wx.friends[id].filter(function(f){ return f.status === 'accepted'; });
}
// 当前身份收到的好友申请（他主动加我）
function wxRequests(){
  ensureWx(); ensureIdentities();
  var id = (curIdentity() || {}).id || '_';
  if(!state.wx.friends[id]) state.wx.friends[id] = [];
  return state.wx.friends[id].filter(function(f){ return f.status === 'pending' && f.by === 'him'; });
}
function wxSave(){ save('wx'); }
// 某个身份和某张人设卡的关系（null=没关系）
function wxRelation(identityId, pid){
  ensureWx();
  var list = state.wx.friends[identityId] || [];
  var hit = list.filter(function(f){ return f.pid === pid; })[0];
  return hit || null;
}
// 我加他：发出申请，他会答应（顺便说一句话）
function wxAddFriend(pid){
  ensureWx(); ensureIdentities(); ensurePersonas();
  var id = (curIdentity() || {}).id || '_';
  if(!state.wx.friends[id]) state.wx.friends[id] = [];
  if(wxRelation(id, pid)){ toast('已经是好友或已经在等回复了'); return; }
  var p = state.personas.filter(function(x){ return x.id === pid; })[0] || {name:'他'};
  state.wx.friends[id].push({pid:pid, status:'pending', by:'me', ts:Date.now()});
  wxSave();
  toast('已发送好友申请');
  // 模拟他通过：一会儿就同意，并跟你说句话
  setTimeout(function(){
    var r = wxRelation(id, pid);
    if(r && r.status === 'pending'){ r.status = 'accepted'; r.ts = Date.now(); wxSave(); }
    var line = pick(['我通过了，很高兴认识你。','加上了。','嗯，以后常聊。','是你呀，我通过了。']);
    pushMessage('him', '（' + (p.name||'他') + '通过了好友申请）' + line, 'text');
    addNotice('msg', (p.name||'他') + ' 通过了你的好友申请');
    wxRefresh();
  }, 1500 + Math.random() * 2500);
}
// 他加我：生成一条待处理的申请
function wxHimAddMe(pid){
  ensureWx(); ensureIdentities(); ensurePersonas();
  var id = (curIdentity() || {}).id || '_';
  if(!state.wx.friends[id]) state.wx.friends[id] = [];
  if(wxRelation(id, pid)){ toast('已经有关系了'); return; }
  var p = state.personas.filter(function(x){ return x.id === pid; })[0] || {name:'他'};
  state.wx.friends[id].push({pid:pid, status:'pending', by:'him', ts:Date.now()});
  wxSave();
  pushMessage('him', '（' + (p.name||'他') + '请求加你为好友）', 'text');
  addNotice('msg', (p.name||'他') + ' 请求加你为好友');
  toast('他发来了好友申请，去「联系人」里处理');
}
// 处理申请：接受 / 拒绝
function wxHandleRequest(pid, accept){
  ensureWx(); ensureIdentities();
  var id = (curIdentity() || {}).id || '_';
  var r = wxRelation(id, pid);
  if(!r) return;
  if(accept){ r.status = 'accepted'; r.by = 'him'; r.ts = Date.now(); }
  else{ state.wx.friends[id] = (state.wx.friends[id] || []).filter(function(f){ return f.pid !== pid; }); }
  wxSave();
  var p = state.personas.filter(function(x){ return x.id === pid; })[0] || {name:'他'};
  toast(accept ? ('已添加 ' + (p.name||'他')) : '已拒绝');
  if(accept) pushMessage('him', '（你们已经是好友了）', 'text');
}
function wxDeleteFriend(pid){
  ensureWx(); ensureIdentities();
  var id = (curIdentity() || {}).id || '_';
  state.wx.friends[id] = (state.wx.friends[id] || []).filter(function(f){ return f.pid !== pid; });
  wxSave();
  toast('已删除好友');
}
// 给某个好友写/改备注（按「身份 + 人设卡」存）
function wxSetRemark(pid, text){
  ensureWx(); ensureIdentities();
  var id = (curIdentity() || {}).id || '_';
  if(!state.wx.friends[id]) state.wx.friends[id] = [];
  var f = state.wx.friends[id].filter(function(x){ return x.pid === pid; })[0];
  if(!f){ toast('还不是好友'); return; }
  f.remark = text;
  wxSave();
  toast(text ? '备注已保存' : '备注已清空');
}
// 读取某个好友的备注
function friendRemark(pid){
  ensureWx(); ensureIdentities();
  var id = (curIdentity() || {}).id || '_';
  var f = (state.wx.friends[id] || []).filter(function(x){ return x.pid === pid; })[0];
  return (f && f.remark) || '';
}
/* ---- 关系网好友也能写备注（同样按身份存，只有你能看到） ---- */
function wxSetNetRemark(nid, text){
  var n = wxNet().filter(function(x){ return x.id === nid; })[0];
  if(!n){ toast('找不到这个人'); return; }
  n.remark = text;
  wxSave();
  toast(text ? '备注已保存' : '备注已清空');
}
function netRemark(nid){
  var n = wxNet().filter(function(x){ return x.id === nid; })[0];
  return (n && n.remark) || '';
}
// 备注弹窗：人设卡好友和关系网好友共用这一个
function openRemarkModal(title, cur, onSave){
  openModal(title, '<div class="hint" style="margin-bottom:6px;">备注只有你能看到，只存在你当前这个身份下。留空就是清掉备注。</div>'
    + '<input type="text" id="wxRemark" value="' + esc(cur || '') + '" placeholder="比如：大学同学 / 周三一起吃饭的人">',
    [{text:'保存', fn:function(box){
      var t = (box.querySelector('#wxRemark').value || '').trim();
      onSave(t);
    }},{text:'清空备注', cls:'ghost', fn:function(){ onSave(''); }},{text:'取消', cls:'ghost'}]);
  setTimeout(function(){ var i = $('wxRemark'); if(i) i.focus(); }, 30);
}
// 未读：收到「他」的消息且此刻没在看这段会话时，红点 +1
function bumpUnread(pid){
  ensureWx();
  pid = pid || '_';
  // 群聊会话的 pid 是 'g:<群id>'：正看着这个群就不算未读
  var viewing = (currentScreen === 'call' && wxPane === 'msg' && curPid() === pid);
  if(viewing) return false;          // 正看着这段，不计入未读（也不弹通知）
  state.wx.unread[pid] = (state.wx.unread[pid] || 0) + 1;
  wxSave();
  return true;                       // 返回「确实产生了未读」，调用方据此弹通知
}
function clearUnread(pid){
  ensureWx();
  pid = pid || '_';
  if(state.wx.unread[pid]){ state.wx.unread[pid] = 0; wxSave(); }
  try{ clearNotices(pid, 'chat'); }catch(e){}   // 读过这一段了，通知条也收掉
}

/* ---------- 消息通知横幅 ----------
   他发来消息 / 好友圈有新动态时，从屏幕顶端滑下来一条 iOS 式通知：
   点一下就跳到对应的聊天 / 好友圈并把红点清掉；点 × 或几秒后自动收起。
   同一个来源只保留最新一条，阅读过后不再提示。 */
var noticeTimers = {};
function noticePersona(pid){
  ensurePersonas();
  // 群聊会话拿不到「一个人」，返回 null 由调用方按群的方式处理
  if(isGroupPid(pid)) return null;
  return state.personas.filter(function(x){ return x.id === pid; })[0] || null;
}
function notifyShow(kind, pid, title, text, avaHTML, opts){
  opts = opts || {};
  var box = $('notifyLayer'); if(!box) return;
  var key = kind + '|' + (pid || '_');
  // 同一来源只留最新一条
  $$('.notify-card', box).forEach(function(c){
    if(c.getAttribute('data-nkey') === key) dismissNotice(c, true);
  });
  var el = document.createElement('div');
  el.className = 'notify-card';
  el.setAttribute('data-nkey', key);
  el.innerHTML = '<span class="n-ava">' + (avaHTML || '') + '</span>'
    + '<span class="n-txt"><span class="n-t">' + esc(title || '新消息')
    + (kind === 'circle' ? '<em>好友圈</em>' : '') + '</span>'
    + '<span class="n-d">' + esc(text || '') + '</span></span>'
    + '<span class="n-x">×</span>';
  el.addEventListener('click', function(ev){
    ev.stopPropagation();
    var t = ev.target || null;
    if(t && t.classList && t.classList.contains('n-x')){ dismissNotice(el); return; }
    dismissNotice(el);
    goNotice(kind, pid, opts);
  });
  box.appendChild(el);
  requestAnimationFrame(function(){ el.classList.add('show'); });
  if(noticeTimers[key]) clearTimeout(noticeTimers[key]);
  noticeTimers[key] = setTimeout(function(){ dismissNotice(el); }, (opts.stay || 6000));
}
function dismissNotice(el, now){
  if(!el) return;
  var key = el.getAttribute('data-nkey');
  if(key && noticeTimers[key]){ clearTimeout(noticeTimers[key]); noticeTimers[key] = null; }
  el.classList.remove('show');
  setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); }, now ? 0 : 320);
}
// 读过之后把提示收掉：pid 为空 / kind 为空表示不限
function clearNotices(pid, kind){
  var box = $('notifyLayer'); if(!box) return;
  $$('.notify-card', box).forEach(function(c){
    var k = c.getAttribute('data-nkey') || '';
    var parts = k.split('|');
    if(kind && parts[0] !== kind) return;
    if(pid && parts[1] !== pid) return;
    dismissNotice(c);
  });
}
// 点通知后跳到该去的地方，并把未读 / 红点清干净
function goNotice(kind, pid, opts){
  try{
    if(kind === 'circle'){
      ensureWx();
      wxPane = 'circle'; LS.set('wxCircleSeen', Date.now());
      go('call'); clearUnread(pid); renderWxDots();
      return;
    }
    if(isGroupPid(pid) && pid !== curPid()) switchConv(pid);
    else if(pid && pid !== '_' && pid !== (state.curPersona || '_') && !isGroupPid(pid)) switchPersona(pid);
    wxPane = 'msg'; go('call');
    clearUnread(pid); renderWxDots();
  }catch(e){}
}
// 他发来一条消息：没在看这段会话就弹通知（只有在「孰优先其事了的各种 App 页面」都不打扰，只要不在该会话里就提示）
function notifyIncoming(m){
  var pid = (m && m.pid) || '_';
  var txt = (m && (m.text || '')) || '';
  if(m && m.type === 'pic')       txt = '[图片]' + (m.cap ? ' ' + m.cap : '');
  if(m && m.type === 'sticker')   txt = '[表情包]';
  if(m && m.type === 'voice')     txt = '[语音 ' + (m.dur || 3) + '″]';
  if(m && m.type === 'transfer')  txt = '[转账 ¥' + (Number(m.amount)||0).toFixed(2) + '] ' + (m.note || '');
  if(m && m.type === 'location')  txt = '[位置] ' + (m.place || '');
  if(m && m.type === 'invite')    txt = '[' + (m.invKind === 'video' ? '视频' : '语音') + '通话申请] ' + (m.note || '');
  if(m && m.type === 'listen')    txt = '[约你一起听] ' + (m.song || '');
  if(m && m.type === 'narration') txt = txt || '[旁白]';
  if(!txt) txt = '（发来一条消息）';
  // 群聊：标题是群名、头像是几个人拼起来的格子，正文前面标出是谁说的
  if(isGroupPid(pid)){
    var _g = groupById(String(pid).slice(2));
    var who = (m && m.who === 'me') ? meName() : (speakerOf(m).name || '群里有人');
    notifyShow('chat', pid, groupName(_g) + '（群聊）', who + '：' + txt, convAvaGrid(groupMembers(_g)));
    return;
  }
  var p = noticePersona(pid) || state.persona || {name:'他'};
  notifyShow('chat', pid, wxShowName(p), txt, wxAvaHTML('him', p, 34));
}
// 好友圈有新动态：没在看圈子就弹通知
function notifyMoments(post){
  ensurePersonas();
  var pid = (post && post.pid) || '_';
  var p = noticePersona(pid);
  var name = p ? wxShowName(p) : (post && post.name) || '好友';
  var ava = p ? wxAvaHTML('him', p, 34) : '';
  notifyShow('circle', pid, name, (post && post.text) || '发了一条新动态', ava);
}
/* ---- 他的微信名片：微信名称 + 微信号 ----
   微信名称：留空就用「他叫什么」那一栏。
   微信号：用户留空时，根据这张人设卡（名字 / 性别 / 年龄 / 说话方式 / 卡 id）
   算一个稳定的号出来——同一张卡每次算出来都一样，改名字才会变。 */
function hashStr(s){
  s = String(s || '');
  var h = 5381;
  for(var i = 0; i < s.length; i++){ h = ((h << 5) + h + s.charCodeAt(i)) & 0x7fffffff; }
  return h >>> 0;
}
// 把数字补成固定长度的 36 进制串
function b36(n, len){
  var s = (n >>> 0).toString(36);
  while(s.length < len) s = '0' + s;
  return s.slice(-len);
}
// 按人设卡自动生成微信号
function autoWxid(p){
  p = p || {};
  var nm = String(p.name || '他').trim() || '他';
  var lat = nm.replace(/[^A-Za-z0-9_]/g, '').toLowerCase();   // 名字里本来就有英文/数字就直接用
  var h1 = hashStr(nm + '|' + (p.gender || '') + '|' + (p.age || '') + '|' + (p.tone || ''));
  var h2 = hashStr((p.id || '') + '|' + nm + '|' + (p.first || ''));
  var head = lat ? lat.slice(0, 12) : ('u' + b36(h1, 6));
  return 'wxid_' + head + '_' + b36(h1 % 1296, 2) + ('000' + (h2 % 10000)).slice(-4);
}
// 这个人的微信号（自己填了用自己的，没填就用自动生成的）
function pWxid(p){
  p = p || state.persona || {};
  var v = String(p.wxid || '').trim();
  if(v) return v;
  return autoWxid(p);
}
// 他在微信里显示的名字（自己填了用自己的，没填就用「他叫什么」）
function pWxName(p){
  p = p || state.persona || {};
  var v = String(p.wxName || '').trim();
  if(v) return v;
  return String(p.name || '').trim() || state.settings.hisName || '他';
}
// 微信里显示的备注优先（好友备注 > 微信名称 > 人设卡名字）
function wxShowName(pp){
  var rm = friendRemark((pp && pp.id) || '_');
  if(rm) return rm;
  return pWxName(pp);
}

/* ---- 联系人 ---- */
/* --------------------------------------------------------------------
   关系网：人设卡里「关系网」那一栏写到的人，会自动出现在联系人里
   自动同步 = 每次打开联系人都重新读一遍所有关系网，新增的补进来、删掉的移走
   -------------------------------------------------------------------- */
// 关系称谓（遇到这些词就说明这只是关系说明，不是人名）
var REL_WORDS = ['妈妈','爸爸','母亲','父亲','妹妹','哥哥','姐姐','弟弟','家人','父母','老婆','老公','女友','男友',
                 '朋友','同事','同学','老师','上司','下属','搭档','室友','邻居','亲戚','闺蜜','兄弟','前任','医生'];
// 把关系网那段文字拆成一个个 {name, rel}
function parseSocial(text){
  var out = [];
  if(!text) return out;
  text.split(/[\n\r]+/).forEach(function(line){
    line.split(/[，,、;；]+/).forEach(function(seg){
      seg = seg.trim();
      if(!seg) return;
      var rel = '', body = seg;
      var m = seg.match(/[:：]/);
      if(m){ rel = seg.slice(0, seg.indexOf(m[0])).trim(); body = seg.slice(seg.indexOf(m[0]) + 1).trim(); }
      if(!body) body = seg;
      body = body.replace(/[（(][^)）]*[)）]/g, '').trim();   // 去掉括号里的说明
      if(!body) return;
      var nm = body.match(/[\u4e00-\u9fa5A-Za-z·]{1,8}/);
      if(!nm) return;
      var n = nm[0];
      // 写了「家人：妈妈」这种带冒号的，冒号后面那半截明确是人名，不能再按关系词滤掉
      // （妈妈 / 爸爸 / 闺蜜 这些既是称呼也是人名，只有在没写关系时才当关系词排除）
      if(!rel && REL_WORDS.some(function(w){ return n === w || n.indexOf(w) >= 0; })) return;
      if(out.some(function(x){ return x.name === n; })) return;
      out.push({name:n, rel:rel});
    });
  });
  return out.slice(0, 16);
}
// 当前身份的关系网联系人列表
function wxNet(){
  ensureWx(); ensureIdentities();
  var id = (curIdentity() || {}).id || '_';
  if(!state.wx.net) state.wx.net = {};
  if(!state.wx.net[id]) state.wx.net[id] = [];
  return state.wx.net[id];
}
function wxNetFriends(){ return wxNet().filter(function(x){ return x.status === 'accepted'; }); }
function wxNetRequests(){ return wxNet().filter(function(x){ return x.status === 'pending' && x.by === 'him'; }); }
function wxNetNew(){ return wxNet().filter(function(x){ return x.status !== 'accepted' && x.status !== 'pending'; }); }
// 同步：把所有关系网里写到的人都补进联系人；人设卡里删掉的也跟着移走
function syncNet(){
  ensureWx(); ensurePersonas(); ensureIdentities();
  var id = (curIdentity() || {}).id || '_';
  if(!state.wx.net) state.wx.net = {};
  if(!state.wx.net[id]) state.wx.net[id] = [];
  var list = state.wx.net[id];
  var seen = {};
  state.personas.forEach(function(pp){
    parseSocial(pp.social).forEach(function(o){
      var key = pp.id + '|' + o.name;
      seen[key] = true;
      if(!list.some(function(x){ return x.key === key; })){
        list.push({id:uid(), key:key, name:o.name, rel:o.rel || '', from:pp.id,
                   status:'none', by:'', ts:Date.now()});
      } else {
        var hit = list.filter(function(x){ return x.key === key; })[0];
        hit.rel = o.rel || hit.rel || '';
      }
    });
  });
  // 手动加的（比如从「查手机」里认识的人）要留着，不能因为关系网里没写就被清掉
  state.wx.net[id] = list.filter(function(x){ return seen[x.key] || x.manual; });
  wxSave();
}
// 加关系网里的人为好友（我主动加）：加完就能在微信里聊
function wxAddNet(nid){
  ensureWx(); ensureIdentities();
  var n = wxNet().filter(function(x){ return x.id === nid; })[0];
  if(!n) return;
  if(n.status === 'accepted' || n.status === 'pending'){ toast('已经加过了或者在等回复'); return; }
  toast('已发送好友申请');
  netAddFriend(n, '');
}
function wxDelNet(nid){
  ensureWx();
  var id = (curIdentity() || {}).id || '_';
  state.wx.net[id] = (state.wx.net[id] || []).filter(function(x){ return x.id !== nid; });
  wxSave(); toast('已删除');
}
// 统一的好友列表：人设卡好友 + 关系网好友（点赞、发动态、查手机都从这里取人）
function wxAllFriends(){
  ensureWx(); ensurePersonas(); ensureIdentities();
  var out = wxFriends().map(function(f){
    var pp = state.personas.filter(function(x){ return x.id === f.pid; })[0] || {};
    return {kind:'persona', pid:f.pid, nid:'', name:wxShowName(pp) || '（已删除的人设）',
            remark:friendRemark(f.pid),
            sub:[pp.gender, pp.age].filter(Boolean).join(' · ') || '（没填资料）'};
  });
  wxNetFriends().forEach(function(n){
    // 已经转成可聊天的联系人（有人设卡了）就不再重复列一遍
    if(n.pid && state.personas.some(function(x){ return x.id === n.pid; })) return;
    var from = state.personas.filter(function(x){ return x.id === n.from; })[0] || {};
    out.push({kind:'net', pid:'', nid:n.id, name:n.remark || n.name, remark:n.remark || '',
              sub:(n.rel ? n.rel + ' · ' : '') + '「' + (from.name || '?') + '」的关系网'});
  });
  return out;
}

/* ---- 联系人（底部功能条第二个键，直接切到这一页） ---- */
function renderWxContact(){
  syncNet();   // 进来先把人设卡「关系网」里的人同步过来
  ensureWx(); ensureIdentities(); ensurePersonas();
  var me = curIdentity();
  var id = (me && me.id) || '_';
  var html = '<div class="hint" style="margin-bottom:10px;line-height:1.8;">当前身份：<b>' + esc(meName()) + '</b>，换个身份就是另一份通讯录。'
    + '下面这些好友都能直接聊天、改备注或删除（删除只删联系人，人设卡和聊天记录都不动）。</div>';
  // 1）收到的好友申请
  var reqs = wxRequests().map(function(r){
      var pp = state.personas.filter(function(x){ return x.id === r.pid; })[0] || {};
      return {kind:'persona', pid:r.pid, name:pp.name || '（已删除的人设）'};
    }).concat(wxNetRequests().map(function(n){ return {kind:'net', nid:n.id, name:n.name}; }));
  if(reqs.length){
    html += '<div class="card glass"><h3>好友申请</h3>';
    reqs.forEach(function(r){
      html += '<div class="wx-row">' + wxAvaHTML('him', {id: r.kind === 'net' ? r.nid : r.pid, name: r.name}, 36)
        + '<div style="flex:1;"><div class="t">' + esc(r.name) + '</div><div class="m">请求加你为好友</div></div>'
        + (r.kind === 'net'
            ? '<button class="btn small" data-netacc="' + r.nid + '">接受</button><button class="btn small ghost" data-netrej="' + r.nid + '">拒绝</button>'
            : '<button class="btn small" data-wxacc="' + r.pid + '">接受</button><button class="btn small ghost" data-wxrej="' + r.pid + '">拒绝</button>')
        + '</div>';
    });
    html += '</div>';
  }
  // 2）已经是好友的（人设卡 + 关系网）
  var fs = wxFriends();
  var nfs = wxNetFriends().filter(function(n){ return !n.pid; });   // 已经能聊的走上面那一份，别重复
  html += '<div class="card glass"><h3>我的好友（' + (fs.length + nfs.length) + '）</h3>';
  if(!fs.length && !nfs.length) html += '<div class="empty">还没有好友，在下面加一个吧</div>';
  // 「微信名（备注名）」：只显示这两样，不再摆性别年龄
  function ctTitle(wxName, remark){
    wxName = String(wxName || '他').trim() || '他';
    remark = String(remark || '').trim();
    return esc(wxName) + (remark && remark !== wxName ? '<span class="ct-rmk">（' + esc(remark) + '）</span>' : '');
  }
  fs.forEach(function(f){
    var pp = state.personas.filter(function(x){ return x.id === f.pid; })[0] || {name:'（已删除的人设）'};
    var isCur = state.curPersona === f.pid;
    html += '<div class="ct-card">'
      + '<div class="ct-top">'
      + wxAvaHTML('him', pp, 44)
      + '<div class="ct-info"><div class="ct-name">' + ctTitle(pWxName(pp), friendRemark(f.pid))
      + (isCur ? ' <span class="badge">正在聊</span>' : '') + '</div>'
      + '<div class="ct-wxid">微信号：' + esc(pWxid(pp)) + '</div></div>'
      + '</div>'
      + '<div class="ct-acts">'
      + '<button class="btn small" data-wxchat="' + f.pid + '">聊天</button>'
      + '<button class="btn small ghost" data-wxremark="' + f.pid + '">备注</button>'
      + '<button class="btn small danger" data-wxdel="' + f.pid + '">删除</button>'
      + '</div></div>';
  });
  nfs.forEach(function(n){
    html += '<div class="ct-card">'
      + '<div class="ct-top">'
      + wxAvaHTML('him', {id:n.id, name:n.name}, 44)
      + '<div class="ct-info"><div class="ct-name">' + ctTitle(n.name, n.remark)
      + (n.rel ? ' <span class="badge">' + esc(n.rel) + '</span>' : '') + '</div>'
      + '<div class="ct-wxid">微信号：' + esc(autoWxid({id:n.id, name:n.name})) + '</div></div>'
      + '</div>'
      + '<div class="ct-acts">'
      + '<button class="btn small ghost" data-netremark="' + n.id + '">备注</button>'
      + '<button class="btn small danger" data-netdel="' + n.id + '">删除</button>'
      + '</div></div>';
  });
  html += '</div>';
  html += '<div class="card glass"><h3>群聊</h3>'
    + '<div class="hint" style="margin-bottom:8px;">把几个人拉到一个群里，他们会在群里互相接话。@ 谁的名字，就先让谁回答。</div>'
    + '<div style="max-height:220px;overflow-y:auto;">' + groupConvHTML() + '</div>'
    + '<div class="btn-row" style="margin-top:8px;"><button class="btn small" data-gnew="1">＋ 建个群</button></div>'
    + '</div>';
  // 3）人设卡里还没加的（npc 卡不算：它们走「来自关系网」，在下面那一栏）
  var others = state.personas.filter(function(pp){
    if(isNpcCard(pp)) return false;
    var r = wxRelation(id, pp.id);
    return !r || r.status !== 'accepted';
  });
  html += '<div class="card glass"><h3>可以加为好友</h3>';
  if(!others.length) html += '<div class="empty">人设卡里的人都加过了</div>';
  others.forEach(function(pp){
    // 和「我的好友」保持一致：只给名字 + 微信号，不摆性别年龄
    html += '<div class="wx-row">' + wxAvaHTML('him', pp, 36)
      + '<div style="flex:1;min-width:0;"><div class="t">' + esc(pWxName(pp)) + '</div>'
      + '<div class="ct-wxid">微信号：' + esc(pWxid(pp)) + '</div></div>'
      + '<button class="btn small" data-wxadd="' + pp.id + '">我加他</button>'
      + '<button class="btn small ghost" data-wxhimadd="' + pp.id + '">让他加我</button></div>';
  });
  html += '</div>';
  // 4）关系网里还没加的（人设卡里写了关系网就自动出现在这里）
  var news = wxNetNew();
  html += '<div class="card glass"><h3>来自关系网（' + news.length + '）</h3>'
    + '<div class="hint" style="margin-bottom:8px;">人设卡「关系网」里写到的人会自动同步到这里。改一改那张卡的关系网，这里跟着变。</div>';
  if(!news.length) html += '<div class="empty">还没有。去人设卡的「关系网」里写上几个人名试试</div>';
  news.forEach(function(n){
    var from = state.personas.filter(function(x){ return x.id === n.from; })[0] || {};
    html += '<div class="wx-row">' + wxAvaHTML('him', {id:n.id, name:n.name}, 36)
      + '<div style="flex:1;"><div class="t">' + esc(n.name) + (n.rel ? ' <span class="badge">' + esc(n.rel) + '</span>' : '') + '</div>'
      + '<div class="m">' + esc('「' + (from.name || '?') + '」的关系网') + '</div></div>'
      + (n.status === 'pending' ? '<span class="hint">等回复</span>'
         : '<button class="btn small" data-netadd="' + n.id + '">加为好友</button>') + '</div>';
  });
  html += '</div>';
  $('wxContactBody').innerHTML = html;
  bindWx($('wxContactBody'));
}

/* =====================================================================
   群聊：把几张人设卡（char / npc）拉到一个群里，几个人轮着说话
   · 数据存在 state.wx.groups：{id, name, members:[人设卡id], replyMode, turnIdx, ts}
   · 群聊会话的 pid 是 'g:<群id>'，和单人聊天的「人设卡id」区分开
   · 每条消息用 from 记下「这句话是谁说的」，界面上显示他的名字和头像
   ===================================================================== */
function groupsSave(){ ensureWx(); save('wx'); }
// 群里的成员到底有哪些人（人设卡被删了会自动掉出群）
function groupMembers(g){
  ensurePersonas();
  if(!g) return [];
  var ids = (g.members || []).filter(Boolean);
  return state.personas.filter(function(p){ return ids.indexOf(p.id) >= 0; });
}
// 群的显示名：没起名就用「张三、李四、王五」
function groupName(g){
  if(!g) return '群聊';
  if(g.name) return g.name;
  var ms = groupMembers(g).map(function(p){ return p.name || '某人'; });
  if(!ms.length) return '空群';
  return ms.slice(0, 3).join('、') + (ms.length > 3 ? ' 等' + ms.length + '人' : '');
}
// 群聊回复方式：轮流 / 随机 / 只有被 @ 到的那个人才回
var GROUP_MODES = [['round','轮流说话'],['random','随机接话'],['at','被 @ 才回']];
function groupMode(g){ return (g && g.replyMode) || 'random'; }
// 决定这一句该谁来说
function pickSpeaker(g, text){
  var ms = groupMembers(g);
  if(!ms.length) return null;
  var mode = groupMode(g);
  // 不管哪种模式，只要这句话里点名了某个人，就先让被叫到的那个回
  for(var i=0;i<ms.length;i++){
    var nm = ms[i].name || '';
    if(nm && text && (text.indexOf('@' + nm) >= 0 || text.indexOf(nm + '，') >= 0 || text.indexOf(nm + ',') >= 0)){
      return ms[i];
    }
  }
  if(mode === 'round'){
    // 轮流：按群成员顺序一个个来，一圈走完再从头
    var ids = (g.members || []).filter(function(id){ return ms.some(function(p){ return p.id === id; }); });
    var idx = (g.turnIdx || 0) % ids.length;
    g.turnIdx = (idx + 1) % ids.length;
    groupsSave();
    return ms.filter(function(p){ return p.id === ids[idx]; })[0] || ms[0];
  }
  // 随机：不连着让同一个人说两次以上（除非群里只有他一个）
  var lastSpeaker = g.lastSpeaker;
  var pool = ms.length > 1 ? ms.filter(function(p){ return p.id !== lastSpeaker; }) : ms;
  if(!pool.length) pool = ms;
  return pick(pool);
}
// 给群里的某个成员拼提示词：他自己的人设 + 群里还有谁 + 最近大家说了什么
function groupMemberPrompt(p, g){
  ensureIdentities();
  var L = [];
  var nm = p.name || '他';
  L.push('你现在扮演「' + nm + '」，你正在一个群聊里说话，群里除了你还有其他人。');
  var pf = [];
  if(p.gender)     pf.push('性别：' + p.gender);
  if(p.age)        pf.push('年龄：' + p.age);
  if(p.body)       pf.push('身材细节：' + p.body);
  if(p.outfit)     pf.push('穿衣风格：' + p.outfit);
  if(p.face)       pf.push('五官特征：' + p.face);
  if(p.likes)      pf.push('喜好：' + p.likes);
  if(p.background) pf.push('背景经历：' + p.background);
  if(p.social)     pf.push('关系网：' + p.social);
  if(pf.length)    L.push('【你自己是什么样的人】' + pf.join('；') + '。');
  L.push('你的性格和说话方式：' + (p.tone || '温柔、自然'));
  if(p.catchphrase) L.push('你的口头禅：' + p.catchphrase);
  if(p.taboo)      L.push('绝对不要说、不要做的事（雷区）：' + p.taboo);
  // 我（用户的身份卡）
  var me = curIdentity();
  if(me){
    var who = [];
    if(me.name) who.push('姓名：' + me.name);
    if(me.gender) who.push('性别：' + me.gender);
    if(me.age) who.push('年龄：' + me.age);
    if(me.personality) who.push('性格：' + me.personality);
    if(me.background) who.push('背景：' + me.background);
    if(me.relation) who.push('你们的关系：' + me.relation);
    if(who.length) L.push('【群里的这个真人】' + who.join('；') + '。');
  }
  // 群友：只给名字和一句性格，方便他知道跟谁说话
  var others = groupMembers(g).filter(function(x){ return x.id !== p.id; });
  if(others.length){
    L.push('【同一个群里还有】' + others.map(function(x){
      return (x.name || '某人') + (x.tone ? '（' + x.tone + '）' : '');
    }).join('、') + '。');
    L.push('他们也会在群里说话。你可以接话、反驳、附和，也可以只回那个真人 — 别替别人说话，只写你自己这句。');
  }
  // 记忆 / 世界书：用和他有关的那份
  var mem = state.memory.filter(function(m){ return !m.secret; }).slice(0, 20);
  if(mem.length){
    L.push('【要一直记着的事】');
    mem.forEach(function(m){ L.push('- ' + m.text); });
  }
  var myWorld = (state.world || []).filter(worldForCurrent);
  var wsel = myWorld.filter(function(w){ return w.always || w.personaId === p.id; }).slice(0, 12);
  if(wsel.length){
    L.push('【世界书设定】');
    wsel.forEach(function(w){ L.push('- ' + w.title + '：' + w.content); });
  }
  var t = timePeriod() + ' ' + fmtTime(Date.now());
  L.push('当前时间：' + t + '。当前心情：' + state.mood + '。');
  L.push('要求：像真人在群里冒泡，一次只说一两句，短一点自然一点，不要写长段、不要用列表、不要加表情符号堆砌。');
  L.push('只输出你要说的这句话本身，不要写你的名字，也不要写括号舞台提示。');
  return L.join('\n');
}
// 群里最近说了什么（带上每个人的名字，模型才知道谁说了啥）
function groupContext(pid){
  var n = state.settings.memRecent || 8;
  var arr = state.messages.filter(function(m){
    return (m.pid || '_') === pid && m.who !== 'sys' && !m.hidden && m.type !== 'article';
  }).slice(-n);
  return arr.map(function(m){
    var who = (m.who === 'me') ? meName() : (speakerOf(m).name || '某人');
    var body = m.text || (m.type === 'pic' ? '（发了一张图）' : (m.type === 'voice' ? '（一条语音）' : ''));
    return who + '：' + body;
  }).join('\n');
}
// 群聊回复：选一个人，让他单独调制一句
function groupReply(userText, cb){
  var g = curGroup();
  if(!g){ getReply(userText, function(r, e){ cb(r, '', e, null); }); return; }
  var ms = groupMembers(g);
  if(!ms.length){
    cb('（这个群里还没有人说话）', '', null, null);
    return;
  }
  var who = pickSpeaker(g, userText) || ms[0];
  g.lastSpeaker = who.id; groupsSave();
  var sys = groupMemberPrompt(who, g) + '\n【群聊「' + groupName(g) + '」最近的消息】\n' + groupContext(curPid());
  askModel(sys, userText, function(reply, err){
    cb(reply, '', err, who);
  });
}
// 切到某个会话：单人聊天切人设卡，群聊切群
function switchConv(pid){
  ensureWx();
  if(isGroupPid(pid)){
    var g = groupById(String(pid).slice(2));
    if(!g) return;
    state.curPid = pid;   // 保持 curPersona 不变（群里每条消息自带的 from 才是说话的人）
    LS.set('curPid', pid);
    try{ applyChatBg(); }catch(e){}
    pushMessage('sys', '进入群聊「' + groupName(g) + '」', 'text');
  } else {
    switchPersona(pid);
    state.curPid = pid;
    LS.set('curPid', pid);
  }
  wxRefresh();
  wxShowPane('msg');
  try{ clearUnread(pid); }catch(e){}
}
// 统一的「让他回一句话」入口：
// 群聊 → 挑一个成员说；单人 → 照原来的逻辑（线下模式还带思维链）
// 回调 cb(reply正文, 思维链, 错误信息, 说话的人)
function replyNow(text, cb){
  if(isGroupPid()){
    groupReply(text, function(r, think, err, who){
      // 回调里发的每条消息都算这个成员说的（下面 immediately 再清掉，避免串到别的会话）
      state.lastGroupSpeaker = (who && who.id) || null;
      try{ cb(r, '', err, who || null); }catch(e){ throw e; }
      finally{ state.lastGroupSpeaker = null; }
    });
  } else {
    offlineReply(text, function(r, think, err){ cb(r, think, err, null); });
  }
}
// 把「这句话是谁说的」塞进消息里（群聊用）
function withFrom(extra, from){
  extra = extra || {};
  if(from) extra.from = from;
  return extra;
}
// 建一个新群
function createGroup(name, memberIds){
  ensureWx();
  memberIds = (memberIds || []).filter(Boolean);
  if(memberIds.length < 2){ toast('至少要拉两个人进群'); return null; }
  var g = {id:uid(), name:(name || '').trim(), members:memberIds,
           replyMode:'random', turnIdx:0, ts:Date.now()};
  state.wx.groups.unshift(g);
  groupsSave();
  return g;
}
function openNewGroupModal(){
  ensurePersonas(); ensureWx();
  var fs = wxFriends();
  var can = fs.map(function(f){ return state.personas.filter(function(x){ return x.id === f.pid; })[0]; })
              .filter(function(p){ return p && p.id; });
  if(can.length < 2){ toast('至少要有两个好友才能建群'); return; }
  openModal('建一个群',
      '<label class="fld">群名（留空就用成员名字凑）</label><input type="text" id="gName" placeholder="周末小聚">'
    + '<label class="fld">拉谁进群（至少两个）</label>'
    + '<div style="max-height:200px;overflow-y:auto;">'
    + can.map(function(p){
        return '<label class="row" style="padding:6px 0;font-size:13px;">'
             + '<input type="checkbox" data-gm="' + esc(p.id) + '" style="width:auto;">'
             + '<span>' + esc(p.name || '他') + '</span></label>';
      }).join('') + '</div>'
    + '<label class="fld" style="margin-top:10px;">大家怎么接话</label><select id="gMode">'
    + GROUP_MODES.map(function(m){ return '<option value="' + m[0] + '">' + m[1] + '</option>'; }).join('')
    + '</select>',
    [{text:'建群', fn:function(b){
        var ids = $$('[data-gm]', b).filter(function(i){ return i.checked; }).map(function(i){ return i.getAttribute('data-gm'); });
        if(ids.length < 2){ toast('至少选两个人'); return; }
        var g = createGroup(b.querySelector('#gName').value, ids);
        if(!g) return;
        g.replyMode = b.querySelector('#gMode').value;
        groupsSave();
        closeModal();
        toast('群建好了：' + groupName(g));
        switchConv('g:' + g.id);
      }}, {text:'取消', cls:'ghost'}]);
}
// 群设置：改群名 / 加减成员 / 换接话方式
function openGroupSetting(gid){
  var g = groupById(gid); if(!g) return;
  ensurePersonas();
  var ms = groupMembers(g);
  var fs = wxFriends();
  var can = fs.map(function(f){ return state.personas.filter(function(x){ return x.id === f.pid; })[0]; })
              .filter(function(p){ return p && p.id; });
  openModal('群设置 · ' + groupName(g),
      '<label class="fld">群名</label><input type="text" id="gsName" value="' + esc(g.name || '') + '" placeholder="留空就用成员名字凑">'
    + '<label class="fld">大家怎么接话</label><select id="gsMode">'
    + GROUP_MODES.map(function(m){
        return '<option value="' + m[0] + '"' + (groupMode(g) === m[0] ? ' selected' : '') + '>' + m[1] + '</option>';
      }).join('') + '</select>'
    + '<label class="fld" style="margin-top:10px;">群成员（' + ms.length + '）</label>'
    + '<div style="max-height:170px;overflow-y:auto;">'
    + (ms.length ? ms.map(function(p){
        return '<div class="wx-row">' + wxAvaHTML('him', p, 30)
             + '<div style="flex:1;"><div class="t">' + esc(p.name || '他') + '</div></div>'
             + '<button class="btn small ghost" data-gkick="' + esc(p.id) + '">移出</button></div>';
      }).join('') : '<div class="empty">群里没人了</div>')
    + '</div>'
    + '<label class="fld" style="margin-top:10px;">把好友加进群</label>'
    + '<div style="max-height:150px;overflow-y:auto;">'
    + can.filter(function(p){ return (g.members||[]).indexOf(p.id) < 0; }).map(function(p){
        return '<div class="wx-row">' + wxAvaHTML('him', p, 30)
             + '<div style="flex:1;"><div class="t">' + esc(p.name || '他') + '</div></div>'
             + '<button class="btn small" data-gadd="' + esc(p.id) + '">加入</button></div>';
      }).join('') + '</div>',
    [{text:'保存', fn:function(b){
        g.name = (b.querySelector('#gsName').value || '').trim();
        g.replyMode = b.querySelector('#gsMode').value;
        groupsSave();
        closeModal();
        toast('已保存');
        if(isGroupPid()) renderChat();
        try{ renderWxMain(); }catch(e){}
      }},
     {text:'解散群', cls:'danger', fn:function(){
        state.wx.groups = (state.wx.groups || []).filter(function(x){ return x.id !== g.id; });
        groupsSave(); closeModal(); toast('群已解散');
        state.curPid = state.curPersona || '_';
        wxRefresh(); wxShowPane('main');
      }},
     {text:'取消', cls:'ghost'}]);
  var box = $('modalBox');
  $$('[data-gkick]', box).forEach(function(el){
    el.addEventListener('click', function(){
      var pid = el.getAttribute('data-gkick');
      g.members = (g.members || []).filter(function(x){ return x !== pid; });
      groupsSave(); closeModal(); openGroupSetting(gid);
      if(isGroupPid()) renderChat();
    });
  });
  $$('[data-gadd]', box).forEach(function(el){
    el.addEventListener('click', function(){
      var pid = el.getAttribute('data-gadd');
      if((g.members || []).indexOf(pid) < 0) g.members.push(pid);
      groupsSave(); closeModal(); openGroupSetting(gid);
      toast('已加进群');
    });
  });
}
// 会话列表里的「群聊」那一块
function groupConvHTML(){
  ensureWx();
  var gs = state.wx.groups || [];
  if(!gs.length){
    return '<div class="hint" style="margin:6px 0 10px;">还没有群聊 —— 到「联系人」里点「建个群」把几个人拉到一起。</div>';
  }
  return gs.map(function(g){
    var last = null;
    for(var i = state.messages.length - 1; i >= 0; i--){
      var m = state.messages[i];
      if(m.who === 'sys') continue;
      if((m.pid || '_') !== ('g:' + g.id)) continue;
      last = m; break;
    }
    var unread = (state.wx.unread || {})['g:' + g.id] || 0;
    var ms = groupMembers(g);
    return '<div class="conv" data-conv="g:' + g.id + '">'
      + '<div style="position:relative;flex:0 0 auto;">' + convAvaGrid(ms)
      + (unread ? '<span class="cv-dot">' + (unread > 99 ? '99+' : unread) + '</span>' : '') + '</div>'
      + '<div class="cvt"><div class="row between"><span class="n">' + esc(groupName(g))
      + '<span class="g-badge">群聊 ' + ms.length + '</span>' + (unread ? ' <span class="cv-unread">●</span>' : '') + '</span>'
      + '<span class="tm">' + (last ? fmtTime(last.ts) : '') + '</span></div>'
      + '<div class="p">' + esc(last ? m2prev(last) : '还没有人说话') + '</div></div></div>';
  }).join('');
}
// 群头像：最多四个成员的小格子拼起来（微信那种九宫格头像）
function convAvaGrid(ms){
  ensurePersonas();
  ms = (ms || []).slice(0, 4);
  if(!ms.length) return '<div class="conv-ava-grid"><span><span>群</span></span></div>';
  var cells = ms.map(function(p){
    return '<span>' + wxAvaHTML('him', p, 20) + '</span>';
  }).join('');
  return '<div class="conv-ava-grid">' + cells + '</div>';
}

/* ---- 好友圈：只属于某个身份，别的身份看不到，也不会互相串 ---- */
function wxPosts(){
  ensureWx(); ensureIdentities();
  var id = (curIdentity() || {}).id || '_';
  return state.wx.posts.filter(function(p){ return p.identityId === id; });
}
// 一条动态的作者是谁：空=我自己，pid=人设卡，nid=关系网里的人
function circleAuthor(p){
  ensurePersonas();
  if(p.nid){
    var n = wxNet().filter(function(x){ return x.id === p.nid; })[0];
    return (n && (n.remark || n.name)) || '（已删除）';
  }
  if(!p.pid) return meName();
  var pp = state.personas.filter(function(x){ return x.id === p.pid; })[0];
  return (pp && wxShowName(pp)) || '（已删除的人设）';
}
function renderWxCircle(){
  ensureWx(); ensureIdentities(); ensurePersonas();
  var id = (curIdentity() || {}).id || '_';
  var html = '<div class="hint" style="margin-bottom:10px;line-height:1.8;">这是 <b>' + esc(meName()) + '</b> 的好友圈。<br>'
    + '只有这个身份加的好友会出现在这里，别的身份的好友看不到，也不会互相点赞评论。</div>'
    + '<div class="btn-row" style="margin-bottom:10px;"><button class="btn small" id="wxPost">发一条</button>'
    + '<button class="btn small ghost" id="wxHePost">让好友发一条</button></div>';
  // 三处动态合成一条时间线：好友圈自己的 + 原来「朋友圈」里的 + 关系网好友的
  var list = wxPosts().slice();
  (state.moments || []).forEach(function(m){
    list.push({id:'m_' + m.id, legacy:true, identityId:id, pid:state.curPersona || '_', nid:'',
               text:m.text, image:m.image, likes:m.likes || 0, comments:m.comments || [], ts:m.ts});
  });
  if(!list.length) html += '<div class="empty">还没有动态</div>';
  list.sort(function(a, b){ return b.ts - a.ts; }).slice(0, 40).forEach(function(p){
    var author = circleAuthor(p);
    html += '<div class="wx-circle-post" data-post="' + p.id + '">'
      + '<div class="row" style="gap:8px;"><div class="avatar" style="width:32px;height:32px;font-size:13px;">' + esc(author.slice(0,1)) + '</div>'
      + '<div><b>' + esc(author) + '</b><div class="m">' + fmtFull(p.ts) + '</div></div></div>'
      + '<div class="t" style="margin-top:8px;">' + esc(p.text) + '</div>'
      + (p.image && imgCache[p.image] ? '<img src="' + imgCache[p.image] + '" style="width:100%;border-radius:10px;margin-top:8px;">' : '')
      + '<div class="row" style="margin-top:8px;gap:14px;">'
      + '<button class="like-btn" data-wxlike="' + p.id + '">' + lnIcon('heart', 14) + ' ' + (p.likes || 0) + '</button>'
      + '<button class="like-btn" data-wxcmt="' + p.id + '">' + lnIcon('chat', 14) + ' ' + ((p.comments || []).length) + '</button></div>';
    (p.comments || []).forEach(function(c){
      html += '<div class="m" style="margin-top:4px;">' + esc(c.who) + '：' + esc(c.text) + '</div>';
    });
    html += '</div>';
  });
  $('wxCircleBody').innerHTML = html;
  bindWx($('wxCircleBody'));
  $('wxPost').onclick = function(){
    openModal('发一条动态', '<textarea id="wxPT" placeholder="说点什么…"></textarea>'
      + '<div class="btn-row" style="margin-top:8px;"><button class="btn small ghost" id="wxPImg">配一张图</button></div>'
      + '<div class="hint" id="wxPImgName"></div>',
      [{text:'发布', fn:function(box){
        var t = (box.querySelector('#wxPT').value || '').trim();
        if(!t){ toast('写点什么'); return; }
        state.wx.posts.unshift({id:uid(), identityId:id, pid:'', nid:'', text:t,
          image: box.querySelector('#wxPImg').dataset.img || '', likes:0, comments:[], ts:Date.now()});
        wxSave(); wxRefresh(); toast('已发布');
        // 好友可能会来点赞或评论
        setTimeout(wxFriendReact, 4000 + Math.random() * 8000);
      }}]);
    $('wxPImg').onclick = function(){
      refreshAlbum(function(list){
        if(!list.length){ toast('相册还是空的'); return; }
        openModal('选一张图', '<select id="pis">' + list.map(function(i){ return '<option value="' + i.id + '">' + esc(i.name) + '</option>'; }).join('') + '</select>',
          [{text:'用这张', fn:function(b2){
            $('wxPImg').dataset.img = b2.querySelector('#pis').value;
            $('wxPImgName').textContent = '已选好图片';
          }}]);
      });
    };
  };
  $('wxHePost').onclick = function(){
    var all = wxAllFriends();
    if(!all.length){ toast('先加个好友'); return; }
    wxPersonaPost(pick(all));
    wxRefresh();
  };
}
// 某个好友发一条动态（内容按他的人设来）
function wxPersonaPost(f){
  ensureWx(); ensureIdentities();
  var id = (curIdentity() || {}).id || '_';
  var texts = ['今天有点想找人说话。','刚忙完，歇一会儿。','随手拍的，天气还不错。','想起之前那件事，有点感慨。','有空的话，一起待会儿吧。'];
  var text = pick(texts);
  function push(t){
    var post = {id:uid(), identityId:id, pid:(f.kind === 'persona' ? f.pid : ''),
      nid:(f.kind === 'net' ? f.nid : ''), text:t, likes:0, comments:[], ts:Date.now()};
    npcCrossReact(post);          // npc 和所属 char 会互相来赞 / 评论一句
    state.wx.posts.unshift(post);
    wxSave();
    addNotice('msg', (f.name || '他') + ' 发了一条好友圈');
    // 没在看好友圈就从顶部弹一条通知（进了圈子才算读过，红点和提示一起消）
    var inCircle = (currentScreen === 'call' && typeof wxPane !== 'undefined' && wxPane === 'circle');
    if(!inCircle) notifyMoments(post);
    wxRefresh();
  }
  if(state.api.mode === 'api' && state.api.url){
    askModel(buildSystemPrompt('') + '\n（你在发一条朋友圈 / 好友圈动态，一句话，简短自然）', '写一条动态：', function(r){ push(r || text); });
  } else { push(text); }
}
// npc 发的动态：让 TA 所属的那个主要联系人（char）来互动一下
// 这样好友圈里能看到「npc 发 → char 回」的来回，查手机里也能翻到这层关系
var NPC_REACTS = ['记得吃饭。','我看到了。','别太晚。','哈哈，你倒是挺闲。','下次一起。','嗯，知道了。','你也在啊。'];
function npcCrossReact(post){
  ensurePersonas();
  if(!post || !post.pid) return;
  var au = state.personas.filter(function(x){ return x.id === post.pid; })[0];
  if(!au) return;
  post.comments = post.comments || [];
  function reactBy(p){
    if(!p) return;
    if(Math.random() < 0.5){ post.likes = (post.likes || 0) + 1; }
    else { post.comments.push({who: pWxName(p) || p.name || '他', text: pick(NPC_REACTS), ts: Date.now() + 1000}); }
  }
  if(au.npc && au.npcOf){
    // npc 发的 → TA 所属的那个 char 一定会来搭一句
    reactBy(state.personas.filter(function(x){ return x.id === au.npcOf; })[0]);
  } else {
    // char 发的 → 让 TA 关系网里的 npc 偶尔冒个泡
    var ns = npcsOf(au.id);
    if(ns.length && Math.random() < 0.6) reactBy(pick(ns));
  }
}
// 好友给我的动态点赞 / 评论
function wxFriendReact(){
  ensureWx(); ensureIdentities(); ensurePersonas();
  var id = (curIdentity() || {}).id || '_';
  var mine = state.wx.posts.filter(function(p){ return p.identityId === id && !p.pid && !p.nid; });
  if(!mine.length) return;
  var post = mine[0];
  var all = wxAllFriends();
  if(!all.length) return;
  var f = pick(all);
  if(Math.random() < 0.6){
    post.likes = (post.likes || 0) + 1;
    post.comments = post.comments || [];
    addNotice('like', (f.name || '他') + ' 赞了你');
  } else {
    var cmts = ['这张好看。','我看到了。','哈哈。','挺有意思的。','下次一起？'];
    post.comments = post.comments || [];
    post.comments.push({who:f.name || '他', text:pick(cmts), ts:Date.now()});
    addNotice('msg', (f.name || '他') + ' 评论了你');
  }
  wxSave();
  wxRefresh();
}
/* =====================================================================
   微信「设置」：左边是支付（虚拟货币），右边是表情包
   ===================================================================== */
// 刷新微信当前这一页（原来靠「面板是不是开着」判断，现在统一走这里）
function wxRefresh(){
  try{
    if(wxPane === 'contact') renderWxContact();
    else if(wxPane === 'circle') renderWxCircle();
    else if(wxPane === 'set')    renderWxSetting(wxSetTab);
    else if(wxPane === 'main')   renderWxMain();
  }catch(e){ console.warn(e); }
}
// 设置页：底部功能条第四个键，直接切到这一页
function renderWxSetting(tab){
  ensureWx(); ensureIdentities(); ensurePersonas();
  tab = (tab === 'sticker') ? 'sticker' : (tab === 'identity' ? 'identity' : 'identity');
  wxSetTab = tab;
  var html = '<div class="btn-row" style="margin-bottom:12px;">'
    + '<button class="btn small ' + (tab === 'identity' ? '' : 'ghost') + '" id="wxTabId">身份</button>'
    + '<button class="btn small ' + (tab === 'pay' ? '' : 'ghost') + '" id="wxTabPay">支付</button>'
    + '<button class="btn small ' + (tab === 'sticker' ? '' : 'ghost') + '" id="wxTabStk">表情包</button></div>';
  html += (tab === 'pay') ? wxPayHTML() : (tab === 'identity' ? wxIdentityHTML() : wxStickerHTML());
  $('wxSetBody').innerHTML = html;
  $('wxTabId').onclick = function(){ renderWxSetting('identity'); };
  $('wxTabPay').onclick = function(){ renderWxSetting('pay'); };
  $('wxTabStk').onclick = function(){ renderWxSetting('sticker'); };
  if(tab === 'pay') bindWxPay();
  else if(tab === 'identity') bindWxIdentity();
  else bindWxSticker($('wxSetBody'));
  bindWx($('wxSetBody'));
}

/* ---- 设置 · 身份（在微信里代表「我」的那张身份卡） ---- */
function wxIdentityHTML(){
  ensureIdentities(); ensurePersonas();
  var me = curIdentity();
  var html = '<div class="card glass" style="text-align:center;">'
    + '<div class="hint">当前身份（在微信里代表「我」）</div>'
    + idAvatar(me, 56)
    + '<div style="font-size:17px;font-weight:600;margin-top:6px;">' + esc(me.name) + '</div>'
    + '<div class="hint">' + esc([me.gender, me.relation].filter(Boolean).join(' · ') || '（没填资料）') + '</div>'
    + '<div class="hint" style="margin-top:8px;line-height:1.7;">换个身份，这里看到的好友、好友圈都会跟着变——不同身份的好友互不串门。</div></div>';
  html += '<div class="card glass"><h3>切换身份</h3>';
  if(!state.identities.length) html += '<div class="empty">还没有身份</div>';
  state.identities.forEach(function(it){
    var on = it.id === state.curIdentity;
    var txt = (it.icon && it.icon.trim()) ? it.icon.trim().slice(0,2) : (it.name||'?').slice(0,1);
    html += '<div class="wx-row"><div class="avatar" style="width:36px;height:36px;font-size:14px;">' + esc(txt) + '</div>'
      + '<div style="flex:1;"><div class="t">' + esc(it.name) + (on ? ' <span class="badge">当前</span>' : '') + '</div>'
      + '<div class="m">' + esc([it.gender, it.relation].filter(Boolean).join(' · ') || '（没填资料）') + '</div></div>'
      + '<button class="btn small ' + (on ? 'ghost' : '') + '" data-iduse="' + it.id + '">' + (on ? '正在用' : '用这个') + '</button></div>';
  });
  html += '</div>';
  html += '<div class="btn-row"><button class="btn small ghost" id="wxGoCard">管理身份 / 新建</button></div>';
  return html;
}
function bindWxIdentity(){
  $$('[data-iduse]', $('wxSetBody')).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-iduse');
      if(id === state.curIdentity){ renderWxSetting('identity'); return; }
      switchIdentity(id);   // 切身份：联系人 / 好友圈都按身份重新来
      wxRefresh();          // 立即按新身份重渲染当前这一页
    });
  });
  var g = $('wxGoCard'); if(g) g.onclick = function(){ go('card'); };
}

/* ---- 设置 · 支付（虚拟货币） ---- */
function wxPayHTML(){
  ensureWallet();
  var pay = state.wallet;
  var me = meName();
  var html = '<div class="card glass" style="text-align:center;">'
    + '<div class="hint">' + esc(me) + ' 的零钱（虚拟货币，只在这台手机里记账）</div>'
    + '<div class="wx-money" style="margin:6px 0;">¥ ' + (pay.balance || 0) + '</div>'
    + '<div class="hint" style="margin-bottom:8px;">和主界面「支付」、购物结算用的是同一份余额。</div>'
    + '<div class="btn-row" style="justify-content:center;">'
    + '<button class="btn small" id="wxSend">转账</button>'
    + '<button class="btn small ghost" id="wxTopUp">充值 100</button>'
    + '<button class="btn small ghost" id="wxRedPack">收个红包</button></div></div>';
  html += '<div class="card glass"><h3>账单</h3>';
  var bills = (pay.bills || []).filter(function(b){ return b.identityId === ((curIdentity()||{}).id||'_'); });
  if(!bills.length) html += '<div class="empty">还没有账单</div>';
  bills.slice(0, 30).forEach(function(b){
    var out = b.amount < 0;
    html += '<div class="wx-row"><div style="flex:1;"><div class="t">' + esc(b.note || (out ? '转账' : '收入')) + '</div>'
      + '<div class="m">' + fmtFull(b.ts) + '</div></div>'
      + '<b style="color:' + (out ? '#b06a6a' : '#5d8f6a') + ';">' + (out ? '-' : '+') + '¥' + Math.abs(b.amount) + '</b></div>';
  });
  html += '</div>';
  return html;
}
function bindWxPay(){
  ensureWallet();
  var pay = state.wallet;
  $('wxTopUp').onclick = function(){
    walletBill(100, '充值');
    wxSetTab = 'pay'; wxRefresh(); toast('充值成功');
  };
  $('wxRedPack').onclick = function(){
    var amt = 1 + Math.floor(Math.random() * 20);
    var fs = wxFriends();
    var from = fs.length ? pick(fs) : null;
    var p = from ? (state.personas.filter(function(x){ return x.id === from.pid; })[0] || {name:'他'}) : {name:'他'};
    walletBill(amt, '来自' + (p.name || '他') + '的红包');
    wxSetTab = 'pay'; wxRefresh();
    toast((p.name||'他') + ' 发了一个红包');
    pushMessage('him', '给你发了个小红包，收着。', 'text');
  };
  $('wxSend').onclick = function(){
    var fs = wxFriends();
    if(!fs.length){ toast('先加个好友再转账'); return; }
    var opts = fs.map(function(f){
      var p = state.personas.filter(function(x){ return x.id === f.pid; })[0] || {name:'他'};
      return '<option value="' + f.pid + '">' + esc(p.name) + '</option>';
    }).join('');
    openModal('转账',
      '<label class="fld">转给谁</label><select id="tsWho">' + opts + '</select>'
      + '<label class="fld">金额</label><input type="number" id="tsAmt" value="10" min="1">'
      + '<label class="fld">说明</label><input type="text" id="tsNote" placeholder="可留空">',
      [{text:'转账', fn:function(box){
        var amt = parseInt(box.querySelector('#tsAmt').value, 10);
        if(!amt || amt <= 0){ toast('金额不对'); return; }
        if(amt > (pay.balance || 0)){ toast('零钱不够'); return; }
        var pid = box.querySelector('#tsWho').value;
        var p = state.personas.filter(function(x){ return x.id === pid; })[0] || {name:'他'};
        walletBill(-amt, '转给' + (p.name || '他') + '（' + (box.querySelector('#tsNote').value || '转账') + '）');
        wxSetTab = 'pay'; wxRefresh();
        pushMessage('him', '收到了，谢谢。', 'text');
        toast('已转给 ' + (p.name||'他'));
      }}, {text:'取消', cls:'ghost'}]);
  };
}

/* ---- 设置 · 表情包 ---- */
function wxStickerHTML(){
  ensureWx(); ensurePersonas();
  var html = '<div class="hint" style="margin-bottom:10px;line-height:1.8;">'
    + '上传图片做成表情包套组。每个套组<b>右下方</b>有一个「授权联系人使用」开关：<br>'
    + '打开并勾选了哪个联系人，他在聊天里才会用到这一套表情包。</div>'
    + '<div class="btn-row" style="margin-bottom:12px;"><button class="btn small" id="stkNew">＋ 新建套组</button></div>';
  if(!state.wx.stickers.length) html += '<div class="empty">还没有表情包套组，先建一个</div>';
  state.wx.stickers.forEach(function(pk){
    var items = pk.items || [];
    var allow = pk.allow || {};
    var names = state.personas.filter(function(p){ return allow[p.id]; }).map(function(p){ return p.name || '他'; });
    html += '<div class="stk-pack" data-pack="' + pk.id + '">'
      + '<div class="row between" style="gap:6px;align-items:flex-start;">'
      + '<div style="flex:1;min-width:0;"><b>' + esc(pk.name) + '</b>'
      + '<div class="hint">' + items.length + ' 张' + (names.length ? ' · 已授权：' + esc(names.join('、')) : ' · 还没授权给任何人') + '</div></div>'
      + '<button class="btn small ghost" data-stkadd="' + pk.id + '">加图</button>'
      + '<button class="btn small ghost" data-stkren="' + pk.id + '">改名</button>'
      + '<button class="btn small ghost" data-stkdel="' + pk.id + '">删</button></div>';
    if(items.length){
      html += '<div class="stk-grid">';
      items.forEach(function(im){
        var u = imgCache[im] || '';
        html += '<div class="si">' + (u ? '<img src="' + u + '" alt="">' : '') + '</div>';
      });
      html += '</div>';
    } else {
      html += '<div class="empty" style="margin-top:8px;">这套还是空的，点「加图」上传几张</div>';
    }
    // 右下角：是否授权联系人使用
    html += '<div class="stk-allow' + (names.length ? ' on' : '') + '" data-stkallow="' + pk.id + '">'
      + lnIcon('check', 13) + ' 授权联系人使用</div>';
    html += '</div>';
  });
  return html;
}
function bindWxSticker(body){
  body = body || $('wxSetBody');
  $('stkNew').onclick = function(){
    openModal('新建表情包套组', '<label class="fld">套组名字</label><input type="text" id="stkN" placeholder="比如：日常篇">',
      [{text:'建一个', fn:function(box){
        var n = (box.querySelector('#stkN').value || '').trim() || ('套组' + (state.wx.stickers.length + 1));
        state.wx.stickers.push({id:uid(), name:n, items:[], allow:{}});
        wxSave(); wxSetTab = 'sticker'; wxRefresh(); toast('已创建');
      }}, {text:'取消', cls:'ghost'}]);
  };
  $$('[data-stkren]', body).forEach(function(el){
    el.addEventListener('click', function(){
      var pk = wxPack(el.getAttribute('data-stkren')); if(!pk) return;
      openModal('改名字', '<input type="text" id="stkN" value="' + esc(pk.name) + '">',
        [{text:'保存', fn:function(box){
          pk.name = (box.querySelector('#stkN').value || '').trim() || pk.name;
          wxSave(); wxSetTab = 'sticker'; wxRefresh();
        }}, {text:'取消', cls:'ghost'}]);
    });
  });
  $$('[data-stkdel]', body).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-stkdel');
      state.wx.stickers = state.wx.stickers.filter(function(p){ return p.id !== id; });
      wxSave(); wxSetTab = 'sticker'; wxRefresh(); toast('已删除套组');
    });
  });
  $$('[data-stkadd]', body).forEach(function(el){
    el.addEventListener('click', function(){
      var pk = wxPack(el.getAttribute('data-stkadd')); if(!pk) return;
      // 加图：可以填网址，也可以从本机选（支持多选）
      openModal('往「' + esc(pk.name) + '」里加图',
          '<div class="hint" style="margin-bottom:8px;">方式一：粘贴图片网址</div>'
        + '<input type="text" id="stkUrl" placeholder="https://....png">'
        + '<div class="hint" style="margin:10px 0 8px;">方式二：从本机选（可以一次选多张）</div>'
        + '<div class="btn-row"><button class="btn small ghost" id="stkFile">选择图片</button></div>',
        [
          {text:'用这个地址', fn:function(box){
            var u = (box.querySelector('#stkUrl').value || '').trim();
            if(!u){ toast('地址是空的'); return; }
            var iid = '__stu_' + uid();
            idbPut('images', {id:iid, name:'表情包', url:u, ts:Date.now()}).then(function(){
              imgCache[iid] = u; pk.items = pk.items || []; pk.items.push(iid);
              wxSave(); wxSetTab = 'sticker'; wxRefresh(); toast('已加入');
            });
          }},
          {text:'关闭', cls:'ghost'}
        ]);
      $('stkFile').onclick = function(){
        pickFile('image/*', true, function(files){
          if(!files.length) return;
          var n = 0;
          files.forEach(function(f){
            var iid = '__st_' + uid();
            idbPut('images', {id:iid, name:f.name, blob:f, ts:Date.now()}).then(function(){
              n++;
              pk.items = pk.items || []; pk.items.push(iid);
              if(n === files.length){
                refreshAlbum(function(){ wxSave(); wxSetTab = 'sticker'; wxRefresh(); toast('加了 ' + n + ' 张'); });
              }
            });
          });
        });
      };
    });
  });
  // 右下角那个开关：选哪些联系人可以用这一套
  $$('[data-stkallow]', body).forEach(function(el){
    el.addEventListener('click', function(){
      var pk = wxPack(el.getAttribute('data-stkallow')); if(!pk) return;
      pk.allow = pk.allow || {};
      if(!state.personas.length){ toast('先去人设卡里建一个人'); return; }
      var html = '<div class="hint" style="margin-bottom:8px;">勾选可以用「' + esc(pk.name) + '」的联系人：</div>';
      state.personas.forEach(function(p){
        html += '<label class="row" style="padding:7px 0;font-size:13px;">'
          + '<input type="checkbox" data-pa="' + p.id + '" style="width:auto;"' + (pk.allow[p.id] ? ' checked' : '') + '>'
          + '<span>' + esc(p.name || '他') + '</span></label>';
      });
      openModal('授权给谁用', html, [
        {text:'保存', fn:function(box){
          $$('[data-pa]', box).forEach(function(cb){
            var k = cb.getAttribute('data-pa');
            if(cb.checked) pk.allow[k] = true; else delete pk.allow[k];
          });
          wxSave(); wxSetTab = 'sticker'; wxRefresh();
          toast(Object.keys(pk.allow).length ? '已授权' : '已取消授权');
        }},
        {text:'取消', cls:'ghost'}
      ]);
    });
  });
}
// 按 id 找到一个表情包套组
function wxPack(id){
  ensureWx();
  return state.wx.stickers.filter(function(p){ return p.id === id; })[0] || null;
}
// 他能用的表情包里随便挑一张：要同时过两道关——
//   ① 这套在「设置 → 表情包」里授权给了这张人设卡（pk.allow[pid]）
//   ② 这套在「聊天设置 → 主动」里也勾选给了他（c.stickerPacks，null = 不限）
// 没勾的合集一律不调用。
function pickSticker(pid){
  ensureWx();
  pid = pid || '_';
  var c = chatCfg(pid);
  var onlyPacks = (c && Array.isArray(c.stickerPacks)) ? c.stickerPacks : null;
  var pool = [];
  state.wx.stickers.forEach(function(pk){
    if(onlyPacks && onlyPacks.indexOf(pk.id) < 0) return;      // 聊天设置里没勾这套
    if(!(pk.allow && pk.allow[pid])) return;                   // 这套没授权给他
    if(pk.items && pk.items.length){
      pk.items.forEach(function(im){ pool.push(im); });
    }
  });
  if(!pool.length) return '';
  return pick(pool);
}
// 底部面板里所有按钮的统一绑定
function bindWx(body){
  body = body || $('wxSetBody');
  $$('[data-wxadd]', body).forEach(function(el){
    el.addEventListener('click', function(){ wxAddFriend(el.getAttribute('data-wxadd')); wxRefresh(); });
  });
  $$('[data-wxhimadd]', body).forEach(function(el){
    el.addEventListener('click', function(){ wxHimAddMe(el.getAttribute('data-wxhimadd')); wxRefresh(); });
  });
  $$('[data-wxacc]', body).forEach(function(el){
    el.addEventListener('click', function(){ wxHandleRequest(el.getAttribute('data-wxacc'), true); wxRefresh(); });
  });
  $$('[data-wxrej]', body).forEach(function(el){
    el.addEventListener('click', function(){ wxHandleRequest(el.getAttribute('data-wxrej'), false); wxRefresh(); });
  });
  // 联系人卡片上的「删除」：只是把人从通讯录里移走，人设卡和聊天记录一律不动 —— 先问一句再说
  $$('[data-wxdel]', body).forEach(function(el){
    el.addEventListener('click', function(){
      var pid = el.getAttribute('data-wxdel');
      var pp = state.personas.filter(function(x){ return x.id === pid; })[0] || {name:'他'};
      openModal('把「' + (pp.name || '他') + '」从通讯录里删掉？',
          '<div class="hint" style="line-height:1.8;">只删联系人，<b>不动他的人设卡</b>，聊天记录也都留着。<br>'
        + '以后想再聊，回「可以加为好友」里重新加一次就行。</div>',
        [{text:'删掉联系人', cls:'danger', fn:function(){ wxDeleteFriend(pid); wxRefresh(); }},
         {text:'取消', cls:'ghost'}]);
    });
  });
  $$('[data-wxremark]', body).forEach(function(el){
    el.addEventListener('click', function(){
      var pid = el.getAttribute('data-wxremark');
      var f = wxRelation((curIdentity() || {}).id || '_', pid);
      var cur = (f && f.remark) || '';
      var pp = state.personas.filter(function(x){ return x.id === pid; })[0] || {};
      openRemarkModal('给「' + (pp.name || '他') + '」写备注', cur, function(t){
        wxSetRemark(pid, t); wxRefresh();
        if(inChat()) renderChat();
      });
    });
  });
  // 关系网好友的备注
  $$('[data-netremark]', body).forEach(function(el){
    el.addEventListener('click', function(){
      var nid = el.getAttribute('data-netremark');
      var n = wxNet().filter(function(x){ return x.id === nid; })[0] || {};
      openRemarkModal('给「' + (n.name || '他') + '」写备注', n.remark || '', function(t){
        wxSetNetRemark(nid, t); wxRefresh();
      });
    });
  });
  $$('[data-wxchat]', body).forEach(function(el){
    el.addEventListener('click', function(){
      switchPersona(el.getAttribute('data-wxchat'));
      wxShowPane('msg');
    });
  });
  $$('[data-gnew]', body).forEach(function(el){
    el.addEventListener('click', function(){ openNewGroupModal(); });
  });
  // 关系网里的人：加好友 / 接受 / 拒绝 / 删除
  $$('[data-netadd]', body).forEach(function(el){
    el.addEventListener('click', function(){ wxAddNet(el.getAttribute('data-netadd')); wxRefresh(); });
  });
  $$('[data-netdel]', body).forEach(function(el){
    el.addEventListener('click', function(){ wxDelNet(el.getAttribute('data-netdel')); wxRefresh(); });
  });
  $$('[data-netacc]', body).forEach(function(el){
    el.addEventListener('click', function(){
      var n = wxNet().filter(function(x){ return x.id === el.getAttribute('data-netacc'); })[0];
      if(n){
        // 接受之后同样给他建一张能聊天的卡，并把人加进好友列表
        var pp = netPersonaFor(n);
        n.pid = pp.id; n.status = 'accepted'; n.by = 'him'; n.ts = Date.now();
        var meId = (curIdentity() || {}).id || '_';
        var fr = state.wx.friends[meId] = state.wx.friends[meId] || [];
        if(!fr.some(function(f){ return f.pid === pp.id; })) fr.push({pid:pp.id, status:'accepted', by:'him', ts:Date.now()});
        wxSave(); toast('已添加 ' + n.name);
      }
      wxRefresh();
    });
  });
  $$('[data-netrej]', body).forEach(function(el){
    el.addEventListener('click', function(){ wxDelNet(el.getAttribute('data-netrej')); wxRefresh(); });
  });
  $$('[data-wxlike]', body).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-wxlike');
      circleLike(id); wxRefresh();
    });
  });
  $$('[data-wxcmt]', body).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-wxcmt');
      openModal('写评论', '<input type="text" id="wcT" placeholder="说一句…">',
        [{text:'发送', fn:function(box){
          var t = (box.querySelector('#wcT').value || '').trim();
          if(!t) return;
          circleComment(id, meName(), t); wxRefresh();
        }}]);
    });
  });
}
// 给一条动态点赞（id 前面带 m_ 的是老版本「朋友圈」里的动态）
function circleLike(id){
  if(id.indexOf('m_') === 0){
    var rid = id.slice(2);
    (state.moments || []).forEach(function(p){ if(p.id === rid) p.likes = (p.likes || 0) + 1; });
    save('moments'); return;
  }
  state.wx.posts.forEach(function(p){ if(p.id === id) p.likes = (p.likes || 0) + 1; });
  wxSave();
}
// 给一条动态写评论
function circleComment(id, who, text){
  if(id.indexOf('m_') === 0){
    var rid = id.slice(2);
    (state.moments || []).forEach(function(p){
      if(p.id === rid){ p.comments = p.comments || []; p.comments.push({who:who, text:text, ts:Date.now()}); }
    });
    save('moments'); return;
  }
  state.wx.posts.forEach(function(p){
    if(p.id === id){ p.comments = p.comments || []; p.comments.push({who:who, text:text, ts:Date.now()}); }
  });
  wxSave();
}
// 底部四个入口：微信主界面 / 联系人 / 好友圈 / 设置，点一下直接切到那一页
$$('.wx-tab').forEach(function(el){
  el.addEventListener('click', function(){
    var k = el.getAttribute('data-wx');
    if(k === 'set') LS.set('wxPaySeen', Date.now());     // 看过账单就把小红点消掉
    wxShowPane(k || 'main');
  });
});

/* =====================================================================
   聊天设置：回复速度 / 文风 / 虚拟图片 / 主动消息 / 主动电话 / 表情包
   这些设置按人设卡分别存，换一张人设卡就是另一套
   ===================================================================== */
/* 聊天设置：按功能分成四页（基本 / 主动 / 外观与声音 / 高级）。
   切换标签即整页重绘，每页各自保存自己那几个字段，不再一页拉到底。 */
var CS_TABS = [['basic','基本'],['act','主动'],['look','外观与声音'],['adv','高级']];
var CS_BUBBLE_DIRTY = false;    // 「外观与声音」页里的气泡控件被改动过没有（没动过就别写入，保持跟着全局走）
// 气泡预览：把当前几个控件的值直接贴到聊天那一页上，拖滑条的时候马上能看到
function csBubbleLive(){
  var el = $('wxPaneMsg');
  if(!el) return;
  var rs = $('csBubRadius'), gs = $('csBubGap');
  var map = [['csBubMe','--c-bubble-me'], ['csBubHim','--c-bubble-him'],
             ['csBubMeT','--c-bubble-me-text'], ['csBubHimT','--c-bubble-him-text']];
  map.forEach(function(p){
    var i = $(p[0]); if(i) el.style.setProperty(p[1], i.value);
  });
  if(rs) el.style.setProperty('--r-bubble', clampNum(parseInt(rs.value, 10), 0, 26) + 'px');
  if(gs) el.style.setProperty('--bubble-gap', clampNum(parseInt(gs.value, 10), 2, 20) + 'px');
}
function csTab(){
  var t = openChatSetting.tab || 'basic';
  for(var i = 0; i < CS_TABS.length; i++){ if(CS_TABS[i][0] === t) return t; }
  return 'basic';
}
function csTabBar(tab){
  return '<div class="btn-row" style="margin-bottom:10px;flex-wrap:wrap;">' + CS_TABS.map(function(t){
    return '<button class="btn small ' + (t[0] === tab ? '' : 'ghost') + '" data-cstab="' + t[0] + '">' + t[1] + '</button>';
  }).join('') + '</div>';
}
function csHint(t){ return '<div class="hint" style="margin-top:4px;">' + t + '</div>'; }
function csSec(t){ return '<div style="margin-top:14px;border-top:1px solid var(--c-border);padding-top:12px;"><label class="fld">' + t + '</label>'; }
// 一行「说明 + 当前值 + 滑条」：拖的时候旁边的数字跟着变
function csSlider(id, label, val, min, max, step, unit){
  var v = (val === undefined || val === null || val === '') ? min : val;
  return '<div style="margin:10px 0 2px;"><div class="row between"><span style="font-size:13px;">' + label + '</span>'
    + '<span class="hint" id="' + id + 'V">' + esc(String(v)) + esc(unit || '') + '</span></div>'
    + '<input type="range" id="' + id + '" class="cs-sl" data-unit="' + esc(unit || '') + '" min="' + min + '" max="' + max + '" step="' + (step||1) + '" value="' + esc(String(v)) + '"></div>';
}
// 第 1 页「基本」：回复速度 / 谁先开口 / 文风
function csPageBasic(c, speedOpts, styleOpts){
  return '<label class="fld">回复速度</label><select id="csSpeed">' + speedOpts + '</select>'
    + csHint('选「慢」的话，他会先显示「正在输入…」想一会儿才回。')
    + '<label class="fld" style="margin-top:12px;">谁先开口</label>'
    + '<div class="row" style="gap:14px;font-size:13px;">'
    +   '<label class="row" style="gap:4px;"><input type="radio" name="csFirst" value="me"' + (c.firstSpeaker !== 'him' ? ' checked' : '') + '> 我先发</label>'
    +   '<label class="row" style="gap:4px;"><input type="radio" name="csFirst" value="him"' + (c.firstSpeaker === 'him' ? ' checked' : '') + '> 让他先发一条</label>'
    + '</div>'
    + csHint('选「让他先发」时，他会在你进入聊天的那一刻先说一句话（照样先读记忆 / 世界书 / 人设再开口）。')
    + '<label class="fld" style="margin-top:12px;">文风</label><select id="csStyleSel">' + styleOpts + '</select>'
    + '<input type="text" id="csStyle" style="margin-top:6px;" value="' + esc(c.style || '') + '" placeholder="也可以自己写：话很少，爱用省略号">'
    + csHint('写进去的内容会一起送给他，影响他说话的味道。每种预设都配了一小段精简提示词，会一起送给模型。')
    + '<div class="btn-row" style="gap:8px;margin-top:8px;"><button class="btn small ghost" id="csStylePreview">看看这段提示词</button></div>';
}
// 第 2 页「主动」：他会主动做的事 / 对现实的感知 / 冷落了他 / 允许哪些表情包
function csPageAct(c){
  var html = '<label class="fld">他会主动做的事</label>'
    + '<label class="row" style="padding:7px 0;font-size:13px;"><input type="checkbox" id="csImg" style="width:auto;"' + (c.autoImage ? ' checked' : '') + '> 同意自动生成虚拟图片</label>'
    + '<label class="row" style="padding:7px 0;font-size:13px;"><input type="checkbox" id="csPro" style="width:auto;"' + (c.proactive ? ' checked' : '') + '> 他会主动给你发消息</label>'
    + '<label class="row" style="padding:7px 0;font-size:13px;"><input type="checkbox" id="csCall" style="width:auto;"' + (c.call ? ' checked' : '') + '> 他会主动给你打电话</label>'
    + '<label class="row" style="padding:7px 0;font-size:13px;"><input type="checkbox" id="csStk" style="width:auto;"' + (c.useSticker ? ' checked' : '') + '> 他会引用你上传的表情包</label>'
    + csSec('他对现实的感知')
    + '<label class="row" style="padding:7px 0;font-size:13px;"><input type="checkbox" id="csSenseTime" style="width:auto;"' + (c.senseTime !== false ? ' checked' : '') + '> 能感知现实时间（几点、早中晚）</label>'
    + '<label class="row" style="padding:7px 0;font-size:13px;"><input type="checkbox" id="csSenseWeather" style="width:auto;"' + (c.senseWeather !== false ? ' checked' : '') + '> 能感知现实天气</label>'
    + csHint('关掉之后他不会再提「现在已经几点」「外面在下雨」这类信息。')
    + '</div>'
    + csSec('冷落了他，他会主动来找你')
    + '<label class="row" style="padding:7px 0;font-size:13px;"><input type="checkbox" id="csIdleOn" style="width:auto;"' + (c.idleOn ? ' checked' : '') + '> 一段时间没聊天后，他主动发一条</label>'
    + '<div class="row" style="padding:7px 0;font-size:13px;gap:10px;align-items:center;' + (c.idleOn ? '' : 'opacity:.45;') + '" id="csIdleWrap">'
    + '<span style="color:var(--c-sub);">超过</span>'
    + '<input type="number" id="csIdleMin" min="1" max="1440" value="' + (c.idleMin || 5) + '" style="width:70px;">'
    + '<span style="color:var(--c-sub);">分钟没有新对话，他就调一次模型自己开口</span></div></div>'
    + csSec('允许他使用哪几套表情包')
    + '<div class="hint" style="margin-bottom:6px;">勾选的合集他才会用，没勾的一律不调用（表情包在「设置 → 表情包」里上传）。</div>';
  var ps = state.wx.stickers || [];
  if(!ps.length){ html += '<div class="hint">还没有上传过表情包合集。</div>'; }
  else {
    var all = (c.stickerPacks === null);
    html += ps.map(function(s){
      var on = all || (Array.isArray(c.stickerPacks) && c.stickerPacks.indexOf(s.id) >= 0);
      return '<label class="row" style="padding:6px 0;font-size:13px;"><input type="checkbox" class="cs-pack" data-pack="' + esc(s.id) + '" style="width:auto;"' + (on ? ' checked' : '') + '> ' + esc(s.name || '（未命名）') + '（' + ((s.items||[]).length) + ' 张）</label>';
    }).join('');
  }
  html += '</div>';
  return html;
}
// 第 3 页「外观与声音」：显示与计时 / 聊天背景（透明度 + 模糊）/ 气泡外观 / 专属语音
// 气泡外观的取值：这个对话框单独调过就用调过的，没调过就用「美化」里的全局值（滑条上也显示成那个数）
function csBubbleVal(c, key, cssVar, def){
  var b = (c && c.bubble) || {};
  var v = (b[key] !== undefined && b[key] !== null && b[key] !== '') ? String(b[key]) : '';
  if(!v) v = String(hexOf(cssVar, def) || def).trim();
  return v.replace('px', '');
}
function csPageLook(c){
  var fx = chatBgFx(c);
  var bgOn = !!(c.bg && c.bg.value);
  var bgThumb = bgOn ? ((c.bg.type === 'url') ? c.bg.value : (imgCache[c.bg.value] || '')) : '';
  return '<label class="fld">显示与计时</label>'
    + '<label class="row" style="padding:7px 0;font-size:13px;"><input type="checkbox" id="csRead" style="width:auto;"' + (c.showRead ? ' checked' : '') + '> 显示「已读 / 未读」</label>'
    + '<label class="row" style="padding:7px 0;font-size:13px;"><input type="checkbox" id="csTime" style="width:auto;"' + (c.showTime ? ' checked' : '') + '> 显示消息发送时间</label>'
    + '<div class="row" style="padding:7px 0;font-size:13px;gap:14px;align-items:center;' + (c.showTime ? '' : 'opacity:.45;') + '" id="csTpWrap">'
    + '<span style="color:var(--c-sub);">时间戳位置</span>'
    + '<label class="row" style="gap:4px;font-size:13px;"><input type="radio" name="csTp" value="bubble"' + (c.timePos === 'bubble' ? ' checked' : '') + '> 气泡上</label>'
    + '<label class="row" style="gap:4px;font-size:13px;"><input type="radio" name="csTp" value="after"' + (c.timePos === 'after' ? ' checked' : '') + '> 气泡后</label>'
    + '</div>'
    /* ---- 聊天背景：这个对话框一张专属图，外加不透明度 / 模糊 ---- */
    + csSec('这个对话框的聊天背景')
    + '<div class="hint" style="margin-bottom:8px;">只对这一个人生效。没设就用「美化 → 主屏幕美化 → 聊天背景」里那张全局的。</div>'
    + '<div class="cs-bgrow">' + (bgThumb ? '<img class="bg-thumb" src="' + esc(bgThumb) + '" alt="">' : '<span class="cs-bgnone">还没设图</span>')
    + '<div class="hint" style="flex:1;">' + (bgOn ? '已设置专属背景 ✓' : '现在用的是全局那张（或纯色）') + '</div></div>'
    + '<div class="btn-row" style="gap:8px;">'
    + '<button class="btn small ghost" id="csBgPick">选本机图片</button>'
    + '<button class="btn small ghost" id="csBgClear">清除</button></div>'
    + '<input type="text" id="csBgUrl" style="margin-top:8px;" placeholder="也可以直接贴图片网址 https://....jpg" value="' + esc((c.bg && c.bg.type === 'url') ? (c.bg.value||'') : '') + '">'
    + csSlider('csBgOpacity', '背景不透明度', fx.opacity, 10, 100, 1, '%')
    + csSlider('csBgBlur', '背景模糊度', fx.blur, 0, 20, 1, 'px')
    + '<div class="hint" style="margin-top:2px;">往左调淡一点、糊一点，气泡上的字更清楚。改完点下面的「保存这一页」。</div>'
    + '</div>'
    /* ---- 气泡外观：颜色 / 圆角 / 间距都能直接填，或者直接写 CSS ---- */
    + csSec('气泡外观（只改这个对话框）')
    + '<div class="row between" style="margin:8px 0;"><span style="font-size:13px;">我的气泡</span>'
    + '<input type="color" id="csBubMe" class="cs-bub" value="' + esc(csBubbleVal(c, 'me', '--c-bubble-me', '#a8c7e6')) + '" style="width:60px;"></div>'
    + '<div class="row between" style="margin:8px 0;"><span style="font-size:13px;">我的文字</span>'
    + '<input type="color" id="csBubMeT" class="cs-bub" value="' + esc(csBubbleVal(c, 'meT', '--c-bubble-me-text', '#22333f')) + '" style="width:60px;"></div>'
    + '<div class="row between" style="margin:8px 0;"><span style="font-size:13px;">他的气泡</span>'
    + '<input type="color" id="csBubHim" class="cs-bub" value="' + esc(csBubbleVal(c, 'him', '--c-bubble-him', '#e9eff6')) + '" style="width:60px;"></div>'
    + '<div class="row between" style="margin:8px 0;"><span style="font-size:13px;">他的文字</span>'
    + '<input type="color" id="csBubHimT" class="cs-bub" value="' + esc(csBubbleVal(c, 'himT', '--c-bubble-him-text', '#33424f')) + '" style="width:60px;"></div>'
    + csSlider('csBubRadius', '气泡圆角', csBubbleVal(c, 'radius', '--r-bubble', '16'), 0, 26, 1, 'px')
    + csSlider('csBubGap', '气泡间距', csBubbleVal(c, 'gap', '--bubble-gap', '8'), 2, 20, 1, 'px')
    + '<div class="btn-row" style="gap:8px;margin-top:8px;">'
    + '<button class="btn small ghost" id="csBubReset">跟着全局走</button>'
    + '<button class="btn small ghost" id="csBubCss">✎ 自定义气泡 CSS</button></div>'
    + '<div class="hint" style="margin-top:6px;">「跟着全局走」＝丢掉这里的单独设置，回到「美化」里统一的样子。'
    + '想改得更细就用自定义 CSS（那是对所有对话框生效的）。</div>'
    + '</div>'
    + csSec('他的专属语音（需先接语音生成模型）')
    + '<div class="hint" style="margin-bottom:6px;">在「接口 → 语音生成模型」填好地址和钥匙后，他发来的语音消息会用这里的音色真的念出来。</div>'
    + (csVoiceReady() ? '<div class="hint" style="margin-bottom:6px;color:var(--c-primary);">✓ 已经接好语音生成模型，可以直接试听。</div>'
                      : '<div class="hint" style="margin-bottom:6px;color:#c07a7a;">还没接语音生成模型：他的语音消息暂时只有假气泡（点一下看文字）。</div>')
    + '<label class="fld">音色 / 发音人</label><input type="text" id="csVoice" value="' + esc(c.voice || '') + '" placeholder="比如 alloy、nova（看接口的音色列表）">'
    + '<label class="fld" style="margin-top:8px;">所说语言</label><input type="text" id="csVoiceLang" value="' + esc(c.voiceLang || '') + '" placeholder="比如 中文、English、日本語（留空跟随聊天语言）">'
    + '<div class="btn-row" style="margin-top:6px;"><button class="btn small ghost" id="csVoiceTry">试听一句</button></div>'
    + '</div>';
}
// 语音生成模型接好了没有（用于在设置里给用户一句明确的反馈）
function csVoiceReady(){
  try{
    ensureApis();
    var cfg = selectedCfg('voice');
    return !!(cfg && cfg.url);
  }catch(e){ return false; }
}
// 第 4 页「高级」：记忆自动总结 / 思维链 / 戳一下 / 批注模式
function csPageAdv(c){
  return '<label class="fld">记忆自动总结</label>'
    + '<div class="hint" style="margin-bottom:6px;line-height:1.7;">开启后，每聊够若干条，就把这段时间你们聊的内容整理成一段「自动记忆」写进<b>记忆</b>里。下次聊天或互动时，模型会先读这些记忆再开口，能省下不少 token。总结出来的内容可以在「记忆」里随时改。</div>'
    + '<label class="row" style="padding:7px 0;font-size:13px;"><input type="checkbox" id="csAutoSum" style="width:auto;"' + (c.autoSummary ? ' checked' : '') + '> 自动总结记忆</label>'
    + '<div class="row" style="padding:7px 0;font-size:13px;gap:10px;align-items:center;' + (c.autoSummary ? '' : 'opacity:.45;') + '" id="csSumWrap">'
    + '<span style="color:var(--c-sub);">每满</span>'
    + '<input type="number" id="csSumEvery" min="5" max="500" value="' + (c.summaryEvery || 20) + '" style="width:74px;">'
    + '<span style="color:var(--c-sub);">条对话，总结一次</span></div>'
    + csSec('模型思维链（线下）')
    + '<div class="hint" style="margin-bottom:8px;line-height:1.8;">'
    + '思维链不是他的内心想法，而是模型<b>生成正文之前</b>的分析思考过程：<br>'
    + '① 归纳你刚发的话／动作 → ② 检索<b>人设卡</b>、<b>世界书</b>、<b>记忆</b>和<b>上文</b>里用得上的信息 → '
    + '③ 权衡语气、称呼、分寸 → ④ 决定这一句要达到什么效果，<b>想完才生成正文</b>。<br>'
    + '分析过程会显示在线下大气泡的上半段（可小箭头收起），正文在下半段。'
    + '</div>'
    + '<label class="row" style="padding:7px 0;font-size:13px;"><input type="checkbox" id="csChainOn" style="width:auto;"' + ((!c.chain || c.chain.on !== false) ? ' checked' : '') + '> 线下模式显示思维链</label>'
    + '<label class="fld" style="margin-top:8px;">思维链提示词（可自己改）</label>'
    + '<textarea id="csChainPrompt" rows="9" style="font-size:12px;line-height:1.6;" placeholder="写清楚你希望模型先分析什么、怎么分析">' + esc((c.chain && c.chain.prompt) || DEFAULT_CHAIN_PROMPT) + '</textarea>'
    + '<div class="hint" style="margin-top:4px;">上面这段会追加在人设 / 世界书 / 记忆 / 上文之后一起送给模型。留空就用默认的那份。</div>'
    + '<div class="btn-row" style="margin-top:6px;gap:8px;">'
    + '<button class="btn small ghost" id="csChainReset">恢复默认提示词</button>'
    + '<button class="btn small ghost" id="csChainPreview">看看会送进去什么</button>'
    + '</div></div>'
    + csSec('戳一下回复（仅线上模式）')
    + '<div class="hint" style="margin-bottom:6px;">线上模式下双击「他」的头像戳一下，他会从这些话里随机回你一句；单击头像是看他的心里话。线下模式没有戳一下。可增删、修改；都删光就恢复默认。</div>'
    + '<div id="pokeList">' + pokeRowsHTML(c.pokes) + '</div>'
    + '<div class="btn-row" style="margin-top:6px;gap:8px;">'
    + '<button class="btn small ghost" id="pokeAdd">＋ 加一句</button>'
    + '<button class="btn small ghost" id="pokeReset">恢复默认</button>'
    + '</div></div>'
    + csSec('批注模式（第三种模式）')
    + '<div class="hint" style="margin-bottom:8px;line-height:1.8;">'
    + '聊天顶部那行小字点一下，可以在「线上聊天 → 线下相处 → 批注模式」之间切换。<br>'
    + '批注模式里<b>由你写</b>，写完存成一篇文稿，再请好友在<b>段落 / 句子后面</b>写上（……）批注——'
    + '可以是夸奖、读完的感想、内容的补充说明、追问或联想。批注的<b>颜色、字号、斜体、底色</b>都能改，'
    + '也能删掉重新生成，字数长短随你定。'
    + '</div>'
    + '<div class="btn-row" style="gap:8px;">'
    + '<button class="btn small" id="csAnnOpen">批注设置</button>'
    + '<button class="btn small ghost" id="csAnnStyle">批注默认样式</button>'
    + '</div></div>';
}
function openChatSetting(tab){
  ensureWx(); ensurePersonas();
  if(tab) openChatSetting.tab = tab;
  if(csTab() !== 'look') CS_BUBBLE_DIRTY = false;
  var cur = csTab();
  var pid = state.curPersona || '_';
  var c = chatCfg(pid);
  var p = state.persona;
  var speedOpts = Object.keys(SPEED_MS).map(function(k){
    return '<option value="' + k + '"' + (c.speed === k ? ' selected' : '') + '>' + SPEED_NAME[k] + '</option>';
  }).join('');
  var styleOpts = STYLE_PRESETS.map(function(s, i){
    var on = (!c.style && i === 0) || (c.style === s);
    return '<option value="' + esc(s) + '"' + (on ? ' selected' : '') + '>' + esc(s) + '</option>';
  }).join('');
  var body = (cur === 'act')  ? csPageAct(c)
           : (cur === 'look') ? csPageLook(c)
           : (cur === 'adv')  ? csPageAdv(c)
           :                    csPageBasic(c, speedOpts, styleOpts);
  var html = '<div class="hint" style="margin-bottom:10px;">下面的设置只对「<b>' + esc(p.name || '他') + '</b>」生效。'
    + '换一张人设卡会读到另一套设置。当前是第 ' + (CS_TABS.map(function(t){return t[0];}).indexOf(cur) + 1) + ' / ' + CS_TABS.length + ' 页。</div>'
    + csTabBar(cur)
    + '<div class="card glass">' + body
    + '<div class="btn-row" style="margin-top:12px;"><button class="btn block" id="csSave">保存这一页</button></div>'
    + '<div class="hint" style="margin-top:8px;">表情包要在「设置 → 表情包」里上传，并且在这一页把这一套勾选给他，他才会用。</div>'
    + '</div>';
  openSheet('聊天设置 · ' + (p.name || '他'), html);
  // 标签切换：当前页先存档，再重绘另一页（这样改了不用先点保存也不会丢）
  $$('[data-cstab]').forEach(function(b){
    b.onclick = function(){ csCollect(c); openChatSetting(b.getAttribute('data-cstab')); };
  });
  csBindPage(cur, c, pid);
}
/* 读取当前这一页的输入 → 写回这份聊天设置（切标签 / 点保存都走这里）。
   统一用「存在才读」的方式，所以不在本页的字段不会被抹掉。 */
function csCollect(c){
  if($('csSpeed')) c.speed = $('csSpeed').value;
  if($('csStyleSel')){
    var sel0 = $('csStyleSel').value;
    var custom0 = ($('csStyle').value || '').trim();
    c.style = custom0 || (sel0.indexOf('（不指定') === 0 ? '' : sel0);
  }
  var fsx = document.getElementsByName('csFirst');
  if(fsx && fsx.length){ for(var j = 0; j < fsx.length; j++){ if(fsx[j].checked) c.firstSpeaker = fsx[j].value; } }
  if($('csImg'))  c.autoImage  = $('csImg').checked;
  if($('csPro'))  c.proactive  = $('csPro').checked;
  if($('csCall')) c.call       = $('csCall').checked;
  if($('csStk'))  c.useSticker = $('csStk').checked;
  if($('csSenseTime'))    c.senseTime    = $('csSenseTime').checked;
  if($('csSenseWeather')) c.senseWeather = $('csSenseWeather').checked;
  if($('csIdleOn')){
    c.idleOn  = $('csIdleOn').checked;
    c.idleMin = Math.max(1, parseInt($('csIdleMin').value, 10) || 5);
  }
  var pkBoxes = $$('.cs-pack');
  if(pkBoxes.length){
    var selP = pkBoxes.filter(function(b){ return b.checked; }).map(function(b){ return b.getAttribute('data-pack'); });
    c.stickerPacks = (selP.length === pkBoxes.length) ? null : selP;   // 全勾 = 不限
  }
  if($('csRead')) c.showRead = $('csRead').checked;
  if($('csTime')) c.showTime = $('csTime').checked;
  var tps = document.getElementsByName('csTp');
  if(tps && tps.length){ for(var i = 0; i < tps.length; i++){ if(tps[i].checked) c.timePos = tps[i].value; } }
  if($('csVoice'))     c.voice     = ($('csVoice').value || '').trim();
  if($('csVoiceLang')) c.voiceLang = ($('csVoiceLang').value || '').trim();
  if($('csBgUrl')){
    var bgUrl = ($('csBgUrl').value || '').trim();
    if(bgUrl) c.bg = {type:'url', value:bgUrl};
  }
  // 背景的不透明度 / 模糊：拖过就记下来（哪怕这张底图是全局那张，也按这个对话框的样子显示）
  if($('csBgOpacity') || $('csBgBlur')){
    if(!c.bg) c.bg = {type:'', value:''};
    if($('csBgOpacity')) c.bg.opacity = clampNum(parseInt($('csBgOpacity').value, 10), 10, 100);
    if($('csBgBlur'))    c.bg.blur    = clampNum(parseInt($('csBgBlur').value, 10), 0, 20);
  }
  // 气泡外观：只在真的动过（或者本来就单独设过）时才写入，免得把「跟着全局走」给顶掉
  if($('csBubMe') && (CS_BUBBLE_DIRTY || c.bubble)){
    c.bubble = {
      me:    $('csBubMe').value,
      meT:   $('csBubMeT').value,
      him:   $('csBubHim').value,
      himT:  $('csBubHimT').value,
      radius:clampNum(parseInt($('csBubRadius').value, 10), 0, 26),
      gap:   clampNum(parseInt($('csBubGap').value, 10), 2, 20)
    };
  }
  if($('csAutoSum')){
    c.autoSummary  = $('csAutoSum').checked;
    c.summaryEvery = Math.max(5, parseInt($('csSumEvery').value, 10) || 20);
  }
  if($('csChainOn')){
    c.chain = { on: $('csChainOn').checked, prompt: ($('csChainPrompt').value || '').trim() || DEFAULT_CHAIN_PROMPT };
  }
  if($('pokeList')){
    var ps = [];
    $$('#pokeList .poke-in').forEach(function(inp){ var v = (inp.value || '').trim(); if(v) ps.push(v); });
    c.pokes = ps.length ? ps : DEFAULT_POKES.slice();
  }
}
// 每一页自己的按钮 / 联动（只在那一页存在时才绑，互不干扰）
function csBindPage(cur, c, pid){
  var sv = $('csSave');
  if(sv) sv.onclick = function(){
    csCollect(c); wxSave(); closeSheet();
    if(cur === 'look') applyChatBg();
    if(inChat()) renderChat();
    toast('已保存');
  };
  if(cur === 'basic'){
    var cp = $('csStylePreview');
    if(cp) cp.onclick = function(){
      var txt = stylePromptOf($('csStyleSel').value || '', ($('csStyle').value || '').trim());
      openModal('这段文风的提示词', '<div class="hint" style="margin-bottom:6px;">模型会连下面这段一起读到，用来拿捏说话的味道：</div>'
        + '<textarea rows="6" readonly style="font-size:12px;">' + esc(txt || '（当前没有指定文风，按人设卡来）') + '</textarea>',
        [{text:'知道了', cls:'ghost'}]);
    };
  }
  if(cur === 'act'){
    var ci = $('csIdleOn');
    if(ci) ci.addEventListener('change', function(){ var w = $('csIdleWrap'); if(w) w.style.opacity = ci.checked ? '' : '.45'; });
  }
  if(cur === 'look'){
    var ct = $('csTime');
    if(ct) ct.addEventListener('change', function(){ var w = $('csTpWrap'); if(w) w.style.opacity = ct.checked ? '' : '.45'; });
    // 滑条旁边的小数字跟着动
    $$('.cs-sl').forEach(function(sl){
      sl.addEventListener('input', function(){
        var lb = $(sl.id + 'V');
        if(lb) lb.textContent = sl.value + (sl.getAttribute('data-unit') || '');
      });
    });
    // 背景：透明度 / 模糊实时预览
    ['csBgOpacity','csBgBlur'].forEach(function(id){
      var el = $(id);
      if(!el) return;
      el.addEventListener('input', function(){
        var c = chatCfg();
        if(!c.bg) c.bg = {type:'', value:''};
        if(id === 'csBgOpacity') c.bg.opacity = clampNum(parseInt(el.value, 10), 10, 100);
        else                     c.bg.blur    = clampNum(parseInt(el.value, 10), 0, 20);
        applyChatBg();
      });
    });
    // 气泡：颜色 / 圆角 / 间距实时预览，并记下「这一个对话框单独调过」
    $$('.cs-bub, #csBubRadius, #csBubGap').forEach(function(el){
      el.addEventListener('input', function(){ CS_BUBBLE_DIRTY = true; csBubbleLive(); });
    });
    var rbtn = $('csBubReset');
    if(rbtn) rbtn.onclick = function(){
      c.bubble = null; CS_BUBBLE_DIRTY = false;
      try{ applyChatBubble(); }catch(e){}
      wxSave(); openChatSetting('look'); toast('这个对话框已回到全局样式');
    };
    var cssbtn = $('csBubCss');
    if(cssbtn) cssbtn.onclick = function(){ openBubbleCssWindow(); };
    var cbp = $('csBgPick');
    if(cbp) cbp.onclick = function(){
      if(typeof pickImageGeneric !== 'function'){ toast('这个功能暂时不可用'); return; }
      pickImageGeneric(function(r){
        if(!r || !r.value) return;
        c.bg = {type:r.type || 'idb', value:r.value};
        wxSave(); applyChatBg(); toast('已设置这个对话框的专属背景');
        openChatSetting('look');
      });
    };
    var cbc = $('csBgClear');
    if(cbc) cbc.onclick = function(){
      c.bg = null; wxSave(); applyChatBg(); toast('已清除，用回全局聊天背景');
      openChatSetting('look');
    };
    var cvt = $('csVoiceTry');
    if(cvt) cvt.onclick = function(){
      var sampleText = ((state.persona && state.persona.catchphrase) || '在呢，怎么了？');
      toast('正在生成语音…');
      askVoice(sampleText, {voice:($('csVoice').value || '').trim() || undefined}, function(url, err){
        if(err){ toast('生成失败：' + err); return; }
        try{ var au = new Audio(url); au.play().catch(function(){ }); toast('已播放（' + sampleText + '）'); }
        catch(e){ toast('生成好了，但这里放不出来'); }
      });
    };
  }
  if(cur === 'adv'){
    var ca = $('csAutoSum');
    if(ca) ca.addEventListener('change', function(){ var w = $('csSumWrap'); if(w) w.style.opacity = ca.checked ? '' : '.45'; });
    var pa = $('pokeAdd');
    if(pa) pa.onclick = function(){ var a = pokeReadInputs(); a.push(''); pokeRefresh(a); };
    var pr = $('pokeReset');
    if(pr) pr.onclick = function(){ pokeRefresh(DEFAULT_POKES.slice()); toast('已恢复默认'); };
    pokeRefresh(c.pokes);
    var cr = $('csChainReset');
    if(cr) cr.onclick = function(){ $('csChainPrompt').value = DEFAULT_CHAIN_PROMPT; toast('已恢复默认提示词'); };
    var cx = $('csChainPreview');
    if(cx) cx.onclick = function(){
      var pv = $('csChainPrompt').value.trim() || DEFAULT_CHAIN_PROMPT;
      var full = buildSystemPrompt('') + '\n【最近对话】\n' + recentContext() + '\n' + pv;
      openModal('思维链会送进去什么', '<div class="hint" style="margin-bottom:6px;">下面就是模型思考时看到的全部内容（人设 + 世界书 + 记忆 + 上文 + 思维链提示词）：</div>'
        + '<textarea rows="14" readonly style="font-size:11px;line-height:1.5;">' + esc(full) + '</textarea>',
        [{text:'知道了', cls:'ghost'}]);
    };
    var ao = $('csAnnOpen');
    if(ao) ao.onclick = function(){ csCollect(c); wxSave(); closeSheet(); setTimeout(openAnnotSettings, 120); };
    var as = $('csAnnStyle');
    if(as) as.onclick = function(){ csCollect(c); wxSave(); closeSheet(); setTimeout(function(){ openAnnotStyleBox(null); }, 120); };
  }
}
$('btnChatSet').addEventListener('click', function(){ openChatSetting(); });
/* ---- 旁白：线下模式里给场景 / 动作加一句说明 ---- */
$('btnNarrate').addEventListener('click', function(){
  openModal('加一句旁白',
      '<textarea id="narrT" placeholder="比如：他把杯子往你那边推了推，没说话。"></textarea>'
    + '<div class="hint" style="margin-top:8px;">旁白会居中斜体显示，不算对话，用来描写动作、场景、心里话。</div>',
    [{text:'加进去', fn:function(box){
      var t = (box.querySelector('#narrT').value || '').trim();
      if(!t){ toast('写点什么'); return; }
      pushMessage('me', t, 'narration');
      // 他可能会对这段旁白有点反应
      showTyping();
      setTimeout(function(){
        hideTyping();
        offlineReply('（旁白：' + t + '）', function(r, think){
          var ex = null;
          if(isOffline() && think){ ex = {think:think, thinkOpen:true}; }
          pushMessage('him', r, 'text', ex);
        });
      }, 700 + Math.random() * 900);
    }}, {text:'取消', cls:'ghost'}]);
});
// 入口上的小红点：有申请 / 新动态 / 新账单
function renderWxDots(){
  ensureWx();
  if(!$('wxDotFriend')) return;
  $('wxDotFriend').className = 'wx-dot' + (wxRequests().length ? ' on' : '');
  // 好友圈：只提示「上次看完之后新冒出来」的动态；进过好友圈就记下时间，红点才消得掉
  var seen = LS.get('wxCircleSeen', 0);
  if(!seen) seen = Date.now() - 3600000 * 12;      // 从没进去过：按老规矩，12 小时内的算新
  $('wxDotCircle').className = 'wx-dot' + (wxPosts().some(function(p){ return (p.ts || 0) > seen; }) ? ' on' : '');
  var id = (curIdentity() || {}).id || '_';
  var lastPay = LS.get('wxPaySeen', 0);
  var has = ((state.wallet && state.wallet.bills) || []).some(function(b){ return b.identityId === id && b.ts > lastPay; });
  $('wxDotPay').className = 'wx-dot' + (has ? ' on' : '');
}
function renderCallLog(){
  var box = $('callLog');
  if(!state.calls.length){ box.innerHTML = '<div class="empty">还没有通话记录</div>'; return; }
  box.innerHTML = state.calls.slice(0,40).map(function(c){
    return '<div class="item"><div class="row between"><b>' + esc(c.type) + '</b><span class="m">' + fmtFull(c.ts) + '</span></div>'
      + '<div class="m">时长 ' + fmtDur(c.dur || 0) + (c.note ? ' · ' + esc(c.note) : '') + '</div></div>';
  }).join('');
}
function fmtDur(sec){
  var m = Math.floor(sec/60), s = sec%60;
  return pad(m) + ':' + pad(s);
}
$('btnCallStart').addEventListener('click', function(){
  if(callOn) return;
  callOn = true; callSec = 0;
  $('callFace').classList.add('talking');
  $('callTalk').textContent = '（通话中…）';
  callTick = setInterval(function(){
    callSec++;
    $('callTimer').textContent = fmtDur(callSec);
    if(callSec % 12 === 0){ // 每隔一会儿他说一句
      var pool = ['嗯，我在听。','你说，我听着。','慢慢说，不着急。','嗯嗯。'];
      var line = pick(pool);
      $('callTalk').textContent = line;
      // 通话语言不是中文时，把这句实时翻译出来
      var lg = state.settings.lang;
      if(lg && lg !== '中文'){
        translateText(line, lg, function(r){ $('callTrans').textContent = '（翻译）' + r; });
      } else { $('callTrans').textContent = ''; }
    }
  }, 1000);
  toast('已接通');
});
$('btnCallEnd').addEventListener('click', function(){
  if(!callOn){ toast('还没接通'); return; }
  callOn = false; clearInterval(callTick);
  $('callFace').classList.remove('talking');
  $('callTalk').textContent = '已挂断。';
  state.calls.unshift({id:uid(), type:'电话', dur:callSec, ts:Date.now(), note:'语言：' + state.settings.lang});
  save('calls'); renderCallLog();
  $('callTimer').textContent = '00:00';
});
$('btnCallLang').addEventListener('click', function(){
  var opts = LANGS.map(function(l){ return '<option value="' + l + '"' + (l === state.settings.lang ? ' selected' : '') + '>' + l + '</option>'; }).join('');
  openModal('通话语言', '<select id="cl">' + opts + '</select>'
    + '<div class="hint" style="margin-top:8px;">开启接口模式后，通话中的话会实时翻译显示。</div>',
    [{text:'保存', fn:function(box){
      state.settings.lang = box.querySelector('#cl').value; save('settings');
      $('callLangTip').textContent = '当前语言：' + state.settings.lang;
      toast('已切换');
    }}]);
});

/* ---------- 视频通话 / 监控陪伴 ---------- */
var videoMode = 'call';   // call=视频通话 watch=监控陪伴
var vTick = null, vSec = 0, vOn = false, mouthTimer = null;
var watchTimer = null;
renderers.video = function(){
  $('videoName').textContent = state.persona.name || '他';
  renderVideoLog();
};
$('btnVideoMode').addEventListener('click', function(){
  videoMode = (videoMode === 'call') ? 'watch' : 'call';
  $('vModeCall').style.display = (videoMode === 'call') ? '' : 'none';
  $('vModeWatch').style.display = (videoMode === 'watch') ? '' : 'none';
  toast(videoMode === 'call' ? '视频通话模式' : '监控陪伴模式');
});
$('btnVideoStart').addEventListener('click', function(){
  if(vOn) return;
  vOn = true; vSec = 0;
  $('videoFace').classList.add('talking');
  // 用 CSS 动画模拟他说活时的口型
  mouthTimer = setInterval(function(){
    var m = $('videoMouth');
    m.classList.add('speak');
    setTimeout(function(){ m.classList.remove('speak'); }, 700 + Math.random()*800);
  }, 1800);
  vTick = setInterval(function(){ vSec++; $('videoTimer').textContent = fmtDur(vSec); }, 1000);
  toast('已接通');
});
$('btnVideoEnd').addEventListener('click', function(){
  if(!vOn){ toast('还没接通'); return; }
  vOn = false; clearInterval(vTick); clearInterval(mouthTimer);
  $('videoFace').classList.remove('talking');
  state.calls.unshift({id:uid(), type:'视频通话', dur:vSec, ts:Date.now(), note:''});
  save('calls'); renderVideoLog(); $('videoTimer').textContent = '00:00';
});
$('btnVideoMute').addEventListener('click', function(){
  var b = $('btnVideoMute');
  var on = b.textContent.indexOf('静音') >= 0;
  b.textContent = on ? '取消静音' : '静音';
  toast(on ? '已静音' : '已取消静音');
});
// 点他的头像：虚拟触碰
$('videoFace').addEventListener('click', function(){
  var words = ['嗯？','怎么了','哎，你碰我','在呢。','干嘛呀'];
  var w = pick(words);
  var el = $('videoFace');
  var ring = document.createElement('div');
  ring.className = 'touch-ring go';
  ring.style.left = '50%'; ring.style.top = '50%'; ring.style.marginLeft = '-30px'; ring.style.marginTop = '-30px';
  el.appendChild(ring);
  setTimeout(function(){ if(ring.parentNode) ring.parentNode.removeChild(ring); }, 700);
  pushMessage('him', w, 'text');
  toast(w);
});
// 监控陪伴：低频主动说话
$('btnWatchStart').addEventListener('click', function(){
  if(watchTimer) return;
  var lines = ['我在这里陪你。','你在干嘛？','慢慢来。','我一直在。','要不要一起待会儿？','今天累不累？'];
  $('watchState').textContent = '他正在陪着你';
  watchTimer = setInterval(function(){
    var l = pick(lines);
    $('watchLast').textContent = '「' + l + '」 · ' + fmtTime(Date.now());
    pushMessage('him', l, 'text');
  }, 60000 + Math.random()*60000);
  toast('陪伴已开启（页面保持打开）');
});
$('btnWatchStop').addEventListener('click', function(){
  clearInterval(watchTimer); watchTimer = null;
  $('watchState').textContent = '陪伴已结束';
  state.calls.unshift({id:uid(), type:'监控陪伴', dur:0, ts:Date.now(), note:'已结束'});
  save('calls'); renderVideoLog();
  toast('陪伴结束');
});
function renderVideoLog(){
  var box = $('videoLog');
  var list = state.calls.filter(function(c){ return c.type !== '电话'; });
  if(!list.length){ box.innerHTML = '<div class="empty">还没有记录</div>'; return; }
  box.innerHTML = list.slice(0,40).map(function(c){
    return '<div class="item"><div class="row between"><b>' + esc(c.type) + '</b><span class="m">' + fmtFull(c.ts) + '</span></div>'
      + '<div class="m">' + (c.dur ? ('时长 ' + fmtDur(c.dur)) : esc(c.note||'')) + '</div></div>';
  }).join('');
}

/* ---------- 音乐 ---------- */
var audioEl = new Audio();
var songIdx = 0;
renderers.music = function(){
  refreshSongs(function(list){
    $('songList').innerHTML = list.length ? list.map(function(s, i){
      return '<div class="item"><div class="row between"><div><div class="t">' + esc(s.name) + '</div>'
        + '<div class="m">' + fmtDate(s.ts) + '</div></div>'
        + '<div class="acts"><button class="btn small ghost" data-play="' + i + '">播放</button>'
        + '<button class="btn small ghost" data-del="' + s.id + '">删</button></div></div></div>';
    }).join('') : '<div class="empty">还没有歌，点右上角导入</div>';
    $$('[data-play]', $('songList')).forEach(function(el){
      el.addEventListener('click', function(){ playSong(parseInt(el.getAttribute('data-play'),10)); });
    });
    $$('[data-del]', $('songList')).forEach(function(el){
      el.addEventListener('click', function(){
        var id = el.getAttribute('data-del');
        idbDel('audios', id).then(function(){ delete audioCache[id]; refreshSongs(); renderers.music(); });
      });
    });
    // 一起听：歌单选曲
    var ls = $('ltSong');
    if(ls){
      ls.innerHTML = list.length ? list.map(function(s, i){ return '<option value="' + i + '">' + esc(s.name) + '</option>'; }).join('')
                                  : '<option value="">歌单是空的</option>';
    }
  });
  // 一起听：好友下拉
  var lf = $('ltFriend');
  if(lf){
    var friends = wxAllFriends();
    lf.innerHTML = '<option value="">单独听</option>' + friends.map(function(f){
      return '<option value="' + esc(f.kind + '|' + (f.pid || '') + '|' + (f.nid || '')) + '">' + esc(f.name) + '</option>';
    }).join('');
  }
  // 一起听过 记录
  var box = $('ltList');
  if(box){
    ensureListenTogether();
    box.innerHTML = state.listenTogether.length ? state.listenTogether.slice(0, 30).map(function(r){
      return '<div class="item"><div class="t">' + esc(r.song || '一首歌') + ' · 和 ' + esc(r.friendName || '他') + '</div>'
        + '<div class="m">' + fmtFull(r.ts) + (r.said && r.said.length ? ' · ' + esc(r.said.slice(-1)[0]) : '') + '</div></div>';
    }).join('') : '<div class="empty">还没有一起听过</div>';
  }
};
// 把好友下拉里的值（kind|pid|nid）还原成一个好友对象
function friendByKey(key){
  if(!key) return null;
  var p = String(key).split('|');
  var kind = p[0], pid = p[1] || '', nid = p[2] || '';
  return wxAllFriends().filter(function(f){ return f.kind === kind && (f.pid||'') === pid && (f.nid||'') === nid; })[0] || null;
}
function ltFriendFromKey(key){ return friendByKey(key); }
var ltTimer = null;
var ltSession = null;   // {friend, songName, said:[]}
function ltStartListen(){
  var friend = ltFriendFromKey($('ltFriend') ? $('ltFriend').value : '');
  var songIdx = parseInt(($('ltSong') && $('ltSong').value) || '-1', 10);
  if(isNaN(songIdx) || songIdx < 0){ toast('先导入并选一首歌'); return; }
  playSong(songIdx);
  var songName = $('songTitle').textContent;
  ltSession = {friend: friend, songName: songName, said: []};
  $('ltStart').style.display = 'none';
  $('ltStop').style.display = '';
  $('ltStage').style.display = '';
  $('ltStageTitle').textContent = '正在和 ' + (friend ? friend.name : '自己') + ' 一起听：' + songName;
  var box = $('ltSaid'); box.innerHTML = '';
  function react(){
    if(!ltSession || !ltSession.friend) return;
    var prompt = friendSystemPrompt(ltSession.friend)
      + '\n你们正在一起听《' + ltSession.songName + '》，请就这首歌说一句真实的随感，像坐在旁边一样，短一点（一两句）';
    askModel(prompt, '现在轮到你说话：', function(r){
      if(!r || !ltSession) return;
      ltSession.said.push(r);
      var el = document.createElement('div');
      el.className = 'lt-said';
      el.innerHTML = '<b>' + esc(ltSession.friend.name) + '：</b>' + esc(r);
      box.appendChild(el); box.scrollTop = box.scrollHeight;
      pushMessage('him', r, 'text');
    });
  }
  react();
  clearInterval(ltTimer);
  ltTimer = setInterval(react, 9000);
}
function ltStopListen(){
  clearInterval(ltTimer); ltTimer = null;
  if(audioEl) audioEl.pause();
  if(ltSession){
    ensureListenTogether();
    state.listenTogether.unshift({id:uid(), friendName: ltSession.friend ? ltSession.friend.name : '自己',
                                  song: ltSession.songName, said: ltSession.said.slice(), ts: Date.now()});
    save('listenTogether');
  }
  ltSession = null;
  $('ltStart').style.display = '';
  $('ltStop').style.display = 'none';
  $('ltStage').style.display = 'none';
  renderers.music();
  toast('已存进「一起听过」');
}
if($('ltStart')) $('ltStart').addEventListener('click', ltStartListen);
if($('ltStop')) $('ltStop').addEventListener('click', ltStopListen);
function playSong(i){
  refreshSongs(function(list){
    if(!list.length) return;
    songIdx = Math.max(0, Math.min(i, list.length-1));
    var s = list[songIdx];
    audioEl.src = audioCache[s.id];
    audioEl.play().catch(function(){ toast('这个文件播不了'); });
    $('songTitle').textContent = s.name;
    $('btnPlay').innerHTML = lnIcon('pause', 18);
    audioEl.onended = function(){ playSong(songIdx + 1); };
  });
}
$('btnPlay').addEventListener('click', function(){
  if(audioEl.paused){ audioEl.play().catch(function(){}); $('btnPlay').innerHTML = lnIcon('pause', 18); }
  else{ audioEl.pause(); $('btnPlay').innerHTML = lnIcon('play', 18); }
});
$('btnPrev').addEventListener('click', function(){ playSong(songIdx - 1); });
$('btnNext').addEventListener('click', function(){ playSong(songIdx + 1); });
// 进度条
audioEl.addEventListener('timeupdate', function(){
  if(!audioEl.duration) return;
  var p = audioEl.currentTime / audioEl.duration * 100;
  $('songBar').style.width = p + '%';
  $('songTime').textContent = fmtDur(Math.floor(audioEl.currentTime)) + ' / ' + fmtDur(Math.floor(audioEl.duration));
});
$('btnAddSong').addEventListener('click', function(){
  pickFile('audio/*', true, function(files){
    if(!files.length) return;
    var n = 0;
    files.forEach(function(f){
      idbPut('audios', {id:uid(), name:f.name, blob:f, ts:Date.now()}).then(function(ok){
        if(ok) n++;
        if(n === files.length){ toast('导入了 ' + n + ' 首'); refreshSongs(); renderers.music(); }
      });
    });
  });
});

/* ---------- 备忘 ---------- */
renderers.notes = function(){
  var box = $('noteList');
  if(!state.notes.length){ box.innerHTML = '<div class="empty">还没有备忘</div>'; return; }
  box.innerHTML = state.notes.map(function(n){
    return '<div class="item"><div class="t">' + esc(n.text) + '</div><div class="m">' + fmtFull(n.ts) + '</div>'
      + '<div class="acts"><button class="btn small ghost" data-nedit="' + n.id + '">改</button>'
      + '<button class="btn small ghost" data-ndel="' + n.id + '">删</button></div></div>';
  }).join('');
  $$('[data-nedit]', box).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-nedit');
      var n = state.notes.filter(function(x){ return x.id === id; })[0]; if(!n) return;
      openModal('改这条备忘', '<textarea id="neText">' + esc(n.text) + '</textarea>',
        [{text:'保存', fn:function(box){ n.text = box.querySelector('#neText').value; save('notes'); renderers.notes(); }}]);
    });
  });
  $$('[data-ndel]', box).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-ndel');
      state.notes = state.notes.filter(function(x){ return x.id !== id; });
      save('notes'); renderers.notes();
    });
  });
};
$('btnAddNote').addEventListener('click', function(){
  openModal('新建备忘', '<textarea id="nnText" placeholder="要记点什么？"></textarea>',
    [{text:'保存', fn:function(box){
      var t = (box.querySelector('#nnText').value || '').trim();
      if(!t) return;
      state.notes.unshift({id:uid(), text:t, ts:Date.now()});
      save('notes'); renderers.notes();
      // 开着「备忘自动排计划」的话，带日期的备忘会立刻排进计划
      if(state.planCfg && state.planCfg.fromNotes) setTimeout(function(){ fillPlansFromNotes(); }, 0);
    }}]);
});

/* ---------- 身份卡：我的资料卡，可以有很多个身份 ---------- */

// 第一次用时建一个默认身份
function ensureIdentities(){
  if(!state.identities || !state.identities.length){
    state.identities = [{
      id: uid(), name: '我', gender: '', age: '', personality: '',
      background: '', relation: '', note: '', icon: '', color: '', ts: Date.now()
    }];
    state.curIdentity = state.identities[0].id;
    save('identities'); save('curIdentity');
  }
  var cur = curIdentity();
  if(!cur){ state.curIdentity = state.identities[0].id; save('curIdentity'); }
}
// 当前正在用的身份
function curIdentity(){
  if(!state.identities || !state.identities.length) return null;
  var list = state.identities.filter(function(x){ return x.id === state.curIdentity; });
  return list.length ? list[0] : state.identities[0];
}
// 「我」现在叫什么名字（聊天、回忆卡片、一起写里都用它）
function meName(){
  var m = curIdentity();
  return (m && m.name) ? m.name : '我';
}
// 身份头像：传过图片就用图片，否则用头像字 / 名字首字（有颜色就用颜色）
function idAvatar(it, size){
  ensureWx();
  var s = size || 40;
  var imgId = (state.wx.ava.me || {})[(it && it.id) || '_'];
  var url = imgId ? (imgCache[imgId] || '') : '';
  if(url) return '<img class="ava-img" src="' + url + '" style="width:' + s + 'px;height:' + s + 'px;" alt="">';
  var txt = (it && it.icon && it.icon.trim()) ? it.icon.trim().slice(0,2) : ((it && it.name) ? it.name.slice(0,1) : '我');
  var bg = (it && it.color) ? 'background:linear-gradient(145deg,' + it.color + 'F2,' + it.color + 'B3);' : '';
  return '<div class="avatar" style="width:' + s + 'px;height:' + s + 'px;font-size:'
    + Math.round(s * 0.4) + 'px;' + bg + '">' + esc(txt) + '</div>';
}
// 身份卡头像：上传 / 选相册 / 恢复默认，三个按钮绑到一段 HTML 上
function identityAvatarHTML(it, size){
  ensureWx();
  var imgId = (state.wx.ava.me || {})[(it && it.id) || '_'];
  return '<div class="row" style="gap:12px;align-items:center;margin-bottom:10px;">'
    + '<span class="id-ava-box" data-idava="' + esc((it && it.id) || '') + '">' + idAvatar(it, size || 56) + '</span>'
    + '<div style="flex:1;min-width:0;">'
    + '<div class="fld" style="margin:0;">我的头像</div>'
    + '<div class="btn-row" style="margin-top:6px;gap:6px;">'
    + '<button class="btn small" data-idavaup="1">从设备上传</button>'
    + '<button class="btn small ghost" data-idavaal="1">从相册选</button>'
    + '<button class="btn small ghost" data-idavaclr="1"' + (imgId ? '' : ' style="display:none;"') + '>恢复默认</button>'
    + '</div>'
    + '<div class="hint" style="margin-top:6px;">会同步到聊天里的「我」、微信主界面和好友圈。</div>'
    + '</div></div>';
}
// 给一段容器里的身份头像按钮绑事件（容器可以是弹窗，也可以是身份卡页面）
function bindIdentityAvatar(box, getIt, after){
  if(!box) return;
  var up = box.querySelector('[data-idavaup]');
  var al = box.querySelector('[data-idavaal]');
  var clr = box.querySelector('[data-idavaclr]');
  function redraw(){
    var it = getIt(); if(!it) return;
    var holder = box.querySelector('[data-idava]');
    if(holder) holder.innerHTML = idAvatar(it, 56);
    if(clr) clr.style.display = (state.wx.ava.me || {})[it.id] ? '' : 'none';
    if(after) after();
  }
  if(up) up.addEventListener('click', function(){
    var it = getIt(); if(!it) return;
    pickFile('image/*', false, function(files){
      var f = files && files[0]; if(!f) return;
      applyAvatar('me', it.id, f, function(){ redraw(); toast('头像已更换'); });
    });
  });
  if(al) al.addEventListener('click', function(){
    var it = getIt(); if(!it) return;
    refreshAlbum(function(list){
      if(!list.length){ toast('相册还是空的，先用「从设备上传」'); return; }
      openModal('选一张图当头像',
        '<select id="idAvaSel">' + list.map(function(i){
          return '<option value="' + esc(i.id) + '">' + esc(i.name || '图片') + '</option>';
        }).join('') + '</select>',
        [{text:'就用这张', fn:function(b){
          ensureWx();
          state.wx.ava.me[it.id] = b.querySelector('#idAvaSel').value;
          wxSave(); redraw(); toast('头像已更换');
        }}, {text:'取消', cls:'ghost'}]);
    });
  });
  if(clr) clr.addEventListener('click', function(){
    var it = getIt(); if(!it) return;
    clearAvatar('me', it.id); redraw(); toast('已恢复成默认头像');
  });
}
// 切换身份（会记一条聊天里的提示，让他知道你换了身份）
function switchIdentity(id){
  var it = state.identities.filter(function(x){ return x.id === id; })[0];
  if(!it) return;
  state.curIdentity = id;
  save('curIdentity');
  pushMessage('sys', '你现在用「' + it.name + '」的身份和他说话', 'text');
  toast('已切换到：' + it.name);
  renderers.card();
  if(inChat()) renderChat();
}
// 身份卡编辑弹窗
function openIdentityModal(it){
  var isNew = !it;
  it = it || {id:uid(), name:'', gender:'', age:'', personality:'', background:'',
              relation:'', note:'', icon:'', color:'', ts:Date.now()};
  openModal(isNew ? '新建一个身份' : '改这个身份',
      identityAvatarHTML(it, 56)
    + '<label class="fld">姓名（就是他叫你的名字）</label><input type="text" id="idName" value="' + esc(it.name) + '" placeholder="例如：小满">'
    + '<label class="fld">性别</label><input type="text" id="idGender" value="' + esc(it.gender) + '" placeholder="例如：女 / 男 / 不想说">'
    + '<label class="fld">年龄</label><input type="text" id="idAge" value="' + esc(it.age) + '" placeholder="可留空">'
    + '<label class="fld">性格</label><textarea id="idChar">' + esc(it.personality) + '</textarea>'
    + '<label class="fld">背景经历</label><textarea id="idBg" placeholder="小时候、工作、发生过什么……他会记住这些">' + esc(it.background) + '</textarea>'
    + '<label class="fld">和他的关系</label><input type="text" id="idRel" value="' + esc(it.relation) + '" placeholder="例如：同学 / 恋人 / 网友">'
    + '<label class="fld">备注（只有你知道的）</label><textarea id="idNote">' + esc(it.note) + '</textarea>'
    + '<label class="fld">没传图片时，头像的底色</label><div class="row"><input type="color" id="idColor" value="' + esc(it.color || '#9dbdd8') + '">'
    + '<button class="btn small ghost" id="idColorClear">用默认</button></div>'
    + '<div class="hint" style="margin-top:4px;">头像只能从设备上传或从相册里选。</div>',
    [{text:'保存', fn:function(box){
      it.name = (box.querySelector('#idName').value || '').trim() || '我';
      it.gender = box.querySelector('#idGender').value;
      it.age = box.querySelector('#idAge').value;
      it.personality = box.querySelector('#idChar').value;
      it.background = box.querySelector('#idBg').value;
      it.relation = box.querySelector('#idRel').value;
      it.note = box.querySelector('#idNote').value;
      it.color = box.querySelector('#idColor').dataset.off ? '' : box.querySelector('#idColor').value;
      if(isNew){
        state.identities.push(it);
        state.curIdentity = it.id;      // 新建完直接用这个身份
        save('curIdentity');
      }
      save('identities'); renderers.card();
      if(inChat()) renderChat();
      toast('已保存');
    }},
     {text:'取消', cls:'ghost'}]);
  var box = $('modalBox');
  bindIdentityAvatar(box, function(){ return it; });
  box.querySelector('#idColorClear').addEventListener('click', function(){
    box.querySelector('#idColor').dataset.off = '1';
  });
}

renderers.card = function(){
  ensureIdentities();
  var me = curIdentity() || {name:'我'};
  // 上面：当前身份的大卡
  $('cardBox').innerHTML =
      identityAvatarHTML(me, 64)
    + '<div class="row" style="gap:14px;margin-bottom:12px;">'
    + '<div><div style="font-size:19px;font-weight:600;">' + esc(me.name) + '</div>'
    + '<div class="hint">' + (me.relation ? esc(me.relation) + ' · ' : '') + (me.gender || '性别没填')
    + (me.age ? ' · ' + esc(me.age) + '岁' : '') + '</div>'
    + '<div class="hint" style="margin-top:2px;">他叫你「' + esc(state.persona.callMe || me.name) + '」</div></div></div>'
    + '<div class="m" style="font-size:13px;line-height:1.9;">'
    + '性格：' + esc(me.personality || '（还没填）') + '<br>'
    + '背景经历：' + esc(me.background || '（还没填）') + '<br>'
    + '和他的关系：' + esc(me.relation || '（还没填）') + '<br>'
    + '备注：' + esc(me.note || '（还没填）')
    + '</div>'
    + '<div class="btn-row" style="margin-top:12px;">'
    + '<button class="btn small" id="idEditCur">改这个身份</button>'
    + '<button class="btn small ghost" id="idSwitchHere">切换身份</button></div>';
  bindIdentityAvatar($('cardBox'), function(){ return curIdentity(); }, function(){
    // 列表里的那一张也跟着换
    try{ renderers.card(); }catch(e){}
  });
  $('idEditCur').onclick = function(){ openIdentityModal(me); };
  $('idSwitchHere').onclick = function(){ openSwitchIdentityModal(); };
  // 下面：所有身份的列表
  $('idList').innerHTML = state.identities.map(function(it){
    var on = it.id === state.curIdentity;
    return '<div class="item"' + (on ? ' style="outline:2px solid var(--c-primary);"' : '') + '>'
      + '<div class="row between"><div class="row" style="gap:10px;">' + idAvatar(it, 40)
      + '<div><div class="t">' + esc(it.name) + (on ? ' <span class="badge">当前</span>' : '') + '</div>'
      + '<div class="m">' + esc([it.gender, it.relation].filter(Boolean).join(' · ') || '（还没填资料）') + '</div></div></div>'
      + '<div class="acts"><button class="btn small ' + (on ? 'ghost' : '') + '" data-iduse="' + it.id + '">' + (on ? '正在用' : '用这个') + '</button>'
      + '<button class="btn small ghost" data-idedit="' + it.id + '">改</button>'
      + '<button class="btn small ghost" data-iddel="' + it.id + '">删</button></div></div></div>';
  }).join('');
  $$('[data-iduse]', $('idList')).forEach(function(el){
    el.addEventListener('click', function(){ switchIdentity(el.getAttribute('data-iduse')); });
  });
  $$('[data-idedit]', $('idList')).forEach(function(el){
    el.addEventListener('click', function(){
      var it = state.identities.filter(function(x){ return x.id === el.getAttribute('data-idedit'); })[0];
      if(it) openIdentityModal(it);
    });
  });
  $$('[data-iddel]', $('idList')).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-iddel');
      if(state.identities.length <= 1){ toast('至少要留一个身份'); return; }
      openModal('删掉这个身份？', '<div class="hint">身份本身会被删掉，聊天记录都还在。</div>',
        [{text:'删掉', cls:'danger', fn:function(){
          state.identities = state.identities.filter(function(x){ return x.id !== id; });
          if(state.curIdentity === id) state.curIdentity = state.identities[0].id;
          save('identities'); save('curIdentity'); renderers.card();
        }}, {text:'取消', cls:'ghost'}]);
    });
  });
};
// 聊天里也能快速换身份
function openSwitchIdentityModal(){
  ensureIdentities();
  openModal('用哪个身份和他说话',
    '<div class="list">' + state.identities.map(function(it){
      var on = it.id === state.curIdentity;
      return '<div class="item"' + (on ? ' style="outline:2px solid var(--c-primary);"' : '') + '>'
        + '<div class="row between"><div class="row" style="gap:10px;">' + idAvatar(it, 36)
        + '<div><div class="t">' + esc(it.name) + '</div><div class="m">'
        + esc([it.gender, it.relation].filter(Boolean).join(' · ') || '（还没填资料）') + '</div></div></div>'
        + '<button class="btn small ' + (on ? 'ghost' : '') + '" data-usethis="' + it.id + '">' + (on ? '正在用' : '用这个') + '</button></div></div>';
    }).join('') + '</div>'
    + '<div class="btn-row" style="margin-top:12px;"><button class="btn small ghost" id="goNewId">＋ 新建一个身份</button></div>',
    [{text:'关闭', cls:'ghost'}]);
  $$('[data-usethis]', $('modalBox')).forEach(function(el){
    el.addEventListener('click', function(){
      switchIdentity(el.getAttribute('data-usethis'));
      closeModal();
    });
  });
  $('goNewId').onclick = function(){ closeModal(); go('card'); setTimeout(function(){ openIdentityModal(null); }, 200); };
}
$('btnEditCard').addEventListener('click', function(){ ensureIdentities(); openIdentityModal(null); });

/* =====================================================================
   第 11 段：记忆 / 人设卡 / 世界书 / 接口 / 备份 / 设置
   ===================================================================== */

/* ---------- 记忆 ---------- */
renderers.memory = function(){
  var showSecret = $('memShowSecret').checked;
  var list = state.memory.filter(function(m){ return showSecret || !m.secret; });
  $('memCount').textContent = '共 ' + state.memory.length + ' 条（含 ' + state.memory.filter(function(m){ return m.secret; }).length + ' 条秘密）';
  var box = $('memList');
  if(!list.length){ box.innerHTML = '<div class="empty">还没有记忆</div>'; return; }
  box.innerHTML = list.map(function(m){
    return '<div class="item">'
      + '<div class="t">' + (m.secret ? lnIcon('lock', 13) + ' ' : '') + esc(m.text) + '</div>'
      + '<div class="m">' + fmtFull(m.ts) + (m.tag ? ' · ' + esc(m.tag) : '') + '</div>'
      + '<div class="acts">'
      + '<button class="btn small ghost" data-medit="' + m.id + '">改</button>'
      + '<button class="btn small ghost" data-msecret="' + m.id + '">' + (m.secret ? '取消秘密' : '设为秘密') + '</button>'
      + '<button class="btn small ghost" data-mdel="' + m.id + '">删</button>'
      + '</div></div>';
  }).join('');
  $$('[data-medit]', box).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-medit');
      var m = state.memory.filter(function(x){ return x.id === id; })[0]; if(!m) return;
      openModal('修改记忆',
        '<textarea id="mt">' + esc(m.text) + '</textarea>'
        + '<label class="fld">标签（可留空，写「习惯」他会在合适时间关心你）</label><input type="text" id="mg" value="' + esc(m.tag||'') + '">',
        [{text:'保存', fn:function(box){
          m.text = box.querySelector('#mt').value; m.tag = box.querySelector('#mg').value;
          save('memory'); renderers.memory();
        }}]);
    });
  });
  $$('[data-msecret]', box).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-msecret');
      state.memory.forEach(function(m){ if(m.id === id) m.secret = !m.secret; });
      save('memory'); renderers.memory();
    });
  });
  $$('[data-mdel]', box).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-mdel');
      state.memory = state.memory.filter(function(m){ return m.id !== id; });
      save('memory'); renderers.memory();
    });
  });
};
$('memShowSecret').addEventListener('change', function(){ renderers.memory(); });
$('btnAddMem').addEventListener('click', function(){
  openModal('新建记忆',
      '<textarea id="mNew" placeholder="例如：她怕黑，晚上要留一盏灯"></textarea>'
    + '<label class="row" style="margin-top:8px;font-size:13px;"><input type="checkbox" id="mSec" style="width:auto;"> 设为秘密记忆（平时不显示）</label>'
    + '<label class="fld">标签</label><input type="text" id="mTag" placeholder="可留空，或写「习惯」">',
    [{text:'存起来', fn:function(box){
      var t = (box.querySelector('#mNew').value || '').trim();
      if(!t){ toast('写点什么'); return; }
      addMemory(t, box.querySelector('#mSec').checked, box.querySelector('#mTag').value);
      renderers.memory(); toast('记住了');
    }}]);
});

/* ---------- 人设卡：可以有很多张，随时切换 ---------- */
// 把旧的「单张人设卡」升级成多张（老数据不会丢）
function ensurePersonas(){
  if(!state.personas || !state.personas.length){
    var old = state.persona || {};
    var one = {};
    for(var k in DEFAULT_PERSONA) one[k] = (old[k] !== undefined && old[k] !== null) ? old[k] : DEFAULT_PERSONA[k];
    one.id = uid(); one.ts = old.ts || Date.now();
    state.personas = [one];
    state.curPersona = one.id;
    save('personas'); save('curPersona');
  }
  // 缺的新栏位补上，免得老卡报错
  state.personas.forEach(function(p){
    if(!p.id) p.id = uid();
    for(var k in DEFAULT_PERSONA){ if(p[k] === undefined) p[k] = DEFAULT_PERSONA[k]; }
  });
  state.persona = curPersona() || state.personas[0];
  save('persona'); save('personas');
}
// 当前这张人设卡
function curPersona(){
  if(!state.personas || !state.personas.length) return null;
  var list = state.personas.filter(function(p){ return p.id === state.curPersona; });
  return list.length ? list[0] : state.personas[0];
}
// 换一张人设卡（会记一条聊天提示，让他知道换人了）
function switchPersona(id){
  try{ applyChatBg(); }catch(e){}
  var p = state.personas.filter(function(x){ return x.id === id; })[0];
  if(!p) return;
  state.curPersona = id;
  state.persona = p;
  state.curPid = id; LS.set('curPid', id);   // 切到单人会话，群聊状态也跟着退出
  save('curPersona'); save('persona');
  syncGrowthToPersona();          // 换人就把亲密度指到他那张卡上
  state.settings.hisName = p.name || '他';
  save('settings');
  pushMessage('sys', '现在和你说话的是「' + (p.name || '他') + '」', 'text');
  toast('已切换到：' + (p.name || '他'));
  renderers.persona();
  if(inChat()) renderChat();
}
// 按栏位表渲染表单（一行一个）
function personaFormHTML(p){
  var h = '';
  PERSONA_FIELDS.forEach(function(f){
    h += (f.type === 'area' ? area(f.l, 'p_' + f.k, p[f.k]) : fld(f.l, 'p_' + f.k, p[f.k]));
  });
  return h;
}
// 从表单里把值读回来
function readPersonaForm(p){
  PERSONA_FIELDS.forEach(function(f){
    var el = $('p_' + f.k);
    if(el) p[f.k] = el.value;
  });
}
// 人设卡分成两页：char（主要联系人，你自己建的那几张） / npc（关系网里自动生成的简易卡）
var personaTab = 'char';
function personaTabsHTML(){
  return '<div class="btn-row" style="margin-bottom:12px;">'
    + '<button class="btn small ' + (personaTab === 'char' ? '' : 'ghost') + '" data-ptab="char">char · 主要联系人</button>'
    + '<button class="btn small ' + (personaTab === 'npc' ? '' : 'ghost') + '" data-ptab="npc">npc · 关系网的人</button>'
    + '</div>';
}
function bindPersonaTabs(){
  var box = $('personaBody'); if(!box) return;
  $$('[data-ptab]', box).forEach(function(el){
    el.addEventListener('click', function(){ personaTab = el.getAttribute('data-ptab'); renderers.persona(); });
  });
}
renderers.persona = function(){
  ensurePersonas(); ensureWx(); ensureIdentities();
  syncNpc();                      // char 卡关系网里写到的人，自动补成 npc 卡
  if(personaTab === 'npc'){       // npc 分页单独一整套，内容跟 char 完全不同
    renderNpcBoard();
    bindPersonaTabs();
    return;
  }
  var p = state.persona;
  var html = personaTabsHTML();
  // 关系网里加进来的人会自动带一张「轻量卡」，不在人设卡列表里占位置
  var cards = state.personas.filter(function(x){ return !x.netId; });
  // 上面：所有人设卡，点一下就能换
  html += '<div class="card glass"><h3>我的人设卡（' + cards.length + ' 张）</h3><div class="list">'
    + cards.map(function(x){
        var on = x.id === state.curPersona;
        return '<div class="item"' + (on ? ' style="outline:2px solid var(--c-primary);"' : '') + '>'
          + '<div class="row between"><div class="row" style="gap:10px;">'
          + wxAvaHTML('him', x, 36)
          + '<div><div class="t">' + esc(x.name||'他') + (on ? ' <span class="badge">正在用</span>' : '') + '</div>'
          + '<div class="m">' + esc([x.gender, x.age].filter(Boolean).join(' · ') || '（还没填资料）') + '</div></div></div>'
          + '<div class="acts"><button class="btn small ' + (on ? 'ghost' : '') + '" data-puse="' + x.id + '">' + (on ? '正在用' : '用这个') + '</button>'
          + '<button class="btn small ghost" data-pdel="' + x.id + '">删</button></div></div></div>';
      }).join('')
    + '</div><div class="btn-row" style="margin-top:10px;"><button class="btn small" id="pNew">＋ 新建一张人设卡</button></div></div>';
  // 中间：他的微信名片（头像 + 微信名称 + 微信号，可以按人设卡自动生成）
  ensureWx();
  ensurePersonas();
  var avaId = (state.wx.ava.him || {})[p.id];
  html += '<div class="card glass"><h3>他的微信名片</h3>'
    // 头像：上传的图存在图片库，按人设卡 id 记在 state.wx.ava.him 里，
    // 聊天气泡 / 联系人 / 好友圈 / 亲密度 都用 wxAvaHTML 读同一份，所以改一处全同步
    + '<div class="row" style="gap:12px;align-items:center;margin-bottom:12px;">'
    + '<span id="pAvaBox" class="p-ava-box">' + wxAvaHTML('him', p, 60) + '</span>'
    + '<div style="flex:1;min-width:0;">'
    + '<div class="fld" style="margin:0;">他的头像</div>'
    + '<div class="btn-row" style="margin-top:6px;gap:6px;">'
    + '<button class="btn small" id="pAvaUpload">从设备上传</button>'
    + '<button class="btn small ghost" id="pAvaAlbum">从相册选</button>'
    + '<button class="btn small ghost" id="pAvaClear"' + (avaId ? '' : ' style="display:none;"') + '>恢复默认</button>'
    + '</div>'
    + '<div class="hint" style="margin-top:6px;">换好会同步到聊天头像、联系人、好友圈和亲密度。</div>'
    + '</div></div>'
    + '<div class="hint" style="margin-bottom:8px;line-height:1.8;">'
    + '「微信名称」是他在微信里显示的名字，留空就用上面「他叫什么」那一栏。<br>'
    + '「微信号」留空会<b>根据这张人设卡自动生成</b>（按名字、性别、年龄、说话方式算出来，同一张卡每次都一样）；你想自己定就填一个。'
    + '</div>'
    + fld('微信名称', 'pwxName', p.wxName || '')
    + fld('微信号', 'pwxId', p.wxid || '')
    + '<div class="hint" style="margin-top:6px;">现在会显示成：<b style="color:var(--c-primary);">' + esc(pWxName(p)) + '</b>'
    + '　·　微信号：<b style="color:var(--c-primary);">' + esc(pWxid(p)) + '</b></div>'
    + '<div class="btn-row" style="margin-top:8px;gap:8px;">'
    + '<button class="btn small" id="pWxSave">保存名片</button>'
    + '<button class="btn small ghost" id="pWxAuto">按人设卡自动生成微信号</button>'
    + '<button class="btn small ghost" id="pWxClear">清空微信号</button>'
    + '</div></div>';
  // 下面：当前这张的编辑表单
  html += '<div class="card glass"><h3>正在编辑：' + esc(p.name || '他') + '</h3>'
    + personaFormHTML(p)
    + '<div class="btn-row" style="margin-top:12px;"><button class="btn block" id="pSave">保存并生效</button></div>'
    + '<div class="hint" style="margin-top:8px;">保存之后立刻生效：下一次回复就会按这张人设来。上面那张卡可以切，点「用这个」就换成他；右上角「导入」会把一份已有的角色卡（json 或纯文本）变成一张<b>新卡</b>，不会覆盖现在这张。</div>'
    + '</div>';
  $('personaBody').innerHTML = html;
  $('pSave').addEventListener('click', function(){
    readPersonaForm(state.persona);
    state.persona.name = state.persona.name || '他';
    save('persona'); save('personas');
    state.settings.hisName = state.persona.name; save('settings');
    toast('已保存，立刻生效');
    renderChat();
    renderers.persona();
  });
  // 头像：换图后立刻刷新这一处 + 其它用到头像的界面
  // 只就地换掉头像和按钮，不整页重渲染 —— 否则表单里还没保存的输入会被冲掉
  function afterAvatarChange(){
    ensureWx();
    var box = $('pAvaBox');
    if(box) box.innerHTML = wxAvaHTML('him', state.persona, 60);
    var clr = $('pAvaClear');
    if(clr) clr.style.display = (state.wx.ava.him || {})[state.persona.id] ? '' : 'none';
    try{ renderChat(); }catch(e){}
    try{ if(currentScreen === 'call' && wxPane === 'contact') renderWxContact(); }catch(e){}
  }
  if($('pAvaUpload')) $('pAvaUpload').addEventListener('click', function(){
    // 注意：这里不能用「点完按钮立刻读 files」——选图是异步的，只能等回调。
    // 而且回调里必须先判断有没有选到：用户取消时拿到的是空数组。
    pickFile('image/*', false, function(files){
      var f = files && files[0];
      if(!f){ return; }                       // 用户取消了，什么都不做，别把已有头像清掉
      applyAvatar('him', state.persona.id, f, function(){
        afterAvatarChange();
        toast('头像已更换');
      });
    });
  });
  if($('pAvaAlbum')) $('pAvaAlbum').addEventListener('click', function(){
    refreshAlbum(function(list){
      if(!list.length){ toast('相册还是空的，先用「从设备上传」'); return; }
      openModal('选一张图当头像',
        '<select id="pAvaSel">' + list.map(function(i){
          return '<option value="' + esc(i.id) + '">' + esc(i.name || '图片') + '</option>';
        }).join('') + '</select>',
        [{text:'就用这张', fn:function(b){
          var id2 = b.querySelector('#pAvaSel').value;
          ensureWx();
          state.wx.ava.him[state.persona.id] = id2;
          wxSave();
          afterAvatarChange();
          toast('头像已更换');
        }}, {text:'取消', cls:'ghost'}]);
    });
  });
  if($('pAvaClear')) $('pAvaClear').addEventListener('click', function(){
    clearAvatar('him', state.persona.id);
    afterAvatarChange();
    toast('已恢复成名字首字');
  });
  // 微信名片：保存 / 自动生成 / 清空
  $('pWxSave').addEventListener('click', function(){
    state.persona.wxName = ($('pwxName').value || '').trim();
    state.persona.wxid   = ($('pwxId').value || '').trim();
    save('persona'); save('personas');
    toast('微信名片已保存');
    renderers.persona();
    if(inChat()) renderChat();
  });
  $('pWxAuto').addEventListener('click', function(){
    state.persona.wxid = autoWxid(state.persona);
    save('persona'); save('personas');
    toast('已生成微信号：' + state.persona.wxid);
    renderers.persona();
    if(inChat()) renderChat();
  });
  $('pWxClear').addEventListener('click', function(){
    state.persona.wxid = '';
    save('persona'); save('personas');
    toast('已清空，改用自动生成的：' + autoWxid(state.persona));
    renderers.persona();
    if(inChat()) renderChat();
  });
  $('pNew').addEventListener('click', function(){
    var np = {};
    for(var k in DEFAULT_PERSONA) np[k] = DEFAULT_PERSONA[k];
    np.id = uid(); np.ts = Date.now(); np.name = '他' + (state.personas.length + 1);
    state.personas.push(np);
    switchPersona(np.id);
    toast('新建了一张，填一填吧');
  });
  $$('[data-puse]', $('personaBody')).forEach(function(el){
    el.addEventListener('click', function(){ switchPersona(el.getAttribute('data-puse')); });
  });
  $$('[data-pdel]', $('personaBody')).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-pdel');
      if(state.personas.length <= 1){ toast('至少要留一张人设卡'); return; }
      var p2 = state.personas.filter(function(x){ return x.id === id; })[0];
      openModal('删掉这张人设卡？', '<div class="hint">「' + esc(p2.name) + '」这张会被删掉，聊天记录都还在。</div>',
        [{text:'删掉', cls:'danger', fn:function(){
          state.personas = state.personas.filter(function(x){ return x.id !== id; });
          if(state.curPersona === id){
            state.curPersona = state.personas[0].id;
            state.persona = state.personas[0];
            save('curPersona'); save('persona');
          }
          save('personas'); renderers.persona();
          if(inChat()) renderChat();
        }}, {text:'取消', cls:'ghost'}]);
    });
  });
  bindPersonaTabs();
};

/* ---------- npc 分页：char 卡「关系网」里写到的人，自动生成简易人设卡 ---------- */
// 判断一张卡是不是 npc 卡（有 netId 的轻量卡都算，包括加好友时生成的）
function isNpcCard(p){ return !!(p && (p.netId || p.npc)); }
// 某张 char 卡名下的 npc
function npcsOf(pid){
  ensurePersonas();
  return state.personas.filter(function(p){ return isNpcCard(p) && p.npcOf === pid; });
}
// 把 char 卡关系网里的人补成 npc 卡（已经在的不会重复建）
function syncNpc(){
  ensureWx(); ensurePersonas(); ensureIdentities();
  syncNet();
  var made = 0;
  wxNet().forEach(function(n){
    if(!n.from) return;                                   // 只处理人设卡关系网里出来的
    var src = state.personas.filter(function(x){ return x.id === n.from && !isNpcCard(x); })[0];
    if(!src) return;                                      // 来源的 char 卡已经删了，别生成孤儿 npc
    var card = state.personas.filter(function(x){ return x.netId === n.id; })[0];
    if(!card){ card = netPersonaFor(n); made++; }
    if(card){
      card.npc = true;
      card.npcOf = n.from;
      card.netOf = src.name || '';
      if(!card.relation) card.relation = n.rel || '';
    }
  });
  if(made) save('personas');
  return made;
}
// npc 分页整页
function renderNpcBoard(){
  ensurePersonas(); ensureWx();
  var chars = state.personas.filter(function(x){ return !isNpcCard(x); });
  var html = personaTabsHTML();
  html += '<div class="card glass"><h3>npc 分页</h3>'
    + '<div class="hint" style="line-height:1.8;">'
    + 'char 分页里那几张人设卡的<b>「关系网」</b>写到的人（家人、朋友、同事……），会自动识别并生成一张<b>简易人设卡</b>放进这里。<br>'
    + '改一改 char 卡的关系网，或者点「重新识别」，这里会跟着变。<br>'
    + 'npc 可以在好友圈里发动态，TA 所属的那个 char 会去点赞 / 评论；这些互动在<b>查手机</b>里也能翻到。</div>'
    + '<div class="btn-row" style="margin-top:10px;">'
    + '<button class="btn small" id="npcRescan">重新识别关系网</button>'
    + '<button class="btn small ghost" id="npcAdd">＋ 手动加一个 npc</button></div></div>';
  if(!chars.length){
    html += '<div class="empty">先去 char 分页建一张人设卡</div>';
  }
  chars.forEach(function(c){
    var ns = npcsOf(c.id);
    html += '<div class="card glass"><h3>' + esc(c.name || '他') + ' 的 npc（' + ns.length + '）</h3>';
    if(!ns.length){
      html += '<div class="hint">这张卡的「关系网」还是空的。写几个人进去（比如「妈妈：家人」「小李：同事」），这里就会自动生成。</div>';
    } else {
      html += '<div class="list">';
      ns.forEach(function(p){
        html += '<div class="item"><div class="row between">'
          + '<div class="row" style="gap:10px;min-width:0;">' + wxAvaHTML('him', p, 40)
          + '<div style="min-width:0;"><div class="t">' + esc(p.name || '?')
          + (p.relation ? ' <span class="badge">' + esc(p.relation) + '</span>' : '') + '</div>'
          + '<div class="m">' + esc([p.gender, p.age].filter(Boolean).join(' · ') || '简易卡')
          + ' · 微信号：' + esc(pWxid(p)) + '</div></div></div>'
          + '<div class="acts"><button class="btn small ghost" data-npcedit="' + p.id + '">改</button>'
          + '<button class="btn small ghost" data-npcfriend="' + p.id + '">加好友</button>'
          + '<button class="btn small ghost" data-npcdel="' + p.id + '">删</button></div>'
          + '</div></div>';
      });
      html += '</div>';
    }
    html += '</div>';
  });
  $('personaBody').innerHTML = html;
  var box = $('personaBody');
  if($('npcRescan')) $('npcRescan').onclick = function(){
    // 先把旧的自动卡清掉再重扫，保证改名 / 删人后不留残留
    state.personas = state.personas.filter(function(p){ return !isNpcCard(p) || !p.npcOf; });
    save('personas');
    var n = syncNpc();
    renderers.persona();
    toast(n ? ('识别到 ' + n + ' 个 npc') : '关系网里没有新人');
  };
  if($('npcAdd')) $('npcAdd').onclick = function(){
    if(!chars.length){ toast('先建一张 char 人设卡'); return; }
    openNpcModal(null, (state.personas.filter(function(x){ return x.id === state.curPersona; })[0] || chars[0]).id);
  };
  $$('[data-npcedit]', box).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-npcedit');
      var p = state.personas.filter(function(x){ return x.id === id; })[0];
      if(p) openNpcModal(p, p.npcOf || '');
    });
  });
  $$('[data-npcfriend]', box).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-npcfriend');
      var p = state.personas.filter(function(x){ return x.id === id; })[0];
      if(!p) return;
      var n = wxNet().filter(function(x){ return x.id === p.netId; })[0];
      if(!n){ toast('这张 npc 卡没有对应的关系网条目'); return; }
      netAddFriend(n, p.netOf || '', true);
      toast('已加为好友，去微信里就能聊了');
      renderers.persona();
    });
  });
  $$('[data-npcdel]', box).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-npcdel');
      var p = state.personas.filter(function(x){ return x.id === id; })[0];
      openModal('删掉这个 npc？', '<div class="hint">「' + esc((p && p.name) || '?') + '」会被删掉。如果 TA 的 char 卡关系网里还写着 TA，下次识别会再生成一张。</div>',
        [{text:'删掉', cls:'danger', fn:function(){
          state.personas = state.personas.filter(function(x){ return x.id !== id; });
          save('personas'); renderers.persona();
        }}, {text:'取消', cls:'ghost'}]);
    });
  });
}
// npc 简易卡的编辑弹窗
function openNpcModal(p, ownerPid){
  ensurePersonas(); ensureWx();
  var isNew = !p;
  if(!p){
    p = {};
    for(var k in DEFAULT_PERSONA) p[k] = DEFAULT_PERSONA[k];
    p.id = uid(); p.ts = Date.now(); p.name = '';
  }
  var chars = state.personas.filter(function(x){ return !isNpcCard(x); });
  var own = ownerPid || p.npcOf || (chars[0] && chars[0].id) || '';
  var body = genericAvatarHTML('him', p, 56, '换好会同步到聊天、联系人、好友圈和查手机。')
    + '<label class="fld">名字</label><input type="text" id="npName" value="' + esc(p.name || '') + '" placeholder="例如：妈妈 / 小李">'
    + '<label class="fld">和 TA 的关系</label><input type="text" id="npRel" value="' + esc(p.relation || '') + '" placeholder="例如：家人 / 朋友 / 同事">'
    + '<label class="fld">属于谁的关系网</label><select id="npOwn">'
    + chars.map(function(c){
        return '<option value="' + esc(c.id) + '"' + (c.id === own ? ' selected' : '') + '>' + esc(c.name || '他') + '</option>';
      }).join('') + '</select>'
    + '<label class="fld">性别</label><input type="text" id="npGender" value="' + esc(p.gender || '') + '">'
    + '<label class="fld">年龄</label><input type="text" id="npAge" value="' + esc(p.age || '') + '">'
    + '<label class="fld">说话方式</label><textarea id="npTone">' + esc(p.tone || '') + '</textarea>'
    + '<label class="fld">背景（和 TA 是什么关系、平时怎么相处）</label><textarea id="npBg">' + esc(p.background || '') + '</textarea>'
    + '<label class="fld">喜好</label><textarea id="npLikes">' + esc(p.likes || '') + '</textarea>';
  openModal(isNew ? '新建一个 npc' : '改这个 npc', body,
    [{text:'保存', fn:function(box){
      p.name = (box.querySelector('#npName').value || '').trim() || '未命名';
      p.relation = (box.querySelector('#npRel').value || '').trim();
      p.gender = box.querySelector('#npGender').value;
      p.age = box.querySelector('#npAge').value;
      p.tone = box.querySelector('#npTone').value;
      p.background = box.querySelector('#npBg').value;
      p.likes = box.querySelector('#npLikes').value;
      var oid = box.querySelector('#npOwn').value;
      p.npc = true; p.npcOf = oid;
      var src = state.personas.filter(function(x){ return x.id === oid; })[0];
      p.netOf = (src && src.name) || '';
      if(!p.relation) p.relation = '熟人';
      if(isNew){
        // 手动建的也要挂一条关系网条目，这样好友圈、联系人、查手机都能认
        var n = ensureNetEntry(p.name, p.relation, oid);
        p.netId = n.id; n.pid = p.id;
        wxSave();
        state.personas.push(p);
      }
      save('personas');
      renderers.persona();
      toast('已保存');
    }}, {text:'取消', cls:'ghost'}]);
  bindGenericAvatar($('modalBox'), 'him', function(){ return p; });
}
// 通用头像上传行（人设卡 / npc 卡都能用）
function genericAvatarHTML(who, obj, size, hint){
  ensureWx();
  var key = (obj && obj.id) || '';
  var imgId = (state.wx.ava[who] || {})[key];
  return '<div class="row" style="gap:12px;align-items:center;margin-bottom:10px;">'
    + '<span data-gava="' + esc(key) + '">' + wxAvaHTML(who, obj, size || 56) + '</span>'
    + '<div style="flex:1;min-width:0;">'
    + '<div class="fld" style="margin:0;">头像</div>'
    + '<div class="btn-row" style="margin-top:6px;gap:6px;">'
    + '<button class="btn small" data-gavaup="1">从设备上传</button>'
    + '<button class="btn small ghost" data-gavaal="1">从相册选</button>'
    + '<button class="btn small ghost" data-gavaclr="1"' + (imgId ? '' : ' style="display:none;"') + '>恢复默认</button>'
    + '</div>'
    + '<div class="hint" style="margin-top:6px;">' + esc(hint || '') + '</div>'
    + '</div></div>';
}
function bindGenericAvatar(box, who, getObj, after){
  if(!box) return;
  var up = box.querySelector('[data-gavaup]');
  var al = box.querySelector('[data-gavaal]');
  var clr = box.querySelector('[data-gavaclr]');
  function redraw(){
    var o = getObj(); if(!o) return;
    var h = box.querySelector('[data-gava]');
    if(h) h.innerHTML = wxAvaHTML(who, o, 56);
    if(clr) clr.style.display = (state.wx.ava[who] || {})[o.id] ? '' : 'none';
    if(after) after();
  }
  if(up) up.addEventListener('click', function(){
    var o = getObj(); if(!o) return;
    pickFile('image/*', false, function(files){
      var f = files && files[0]; if(!f) return;
      applyAvatar(who, o.id, f, function(){ redraw(); toast('头像已更换'); });
    });
  });
  if(al) al.addEventListener('click', function(){
    var o = getObj(); if(!o) return;
    refreshAlbum(function(list){
      if(!list.length){ toast('相册还是空的，先用「从设备上传」'); return; }
      openModal('选一张图当头像',
        '<select id="gAvaSel">' + list.map(function(i){
          return '<option value="' + esc(i.id) + '">' + esc(i.name || '图片') + '</option>';
        }).join('') + '</select>',
        [{text:'就用这张', fn:function(b){
          ensureWx();
          state.wx.ava[who][o.id] = b.querySelector('#gAvaSel').value;
          wxSave(); redraw(); toast('头像已更换');
        }}, {text:'取消', cls:'ghost'}]);
    });
  });
  if(clr) clr.addEventListener('click', function(){
    var o = getObj(); if(!o) return;
    clearAvatar(who, o.id); redraw(); toast('已恢复成名字首字');
  });
}
// 表单小工具：单行输入 / 多行输入
function fld(label, id, val){
  return '<label class="fld">' + label + '</label><input type="text" id="' + id + '" value="' + esc(val||'') + '">';
}
function area(label, id, val){
  return '<label class="fld">' + label + '</label><textarea id="' + id + '">' + esc(val||'') + '</textarea>';
}
// 导入已有角色卡（json 或纯文本）
$('btnImportPersona').addEventListener('click', function(){
  pickFile('.json,.txt', false, function(files){
    var f = files[0]; if(!f) return;
    var r = new FileReader();
    r.onload = function(){
      var txt = String(r.result || '');
      // 导入总是新建一张卡，不会覆盖你现在的卡
      var np = {};
      for(var k in DEFAULT_PERSONA) np[k] = DEFAULT_PERSONA[k];
      np.id = uid(); np.ts = Date.now();
      try{
        var o = JSON.parse(txt);   // 先当 json 解析
        var d = o.data || o;
        np.name        = d.name || d.char_name || o.name || np.name;
        np.callMe      = d.callMe || d.user_name || np.callMe;
        np.gender      = d.gender || '';
        np.age         = d.age || '';
        np.body        = d.body || d.appearance || '';
        np.outfit      = d.outfit || '';
        np.face        = d.face || '';
        np.likes       = d.likes || '';
        np.background  = d.background || d.scenario || '';
        np.social      = d.social || '';
        np.tone        = d.tone || d.personality || d.description || np.tone;
        np.catchphrase = d.catchphrase || d.catch || np.catchphrase;
        np.taboo       = d.taboo || d.forbid || np.taboo;
        np.first       = d.first || d.first_mes || d.greeting || np.first;
        np.extra       = d.extra || '';
        tip = '已导入角色卡';
      }catch(e){
        // 不是 json 就当纯文本：按「名字：xxx」这样的行来填
        txt.split(/\r?\n/).forEach(function(line){
          var m = line.match(/^\s*(.{2,8})[:：]\s*(.+)$/);
          if(!m) return;
          var k = m[1], v = m[2].trim();
          if(/名|名字|姓名|name/.test(k)) np.name = v;
          else if(/称呼/.test(k)) np.callMe = v;
          else if(/性别/.test(k)) np.gender = v;
          else if(/年龄|岁/.test(k)) np.age = v;
          else if(/身材|外形/.test(k)) np.body = v;
          else if(/穿衣|穿着|打扮/.test(k)) np.outfit = v;
          else if(/五官|长相|样貌/.test(k)) np.face = v;
          else if(/喜好|喜欢|爱好/.test(k)) np.likes = v;
          else if(/背景|经历|身世/.test(k)) np.background = v;
          else if(/关系|人脉/.test(k)) np.social = v;
          else if(/性格|性子|说话|personality/.test(k)) np.tone = v;
          else if(/口头禅/.test(k)) np.catchphrase = v;
          else if(/雷区|不说|禁止/.test(k)) np.taboo = v;
          else if(/第一句|开场|问候/.test(k)) np.first = v;
          else np.extra += (np.extra ? '\n' : '') + k + '：' + v;
        });
        tip = '已按文本导入';
      }
      ensurePersonas();
      state.personas.push(np);
      save('personas');
      switchPersona(np.id);
      toast(tip);
    };
    var tip = '';
    r.readAsText(f);
  });
});

/* ---------- 世界书（带分类文件夹） ---------- */
var worldFolder = '';   // 当前正在看哪个文件夹（'' = 全部）

/* --- 文件夹 --- */
function ensureWorldFolders(){
  if(!state.worldFolders || Object.prototype.toString.call(state.worldFolders) !== '[object Array]') state.worldFolders = [];
  state.worldFolders.forEach(function(f){ if(!f.id) f.id = uid(); if(!f.name) f.name = '未命名'; });
  save('worldFolders');
  return state.worldFolders;
}
function folderName(fid){
  if(!fid) return '';
  var f = (state.worldFolders || []).filter(function(x){ return x.id === fid; })[0];
  return f ? f.name : '';
}
// 文件夹下拉（新建/修改设定时选一个）
function folderOptions(sel){
  var h = '<option value=""' + (!sel ? ' selected' : '') + '>（不分类）</option>';
  (state.worldFolders || []).forEach(function(f){
    h += '<option value="' + f.id + '"' + (f.id === sel ? ' selected' : '') + '>' + esc(f.name) + '</option>';
  });
  return h;
}
// 这个文件夹里有多少条设定
function folderCount(fid){
  return state.world.filter(function(w){ return (w.folderId || '') === fid; }).length;
}
function openFolderModal(f){
  var isNew = !f;
  f = f || {id:uid(), name:'', ts:Date.now()};
  openModal(isNew ? '新建文件夹' : '改文件夹名',
    '<label class="fld">名字</label><input type="text" id="fN" value="' + esc(f.name) + '" placeholder="例如：校园世界观">'
    + '<div class="hint" style="margin-top:6px;">文件夹只是用来分类，不影响设定是否被模型读到。</div>',
    [{text:'保存', fn:function(box){
      var n = (box.querySelector('#fN').value || '').trim();
      if(!n){ toast('给文件夹起个名字'); return; }
      f.name = n;
      if(isNew) state.worldFolders.push(f);
      save('worldFolders'); renderers.world();
      toast(isNew ? '文件夹建好了' : '已改名');
    }}, {text:'取消', cls:'ghost'}]);
}
function deleteFolder(fid){
  var n = folderCount(fid);
  openModal('删掉这个文件夹？',
    '<div class="hint">「' + esc(folderName(fid)) + '」会被删掉，里面的 ' + n + ' 条设定会挪到「不分类」，设定本身不会丢。</div>',
    [{text:'删掉', cls:'danger', fn:function(){
      state.worldFolders = (state.worldFolders || []).filter(function(x){ return x.id !== fid; });
      state.world.forEach(function(w){ if(w.folderId === fid) w.folderId = ''; });
      save('worldFolders'); save('world');
      if(worldFolder === fid) worldFolder = '';
      renderers.world(); toast('已删除文件夹');
    }}, {text:'取消', cls:'ghost'}]);
}
// 文件夹条：全部 + 各个文件夹 + 不分类
function renderWorldFolders(){
  var box = $('worldFolders');
  if(!box) return;
  var h = '<div class="folder-chip' + (worldFolder === '' ? ' on' : '') + '" data-wf="">全部 <span class="n">' + state.world.length + '</span></div>';
  ensureWorldFolders();
  var used = {};
  state.world.forEach(function(w){ used[w.folderId || ''] = true; });
  (state.worldFolders || []).forEach(function(f){
    h += '<div class="folder-chip' + (worldFolder === f.id ? ' on' : '') + '" data-wf="' + f.id + '">'
      + esc(f.name) + ' <span class="n">' + folderCount(f.id) + '</span>'
      + '<span class="fm" data-wfed="' + f.id + '" title="改名">✎</span>'
      + '<span class="fm" data-wfde="' + f.id + '" title="删除">✕</span></div>';
  });
  if(used['']) h += '<div class="folder-chip' + (worldFolder === '__none' ? ' on' : '') + '" data-wf="__none">不分类 <span class="n">' + folderCount('') + '</span></div>';
  box.innerHTML = h;
  $$('[data-wf]', box).forEach(function(el){
    el.addEventListener('click', function(){
      worldFolder = el.getAttribute('data-wf');
      renderers.world();
    });
  });
  $$('[data-wfed]', box).forEach(function(el){
    el.addEventListener('click', function(e){
      e.stopPropagation();
      var id = el.getAttribute('data-wfed');
      var f = (state.worldFolders || []).filter(function(x){ return x.id === id; })[0];
      if(f) openFolderModal(f);
    });
  });
  $$('[data-wfde]', box).forEach(function(el){
    el.addEventListener('click', function(e){
      e.stopPropagation();
      deleteFolder(el.getAttribute('data-wfde'));
    });
  });
}

renderers.world = function(){
  ensureWorldFolders();
  renderWorldFolders();
  var box = $('worldList');
  if(!box) return;
  // 按当前文件夹过滤
  var list = state.world.filter(function(w){
    if(worldFolder === '') return true;
    if(worldFolder === '__none') return !(w.folderId || '');
    return (w.folderId || '') === worldFolder;
  });
  if(!list.length){
    box.innerHTML = '<div class="empty">' + (state.world.length ? '这个文件夹里还没有设定' : '还没有设定，点右上角新建') + '</div>';
    return;
  }
  box.innerHTML = list.map(function(w){
    var fn = folderName(w.folderId);
    return '<div class="item">'
      + '<div class="row between"><b>' + esc(w.title) + (fn ? '<span class="w-folder">' + esc(fn) + '</span>' : '') + '</b>'
      + '<button class="btn small ' + (w.always ? '' : 'ghost') + '" data-walways="' + w.id + '">' + (w.always ? '常驻' : '不常驻') + '</button></div>'
      + '<div class="m">关键词：' + esc(w.keys || '（无）')
      + (w.personaId ? ' · 关联人设：' + esc(worldPersonaName(w) || '（已删除）') : ' · 通用') + '</div>'
      + '<div class="t" style="margin-top:6px;">' + esc(w.content) + '</div>'
      + '<div class="acts"><button class="btn small ghost" data-wedit="' + w.id + '">改</button>'
      + '<button class="btn small ghost" data-wmove="' + w.id + '">移到…</button>'
      + '<button class="btn small ghost" data-wdel="' + w.id + '">删</button></div></div>';
  }).join('');
  $$('[data-walways]', box).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-walways');
      state.world.forEach(function(w){ if(w.id === id) w.always = !w.always; });
      save('world'); renderers.world();
    });
  });
  $$('[data-wedit]', box).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-wedit');
      var w = state.world.filter(function(x){ return x.id === id; })[0]; if(!w) return;
      openWorldModal(w);
    });
  });
  $$('[data-wmove]', box).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-wmove');
      var w = state.world.filter(function(x){ return x.id === id; })[0]; if(!w) return;
      openModal('把「' + esc(w.title) + '」移到', '<label class="fld">文件夹</label><select id="mvF">' + folderOptions(w.folderId || '') + '</select>',
        [{text:'移过去', fn:function(b){
          w.folderId = b.querySelector('#mvF').value;
          save('world'); renderers.world(); toast('已移动');
        }}, {text:'取消', cls:'ghost'}]);
    });
  });
  $$('[data-wdel]', box).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-wdel');
      state.world = state.world.filter(function(w){ return w.id !== id; });
      save('world'); renderers.world();
    });
  });
};
function openWorldModal(w, presetFolder){
  var isNew = !w;
  w = w || {id:uid(), title:'', keys:'', content:'', always:false, personaId:'', folderId:presetFolder || ''};
  ensurePersonas(); ensureWorldFolders();
  // 关联人设：可以指定这条设定只对某一张人设卡生效
  var pOpts = '<option value=""' + (!w.personaId ? ' selected' : '') + '>所有人设（通用设定）</option>'
    + state.personas.map(function(p){
        return '<option value="' + p.id + '"' + (p.id === w.personaId ? ' selected' : '') + '>只给「' + esc(p.name || '他') + '」</option>';
      }).join('');
  // 文件夹：保存前先选好要存到哪一类
  var defFolder = isNew ? (presetFolder || (worldFolder === '__none' ? '' : worldFolder)) : (w.folderId || '');
  var fHtml = '<label class="fld">存到哪个文件夹</label><select id="wF">' + folderOptions(defFolder) + '</select>';
  openModal(isNew ? '新建设定' : '修改设定',
      '<label class="fld">标题</label><input type="text" id="wT" value="' + esc(w.title) + '">'
    + fHtml
    + '<label class="fld">关联人设</label><select id="wP">' + pOpts + '</select>'
    + '<label class="fld">关键词（多个用逗号隔开）</label><input type="text" id="wK" value="' + esc(w.keys) + '">'
    + '<label class="fld">内容</label><textarea id="wC">' + esc(w.content) + '</textarea>'
    + '<label class="row" style="margin-top:8px;font-size:13px;"><input type="checkbox" id="wA" style="width:auto;"' + (w.always ? ' checked' : '') + '> 常驻（每次都带上）</label>',
    [{text:'保存', fn:function(box){
      w.title = box.querySelector('#wT').value;
      var fsel = box.querySelector('#wF');
      w.folderId = fsel ? fsel.value : (w.folderId || '');
      w.personaId = box.querySelector('#wP').value;
      w.keys = box.querySelector('#wK').value;
      w.content = box.querySelector('#wC').value;
      w.always = box.querySelector('#wA').checked;
      if(isNew) state.world.unshift(w);
      save('world'); renderers.world();
    }}]);
}
// 这条设定对当前这张人设卡有效吗（没关联=通用，都有效）
function worldForCurrent(w){
  return !w.personaId || w.personaId === state.curPersona;
}
// 关联的人设叫什么（列表里显示用）
function worldPersonaName(w){
  if(!w.personaId) return '';
  var p = (state.personas || []).filter(function(x){ return x.id === w.personaId; })[0];
  return p ? (p.name || '他') : '';
}
$('btnAddWorld').addEventListener('click', function(){
  openWorldModal(null, (worldFolder === '__none' ? '' : worldFolder));
});
$('btnNewFolder').addEventListener('click', function(){ ensureWorldFolders(); openFolderModal(null); });
$('btnExportWorld').addEventListener('click', function(){
  downloadJSON('世界书.json', {type:'worldbook',
    folders:(state.worldFolders || []).map(function(f){ return {name:f.name}; }),
    list:state.world.map(function(w){ return {title:w.title, keys:w.keys, content:w.content, always:!!w.always, folder:folderName(w.folderId)}; })});
});
$('btnImportWorld').addEventListener('click', function(){
  pickFile('.json', false, function(files){
    var f = files[0]; if(!f) return;
    var r = new FileReader();
    r.onload = function(){
      try{
        var o = JSON.parse(String(r.result));
        var list = o.list || o.world || o;
        if(Object.prototype.toString.call(list) === '[object Array]'){
          // 文件里带着文件夹就一起建出来，并记住「导出时的文件夹名 → 新 id」的对应关系
          var name2id = {};
          (o.folders || []).forEach(function(f){
            var nf = {id:uid(), name:f.name || '未命名', ts:Date.now()};
            state.worldFolders.push(nf);
            name2id[f.name] = nf.id;
          });
          list.forEach(function(w){
            state.world.unshift({id:uid(), title:w.title||'', keys:w.keys||w.key||'', content:w.content||'',
                                 always:!!w.always, personaId:w.personaId||'',
                                 folderId:(w.folder && name2id[w.folder]) ? name2id[w.folder] : (w.folderId || '')});
          });
          save('worldFolders'); save('world'); renderers.world(); toast('导入了 ' + list.length + ' 条');
        } else { toast('这个文件里没有列表'); }
      }catch(e){ toast('解析失败：' + e.message); }
    };
    r.readAsText(f);
  });
});
// 下载一个 json 文件的小工具
function downloadJSON(name, obj){
  try{
    var s = JSON.stringify(obj);
    var blob = new Blob([s], {type:'application/json'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 3000);
    toast('已导出 ' + name);
  }catch(e){ toast('导出失败：' + e.message); }
}

/* ---------- 模型 / 接口管理（文字 / 图片 / 视频 三板块） ---------- */
var modelTab = 'text';

function slider(label, id, val, min, max, step){
  return '<label class="fld" style="margin-top:8px;">' + label + ' <span class="sliderv" id="' + id + 'V">' + val + '</span></label>'
    + '<input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '">';
}
// 取一份「当前表单内容」的副本（只读，不写回存档）
function readBoardForm(board){
  var B = $('apiBody'); if(!B) return null;
  var act = boardActive(board);
  if(!act){ ensureApis(); act = boardActive(board); }   // 存档结构坏过就先修好，别让点击直接崩掉
  var cfg = cloneCfg(act);
  cfg.url   = (B.querySelector('#mUrl').value || '').trim();
  cfg.key   = (B.querySelector('#mKey').value || '').trim();
  cfg.model = (B.querySelector('#mModel').value || '').trim();
  if(board === 'video') cfg.endpoint = (B.querySelector('#mEp').value || '').trim();
  cfg.params = {
    temperature: parseFloat(B.querySelector('#mTemp').value),
    topP: parseFloat(B.querySelector('#mTopP').value),
    frequencyPenalty: parseFloat(B.querySelector('#mFreq').value)
  };
  return cfg;
}
function writeBoardForm(board){
  var B = $('apiBody'); if(!B) return;
  var act = boardActive(board);
  if(!act){ ensureApis(); act = boardActive(board); }
  if(!act) return;
  act.url   = (B.querySelector('#mUrl').value || '').trim();
  act.key   = (B.querySelector('#mKey').value || '').trim();
  act.model = (B.querySelector('#mModel').value || '').trim();
  if(board === 'video') act.endpoint = (B.querySelector('#mEp').value || '').trim();
  act.params = {
    temperature: parseFloat(B.querySelector('#mTemp').value),
    topP: parseFloat(B.querySelector('#mTopP').value),
    frequencyPenalty: parseFloat(B.querySelector('#mFreq').value)
  };
  if(board === 'text'){ state.api.mode = act.url ? 'api' : 'local'; state.api.temp = act.params.temperature; }
}
function modelBoardHTML(board){
  var cfg = boardActive(board);
  var cfgs = boardConfigs(board);
  var opts = cfgs.map(function(c){ return '<option value="' + c.id + '"' + (c.id === boardSel(board) ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('');
  var p = cfg.params || {temperature:0.8, topP:1, frequencyPenalty:0};
  var isVideo = (board === 'video');
  var html = '<div class="card glass">'
    + '<label class="fld">已存配置（可快速切换 / 另存 / 删除）</label>'
    + '<div class="row" style="gap:8px;flex-wrap:wrap;">'
    + '<select id="mCfgSel" style="flex:1;min-width:140px;">' + opts + '</select>'
    + '<button class="btn small" id="mSaveNew">另存为新配置</button>'
    + '<button class="btn small ghost" id="mDelCfg">删除</button></div>'
    + '<div class="hint" style="margin-top:6px;">「保存」覆盖当前编辑这份；「另存为新配置」把当前内容存成一份新的，可随时切回。</div>'
    + '<label class="fld" style="margin-top:10px;">接口地址（只填域名也行，会自动补 /v1/…）</label>'
    + '<input type="text" id="mUrl" value="' + esc(cfg.url || '') + '" placeholder="https://api.openai.com">'
    + '<label class="fld" style="margin-top:8px;">钥匙（API Key）</label>'
    + '<input type="password" id="mKey" value="' + esc(cfg.key || '') + '" placeholder="sk-...">'
    + (isVideo ? '<label class="fld" style="margin-top:8px;">视频接口路径</label><input type="text" id="mEp" value="' + esc(cfg.endpoint || '/v1/videos/generations') + '">' : '')
    + '<label class="fld" style="margin-top:8px;">模型名</label>'
    + '<input type="text" id="mModel" value="' + esc(cfg.model || '') + '" list="mModelList" placeholder="拉取后点下面的模型名，或手动填">'
    + '<datalist id="mModelList">' + (cfg.models || []).map(function(m){ return '<option value="' + esc(m) + '">'; }).join('') + '</datalist>'
    + '<div class="chips" id="mModelChips" style="margin-top:6px;"></div>'
    + '<div class="row" style="gap:8px;margin-top:8px;"><button class="btn small ghost" id="mPull">拉取可用模型</button></div>'
    // 状态行紧挨着按钮：以前结果写在页面最底下，手机上看不见，就成了「点了没反应」
    + '<div id="mPullStatus" style="margin-top:8px;font-size:13px;line-height:1.6;">还没拉取过</div>'
    + '<div class="hint" style="margin-top:4px;">点「拉取」会请求 你填的地址 + /v1/models；只填域名时会自动补上 /v1。拉取前会先把地址、钥匙存好，不会白填。<br>'
    + '如果一直报「请求发不出去」：多半是这个接口<b>不允许网页直接跨域调用（CORS）</b>——浏览器会拦下这类请求，和地址、钥匙对不对没关系。换一个支持浏览器直连的中转地址即可。</div>'
    + '<div style="margin-top:12px;border-top:1px solid var(--c-border);padding-top:10px;">'
    + '<label class="fld">模型参数（可保存）</label>'
    + slider('温度 Temperature', 'mTemp', p.temperature, 0, 2, 0.05)
    + slider('核采样 Top P', 'mTopP', p.topP, 0, 1, 0.05)
    + slider('重复惩罚 Frequency Penalty', 'mFreq', p.frequencyPenalty, -2, 2, 0.05)
    + '</div>'
    + '<div class="btn-row" style="margin-top:12px;"><button class="btn" id="mSave">保存</button>'
    + '<button class="btn ghost" id="mTest">测试模型</button></div>'
    + '<textarea id="mTestPrompt" rows="2" placeholder="测试时发给模型的提示词（可留空）" style="margin-top:8px;"></textarea>'
    + '<div class="hint" style="margin-top:8px;" id="mResult">填好地址和钥匙后：点「拉取」拿模型，点「测试」验证能不能用（不通会说明原因）。</div>'
    + '</div>';
  // 项目接入
  html += '<div class="card glass" style="margin-top:12px;">'
    + '<label class="fld">接入到哪些项目</label>'
    + '<div class="hint" style="margin-bottom:6px;">勾选后，下面的项目会改用本板块的模型；取消勾选就退回本地。每项还能单独选用哪份配置。</div>'
    + boardBindings(board).map(function(b, bi){
        var cfgOpts = cfgs.map(function(c){ return '<option value="' + c.id + '"' + (b.configId === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('');
        return '<div class="row between" style="padding:8px 0;border-bottom:1px solid var(--c-border);gap:8px;flex-wrap:wrap;">'
          + '<label class="row" style="gap:8px;font-size:13px;"><input type="checkbox" data-bind="' + bi + '"' + (b.on ? ' checked' : '') + '> ' + esc(b.name) + '</label>'
          + '<select data-bindcfg="' + bi + '" style="width:auto;padding:6px 8px;font-size:13px;">' + cfgOpts + '</select></div>';
      }).join('')
    + '</div>';
  return html;
}
// 拉取 / 测试的结果写在按钮旁边（#mPullStatus），不再只写在页面最底下
function setPullStatus(html, isErr){
  var st = $('mPullStatus'); if(!st) return;
  st.innerHTML = html;
  st.style.color = isErr ? 'var(--c-danger,#b06a6a)' : 'var(--c-text)';
  var r = $('mResult'); if(r) r.innerHTML = html;         // 底部说明同步一份
}
// 把拉到的模型列成可点的胶囊（iOS Safari 不认 datalist，下拉候选在手机上根本出不来）
function renderModelChips(board){
  var box = $('mModelChips'); if(!box) return;
  var act = boardActive(board);
  var list = (act && act.models) ? act.models : [];
  if(!list.length){ box.innerHTML = ''; return; }
  var shown = list.slice(0, 40);
  box.innerHTML = shown.map(function(m){
    return '<button type="button" class="chip' + (act.model === m ? ' on' : '') + '" data-model="' + esc(m) + '">' + esc(m) + '</button>';
  }).join('') + (list.length > 40 ? '<span class="hint"> …还有 ' + (list.length - 40) + ' 个，可在上面手填</span>' : '');
}
function bindModelBoard(board){
  var B = $('apiBody');
  $('mPull').onclick = function(){
    var btn = $('mPull');
    var oldText = btn ? btn.textContent : '';
    // 无论走到哪一步都要让人看见动静：按钮变字 + 旁边出状态 + 弹一条提示
    function busy(on){
      if(!btn) return;
      btn.disabled = !!on;
      btn.textContent = on ? '拉取中…' : oldText;
      if(on) btn.classList.add('pulling'); else btn.classList.remove('pulling');
    }
    try{
      // 先把界面上填的地址 / 钥匙写回这份配置并存盘：
      // 以前这里只读不写，成功后又用「还没更新过的存档」重渲染，地址钥匙就被旧值冲掉了。
      writeBoardForm(board);
      saveApis();
      var cfg = readBoardForm(board);
      if(!cfg){ setPullStatus('× 没读到表单内容，退出这个页面再进来试试', true); return; }
      if(!cfg.url){
        setPullStatus('× 先在上面填接口地址，再点拉取', true);
        toast('请先填写接口地址');
        var u = $('mUrl'); if(u) u.focus();
        return;
      }
      busy(true);
      setPullStatus('正在拉取：' + esc(baseURL(cfg.url)) + '/models …');
      fetchModels(board, cfg, function(err, list){
        busy(false);
        if(err){ setPullStatus('× 拉取失败：' + esc(err), true); toast('拉取失败'); return; }
        var act = boardActive(board);
        var keep = act.model;                       // 之前手填 / 选过的模型名，能留住就留住
        act.models = list || [];
        if(!keep && list && list.length) act.model = list[0];   // 没选过就默认用第一个
        else if(keep) act.model = keep;
        saveApis();
        // 只更新模型那几处，不整页重渲染：整页重渲染会把滚动位置、刚填的内容一起打乱
        var mi = $('mModel'); if(mi) mi.value = act.model || '';
        var dl = $('mModelList'); if(dl) dl.innerHTML = (act.models||[]).map(function(m){ return '<option value="' + esc(m) + '">'; }).join('');
        renderModelChips(board);
        setPullStatus('✓ 拉到 ' + list.length + ' 个模型，点下面的名字就能选');
        toast('拉到 ' + list.length + ' 个模型');
      });
    }catch(e){
      busy(false);
      setPullStatus('× 点拉取时出错了：' + esc((e && e.message) || e), true);
    }
  };
  $('mSave').onclick = function(){ writeBoardForm(board); saveApis(); toast('已保存'); };
  $('mSaveNew').onclick = function(){
    writeBoardForm(board);
    var name = window.prompt('给这份配置起个名字：', '配置 ' + (boardConfigs(board).length + 1));
    if(name === null) return;
    snapshotActive(board, (name.trim() || ('配置 ' + (boardConfigs(board).length + 1))));
    renderers.api();
    toast('已另存为「' + name + '」');
  };
  $('mDelCfg').onclick = function(){
    var sel = $('mCfgSel').value;
    if(boardConfigs(board).length <= 1){ toast('至少保留一份配置'); return; }
    if(!window.confirm('删除这份配置？')) return;
    deleteConfig(board, sel);
    renderers.api();
  };
  $('mCfgSel').onchange = function(){ selectConfig(board, $('mCfgSel').value); renderers.api(); };
  $('mTest').onclick = function(){
    try{
      // 同上：先落盘，测试完再怎么刷新，填进去的地址和钥匙都还在
      writeBoardForm(board);
      saveApis();
      var cfg = readBoardForm(board);
      var prompt = ($('mTestPrompt').value || '').trim();
      if(!cfg.url){ setPullStatus('× 先填接口地址再测试', true); toast('请先填写接口地址'); return; }
      var btn = $('mTest'), oldText = btn ? btn.textContent : '';
      if(btn){ btn.disabled = true; btn.textContent = '测试中…'; }
      setPullStatus('正在测试…');
      testModel(board, cfg, prompt || '用一句话介绍你自己', function(err, info){
        if(btn){ btn.disabled = false; btn.textContent = oldText; }
        if(err){ setPullStatus('× 不可用：' + esc(err), true); toast('测试不通过'); }
        else { setPullStatus('✓ 可用。' + (info ? ('<br><span class="hint">' + esc(info) + '</span>') : '')); toast('测试通过'); }
      });
    }catch(e){ setPullStatus('× 测试时出错了：' + esc((e && e.message) || e), true); }
  };
  // 点模型胶囊就把它填进「模型名」
  var chipsBox = $('mModelChips');
  if(chipsBox) chipsBox.onclick = function(e){
    var c = e.target && e.target.closest ? e.target.closest('[data-model]') : null;
    if(!c) return;
    var mi = $('mModel'); if(mi) mi.value = c.getAttribute('data-model');
    $$('[data-model]', chipsBox).forEach(function(x){ x.classList.remove('on'); });
    c.classList.add('on');
    writeBoardForm(board); saveApis();
    setPullStatus('已选模型：' + esc(c.getAttribute('data-model')) + '（记得点下面的「保存」）');
  };
  ['mTemp','mTopP','mFreq'].forEach(function(id){
    var el = $(id); if(el) el.oninput = function(){ var v = $(id + 'V'); if(v) v.textContent = el.value; };
  });
  $$('[data-bind]', B).forEach(function(el){
    el.onchange = function(){ var i = +el.getAttribute('data-bind'); boardBindings(board)[i].on = el.checked; saveApis(); };
  });
  $$('[data-bindcfg]', B).forEach(function(el){
    el.onchange = function(){ var i = +el.getAttribute('data-bindcfg'); boardBindings(board)[i].configId = el.value; saveApis(); };
  });
}
renderers.api = function(){
  ensureApis();
  var boards = [['text','文字模型'],['image','图片生成模型'],['video','视频生成模型'],['voice','语音生成模型']];
  var html = '<div class="btn-row" style="margin-bottom:12px;">' + boards.map(function(b){
    return '<button class="btn small ' + (modelTab === b[0] ? '' : 'ghost') + '" data-mtab="' + b[0] + '">' + b[1] + '</button>';
  }).join('') + '</div>';
  try{
    html += modelBoardHTML(modelTab);
    $('apiBody').innerHTML = html;
    $$('[data-mtab]', $('apiBody')).forEach(function(el){
      el.onclick = function(){ modelTab = el.getAttribute('data-mtab'); renderers.api(); };
    });
    bindModelBoard(modelTab);
    renderModelChips(modelTab);   // 之前拉过的模型直接显示出来，进页面就能选
  }catch(e){
    // 存档结构异常时，以前会白屏（按钮在，但没绑上事件，点了自然「没反应」）
    $('apiBody').innerHTML = '<div class="card glass">'
      + '<h3>这个页面没渲染出来</h3>'
      + '<div class="hint">' + esc((e && e.message) || e) + '</div>'
      + '<div class="hint" style="margin-top:8px;">多半是以前存的接口数据格式对不上，点下面的按钮修一下就行（地址和钥匙会被保留）。</div>'
      + '<div class="btn-row" style="margin-top:10px;"><button class="btn" id="mRepair">修复并重开这个页面</button>'
      + '<button class="btn ghost" id="mReset">重置接口设置</button></div></div>';
    var rp = $('mRepair'); if(rp) rp.onclick = function(){ ensureApis(); renderers.api(); toast('已修复'); };
    var rs = $('mReset'); if(rs) rs.onclick = function(){
      if(!window.confirm('清空全部接口设置（地址、钥匙、模型）？')) return;
      try{ localStorage.removeItem('xp.apis'); localStorage.removeItem('xp.api'); }catch(err){}
      location.reload();
    };
  }
  try{ fillIcons(); }catch(e){}
};

/* ---------- 备份 ---------- */
renderers.backup = function(){
  var msgCount = state.messages.length;
  var memCount = state.memory.length;
  $('backupBody').innerHTML =
      '<div class="card glass">'
    + '<h3>现在存了多少</h3>'
    + '<div class="m" style="font-size:13px;line-height:2;">'
    + '消息：' + msgCount + ' 条<br>记忆：' + memCount + ' 条<br>'
    + '<span id="bkMedia">图片 / 音乐：统计中…</span><br>'
    + '文字占用：约 ' + Math.round(storageSize()/1024) + ' KB'
    + '</div></div>'
    + '<div class="card glass">'
    + '<h3>导出 / 导入备份</h3>'
    + '<label class="row" style="font-size:13px;margin-bottom:8px;"><input type="checkbox" id="bkWithMedia" style="width:auto;" checked> 连图片和音乐一起打包（文件会比较大）</label>'
    + '<div class="btn-row"><button class="btn" id="bkExport">导出备份</button>'
    + '<button class="btn ghost" id="bkImport">导入备份</button></div>'
    + '<div class="hint" style="margin-top:8px;">导出的 json 里有：聊天记录、人设卡、世界书、接口设置、记忆、日记等；勾上后还会带上图片和音乐。</div>'
    + '</div>'
    + '<div class="card glass">'
    + '<h3 style="color:#b06a6a;">清空全部</h3>'
    + '<div class="hint">只清这台手机（这个浏览器）里存的东西，不会动你电脑或手机上的任何文件。清完就恢复不了了，请先导出备份。</div>'
    + '<div class="btn-row" style="margin-top:10px;"><button class="btn danger" id="bkClear">清空全部</button></div>'
    + '</div>';
  refreshAlbum(function(imgs){
    refreshSongs(function(songs){
      var el = $('bkMedia');
      if(el) el.textContent = '图片：' + imgs.length + ' 张 · 音乐：' + songs.length + ' 首';
    });
  });
  $('bkExport').onclick = function(){
    var withMedia = $('bkWithMedia').checked;
    var data = {
      type: 'xiaoshouji-backup',
      version: 1,
      time: Date.now(),
      data: {
        settings: state.settings, persona: state.persona, world: state.world,
        worldFolders: state.worldFolders, growthMap: state.growthMap,
        dateCfg: state.dateCfg, planCfg: state.planCfg,
        memory: state.memory, messages: state.messages, moments: state.moments,
        notes: state.notes, plans: state.plans, dates: state.dates, diary: state.diary,
        calls: state.calls, growth: state.growth, mapData: state.mapData,
        study: state.study, create: state.create, cowatch: state.cowatch, listenTogether: state.listenTogether, layout: state.layout,
        mood: state.mood, weather: state.weather, beauty: state.beauty, bubbleCss: state.bubbleCss,
        // 完完整整列一遍：书架上的文档也在里面
        annotateCfg: state.annotateCfg, annotateStyle: state.annotateStyle, shelf: state.shelf,
        api: state.api, identities: state.identities, curIdentity: state.curIdentity,
        personas: state.personas, curPersona: state.curPersona, wx: state.wx,
        bgImages: state.bgImages, fontFile: state.fontFile,
        wallet: state.wallet, shop: state.shop, check: state.check, health: state.health,
        apis: state.apis
      },
      media: {images: [], audios: []}
    };
    if(!withMedia){ downloadJSON('小手机备份_' + fmtDate(Date.now()) + '.json', data); return; }
    // 把图片/音乐转成 base64 一起打包
    toast('正在打包图片和音乐…');
    blobToBase64List(albumCache, function(imgs){
      blobToBase64List(songCache, function(songs){
        data.media.images = imgs; data.media.audios = songs;
        downloadJSON('小手机备份_' + fmtDate(Date.now()) + '.json', data);
      });
    });
  };
  $('bkImport').onclick = function(){
    pickFile('.json', false, function(files){
      var f = files[0]; if(!f) return;
      var r = new FileReader();
      r.onload = function(){
        try{
          var o = JSON.parse(String(r.result));
          var d = o.data || o;
          for(var k in d){ if(k === 'api' || k === 'apis') continue; state[k] = d[k]; }   // 接口设置不覆盖，避免导入别人的钥匙
          ensurePersonas(); ensureIdentities(); ensureWallet(); ensureShop(); ensureHealth(); ensureShelf(); ensureListenTogether(); ensureCowatch();   // 老备份可能缺身份 / 人设 / 钱包 / 商品 / 健康 / 书架 / 一起听 / 一起看，这里补一下
          ['settings','persona','personas','curPersona','wx','bgImages','fontFile','world','worldFolders','growthMap','dateCfg','planCfg','annotateCfg','annotateStyle','shelf','memory','messages','moments','notes','plans','dates','diary','calls','growth','mapData','study','create','cowatch','listenTogether','card','mood','weather','beauty','bubbleCss','layout','identities','curIdentity','wallet','shop','check','health'].forEach(save);
          toast('导入成功，正在恢复…');
          var imgs = (o.media && o.media.images) || [];
          var auds = (o.media && o.media.audios) || [];
          var jobs = [];
          imgs.forEach(function(it){ jobs.push(idbPut('images', {id:it.id || uid(), name:it.name, blob:base64ToBlob(it.b64, it.type), ts:it.ts || Date.now()})); });
          auds.forEach(function(it){ jobs.push(idbPut('audios', {id:it.id || uid(), name:it.name, blob:base64ToBlob(it.b64, it.type), ts:it.ts || Date.now()})); });
          Promise.all(jobs).then(function(){
            refreshAlbum(); refreshSongs(); applyBeauty(); applyBubbleCss();
            go('home'); toast('全部恢复完成');
          });
        }catch(e){ toast('导入失败：' + e.message); }
      };
      r.readAsText(f);
    });
  };
  $('bkClear').onclick = function(){
    openModal('确认清空？',
      '<div class="hint">这会删掉：全部聊天记录、记忆、人设卡、世界书、日记、图片、音乐、设置。<br><b>只影响这台手机（当前浏览器），不会动你设备上的文件。</b><br>此操作不可恢复。</div>'
      + '<div class="hint" style="margin-top:10px;">确认请在下面输入「清空」两个字：</div>'
      + '<input type="text" id="clrWord" placeholder="清空">',
      [
        {text:'我确定，清空', cls:'danger', fn:function(box){
          if((box.querySelector('#clrWord').value || '').trim() !== '清空'){ toast('输入不正确，已取消'); return; }
          ['settings','persona','personas','curPersona','wx','bgImages','fontFile','world','worldFolders','growthMap','dateCfg','planCfg','annotateCfg','annotateStyle','shelf','memory','messages','moments','notes','plans','dates','diary','calls','growth','mapData','study','create','cowatch','listenTogether','notices','mood','weather','beauty','bubbleCss','card','layout','identities','curIdentity','wallet','shop','check','health'].forEach(function(k){ LS.del(k); });
          albumCache.forEach(function(i){ idbDel('images', i.id); });
          songCache.forEach(function(s){ idbDel('audios', s.id); });
          location.reload();
        }},
        {text:'取消', cls:'ghost'}
      ]);
  };
};
// 估算 localStorage 里占了多少
function storageSize(){
  var n = 0;
  try{
    for(var k in localStorage){ if(k.indexOf('xp.') === 0) n += (localStorage.getItem(k) || '').length + k.length; }
  }catch(e){}
  return n * 2; // 一个字符大约两个字节
}
// 文件转 base64（导出备份用）
function blobToBase64List(list, cb){
  var out = [], i = 0;
  if(!list.length){ cb([]); return; }
  list.forEach(function(it){
    if(!it.blob){ done(); return; }
    var r = new FileReader();
    r.onload = function(){
      out.push({id:it.id, name:it.name, type:it.blob.type, ts:it.ts, b64:String(r.result).split(',')[1]});
      done();
    };
    r.onerror = done;
    r.readAsDataURL(it.blob);
  });
  function done(){
    i++;
    if(i >= list.length) cb(out);
  }
}
function base64ToBlob(b64, type){
  try{
    var bin = atob(b64 || '');
    var arr = new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], {type: type || ''});
  }catch(e){ return new Blob([]); }
}

/* ---------- 设置 ---------- */
renderers.settings = function(){
  var s = state.settings;
  var langOpts = LANGS.map(function(l){ return '<option value="' + l + '"' + (l === s.lang ? ' selected' : '') + '>' + l + '</option>'; }).join('');
  $('settingsBody').innerHTML =
      '<div class="card glass">'
    + fld('他的名字', 'sName', s.hisName)
    + fld('桌面底部那行小字', 'sFoot', s.homeFoot)
    + fld('锁屏上那句话（留空就按时间自动变）', 'sLock', s.lockWord)
    + '<label class="fld">沟通语言</label><select id="sLang">' + langOpts + '</select>'
    + '<label class="fld">睡觉时间（到了他会问你要睡了吗）</label><input type="time" id="sSleep" value="' + esc(s.sleepTime) + '">'
    + '<label class="fld">今日小结时间（小时）</label><input type="number" id="sSum" min="0" max="23" value="' + s.summaryHour + '">'
    + '<label class="fld">今天的天气（可以手动告诉他）</label><input type="text" id="sWeather" value="' + esc(s.weather) + '" placeholder="例如：下雨">'
    + '</div>'

    + '<div class="card glass"><h3>记忆</h3>'
    + '<label class="fld">最近上下文带几条（' + s.memRecent + '）</label><input type="range" id="sRecent" min="2" max="30" step="1" value="' + s.memRecent + '"><div class="hint" id="sRecentV">' + s.memRecent + ' 条</div>'
    + '<label class="row" style="margin-top:8px;font-size:13px;"><input type="checkbox" id="sCompress" style="width:auto;"' + (s.memCompress ? ' checked' : '') + '> 把旧的长聊压缩成摘要</label>'
    + '<label class="fld">记忆条数上限</label><input type="number" id="sMax" min="10" max="1000" value="' + s.memMax + '">'
    + '</div>'

    + '<div class="card glass"><h3>他主动找你</h3>'
    + '<div class="row between" style="margin-bottom:8px;"><span>开启</span><button class="switch ' + (s.pushOn ? 'on' : '') + '" id="sPush"></button></div>'
    + '<label class="fld">频率（每 ' + s.pushMinutes + ' 分钟左右一次）</label><input type="range" id="sPushM" min="5" max="240" step="5" value="' + s.pushMinutes + '"><div class="hint" id="sPushV">' + s.pushMinutes + ' 分钟</div>'
    + '<div class="row between" style="margin:10px 0 8px;"><span>记忆闪回</span><button class="switch ' + (s.flashOn ? 'on' : '') + '" id="sFlash"></button></div>'
    + '<label class="fld">闪回频率（每 ' + s.flashMinutes + ' 分钟左右）</label><input type="range" id="sFlashM" min="15" max="480" step="15" value="' + s.flashMinutes + '"><div class="hint" id="sFlashV">' + s.flashMinutes + ' 分钟</div>'
    + '</div>'

    + '<div class="card glass"><h3>安静陪伴模式</h3>'
    + '<div class="row between" style="margin-bottom:8px;"><span>开启</span><button class="switch ' + (s.quietOn ? 'on' : '') + '" id="sQuiet"></button></div>'
    + '<label class="fld">他偶尔说话的频率（分钟）</label><input type="number" id="sQuietM" min="3" max="120" value="' + s.quietMinutes + '">'
    + '<div class="btn-row" style="margin-top:10px;"><button class="btn small ghost" id="goQuiet">进入安静陪伴</button></div>'
    + '</div>'

    + '<div class="card glass"><h3>外观</h3>'
    + '<label class="fld">主色</label><input type="color" id="sPrimary" value="' + esc(hexOf('--c-primary', '#7fa3c8')) + '">'
    + '<label class="fld">强调色</label><input type="color" id="sAccent" value="' + esc(hexOf('--c-accent', '#9dbdd8')) + '">'
    + '<label class="fld">背景色</label><input type="color" id="sBg" value="' + esc(hexOf('--c-bg1', '#dbe7f2')) + '">'
    + '<label class="fld">图标风格</label><select id="sIcon">'
    + '<option value="css"' + (s.iconStyle === 'css' ? ' selected' : '') + '>磨砂玻璃 · 简约线性图标</option>'
    + '<option value="liquid"' + (s.iconStyle === 'liquid' ? ' selected' : '') + '>液态玻璃 · 简约线性图标</option>'
    + '<option value="char"' + (s.iconStyle === 'char' ? ' selected' : '') + '>磨砂玻璃 · 字符图标</option></select>'
    + '<div class="row between" style="margin:10px 0 4px;"><span>适应屏幕大小（铺满设备）</span><button class="switch ' + (s.fitScreen ? 'on' : '') + '" id="sFit"></button></div>'
    + '<div class="hint">开启后手机会铺满整个屏幕，切换设备也能贴合；关闭则显示固定大小的手机外观。</div>'
    + '<div class="btn-row" style="margin-top:10px;"><button class="btn small ghost" id="sWallLock">锁屏壁纸</button>'
    + '<button class="btn small ghost" id="sWallHome">桌面壁纸</button>'
    + '<button class="btn small ghost" id="goBeauty">更多美化</button></div>'
    + '</div>'

    + '<div class="card glass"><h3 style="color:#b06a6a;">清除数据</h3>'
    + '<div class="btn-row"><button class="btn ghost" id="sClearChat">只清聊天记录</button>'
    + '<button class="btn danger" id="sClearAll">清空全部</button></div>'
    + '<div class="hint" style="margin-top:8px;">只影响这台手机（当前浏览器）里的数据。</div>'
    + '</div>'

    + '<div class="btn-row" style="margin-bottom:20px;"><button class="btn block" id="sSave">保存设置</button></div>';

  // 开关按钮
  bindSwitch('sPush', s.pushOn, function(v){ s.pushOn = v; });
  bindSwitch('sFlash', s.flashOn, function(v){ s.flashOn = v; });
  bindSwitch('sQuiet', s.quietOn, function(v){ s.quietOn = v; });
  bindSwitch('sFit', s.fitScreen, function(v){ s.fitScreen = v; applyFitScreen(); });
  $('sRecent').oninput = function(){ $('sRecentV').textContent = this.value + ' 条'; };
  $('sPushM').oninput = function(){ $('sPushV').textContent = this.value + ' 分钟'; };
  $('sFlashM').oninput = function(){ $('sFlashV').textContent = this.value + ' 分钟'; };
  $('goQuiet').onclick = function(){ saveSettingsForm(); go('quiet'); };
  $('goBeauty').onclick = function(){ saveSettingsForm(); go('beauty'); };
  $('sWallLock').onclick = function(){ pickWallpaper('lock'); };
  $('sWallHome').onclick = function(){ pickWallpaper('home'); };
  $('sSave').onclick = function(){ saveSettingsForm(); toast('已保存'); };
  $('sClearChat').onclick = function(){
    openModal('清掉聊天记录？', '<div class="hint">人设卡、世界书、记忆都会留着，只删聊天。</div>',
      [{text:'清掉', cls:'danger', fn:function(){ state.messages = []; save('messages'); toast('聊天记录已清空'); }}, {text:'取消', cls:'ghost'}]);
  };
  $('sClearAll').onclick = function(){ go('backup'); toast('在备份页里点「清空全部」'); };
};
// 读取某个 CSS 变量当前值（没有就返回默认值）
function hexOf(name, def){
  var v = (state.beauty && state.beauty[name]) || getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || def;
}
function bindSwitch(id, on, cb){
  var el = $(id);
  el.addEventListener('click', function(){
    var now = el.classList.toggle('on');
    cb(now);
  });
}
function saveSettingsForm(){
  var s = state.settings;
  s.hisName = $('sName').value;
  s.homeFoot = $('sFoot').value;
  s.lockWord = $('sLock').value;
  s.lang = $('sLang').value;
  s.sleepTime = $('sSleep').value;
  s.summaryHour = parseInt($('sSum').value, 10) || 22;
  s.weather = $('sWeather').value;
  s.memRecent = parseInt($('sRecent').value, 10);
  s.memCompress = $('sCompress').checked;
  s.memMax = parseInt($('sMax').value, 10) || 200;
  s.pushMinutes = parseInt($('sPushM').value, 10);
  s.flashMinutes = parseInt($('sFlashM').value, 10);
  s.quietMinutes = parseInt($('sQuietM').value, 10);
  s.iconStyle = $('sIcon').value;
  s.fitScreen = $('sFit').classList.contains('on');
  // 颜色写进 CSS 变量（也就是写进 beauty）
  state.beauty['--c-primary'] = $('sPrimary').value;
  state.beauty['--c-accent'] = $('sAccent').value;
  state.beauty['--c-bg1'] = $('sBg').value;
  state.beauty['--c-bubble-me'] = $('sPrimary').value;
  save('beauty'); save('settings');
  applyBeauty();
  // 天气写进短期记忆，他之后可能会提起
  if(s.weather && s.weather !== (state.weather.text || '')){
    state.weather = {text:s.weather, day:fmtDate(Date.now())};
    addMemory('今天的天气：' + s.weather, false, '天气');
  }
  save('weather');
  renderers.home && renderers.home();
}
// 选壁纸（设置页里的老入口）：现在统一走「图片地址 / 上传」那套
function pickWallpaper(which){
  pickImageOrURL(which === 'lock' ? 'lock' : 'home', function(){
    toast('壁纸已换');
  });
}
// 页面启动时把壁纸 / 背景图贴回去（顺带兼容很早以前存的 __lockbg / __homebg）
function applyWallpapers(){
  idbAll('images').then(function(list){
    ensureBgImages();
    var old = {lock:'__lockbg', home:'__homebg'};
    BG_SLOTS.forEach(function(s){
      if(!state.bgImages[s.k].value && old[s.k]){
        var hit = list.filter(function(x){ return x.id === old[s.k]; })[0];
        if(hit){ state.bgImages[s.k] = {type:'idb', value:old[s.k]}; save('bgImages'); }
      }
    });
    list.forEach(function(it){
      if(!imgCache[it.id] && it.blob) imgCache[it.id] = URL.createObjectURL(it.blob);
      if(!imgCache[it.id] && it.url) imgCache[it.id] = it.url;   /* 用网址导入的图 */
    });
    applyBgImages();
  });
}

/* =====================================================================
   第 12 段：日记 / 特殊日期 / 共享计划 / 亲密度 / 地图 / 一起写
   ===================================================================== */

/* ---------- 日记 ---------- */
renderers.diary = function(){
  var box = $('diaryList');
  if(!state.diary.length){ box.innerHTML = '<div class="empty">他还没写过日记</div>'; return; }
  box.innerHTML = state.diary.map(function(d){
    return '<div class="item">'
      + '<div class="row between"><b>' + (d.type === 'summary' ? '今日小结' : '日记') + '</b><span class="m">' + fmtFull(d.ts) + '</span></div>'
      + '<div class="t" style="margin-top:6px;">' + esc(d.text) + '</div>'
      + '<div class="acts"><button class="btn small ghost" data-ddel="' + d.id + '">删</button>'
      + '<button class="btn small ghost" data-dmem="' + d.id + '">写进记忆</button></div></div>';
  }).join('');
  $$('[data-ddel]', box).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-ddel');
      state.diary = state.diary.filter(function(d){ return d.id !== id; });
      save('diary'); renderers.diary();
    });
  });
  $$('[data-dmem]', box).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-dmem');
      var d = state.diary.filter(function(x){ return x.id === id; })[0];
      if(d){ addMemory('他写的日记（' + fmtDate(d.ts) + '）：' + d.text.slice(0,80), false, '日记'); toast('已写进记忆'); }
    });
  });
};
$('btnWriteDiary').addEventListener('click', function(){
  toast('他在写…');
  var recent = state.messages.slice(-10).map(function(m){ return (m.who==='me'?meName():'他') + '：' + (m.text||''); }).join('\n');
  var mems = state.memory.slice(0,6).map(function(m){ return m.text; }).join('；');
  var prompt = '请以「' + (state.persona.name||'他') + '」的口吻写一篇今天的日记，3-5 句，提到今天聊过的事或记得的事。参考：\n最近对话：' + recent + '\n记得的事：' + mems;
  askModel(buildSystemPrompt('') + '\n（你现在是在写自己的日记，用第一人称，语气自然，不要标题）', prompt, function(r){
    state.diary.unshift({id:uid(), type:'diary', text:r, ts:Date.now()});
    save('diary'); renderers.diary();
    addNotice('diary', (state.persona.name||'他') + ' 写了一篇日记');
  });
});

/* ---------- 纪念日 ---------- */
// 当前身份 id（纪念日 / 计划是否跟随身份切换时用）
function curIdentityId(){
  try{ return (curIdentity() || {}).id || '_'; }catch(e){ return '_'; }
}
// 当前该看到哪些纪念日
function curDates(){
  var list = state.dates || [];
  if(state.dateCfg && state.dateCfg.perIdentity){
    var iid = curIdentityId();
    return list.filter(function(d){ return !d.iid || d.iid === iid; });
  }
  return list;
}
function hasTextModel(){
  try{ var c = textCfgFor('wechat'); return !!(c && c.url); }catch(e){ return false; }
}
// 把最近聊天 / 日记 / 备忘压成一段给模型看的素材
function dailyDigest(maxMsg){
  maxMsg = maxMsg || 40;
  var pid = state.curPersona || '_';
  var msgs = (state.messages || []).filter(function(m){ return (m.pid || pid) === pid && m.who !== 'sys'; }).slice(-maxMsg);
  var lines = msgs.map(function(m){
    return ((m.who === 'me') ? '我' : (state.persona && state.persona.name) || '他') + '：' + String(m.text || '').slice(0, 120);
  });
  var di = (state.diary || []).slice(0, 5).map(function(d){ return '日记：' + String(d.text || '').slice(0, 120); });
  var nt = (state.notes || []).slice(0, 10).map(function(n){ return '备忘：' + String(n.text || '').slice(0, 120); });
  return lines.concat(di, nt).join('\n');
}
// 让模型从日常/聊天里提炼纪念日
function genDatesFromModel(quiet){
  if(!hasTextModel()){ if(!quiet) toast('先在「模型」里接好文字模型'); return; }
  var digest = dailyDigest();
  if(!digest.trim()){ if(!quiet) toast('还没有聊天 / 日记 / 备忘可以分析'); return; }
  if(!quiet) toast('模型正在读你们的日常…');
  var sys = '你是帮用户整理「纪念日」的助手。你会读到用户和某个人的聊天、日记、备忘。\n'
    + '请从中找出真正值得记住的日子（第一次见面/认识、生日、约定、告白、一起做的事、重要的转折点等）。\n'
    + '只输出 JSON 数组，不要任何其他文字，格式：\n'
    + '[{"title":"认识纪念日","date":"2026-05-20","yearly":true,"note":"那天在图书馆第一次说话"}]\n'
    + '规则：date 用 YYYY-MM-DD；年份不确定就用当前年份 ' + new Date().getFullYear() + '；'
    + '每年都会到的（生日、认识日等）yearly 为 true，只发生一次的写 false；最多 6 条；不要编造聊天里完全没有的事。';
  askModel(sys, '下面是你们的日常记录：\n' + digest + '\n\n请提炼纪念日：', function(r){
    var list = parseJsonArray(r);
    if(!list || !list.length){ if(!quiet) toast('模型这次没提炼出明确的日子'); return; }
    var added = 0;
    list.forEach(function(o){
      var t = String(o.title || '').trim();
      var dt = String(o.date || '').trim();
      if(!t || !/^\d{4}-\d{1,2}-\d{1,2}$/.test(dt)) return;
      var p = dt.split('-');
      dt = p[0] + '-' + pad(parseInt(p[1], 10)) + '-' + pad(parseInt(p[2], 10));
      if(state.dates.some(function(d){ return d.title === t && d.date === dt; })) return;
      state.dates.push({id:uid(), title:t, date:dt, yearly:o.yearly !== false, note:String(o.note || ''),
                        src:'auto', iid:(state.dateCfg && state.dateCfg.perIdentity) ? curIdentityId() : '', ts:Date.now()});
      added++;
    });
    if(!added){ if(!quiet) toast('没有新的纪念日（可能都记过了）'); return; }
    save('dates'); renderers.dates();
    toast('记下了 ' + added + ' 个纪念日');
    addNotice('date', '模型提炼了 ' + added + ' 个纪念日');
  });
}
// 从一段文字里抠出 JSON 数组（模型有时会在前后加话）
function parseJsonArray(txt){
  if(!txt) return null;
  var s = String(txt);
  var a = s.indexOf('['), b = s.lastIndexOf(']');
  if(a < 0 || b <= a) return null;
  try{ var o = JSON.parse(s.slice(a, b + 1)); return (o && o.length) ? o : null; }catch(e){ return null; }
}
renderers.dates = function(){
  // 设置卡
  var cfgBox = $('dateCfgCard');
  if(cfgBox){
    var c = state.dateCfg;
    cfgBox.innerHTML = '<h3>纪念日怎么来</h3>'
      + '<label class="row" style="font-size:13px;margin-top:6px;"><input type="checkbox" id="dcId" style="width:auto;"' + (c.perIdentity ? ' checked' : '') + '> 跟随身份切换（每个身份一份纪念日）</label>'
      + '<label class="row" style="font-size:13px;margin-top:6px;"><input type="checkbox" id="dcAuto" style="width:auto;"' + (c.auto ? ' checked' : '') + '> 自动让模型从日常 / 聊天里提炼纪念日</label>'
      + '<div class="btn-row" style="margin-top:8px;gap:8px;">'
      + '<button class="btn small" id="dcGen">让模型提炼一次</button>'
      + '<button class="btn small ghost" id="dcNow">看看今天是什么日子</button></div>'
      + '<div class="hint" style="margin-top:8px;line-height:1.7;">'
      + '手动添加走右上角「新建」。<br>'
      + '打开「跟随身份切换」后，换一个身份看到的就是另一份纪念日；关掉就是所有人共用一份。<br>'
      + '打开自动后，模型会读最近的聊天、日记和备忘，把值得记住的日子自动填进来。</div>';
    $('dcId').addEventListener('change', function(){
      state.dateCfg.perIdentity = $('dcId').checked;
      if(state.dateCfg.perIdentity){   // 打开时把已有的纪念日归到当前身份
        var iid = curIdentityId();
        state.dates.forEach(function(d){ if(!d.iid) d.iid = iid; });
      }
      save('dateCfg'); save('dates'); renderers.dates();
    });
    $('dcAuto').addEventListener('change', function(){
      state.dateCfg.auto = $('dcAuto').checked;
      save('dateCfg');
      if(state.dateCfg.auto){ toast('已打开，等一会儿会自动提炼'); setTimeout(genDatesFromModel, 800); }
    });
    $('dcGen').addEventListener('click', function(){ genDatesFromModel(); });
    $('dcNow').addEventListener('click', function(){
      var tip = specialDayTip();
      toast(tip || '今天没有记下的纪念日');
    });
  }
  var box = $('dateList');
  if(!box) return;
  var list = (curDates() || []).slice();
  if(!list.length){ box.innerHTML = '<div class="empty">还没有纪念日，点右上角「新建」，或者让模型帮你提炼</div>'; return; }
  list.sort(function(a, b){ return String(a.date || '').localeCompare(String(b.date || '')); });
  box.innerHTML = list.map(function(d){
    var src = d.src === 'auto' ? '<span class="badge">模型提炼</span>' : '';
    return '<div class="item">'
      + '<div class="row between"><b>' + esc(d.title) + ' ' + src + '</b><span class="m">' + esc(d.date) + '</span></div>'
      + '<div class="m">' + (d.yearly ? '每年都过' : '只有这一次') + ' · ' + daysTo(d.date) + (d.note ? ' · ' + esc(d.note) : '') + '</div>'
      + '<div class="acts"><button class="btn small ghost" data-dedit="' + d.id + '">改</button>'
      + '<button class="btn small ghost" data-ddate="' + d.id + '">删</button></div></div>';
  }).join('');
  $$('[data-dedit]', box).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-dedit');
      var d = state.dates.filter(function(x){ return x.id === id; })[0]; if(!d) return;
      openDateModal(d);
    });
  });
  $$('[data-ddate]', box).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-ddate');
      state.dates = state.dates.filter(function(d){ return d.id !== id; });
      save('dates'); renderers.dates();
    });
  });
};
function openDateModal(d){
  var isNew = !d;
  d = d || {id:uid(), title:'', date:'', yearly:true, note:'', src:'me', iid:''};
  openModal(isNew ? '新建纪念日' : '改纪念日',
      '<label class="fld">名字</label><input type="text" id="dT" value="' + esc(d.title) + '" placeholder="例如：认识纪念日">'
    + '<label class="fld">日期</label><input type="date" id="dD" value="' + esc(d.date) + '">'
    + '<label class="row" style="margin-top:8px;font-size:13px;"><input type="checkbox" id="dY" style="width:auto;"' + (d.yearly ? ' checked' : '') + '> 每年都过（生日、纪念日）</label>'
    + '<label class="fld">备注</label><input type="text" id="dN" value="' + esc(d.note) + '">',
    [{text:'保存', fn:function(box){
      d.title = box.querySelector('#dT').value;
      d.date = box.querySelector('#dD').value;
      d.yearly = box.querySelector('#dY').checked;
      d.note = box.querySelector('#dN').value;
      d.src = d.src || 'me';
      d.iid = (state.dateCfg && state.dateCfg.perIdentity) ? curIdentityId() : (d.iid || '');
      if(isNew) state.dates.push(d);
      save('dates'); renderers.dates();
      // 到当天时给个通知
      if(specialDayTip()) addNotice('date', '今天：' + d.title);
    }}]);
}
$('btnAddDate').addEventListener('click', function(){ openDateModal(null); });
// 自动提炼：开着开关时，每隔一阵子跑一次
setInterval(function(){
  if(!state.dateCfg || !state.dateCfg.auto) return;
  if(currentScreen !== 'home' && currentScreen !== 'dates') return;
  genDatesFromModel(true);
}, 1800000);

/* ---------- 计划：短期（时间轴）+ 长期（月历） ---------- */
var planMonth = null;    // 月历当前看到哪个月（null=本月）
var WEEK_CN = ['日','一','二','三','四','五','六'];

function ymd(d){ return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }
function todayStr(){ return ymd(new Date()); }
// 短期计划：按时间先后排
function shortPlans(){
  return (state.plans || []).filter(function(p){ return (p.type || 'short') === 'short'; })
    .sort(function(a, b){
      var ka = (a.date || '9999-99-99') + ' ' + (a.time || '99:99');
      var kb = (b.date || '9999-99-99') + ' ' + (b.time || '99:99');
      if(ka === kb) return (a.ts || 0) - (b.ts || 0);
      return ka.localeCompare(kb);
    });
}
function longPlans(){
  return (state.plans || []).filter(function(p){ return p.type === 'long'; })
    .sort(function(a, b){ return String(a.date || '9999').localeCompare(String(b.date || '9999')); });
}
function plansOnDate(ds){
  return (state.plans || []).filter(function(p){ return p.date === ds; });
}
// 时间轴上显示的时间文字
function planWhen(p){
  if(!p.date) return '还没定时间';
  var s = p.date.slice(5).replace('-', '月') + '日';
  if(p.time) s += ' ' + p.time;
  var d = daysTo(p.date);
  return s + ' · ' + d;
}
function isSoon(p){
  if(!p.date || p.done) return false;
  var t = new Date(p.date + 'T00:00:00').getTime();
  if(isNaN(t)) return false;
  var diff = Math.ceil((t - new Date().setHours(0,0,0,0)) / 86400000);
  return diff >= 0 && diff <= 2;
}
/* --- 从备忘里抠出日期和时间 --- */
function extractWhen(text){
  var s = String(text || '');
  var now = new Date(), res = {date:'', time:''};
  var m;
  if((m = s.match(/(\d{4})\s*[-年\/]\s*(\d{1,2})\s*[-月\/]\s*(\d{1,2})/))){
    res.date = m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]);
  } else if((m = s.match(/(\d{1,2})\s*[月\/]\s*(\d{1,2})\s*[日号]?/))){
    var mm = +m[1], dd = +m[2];
    if(mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31){
      var y = now.getFullYear();
      if(mm < now.getMonth() + 1) y += 1;              // 已经过了就当明年
      res.date = y + '-' + pad(mm) + '-' + pad(dd);
    }
  } else if(/后天/.test(s)){
    var d2 = new Date(now.getTime() + 2 * 86400000); res.date = ymd(d2);
  } else if(/明天|明日/.test(s)){
    var d1 = new Date(now.getTime() + 86400000); res.date = ymd(d1);
  } else if(/今天|今日/.test(s)){
    res.date = ymd(now);
  } else if((m = s.match(/(?:下)?[周星期]\s*([一二三四五六日天1-7])/))){
    var map = {'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'日':0,'天':0,'1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':0};
    var want = map[m[1]], cur = now.getDay(), add = (want - cur + 7) % 7;
    if(add === 0) add = 7;
    if(/下/.test(s)) add += 7;
    res.date = ymd(new Date(now.getTime() + add * 86400000));
  }
  // 时间
  if((m = s.match(/(\d{1,2})\s*[:：]\s*(\d{2})/))){
    res.time = pad(+m[1]) + ':' + m[2];
  } else if((m = s.match(/(上午|中午|下午|晚上|傍晚)?\s*(\d{1,2})\s*点(半)?/))){
    var hh = +m[2];
    if(/下午|晚上|傍晚/.test(m[1] || '') && hh < 12) hh += 12;
    res.time = pad(hh) + ':' + (m[3] ? '30' : '00');
  }
  return res;
}
// 把备忘里带时间的条目按事件时间顺序填进计划
function fillPlansFromNotes(quiet){
  var added = 0;
  (state.notes || []).forEach(function(n){
    if(n && n._plan) return;                       // 这条已经填过
    var w = extractWhen(n.text || '');
    if(!w.date) return;
    var days = Math.round((new Date(w.date + 'T00:00:00').getTime() - new Date().setHours(0,0,0,0)) / 86400000);
    state.plans.push({id:uid(), title:String(n.text || '').slice(0, 40), done:false, by:'me', ts:Date.now(),
                      type:(days <= 31 ? 'short' : 'long'), date:w.date, time:w.time || '', src:'note'});
    n._plan = 1;
    added++;
  });
  if(!added){ if(!quiet) toast('备忘里没有找到带日期的事'); return; }
  save('notes'); save('plans'); renderers.plans();
  toast('从备忘填进了 ' + added + ' 条计划');
  addNotice('plan', '备忘里有 ' + added + ' 件事排进了计划');
}
// 让模型从日常 / 聊天里生成计划
function genPlansFromModel(quiet){
  if(!hasTextModel()){ if(!quiet) toast('先在「模型」里接好文字模型'); return; }
  var digest = dailyDigest(50);
  if(!digest.trim()){ if(!quiet) toast('还没有聊天 / 日记 / 备忘可以分析'); return; }
  if(!quiet) toast('模型正在读你们的日常…');
  var now = new Date();
  var sys = '你是帮用户整理「计划」的助手。你会读到用户和某个人的聊天、日记、备忘。\n'
    + '请从中找出他们**打算一起做 / 约好要做 / 提到过要做**的事。\n'
    + '只输出 JSON 数组，不要任何其他文字，格式：\n'
    + '[{"title":"一起去看那部电影","date":"' + ymd(now) + '","time":"19:30","type":"short"}]\n'
    + '规则：date 用 YYYY-MM-DD，不确定就用今天 ' + ymd(now) + ' 往后合理的日子；'
    + 'time 用 HH:MM，不确定就留空字符串；'
    + '一个月内会做的 type 写 short，更远的写 long；最多 6 条；不要编造聊天里完全没提的事。';
  askModel(sys, '下面是你们的日常记录：\n' + digest + '\n\n请整理出计划：', function(r){
    var list = parseJsonArray(r);
    if(!list || !list.length){ if(!quiet) toast('模型这次没整理出计划'); return; }
    var added = 0;
    list.forEach(function(o){
      var t = String(o.title || '').trim();
      if(!t) return;
      var dt = String(o.date || '').trim();
      if(!/^\d{4}-\d{1,2}-\d{1,2}$/.test(dt)) dt = ymd(now);
      var p = dt.split('-');
      dt = p[0] + '-' + pad(+p[1]) + '-' + pad(+p[2]);
      var tm = /^\d{1,2}:\d{2}$/.test(String(o.time || '')) ? o.time : '';
      if(state.plans.some(function(x){ return x.title === t && x.date === dt; })) return;
      state.plans.push({id:uid(), title:t, done:false, by:'me', ts:Date.now(),
                        type:(o.type === 'long' ? 'long' : 'short'), date:dt, time:tm, src:'auto'});
      added++;
    });
    if(!added){ if(!quiet) toast('没有新的计划（可能都排过了）'); return; }
    save('plans'); renderers.plans();
    toast('排进了 ' + added + ' 条计划');
    addNotice('plan', '模型整理了 ' + added + ' 条计划');
  });
}

/* --- 把时间轴 / 月历画成图 --- */
function drawPlanImage(kind){
  var items = (kind === 'calendar') ? longPlans() : shortPlans();
  var W = 760, padX = 34, y = 0;
  var title = (kind === 'calendar') ? '长期计划 · 月历' : '短期计划 · 时间轴';
  var lines = [];
  if(kind === 'calendar'){
    var md = planMonth || new Date();
    var yy = md.getFullYear(), mo = md.getMonth() + 1;
    var first = new Date(yy, md.getMonth(), 1);
    var startDow = first.getDay();
    var days = new Date(yy, md.getMonth() + 1, 0).getDate();
    var cells = [];
    for(var i = 0; i < startDow; i++) cells.push(null);
    for(var d = 1; d <= days; d++) cells.push(d);
    while(cells.length % 7 !== 0) cells.push(null);
    var rows = Math.ceil(cells.length / 7);
    var H = 150 + rows * 78 + 40;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var c = cv.getContext('2d');
    c.fillStyle = '#eef4fa'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#ffffff'; c.fillRect(14, 14, W - 28, H - 28);
    c.fillStyle = '#4a7fa8'; c.font = 'bold 22px sans-serif';
    c.fillText(title + '　' + yy + '年' + mo + '月', padX, 54);
    c.fillStyle = '#8fa3b5'; c.font = '14px sans-serif';
    c.fillText('共有 ' + items.length + ' 条长期计划', padX, 78);
    // 星期
    var cw = (W - padX * 2) / 7;
    WEEK_CN.forEach(function(w, i){
      c.fillStyle = '#7f93a6'; c.font = 'bold 13px sans-serif';
      c.fillText('周' + w, padX + i * cw + 8, 106);
    });
    cells.forEach(function(dd, idx){
      var r = Math.floor(idx / 7), cc = idx % 7;
      var x = padX + cc * cw + 3, yy2 = 116 + r * 78;
      c.fillStyle = '#f6f9fc'; c.strokeStyle = '#dbe5ee'; c.lineWidth = 1;
      c.beginPath(); c.rect(x, yy2, cw - 6, 72); c.fill(); c.stroke();
      if(dd === null) return;
      c.fillStyle = '#33424f'; c.font = 'bold 12px sans-serif';
      c.fillText(String(dd), x + 7, yy2 + 17);
      var ds = yy + '-' + pad(mo) + '-' + pad(dd);
      var evs = items.filter(function(p){ return p.date === ds; }).slice(0, 2);
      evs.forEach(function(p, k){
        c.fillStyle = p.done ? '#b6c3cf' : '#cfe3f5';
        c.beginPath(); c.rect(x + 4, yy2 + 22 + k * 22, cw - 14, 19); c.fill();
        c.fillStyle = '#2f5d80'; c.font = '11px sans-serif';
        var tx = String(p.title || '');
        if(tx.length > 8) tx = tx.slice(0, 8) + '…';
        c.fillText(tx, x + 8, yy2 + 35 + k * 22);
      });
      if(items.filter(function(p){ return p.date === ds; }).length > 2){
        c.fillStyle = '#8fa3b5'; c.font = '10px sans-serif';
        c.fillText('…', x + 8, yy2 + 68);
      }
    });
    c.fillStyle = '#9fb0c0'; c.font = '12px sans-serif';
    c.fillText('小手机 · 计划', padX, H - 22);
    return cv;
  }
  // 时间轴
  var H = 130 + Math.max(1, items.length) * 74 + 40;
  var cv2 = document.createElement('canvas');
  cv2.width = W; cv2.height = H;
  var g = cv2.getContext('2d');
  g.fillStyle = '#eef4fa'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#ffffff'; g.fillRect(14, 14, W - 28, H - 28);
  g.fillStyle = '#4a7fa8'; g.font = 'bold 22px sans-serif';
  g.fillText(title, padX, 54);
  g.fillStyle = '#8fa3b5'; g.font = '14px sans-serif';
  g.fillText('共 ' + items.length + ' 条 · ' + ymd(new Date()), padX, 78);
  // 竖轴
  g.strokeStyle = '#cfdce8'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(padX + 12, 100); g.lineTo(padX + 12, H - 40); g.stroke();
  items.forEach(function(p, i){
    var yy3 = 112 + i * 74;
    g.fillStyle = p.done ? '#c3ccd5' : '#7fb0d8';
    g.beginPath(); g.arc(padX + 12, yy3 + 14, 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(padX + 12, yy3 + 14, 2.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#4a7fa8'; g.font = 'bold 13px sans-serif';
    g.fillText(planWhen(p), padX + 30, yy3 + 8);
    g.fillStyle = p.done ? '#9aa8b5' : '#2f4256'; g.font = '16px sans-serif';
    var tx = String(p.title || '');
    if(tx.length > 26) tx = tx.slice(0, 26) + '…';
    g.fillText(tx, padX + 30, yy3 + 32);
    g.fillStyle = '#96a7b7'; g.font = '11px sans-serif';
    g.fillText((p.src === 'note' ? '来自备忘' : p.src === 'auto' ? '模型生成' : p.by === 'him' ? '他加的' : '你加的')
      + (p.done ? ' · 已完成' : ''), padX + 30, yy3 + 50);
  });
  if(!items.length){
    g.fillStyle = '#96a7b7'; g.font = '15px sans-serif';
    g.fillText('（还没有短期计划）', padX + 30, 130);
  }
  g.fillStyle = '#9fb0c0'; g.font = '12px sans-serif';
  g.fillText('小手机 · 计划', padX, H - 20);
  return cv2;
}
// 图片存进相册
function canvasToAlbum(canvas, name){
  try{
    canvas.toBlob(function(blob){
      if(!blob){ toast('生成图片失败'); return; }
      idbPut('images', {id:uid(), name:name + '.png', blob:blob, ts:Date.now()}).then(function(ok){
        refreshAlbum();
        toast(ok ? '已存进相册，去「相册」里看' : '存进相册失败');
      });
    }, 'image/png');
  }catch(e){ toast('生成图片失败'); }
}
// 图片下载到设备本地
function canvasDownload(canvas, name){
  try{
    canvas.toBlob(function(blob){
      if(!blob){ toast('生成图片失败'); return; }
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name + '.png';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(a.href); }, 3000);
      toast('已下载 ' + name + '.png');
    }, 'image/png');
  }catch(e){ toast('下载失败'); }
}

renderers.plans = function(){
  var c = state.planCfg;
  var cfgBox = $('planCfgCard');
  if(cfgBox){
    cfgBox.innerHTML = '<h3>计划怎么来 · 怎么看</h3>'
      + '<div class="axis-bar" style="margin-top:8px;">'
      + '<button class="btn small ' + (c.axis === 'v' ? '' : 'ghost') + '" id="plAxisV">时间轴：纵向</button>'
      + '<button class="btn small ' + (c.axis === 'h' ? '' : 'ghost') + '" id="plAxisH">时间轴：横向</button></div>'
      + '<label class="row" style="font-size:13px;margin-top:4px;"><input type="checkbox" id="plFromNotes" style="width:auto;"' + (c.fromNotes ? ' checked' : '') + '> 备忘里带日期的事自动排进计划</label>'
      + '<label class="row" style="font-size:13px;margin-top:4px;"><input type="checkbox" id="plAuto" style="width:auto;"' + (c.auto ? ' checked' : '') + '> 自动让模型从日常 / 聊天里生成计划</label>'
      + '<div class="btn-row" style="margin-top:8px;gap:6px;flex-wrap:wrap;">'
      + '<button class="btn small" id="plGen">让模型生成一次</button>'
      + '<button class="btn small ghost" id="plNotes">把备忘填进来</button>'
      + '</div>'
      + '<div class="hint" style="margin-top:8px;line-height:1.7;">'
      + '手动添加走右上角「新建」。短期计划按时间先后排成时间轴（可切纵向 / 横向），长期计划用月历排。<br>'
      + '时间轴和月历都可以存进相册，或者下载到你设备本地。</div>';
    $('plAxisV').addEventListener('click', function(){ state.planCfg.axis = 'v'; save('planCfg'); renderers.plans(); });
    $('plAxisH').addEventListener('click', function(){ state.planCfg.axis = 'h'; save('planCfg'); renderers.plans(); });
    $('plFromNotes').addEventListener('change', function(){
      state.planCfg.fromNotes = $('plFromNotes').checked; save('planCfg');
      if(state.planCfg.fromNotes) fillPlansFromNotes();
    });
    $('plAuto').addEventListener('change', function(){
      state.planCfg.auto = $('plAuto').checked; save('planCfg');
      if(state.planCfg.auto){ toast('已打开，等一会儿会自动生成'); setTimeout(genPlansFromModel, 800); }
    });
    $('plGen').addEventListener('click', function(){ genPlansFromModel(); });
    $('plNotes').addEventListener('click', function(){ fillPlansFromNotes(); });
  }
  // ===== 短期计划：时间轴 =====
  var sBox = $('planShortBox');
  if(sBox){
    var sp = shortPlans();
    var h = '<div class="card glass"><h3>短期计划 · 时间轴（' + sp.length + '）</h3>';
    h += '<div class="btn-row" style="margin:6px 0 10px;gap:6px;">'
      + '<button class="btn small ghost" id="plSaveTl">存进相册</button>'
      + '<button class="btn small ghost" id="plDownTl">下载到本地</button></div>';
    if(!sp.length){
      h += '<div class="empty">还没有短期计划</div>';
    } else if(c.axis === 'h'){
      h += '<div class="tl-h">';
      sp.forEach(function(p){
        h += '<div class="tl-hitem' + (p.done ? ' done' : '') + '">'
          + '<div class="dot"></div>'
          + '<div class="tl-t">' + esc(p.date ? p.date.slice(5) : '未定') + (p.time ? ' ' + esc(p.time) : '') + '</div>'
          + '<div class="tl-b">' + esc(p.title) + '</div>'
          + '<div class="tl-m">' + esc(p.src === 'note' ? '备忘' : p.src === 'auto' ? '模型' : (p.by === 'him' ? '他' : '我')) + '</div>'
          + '<div class="btn-row" style="margin-top:6px;gap:4px;">'
          + '<button class="btn small ghost" data-pdone2="' + p.id + '">' + (p.done ? '撤销' : '完成') + '</button>'
          + '<button class="btn small ghost" data-pdel="' + p.id + '">删</button></div>'
          + '</div>';
      });
      h += '</div>';
    } else {
      h += '<div class="tl">';
      sp.forEach(function(p){
        h += '<div class="tl-item' + (p.done ? ' done' : '') + (isSoon(p) ? ' due' : '') + '">'
          + '<div class="tl-t">' + esc(planWhen(p)) + '</div>'
          + '<div class="tl-b">' + esc(p.title) + '</div>'
          + '<div class="tl-m">' + esc(p.src === 'note' ? '来自备忘' : p.src === 'auto' ? '模型生成' : (p.by === 'him' ? '他加的' : '你加的')) + '</div>'
          + '<div class="btn-row" style="margin-top:6px;gap:6px;">'
          + '<button class="btn small ghost" data-pdone2="' + p.id + '">' + (p.done ? '撤销完成' : '完成') + '</button>'
          + '<button class="btn small ghost" data-pedit="' + p.id + '">改</button>'
          + '<button class="btn small ghost" data-pdel="' + p.id + '">删</button></div>'
          + '</div>';
      });
      h += '</div>';
    }
    h += '</div>';
    sBox.innerHTML = h;
    var sv = $('plSaveTl'), dv = $('plDownTl');
    if(sv) sv.addEventListener('click', function(){ canvasToAlbum(drawPlanImage('timeline'), '短期计划时间轴'); });
    if(dv) dv.addEventListener('click', function(){ canvasDownload(drawPlanImage('timeline'), '短期计划时间轴'); });
    bindPlanButtons(sBox);
  }
  // ===== 长期计划：月历 =====
  var lBox = $('planLongBox');
  if(lBox){
    var lp = longPlans();
    var md = planMonth || new Date();
    var yy = md.getFullYear(), mo = md.getMonth() + 1;
    var first = new Date(yy, md.getMonth(), 1);
    var startDow = first.getDay();
    var days = new Date(yy, md.getMonth() + 1, 0).getDate();
    var h2 = '<div class="card glass"><h3>长期计划 · 月历（' + lp.length + '）</h3>';
    h2 += '<div class="cal-head">'
      + '<button class="btn small ghost" id="plPrevM">‹ 上月</button>'
      + '<b>' + yy + '年' + mo + '月</b>'
      + '<button class="btn small ghost" id="plNextM">下月 ›</button></div>';
    h2 += '<div class="btn-row" style="margin-bottom:10px;gap:6px;">'
      + '<button class="btn small ghost" id="plSaveCal">存进相册</button>'
      + '<button class="btn small ghost" id="plDownCal">下载到本地</button></div>';
    h2 += '<div class="cal-grid">';
    WEEK_CN.forEach(function(w){ h2 += '<div class="cal-w">' + w + '</div>'; });
    var cells = [];
    for(var i = 0; i < startDow; i++) cells.push(0);
    for(var d = 1; d <= days; d++) cells.push(d);
    cells.forEach(function(dd){
      if(!dd){ h2 += '<div class="cal-d out"></div>'; return; }
      var ds = yy + '-' + pad(mo) + '-' + pad(dd);
      var evs = plansOnDate(ds).filter(function(p){ return p.type === 'long'; });
      var cls = 'cal-d' + (ds === todayStr() ? ' today' : '');
      h2 += '<div class="' + cls + '" data-cald="' + ds + '"><div class="dn">' + dd + '</div>';
      evs.slice(0, 2).forEach(function(p){
        h2 += '<div class="ev"' + (p.done ? ' style="opacity:.55;text-decoration:line-through;"' : '') + ' title="' + esc(p.title) + '">' + esc(p.title) + '</div>';
      });
      if(evs.length > 2) h2 += '<div class="more">+' + (evs.length - 2) + '</div>';
      h2 += '</div>';
    });
    h2 += '</div>';
    if(!lp.length) h2 += '<div class="empty" style="margin-top:8px;">还没有长期计划（一个月以后的事会排到这里）</div>';
    h2 += '</div>';
    lBox.innerHTML = h2;
    $('plPrevM').addEventListener('click', function(){
      var b = planMonth || new Date();
      planMonth = new Date(b.getFullYear(), b.getMonth() - 1, 1); renderers.plans();
    });
    $('plNextM').addEventListener('click', function(){
      var b = planMonth || new Date();
      planMonth = new Date(b.getFullYear(), b.getMonth() + 1, 1); renderers.plans();
    });
    $('plSaveCal').addEventListener('click', function(){ canvasToAlbum(drawPlanImage('calendar'), '长期计划月历'); });
    $('plDownCal').addEventListener('click', function(){ canvasDownload(drawPlanImage('calendar'), '长期计划月历'); });
    $$('[data-cald]', lBox).forEach(function(el){
      el.addEventListener('click', function(){
        var ds = el.getAttribute('data-cald');
        var list = plansOnDate(ds);
        openModal(ds + ' 这一天',
          list.length ? list.map(function(p){ return '<div class="item"><div class="t">' + esc(p.title) + '</div>'
            + '<div class="m">' + (p.type === 'long' ? '长期' : '短期') + (p.time ? ' · ' + esc(p.time) : '') + (p.done ? ' · 已完成' : '') + '</div></div>'; }).join('')
            : '<div class="hint">这一天没有安排</div>',
          [{text:'加一条到这天', fn:function(){ openPlanModal(null, ds); }}, {text:'关闭', cls:'ghost'}]);
      });
    });
  }
};
// 计划里的按钮：完成 / 改 / 删
function bindPlanButtons(scope){
  $$('[data-pdone2]', scope).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-pdone2');
      state.plans.forEach(function(p){ if(p.id === id) p.done = !p.done; });
      save('plans'); renderers.plans();
    });
  });
  $$('[data-pdel]', scope).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-pdel');
      state.plans = state.plans.filter(function(p){ return p.id !== id; });
      save('plans'); renderers.plans();
    });
  });
  $$('[data-pedit]', scope).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-pedit');
      var p = state.plans.filter(function(x){ return x.id === id; })[0];
      if(p) openPlanModal(p);
    });
  });
}
function openPlanModal(p, presetDate){
  var isNew = !p;
  p = p || {id:uid(), title:'', done:false, by:'me', ts:Date.now(), type:'short',
            date:presetDate || ymd(new Date()), time:'', src:'me'};
  openModal(isNew ? '新建计划' : '改计划',
      '<label class="fld">做什么</label><input type="text" id="plT" value="' + esc(p.title) + '" placeholder="例如：一起去看那部电影">'
    + '<label class="fld">短期还是长期</label><select id="plType">'
    + '<option value="short"' + ((p.type || 'short') === 'short' ? ' selected' : '') + '>短期（排进时间轴）</option>'
    + '<option value="long"' + (p.type === 'long' ? ' selected' : '') + '>长期（排进月历）</option></select>'
    + '<label class="fld">日期</label><input type="date" id="plD" value="' + esc(p.date || '') + '">'
    + '<label class="fld">时间（可空）</label><input type="time" id="plTime" value="' + esc(p.time || '') + '">',
    [{text:'保存', fn:function(box){
      var t = (box.querySelector('#plT').value || '').trim();
      if(!t){ toast('写点什么吧'); return; }
      p.title = t;
      p.type = box.querySelector('#plType').value;
      p.date = box.querySelector('#plD').value;
      p.time = box.querySelector('#plTime').value;
      if(isNew) state.plans.push(p);
      save('plans'); renderers.plans();
    }}, {text:'取消', cls:'ghost'}]);
}
$('btnAddPlan').addEventListener('click', function(){ openPlanModal(null); });
// 备忘自动排计划：开着开关时，新增备忘会顺带填进来
setInterval(function(){
  if(state.planCfg && state.planCfg.fromNotes) fillPlansFromNotes(true);
  if(state.planCfg && state.planCfg.auto && (currentScreen === 'home' || currentScreen === 'plans')) genPlansFromModel(true);
}, 1800000);
// 他偶尔会自己加一条计划，或者完成一条
setInterval(function(){
  if(Math.random() > 0.35) return;
  var pool = ['下次见面一起去吃那家店','想一起看的那部电影','周末去散个步','记得提醒我那件事','一起学完那一课'];
  if(state.plans.filter(function(p){ return !p.done; }).length < 6 && Math.random() < 0.6){
    var when = new Date(Date.now() + (1 + Math.floor(Math.random() * 20)) * 86400000);
    state.plans.unshift({id:uid(), title:pick(pool), done:false, by:'him', ts:Date.now(),
                         type:'short', date:ymd(when), time:'', src:'him'});
    addNotice('plan', (state.persona.name||'他') + '加了一条计划');
  } else {
    var undone = state.plans.filter(function(p){ return !p.done; });
    if(undone.length){
      undone[0].done = true;
      addNotice('plan', '完成了：' + undone[0].title);
      pushMessage('him', '「' + undone[0].title + '」我划掉了。', 'text');
    }
  }
  save('plans');
}, 1800000);

/* ---------- 亲密度 / 成长 ---------- */
/* ---------- 亲密度：按人设卡自动生成卡片，可归类到世界书文件夹 ---------- */
var growthFolderId = null;   // 分类页正在看哪个文件夹（null=未分类）
var growthCardPid = '';      // 详情页正在看哪张人设卡
// 卡片进度
function gProgress(c){
  var inLv = (c.point || 0) % 60;
  return {inLv: inLv, pct: Math.round(inLv / 60 * 100), left: 60 - inLv};
}
// 一张卡片的 HTML
function growthCardHTML(p, c, clickable){
  var pr = gProgress(c);
  var fn = folderName(c.folderId);
  return '<div class="gcard" data-gcard="' + p.id + '">'
    + '<span class="gava">' + wxAvaHTML('him', p, 38) + '</span>'
    + '<div class="ginfo">'
    + '<div class="gname">' + esc(p.name || '他') + ' <span class="glv">' + (c.level || 1) + ' 级</span></div>'
    + '<div class="hint" style="font-size:11.5px;">已积累 ' + (c.point || 0) + ' 点 · 还差 ' + pr.left + ' 点升级</div>'
    + '<div class="bar" style="margin-top:5px;"><i style="width:' + pr.pct + '%;"></i></div>'
    + '<div class="gfolder">' + (fn ? '分类：' + esc(fn) : '还没分类')
    + ' <button class="btn small ghost" data-gfmove="' + p.id + '" style="padding:1px 6px;font-size:11px;">改分类</button></div>'
    + '</div></div>';
}
renderers.growth = function(){
  ensureGrowthCards(); ensureWorldFolders(); ensurePersonas();
  var box = $('growthBody');
  if(!box) return;
  // 主卡：当前正在聊的这个人的亲密度
  var g = state.growth, pr = gProgress(g);
  var cur = curPersona() || {name:'他'};
  var html = '<div class="card glass" style="text-align:center;">'
    + '<div style="color:var(--c-primary);">' + lnIcon('heart', 38) + '</div>'
    + '<div style="font-size:22px;font-weight:600;margin-top:4px;">' + (g.level || 1) + ' 级</div>'
    + '<div class="hint">' + esc(cur.name || '他') + ' · 已经积累 ' + (g.point || 0) + ' 点亲密度</div>'
    + '<div class="bar" style="margin-top:10px;"><i style="width:' + pr.pct + '%;"></i></div>'
    + '<div class="hint" style="margin-top:6px;">距离下一级还差 ' + pr.left + ' 点</div>'
    + '</div>'
    + '<div class="card glass"><h3>已解锁</h3>'
    + ((g.unlocked && g.unlocked.length) ? g.unlocked.map(function(u){ return '<div class="item"><div class="t">' + lnIcon('star', 13) + ' ' + esc(u) + '</div></div>'; }).join('')
        : '<div class="empty">还没有解锁，多聊聊天吧</div>')
    + '</div>';
  // 按世界书文件夹分类：点一个分类会打开新的页面
  html += '<div class="card glass"><h3>按世界观分类看</h3>'
    + '<div class="hint" style="margin-bottom:8px;">每张人设卡都会自动生成一张亲密度卡片。你可以把它归到世界书的某个文件夹下，点分类就打开那一类人的页面。</div>';
  var all = state.personas.filter(function(p){ return !p.netId; });
  function inFolder(fid){ return all.filter(function(p){ return (growthCard(p.id).folderId || '') === fid; }); }
  var noneList = inFolder('');
  html += '<div class="gcat" data-gcat="__none"><div><div class="gc-l">未分类</div>'
    + '<div class="gc-m">' + noneList.length + ' 张卡片</div></div><span>›</span></div>';
  (state.worldFolders || []).forEach(function(f){
    var n = inFolder(f.id).length;
    html += '<div class="gcat" data-gcat="' + f.id + '"><div><div class="gc-l">' + esc(f.name) + '</div>'
      + '<div class="gc-m">' + n + ' 张卡片</div></div><span>›</span></div>';
  });
  if(!(state.worldFolders || []).length){
    html += '<div class="hint">还没有文件夹，去「世界书」里点「＋ 新文件夹」建一个。</div>';
  }
  html += '</div>';
  // 所有卡片
  html += '<div class="card glass"><h3>所有亲密度卡片（' + all.length + '）</h3>';
  if(!all.length) html += '<div class="empty">先去人设卡里建一个人</div>';
  all.forEach(function(p){ html += growthCardHTML(p, growthCard(p.id)); });
  html += '</div>'
    + '<div class="card glass"><h3>怎么涨亲密度</h3><div class="hint">每说一句话 +1 点；每 60 点升一级。升级会解锁新的口头禅、更亲昵的称呼，达到 5 级还会自动激活一条隐藏设定。</div></div>';
  box.innerHTML = html;
  bindGrowthPage(box);
};
// 分类页 / 主页面的按钮绑定
function bindGrowthPage(box){
  $$('[data-gcat]', box).forEach(function(el){
    el.addEventListener('click', function(){
      var v = el.getAttribute('data-gcat');
      growthFolderId = (v === '__none') ? '' : v;
      go('growthFolder');
    });
  });
  $$('[data-gcard]', box).forEach(function(el){
    el.addEventListener('click', function(e){
      if(e.target.closest('[data-gfmove]')) return;
      growthCardPid = el.getAttribute('data-gcard');
      go('growthCard');
    });
  });
  $$('[data-gfmove]', box).forEach(function(el){
    el.addEventListener('click', function(e){
      e.stopPropagation();
      var pid = el.getAttribute('data-gfmove');
      var c = growthCard(pid);
      ensureWorldFolders();
      openModal('归到哪个世界观下',
        '<div class="hint" style="margin-bottom:6px;">分类用的是「世界书」里的文件夹。</div>'
        + '<label class="fld">文件夹</label><select id="gcf">' + folderOptions(c.folderId || '') + '</select>',
        [{text:'保存', fn:function(b){
          c.folderId = b.querySelector('#gcf').value;
          save('growthMap');
          toast('已归类');
          try{ renderers[currentScreen](); }catch(e){ renderers.growth(); }
        }}, {text:'取消', cls:'ghost'}]);
    });
  });
}
// 某个分类里所有人的亲密度（新页面）
renderers.growthFolder = function(){
  ensureGrowthCards(); ensureWorldFolders(); ensurePersonas();
  var fid = (growthFolderId === null) ? '' : growthFolderId;
  var title = fid ? (folderName(fid) || '（已删除的文件夹）') : '未分类';
  $('gfTitle').textContent = title;
  var box = $('growthFolderBody');
  var list = state.personas.filter(function(p){
    return !p.netId && (growthCard(p.id).folderId || '') === fid;
  });
  var h = '<div class="card glass"><h3>' + esc(title) + '（' + list.length + ' 张卡片）</h3>'
    + '<div class="hint">点一张卡片可以看这个人的完整亲密度。</div></div>';
  if(!list.length){
    h += '<div class="empty">这一类里还没有人。回上一页点「改分类」把卡片挪进来。</div>';
  } else {
    list.forEach(function(p){ h += growthCardHTML(p, growthCard(p.id)); });
  }
  box.innerHTML = h;
  bindGrowthPage(box);
};
// 一个人的亲密度详情（新页面）
renderers.growthCard = function(){
  ensureGrowthCards();
  var p = (state.personas || []).filter(function(x){ return x.id === growthCardPid; })[0];
  var box = $('growthCardBody');
  if(!p){
    box.innerHTML = '<div class="empty">这张人设卡已经不在了</div>';
    return;
  }
  var c = growthCard(p.id), pr = gProgress(c);
  $('gcTitle').textContent = (p.name || '他') + ' 的亲密度';
  var fn = folderName(c.folderId);
  var h = '<div class="card glass" style="text-align:center;">'
    + '<div style="margin:0 auto;width:56px;height:56px;">' + wxAvaHTML('him', p, 56) + '</div>'
    + '<div style="font-size:24px;font-weight:600;margin-top:6px;">' + (c.level || 1) + ' 级</div>'
    + '<div class="hint">' + esc(p.name || '他') + ' · 已积累 ' + (c.point || 0) + ' 点</div>'
    + '<div class="bar" style="margin-top:10px;"><i style="width:' + pr.pct + '%;"></i></div>'
    + '<div class="hint" style="margin-top:6px;">距离下一级还差 ' + pr.left + ' 点</div>'
    + '<div class="hint" style="margin-top:6px;">' + (fn ? '世界观分类：' + esc(fn) : '还没分类') + '</div>'
    + '<div class="btn-row" style="margin-top:10px;gap:8px;">'
    + '<button class="btn small ghost" id="gcMove">改分类</button>'
    + '<button class="btn small ghost" id="gcChat">去跟他聊</button></div>'
    + '</div>'
    + '<div class="card glass"><h3>已解锁</h3>'
    + ((c.unlocked && c.unlocked.length) ? c.unlocked.map(function(u){ return '<div class="item"><div class="t">' + lnIcon('star', 13) + ' ' + esc(u) + '</div></div>'; }).join('')
        : '<div class="empty">还没有解锁，多聊聊天吧</div>')
    + '</div>'
    + '<div class="card glass"><h3>这个人</h3>'
    + '<div class="hint" style="line-height:1.8;">' + esc([p.gender, p.age].filter(Boolean).join(' · ') || '（没填资料）')
    + (p.tone ? '<br>性子：' + esc(p.tone) : '')
    + (p.catchphrase ? '<br>口头禅：' + esc(p.catchphrase) : '') + '</div></div>';
  box.innerHTML = h;
  $('gcChat').addEventListener('click', function(){ switchPersona(p.id); wxPane = 'msg'; go('call'); });
  $('gcMove').addEventListener('click', function(){
    ensureWorldFolders();
    openModal('归到哪个世界观下', '<label class="fld">文件夹</label><select id="gcf">' + folderOptions(c.folderId || '') + '</select>',
      [{text:'保存', fn:function(b){
        c.folderId = b.querySelector('#gcf').value;
        save('growthMap'); renderers.growthCard(); toast('已归类');
      }}, {text:'取消', cls:'ghost'}]);
  });
};

/* ---------- 虚拟地图 ---------- */
renderers.map = function(){
  var m = state.mapData;
  $('mapBody').innerHTML =
      '<div id="mapArea">'
    + '<div class="map-grid"></div>'
    + '<div class="map-pin" id="pinHis" style="left:' + m.his.x + '%;top:' + m.his.y + '%;color:var(--c-primary);">' + lnIcon('pin', 24) + '<span class="lb">他</span></div>'
    + '<div class="map-pin" id="pinMy" style="left:' + m.my.x + '%;top:' + m.my.y + '%;color:var(--c-accent);">' + lnIcon('pin', 24) + '<span class="lb">我</span></div>'
    + (m.places || []).map(function(p){
        return '<div class="map-pin" style="left:' + p.x + '%;top:' + p.y + '%;">' + lnIcon('pin', 22) + '<span class="lb">' + esc(p.name) + '</span></div>';
      }).join('')
    + '</div>'
    + '<div class="btn-row" style="margin-top:12px;">'
    + '<button class="btn small ghost" id="btnMoveMy">把「我」放这儿</button>'
    + '<button class="btn small ghost" id="btnGoSomewhere">一起去个地方</button>'
    + '</div>'
    + '<div class="hint" style="margin-top:8px;">点地图可以移动标记；「一起去」会让他慢慢走过去，路上他会说话。</div>'
    + '<h3 style="margin:16px 0 8px;font-size:15px;">地点</h3><div class="list" id="placeList">'
    + ((m.places || []).length ? m.places.map(function(p, i){
        return '<div class="item"><div class="row between"><b>' + esc(p.name) + '</b><span class="m">' + Math.round(p.x) + ',' + Math.round(p.y) + '</span></div>'
          + '<div class="acts"><button class="btn small ghost" data-go="' + i + '">去这里</button>'
          + '<button class="btn small ghost" data-pdel="' + i + '">删</button></div></div>';
      }).join('') : '<div class="empty">还没加地点</div>')
    + '</div>'
    + '<h3 style="margin:16px 0 8px;font-size:15px;">去过的地方</h3><div class="list">'
    + ((m.log || []).length ? m.log.slice(0,20).map(function(l){
        return '<div class="item"><div class="t">' + esc(l.text) + '</div><div class="m">' + fmtFull(l.ts) + '</div></div>';
      }).join('') : '<div class="empty">还没有记录</div>')
    + '</div>';
  // 点地图移动
  $('mapArea').onclick = function(e){
    var r = this.getBoundingClientRect();
    var x = Math.round((e.clientX - r.left) / r.width * 100);
    var y = Math.round((e.clientY - r.top) / r.height * 100);
    movePin('my', x, y);
  };
  $('btnGoSomewhere').onclick = function(){
    var ps = state.mapData.places || [];
    if(!ps.length){ toast('先加几个地点'); return; }
    var html = '<label class="fld">选个目的地</label><select id="goSel">'
      + ps.map(function(p, i){ return '<option value="' + i + '">' + esc(p.name) + '</option>'; }).join('') + '</select>';
    openModal('一起去', html, [{text:'出发', fn:function(box){
      var i = parseInt(box.querySelector('#goSel').value, 10);
      var p = ps[i];
      movePinSlow('his', p.x, p.y, p.name);
    }}]);
  };
  $$('[data-go]', $('placeList')).forEach(function(el){
    el.addEventListener('click', function(){
      var p = state.mapData.places[parseInt(el.getAttribute('data-go'), 10)];
      movePinSlow('his', p.x, p.y, p.name);
    });
  });
  $$('[data-pdel]', $('placeList')).forEach(function(el){
    el.addEventListener('click', function(){
      state.mapData.places.splice(parseInt(el.getAttribute('data-pdel'), 10), 1);
      save('mapData'); renderers.map();
    });
  });
};
function movePin(who, x, y){
  state.mapData[who] = {x:x, y:y};
  save('mapData');
  var el = $('pin' + (who === 'his' ? 'His' : 'My'));
  if(el){ el.style.left = x + '%'; el.style.top = y + '%'; }
}
// 让他慢慢走过去：分几步移动，每步说一句话
function movePinSlow(who, x, y, placeName){
  var from = state.mapData[who];
  var steps = 5, i = 0;
  var sayings = ['我出门了。','在路上呢。','快到了，等我会儿。','到了，你呢？','到了，我在' + placeName + '等你。'];
  pushMessage('him', '那我们去「' + placeName + '」吧。', 'text');
  var timer = setInterval(function(){
    i++;
    var nx = Math.round(from.x + (x - from.x) * i / steps);
    var ny = Math.round(from.y + (y - from.y) * i / steps);
    movePin(who, nx, ny);
    pushMessage('him', sayings[Math.min(i, sayings.length-1)], 'text');
    if(i >= steps){
      clearInterval(timer);
      state.mapData.log.unshift({id:uid(), text:'一起去了「' + placeName + '」', ts:Date.now()});
      save('mapData');
      addMemory('一起去过：' + placeName, false, '地点');
      if(currentScreen === 'map') renderers.map();
    }
  }, 1400);
}
$('btnAddPlace').addEventListener('click', function(){
  openModal('加一个地点',
      '<input type="text" id="plN" placeholder="名字，例如：咖啡店">'
    + '<label class="fld">位置（0-100，先随便填，之后可以在地图上点）</label>'
    + '<div class="row"><input type="number" id="plX" value="50" min="0" max="100"><input type="number" id="plY" value="50" min="0" max="100"></div>',
    [{text:'加上', fn:function(box){
      var n = (box.querySelector('#plN').value || '').trim(); if(!n) return;
      state.mapData.places.push({id:uid(), name:n, x:parseInt(box.querySelector('#plX').value,10), y:parseInt(box.querySelector('#plY').value,10)});
      save('mapData'); renderers.map();
    }}]);
});

/* =====================================================================
   一起写：书架 + 轮流接龙
   书架上的每一篇 = state.shelf 里的一条 {id, title, mode, text, annots}
   ·写在书架上的文档只存在这里，不会进「记忆」
   ·mode = write  只书写      mode = annotate 可以请好友在（…）里批注
   ·每篇都能导出成 .txt / .docx 存到本机
   ===================================================================== */
var createTab = 'shelf';   // shelf=书架 relay=轮流接龙
var curDocId  = '';        // 文档编辑页正在编辑哪一篇
var saveDocTimer = null;

// 没写标题就拿正文第一句当标题
function shelfTitleOf(text, fallback){
  var lines = String(text || '').split(/\r?\n/).map(function(s){ return s.trim(); }).filter(Boolean);
  var t = String(lines[0] || '').replace(/^[#＃*\-—\s\d\.、，。]+/, '').trim();
  if(!t) t = String(fallback || '');
  if(!t) t = '写于 ' + fmtDate(Date.now());
  return t.length > 18 ? (t.slice(0, 18) + '…') : t;
}
// 新建一篇空白文档（mode: write | annotate）
function shelfNewDoc(text, mode, src, title){
  ensureShelf();
  var now = Date.now();
  var d = {
    id: uid(),
    title: title || shelfTitleOf(text, '未命名 · ' + fmtDate(now)),
    mode: (mode === 'annotate') ? 'annotate' : 'write',
    text: String(text || ''),
    annots: {},
    created: now, updated: now,
    src: src || 'shelf',
    pid: state.curPersona || '_'
  };
  state.shelf.unshift(d);
  save('shelf');
  return d;
}
// 存书架上这一篇（连带把聊天里那条预览更新掉）
function shelfSaveDoc(d, text){
  if(!d) return;
  if(text !== undefined) d.text = String(text || '');
  d.updated = Date.now();
  save('shelf');
  syncDocToMsg(d);
  save('messages');
}
function docBodyText(d){ return String((d && d.text) || '').trim(); }
function docAnnCount(d){
  var n = 0;
  if(d && d.annots) for(var k in d.annots) n += (d.annots[k] || []).length;
  return n;
}
function modeLabel(m){ return (m === 'annotate') ? '批注模式' : '仅书写'; }
// 文件名：去掉系统不许用的符号
function safeFileName(s){
  return String(s || '文档').replace(/[\\\/:*?"<>|\r\n]+/g, '_').slice(0, 60) || '文档';
}

/* ---------- 一起写主页：书架 / 轮流接龙 两个页签 ---------- */
renderers.create = function(){
  ensureShelf();
  var title = $('createTitle'), btn = $('btnCreateNew');
  if(createTab === 'shelf'){
    if(title) title.textContent = '一起写 · 书架';
    if(btn){ btn.textContent = '新建'; btn.style.display = ''; }
    renderShelf();
  } else {
    if(title) title.textContent = '一起写 · 接龙';
    if(btn){ btn.textContent = '新一篇'; btn.style.display = ''; }
    renderRelay();
  }
};
$('btnCreateNew').addEventListener('click', function(){
  if(createTab === 'shelf') openNewDocDialog();
  else openRelayNew();
});

function renderShelf(){
  var box = $('createBody'); if(!box) return;
  var list = state.shelf.slice().sort(function(a, b){
    return (b.updated || b.created || 0) - (a.updated || a.created || 0);
  });
  // 老数据：以前在聊天里写的文稿还没有进书架，这里给个一键搬家的按钮
  var oldOnes = (state.messages || []).filter(function(m){ return m.type === 'article' && !m.docId; });
  var html = '<div class="sh-tabbar">'
    + '<button class="btn small ' + (createTab === 'shelf' ? '' : 'ghost') + '" id="shTabShelf">' + lnIcon('book', 15) + ' 书架 ' + (state.shelf.length ? '(' + state.shelf.length + ')' : '') + '</button>'
    + '<button class="btn small ' + (createTab === 'relay' ? '' : 'ghost') + '" id="shTabRelay">' + lnIcon('relay', 15) + ' 轮流接龙</button></div>';

  if(!list.length){
    html += '<div class="card glass"><div class="sh-emptybox">'
      + '<div style="font-size:30px;">📚</div>'
      + '<div class="hint" style="margin-top:6px;">书架上还是空的。<br>点一下下面，开一篇空白文档。</div>'
      + '<button class="btn" id="shNewBig" style="margin-top:12px;">＋ 新建空白文档</button>'
      + '<div class="hint" style="margin-top:12px;">新建的时候可以选「仅书写」还是「批注模式」。</div>'
      + '</div></div>';
  } else {
    html += '<div class="list">';
    list.forEach(function(d){
      var prev = docBodyText(d).replace(/\s+/g, ' ').slice(0, 70) || '（还是空白）';
      var na = docAnnCount(d);
      html += '<div class="sh-book" data-doc="' + d.id + '">'
        + '<div class="sh-top"><span class="sh-name">' + esc(d.title || '无标题') + '</span>'
        + '<span class="sh-mode ' + (d.mode === 'annotate' ? 'ann' : 'write') + '">' + modeLabel(d.mode) + '</span></div>'
        + '<div class="sh-prev">' + esc(prev) + '</div>'
        + '<div class="sh-foot"><span class="sh-time">' + esc(fmtFull(d.updated || d.created))
        + (na ? '<span class="sh-count">' + na + ' 条批注</span>' : '')
        + (String(d.text || '').replace(/\s/g, '').length ? '<span class="sh-count">' + String(d.text).replace(/\s/g, '').length + ' 字</span>' : '')
        + '</span><span class="sh-ops">'
        + '<button class="btn ghost" data-doctxt="' + d.id + '">TXT</button>'
        + '<button class="btn ghost" data-docdocx="' + d.id + '">DOCX</button>'
        + '<button class="btn ghost" data-docdel="' + d.id + '">删除</button>'
        + '</span></div></div>';
    });
    html += '</div>';
  }
  html += '<div class="hint" style="margin-top:10px;line-height:1.8;">'
    + '点一篇就能继续写／改。写在这里的东西只保存进书架，不会写进「记忆」。<br>'
    + '导出会存到你本机的「下载」文件夹里。</div>';
  if(oldOnes.length){
    html += '<div class="card glass" style="margin-top:10px;"><div class="row between">'
      + '<b style="font-size:13px;">聊天里还有 ' + oldOnes.length + ' 篇旧文稿</b>'
      + '<button class="btn small" id="shImportOld">搬到书架上</button></div>'
      + '<div class="hint" style="margin-top:6px;">以前在微信批注模式里写的，搬过来就能在书架上一起看。</div></div>';
  }
  box.innerHTML = html;
  if($('shTabShelf')) $('shTabShelf').onclick = function(){ createTab = 'shelf'; renderers.create(); };
  if($('shTabRelay')) $('shTabRelay').onclick = function(){ createTab = 'relay'; renderers.create(); };
  if($('shNewBig'))   $('shNewBig').onclick   = function(){ openNewDocDialog(); };
  if($('shImportOld')) $('shImportOld').onclick = function(){ importOldArticles(); };
  $$('[data-doc]', box).forEach(function(el){
    el.addEventListener('click', function(){ openDoc(el.getAttribute('data-doc')); });
  });
  $$('[data-doctxt]', box).forEach(function(el){
    el.addEventListener('click', function(e){
      e.stopPropagation(); exportDocTxt(shelfDocById(el.getAttribute('data-doctxt')));
    });
  });
  $$('[data-docdocx]', box).forEach(function(el){
    el.addEventListener('click', function(e){
      e.stopPropagation(); exportDocDocx(shelfDocById(el.getAttribute('data-docdocx')));
    });
  });
  $$('[data-docdel]', box).forEach(function(el){
    el.addEventListener('click', function(e){
      e.stopPropagation();
      var id = el.getAttribute('data-docdel'), d = shelfDocById(id);
      if(!d) return;
      openModal('删掉这篇？', '<div class="hint">「' + esc(d.title) + '」会从书架上拿掉，删了找不回来。</div>',
        [{text:'删除', cls:'danger', fn:function(){
            state.shelf = state.shelf.filter(function(x){ return x.id !== id; });
            save('shelf'); closeModal(); renderers.create();
          }}, {text:'取消', cls:'ghost'}]);
    });
  });
}
// 把以前聊天里写的文稿搬进书架
function importOldArticles(){
  var n = 0;
  (state.messages || []).forEach(function(m){
    if(m.type !== 'article' || m.docId) return;
    var d = shelfNewDoc(m.text || '', 'annotate', 'chat', m.title || shelfTitleOf(m.text, '聊天里的文稿'));
    d.annots = m.annots || {};
    d.created = m.ts || d.created; d.updated = m.ts || d.updated;
    m.docId = d.id; n++;
  });
  save('shelf'); save('messages');
  renderers.create();
  toast(n ? ('搬了 ' + n + ' 篇到书架上') : '没有要搬的旧文稿');
}
// 新建空白文档：先选模式
function openNewDocDialog(){
  var html = ''
    + '<label class="fld">标题（可以先不管，之后随时改）</label>'
    + '<input type="text" id="ndTitle" placeholder="留空就用正文第一句当标题">'
    + '<label class="fld" style="margin-top:10px;">这一篇用哪种模式</label>'
    + '<div class="sh-modepick">'
    + '<label class="on"><input type="radio" name="ndMode" value="write" checked>'
    + '<b>仅书写</b><span>安静写，写完躺进书架</span></label>'
    + '<label><input type="radio" name="ndMode" value="annotate">'
    + '<b>批注模式</b><span>写好后请好友在（…）里批注</span></label></div>'
    + '<div class="hint" style="margin-top:10px;">不管哪种模式，都只存在书架上，不会进记忆。</div>';
  openModal('新建空白文档', html,
    [{text:'创建并开始写', fn:function(box){
        var mode = (box.querySelector('input[name=ndMode]:checked') || {}).value || 'write';
        var title = (box.querySelector('#ndTitle').value || '').trim();
        var d = shelfNewDoc('', mode, 'shelf', title || '未命名 · ' + fmtDate(Date.now()));
        closeModal();
        openDoc(d.id);
      }},
     {text:'取消', cls:'ghost'}]);
  var box = $('modalBox');
  $$('input[name=ndMode]', box).forEach(function(el){
    el.addEventListener('change', function(){
      $$('.sh-modepick label', box).forEach(function(l){ l.classList.remove('on'); });
      if(el.parentNode && el.parentNode.classList) el.parentNode.classList.add('on');
    });
  });
}

/* ---------- 文档编辑页 ---------- */
function openDoc(id){ curDocId = id; go('docwrite'); }
renderers.docwrite = function(){ renderDocBody(); };
function renderDocBody(){
  var box = $('docBody'); if(!box) return;
  var d = shelfDocById(curDocId);
  if(!d){
    box.innerHTML = '<div class="card glass"><div class="empty">这篇已经不在书架上了。</div>'
      + '<div class="btn-row" style="margin-top:10px;"><button class="btn ghost" data-back="create">回书架</button></div></div>';
    return;
  }
  var isAnn = (d.mode === 'annotate');
  $('docTopTitle').textContent = d.title || '写一篇';
  var html = ''
    + '<div class="card glass">'
    + '<div class="row between"><b>' + esc(d.title) + '</b>'
    + '<span class="hint">' + modeLabel(d.mode) + ' · ' + esc(fmtFull(d.updated || d.created)) + '</span></div>'
    + '<div class="btn-row" style="margin-top:10px;">'
    + '<button class="btn small" id="dwSave">保存</button>'
    + '<button class="btn small ghost" id="dwTitle">改标题</button>'
    + '<button class="btn small ghost" id="dwMode">换成' + (isAnn ? '仅书写' : '批注模式') + '</button>'
    + (isAnn ? '<button class="btn small ghost" id="dwAnnAll">整篇批注</button>' : '')
    + (isAnn ? '<button class="btn small ghost" id="dwAnnStyle">批注样式</button>' : '')
    + (isAnn ? '<button class="btn small ghost" id="dwAnnSet">批注设置</button>' : '')
    + '</div></div>'
    + '<div class="card glass"><label class="fld">正文</label>'
    + '<textarea id="docWriteArea" placeholder="写点什么…">' + esc(d.text || '') + '</textarea>'
    + '<div class="hint" id="dwCount"></div></div>';
  if(isAnn){
    html += '<div class="card glass"><label class="fld">批注（点段落上的「＋批注」请好友来读）</label>'
      + annDocHTML(d) + '</div>';
  }
  html += '<div class="card glass"><label class="fld">导出到本机</label>'
    + '<div class="btn-row"><button class="btn small" id="dwTxt">导出 .txt</button>'
    + '<button class="btn small ghost" id="dwDocx">导出 .docx</button></div>'
    + '<div class="hint" style="margin-top:8px;line-height:1.8;">'
    + '导出的正文会带上批注，写成「原文（好友名：批注）」的样子；文件存到你本机的下载文件夹。</div></div>';
  box.innerHTML = html;

  var ta = $('docWriteArea');
  function count(){
    var el = $('dwCount');
    if(el) el.textContent = String((ta.value || '').replace(/\s/g, '')).length + ' 字 · 改完会自动存进书架';
  }
  count();
  // 边写边存：停手 0.8 秒自动存一次，不用惦记「保存」
  ta.addEventListener('input', function(){
    count();
    if(saveDocTimer) clearTimeout(saveDocTimer);
    saveDocTimer = setTimeout(function(){
      saveDocTimer = null;
      var txt = ta.value || '';
      if(!(d.title || '').replace(/^未命名[^\S\n]*/, '').trim() || /^未命名/.test(d.title)){
        d.title = shelfTitleOf(txt, d.title);
      }
      shelfSaveDoc(d, txt);
      $('docTopTitle').textContent = d.title || '写一篇';
      if(d.mode === 'annotate') renderDocBody();   // 段落和批注按新正文重新排一遍
    }, 800);
  });
  function manualSave(){
    if(saveDocTimer){ clearTimeout(saveDocTimer); saveDocTimer = null; }
    shelfSaveDoc(d, ta.value || '');
    renderDocBody();
    toast('已存进书架');
  }
  $('dwSave').onclick = manualSave;
  $('btnDocSave').onclick = manualSave;
  $('dwTitle').onclick = function(){
    openModal('改标题', '<input type="text" id="dwT" value="' + esc(d.title || '') + '">',
      [{text:'保存', fn:function(b2){
          d.title = (b2.querySelector('#dwT').value || '').trim() || shelfTitleOf(d.text, d.title);
          d.updated = Date.now(); save('shelf'); closeModal(); renderDocBody();
        }}, {text:'取消', cls:'ghost'}]);
  };
  $('dwMode').onclick = function(){
    d.mode = (d.mode === 'annotate') ? 'write' : 'annotate';
    d.updated = Date.now(); save('shelf'); renderDocBody();
    toast('这篇改成' + modeLabel(d.mode) + '了');
  };
  if($('dwAnnAll')) $('dwAnnAll').onclick = function(){
    if(!docBodyText(d)){ toast('先写点东西再请他们读'); return; }
    shelfSaveDoc(d, ta.value || '');
    openAnnotPicker(d.id, 0, {all:true});
  };
  if($('dwAnnStyle')) $('dwAnnStyle').onclick = function(){ openAnnotStyleBox(null); };
  if($('dwAnnSet'))   $('dwAnnSet').onclick   = function(){ openAnnotSettings(); };
  $('dwTxt').onclick  = function(){ shelfSaveDoc(d, ta.value || ''); exportDocTxt(d); };
  $('dwDocx').onclick = function(){ shelfSaveDoc(d, ta.value || ''); exportDocDocx(d); };
  var annBox = box.querySelector('.ann-doc');
  if(annBox) bindAnnDoc(annBox.parentNode);
}
// 文稿里的「＋批注」「批注本身」的点击（聊天页和文档页共用一套）
function bindAnnDoc(box){
  if(!box) return;
  $$('[data-annadd]', box).forEach(function(el){
    el.addEventListener('click', function(e){
      e.stopPropagation();
      var v = String(el.getAttribute('data-annadd')).split('|');
      openAnnotPicker(v[0], parseInt(v[1], 10));
    });
  });
  $$('[data-annseg]', box).forEach(function(el){
    el.addEventListener('click', function(){
      var v = String(el.getAttribute('data-annseg')).split('|');
      openAnnotPicker(v[0], parseInt(v[1], 10));
    });
  });
  $$('[data-annitem]', box).forEach(function(el){
    el.addEventListener('click', function(e){
      e.stopPropagation();
      var v = String(el.getAttribute('data-annitem')).split('|');
      openAnnotItemMenu(v[0], parseInt(v[1], 10), v[2]);
    });
  });
}

/* ---------- 导出：纯文本 ---------- */
// 导出成什么样子：标题 + 说明 + 正文（批注模式把（名字：批注）接在段后）
function docExportLines(d){
  var out = [];
  var segs = splitSegments(String(d.text || ''), 'para');
  out.push(d.title || '无标题');
  out.push('（' + modeLabel(d.mode) + ' · ' + fmtFull(d.updated || d.created) + '）');
  out.push('');
  if(d.mode === 'annotate'){
    segs.forEach(function(seg, i){
      var list = (d.annots || {})[String(i)] || [];
      var inline = list.map(function(a){ return '（' + a.name + '：' + a.text + '）'; }).join('');
      out.push(seg + (inline ? inline : ''));
    });
  } else {
    out.push(String(d.text || ''));
  }
  return out;
}
function downloadBlobFile(name, blob){
  try{
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 4000);
    toast('已导出 ' + name);
  }catch(e){ toast('导出失败：' + e.message); }
}
function exportDocTxt(d){
  if(!d){ toast('找不到这篇文档'); return; }
  var s = docExportLines(d).join('\r\n') + '\r\n';
  // 前面加个 BOM，Windows 记事本打开才不会乱码
  var blob = new Blob(['\ufeff' + s], {type:'text/plain;charset=utf-8'});
  downloadBlobFile(safeFileName(d.title) + '.txt', blob);
}

/* ---------- 导出：Word(.docx) ---------- */
// docx 其实是一个 zip，里面放着几个 xml。这里手写一个最小可用的 zip 打包器。
var CRC_TABLE = null;
function crc32(u8){
  if(!CRC_TABLE){
    CRC_TABLE = [];
    for(var n = 0; n < 256; n++){
      var c = n;
      for(var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      CRC_TABLE[n] = c >>> 0;
    }
  }
  var cr = 0xFFFFFFFF;
  for(var i = 0; i < u8.length; i++) cr = CRC_TABLE[(cr ^ u8[i]) & 0xFF] ^ (cr >>> 8);
  return (cr ^ 0xFFFFFFFF) >>> 0;
}
function dosStamp(){
  var d = new Date();
  return {
    time: ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF,
    date: (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF
  };
}
// files: [{name:'...', data:Uint8Array}] → 返回一个 zip 的 Blob
async function zipBlob(files){
  var enc = new TextEncoder();
  var st = dosStamp();
  var locals = [], centrals = [], offset = 0, n = 0;
  var canDeflate = (typeof CompressionStream === 'function');
  for(var fi = 0; fi < files.length; fi++){
    var raw = files[fi].data;
    var method = 0, comp = raw;
    if(canDeflate && raw.length){
      try{
        var cs = new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'));
        var got = new Uint8Array(await new Response(cs).arrayBuffer());
        if(got && got.length){ comp = got; method = 8; }
      }catch(e){ method = 0; comp = raw; }
    }
    var nb = enc.encode(files[fi].name);
    var crc = crc32(raw);
    var lh = new Uint8Array(30 + nb.length), dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 0, true);
    dv.setUint16(8, method, true); dv.setUint16(10, st.time, true); dv.setUint16(12, st.date, true);
    dv.setUint32(14, crc, true); dv.setUint32(18, comp.length, true); dv.setUint32(22, raw.length, true);
    dv.setUint16(26, nb.length, true); dv.setUint16(28, 0, true);
    lh.set(nb, 30);
    locals.push(lh); locals.push(comp);
    var ch = new Uint8Array(46 + nb.length), cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true); cv.setUint16(10, method, true);
    cv.setUint16(12, st.time, true); cv.setUint16(14, st.date, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, comp.length, true); cv.setUint32(24, raw.length, true);
    cv.setUint16(28, nb.length, true); cv.setUint16(30, 0, true); cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true); cv.setUint16(36, 0, true); cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    ch.set(nb, 46);
    centrals.push(ch);
    offset += lh.length + comp.length;
    n++;
  }
  var cdSize = 0;
  centrals.forEach(function(c){ cdSize += c.length; });
  var eo = new Uint8Array(22), ev = new DataView(eo.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(4, 0, true); ev.setUint16(6, 0, true);
  ev.setUint16(8, n, true); ev.setUint16(10, n, true);
  ev.setUint32(12, cdSize, true); ev.setUint32(16, offset, true); ev.setUint16(20, 0, true);
  return new Blob(locals.concat(centrals, [eo]),
    {type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
function xmlSafe(s){
  return String(s == null ? '' : s)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// 一段 Word 段落：<w:p>…</w:p>
function docxPara(text, opt){
  opt = opt || {};
  var rpr = '';
  if(opt.bold)  rpr += '<w:b/>';
  if(opt.ital)  rpr += '<w:i/>';
  if(opt.color) rpr += '<w:color w:val="' + String(opt.color).replace('#','') + '"/>';
  if(opt.size)  rpr += '<w:sz w:val="' + opt.size + '"/><w:szCs w:val="' + opt.size + '"/>';
  if(!String(text || '').length) return '<w:p/>';
  return '<w:p>' + (opt.indent ? '<w:pPr><w:ind w:left="480"/></w:pPr>' : '')
    + '<w:r>' + (rpr ? ('<w:rPr>' + rpr + '</w:rPr>') : '')
    + '<w:t xml:space="preserve">' + xmlSafe(text) + '</w:t></w:r></w:p>';
}
function buildDocxFiles(d){
  var lines = docExportLines(d);
  var body = '';
  lines.forEach(function(ln, i){
    if(i === 0){ body += docxPara(ln, {bold:true, size:32}); return; }   // 标题
    if(i === 1){ body += docxPara(ln, {size:18, color:'777777', ital:true}); return; } // 时间/模式那行
    body += docxPara(ln);
  });
  // 批注模式：批注再单独按「谁说的」整理一份清单，方便打印出来看
  if(d.mode === 'annotate'){
    var na = docAnnCount(d);
    if(na){
      body += docxPara('');
      body += docxPara('批注清单（共 ' + na + ' 条）', {bold:true, size:24});
      var segs = splitSegments(String(d.text || ''), 'para');
      segs.forEach(function(seg, i){
        var list = (d.annots || {})[String(i)] || [];
        if(!list.length) return;
        body += docxPara('原文：' + seg, {color:'555555', size:20});
        list.forEach(function(a){
          body += docxPara(a.name + '：' + a.text, {indent:true, size:20});
        });
      });
    }
  }
  var enc = new TextEncoder();
  function f(name, str){ return {name:name, data:enc.encode(str)}; }
  return [
    f('[Content_Types].xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
      + '</Types>'),
    f('_rels/.rels',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
      + '</Relationships>'),
    f('word/document.xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
      + '<w:body>' + body + '</w:body></w:document>')
  ];
}
function exportDocDocx(d){
  if(!d){ toast('找不到这篇文档'); return; }
  toast('正在打包 Word 文档…');
  var name = safeFileName(d.title) + '.docx';
  try{
    zipBlob(buildDocxFiles(d)).then(function(blob){
      downloadBlobFile(name, blob);
    }).catch(function(){
      toast('Word 打包失败，先用 TXT 导吧');
    });
  }catch(e){ toast('导出失败：' + e.message); }
}

/* ---------- 轮流接龙（原来的一起写） ---------- */
function renderRelay(){
  var c = state.create;
  $('createBody').innerHTML =
      '<div class="sh-tabbar">'
    + '<button class="btn small ghost" id="shTabShelf">' + lnIcon('book', 15) + ' 书架' + (state.shelf.length ? ' (' + state.shelf.length + ')' : '') + '</button>'
    + '<button class="btn small" id="shTabRelay">' + lnIcon('relay', 15) + ' 轮流接龙</button></div>'
    + '<div class="card glass">'
    + '<div class="row between"><b>' + esc(c.title || '我们的故事') + '</b>'
    + '<button class="btn small ghost" id="cTitle">改标题</button></div>'
    + '<div style="margin-top:10px;">'
    + (c.lines.length ? c.lines.map(function(l){
        return '<div class="item" style="margin-bottom:6px;background:' + (l.who === 'me' ? 'var(--c-bubble-me)' : 'var(--c-bubble-him)') + ';">'
          + '<div class="t">' + esc(l.text) + '</div><div class="m">' + esc(l.who === 'me' ? meName() : (state.persona.name||'他')) + ' · ' + fmtTime(l.ts) + '</div></div>';
      }).join('') : '<div class="empty">还没写。你先起个头吧。</div>')
    + '</div>'
    + '<textarea id="cLine" placeholder="接一句…" style="margin-top:10px;"></textarea>'
    + '<div class="btn-row" style="margin-top:8px;"><button class="btn" id="cSend">我接一句</button>'
    + '<button class="btn ghost" id="cHe">让他接</button>'
    + '<button class="btn ghost" id="cMem">存进记忆</button></div>'
    + '</div>';
  if($('shTabShelf')) $('shTabShelf').onclick = function(){ createTab = 'shelf'; renderers.create(); };
  if($('shTabRelay')) $('shTabRelay').onclick = function(){ createTab = 'relay'; renderers.create(); };
  $('cSend').onclick = function(){
    var t = ($('cLine').value || '').trim(); if(!t) return;
    state.create.lines.push({id:uid(), who:'me', text:t, ts:Date.now()});
    save('create'); renderers.create();
  };
  $('cHe').onclick = function(){
    var last = state.create.lines.slice(-6).map(function(l){ return (l.who==='me'?meName():'他') + '：' + l.text; }).join('\n');
    askModel(buildSystemPrompt('') + '\n（你们正在轮流接龙写一个故事/歌词/日记，请只接一句，别写长）',
      '目前写到：\n' + last + '\n请你接下一句：', function(r){
        state.create.lines.push({id:uid(), who:'him', text:r, ts:Date.now()});
        save('create'); renderers.create();
      });
  };
  $('cMem').onclick = function(){
    var txt = state.create.lines.slice(-8).map(function(l){ return l.text; }).join('');
    addMemory('一起写的（' + esc(state.create.title||'我们的故事') + '）：' + txt.slice(0,100), false, '共同创作');
    toast('已存进记忆');
  };
  $('cTitle').onclick = function(){
    openModal('改标题', '<input type="text" id="ct" value="' + esc(state.create.title||'') + '">',
      [{text:'保存', fn:function(box){ state.create.title = box.querySelector('#ct').value; save('create'); renderers.create(); }}]);
  };
}
function openRelayNew(){
  openModal('新一轮接龙', '<input type="text" id="cn" placeholder="标题，例如：我们一起写的故事">',
    [{text:'开始', fn:function(box){
      state.create = {title: box.querySelector('#cn').value || '我们的故事', lines: []};
      save('create'); renderers.create();
    }}]);
}

/* =====================================================================
   第 13 段：共同学习 / 美化 / 安静陪伴 / 睡眠 / 一起看听
   ===================================================================== */

/* ---------- 共同学习 ---------- */
renderers.study = function(){
  var st = state.study;
  var langOpts = ['英语','日语','韩语','法语','德语','西班牙语'].map(function(l){
    return '<option value="' + l + '"' + (l === st.lang ? ' selected' : '') + '>' + l + '</option>';
  }).join('');
  var doneCount = Object.keys(st.progress || {}).length;
  $('studyBody').innerHTML =
      '<div class="card glass">'
    + '<label class="fld">模式</label>'
    + '<div class="btn-row"><button class="btn small ' + (st.mode === 'lang' ? '' : 'ghost') + '" id="stLang">语言学习</button>'
    + '<button class="btn small ' + (st.mode === 'skill' ? '' : 'ghost') + '" id="stSkill">技能学习</button></div>'
    + '<div id="stLangBox" style="display:' + (st.mode === 'lang' ? 'block' : 'none') + ';margin-top:10px;">'
    + '<label class="fld">目标语言</label><select id="stLangSel">' + langOpts + '</select></div>'
    + '<div id="stSkillBox" style="display:' + (st.mode === 'skill' ? 'block' : 'none') + ';margin-top:10px;">'
    + '<label class="fld">学习主题</label><input type="text" id="stTopic" value="' + esc(st.topic) + '" placeholder="例如：编程 / 做饭 / 画画"></div>'
    + '<div class="hint" style="margin-top:10px;">进度：已完成 ' + doneCount + ' 次练习</div>'
    + '<div class="btn-row" style="margin-top:10px;">'
    + '<button class="btn" id="stTeach">让他讲一点</button>'
    + '<button class="btn ghost" id="stQuiz">出个小测验</button>'
    + '<button class="btn ghost" id="stCheck">我答完了</button></div>'
    + '<div class="hint" style="margin-top:10px;" id="stOut">（他会讲的内容会显示在这里）</div>'
    + '</div>'
    + '<div class="card glass"><h3>学习记录</h3><div class="list" id="stNotes">'
    + ((st.notes || []).length ? st.notes.slice(0,20).map(function(n){
        return '<div class="item"><div class="t">' + esc(n.text) + '</div><div class="m">' + fmtFull(n.ts) + '</div></div>';
      }).join('') : '<div class="empty">还没有记录</div>')
    + '</div></div>'
    + '<div class="card glass"><h3>学习资料</h3>'
    + '<div class="btn-row"><button class="btn small ghost" id="stUpload">上传资料</button></div>'
    + '<div class="list" id="stFiles" style="margin-top:10px;"><div class="empty">读取中…</div></div>'
    + '<div class="hint" style="margin-top:8px;">支持文本、图片、PDF、音频、简单文档。资料存在本机（IndexedDB），他讲的时候可以引用。</div>'
    + '</div>';
  $('stLang').onclick = function(){ st.mode = 'lang'; save('study'); renderers.study(); };
  $('stSkill').onclick = function(){ st.mode = 'skill'; save('study'); renderers.study(); };
  $('stLangSel').onchange = function(){ st.lang = this.value; save('study'); };
  $('stTopic').oninput = function(){ st.topic = this.value; save('study'); };
  $('stUpload').onclick = function(){ uploadMaterial(); };
  renderMaterials();

  function subjectText(){
    return st.mode === 'lang' ? ('教我' + st.lang) : ('教我' + (st.topic || '这个主题'));
  }
  function teach(kind){
    var mats = (materialCache || []).map(function(m){ return m.name; }).join('、');
    var me = curIdentity();
    var base = '你是一位耐心的老师。学生正在学习：' + subjectText() + '。'
      + (mats ? '可用的学习资料有：' + mats + '，讲解时优先引用这些资料。' : '')
      + (me && (me.name || me.personality || me.background)
          ? '【这个学生】姓名：' + (me.name||'（没说）') + '，性格：' + (me.personality||'（没说）')
            + '，背景：' + (me.background||'（没说）') + '。讲的时候照顾一下他的情况。' : '')
      + '讲解用中文，简短清楚，一次只讲一小点。';
    var ask = kind === 'quiz' ? '请出一道简单的小测验，只要题目，不要给答案。'
            : (kind === 'check' ? '学生刚刚做完了练习，请给一句鼓励，并指出一个可以改进的小点。'
            : '请讲今天这一小课的内容。');
    $('stOut').textContent = '他在想…';
    askModel(base, ask, function(r){
      $('stOut').textContent = r;
      st.notes.unshift({id:uid(), text:'[' + subjectText() + '] ' + r.slice(0,120), ts:Date.now()});
      if(st.notes.length > 100) st.notes.length = 100;
      save('study');
      if(kind !== 'check'){
        st.progress[fmtDate(Date.now()) + '-' + uid().slice(0,4)] = true;
        save('study');
      }
      // 学习进度也会进记忆，方便他以后提起
      addMemory('一起学过：' + subjectText(), false, '学习');
    });
  }
  $('stTeach').onclick = function(){ teach('teach'); };
  $('stQuiz').onclick = function(){ teach('quiz'); };
  $('stCheck').onclick = function(){ teach('check'); };
};
// 学习资料：上传 / 查看 / 删除
var materialCache = [];
function renderMaterials(){
  idbAll('files').then(function(list){
    materialCache = list.sort(function(a,b){ return (b.ts||0) - (a.ts||0); });
    var box = $('stFiles'); if(!box) return;
    box.innerHTML = materialCache.length ? materialCache.map(function(f){
      return '<div class="item"><div class="row between"><div><div class="t">' + esc(f.name) + '</div>'
        + '<div class="m">' + Math.round((f.blob && f.blob.size) ? f.blob.size/1024 : 0) + ' KB · ' + fmtDate(f.ts) + '</div></div>'
        + '<div class="acts"><button class="btn small ghost" data-fview="' + f.id + '">查看</button>'
        + '<button class="btn small ghost" data-fdel="' + f.id + '">删</button></div></div></div>';
    }).join('') : '<div class="empty">还没有上传资料</div>';
    $$('[data-fdel]', box).forEach(function(el){
      el.addEventListener('click', function(){
        idbDel('files', el.getAttribute('data-fdel')).then(function(){ renderMaterials(); });
      });
    });
    $$('[data-fview]', box).forEach(function(el){
      el.addEventListener('click', function(){
        var id = el.getAttribute('data-fview');
        var f = materialCache.filter(function(x){ return x.id === id; })[0]; if(!f) return;
        var u = URL.createObjectURL(f.blob);
        var isText = /text|json/.test(f.blob.type || '') || /\.(txt|md|csv|json)$/i.test(f.name);
        var isImg = /^image\//.test(f.blob.type || '');
        var isAudio = /^audio\//.test(f.blob.type || '');
        if(isText){
          var r = new FileReader();
          r.onload = function(){ openModal(f.name, '<div style="white-space:pre-wrap;font-size:13px;max-height:300px;overflow:auto;">' + esc(String(r.result).slice(0,4000)) + '</div>'); };
          r.readAsText(f.blob);
        } else if(isImg){
          openModal(f.name, '<img src="' + u + '" style="width:100%;border-radius:12px;">');
        } else if(isAudio){
          openModal(f.name, '<audio controls src="' + u + '" style="width:100%;"></audio>');
        } else {
          openModal(f.name, '<div class="hint">这个格式没法直接预览（' + esc(f.blob.type || '未知') + '）。</div>'
            + '<div class="btn-row" style="margin-top:10px;"><a class="btn ghost" href="' + u + '" download="' + esc(f.name) + '">下载下来看</a></div>');
        }
      });
    });
  });
}
function uploadMaterial(){
  pickFile('', true, function(files){
    if(!files.length) return;
    var n = 0;
    files.forEach(function(f){
      idbPut('files', {id:uid(), name:f.name, blob:f, ts:Date.now()}).then(function(ok){
        if(ok) n++;
        if(n === files.length){ toast('上传了 ' + n + ' 份资料'); renderMaterials(); }
      });
    });
  });
}
$('btnUploadMat').addEventListener('click', function(){
  openModal('学习资料',
    '<div class="hint">可以上传文本、图片、PDF、音频等。上传后他会引用这些资料给你讲、出题。</div>',
    [{text:'选择文件', fn:function(){ uploadMaterial(); }}, {text:'关闭', cls:'ghost'}]);
});

/* ---------- 美化 ---------- */
// 用户自己写的气泡 CSS：注入到一个 <style> 里，线上 / 线下气泡都能改
function applyBubbleCss(){
  try{
    var css = state.bubbleCss || '';
    var el = document.getElementById('userBubbleCss');
    if(!el){
      el = document.createElement('style');
      el.id = 'userBubbleCss';
      document.head.appendChild(el);
    }
    el.textContent = css;
  }catch(e){}
}
// 窗口：编辑「线下模式大气泡」的外观
var BIG_BUBBLE_ITEMS = [
  {v:'--bb-bg',      label:'背景色（上）',   type:'color', def:'#e8f0fa'},
  {v:'--bb-bg2',     label:'背景色（下）',   type:'color', def:'#cfe0f2'},
  {v:'--bb-text',    label:'文字颜色',       type:'color', def:'#33424f'},
  {v:'--bb-think-bg',label:'思维链区底色',   type:'color', def:'#ffffff'},
  {v:'--bb-alpha',   label:'不透明度(%)',    type:'range', min:20, max:100, def:100, unit:'%'},
  {v:'--bb-blur',    label:'模糊(px)',       type:'range', min:0,  max:20,  def:0,   unit:'px'},
  {v:'--bb-radius',  label:'圆角(px)',       type:'range', min:0,  max:30,  def:18,  unit:'px'},
  {v:'--bb-width',   label:'占屏比例(%)',    type:'range', min:60, max:100, def:90,  unit:'%'}
];
function openBigBubbleWindow(){
  if(!state.beauty) state.beauty = {};
  var html = '<div class="hint" style="margin-bottom:8px;">线下模式的居中大气泡：上半段是思维链（可收起），下半段是正文。下面改的是这一种气泡的外观，改完立刻能看到。</div>';
  BIG_BUBBLE_ITEMS.forEach(function(it){
    var val = state.beauty[it.v] || it.def;
    if(it.type === 'color'){
      html += '<div class="row between" style="margin:8px 0;"><span style="font-size:13px;">' + it.label + '</span>'
            + '<input type="color" data-bb="' + it.v + '" value="' + esc(val) + '" style="width:60px;"></div>';
    } else {
      var nv = String(val).replace('%','').replace('px','');
      html += '<div style="margin:10px 0;"><div class="row between"><span style="font-size:13px;">' + it.label + '</span>'
            + '<span class="hint" data-bbt="' + it.v + '">' + esc(nv) + '</span></div>'
            + '<input type="range" data-bb="' + it.v + '" min="' + it.min + '" max="' + it.max + '" value="' + esc(nv) + '"></div>';
    }
  });
  html += '<div class="btn-row" style="margin-top:10px;gap:8px;">'
        + '<button class="btn small ghost" id="bbReset">恢复默认</button></div>';
  openModal('线下大气泡', html, [
    {text:'保存', fn:function(box){
      $$('[data-bb]', box).forEach(function(inp){
        var v = it2val(inp);
        state.beauty[inp.getAttribute('data-bb')] = v;
        document.documentElement.style.setProperty(inp.getAttribute('data-bb'), v);
      });
      save('beauty'); toast('已保存线下大气泡外观');
    }},
    {text:'取消', cls:'ghost'}
  ]);
  // 拖动时实时预览
  var mbox = $('modalBox');
  if(mbox){
    $$('[data-bb]', mbox).forEach(function(inp){
      inp.addEventListener('input', function(){
        var v = it2val(inp);
        document.documentElement.style.setProperty(inp.getAttribute('data-bb'), v);
        var tag = mbox.querySelector('[data-bbt="' + inp.getAttribute('data-bb') + '"]');
        if(tag) tag.textContent = String(v).replace('%','').replace('px','');
      });
    });
    var rs = $('bbReset');
    if(rs) rs.onclick = function(){
      BIG_BUBBLE_ITEMS.forEach(function(it){
        state.beauty[it.v] = it.def;
        document.documentElement.style.setProperty(it.v, it.def);
        var inp = mbox.querySelector('[data-bb="' + it.v + '"]');
        if(inp) inp.value = String(it.def).replace('%','').replace('px','');
        var tag = mbox.querySelector('[data-bbt="' + it.v + '"]');
        if(tag) tag.textContent = String(it.def).replace('%','').replace('px','');
      });
      save('beauty'); toast('已恢复默认');
    };
  }
}
// 取控件当前值（颜色原样，滑条按单位补上 %/px）
function it2val(inp){
  var v = inp.value;
  var key = inp.getAttribute('data-bb') || '';
  if(inp.type === 'range'){
    var it = BIG_BUBBLE_ITEMS.filter(function(x){ return x.v === key; })[0];
    return v + ((it && it.unit) ? it.unit : '');
  }
  return v;
}
// 窗口：直接用 CSS 自己写气泡外观（线上 / 线下都生效）
var BUBBLE_CSS_HINT = [
  '/* 线上：他发的气泡 */', '.bubble{ }',
  '/* 线上：我发的气泡 */', '.msg.me .bubble{ }',
  '/* 线下：居中大气泡（整体） */', '.bubble.big-bubble{ }',
  '/* 线下：大气泡顶部那一行（头像+名字） */', '.bubble.big-bubble .bb-head{ }',
  '/* 线下：思维链区 / 思维链文字 */', '.bubble.big-bubble .think{ }',
  '.bubble.big-bubble .think-body{ }',
  '/* 线下：正文 */', '.bubble.big-bubble .reply-body{ }',
  '/* 动作描写（括号里的字） */', '.bubble .act{ }'
].join('\n');
function openBubbleCssWindow(){
  openModal('自定义气泡 CSS',
      '<div class="hint" style="margin-bottom:6px;">直接写 CSS，保存后线上和线下的气泡都会按你写的来。常用的选择器：</div>'
    + '<textarea id="bubbleCssTa" rows="9" style="font-size:11px;line-height:1.5;font-family:monospace;" placeholder="'
    + esc(BUBBLE_CSS_HINT) + '">' + esc(state.bubbleCss || '') + '</textarea>'
    + '<div class="hint" style="margin-top:6px;">例如：'
    + '<code>.bubble{border-radius:4px;background:#f6f2ff;}</code>　写错也不会崩，最多就是不生效。</div>',
    [
      {text:'保存并应用', fn:function(box){
        state.bubbleCss = (box.querySelector('#bubbleCssTa').value || '').trim();
        save('bubbleCss'); applyBubbleCss();
        toast('已应用自定义气泡 CSS');
      }},
      {text:'清空', cls:'ghost', fn:function(){
        state.bubbleCss = ''; save('bubbleCss'); applyBubbleCss(); toast('已清空');
      }},
      {text:'取消', cls:'ghost'}
    ]);
}
// 所有可调的 CSS 变量都列在这里
var BEAUTY_ITEMS = [
  {v:'--c-primary',   label:'主色', type:'color', def:'#7fa3c8'},
  {v:'--c-accent',    label:'强调色', type:'color', def:'#9dbdd8'},
  {v:'--c-bg1',       label:'背景色1', type:'color', def:'#dbe7f2'},
  {v:'--c-bg2',       label:'背景色2', type:'color', def:'#c6d8ea'},
  {v:'--c-bg3',       label:'屏幕底色', type:'color', def:'#eef4fa'},
  {v:'--c-text',      label:'文字颜色', type:'color', def:'#33424f'},
  {v:'--c-bubble-me', label:'我的气泡', type:'color', def:'#a8c7e6'},
  {v:'--c-bubble-him',label:'他的气泡', type:'color', def:'#e9eff6'},
  {v:'--r-card',      label:'卡片圆角(px)', type:'range', min:0, max:30, def:'18', unit:'px'},
  {v:'--r-bubble',    label:'气泡圆角(px)', type:'range', min:0, max:26, def:'16', unit:'px'},
  {v:'--fs',          label:'字体大小(px)', type:'range', min:12, max:20, def:'15', unit:'px'},
  {v:'--lh',          label:'行距', type:'range', min:12, max:22, def:'16', unit:'', scale:10},
  {v:'--icon',        label:'桌面图标大小(px)', type:'range', min:36, max:72, def:'54', unit:'px'},
  {v:'--bubble-gap',  label:'气泡间距(px)', type:'range', min:2, max:20, def:'8', unit:'px'},
  {v:'--fw',          label:'字重（细—粗）', type:'range', min:300, max:700, def:'400', unit:''},
  {v:'--ls',          label:'字间距(px)', type:'range', min:0, max:3, def:'0', unit:'px'},
  {v:'--c-glass',     label:'玻璃透明度(%)', type:'range', min:15, max:90, def:'55', alpha:true},
  {v:'--ico-ink',     label:'图标颜色', type:'color', def:'#3f4d5e'},
  {v:'--ico-opacity', label:'图标不透明度(%)', type:'range', min:10, max:100, def:100}
];
// 美化页里：小组件管理列表
function widgetManageHTML(){
  ensureLayout();
  if(!state.layout.widgets.length) return '<div class="empty">还没有小组件</div>';
  return state.layout.widgets.map(function(w){
    return '<div class="item"><div class="row between">'
      + '<div><div class="t">' + esc(w.title || widgetTypeName(w.type)) + '</div>'
      + '<div class="m">' + widgetTypeName(w.type) + ' · 第 ' + ((w.page||0)+1) + ' 页 · ' + widgetSizeKey(w.size).replace('x','×') + '</div></div>'
      + '<div class="acts"><button class="btn small ghost" data-bwedit="' + w.id + '">改</button>'
      + '<button class="btn small ghost" data-bwdel="' + w.id + '">删</button></div></div></div>';
  }).join('');
}
// 美化页里：桌面图标管理列表
function appManageHTML(){
  ensureLayout();
  return state.layout.apps.map(function(a){
    var bg = a.color ? 'background:linear-gradient(150deg,' + a.color + 'F2,' + a.color + 'A6);color:#fff;' : '';
    return '<div class="item"><div class="row between">'
      + '<div class="row" style="gap:10px;">'
      + '<div class="mini-ico" style="' + bg + '">' + iconHTML(a) + '</div>'
      + '<div><div class="t">' + esc(a.name) + '</div>'
      + '<div class="m">第 ' + ((a.page||0)+1) + ' 页' + (a.hide ? ' · 已隐藏' : '') + '</div></div></div>'
      + '<div class="acts"><button class="btn small ghost" data-baedit="' + a.id + '">改</button>'
      + '<button class="btn small ghost" data-bahide="' + a.id + '">' + (a.hide ? '显示' : '隐藏') + '</button></div></div></div>';
  }).join('');
}

renderers.beauty = function(){
  var b = state.beauty || {};
  var html = '<div class="card glass"><h3>颜色</h3>';
  BEAUTY_ITEMS.forEach(function(it){
    var val = b[it.v] || hexOf(it.v, it.def);
    if(it.type === 'color'){
      html += '<div class="row between" style="margin:8px 0;"><span style="font-size:13px;">' + it.label + '</span>'
            + '<input type="color" data-bv="' + it.v + '" value="' + esc(val) + '" style="width:60px;"></div>';
    } else {
      // 玻璃透明度这一项存的是 rgba，滑条上显示成百分数
      var num = it.alpha ? String(Math.round(parseFloat(String(val).replace(/[^0-9.]/g, '')) * 100 || it.def))
                         : String(val).replace('px','');
      if(it.alpha && !b[it.v]) num = String(it.def);
      html += '<div style="margin:10px 0;"><div class="row between"><span style="font-size:13px;">' + it.label + '</span>'
            + '<span class="hint" data-bt="' + it.v + '">' + esc(num) + '</span></div>'
            + '<input type="range" data-bv="' + it.v + '" min="' + it.min + '" max="' + it.max + '" value="' + esc(num) + '"></div>';
    }
  });
  html += '</div>';
  html += '<div class="card glass"><h3>图标风格（全局默认）</h3>'
    + '<select id="bIcon">'
    + '<option value="css"' + (state.settings.iconStyle === 'css' ? ' selected' : '') + '>磨砂玻璃 · 简约线性图标</option>'
    + '<option value="liquid"' + (state.settings.iconStyle === 'liquid' ? ' selected' : '') + '>液态玻璃 · 简约线性图标</option>'
    + '<option value="char"' + (state.settings.iconStyle === 'char' ? ' selected' : '') + '>磨砂玻璃 · 字符图标</option>'
    + '</select>'
    + '<div class="hint" style="margin-top:6px;">单个图标可以在桌面上单独改，改过的会覆盖这里的全局设置。</div>'
    + '</div>';

  /* ---- 气泡美化：基础颜色保留 + 线下大气泡窗口 + 自定义 CSS 窗口 ---- */
  html += '<div class="card glass"><h3>气泡美化（线上 / 线下）</h3>'
    + '<div class="hint" style="margin-bottom:8px;line-height:1.8;">'
    + '线上气泡的基础颜色（我的气泡 / 他的气泡）在上面的「颜色」里改。<br>'
    + '线下模式用的是<b>居中大气泡</b>（约占屏 90%，上半段思维链、下半段正文），可以单独打开窗口调外观。<br>'
    + '两种气泡都可以直接用 <b>CSS</b> 自己写外观，写在最下面的窗口里。'
    + '</div>'
    + '<div class="btn-row" style="gap:8px;">'
    + '<button class="btn small" id="bEditBigBubble">✎ 线下大气泡</button>'
    + '<button class="btn small ghost" id="bEditBubbleCss">✎ 自定义气泡 CSS</button>'
    + '</div></div>';

  /* ---- 桌面布局：4×6 网格 + 图标分页 ---- */
  var _c = state.settings.homeCols || HOME_COLS_DEFAULT;
  var _r = state.settings.homeRows || HOME_ROWS_DEFAULT;
  html += '<div class="card glass"><h3>桌面布局</h3>'
    + '<div class="row between"><span style="font-size:13px;">横向几列</span>'
    + '<span class="hint" id="bColsV" style="font-size:13px;">' + _c + ' 列</span></div>'
    + '<input type="range" id="bCols" min="2" max="6" step="1" value="' + _c + '">'
    + '<div class="row between" style="margin-top:10px;"><span style="font-size:13px;">纵向几行</span>'
    + '<span class="hint" id="bRowsV" style="font-size:13px;">' + _r + ' 行</span></div>'
    + '<input type="range" id="bRows" min="3" max="8" step="1" value="' + _r + '">'
    + '<div class="hint" id="bGridInfo" style="margin-top:8px;"></div>'
    + '<div class="hint" style="margin-top:6px;">小组件和 iOS 同一套尺寸：2×1 小横条、2×2 小组件、4×2 中组件（横贯一行）、4×4 大组件。建议一页只放 2×1 / 2×2。调组件大小、拖动换位置、增删组件时，其他图标和组件会像 iOS 那样自动让位重排，横竖间隙永远一致；一页放不下的会自动挪到下一页。</div>'
    + '<div class="btn-row" style="margin-top:10px;flex-wrap:wrap;">'
    + '<button class="btn small ghost" id="bGoHome">去桌面看看</button>'
    + '<button class="btn small ghost" id="bGridDefault">恢复默认 4×6</button>'
    + '<button class="btn small ghost" id="bIosTidy">按 iOS 密度整理</button>'
    + '<button class="btn small ghost" id="bRelayout">按当前分页重排</button></div>'
    + '</div>';

  /* ---- 主屏幕美化：背景图 / 图标底板，都能用图片地址或直接上传 ---- */
  ensureBgImages();
  html += '<div class="card glass"><h3>主屏幕美化</h3>'
    + '<div class="hint" style="margin-bottom:8px;">每一处都可以填图片网址，或者直接从本机上传一张图。已上传的会显示缩略图。</div>'
    + BG_SLOTS.map(function(s){
        var it = state.bgImages[s.k] || {type:'', value:''};
        var state2 = it.value ? (it.type === 'url' ? '已用网址' : '已上传图片') : '未设置';
        var thumb = it.value ? (it.type === 'url' ? it.value : (imgCache[it.value] || '')) : '';
        return '<div class="wx-row"><div style="flex:1;"><div class="t">' + s.n + '</div>'
          + '<div class="m">' + state2 + '</div></div>'
          + (thumb ? '<img class="bg-thumb" src="' + esc(thumb) + '" alt="">' : '')
          + '<button class="btn small ghost" data-bg="' + s.k + '">导入图片</button></div>';
      }).join('')
    + '</div>';

  /* ---- 文字美化：字体 / 字号 / 行距 / 字重 / 字间距 / 颜色，也能导入字体文件 ---- */
  var ff = (state.beauty && state.beauty['--font-family']) || '';
  var fontOpts = [
    {v:'', n:'默认（系统字体）'},
    {v:'"PingFang SC","Microsoft YaHei",sans-serif', n:'苹方 / 微软雅黑'},
    {v:'"Heiti SC","SimHei",sans-serif', n:'黑体'},
    {v:'"Songti SC","SimSun",serif', n:'宋体'},
    {v:'"Kaiti SC","KaiTi",serif', n:'楷体'},
    {v:'"Yuanti SC","YouYuan",sans-serif', n:'圆体'},
    {v:'monospace', n:'等宽'}
  ].map(function(o){
    return '<option value="' + esc(o.v) + '"' + (ff === o.v ? ' selected' : '') + '>' + o.n + '</option>';
  }).join('');
  html += '<div class="card glass"><h3>文字美化</h3>'
    + '<label class="fld">字体</label><select id="bFont">' + fontOpts
    + (ff && ff.indexOf('UserFont') >= 0 ? '<option value="' + esc(ff) + '" selected>导入的字体（' + esc(state.fontFile || '自定义') + '）</option>' : '')
    + '</select>'
    + '<div class="btn-row" style="margin-top:8px;">'
    + '<button class="btn small ghost" id="bFontFile">导入字体文件(ttf/otf/woff)</button>'
    + '<button class="btn small ghost" id="bTextFile">导入文字方案文件</button>'
    + '<button class="btn small ghost" id="bTextExport">导出文字方案</button></div>'
    + '<div class="hint" style="margin-top:6px;">字号、行距、字重、字间距、字色在下面「颜色与尺寸」里调；也可以直接导入一个 json / css / txt 的文字方案文件。</div>'
    + '</div>';

  /* ---- 桌面小组件：用户可以自己做 ---- */
  html += '<div class="card glass"><h3>桌面小组件</h3>'
    + '<div class="hint" style="margin-bottom:8px;">小组件放在桌面上方预留的位置。点「改」可以给每个组件加背景图、装饰表情，并调不透明度与模糊度。</div>'
    + '<div class="btn-row" style="margin-bottom:10px;"><button class="btn small" id="bNewWidget">＋ 新建小组件</button></div>'
    + '<div class="list">' + widgetManageHTML() + '</div></div>';

  /* ---- 桌面图标：改名 / 换图标 / 翻页 / 隐藏 ---- */
  html += '<div class="card glass"><h3>桌面图标</h3>'
    + '<div class="hint" style="margin-bottom:8px;">点「改」可以换图标、换名字、换页；也可以直接在桌面上点「编辑」拖着换位置。</div>'
    + '<div class="list">' + appManageHTML() + '</div></div>';

  html += '<div class="card glass"><h3>锁屏 / 桌面那句话</h3>'
    + '<label class="fld">桌面底部小字</label><input type="text" id="bFoot" value="' + esc(state.settings.homeFoot) + '">'
    + '<label class="fld">锁屏一句话</label><input type="text" id="bLock" value="' + esc(state.settings.lockWord) + '">'
    + '<div class="row between" style="margin:12px 0 4px;"><span style="font-size:13px;">顶部状态栏（时间 / 信号 / 电量）</span>'
    + '<button class="switch ' + (state.settings.statusBarOn !== false ? 'on' : '') + '" id="bSbOn"></button></div>'
    + '<div class="hint">关掉之后，顶部那条横栏就不显示了，屏幕会往上顶；刘海 / 灵动岛的安全高度和顶端那层较深的颜色仍然保留。</div>'
    + '<label class="fld">状态栏内容</label><select id="bSb"><option value="time">时间</option><option value="mood">时间和心情</option></select>'
    + '</div>';
  html += '<div class="card glass"><h3>皮肤配置</h3>'
    + '<div class="btn-row"><button class="btn small ghost" id="bExport">导出皮肤</button>'
    + '<button class="btn small ghost" id="bImport">导入皮肤</button>'
    + '<button class="btn small ghost" id="bReset">恢复默认</button></div></div>';
  html += '<div class="btn-row" style="margin-bottom:20px;"><button class="btn block" id="bSave">保存美化</button></div>';
  $('beautyBody').innerHTML = html;

  // 边调边预览：改了就立刻写进 CSS 变量
  $$('[data-bv]', $('beautyBody')).forEach(function(el){
    el.addEventListener('input', function(){
      var v = el.getAttribute('data-bv');
      var item = BEAUTY_ITEMS.filter(function(x){ return x.v === v; })[0];
      var val = el.value;
      if(item.type === 'range'){
        if(item.alpha) val = 'rgba(255,255,255,' + (Number(val) / 100) + ')';
        else val = (item.scale ? (Number(val) / item.scale) : val) + (item.unit || '');
        var t = $('beautyBody').querySelector('[data-bt="' + v + '"]');
        if(t) t.textContent = el.value;
      }
      document.documentElement.style.setProperty(v, val);
      state.beauty[v] = val;   // 先记下来，点保存才写盘
    });
  });
  // 主屏幕美化：四个位置的图片导入
  $$('[data-bg]', $('beautyBody')).forEach(function(el){
    el.addEventListener('click', function(){
      pickImageOrURL(el.getAttribute('data-bg'), function(){ renderers.beauty(); });
    });
  });
  // 文字美化
  $('bFont').onchange = function(){
    if(this.value) state.beauty['--font-family'] = this.value;
    else delete state.beauty['--font-family'];
    save('beauty'); applyBeauty();
  };
  $('bFontFile').onclick = function(){ importFontFile(function(){ renderers.beauty(); }); };
  $('bTextFile').onclick = function(){ importTextStyleFile(function(){ renderers.beauty(); }); };
  $('bTextExport').onclick = function(){
    var out = {};
    ['--font-family','--fs','--lh','--fw','--ls','--c-text'].forEach(function(k){
      if(state.beauty[k]) out[k] = state.beauty[k];
    });
    downloadJSON('文字方案.json', out);
  };
  // 桌面布局：横向几列 / 纵向几行（拉动滑条时右边的数字要跟着变）
  var bc = $('bCols'), br = $('bRows');
  if(bc){
    updateGridInfo();
    bc.oninput = function(){
      var v = parseInt(this.value, 10);
      state.settings.homeCols = v; save('settings');
      if($('bColsV')) $('bColsV').textContent = v + ' 列';
      updateGridInfo();
      repaginateHome();   // 按新容量重新分页，并立刻重排桌面（顺带重新量格子大小）
    };
    br.oninput = function(){
      var v = parseInt(this.value, 10);
      state.settings.homeRows = v; save('settings');
      if($('bRowsV')) $('bRowsV').textContent = v + ' 行';
      updateGridInfo();
      repaginateHome();
    };
    $('bGoHome').onclick = function(){ save('settings'); go('home'); };
    // 一键恢复成出厂默认的 4 列 × 6 行
    $('bGridDefault').onclick = function(){
      state.settings.homeCols = HOME_COLS_DEFAULT;
      state.settings.homeRows = HOME_ROWS_DEFAULT;
      save('settings');
      bc.value = HOME_COLS_DEFAULT; br.value = HOME_ROWS_DEFAULT;
      if($('bColsV')) $('bColsV').textContent = HOME_COLS_DEFAULT + ' 列';
      if($('bRowsV')) $('bRowsV').textContent = HOME_ROWS_DEFAULT + ' 行';
      tidyWidgetSizes();      // 组件太大就先收一档，再按新容量重排
      repaginateHome();
      updateGridInfo();
      toast('已恢复默认 4 列 × 6 行');
    };
    $('bRelayout').onclick = function(){
      // 按每页真实容量（扣掉组件占的格）重新分，不再一律 24 个一页
      repaginateHome();
      toast('已按每页实际容量重新排好');
    };
    // 按 iOS 密度整理：把横贯整行 / 占半屏的大组件缩成 2×2 小组件或 2×1 小横条，
    // 桌面就能多出好几个图标位，不再显得空荡
    $('bIosTidy').onclick = function(){
      ensureLayout();
      var n = tidyWidgetSizes();
      repaginateHome();          // 组件变小了，图标按新容量重新分页，空出来的位置立刻被填满
      renderers.beauty();        // 重渲染一下，滑条右边的数字回到最新值
      toast(n ? '已把组件收到 iOS 常用尺寸，桌面能多放几个图标了' : '组件已经是紧凑尺寸了');
    };
  }
  // 气泡美化：线下大气泡窗口 / 自定义 CSS 窗口
  if($('bEditBigBubble')) $('bEditBigBubble').onclick = function(){ openBigBubbleWindow(); };
  if($('bEditBubbleCss')) $('bEditBubbleCss').onclick = function(){ openBubbleCssWindow(); };
  // 小组件：新建 / 改 / 删
  $('bNewWidget').onclick = function(){ openWidgetModal(null); };
  $$('[data-bwedit]', $('beautyBody')).forEach(function(el){
    el.addEventListener('click', function(){
      var w = state.layout.widgets.filter(function(x){ return x.id === el.getAttribute('data-bwedit'); })[0];
      if(w) openWidgetModal(w);
    });
  });
  $$('[data-bwdel]', $('beautyBody')).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-bwdel');
      state.layout.widgets = state.layout.widgets.filter(function(x){ return x.id !== id; });
      save('layout'); renderers.beauty(); renderers.home();
    });
  });
  // 图标：改 / 隐藏
  $$('[data-baedit]', $('beautyBody')).forEach(function(el){
    el.addEventListener('click', function(){ openAppModal(el.getAttribute('data-baedit')); });
  });
  $$('[data-bahide]', $('beautyBody')).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-bahide');
      state.layout.apps.forEach(function(a){ if(a.id === id) a.hide = !a.hide; });
      save('layout'); renderers.beauty(); renderers.home();
    });
  });
  var sbOnBtn = $('bSbOn');
  if(sbOnBtn) sbOnBtn.addEventListener('click', function(){
    var on = !sbOnBtn.classList.contains('on');
    sbOnBtn.classList.toggle('on', on);
    state.settings.statusBarOn = on;
    save('settings'); applyStatusBar();
    if(currentScreen === 'home') renderers.home();
    toast(on ? '状态栏已显示' : '状态栏已隐藏');
  });
  $('bSave').onclick = function(){
      state.settings.iconStyle = $('bIcon').value;
      state.settings.homeFoot = $('bFoot').value;
      state.settings.lockWord = $('bLock').value;
      state.settings.showStatusBar = $('bSb').value;
    save('settings'); save('beauty'); applyBeauty(); applyStatusBar();
    renderers.home && renderers.home();
    toast('已保存');
  };
  $('bExport').onclick = function(){ downloadJSON('小手机皮肤.json', {type:'skin', beauty:state.beauty}); };
  $('bImport').onclick = function(){
    pickFile('.json', false, function(files){
      var f = files[0]; if(!f) return;
      var r = new FileReader();
      r.onload = function(){
        try{
          var o = JSON.parse(String(r.result));
          state.beauty = o.beauty || o; save('beauty'); applyBeauty(); renderers.beauty(); toast('皮肤已应用');
        }catch(e){ toast('导入失败'); }
      };
      r.readAsText(f);
    });
  };
  $('bReset').onclick = function(){
    state.beauty = {}; save('beauty');
    BEAUTY_ITEMS.concat([{v:'--c-glass'},{v:'--c-border'},{v:'--c-shadow'}]).forEach(function(it){
      document.documentElement.style.removeProperty(it.v);
    });
    renderers.beauty(); toast('已恢复默认');
  };
};
$('btnBeautySave').addEventListener('click', function(){ $('bSave').click(); });
$('btnBeautyPreview').addEventListener('click', openBeautyPreview);
/* 美化预览：把当前（含未保存）的美化应用到真实手机上，可切换桌面/锁屏/聊天看效果 */
function openBeautyPreview(){
  if($('bIcon')) state.settings.iconStyle = $('bIcon').value;   // 图标风格还没存盘，先套上
  applyBeauty();
  var bar = $('previewBar');
  if(!bar){
    bar = document.createElement('div'); bar.id = 'previewBar';
    bar.innerHTML = '<span class="pv-tag">预览模式</span>'
      + '<button data-pv="home">桌面</button>'
      + '<button data-pv="lock">锁屏</button>'
      + '<button data-pv="chat">聊天</button>'
      + '<button data-pv="exit" class="pv-exit">✕ 退出预览</button>';
    document.body.appendChild(bar);
    bar.addEventListener('click', function(e){
      var b = e.target.closest('[data-pv]'); if(!b) return;
      var k = b.getAttribute('data-pv');
      if(k === 'exit'){ closeBeautyPreview(); return; }
      if(k === 'chat'){ if(typeof wxPane !== 'undefined') wxPane = 'msg'; go('call'); }
      else if(k === 'lock'){ go('lock'); }
      else { go('home'); }
    });
  }
  bar.style.display = 'flex';
  document.body.classList.add('preview-mode');
  go('home');
}
function closeBeautyPreview(){
  var bar = $('previewBar'); if(bar) bar.style.display = 'none';
  document.body.classList.remove('preview-mode');
  go('beauty'); renderers.beauty();
}

/* ---------- 安静陪伴 ---------- */
renderers.quiet = function(){
  var s = state.settings;
  $('quietBody').innerHTML =
      '<div class="breathe" id="quietBreathe">呼吸</div>'
    + '<div class="card glass" style="text-align:center;"><div id="quietLine" style="font-size:15px;">我在。</div>'
    + '<div class="hint" style="margin-top:6px;">他几乎不主动说话，只偶尔轻轻说一句。</div></div>'
    + '<div class="card glass">'
    + '<div class="row between" style="margin-bottom:8px;"><span>安静陪伴</span><button class="switch ' + (s.quietOn ? 'on' : '') + '" id="qOn"></button></div>'
    + '<label class="fld">他偶尔说话的频率（分钟）</label><input type="number" id="qMin" min="3" max="120" value="' + s.quietMinutes + '">'
    + '<div class="btn-row" style="margin-top:10px;"><button class="btn small ghost" id="qNow">现在就说一句</button>'
    + '<button class="btn small ghost" id="qChat">去聊天</button></div></div>';
  bindSwitch('qOn', s.quietOn, function(v){ s.quietOn = v; save('settings'); });
  $('qMin').onchange = function(){ s.quietMinutes = parseInt(this.value,10) || 15; save('settings'); };
  $('qNow').onclick = function(){
    var l = pick(['我在。','慢慢来。','不着急，我陪你。','嗯，我在这儿。']);
    $('quietLine').textContent = l;
    pushMessage('him', l, 'text');
  };
  $('qChat').onclick = function(){ go('chat'); };
};

/* ---------- 睡眠陪伴 ---------- */
var noiseCtx = null, noiseNode = null;
renderers.sleep = function(){
  var s = state.settings;
  $('sleepBody').innerHTML =
      '<div class="card glass" style="text-align:center;">'
    + '<div style="color:var(--c-primary);">' + lnIcon('moon', 40) + '</div>'
    + '<div style="font-size:16px;font-weight:600;margin-top:4px;">晚安仪式</div>'
    + '<div class="hint">到了睡觉时间他会主动问「要睡了吗？」</div>'
    + '<label class="fld">睡觉时间</label><input type="time" id="slTime" value="' + esc(s.sleepTime) + '">'
    + '</div>'
    + '<div class="card glass"><h3>白噪音</h3>'
    + '<div class="btn-row"><button class="btn" id="slNoiseOn">播放白噪音</button>'
    + '<button class="btn ghost" id="slNoiseOff">停</button></div>'
    + '<div class="hint" style="margin-top:8px;">用浏览器自带的声音生成，不联网、不用下载音频。</div></div>'
    + '<div class="card glass"><h3>呼吸引导</h3>'
    + '<div class="breathe" id="slBreathe">吸气…</div>'
    + '<div class="btn-row"><button class="btn small ghost" id="slBreath">开始引导</button></div>'
    + '<div class="hint" style="margin-top:8px;">跟着圆的大小呼吸：变大吸气，变小呼气。</div></div>'
    + '<div class="card glass"><h3>作息记录</h3>'
    + '<div class="list" id="slLog">' + sleepLogHtml() + '</div>'
    + '<div class="btn-row" style="margin-top:10px;"><button class="btn small ghost" id="slSave">把今晚写进记忆</button></div></div>';
  $('slTime').onchange = function(){ s.sleepTime = this.value; save('settings'); };
  $('slNoiseOn').onclick = function(){ startNoise(); };
  $('slNoiseOff').onclick = function(){ stopNoise(); };
  $('slBreath').onclick = function(){
    var el = $('slBreathe'), i = 0;
    var steps = ['吸气…','停一下…','呼气…','停一下…'];
    var t = setInterval(function(){
      el.textContent = steps[i % 4]; i++;
      if(i > 16){ clearInterval(t); el.textContent = '好多了，睡吧。'; }
    }, 4000);
    toast('跟着做 4 轮');
  };
  $('slSave').onclick = function(){
    addMemory('作息：通常 ' + (s.sleepTime || '很晚') + ' 左右睡（' + fmtDate(Date.now()) + '记录）', false, '习惯');
    $('slLog').innerHTML = sleepLogHtml();
    toast('已写进记忆');
  };
};
function sleepLogHtml(){
  var hs = state.memory.filter(function(m){ return (m.tag||'').indexOf('习惯') >= 0; });
  return hs.length ? hs.slice(0,10).map(function(m){
    return '<div class="item"><div class="t">' + esc(m.text) + '</div><div class="m">' + fmtDate(m.ts) + '</div></div>';
  }).join('') : '<div class="empty">还没有作息记录</div>';
}
// 用 Web Audio 生成很轻的白噪音
function startNoise(){
  try{
    stopNoise();
    noiseCtx = noiseCtx || new (window.AudioContext || window.webkitAudioContext)();
    var len = noiseCtx.sampleRate * 2;
    var buf = noiseCtx.createBuffer(1, len, noiseCtx.sampleRate);
    var d = buf.getChannelData(0);
    for(var i=0;i<len;i++) d[i] = (Math.random()*2-1) * 0.05;  // 声音很小
    var src = noiseCtx.createBufferSource(); src.buffer = buf; src.loop = true;
    var g = noiseCtx.createGain(); g.gain.value = 0.5;
    src.connect(g); g.connect(noiseCtx.destination); src.start();
    noiseNode = src; toast('白噪音已开');
  }catch(e){ toast('这个浏览器不支持：' + e.message); }
}
function stopNoise(){
  try{ if(noiseNode){ noiseNode.stop(); noiseNode = null; toast('已停'); } }catch(e){}
}

/* ---------- 一起看（看文字 / 看图片 / 看视频，可约好友一起） ---------- */
var cwTimer = null;        // 文字 / 图片 的进度 + 感想计时
var cwDanmakuTimer = null; // 视频里好友自动发弹幕的计时
var cwSession = null;      // {type, friend, title, content, videoId, said, danmaku, finished}
renderers.cowatch = function(){
  ensureCowatch();
  var friends = wxAllFriends();
  var friendOpts = '<option value="">单独看</option>' + friends.map(function(f){
    return '<option value="' + esc(f.kind + '|' + (f.pid||'') + '|' + (f.nid||'')) + '">' + esc(f.name) + '</option>';
  }).join('');
  $('cowatchBody').innerHTML =
      '<div class="card glass">'
    + '<h3>选一样，和好友一起看</h3>'
    + '<div class="row" style="gap:8px;align-items:flex-end;flex-wrap:wrap;">'
    + '<div style="flex:1;min-width:140px;"><label class="fld">和谁一起</label><select id="cwFriend" style="width:100%;">' + friendOpts + '</select></div>'
    + '<div style="flex:1;min-width:140px;"><label class="fld">类型</label><select id="cwType" style="width:100%;">'
    +   '<option value="text">一段文字</option><option value="image">一张图片</option><option value="video">看视频</option></select></div>'
    + '</div>'
    + '<div id="cwText"><label class="fld">文字内容</label><textarea id="cwT" placeholder="把想一起看的一段文字贴进来"></textarea></div>'
    + '<div id="cwImage" style="display:none;"><label class="fld">从相册选一张</label><select id="cwI"></select></div>'
    + '<div id="cwVideo" style="display:none;"><label class="fld">上传一个视频</label>'
    +   '<div class="btn-row" style="justify-content:flex-start;margin-top:6px;"><button class="btn small" id="cwUpVideo">选择视频文件</button>'
    +   '<span id="cwVideoName" class="hint" style="margin-left:8px;"></span></div>'
    +   '<input type="hidden" id="cwVid"></div>'
    + '<div class="btn-row" style="margin-top:10px;"><button class="btn" id="cwStart">开始</button>'
    + '<button class="btn ghost" id="cwStop" style="display:none;">结束</button></div>'
    + '</div>'
    // 文字 / 图片 的「一起看」舞台
    + '<div class="card glass" id="cwStageCard" style="display:none;">'
    + '<div style="text-align:center;font-weight:600;" id="cwTitle">—</div>'
    + '<div class="bar" style="margin:12px 0;"><i id="cwBar"></i></div>'
    + '<div class="hint" style="text-align:center;" id="cwSay">（他在看…）</div>'
    + '</div>'
    // 视频 的「一起看」舞台（带弹幕）
    + '<div class="card glass" id="cwVideoCard" style="display:none;">'
    + '<div style="text-align:center;font-weight:600;margin-bottom:8px;" id="cwVTitle">—</div>'
    + '<div class="cw-video-wrap"><video id="cwVideoEl" controls playsinline style="width:100%;border-radius:12px;background:#000;max-height:300px;display:block;"></video>'
    + '<div class="cw-danmaku" id="cwDanmaku"></div></div>'
    + '<div class="row" style="margin-top:8px;gap:8px;"><input type="text" id="cwDmInput" placeholder="发条弹幕飘在画面上…" style="flex:1;">'
    + '<button class="btn small" id="cwDmSend">发送</button></div>'
    + '<div class="hint" style="margin-top:6px;">你和好友都能发弹幕，飘在画面上。</div>'
    + '</div>'
    + '<h3 style="margin:16px 0 8px;font-size:15px;">一起看过</h3>'
    + '<div class="list">' + (state.cowatch.length ? state.cowatch.slice(0,20).map(function(c){
        return '<div class="item"><div class="t">' + esc(c.title) + '</div>'
          + '<div class="m">' + fmtFull(c.ts) + (c.eval ? ' · 评价：' + esc(c.eval) : '') + '</div></div>';
      }).join('') : '<div class="empty">还没有记录</div>') + '</div>';
  $('cwType').onchange = function(){
    var v = this.value;
    $('cwText').style.display = v === 'text' ? '' : 'none';
    $('cwImage').style.display = v === 'image' ? '' : 'none';
    $('cwVideo').style.display = v === 'video' ? '' : 'none';
    if(v === 'image'){ refreshAlbum(function(list){
      $('cwI').innerHTML = list.length ? list.map(function(i){ return '<option value="' + i.id + '">' + esc(i.name) + '</option>'; }).join('') : '<option value="">相册是空的</option>';
    }); }
  };
  $('cwUpVideo').onclick = function(){
    uploadVideo(function(item){
      if(!item){ toast('没选到视频'); return; }
      $('cwVid').value = item.id;
      $('cwVideoName').textContent = '已选：' + item.name;
    });
  };
  $('cwStart').onclick = function(){ startCowatch(); };
  $('cwStop').onclick = function(){ stopCowatch(true); };
  $('cwDmSend').onclick = function(){ cwSendDanmaku(($('cwDmInput').value||'').trim(), 'me'); $('cwDmInput').value = ''; };
  $('cwDmInput').addEventListener('keydown', function(e){ if(e.key === 'Enter'){ cwSendDanmaku((this.value||'').trim(), 'me'); this.value = ''; } });
};
function ensureCowatch(){ if(!Array.isArray(state.cowatch)) state.cowatch = []; }
// 在视频上飘一条弹幕
function cwSendDanmaku(text, who){
  text = (text || '').trim();
  if(!text) return;
  var layer = $('cwDanmaku'); if(!layer) return;
  var el = document.createElement('div');
  el.className = 'cw-dm' + (who === 'me' ? ' me' : '');
  el.textContent = text;
  el.style.top = (6 + Math.floor(Math.random() * 70)) + '%';
  el.style.color = who === 'me' ? 'var(--c-primary)' : '#fff';
  layer.appendChild(el);
  setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); }, 9000);
  if(cwSession) cwSession.danmaku.push({who:who, text:text, ts:Date.now()});
}
function startCowatch(){
  var type = $('cwType').value;
  var friend = friendByKey($('cwFriend') ? $('cwFriend').value : '');
  var title = '', content = '';
  if(type === 'text'){ title = '一起看一段文字'; content = ($('cwT').value || '').trim().slice(0, 800); }
  if(type === 'image'){ var id = $('cwI').value; title = '一起看一张图'; content = '（一张图片）'; }
  if(type === 'video'){ var vid = $('cwVid').value; if(!vid){ toast('先上传一个视频'); return; } title = '一起看一段视频'; }
  if(type !== 'video' && !content){ toast('先选点内容'); return; }
  cwSession = {type:type, friend:friend, title:title, content:content, videoId:(type==='video'?vid:''), said:[], danmaku:[], finished:false};
  $('cwStart').style.display = 'none';
  $('cwStop').style.display = '';
  clearInterval(cwTimer); clearInterval(cwDanmakuTimer);
  if(type === 'video'){
    $('cwStageCard').style.display = 'none';
    $('cwVideoCard').style.display = '';
    $('cwVTitle').textContent = '正在和 ' + (friend ? friend.name : '自己') + ' 一起看';
    var v = $('cwVideoEl');
    v.src = videoCache[vid] || '';
    v.play().catch(function(){});
    // 好友自动飘弹幕（短一点）
    if(friend){
      cwDanmakuTimer = setInterval(function(){
        if(!cwSession || cwSession.finished || !cwSession.friend) return;
        var sys = friendSystemPrompt(friend) + '\n你们正在一起看视频，请发一条超短的弹幕（不超过15字，像随手吐槽）';
        askModel(sys, '发条弹幕：', function(r){
          if(r) cwSendDanmaku(r.trim().slice(0,15), friend.name);
        });
      }, 4500);
    }
  } else {
    $('cwVideoCard').style.display = 'none';
    $('cwStageCard').style.display = '';
    $('cwTitle').textContent = title;
    $('cwBar').style.width = '0%';
    $('cwSay').textContent = '（' + (friend ? friend.name : '他') + '在看…）';
    var p = 0;
    var sysBase = friend ? friendSystemPrompt(friend) : buildSystemPrompt('');
    cwTimer = setInterval(function(){
      p += 5;
      $('cwBar').style.width = Math.min(p, 100) + '%';
      var sys = sysBase + '\n（你们正在一起看' + (type==='image'?'一张图片':'一段文字') + '，请就内容说一句真实的感想，像坐在旁边一样，短一点）';
      askModel(sys, '内容：' + content + '\n现在进度 ' + p + '%，说一句你的感想：', function(r){
        if(!r) return;
        $('cwSay').textContent = r;
        cwSession.said.push(r);
        pushMessage('him', r, 'text');
      });
      if(p >= 100){ stopCowatch(false); }
    }, 6000);
  }
  toast('开始了，' + (friend ? friend.name : '他') + '会陪你一起看');
}
function stopCowatch(manual){
  clearInterval(cwTimer); clearInterval(cwDanmakuTimer); cwTimer = null; cwDanmakuTimer = null;
  var v = $('cwVideoEl'); if(v) v.pause();
  if(manual) toast('结束了');
  if(cwSession){
    cwSession.finished = true;
    var s = cwSession; cwSession = null;
    // 收一条记录，并随机生成一段与内容相关的评价
    var rec = {id:uid(), type:s.type, title:s.title, said:s.said.slice(), danmaku:s.danmaku.slice(), videoId:s.videoId, ts:Date.now(), eval:''};
    ensureCowatch();
    state.cowatch.unshift(rec);
    save('cowatch');
    genEval(s.type, s.content, function(evalText){
      rec.eval = evalText; save('cowatch'); renderers.cowatch();
    });
    renderers.cowatch();
    // 结束后让他用一句话问问你的感受
    var askFriend = s.friend ? friendSystemPrompt(s.friend) : buildSystemPrompt('');
    askModel(askFriend, '（你们刚刚一起看完了，请用一句话问问对方的感受）', function(r){ if(r) pushMessage('him', r, 'text'); });
  }
  $('cwStart').style.display = '';
  $('cwStop').style.display = 'none';
}
// 随机生成一段与内容相关的评价文本（有模型用模型，没模型用本地话术池）
function genEval(type, content, cb){
  var ctx = (type === 'text') ? ('你们一起看的一段文字：\n' + content) : ('你们一起看的' + (type==='image'?'一张图片':(type==='video'?'一段视频':'一样东西')));
  var sys = '你是他的好朋友，刚和他一起' + (type==='text'?'看完一段文字':type==='image'?'看完一张图片':'看完一段视频') + '。请用一句话写一句真实的评价或感想，要贴合内容，口语化，不超过30字。';
  askModel(sys, ctx + '\n写一句评价：', function(r){
    if(r && r.trim()) cb(r.trim());
    else cb(localEval(type, content));
  });
}
function localEval(type, content){
  var pool;
  if(type === 'text'){
    var snip = String(content||'').replace(/\s+/g,'').slice(0, 16);
    pool = ['这一段写得真好，' + (snip ? '「' + snip + '」' : '读着很有感触') + '特别打动我。',
            '感觉你写的时候很用心。', '这段我反复看了好几遍。', '写得很有画面感。',
            '喜欢这种安静又真诚的感觉。', '看完心里暖暖的。'];
  } else if(type === 'image'){
    pool = ['这张图好有氛围感。', '构图真舒服，越看越喜欢。', '喜欢这张，存下来了。',
            '这画面让我想到好多事。', '你拍得越来越好了。', '颜色也太好看了吧。'];
  } else {
    pool = ['这段视频看完了，意犹未尽。', '节奏刚刚好，很舒服。', '看完有点感动。',
            '这种片子就得一起看才对味。', '下次还一起看。', '画面和音乐都好搭。'];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

/* =====================================================================
   第 14 段：启动
   ===================================================================== */
/* =====================================================================
   支付（主界面图标）：虚拟余额 + 账单 + 收货地址
   这份余额和「微信 → 设置 → 支付」里的零钱、购物结算是同一份，改一处三处都变
   ===================================================================== */
renderers.wallet = function(){
  ensureWallet();
  var w = state.wallet;
  var html = '<div class="card glass" style="text-align:center;">'
    + '<div class="hint">我的虚拟余额</div>'
    + '<div class="wx-money" style="margin:6px 0;">¥ ' + (w.balance || 0) + '</div>'
    + '<div class="btn-row" style="justify-content:center;">'
    + '<button class="btn small" id="wEdit">改余额</button>'
    + '<button class="btn small ghost" id="wAdd">+100</button>'
    + '<button class="btn small ghost" id="wSub">-100</button></div>'
    + '<div class="hint" style="margin-top:8px;">在这里改了余额，微信零钱和购物结算里会立刻跟着变。</div>'
    + '</div>';
  html += '<div class="card glass"><h3>收货地址</h3>';
  (w.addresses || []).forEach(function(a){
    html += '<div class="wx-row"><div style="flex:1;"><div class="t">' + esc(a.name) + (a.def ? ' <span class="badge">默认</span>' : '') + '</div>'
      + '<div class="m">' + esc(a.detail) + (a.phone ? ' · ' + esc(a.phone) : '') + '</div></div>'
      + (a.def ? '' : '<button class="btn small ghost" data-wdef="' + a.id + '">设为默认</button>')
      + '<button class="btn small ghost" data-wdel="' + a.id + '">删</button></div>';
  });
  html += '<div class="btn-row" style="margin-top:10px;"><button class="btn small" id="wAddrNew">＋ 新增地址</button></div></div>';
  html += '<div class="card glass"><h3>账单</h3>';
  var bills = (w.bills || []).slice(0, 40);
  if(!bills.length) html += '<div class="empty">还没有账单。充个值、转个账、下个单都会记在这里。</div>';
  bills.forEach(function(b){
    var out = b.amount < 0;
    html += '<div class="wx-row"><div style="flex:1;"><div class="t">' + esc(b.note || (out ? '支出' : '收入')) + '</div>'
      + '<div class="m">' + fmtFull(b.ts) + '</div></div>'
      + '<b style="color:' + (out ? '#b06a6a' : '#5d8f6a') + ';">' + (out ? '-' : '+') + '¥' + Math.abs(b.amount) + '</b></div>';
  });
  html += '</div>';
  var box = $('walletBody');
  box.innerHTML = html;
  // 改余额：直接填一个数字
  $('wEdit').onclick = function(){
    openModal('改虚拟余额',
      '<label class="fld">新的余额</label><input type="number" id="wBal" value="' + (w.balance || 0) + '" min="0">'
      + '<label class="fld" style="margin-top:10px;">记一笔什么（可留空）</label><input type="text" id="wNote" placeholder="比如：手动调整">',
      [{text:'保存', fn:function(b2){
        var v = parseInt(b2.querySelector('#wBal').value, 10);
        if(isNaN(v) || v < 0){ toast('填一个不小于 0 的数字'); return; }
        var diff = v - (state.wallet.balance || 0);
        state.wallet.balance = v;
        if(diff !== 0) walletBill(diff, (b2.querySelector('#wNote').value || '').trim() || '手动调整余额');
        else save('wallet');
        renderers.wallet(); toast('余额已改成 ¥' + v);
      }}, {text:'取消', cls:'ghost'}]);
  };
  $('wAdd').onclick = function(){ walletBill(100, '手动调整余额'); renderers.wallet(); toast('+100'); };
  $('wSub').onclick = function(){
    if((state.wallet.balance || 0) < 100){ toast('余额不够 100'); return; }
    walletBill(-100, '手动调整余额'); renderers.wallet(); toast('-100');
  };
  $('wAddrNew').onclick = function(){ editAddress(null); };
  $$('[data-wdef]', box).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-wdef');
      (state.wallet.addresses || []).forEach(function(a){ a.def = (a.id === id); });
      save('wallet'); renderers.wallet(); toast('已设为默认');
    });
  });
  $$('[data-wdel]', box).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-wdel');
      state.wallet.addresses = (state.wallet.addresses || []).filter(function(a){ return a.id !== id; });
      if(state.wallet.addresses.length && !state.wallet.addresses.some(function(a){ return a.def; })){
        state.wallet.addresses[0].def = true;
      }
      save('wallet'); renderers.wallet(); toast('已删除');
    });
  });
};
// 新增 / 改收货地址
function editAddress(a){
  var isNew = !a;
  a = a || {id:uid(), name:'', detail:'', phone:'', def:false};
  openModal(isNew ? '新增地址' : '改地址',
      '<label class="fld">名字</label><input type="text" id="adN" value="' + esc(a.name) + '" placeholder="比如：家 / 公司">'
    + '<label class="fld">详细地址</label><input type="text" id="adD" value="' + esc(a.detail) + '">'
    + '<label class="fld">电话</label><input type="text" id="adP" value="' + esc(a.phone) + '">',
    [{text:'保存', fn:function(box){
      var n = (box.querySelector('#adN').value || '').trim();
      var d = (box.querySelector('#adD').value || '').trim();
      if(!n || !d){ toast('名字和地址都要填'); return; }
      a.name = n; a.detail = d; a.phone = (box.querySelector('#adP').value || '').trim();
      ensureWallet();
      if(isNew){
        if(!state.wallet.addresses.length) a.def = true;
        state.wallet.addresses.push(a);
      }
      save('wallet'); renderers.wallet(); toast('已保存');
    }}, {text:'取消', cls:'ghost'}]);
}
$('btnWalletAddr').addEventListener('click', function(){
  go('wallet');
  setTimeout(function(){ editAddress(null); }, 60);
});

/* =====================================================================
   购物 / 外卖（主界面图标）
   商品可以自动生成一批，也可以自己加（图片、名字、价格）
   加进购物车后，用「支付」里那份余额下单到虚拟地址
   ===================================================================== */
// 自动生成用的词库
var AUTO_GOODS = ['针织开衫','陶瓷马克杯','香薰蜡烛','帆布包','桌面小夜灯','亚麻抱枕','保温杯',
                  '无线充电板','桌面收纳盒','纸质笔记本','玻璃花瓶','毛绒拖鞋'];
var AUTO_SHOPS = ['一间小铺','南风杂货','白日梦有限公司','木与布','慢生活家居','City Basic'];
var TAKE_FOODS = ['番茄牛腩饭','麻辣香锅','豚骨拉面','黄焖鸡米饭','轻食鸡胸沙拉','虾仁小笼包',
                  '杨枝甘露','冰美式','芝士厚蛋烧','酸辣粉','照烧鸡腿饭','红豆双皮奶'];
var TAKE_SHOPS = ['巷口小馆','一碗热汤','深夜食堂','青禾轻食','老陈面馆','半糖咖啡'];
var GOOD_COLORS = ['#a8c7e6','#c9b6dd','#b8d3c2','#e8c9a8','#d9b6b6','#b6c9d9','#d6cfae','#c2b6d3'];
function ensureShop(){
  if(!state.shop) state.shop = {goods:[], cart:[], orders:[], cat:'buy'};
  if(!state.shop.goods) state.shop.goods = [];
  if(!state.shop.cart) state.shop.cart = [];
  if(!state.shop.orders) state.shop.orders = [];
  if(!state.shop.cat) state.shop.cat = 'buy';
  save2shop();
}
function save2shop(){ save('shop'); }
// 当前这一页里的商品
function shopGoods(cat){
  ensureShop();
  return state.shop.goods.filter(function(g){ return (g.cat || 'buy') === cat; });
}
// 自动生成一批（只动自动生成的那些，自己加的不会被清掉）
function shopAutoGen(cat){
  ensureShop();
  state.shop.goods = state.shop.goods.filter(function(g){ return !g.auto || (g.cat || 'buy') !== cat; });
  var isTake = (cat === 'take');
  for(var i = 0; i < 6; i++){
    var name = isTake ? pick(TAKE_FOODS) : pick(AUTO_GOODS);
    var shop = isTake ? pick(TAKE_SHOPS) : pick(AUTO_SHOPS);
    var price = isTake ? (12 + Math.floor(Math.random() * 46)) : (19 + Math.floor(Math.random() * 280));
    state.shop.goods.push({id:uid(), cat:cat, auto:true, name:name, shop:shop, price:price,
                           image:'', color:pick(GOOD_COLORS), ts:Date.now()});
  }
  save2shop();
}
// 购物车里的一件
function cartGoods(){
  ensureShop();
  var out = [];
  state.shop.cart.forEach(function(c){
    var g = state.shop.goods.filter(function(x){ return x.id === c.gid; })[0];
    if(g) out.push({g:g, num:c.num});
  });
  return out;
}
function cartTotal(){
  return cartGoods().reduce(function(s, it){ return s + it.g.price * it.num; }, 0);
}
function cartAdd(gid){
  ensureShop();
  var hit = state.shop.cart.filter(function(c){ return c.gid === gid; })[0];
  if(hit) hit.num++; else state.shop.cart.push({gid:gid, num:1});
  save2shop();
}
function cartSet(gid, n){
  ensureShop();
  if(n <= 0){ state.shop.cart = state.shop.cart.filter(function(c){ return c.gid !== gid; }); }
  else{
    var hit = state.shop.cart.filter(function(c){ return c.gid === gid; })[0];
    if(hit) hit.num = n; else state.shop.cart.push({gid:gid, num:n});
  }
  save2shop();
}
renderers.shop = function(){
  ensureShop();
  renderShop();
};
function renderShop(){
  ensureShop();
  var cat = state.shop.cat || 'buy';
  var isTake = (cat === 'take');
  $('shopTabBuy').className = 'btn small' + (isTake ? ' ghost' : '');
  $('shopTabTake').className = 'btn small' + (isTake ? '' : ' ghost');
  var cartBtn = $('spCart'); if(cartBtn) cartBtn.textContent = '购物车（' + state.shop.cart.length + '）';
  var list = shopGoods(cat);
  var html = '<div class="hint" style="margin:4px 0 10px;">'
    + (isTake ? '外卖：点「加入购物车」再一起去结算。' : '购物：自动生成的是虚拟商品，也可以自己加。')
    + '付款用的是主界面「支付」里的余额。</div>';
  if(!list.length){
    html += '<div class="empty">还没有商品，点上面「自动生成一批」或「手动添加」</div>';
  } else {
    html += '<div class="goods-grid">';
    list.forEach(function(g){
      var ph = (g.image && imgCache[g.image])
        ? '<div class="ph"><img src="' + imgCache[g.image] + '" alt=""></div>'
        : '<div class="ph" style="background:linear-gradient(150deg,' + (g.color || '#a8c7e6') + ',rgba(255,255,255,.35));">' + esc((g.name || '?').slice(0,1)) + '</div>';
      html += '<div class="gd" data-gd="' + g.id + '">' + ph
        + '<div class="info"><div class="nm">' + esc(g.name) + '</div>'
        + '<div class="sh">' + esc(g.shop || '') + (g.auto ? ' · 自动生成' : '') + '</div>'
        + '<div class="pr">¥' + g.price + '</div></div>'
        + '<div class="ops"><button class="btn small" data-gdadd="' + g.id + '">加入购物车</button>'
        + (g.auto ? '' : '<button class="btn small ghost" data-gddel="' + g.id + '">删</button>') + '</div></div>';
    });
    html += '</div>';
  }
  $('shopBody').innerHTML = html;
  $('spGen').onclick = function(){ shopAutoGen(cat); renderShop(); toast('生成好了'); };
  $('spCart').onclick = function(){ openShopCart(); };
  $('spAdd').onclick = function(){ openGoodModal(cat, null); };
  $$('[data-gdadd]', $('shopBody')).forEach(function(el){
    el.addEventListener('click', function(){ cartAdd(el.getAttribute('data-gdadd')); renderShop(); toast('已加入购物车'); });
  });
  $$('[data-gddel]', $('shopBody')).forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-gddel');
      state.shop.goods = state.shop.goods.filter(function(g){ return g.id !== id; });
      state.shop.cart = state.shop.cart.filter(function(c){ return c.gid !== id; });
      save2shop(); renderShop(); toast('已删除');
    });
  });
  fillIcons();
}
$('shopTabBuy').addEventListener('click', function(){ ensureShop(); state.shop.cat = 'buy'; save2shop(); renderShop(); });
$('shopTabTake').addEventListener('click', function(){ ensureShop(); state.shop.cat = 'take'; save2shop(); renderShop(); });
// 手动加一件商品（可上传图片或填网址）
function openGoodModal(cat, g){
  var isNew = !g;
  ensureShop();
  window.__gdImg = '';
  openModal(isNew ? '添加商品' : '改商品',
      '<label class="fld">名称</label><input type="text" id="gdN" value="' + esc(g ? g.name : '') + '" placeholder="' + (cat === 'take' ? '比如：番茄牛腩饭' : '比如：毛绒抱枕') + '">'
    + '<label class="fld">店铺</label><input type="text" id="gdS" value="' + esc(g ? (g.shop || '') : '') + '" placeholder="哪里买的">'
    + '<label class="fld">价格（元）</label><input type="number" id="gdP" value="' + (g ? g.price : 19) + '" min="0">'
    + '<label class="fld" style="margin-top:12px;">图片：粘贴图片网址</label>'
    + '<div class="row" style="gap:6px;"><input type="text" id="gdUrl" placeholder="https://....png" style="flex:1;">'
    + '<button class="btn small ghost" id="gdUrlGo" style="flex:0 0 auto;">用这个</button></div>'
    + '<div class="hint" style="margin:8px 0 6px;">或者从本机上传一张：</div>'
    + '<div class="btn-row"><button class="btn small ghost" id="gdImg">选择图片</button></div>'
    + '<div class="hint" id="gdImgName"></div>',
    [
      {text:'保存', fn:function(box){
        var n = (box.querySelector('#gdN').value || '').trim();
        var p = parseInt(box.querySelector('#gdP').value, 10);
        if(!n){ toast('名字不能空'); return; }
        if(isNaN(p) || p < 0){ toast('价格不对'); return; }
        if(isNew){
          state.shop.goods.push({id:uid(), cat:cat, auto:false, name:n,
            shop:(box.querySelector('#gdS').value || '').trim(), price:p,
            image:window.__gdImg || '', color:pick(GOOD_COLORS), ts:Date.now()});
        } else {
          g.name = n; g.price = p; g.shop = (box.querySelector('#gdS').value || '').trim();
          if(window.__gdImg) g.image = window.__gdImg;
        }
        window.__gdImg = '';
        save2shop(); renderShop(); toast('已保存');
      }},
      {text:'取消', cls:'ghost'}
    ]);
  // 用网址
  var ug = $('gdUrlGo');
  if(ug) ug.onclick = function(){
    var u = ($('gdUrl').value || '').trim();
    if(!u){ toast('地址是空的'); return; }
    var iid = '__gd_' + uid();
    idbPut('images', {id:iid, name:'商品图', url:u, ts:Date.now()}).then(function(){
      imgCache[iid] = u; window.__gdImg = iid;
      var el = $('gdImgName'); if(el) el.textContent = '已用网址里的图片';
      toast('图片已就位，点保存');
    });
  };
  // 从本机上传
  var fbtn = $('gdImg');
  if(fbtn) fbtn.onclick = function(){
    pickFile('image/*', false, function(files){
      var f = files[0]; if(!f) return;
      var iid = '__gd_' + uid();
      idbPut('images', {id:iid, name:f.name, blob:f, ts:Date.now()}).then(function(){
        refreshAlbum(function(){
          window.__gdImg = iid;
          var el = $('gdImgName'); if(el) el.textContent = '已选：' + f.name;
          toast('图片已就位，点保存');
        });
      });
    });
  };
}
// 购物车
function openShopCart(){
  ensureWallet(); ensureShop();
  var items = cartGoods();
  var html = '';
  if(!items.length){
    html += '<div class="empty">购物车还是空的</div>';
  } else {
    items.forEach(function(it){
      html += '<div class="cart-row"><div class="nm">' + esc(it.g.name) + '<div class="m">¥' + it.g.price + ' · ' + esc(it.g.shop || '') + '</div></div>'
        + '<div class="stepper"><button data-cminus="' + it.g.id + '">-</button><b>' + it.num + '</b>'
        + '<button data-cplus="' + it.g.id + '">+</button></div>'
        + '<b style="min-width:52px;text-align:right;">¥' + (it.g.price * it.num) + '</b></div>';
    });
    html += '<div class="row between" style="margin-top:12px;"><b>合计</b><b style="color:var(--c-primary);font-size:18px;">¥' + cartTotal() + '</b></div>';
    html += '<div class="hint" style="margin-top:6px;">当前余额：¥' + (state.wallet.balance || 0) + '</div>';
    html += '<div class="btn-row" style="margin-top:12px;"><button class="btn block" id="ckOut">去下单</button></div>';
  }
  openModal('购物车', html, [{text:'关闭', cls:'ghost'}]);
  $$('[data-cplus]').forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-cplus');
      var c = state.shop.cart.filter(function(x){ return x.gid === id; })[0];
      cartSet(id, (c ? c.num : 0) + 1); openShopCart();
    });
  });
  $$('[data-cminus]').forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-cminus');
      var c = state.shop.cart.filter(function(x){ return x.gid === id; })[0];
      cartSet(id, (c ? c.num : 1) - 1); openShopCart();
    });
  });
  var co = $('ckOut');
  if(co) co.onclick = function(){ closeModal(); openCheckout(); };
}
// 结算：选地址 → 扣余额 → 生成订单
function openCheckout(){
  ensureWallet(); ensureShop();
  var items = cartGoods();
  if(!items.length){ toast('购物车是空的'); return; }
  var total = cartTotal();
  var addrs = state.wallet.addresses || [];
  if(!addrs.length){ toast('先去「支付」里加一个收货地址'); return; }
  var cur = defaultAddress() || addrs[0];
  var opts = addrs.map(function(a){
    return '<option value="' + a.id + '"' + (a.id === cur.id ? ' selected' : '') + '>' + esc(a.name + ' · ' + a.detail) + '</option>';
  }).join('');
  var take = (state.shop.cat === 'take');
  openModal('确认订单',
      '<div class="hint" style="margin-bottom:8px;">共 ' + items.length + ' 件，合计 <b style="color:var(--c-primary);">¥' + total + '</b>；'
    + '余额 ¥' + (state.wallet.balance || 0) + '</div>'
    + '<label class="fld">' + (take ? '送到哪里' : '寄到哪里') + '</label><select id="coAd">' + opts + '</select>'
    + '<label class="fld">备注</label><input type="text" id="coNote" placeholder="可留空">'
    + '<div class="hint" style="margin-top:8px;">下单后钱会从「支付」里的余额扣掉，微信零钱里看到的也会一起变。</div>',
    [{text:'付钱下单', fn:function(box){
      if(total > (state.wallet.balance || 0)){ toast('余额不够，去「支付」里改一改'); return; }
      var aid = box.querySelector('#coAd').value;
      var a = addrs.filter(function(x){ return x.id === aid; })[0] || addrs[0];
      var note = (box.querySelector('#coNote').value || '').trim();
      walletBill(-total, (take ? '外卖 · ' : '购物 · ') + items.length + ' 件' + (note ? '（' + note + '）' : ''));
      state.shop.orders.unshift({id:uid(), cat:state.shop.cat, ts:Date.now(), total:total,
        addr:{name:a.name, detail:a.detail, phone:a.phone}, note:note, status:'已下单',
        items:items.map(function(it){ return {name:it.g.name, price:it.g.price, num:it.num, shop:it.g.shop}; })});
      state.shop.cart = [];
      save2shop();
      renderShop();
      toast('下单成功，共 ¥' + total);
      addNotice('plan', (take ? '外卖' : '购物') + '订单已下单：¥' + total);
    }}, {text:'再想想', cls:'ghost'}]);
}
// 订单列表
$('btnShopOrders').addEventListener('click', function(){
  ensureShop();
  var orders = state.shop.orders || [];
  var html = '';
  if(!orders.length) html += '<div class="empty">还没有订单</div>';
  orders.slice(0, 30).forEach(function(o){
    html += '<div class="order"><div class="row between"><b>' + (o.cat === 'take' ? '外卖' : '购物') + ' · ¥' + o.total + '</b>'
      + '<span class="m">' + fmtFull(o.ts) + '</span></div>';
    (o.items || []).forEach(function(it){
      html += '<div class="m">' + esc(it.name) + ' ×' + it.num + ' · ¥' + (it.price * it.num) + '</div>';
    });
    html += '<div class="m" style="margin-top:4px;">送到：' + esc((o.addr && o.addr.name) || '') + ' ' + esc((o.addr && o.addr.detail) || '') + '</div>'
      + '<div class="row between" style="margin-top:4px;"><span class="badge">' + esc(o.status || '已下单') + '</span>'
      + '<button class="btn small ghost" data-ordel="' + o.id + '">删除记录</button></div></div>';
  });
  openModal('我的订单', html, [{text:'关闭', cls:'ghost'}]);
  $$('[data-ordel]').forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-ordel');
      state.shop.orders = (state.shop.orders || []).filter(function(o){ return o.id !== id; });
      save2shop(); closeModal(); toast('已删除记录');
    });
  });
});

/* =====================================================================
   健康（主界面图标）：饮食热量 / 月经 / 步数 / 睡眠
   · 饮食：手动写下吃了什么 + 克数，按食物库换算热量；食物库里没有的可以直接写热量
   · 月经：手动记开始日期、周期、经期长度，自动算现在第几天、下次哪天
   · 步数：可以手动记；授权定位后按走过的距离自动累计
   · 睡眠：手动填入睡 / 起床时间，自动算时长
   全部按天存在 state.health 里，一天一格
   ===================================================================== */
// 常见食物热量（每 100g 大致值，只作参考）
var H_FOODS = [
  ['米饭',116],['白粥',46],['面条',110],['馒头',223],['包子',227],['全麦面包',246],
  ['鸡蛋',144],['鸡胸肉',133],['牛肉',125],['猪肉',395],['鱼',104],['虾',93],
  ['牛奶',54],['酸奶',72],['豆浆',31],['拿铁',60],['美式咖啡',2],['奶茶',90],
  ['苹果',53],['香蕉',93],['橙子',48],['葡萄',43],['西瓜',26],['草莓',32],
  ['西兰花',34],['生菜',15],['番茄',18],['土豆',77],['红薯',86],['玉米',106],
  ['豆腐',82],['薯条',312],['炸鸡',279],['汉堡',295],['披萨',266],['蛋糕',347],
  ['巧克力',546],['薯片',536],['可乐',43],['啤酒',32]
];
var H_TABS = [['over','概览'],['food','饮食'],['period','经期'],['sleep','睡眠'],['step','步数']];
var H_FLOWS = ['少','中','多'];
var H_SYMS = ['腹痛','腰酸','情绪低','头痛','乏力','犯困'];
var hGeoWatch = null;

function hDayKey(d){
  d = d || new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
function hToday(){ return hDayKey(new Date()); }
function hDayText(k){
  var a = String(k || '').split('-');
  if(a.length < 3) return k || '';
  return parseInt(a[1], 10) + '月' + parseInt(a[2], 10) + '日';
}
function ensureHealth(){
  if(!state.health || typeof state.health !== 'object') state.health = {};
  var h = state.health;
  if(!h.meals) h.meals = {};          // '2026-10-24' -> [{id,name,gram,kcal,ts}]
  if(!h.steps) h.steps = {};          // '2026-10-24' -> 步数
  if(!h.sleeps) h.sleeps = {};        // '2026-10-24'（起床那天） -> {start,end,min,ts}
  if(!h.period) h.period = {last:'', cycle:28, len:5, logs:{}};
  if(!h.period.logs) h.period.logs = {};
  if(typeof h.target !== 'number') h.target = 1800;
  if(typeof h.stepGoal !== 'number') h.stepGoal = 6000;
  if(h.auto === undefined) h.auto = false;
  if(!h.geo) h.geo = {last:null, dist:0, on:false};
  if(!h.tab) h.tab = 'over';
  return h;
}
function hSave(){ save('health'); }
// 某一列最近 n 天的日期（从今天往前）
function hLastDays(n){
  var out = [], now = new Date(); now.setHours(12, 0, 0, 0);
  for(var i = n - 1; i >= 0; i--){
    out.push(hDayKey(new Date(now.getTime() - i * 86400000)));
  }
  return out;
}
// 时长（分钟）→ 「7小时20分」
function hDurText(min){
  min = Math.max(0, Math.round(min));
  var hh = Math.floor(min / 60), mm = min % 60;
  if(!hh) return mm + '分';
  return hh + '小时' + (mm ? mm + '分' : '');
}
// 入睡 / 起床 → 睡了多少分钟（跨过零点也算对）
function hSleepMin(start, end){
  function t(s){ var p = String(s || '').split(':'); var a = parseInt(p[0], 10), b = parseInt(p[1], 10);
                 return (isNaN(a) ? NaN : a * 60 + (isNaN(b) ? 0 : b)); }
  var a = t(start), b = t(end);
  if(isNaN(a) || isNaN(b)) return 0;
  if(b <= a) b += 1440;
  return b - a;
}

/* ---------- 饮食 ---------- */
function hFindFood(name){
  name = String(name || '').trim();
  if(!name) return null;
  for(var i = 0; i < H_FOODS.length; i++){
    if(H_FOODS[i][0] === name) return {n:H_FOODS[i][0], k:H_FOODS[i][1]};
  }
  for(var j = 0; j < H_FOODS.length; j++){
    if(name.indexOf(H_FOODS[j][0]) >= 0 || H_FOODS[j][0].indexOf(name) >= 0) return {n:H_FOODS[j][0], k:H_FOODS[j][1]};
  }
  return null;
}
function hMeals(day){ var h = ensureHealth(); return h.meals[day] || []; }
function hKcal(day){
  return hMeals(day).reduce(function(s, m){ return s + (m.kcal || 0); }, 0);
}
function hAddMeal(name, gram, kcal){
  var h = ensureHealth(), day = hToday();
  if(!h.meals[day]) h.meals[day] = [];
  h.meals[day].push({id:uid(), name:name || '一笔', gram:Math.round(gram || 0), kcal:Math.round(kcal || 0), ts:Date.now()});
  hSave();
}

/* ---------- 月经 ---------- */
// 现在是不是经期、第几天、下次哪天
function hPeriodInfo(){
  var p = ensureHealth().period;
  var cycle = Math.max(20, parseInt(p.cycle, 10) || 28);
  var len = Math.max(2, parseInt(p.len, 10) || 5);
  var res = {has:!!p.last, on:false, day:0, next:'', toNext:null, cycle:cycle, len:len, late:0};
  if(!p.last) return res;
  var last = new Date(p.last + 'T00:00:00');
  if(isNaN(last.getTime())){ res.has = false; return res; }
  last.setHours(0, 0, 0, 0);
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var diff = Math.round((today.getTime() - last.getTime()) / 86400000);
  if(diff >= 0 && diff < len){ res.on = true; res.day = diff + 1; }
  // 下一次：从上次开始按周期往后推，推到今天或以后
  var next = new Date(last.getTime() + cycle * 86400000);
  var guard = 0;
  while(next.getTime() < today.getTime() && guard++ < 500) next = new Date(next.getTime() + cycle * 86400000);
  res.next = hDayKey(next);
  res.toNext = Math.round((next.getTime() - today.getTime()) / 86400000);
  return res;
}
// 往后预测三次
function hPeriodNext3(){
  var i = hPeriodInfo();
  if(!i.has) return [];
  var out = [], t = new Date(i.next + 'T00:00:00');
  for(var k = 0; k < 3; k++){
    var d = new Date(t.getTime() + k * i.cycle * 86400000);
    out.push(hDayKey(d));
  }
  return out;
}

/* ---------- 步数：授权定位后按距离估步数 ---------- */
function hDist(lat1, lng1, lat2, lng2){
  var R = 6371000, r = Math.PI / 180;
  var dLat = (lat2 - lat1) * r, dLng = (lng2 - lng1) * r;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function hAddSteps(n, silent){
  var h = ensureHealth(), day = hToday();
  n = Math.round(n || 0);
  if(!n) return;
  h.steps[day] = Math.max(0, (h.steps[day] || 0) + n);
  hSave();
  if(currentScreen === 'health'){
    if(silent){ var el = $('hStepNow'); if(el) el.textContent = h.steps[day]; }
    else renderers.health();
  }
}
function hStopGeo(){
  if(hGeoWatch !== null){
    try{ navigator.geolocation.clearWatch(hGeoWatch); }catch(e){}
    hGeoWatch = null;
  }
}
function hToggleAuto(on){
  var h = ensureHealth();
  if(!on){
    h.auto = false; h.geo.on = false; hSave(); hStopGeo();
    toast('已关掉自动计步');
    if(currentScreen === 'health') renderers.health();
    return;
  }
  if(!navigator.geolocation){ toast('这个浏览器拿不到定位，先手动记吧'); return; }
  h.auto = true; h.geo.on = false; hSave();
  if(currentScreen === 'health') renderers.health();
  toast('正在问你要定位权限…');
  hStopGeo();
  try{
    hGeoWatch = navigator.geolocation.watchPosition(function(pos){
      var hh = ensureHealth();
      var c = pos.coords;
      var last = hh.geo.last;
      if(last && last.lat){
        var d = hDist(last.lat, last.lng, c.latitude, c.longitude);
        // 过滤掉定位乱跳（1 米以内算没动，200 米以上当成漂移）
        if(d > 1.2 && d < 200){
          hh.geo.dist = (hh.geo.dist || 0) + d;
          var add = Math.round(d * 1.35);   // 1 米大约 1.35 步
          if(add > 0) hAddSteps(add, true);
        }
      }
      hh.geo.last = {lat:c.latitude, lng:c.longitude, ts:Date.now()};
      hh.geo.on = true; hh.auto = true;
      hSave();
      if(currentScreen === 'health' && !$('hGeoState')){
        renderers.health();
      } else {
        var g = $('hGeoState');
        if(g){ g.textContent = '定位已连接 · 自动计步中'; g.style.color = 'var(--c-primary)'; }
      }
    }, function(err){
      hStopGeo();
      var hh = ensureHealth();
      hh.auto = false; hh.geo.on = false; hSave();
      toast(err && err.code === 1 ? '没给定位权限，先手动记吧' : '定位暂时用不了，先手动记吧');
      if(currentScreen === 'health') renderers.health();
    }, {enableHighAccuracy:true, maximumAge:4000, timeout:20000});
  }catch(e){
    h.auto = false; hSave();
    toast('定位打不开，先手动记吧');
  }
}

/* ---------- 界面 ---------- */
renderers.health = function(){
  var h = ensureHealth();
  var box = $('healthBody');
  if(!box) return;
  var html = '<div class="h-tabs">';
  H_TABS.forEach(function(t){
    html += '<button data-htab="' + t[0] + '" class="' + (h.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>';
  });
  html += '</div>' + hPanel(h.tab);
  box.innerHTML = html;
  $$('[data-htab]', box).forEach(function(b){
    b.addEventListener('click', function(){
      ensureHealth().tab = b.getAttribute('data-htab');
      hSave(); renderers.health();
    });
  });
  hBind(h.tab, box);
  try{ fillIcons(); }catch(e){}
};
function hPanel(tab){
  if(tab === 'food') return hFoodPanel();
  if(tab === 'period') return hPeriodPanel();
  if(tab === 'sleep') return hSleepPanel();
  if(tab === 'step') return hStepPanel();
  return hOverPanel();
}
// ① 概览：今天四个数
function hOverPanel(){
  var h = ensureHealth(), day = hToday();
  var kcal = hKcal(day), steps = h.steps[day] || 0;
  var sl = h.sleeps[day] || null;
  var pi = hPeriodInfo();
  var burn = Math.round(steps * 0.04);
  var net = kcal - burn;
  var kPct = Math.min(100, Math.round(kcal / (h.target || 1800) * 100));
  var sPct = Math.min(100, Math.round(steps / (h.stepGoal || 6000) * 100));
  var html = '<div class="h-grid">';
  html += '<div class="h-stat"><div class="k">今天吃进</div><div class="v">' + kcal + '<small>kcal</small></div>'
        + '<div class="h-bar"><i style="width:' + kPct + '%"></i></div>'
        + '<div class="m">目标 ' + (h.target || 1800) + ' · 走了 ' + steps + ' 步，约减 ' + burn + ' kcal</div></div>';
  html += '<div class="h-stat"><div class="k">今天走了</div><div class="v">' + steps + '<small>步</small></div>'
        + '<div class="h-bar"><i style="width:' + sPct + '%"></i></div>'
        + '<div class="m">' + (h.auto ? '自动计步开着' : '手动记 / 可开自动计步') + '</div></div>';
  html += '<div class="h-stat"><div class="k">昨晚睡了</div><div class="v">' + (sl ? hDurText(sl.min) : '—') + '</div>'
        + '<div class="m">' + (sl ? esc(sl.start) + ' → ' + esc(sl.end) : '还没有记录') + '</div></div>';
  html += '<div class="h-stat"><div class="k">经期</div><div class="v">' + (pi.on ? '第 ' + pi.day + '<small>天</small>' : (pi.has ? '还有 ' + pi.toNext + '<small>天</small>' : '—')) + '</div>'
        + '<div class="m">' + (!pi.has ? '还没记过' : (pi.on ? '在经期里，别着凉' : '大概 ' + hDayText(pi.next) + ' 开始')) + '</div></div>';
  html += '</div>';
  html += '<div class="card glass"><h3>今天净摄入</h3>'
        + '<div class="h-big">' + net + '<small>kcal</small></div>'
        + '<div class="h-tip">吃进去 ' + kcal + '，走掉的约 ' + burn + '。'
        + (net > h.target ? '比目标多了 ' + (net - h.target) + ' kcal，喝点水早点睡。'
           : '离目标还剩 ' + Math.max(0, h.target - net) + ' kcal。') + '</div>'
        + '<div class="btn-row" style="margin-top:10px;">'
        + '<button class="btn small ghost" data-hgo="food">去记饮食</button>'
        + '<button class="btn small ghost" data-hgo="step">记步数</button>'
        + '<button class="btn small ghost" data-hgo="sleep">记睡眠</button>'
        + '<button class="btn small ghost" data-hgo="period">记经期</button></div></div>';
  html += '<div class="card glass"><h3>最近七天</h3>'
        + '<div class="hint">步数</div>'
        + hBarsDays(function(d){ return h.steps[d] || 0; }, h.stepGoal)
        + '<div class="hint" style="margin-top:14px;">吃进去的热量</div>'
        + hBarsDays(function(d){ return hKcal(d); }, h.target);
  html += '</div>';
  return html;
}
// 七天柱状图（value 取值函数，goal 用来算高度上限）
function hBarsDays(fn, goal){
  var days = hLastDays(7);
  var max = Math.max(goal || 1, 1);
  var any = false;
  days.forEach(function(d){ var v = fn(d); if(v > 0) any = true; max = Math.max(max, v); });
  if(!any) return '<div class="h-tip">这几天还没有记录。</div>';
  var html = '<div class="h-days">';
  days.forEach(function(d){
    var v = fn(d);
    var pct = Math.round(v / max * 70) + 4;
    html += '<div' + (d === hToday() ? ' class="on"' : '') + ' title="' + v + '">'
          + '<i style="height:' + pct + '%"></i><span>' + hDayText(d).replace('月', '/').replace('日', '') + '</span></div>';
  });
  return html + '</div>';
}
// ② 饮食
function hFoodPanel(){
  var h = ensureHealth(), day = hToday();
  var meals = hMeals(day), total = hKcal(day);
  var pct = Math.min(100, Math.round(total / (h.target || 1800) * 100));
  var html = '<div class="card glass">'
    + '<div class="row between" style="align-items:flex-end;">'
    + '<div><div class="hint">今天吃进去的</div><div class="h-big">' + total + '<small>/ ' + (h.target || 1800) + ' kcal</small></div></div>'
    + '<button class="btn small ghost" id="hTargetBtn">改目标</button></div>'
    + '<div class="h-bar"><i style="width:' + pct + '%"></i></div>'
    + '<div class="h-tip">' + (total > h.target ? '今天超了 ' + (total - h.target) + ' kcal，明天慢一点就好。'
        : '还差 ' + Math.max(0, h.target - total) + ' kcal 到目标。') + '</div></div>';

  html += '<div class="card glass"><h3>记一笔</h3>'
    + '<label class="fld">吃了什么</label>'
    + '<input id="hFood" type="text" list="hFoodList" placeholder="比如 米饭 / 拿铁 / 炸鸡" autocomplete="off">'
    + '<datalist id="hFoodList">' + H_FOODS.map(function(f){
        return '<option value="' + f[0] + '">' + f[1] + ' kcal / 100g</option>';
      }).join('') + '</datalist>'
    + '<div class="h-two" style="margin-top:8px;">'
    + '<div><label class="fld" style="margin-top:0;">份量（克）</label><input id="hGram" type="number" value="100" min="1" inputmode="decimal"></div>'
    + '<div><label class="fld" style="margin-top:0;">换算热量</label><div id="hKcalNow" style="font-size:19px;font-weight:600;padding-top:9px;">—</div></div>'
    + '</div>'
    + '<div class="h-chips" id="hGramChips">' + [50,100,150,200,300].map(function(g){
        return '<span class="h-chip" data-hgram="' + g + '">' + g + 'g</span>';
      }).join('') + '</div>'
    + '<button class="btn block" id="hAddFood" style="margin-top:10px;">' + lnIcon('plus', 15) + ' 记下来</button>'
    + '<div class="hint" style="margin-top:8px;">食物库里没有的，可以在下面直接写热量。</div></div>';

  html += '<div class="card glass"><h3>直接写热量</h3>'
    + '<div class="h-two"><input id="hCustomName" type="text" placeholder="名字（不填也行）">'
    + '<input id="hCustomKcal" type="number" placeholder="kcal" min="1" inputmode="numeric"></div>'
    + '<button class="btn small ghost block" id="hAddCustom" style="margin-top:8px;">记下这一笔</button></div>';

  html += '<div class="card glass"><h3>今天吃了（' + meals.length + '）</h3>';
  if(!meals.length) html += '<div class="empty">还没记。上面写一笔试试。</div>';
  meals.forEach(function(m){
    html += '<div class="h-row"><div style="flex:1;min-width:0;">'
      + '<div class="t">' + esc(m.name) + (m.gram ? ' <span class="hint">' + m.gram + 'g</span>' : '') + '</div>'
      + '<div class="m">' + fmtTime(m.ts) + '</div></div>'
      + '<b style="font-size:13px;">' + m.kcal + ' kcal</b>'
      + '<button class="btn small ghost" data-hdelmeal="' + m.id + '" style="min-height:28px;padding:0 9px;">删</button></div>';
  });
  html += '</div>';
  return html;
}
// ③ 经期
function hPeriodPanel(){
  var h = ensureHealth(), p = h.period, info = hPeriodInfo();
  var today = hToday(), log = p.logs[today] || null;
  var html = '<div class="card glass">';
  if(!info.has){
    html += '<h3>还没有记录</h3><div class="hint">先在下面填一次「这次是哪天开始的」，之后它会自己往后算。</div>';
  } else if(info.on){
    html += '<h3>经期第 ' + info.day + ' 天</h3>'
      + '<div class="h-big">' + info.day + '<small>/ ' + info.len + ' 天</small></div>'
      + '<div class="h-tip">上次开始：' + hDayText(p.last) + ' · 预计 ' + hDayText(info.next) + ' 再来</div>';
  } else {
    html += '<h3>距离下次还有 ' + info.toNext + ' 天</h3>'
      + '<div class="h-big">' + info.toNext + '<small>天</small></div>'
      + '<div class="h-tip">上次开始：' + hDayText(p.last) + ' · 预计 ' + hDayText(info.next) + ' 开始</div>';
  }
  if(info.has){
    html += '<div class="h-cycle"><div>周期<b>' + info.cycle + ' 天</b></div>'
      + '<div>经期<b>' + info.len + ' 天</b></div>'
      + '<div>上次<b>' + hDayText(p.last) + '</b></div>'
      + '<div>下次<b>' + hDayText(info.next) + '</b></div></div>';
  }
  html += '</div>';

  // 今天的情况
  html += '<div class="card glass"><h3>今天的情况</h3>'
    + '<div class="hint">量</div><div class="h-chips" id="hFlowChips">'
    + H_FLOWS.map(function(f){
        return '<span class="h-chip' + (log && log.flow === f ? ' on' : '') + '" data-hflow="' + f + '">' + f + '</span>';
      }).join('') + '</div>'
    + '<div class="hint" style="margin-top:10px;">身上怎么样（可多选）</div><div class="h-chips" id="hSymChips">'
    + H_SYMS.map(function(s){
        var on = log && log.syms && log.syms.indexOf(s) >= 0;
        return '<span class="h-chip' + (on ? ' on' : '') + '" data-hsym="' + s + '">' + s + '</span>';
      }).join('') + '</div>'
    + '<input id="hPeriodNote" type="text" placeholder="想记的别的（可以不填）" style="margin-top:10px;" value="' + esc(log && log.note || '') + '">'
    + '<button class="btn block" id="hSaveLog" style="margin-top:10px;">记下今天的</button>'
    + '<div class="hint" style="margin-top:8px;">如果没有来，就只记症状，量留空。</div></div>';

  // 设置
  html += '<div class="card glass"><h3>周期设置</h3>'
    + '<label class="fld">这次是哪天开始的</label>'
    + '<input id="hLast" type="date" value="' + esc(p.last || '') + '">'
    + '<div class="h-two" style="margin-top:8px;">'
    + '<div><label class="fld" style="margin-top:0;">周期（天）</label><input id="hCycle" type="number" value="' + info.cycle + '" min="20" max="45"></div>'
    + '<div><label class="fld" style="margin-top:0;">经期几天</label><input id="hLen" type="number" value="' + info.len + '" min="2" max="10"></div>'
    + '</div>'
    + '<div class="btn-row" style="margin-top:10px;">'
    + '<button class="btn small ghost" id="hPeriodToday">今天来了</button>'
    + '<button class="btn small" id="hSavePeriod">保存</button></div></div>';

  // 往后三次的预测
  var next3 = hPeriodNext3();
  if(next3.length){
    html += '<div class="card glass"><h3>接下来大概</h3>'
      + next3.map(function(d, i){
          return '<div class="h-row"><div class="t">第 ' + (i + 1) + ' 次</div><b style="font-size:13px;">' + hDayText(d) + '</b></div>';
        }).join('') + '</div>';
  }

  // 历史
  var keys = Object.keys(p.logs).sort().reverse().slice(0, 8);
  html += '<div class="card glass"><h3>记过的日子</h3>';
  if(!keys.length) html += '<div class="empty">还没有记过</div>';
  keys.forEach(function(k){
    var g = p.logs[k];
    html += '<div class="h-row"><div style="flex:1;"><div class="t">' + hDayText(k) + '</div>'
      + '<div class="m">' + ([g.flow ? '量 ' + g.flow : '', (g.syms || []).join('、'), g.note].filter(Boolean).join(' · ') || '—') + '</div></div></div>';
  });
  html += '</div>';
  return html;
}
// ④ 睡眠
function hSleepPanel(){
  var h = ensureHealth(), day = hToday();
  var todayRec = h.sleeps[day] || null;
  var keys = Object.keys(h.sleeps).sort().reverse().slice(0, 10);
  var avg = 0;
  if(keys.length){
    var sum = 0;
    keys.slice(0, 7).forEach(function(k){ sum += h.sleeps[k].min || 0; });
    avg = Math.round(sum / Math.min(7, keys.length));
  }
  var html = '<div class="card glass">'
    + '<div class="row between" style="align-items:flex-end;">'
    + '<div><div class="hint">今天这一觉</div>'
    + '<div class="h-big">' + (todayRec ? hDurText(todayRec.min) : '—') + '</div></div>'
    + '<div style="text-align:right;"><div class="hint">近七天平均</div><b style="font-size:15px;">' + (avg ? hDurText(avg) : '—') + '</b></div></div>'
    + '<div class="h-tip">' + (todayRec ? '入睡 ' + todayRec.start + ' · 起床 ' + todayRec.end : '今天还没记，下面填一下就好。') + '</div></div>';

  html += '<div class="card glass"><h3>记一觉</h3>'
    + '<div class="h-two">'
    + '<div><label class="fld" style="margin-top:0;">入睡</label><input id="hSleepIn" type="time" value="' + esc((todayRec && todayRec.start) || state.settings.sleepTime || '23:30') + '"></div>'
    + '<div><label class="fld" style="margin-top:0;">起床</label><input id="hSleepOut" type="time" value="' + esc((todayRec && todayRec.end) || '07:00') + '"></div>'
    + '</div>'
    + '<div class="h-tip" id="hSleepLen" style="margin-top:10px;font-size:13px;color:var(--c-text);">—</div>'
    + '<button class="btn block" id="hSaveSleep" style="margin-top:10px;">记下这一觉</button>'
    + '<div class="hint" style="margin-top:8px;">过了零点也认得，比如 23:40 → 07:10 算 7 小时 30 分。</div></div>';

  html += '<div class="card glass"><h3>最近的睡眠</h3>';
  if(!keys.length) html += '<div class="empty">还没有记录</div>';
  keys.forEach(function(k){
    var s = h.sleeps[k];
    html += '<div class="h-row"><div style="flex:1;"><div class="t">' + hDayText(k) + ' 早上起</div>'
      + '<div class="m">' + esc(s.start) + ' → ' + esc(s.end) + '</div></div>'
      + '<b style="font-size:13px;">' + hDurText(s.min) + '</b>'
      + '<button class="btn small ghost" data-hdelsleep="' + k + '" style="min-height:28px;padding:0 9px;">删</button></div>';
  });
  html += '</div>';
  return html;
}
// ⑤ 步数
function hStepPanel(){
  var h = ensureHealth(), day = hToday();
  var steps = h.steps[day] || 0;
  var pct = Math.min(100, Math.round(steps / (h.stepGoal || 6000) * 100));
  var html = '<div class="card glass"><div class="hint">今天走了</div>'
    + '<div class="h-big"><span id="hStepNow">' + steps + '</span><small>步</small></div>'
    + '<div class="h-bar"><i style="width:' + pct + '%"></i></div>'
    + '<div class="h-tip">目标 ' + (h.stepGoal || 6000) + ' 步 · 约 ' + (steps * 0.7 / 1000).toFixed(2) + ' 公里 · 消耗 ' + Math.round(steps * 0.04) + ' kcal</div></div>';

  html += '<div class="card glass"><h3>自动计步</h3>'
    + '<div class="row between"><div style="flex:1;"><div class="t">用定位估算步数</div>'
    + '<div class="hint" id="hGeoState">' + (h.auto ? (h.geo.on ? '定位已连接 · 自动计步中' : '已打开，正在等定位…') : '没开。打开后按你走过的距离算步子。') + '</div></div>'
    + '<button class="switch' + (h.auto ? ' on' : '') + '" id="hAutoSw"></button></div>'
    + '<div class="hint" style="margin-top:10px;">打开时会问你要「位置」权限，允许了才会自己走。不给也能用，手动记就行。'
    + (h.geo.on ? '<br>已累计移动 ' + Math.round(h.geo.dist || 0) + ' 米。' : '') + '</div>'
    + '<button class="btn small ghost block" id="hWalkDemo" style="margin-top:10px;">试走一段（+300 步）</button></div>';

  html += '<div class="card glass"><h3>手动记</h3>'
    + '<div class="h-two"><input id="hStepInput" type="number" placeholder="加多少步，比如 800" inputmode="numeric">'
    + '<button class="btn small" id="hStepAdd" style="min-height:46px;">加上去</button></div>'
    + '<div class="h-chips">' + [500,1000,2000,3000].map(function(n){
        return '<span class="h-chip" data-hstep="' + n + '">+' + n + '</span>';
      }).join('') + '</div>'
    + '<button class="btn small ghost block" id="hStepReset" style="margin-top:10px;">今天清零</button></div>';

  html += '<div class="card glass"><h3>最近七天</h3>' + hBarsDays(function(d){ return h.steps[d] || 0; }, h.stepGoal) + '</div>';
  return html;
}

/* ---------- 事件绑定 ---------- */
function hBind(tab, box){
  var h = ensureHealth(), day = hToday();
  // 概览上的四个快捷键
  $$('[data-hgo]', box).forEach(function(b){
    b.addEventListener('click', function(){
      ensureHealth().tab = b.getAttribute('data-hgo'); hSave(); renderers.health();
    });
  });
  if(tab === 'food'){
    var f = $('hFood'), g = $('hGram'), now = $('hKcalNow');
    function upd(){
      if(!f || !g || !now) return;
      var item = hFindFood(f.value);
      var gram = parseFloat(g.value) || 0;
      now.innerHTML = (item && gram) ? (Math.round(item.k * gram / 100) + ' <span style="font-size:11px;">kcal</span>') : '—';
    }
    if(f && g){ f.addEventListener('input', upd); g.addEventListener('input', upd); upd(); }
    $$('[data-hgram]', box).forEach(function(el){
      el.addEventListener('click', function(){ if(g){ g.value = el.getAttribute('data-hgram'); upd(); } });
    });
    var addBtn = $('hAddFood');
    if(addBtn) addBtn.addEventListener('click', function(){
      var name = (f && f.value || '').trim();
      var gram = parseFloat(g && g.value) || 0;
      if(!name){ toast('先写吃了什么'); return; }
      var item = hFindFood(name);
      if(!item){ toast('食物库里没有「' + name + '」，用下面直接写热量吧'); return; }
      if(!gram){ toast('写个份量（克）'); return; }
      hAddMeal(item.n, gram, item.k * gram / 100);
      toast('记下了：' + item.n + ' ' + Math.round(item.k * gram / 100) + ' kcal');
      renderers.health();
    });
    var cBtn = $('hAddCustom');
    if(cBtn) cBtn.addEventListener('click', function(){
      var nm = ($('hCustomName').value || '').trim();
      var kc = parseFloat($('hCustomKcal').value);
      if(!kc || kc <= 0){ toast('写个热量'); return; }
      hAddMeal(nm || '一笔', 0, kc);
      toast('记下了 ' + Math.round(kc) + ' kcal');
      renderers.health();
    });
    $$('[data-hdelmeal]', box).forEach(function(el){
      el.addEventListener('click', function(){
        var id = el.getAttribute('data-hdelmeal');
        var hh = ensureHealth();
        hh.meals[day] = (hh.meals[day] || []).filter(function(m){ return m.id !== id; });
        hSave(); renderers.health();
      });
    });
    var tb = $('hTargetBtn');
    if(tb) tb.addEventListener('click', function(){
      openModal('每天的目标热量',
        '<label class="fld">一天打算吃多少 kcal</label>'
        + '<input id="hTgIn" type="number" value="' + (h.target || 1800) + '" min="600" max="5000">'
        + '<div class="hint" style="margin-top:8px;">只是给你自己看的参考，不影响记录。</div>',
        [{text:'保存', fn:function(bx){
          var v = parseInt(bx.querySelector('#hTgIn').value, 10);
          if(v >= 600){ ensureHealth().target = v; hSave(); renderers.health(); toast('目标改成 ' + v + ' kcal'); }
        }}, {text:'取消', cls:'ghost'}]);
    });
  }

  if(tab === 'period'){
    var flow = (ensureHealth().period.logs[day] || {}).flow || '';
    $$('[data-hflow]', box).forEach(function(el){
      el.addEventListener('click', function(){
        var v = el.getAttribute('data-hflow');
        flow = (flow === v) ? '' : v;
        $$('[data-hflow]', box).forEach(function(x){ x.classList.toggle('on', x.getAttribute('data-hflow') === flow); });
      });
    });
    $$('[data-hsym]', box).forEach(function(el){
      el.addEventListener('click', function(){ el.classList.toggle('on'); });
    });
    var saveLog = $('hSaveLog');
    if(saveLog) saveLog.addEventListener('click', function(){
      var hh = ensureHealth();
      var syms = $$('[data-hsym]', box).filter(function(x){ return x.classList.contains('on'); })
                   .map(function(x){ return x.getAttribute('data-hsym'); });
      hh.period.logs[day] = {flow:flow, syms:syms, note:($('hPeriodNote').value || '').trim(), ts:Date.now()};
      hSave(); toast('记下了今天的情况'); renderers.health();
    });
    var sp = $('hSavePeriod');
    if(sp) sp.addEventListener('click', function(){
      var hh = ensureHealth();
      var last = $('hLast').value;
      var cycle = parseInt($('hCycle').value, 10);
      var len = parseInt($('hLen').value, 10);
      hh.period.last = last || '';
      hh.period.cycle = (cycle >= 20 && cycle <= 45) ? cycle : 28;
      hh.period.len = (len >= 2 && len <= 10) ? len : 5;
      hSave();
      toast(last ? '已记下：' + hDayText(last) + ' 开始' : '已清掉开始日期');
      renderers.health();
    });
    var pt = $('hPeriodToday');
    if(pt) pt.addEventListener('click', function(){
      var hh = ensureHealth();
      var cy = parseInt($('hCycle').value, 10), le = parseInt($('hLen').value, 10);
      hh.period.last = hToday();
      if(cy >= 20 && cy <= 45) hh.period.cycle = cy;
      if(le >= 2 && le <= 10) hh.period.len = le;
      if(!hh.period.logs[hToday()]) hh.period.logs[hToday()] = {flow:'中', syms:[], note:'', ts:Date.now()};
      hSave();
      toast('记下了：今天是第 1 天');
      renderers.health();
    });
  }

  if(tab === 'sleep'){
    var si = $('hSleepIn'), so = $('hSleepOut'), tip = $('hSleepLen');
    function updSleep(){
      if(!si || !so || !tip) return;
      var m = hSleepMin(si.value, so.value);
      tip.textContent = m ? ('这一觉大约 ' + hDurText(m)) : '时间没填全';
    }
    if(si && so){ si.addEventListener('change', updSleep); so.addEventListener('change', updSleep); updSleep(); }
    var ss = $('hSaveSleep');
    if(ss) ss.addEventListener('click', function(){
      var m = hSleepMin(si.value, so.value);
      if(!m || m < 30){ toast('时间不太对，再看看'); return; }
      var hh = ensureHealth();
      hh.sleeps[day] = {start:si.value, end:so.value, min:m, ts:Date.now()};
      hSave(); toast('记下了：' + hDurText(m)); renderers.health();
    });
    $$('[data-hdelsleep]', box).forEach(function(el){
      el.addEventListener('click', function(){
        var k = el.getAttribute('data-hdelsleep');
        var hh = ensureHealth();
        delete hh.sleeps[k];
        hSave(); renderers.health();
      });
    });
  }

  if(tab === 'step'){
    var sw = $('hAutoSw');
    if(sw) sw.addEventListener('click', function(){ hToggleAuto(!ensureHealth().auto); });
    var demo = $('hWalkDemo');
    if(demo) demo.addEventListener('click', function(){ hAddSteps(300); toast('+300 步'); });
    var add = $('hStepAdd');
    if(add) add.addEventListener('click', function(){
      var n = parseInt($('hStepInput').value, 10);
      if(!n || n <= 0){ toast('写个数字'); return; }
      hAddSteps(n); toast('+' + n + ' 步');
    });
    $$('[data-hstep]', box).forEach(function(el){
      el.addEventListener('click', function(){
        var n = parseInt(el.getAttribute('data-hstep'), 10);
        hAddSteps(n); toast('+' + n + ' 步');
      });
    });
    var rs = $('hStepReset');
    if(rs) rs.addEventListener('click', function(){
      var hh = ensureHealth();
      hh.steps[hToday()] = 0;
      hSave(); renderers.health(); toast('今天已经清零');
    });
  }
}
$('btnHealthOver').addEventListener('click', function(){
  ensureHealth().tab = 'over'; hSave(); renderers.health();
});

/* =====================================================================
   查手机（主界面图标）：看看联系人的手机里都有什么
   内容按联系人自动生成一次后缓存起来，所以每次打开看到的是同一台「手机」
   可以看：桌面 / 图片 / 微信 / 通话 / 购物 / 外卖 / 日程
   ===================================================================== */
var checkState = {key:'', name:'', tab:'home'};
// 由名字算一个固定的种子，保证同一个联系人每次生成的内容一样
function checkSeedOf(str){
  var h = 2166136261;
  for(var i = 0; i < (str || 'x').length; i++){ h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; }
  return h;
}
function cR(seed, i){
  var x = Math.sin((seed % 100000) + i * 78.233) * 43758.5453;
  return x - Math.floor(x);
}
function cPick(seed, i, arr){ return arr[Math.min(arr.length - 1, Math.floor(cR(seed, i) * arr.length))]; }
// 生成一台「他的手机」
function buildCheckData(name, key){
  var s = checkSeedOf(key || name);
  var d = {v:1, name:name};
  // 桌面：从一批常用 App 里挑 12 个（按种子打乱，保证每个人不一样、每次一样）
  var allApps = ['微信','相册','相机','音乐','时钟','日历','天气','备忘录','地图','运动','阅读','银行','邮箱','短视频','游戏','外卖','购物','播客'];
  var shuffled = allApps.slice().sort(function(a, b){ return cR(s, a.charCodeAt(0)) - cR(s, b.charCodeAt(0)); });
  d.apps = shuffled.slice(0, 12);
  d.wall = ['linear-gradient(170deg,#cfe0ef,#a9c6de)','linear-gradient(170deg,#f0dcd2,#dcbfae)',
            'linear-gradient(170deg,#d8e6d6,#b3cdb2)','linear-gradient(170deg,#e3dcef,#c5b6dd)',
            'linear-gradient(170deg,#f2e6c9,#e0cba3)'][Math.floor(cR(s, 3) * 5)];
  // 图片
  var pd = ['窗边的下午','和同事的合照','路边的猫','今天的晚饭','出差路上的天','周末的山',
            '桌上的花','雨后的街','深夜的灯','海边的风','电梯里','一张旧照片'];
  d.photos = [];
  for(var j = 0; j < 9; j++) d.photos.push({d:cPick(s, j * 13 + 5, pd), h:Math.floor(cR(s, j * 3 + 2) * 360)});
  // 微信：和别人的会话（先拿关系网里的人名，不够再从通用名字里补）
  var names = [];
  try{
    state.personas.forEach(function(p){ parseSocial(p.social).forEach(function(o){ if(names.indexOf(o.name) < 0) names.push(o.name); }); });
  }catch(e){}
  ['组长','同事小陈','房东','快递小哥','大学室友','表姐','健身教练','外卖骑手'].forEach(function(x){ if(names.indexOf(x) < 0) names.push(x); });
  var lines = ['好的，收到','明天见','我先去忙了','哈哈哈哈','到了给我打电话','文件发你了','晚点说','行，就这样'];
  d.chats = [];
  for(var k = 0; k < 5; k++){
    d.chats.push({n:cPick(s, k * 11 + 4, names), last:cPick(s, k * 17 + 9, lines),
                  t:(8 + Math.floor(cR(s, k * 5 + 1) * 13)) + ':' + pad(Math.floor(cR(s, k * 7 + 3) * 60)),
                  un: cR(s, k * 19 + 6) > 0.6});
  }
  // 通话
  d.calls = [];
  for(var m = 0; m < 4; m++){
    d.calls.push({n:cPick(s, m * 23 + 2, names), type:(cR(s, m * 3 + 1) > 0.5 ? '拨出' : '接入'),
                  dur:(1 + Math.floor(cR(s, m * 9 + 4) * 24)) + '分' + (1 + Math.floor(cR(s, m * 11 + 5) * 58)) + '秒',
                  day:(1 + Math.floor(cR(s, m * 5 + 7) * 27)) + '日'});
  }
  // 购物 / 外卖
  d.buys = [];
  for(var q = 0; q < 4; q++){
    d.buys.push({n:cPick(s, q * 29 + 3, AUTO_GOODS), shop:cPick(s, q * 31 + 8, AUTO_SHOPS),
                 price:(19 + Math.floor(cR(s, q * 7 + 2) * 280)),
                 st:cPick(s, q * 13 + 1, ['已签收','运输中','待发货','已下单'])});
  }
  d.takes = [];
  for(var r = 0; r < 4; r++){
    d.takes.push({n:cPick(s, r * 37 + 5, TAKE_FOODS), shop:cPick(s, r * 41 + 9, TAKE_SHOPS),
                  price:(12 + Math.floor(cR(s, r * 7 + 4) * 46)),
                  st:cPick(s, r * 17 + 3, ['已送达','骑手取餐','制作中','已完成']),
                  day:(1 + Math.floor(cR(s, r * 5 + 6) * 27)) + '日'});
  }
  // 日程
  var pl = ['部门周会','和老同学吃饭','体检预约','取快递','健身','看牙医','项目评审','回家吃饭','剪头发','看展'];
  d.plans = [];
  for(var t = 0; t < 5; t++){
    d.plans.push({tm:pad(8 + Math.floor(cR(s, t * 5 + 2) * 10)) + ':' + pick(['00','15','30','45']),
                  ti:cPick(s, t * 43 + 7, pl),
                  pc:cPick(s, t * 47 + 11, ['公司 3 楼会议室','地铁 2 号线','社区医院','小区门口','常去的那家'])});
  }
  return d;
}
// 取某个联系人的「手机」，第一次生成后存起来
function checkData(key, name){
  if(!state.check) state.check = {};
  var d = state.check[key];
  // 没生成过、或者格式太老（缺内容），就重新生成一份并缓存起来
  if(!d || !d.photos || !d.apps){ d = state.check[key] = buildCheckData(name, key); save('check'); }
  return d;
}
renderers.check = function(){ renderCheck(); };
function renderCheck(){
  ensureWx(); ensurePersonas(); ensureIdentities();
  syncNet();
  var root = $('checkRoot');
  if(!root) return;
  if(!checkState.key){
    renderCheckPick(root);
  } else {
    renderCheckPhone(root);
  }
  fillIcons();
}
// ① 选一个联系人
function renderCheckPick(root){
  var all = wxAllFriends();
  var html = '<div class="hint" style="margin-bottom:10px;line-height:1.8;">'
    + '挑一个人，看看他手机里都有些什么。<br>桌面、图片、微信、通话、购物、外卖、日程都能翻；'
    + '在「微信」里点开一条能看他跟别人聊了什么，在「关系」里还能把 TA 关系网里的人加成自己的好友。</div>';
  if(!all.length){
    html += '<div class="empty">还没有联系人。去微信 → 联系人里加个好友，或者在人设卡的「关系网」里写几个人。</div>';
  } else {
    html += '<div class="list">';
    all.forEach(function(f){
      html += '<div class="item" data-cpick="' + esc((f.kind === 'net' ? 'n:' : 'p:') + (f.kind === 'net' ? f.nid : f.pid)) + '" data-cname="' + esc(f.name) + '" style="cursor:pointer;">'
        + '<div class="row between"><div><div class="t">' + esc(f.name) + '</div><div class="m">' + esc(f.sub || '') + '</div></div>'
        + '<span class="hint">看手机 ›</span></div></div>';
    });
    html += '</div>';
  }
  root.innerHTML = html;
  $$('[data-cpick]', root).forEach(function(el){
    el.addEventListener('click', function(){
      checkState.key = el.getAttribute('data-cpick');
      checkState.name = el.getAttribute('data-cname');
      checkState.tab = 'home';
      renderCheck();
    });
  });
}
// ② 他的手机：做成一台仿真手机，点桌面上的图标直接在屏幕里进那个应用
var CHECK_APPS = [['home','桌面','mobile'],['photo','图片','image'],['wx','微信','wechat'],['npc','互动','heart'],
                  ['net','关系','people'],['call','通话','phone'],['buy','购物','cart'],
                  ['take','外卖','coffee'],['plan','日程','calendar']];
function renderCheckPhone(root){
  ensurePersonas(); ensureWx();
  syncNpc();                                   // 关系网里的 npc 先补上，「互动」里要用
  var d = checkData(checkState.key, checkState.name);
  var t = checkState.tab || 'home';
  var app = CHECK_APPS.filter(function(a){ return a[0] === t; })[0] || CHECK_APPS[0];
  var now = new Date();
  var html = '<div class="cp-dev">'
    + '<span class="cp-side"></span><span class="cp-side v2"></span><span class="cp-side pw"></span>'
    + '<div class="cp-notch"></div>'
    + '<div class="cp-screen" style="' + checkWallStyle(d) + '">'
    +   '<div class="cp-status"><b>' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + '</b>'
    +     '<span>' + (new Date().getMonth() + 1) + '月' + new Date().getDate() + '日 ' + weekName() + '</span>'
    +     '<span>' + esc(d.name) + '的手机</span></div>'
    +   '<div class="cp-nav">'
    +     (t === 'home' ? '<span class="cp-title">桌面</span>'
                        : '<span class="cp-back" id="ckHome">‹ 桌面</span><span class="cp-title">' + app[1] + '</span>')
    +   '</div>'
    +   '<div class="cp-content">' + checkScreenHTML(d, t) + '</div>'
    +   '<div class="cp-homebar"></div>'
    + '</div></div>';
  html += '<div class="btn-row" style="margin-bottom:10px;">'
    + '<button class="btn small ghost" id="ckBack2">换一个人</button>'
    + '<button class="btn small ghost" id="ckWall">换他的桌面</button>'
    + '<button class="btn small ghost" id="ckReload">重新生成</button></div>';
  root.innerHTML = html;
  $$('[data-ctab]', root).forEach(function(el){
    el.addEventListener('click', function(){ checkState.tab = el.getAttribute('data-ctab'); renderCheck(); });
  });
  if($('ckHome')) $('ckHome').onclick = function(){ checkState.tab = 'home'; renderCheck(); };
  // 点开他和某个人的聊天
  $$('[data-ckchat]', root).forEach(function(el){
    el.addEventListener('click', function(){ openCheckChat(el.getAttribute('data-ckchat'), ''); });
  });
  // 点开偷看到的聊天
  $$('[data-ckleak]', root).forEach(function(el){
    el.addEventListener('click', function(){ openCheckChat('', el.getAttribute('data-ckleak')); });
  });
  // 关系网里加好友
  $$('[data-ckadd]', root).forEach(function(el){
    el.addEventListener('click', function(){
      addCheckFriend(el.getAttribute('data-ckadd'), el.getAttribute('data-ckrel') || '',
                     el.getAttribute('data-ckfrom') || '', el.getAttribute('data-ckfromname') || '');
    });
  });
  // 已经是好友了，直接去微信聊
  $$('[data-ckgo]', root).forEach(function(el){
    el.addEventListener('click', function(){ openNetChat(el.getAttribute('data-ckgo')); });
  });
  // 点开某个 npc 的互动记录
  $$('[data-cknpc]', root).forEach(function(el){
    el.addEventListener('click', function(){ openNpcInteract(el.getAttribute('data-cknpc'), d); });
  });
  $('ckBack2').onclick = function(){ checkState.key = ''; checkState.tab = 'home'; renderCheck(); };
  $('ckWall').onclick  = function(){ openCheckWallEditor(); };
  $('ckReload').onclick = function(){
    if(state.check) delete state.check[checkState.key];
    checkData(checkState.key, checkState.name);
    renderCheck(); toast('重新生成了一台');
  };
}
/* ---- 他那台手机的桌面壁纸：可以用他相册里的图，也可以让模型画一张 ---- */
function checkWallStyle(d){
  var u = (d && d.wallImg) ? (imgCache[d.wallImg] || '') : '';
  if(u) return 'background-image:url(\'' + esc(u) + '\');background-size:cover;background-position:center;';
  return 'background:' + ((d && d.wall) || 'linear-gradient(170deg,#cfe0ef,#a9c6de)') + ';';
}
function checkPersonaId(){
  var k = checkState.key || '';
  return k.indexOf('p:') === 0 ? k.slice(2) : '';
}
function setCheckWall(iid){
  var d = checkData(checkState.key, checkState.name);
  if(iid) d.wallImg = iid; else delete d.wallImg;
  save('check');
  renderCheck();
}
function openCheckWallEditor(){
  var pid = checkPersonaId();
  var d = checkData(checkState.key, checkState.name);
  var mine = (pid && state.hisPics && state.hisPics[pid]) ? state.hisPics[pid] : [];
  var html = '<div class="hint" style="margin-bottom:8px;line-height:1.8;">给'
    + esc(d.name || '他') + '换一张手机桌面。可以挑他相册里已经存下的图，也可以让图片模型现画一张。</div>';
  html += '<label class="fld">让模型画一张（描述一下想要什么样）</label>'
    + '<input type="text" id="ckWallPrompt" placeholder="例如：傍晚的城市天际线，暖色调">'
    + '<div class="row" style="gap:8px;margin-top:8px;">'
    + '<button class="btn small" id="ckWallGen">生成一张</button></div>'
    + '<div class="hint" style="margin-top:4px;">用的是「接口 → 图片生成模型」里填的地址和钥匙。</div>';
  openModal('换他的桌面', html, [
    {text:'从他的相册选', cls:'ghost', keep:true, fn:function(){ openCheckWallAlbum(mine); }},
    {text:'恢复默认', cls:'ghost', fn:function(){ setCheckWall(''); toast('已恢复默认桌面'); }},
    {text:'关闭', cls:'ghost'}
  ]);
  var gp = $('ckWallGen');
  if(gp) gp.onclick = function(){
    var pt = ($('ckWallPrompt') && $('ckWallPrompt').value || '').trim();
    genCheckWall(pt);
  };
}
function openCheckWallAlbum(ids){
  ids = (ids || []).filter(function(i){ return !!imgCache[i]; });
  if(!ids.length){
    openModal('他的相册还是空的',
      '<div class="hint">先在和他的聊天里点住一张图 → 选「存进他的相册」，或者用上面的「生成一张」，'
      + '存下来之后就能拿来当桌面。</div>', [{text:'知道了', cls:'ghost'}]);
    return;
  }
  openModal('从他的相册选一张',
    '<div class="cp-pics" style="grid-template-columns:repeat(3,1fr);max-height:320px;overflow-y:auto;">'
    + ids.map(function(i, n){
        return '<label class="cp-pic" style="cursor:pointer;display:block;">'
          + '<input type="radio" name="ckw" value="' + esc(i) + '"' + (n === 0 ? ' checked' : '') + ' style="position:absolute;opacity:0;">'
          + '<img src="' + esc(imgCache[i] || '') + '" alt=""></label>';
      }).join('') + '</div>',
    [{text:'就用这张', keep:true, fn:function(b){
        var r = b.querySelector('input[name=ckw]:checked');
        if(!r){ toast('先选一张'); return; }
        setCheckWall(r.value); closeModal(); toast('桌面换好了');
      }}, {text:'取消', cls:'ghost'}]);
}
// 调图片生成模型画一张，存进他的相册并设成桌面
function genCheckWall(prompt){
  try{ ensureApis(); }catch(e){}
  var cfg = null;
  try{ cfg = boardActive('image'); }catch(e){}
  if(!cfg || !cfg.url){
    toast('先到「接口 → 图片生成模型」里填好地址和钥匙');
    return;
  }
  var d = checkData(checkState.key, checkState.name);
  var p = state.personas.filter(function(x){ return x.id === checkPersonaId(); })[0];
  if(!prompt){
    prompt = '一张适合做手机壁纸的图，安静、干净、柔和的光线'
      + (p && p.name ? '，风格接近「' + p.name + '」这个人会喜欢的样子' : '');
  }
  var base = baseURL(cfg.url);
  if(!base){ toast('接口地址看不懂，检查一下'); return; }
  toast('正在画，稍等一下…');
  var ctrl = new AbortController();
  var timer = setTimeout(function(){ ctrl.abort(); }, 60000);
  fetch(base + '/images/generations', {
    method:'POST', headers: authHeaders(cfg),
    body: JSON.stringify({model: cfg.model || '', prompt: prompt, n:1, size:'1024x1024'}),
    signal: ctrl.signal
  }).then(function(r){
    if(!r.ok) return r.text().then(function(t){ throw new Error('HTTP ' + r.status + ' ' + (t||'').slice(0,140)); });
    return r.json();
  }).then(function(j){
    clearTimeout(timer);
    var one = j && j.data && j.data[0];
    if(!one) throw new Error('返回里没有图片数据（data[0] 为空）');
    var iid = '__hisw_' + uid();
    function done(){
      var pid = checkPersonaId();
      if(pid) hisAddPic(pid, iid);
      setCheckWall(iid);
      toast('画好了，已经设成他的桌面');
    }
    if(one.b64_json || one.b64){
      var blob = base64ToBlob(one.b64_json || one.b64, 'image/png');
      try{ imgCache[iid] = URL.createObjectURL(blob); }catch(e){}
      idbPut('images', {id:iid, name:'他的桌面', blob:blob, ts:Date.now()}).then(done).catch(done);
    } else if(one.url){
      imgCache[iid] = one.url;
      idbPut('images', {id:iid, name:'他的桌面', url:one.url, ts:Date.now()}).then(done).catch(done);
    } else { throw new Error('返回里既没有图片地址也没有 base64'); }
  }).catch(function(e){
    clearTimeout(timer);
    toast('生成失败：' + ((e && e.message) || '未知错误'));
  });
}
// 屏幕里此刻显示什么
function checkScreenHTML(d, t){
  if(t === 'home'){
    var now = new Date();
    var h = '<div class="cptime">' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + '</div>'
      + '<div class="cpdate">' + (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + weekName() + '</div>'
      + '<div class="cpwho">' + esc(d.name) + ' 的手机 · 点图标进去翻</div><div class="cpapps">';
    CHECK_APPS.forEach(function(a){
      if(a[0] === 'home') return;
      h += '<div class="cpapp" data-ctab="' + a[0] + '"><i>' + lnIcon(a[2], 17) + '</i><span>' + a[1] + '</span></div>';
    });
    h += '</div>';
    return h;
  }
  return checkPanelHTML(d);
}
// 每个入口里显示什么
function checkPanelHTML(d){
  var t = checkState.tab, h = '';
  if(t === 'home'){
    h = '<div class="card glass"><h3>他桌面上装了这些</h3><div class="cpapps" style="margin-top:8px;">';
    d.apps.forEach(function(n){
      h += '<div class="cpapp"><i>' + lnIcon(checkAppIcon(n), 15) + '</i><span>' + esc(n) + '</span></div>';
    });
    h += '</div><div class="hint" style="margin-top:8px;">底下还留着一张便签：' + esc(d.photos[0] ? d.photos[0].d : '') + '。</div></div>';
  } else if(t === 'photo'){
    var pid3 = checkPersonaId();
    var real = (pid3 && state.hisPics && state.hisPics[pid3]) ? state.hisPics[pid3].filter(function(i){ return !!imgCache[i]; }) : [];
    h = '';
    if(real.length){
      h += '<div class="card glass"><h3>他存下来的（' + real.length + '）</h3>'
        + '<div class="hint" style="margin-bottom:8px;">聊天里存进来的图，还有用模型生成的桌面图。</div>'
        + '<div class="cp-pics" style="margin-top:8px;">';
      real.forEach(function(i){
        h += '<div class="cp-pic"><img src="' + esc(imgCache[i] || '') + '" alt=""></div>';
      });
      h += '</div></div>';
    }
    h += '<div class="card glass"><h3>他的相册</h3><div class="cp-pics" style="margin-top:8px;">';
    d.photos.forEach(function(p){
      h += '<div class="cp-pic" style="background:linear-gradient(150deg,hsl(' + p.h + ',42%,76%),hsl(' + ((p.h + 40) % 360) + ',38%,62%));"><span>' + esc(p.d) + '</span></div>';
    });
    h += '</div></div>';
  } else if(t === 'wx'){
    h = '';
    // 你偷看到的聊天（和他聊天时偶尔刷到的）
    var leaks = d.leaks || [];
    if(leaks.length){
      h += '<div class="card glass"><h3>你翻到的聊天（' + leaks.length + '）</h3>'
        + '<div class="hint" style="margin-bottom:6px;">跟他聊着聊着，屏幕上闪过这些。点开看看。</div>';
      leaks.forEach(function(L){
        h += '<div class="wx-row cp-leak" data-ckleak="' + L.id + '" style="cursor:pointer;">'
          + '<div class="avatar" style="width:34px;height:34px;font-size:13px;">' + esc((L.withName || '?').slice(0, 1)) + '</div>'
          + '<div style="flex:1;min-width:0;"><div class="t">他和 ' + esc(L.withName) + '</div>'
          + '<div class="m">' + fmtFull(L.ts) + ' · ' + ((L.msgs || []).length) + ' 条</div></div>'
          + '<span class="hint">看 ›</span></div>';
      });
      h += '</div>';
    }
    h += '<div class="card glass"><h3>他的微信</h3>';
    d.chats.forEach(function(c){
      h += '<div class="wx-row" data-ckchat="' + esc(c.n) + '" style="cursor:pointer;">'
        + '<div class="avatar" style="width:34px;height:34px;font-size:13px;">' + esc(c.n.slice(0, 1)) + '</div>'
        + '<div style="flex:1;min-width:0;"><div class="t">' + esc(c.n) + (c.un ? ' <span class="badge">有新消息</span>' : '') + '</div>'
        + '<div class="m">' + esc(c.last) + '</div></div><span class="m">' + esc(c.t) + '</span></div>';
    });
    h += '<div class="hint" style="margin-top:8px;">（这是他那边的聊天列表，跟你和他说的话不是一回事。点开能看他跟人家聊了什么。）</div></div>';
  } else if(t === 'npc'){
    var pid2 = (checkState.key || '').indexOf('p:') === 0 ? (checkState.key || '').slice(2) : '';
    var me2 = pid2 ? state.personas.filter(function(x){ return x.id === pid2; })[0] : null;
    h = '<div class="card glass"><h3>TA 和 npc 的互动</h3>';
    if(!me2){
      h += '<div class="hint">这个人不是人设卡里的联系人，只看得到下面的关系网。</div></div>';
    } else {
      var ns2 = npcsOf(me2.id);
      if(!ns2.length){
        h += '<div class="hint">「' + esc(me2.name) + '」的关系网还是空的。在 TA 的人设卡「关系网」里写上几个人，'
          + '会自动生成 npc 卡（人设卡 → npc 分页），他们发的动态、互相的点赞评论都会出现在这里。</div></div>';
      } else {
        h += '<div class="hint" style="margin-bottom:8px;">这些人是从「' + esc(me2.name) + '」的关系网自动生成的 npc。'
          + '点开能看到他们在好友圈里的互动和聊天片段。</div>';
        ns2.forEach(function(p){
          var ps = state.wx.posts.filter(function(x){ return x.pid === p.id; });
          var lastTxt = ps.length ? String(ps[0].text || '') : '';
          h += '<div class="wx-row" data-cknpc="' + esc(p.id) + '" style="cursor:pointer;">'
            + wxAvaHTML('him', p, 34)
            + '<div style="flex:1;min-width:0;"><div class="t">' + esc(p.name || '?')
            + (p.relation ? ' <span class="badge">' + esc(p.relation) + '</span>' : '') + '</div>'
            + '<div class="m">' + (lastTxt ? ('好友圈：' + esc(lastTxt.slice(0, 16)) + (lastTxt.length > 16 ? '…' : '')) : '还没发过动态')
            + ' · ' + ps.length + ' 条</div></div><span class="hint">看 ›</span></div>';
        });
        h += '</div>';
      }
    }
  } else if(t === 'net'){
    var nets = checkNets(d);
    h = '<div class="card glass"><h3>他的关系网（' + nets.length + '）</h3>'
      + '<div class="hint" style="margin-bottom:6px;">从 TA 手机里翻到的人。想认识谁，加为自己的好友就能在微信里跟他聊；不加也行，只是看看。</div>';
    if(!nets.length) h += '<div class="empty">他这里没留什么关系网</div>';
    nets.forEach(function(o){
      var nf = netFriendOf(o.name);
      h += '<div class="wx-row">'
        + '<div class="avatar" style="width:36px;height:36px;font-size:14px;">' + esc((o.name || '?').slice(0, 1)) + '</div>'
        + '<div style="flex:1;min-width:0;"><div class="t">' + esc(o.name)
        + (o.rel ? ' <span class="badge">' + esc(o.rel) + '</span>' : '') + '</div>'
        + '<div class="m">' + esc(o.fromName ? '「' + o.fromName + '」的关系网' : '他常联系的人') + '</div></div>'
        + (nf ? '<button class="btn small" data-ckgo="' + esc(o.name) + '">去聊天</button>'
              : '<button class="btn small" data-ckadd="' + esc(o.name) + '" data-ckrel="' + esc(o.rel || '') + '"'
                + ' data-ckfrom="' + esc(o.from || '') + '" data-ckfromname="' + esc(o.fromName || '') + '">加为好友</button>')
        + '</div>';
    });
    h += '</div>';
  } else if(t === 'call'){
    h = '<div class="card glass"><h3>通话记录</h3>';
    d.calls.forEach(function(c){
      h += '<div class="wx-row"><div style="flex:1;"><div class="t">' + esc(c.n) + '</div>'
        + '<div class="m">' + esc(c.type) + ' · ' + esc(c.dur) + '</div></div><span class="m">' + esc(c.day) + '</span></div>';
    });
    h += '</div>';
  } else if(t === 'buy'){
    h = '<div class="card glass"><h3>买过的东西</h3>';
    d.buys.forEach(function(b){
      h += '<div class="wx-row"><div style="flex:1;"><div class="t">' + esc(b.n) + '</div>'
        + '<div class="m">' + esc(b.shop) + ' · ' + esc(b.st) + '</div></div><b>¥' + b.price + '</b></div>';
    });
    h += '</div>';
  } else if(t === 'take'){
    h = '<div class="card glass"><h3>点过的外卖</h3>';
    d.takes.forEach(function(b){
      h += '<div class="wx-row"><div style="flex:1;"><div class="t">' + esc(b.n) + '</div>'
        + '<div class="m">' + esc(b.shop) + ' · ' + esc(b.st) + '</div></div>'
        + '<div style="text-align:right;"><b>¥' + b.price + '</b><div class="m">' + esc(b.day) + '</div></div></div>';
    });
    h += '</div>';
  } else if(t === 'plan'){
    h = '<div class="card glass"><h3>日程</h3>';
    d.plans.forEach(function(p){
      h += '<div class="wx-row"><div style="min-width:44px;"><b>' + esc(p.tm) + '</b></div>'
        + '<div style="flex:1;"><div class="t">' + esc(p.ti) + '</div><div class="m">' + esc(p.pc) + '</div></div></div>';
    });
    h += '</div>';
  }
  return h;
}
/* ---------- 他的关系网：加好友 / 看聊天 ---------- */
// 这个人的关系网（人设卡里的「关系网」那段文字；没有就用他微信里常联系的人顶上）
function checkNets(d){
  var key = checkState.key || '';
  var pid = key.indexOf('p:') === 0 ? key.slice(2) : '';
  var p = pid ? state.personas.filter(function(x){ return x.id === pid; })[0] : null;
  var out = [], seen = {};
  if(p){
    parseSocial(p.social).forEach(function(o){
      if(!o.name || o.name === d.name || seen[o.name]) return;
      seen[o.name] = 1;
      out.push({name:o.name, rel:o.rel || '', from:p.id, fromName:p.name || '他'});
    });
  }
  if(!out.length){
    (d.chats || []).forEach(function(c){
      if(!c.n || seen[c.n] || c.n === d.name) return;
      seen[c.n] = 1;
      out.push({name:c.n, rel:'常联系', from:pid, fromName:d.name});
    });
  }
  return out;
}
// 关系网里这个人是不是已经是我的好友了
function netFriendOf(name){
  var n = wxNet().filter(function(x){ return x.name === name; })[0];
  return (n && n.pid) ? n : null;
}
// 生成一段「他和他」的聊天（按种子，每次看都是同一段）
function buildCheckThread(key, owner, other, salt){
  var s = checkSeedOf([key, owner, other, salt || ''].join('|'));
  var A = ['嗯，在。','刚忙完，有点累。','还行，就那样。','你呢，今天怎么样。','哈哈，真的假的。',
           '晚点再说吧，手上还有点事。','我知道了。','别担心，没事。','有点想出去走走。','在吃饭，一会儿回你。'];
  var B = ['在的。','刚到家，瘫着。','我也是，今天特别长。','明天还得早起。','你上次说的那家店我去吃了。',
           '有空一起呀。','好，听你的。','我先睡了啊。','记得吃饭。','嗯嗯，那就这样。'];
  var out = [], hh = 9 + Math.floor(cR(s, 1) * 4), mm = Math.floor(cR(s, 2) * 50);
  for(var i = 0; i < 8; i++){
    mm += 2 + Math.floor(cR(s, i * 5 + 3) * 22);
    if(mm >= 60){ hh += 1; mm -= 60; }
    var ownerSay = (i % 2 === 0);   // 偶数条是手机主人说的
    var pool = ownerSay ? A : B;
    // 尽量别连着说同一句
    var txt = '', tries = 0;
    do{
      txt = pool[Math.min(pool.length - 1, Math.floor(cR(s, i * 7 + 11 + tries * 3) * pool.length))];
      tries++;
    }while(tries < 6 && out.slice(-2).some(function(x){ return x.text === txt; }));
    out.push({who: ownerSay ? 'owner' : 'other', text:txt, t:pad(hh) + ':' + pad(mm)});
  }
  return out;
}
// 打开「他和某人」的聊天（leakId 有值就看偷看到的那一段）
function openCheckChat(name, leakId){
  var d = checkData(checkState.key, checkState.name);
  var msgs, title, rel = '', from = '', fromName = '';
  if(leakId){
    var L = (d.leaks || []).filter(function(x){ return x.id === leakId; })[0];
    if(!L) return;
    msgs = L.msgs || [];
    name = L.withName;
    title = '他和 ' + name;
  } else {
    msgs = buildCheckThread(checkState.key, d.name, name, 'n');
    title = '他和 ' + name;
  }
  var nets = checkNets(d);
  var hit = nets.filter(function(o){ return o.name === name; })[0];
  if(hit){ rel = hit.rel || ''; from = hit.from || ''; fromName = hit.fromName || ''; }
  var nf = netFriendOf(name);
  var body = '<div class="hint" style="margin-bottom:8px;">' + esc(d.name) + ' 与 ' + esc(name) + ' 的聊天记录</div><div class="cp-chat">';
  msgs.forEach(function(m){
    var mine = (m.who === 'owner');
    body += '<div class="l' + (mine ? ' me' : '') + '">'
          + (mine ? '<span class="tt">' + esc(m.t || '') + '</span>' : '')
          + '<div class="b">' + esc(m.text) + '</div>'
          + (!mine ? '<span class="tt">' + esc(m.t || '') + '</span>' : '')
          + '</div>';
  });
  body += '</div>';
  var btns = [];
  if(nf){
    btns.push({text:'去微信聊', fn:function(){ openNetChat(name); }});
  } else if(hit){
    btns.push({text:'加 TA 为好友', fn:function(){ addCheckFriend(name, rel, from, fromName); }});
  }
  btns.push({text:'关闭', cls:'ghost'});
  openModal(title, body, btns);
}
// 点开某个 npc：看 TA 和所属 char 在好友圈里的互动 + 一段聊天
function openNpcInteract(npcId, d){
  ensurePersonas(); ensureWx();
  var p = state.personas.filter(function(x){ return x.id === npcId; })[0];
  if(!p) return;
  var own = p.npcOf ? state.personas.filter(function(x){ return x.id === p.npcOf; })[0] : null;
  var who = (own && own.name) || (d && d.name) || '他';
  var body = '<div class="hint" style="margin-bottom:8px;">' + esc(who) + ' 与 ' + esc(p.name || '?')
    + (p.relation ? '（' + esc(p.relation) + '）' : '') + ' 的互动</div>';
  var posts = state.wx.posts.filter(function(x){ return x.pid === p.id; });
  if(posts.length){
    body += '<div class="card glass" style="margin-bottom:8px;"><h3>好友圈（' + posts.length + '）</h3>';
    posts.slice(0, 5).forEach(function(pt){
      body += '<div style="margin:7px 0;"><div style="font-size:13px;line-height:1.6;">' + esc(pt.text || '') + '</div>'
        + '<div class="m">' + fmtFull(pt.ts) + ((pt.likes || 0) ? ' · ' + pt.likes + ' 个赞' : '') + '</div>';
      (pt.comments || []).forEach(function(c){
        body += '<div class="m" style="color:var(--c-primary);">↳ ' + esc(c.who || '') + '：' + esc(c.text || '') + '</div>';
      });
      body += '</div>';
    });
    body += '</div>';
  } else {
    body += '<div class="hint" style="margin-bottom:8px;">TA 还没发过好友圈。</div>';
  }
  body += '<div class="card glass"><h3>聊天片段</h3><div class="cp-chat">';
  buildCheckThread((checkState.key || '') + '|' + p.id, who, p.name || '?', 'npc').forEach(function(m){
    var mine = (m.who === 'owner');
    body += '<div class="l' + (mine ? ' me' : '') + '">'
      + (mine ? '<span class="tt">' + esc(m.t || '') + '</span>' : '')
      + '<div class="b">' + esc(m.text) + '</div>'
      + (!mine ? '<span class="tt">' + esc(m.t || '') + '</span>' : '') + '</div>';
  });
  body += '</div><div class="hint" style="margin-top:6px;">（这是从 TA 手机里翻出来的片段。）</div></div>';
  var btns = [{text:'关闭', cls:'ghost'}];
  var n = wxNet().filter(function(x){ return x.id === p.netId; })[0];
  if(n && n.status !== 'accepted'){
    btns.unshift({text:'加 TA 为好友', fn:function(){ addCheckFriend(p.name, p.relation || '', p.npcOf || '', who); }});
  }
  openModal((p.name || '?') + ' 的互动', body, btns);
}
// 关系网里的人 → 变成可以聊天的联系人
// 做法：给 TA 建一张「轻量人设卡」（不显示在人设卡列表里），这样微信的聊天、通话、好友圈都能直接用
function netPersonaFor(n){
  var exist = state.personas.filter(function(p){ return p.netId === n.id; })[0];
  // 关系网被改过、条目重建过的话，按名字认回原来那张卡，别重复建。
  // 同名但归属不同的 char 不能认错（两张卡都写了「小雨」要各算一个 npc）
  if(!exist && n.name) exist = state.personas.filter(function(p){
    return p.netId && p.name === n.name && (!p.npcOf || !n.from || p.npcOf === n.from);
  })[0];
  if(exist){ exist.netId = n.id; return exist; }
  var src = state.personas.filter(function(p){ return p.id === n.from; })[0] || {};
  var p = {};
  for(var k in DEFAULT_PERSONA) p[k] = DEFAULT_PERSONA[k];
  var sd = checkSeedOf(n.name || 'x');
  p.id = uid();
  p.netId = n.id;
  p.name = n.name;
  p.gender = n.gender || (cR(sd, 3) > 0.5 ? '男' : '女');
  p.age = n.age || String(22 + Math.floor(cR(sd, 7) * 14));
  p.relation = n.rel || '';
  p.tone = '说话自然、有自己的脾气，不太热络也不冷淡。';
  p.background = '和「' + (src.name || '他') + '」是' + (n.rel || '熟人') + '，通过这层关系认识了你。';
  p.likes = '随口聊聊天，不喜欢被追问太多。';
  p.social = '';
  p.netOf = src.name || '';
  p.ts = Date.now();
  state.personas.push(p);
  save('personas');
  return p;
}
// 把关系网里的人登记进当前身份的联系人（manual=手动加的，同步时不会被清掉）
function ensureNetEntry(name, rel, fromId){
  ensureWx(); ensureIdentities(); ensurePersonas();
  var id = (curIdentity() || {}).id || '_';
  if(!state.wx.net) state.wx.net = {};
  if(!state.wx.net[id]) state.wx.net[id] = [];
  var list = state.wx.net[id];
  var hit = list.filter(function(x){ return x.name === name; })[0];
  if(hit){ if(rel && !hit.rel) hit.rel = rel; return hit; }
  var n = {id:uid(), key:(fromId || 'check') + '|' + name, name:name, rel:rel || '',
           from:fromId || '', manual:true, status:'none', by:'', ts:Date.now(), pid:''};
  list.push(n);
  wxSave();
  return n;
}
// 关系网里的人正式变成好友：给他建一张能聊天的轻量卡，再把人加进好友列表
function netAddFriend(n, fromName, instant){
  if(!n) return;
  ensureWx(); ensureIdentities(); ensurePersonas();
  var id = (curIdentity() || {}).id || '_';
  var p = netPersonaFor(n);
  n.pid = p.id;
  n.ts = Date.now();
  n.status = instant ? 'accepted' : 'pending';
  n.by = 'me';
  var fr = state.wx.friends[id] = state.wx.friends[id] || [];
  if(!fr.some(function(f){ return f.pid === p.id; })) fr.push({pid:p.id, status:n.status, by:'me', ts:Date.now()});
  wxSave();
  function done(){
    var nn = wxNet().filter(function(x){ return x.id === n.id; })[0];
    if(nn){ nn.status = 'accepted'; nn.ts = Date.now(); }
    var f = (state.wx.friends[id] || []).filter(function(x){ return x.pid === p.id; })[0];
    if(f){ f.status = 'accepted'; f.ts = Date.now(); }
    wxSave();
    // 让他先打个招呼，记到和他的会话里
    var prev = state.curPersona;
    state.curPersona = p.id; state.persona = p;
    pushMessage('him', pick(['你好呀，听「' + (fromName || '他') + '」说起过你。',
                             '嗯，加上了。', '你好。', '是你呀，有事随时说。']), 'text', {pid:p.id});
    state.curPersona = prev; state.persona = curPersona();
    save('curPersona'); save('persona');
    addNotice('msg', n.name + ' 通过了你的好友申请');
    toast(n.name + ' 通过了你的好友申请');
    if(currentScreen === 'check') renderCheck();
    try{ wxRefresh(); }catch(e){}
  }
  if(instant) done(); else setTimeout(done, 1300 + Math.random() * 1500);
}
// 从查手机里加关系网的人为好友
function addCheckFriend(name, rel, fromId, fromName){
  ensureWx(); ensureIdentities(); ensurePersonas();
  if(!name) return;
  var n = ensureNetEntry(name, rel, fromId);
  if(n.pid && state.personas.some(function(x){ return x.id === n.pid; })){
    toast('你们已经是好友了');
    openNetChat(name);
    return;
  }
  toast('已发送好友申请');
  netAddFriend(n, fromName);
}
// 去微信里跟这个关系网的人聊
function openNetChat(name){
  var n = netFriendOf(name);
  if(!n){ toast('还没有加 TA 为好友'); return; }
  switchPersona(n.pid);
  wxPane = 'msg';
  go('call');
}

function checkAppIcon(n){
  var map = {'微信':'wechat','相册':'image','相机':'image','音乐':'music','时钟':'clock','日历':'calendar',
             '天气':'sparkle','备忘录':'note','地图':'pin','运动':'heart','阅读':'book','银行':'wallet',
             '邮箱':'chat','短视频':'video','游戏':'sparkle','外卖':'coffee','购物':'cart','播客':'mute'};
  return map[n] || 'square';
}
$('checkBack').addEventListener('click', function(){
  if(checkState.key){ checkState.key = ''; checkState.tab = 'home'; renderCheck(); }
  else { go('home'); }
});
$('btnCheckReload').addEventListener('click', function(){
  if(!checkState.key){ toast('先选一个人'); return; }
  if(state.check) delete state.check[checkState.key];
  checkData(checkState.key, checkState.name);
  renderCheck(); toast('重新生成了一台');
});

function boot(){
  // 「我」的身份：没有就先建一个默认的
  ensureIdentities();
  // 人设卡：把老的单张升级成多张，并确定当前用哪张
  ensurePersonas();
  // 老聊天记录没有记「跟谁聊的」，统一算到第一张人设卡名下（只迁一次）
  if(!state.settings.msgPidMigrated){
    var fid = (state.personas[0] || {}).id || '_';
    state.messages.forEach(function(m){ if(!m.pid) m.pid = fid; });
    save('messages');
    state.settings.msgPidMigrated = true; save('settings');
  }
  // 微信数据、背景图
  ensureWx(); ensureBgImages(); save('wx');
  // 钱包、购物、查手机、健康
  ensureWallet(); ensureShop(); ensureHealth(); ensureApis();
  ensureWorldFolders(); ensureGrowthCards();   // 世界书文件夹 + 每人一张亲密度卡片
  ensureShelf(); ensureListenTogether(); ensureCowatch();   // 书架 / 一起听 / 一起看记录，缺了补成数组
  if(!state.dateCfg || typeof state.dateCfg !== 'object') state.dateCfg = {perIdentity:false, auto:false};
  if(!state.planCfg || typeof state.planCfg !== 'object') state.planCfg = {axis:'v', fromNotes:false, auto:false};
  applyBubbleCss();   // 用户自己写的气泡 CSS
  if(!state.check) state.check = {};
  syncNet();          // 人设卡「关系网」里的人同步到联系人
  syncNpc();          // 再把这些人自动补成 npc 简易卡（人设卡的 npc 分页用）
  // 上次导入的字体重新装上
  loadFontFile();
  // 打开数据库，把图片/音乐/壁纸读回来（先 refreshAlbum 把缓存填满，再 applyWallpapers 应用）
  openIDB().then(function(){
    refreshSongs();
    refreshAlbum(function(){ applyWallpapers(); });
    // 图片读回来之后补一次渲染：上传过的头像、背景这时候才有地址可显示
    setTimeout(function(){
      try{ if(renderers[currentScreen]) renderers[currentScreen](); }catch(e){}
      try{ if(currentScreen === 'call' && wxPane === 'contact') renderWxContact(); }catch(e){}
    }, 60);
  });
  // 每天模拟一次天气（也可以自己在设置里改）
  if(state.weather.day !== fmtDate(Date.now())){
    state.weather = {text: pick(['晴','多云','阴天','有点风','下着雨']), day: fmtDate(Date.now())};
    save('weather');
  }
  // 特殊日子直接显示在锁屏那句话上（以前是记进通知中心，现在没有通知中心了）
  renderers.lock();
  fillIcons();   // 把页面上所有图标位填好
  // 底部小字、名字等同步
  $('homeFoot').textContent = state.settings.homeFoot || '';
}
// 全局错误兜底：任何一处出错都不许白屏——把错误显示出来，而不是默默黑/白屏
function showFatal(msg){
  try{
    var box = document.getElementById('fatalBox');
    if(!box){
      box = document.createElement('div'); box.id = 'fatalBox';
      box.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:99999;padding:14px 16px;'
        + 'background:rgba(176,42,42,.94);color:#fff;font-size:13px;line-height:1.6;'
        + 'box-shadow:0 2px 10px rgba(0,0,0,.3);';
      (document.body || document.documentElement).appendChild(box);
    }
    box.textContent = '页面出错了：' + (msg || '未知错误') + '（已尽量不影响其它功能，可刷新重试）';
  }catch(_){}
}
window.addEventListener('error', function(e){
  console.warn('出错了：', e.message);
  showFatal(e.message || (e.error && e.error.message) || '未知错误');
});
window.addEventListener('unhandledrejection', function(e){
  var r = e && e.reason; showFatal((r && (r.message || r)) || '未知异步错误');
});
/* ---------------- 手机壳尺寸 + 输入法（键盘）适配 ----------------
   以前 fitPhoneViewport() 直接拿 window.innerHeight 当手机壳高度。
   iOS 弹出输入法时 innerHeight 会跟着变小，手机壳就被压扁了：
   界面挤在上半截、下边露出一大块页面底色 —— 就是「输入框和键盘之间那片空白」。
   现在：
     1) 壳高只在「真的变大 / 小幅变化（地址栏伸缩）」时跟着改，键盘那种大幅变小直接忽略；
     2) 用 visualViewport 算出键盘实际高度写进 CSS 变量 --kb，
        由 #stage 让出这块高度，聊天输入栏就正好贴着键盘上沿；
     3) 打字时收起底部「微信/联系人/好友圈/设置」功能条（真微信也是这样）。
   ------------------------------------------------------------------ */
var APP_H = 0;            // 手机壳高度（键盘弹出时不跟着变小）
var KB_H  = 0;            // 当前键盘高度
var CHROME_MAX = 150;     // 地址栏伸缩最多能有多少：超过这个幅度就当成键盘

function measureShellHeight(){
  var h = window.innerHeight || 0;
  if(!h) return APP_H;
  if(!APP_H || h > APP_H){ APP_H = h; }               // 变大（地址栏收起、旋转、首次加载）
  else if(APP_H - h < CHROME_MAX && !KB_H){ APP_H = h; }   // 小幅变化 = 浏览器地址栏，跟上
  // 大幅变小且正在弹键盘：保持原高度，不把手机壳压扁
  return APP_H;
}
function fitPhoneViewport(){
  var p = document.getElementById('phone'); if(!p) return;
  if(window.innerWidth <= 500){ p.style.height = measureShellHeight() + 'px'; }
  else { p.style.height = ''; }
}
// 算出键盘占多高，写进 --kb，并给 body 挂 kb-on
var kbFocus = false;    // 聊天输入框是不是正被点着
function isTouchDevice(){
  try{ return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0); }catch(e){ return false; }
}
function updateKeyboardInset(){
  var vv = window.visualViewport;
  var base = APP_H || window.innerHeight || 0;
  var kb = 0;
  if(vv && base){
    // 键盘顶边在「手机壳坐标」里的位置 = 可视区偏移 + 可视区高度
    kb = Math.round(base - (vv.offsetTop + vv.height));
  } else if(base){
    kb = Math.round(base - (window.innerHeight || base));
  }
  if(kb < 70 || kb > base * 0.75) kb = 0;   // 太小的抖动 / 离谱的值都当成没有键盘
  // 量不出来但输入框确实被点着（真机上键盘已经弹了，只是视口没上报）：按屏幕比例估一个
  if(!kb && kbFocus && isTouchDevice() && base){
    kb = Math.round(Math.min(Math.max(base * 0.36, 250), 400));
  }
  var wasKb = KB_H > 0;
  KB_H = kb;
  document.documentElement.style.setProperty('--kb', kb + 'px');
  if(kb > 0) document.body.classList.add('kb-on');
  else document.body.classList.remove('kb-on');
  // 刚弹出键盘时把聊天滚到最新一条：不然可视区变矮后，最后几句话被推到上面看不见
  if(kb > 0 && !wasKb){
    setTimeout(function(){
      var b = document.getElementById('chatBody');
      if(b) b.scrollTop = b.scrollHeight;
    }, 30);
  }
  // iOS 有时会把整个页面往上推，让状态栏被顶掉：趁键盘刚出来拉回原位
  if(kb > 0 && vv && vv.offsetTop > 0){
    try{ window.scrollTo(0, 0); }catch(e){}
  }
}
function syncViewport(){
  fitPhoneViewport();
  updateKeyboardInset();
  sizeHomeIcons();
}
fitPhoneViewport(); updateKeyboardInset(); sizeHomeIcons();
window.addEventListener('resize', syncViewport);
window.addEventListener('orientationchange', function(){
  APP_H = 0; KB_H = 0;                       // 旋转后重新量
  setTimeout(function(){ document.documentElement.style.setProperty('--kb', '0px'); document.body.classList.remove('kb-on'); syncViewport(); }, 250);
});
if(window.visualViewport){
  window.visualViewport.addEventListener('resize', syncViewport);
  window.visualViewport.addEventListener('scroll', updateKeyboardInset);
}
// 输入框获得 / 失去焦点时再补一次（键盘动画有 300ms 左右，结束后尺寸才准）
document.addEventListener('focusin', function(e){
  var t = e.target;
  if(!t || !(t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  // 聊天输入框一被点就把底部功能条收起来：不依赖键盘高度算得准不准
  if(t.id === 'chatText'){
    kbFocus = true;
    document.body.classList.add('kb-focus');
    closePlusPanel();
  }
  setTimeout(updateKeyboardInset, 60);
  setTimeout(syncViewport, 340);
});
document.addEventListener('focusout', function(e){
  var t = e.target;
  if(t && t.id === 'chatText'){
    kbFocus = false;
    document.body.classList.remove('kb-focus');
  }
  setTimeout(syncViewport, 60);
  setTimeout(syncViewport, 340);
});
try{ boot(); }catch(e){ showFatal((e && e.message) || e); }
// 注册 Service Worker：把 App 本体缓存起来，从主屏幕图标点开时即使没网也能进主界面，不再黑屏/白屏
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('./sw.js').catch(function(e){ console.warn('SW 注册失败', e); });
  });
}

