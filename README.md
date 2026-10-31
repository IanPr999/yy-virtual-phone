# yy virtual phone（小手机）

一台装进网页里的小手机 —— 单文件 PWA Web App。

在浏览器中模拟一台手机，内置微信（仿参考 UI）、好友圈、模型接口接入、丰富的系统设置，以及基于 **StarHub 实时语音通话 SPEC v1** 的语音通话能力。支持安装到手机主屏幕（PWA），移动端通过版本号破缓存保证刷新即时生效。

> 当前版本：**v37**（与 `sw.js` / `sw2.js` 的 `CACHE` 版本、跳转 `?v=37` 保持一致）。

---

## 特性

- **单文件应用**：核心逻辑内联在 `小手机.html` 中，可直接以 `file://` 或静态托管打开。
- **微信 / 好友圈**：主界面与好友圈 UI 仿参考设计；好友圈头像悬浮于横幅下边界。
- **模型接口接入**：可接入到所有支持的项目，未接入模型的项目会被禁用（不保留本地回复）；设置内含 MCP 接入。
- **丰富设置**：站内通知横幅（开关 / 音效上传 / 合并）、后台保活、锁屏与密码、数据存储（一键导出 / 导入 / 定期提醒）、使用时长记录、版本更新检查、通话语言与自然人声合成规范。
- **语音通话（SPEC v1）**：稳定的句切分、背压控制（最多领先 2 句）、共用 AudioContext 时间轴排程、严格按序播放、挂断取消、双语（EN/ZH）字幕与台词。
- **PWA / 移动端**：`manifest.json` + Service Worker（`sw2.js`），主屏幕可安装；`index.html` 与 `start_url` 统一带 `?v=N` 以绕过 iOS Safari 顽固缓存。

---

## 快速开始

### 本地预览
任意静态服务器即可（不要直接用 `file://` 跑 Service Worker）：

```bash
python serve.py          # 或 python -m http.server 8080
# 浏览器打开 http://localhost:8080/index.html
```

### 部署到生产
把仓库根目录（或 `dist/`）部署到任意支持 HTTPS 的静态托管。移动端（尤其 iOS Safari）务必通过带版本号的入口访问：

```
https://<你的域名>/index.html?v=37
```

每次改动代码后，**把版本号 `v=37` 往上加一**（同步修改 `index.html` 的 `location.replace` 与 `manifest.json` 的 `start_url`，以及 `sw2.js` 的 `CACHE`），URL 一变即可绕过缓存。

---

## 目录结构

| 路径 | 说明 |
| --- | --- |
| `小手机.html` | 源文件（可编辑的单文件 App，约 1.2 MB 内联脚本） |
| `phone.html` | 部署副本（`cp 小手机.html phone.html` 同步） |
| `index.html` | 入口：跳转并带版本号破缓存 |
| `manifest.json` | PWA 清单（`start_url` 带 `?v=37`） |
| `sw.js` / `sw2.js` | Service Worker（当前活动为 `sw2.js`） |
| `icon-*.png` / `appicon-*.png` | 应用图标（PWA / Apple Touch） |
| `splash-*.png` | 各分辨率启动图 |
| `dist/` | 发布构建镜像（与根目录同源文件） |
| `serve.py` / `serve_nocache.py` | 本地静态服务器 |
| `_gen_icon.py` / `_resize_icon.py` / `_mksplash.py` / `_jpg2png.py` / `_iconview.py` / `_uishot*.py` | 图标 / 启动图 / 截图生成工具 |
| `_t*.js` / `_runall.js` / `_tspec.js` / `_tcallrt.js` | 测试套件（jsdom 回归，28 套件 / 0 问题） |
| `_spec/spec.txt` | 语音通话 SPEC v1 设计文档 |
| `_act1.js` / `_act2.js` / `_cot.txt` | 演示脚本与思维链模板 |
| `_qingji/` | **子应用「轻记」v1.0.0**：装进小手机应用市场的体重 / 运动记录 App（含字体与壁纸资源） |

---

## 子应用：轻记（_qingji）

「轻记」是一个独立的体重 / 运动记录 Web App，可通过「小手机 → 应用市场 → 创作 → 导入整包」安装到虚拟手机内。

- 今日 / 运动 / 趋势（自然周、自然月，晨重与晚重双线）/ 首页目标差距 / 调色盘（独立主题 + 自定义 CSS）/ 设置（JSON 导出导入）。
- 使用 `window.AiPhone.db` 仅保存本 App 私有数据，不读取聊天、角色或其他 App 数据，也不调用 AI。
- 详见 `_qingji/使用说明.txt`。

---

## 隐私说明

本仓库**不包含**任何浏览器隐私数据或本地项目日志（已在 `.gitignore` 中排除 `.workbuddy/`、`_edgeprof/`、`*.genie`、临时截图等）。所有上传内容均为可公开的应用源码、资源与测试。

## License

未指定开源协议。如需使用请先联系作者。
