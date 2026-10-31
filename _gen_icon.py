#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# 生成「小手机」主屏图标：参考图风格 —— 浅蓝半透明玻璃立方体，正面两个白色胶囊，带倒影
# 纯标准库（zlib 写 PNG），无第三方依赖；多重采样抗锯齿；末尾自检 + ASCII 预览
import zlib, struct, math, sys

OUT = ['icon-512.png', 'icon-192.png', 'icon-180.png']

# ---------- 几何（0..1 归一化，y 向下） ----------
L, R = 0.300, 0.700          # 正面左右
T, B = 0.295, 0.705          # 正面上、下
CX, CY = (L + R) / 2, (T + B) / 2
HW, HH = (R - L) / 2, (B - T) / 2
R_F = 0.082                  # 正面圆角
D  = 0.118                   # 顶面厚度（屏幕上）
S  = 0.028                   # 顶面后缘的水平剪切
R_T = 0.052                  # 顶面圆角
# 两个白色胶囊
P_DX, P_DY, P_RX, P_RY = 0.058, 0.505, 0.030, 0.082

# ---------- 配色 ----------
BG_BASE   = (250, 251, 254)
BG_GLOW   = (228, 242, 254)
SHADOW    = (138, 172, 208)
REFL      = (186, 218, 246)
GLASS_TOP = (211, 236, 252)
GLASS_BOT = (116, 174, 226)
GLASS_MID = (163, 209, 243)
CAUSTIC   = (168, 234, 250)
RIM_W     = (255, 255, 255)
RIM_C     = (176, 231, 252)
PILL_W    = (254, 255, 255)
PILL_B    = (216, 233, 249)
PILL_SH   = (102, 156, 214)
TOP_F     = (224, 243, 255)
TOP_B     = (196, 229, 250)

def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t)

def clamp01(v):
    return 0.0 if v < 0 else (1.0 if v > 1 else v)

def smooth(e0, e1, v):
    """Hermite 平滑过渡"""
    t = clamp01((v - e0) / (e1 - e0))
    return t * t * (3 - 2 * t)

# ---------- 覆盖度 ----------
def sd_rrect(x, y, cx, cy, hw, hh, r):
    dx = abs(x - cx) - (hw - r)
    dy = abs(y - cy) - (hh - r)
    ox = dx if dx > 0 else 0.0
    oy = dy if dy > 0 else 0.0
    outside = math.hypot(ox, oy) - r
    inside = (dx if dx > dy else dy) - r
    return outside if (dx > 0 or dy > 0) else inside

def cov_hard(d, soft=0.0025):
    return smooth(-soft, soft, -d) if abs(d) < soft * 2 else (1.0 if d < 0 else 0.0)

def cov_soft(d, soft):
    return clamp01(0.5 - d / max(soft, 1e-6))

def cov_ellipse(x, y, cx, cy, rx, ry, soft=1.0):
    """soft=1 → 很柔；soft 小 → 接近硬边"""
    d = math.hypot((x - cx) / max(rx, 1e-6), (y - cy) / max(ry, 1e-6))
    if soft >= 1.0:
        return clamp01((1.0 - d) / max(soft * 0.35, 1e-6)) * clamp01(1.0 - d * 0.55)
    return smooth(1.0 - soft, 1.0, 1.0 - d)

def cov_ellipse_rot(x, y, cx, cy, rx, ry, rot, soft=1.0):
    dx, dy = x - cx, y - cy
    c, s = math.cos(rot), math.sin(rot)
    u = dx * c + dy * s
    v = -dx * s + dy * c
    return cov_ellipse(u, v, 0.0, 0.0, rx, ry, soft)

# ---------- 顶面：剪切后的圆角矩形（四边形 + 圆角） ----------
def top_cov(x, y):
    if y > T or y < T - D - 0.02:
        return 0.0
    t = (T - y) / D
    u = x - S * t
    return cov_hard(sd_rrect(u, y, (L + R) / 2, T - D / 2, HW, D / 2, R_T))

def front_cov(x, y):
    return cov_hard(sd_rrect(x, y, CX, CY, HW, HH, R_F))

def pill_cov(x, y, dx):
    return cov_hard(sd_rrect(x, y, CX + dx, P_DY, P_RX, P_RY, P_RX))

# ---------- 合成 ----------
def shade(x, y):
    # 1) 白底 + 立方体后面的柔光
    out = BG_BASE
    glow = cov_ellipse(x, y, 0.5, 0.44, 0.46, 0.46, 1.0)
    out = lerp(out, BG_GLOW, glow * 0.85)

    # 2) 地面投影 + 立方体下方的蓝色晕
    sh = cov_ellipse(x, y, 0.5, B + 0.030, 0.300, 0.046, 1.0)
    out = lerp(out, SHADOW, sh * 0.30)
    halo = cov_ellipse(x, y, 0.5, B + 0.018, 0.250, 0.058, 1.0)
    out = lerp(out, REFL, halo * 0.55)

    # 3) 倒影：正面形状的压扁回声，越往下越淡
    refl_h = 0.115
    if B < y < B + refl_h:
        k = (y - B) / refl_h
        a = front_cov(x, B - (y - B) * 0.40)
        if a > 0:
            rc = lerp(REFL, (255, 255, 255), 0.25)
            out = lerp(out, rc, a * 0.22 * (1 - k))

    # 4) 顶面（玻璃，前缘被正面盖住）
    a_top = top_cov(x, y)
    if a_top > 0:
        t = clamp01((y - (T - D)) / D)
        g = lerp(TOP_F, TOP_B, t)
        # 顶部柔光
        gl = cov_ellipse_rot(x, y, 0.445, T - D + 0.052, 0.115, 0.042, 0.04, 1.0)
        g = lerp(g, RIM_W, gl * 0.85)
        # 前缘一道细亮线（和正面的分界）
        edge = smooth(T - 0.008, T, y)
        g = lerp(g, RIM_W, edge * 0.45)
        out = lerp(out, g, a_top)

    # 5) 正面：竖向玻璃渐变
    a_f = front_cov(x, y)
    if a_f > 0:
        t = clamp01((y - T) / (B - T))
        if t < 0.5:
            g = lerp(GLASS_TOP, GLASS_MID, t / 0.5)
        else:
            g = lerp(GLASS_MID, GLASS_BOT, (t - 0.5) / 0.5)
        # 中间偏下的“聚光”（光线穿过玻璃的亮斑）
        ca = cov_ellipse(x, y, 0.500, 0.600, 0.135, 0.105, 1.0)
        g = lerp(g, CAUSTIC, ca * 0.40)
        ca2 = cov_ellipse(x, y, 0.500, 0.618, 0.070, 0.052, 1.0)
        g = lerp(g, (205, 245, 255), ca2 * 0.45)
        # 左上角一道斜向高光
        sp = cov_ellipse_rot(x, y, 0.425, 0.360, 0.165, 0.046, -0.38, 1.0)
        g = lerp(g, RIM_W, sp * 0.55)
        # 边缘：上缘亮白、右缘青白、下缘略暗
        d = sd_rrect(x, y, CX, CY, HW, HH, R_F)
        rim = clamp01(1.0 - abs(d) / 0.013)
        topness = clamp01(1.0 - (y - T) / 0.10)          # 越靠上越强
        rightness = clamp01((x - (R - 0.075)) / 0.075)    # 越靠右越强
        bottomness = clamp01((y - (B - 0.075)) / 0.075)   # 越靠下越强
        g = lerp(g, RIM_W, rim * (0.30 + 0.60 * topness))
        g = lerp(g, RIM_C, rim * rightness * 0.55)
        g = lerp(g, (96, 158, 214), rim * bottomness * 0.45)
        # 右侧那条更亮的“侧面反光”竖带
        band = smooth(R - 0.055, R - 0.012, x) * smooth(B - 0.02, B - 0.10, y) * smooth(T + 0.02, T + 0.10, y)
        g = lerp(g, (232, 249, 255), band * 0.55)
        out = lerp(out, g, a_f)

    # 6) 胶囊的投影（压在玻璃上）
    for dx in (-P_DX, P_DX):
        ps = pill_cov(x, y - 0.013, dx)
        if ps > 0:
            soft = cov_soft(sd_rrect(x, y - 0.013, CX + dx, P_DY, P_RX + 0.012, P_RY + 0.012, P_RX), 0.030)
            out = lerp(out, PILL_SH, soft * 0.34)

    # 7) 两个白色胶囊
    for dx in (-P_DX, P_DX):
        a_p = pill_cov(x, y, dx)
        if a_p > 0:
            t = clamp01((y - (P_DY - P_RY)) / (2 * P_RY))
            p = lerp(PILL_W, PILL_B, smooth(0.45, 1.0, t))
            # 胶囊顶部一点柔光
            hl = cov_ellipse(x, y, CX + dx, P_DY - P_RY * 0.45, P_RX * 0.55, P_RY * 0.30, 1.0)
            p = lerp(p, (255, 255, 255), hl * 0.5)
            out = lerp(out, p, a_p * 0.97)

    return out, 1.0

# ---------- PNG 输出 ----------
def write_png(path, size, ss=3):
    n = size * ss
    acc = [[0.0, 0.0, 0.0, 0.0] for _ in range(size * size)]
    inv = 1.0 / (ss * ss)
    for j in range(size):
        y0 = (j + 0.5) / size
        base = j * size
        for i in range(size):
            x0 = (i + 0.5) / size
            r = g = b = a = 0.0
            for sy in range(ss):
                yy = (j + (sy + 0.5) / ss) / size
                for sx in range(ss):
                    xx = (i + (sx + 0.5) / ss) / size
                    c, al = shade(xx, yy)
                    r += c[0]; g += c[1]; b += c[2]; a += al
            k = base + i
            acc[k][0] = r * inv; acc[k][1] = g * inv; acc[k][2] = b * inv; acc[k][3] = a * inv
    raw = bytearray()
    for j in range(size):
        raw.append(0)
        for i in range(size):
            k = j * size + i
            raw += bytes((int(clamp01(acc[k][0] / 255) * 255 + 0.5),
                          int(clamp01(acc[k][1] / 255) * 255 + 0.5),
                          int(clamp01(acc[k][2] / 255) * 255 + 0.5),
                          int(clamp01(acc[k][3]) * 255 + 0.5)))
    def chunk(t, data):
        c = t + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(bytes(raw), 9))
    png += chunk(b'IEND', b'')
    open(path, 'wb').write(png)
    return acc

# ---------- 解码自检 ----------
def read_png(path):
    data = open(path, 'rb').read()
    pos = 8; idat = b''; w = h = 0
    while pos < len(data):
        ln = struct.unpack('>I', data[pos:pos + 4])[0]; typ = data[pos + 4:pos + 8]
        body = data[pos + 8:pos + 8 + ln]
        if typ == b'IHDR':
            w, h, bd, ct = struct.unpack('>IIBB', body[:10])
        elif typ == b'IDAT':
            idat += body
        pos += 12 + ln
    raw = zlib.decompress(idat)
    px = []; stride = w * 4; p = 0
    for y in range(h):
        f = raw[p]; p += 1
        row = list(raw[p:p + stride]); p += stride
        if f == 1:
            for i in range(4, stride, 4):
                for k in range(3): row[i + k] = (row[i + k] + row[i - 4 + k]) & 255
        elif f == 2:
            for i in range(stride):
                prev = px[-1][i] if px else 0
                row[i] = (row[i] + prev) & 255
        elif f == 3:
            for i in range(stride):
                left = row[i - 4] if i >= 4 else 0
                up = px[-1][i] if px else 0
                row[i] = (row[i] + ((left + up) >> 1)) & 255
        elif f == 4:
            for i in range(stride):
                a = row[i - 4] if i >= 4 else 0
                b = px[-1][i] if px else 0
                c = px[-1][i - 4] if (px and i >= 4) else 0
                pp = a + b - c
                pa, pb, pc = abs(pp - a), abs(pp - b), abs(pp - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                row[i] = (row[i] + pr) & 255
        px.append(row)
    return w, h, px

def preview(path, n=36):
    w, h, px = read_png(path)
    out = []
    for j in range(n):
        line = ''
        for i in range(n):
            x = int((i + 0.5) / n * w); y = int((j + 0.5) / n * h)
            r, g, b = px[y][x * 4], px[y][x * 4 + 1], px[y][x * 4 + 2]
            lum = (r * 299 + g * 587 + b * 114) / 1000
            ramp = ' .:-=+*#%@'
            line += ramp[min(9, int(lum / 25.6))]
        out.append(line)
    return '\n'.join(out)

def main():
    for path, size, ss in [(OUT[0], 512, 3), (OUT[1], 192, 4), (OUT[2], 180, 4)]:
        print('生成', path, size, 'px ...')
        write_png(path, size, ss)
    print('--- 512 预览（亮=@ 暗=空格）---')
    print(preview(OUT[0]))
    w, h, px = read_png(OUT[0])
    def at(fx, fy):
        x = int(fx * w); y = int(fy * h)
        return tuple(px[y][x * 4:x * 4 + 4])
    probes = {
        '背景(左上角)':   at(0.06, 0.06),
        '背景(右上角)':   at(0.94, 0.06),
        '顶面':           at(0.50, 0.250),
        '正面上部':       at(0.50, 0.360),
        '正面中部(玻璃)': at(0.50, 0.520),
        '正面下部':       at(0.50, 0.660),
        '胶囊1':          at(0.442, 0.505),
        '胶囊2':          at(0.558, 0.505),
        '两胶囊之间':     at(0.500, 0.505),
        '立方体下方倒影': at(0.50, 0.760),
        '底部远处背景':   at(0.50, 0.960),
    }
    for k, v in probes.items():
        print(k, v)
    pill = at(0.442, 0.505); pill2 = at(0.558, 0.505)
    glass = at(0.50, 0.520); topf = at(0.50, 0.250); bg = at(0.06, 0.06)
    ok = (min(pill[0], pill2[0]) > 235 and min(pill[1], pill2[1]) > 240      # 胶囊近白
          and glass[2] > glass[0] + 25 and glass[2] > 200                     # 正面是蓝玻璃
          and topf[2] > glass[2] - 5 and topf[0] > 200                        # 顶面更亮
          and bg[0] > 235 and bg[1] > 238                                     # 背景近白
          and at(0.500, 0.505)[0] < 235)                                      # 两胶囊之间不是白
    print('VERIFY', 'PASS' if ok else 'FAIL')
    return 0 if ok else 1

if __name__ == '__main__':
    sys.exit(main())
