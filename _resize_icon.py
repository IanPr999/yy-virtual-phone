#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从 icon-1024.png 用「面积加权平均」重采样出 iOS/PWA 需要的各尺寸图标。
纯标准库（zlib + struct），不依赖 PIL。
输出 appicon-{180,192,512,1024}.png：RGB 8bit、不透明、无 ICC/gAMA/pHYs 等附加块。
"""
import zlib, struct, sys, os

SRC = 'icon-1024.png'
TARGETS = [180, 192, 512, 1024]


# ---------------- PNG 解码（8bit, 非隔行） ----------------
def decode_png(path):
    d = open(path, 'rb').read()
    assert d[:8] == b'\x89PNG\r\n\x1a\n', 'not png'
    i = 8
    idat = b''
    w = h = bd = ct = inter = None
    while i < len(d):
        ln = struct.unpack('>I', d[i:i + 4])[0]
        t = d[i + 4:i + 8]
        data = d[i + 8:i + 8 + ln]
        i += 12 + ln
        if t == b'IHDR':
            w, h, bd, ct, _comp, _filt, inter = struct.unpack('>IIBBBBB', data)
        elif t == b'IDAT':
            idat += data
        elif t == b'IEND':
            break
    assert bd == 8 and inter == 0, 'only 8bit non-interlaced'
    ch = {0: 1, 2: 3, 4: 2, 6: 4}[ct]
    raw = zlib.decompress(idat)
    stride = w * ch
    out = bytearray(h * stride)
    prev = bytearray(stride)
    p = 0
    for y in range(h):
        f = raw[p]; p += 1
        line = bytearray(raw[p:p + stride]); p += stride
        if f == 1:
            for x in range(ch, stride):
                line[x] = (line[x] + line[x - ch]) & 255
        elif f == 2:
            for x in range(stride):
                line[x] = (line[x] + prev[x]) & 255
        elif f == 3:
            for x in range(stride):
                a = line[x - ch] if x >= ch else 0
                line[x] = (line[x] + ((a + prev[x]) >> 1)) & 255
        elif f == 4:
            for x in range(stride):
                a = line[x - ch] if x >= ch else 0
                b = prev[x]
                c = prev[x - ch] if x >= ch else 0
                pp = a + b - c
                pa, pb, pc = abs(pp - a), abs(pp - b), abs(pp - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[x] = (line[x] + pr) & 255
        out[y * stride:(y + 1) * stride] = line
        prev = line
    return w, h, ch, out


# ---------------- PNG 编码（RGB 8bit） ----------------
def encode_rgb(w, h, buf):
    raw = bytearray()
    stride = w * 3
    for y in range(h):
        raw.append(0)  # filter none
        raw += buf[y * stride:(y + 1) * stride]
    comp = zlib.compress(bytes(raw), 9)

    def chunk(t, data):
        return struct.pack('>I', len(data)) + t + data + struct.pack('>I', zlib.crc32(t + data) & 0xFFFFFFFF)

    ihdr = struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) +
            chunk(b'IDAT', comp) + chunk(b'IEND', b''))


# ---------------- 面积加权重采样（先垂直后水平） ----------------
def coverage_weights(src_n, dst_n):
    """面积覆盖率权重。返回 list[目标下标] -> list[(源下标, 归一化权重)]，每项权重和恒为 1。"""
    k = src_n / dst_n
    res = []
    for di in range(dst_n):
        a, b = di * k, (di + 1) * k
        covs = []
        s = int(a)
        while s < b:
            cov = min(b, s + 1) - max(a, s)
            if cov > 1e-9:
                covs.append((s, cov))
            s += 1
        tot = sum(c for _, c in covs) or 1.0
        res.append([(s, c / tot) for s, c in covs])
    return res


def resize(w, h, ch, buf, dw, dh):
    stride = w * ch
    # ① 垂直：把 h 行压到 dh 行，宽度仍为 w
    vmap = coverage_weights(h, dh)
    mid = []
    for dy in range(dh):
        acc = [0.0] * (w * 3)
        for sy, c in vmap[dy]:
            row = buf[sy * stride:(sy + 1) * stride]
            for x in range(w):
                base = x * ch
                o = x * 3
                acc[o] += row[base] * c
                acc[o + 1] += row[base + 1] * c
                acc[o + 2] += row[base + 2] * c
        mid.append(acc)
    # ② 水平：把 w 列压到 dw 列
    hmap = coverage_weights(w, dw)
    out = bytearray(dw * dh * 3)
    for dy in range(dh):
        src = mid[dy]
        o = dy * dw * 3
        for dx in range(dw):
            r = g = b = 0.0
            for sx, c in hmap[dx]:
                q = sx * 3
                r += src[q] * c
                g += src[q + 1] * c
                b += src[q + 2] * c
            out[o] = min(255, max(0, int(round(r)))); o += 1
            out[o] = min(255, max(0, int(round(g)))); o += 1
            out[o] = min(255, max(0, int(round(b)))); o += 1
    return out


def main():
    w, h, ch, buf = decode_png(SRC)
    print('源图 %dx%d ch=%d' % (w, h, ch))
    for t in TARGETS:
        if t == w:
            data = encode_rgb(w, h, buf)
        else:
            data = encode_rgb(t, t, resize(w, h, ch, buf, t, t))
        name = 'appicon-%d.png' % t
        open(name, 'wb').write(data)
        print('  -> %s  %d bytes' % (name, len(data)))
    # 4 倍最近邻放大预览，方便肉眼校验 180 是否完整
    pw = 720
    _, _, _, small = decode_png('appicon-180.png')
    nn = bytearray(pw * pw * 3)
    scale = 180 / pw
    for y in range(pw):
        sy = int(y * scale)
        for x in range(pw):
            sx = int(x * scale)
            s = (sy * 180 + sx) * 3
            d = (y * pw + x) * 3
            nn[d:d + 3] = small[s:s + 3]
    open('_preview-180x4.png', 'wb').write(encode_rgb(pw, pw, nn))
    print('  -> _preview-180x4.png (目视校验用)')


if __name__ == '__main__':
    main()
