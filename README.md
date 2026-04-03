# Jarvis Space 桌面端

Jarvis Space 的原生桌面客户端，基于 Tauri 2 + React + TypeScript 构建，支持 macOS / Windows / Linux。

## 下载安装

前往 [Releases](https://github.com/niohoo/jarvis-desktop/releases) 页面下载对应平台的安装包：

| 平台 | 文件 |
|------|------|
| macOS (Apple Silicon) | `Jarvis Space_*_aarch64.dmg` |
| macOS (Intel) | `Jarvis Space_*_x64.dmg` |
| Windows (x64) | `Jarvis Space_*_x64-setup.exe` |
| Linux | `Jarvis Space_*_amd64.AppImage` |

---

## 安装说明

### macOS

下载 `.dmg` 后双击，将 `Jarvis Space.app` 拖入 `应用程序` 文件夹。

#### ⚠️ 遇到"已损坏，无法打开"提示

macOS Gatekeeper 会对未经 Apple 公证的 app 显示此提示，**不是真的损坏**。在终端执行以下命令解除隔离即可：

```bash
xattr -cr /Applications/Jarvis\ Space.app
```

如果你把 app 放在其他位置（例如还在 Downloads 文件夹），则：

```bash
xattr -cr ~/Downloads/Jarvis\ Space.app
```

执行后再双击打开即可正常运行。

> 原理：macOS 下载文件时会自动附加 `com.apple.quarantine` 扩展属性，`xattr -cr` 命令将其清除。

#### 遇到"无法验证开发者"提示

打开方式：**右键 → 打开 → 在弹窗中点"打开"**（只需第一次这样操作）。

---

### Windows

直接双击 `*_x64-setup.exe` 运行安装程序即可。

如果 SmartScreen 拦截，点击 **"更多信息" → "仍要运行"**。

---

### Linux

```bash
chmod +x Jarvis\ Space_*_amd64.AppImage
./Jarvis\ Space_*_amd64.AppImage
```

---

## 功能

- **项目空间管理**：我的/全部空间切换、状态筛选、60s 自动刷新
- **文件管理**：文件夹浏览、上传下载、本地同步
- **消息通知**：30s 轮询未读通知、铃铛角标、标记已读
- **快速入口**：TopBar 一键 SSO 免登录打开 Jarvis Space / CRM / GitLab
- **Dashboard**：项目状态分布、风险总览、近期动态

## 开发

```bash
npm install
npm run tauri dev
```

## 发版

打 tag 推送即可触发 GitHub Actions 自动构建多平台安装包：

```bash
git tag v0.x.0
git push origin v0.x.0
```
