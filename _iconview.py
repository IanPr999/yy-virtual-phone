# 把 LN_ICONS 里的 SVG path 光栅化成 ASCII，用来在没有图形界面的情况下检查图标形状
import re, math, sys

NUM = re.compile(r'[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?')


def tokenize(d):
    out = []           # [(cmd, [args...]), ...]
    i = 0
    cur = None
    while i < len(d):
        c = d[i]
        if c in 'MmLlHhVvCcSsQqTtAaZzFf':
            if cur:
                out.append(cur)
            cur = [c, []]
            i += 1
        elif c in ' \t\r\n,':
            i += 1
        else:
            m = NUM.match(d, i)
            if not m:
                i += 1
                continue
            if cur is None:      # 隐式重复上一个命令（如 M 后跟多组坐标）
                cur = ['M', []]
            cur[1].append(float(m.group()))
            i = m.end()
    if cur:
        out.append(cur)
    return out


def bez3(p0, p1, p2, p3, n):
    pts = []
    for k in range(1, n + 1):
        t = k / n
        u = 1 - t
        x = (u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0])
        y = (u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1])
        pts.append((x, y))
    return pts


def bez2(p0, p1, p2, n):
    pts = []
    for k in range(1, n + 1):
        t = k / n
        u = 1 - t
        x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0]
        y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]
        pts.append((x, y))
    return pts


def arc_pts(p0, rx, ry, phi, fa, fs, p1, n=24):
    # endpoint -> center parameterization (标准算法)
    if rx == 0 or ry == 0:
        return [p1]
    phi = math.radians(phi)
    cos, sin = math.cos(phi), math.sin(phi)
    dx2, dy2 = (p0[0] - p1[0]) / 2.0, (p0[1] - p1[1]) / 2.0
    x1p = cos * dx2 + sin * dy2
    y1p = -sin * dx2 + cos * dy2
    rx, ry = abs(rx), abs(ry)
    lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
    if lam > 1:
        s = math.sqrt(lam)
        rx, ry = rx * s, ry * s
    num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p
    den = rx * rx * y1p * y1p + ry * ry * x1p * x1p
    co = math.sqrt(max(0.0, num / den)) if den else 0.0
    if fa == fs:
        co = -co
    cxp, cyp = co * rx * y1p / ry, -co * ry * x1p / rx
    cx = cos * cxp - sin * cyp + (p0[0] + p1[0]) / 2.0
    cy = sin * cxp + cos * cyp + (p0[1] + p1[1]) / 2.0

    def ang(ux, uy, vx, vy):
        d = math.hypot(ux, uy) * math.hypot(vx, vy)
        a = math.acos(max(-1.0, min(1.0, (ux * vx + uy * vy) / d)))
        if ux * vy - uy * vx < 0:
            a = -a
        return a

    th1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
    dth = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry)
    if not fs and dth > 0:
        dth -= 2 * math.pi
    elif fs and dth < 0:
        dth += 2 * math.pi
    pts = []
    for k in range(1, n + 1):
        th = th1 + dth * (k / n)
        x = cos * rx * math.cos(th) - sin * ry * math.sin(th) + cx
        y = sin * rx * math.cos(th) + cos * ry * math.sin(th) + cy
        pts.append((x, y))
    return pts


def flatten(d, seg=26):
    toks = tokenize(d)
    pts = []
    cur = (0.0, 0.0)
    start = (0.0, 0.0)
    prev_ctrl = None
    prev_cmd = ''
    for cmd, args in toks:
        rel = cmd.islower()
        c = cmd.upper()
        i = 0
        if c == 'Z':          # Z 不带参数，单独处理闭合线
            pts.append(('L', start))
            cur = start
            prev_ctrl = None
            continue
        while i < len(args):
            if c == 'M':
                x, y = args[i], args[i + 1]
                cur = (cur[0] + x, cur[1] + y) if rel else (x, y)
                start = cur
                pts.append(('M', cur))
                i += 2
                c = 'L' if not rel else 'l'   # 后续坐标对隐式当作 L
            elif c == 'L':
                x, y = args[i], args[i + 1]
                cur = (cur[0] + x, cur[1] + y) if rel else (x, y)
                pts.append(('L', cur))
                i += 2
            elif c == 'H':
                x = args[i]
                cur = (cur[0] + x, cur[1]) if rel else (x, cur[1])
                pts.append(('L', cur))
                i += 1
            elif c == 'V':
                y = args[i]
                cur = (cur[0], cur[1] + y) if rel else (cur[0], y)
                pts.append(('L', cur))
                i += 1
            elif c == 'C':
                p1 = (cur[0] + args[i], cur[1] + args[i + 1]) if rel else (args[i], args[i + 1])
                p2 = (cur[0] + args[i + 2], cur[1] + args[i + 3]) if rel else (args[i + 2], args[i + 3])
                p3 = (cur[0] + args[i + 4], cur[1] + args[i + 5]) if rel else (args[i + 4], args[i + 5])
                for p in bez3(cur, p1, p2, p3, seg):
                    pts.append(('L', p))
                prev_ctrl = p2
                cur = p3
                i += 6
            elif c == 'S':
                p2 = (cur[0] + args[i], cur[1] + args[i + 1]) if rel else (args[i], args[i + 1])
                p3 = (cur[0] + args[i + 2], cur[1] + args[i + 3]) if rel else (args[i + 2], args[i + 3])
                p1 = (2 * cur[0] - prev_ctrl[0], 2 * cur[1] - prev_ctrl[1]) if prev_ctrl else cur
                for p in bez3(cur, p1, p2, p3, seg):
                    pts.append(('L', p))
                prev_ctrl = p2
                cur = p3
                i += 4
            elif c == 'Q':
                p1 = (cur[0] + args[i], cur[1] + args[i + 1]) if rel else (args[i], args[i + 1])
                p2 = (cur[0] + args[i + 2], cur[1] + args[i + 3]) if rel else (args[i + 2], args[i + 3])
                for p in bez2(cur, p1, p2, seg):
                    pts.append(('L', p))
                prev_ctrl = p1
                cur = p2
                i += 4
            elif c == 'T':
                p2 = (cur[0] + args[i], cur[1] + args[i + 1]) if rel else (args[i], args[i + 1])
                p1 = (2 * cur[0] - prev_ctrl[0], 2 * cur[1] - prev_ctrl[1]) if prev_ctrl else cur
                for p in bez2(cur, p1, p2, seg):
                    pts.append(('L', p))
                prev_ctrl = p1
                cur = p2
                i += 2
            elif c == 'A':
                rx, ry, phi, fa, fs, x, y = args[i:i + 7]
                end = (cur[0] + x, cur[1] + y) if rel else (x, y)
                for p in arc_pts(cur, rx, ry, phi, int(fa), int(fs), end):
                    pts.append(('L', p))
                cur = end
                i += 7
            elif c in 'Z':
                pts.append(('L', start))
                cur = start
                i = len(args)
            else:
                i = len(args)
        prev_cmd = cmd
        if c not in 'CSQT':
            prev_ctrl = None
    return pts


def render(d, w=34, h=34, box=24.0):
    grid = [[' '] * w for _ in range(h)]
    strokes = []
    cur = None
    for kind, p in flatten(d):
        if kind == 'M':
            cur = p
        else:
            if cur:
                strokes.append((cur, p))
            cur = p

    def put(x, y):
        cx = int(round(x / box * (w - 1)))
        cy = int(round(y / box * (h - 1)))
        if 0 <= cx < w and 0 <= cy < h:
            grid[cy][cx] = '#'

    for (x0, y0), (x1, y1) in strokes:
        dist = math.hypot(x1 - x0, y1 - y0)
        n = max(2, int(dist * 4))
        for k in range(n + 1):
            t = k / n
            put(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)
    return '\n'.join(''.join(r) for r in grid)


if __name__ == '__main__':
    src = open('小手机.html', encoding='utf-8').read()
    blk = src[src.index('var LN_ICONS = {'):]
    blk = blk[:blk.index('\n};')]
    items = re.findall(r"^\s{2}([a-zA-Z0-9]+):\s*'([^']*)'", blk, re.M)
    only = sys.argv[1:] if len(sys.argv) > 1 else None
    for name, d in items:
        if only and name not in only:
            continue
        print('=== ' + name + ' ===')
        print(render(d))

def grid_show(names, cols=5, w=26, h=26):
    src = open('小手机.html', encoding='utf-8').read()
    blk = src[src.index('var LN_ICONS = {'):]
    blk = blk[:blk.index('\n};')]
    items = dict(re.findall(r"^\s{2}([a-zA-Z0-9]+):\s*'([^']*)'", blk, re.M))
    for s in range(0, len(names), cols):
        chunk = names[s:s + cols]
        arts = [render(items[n], w, h).split('\n') for n in chunk]
        print(' | '.join(n.ljust(w) for n in chunk))
        for r in range(h):
            print(' | '.join(a[r] for a in arts))
        print()
