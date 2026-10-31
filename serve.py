#!/usr/bin/env python3
# 本地静态服务器：gzip 压缩 + ETag/304 协商缓存，专为「手机同 WiFi 访问」优化。
# 说明：iOS 在 HTTP（非 HTTPS）局域网下会禁用 Service Worker，所以首屏必须靠
#       ① gzip 把 848KB 的 HTML 压到 ~170KB（传输更快）
#       ② ETag + 304：重复打开直接命中浏览器缓存，秒开
#       ③ 静态资源（图标/启动图/manifest）长缓存
import http.server, socketserver, os, sys, gzip, hashlib, io

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8090
ROOT = os.path.dirname(os.path.abspath(__file__))
APP = 'phone.html'

CT = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json',
}
GZIP_TYPES = {'.html', '.js', '.css', '.json', '.svg', '.xml', '.txt'}


def read_file(path):
    with open(path, 'rb') as f:
        return f.read()


class Handler(http.server.BaseHTTPRequestHandler):
    server_version = 'XPhoneGz/1.0'
    protocol_version = 'HTTP/1.1'

    def _send(self, code, body, ctype, extra=None):
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Connection', 'keep-alive')
        if extra:
            for k, v in extra.items():
                self.send_header(k, v)
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

    def do_GET(self):
        self.handle_req()

    def do_HEAD(self):
        self.handle_req()

    def handle_req(self):
        url = self.path.split('?', 1)[0].split('#', 1)[0]
        if url == '/' or url == '':
            url = '/' + APP
        fpath = os.path.normpath(os.path.join(ROOT, url.lstrip('/')))
        if not fpath.startswith(ROOT) or not os.path.isfile(fpath):
            self._send(404, b'not found', 'text/plain; charset=utf-8')
            return
        ext = os.path.splitext(fpath)[1].lower()
        ctype = CT.get(ext, 'application/octet-stream')
        raw = read_file(fpath)
        etag = '"' + hashlib.md5(raw).hexdigest() + '"'
        # 304 协商缓存：未改动则浏览器直接用本地缓存，秒开
        inm = self.headers.get('If-None-Match', '')
        if inm and inm == etag:
            self.send_response(304)
            self.send_header('Content-Length', '0')
            self.send_header('Connection', 'keep-alive')
            self.send_header('ETag', etag)
            self.end_headers()
            return
        accept_gzip = 'gzip' in (self.headers.get('Accept-Encoding', '') or '')
        cache = 'public, max-age=3600'  # 静态资源长缓存
        if ext == '.html':
            cache = 'no-cache'  # HTML 每次校验，改动立刻生效（靠 ETag 返回 304）
        if accept_gzip and ext in GZIP_TYPES and len(raw) > 512:
            body = gzip.compress(raw, 9)
            self.send_response(200)
            self.send_header('Content-Type', ctype)
            self.send_header('Content-Encoding', 'gzip')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('ETag', etag)
            self.send_header('Cache-Control', cache)
            self.send_header('Connection', 'keep-alive')
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(body)
        else:
            self._send(200, raw, ctype, {'ETag': etag, 'Cache-Control': cache})

    def log_message(self, *a):
        pass  # 静默


class ReuseTCPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == '__main__':
    httpd = ReuseTCPServer(("0.0.0.0", PORT), Handler)
    print('serving (gzip+etag) on http://0.0.0.0:%d  ->  / = %s' % (PORT, APP))
    httpd.serve_forever()
