/* 小手机 · Service Worker
   作用：把 App 本体（HTML / manifest / 图标）缓存起来。
   —— 从「主屏幕」图标点开时，即使此时局域网服务器不在了，也能离线进主界面，不再黑屏/白屏。
   策略：
     · 导航 / HTML：网络优先，失败回退缓存（保证在线时永远是最新版，离线也能开）
     · 其它同源静态资源：缓存优先
     · 跨域请求（大模型 API 等）和所有非 GET 请求：一律放行，不拦截、不缓存
*/
var CACHE = 'xphone-shell-v37';
var SHELL = ['./', './phone.html', './manifest.json',
             './appicon-180.png', './appicon-192.png', './appicon-512.png', './appicon-1024.png',
             './splash-828x1792.png', './splash-1125x2436.png', './splash-1170x2532.png',
             './splash-1179x2556.png', './splash-1242x2688.png', './splash-1284x2778.png'];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return c.addAll(SHELL).catch(function(){ /* 某个资源暂时取不到也继续装 */ });
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(ks){
      return Promise.all(ks.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;                 // 不拦截 POST（模型接口等）
  var url;
  try{ url = new URL(req.url); }catch(_){ return; }
  if(url.origin !== self.location.origin) return;   // 跨域（大模型 API）直接走网络
  // 关键：千万别拦截 SW 脚本本身（sw.js）。否则旧 SW 会把「自己缓存的那份旧 sw.js」
  // 喂给浏览器的更新检查，导致新 SW 永远装不上、旧缓存（旧 HTML/旧 app.js）永远生效——
  // 这正是 iOS Safari「刷新没反应 / 一直是旧版」的根因之一。让它走网络，靠 updateViaCache:'none' 取最新。
  // 通用匹配（sw.js / sw2.js / sw-vXX.js 都算），保证以后换名也不会再被旧的自己卡住。
  if(/^sw.*\.js$/.test(url.pathname.split('/').pop())) return;

  if(req.mode === 'navigate' || url.pathname.endsWith('.html')){
    // 网络优先、缓存兜底：在线取最新并写入缓存，断网才回退到缓存。
    // 注意（iOS Safari 坑）：SW 内 fetch 的 cache:'no-cache' 和「手动把 304 返回给导航」
    // 在 iOS Safari 上有严重 bug——会把导航卡在旧缓存或白屏，表现就是「刷新没反应 / 一直是旧版」。
    // 这里用最简写法：直接 fetch(req)，让浏览器自己处理 304；只在 !ok 或网络失败时回退缓存。
    e.respondWith(
      fetch(req).then(function(r){
        if(r && r.ok){
          caches.open(CACHE).then(function(c){ c.put(req, r.clone()); });
          return r;
        }
        return caches.match(req)
          .then(function(c){ return c || caches.match('./phone.html'); })
          .then(function(c){ return c || caches.match('./'); });
      }).catch(function(){
        return caches.match(req)
          .then(function(c){ return c || caches.match('./phone.html'); })
          .then(function(c){ return c || caches.match('./'); });
      })
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(function(c){
      if(c) return c;
      return fetch(req).then(function(r){
        var cp = r.clone();
        caches.open(CACHE).then(function(cc){ cc.put(req, cp); });
        return r;
      });
    })
  );
});
