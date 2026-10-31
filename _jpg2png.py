#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把用户上传的图片（实际是 JPEG，尽管后缀是 .png）直接做成主屏图标。
纯标准库：自己解码基线 JPEG（哈夫曼 + 反量化 + IDCT + 4:2:0 上采样），
再面积平均降采样到 512 / 192 / 180 并写成 PNG。
用法：python _jpg2png.py [--probe MCU行数]
"""
import struct, zlib, math, sys, os, time
from array import array
from operator import mul

SRC   = r'C:\Users\29441\Documents\Tencent Files\3538635659\nt_qq\nt_data\Pic\2026-10\Ori\6077f3ffdb28b7429162b9741af0559f.png'
OUTD  = r'D:\Workbuddy\2026-10-23-02-55-24'
OUTS  = [(512, 'icon-512.png'), (192, 'icon-192.png'), (180, 'icon-180.png')]

ZZ = [0,1,8,16,9,2,3,10,17,24,32,25,18,11,4,5,12,19,26,33,40,48,41,34,
      27,20,13,6,7,14,21,28,35,42,49,56,57,50,43,36,29,22,15,23,30,37,44,51,
      58,59,52,45,38,31,39,46,53,60,61,54,47,55,62,63]

# ---------------- 位读取器（处理 FF00 填充与标记） ----------------
class BR:
    __slots__ = ('d','p','n','acc','cnt')
    def __init__(self, d, p):
        self.d = d; self.p = p; self.n = len(d); self.acc = 0; self.cnt = 0
    def refill(self):
        d = self.d; p = self.p; n = self.n; acc = self.acc; cnt = self.cnt
        while cnt <= 24:
            if p >= n:                       # 数据耗尽：按惯例补 1
                acc = (acc << 8) | 0xFF; cnt += 8
                if cnt >= 40: break
                continue
            b = d[p]
            if b == 0xFF:
                nb = d[p+1] if p+1 < n else 0xD9
                if nb == 0x00:
                    p += 2
                else:                        # 遇到标记：补 1 后停止取新数据
                    acc = (acc << 8) | 0xFF; cnt += 8
                    if cnt >= 40: break
                    continue
            else:
                p += 1
            acc = (acc << 8) | b; cnt += 8
        self.p = p; self.acc = acc & 0xFFFFFFFFFFFF; self.cnt = cnt
    def peek16(self):
        if self.cnt < 16: self.refill()
        if self.cnt < 16:                   # 接近文件尾：低位补 1
            sh = 16 - self.cnt
            return ((self.acc << sh) | ((1 << sh) - 1)) & 0xFFFF
        return (self.acc >> (self.cnt - 16)) & 0xFFFF
    def bits(self, k):
        if self.cnt < k: self.refill()
        self.cnt -= k
        return (self.acc >> self.cnt) & ((1 << k) - 1)

# ---------------- 哈夫曼查找表 ----------------
def build_lut(counts, symbols):
    lut = [0] * 65536
    code = 0; k = 0
    for L in range(1, 17):
        for _ in range(counts[L-1]):
            sym = symbols[k]; k += 1
            sh = 16 - L
            base = code << sh
            for pat in range(base, base + (1 << sh)):
                lut[pat] = (sym << 5) | L
            code += 1
        code <<= 1
    return lut

# ---------------- IDCT 表 ----------------
SQ = math.sqrt(2) / 2.0
CT = [[(SQ if u == 0 else 1.0) * math.cos((2*x+1) * u * math.pi / 16.0) for x in range(8)] for u in range(8)]
COLS = [[CT[v][y] for v in range(8)] for y in range(8)]     # COLS[y][v]

def idct(b):
    """b: 64 个反量化后的系数（自然序 i=v*8+u）→ 64 个像素值（未加电平偏移）"""
    nz = [(i, b[i]) for i in range(64) if b[i]]
    t = [0.0] * 64
    for i, val in nz:
        v = i >> 3; u = i & 7
        r = CT[u]
        t[v]     += val * r[0]; t[8+v]  += val * r[1]; t[16+v] += val * r[2]; t[24+v] += val * r[3]
        t[32+v]  += val * r[4]; t[40+v] += val * r[5]; t[48+v] += val * r[6]; t[56+v] += val * r[7]
    s = [0.0] * 64
    for y in range(8):
        c = COLS[y]; c0,c1,c2,c3,c4,c5,c6,c7 = c
        for x in range(8):
            b8 = x * 8
            t0,t1,t2,t3,t4,t5,t6,t7 = t[b8:b8+8]
            s[y*8+x] = 0.25 * (t0*c0+t1*c1+t2*c2+t3*c3+t4*c4+t5*c5+t6*c6+t7*c7)
    return s

# ---------------- 解析 ----------------
def parse(d):
    pos = 2
    qt = {}; huff = {}; comps = []; W = H = 0; dri = 0
    while pos < len(d) - 1:
        if d[pos] != 0xFF: pos += 1; continue
        m = d[pos+1]
        if m == 0xD8 or m == 0xD9 or 0xD0 <= m <= 0xD7:
            pos += 2; continue
        if m == 0xDA: break
        ln = struct.unpack('>H', d[pos+2:pos+4])[0]
        body = d[pos+4:pos+2+ln]
        if m == 0xDB:                                  # 量化表
            i = 0
            while i < len(body):
                pq = body[i] >> 4; tq = body[i] & 15; i += 1
                if pq:
                    vals = list(struct.unpack('>64H', body[i:i+128])); i += 128
                else:
                    vals = list(body[i:i+64]); i += 64
                nat = [0]*64
                for k in range(64): nat[ZZ[k]] = vals[k]
                qt[tq] = nat
        elif m == 0xC4:                                # 哈夫曼表
            i = 0
            while i < len(body):
                tc = body[i] >> 4; th = body[i] & 15; i += 1
                counts = list(body[i:i+16]); i += 16
                total = sum(counts)
                syms = list(body[i:i+total]); i += total
                huff[(tc, th)] = build_lut(counts, syms)
        elif m in (0xC0, 0xC1):                        # SOF0 / SOF1
            H = struct.unpack('>H', body[1:3])[0]; W = struct.unpack('>H', body[3:5])[0]
            nc = body[5]
            for i in range(nc):
                cid, hv, tq = body[6+i*3], body[7+i*3], body[8+i*3]
                comps.append({'id': cid, 'h': hv >> 4, 'v': hv & 15, 'q': tq})
        elif m == 0xDD:
            dri = struct.unpack('>H', body[:2])[0]
        pos += 2 + ln
    # SOS
    ln = struct.unpack('>H', d[pos+2:pos+4])[0]
    body = d[pos+4:pos+2+ln]
    ns = body[0]
    order = []
    for i in range(ns):
        cs = body[1+i*2]; tt = body[2+i*2]
        order.append((cs, tt >> 4, tt & 15))
    scan_start = pos + 2 + ln
    return W, H, comps, qt, huff, order, scan_start, dri

# ---------------- 主解码 ----------------
def decode(SRC, probe_rows=None):
    d = open(SRC, 'rb').read()
    W, H, comps, qt, huff, order, start, dri = parse(d)
    print('JPEG %dx%d  分量 %s  重启间隔 %s' % (W, H, [(c['h'], c['v']) for c in comps], dri or '无'))
    hmax = max(c['h'] for c in comps); vmax = max(c['v'] for c in comps)
    mw = 8 * hmax; mh = 8 * vmax
    mcus_x = (W + mw - 1) // mw; mcus_y = (H + mh - 1) // mh
    total = mcus_x * mcus_y
    if probe_rows: mcus_y = min(mcus_y, probe_rows); total = mcus_x * mcus_y
    print('MCU %dx%d = %d 个，每 MCU %dx%d 像素' % (mcus_x, mcus_y, total, mw, mh))

    for c in comps:
        c['bw'] = c['h']; c['bh'] = c['v']
        c['pw'] = mcus_x * c['h'] * 8; c['ph'] = mcus_y * c['v'] * 8
        c['plane'] = array('B', bytes(c['pw'] * c['ph']))
        c['q'] = qt[c['q']]
    byid = {c['id']: c for c in comps}
    scan = []
    for cs, dct, act in order:
        c = byid[cs]
        scan.append((c, huff[(0, dct)], huff[(1, act)]))

    br = BR(d, start)
    dc_pred = [0] * len(comps)
    coeff = [0] * 64
    t0 = time.time()

    for my in range(mcus_y):
        for mx in range(mcus_x):
            for ci in range(len(scan)):
                c, dclut, aclut = scan[ci]
                q = c['q']
                for by in range(c['bh']):
                    for bx in range(c['bw']):
                        # --- DC ---
                        e = dclut[br.peek16()]; s = e >> 5; L = e & 31
                        br.cnt -= L
                        if s:
                            v = br.bits(s)
                            if v < (1 << (s-1)): v -= (1 << s) - 1
                            dp = dc_pred[ci] + v
                        else:
                            dp = dc_pred[ci]
                        dc_pred[ci] = dp
                        coeff[0] = dp * q[0]
                        for k in range(1, 64): coeff[k] = 0
                        # --- AC ---
                        k = 1
                        while k < 64:
                            e = aclut[br.peek16()]; rs = e >> 5; L = e & 31
                            br.cnt -= L
                            r = rs >> 4; s = rs & 15
                            if s == 0:
                                if r == 15: k += 16; continue
                                break
                            k += r
                            if k > 63: break
                            v = br.bits(s)
                            if v < (1 << (s-1)): v -= (1 << s) - 1
                            idx = ZZ[k]
                            coeff[idx] = v * q[idx]
                            k += 1
                        # --- IDCT + 落盘 ---
                        px = idct(coeff)
                        plane = c['plane']; pw = c['pw']
                        ox = mx * c['h'] * 8 + bx * 8
                        oy = my * c['v'] * 8 + by * 8
                        base = oy * pw + ox
                        for y in range(8):
                            row = px[y*8:y*8+8]
                            plane[base:base+8] = array('B', [max(0, min(255, int(v + 128.5))) for v in row])
                            base += pw
        if my % 16 == 0:
            el = time.time() - t0
            print('  MCU 行 %d/%d  用时 %.1fs' % (my+1, mcus_y, el))
    print('解码完成，用时 %.1fs' % (time.time() - t0))
    return W, H, comps

# ---------------- 降采样 + 色彩转换 ----------------
def to_rgb(W, H, comps, size):
    Y = comps[0]['plane']; pw = comps[0]['pw']
    Cb = comps[1]['plane']; Cr = comps[2]['plane']
    cw = comps[1]['pw']
    step = W // size
    out = bytearray(size * size * 3)
    o = 0
    for oy in range(size):
        sy = oy * step
        for ox in range(size):
            sx = ox * step
            ys = 0
            for dy in range(step):
                b = (sy + dy) * pw + sx
                for dx in range(step):
                    ys += Y[b + dx]
            yv = ys / (step * step)
            cx = sx >> 1; cy = sy >> 1
            n = step >> 1
            if n:
                cb = cr = 0
                for dy in range(n):
                    b = (cy + dy) * cw + cx
                    for dx in range(n):
                        cb += Cb[b + dx]; cr += Cr[b + dx]
                nn = n * n
                cb = cb / nn - 128.0; cr = cr / nn - 128.0
            else:
                cb = Cb[cy * cw + cx] - 128.0
                cr = Cr[cy * cw + cx] - 128.0
            r = yv + 1.402 * cr
            g = yv - 0.344136 * cb - 0.714136 * cr
            b2 = yv + 1.772 * cb
            out[o]   = 0 if r < 0 else (255 if r > 255 else int(r + 0.5)); o += 1
            out[o]   = 0 if g < 0 else (255 if g > 255 else int(g + 0.5)); o += 1
            out[o]   = 0 if b2 < 0 else (255 if b2 > 255 else int(b2 + 0.5)); o += 1
    return out

def area_resize(src, sw, sh, dw):
    """src: RGB bytearray，面积平均缩放到 dw×dw"""
    step = sw // dw
    out = bytearray(dw * dw * 3)
    o = 0
    for oy in range(dw):
        sy = oy * step
        for ox in range(dw):
            sx = ox * step
            r = g = b = 0
            for dy in range(step):
                base = ((sy + dy) * sw + sx) * 3
                for dx in range(step):
                    r += src[base]; g += src[base+1]; b += src[base+2]; base += 3
            n = step * step
            out[o] = int(r / n + 0.5); out[o+1] = int(g / n + 0.5); out[o+2] = int(b / n + 0.5)
            o += 3
    return out

def write_png(path, size, rgb):
    raw = bytearray()
    for j in range(size):
        raw.append(0)
        base = j * size * 3
        for i in range(size):
            k = base + i * 3
            raw += bytes((rgb[k], rgb[k+1], rgb[k+2], 255))
    def chunk(t, data):
        c = t + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(bytes(raw), 9))
    png += chunk(b'IEND', b'')
    open(path, 'wb').write(png)

def preview(rgb, size, n=40):
    ramp = ' .:-=+*#%@'
    lines = []
    for j in range(n):
        line = ''
        for i in range(n):
            x = int((i + 0.5) / n * size); y = int((j + 0.5) / n * size)
            k = (y * size + x) * 3
            lum = (rgb[k] * 299 + rgb[k+1] * 587 + rgb[k+2] * 114) / 1000
            line += ramp[min(9, int(lum / 25.6))]
        lines.append(line)
    return '\n'.join(lines)

if __name__ == '__main__':
    probe = None
    if '--probe' in sys.argv:
        probe = int(sys.argv[sys.argv.index('--probe') + 1])
    W, H, comps = decode(SRC, probe)
    if probe:
        # 只解码了一部分：直接采样已解码区域做灰度预览，验证形状是否正确
        c0 = comps[0]; Y = c0['plane']; pw = c0['pw']; ph = c0['ph']
        print('已解码区域: %dx%d' % (pw, ph))
        print('--- 局部灰度预览（亮=空格 暗=@）---')
        n = 40
        for j in range(n):
            line = ''
            for i in range(n):
                x = int((i + 0.5) / n * pw); y = int((j + 0.5) / n * ph)
                v = Y[y * pw + x]
                line += ' .:-=+*#%@'[min(9, int((255 - v) / 25.6))]
            print(line)
        # 抽几个点看色彩（验证 YCbCr→RGB 方向没搞反）
        Cb = comps[1]['plane']; Cr = comps[2]['plane']; cw = comps[1]['pw']
        for fx, fy, tag in [(0.5, 0.5, '中心'), (0.25, 0.5, '左中'), (0.75, 0.5, '右中'), (0.05, 0.05, '角落')]:
            x = int(fx * pw); y = int(fy * ph)
            yv = Y[y * pw + x]; cb = Cb[(y >> 1) * cw + (x >> 1)] - 128; cr = Cr[(y >> 1) * cw + (x >> 1)] - 128
            r = yv + 1.402 * cr; g = yv - 0.344136 * cb - 0.714136 * cr; b = yv + 1.772 * cb
            print('%s RGB=(%d,%d,%d)' % (tag, r, g, b))
        sys.exit(0)
    rgb512 = to_rgb(W, H, comps, 512)
    print('--- 512 预览（暗=@ 亮=空格）---')
    print(preview(rgb512, 512))
    for size, name in OUTS:
        if size == 512:
            rgb = rgb512
        else:
            rgb = area_resize(rgb512, 512, 512, size)
        write_png(os.path.join(OUTD, name), size, rgb)
        print('写出', name, size, 'px')
