# 宝可梦 AI 文字冒险 · 移动版

> **线上地址（手机直接打开即可安装）**：https://a688904ba5d46c2fd.gz3.agentos-app.net

AI 驱动的宝可梦文字冒险游戏。输入任何你想做的事，AI 主持人编织剧情；遇见并捕捉宝可梦、结识伙伴、探索地区，支持存档/读档与章节导出。

本版本已修复原项目的全部阻断性 Bug，并打包为 **可安装的手机应用（PWA）**，同时附带 **Capacitor 原生壳配置** 可构建 APK。

---

## 一、快速开始

### 本地运行（电脑/手机同网段调试）

```bash
cd pokemon-ai-adventure
python3 -m http.server 8080
# 或 npx serve .
```

浏览器打开 `http://localhost:8080`。手机调试：电脑与手机连同一 WiFi，手机访问 `http://<电脑IP>:8080`。

### 首次游戏

1. 输入训练师名字 → 选择性别 → 生成身世（可"换一个"重roll）
2. **配置 AI API**（必须）：在"出发"前的设置面板填写
   - API 地址：任意 OpenAI 兼容接口，如
     - OpenAI：`https://api.openai.com/v1`
     - DeepSeek：`https://api.deepseek.com/v1`
     - 通义千问：`https://dashscope.aliyuncs.com/compatible-mode/v1`
     - Kimi：`https://api.moonshot.cn/v1`
   - API Key：你的密钥（**仅保存在本机 localStorage，不上传任何服务器**）
   - 模型：如 `gpt-4o-mini` / `deepseek-chat` / `qwen-plus`
3. 点击"出发！"开始冒险
4. 顶栏 💾 可随时存档（3 个槽位，支持覆盖/读取/删除）；刷新或重开 App 后，开场界面会出现"📂 继续冒险"入口

---

## 二、安装为手机 App（PWA，推荐）

> PWA 需要 **HTTPS** 环境（localhost 除外）。把本项目部署到任意静态托管即可。

### 部署（三选一，均免费）

| 平台 | 操作 |
|---|---|
| **GitHub Pages** | 推送本目录到仓库 → Settings → Pages → 选分支根目录 |
| **Vercel / Netlify** | 拖拽本目录到控制台即完成部署 |
| **Cloudflare Pages** | 新建项目 → 直接上传本目录 |

### 手机安装

- **Android（Chrome/Edge）**：打开部署地址 → 底部弹出"安装到主屏幕"条 → 点安装；或菜单 ⋮ → "添加到主屏幕"
- **iPhone/iPad（Safari）**：打开地址 → 分享按钮 → "添加到主屏幕"

安装后：桌面精灵球图标启动、全屏无浏览器边框、**离线可打开**（AI 叙事需联网，已遇宝可梦数据/图片本地缓存）。

---

## 三、安卓 APK（已构建，直接安装）

| 文件（`/workspace/`） | 说明 |
|---|---|
| `pka-adventure.apk` | **release 自签名正式版**，推荐安装这个 |
| `pka-adventure-debug.apk` | debug 版（备用，部分手机会提示"未经审核"） |

**安装**：把 APK 传到手机（微信/QQ/数据线均可）→ 点击安装 → 按提示允许"安装未知来源应用"。安装后桌面出现精灵球图标「宝可梦AI冒险」。

**AI 配置预置**：APK 内可内置 `pka-preset.json`（baseURL/apiKey/model），首次启动自动写入本机配置，开包即玩。⚠️ 预置的 Key 随 APK 明文分发，仅自用、勿把含 Key 的 APK 发给他人。

**重新打包**（本沙箱已装好 JDK 17 + Android SDK 34）：

```bash
export JAVA_HOME=/root/.sdkman/candidates/java/17.0.13-zulu
export ANDROID_HOME=/opt/android-sdk
cd /workspace/pokemon-ai-adventure
tar cf - --exclude='./capacitor-app' --exclude='./README.md' . | tar xf - -C /workspace/pka-android/www
cd /workspace/pka-android && npx cap sync android
cd android && ./gradlew assembleDebug assembleRelease
# 产物：app/build/outputs/apk/{debug/app-debug.apk, release/app-release.apk}
```

工程位于 `/workspace/pka-android/`（Capacitor 6，appId `com.pka.adventure`，签名 keystore 在 `/workspace/pka-release.jks`，口令 `pka2026adventure`）。在你自己电脑上重建需 Node 18+、JDK 17、Android SDK 34，步骤相同。

---

## 四、本次修复与完成内容

原项目处于半完成状态（多个构建版本互相覆盖、线上版本白屏）。本次逐项修复并补齐：

| # | 问题 | 修复 |
|---|---|---|
| 1 | 首屏即崩溃：`handleStart is not defined`（构建期变量丢失） | 绑定修正为正确的 `O` 处理器 |
| 2 | base64+Blob 加载器损坏中文内容，页面整体语法错误 | 废弃畸形的单文件内联方案，重构为标准多文件应用 |
| 3 | BrowserRouter 导致任何路径打开都白屏 | 改造为 Hash 路由（`#/`、`#/story`），任意路径可开 |
| 4 | 无 API Key 时开场界面无法进入设置（死胡同） | 开场界面内嵌 AI 设置面板 |
| 5 | 宝可梦图片域名在国内被墙 | 切换至 jsDelivr CDN 镜像 |
| 6 | 存档崩溃（整个 store 含函数写入 IndexedDB，DataCloneError） | 存档前 JSON 净化，仅保存可序列化数据 |
| 7 | **读档功能完全缺失**（没有任何代码读取存档） | 实现读档：恢复游戏状态 + 完整对话历史 |
| 8 | 刷新后回到建角界面，存档形同虚设 | 开场界面新增"📂 继续冒险"存档列表入口 |
| 9 | 移动端适配缺失 | 安全区/刘海屏、动态视口高、触控优化、iOS 输入框防放大、启动闪屏 |
| 10 | 不是可安装的 App | PWA 全套：manifest、Service Worker 离线缓存、图标、安装提示条 |

---

## 五、项目结构

```
pokemon-ai-adventure/
├── index.html              # 应用入口（PWA 元信息 + 启动闪屏）
├── manifest.webmanifest    # PWA 安装清单
├── sw.js                   # Service Worker（离线缓存）
├── pwa.js                  # SW 注册 + 安装提示条
├── assets/
│   ├── app.js              # 游戏主程序（已修复全部 Bug）
│   ├── app.css             # TDesign + 游戏样式
│   └── mobile.css          # 移动端适配
├── icons/                  # 应用图标（多尺寸 + maskable）
└── capacitor-app/          # 原生壳配置（APK/IPA 打包）
```

## 六、技术说明

- 游戏本体：React 18 + TDesign Mobile React + Zustand + Dexie（IndexedDB）
- 叙事引擎：OpenAI 兼容 Chat Completions，结构化 JSON 输出（叙事/选项/遭遇）
- 宝可梦数据：[PokéAPI](https://pokeapi.co)（图鉴名、属性、描述、立绘，本地缓存 7 天）
- 存档：IndexedDB，3 槽位，含完整对话历史
- 故事导出：顶栏"📚 故事"页可按章节回顾并复制 Markdown
