# -*- coding: utf-8 -*-
"""把一个页面渲染成截图：强制 390x844 视口（headless Edge 有最小窗口宽度，
必须把 #phone 钉死才能真正按手机宽度排版）。用法：_uishot.py <screen> <out.png>"""
import sys

PAGE = sys.argv[1] if len(sys.argv) > 1 else 'home'
OUT = sys.argv[2] if len(sys.argv) > 2 else '_ui.png'

ACT = {
    'wxchat': "wxPane='msg'; go('call');",
    'wxme':   "wxPane='me'; go('call');",
    'wxcircle': "wxPane='circle'; go('call');",
    'chat':   "go('call'); openChat && openChat();",
}.get(PAGE, "go('%s');" % PAGE)

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
print('ready', PAGE, OUT)
