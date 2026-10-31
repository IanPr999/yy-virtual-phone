#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 appicon-512.png 套上近似 iOS 主屏图标的圆角遮罩（超椭圆），
输出 _preview-ios.png，用于目视校验「系统裁圆角后主体是否被切、是否偏移」。"""
import _resize_icon as R

S = 512
MARGIN = 56
CANVAS = S + MARGIN * 2
BG = (223, 230, 238)          # 模拟浅色壁纸
SHADOW = (185, 197, 211)

w, h, ch, buf = R.decode_png('appicon-512.png')
assert (w, h) == (S, S)

N = 3                          # 每像素 3x3 超采样
RADIUS_RATIO = 0.2237          # iOS 图标圆角 ≈ 22.37%

out = bytearray(CANVAS * CANVAS * 3)
for y in range(CANVAS):
    for x in range(CANVAS):
        o = (y * CANVAS + x) * 3
        out[o:o + 3] = bytes(BG)

for y in range(S):
    for x in range(S):
        # 归一化到 [-1,1]
        nx = (x + 0.5) / S * 2 - 1
        ny = (y + 0.5) / S * 2 - 1
        # 超椭圆：在「直边区域」内即为覆盖；四角用超椭圆判定
        ax, ay = abs(nx), abs(ny)
        limit = 1.0 - RADIUS_RATIO * 2 * 0  # 占位
        inside = 0
        for sy in range(N):
            for sx in range(N):
                px = (x + (sx + 0.5) / N) / S * 2 - 1
                py = (y + (sy + 0.5) / N) / S * 2 - 1
                apx, apy = abs(px), abs(py)
                # 只在角部收缩：把坐标减去圆角内方形区域
                ex = max(0.0, apx - (1 - RADIUS_RATIO * 2))
                ey = max(0.0, apy - (1 - RADIUS_RATIO * 2))
                if ex == 0.0 or ey == 0.0:
                    inside += 1
                else:
                    k = RADIUS_RATIO * 2
                    if (ex / k) ** 2 + (ey / k) ** 2 <= 1.0:
                        inside += 1
        cov = inside / (N * N)
        if cov <= 0:
            continue
        s = (y * S + x) * 3
        d = ((y + MARGIN) * CANVAS + (x + MARGIN)) * 3
        for c in range(3):
            out[d + c] = int(round(buf[s + c] * cov + BG[c] * (1 - cov)))

open('_preview-ios.png', 'wb').write(R.encode_rgb(CANVAS, CANVAS, out))
print('-> _preview-ios.png')
