const fs = require('fs'), cp = require('child_process');
const NODE = 'C:/Users/29441/.workbuddy/binaries/node/versions/22.22.2-6/node.exe';
const ENV = Object.assign({}, process.env, { NODE_PATH: 'C:/Users/29441/.workbuddy/binaries/node/workspace/node_modules' });
const files = fs.readdirSync('.').filter(f => /^_t.*\.js$/.test(f)).sort();
let bad = 0, suites = 0, totalP = 0;
const failRe = /失败[：: ]*\s*(\d+)|(\d+)\s*失败/g;
const passRe = /(\d+)\s*通过/g;
for (const f of files) {
  let out = '';
  try { out = cp.execSync(NODE + ' ' + f, { encoding: 'utf8', stdio: ['pipe','pipe','pipe'], env: ENV }); }
  catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  suites++;
  let m, fails = 0; failRe.lastIndex = 0;
  while ((m = failRe.exec(out))) { fails = Math.max(fails, parseInt(m[1] || m[2], 10)); }
  let pm; passRe.lastIndex = 0; let pp = 0;
  while ((pm = passRe.exec(out))) { pp += parseInt(pm[1], 10); }
  totalP += pp;
  // 去掉 jsdom 不支持媒体方法（<video>.pause 等）的良性噪声，再判有没有真正的错误
  const clean = out.split('\n').filter(l => !/JSDOM_ERR.*HTMLMediaElement/.test(l)).join('\n');
  const hasErr = /✗|RUN-FAIL|异常：|TypeError|ReferenceError|Cannot read|is not a function/.test(clean);
  if (fails > 0 || hasErr) { bad++; console.log('FAIL ' + f + ' (fails=' + fails + ')'); }
}
console.log('套件数=' + suites + '  累计通过断言≈' + totalP + '  有问题套件=' + bad);
