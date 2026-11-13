# GitHub Pages 长期在线部署

知启是纯静态应用，没有构建命令，适合直接部署到 GitHub Pages。按本文操作后可获得一个长期免费的 HTTPS 地址：

```text
https://你的GitHub用户名.github.io/zhiqi-learning-pad/
```

> **国内网络提醒**：GitHub 和 GitHub Pages 在中国大陆的访问质量不稳定，是否直连取决于当地网络和运营商，不能保证“完全不用 VPN”。如果 GitHub Pages 打不开，可参考文末的国内静态托管替代方案。

## 准备

- 一个 GitHub 账号（免费）
- 本项目的完整文件夹，**不是把 zip 直接上传**——GitHub Pages 不会自动解压
- 不需要 Node、npm 或构建工具

## 方法 A：网页上传（适合不熟悉 Git 的人）

1. 登录 GitHub，点击右上角 **+ → New repository**。
2. 仓库名填 `zhiqi-learning-pad`，选择 **Public**，不要勾选 README，点击 **Create repository**。
3. 在空仓库页面点击 **uploading an existing file**。
4. 解压 `zhiqi-learning-pad-online.zip`，打开解压后的文件夹。
5. 把文件夹**里面的所有内容**（`index.html`、`assets/`、`icons/`、`sw.js`、`manifest.webmanifest` 等）拖进上传框。  
   - 必须让 `index.html` 位于仓库根目录。
   - 不要只上传外面的文件夹，否则页面会变成 `/zhiqi-learning-pad/zhiqi-learning-pad/index.html`。
6. 填写提交信息，点击 **Commit changes**。
7. 进入仓库 **Settings → Pages**。
8. **Build and deployment → Source** 选择 **Deploy from a branch**。
9. Branch 选择 **main**，目录选择 **/ (root)**，点击 **Save**。
10. 等待 1–3 分钟，刷新 Pages 页面，顶部会出现访问地址：
    `https://你的用户名.github.io/zhiqi-learning-pad/`

`.nojekyll` 已经包含在项目里，可以避免 GitHub 的 Jekyll 处理影响静态文件。

如果网页上传时没有带上这个隐藏文件，可以在仓库首页 **Add file → Create new file**，文件名填 `.nojekyll`，内容留空，提交即可。

## 方法 B：GitHub Desktop / 命令行

```bash
# 在 GitHub 创建空仓库后
git clone https://github.com/你的用户名/zhiqi-learning-pad.git
cd zhiqi-learning-pad

# 把本项目文件夹内的所有内容复制到当前仓库
# 然后
git add .
git commit -m "deploy zhiqi learning pad"
git push origin main
```

之后在仓库 **Settings → Pages** 中选择 `main` + `/ (root)`。

## 安装到 iPad

1. 用 iPad **Safari** 打开 Pages 地址。
2. 等页面完整加载 1–3 秒（Service Worker 缓存应用）。
3. 点 Safari **分享**。
4. 选 **添加到主屏幕**，名称填「知启」。
5. 以后从主屏幕图标打开。

安装版和 Safari 的本地数据是隔离的；第一次安装后要在主屏幕版本里重新设置孩子档案。

## 更新版本

1. 修改代码后，把 `sw.js` 里的 `CACHE_VERSION` 改成新版本号。
2. 上传新文件并提交。
3. GitHub Pages 自动发布后，在 iPad 上关闭主屏幕应用再打开，等待 Service Worker 更新。

## 常见问题

### 页面 404

确认仓库根目录有 `index.html`。如果是上传了外层文件夹，把里面的文件移到根目录。

### 页面能打开但没有样式

确认 `assets/css/...`、`assets/js/...` 的目录结构和上传前一致。

### 无法安装 / 离线不可用

- 必须通过 **HTTPS** 访问（GitHub Pages 自带 HTTPS）。
- 必须用 **Safari**，不要在微信内置浏览器里安装。
- 首次打开需要联网，等 Service Worker 完成缓存后再添加到主屏幕。

### 中国大陆访问慢或打不开

GitHub Pages 不保证国内直连质量。可以考虑：

- **Gitee Pages**：国内访问更稳，通常需要实名认证，仓库公开，Pages 服务政策以 Gitee 当前页面为准。
- **腾讯云 COS / 阿里云 OSS 静态网站**：国内访问稳定，有免费额度或少量费用。
- **Cloudflare Pages**：免费，配置简单，但国内访问同样取决于网络。
- 如果只是家庭内使用，也可以在电脑上运行 `serve.py` 通过局域网访问；但 PWA 离线安装仍然需要 HTTPS。

## 不要上传的内容

- `.tmp/`、测试截图、测试 PDF
- 任何没有合法授权的教材 PDF / 图片
- 个人隐私信息（真实姓名、学校、班级会写入浏览器本地数据，不在代码里）

当前部署包已经清理了测试文件，可以直接作为 GitHub 仓库内容使用。
