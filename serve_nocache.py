#!/usr/bin/env python3
# 本地静态服务器：
# 1) 给所有响应加 no-cache，避免 iOS 把「添加到主屏幕」的网页钉在旧快照上
# 2) 根路径 "/" 直接返回 App 本体（否则 Python 会吐一个目录列表，导致主屏图标打开就是文件列表）
import http.server, socketserver, os, sys

os.chdir(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
APP = 'phone.html'
APP_FILE = os.path.join(os.getcwd(), APP)


class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        path = self.path.split('?')[0].split('#')[0]
        if path in ('/', '/index.html'):
            # 根路径 → 直接把 App 吐出去（200，无重定向、无闪烁）
            try:
                data = open(APP_FILE, 'rb').read()
            except IOError:
                self.send_error(404, 'app not found')
                return
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        return super().do_GET()

    def log_message(self, *args):
        pass  # 安静一点


class ReuseTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == '__main__':
    httpd = ReuseTCPServer(("0.0.0.0", PORT), NoCacheHTTPRequestHandler)
    print('serving (no-cache) on http://0.0.0.0:%d  ->  / = %s' % (PORT, APP))
    httpd.serve_forever()
