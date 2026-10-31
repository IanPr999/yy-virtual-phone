#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将当前工作区（git 跟踪的文件）增量同步到 GitHub 仓库 IanPr999/yy-virtual-phone。

为什么不用 `git push`：本机所在网络的代理只允许访问 api.github.com，
不允许 git 智能 HTTP 协议（github.com:443 CONNECT 返回 502），
因此改走 GitHub REST API 的 Git Data 接口（/git/blobs, /git/trees,
/git/commits, /git/refs）。该接口没有 1MB 上传限制，1.2MB 的单文件也能传。

用法：
  GH_TOKEN=ghp_xxx  python _sync_github.py ["提交说明"]
  （不传说明则自动用时间戳；无改动则直接退出，不创建空提交）

机制：
  - 拉取远端 main 的树，得到 path -> blob sha 映射；
  - 本地逐文件计算 git blob sha1，与远端一致则复用（不上传），
    不一致才上传新 blob；
  - 生成新树 + 新提交（parent = 当前 main），再更新 main 引用。
"""
import os, sys, base64, json, subprocess, hashlib, urllib.request, urllib.error, datetime

TOKEN = os.environ.get('GH_TOKEN')
if not TOKEN:
    # 回退到系统凭据管理器（Git Credential Manager）中已保存的 github.com 凭据
    try:
        out = subprocess.run(['git', 'credential', 'fill'],
                             input='protocol=https\nhost=github.com\n',
                             capture_output=True, text=True, timeout=20)
        for line in out.stdout.splitlines():
            if line.startswith('password='):
                TOKEN = line[len('password='):]
                break
    except Exception:
        pass
if not TOKEN:
    print('ERROR: 未找到 GitHub 凭据。请设置环境变量 GH_TOKEN，或先运行：\n'
          '  printf "protocol=https\\nhost=github.com\\nusername=IanPr999\\npassword=<你的PAT>\\n" | git credential approve',
          file=sys.stderr)
    sys.exit(1)

OWNER = 'IanPr999'
REPO = 'yy-virtual-phone'
BASE = f'https://api.github.com/repos/{OWNER}/{REPO}'

proxy = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')
opener = urllib.request.build_opener(*([urllib.request.ProxyHandler({'https': proxy, 'http': proxy})] if proxy else []))

def req(path, method, data=None):
    url = BASE + path
    body = json.dumps(data).encode('utf-8') if data is not None else None
    r = urllib.request.Request(url, data=body,
                               headers={'Authorization': f'token {TOKEN}',
                                        'Accept': 'application/vnd.github+json',
                                        'Content-Type': 'application/json'},
                               method=method)
    try:
        with opener.open(r, timeout=120) as resp:
            t = resp.read().decode('utf-8', 'replace')
            return resp.status, (json.loads(t) if t else {})
    except urllib.error.HTTPError as e:
        print('ERR', e.code, method, path, e.read().decode('utf-8', 'replace')[:500], file=sys.stderr)
        sys.exit(1)

def git_blob_sha(raw):
    h = hashlib.sha1()
    h.update(('blob %d\0' % len(raw)).encode('utf-8'))
    h.update(raw)
    return h.hexdigest()

# 1) 远端 main 树
st, rtree = req('/git/trees/main?recursive=1', 'GET')
remote = {x['path']: x['sha'] for x in rtree.get('tree', []) if x['type'] == 'blob'}

# 2) 本地文件 -> 复用或上传
files = subprocess.check_output(['git', '-c', 'core.quotePath=false', 'ls-files']).decode('utf-8').splitlines()
tree_entries = []
changed = 0
for f in files:
    with open(f, 'rb') as fh:
        raw = fh.read()
    sha = git_blob_sha(raw)
    if remote.get(f) == sha:
        tree_entries.append({'path': f, 'mode': '100644', 'type': 'blob', 'sha': sha})
    else:
        _, blob = req('/git/blobs', 'POST', {'content': base64.b64encode(raw).decode('ascii'), 'encoding': 'base64'})
        tree_entries.append({'path': f, 'mode': '100644', 'type': 'blob', 'sha': blob['sha']})
        changed += 1

# 3) 生成树，无变化则跳过
_, tree = req('/git/trees', 'POST', {'tree': tree_entries})
if tree['sha'] == rtree['sha']:
    print('no changes to sync (working tree matches GitHub main)')
    sys.exit(0)

# 4) 提交 + 更新 main
_, refs = req('/git/refs/heads/main', 'GET')
parent = refs['object']['sha']
msg = sys.argv[1] if len(sys.argv) > 1 else ('sync: ' + datetime.datetime.now().strftime('%Y-%m-%d %H:%M'))
_, commit = req('/git/commits', 'POST', {
    'message': msg, 'tree': tree['sha'], 'parents': [parent],
    'author': {'name': 'IanPr999', 'email': 'no-reply@github.com'},
    'committer': {'name': 'IanPr999', 'email': 'no-reply@github.com'},
})
_, ref = req('/git/refs/heads/main', 'PATCH', {'sha': commit['sha']})
print(f'synced: {changed} changed file(s) -> {commit["sha"]}')
print(f'repo: https://github.com/{OWNER}/{REPO}')
