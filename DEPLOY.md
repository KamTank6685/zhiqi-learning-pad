# 部署与 iPad 安装

知启是纯静态应用，没有后端、数据库或构建步骤。把整个 `zhiqi-learning-pad` 文件夹放到任意支持 HTTPS 的静态托管服务即可。

> 安装到 iPad 主屏幕必须通过 **HTTPS**（或电脑上的 localhost）访问。直接双击 `index.html` 可以浏览，但无法注册离线缓存；局域网 `http://192.168.x.x` 可以浏览，也无法启用完整的 PWA 离线能力。

## 方案 A：Netlify Drop（最快，不需要命令行）

1. 打开 <https://app.netlify.com/drop>。
2. 把整个 `zhiqi-learning-pad` 文件夹拖进去（或上传打包好的 zip）。
3. 等待部署完成，得到 `https://xxxx.netlify.app` 地址。
4. 在 iPad Safari 中打开该地址，等首页加载完成。
5. 点 Safari 顶部 **分享** → **添加到主屏幕** → 名称填「知启」→ 添加。

如果你希望长期保留站点，注册一个免费 Netlify 账号并认领这次部署即可。

## 方案 B：GitHub Pages（免费、稳定）

1. 新建一个 GitHub 仓库（例如 `zhiqi-learning-pad`）。
2. 把本文件夹内的所有文件上传到仓库根目录，保持目录结构不变。
3. 进入 **Settings → Pages**，Source 选择 **Deploy from a branch**，分支选 `main`，目录选 `/ (root)`，保存。
4. 等待 1–2 分钟，访问 `https://你的用户名.github.io/zhiqi-learning-pad/`。
5. 在 iPad Safari 打开并「添加到主屏幕」。

所有资源路径和 Service Worker 都使用相对路径，因此放在仓库子路径下也能正常工作。

## 方案 C：Cloudflare Pages / Vercel

这些平台同样支持直接上传静态目录或连接 Git 仓库：

- **Cloudflare Pages**：Create project → Direct Upload → 上传文件夹。
- **Vercel**：Add New → Project → 选择文件夹 / Git 仓库，Framework Preset 选 **Other**，Build Command 留空，Output Directory 留空或填 `.`。

不需要配置 Node 版本、构建命令或环境变量。

## 方案 D：自己的一台电脑 / NAS

在应用目录运行：

```powershell
python serve.py --bind 0.0.0.0 --port 8080
```

电脑所在局域网内，iPad 可以通过 `http://电脑IP:8080` 浏览。但普通 HTTP 不是安全上下文，Service Worker 不会注册；若需要安装和离线，使用 Cloudflare Tunnel、Tailscale Funnel、Caddy/Nginx + HTTPS 等方式提供 HTTPS。

临时 HTTPS 隧道示例（需要电脑保持开机）：

```powershell
# 先启动本地服务
python serve.py --port 8080

# 另开一个终端，使用 cloudflared
cloudflared tunnel --url http://127.0.0.1:8080
```

把终端输出的 `https://....trycloudflare.com` 地址在 iPad Safari 打开即可安装。该地址不保证长期在线；安装后应用壳会缓存，但长期使用仍建议使用方案 A/B/C。

## 在 iPad 上安装

1. 用 **Safari** 打开 HTTPS 地址（不要在微信、抖音等内置浏览器里安装）。
2. 等首页完整显示，让 Service Worker 完成首次缓存（约 1–3 秒）。
3. 点 Safari 顶部工具栏的 **分享** 按钮。
4. 在分享菜单中找到 **添加到主屏幕**。
5. 名称建议填「知启」，确认添加。
6. 以后从主屏幕图标启动，即为全屏独立窗口。

安装版拥有独立的浏览器存储容器；从 Safari 切换到主屏幕版本时，Safari 里的学习记录不会自动迁移，这是 iOS 的容器隔离行为。

## 更新应用时

修改 `index.html`、CSS、JS 或图标后：

1. 把 `sw.js` 里的 `CACHE_VERSION` 改成新的日期/版本号（例如 `zhiqi-pwa-v2-2026-11-20`）。
2. 重新部署。
3. 在 iPad 上关闭并重新打开主屏幕应用；新 Service Worker 会在后台更新。

如果不修改版本号，已经安装的设备可能继续使用旧缓存。

## 文件清单

需要部署的内容：

```text
index.html
manifest.webmanifest
sw.js
serve.py
start.bat
start-server.bat
preview.png
README.md
DEPLOY.md
icons/
assets/
```

`serve.py` 和 `start-server.bat` 只用于本地预览；部署到静态托管时可以保留，不影响使用。
