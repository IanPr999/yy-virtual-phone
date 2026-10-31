import zlib, struct, math

def write_png(path, w, h, top, bot):
    # top/bot: (r,g,b) gradient top->bottom; soft white glow at center
    cx, cy = w/2.0, h/2.0
    maxr = min(w, h) * 0.42
    rows = []
    for y in range(h):
        t = y / (h - 1)
        br, bg, bb = (top[i] + (bot[i]-top[i])*t for i in range(3))
        row = bytearray()
        for x in range(w):
            d = math.hypot(x-cx, y-cy) / maxr
            glow = max(0.0, 1.0 - d)
            glow = glow*glow*0.55  # soft falloff
            r = br*(1-glow) + 255*glow
            g = bg*(1-glow) + 255*glow
            b = bb*(1-glow) + 255*glow
            row += bytes((int(max(0,min(255,r))), int(max(0,min(255,g))), int(max(0,min(255,b)))))
        rows.append(bytes(row))
    raw = b''.join(b'\x00'+r for r in rows)
    comp = zlib.compress(raw, 9)
    def chunk(typ, data):
        c = typ + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)
    with open(path, 'wb') as f:
        f.write(sig)
        f.write(chunk(b'IHDR', ihdr))
        f.write(chunk(b'IDAT', comp))
        f.write(chunk(b'IEND', b''))

TOP = (219, 231, 242)   # #dbe7f2
BOT = (198, 216, 234)   # #c6d8ea
sizes = [
    (828, 1792), (1125, 2436), (1170, 2532),
    (1179, 2556), (1242, 2688), (1284, 2778),
]
for w, h in sizes:
    write_png('splash-%dx%d.png' % (w, h), w, h, TOP, BOT)
    print('wrote splash-%dx%d.png' % (w, h))
