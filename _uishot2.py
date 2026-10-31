# -*- coding: utf-8 -*-
"""临时截图脚本：_uishot2.py <动作js文件> <out.png>"""
import sys

ACT = open(sys.argv[1], encoding='utf-8').read()
OUT = sys.argv[2] if len(sys.argv) > 2 else '_ui.png'

s = open('小手机.html', encoding='utf-8').read()

inject = """
<script>
setTimeout(function(){
  try{
    document.body.classList.add('fit-screen');
    ACTJS
  }catch(e){ document.title = 'ERR ' + e.message; }
}, 700);
</script>
""".replace('ACTJS', ACT)

css = ('<style>#phone{position:fixed!important;left:0!important;top:0!important;'
       'width:390px!important;height:844px!important;border-radius:0!important;'
       'box-shadow:none!important;}body{background:#2b2b2b!important;}</style>')

i = s.rfind('</body>')
open('_ui_tmp.html', 'w', encoding='utf-8').write(s[:i] + inject + css + s[i:])
print('ready', OUT)
